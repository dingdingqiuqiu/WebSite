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

改造代码总览如下：

| 文件                                                | 操作         | 目的                             |
| --------------------------------------------------- | ------------ | -------------------------------- |
| `BackEnd/tfshz/pom.xml`                             | 修改         | 引入 jjwt                        |
| `BackEnd/tfshz/src/main/resources/application.yaml` | 修改         | jwt 密钥与 TTL 配置              |
| `.../utils/JwtUtils.java`                           | **新增**     | 签发/校验 access、refresh        |
| `.../utils/RefreshTokenInterceptor.java`            | **新增**     | 解析 access → 填充 UserHolder    |
| `.../dto/LoginResultDTO.java`                       | **新增**     | 登录/刷新接口的返回结构          |
| `.../dto/RefreshFormDTO.java`                       | **新增**     | 刷新接口的请求结构               |
| `.../utils/RedisConstants.java`                     | 修改         | 新增 refresh 白名单 key          |
| `.../Service/IUserService.java`                     | 修改         | 接口新增 refreshToken、logout    |
| `.../Service/impl/UserServiceImpl.java`             | 修改         | login 签发双 token；新增两个方法 |
| `.../controller/UserController.java`                | 修改         | 新增 /refresh；实现 /logout      |
| `.../config/MvcConfig.java`                         | 修改         | 注册两个拦截器（解除注释并重写） |
| `.../config/WebExceptionAdvice.java`                | 修改（可选） | 统一异常/401 响应结构            |

## 2. 后端核心代码

#### 2.1 pom.xml:引入jjwt

```xml
<!-- ========== JWT（json web token）========== -->
<!-- jjwt-api：编译期使用；jjwt-impl/jjwt-jackson：运行期实现与 JSON 序列化 -->
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.6</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>
```

#### 2.2 application.yaml: JWT配置

在文件末尾追加：

```yaml
# ================= JWT 配置 =================
tfsh:
  jwt:
    # 签名密钥：HS256 要求至少 32 字节。生产环境必须走环境变量，严禁把真实密钥提交进 git。
    # 生成随机密钥的命令：openssl rand -base64 48
    secret: ${JWT_SECRET:0123456789abcdef0123456789abcdef0123456789abcdef}
    # access token 有效期：30 分钟（毫秒）
    access-ttl: 1800000
    # refresh token 有效期：7 天（毫秒）
    refresh-ttl: 604800000
```

#### 2.3 `utils/JwtUtils.java`:新增JWT操作工具类

```java
package com.tfsh.utils;

import com.tfsh.dto.UserDTO;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

/**
 * JWT 工具类：负责 access / refresh 两类令牌的签发与校验。
 *
 * 原理回顾：
 *   JWT = Base64URL(header) + "." + Base64URL(payload) + "." + HMACSHA256(secret, 前两段)
 *   验签 = 用同一个 secret 重算一遍签名再比对；
 *   任何对 header/payload 的篡改都会导致签名对不上而被拒收。
 */
@Component
public class JwtUtils {

    /** 签发者标识，校验时强制检查，防止别处签的 token 混进来 */
    private static final String ISSUER = "tfshz";

    /** 签名密钥（HS256 要求 >= 32 字节，启动时由 secret 生成） */
    private SecretKey key;

    @Value("${tfsh.jwt.secret}")
    private String secret;

    /** access 有效期（毫秒），默认 30 分钟 */
    @Value("${tfsh.jwt.access-ttl:1800000}")
    private long accessTtl;

    /** refresh 有效期（毫秒），默认 7 天 */
    @Value("${tfsh.jwt.refresh-ttl:604800000}")
    private long refreshTtl;

    @PostConstruct
    public void init() {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * 签发 access token。
     * payload 只放“认证需要的最小信息”，不放手机号等敏感字段（JWT 是编码不是加密）。
     */
    public String createAccessToken(UserDTO userDTO) {
        return Jwts.builder()
                .issuer(ISSUER)
                .subject(String.valueOf(userDTO.getId()))   // sub = 用户 id
                .id(UUID.randomUUID().toString())           // jti = 本 token 的唯一编号
                .claim("nickName", userDTO.getNickName())
                .claim("icon", userDTO.getIcon())
                .claim("type", "access")                    // 防止 access/refresh 混用
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + accessTtl))
                .signWith(key)                              // 默认 HS256
                .compact();
    }

    /** 签发 refresh token：payload 只放 id + 编号，最小化暴露 */
    public String createRefreshToken(Long userId) {
        return Jwts.builder()
                .issuer(ISSUER)
                .subject(String.valueOf(userId))
                .id(UUID.randomUUID().toString())
                .claim("type", "refresh")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + refreshTtl))
                .signWith(key)
                .compact();
    }

    /**
     * 校验并解析 token。
     * 签名错误 / 已过期 / 签发者不符 / 类型不符 → 抛出异常，由调用方决定如何处理。
     */
    public Claims parse(String token, String expectedType) {
        Claims claims = Jwts.parser()
                .verifyWith(key)          // 用同一个 secret 验签
                .requireIssuer(ISSUER)    // 校验签发者
                .build()
                .parseSignedClaims(token)
                .getPayload();
        if (!expectedType.equals(claims.get("type", String.class))) {
            throw new IllegalArgumentException("token 类型错误");
        }
        return claims;
    }

    public long getAccessTtl() { return accessTtl; }
    public long getRefreshTtl() { return refreshTtl; }
}
```

