# 全局钩子转换模式

> **风险等级：🟡 中**
> EKP 提供表单级"任意字段变化"钩子 `XFormOnValueChange`，MK **无对应 API**。
> 迁移时必须**拆解**为多个 `MKXFORM.onChange`，或**封装**为统一分发器。

---

## 一、EKP 全局钩子机制

### 机制 1：声明 `XFormOnValueChange` 函数

```javascript
// EKP：在 JSP 片段中声明此函数，表单任何控件值变化都会触发
function XFormOnValueChange(controlId, newValue) {
  // 通常内部按 controlId 分支处理
  if (controlId === "fd_ChanPinType") {
    // 处理产品类型变化
  } else if (controlId === "fd_CustomType") {
    // 处理自定义类型变化
  }
}
```

**约束**：整个表单**只能声明一个** `XFormOnValueChange` 函数（后声明覆盖前者）。

### 机制 2：向 `XFormOnValueChangeFuns` 队列 push

```javascript
// EKP：可多处 push，队列中所有函数都会被依次调用
XFormOnValueChangeFuns.push(function(controlId, newValue) {
  // 处理逻辑 1
});

XFormOnValueChangeFuns.push(function(controlId, newValue) {
  // 处理逻辑 2
});
```

**约束**：无数量限制，按 push 顺序调用。

---

## 二、MK 侧的对应能力

MK 提供 **控件级** 的 `onChange`，无表单级钩子：

```javascript
// MK：为每个需要监听的控件单独注册
MKXFORM.onChange("fdNewChanPinType", function(value, extValue) {
  // 处理产品类型变化
});

MKXFORM.onChange("fdNewCustomType", function(value, extValue) {
  // 处理自定义类型变化
});
```

**MK 无 `XFormOnValueChange` 等价 API**。若需要监听"全表单任意字段变化"，只能：
- 方案 A：为每个字段单独注册 `onChange`（推荐）
- 方案 B：封装统一分发器，内部再按字段分发（兼容原代码结构）
- 方案 C：监听根表单值变化 —— MK 未直接暴露此能力，需借助 `$$FORM` 引用（不推荐，非公开 API）

---

## 三、4 种转换模式

### 模式 1：分支型 `XFormOnValueChange` → 拆解为多个 `onChange`（推荐）

**特征**：原函数内部用 `if/else if` 或 `switch` 按 controlId 分支。

**EKP 原代码：**
```javascript
function XFormOnValueChange(controlId, newValue) {
  if (controlId === "fd_ChanPinType") {
    handleChanPinTypeChange(newValue);
  } else if (controlId === "fd_CustomType") {
    handleCustomTypeChange(newValue);
  } else if (controlId === "fd_ShenQingRen") {
    handleApplicantChange(newValue);
  }
}
```

**MK 转换：**
```javascript
// 拆分为独立的 onChange 注册
MKXFORM.onChange("fdNewChanPinType", function(value) {
  handleChanPinTypeChange(value);
});

MKXFORM.onChange("fdNewCustomType", function(value) {
  handleCustomTypeChange(value);
});

MKXFORM.onChange("fdNewShenQingRen", function(value) {
  handleApplicantChange(value);
});
```

**优点：**
- 每个监听器职责单一，易维护
- 符合 MK 声明式风格
- 无额外分发开销

**Agent 决策依据**：若原函数体内 if/else 分支 ≤ 10 个 → 用此模式。

---

### 模式 2：`XFormOnValueChangeFuns.push` 队列 → 全部拆解

**特征**：多处 push，每个 push 的函数可能监听不同字段。

**EKP 原代码：**
```javascript
XFormOnValueChangeFuns.push(function(controlId, newValue) {
  if (controlId === "fd_A") { /* 逻辑 1 */ }
});

XFormOnValueChangeFuns.push(function(controlId, newValue) {
  if (controlId === "fd_B") { /* 逻辑 2 */ }
});

XFormOnValueChangeFuns.push(function(controlId, newValue) {
  // 通用逻辑：任意字段变化都记录日志
  console.log(controlId, newValue);
});
```

**MK 转换：**
```javascript
// 前两个 push 拆解为独立 onChange
MKXFORM.onChange("fdNewA", function(value) { /* 逻辑 1 */ });
MKXFORM.onChange("fdNewB", function(value) { /* 逻辑 2 */ });

// 第三个"监听所有字段"的通用逻辑 → 需为每个字段注册
// Agent 需在 migration-notes.md 中记录：此处逻辑需人工确认是否所有字段都需要
["fdNewA", "fdNewB", "fdNewC", /* ... 所有引用控件 */].forEach(function(id) {
  MKXFORM.onChange(id, function(value) {
    console.log(id, value);
  });
});
```

