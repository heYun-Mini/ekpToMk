# EKP xform API 参考

> 本文档记录 EKP 低代码表单中 **JSP 片段** 可用的全局函数与控件 ID 规则。
> 迁移 Agent 用它理解 EKP 源端 JS 的语义。

---

## 一、JSP 片段机制

EKP 低代码表单允许在表单中插入 **JSP 片段** 控件，其内容会原封不动地插入到表单 JSP 页面的对应位置。因此 JSP 片段中的内容完全等同于 JSP 页面能做的事情：

- 嵌入 `<script>` 标签编写 JS
- 调用 EKP 全局函数（xform API）
- 操作 DOM
- 使用 jQuery

**典型 JSP 片段 HTML：**
```html
<DIV id=fd_3aa3753ff2af7e title=JSP片段 fd_type="jsp" fd_values='{id:"fd_3aa3753ff2af7e"}'>
  <INPUT type=hidden value='<script type="text/javascript">
    $(function(){
      setTimeout("AddInput()",1000);
    })
    AttachXFormValueChangeEventById("fd_ChanPinType",function(){AddInput();});
    function AddInput(){ /* ... */ }
  </script>'>
</DIV>
```

分析工具会提取 `input[type=hidden]` 的 `value` 属性中的 JS 代码，合并到分析报告的【JS 片段（合并）】章节。

---

## 二、xform 全局函数清单

### 2.1 全局值变化钩子

#### `XFormOnValueChange(controlId, newValue)`

- **类型**：全局函数，由使用人员实现
- **约束**：**整个表单只能声明一个**（后声明覆盖前者）
- **触发时机**：表单任意控件值发生变化时
- **参数**：
  - `controlId` — 发生变化的控件 ID
  - `newValue` — 新值

**示例：**
```javascript
function XFormOnValueChange(controlId, newValue) {
  if (controlId === "fd_ChanPinType") {
    // 处理产品类型变化
  }
}
```

#### `XFormOnValueChangeFuns`

- **类型**：全局数组
- **用途**：事件函数队列，可通过 `push` 添加多个监听函数
- **触发时机**：表单值发生变化时，队列中所有函数依次被调用

**示例：**
```javascript
XFormOnValueChangeFuns.push(function(controlId, newValue) {
  // 处理逻辑 1
});
XFormOnValueChangeFuns.push(function(controlId, newValue) {
  // 处理逻辑 2
});
```

**⚠️ 迁移注意**：MK 无对应 API，需拆解为多个 `MKXFORM.onChange`。详见 [`../04-migration-rules/global-hook-patterns.md`](../04-migration-rules/global-hook-patterns.md)。

---

### 2.2 事件绑定

#### `AttachXFormValueChangeEventById(id, fun)`

- **功能**：通过控件 ID 绑定值变化监听方法
- **触发时机**：仅当 ID 标识的控件发生值变化时调用
- **参数**：
  - `id` — 字段 ID
  - `fun` — 绑定函数（无参数）

**示例：**
```javascript
AttachXFormValueChangeEventById("fd_ChanPinType", function() {
  var v = GetXFormFieldValueById("fd_ChanPinType")[0];
  // ...
});
```

**⚠️ 迁移注意**：MK 对应 `MKXFORM.onChange(newId, fn)`，回调签名为 `(value, extValue)`，可直接使用 value 无需再取值。

#### `AttachXFormValueChangeEventByLabel(label, fun)`

- **功能**：通过显示文字（label）绑定值变化监听方法
- **参数**：
  - `label` — 控件的显示文字
  - `fun` — 绑定函数

**⚠️ 迁移注意**：MK 无 ByLabel API，需先在字段映射表中反查 ID。详见 [`../04-migration-rules/label-to-id-patterns.md`](../04-migration-rules/label-to-id-patterns.md)。

---

### 2.3 控件查找与值读写

#### `GetXFormFieldById(id, nocache)`

- **功能**：根据控件 ID 获取 DOM 对象
- **参数**：
  - `id` — 控件 ID
  - `nocache` — 是否禁用缓存（`true` 表示每次重新查找）
- **返回值**：**DOM 对象数组**

**关键行为**：
- 主表控件 → 数组长度通常为 1
- 明细表字段 → 数组长度等于当前行数（每行一个 DOM）
- `nocache=true` 时返回**实时 DOM 引用**，可用于修改