- **`type` claim 是必须的**：没有它，攻击者可以拿自己的 refresh token 去冒充 access 调业务接口（两者用同一把密钥签的），反之拿 access 无限换新 refresh。这个字段就是两道令牌之间的"隔离墙"。
- **`jti`（JWT ID）是必须的**：它是"这一个" token 的唯一编号。没有它，白名单就只能以用户为粒度，无法区分设备、无法精准作废。
- **过期时间在 `exp` 里**，验签时 jjwt 自动校验，不用自己写时间比较。

#### 2.4 `utils/RefreshTokwnInterceptor.java`：刷新Token拦截器

```java
package com.tfsh.utils;

import cn.hutool.core.util.StrUtil;
import com.tfsh.dto.UserDTO;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 令牌解析拦截器（order 小，先执行）：
 *   职责只有一个 —— 从请求头解析 access token，验签成功后把用户装进 ThreadLocal。
 *   无论是否携带 token 都放行，真正的“拦截”由 LoginInterceptor 完成。
 *
 * 为什么 access 在这里只验签、不查 Redis：
 *   短有效期本身就是撤销机制 —— 被踢掉的 token 最多再活 30 分钟；
 *   换来的是每个请求零 Redis 访问，登录后的吞吐不再受 Redis 制约。
 */
public class RefreshTokenInterceptor implements HandlerInterceptor {

    private final JwtUtils jwtUtils;

    public RefreshTokenInterceptor(JwtUtils jwtUtils) {
        this.jwtUtils = jwtUtils;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String header = request.getHeader("Authorization");
        if (StrUtil.isNotBlank(header) && header.startsWith("Bearer ")) {
            try {
                Claims claims = jwtUtils.parse(header.substring(7), "access");
                UserDTO userDTO = new UserDTO();
                userDTO.setId(Long.valueOf(claims.getSubject()));
                userDTO.setNickName(claims.get("nickName", String.class));
                userDTO.setIcon(claims.get("icon", String.class));
                UserHolder.setUser(userDTO);
            } catch (Exception e) {
                // 过期 / 伪造 / 格式错误：不在这里拦截，交给 LoginInterceptor 判定
            }
        }
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        // 请求结束必须清理 ThreadLocal：
        // 1) 防内存泄漏；2) Tomcat 线程池会复用线程，不清理会导致“串号”（张三拿到李四的用户）
        UserHolder.remove();
    }
}
```

> 命名说明：叫 `RefreshTokenInterceptor`,但它的职责是"刷新 ThreadLocal 里的用户"，不是"刷新 token"。这个名字容易误解，改成 `TokenParseInterceptor` 也完全可以，职责不变。

#### 2.5 修改`config/MvcConfig.java`:配置拦截器

```java
package com.tfsh.config;

import com.tfsh.utils.JwtUtils;
import com.tfsh.utils.LoginInterceptor;
import com.tfsh.utils.RefreshTokenInterceptor;
import jakarta.annotation.Resource;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
class MvcConfig implements WebMvcConfigurer {

    @Resource
    private JwtUtils jwtUtils;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // order(0) 先执行：负责解析 token、填充 UserHolder（放行所有请求）
        registry.addInterceptor(new RefreshTokenInterceptor(jwtUtils)).order(0);
        // order(1) 后执行：负责拦截“未登录”的请求
        registry.addInterceptor(new LoginInterceptor())
                .excludePathPatterns(
                        "/shop/**",
                        "/voucher/**",
                        "/shop-type/**",
                        "/upload/**",
                        "/blog/hot",
                        "/user/code",
                        "/user/login",
                        "/user/refresh"      // 刷新接口凭 refresh token 访问，必须放行
                ).order(1);
    }
}
```

