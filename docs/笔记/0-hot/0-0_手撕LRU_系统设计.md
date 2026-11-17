# 146.手写LRU

## 146.手写LRU

[力扣题目链接](https://leetcode.cn/problems/lru-cache/description/)

请你设计并实现一个满足 [LRU (最近最少使用) 缓存](https://baike.baidu.com/item/LRU) 约束的数据结构。

实现 `LRUCache` 类：

- `LRUCache(int capacity)` 以 **正整数** 作为容量 `capacity` 初始化 LRU 缓存
- `int get(int key)` 如果关键字 `key` 存在于缓存中，则返回关键字的值，否则返回 `-1` 。
- `void put(int key, int value)` 如果关键字 `key` 已经存在，则变更其数据值 `value` ；如果不存在，则向缓存中插入该组 `key-value` 。如果插入操作导致关键字数量超过 `capacity` ，则应该 **逐出** 最久未使用的关键字。

函数 `get` 和 `put` 必须以 `O(1)` 的平均时间复杂度运行。

**带TTL并使用原子类实现线程安全**

**示例：**

```
输入
["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get", "get"]
[[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]
输出
[null, null, null, 1, null, -1, null, -1, 3, 4]

解释
LRUCache lRUCache = new LRUCache(2);
lRUCache.put(1, 1); // 缓存是 {1=1}
lRUCache.put(2, 2); // 缓存是 {1=1, 2=2}
lRUCache.get(1);    // 返回 1
lRUCache.put(3, 3); // 该操作会使得关键字 2 作废，缓存是 {1=1, 3=3}
lRUCache.get(2);    // 返回 -1 (未找到)
lRUCache.put(4, 4); // 该操作会使得关键字 1 作废，缓存是 {4=4, 3=3}
lRUCache.get(1);    // 返回 -1 (未找到)
lRUCache.get(3);    // 返回 3
lRUCache.get(4);    // 返回 4
```

**提示：**

- `1 <= capacity <= 3000`
- `0 <= key <= 10000`
- `0 <= value <= 105`
- 最多调用 `2 * 105` 次 `get` 和 `put`

## 算法思路

#### 1.基础版

一个哈希表，一个双向链表，双向链表维护`LRU`,哈希表根据`key`快速得到链表中的`Node`

对于`get`，我们查哈希表，得到链表的节点后，把该节点`moveToHead`

对于`put`，我们查哈希表，查到后只需要修改`Node`的值后，该节点`moveToHead`;

查不到先检查是否满足容量要求 不满足容量要求先`removeNode(tail.prev)`,然后在`map`中也`remove`

就直接新建一个节点，把该节点`addToHead`即可，并把`key`加入`map`

> 这里对于节点我们写三个函数进行操作
>
> `moveToHead`= `removeNode`+`addToHead`

#### 2.线程安全版



## 实际解决

```java
public class Main {
    public static void main(String[] args) {
        LRUCache lRUCache = new LRUCache(2);
        lRUCache.put(1, 1);
        lRUCache.put(2, 2);
        System.out.println(lRUCache.get(1)); // 1
        lRUCache.put(3, 3);                  // 淘汰 2
        System.out.println(lRUCache.get(2)); // -1
        lRUCache.put(4, 4);                  // 淘汰 1
        System.out.println(lRUCache.get(3)); // 3
        System.out.println(lRUCache.get(1)); // -1
        System.out.println(lRUCache.get(4)); // 4
    }
}

class LRUCache {
    class Node {
        int key;
        int value;
        Node prev;
        Node next;
        Node(int key, int value) {
            this.key = key;
            this.value = value;
        }
    }

    Map<Integer, Node> map;
    int capacity;
    Node head;
    Node tail;

    LRUCache(int capacity) {
        this.capacity = capacity;
        this.map = new HashMap<>();
        head = new Node(0, 0);
        tail = new Node(0, 0);
        head.next = tail;
        tail.prev = head;
    }

    public void moveToHead(Node node) {
        removeNode(node);
        addToHead(node);
    }

    public void removeNode(Node node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }

    public void addToHead(Node node) {
        head.next.prev = node;
        node.next = head.next;
        head.next = node;
        node.prev = head;
    }

    public int get(int key) {
        Node node = map.get(key);
        if (node == null) {
            return -1;
        }
        moveToHead(node);
        return node.value;
    }

    public void put(int key, int value) {
        if (capacity <= 0) {
            return;
        }
        Node node = map.get(key);
        if (node != null) {
            node.value = value;
            moveToHead(node);
        } else {
            if (map.size() == capacity) {
                map.remove(tail.prev.key);
                removeNode(tail.prev);
            }
            Node newNode = new Node(key, value);
            addToHead(newNode);
            map.put(key, newNode);
        }
        return;
    }
}
```

线程安全版：给两个方法加锁

```java
public class Main {
    public static void main(String[] args) {
        LRUCache lRUCache = new LRUCache(2);
        lRUCache.put(1, 1);
        lRUCache.put(2, 2);
        System.out.println(lRUCache.get(1)); // 1
        lRUCache.put(3, 3);                  // 淘汰 2
        System.out.println(lRUCache.get(2)); // -1
        lRUCache.put(4, 4);                  // 淘汰 1
        System.out.println(lRUCache.get(3)); // 3
        System.out.println(lRUCache.get(1)); // -1
        System.out.println(lRUCache.get(4)); // 4
    }
}

class LRUCache {
    class Node {
        int key;
        int value;
        Node prev;
        Node next;
        Node(int key, int value) {
            this.key = key;
            this.value = value;
        }
    }

    Map<Integer, Node> map;
    int capacity;
    Node head;
    Node tail;
    final Object lock = new Object();

    LRUCache(int capacity) {
        this.capacity = capacity;
        this.map = new HashMap<>();
        head = new Node(0, 0);
        tail = new Node(0, 0);
        head.next = tail;
        tail.prev = head;
    }

    public void moveToHead(Node node) {
        removeNode(node);
        addToHead(node);
    }

    public void removeNode(Node node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }

    public void addToHead(Node node) {
        head.next.prev = node;
        node.next = head.next;
        head.next = node;
        node.prev = head;
    }

    public int get(int key) {
        synchronized (lock) {
            Node node = map.get(key);
            if (node == null) {
                return -1;
            }
            moveToHead(node);
            return node.value;
        }
    }

    public void put(int key, int value) {
        if (capacity <= 0) {
            return;
        }
        synchronized (lock) {
            Node node = map.get(key);
            if (node != null) {
                node.value = value;
                moveToHead(node);
            } else {
                if (map.size() >= capacity) {
                    map.remove(tail.prev.key);
                    removeNode(tail.prev);
                }
                Node newNode = new Node(key, value);
                addToHead(newNode);
                map.put(key, newNode);
            }
        }
    }
}

```

加了TTL

- 在put时计算过期时间
- 在get时判断是不是已经过期 如果过期 主动删除

```java
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        LRUCache c1 = new LRUCache(2);
        c1.put(1, 1);
        c1.put(2, 2);
        System.out.println(c1.get(1));   // 1
        c1.put(3, 3);                    // 淘汰 2
        System.out.println(c1.get(2));   // -1
        c1.put(4, 4);                    // 淘汰 1
        System.out.println(c1.get(3));   // 3
        System.out.println(c1.get(1));   // -1
        System.out.println(c1.get(4));   // 4

        LRUCache c2 = new LRUCache(2);
        c2.put(10, 100, 200);            // 10 在 200ms 后过期
        c2.put(20, 200);                 // 永不过期
        System.out.println(c2.get(10));  // 100
        Thread.sleep(300);
        System.out.println(c2.get(10));  // -1（已过期，惰性删除）
        System.out.println(c2.get(20));  // 200
    }
}

class LRUCache {
    class Node {
        int key;
        int value;
        long time;          // 绝对过期时间戳(ms)，Long.MAX_VALUE 表示永不过期
        Node prev, next;
        Node(int key, int value, long time) {
            this.key = key;
            this.value = value;
            this.time = time;
        }
    }

    private final Map<Integer, Node> map = new HashMap<>();
    private final int capacity;
    private final Node head = new Node(0, 0, Long.MAX_VALUE);
    private final Node tail = new Node(0, 0, Long.MAX_VALUE);

    LRUCache(int capacity) {
        this.capacity = capacity;
        head.next = tail;
        tail.prev = head;
    }

    public int get(int key) {
        Node node = map.get(key);
        if (node == null) return -1;
        // 惰性删除
        if (isExpired(node)) {
            removeNode(node);
            map.remove(key);
            return -1;
        }
        moveToHead(node);
        return node.value;
    }

    /** 永不过期 */
    public void put(int key, int value) {
        put(key, value, -1);
    }

    /** ttl < 0 表示永不过期；ttl >= 0 表示 now + ttl 后过期 */
    public void put(int key, int value, long ttl) {
        // 仅执行put动作时计算时间
        if (capacity <= 0) return;
        long time = ttl < 0 ? Long.MAX_VALUE : System.currentTimeMillis() + ttl;

        Node node = map.get(key);
        if (node != null) {
            node.value = value;
            node.time = time;          // 刷新过期时间
            moveToHead(node);
            return;
        }

        if (map.size() >= capacity) {
            Node oldest = tail.prev;
            removeNode(oldest);
            map.remove(oldest.key);
        }
        Node newNode = new Node(key, value, time);   // 用计算好的 time，不再写死 -1
        addToHead(newNode);
        map.put(key, newNode);
    }

    /** 过期条件：有明确过期时间点 且 该时间点 <= 当前时间 */
    private boolean isExpired(Node node) {
        return node.time != Long.MAX_VALUE && node.time <= System.currentTimeMillis();
    }

    private void moveToHead(Node node) { removeNode(node); addToHead(node); }

    private void removeNode(Node node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }

    private void addToHead(Node node) {
        head.next.prev = node;
        node.next = head.next;
        head.next = node;
        node.prev = head;
    }
}
```