**示例：**
```javascript
var elems = GetXFormFieldById("fd_CustomType", true);
for (var i = 0; i < elems.length; i++) {
  elems[i].value = "";              // ← 间接写入！
  elems[i].style.display = "none";  // ← 间接样式修改！
}
```

**⚠️ 迁移注意**：这是**间接写入**的主要来源。分析报告只会标"读取"，Agent 必须回读源码识别后续写入操作。详见 [`../04-migration-rules/indirect-write-patterns.md`](../04-migration-rules/indirect-write-patterns.md)。

#### `GetXFormFieldValueById(id, nocache)`

- **功能**：根据控件 ID 获取值
- **参数**：同上
- **返回值**：**值数组**

**示例：**
```javascript
var values = GetXFormFieldValueById("fd_ChanPinType", true);
var v = values[0];   // 主表取首个；明细表需按行索引
```

**⚠️ 复选框（checkbox）特例**：当 `id` 指向复选框控件时，返回值数组为「各选项值 + 勾选组合值」结构——前 N 项是各选项的实际值（按选项定义顺序），**末位（下标 = 选项数）多出一项"勾选组合值"**，以 `;` 连接所有已勾选项，未勾选任何项时为空：

```javascript
// 三选项复选框 fd_typeCheck（选项值 A / B / C），勾选 B、C 后：
var v = GetXFormFieldValueById("fd_typeCheck", true);
// v = ["A", "B", "C", "C;B"]
//                            ↑ 末位 = 勾选组合值
// 判断"是否勾选了 A"：v[3].indexOf("A") > -1
```

**迁移解读**：原 JS 中 `GetXFormFieldValueById("fd_xxx", true)[3]` 之类写法**不是**取"第 4 个选项"，而是"取勾选组合值"，下标 = **选项数**（该控件恰好 3 个选项），选项数变化时下标随之变化。转换为 MK 时该下标怪癖消失——MK 复选框 `getValue` 直接返回选中项数组（见 [`../03-target-mk/control-value-format.md §1.2`](../03-target-mk/control-value-format.md)）。

> 来源：2026-10-14 在 EKP 环境实测确认（`fd_typeCheck`，3 选项）。

**⚠️ 迁移注意**：MK 对应 `MKXFORM.getValue(newId)`（主表，返回单值）或 `MKXFORM.getControlValue("tableId.fieldId", rowNum)`（明细表）。

#### `SetXFormFieldValueById(id, value, nocache)`

- **功能**：根据控件 ID 设置值
- **参数**：
  - `id` — 字段 ID
  - `value` — 值
  - `nocache` — 是否禁用缓存

**示例：**
```javascript
SetXFormFieldValueById("fd_CustomType", "自定义值");
SetXFormFieldValueById("fd_3aa1c3c0849216.0.fd_ChanPinType", "0");   // 明细表第 0 行
```

**⚠️ 迁移注意**：
- 主表 → `MKXFORM.setValue(newId, value)`
- 明细表行级 → `MKXFORM.updateControl("tableId.fieldId", rowNum, value)`
- 明细表 ID 格式**必须拆分**，不能沿用字符串拼接

#### `GetXFormFieldByLabel(label, nocache)`

- **功能**：根据显示文字获取 DOM 对象
- **参数**：
  - `label` — 字段的显示文字（对应 DOM 的 `subject` 属性）
  - `nocache` — 是否禁用缓存
- **返回值**：DOM 对象数组

#### `GetXFormFieldValueByLabel(label, nocache)`

- **功能**：根据显示文字获取值
- **返回值**：值数组

#### `SetXFormFieldValueByLabel(label, value, nocache)`

- **功能**：根据显示文字设置值
- **参数**：
  - `label` — 字段的显示文字
  - `value` — 值
  - `nocache` — 是否禁用缓存

**⚠️ 全部 ByLabel API 的迁移注意**：MK 无对应 API，必须通过字段映射表反查 ID。详见 [`../04-migration-rules/label-to-id-patterns.md`](../04-migration-rules/label-to-id-patterns.md)。

---

## 三、控件 ID 规则

### 3.1 主表控件

主表控件的 ID 即控件自身的 `fd_xxx` 标识，直接用于 API 调用：