**要点：**
- 每个 push 单独分析
- "监听所有字段"型逻辑需人工确认字段清单

---

### 模式 3：无法拆解时 → 封装统一分发器

**特征**：原钩子逻辑复杂，多个 push 之间有依赖，或字段数量过多（>20）。

**EKP 原代码：**
```javascript
function XFormOnValueChange(controlId, newValue) {
  // 复杂的通用逻辑，如全表单校验、数据聚合等
  validateAllFields();
  updateSummary();
  logChange(controlId, newValue);
}
```

**MK 转换（封装分发器）：**
```javascript
// 定义统一处理器
function handleAnyFieldChange(controlId, newValue) {
  validateAllFields();
  updateSummary();
  logChange(controlId, newValue);
}

// 为所有需要监听的字段注册
var watchedFields = [
  "fdNewA", "fdNewB", "fdNewC",
  // ... 所有引用控件（从分析报告 controlIndex 提取）
];

watchedFields.forEach(function(fieldId) {
  MKXFORM.onChange(fieldId, function(value, extValue) {
    handleAnyFieldChange(fieldId, value);
  });
});
```

**优点：**
- 保留原代码的"集中处理"结构
- 便于统一维护

**缺点：**
- 需要显式列出所有字段（无法真正"监听全部"）
- 字段清单必须完整，否则遗漏

**Agent 决策依据**：若原函数体逻辑复杂且字段数 > 10 → 用此模式。

---

### 模式 4：`controlId` 参数在 MK 中的处理

EKP 钩子回调会传 `controlId` 参数。MK `onChange` 回调**只传值和 extValue**，不传 ID。

**转换方式：闭包捕获**

```javascript
// EKP
function XFormOnValueChange(controlId, newValue) {
  if (controlId === "fd_A") { /* ... */ }
}

// MK（用闭包捕获 fieldId）
function registerOnChange(fieldId) {
  MKXFORM.onChange(fieldId, function(value) {
    // 此处 fieldId 通过闭包可见
    if (fieldId === "fdNewA") { /* ... */ }
  });
}
```

---

## 四、决策树

```
遇到 XFormOnValueChange 或 XFormOnValueChangeFuns.push
              │
              ├─ 内部按 controlId 分支处理？
              │      ├─ 是 → 分支数 ≤ 10？
              │      │        ├─ 是 → 【模式 1】拆解为多个 onChange
              │      │        └─ 否 → 【模式 3】封装统一分发器
              │      │
              │      └─ 否（通用逻辑，无分支）
              │             └─ 【模式 3】封装统一分发器
              │
              └─ 需要 controlId 参数？
                     └─ 是 → 【模式 4】闭包捕获
```

---

## 五、Agent 处理清单

在 Step 5.1（workflow.md）中，遇到全局钩子时按以下顺序处理：

- [ ] 定位所有 `XFormOnValueChange` 声明（可能出现在多个 JSP 片段中，但只有一个生效）
- [ ] 定位所有 `XFormOnValueChangeFuns.push` 调用
- [ ] 对每处，判断适用模式（1/2/3/4）
- [ ] 若适用模式 3，从 `controlIndex` 提取所有需要监听的字段清单
- [ ] 生成对应的 `MKXFORM.onChange` 注册代码
- [ ] 在 `migration-notes.md` 中记录：
  - 原钩子位置（sourceJs 行号）
  - 选择的模式（1/2/3/4）
  - 若选模式 3，字段清单是否完整（人工确认项）
- [ ] 自检：**输出 JS 中不得残留 `XFormOnValueChange` / `XFormOnValueChangeFuns`**

---

## 六、常见错误

| ❌ 错误 | ✅ 正确 |
|---|---|
| 保留 `function XFormOnValueChange(...) {...}` | 完全删除，拆解为 `onChange` |
| `MKXFORM.onChange("*", fn)` 试图监听全部 | MK 不支持通配符，必须逐字段注册 |
| 忘记处理 `XFormOnValueChangeFuns.push` | 每个 push 都需拆解 |
| 拆解后遗漏某些分支 | 对照原 if/else 分支逐个核对 |
| 直接用 `MKXFORM.beforeSubmit` 替代 | beforeSubmit 是提交拦截，非值变化监听 |

---

## 七、相关文档

- [`api-mapping-table.md §1.2 §1.6`](./api-mapping-table.md) — 事件监听 API 映射
- [`../03-target-mk/mkxform-api-reference.md §8`](../03-target-mk/mkxform-api-reference.md) — MKXFORM 事件 API
- [`../01-contracts/analysis-report-spec.md`](../01-contracts/analysis-report-spec.md) — 分析报告"全局钩子"章节说明
