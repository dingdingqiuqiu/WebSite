# 订单关单与 CAS：从第一性原理推出来

> 只讲「Spring Task 自动关单 + 版本号 CAS」这一块。不背结论，从三条不变量往下推。

## 1. 三条不变量（其余全是推论）

- **I1 库存守恒**：库存永不为负；`已支付占用 = 初始库存 − 当前库存 − 已归还`。
- **I2 单终态**：一张订单最终只能是 `2 已支付` 或 `4 已关闭`（`3 已核销` 是 2 的后继），不能既是又不是。
- **I3 一次迁移**：同一条状态迁移最多被应用一次。

下面每个机制，都是 I1~I3 逼出来的，不是"最佳实践"。

## 2. 由 I1 推出：关单者是「扫描器」，不是「定时器」

支付期限是**数据**（`expire_time`），不是进程内对象。

- 若为每单起一个 Timer：重启即丢、内存随单量增长、多实例重复触发 → 违背 I3/I2 的可靠性前提。
- 所以只能是**按状态扫描**：`where status = 1 and expire_time < now()`。

推论（免费获得的好处）：扫描天然幂等 → 进程宕机漏掉的单，恢复后还能补关；多实例同时扫也安全，因为每单的"改"由 CAS 兜底（见 §5）。

## 3. 由 I1 推出：回补库存必须被「关单成功」门控

**关单是库存归还的唯一触发器。** 因此顺序只能是：

```
CAS(status 1 → 4) 成功  →  回补库存   （两者同一事务）
```

反过来（先退库存再改状态）就会出现「订单其实已支付，库存却退回去了」→ 直接违反 I1，且是资损。

> 铁律：**补偿动作只能由"赢了状态迁移的那次调用"执行，并且与迁移同事务。**
> 推论：CAS 失败时什么都别做——既不改状态，也不退库存。

## 4. 由 I2 + 并发推出：必须有"二选一"原语

支付线程和关单线程可能同时读到 `status = 1`。若写成：

```sql
update tb_product_order set status = 4 where id = ?   -- ❌
```

后写覆盖先写 → 会出现「已支付又被改成已关闭」或反之 → 破坏 I2。

需要的原语只有一句话：**在一条原子语句里同时完成"判定 + 写入"**。这就是条件更新（CAS）。

## 5. 为什么是 CAS：把候选方案排除掉

| 方案 | 结论 | 为什么 |
|---|---|---|
| `synchronized` / 单机锁 | ✗ | 只管一个 JVM，多实例失效（I2 在网络边界外没人守） |
| 分布式锁（Redisson） | △ | 语义上够，但多一次网络往返 + 锁续期 + 锁失效风险；我们是"二选一"而非"排队"，锁重了 |
| `select ... for update` 悲观锁 | △ | 能行，但锁跨事务持有；批量关单会长时间占行锁，吞吐差 |
| 无条件的 `update ... where id = ?` | ✗ | 覆盖写，I2 必破 |
| **条件更新 `where status=? and version=?`** | ✓ | 单语句原子、无锁、无额外往返、天然幂等；**失败本身携带信息**（别人赢了） |

## 6. `version` 到底防什么（诚实的回答）

先说实话：**在"只许单向前进"的状态机里，`where status = 期望值` 已经能防住重复迁移**（1 只能到 2/4，改完就不是 1 了）。
那 version 还有用吗？有，防的是另一类问题：

1. **读-改-写丢更新**：语句里若还要更新别的字段（地址、备注、核销时间），只有 `version` 能判断"我读到的这一行是否已被别人改过"，这跟业务语义无关，是通用的并发正确性。
2. **未来出现回退**（退款、重新开启）：状态值可能回到同一个值，此时 `status` 判定失效，`version` 仍然有效。
3. **可观测**：`version = version + 1` 让"这一行发生过几次成功写入"变成可查询的事实——我们用 `version = 1` 作为"只迁移了一次"的验收证据。

一句话：**status 守"这一步该不该走"，version 守"我读到的数据还是不是最新的"。**

