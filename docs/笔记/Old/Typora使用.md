# 知识补全

## 环境信息

```bash
Typora-1.10.8
Mac-M4
```

## 文件结构

Mach-O 可执行文件里，每个 segment（段）在加载命令里都记录着两套地址：

| 字段      | 含义                                             |
| --------- | ------------------------------------------------ |
| `vmaddr`  | 这个段被**映射到虚拟内存**的地址（运行时的地址） |
| `fileoff` | 这个段在**文件里**的起始偏移                     |

它们之间的关系是：

```
文件偏移 = slice文件起始 + (符号vmaddr - __TEXT的vmaddr)
        = slice文件起始 + (符号vmaddr - 0x100000000)
```

Arm结构的芯片`slice文件起始`为`0x180000`;x86_64 架构的芯片`slice文件起始`为`0x4000 `

macOS 上 `__TEXT` 段通常 `fileoff = 0`、`vmaddr = 0x100000000`（这是“首选加载地址”，ASLR 会在运行时再加一个随机 slide，但**符号表和加载命令里存的是未加 slide 的地址**，所以换算时用 0x100000000 这个固定值）。

```bash
// arm下的MacOS
文件偏移 = slice文件起始 + (符号vmaddr - __TEXT的vmaddr)
        = slice文件起始 + (符号vmaddr - 0x100000000)
        = 0x180000 + 符号vmaddr - 0x100000000
        = 符号vmaddr - 0xffe80000
```

**关键点**：符号表（`nm` 读出来的）里存的地址是 **vmaddr 体系下的虚拟地址**，而补丁要写的是**文件里的字节偏移**。攻击者要做的就是把前者换算成后者。

### 第一步：查看虚拟偏移地址

```bash
cd /Applications/Typora.app/Contents/MacOS/     
```

```bash
nm -m Typora | grep hasLicense
```

有以下的输出

```bash
% nm -m Typora | grep hasLicense
000000010006ce5c (__TEXT,__text) non-external -[LicenseManager hasLicense]
00000001000ea1a8 (__DATA,__objc_ivar) non-external (was a private external) _OBJC_IVAR_$_LicenseManager._hasLicense
0000000100088ca0 (__TEXT,__objc_stubs) non-external (was a private external) _objc_msgSend$hasLicense
```
我们拿`LicenseManager hasLicense`的`10006ce5c`举例

nm 输出里 hasLicense 对应的地址是类似 0x10006ce5c 这样的值——这是该函数在内存里的（未加 ASLR slide 的）虚拟地址。

这就是攻击者“定位函数在哪”的第一步：因为符号没 stripping，直接能查到函数名 → 虚拟地址的对应关系。

### 第二步：看 fat binary 的 slice 布局（otool -f）
但Typora 是通用二进制（fat/universal binary）​，一个文件里塞了多个架构的独立镜像：

```bash
cd /Applications/Typora.app/Contents/MacOS/  
```

```bash
otool -f Typora
```

输出类似

```bash
% otool -f Typora
Fat headers
fat_magic 0xcafebabe
nfat_arch 2
architecture 0
    cputype 16777223
    cpusubtype 3
    capabilities 0x0
    offset 16384      ← x86_64 slice 在文件里的起始 实际上就是 0x4000 
    size 1555472
    align 2^14 (16384)
architecture 1
    cputype 16777228
    cpusubtype 0
    capabilities 0x0
    offset 1572864   ← arm64 slice 在文件里的起始 实际上就是0x180000 
    size 1624720
    align 2^14 (16384)
```


为什么需要这一步：fat 文件里每个架构的 __TEXT 段 vmaddr 都是 0x100000000，但它们在文件里的位置不同（x86_64 从 0x4000 开始，arm64 从 0x180000 开始）。所以必须知道你要改的架构 slice 在文件里的起点，才能算出绝对文件偏移。

### 第三步：看 segment 的 vmaddr/fileoff 关系（otool -l）

```bash
otool -l Typora > /tmp/text.txt
```

```bash
vi /tmp/text.txt
```

搜索

```bash
segname __TEXT
   vmaddr 0x0000000100000000
   vmsize 0x00000000000c1000
  fileoff 0
```

TEXT 段：文件偏移 0 ↔ 虚拟地址 0x100000000，两者相差固定基址 0x100000000。

### 第四步：换算公式及推导

有了上面三个数据，公式就出来了：

