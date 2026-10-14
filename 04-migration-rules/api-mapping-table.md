# EKP → MK API 映射表

> 本文档是**迁移过程中最高频查阅**的对照手册。所有 EKP xform API 与常见 DOM 惯用法，都能在此找到 MK 对应实现。
>
> **使用方式**：Agent 在扫描 EKP JS 源码时，识别到某个 API 或模式 → 直接查此表 → 应用转换。
>
> **参数命名约定**：
> - `id` = 控件 ID（主表）或 `tableId.fieldId`（明细表字段）
> - `tableId` = 明细表自身 ID
> - `rowNum` = 行号（从 0 开始）
> - `newId` = 通过字段映射表转换后的 MK 新 ID

---

## 一、EKP xform 全局函数 → MK API

### 1.1 取值/赋值类

| EKP API | MK API（主表） | MK API（明细表行级） | 关键差异 |
|---|---|---|---|
| `GetXFormFieldValueById(id, nocache)` | `MKXFORM.getValue(newId)` | `MKXFORM.getControlValue('tableId.fieldId', rowNum)` | EKP 返回**数组**，MK 返回**单值** |
| `SetXFormFieldValueById(id, value, nocache)` | `MKXFORM.setValue(newId, value)` | `MKXFORM.updateControl('tableId.fieldId', rowNum, value)` | MK 明细表更新有 100ms 防抖批量 |
| `GetXFormFieldById(id, nocache)` | `MKXFORM.$(newId)` | ❌ 明细表无对应，用 `getControlValue` | EKP 返回 DOM 数组，MK 返回组件实例 |
| `GetXFormFieldValueByLabel(label)` | ❌ **MK 无 ByLabel API** | ❌ | 必须先查字段映射表反推 ID，详见 [label-to-id-patterns.md](./label-to-id-patterns.md) |
| `SetXFormFieldValueByLabel(label, value)` | ❌ **MK 无 ByLabel API** | ❌ | 同上 |
| `GetXFormFieldByLabel(label)` | ❌ | ❌ | 同上 |

**示例：**

```javascript
// EKP
var v = GetXFormFieldValueById("fd_3aa1dd579b86be", true)[0];
SetXFormFieldValueById("fd_3aa1dd59130a0c", "新值");

// MK（假设映射表：fd_3aa1dd579b86be → fdNew001, fd_3aa1dd59130a0c → fdNew002）
var v = MKXFORM.getValue("fdNew001");
MKXFORM.setValue("fdNew002", "新值");
```

**⚠️ 数组 vs 单值**：EKP 的 Get 系列返回**数组**是因为一个 ID 可能在主表/多行明细中匹配多处；MK 明确区分主表（单值）和明细表（带 rowNum 参数），不再返回数组。转换时若原代码用 `[0]` 取首元素，直接去掉下标即可。

---

### 1.2 事件监听类

| EKP API | MK API | 关键差异 |
|---|---|---|
| `AttachXFormValueChangeEventById(id, fn)` | **JS 面板绑定式 onChange 入口函数**（设计器中绑到字段）；或 `MKXFORM.onChange(newId, fn)` 编程式注册 | 签名：EKP 无参数，MK 为 `(value, rowNum, parentRowNum)`；`rowNum` 仅明细表字段有值 |
| `AttachXFormValueChangeEventByLabel(label, fn)` | ❌ 需反查 ID 后绑定 onChange 入口函数 | 见 [label-to-id-patterns.md](./label-to-id-patterns.md) |
| `XFormOnValueChange()` 全局钩子 | 拆为多个 onChange 绑定入口函数 | 见 [global-hook-patterns.md](./global-hook-patterns.md) |
| `XFormOnValueChangeFuns.push(fn)` | 同上 | 同上 |
| jQuery `$(document).on('change', ...)` | onChange 绑定入口函数 | MK 不依赖 jQuery |
| 表单提交拦截（EKP 通常用 jQuery 绑定 submit） | `MKXFORM.beforeSubmit(fn, message)` | 返回 `false` 阻止提交 |
| 表单提交后回调 | `MKXFORM.afterSubmit(fn)` | — |

**示例：**

