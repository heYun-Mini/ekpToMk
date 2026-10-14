# 明细表行级访问转换模式

> **风险等级：🔴 极高**
> 明细表是 EKP → MK 迁移中出错最多的场景。核心差异：**EKP 用字符串拼接定位单元格，MK 用双参数分离**。

---

## 一、核心差异对比

### EKP：字符串拼接 `"tableId.rowIdx.fieldId"`

```javascript
// 取第 0 行 fd_ChanPinType 的值
GetXFormFieldValueById("fd_3aa1c3c0849216.0.fd_ChanPinType", true)[0]

// 设第 2 行 fd_CustomType 的值
SetXFormFieldValueById("fd_3aa1c3c0849216.2.fd_CustomType", "自定义", true)

// 通过 GetXFormFieldById 拿到 DOM 数组，然后遍历
var elems = GetXFormFieldById("fd_ChanPinType", true);
for (var i = 0; i < elems.length; i++) {
  // elems[i] 就是第 i 行的这个控件 DOM
  var v = elems[i].value;
}
```

### MK：双参数 `("tableId.fieldId", rowNum)`

```javascript
// 取第 0 行 fdNewChanPinType 的值
MKXFORM.getControlValue("fdNewTable.fdNewChanPinType", 0)

// 设第 2 行 fdNewCustomType 的值
MKXFORM.updateControl("fdNewTable.fdNewCustomType", 2, "自定义")

// 遍历所有行
var rowCount = MKXFORM.getRowCount("fdNewTable");
for (var i = 0; i < rowCount; i++) {
  var v = MKXFORM.getControlValue("fdNewTable.fdNewChanPinType", i);
}
```

**转换规则总结**：

| EKP 格式 | MK 格式 |
|---|---|
| `"tableId.rowIdx.fieldId"` | `("tableId.fieldId", rowIdx)` |
| `GetXFormFieldById("fieldId", true)` 返回数组 | `MKXFORM.getRowCount("tableId")` + 循环 `getControlValue` |
| `elems.length` | `MKXFORM.getRowCount(tableId)` |
| `elems[i].value` | `MKXFORM.getControlValue("tableId.fieldId", i)` |
| `elems[i].value = x` | `MKXFORM.updateControl("tableId.fieldId", i, x)` |

---

## 二、5 种典型模式

### 模式 1：遍历所有行读取字段

**EKP 原代码：**
```javascript
var SourceSelect = GetXFormFieldById("fd_ChanPinType", true);
for (var i = 0; i < SourceSelect.length; i++) {
  if (SourceSelect[i].value == "0") {
    // 处理"以上都没有"
  }
}
```

**MK 转换：**
```javascript
var rowCount = MKXFORM.getRowCount("fdNewTable");
for (var i = 0; i < rowCount; i++) {
  var v = MKXFORM.getControlValue("fdNewTable.fdNewChanPinType", i);
  if (v == "0") {
    // 处理"以上都没有"
  }
}
```

**要点：**
- `SourceSelect.length` → `MKXFORM.getRowCount(tableId)`
- `SourceSelect[i].value` → `MKXFORM.getControlValue(id, i)`
- 循环体内不再依赖 DOM 数组

---

### 模式 2：遍历所有行写入字段

**EKP 原代码：**
```javascript
var TargetInput = GetXFormFieldById("fd_CustomType", true);
for (var i = 0; i < TargetInput.length; i++) {
  TargetInput[i].value = "";
  TargetInput[i].style.display = "none";
  TargetInput[i].removeAttribute("validate");
}
```

**MK 转换：**
```javascript
var rowCount = MKXFORM.getRowCount("fdNewTable");
for (var i = 0; i < rowCount; i++) {
  MKXFORM.updateControl("fdNewTable.fdNewCustomType", i, "");
  // 隐藏与取消必填：明细表列级属性统一设置（不是逐行）
}
// 列级属性只需设置一次
MKXFORM.setDetailFieldAttr("fdNewTable.fdNewCustomType", 4);  // 隐藏整列
MKXFORM.setDetailFieldAttr("fdNewTable.fdNewCustomType", 6);  // 整列非必填
```

**要点：**
- 逐行改值 → `updateControl` 循环
- 逐行改显示/必填属性 → **优先用列级 API**（`setDetailFieldAttr`），避免重复
- 若确需按行差异化，用 `setDetailFieldItemAttr(tableId, value, rowNum, fieldId)`

---

### 模式 3：按条件差异化处理每行