```bash
vmaddr = fileoff + 固定基址（slide） 
fileoff = vmaddr - __TEXT的vmaddr(固定基置)
```

```bash
文件偏移 = slice文件起始 + (符号vmaddr - __TEXT的vmaddr)
        = slice文件起始 + (符号vmaddr - 0x100000000)
```


推导逻辑：

符号vmaddr - 0x100000000 得到的是“该符号距离 __TEXT 段起点多少字节”，也就是在 slice 内部的相对偏移；
再加上这个 slice 在 fat 文件里的起始位置，就得到绝对文件偏移。
### 第五步：例子验证
拿 arm64 的 hasLicense 算一遍：

符号vmaddr = 0x10006ce5c

```bash
文件偏移 = slice文件起始 + (符号vmaddr - __TEXT的vmaddr)
        = slice文件起始 + (符号vmaddr - 0x100000000)
        = 0x180000 + 符号vmaddr - 0x100000000
        = 符号vmaddr - 0xffe80000
        = 0x10006ce5c - 0xffe80000
        = 0x1ece5c
```

我们去文件偏移量`0x1ece5c`的地方就能修改`hasLicense`的数值

# 逻辑逆向

基于上面的偏移换算，接下来要做的是**在反汇编里找到「该改哪条指令」**。

核心思路：先锁定函数 → 反汇编 → 识别关键字符串 → 还原逻辑 → 定位到那条把 `v20` 传给 `numberWithBool:` 的指令。

## 第一步：锁定目标函数（nm）

激活逻辑都集中在 `LicenseManager` 类里，符号没被 strip，直接查：

> `strip` 就是从编译好的二进制里**删掉符号表**（函数名、类名、方法名等调试/链接信息），让 `nm` 等工具无法再直接看到函数名和地址，从而大幅提高逆向定位的难度。

```bash
cd /Applications/Typora.app/Contents/MacOS/ 
```

```bash
nm -m Typora | grep -i LicenseManager
```

这里输出的字段很多

```bash
% nm -m Typora | grep -i LicenseManager
000000010006dec4 (__TEXT,__text) non-external +[LicenseManager rawMachineId]
000000010006cc94 (__TEXT,__text) non-external +[LicenseManager sharedInstance]
0000000100070b30 (__TEXT,__text) non-external -[LicenseManager .cxx_destruct]
000000010006e7c8 (__TEXT,__text) non-external -[LicenseManager _readLicenseInfo:]
000000010007004c (__TEXT,__text) non-external -[LicenseManager activate:with:callback:]
0000000100070058 (__TEXT,__text) non-external -[LicenseManager activate:with:force:callback:]
000000010006d460 (__TEXT,__text) non-external -[LicenseManager calcInstallDateFromOldConfig]
000000010006ce70 (__TEXT,__text) non-external -[LicenseManager cannotContonueUse:]
000000010006f324 (__TEXT,__text) non-external -[LicenseManager dayRemainsFrom:]
000000010006f31c (__TEXT,__text) non-external -[LicenseManager dayRemains]
000000010006f274 (__TEXT,__text) non-external -[LicenseManager daysFrom:To:]
........
```

名字就能看出分工：

| 符号                | 作用                                          |
| ------------------- | --------------------------------------------- |
| `readLicenseInfo`   | 读 license 文件、算激活状态、写 `_hasLicense` |
| `_readLicenseInfo:` | 底层：读文件 + 解密 + 反序列化                |
| `hasLicense`        | getter，读 `_hasLicense` 返回                 |
| `unfillLicense`     | 把状态置为「未激活」                          |
| `renew`             | 联网续期（会覆盖本地状态）                    |
| `_hasLicense`       | 实例变量，**真正的激活状态**（偏移 `0x18`）   |

**这一步的意义**：拿到「函数名 → 虚拟地址」的映射，后面所有反汇编都围绕这些地址展开。

其中`_hasLicense`是我们要`patch`的核心字段 因此先看他出现的函数

```bash
nm -m Typora | grep -i readLicenseInfo 
```

关键输出（arm64 视角）：

```bash
% nm -m Typora | grep -i readLicenseInfo 
000000010006e7c8 (__TEXT,__text) non-external -[LicenseManager _readLicenseInfo:]
000000010006e588 (__TEXT,__text) non-external -[LicenseManager readLicenseInfo]
0000000100084240 (__TEXT,__objc_stubs) non-external (was a private external) _objc_msgSend$_readLicenseInfo:
000000010008cac0 (__TEXT,__objc_stubs) non-external (was a private external) _objc_msgSend$readLicenseInfo
```