#### 2.6 `dto/LoginResultDTO.java`:新增DTO

```java
package com.tfsh.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 登录 / 刷新接口的统一返回结构。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginResultDTO {
    /** 短期凭证：30 分钟有效，每次业务请求携带 */
    private String accessToken;
    /** 长期凭证：7 天有效，仅用于换取新的 accessToken（用完即换，旧的一律作废） */
    private String refreshToken;
    /** 用户展示信息，前端可直接渲染，不必再请求 /user/me */
    private UserDTO user;
}
```

#### 2.7 `dto/RefreshFormDTO.java`:新增DTO

```java
package com.tfsh.dto;

import lombok.Data;

/**
 * 刷新令牌请求体。
 */
@Data
public class RefreshFormDTO {
    private String refreshToken;
}
```

#### 2.8 修改`utils/RedisConstants.java`:修改常量

新增两行（旧的 `LOGIN_USER_KEY` / `LOGIN_USER_TTL` 先**保留不动**，等全链路验证通过后最后清理，见第 8 章）：

```java
    /** refresh token 白名单：login:refresh:{userId}:{jti} -> "1"，存活时间与 refresh 有效期一致 */
    public static final String LOGIN_REFRESH_KEY = "login:refresh:";

    /** （可选增强）access 黑名单：login:blacklist:{jti}，需要“秒级踢人”时使用，见附录 9.2 */
    public static final String LOGIN_BLACKLIST_KEY = "login:blacklist:";
```

#### 2.9 `Service/IUserService.java`:新增方法声明

接口中新增两个方法声明：

```java
    /** 用 refresh token 换发新的双 token（旧 refresh 立即作废，即轮换） */
    Result refreshToken(String refreshToken);

    /** 登出：删除当前用户的 refresh 白名单记录 */
    Result logout();
```

#### 2.10 修改`Service/impl/UserviceImpl.java`:实现新增方法声明

**① import 调整**：

```java
// 新增
import com.tfsh.dto.LoginResultDTO;
import com.tfsh.utils.JwtUtils;
import io.jsonwebtoken.Claims;

// 可删除（改造后不再使用）
import cn.hutool.core.lang.UUID;          // jti 改用 java.util.UUID，在 JwtUtils 里
import cn.hutool.core.bean.copier.CopyOptions;  // 不再需要把用户塞进 Redis Hash
```

（`BeanUtil` 仍被 refreshToken 使用，保留。）

**② 新增字段**：

```java
    @Resource
    private JwtUtils jwtUtils;
```

**③ `login` 方法：替换原第 7~8 步（"保存用户信息到 redis" 整段）**：

```java
        // 7.签发双 token：access 短（30min，业务请求用）+ refresh 长（7d，换发用）
        UserDTO userDTO = BeanUtil.copyProperties(user, UserDTO.class);
        String accessToken = jwtUtils.createAccessToken(userDTO);
        String refreshToken = jwtUtils.createRefreshToken(user.getId());

        // 8.refresh token 登记进 Redis 白名单（状态最小化：只存“会话是否仍有效”这个开关）
        //   key 里带上 userId 与 jti：支持多设备各自独立、支持精准 / 批量作废
        Claims refreshClaims = jwtUtils.parse(refreshToken, "refresh");
        String refreshKey = LOGIN_REFRESH_KEY + user.getId() + ":" + refreshClaims.getId();
        stringRedisTemplate.opsForValue().set(
                refreshKey, "1",
                jwtUtils.getRefreshTtl(), TimeUnit.MILLISECONDS);

        // 9.返回双 token 与用户信息
        return Result.ok(new LoginResultDTO(accessToken, refreshToken, userDTO));
```

注意：这里**不再**把用户信息存进 Redis——第 2.3.3 节的原则落地。返回结构也从裸字符串变成了 `LoginResultDTO` 对象，前端要同步改（第 5 章）。

**④ 新增 `refreshToken` 方法**：

