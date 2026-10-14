# 值格式差异与转换

> **风险等级：🟡 中**
> EKP 与 MK 在某些控件类型的值格式上存在差异。若不正确处理，会导致数据错乱、校验失败、显示异常。

---

## 一、核心差异总览

| 控件类型 | EKP 值格式 | MK 值格式 | 转换要点 |
|---|---|---|---|
| **单选框/单选按钮** | 字符串 | 字符串 | ✅ 一致，无需转换 |
| **下拉选项（单选）** | 字符串 | 字符串 | ✅ 一致 |
| **复选框（多选）** | 分号分隔字符串 `"a;b;c"` | 数组 `["a","b","c"]` | ⚠️ **需转换** |
| **下拉多选** | 分号分隔字符串 | 数组 | ⚠️ **需转换** |
| **年月日** | 字符串 `"2024-01-15"` 或毫秒数 | **毫秒数** | ⚠️ **需转换** |
| **年月日时分** | 字符串 `"2024-01-15 10:30"` | **毫秒数** | ⚠️ **需转换** |
| **年月日时分秒** | 字符串 | **毫秒数** | ⚠️ **需转换** |
| **时分秒** | 字符串 `"10:30:00"` | **毫秒数**（当天该时刻） | ⚠️ **需转换** |
| **时分** | 字符串 `"10:30"` | **毫秒数** | ⚠️ **需转换** |
| **数字/金额** | 字符串或数字 | 数字 | ⚠️ 建议统一为数字 |
| **单行文本/多行文本** | 字符串 | 字符串 | ✅ 一致 |
| **通讯录（人员）** | 对象或字符串 | 对象 `{fdId, fdName, fdOrgType}` | ⚠️ **需转换** |
| **附件** | 数组或字符串 | 数组 | ⚠️ MK `getValue` 对附件有特殊处理 |

---

## 二、详细转换规则

### 2.1 多选值：分号字符串 ↔ 数组

**EKP 惯用：**
```javascript
// 设置多选值
SetXFormFieldValueById("fd_multiSelect", "选项1;选项2;选项3");

// 读取多选值
var v = GetXFormFieldValueById("fd_multiSelect")[0];  // "选项1;选项2"
var arr = v.split(";");  // 手动拆分
```

**MK 转换：**
```javascript
// 设置多选值 —— 直接用数组
MKXFORM.setValue("fdNewMultiSelect", ["选项1", "选项2", "选项3"]);

// 读取多选值 —— 直接是数组
var arr = MKXFORM.getValue("fdNewMultiSelect");  // ["选项1", "选项2"]
// 无需 split
```

**Agent 处理规则：**
- 遇到 `split(";")` → 删除，MK 已返回数组
- 遇到 `arr.join(";")` 后 `setValue` → 删除 join，直接传数组
- 遇到硬编码字符串 `"a;b;c"` 传给多选字段 → 改为 `["a","b","c"]`

---

### 2.2 日期时间：字符串 ↔ 毫秒数

**EKP 惯用：**
```javascript
// 设置日期
SetXFormFieldValueById("fd_date", "2024-01-15");

// 读取日期
var d = GetXFormFieldValueById("fd_date")[0];  // "2024-01-15"
// 或某些场景返回毫秒数
```

**MK 转换：**
```javascript
// 设置日期 —— 用毫秒数
var timestamp = new Date("2024-01-15").getTime();
MKXFORM.setValue("fdNewDate", timestamp);

// 读取日期 —— 返回毫秒数
var timestamp = MKXFORM.getValue("fdNewDate");
var dateStr = new Date(timestamp).toISOString().slice(0, 10);  // 若需字符串
```

**特殊场景：时分秒（无日期部分）**

MK 中"时分秒"控件的值也是毫秒数，表示**从 1970-01-01 00:00:00 UTC 起的毫秒数**（即当天该时刻）：

```javascript
// 11:32 → 41520000 毫秒
// 11:32:53 → 41573000 毫秒

// 设置
var ms = (11 * 3600 + 32 * 60) * 1000;  // 41520000
MKXFORM.setValue("fdNewTime", ms);

// 读取
var ms = MKXFORM.getValue("fdNewTime");
var hours = Math.floor(ms / 3600000);
var minutes = Math.floor((ms % 3600000) / 60000);
```

**Agent 处理规则：**
- EKP 中日期字符串 → MK 中转为毫秒数
- 若原 JS 中有日期格式化逻辑（如 `yyyy-MM-dd`），保留格式化但输入改为毫秒数
- 若原 JS 中有日期比较逻辑（如 `d1 > d2`），毫秒数直接比较即可

---

### 2.3 数字/金额：字符串 → 数字

**EKP 惯用：**
```javascript
var v = GetXFormFieldValueById("fd_amount")[0];  // 可能返回 "100.50"
var total = parseFloat(v) * 2;
```

**MK 转换：**
```javascript
var v = MKXFORM.getValue("fdNewAmount");  // 直接是数字 100.50
var total = v * 2;
// 无需 parseFloat
```

**Agent 处理规则：**
- 删除不必要的 `parseFloat` / `parseInt` / `Number()` 转换
- 若原代码有 `isNaN` 检查，保留（MK 也可能返回 null/undefined）
- 设置值时直接传数字，不传字符串

---

### 2.4 通讯录（人员/部门）：对象结构