**EKP 原代码：**
```javascript
var SourceSelect = GetXFormFieldById("fd_ChanPinType", true);
var TargetInput = GetXFormFieldById("fd_CustomType", true);
for (var i = 0; i < SourceSelect.length; i++) {
  if (SourceSelect[i].value == "0") {
    TargetInput[i].style.display = "inline";
    TargetInput[i].setAttribute("validate", "required");
  } else {
    TargetInput[i].style.display = "none";
    TargetInput[i].removeAttribute("validate");
    TargetInput[i].value = "";
  }
}
```

**MK 转换：**
```javascript
var rowCount = MKXFORM.getRowCount("fdNewTable");
for (var i = 0; i < rowCount; i++) {
  var v = MKXFORM.getControlValue("fdNewTable.fdNewChanPinType", i);
  if (v == "0") {
    MKXFORM.setDetailFieldItemAttr("fdNewTable", 5, i, "fdNewCustomType");  // 显示
    MKXFORM.setDetailFieldItemAttr("fdNewTable", 3, i, "fdNewCustomType");  // 必填
  } else {
    MKXFORM.setDetailFieldItemAttr("fdNewTable", 4, i, "fdNewCustomType");  // 隐藏
    MKXFORM.setDetailFieldItemAttr("fdNewTable", 6, i, "fdNewCustomType");  // 非必填
    MKXFORM.updateControl("fdNewTable.fdNewCustomType", i, "");             // 清空值
  }
}
```

**要点：**
- 按行差异化 → `setDetailFieldItemAttr(tableId, value, rowNum, fieldId)`
- 属性值：1只读/2编辑/3必填/4隐藏/5显示/6非必填
- 顺序建议：先设显示/隐藏，再设必填，最后清值

---

### 模式 4：字符串拼接的行级 ID（直接引用）

**EKP 原代码：**
```javascript
// 直接访问第 0 行的字段
var v = GetXFormFieldValueById("fd_3aa1c3c0849216.0.fd_ChanPinType", true)[0];
SetXFormFieldValueById("fd_3aa1c3c0849216.2.fd_CustomType", "自定义");
```

**MK 转换：**
```javascript
var v = MKXFORM.getControlValue("fdNewTable.fdNewChanPinType", 0);
MKXFORM.updateControl("fdNewTable.fdNewCustomType", 2, "自定义");
```

**要点：**
- 拆解 EKP 的三段式 ID：第 1 段 = tableId, 第 2 段 = rowNum, 第 3 段 = fieldId
- 通过字段映射表分别映射 tableId 和 fieldId
- 组合成 `"newTableId.newFieldId"` + rowNum 双参数

**⚠️ 常见错误**：Agent 容易保留字符串拼接格式 `MKXFORM.getValue("tableId.0.fieldId")` — **这是错的**。MK 的 `getValue` 只支持主表字段，明细表必须用 `getControlValue`。

---

### 模式 5：动态行号（在监听回调中获取当前行）

**EKP 原代码：**
```javascript
AttachXFormValueChangeEventById("fd_ChanPinType", function(rowIndex) {
  // 某些 EKP 版本回调会传行号，某些不会
  var v = GetXFormFieldValueById("fd_3aa1c3c0849216." + rowIndex + ".fd_ChanPinType")[0];
  // ...
});
```

**MK 转换：**
```javascript
MKXFORM.onChange("fdNewTable.fdNewChanPinType", function(value, extValue) {
  // 明细表 onChange 的 extValue 包含 tinyValues（单元格变更集合）
  // tinyValues 结构: { "<rowNum>": { "<fieldId>": <newValue> } }
  if (extValue && extValue.tinyValues) {
    Object.keys(extValue.tinyValues).forEach(function(rowNumStr) {
      var rowNum = parseInt(rowNumStr, 10);
      var changedFields = extValue.tinyValues[rowNumStr];
      // 处理该行的变更
    });
  }
});
```

**要点：**
- MK 明细表 `onChange` 的 `extValue.tinyValues` 是**批量变更集合**（因为 MK 有 100ms 防抖）
- 若只需处理单行，可从 `tinyValues` 中提取
- 若原 EKP 回调不传行号而是通过 DOM 位置推断 → MK 中直接从 `tinyValues` 拿

---

## 三、辅助 API 速查