一条命令把搜索空间从「整个二进制」压到「一个函数」（`readLicenseInfo` 起点 `0x10006e588`，到 `_readLicenseInfo:` 起点 `0x10006e7c8`，共约 150 条指令）。

## 步骤 2：用「唯一调用签名」收窄到「一条指令」

**决策**：不逐行读，直接 grep `numberWithBool:`——它在 `readLicenseInfo` 里**只出现一次**，是唯一签名。

```bash
otool -tvV -arch arm64 Typora | sed -n '/10006e588/,/10006e7c8/p' | grep -B4 "numberWithBool" 
```

一句话：这条命令是把 Typora 可执行文件的 arm64 反汇编结果中，地址 `10006e588` 到 `10006e7c8` 这段代码里所有出现 `numberWithBool`（Objective-C 的 `NSNumber` 布尔值构造方法）的地方，连同它前面 4 行指令一起打印出来，用来逆向分析这段代码是怎么生成布尔型 `NSNumber` 的。

拆解：

- `otool -tvV -arch arm64 Typora`：反汇编 Typora 的 arm64 架构代码段（`-t` 文本段、`-v` 反汇编、`-V` 显示符号名）。
- `sed -n '/10006e588/,/10006e7c8/p'`：只截取这两个地址之间的行。
- `grep -B4 "numberWithBool"`：匹配含 `numberWithBool` 的行，并显示其前 4 行（`-B4`）作为上下文。

```bash
% otool -tvV -arch arm64 Typora | sed -n '/10006e588/,/10006e7c8/p' | grep -B4 "numberWithBool"
000000010006e738	mov	x21, x0
000000010006e73c	adrp	x8, 123 ; 0x1000e9000
000000010006e740	ldr	x0, [x8, #0x2a8] ; Objc class ref: _OBJC_CLASS_$_NSNumber
000000010006e744	mov	w2, #0x2
000000010006e748	bl	"_objc_msgSend$numberWithBool:"
```

**为什么这是关键一步**：`numberWithBool:` 的实参在 `x2`，而设置 `x2` 的那条指令就在调用点正上方。grep 一次，目标直接暴露。

> w2操作的也是寄存器2 只不过w2的语意是仅操作低位；x2的语意是全量操作 至于赋值内容 也可为2 也可为1

------

## 步骤 3：读出地址

`numberWithBool:` 前一条指令的地址就是 `0x10006e744`。

（原始未打补丁时，这条是 `mov x2, x20`，字节 `e20314aa`；当前二进制已打过补丁，所以显示成 `mov w2, #0x2`。）

同理可以用命令捞出来联网验证的地址`10006f83c`

```bash
% nm -m Typora | grep -i reNew           
000000010006f83c (__TEXT,__text) non-external -[LicenseManager renew]
000000010006fb70 (__TEXT,__text) non-external ___23-[LicenseManager renew]_block_invoke
000000010008d3c0 (__TEXT,__objc_stubs) non-external (was a private external) _objc_msgSend$renew
```

### 操作

