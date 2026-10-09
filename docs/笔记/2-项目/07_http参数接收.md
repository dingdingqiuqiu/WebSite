**HTTP 请求就是“请求行 + 请求头 + 请求体”**。参数放在不同位置，Spring 就用不同注解去取。

**最常见的四种**：

1. 路径参数
2. 查询参数
3. 表单参数
4. JSON 参数

但除此之外，还有请求头参数、Cookie、文件等。下面把它们串起来。

---

## 一、先看 HTTP 请求长什么样

一个 HTTP 请求大概是这样：

```http
POST /users/123?from=app HTTP/1.1
Host: localhost:8080
Content-Type: application/json
Cookie: token=abc

{"name":"张三","age":18}
```

拆开看：

| 部分   | 内容                                | 对应参数类型          |
| ------ | ----------------------------------- | --------------------- |
| 请求行 | `POST /users/123?from=app HTTP/1.1` | 路径参数、查询参数    |
| 请求头 | `Host`、`Content-Type`、`Cookie`    | 请求头参数、Cookie    |
| 请求体 | `{"name":"张三","age":18}`          | JSON 参数、表单参数等 |

所以参数分类的本质是：**数据放在 HTTP 请求的哪个位置**。

---

## 二、最常见的参数对应关系

### 1. 路径参数（Path Variable）

数据在 URL 路径里：

```http
GET /users/123
```

这里的 `123` 就是路径参数。

Spring 写法：

```java
@GetMapping("/users/{id}")
public User getUser(@PathVariable("id") Long id) { ... }
```

前端发送：

```js
fetch("/users/123");
```

---

### 2. 查询参数（Query Parameter）

数据在 URL 问号后面：

```http
GET /sendCode?phone=181&type=login
```

Spring 写法：

```java
@GetMapping("/sendCode")
public Result sendCode(
        @RequestParam("phone") String phone,
        @RequestParam("type") String type) { ... }
```

前端发送：

```js
axios.get("/sendCode", { params: { phone: "181", type: "login" } });
```

---

### 3. 表单参数（Form Parameter）

数据在请求体里，Content-Type 是：

- `application/x-www-form-urlencoded`
- 或 `multipart/form-data`（文件上传）

普通表单：

```http
POST /login HTTP/1.1
Content-Type: application/x-www-form-urlencoded

username=zhangsan&password=123
```

Spring 写法：

```java
@PostMapping("/login")
public Result login(
        @RequestParam("username") String username,
        @RequestParam("password") String password) { ... }
```

也可以用对象接收：

```java
@PostMapping("/login")
public Result login(UserForm form) { ... }
```

前端发送：

```html
<form action="/login" method="post">
    <input name="username">
    <input name="password">
</form>
```

或者：

```js
axios.post("/login", new URLSearchParams({ username: "zhangsan", password: "123" }));
```

注意：`@RequestParam` 既能取查询参数，也能取表单参数。Spring 把两者统一看作“请求参数”。

---

### 4. JSON 参数（JSON Body）

数据在请求体里，Content-Type 是 `application/json`：

```http
POST /users HTTP/1.1
Content-Type: application/json

{"name":"张三","age":18}
```

Spring 写法：

```java
@PostMapping("/users")
public Result create(@RequestBody UserDTO dto) { ... }
```

前端发送：

```js
axios.post("/users", { name: "张三", age: 18 });
```

注意：`@RequestParam` **取不到** JSON 请求体，必须用 `@RequestBody`。

---

## 三、除了这四种，还有哪些？

### 1. 请求头参数（Header）

数据在请求头里：

```http
GET /user HTTP/1.1
Authorization: Bearer abc123
```

Spring 写法：

```java
@GetMapping("/user")
public Result getUser(@RequestHeader("Authorization") String token) { ... }
```

前端发送：

```js
axios.get("/user", { headers: { Authorization: "Bearer abc123" } });
```

---

### 2. Cookie 参数

数据在 `Cookie` 请求头里：

```http
GET /user HTTP/1.1
Cookie: token=abc123
```

Spring 写法：

```java
@GetMapping("/user")
public Result getUser(@CookieValue("token") String token) { ... }
```

---

### 3. 矩阵变量（Matrix Variable）

数据在 URL 路径里，用分号分隔：

```http
GET /users;id=123;name=zhangsan
```

Spring 写法：

```java
@GetMapping("/users/{id}")
public Result getUser(@MatrixVariable("name") String name) { ... }
```

这个很少用，了解即可。

---

### 4. 文件参数（Multipart）

表单上传文件时：

```http
POST /upload HTTP/1.1
Content-Type: multipart/form-data; boundary=----xxx

------xxx
Content-Disposition: form-data; name="file"; filename="a.txt"
...
```

Spring 写法：

```java
@PostMapping("/upload")
public Result upload(@RequestParam("file") MultipartFile file) { ... }
```

本质还是表单参数，只是 Content-Type 是 `multipart/form-data`。

---

## 四、总结成一张表

