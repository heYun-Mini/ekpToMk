# MK 控件值格式约定

> 本文档记录 MK-PaaS 平台各类控件的**值格式约定**。
> 迁移 Agent 在转换 EKP JS 时，必须确保设置的值符合 MK 格式，否则会导致数据错乱或校验失败。

---

## 一、选择项类型

### 1.1 选项定义格式

MK 中选项的定义格式为 `显示文本|值`，用换行分隔：

```text
选项1|1
选项2|2
选项3|3
```

若显示文本与值相同，可省略 `|值` 部分：

```text
选项1
选项2
选项3
```

### 1.2 值格式约定

| 控件类型 | 值格式 | 示例 |
|---|---|---|
| **单选框** (radio) | **字符串** | `"1"` |
| **单选按钮** (radio button) | **字符串** | `"选项1"` |
| **复选框** (checkbox，多选) | **数组** | `["1", "2", "3"]` |
| **下拉选项（单选）** | **字符串** | `"1"` |
| **下拉选项（多选）** | **数组** | `["1", "2"]` |

**关键规则**：
- **单选类**控件的值统一使用**字符串**格式（即使选项定义中值是数字）
- **多选类**控件的值统一使用**数组**格式

**示例：**
```javascript
// 单选下拉
MKXFORM.setValue("fdNewSelect", "1");           // ✅ 正确
MKXFORM.setValue("fdNewSelect", 1);             // ❌ 错误（数字）
MKXFORM.setValue("fdNewSelect", ["1"]);         // ❌ 错误（数组）

// 多选下拉
MKXFORM.setValue("fdNewMultiSelect", ["1","2"]); // ✅ 正确
MKXFORM.setValue("fdNewMultiSelect", "1;2");     // ❌ 错误（EKP 风格分号字符串）
```

### 1.3 读取值

```javascript
// 单选
var v = MKXFORM.getValue("fdNewSelect");        // 返回字符串 "1"

// 多选
var arr = MKXFORM.getValue("fdNewMultiSelect"); // 返回数组 ["1","2"]
// 无需 split(";")
```

### 1.4 获取显示文本

若需要获取选项的**显示文本**（而非值），使用 `getValueText`：

```javascript
var text = MKXFORM.getValueText("fdNewSelect");  // 返回 "选项1"
```

---

## 二、日期时间类型

### 2.1 核心约定

**MK 中所有日期时间控件的值统一为毫秒数（timestamp）**，无论显示格式如何。

| 控件类型 | 显示格式 | 值格式 | 示例值 |
|---|---|---|---|
| 年月日 | `2024-01-15` | **毫秒数** | `1705276800000` |
| 年月日时分 | `2024-01-15 10:30` | **毫秒数** | `1705314600000` |
| 年月日时分秒 | `2024-01-15 10:30:45` | **毫秒数** | `1705314645000` |
| 时分秒 | `11:32:53` | **毫秒数**（当天该时刻） | `41573000` |
| 时分 | `11:32` | **毫秒数**（当天该时刻） | `41520000` |
| 时 | `11` | **毫秒数** | `39600000` |

### 2.2 时间类控件的特殊说明

对于**纯时间**控件（无日期部分，如"时分秒"），毫秒数表示从 **1970-01-01 00:00:00 UTC** 起经过的毫秒数，即**当天该时刻**的 timestamp。

**换算示例：**
```javascript
// 11:32 → 毫秒数
var ms = (11 * 3600 + 32 * 60) * 1000;   // = 41520000

// 11:32:53 → 毫秒数
var ms = (11 * 3600 + 32 * 60 + 53) * 1000;   // = 41573000

// 毫秒数 → 时分秒
var ms = 41573000;
var hours = Math.floor(ms / 3600000);              // 11
var minutes = Math.floor((ms % 3600000) / 60000);  // 32
var seconds = Math.floor((ms % 60000) / 1000);     // 53
```

### 2.3 设置日期时间值

```javascript
// 方式 1: 用 Date 对象
var d = new Date("2024-01-15T10:30:00");
MKXFORM.setValue("fdNewDateTime", d.getTime());

// 方式 2: 用当前时间
MKXFORM.setValue("fdNewDate", Date.now());

// 方式 3: 纯时间（时分秒）
var ms = (14 * 3600 + 30 * 60) * 1000;   // 14:30:00
MKXFORM.setValue("fdNewTime", ms);
```

### 2.4 读取日期时间值

```javascript
var ms = MKXFORM.getValue("fdNewDate");   // 返回毫秒数

// 转为 Date 对象
var d = new Date(ms);

// 格式化为字符串（若需要）
var dateStr = d.toISOString().slice(0, 10);        // "2024-01-15"
var dateTimeStr = d.toLocaleString("zh-CN");       // "2024/1/15 10:30:00"
```

### 2.5 与 EKP 的差异

| 场景 | EKP | MK |
|---|---|---|
| 设置日期 | `SetXFormFieldValueById(id, "2024-01-15")` | `MKXFORM.setValue(id, 1705276800000)` |
| 读取日期 | 可能返回字符串 `"2024-01-15"` | **一定返回毫秒数** |
| 日期比较 | 字符串比较或转 Date | 直接比较毫秒数 |
| 日期格式化 | 手动拼接字符串 | 用 `new Date(ms)` + `toISOString` 等 |

**⚠️ 迁移注意**：详见 [`../04-migration-rules/value-format-conversion.md §2.2`](../04-migration-rules/value-format-conversion.md)。

---

## 三、数字与金额类型

### 3.1 值格式

| 控件类型 | 值格式 | 示例 |
|---|---|---|
| 数字 | **数字类型** (number) | `100`、`3.14` |
| 金额 | **数字类型** (number) | `1000.50` |
| 滑块 | **数字类型** (number) | `50` |