```java
    @Override
    public Result refreshToken(String refreshToken) {
        // 1.验签并校验类型：过期 / 伪造 / 拿 access 冒充 → 直接拒绝
        Claims claims;
        try {
            claims = jwtUtils.parse(refreshToken, "refresh");
        } catch (Exception e) {
            return Result.fail("登录状态已失效，请重新登录");
        }
        Long userId = Long.valueOf(claims.getSubject());
        String jti = claims.getId();
        String oldKey = LOGIN_REFRESH_KEY + userId + ":" + jti;

        // 2.查 Redis 白名单：这是“可撤销”的关键一步 ——
        //   验签只证明 token 是真的，查 Redis 才证明“这个登录态还没被注销 / 还没被轮换掉”。
        String flag = stringRedisTemplate.opsForValue().get(oldKey);
        if (flag == null) {
            // 旧 refresh 再次出现只有两种可能：客户端 bug，或 token 已泄露。
            // 学习项目这里只拒绝；生产环境建议顺手删掉该用户全部 refresh，强制所有设备重登。
            return Result.fail("登录状态已失效，请重新登录");
        }

        // 3.轮换（rotation）：旧 refresh 立即作废，签发新的一对
        stringRedisTemplate.delete(oldKey);

        User user = getById(userId);
        if (user == null) {
            return Result.fail("用户不存在");
        }
        UserDTO userDTO = BeanUtil.copyProperties(user, UserDTO.class);
        String newAccess = jwtUtils.createAccessToken(userDTO);
        String newRefresh = jwtUtils.createRefreshToken(userId);
        Claims newClaims = jwtUtils.parse(newRefresh, "refresh");
        stringRedisTemplate.opsForValue().set(
                LOGIN_REFRESH_KEY + userId + ":" + newClaims.getId(),
                "1",
                jwtUtils.getRefreshTtl(), TimeUnit.MILLISECONDS);

        return Result.ok(new LoginResultDTO(newAccess, newRefresh, userDTO));
    }
```

> 顺带的一个细节收益：这里**查库重新生成 userDTO**，所以用户改完昵称后，下一次刷新（最长 30 分钟内发生）就会同步到新 access 里。

**⑤ 新增 `logout` 方法**：

```java
    @Override
    public Result logout() {
        // 登出 = 把该用户的所有 refresh 从白名单中移除。
        // 已发出的 access 不单独撤销：它最多再活 30 分钟便会自然过期（短 TTL 兜底）。
        Long userId = UserHolder.getUser().getId();
        Set<String> keys = stringRedisTemplate.keys(LOGIN_REFRESH_KEY + userId + ":*");
        if (keys != null && !keys.isEmpty()) {
            stringRedisTemplate.delete(keys);
        }
        return Result.ok();
    }
```

> `keys()` 在生产环境有阻塞风险（Redis 是单线程），正规做法是 SCAN 游标遍历。学习项目数据量下无碍，但要知道这件事（见第 7 章安全清单第 8 条）。

#### 2.11 修改`controller/UserController.java`修改控制器正确路由

**① 替换 logout**（当前是 TODO）：

```java
    /**
     * 登出功能
     * @return 无
     */
    @PostMapping("/logout")
    public Result logout(){
        // 删除当前用户的 refresh 白名单记录
        return userService.logout();
    }
```

**② 新增 refresh 接口**（放在 logout 附近即可）：

```java
    /**
     * 刷新令牌：用 refresh token 换发新的 access + refresh（旧 refresh 立即作废，即“轮换”）
     */
    @PostMapping("/refresh")
    public Result refresh(@RequestBody RefreshFormDTO form) {
        return userService.refreshToken(form.getRefreshToken());
    }
```

（记得 import `com.tfsh.dto.RefreshFormDTO`。）

## 3.前端核心代码

#### 3.1 `devFE/src/services/http.ts`（完整重写）

这是前端最核心的改动，包含两个关键机制：

1. **请求拦截**：注入 `Authorization: Bearer <access>`；
2. **响应拦截 + 静默刷新（single-flight 单飞模式）**：401 时用 refresh 换新 access 并**重放原请求**；并发 401 只发**一次**刷新请求。