```python
#!/usr/bin/env python3
"""Typora 1.10.8 (7385) 本地补丁：激活 + 阻断联网续期

核心思路：
  1) readLicenseInfo 里把 numberWithBool: 的参数强制为 1
     -> _hasLicense 实例变量(偏移 0x18)被写成 @(YES)
     -> postNotification 读该 ivar 的 boolValue == YES -> 发 "fillLicense" -> UI 已激活
  2) renew 直接 ret
     -> 跳过启动时的 api/client/renew 联网请求
     -> 服务器响应既不会 writeLicenseInfo 覆盖本地凭证，也不会 unfillLicense 置为未激活
"""
import sys

path = "/Applications/Typora.app/Contents/MacOS/Typora"

# (名称, 文件偏移, 原始字节, 补丁字节)
patches = [
    # ---- 核心 1：让 _hasLicense 恒为 YES ----
    ("arm64  readLicenseInfo@BOOL", 0x1ee744, "e20314aa", "22008052"),   # mov x2,x20 -> mov w2,#1
    # ("x86_64 readLicenseInfo@BOOL", 0x85785,  "450fb6ff4489fa", "ba010000009090"),  # movzbl+movl -> movl $1,%edx; nop; nop

    # ---- 核心 2：阻断联网续期 ----
    ("arm64  renew->ret",          0x1ef83c, "ff8303d1", "c0035fd6"),   # sub sp,sp,#0xe0 -> ret
    # ("x86_64 renew->ret",          0x86b86,  "55",        "c3"),         # pushq %rbp -> ret
]

def main():
    try:
        data = bytearray(open(path, "rb").read())
    except FileNotFoundError:
        print(f"[错误] 找不到文件: {path}")
        sys.exit(1)
    except PermissionError:
        print(f"[错误] 无权限写入: {path}（请确认已关闭 Typora，必要时用 sudo）")
        sys.exit(1)

    for name, off, orig_hex, patch_hex in patches:
        orig = bytes.fromhex(orig_hex)
        patch = bytes.fromhex(patch_hex)
        actual = bytes(data[off:off + len(orig)])
        if actual == patch:
            print(f"[跳过] {name} @0x{off:x}: 已是补丁字节 {patch_hex}")
            continue
        assert actual == orig, (
            f"{name}: 原始字节不匹配！got {actual.hex()} want {orig_hex}（版本可能不对）"
        )
        data[off:off + len(patch)] = patch
        print(f"[OK] {name} @0x{off:x}: {orig_hex} -> {patch_hex}")

    open(path, "wb").write(data)
    print("\n补丁完成，请重签：")
    print("  codesign --force --deep --sign - --timestamp=none /Applications/Typora.app")
    print("  codesign --verify --verbose=2 /Applications/Typora.app")

if __name__ == "__main__":
    main()

```
执行程序

```bash
python3 patch_typora
```

重新签名

```bash
codesign --force --deep --sign - --timestamp=none /Applications/Typora.app
```

```bash
codesign --verify --verbose=2 /Applications/Typora.app
```

# 附录

当前最新版本为`1.14.10`

```python
#!/usr/bin/env python3
"""Typora 1.14.10 (7786) 本地补丁：激活 + 阻断联网续期（无需 DYLD 注入）

核心思路（第一性原理）：
  1) readLicenseInfo 里把 numberWithBool: 的实参强制为 1
     -> _hasLicense 实例变量(偏移 0x18)被写成 @(YES)
     -> postNotification 读该 ivar 的 boolValue == YES -> 发 "fillLicense" -> UI 已激活
  2) renew 直接 ret
     -> 跳过启动时的 api/client/renew 联网请求
     -> 服务器响应既不会 writeLicenseInfo 覆盖本地凭证，也不会 unfillLicense 置为未激活

版本对应：Typora 1.14.10 (7786)
  arm64  slice 文件起始 = 0x194000
  x86_64 slice 文件起始 = 0x4000
  两个切片 __TEXT vmaddr = 0x100000000, fileoff = 0
  整文件偏移 = slice 起始 + (符号 vmaddr - 0x100000000)
"""
import sys

path = "/Applications/Typora.app/Contents/MacOS/Typora"

# (名称, 文件偏移, 原始字节, 补丁字节)
patches = [
    # ---- 核心 1：让 _hasLicense 恒为 YES ----
    ("arm64  readLicenseInfo@BOOL", 0x2064b4, "e20314aa", "22008052"),   # mov x2,x20 -> mov w2,#1
    ("x86_64 readLicenseInfo@BOOL", 0x8cf90,  "450fb6ff4489fa", "ba010000009090"),  # movzbl+movl -> movl $1,%edx; nop; nop

    # ---- 核心 2：阻断联网续期 ----
    ("arm64  renew->ret",          0x207684, "ff8303d1", "c0035fd6"),   # sub sp,sp,#0xe0 -> ret
    ("x86_64 renew->ret",          0x8e4e6,  "55",        "c3"),         # pushq %rbp -> ret
]


def main():
    try:
        data = bytearray(open(path, "rb").read())
    except FileNotFoundError:
        print(f"[错误] 找不到文件: {path}")
        sys.exit(1)
    except PermissionError:
        print(f"[错误] 无权限写入: {path}（请确认已关闭 Typora，必要时用 sudo）")
        sys.exit(1)

    for name, off, orig_hex, patch_hex in patches:
        orig = bytes.fromhex(orig_hex)
        patch = bytes.fromhex(patch_hex)
        actual = bytes(data[off:off + len(orig)])
        if actual == patch:
            print(f"[跳过] {name} @0x{off:x}: 已是补丁字节 {patch_hex}")
            continue
        assert actual == orig, (
            f"{name}: 原始字节不匹配！got {actual.hex()} want {orig_hex}（版本可能不对）"
        )
        data[off:off + len(patch)] = patch
        print(f"[OK] {name} @0x{off:x}: {orig_hex} -> {patch_hex}")

    open(path, "wb").write(data)
    print("\n补丁完成，请重签：")
    print("  codesign --force --deep --sign - --timestamp=none /Applications/Typora.app")
    print("  codesign --verify --verbose=2 /Applications/Typora.app")


if __name__ == "__main__":
    main()

```