### 3.2 使用示例

```javascript
// 设置
MKXFORM.setValue("fdNewAmount", 1000.50);    // ✅ 数字
MKXFORM.setValue("fdNewAmount", "1000.50");  // ⚠️ 字符串（可能被自动转换，但不推荐）

// 读取
var amount = MKXFORM.getValue("fdNewAmount");  // 返回数字
var total = amount * 2;                         // 直接运算，无需 parseFloat
```

### 3.3 空值处理

未填写时返回 `null`，不是 `0` 或 `""`：

```javascript
var amount = MKXFORM.getValue("fdNewAmount");
if (amount === null) {
  // 未填写
} else {
  // 有值，可直接运算
}
```

---

## 四、文本类型

| 控件类型 | 值格式 | 空值 |
|---|---|---|
| 单行文本 | 字符串 | `null` |
| 多行文本 | 字符串 | `null` |
| 富文本 | HTML 字符串 | `null` |

```javascript
MKXFORM.setValue("fdNewText", "hello");
var v = MKXFORM.getValue("fdNewText");   // "hello" 或 null
```

---

## 五、通讯录类型（人员/部门/岗位）

### 5.1 值格式

MK 中通讯录控件的值为**对象**或**对象数组**（多选时）：

```javascript
// 单选人员
{
  fdId: "person_123",
  fdName: "张三",
  fdOrgType: 8       // 8=人员, 2=部门, 1=机构, 4=岗位, 16=群组
}

// 多选人员
[
  { fdId: "person_123", fdName: "张三", fdOrgType: 8 },
  { fdId: "person_456", fdName: "李四", fdOrgType: 8 }
]
```

### 5.2 设置值

```javascript
// 单选
MKXFORM.setValue("fdNewPerson", {
  fdId: "person_123",
  fdName: "张三",
  fdOrgType: 8
});

// 多选
MKXFORM.setValue("fdNewPersons", [
  { fdId: "person_123", fdName: "张三", fdOrgType: 8 },
  { fdId: "person_456", fdName: "李四", fdOrgType: 8 }
]);
```

### 5.3 读取值

```javascript
var p = MKXFORM.getValue("fdNewPerson");
if (p) {
  console.log(p.fdName);   // "张三"
  console.log(p.fdId);     // "person_123"
}
```

### 5.4 通过 callOrg 查询完整对象

若 EKP 中只存了姓名或 ID，迁移时可通过 `callOrg` 查询完整对象：

```javascript
MKXFORM.callOrg({
  id: "sysorg.getElementByNo",
  param: { fdNo: "DEPT001", orgType: 2 }
}, function(error, res) {
  if (!error) {
    MKXFORM.setValue("fdNewDept", res);   // res 即完整对象
  }
});
```

---

## 六、附件类型

### 6.1 特殊行为

MKXFORM_API 文档 §6.3 明确说明：
> 当控件为 `@elem/xform-attach` 或 `@elem/xform-m-attach` 时，若结果为字符串则返回 `undefined`（表示空状态），否则返回数组格式。

### 6.2 值格式

```javascript
// 有附件时
[
  { fdId: "file_001", fdName: "文档.pdf", fdSize: 102400, ... },
  { fdId: "file_002", fdName: "图片.png", fdSize: 51200, ... }
]

// 无附件时
undefined   // ← 注意不是 null 或 []
```

### 6.3 使用示例

```javascript
var attachments = MKXFORM.getValue("fdNewAttach");

if (attachments === undefined || attachments === null) {
  // 无附件
} else if (Array.isArray(attachments)) {
  // 有附件
  attachments.forEach(function(file) {
    console.log(file.fdName);
  });
}
```

**⚠️ 注意**：`MKXFORM.setValue` **不支持**附件类型（见 MKXFORM_API §6.2 的"不支持的控件类型"列表）。附件的上传/删除由 MK 附件控件自身处理，JS 无法直接修改。

---

## 七、显示属性（setFieldAttr 枚举）

虽然不属于"值格式"，但与控件状态密切相关：

| 值 | 含义 | 说明 |
|---|---|---|
| `1` | 只读 | 字段显示但不可编辑 |
| `2` | 可编辑 | 字段可编辑（遵循 view2edit 规则） |
| `3` | 必填 | 字段必填，自动渲染红色星号 |
| `4` | 隐藏 | 字段标签和内容都隐藏 |
| `5` | 显示 | 取消隐藏 |
| `6` | 非必填 | 移除必填标记与星号 |

```javascript
MKXFORM.setFieldAttr("fdNewXxx", 3);   // 设为必填
MKXFORM.getFieldAttr("fdNewXxx");       // 返回 1/2/3/4
```

---

## 八、空值约定总览

| 控件类型 | 空值 |
|---|---|
| 文本/多行文本 | `null` |
| 数字/金额 | `null` |
| 单选/下拉 | `null` |
| 多选 | `null` 或 `[]` |
| 日期时间 | `null` |
| 通讯录 | `null` 或 `undefined` |
| 附件 | `undefined` |

**Agent 处理建议**：空值判断统一用 `if (v === null || v === undefined || v === "")`，或简化为 `if (!v)`（注意 `0` 和 `false` 的陷阱）。

---

## 九、相关文档

- [`mkxform-api-reference.md`](./mkxform-api-reference.md) — MKXFORM 完整 API 手册
- [`lifecycle-and-events.md`](./lifecycle-and-events.md) — 注册顺序与生命周期
- [`../04-migration-rules/value-format-conversion.md`](../04-migration-rules/value-format-conversion.md) — EKP → MK 值格式转换规则
- [`../02-source-ekp/xform-api-reference.md`](../02-source-ekp/xform-api-reference.md) — EKP 侧 API 与值格式