```javascript
// EKP
AttachXFormValueChangeEventById("fd_ChanPinType", function() {
  var v = GetXFormFieldValueById("fd_ChanPinType")[0];
  if (v === "0") { /* ... */ }
});

// MK — JS 面板绑定式入口函数（在设计器中将此函数绑到目标字段的 onChange 事件）
function chanPinTypeOnChange(value, rowNum, parentRowNum) {
  if (value === "0") { /* ... */ }
}
```

**⚠️ 回调值来源**：MK 的 onChange 入口函数已把新值作为第一个参数 `value` 传入，**不需要在回调内再调 `getValue`**（除非需要读取其他字段）。明细表字段的 onChange 还会传入 `rowNum`（当前变更行号），可用于精确操作当前行。

---

### 1.3 显示属性类（只读/必填/隐藏）

EKP 常通过 DOM `setAttribute` / `style.display` 修改；MK 统一用**数字枚举** API：

| 属性 | 值 | EKP 惯用写法 | MK API |
|---|---|---|---|
| 只读 | `1` | `elem.readOnly = true` / `elem.setAttribute("readOnly","true")` | `MKXFORM.setFieldAttr(newId, 1)` |
| 可编辑 | `2` | `elem.readOnly = false` | `MKXFORM.setFieldAttr(newId, 2)` |
| 必填 | `3` | `elem.setAttribute("validate","required")` + 追加 `<span>*</span>` | `MKXFORM.setFieldAttr(newId, 3)` |
| 隐藏 | `4` | `elem.style.display = "none"` | `MKXFORM.setFieldAttr(newId, 4)` |
| 显示 | `5` | `elem.style.display = "inline"` | `MKXFORM.setFieldAttr(newId, 5)` |
| 非必填 | `6` | `elem.removeAttribute("validate")` + 删除星号 span | `MKXFORM.setFieldAttr(newId, 6)` |
| 读取当前属性 | — | 检查 DOM 属性 | `MKXFORM.getFieldAttr(newId)` → 返回 1/2/3/4 |

**明细表版本：**

| 场景 | MK API |
|---|---|
| 修改明细表整列属性 | `MKXFORM.setDetailFieldAttr('tableId.fieldId', value)` |
| 修改明细表整行属性 | `MKXFORM.setDetailRowAttr('tableId', value, rowNum)` |
| 修改明细表某行某列属性 | `MKXFORM.setDetailFieldItemAttr('tableId', value, rowNum, 'fieldId')` |

**示例：**

```javascript
// EKP
var elem = GetXFormFieldById("fd_CustomType", true)[0];
elem.style.display = "inline";
elem.setAttribute("validate", "required");
var span = document.createElement("span");
span.innerHTML = "*";
span.className = "txtstrong";
elem.parentNode.appendChild(span);

// MK（一行搞定）
MKXFORM.setFieldAttr("fdNewCustomType", 5);   // 显示
MKXFORM.setFieldAttr("fdNewCustomType", 3);   // 必填（自动带星号）
```

**⚠️ 常见错误**：Agent 容易保留 `document.createElement("span")` 这类 DOM 操作 —— MK 的 `setFieldAttr(id, 3)` 已内置红色星号渲染，**无需手动创建 DOM**。

---

### 1.4 样式设置类

| EKP 惯用写法 | MK API |
|---|---|
| `elem.style.color = "red"` | `MKXFORM.setStyle(newId, { color: 'red' }, 'content')` |
| `elem.parentNode.style.backgroundColor = "..."` | `MKXFORM.setStyle(newId, { backgroundColor: '...' }, 'content')` |
| 修改标签样式（label） | `MKXFORM.setStyle(newId, { color: 'red' }, 'label')` |
| 明细表单元格样式 | `MKXFORM.updateControlStyle('tableId.fieldId', rowNum, style)` |
| 复杂属性批量设置 | `MKXFORM.setProps(newId, { style, controlValueStyle, labelProps, ... })` |

**⚠️ `setStyle` 第三参数必填**：`'label'` = 标签区域；`'content'` = 值区域。EKP 直接改 DOM style 无此区分，转换时通常用 `'content'`。

---

### 1.5 明细表行操作类