## 7. 重试的正确语义：失败是信息，不是错误

```
CAS 失败
 ├─ 重读，状态已不是期望值 → 得出结论（已支付 / 已关闭），不再重试
 └─ 状态没变、只是 version 被别人改了 → 重试（上限 3 次）
```

两条纪律：

- 返回给用户的结论必须来自**重读后的数据**，不能来自失败的那次尝试（否则把"已超时关闭"报成"支付失败"）。
- 重试上限要小（3 次足矣）：CAS 冲突意味着"别人正在改同一行"，无限重试只会放大争用。

## 8. 代码骨架（就这三段）

```java
// ① 带重试的 CAS：where id + status + version，version 自增
private boolean casStatus(Long id, int expect, int target,
                          Consumer<LambdaUpdateWrapper<ProductOrder>> extra) {
    for (int i = 1; i <= 3; i++) {
        ProductOrder cur = getById(id);
        if (cur == null || cur.getStatus() != expect) return false;   // 状态已变，重试无意义
        var w = Wrappers.<ProductOrder>lambdaUpdate()
                .eq(ProductOrder::getId, id)
                .eq(ProductOrder::getStatus, expect)
                .eq(ProductOrder::getVersion, cur.getVersion())
                .set(ProductOrder::getStatus, target)
                .setSql("version = version + 1");
        if (extra != null) extra.accept(w);
        if (update(w)) return true;
    }
    return false;
}

// ② 关单：CAS 成功才回补库存，且同事务
@Transactional(rollbackFor = Exception.class)
public boolean closeOrder(Long id) {
    boolean closed = casStatus(id, 1, 4, w -> w.set(ProductOrder::getCloseTime, now()));
    if (!closed) return false;      // 已被支付：什么都不做
    restoreStock(id);
    return true;
}

// ③ Spring Task：只扫描，不写业务（写由 Service 的代理事务负责）
@Scheduled(initialDelay = 30_000, fixedDelay = 60_000)   // fixedDelay：跑完再计时，不会堆积
void closeExpired() { for (ProductOrder o : service.listExpired(200)) service.closeOrder(o.getId()); }
```

为什么扫描在 Task、写在 Service：`@Transactional` 走的是 Spring 代理，**同类自调用不生效**（写在同一个类里，CAS 和回补库存会各自提交，I1 就破了）。

## 9. 这套设计的边界（第一性原理必须承认做不到什么）

| 边界 | 现实后果 | 必须补的机制 |
|---|---|---|
| 第三方支付成功、DB 里订单已关闭 | 状态机无法自愈：钱收了、货没给 | **查单 + 退款**补偿（这就是保留 `tradeNo` 的原因）；CAS 只能保证"不会既支付又关闭"，不能替你把钱退回去 |
| 多实例同时扫单 | CAS 保证安全，但存在重复扫描的无用功 | 规模上来换分布式调度（XXL-JOB）/ 延迟消息，把"谁来扫"也变成协调问题 |
| 时钟不一致 | `expire_time` 与 `now()` 若分别来自 DB 与应用，边界会漂移 | 统一时源（都用 DB `NOW()` 或都用应用时钟） |
| Spring Task 单点 | 该实例挂了，关单就停（直到重启） | 多实例部署时用调度框架，别指望单机定时器 |

## 10. 一页速查

| 不变量 | 逼出来的机制 | 代码 |
|---|---|---|
| I1 库存守恒 | 条件扣库存 `where stock >= n`；关单 CAS 成功才回补，且同事务 | `createOrder` / `closeOrder` |
| I2 单终态 | 一条 SQL 内"判定+写入"：`where status=? and version=?` | `casStatus` |
| I3 一次迁移 | `version = version + 1` + 唯一索引 + 幂等判断 | `casStatus` / `uk_verify_code` |
| 可靠性（宕机不漏单） | 按状态扫描而非定时器 | `listExpired` + `@Scheduled` |
| 冲突反馈准确 | CAS 失败 → 重读 → 按最新状态给结论 | `confirmPaidByNotify` / `cancelOrder` |
