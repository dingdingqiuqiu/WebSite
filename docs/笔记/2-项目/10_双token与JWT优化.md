### 0. JWT+双token理论基础

#### 0.1为什么需要JWT

HTTP 是**无状态**的。服务器默认不记得你。

你登录一次，下一次请求服务器又不知道你是谁了。所以每次请求都要**证明你是谁**。

**最朴素的方案**：每次请求都带上用户名 + 密码。

问题：
- 密码在网络上传来传去，风险大。
- 每次都要查数据库验证密码，慢。
- 密码泄露一次，全盘皆输。

**所以需要一个东西**：服务器验证一次后，发一张"通行证"给你。之后你每次请求带着这张通行证，服务器认识它就行，不用再查密码。

这张通行证就是 **Token**。JWT 只是 Token 的一种**格式**。

#### 0.2 JWT长什么样

一句话：

> **JWT 是一个用点号 `.` 分成三段的字符串。**

```text
xxxxx.yyyyy.zzzzz
```

三段分别是：

| 段     | 名字      | 内容           |
| :----- | :-------- | :------------- |
| 第一段 | Header    | 用什么算法签名 |
| 第二段 | Payload   | 真正携带的数据 |
| 第三段 | Signature | 防篡改的签名   |

真实例子（很长，但结构就三段）：

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
.
eyJzdWIiOiIxMjMiLCJuYW1lIjoi5byg5LiJIiwiZXhwIjoxNzAwMDAwMDAwfQ
.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

看起来乱，其实每段都是 **JSON 经过 Base64URL 编码**后的结果。

##### 1. Header

原始 JSON：

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

- `alg`：签名算法，HS256 表示 HMAC-SHA256。
- `typ`：类型，就是 JWT。

Base64URL 编码后变成：

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
```

**注意：Base64 不是加密，是编码。任何人都能解开看。**

##### 2. Payload

原始 JSON：

```json
{
  "sub": "123",
  "name": "张三",
  "role": "admin",
  "exp": 1700000000,
  "iat": 1699996400
}
```

- `sub`：subject，用户 ID。
- `name`、`role`：自定义字段，你想放什么放什么。
- `exp`：过期时间（Unix 时间戳）。
- `iat`：签发时间。

Base64URL 编码后变成：

```text
eyJzdWIiOiIxMjMiLCJuYW1lIjoi5byg5LiJIiwiZXhwIjoxNzAwMDAwMDAwfQ
```

**Payload 也是 Base64，没加密，前端能解开看。所以绝对不要放密码、身份证号。**

##### 3.Signature

这是关键。前两段是明文，谁都能改。Signature 保证**改了会被发现**。

计算方式：

```text
signature = HMAC-SHA256(
    base64(header) + "." + base64(payload),
    secretKey
)
```

服务器手里有 `secretKey`，只有它知道。别人改了 Payload 里的 `role` 为 `admin`，但算不出新的签名，因为不知道 secretKey。服务器一验签就发现对不上，拒绝。

**这就是 JWT 防篡改的第一性原理：不是不让你改，而是让你改了之后没法伪造签名。**

#### 0.3 JWT 在 HTTP 请求里怎么传？

JWT 生成后，客户端保存起来（通常 localStorage 或 cookie），每次请求放在 **Authorization 请求头**里：

```http
GET /api/user/profile HTTP/1.1
Host: example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMi...
Content-Type: application/json
```

关键点：

- `Authorization` 是标准头。
- `Bearer` 是固定前缀，意思是"持有者令牌"。
- 后面跟 JWT 字符串。

前端代码大致：

```javascript
fetch('/api/user/profile', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
})
```

#### 0.4 服务器怎么验证？

收到请求后：

```text
1. 从 Authorization 头取出 JWT
2. 拆成三段
3. 用 secretKey 重新计算前两段的签名
4. 和第三段比对
   ├─ 不一致 → 401，被篡改
   └─ 一致 → 继续
5. 检查 exp 是否过期
   ├─ 过期 → 401
   └─ 未过期 → 解析 payload，拿到 userId、role
6. 把用户信息放进 ThreadLocal（就是你之前的 UserHolder）
7. 放行请求
```

**整个过程不需要查数据库。** 这是 JWT 相比 session 的最大优势：服务器无状态，适合分布式。

#### 0.5 双 Token 方案里，JWT 怎么用？

登录时

```text
用户提交账号密码
  ↓
服务器验证通过
  ↓
签发 accessToken（JWT，短有效期，如 15 分钟）
签发 refreshToken（JWT，长有效期，如 7 天）
  ↓