```javascript
GetXFormFieldValueById("fd_3aa1dd579b86be");   // 主表某控件
```

### 3.2 明细表（子表）控件

明细表本身有一个 ID（如 `fd_3aa1c3c0849216`），内部每个字段也有自己的 ID。

**行级访问格式**：`明细表ID + "." + rowIndex + "." + 明细表控件ID`

其中 `rowIndex` 是行的序号（**从 0 开始**）。

**示例：**
```javascript
// 访问明细表 fd_3aa1c3c0849216 第 0 行的 fd_ChanPinType 字段
GetXFormFieldValueById("fd_3aa1c3c0849216.0.fd_ChanPinType");

// 访问第 2 行的 fd_CustomType 字段
SetXFormFieldValueById("fd_3aa1c3c0849216.2.fd_CustomType", "值");
```

**⚠️ 迁移注意**：MK 的明细表 API 使用**双参数**格式，行号独立传递：

```javascript
// MK 对应写法
MKXFORM.getControlValue("fdNewTable.fdNewChanPinType", 0);
MKXFORM.updateControl("fdNewTable.fdNewCustomType", 2, "值");
```

详见 [`../04-migration-rules/detail-table-patterns.md`](../04-migration-rules/detail-table-patterns.md)。

### 3.3 通过 GetXFormFieldById 访问明细表字段

当用 `GetXFormFieldById(fieldId, true)`（**只传字段 ID，不传明细表 ID**）访问明细表字段时，返回的 DOM 数组长度等于当前行数，下标即行号：

```javascript
var elems = GetXFormFieldById("fd_ChanPinType", true);
// elems[0] = 第 0 行的 DOM
// elems[1] = 第 1 行的 DOM
// ...
// elems.length = 当前总行数
```

**⚠️ 迁移注意**：MK 中需用 `MKXFORM.getRowCount(tableId)` 获取行数，然后循环调用 `getControlValue`。

---

## 四、EKP 控件类型（fd_type）速查

来自 [`form-html-spec.md`](./form-html-spec.md) 中的示例：

| fd_type | 说明 | 值格式 |
|---|---|---|
| `standardTable` | 主表容器 | — |
| `detailsTable` | 明细表容器 | — |
| `textLabel` | 文本标签（展示用） | — |
| `inputText` | 单行文本输入 | 字符串 |
| `textarea` | 多行文本输入 | 字符串 |
| `inputRadio` | 单选按钮 | 字符串 |
| `select` | 下拉选项（单选/多选） | 字符串 / 分号分隔 |
| `checkbox` | 复选框 | 分号分隔字符串 |
| `datetime` | 日期时间 | 字符串或毫秒数 |
| `address` | 通讯录（人员/部门选择） | 对象或字符串 |
| `jsp` | JSP 片段（嵌入 JS） | — |
| `brcontrol` | 换行控件（布局用） | — |
| `attach` | 附件 | 数组 |
| `relationSelect` | 关联选择 | 对象 |

**⚠️ 迁移注意**：值格式差异详见 [`../04-migration-rules/value-format-conversion.md`](../04-migration-rules/value-format-conversion.md)。

---

## 五、EKP 公式语法

EKP 控件的 `fd_values.defaultValue` 支持公式语法，用 `$...$` 包裹：

| 公式 | 含义 |
|---|---|
| `$fdNumber$` | 表单编号 |
| `$docCreator$` | 文档创建人 |
| `$docSubject$` | 文档标题 |
| `$currentDate$` | 当前日期 |
| `$currentDateTime$` | 当前日期时间 |
| `$组织架构.获取组织架构对象全路径$($申请人$)` | 调用组织架构函数 |

**⚠️ 迁移注意**：MK 中此类默认值应通过**表单配置**（字段默认值/公式）实现，而非 JS 代码。详见 [`../04-migration-rules/config-vs-js-decision.md`](../04-migration-rules/config-vs-js-decision.md)。

---

## 六、相关文档

- [`form-html-spec.md`](./form-html-spec.md) — EKP 表单 HTML 结构示例
- [`../04-migration-rules/api-mapping-table.md`](../04-migration-rules/api-mapping-table.md) — EKP → MK API 映射表
- [`../01-contracts/analysis-report-spec.md`](../01-contracts/analysis-report-spec.md) — 分析报告如何呈现这些 API 调用