| EKP 惯用写法 | MK API |
|---|---|
| `table.rows.length` 获取行数 | `MKXFORM.getRowCount(tableId)` |
| 循环遍历所有行 `for(i=0;i<SourceSelect.length;i++)` | `for(var i=0; i<MKXFORM.getRowCount(tableId); i++)` |
| DOM 添加行（点击"添加行"按钮） | `MKXFORM.addRow(tableId, rowValue?)` |
| DOM 删除行 | `MKXFORM.deleteRow(tableId, rowNum)` |
| 删除多行 | `MKXFORM.deleteRow(tableId, [0, 2, 4])` |
| 删除全部行 | `MKXFORM.deleteRow(tableId)` 或 `MKXFORM.deleteRow(tableId, '')` |
| 更新一行 | `MKXFORM.updateRow(tableId, rowNum, rowValue)` |
| 获取选中行 | `MKXFORM.getSelectedRowIndex(tableId)` |
| 选中指定行 | `MKXFORM.checkDetailRow(tableId, [0, 2])` |
| 禁用行删除按钮 | `MKXFORM.controlDetailRowCanDelete(tableId, false, rowNum?)` |
| 禁用明细表操作按钮 | `MKXFORM.disabledOperation(tableId, ['insert','delete'], rowNum?)` |
| 计算列 max/min/avg | `MKXFORM.cacluColumnValue('tableId.fieldId')` |
| 重新加载明细数据 | `MKXFORM.reload(tableId)` |

**⚠️ 关键陷阱：明细表字段 ID 格式**

EKP 用字符串拼接：`"fd_tableId.0.fd_fieldId"`（行号在中间）
MK 用两个参数：`"tableId.fieldId"` + `rowNum`（行号独立）

**转换时必须拆分**，不能沿用 EKP 的字符串格式。详见 [detail-table-patterns.md](./detail-table-patterns.md)。

---

### 1.6 全局钩子类

| EKP | MK |
|---|---|
| `function XFormOnValueChange() { ... }` | 拆解为多个 onChange 绑定入口函数（每字段一个），或用 `MKXFORM.onChange` 编程注册 |
| `XFormOnValueChangeFuns.push(function(){...})` | 同上 |

MK 无表单级"任意字段变化"钩子；实现方式见 [global-hook-patterns.md](./global-hook-patterns.md)。

---

## 二、EKP DOM 惯用法 → MK API

EKP JSP 片段 JS 中大量出现原生 DOM 操作，MK 环境下**全部禁止**（React 虚拟 DOM 会失效）。

### 2.1 元素查找

| EKP DOM 写法 | MK 替代 |
|---|---|
| `document.getElementById(id)` | `MKXFORM.$(newId)` 或直接用 `getValue/setValue` |
| `document.querySelector(...)` | ❌ 禁止；用 MK API |
| `$(selector)` (jQuery) | ❌ 禁止；MK 无 jQuery |
| `elem.parentNode` / `elem.children[i]` | ❌ 禁止；用 `setProps` / `setFieldAttr` |

### 2.2 值读写

| EKP DOM 写法 | MK 替代 |
|---|---|
| `elem.value` （读） | `MKXFORM.getValue(newId)` |
| `elem.value = x` （写） | `MKXFORM.setValue(newId, x)` |
| `elem.innerText` / `elem.textContent` | `MKXFORM.getValueText(newId)`（获取显示文本） |
| `elem.innerHTML = html` | `MKXFORM.setProps(newId, { ... })`（视场景） |
| `elem.checked = true` | `MKXFORM.setValue(newId, true)` |
| `selectElem.options[i].selected` | `MKXFORM.setValue(newId, 'optionValue')` |

### 2.3 属性操作

| EKP DOM 写法 | MK 替代 |
|---|---|
| `elem.setAttribute("readOnly","true")` | `MKXFORM.setFieldAttr(newId, 1)` |
| `elem.removeAttribute("readOnly")` | `MKXFORM.setFieldAttr(newId, 2)` |
| `elem.setAttribute("validate","required")` | `MKXFORM.setFieldAttr(newId, 3)` |
| `elem.removeAttribute("validate")` | `MKXFORM.setFieldAttr(newId, 6)` |
| `elem.setAttribute("disabled","disabled")` | `MKXFORM.setProps(newId, { disabled: true })` |
| `elem.hasAttribute("validate")` | `MKXFORM.getFieldAttr(newId) === 3` |