返回给客户端
```

accessToken 的 payload：

```json
{
  "sub": "123",
  "role": "user",
  "type": "access",
  "exp": 1700000900
}
```

refreshToken 的 payload：

```json
{
  "sub": "123",
  "type": "refresh",
  "exp": 1700604800
}
```

两个 token 都是 JWT，结构一样，只是：
- `type` 不同，服务器知道这是 access 还是 refresh。
- `exp` 不同，refresh 有效期长得多。

访问业务接口

```http
GET /api/order/list
Authorization: Bearer <accessToken>
```

服务器只验 accessToken。

accessToken 过期

> 这段过期后发refreshToken的逻辑由前端手写实现，获得新accesstoken后重发过期请求

```http
POST /api/auth/refresh
Authorization: Bearer <refreshToken>
```

服务器验 refreshToken：
- 有效 → 签发新 accessToken，返回给客户端。
- 无效或过期 → 401，要求重新登录。

**为什么不让 accessToken 直接长期有效？**

因为 accessToken 每次请求都带，暴露机会多。一旦泄露，攻击者能用到它过期为止。

所以：
- **accessToken 短命**，泄露了损失有限。
- **refreshToken 长命但很少用**，只在刷新时出现，暴露机会少。

这就是双 token 的第一性原理：**用短命 token 承担高频风险，用长命 token 承担低频换新。**

#### 0.6 为什么`accessToken`中的信息反而多，`refreshToken`中的信息反而少？`accessToken`中的信息高频使用而且容易被`XSS`通过JS读到从而截取`token`不应该放少的信息嘛？

**为什么`accessToken`中的信息多?**

因为 accessToken 的使命是：**让服务器不用查库，就能知道你是谁、能干什么。**

所以`accessToken`的设计目标：自包含

把用户信息**直接塞进 token 里**，服务器拿到 token，验一下签名，直接读里面的 `userId`、`role`，**不需要查库**。

```json
{
  "sub": "123",
  "name": "张三",
  "role": "admin",
  "permissions": ["order:read", "order:write"],
  "exp": 1700000900
}
```

**这就是 JWT 无状态的核心优势：服务器不存 session，全靠 token 自带信息。**

所以 accessToken 信息多，是**为了性能**。

**为什么`refreshToken`的信息反而少？**

因为 refreshToken 的使命是：**只用来换新的 accessToken。**

它不需要知道你是谁、你是什么角色。它只需要证明：**“我是一个合法用户，我有资格换新 token。”**

所以它的 payload 可以极简：

```json
{
  "sub": "123",
  "type": "refresh",
  "exp": 1700604800
}
```

甚至，很多系统里 refreshToken **根本不是一个 JWT**，而是一个**随机字符串**（UUID）：

```text
refreshToken = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

服务器把这个随机串存到 Redis：

```text
Redis:
  key: "refresh:a1b2c3d4..."
  value: { userId: 123 }
  expire: 7天
```

**为什么 refreshToken 可以信息少？**

因为：

1. 它低频使用（7 天才用几次），每次用都走服务器端，**查一次 Redis 完全可接受**。
2. 它存 HttpOnly Cookie，JS 读不到，泄露风险低。
3. 它有效期长（7 天），一旦泄露危害大，所以**必须能主动撤销**。
   - 如果是 JWT，签发后无法撤销。
   - 如果是随机串 + Redis，服务器随时可以 `DEL refresh:a1b2c3d4...`，立刻失效。

**所以 refreshToken 信息少，是为了安全（可撤销、低暴露）。**



#### 0.7 JWT vs Session，第一性原理对比

|                | Session          | JWT                      |
| :------------- | :--------------- | :----------------------- |
| 状态存哪       | 服务器内存/Redis | 客户端（token 里自带）   |
| 服务器要不要记 | 要               | 不要                     |
| 能不能水平扩展 | 要共享 session   | 天然无状态               |
| 能不能主动失效 | 能，删 session   | 难，签发后到期前一直有效 |
| 适合场景       | 单体、需要踢人   | 分布式、微服务           |

JWT 的代价：**签发后无法撤销**。要解决，就得配合 Redis 黑名单或短有效期 + refreshToken。

#### 0.8 一句话总结

JWT 就是一个 **Base64 编码的 JSON + 签名**，放在 `Authorization: Bearer xxx` 头里传给服务器。

- Header 说明算法。
- Payload 装数据（明文的，别放敏感信息）。
- Signature 防篡改。
- 服务器用 secretKey 验签，通过就信任 payload。

双 token 方案是：
- accessToken 短命，高频用。
- refreshToken 长命，只用来换 accessToken。
- 都失效，才重新登录。

---

要不要我帮你实际生成一个 JWT，然后逐段 Base64 解开给你看？那样最直观。

## 1. 流程图优化

![dual-token-login.drawio](assets/10_双token与JWT优化/dual-token-login.drawio.png)

## 2. 后端核心代码



## 3.前端核心代码

