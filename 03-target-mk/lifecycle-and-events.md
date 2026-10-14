# MKXFORM 注册顺序与生命周期

> 本文档从 [`mkxform-api-reference.md §15`](./mkxform-api-reference.md) 独立出来，
> 便于 Agent 快速理解 MKXFORM 的初始化时序与可用 API 范围。

---

## 一、两种初始化模式

MKXFORM 有两种初始化入口，对应不同场景：

| 入口 | 场景 | 特点 |
|---|---|---|
| `MKXFORMFACTORY.initRuntime(payload)` | **运行时**（表单实际使用） | **同步**注册核心 API |
| `MKXFORMFACTORY.initDesign(props)` | **设计器模式**（表单设计时） | 额外**异步**注册集成/流程/组织等 API |

**Agent 关注点**：迁移后的 JS 运行在**运行时模式**，因此只能依赖 `initRuntime` 同步注册的 API。若使用了 `initDesign` 才有的动态 API（如 `callTic`、`callOrg`、`flow_xxx`），需确认目标环境是否支持。

---

## 二、initRuntime 同步注册顺序

```
1. 设置直接属性
   ├─ MKXFORM_DATA_CONTAINER  (提交钩子容器)
   ├─ viewStatus              (视图状态)
   ├─ docStatus               (文档状态)
   ├─ processInstanceId       (流程实例 ID)
   ├─ platform                (设备端；文档标 pc/mobile，实测 PC 浏览器返回 desktop)
   ├─ dataModels              (数据模型配置)
   ├─ formId                  (表单 ID)
   ├─ formSizeType            (表单尺寸类型)
   ├─ $$FORM                  (表单实例引用)
   ├─ $$LBPM                  (流程实例引用)
   ├─ $$DETAILFORMS           (明细表实例引用集合)
   ├─ $$CONTROLREF            (控件引用)
   ├─ popupOnOk / popupOnCancel  (移动端弹窗回调)
   └─ businessFieldsValue     (业务内置字段值)

2. inner 模块 (5 个，对用户隐藏)
   ├─ callTic       (集成平台)
   ├─ callLbpm      (流程平台)
   ├─ callOrg       (组织架构)
   ├─ callFlow      (动作流)
   └─ callLanBots   (AI 助手)

3. vars 模块 (5 个，覆盖同名直接属性为 getter)
   ├─ mkXform       (MKXFORM 自身)
   ├─ viewStatus
   ├─ docStatus
   ├─ platform
   └─ formId

4. global 模块 (13 个)
   ├─ ajax
   ├─ getLocale
   ├─ validateFields
   ├─ getFormConfigs
   ├─ getFormValues
   ├─ message       (PC 消息提示)
   ├─ toast         (移动端提示)
   ├─ modal         (PC 弹窗)
   ├─ mobileModal   (移动端弹窗)
   ├─ tableModal    (表格弹窗)
   ├─ HTMLModal     (HTML 弹窗)
   ├─ executeOperation  (业务操作)
   └─ authOperation     (权限校验)

5. function 模块 (9 个，主表函数)
   ├─ $             (获取组件实例)
   ├─ setValue
   ├─ getValue
   ├─ setStyle
   ├─ setProps
   ├─ getFieldAttr
   ├─ setFieldAttr
   ├─ getValueText
   └─ getControlHtml

6. detail 模块 (17 个，明细表函数)
   ├─ getControlValue
   ├─ updateControl
   ├─ updateControlStyle
   ├─ addRow
   ├─ updateRow
   ├─ deleteRow
   ├─ getRowCount
   ├─ getSelectedRowIndex
   ├─ checkDetailRow
   ├─ controlDetailRowCanDelete
   ├─ cacluColumnValue
   ├─ getPageControlValue
   ├─ setDetailFieldAttr
   ├─ setDetailRowAttr
   ├─ setDetailFieldItemAttr
   ├─ reload
   └─ disabledOperation

7. event 模块 (3 个)
   ├─ onChange
   ├─ beforeSubmit
   └─ afterSubmit

8. fixLbpms 模块 (4 个，同步流程函数)
   ├─ getLbpmFormValues
   ├─ getOperationParameter
   ├─ getIdentity
   └─ getProcessInstanceId

9. fixLbpms 重复注册 (疑似 bug，忽略)

10. [条件] registerGlobalEnvToWindow
    └─ 若 formAttr.controlAction 存在，注册 GLOBALJS
```

**同步合计**：约 **71 个** API。

---

## 三、initDesign 异步注册（仅设计器）