# 原理附录

## 1. 第一性原理：从「未激活」倒推到「改哪条指令」

### 1.1 UI 为什么显示「未激活」

Typora 是 WebView 应用，界面由 JS 的一个布尔值控制：

```js
window.File.option.hasLicense = true;   // 已激活
window.File.option.hasLicense = false;  // 未激活
```

这个 JS 值由原生层的一条通知驱动。原生层 `postNotification` 的关键逻辑：

```objc
BOOL has = [self->_hasLicense boolValue];   // ★ 直接读实例变量，不经过任何 getter
NSString *name = has ? @"fillLicense" : @"unfillLicense";
// 发通知 → JS 层把 File.option.hasLicense 置为 true/false
```

所以：**`_hasLicense` 的 `boolValue` 就是最终真相。** 它是 `NO`，UI 就显示未激活。

### 1.2 `_hasLicense` 是怎么被写进去的

启动时 `readLicenseInfo` 会执行（伪代码）：

```objc
- (void)readLicenseInfo {
    NSMutableDictionary *dict = [self _readLicenseInfo:path]; // 读文件+解密+反序列化
    self->_licenseDict = dict;                                // 偏移 0x8

    // v20 = 字典里同时有 "email" 和 "license" 两个键
    BOOL v20 = (dict[@"email"] != nil && dict[@"license"] != nil);

    BOOL v21 = [self hasLicense];                             // getter

    // ★ 关键：把 v20 写进 _hasLicense
    self->_hasLicense = [NSNumber numberWithBool:v20];        // 偏移 0x18

    self->_installDate = dict[@"installDate"];                // 偏移 0x10
    [self ensureInstallDate];

    if (v20 != v21) {
        [self postNotification];   // 状态变化时才发通知
    }
}
```

未激活时 license 文件是空/无效的，`dict` 是空字典，所以：

```text
v20 = false
_hasLicense = @(NO)
```

这就是「未激活」的根源。

### 1.3 结论：改「写」的那一步，不改「读」的那一步

`hasLicense` getter 只是「读」`_hasLicense` 再返回；而 `postNotification` 是**直接 `ldr x0,[x0,#0x18]` 读 ivar**，根本不经过 getter。

所以：

- ❌ 只 patch `hasLicense` getter → 没用，骗不过 `postNotification` 对 ivar 的直接读取。
- ✅ patch `numberWithBool:` 的实参 → 直接决定 `_hasLicense` 被写成什么。

**要改的是「把 v20 喂给 `numberWithBool:`」的那条指令。**

---

## 2. 补丁一：强制 `_hasLicense = @(YES)`

### 2.1 定位那条指令（1.14.10 实测）

`readLicenseInfo` 反汇编（arm64）里，`numberWithBool:` 调用点：

```asm
00000001000724a4  bl   _objc_msgSend$hasLicense
00000001000724a8  mov  x21, x0
00000001000724ac  adrp x8, 130 ; 0x1000f4000
00000001000724b0  ldr  x0, [x8, #0x148] ; _OBJC_CLASS_$_NSNumber
00000001000724b4  mov  x2, x20            ; ★ x2 = v20（BOOL 实参）
00000001000724b8  bl   "_objc_msgSend$numberWithBool:"
```

ARM64 的 ObjC 调用约定：`objc_msgSend(receiver=x0, selector=x1, arg1=x2)`。
所以 `x2` 就是 `numberWithBool:` 的 BOOL 实参，而设置它的正是 `0x1000724b4` 这条 `mov x2, x20`。

### 2.2 arm64 改法（逐字节）

```asm
原来:  mov x2, x20     ; e2 03 14 aa   → x2 = v20（真实校验结果，未激活时 = 0）
现在:  mov w2, #0x1    ; 22 00 80 52   → x2 = 1（恒真）
```