### 2.4 样式操作

| EKP DOM 写法 | MK 替代 |
|---|---|
| `elem.style.display = "none"` | `MKXFORM.setFieldAttr(newId, 4)` |
| `elem.style.display = "inline"` / `"block"` / `""` | `MKXFORM.setFieldAttr(newId, 5)` |
| `elem.style.color = "red"` | `MKXFORM.setStyle(newId, { color: 'red' }, 'content')` |
| `elem.style.backgroundColor = "..."` | `MKXFORM.setStyle(newId, { backgroundColor: '...' }, 'content')` |
| `elem.className = "xxx"` | `MKXFORM.setProps(newId, { controlValueStyle: {...} })`（MK 不用 className） |

### 2.5 DOM 结构操作

| EKP DOM 写法 | MK 替代 |
|---|---|
| `document.createElement(...)` | ❌ 禁止；MK 由 React 渲染 |
| `parentNode.appendChild(...)` | ❌ 禁止；用 `setProps` 传 `labelProps.labelSuffix` 等 |
| `parentNode.removeChild(...)` | ❌ 禁止；用 `setFieldAttr(id, 4)` 隐藏 |
| `elem.insertBefore(...)` | ❌ 禁止 |

**⚠️ 必填星号（`<span class="txtstrong">*</span>`）的处理**

EKP 常手动 `createElement("span")` + `appendChild`。**MK 无需**：`setFieldAttr(id, 3)` 自动渲染红色星号。移除必填时 `setFieldAttr(id, 6)` 自动移除星号。

---

## 三、EKP 全局对象/工具 → MK 对应

### 3.1 AJAX 请求

| EKP 惯用 | MK API |
|---|---|
| `$.ajax({...})` (jQuery) | `MKXFORM.ajax(config, callback)` |
| `fetch(url)` | `MKXFORM.ajax({ url, method }, callback)` |
| `XMLHttpRequest` | `MKXFORM.ajax(...)` |
| EKP 后端接口调用（如 `/sysorg/...`） | `MKXFORM.callOrg({ id, param }, callback)` |
| EKP 集成平台接口 | `MKXFORM.callTic({ interfaceCode, param }, callback)` |
| `GetJdbcData(id, obj, souce, retFunc)`（数据集/外部库查询） | `MKXFORM.callTic({ interfaceCode, param }, callback)`，返回取 `res.data`。⚠️ **两侧接口均非迁移人员维护，必须先实际分析 MK 接口入参/出参契约再定稿**，见 [`dataset-jdbc-to-calltic.md`](./dataset-jdbc-to-calltic.md) |
| EKP 流程接口 | `MKXFORM.callLbpm(config, callback)` |

**MK ajax 返回值格式**：`{ msg: string, success: boolean, data: any }`

### 3.2 消息提示

按**语义**（是否需要用户决策）×**设备端**两个维度选择 API：

| 语义 | PC 桌面端 | 移动端 |
|---|---|---|
| **通知类**（仅告知，无决策） | `MKXFORM.message.success/error/warning/info(text)` | `MKXFORM.toast({ content, icon: 'success'\|'fail'\|'warning' })` |
| **确认类**（需 OK/Cancel 决策） | `MKXFORM.modal({ title, content, onOk, onCancel })` | `MKXFORM.mobileModal({ title, content, onConfirm, onCancel })` |

**EKP 惯用写法映射：**

| EKP 惯用 | MK API |
|---|---|
| `alert("xxx")`（纯告知） | PC：`MKXFORM.message.info('xxx')`；移动端：`MKXFORM.toast({ content: 'xxx', icon: 'warning' })` |
| `confirm("确定?")`（需决策） | PC：`MKXFORM.modal({ title, content, onOk, onCancel })`；移动端：`MKXFORM.mobileModal({ ... onConfirm, onCancel })` |
| 自定义提示条 | PC：`MKXFORM.message.xxx(text)`；移动端：`MKXFORM.toast({ content, icon })` |

> ⚠️ **关键区分**：`message`（PC）与 `toast`（移动端）都是**瞬时通知**，无需用户点击；`modal`（PC）与 `mobileModal`（移动端）都是**需确认/取消的弹窗**。不要把纯提示误用 `mobileModal`。
> `message` 仅桌面端生效、`toast` 仅移动端生效，跨端表单需按 `MKXFORM.platform === 'mobile'` 分支。