```ts
import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'
import type { Result } from '../types/domain'

const ACCESS_KEY = 'access_token'
const REFRESH_KEY = 'refresh_token'

/** 业务请求实例：带 token 注入与 401 静默刷新逻辑 */
export const http = axios.create({ baseURL: '/api', timeout: 6000 })

/** 裸实例：刷新请求专用，不带任何拦截器，避免“刷新请求 401 又触发刷新”的循环 */
const bare = axios.create({ baseURL: '/api', timeout: 6000 })

// ---------- 请求拦截：统一注入 access token ----------
http.interceptors.request.use((config) => {
  const access = sessionStorage.getItem(ACCESS_KEY)
  if (access) config.headers.authorization = `Bearer ${access}`
  return config
})

// ---------- 静默刷新（single-flight 单飞模式） ----------
let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const refreshToken = sessionStorage.getItem(REFRESH_KEY)
  if (!refreshToken) throw new Error('无 refresh token')
  const res = await bare.post('/user/refresh', { refreshToken })
  const body = res.data as Result<{ accessToken: string; refreshToken: string }>
  if (!body.success || !body.data) throw new Error(body.errorMsg || '刷新失败')
  // 轮换：后端签发的新 refresh 也要同步落库，旧 refresh 已经作废，留着就是定时炸弹
  sessionStorage.setItem(ACCESS_KEY, body.data.accessToken)
  sessionStorage.setItem(REFRESH_KEY, body.data.refreshToken)
  return body.data.accessToken
}

/** 并发 401 只发起一次刷新：所有等待的请求共享同一个 promise */
function refreshOnce(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

// ---------- 响应拦截：401 → 静默刷新 → 重放原请求 ----------
http.interceptors.response.use(
  (response) => {
    const body = response.data
    if (body && body.success === false) return Promise.reject(new Error(body.errorMsg || '请求失败'))
    return body
  },
  async (error) => {
    const original = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined
    // 401 且未重试过：尝试刷新后重放；重试过还 401 说明刷新也失败了，直接登出
    if (original && error.response?.status === 401 && !original._retried) {
      original._retried = true
      try {
        const access = await refreshOnce()
        const retried = {
          ...original,
          headers: { ...(original.headers ?? {}), authorization: `Bearer ${access}` },
        }
        return http.request(retried)
      } catch {
        sessionStorage.removeItem(ACCESS_KEY)
        sessionStorage.removeItem(REFRESH_KEY)
        window.location.href = '/login.html'
      }
    }
    return Promise.reject(error)
  }
)

// 拦截器把后端 Result 提前解包，统一以泛型返回业务 data。
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await http.request<Result<T>>(config)
  const body = response as unknown as Result<T>
  return body.data
}
```

两个必须理解的机制：

- **为什么刷新要用 `bare`（无拦截器的裸实例）**：如果刷新请求也走 `http`，它自己 401 时又会进入"401 → 刷新"分支，形成自我循环。裸实例的 401 直接抛错，被外层 catch 接住后跳登录页——这就是刷新失败的终点。
- **为什么需要 single-flight**：页面一打开常常并发发出 5~10 个请求。access 过期瞬间，这 10 个请求会**同时**收到 401。如果每个都去刷新，10 个刷新请求会并发到达后端——第一个成功轮换（删旧建新），其余 9 个因为旧 refresh 已作废**全部失败**，最终把用户踢回登录页。`refreshOnce` 用"共享同一个 promise"让 10 个 401 只触发 1 次刷新，其余 9 个排队等同一个结果。

#### 3.2 `devFE/src/stores/app.ts`

改动点：token 的 key 从 `token` 换成 `access_token`，`setToken` 改为 `setTokens`（同时存两个）：

```ts
  const token = ref(sessionStorage.getItem('access_token'))
  // 登录接口返回的是 accessToken，用户详情请求可能稍后才完成；两者都属于登录态。
  const loggedIn = computed(() => Boolean(user.value || token.value))
  ...
  function setTokens(access: string, refresh: string) {
    token.value = access
    sessionStorage.setItem('access_token', access)
    sessionStorage.setItem('refresh_token', refresh)
  }
  ...
  function logout() {
    user.value = null
    token.value = null
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('refresh_token')
  }
  return { city, user, isDemo, loggedIn, loadUser, setTokens, useDemoUser, logout }
```

#### 3.3 `types/domain.ts`:数据定义

文件顶部补充类型定义：

```ts
type LoginData = { accessToken: string; refreshToken: string; user?: User }
```

#### 3.3 `devFE/src/views/LoginView.vue`

登录返回值从"裸 token 字符串"变成了 `LoginResultDTO` 对象，`submit()` 里保存逻辑相应修改：

```ts
import type { User } from '../types/domain'

....

const result = await http.post<ApiResult<LoginData>>('/user/login', {
      phone: phone.value,
      code: code.value,
    }) as unknown as ApiResult<LoginData>

    if (!result.success || !result.data) throw new Error(result.errorMsg || '登录失败，请检查验证码')

    const { accessToken, refreshToken } = result.data
    if (typeof app.setTokens === 'function') {
      app.setTokens(accessToken, refreshToken)
    } else {
      // 兼容开发服务器热更新期间仍缓存旧版 store 的情况
      sessionStorage.setItem('access_token', accessToken)
      sessionStorage.setItem('refresh_token', refreshToken)
    }
    await app.loadUser()
    router.push('/home')
```