**EKP 惯用：**
```javascript
// 设置人员
SetXFormFieldValueById("fd_person", "张三");  // 或复杂对象

// 读取
var p = GetXFormFieldValueById("fd_person")[0];
```

**MK 转换：**
```javascript
// 设置人员 —— 用对象
MKXFORM.setValue("fdNewPerson", {
  fdId: "person_123",
  fdName: "张三",
  fdOrgType: 8   // 8=人员, 2=部门, 1=机构, 4=岗位, 16=群组
});

// 读取
var p = MKXFORM.getValue("fdNewPerson");
// p.fdName, p.fdId
```

**Agent 处理规则：**
- 若 EKP 中只存姓名 → 迁移时需要通过 `callOrg` 查询完整对象
- 若 EKP 中存 ID → 直接构造对象
- 在 `migration-notes.md` 中标注："人员字段值格式变化，需人工确认数据来源"

---

### 2.5 附件：特殊处理

**MK 特殊行为**（来自 MKXFORM_API 文档 §6.3）：
> 当控件为 `@elem/xform-attach` 或 `@elem/xform-m-attach` 时，若结果为字符串则返回 `undefined`（表示空状态），否则返回数组格式。

**Agent 处理规则：**
- 读取附件值后，检查是否为 `undefined`（空）或数组（有附件）
- 不要用字符串方式处理附件值

```javascript
var attachments = MKXFORM.getValue("fdNewAttach");
if (attachments === undefined || attachments === null) {
  // 无附件
} else if (Array.isArray(attachments)) {
  // 有附件，遍历处理
  attachments.forEach(function(file) { /* ... */ });
}
```

---

## 三、选项值 vs 选项文本

### EKP 中的 `items` 与 `itemValues`

EKP HTML 中：
```html
items="燃气热水器;电热水器;以上都没有"
itemvalues="燃气热水器;电热水器;0"
```
- `items` = 显示文本
- `itemvalues` = 实际值

JS 中 `GetXFormFieldValueById` 返回的是 **itemvalues**（如 `"0"`），不是显示文本。

### MK 中的对应

MK 下拉/单选控件：
- `getValue(id)` → 返回**值**（如 `"0"`）
- `getValueText(id)` → 返回**显示文本**（如 `"以上都没有"`）

**Agent 处理规则：**
- 若 EKP JS 中用 `GetXFormFieldValueById` 取值后做逻辑判断 → MK 用 `getValue`
- 若 EKP JS 中用 `GetXFormFieldValueById` 取值后用于显示 → MK 用 `getValueText`
- 若 EKP JS 中遍历 `select.options` 找 `selected.text` → MK 用 `getValueText`

---

## 四、空值处理

| 场景 | EKP | MK |
|---|---|---|
| 未填写的文本字段 | `""` 或 `null` | `null` |
| 未选择的下拉 | `""` | `null` |
| 未选人员的通讯录 | `""` | `null` 或 `undefined` |
| 未上传的附件 | `""` | `undefined` |
| 明细表空单元格 | `""` | `null` |

**Agent 处理规则：**
- 若 EKP 中有 `if (v === "")` 判断 → 改为 `if (v === null || v === undefined || v === "")`
- 或统一用 `if (!v)`（注意 0 和 false 的陷阱）
- 设置值时，若传 `undefined`，MK 会自动转为 `null`（见 MKXFORM_API §6.2）

---

## 五、Agent 自检清单

在 Step 5.7（workflow.md）中，对每个值操作检查：

- [ ] 多选字段是否用数组（而非分号字符串）？
- [ ] 日期字段是否用毫秒数（而非字符串）？
- [ ] 数字字段是否用数字类型（而非字符串）？
- [ ] 人员字段是否用 `{fdId, fdName, fdOrgType}` 对象？
- [ ] 附件字段是否处理了 `undefined` 空状态？
- [ ] 是否删除了不必要的 `split(";")` / `join(";")` / `parseFloat`？
- [ ] 是否区分了 `getValue`（值）和 `getValueText`（显示文本）？
- [ ] 空值判断是否兼容 `null` / `undefined` / `""`？

---

## 六、常见错误

| ❌ 错误 | ✅ 正确 |
|---|---|
| `MKXFORM.setValue("multi", "a;b;c")` | `MKXFORM.setValue("multi", ["a","b","c"])` |
| `MKXFORM.setValue("date", "2024-01-15")` | `MKXFORM.setValue("date", new Date("2024-01-15").getTime())` |
| `var v = MKXFORM.getValue("amount").toFixed(2)` | `var v = MKXFORM.getValue("amount"); if (v !== null) v.toFixed(2)` |
| `var arr = MKXFORM.getValue("multi").split(";")` | `var arr = MKXFORM.getValue("multi")`（已是数组） |
| `if (MKXFORM.getValue("x") === "")` | `if (!MKXFORM.getValue("x"))` 或兼容多种空值 |

---

## 七、相关文档

- [`../03-target-mk/control-value-format.md`](../03-target-mk/control-value-format.md) — MK 控件值格式约定
- [`../03-target-mk/mkxform-api-reference.md §6.3`](../03-target-mk/mkxform-api-reference.md) — `getValue` 附件特殊处理
- [`../02-source-ekp/xform-api-reference.md`](../02-source-ekp/xform-api-reference.md) — EKP 控件说明