```
window.MKXFORM = MKXFORM    ← 挂载到全局

Promise.all([
  integrate()     → promise_{systemName} / tic_{interfaceCode}
  lbpms()         → promise_{name} / getIdentity / getLbpmFormValues / getOperationParameter
  orgFunctions()  → org_{description}
  flow(props)     → flow_{fdCode}
  lanbots()       → lanbotsPromises_{value} / lanbots_{fdId}
])
```

**特点**：
- 从后端**动态获取**接口/流程/组织函数清单
- 命名格式固定（如 `tic_xxx`、`org_xxx`、`flow_xxx`）
- 数量不定（可能为 0）

**Agent 关注点**：迁移后的 JS 若需调用这些动态 API，应使用**通用入口**（`callTic`、`callOrg`、`callFlow`）而非具体的 `tic_xxx`、`org_xxx`，因为后者只在设计器环境存在。

---

## 四、JS 面板脚本的执行时机

MK 表单 JS 面板中的脚本执行时机：

```
表单组件挂载
    ↓
initRuntime 完成（同步 API 全部就绪）
    ↓
JS 面板脚本执行 ← 你的迁移代码在这里
    ↓
表单字段渲染完成
    ↓
明细表数据加载（若有）
    ↓
触发首次 onChange（若配置了默认值）
```

**关键结论**：
- ✅ JS 面板脚本执行时，`MKXFORM.getValue` / `setValue` / `onChange` 等**已可用**
- ⚠️ **明细表数据可能尚未加载完成**，此时 `getRowCount` 可能返回 0
- ❌ 不需要 `$(document).ready` 或 `setTimeout(fn, 1000)` 等待 DOM

### 4.1 ⚠️ JS 面板 vs 全局函数面板的结构约束（务必遵守）

MK 表单脚本分两个面板，各有**存活规则**，直接决定迁移代码怎么组织：

| 面板 | 能放什么 | 会被清掉什么 |
|---|---|---|
| **JS 面板** | 只有**被绑定的入口函数**：点击函数（绑到按钮）、onChange 函数（绑到字段值变更）、onLoad 函数 | **未绑定的函数** + **顶层字段定义（`var xxx = ...`）** 一律被清除 |
| **全局函数面板** | 子函数 / 工具函数（helper） | — |

**⚠️ 两面板互相隔离（平台实测结论）**：JS 面板**无法调用**全局函数面板中的函数。
因此**迁移代码的全部逻辑必须写在 JS 面板的入口函数内部**——helper 以**嵌套函数**形式定义在入口函数体内，随入口函数一起存活。

**由此推导出的迁移代码组织规则：**

1. **入口函数放 JS 面板**：三类绑定式入口——按钮点击函数、字段 onChange 函数、onLoad 函数。
2. **helper 必须嵌套在入口函数体内**（`function entry() { function helper() {...} ... }`）：放 JS 面板顶层会被清掉，放全局函数面板则调不到。
3. **多个入口函数需要同一 helper 时只能各自复制一份**（如跨端提示函数），或在设计上让该逻辑只归属一个入口函数。
4. **禁止顶层 `var` 字段定义**：如 `var TABLE = 'xxx'` 会被清掉。表 ID、字段 ID 等常量应**内联为字符串**，或在**每个入口函数内部**用局部 `var` 定义。
5. **onChange 函数是独立绑定的入口函数**（不需要 onLoad + `MKXFORM.onChange()` 注册），签名为 `function xxxOnChange(value, rowNum, parentRowNum)`，在设计器中绑定到目标字段。`rowNum` 在明细表字段变更时传入当前行号。

**组织示例：**
```javascript
// ===== JS 面板（全部逻辑在此；全局函数面板不放任何被依赖的内容）=====

// onChange 入口：绑定到明细表字段，rowNum 由平台自动传入
function clothingNameOnChange(value, rowNum) {
  var tableId = 'mk_model_xxx_d_xxx';
  MKXFORM.updateControl(tableId + '.fd_lastTime', rowNum, '');
  MKXFORM.updateControl(tableId + '.fd_usedYear', rowNum, '');
}

// 点击入口：绑定到按钮
function fetchLastTime(evt) {
  var tableId = 'mk_model_xxx_d_xxx';
  function notifyWarning(text) { /* 嵌套 helper，本入口专用 */ }
  function fetchRow(rowNum, name, code) { /* 嵌套 helper */ }
  for (var r = 0; r < MKXFORM.getRowCount(tableId); r++) { /* ... */ }
}
```

---

## 五、时序陷阱与应对

### 陷阱 1：初始化时读取明细表行数为 0

**场景**：
```javascript
// ❌ 可能返回 0，因为明细表数据尚未加载
var count = MKXFORM.getRowCount("fdNewTable");
for (var i = 0; i < count; i++) { /* ... */ }
```

**应对方案 A**：延迟执行
```javascript
setTimeout(function() {
  var count = MKXFORM.getRowCount("fdNewTable");
  // ...
}, 300);
```