| 场景 | MK API |
|---|---|
| 获取行数 | `MKXFORM.getRowCount(tableId)` |
| 获取选中行下标 | `MKXFORM.getSelectedRowIndex(tableId)` → `[0, 2, 5]` |
| 选中指定行 | `MKXFORM.checkDetailRow(tableId, [0, 2])` |
| 添加空行 | `MKXFORM.addRow(tableId)` |
| 添加带数据的行 | `MKXFORM.addRow(tableId, { field1: 'v1', field2: 'v2' })` |
| 批量添加多行 | `MKXFORM.addRow(tableId, [{...}, {...}])` |
| 更新单行（合并） | `MKXFORM.updateRow(tableId, rowNum, { field1: 'newV' })` |
| 替换多行 | `MKXFORM.updateRow(tableId, startRowNum, [{...}, {...}])` |
| 删除单行 | `MKXFORM.deleteRow(tableId, rowNum)` |
| 删除多行 | `MKXFORM.deleteRow(tableId, [0, 2, 4])` |
| 删除全部 | `MKXFORM.deleteRow(tableId)` |
| 列 max/min/avg | `MKXFORM.cacluColumnValue("tableId.fieldId")` |
| 控制行是否可删 | `MKXFORM.controlDetailRowCanDelete(tableId, false, rowNum?)` |
| 禁用操作按钮 | `MKXFORM.disabledOperation(tableId, ['insert','delete'], rowNum?)` |
| 重新加载 | `MKXFORM.reload(tableId)` |
| 整列属性 | `MKXFORM.setDetailFieldAttr("tableId.fieldId", 1~6)` |
| 整行属性 | `MKXFORM.setDetailRowAttr(tableId, 1~6, rowNum)` |
| 单元格属性 | `MKXFORM.setDetailFieldItemAttr(tableId, 1~6, rowNum, fieldId)` |
| 单元格样式 | `MKXFORM.updateControlStyle("tableId.fieldId", rowNum, style)` |
| 当前分页取值 | `MKXFORM.getPageControlValue("tableId.fieldId", rowNum)` |

---

## 四、常见陷阱

### 陷阱 1：`getRowCount` 在 `onLoad` 中调用返回 0

MK 明细表初始化有时序问题。**解决方案**：
- 若必须在初始化时处理，用 `setTimeout(fn, 300)` 延迟
- 或改为在 `onChange` 中处理（首次数据加载会触发）

### 陷阱 2：`updateControl` 的 100ms 防抖

MK 内部对 `updateControl` 有 100ms 防抖批量更新。连续调用：
```javascript
MKXFORM.updateControl("t.f1", 0, "a");
MKXFORM.updateControl("t.f2", 0, "b");
```
会合并为一次更新。**通常无需处理**，但若后续代码立即读取 `getControlValue`，可能读到旧值。**解决方案**：改用 `updateRow` 一次性传多个字段：
```javascript
MKXFORM.updateRow("t", 0, { f1: "a", f2: "b" });
```

### 陷阱 3：字段映射表未包含明细表自身 ID

明细表本身也有 ID（如 `fd_3aa1c3c0849216`），若 JS 中直接使用 `tableId`，映射表必须包含。**Agent 检查**：Step 2 中除了字段 ID，还要检查子表 ID 是否已映射。

### 陷阱 4：EKP 用 DOM `elem.parentNode.removeChild` 删除行

EKP 有些代码通过操作 DOM 删除明细行。**MK 中禁止**，必须用 `deleteRow(tableId, rowNum)`。

### 陷阱 5：混淆行号 (rowNum) 与行 Key (rowKey)

- `setDetailRowAttr(tableId, value, rowNum)` — 用**行号**（从 0 开始的序号）
- `setDetailFieldItemAttr(tableId, value, rowKey, fieldId)` — 用**行 Key**（行的唯一标识）

**通常两者一致**，但在删除行后可能不同。若无特殊需求，统一用**行号**即可。

---

## 五、完整示例（结合真实场景）

参考 [`05-agent/examples/L3-indirect-write/`](../05-agent/examples/L3-indirect-write/) —— 该示例完整演示了"产品类型=以上都没有时显示自定义输入框"的迁移过程，覆盖模式 1、2、3。

---

## 六、相关文档

- [`api-mapping-table.md §1.5`](./api-mapping-table.md) — 明细表 API 概览
- [`indirect-write-patterns.md`](./indirect-write-patterns.md) — 间接写入处理（常与明细表结合）
- [`../03-target-mk/mkxform-api-reference.md §7`](../03-target-mk/mkxform-api-reference.md) — MKXFORM 明细表完整 API