### 3.3 表单值/状态

| EKP 惯用 | MK API |
|---|---|
| 获取所有字段值 | `MKXFORM.getFormValues()` |
| 获取表单配置 | `MKXFORM.getFormConfigs()` |
| 触发校验 | `MKXFORM.validateFields().then(result => ...)` |
| 判断当前是否编辑态 | `MKXFORM.viewStatus === 'edit'` |
| 判断当前是否移动端 | `MKXFORM.platform === 'mobile'`（可靠） |
| 判断当前是否桌面端 | `MKXFORM.platform !== 'mobile'` ⚠️ 实测 PC 返回 `desktop` 而非 `pc`，**禁用** `=== 'pc'` |
| 获取文档状态 | `MKXFORM.docStatus` |
| 获取表单 ID | `MKXFORM.formId` |

### 3.4 组织架构（EKP `$组织架构.xxx$` 公式或后端接口）

EKP 常用公式：`$组织架构.获取组织架构对象全路径$($docCreator$)`

MK 用 `callOrg`：

| EKP 场景 | MK API |
|---|---|
| 获取当前用户 | `MKXFORM.callOrg({ id: 'sysorg.getCurUserInfo', param: {} }, cb)` |
| 获取所属部门 | `MKXFORM.callOrg({ id: 'sysorg.getThisDepartment', param: { address: [...] } }, cb)` |
| 获取部门领导 | `MKXFORM.callOrg({ id: 'sysorg.getDepartmentHead', param: { address: [...] } }, cb)` |
| 获取部门全路径 | `MKXFORM.callOrg({ id: 'sysorg.getDepartmentAllPath', param: { addressObject: {...} } }, cb)` |
| 按级别查部门领导 | `MKXFORM.callOrg({ id: 'sysorg.getDepartmentLeaderByLevel', param: { addressObject, level } }, cb)` |
| 根据编码查组织 | `MKXFORM.callOrg({ id: 'sysorg.getElementByNo', param: { fdNo, orgType } }, cb)` |

完整清单见 [`03-target-mk/mkxform-api-reference.md`](../03-target-mk/mkxform-api-reference.md) 第 11 章。

### 3.5 定时/异步

| EKP 惯用 | MK 处理 |
|---|---|
| `setTimeout(fn, 1000)` （等 DOM 就绪） | ❌ **通常应删除**。MK 是 React 声明式渲染，无需等待 DOM。若确需延迟（如等明细表初始化），保留但缩短 |
| `setInterval` | 谨慎使用；注意表单卸载时清理 |
| Promise 链 | 保留 |
| async/await | 保留（MK 环境支持） |

**⚠️ `setTimeout("AddInput()", 1000)` 的处理**

EKP JSP 片段常用 `$(function(){ setTimeout(...) })` 等待表单渲染完成。MK 中：
- **onChange / 事件绑定**：在设计器中直接绑定 onChange 入口函数到目标字段，无需 `setTimeout`
- **初始化取值/设值**：直接执行，无需 setTimeout
- **仅在明细表尚未初始化时**：可保留短延时（100~300ms）

---

## 四、EKP 特有场景 → MK 迁移策略

### 4.1 JSP 片段中的立即执行代码

```javascript
// EKP
$(function(){
  setTimeout("AddInput()", 1000);
})
AttachXFormValueChangeEventById("fd_ChanPinType", function(){ AddInput(); });
```

**MK 处理：**
```javascript
// JS 面板 — onLoad 入口函数（初始化时执行一次）
function onLoad() {
  AddInput();
}

// JS 面板 — onChange 入口函数（在设计器中绑定到 fdNewChanPinType 字段）
function chanPinTypeOnChange(value, rowNum) {
  AddInput();
}

// 嵌套在入口函数内的 helper（因 AddInput 被两个入口共用，各自复制一份）
// 实际迁移时 AddInput 逻辑嵌套在 onLoad 和 chanPinTypeOnChange 各自体内
```

去掉 `$(function(){...})` 和 `setTimeout`，MK 表单 JS 面板已在合适时机执行。

### 4.2 明细表新增行时初始化默认值