**应对方案 B**：改为在 onChange 中处理（推荐）
```javascript
MKXFORM.onChange("fdNewTable", function(value, extValue) {
  // 明细表数据变化时触发，此时行数已准确
  var count = MKXFORM.getRowCount("fdNewTable");
  // ...
});
```

**应对方案 C**：监听明细表首次加载事件（若 MK 提供）

### 陷阱 2：setValue 后立即 getValue 读到旧值

**场景**：MK 内部有状态更新时序，`setValue` 后立刻 `getValue` 可能读到旧值。

**应对**：
- 若需基于新值做后续逻辑，直接将新值作为变量传递，不要再次 `getValue`
- 或用 `setTimeout(fn, 0)` 延迟到下一 tick

### 陷阱 3：updateControl 的 100ms 防抖

**场景**：连续多次 `updateControl` 会合并为一次更新（100ms 内累积到同一批次，执行时"克隆当前行数据 → 合并新值"）。

**应对**：
- 更新**不同字段**时合并是**无损**的（各字段新值都会写入），可放心连续调用（如同时清空 `fd_lastTime`/`fd_usedYear`）
- 若需**立即读取**刚写入的值，等待 150ms 后再读（否则可能读到旧值）
- 同一行多字段也可改用 `updateRow` 一次合并写入：
  ```javascript
  MKXFORM.updateRow("tableId", rowNum, { field1: v1, field2: v2 });
  ```

### 陷阱 4：onChange 回调中的 extValue 结构

**场景**：明细表 onChange 的 `extValue.tinyValues` 是**批量变更集合**（因防抖），可能包含多行多字段的变化。

**结构**：
```javascript
extValue = {
  tinyValues: {
    "0": { "field1": "newV1", "field2": "newV2" },   // 第 0 行的变更
    "2": { "field1": "newV3" }                          // 第 2 行的变更
  }
}
```

**应对**：遍历 `tinyValues` 处理每行变更，而非假设只有一行。

---

## 六、提交生命周期

```
用户点击提交按钮
    ↓
执行 MKXFORM_DATA_CONTAINER.$$beforeSubmit 数组中的所有拦截函数
    ├─ 以 Promise.all 并行执行
    ├─ 任一返回 false → 阻止提交，显示对应 message
    └─ 全部返回 true → 继续
    ↓
500ms 延迟（内置）
    ↓
表单实际提交（后端）
    ↓
提交成功
    ↓
执行 MKXFORM_DATA_CONTAINER.$$afterSubmit 数组中的所有回调
    └─ 以 Promise.all 并行执行，无延迟
```

**Agent 关注点**：
- `beforeSubmit` 适合做**校验**（返回 false 阻止）
- `afterSubmit` 适合做**提交后逻辑**（跳转、提示、刷新）
- 两者都支持注册多个回调，按注册顺序执行

---

## 七、API 可用性速查

| API 类别 | 运行时可用 | 设计器可用 | 备注 |
|---|---|---|---|
| 直接属性（15 个） | ✅ | ✅ | — |
| inner（5 个） | ✅ | ✅ | 对用户隐藏但可调用 |
| vars（5 个） | ✅ | ✅ | — |
| global（13 个） | ✅ | ✅ | — |
| function 主表（9 个） | ✅ | ✅ | — |
| detail 明细表（17 个） | ✅ | ✅ | — |
| event（3 个） | ✅ | ✅ | — |
| fixLbpms 同步（4 个） | ✅ | ✅ | — |
| integrate 动态（tic_xxx） | ❌ | ✅ | 运行时用 `callTic` 替代 |
| lbpms 动态（promise_xxx） | ❌ | ✅ | 运行时用 `callLbpm` 替代 |
| orgFunctions 动态（org_xxx） | ❌ | ✅ | 运行时用 `callOrg` 替代 |
| flow 动态（flow_xxx） | ❌ | ✅ | 运行时用 `callFlow` 替代 |
| lanbots 动态 | ❌ | ✅ | 运行时用 `callLanBots` 替代 |
| GLOBALJS | 条件可用 | 条件可用 | 依赖 `formAttr.controlAction` 配置 |

**Agent 迁移原则**：优先使用**运行时可用**的 API（前 8 类 + `callXxx` 通用入口），避免依赖动态注册的具体函数名。

---

## 八、相关文档

- [`mkxform-api-reference.md`](./mkxform-api-reference.md) — MKXFORM 完整 API 手册
- [`control-value-format.md`](./control-value-format.md) — 控件值格式约定
- [`../04-migration-rules/api-mapping-table.md §3.5`](../04-migration-rules/api-mapping-table.md) — 定时器处理