`mov w2, #1` 只写低 32 位并零扩展，等价于 `x2 = 1`，正好是 `BOOL YES`。
之后 `numberWithBool:1` → 内部 `value ? @YES : @NO` → 恒返回 `@YES` → `_hasLicense = @(YES)`。

### 2.3 为什么用 `w2` 而不是 `x2`

`w2` 是 `x2` 的低 32 位。ARM64 的规则是：

- 写 `wN`（32 位）时，硬件自动把 `xN` 的高 32 位清零；
- 写 `xN`（64 位）时，整个 64 位都写。

`BOOL` 只需要低字节，`mov w2, #1`（`22008052`）和 `mov x2, #1`（`d2800022`）**功能完全等价**，最终 `x2` 都是 `1`。

用 `w2` 有三个理由：

1. **语义惯例**：小整数/布尔值用 `w`，指针/地址才用 `x`。
2. **与上下文一致**：原代码里 `v20` 本来也是 32 位算出来的（`cset w20, ne`），所以实参也用 32 位 `w2`。
3. **编码更短**：`mov w2,#1` 是 4 字节；`mov x2,#1` 也是 4 字节，但 `w` 版本是「零扩展」语义，明确表示「这是个小值」。

### 2.4 x86_64 改法（逐字节，Rosetta 备用）

```asm
原来:  movzbl %r15b, %r15d   ; 45 0f b6 ff
       movl   %r15d, %edx    ; 44 89 fa      → edx = v20
现在:  movl   $1, %edx       ; ba 01 00 00 00 → edx = 1
       nop                   ; 90
       nop                   ; 90
```

`edx` 是 x86-64 的第三个整型参数寄存器（`numberWithBool:` 的 BOOL 实参），强制为 `1`。
原两条指令共 7 字节，补丁 `movl $1,%edx`(5 字节) + 两个 `nop`(2 字节) 正好填满 7 字节，不改变后续指令偏移。

### 2.5 为什么是 `#1` 而不是 `#2`

`BOOL` 的规范真值是 `1`（`YES`）。`mov w2, #1` 编码为 `22008052`。

> 之前脚本误写成 `mov w2, #2`（字节 `42008052`）。`2` 也是非零，`numberWithBool:` 照样返回 `@YES`，
> 功能上等价，但 `#1` 才是语义正确的 `YES`。本文已统一改为 `#1`。

---

## 3. 补丁二：`renew -> ret`（阻断联网）

### 3.1 为什么必须阻断

`renew` 是启动时被尾调用的联网续期函数，会向 `store.typora.io/api/client/renew` 发 POST。
它的回调逻辑：

```objc
if (success) {
    if ([response[@"success"] boolValue])
        [self writeLicenseInfo:...];   // 成功 → 覆盖本地凭证
    else
        [self unfillLicense];          // 成功但假 → 置为未激活
} else {
    dict[@"retry"] = @(...+1);         // 网络失败 → 只加计数
}
```

只要 `renew` 真的发出请求，服务器响应就有两条路会伤害本地状态：

- **成功** → `writeLicenseInfo` 覆盖本地伪造凭证。
- **成功但标志为假** → `unfillLicense` 把 `_hasLicense` 置为 `NO`。

所以必须从源头把 `renew` 变成空操作。

### 3.2 改法

把 `renew` 第一条指令（栈帧分配）改成 `ret`：

```asm
arm64:  sub sp, sp, #0xe0   ; ff 83 03 d1  →  ret  ; c0 03 5f d6
x86_64: pushq %rbp          ; 55           →  ret  ; c3
```

函数直接返回，`api/client/renew` 请求根本不发，服务器没有机会走上面任何一条分支。

---

## 4. 偏移量（怎么算出来的）

### 4.1 先看 fat binary 的 slice 布局

Typora 是 fat/universal 二进制，一个文件里塞了多个架构的独立镜像。用 `otool -f` 看：

```bash
otool -f /Applications/Typora.app/Contents/MacOS/Typora
```

输出（1.14.10 实测）：

```text
architecture 0
    cputype 16777223     ← x86_64
    offset 16384         ← 0x4000
    size 1634704
architecture 1
    cputype 16777228     ← arm64
    offset 1654784       ← 0x194000   ★ 注意：新版不是 0x180000
    size 1673952
```

两个架构切片在文件里的起始不同：

```text
x86_64 slice: fileoff = 0x4000
arm64  slice: fileoff = 0x194000
```