| 参数类型   | 在 HTTP 的位置             | Spring 注解                   | 前端常见发送方式             |
| ---------- | -------------------------- | ----------------------------- | ---------------------------- |
| 路径参数   | URL 路径                   | `@PathVariable`               | `/users/123`                 |
| 查询参数   | URL 问号后                 | `@RequestParam`               | `?phone=181`                 |
| 表单参数   | 请求体（form-urlencoded）  | `@RequestParam` / 对象        | `<form>` / `URLSearchParams` |
| JSON 参数  | 请求体（application/json） | `@RequestBody`                | `axios.post(url, obj)`       |
| 请求头参数 | 请求头                     | `@RequestHeader`              | `headers: {...}`             |
| Cookie     | `Cookie` 请求头            | `@CookieValue`                | 浏览器自动带                 |
| 矩阵变量   | URL 路径（分号）           | `@MatrixVariable`             | 很少用                       |
| 文件       | 请求体（multipart）        | `@RequestParam MultipartFile` | `FormData`                   |

所以：

> 你总结的“路径参数、查询参数、表单参数、JSON 参数”是**最常用的四种**，但严格来说，参数位置不止这四种。  
> 判断用哪个注解，关键看：**数据在 HTTP 的哪个位置**。

---

## 五、一句话记住

> HTTP 请求分请求行、请求头、请求体。  
> 路径参数在 URL 路径，查询参数在 URL 问号后，表单参数在请求体（form-urlencoded），JSON 参数在请求体（application/json）。  
> 不同位置，Spring 用不同注解取：`@PathVariable`、`@RequestParam`、`@RequestBody`、`@RequestHeader`、`@CookieValue` 等。

---

我反问你三个问题，你试着回答：

1. `@RequestParam` 能同时取查询参数和表单参数，那它能取 JSON 请求体里的参数吗？为什么？
2. `GET /users/123?from=app` 这个请求里，`123` 和 `app` 分别是什么参数？各用什么注解取？
3. 如果前端发的是 `axios.post("/login", { username: "zhangsan" })`，后端应该用 `@RequestParam` 还是 `@RequestBody`？为什么？

## 1. `@RequestParam` 不能取 JSON 请求体，因为需要 `@RequestBody`

✅ 正确。

更底层的原因：

`@RequestParam` 取的是 **Servlet 的 parameter map**，也就是：

```java
request.getParameter("phone")
```

这个 parameter map 里有什么？

- URL 查询参数：`?phone=181`
- `application/x-www-form-urlencoded` 表单参数
- `multipart/form-data` 表单字段

但 **JSON 请求体不会被放进去**：

```html
POST /login
Content-Type: application/json

{"phone":"181"}
```

Servlet 容器不会把 `{"phone":"181"}` 解析成 `phone=181` 塞进 parameter map。
所以 `@RequestParam("phone")` 取不到，返回 null 或直接 400。

JSON 请求体必须用：

```java
@RequestBody LoginDTO dto
```

因为 `@RequestBody` 会触发 `HttpMessageConverter`，让 Jackson 读请求体并反序列化成 Java 对象。

一句话：

> `@RequestParam` 走的是 Servlet 参数表；
> `@RequestBody` 走的是 HTTP 消息转换器。

你这个问题问得很准，直接指向了 axios 自动判断机制里一个容易踩坑的地方。

`axios.post("/login", "username=zhangsan", {});` 发出去后，**后端用 `@RequestParam("username")` 大概率取不到值**。

我们来看它实际会发什么。

---

### 实际会发什么？

第三个参数 `{}` 是空配置对象，等于什么都没设置。关键在于 axios 如何“理解”第二个参数 `"username=zhangsan"`。

这个行为**取决于 axios 版本和运行环境**，存在两种可能：

**情况 A：Content-Type 被设为 `application/x-www-form-urlencoded`**
部分 axios 版本（尤其是旧版 0.x）会把普通字符串视为表单编码数据，自动设置正确的 Content-Type。
```http
POST /login
Content-Type: application/x-www-form-urlencoded

username=zhangsan
```
这时**后端可以**用 `@RequestParam("username")` 取到。

**情况 B：Content-Type 被设为 `text/plain`**
在另一些版本或环境下，axios 不会特殊处理普通字符串，交给浏览器或 Node.js 的默认行为，可能变成 `text/plain`。
```http
POST /login
Content-Type: text/plain

username=zhangsan
```
这时 **Servlet 容器不会把请求体解析成参数表**，`@RequestParam("username")` 取不到，会返回 `null` 或 400。

---

### 为什么会有这种不确定性？

`@RequestParam` 取值的底层是 `request.getParameter("username")`。Servlet 规范规定，容器**只对特定 Content-Type 的请求体做参数解析**：

- `application/x-www-form-urlencoded`
- `multipart/form-data`

`text/plain` 不在其中，请求体只是原始字节流，不会进入参数表。

axios 对 `URLSearchParams` 对象有明确的自动处理分支，一定会设成 `application/x-www-form-urlencoded`；但对**普通字符串**的处理策略在不同版本间并不统一，所以不能依赖它“自动正确”。

---

### 为什么 `URLSearchParams` 没有这个问题？

因为 `URLSearchParams` 是一个**有明确类型的对象**，axios 内部能可靠识别它，并**强制**执行表单编码逻辑。普通字符串只是一个 `string`，axios 的“身份判断”没有足够信息决定该怎么处理。

---

### 一句话总结

> `axios.post("/login", "username=zhangsan", {})` 发出的 Content-Type **不确定**，可能是 `application/x-www-form-urlencoded`，也可能是 `text/plain`。只有前者能被 `@RequestParam` 解析。  
> 要**保证**后端用 `@RequestParam` 能取到，前端应该用 `new URLSearchParams(...)`，而不是依赖普通字符串的自动推断。