EKP 常监听明细表 DOM 变化后手动设值。MK 直接在 `addRow` 时传入 rowValue：

```javascript
// EKP（伪代码）
监听明细表添加行事件 → 遍历新行 → SetXFormFieldValueById("table.row.field", "默认值")

// MK
MKXFORM.addRow("tableId", { field1: "默认值", field2: 0 });
```

### 4.3 提交前校验

```javascript
// EKP
$(form).submit(function(e) {
  if (!validate()) { e.preventDefault(); return false; }
});

// MK
MKXFORM.beforeSubmit(function() {
  if (!validate()) { return false; }
  return true;
}, "校验失败提示");
```

### 4.4 EKP 公式 `defaultValue="$xxx$"`

EKP 的 `fd_values` 中 `defaultValue` 支持公式语法（如 `$申请单编号$`、`$组织架构.获取组织架构对象全路径$($申请人$)`）。

**MK 处理**：这类**默认值应由 MK 表单配置层实现**（字段配置中的"默认值"或"公式"），而非 JS 代码。Agent 遇到时应在 `migration-notes.md` 中标注"建议配置化"，不生成对应 JS。详见 [config-vs-js-decision.md](./config-vs-js-decision.md)。

---

## 五、MK 独有能力（EKP 无对应）

以下 MK API 在 EKP 中无直接对应，但迁移时可**主动引入**简化代码：

| MK API | 用途 | 何时引入 |
|---|---|---|
| `MKXFORM.getValueText(id)` | 获取显示文本（下拉选项文本而非值） | EKP 需遍历 options 找 selected 时 |
| `MKXFORM.getControlHtml(id)` | 获取控件带样式的 HTML | 打印/导出场景 |
| `MKXFORM.cacluColumnValue(id)` | 一行代码算明细表列 max/min/avg | EKP 手写循环计算时 |
| `MKXFORM.getSelectedRowIndex(id)` | 获取选中行下标数组 | EKP 遍历 checkbox 时 |
| `MKXFORM.validateFields()` | 触发表单校验，返回 Promise | EKP 手写校验逻辑时 |
| `MKXFORM.executeOperation(...)` | 执行业务操作（新增/编辑/删除/打印等） | EKP 用 URL 跳转/后台调用时 |
| `MKXFORM.HTMLModal({ content })` | 弹出自定义 HTML | EKP 用 `window.open` 或 `dialog` 时 |
| `MKXFORM.tableModal(...)` | 弹出表格 | EKP 手写表格弹窗时 |

---

## 六、快速查询索引

按 EKP 关键字反查：

| 关键字 | 跳转 |
|---|---|
| `GetXFormFieldById` | §1.1、§2.1 |
| `SetXFormFieldValueById` | §1.1 |
| `AttachXFormValueChangeEventById` | §1.2 |
| `XFormOnValueChange` | §1.6 + [global-hook-patterns.md](./global-hook-patterns.md) |
| `.value =` | §2.2 + [indirect-write-patterns.md](./indirect-write-patterns.md) |
| `.style.display` | §2.4 |
| `setAttribute("validate","required")` | §1.3、§2.3 |
| `document.createElement` | §2.5 |
| `$.ajax` | §3.1 |
| `alert` / `confirm` | §3.2 |
| 明细表 `for` 循环 | §1.5 + [detail-table-patterns.md](./detail-table-patterns.md) |
| `$组织架构.xxx$` | §3.4 + [config-vs-js-decision.md](./config-vs-js-decision.md) |
| `setTimeout` | §3.5 |

---

## 七、相关文档

- [detail-table-patterns.md](./detail-table-patterns.md) — 明细表 5 种典型转换模式
- [indirect-write-patterns.md](./indirect-write-patterns.md) — 间接写入识别与转换
- [global-hook-patterns.md](./global-hook-patterns.md) — 全局钩子拆解
- [label-to-id-patterns.md](./label-to-id-patterns.md) — ByLabel 引用处理
- [value-format-conversion.md](./value-format-conversion.md) — 值格式差异
- [config-vs-js-decision.md](./config-vs-js-decision.md) — 配置化决策
- [`03-target-mk/mkxform-api-reference.md`](../03-target-mk/mkxform-api-reference.md) — MK 完整 API 手册