### 4.2 看 segment 的 vmaddr/fileoff 关系

```bash
otool -l -arch arm64 /Applications/Typora.app/Contents/MacOS/Typora | grep -A4 "segname __TEXT"
```

输出：

```text
  segname __TEXT
   vmaddr 0x0000000100000000
   vmsize 0x00000000000cc000
  fileoff 0
```

`__TEXT` 段 `fileoff = 0`、`vmaddr = 0x100000000`（首选加载地址，ASLR 运行时再加随机 slide，但符号表和加载命令里存的是未加 slide 的地址）。

### 4.3 换算公式

```text
整文件偏移 = slice 文件起始 + (符号 vmaddr - __TEXT 的 vmaddr)
          = slice 文件起始 + (符号 vmaddr - 0x100000000)
```

推导逻辑：`符号 vmaddr - 0x100000000` 得到「该符号距离 `__TEXT` 段起点多少字节」，即 slice 内部相对偏移；再加上这个 slice 在 fat 文件里的起始位置，就得到绝对文件偏移。

### 4.4 例子验证（arm64）

```bash
# 第一步：查符号（nm 读出来的是 vmaddr 体系下的虚拟地址）
nm -arch arm64 /Applications/Typora.app/Contents/MacOS/Typora | grep -i "LicenseManager readLicenseInfo"

# 第二步：反汇编定位 numberWithBool: 调用点
otool -tvV -arch arm64 /Applications/Typora.app/Contents/MacOS/Typora | sed -n '/1000722f8/,/100072538/p'
```

拿 `readLicenseInfo` 里的 `mov x2, x20` 算一遍：

```text
符号 vmaddr = 0x1000724b4
整文件偏移 = 0x194000 + (0x1000724b4 - 0x100000000)
          = 0x194000 + 0x724b4
          = 0x2064b4
```

去文件偏移 `0x2064b4` 读 4 字节，得到 `e20314aa`（`mov x2,x20`），验证通过。

### 4.5 完整偏移表（1.14.10）

| 补丁                 | 架构   | 符号 vmaddr   | 整文件偏移 | 原始字节         | 补丁字节         |
| -------------------- | ------ | ------------- | ---------- | ---------------- | ---------------- |
| readLicenseInfo@BOOL | arm64  | `0x1000724b4` | `0x2064b4` | `e20314aa`       | `22008052`       |
| readLicenseInfo@BOOL | x86_64 | `0x100088f90` | `0x8cf90`  | `450fb6ff4489fa` | `ba010000009090` |
| renew->ret           | arm64  | `0x100073684` | `0x207684` | `ff8303d1`       | `c0035fd6`       |
| renew->ret           | x86_64 | `0x10008a4e6` | `0x8e4e6`  | `55`             | `c3`             |

---

## 5. 操作步骤

### 5.1 执行补丁

`~/patch-typora-local.py` 已生成，核心逻辑是「读原始字节 → 断言匹配 → 写补丁字节」：

```bash
python3 ~/patch-typora-local.py
```

期望输出：

```text
[OK] arm64  readLicenseInfo@BOOL @0x2064b4: e20314aa -> 22008052
[OK] x86_64 readLicenseInfo@BOOL @0x8cf90: 450fb6ff4489fa -> ba010000009090
[OK] arm64  renew->ret @0x207684: ff8303d1 -> c0035fd6
[OK] x86_64 renew->ret @0x8e4e6: 55 -> c3
```

> 注意：M4 是 arm64，实际只走 arm64 两条；x86_64 两条是 Rosetta 备用，改不改都不影响 arm64 运行。

### 5.2 重签（必须）

```bash
codesign --force --deep --sign - --timestamp=none /Applications/Typora.app
codesign --verify --verbose=2 /Applications/Typora.app
```

要点：

- 用 `--deep` 把 Sentry/Sparkle 内嵌框架一起签。
- **不要**加 `--options runtime`：会开启 library validation，主程序（无 TeamID）与框架签名对不上。

### 5.3 验证

```bash
# 1. 签名有效
codesign --verify --verbose=2 /Applications/Typora.app

# 2. 补丁字节正确（arm64）
python3 -c "print(open('/Applications/Typora.app/Contents/MacOS/Typora','rb').read()[0x2064b4:0x2064b8].hex())"
# 应输出: 22008052

# 3. 打开 Typora，授权界面显示已激活
# 4. 抓包确认无 store.typora.io/api/client/renew 请求
```
