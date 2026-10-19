# MKXFORM API 完整文档

## 目录

- [1. 概述](#1-概述)
- [2. 直接属性（initRuntime）](#2-直接属性initruntime)
- [3. 内置函数（inner）](#3-内置函数inner)
- [4. 常用变量（vars）](#4-常用变量vars)
- [5. 通用函数（global）](#5-通用函数global)
- [6. 主表函数（functions）](#6-主表函数functions)
- [7. 明细表函数（details）](#7-明细表函数details)
- [8. 事件（events）](#8-事件events)
- [9. 流程函数（lbpms）](#9-流程函数lbpms)
- [10. 集成平台（integrate）](#10-集成平台integrate)
- [11. 组织架构（orgFunctions）](#11-组织架构orgfunctions)
- [12. 动作流（flow）](#12-动作流flow)
- [13. LanBots AI（lanbots）](#13-lanbots-ailanbots)
- [14. 全局环境变量（GLOBALJS）](#14-全局环境变量globaljs)
- [15. 注册顺序与生命周期](#15-注册顺序与生命周期)

---

## 1. 概述

`MKXFORM` 是表单运行时的全局 API 对象，挂载在 `window.MKXFORM` 上（设计器模式通过 `initDesign`），提供了表单操作、控件交互、事件监听、流程操作等全部能力。

**初始化入口：**

- `MKXFORMFACTORY.initRuntime(payload)` — 创建 MKXFORM 对象并同步注册 API
- `MKXFORMFACTORY.initDesign(props)` — 设计器模式，额外异步注册集成/流程/组织等 API

**属性统计：**

| 分类                 | 数量      |
| ------------------ | ------- |
| 直接属性               | 15      |
| 内置函数（inner）        | 5       |
| 常用变量（vars）         | 5       |
| 通用函数（global）       | 13      |
| 主表函数（functions）    | 9       |
| 明细表函数（details）     | 17      |
| 事件（events）         | 3       |
| 流程函数（fixLbpms）     | 4       |
| **同步合计**           | **~71** |
| 集成平台（integrate）    | 动态      |
| 流程平台（lbpms）        | 动态      |
| 组织架构（orgFunctions） | 动态      |
| 动作流（flow）          | 动态      |
| LanBots（lanbots）   | 动态      |

---

## 2. 直接属性（initRuntime）

> 来源：`MKXFORMFACTORY.initRuntime` 中直接赋值

| # | 属性名 | 类型 | 说明 |
|---|--------|------|------|
| 1 | `MKXFORM_DATA_CONTAINER` | `object` | 表单提交钩子容器，包含 `$$beforeSubmit`（提交前函数数组）和 `$$afterSubmit`（提交后函数数组） |
| 2 | `viewStatus` | `string` | 视图状态（如 `edit`、`read` 等），后续被 vars 模块覆盖为 getter |
| 3 | `docStatus` | `string` | 文档/流程状态，后续被 vars 模块覆盖为 getter |
| 4 | `processInstanceId` | `string` | 当前流程实例 ID |
| 5 | `platform` | `string` | 设备端（`pc` / `mobile`），后续被 vars 模块覆盖为 getter |
| 6 | `dataModels` | `IDataModel[]` | 数据模型配置数组 |
| 7 | `formId` | `string` | 表单 ID，后续被 vars 模块覆盖为 getter |
| 8 | `formSizeType` | `string` | 表单尺寸类型（来自 viewDetail） |
| 9 | `$$FORM` | `React.RefObject<IFormApi>` | 内置表单实例引用 |
| 10 | `$$LBPM` | `React.MutableRefObject<any>` | 流程实例引用 |
| 11 | `$$DETAILFORMS` | `React.MutableRefObject<{[key: string]: any}>` | 明细表实例引用集合 |
| 12 | `$$CONTROLREF` | `React.MutableRefObject<any>` | 控件引用 |
| 13 | `popupOnOk` | `() => void` | 移动端 popup 弹窗确认回调 |
| 14 | `popupOnCancel` | `() => void` | 移动端 popup 弹窗取消回调 |
| 15 | `businessFieldsValue` | `object` | 业务内置字段值（目前仅 EOP 合同模块场景使用） |

---

## 3. 内置函数（inner）

> 模块名：`inner`，分组：`EApiGroup.inner`（对用户隐藏）

### 3.1 `callTic`

**描述：** 调用集成平台接口

**签名：**
```typescript
callTic(config: { interfaceCode: string, param: any }, callback: (error: any, res: any) => void): Promise<void>
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `config.interfaceCode` | `string` | 集成平台接口编码 |
| `config.param` | `any` | 接口参数 |
| `callback` | `(error, res) => void` | 回调函数，error 为错误信息，res 为返回数据（`res.data`） |

**实现细节：**
- 调用 `api.executeForAjax(config.interfaceCode, config.param)` 发起请求
- 成功时返回 `res.data`
- 失败时自动调用 `Message.error('接口调用异常，请联系管 理员处理！')`，并打印错误到 console
- 支持多语言（`fmtMsg`）

**使用示例：**
```javascript
MKXFORM.callTic({ interfaceCode: 'INTERFACE_001', param: { key: 'value' } }, function(error, res) {
  if (error) {
    console.error('调用失败', error)
    return
  }
  console.log('返回数据', res)
})
```

---

### 3.2 `callLbpm`

**描述：** 调用流程平台接口，自动注入 `processInstanceId` 和 `taskId`

**签名：**
```typescript
callLbpm(config: any, callback: (error: any, res: any) => void): Promise<void>
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `config` | `any` | 流程接口配置，需包含 `functionCode` 等字段 |
| `callback` | `(error, res) => void` | 回调函数，error 为错误信息，res 为返回数据（`res.data`） |

**实现细节：**
- 自动注入 `processInstanceId`：优先从 `$$lbpm(MKXFORM)?.getLbpmFormValues()?.processId` 获取，降级到 `MKXFORM.processInstanceId`，最后为 `null`
- 自动注入 `taskId`：从 `$$lbpm(MKXFORM)?.getLbpmFormValues()?.taskId` 获取，未获取到为 `null`
- 调用 `Api.executeForAjax({ ...config, processInstanceId, taskId })`
- 失败时自动调用 `Message.error('接口调用异常，请联系管理员处理！')`
- 支持多语言（`fmtMsg`）

**使用示例：**
```javascript
MKXFORM.callLbpm({ functionCode: 'FN_APPROVE' }, function(error, res) {
  if (error) {
    console.error('调用失败', error)
    return
  }
  console.log('返回数据', res)
})
```

---

### 3.3 `callOrg`

**描述：** 调用组织架构函数接口

**签名：**
```typescript
callOrg(config: { id: string, param?: any }, callback: (error: any, res: any) => void): Promise<void>
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `config.id` | `string` | 组织函数 ID，支持 `.` 分隔的路径（如 `com.example.getDept`），内部会按 `.` 分割取第二部分作为路径 |
| `config.param` | `any`（可选） | 函数参数，默认 `{}` |
| `callback` | `(error, res) => void` | 回调函数，error 为错误信息，res 为返回数据（`res.data`） |

**实现细节：**
- 内部通过 `OrgHttp.post('/sysOrgJsFormula/{path}', param)` 发起请求
- `id` 按 `.` 分割后取第二部分作为 URL 路径（如 `org.getDeptById` → `/sysOrgJsFormula/getDeptById`）
- 失败时自动调用 `Message.error('接口调用异常，请联系管理员处理！')`
- 支持多语言（`fmtMsg`）

**使用示例：**
```javascript
// 根据组织编码查找组织
MKXFORM.callOrg({ id: 'sysorg.getElementByNo', param: { fdNo: 'DEPT001', orgType: 2 } }, function(error, res) {
  if (error) {
    console.error('调用失败', error)
    return
  }
  console.log('部门信息', res)
})
```

---

### 3.4 `callFlow`

**描述：** 调用动作流函数接口

**签名：**
```typescript
callFlow(config: { context: any, fdProcessId: string, incParams: any, fdProcessCode: string }, callback: (error: any, res: any, context: any) => void): Promise<void>
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `config.context` | `any` | 上下文对象，内部通过 `context.fdOprId` 获取操作 ID |
| `config.fdProcessId` | `string` | 流程定义 ID |
| `config.incParams` | `any` | 附加参数 |
| `config.fdProcessCode` | `string` | 流程编码 |
| `callback` | `(error, res, context) => void` | 回调函数，第三个参数返回原始 context 对象 |

**实现细节：**
- 调用 `api.executeFlowForAjax({ fdOprId: context.fdOprId, fdProcessId, fdProcessCode, incParams })`
- 成功时返回 `(null, res, context)`，context 原样回传
- 失败时自动调用 `Message.error('接口调用异常，请联系管理员处理！')`

**使用示例：**
```javascript
MKXFORM.callFlow({
  context: { fdOprId: 'opr_001' },
  fdProcessId: 'process_001',
  incParams: {},
  fdProcessCode: 'FLOW_APPROVE'
}, function(error, res, context) {
  if (error) {
    console.error('调用失败', error)
    return
  }
  console.log('流程执行结果', res)
  console.log('上下文', context)
})
```

---

### 3.5 `callLanBots`

**描述：** 调用 LanBots 快速阅读和辅助填写 AI 功能

**签名：**
```typescript
callLanBots(config: { fdCode: string, id: string, lanBotsType: string }, callback: (error: any, res: any) => void): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `config.fdCode` | `string` | LanBots 编码 |
| `config.id` | `string` | 模型 ID |
| `config.lanBotsType` | `string` | 使用场景类型 |
| `callback` | `(error, res) => void` | 回调函数，res 包含 `success` 和 `content` 字段 |

**实现细节：**
- 通过 `window['sys-xform-lanBots']` 防止重复打开（已有打开的 LanBots 时不再创建新实例）
- 调用 `openLanBots(config, callback, MKXFORM, {})` 打开 AI 助手
- 成功时可通过 `res.success` 和 `res.content` 获取 AI 返回内容，配合 `setValue` 回填表单
- 异常时回调 `callback(error, { success: false })`

**使用示例：**
```javascript
MKXFORM.callLanBots({
  fdCode: 'CAT_001',
  id: 'BOT_001',
  lanBotsType: 'quickRead'
}, function(error, res) {
  console.log(res)
  if (res && res.success) {
    // 将 AI 返回的内容回填到表单
    MKXFORM.setValue('field_id', res.content)
  }
})
```

---

## 4. 常用变量（vars）

> 模块名：`vars`，分组：`EApiGroup.all`

这些变量为只读属性，注册后会覆盖 `initRuntime` 中的同名直接属性。

| #   | 属性名          | 类型       | 说明                 |
| --- | ------------ | -------- | ------------------ |
| 1   | `mkXform`    | `object` | 内置表单对象（MKXFORM 自身） |
| 2   | `viewStatus` | `string` | 视图状态（edit/read 等）  |
| 3   | `docStatus`  | `string` | 文档/流程状态            |
| 4   | `platform`   | `string` | 设备端（文档标注 pc/mobile，实测 PC 浏览器返回 `desktop`）     |
| 5   | `formId`     | `string` | 表单 ID              |

**使用示例：**
```javascript
var status = MKXFORM.viewStatus      // 获取当前视图状态
var docStatus = MKXFORM.docStatus     // 获取文档状态
var platform = MKXFORM.platform       // 获取设备端
var fid = MKXFORM.formId              // 获取表单ID
```

> ⚠️ **`platform` 实测坑（务必遵守）**：官方文档标注取值为 `pc` / `mobile`，但在真实 PC 浏览器中实测返回的是 **`desktop`**，并非 `pc`。因此：
> - **禁止**用 `MKXFORM.platform === 'pc'` 判断桌面端 —— 真实环境永远不成立。
> - 判断移动端用 `MKXFORM.platform === 'mobile'`（可靠）。
> - 判断桌面端用 `MKXFORM.platform !== 'mobile'`，或 `['pc', 'desktop'].indexOf(MKXFORM.platform) > -1`（兼容文档与实测两种取值）。

---

## 5. 通用函数（global）

> 模块名：`global`，分组：`EApiGroup.all`

### 5.1 `ajax`

**描述：** 发起异步 HTTP 请求。本质是 `axios()` 方法，可参考 http://axios-js.com/zh-cn/docs/index.html 中 axios 方法使用方式。

**签名：**
```typescript
ajax(config: AxiosRequestConfig, callback: (error: any, res: any) => void): Promise<any>
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `config` | `AxiosRequestConfig` | axios 请求配置（url、method、data、headers 等），可参考 [axios 文档](http://axios-js.com/zh-cn/docs/index.html) |
| `callback` | `(error, res) => void` | 回调函数。参数 `error` 为错误信息；参数 `res` 为响应数据 |

**返回值：** `res` 结构为 `{ msg: string, success: boolean, data: any }`。

**实现细节：**
- 使用 `httpBaseUrl(url)` 解析相对 URL（兼容上下文的场景）
- 错误时将 `err.response` 传递给回调函数

**使用示例：**
```javascript
MKXFORM.ajax({
  method: 'GET',
  url: '/api/data'
}, function (error, res) {
  console.log(res) // {msg: 'xxx', success: true, data: xxx}
})
```

---

### 5.2 `getLocale`

**描述：** 获取多语言信息。可用于获取用户当前多语言标志，或返回传入键值对中匹配当前语言的值。

**签名：**
```typescript
getLocale(messages?: { Cn: string, Us: string, [locale: string]: string }): string
```

**参数：**

| 参数             | 类型                                | 说明                                    |
| -------------- | --------------------------------- | ------------------------------------- |
| `messages`（可选） | `{ Cn: string, Us: string, ... }` | 多语言文本映射表。格式为 `{ Cn: '中文', Us: '英文' }` |
|                |                                   |                                       |

**返回值：** 若传 `messages` 则返回当前语言对应的文本；若未传参则返回当前语言标志（如 `Cn`、`Us`）。

**实现细节：**
- 使用 `getDefaultLocale()` 从 runtime utils 获取当前语言标志
- 若传入 `messages` 但格式不正确（缺少 `Cn` 或 `Us` 键），打印警告：`console.warn('参数不对，格式应为 {Cn: "中文", Us: "英文"}')`

**使用示例：**
```javascript
// 若当前用户语言为中文，未传参则直接返回 'Cn'
MKXFORM.getLocale()

// 若当前用户语言为中文，传了多语言键值对，则返回 '中文'
MKXFORM.getLocale({ Cn: '中文', Us: '英文' })
```

---

### 5.3 `validateFields`

**描述：** 强制触发表单校验，返回值为一个 Promise。

**签名：**
```typescript
validateFields(): Promise<{ errors: any, value: any, values: any }>
```

**返回值：** Promise，resolve 时返回验证结果对象：

| 字段 | 类型 | 说明 |
|------|------|------|
| `errors` | `object` | 错误字段数据，key 为字段 ID，value 为错误信息数组。无错误时为空 |
| `value` | `any` | 表单值（同 values） |
| `values` | `any` | 表单所有值 |

**实现细节：**
- 委托给 `$$form(MKXFORM)?.validateFields()` 执行
- 内置 `withdraw()` 存根方法（TODO，待实现）

**errors 格式示例：**
```json
{
  "mk_model_xxx.fd_col_xxx": {
    "errors": [
      { "message": "单行文本1不能为空", "field": "mk_model_xxx.fd_col_xxx" }
    ]
  }
}
```

**使用示例：**
```javascript
MKXFORM.validateFields()
.then(function(result) {
  var errors = result.errors
  var values = result.values
  console.log('错误字段数据', errors)
  console.log('表单数据', values)
})
```

---

### 5.4 `getFormConfigs`

**描述：** 获取表单基础配置信息，如表单全部字段 ID、表 ID、表单 fdId 和字段对应控件等。

**签名：**
```typescript
getFormConfigs(): any
```

**返回值：** 表单配置对象，包含表单所有字段的 ID、表 ID、表单 fdId、各字段对应的控件类型等信息。

**实现细节：**
- 委托给 `$$form(MKXFORM)?.getFormConfigs()` 执行

**使用示例：**
```javascript
var config = MKXFORM.getFormConfigs()
```

---

### 5.5 `getFormValues`

**描述：** 获取整个表单所有值，以键值对形式返回，包含机制数据和系统字段数据。

**签名：**
```typescript
getFormValues(): any
```

**返回值：** 表单所有字段值对象 `{ fieldId: value, ... }`，包含机制数据和系统字段数据。

**实现细节：**
- 委托给 `$$form(MKXFORM)?.getFieldsValue()` 执行

**使用示例：**
```javascript
var values = MKXFORM.getFormValues()
console.log('字段A的值', values.fieldA)
```

---

### 5.6 `message`

**描述：** 全局消息提示（仅支持桌面端），实际调用为 `lui` 库 `Message` 组件方法。

**类型：** `@lui/core` 的 `Message` 对象

**方法：**

| 方法 | 签名 | 说明 |
|------|------|------|
| `success` | `message.success(text: string)` | 成功提示 |
| `error` | `message.error(text: string)` | 错误提示 |
| `warning` | `message.warning(text: string)` | 警告提示 |
| `info` | `message.info(text: string)` | 信息提示 |

**实现细节：**
- 直接导出 `Message` 对象从 `@lui/core` 库

**使用示例：**
```javascript
MKXFORM.message.success('全局成功提示')
MKXFORM.message.warning('全局警告提示')
MKXFORM.message.error('全局错误提示')
```

---

### 5.7 `toast`

**描述：** 全局消息提示（仅支持移动端），实际调用为 `mui` 库 `Toast` 组件方法。

**签名：**
```typescript
toast(options: { content: string, icon: 'success' | 'fail' | 'warning' }): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `options.content` | `string` | 提示文本 |
| `options.icon` | `'success' \| 'fail' \| 'warning'` | 图标类型 |

**实现细节：**
- 直接调用 `Toast.show({...options})` 从 `@mui/core` 库

**使用示例：**
```javascript
MKXFORM.toast({
  content: '全局成功提示',
  icon: 'success',
})
```

---

### 5.8 `modal`

**描述：** confirm 弹窗（仅支持桌面端），实际调用为 `lui` 库 `Modal.confirm`，具体用法可参考 `lui` 对应组件。

**签名：**
```typescript
modal(options: { title?: string, content: string | ReactNode, onOk?: () => void, onCancel?: () => void }): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `options.title` | `string`（可选） | 弹窗标题 |
| `options.content` | `string \| ReactNode` | 弹窗内容 |
| `options.onOk` | `() => void`（可选） | 确认回调 |
| `options.onCancel` | `() => void`（可选） | 取消回调 |

**实现细节：**
- 使用 `Modal.confirm` 从 `@lui/core` 库
- 默认配置：`cancelText: '取消'`，`okText: '确定'`

**使用示例：**
```javascript
MKXFORM.modal({
    title: '是否关闭弹窗',
    content: '关闭则不再显示',
    onOk() {
      console.log('点击确认')
    },
    onCancel() {
      console.log('点击取消')
    },
})
```

---

### 5.9 `mobileModal`

**描述：** confirm 弹窗（仅支持移动端），实际调用为 `mui` 库 `Modal.confirm`，具体用法可参考 `mui` 对应组件。

**签名：**
```typescript
mobileModal(options: { title?: string, content: string, onConfirm?: () => void, onCancel?: () => void }): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `options.title` | `string`（可选） | 弹窗标题 |
| `options.content` | `string` | 弹窗内容 |
| `options.onConfirm` | `() => void`（可选） | 确认回调 |
| `options.onCancel` | `() => void`（可选） | 取消回调 |

**实现细节：**
- 使用 `Modal.confirm` 从 `@mui/core` 库
- 默认配置：`cancelText: '取消'`，`confirmText: '确定'`（注意：移动端使用 `confirmText` 而非 `okText`）

**使用示例：**
```javascript
MKXFORM.mobileModal({
    title: '是否关闭弹窗',
    content: '关闭则不再显示',
    onConfirm() {
      console.log('点击确认')
    },
    onCancel() {
      console.log('点击取消')
    },
})
```

---

### 5.10 `tableModal`

**描述：** 表格弹窗（仅支持桌面端），弹窗内渲染一个表格。

**签名：**
```typescript
tableModal(options: { modal: object, table: object }): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `options.modal` | `object` | 弹窗配置（title、okCancel、okButtonProps、onOk、onCancel 等），具体配置可参考 [Ant Design Modal](https://4x.ant.design/components/modal-cn) |
| `options.table.columns` | `Array` | 表格列定义（title、key、dataIndex 等），具体配置可参考 [Ant Design Table](https://4x.ant.design/components/table-cn) |
| `options.table.dataSource` | `Array` | 表格数据 |

**实现细节：**
- 校验 `typeof options !== 'object'`，类型不匹配时返回 `null`
- 使用 `Modal.info` 渲染弹窗，内部通过 `createElement(Table, {...options.table})` 渲染表格
- 默认配置：`width: 1152`，`maxHeight: '776px'`，`destroyOnClose: true`，隐藏 OK 按钮
- 表格默认配置：`scroll: {x: true, y: true}`，`pagination: false`，`maxHeight: '500px'`

**使用示例：**
```javascript
MKXFORM.tableModal({
  modal: {
    title: '这是标题',
    okCancel: true,  // 显示取消按钮
    okButtonProps: {style: {display: ''}}, // 显示确定按钮
    renderExtra: () => '扩展区域',
    onOk() {
      console.log('点击确定')
    },
    onCancel() {
      console.log('点击取消')
    },
  },
  table: {
    columns: [
      { title: 'Name', key: 'name', dataIndex: 'name' },
      { title: 'Age', key: 'age', dataIndex: 'age' },
      { title: 'Address', key: 'address', dataIndex: 'address' },
      { title: 'Tags', key: 'tags', dataIndex: 'tags' }
    ],
    dataSource: [
      {
        key: '1',
        name: 'John Brown',
        age: 32,
        address: 'New York No. 1 Lake Park',
        tags: 'cool',
      }
    ]
  }
})
```

---

### 5.11 `HTMLModal`

**描述：** HTML 内容弹窗（仅支持桌面端），支持渲染自定义 HTML 内容。

**签名：**
```typescript
HTMLModal(options: { content: string, [key: string]: any }): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `options.content` | `string` | HTML 字符串内容（通过 `dangerouslySetInnerHTML` 渲染） |
| 其他 | `any` | 其余 Modal 组件属性（onOk、onCancel、okButtonProps、okCancel 等），具体配置可参考 [Ant Design Modal](https://4x.ant.design/components/modal-cn) |

**注意：** 默认隐藏 OK 按钮，可通过 `okButtonProps: { style: { display: '' } }` 显示。

**实现细节：**
- 校验 `typeof options !== 'object'`，类型不匹配时返回 `null`
- 与 `tableModal` 相同的默认配置：`width: 1152`，`maxHeight: '776px'`，`destroyOnClose: true`，隐藏 OK 按钮
- 使用 `createElement('div', {dangerouslySetInnerHTML: {__html: options.content}})` 渲染 HTML 内容

**使用示例：**
```javascript
var htmlText = '<div class="card">' +
  '<img src="https://picsum.photos/300/200" width="300" height="200">' +
  '<div style="padding:16px">' +
    '<h3 style="margin:0 0 8px">卡片标题</h3>' +
    '<p style="margin:0 0 12px;color:#666">简短描述文字</p>' +
    '<button style="padding:8px 16px;background:#007bff;color:#fff;border:none;border-radius:4px">按钮</button>' +
  '</div>' +
'</div>' +
'<style>' +
  '.card{width:300px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);font-family:system-ui}' +
'</style>'

MKXFORM.HTMLModal({
  onOk() {
    console.log('点击确认')
  },
  onCancel() {
    console.log('点击取消')
  },
  // 显示确定按钮
  // okButtonProps: { style: { display: '' } },
  // 显示取消按钮
  // okCancel: true,
  content: htmlText
})
```

---

### 5.12 `executeOperation`

**描述：** 执行业务操作。可执行已配置好的业务操作（包括内置业务操作），此方法无返回值，部分业务操作会进行页面跳转。实际执行 `sys-modeling` 模块下 `src/desktop/operation/execute.ts` 中的 `execute` 方法。

**签名：**
```typescript
executeOperation(operation: OperationConfig, params: ParamsConfig): void
```

**参数说明：**

**operation 参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `code` | `string` | 操作按钮类型（add/edit/delete/import/export/print/close/instanceClone/modalDefine/other 等） |
| `uniqueCode` | `string` | 操作唯一编码（不传时通过 `id` 获取操作） |
| `platform` | `'pc' \| 'mobile'` | 设备类型 |
| `id` | `string`（可选） | 操作 ID（不传时通过 `uniqueCode` 获取） |
| `name` | `string`（可选） | 操作名称（用于弹窗标题等） |
| `selected` | `boolean`（可选） | 是否需要选中数据（modalDefine/other 场景） |

**params 参数：**

| 参数                      | 类型                       | 说明                                                |
| ----------------------- | ------------------------ | ------------------------------------------------- |
| `fdType`                | `number`                 | 表单类型：0-普通表单, 1-分类模板, 2-简单分类                       |
| `fdCode`                | `string`                 | 表单编码                                              |
| `fdXFormId`             | `string`                 | 表单 ID（不传时通过 `fdCode` 调用接口获取）                      |
| `baseUrl`               | `string`                 | 路径前缀，如 `/current/sys-modeling/app/{appCode}`      |
| `fdTemplateId`          | `string`                 | 分类模板 ID（分类表单时必传）                                  |
| `target` / `fdOpenMode` | `string`                 | 打开方式：`self`、`drawer`、`_blank` 等                   |
| `drawerOptions`         | `object`                 | 抽屉配置                                              |
| `cacheListRef`          | `React.MutableRefObject` | 列表引用（用于刷新等操作）                                     |
| `$$contentviewProps`    | `object`                 | 内容视图属性，包含 `refresh`、`history`、`query` 等           |
| `setDoingOperation`     | `(v: boolean) => void`   | 设置操作进行中状态                                         |
| `defaultTemplateData`   | `string`                 | 表单默认值（JSON 序列化后会 URL 编码）                          |
| `callback`              | `Function`               | 操作完成回调，同步调用业务触发时有效                                |
| `docId`                 | `string`                 | 文档 ID（edit/delete/print 等场景）                      |
| `formId`                | `string`                 | 表单 ID（部分场景使用，等价于 `fdXFormId`）                     |
| `selectedId`            | `string[]`               | 选中的文档 ID 数组（deleteAll/batchPrint/modalDefine 等场景） |
| `fdRightGroupId`        | `string`                 | 权限组 ID                                            |
| `mechAuthToken`         | `string`                 | 实体认证 Token                                        |
| `dispatch`              | `Function`               | Redux dispatch（export 场景）                         |
| `refresh`               | `Function`               | 刷新回调                                              |
| `viewPageId`            | `string`                 | 视图页面 ID                                           |
| `entityName`            | `string`                 | 实体名（分类表单场景）                                       |
| `entityId`              | `string`                 | 文档 ID（分类表单场景）                                     |

**参数转换规则（formatParams）：**

仅 `add` 和 `other` 操作（PC 端）会进行参数转换：

| 传入 params 字段 | 转换后字段 | 适用操作 |
|------------------|------------|----------|
| `fdType` | `fdCategoryType` | add |
| `fdCode` | `fdCategoryModelCode` | add, other |
| `fdTemplateId` | `fdCategoryTemplateId` | add |
| `fdXFormId` | `formId` | add |
| `target` | `fdOpenMode` | add, other |

> 其他操作（delete、edit、print 等）参数不做转换，直接透传。

**各操作类型详细参数：**

#### add — 新增

```javascript
MKXFORM.executeOperation({
  code: 'add',
  uniqueCode: 'template_p20v4f',
  platform: 'pc'
}, {
  fdType: 0,
  fdCode: 'template_xxx',
  fdXFormId: '1jl8h9edlwrw6v03w1rcbmkp31a3igk2b4w0',
  baseUrl: '/current/sys-modeling/app/jspanel',
  // fdTemplateId: 'template_id_xxx',  // 分类表单时必传
  // target: 'self',                     // 打开方式
  // defaultTemplateData: '{}',          // 表单默认值
  callback: function(res) {
    console.log(res)
  }
})
```

#### edit — 编辑

```javascript
MKXFORM.executeOperation({
  code: 'edit',
  platform: 'pc'
}, {
  baseUrl: '/current/sys-modeling/app/jspanel',
  formId: '1jl8h9edlwrw6v03w1rcbmkp31a3igk2b4w0',
  docId: 'doc_xxx',
  // fdRightGroupId: 'xxx',
  // fdOpenMode: 'self',
})
```

#### delete — 删除

```javascript
MKXFORM.executeOperation({
  code: 'delete',
  platform: 'pc'
}, {
  formId: '1jl8h9edlwrw6v03w1rcbmkp31a3igk2b4w0',
  docId: 'doc_xxx',
  // appId: 'xxx',
  // appCode: 'xxx',
  // mainTable: true,
})
```

#### deleteAll — 批量删除

```javascript
MKXFORM.executeOperation({
  code: 'deleteAll',
  platform: 'pc'
}, {
  formId: '1jl8h9edlwrw6v03w1rcbmkp31a3igk2b4w0',
  selectedId: ['doc_id_1', 'doc_id_2'],
})
```

#### import — 导入

```javascript
MKXFORM.executeOperation({
  code: 'import',
  platform: 'pc'
}, {
  formId: '1jl8h9edlwrw6v03w1rcbmkp31a3igk2b4w0',
  // isSimple: false,
  // listviewId: 'xxx',
})
```

#### export — 导出

```javascript
MKXFORM.executeOperation({
  code: 'export',
  platform: 'pc'
}, {
  formId: '1jl8h9edlwrw6v03w1rcbmkp31a3igk2b4w0',
  dispatch: dispatch,
  $$contentviewProps: contentviewProps,
  // selectedId: [],
  // listviewId: 'xxx',
})
```

#### close — 关闭

```javascript
MKXFORM.executeOperation({
  code: 'close',
  platform: 'pc'
}, {
  $$contentviewProps: { history: history }
})
```

#### print — 打印

```javascript
MKXFORM.executeOperation({
  code: 'print',
  platform: 'pc'
}, {
  baseUrl: '/current/sys-modeling/app/jspanel',
  formId: '1jl8h9edlwrw6v03w1rcbmkp31a3igk2b4w0',
  docId: 'doc_xxx',
  // listviewId: 'xxx',
  // viewPageId: 'xxx',
})
```

#### batchPrint — 批量打印

```javascript
MKXFORM.executeOperation({
  code: 'batchPrint',
  platform: 'pc'
}, {
  baseUrl: '/current/sys-modeling/app/jspanel',
  formId: '1jl8h9edlwrw6v03w1rcbmkp31a3igk2b4w0',
  selectedId: ['doc_id_1', 'doc_id_2'],
  // selectedDocs: [{ fd_id: 'doc_id_1', fd_xform_id: 'form_id' }],
})
```

#### modalDefine — 对话框

```javascript
MKXFORM.executeOperation({
  code: 'modalDefine',
  name: '审批',
  id: 'opr_xxx',
  selected: true,
  platform: 'pc'
}, {
  formId: '1jl8h9edlwrw6v03w1rcbmkp31a3igk2b4w0',
  selectedId: ['doc_id_1'],
  refresh: function() { /* 刷新列表 */ }
})
```

#### other — 自定义操作

```javascript
MKXFORM.executeOperation({
  code: 'other',
  uniqueCode: 'my_operation',
  platform: 'pc'
}, {
  fdCode: 'template_xxx',
  fdOpenMode: 'self',
  callback: function(res) { console.log(res) },
  // selectedId: ['doc_id_1'],  // operation.selected=true 时必传
  // mechanisms: [],            // AI 场景使用
})
```

#### instanceClone — 复制新建

```javascript
MKXFORM.executeOperation({
  code: 'instanceClone',
  platform: 'pc'
}, {
  baseUrl: '/current/sys-modeling/app/jspanel',
  formId: '1jl8h9edlwrw6v03w1rcbmkp31a3igk2b4w0',
  docId: 'doc_xxx',
  // fdRightGroupId: 'xxx',
  // fdOpenMode: 'self',
  // defaultTemplateData: '{}',
})
```

---

### 5.13 `authOperation`

**描述：** 业务操作权限校验。用于在执行操作前校验用户是否有执行业务操作的权限，参数与 `executeOperation` 基本一致。

**签名：**
```typescript
authOperation(operation: OperationConfig, params: ParamsConfig, callback: (error: any, res: any) => void): Promise<any>
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `operation` | `object` | 操作按钮配置（同 `executeOperation` 的 operation 参数） |
| `params` | `object` | 参数配置（同 `executeOperation` 的 params 参数） |
| `callback` | `(error, res) => void` | 回调函数。参数 `error` 为错误信息；参数 `res` 为请求数据 |

**回调返回值：**
- 有权限：`error` 为 `null`，`res` 为 `true`
- 无权限：`error` 为错误信息

**注意事项：**
- 分类表单的 `add` 操作：如果传了 `fdCategoryModelCode`，则 `fdCategoryTemplateId` 必须有值，否则直接 reject
- 如果未传 `fdXFormId`，会通过 `fdCode` 调用接口获取表单 ID
- 如果未传 `operation.id`，会通过 `uniqueCode` 调用接口获取操作 ID

**使用示例：**
```javascript
MKXFORM.authOperation({
    code: 'add',
    uniqueCode: 'template_p20v4f',
    platform: 'pc'
  }, {
    fdType: 0,
    baseUrl: '/current/sys-modeling/app/jspanel',
    fdXFormId: '1jl8h9edlwrw6v03w1rcbmkp31a3igk2b4w0',
    fdCode: 'template_9vdhbck20tjaoq3ru62xg',
  }, function(error, res) {
    console.log(error, res) // 有权限返回: null true
  })
```

---

## 6. 主表函数（functions）

> 模块名：`function`，分组：`EApiGroup.all`

### 6.1 `$`

**描述：** 根据控件 ID 获取组件实例

**签名：**
```typescript
$(id: string): any | null
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 控件 ID |

**返回值：** 控件对象，未找到返回 `null`。

**实现细节：**
- 通过 `getConfig(id, MKXFORM)` 获取控件配置
- 调用 `$$form(MKXFORM)?.$(config.key)` 获取组件实例
- 若配置未找到则返回 `null`

**使用示例：**
```javascript
var control = MKXFORM.$('field_id')
if (control) {
  console.log('控件对象', control)
}
```

---

### 6.2 `setValue`

**描述：** 根据控件 ID 设置值

**签名：**
```typescript
setValue(id: string, value: any): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 控件 ID，可在数据模型中选中，格式 `[表ID.控件ID]` |
| `value` | `any` | 要设置的值。若传入 `undefined` 则自动转为 `null` |

**实现细节：**
- 调用 `$setValue({ form, value: { [id]: v } })` 设置表单值
- **明细表/业务内置字段特殊处理**（当 `id` 包含 `.` 时，如 `tableId.fieldId`）：
  - 创建内部对象 `tmpVal`，包含方法：`getKeyValue()`、`getValue()`、`getFullFdName()`、`getFdName()`、`getKey()`、`getTableType()`
  - 存储到 `MKXFORM.businessFieldsValue[id] = tmpVal`
  - 触发事件 `mk.emit(EXFromRuntimeDataChange.ExternalFieldsChange, tmpVal)`
  - 仅数据模型中存在的字段且 key 存在时才存储
- **不支持的控件类型：** 明细表、二维码、关联流程、按钮、多表头、文本说明、样例模板、多标签、自定义界面、内嵌页、审批、附件、视频、图片、附件类等

**使用示例：**
```javascript
// 设置普通字段
MKXFORM.setValue('field_id', '新值')

// 设置业务内置字段（会存储到 businessFieldsValue 并触发 ExternalFieldsChange）
MKXFORM.setValue('tableId.fieldId', '表格字段值')
```

---

### 6.3 `getValue`

**描述：** 根据控件 ID 获取值

**签名：**
```typescript
getValue(id: string): any
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 控件 ID |

**返回值：** 控件当前值。**附件类型特殊处理：** 当控件为 `@elem/xform-attach` 或 `@elem/xform-m-attach` 时，若结果为字符串则返回 `undefined`（表示空状态），否则返回数组格式。

**不支持的控件类型：** 前端计算、图片、附件、滑块、明细表、多表头、文本描述、模板、多标签页、业务关联、自定义页面、二维码、审批、关联流程、iframe、按钮。

**使用示例：**
```javascript
var value = MKXFORM.getValue('field_id')
console.log('当前值', value)
```

---

### 6.4 `setStyle`

**描述：** 根据控件 ID 设置样式

**签名：**
```typescript
setStyle(id: string, style: React.CSSProperties, type: 'label' | 'content'): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 控件 ID |
| `style` | `React.CSSProperties` | CSS 样式对象 |
| `type` | `'label' \| 'content'` | `label` = 设置标签样式（`labelStyle` 属性）；`content` = 设置内容区域样式（`controlValueStyle` 属性） |

**实现细节：**
- 通过 `getConfig(id, MKXFORM)` 获取控件配置
- `type='label'` 时调用 `$$form(MKXFORM).updateFormItemProps(config.key, { labelStyle: style })`
- `type='content'` 时调用 `$$form(MKXFORM).updateFormItemProps(config.key, { controlValueStyle: style })`
- `type` 无效时打印 `console.error` 错误日志

**使用示例：**
```javascript
// 设置标签样式（红色加粗）
MKXFORM.setStyle('field_id', { color: 'red', fontWeight: 'bold' }, 'label')

// 设置内容区域样式
MKXFORM.setStyle('field_id', { backgroundColor: '#f0f0f0' }, 'content')
```

---

### 6.5 `setProps`

**描述：** 根据控件 ID 设置属性

**签名：**
```typescript
setProps(id: string, props: Record<string, any>): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 控件 ID |
| `props` | `Record<string, any>` | 要设置的属性键值对，支持以下所有属性 |

**实现细节：**
- 通过 `getConfig(id, MKXFORM)` 获取控件配置
- 调用 `$$form(MKXFORM)?.updateFormItemProps(config.key, props)` 更新控件属性
- 支持设置任意控件属性，底层通过 FIBRE 架构合并到 `item.props`
- 若设置 `value` 属性，会通过 `item.props.onChange(value, 'code')` 触发表单机制修改，而非直接赋值
- 若设置 `onBlur` 事件，会特殊处理以避免覆盖内部 blur 逻辑
- 若设置 `labelProps` 嵌套对象，会同步更新控件标签属性
- 修改会同步到简易配置（`flatSimpleFormConfig`）中

**支持的属性清单：**

#### 控件属性 (Control Props)

| 属性名 | 类型 | 说明 |
|--------|------|------|
| `value` | `any` | 控件值（通过 onChange 机制触发更新） |
| `hidden` | `boolean` | 控件隐藏/显示 |
| `_hidden` | `boolean` | 内部隐藏标记 |
| `showStatus` | `'edit' \| 'readOnly' \| 'view' \| 'print'` | 控件状态（编辑/只读/查看/打印） |
| `disabled` | `boolean` | 禁用配置区表单项 |
| `parentHidden` | `boolean` | 父级控件隐藏状态通知子级 |
| `trace` | `any` | 追踪信息 |
| `traceData` | `any` | 追踪数据 |
| `dependenciesValue` | `object` | 依赖项的值 |
| `title` | `string` | 控件标题 |
| `controlValueStyle` | `CSSProperties` | 控件内容区域样式 |
| `updateTimer` | `string` | 触发 tab 子项重新渲染的标记 |
| `__force_update__` | `number` | 强制更新计数器 |

#### 标签属性 (Label Props) — 嵌套在 `labelProps` 对象内

| 属性名 | 类型 | 说明 |
|--------|------|------|
| `labelProps.hidden` | `boolean` | 标签隐藏/显示 |
| `labelProps.required` | `boolean` | 标签必填标记（红色星号） |
| `labelProps.labelStyle` | `CSSProperties` | 标签样式 |
| `labelProps.labelSuffix` | `ReactNode` | 标签后缀内容 |
| `labelProps.title` | `string` | 标签标题文本 |

#### 明细表属性 (Detail Table Props)

| 属性名 | 类型 | 说明 |
|--------|------|------|
| `hiddenNames` | `string[] \| undefined` | 指定隐藏的明细字段名列表 |
| `modifyNames` | `string[]` | 已修改的明细字段名列表 |
| `requireNames` | `Array<{name, required, tip}>` | 明细表字段必填规则 |
| `rowNumStyles` | `object` | 按行号设置明细控件样式 |
| `canDeleteRow` | `boolean` | 明细行是否可删除 |
| `canDeleteRowObj` | `{rowNum, canDeleteRow}` | 指定行号的可删除状态 |
| `rowValue` | `{rowNum, value}` | 明细表行数据联动更新 |
| `columns` | `array` | 明细表列定义配置 |

#### 布局属性 (Layout Props)

| 属性名 | 类型 | 说明 |
|--------|------|------|
| `spans` | `number[]` | 布局列宽分配数组（24 栅格） |
| `column` | `number` | 布局列数 |
| `columnSpan` | `number` | 列跨度 |
| `columns` | `array` | 列配置数组 |
| `layout` | `string` | 布局模式 |
| `desktopPaddingMode` | `'standard' \| ...` | 桌面端内边距模式 |

#### 校验属性 (Validation Props)

| 属性名 | 类型 | 说明 |
|--------|------|------|
| `errors` | `IError[]` | 校验错误信息列表 |
| `error` | `IError` | 单个校验错误 |
| `force` | `number` | 强制校验触发标记（通常传随机数） |

#### 样式属性 (Style Props)

| 属性名 | 类型 | 说明 |
|--------|------|------|
| `style` | `CSSProperties` | 控件样式对象 |
| `controlValueStyle` | `CSSProperties` | 控件值区域样式 |
| `rowNumStyles` | `object` | 明细表按行号样式 |
| `tabTitleStyle` | `CSSProperties` | Tab 标题样式 |
| `tabBarStyle` | `CSSProperties` | Tab 栏样式 |
| `controlTitleStyle` | `CSSProperties` | Steps/控件标题样式 |

#### Tab/Steps/Collapse 专用属性

| 属性名 | 类型 | 说明 |
|--------|------|------|
| `tabTitleStyle` | `CSSProperties` | Tab 标题样式 |
| `tabBarStyle` | `CSSProperties` | Tab 栏样式 |
| `controlTitleStyle` | `CSSProperties` | Steps 标题样式 |
| `visible` | `boolean` | Collapse 可见性 |

**使用示例：**
```javascript
// 设置普通属性
MKXFORM.setProps('field_id', { placeholder: '请输入', maxLength: 100, disabled: true })

// 设置标签属性
MKXFORM.setProps('field_id', {
  labelProps: {
    hidden: false,
    required: true,
    labelStyle: { color: 'red' }
  }
})

// 设置样式
MKXFORM.setProps('field_id', {
  style: { backgroundColor: '#f0f0f0' },
  controlValueStyle: { fontSize: '14px' }
})

// 设置布局
MKXFORM.setProps('field_id', { spans: [12, 12] })

// 设置明细表属性
MKXFORM.setProps('detailTable', {
  canDeleteRow: false,
  hiddenNames: ['internalField1', 'internalField2']
})
```
---

### 6.6 `getFieldAttr`

**描述：** 获取字段当前的只读/必填/隐藏等显示属性

**签名：**
```typescript
getFieldAttr(id: string): number
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 控件 ID |

**返回值：**

| 返回值 | 含义 | 判断逻辑 |
|--------|------|----------|
| `1` | 只读（readOnly） | `showStatus` 为只读 |
| `2` | 可编辑（editable） | 非只读且非必填 |
| `3` | 必填（required） | `validateRules` 存在必填规则或 `required/require` 为 true |
| `4` | 隐藏（hidden） | `showStatus` 为隐藏或 `labelProps.hidden` 为 true |

**实现细节：**
- 通过 `getConfig(id, MKXFORM)` 获取控件配置
- 检查优先级：隐藏 → 只读 → 必填 → 可编辑

**使用示例：**
```javascript
var attr = MKXFORM.getFieldAttr('field_id')
if (attr === 1) {
  console.log('该字段当前为只读')
} else if (attr === 3) {
  console.log('该字段当前为必填')
}
```

---

### 6.7 `setFieldAttr`

**描述：** 改变单个字段的显示属性（只读/必填/隐藏等）

**签名：**
```typescript
setFieldAttr(id: string, value: number): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 控件 ID |
| `value` | `number` | 属性值（见下表） |

**value 取值：**

| 值   | 含义    | 实现逻辑                                                                 |
| --- | ----- | -------------------------------------------------------------------- |
| `1` | 设为只读  | 设置 `showStatus` 为 readOnly。若 `extraAuth.required === false`，则覆盖校验为通过 |
| `2` | 设为可编辑 | 设置 `showStatus` 为 editable。通过 `view2edit` 辅助函数检查是否可从只读转为编辑           |
| `3` | 设为必填  | 先设为可编辑，再添加必填规则。兼容 `required` 和 `require` 两种属性名                       |
| `4` | 隐藏    | 隐藏字段标签及内容                                                            |
| `5` | 显示    | 取消隐藏，恢复字段可见性                                                         |
| `6` | 设为非必填 | 移除 `required` 和 `require` 标记，清除必填校验规则                                |
|     |       |                                                                      |

**实现细节：**
- 使用 `cloneDeep` 深拷贝规则对象，避免直接修改原始引用
- 所有更新通过 `$$form(MKXFORM).updateFormItemProps(config.key, { ... })` 应用
- 传入 `{ withoutValidate: true }` 标志，跳过额外校验
- `value` 不在 `[1,2,3,4,5,6]` 范围内时抛出异常
- `view2edit(showStatus, editable)` 辅助函数检查是否允许从只读转为编辑

**使用示例：**
```javascript
// 设为只读
MKXFORM.setFieldAttr('field_id', 1)

// 设为必填
MKXFORM.setFieldAttr('field_id', 3)

// 隐藏字段
MKXFORM.setFieldAttr('field_id', 4)

// 取消隐藏
MKXFORM.setFieldAttr('field_id', 5)

// 设为非必填
MKXFORM.setFieldAttr('field_id', 6)
```

---

### 6.8 `getValueText`

**描述：** 根据控件 ID 获取显示文本（而非原始值），如下拉框返回选项文本而非值

**签名：**
```typescript
getValueText(id: string): string
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 控件 ID |

**返回值：** 控件的显示文本字符串。

**实现细节：**
- 将 `id` 按 `.` 分割，取第二部分（`ids[1]`）作为控件名
- 通过 `$$controlRef(MKXFORM)?.[ids[1]]?.current?.getValueText(id)` 获取显示文本
- 若控件引用不存在则返回 `undefined`

**使用示例：**
```javascript
var displayText = MKXFORM.getValueText('field_id')
console.log('显示文本', displayText)  // 如下拉框显示 "选项一" 而非 "value1"
```

---

### 6.9 `getControlHtml`

**描述：** 获取控件带样式的 HTML 字符串

**签名：**
```typescript
getControlHtml(id: string): string
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 控件 ID |

**返回值：** 包含内联样式的 HTML 字符串。

**实现细节：**
1. 通过 `document.querySelector` 查找控件 DOM 节点（优先使用 `uuid`，降级使用 `currentId`）
2. 深拷贝 DOM 节点（`cloneNode(true)`）
3. 临时追加到 `document.body`
4. 调用 `formatHmtl(id)` 格式化：
   - 递归将计算样式转为内联样式（`inlineStyles`）
   - 特殊处理审批控件（`@elem/xform-review`）：移除展开/收起按钮、操作包裹、附件背景等
   - 清理附件额外信息节点
   - 将批注内容转为带对齐方式的 span 元素
5. 提取 `innerHTML`
6. 100ms 后移除克隆节点

**使用示例：**
```javascript
var html = MKXFORM.getControlHtml('field_id')
console.log('控件HTML', html)
```

---

## 7. 明细表函数（details）

> 模块名：`detail`，分组：`EApiGroup.all`
>
> 明细表函数中的 `id` 参数通常使用 `tableId.controlId` 格式表示明细表中的某个字段。

### 7.1 `getControlValue`

**描述：** 获取明细表指定行的指定控件值

**签名：**
```typescript
getControlValue(id: string, rowNum: number): any
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 字段 ID，格式为 `tableId.controlId`。按 `.` 分割，第一部分为明细表 ID |
| `rowNum` | `number` | 行号（从 0 开始） |

**实现细节：**
- 通过 `getKeyByName(id, MKXFORM)` 获取明细表 key
- 调用 `$$detailForms(MKXFORM)?.[key].current?.getCurrentValues()[rowNum][id]`
- 若明细表不存在或行号越界，返回 `undefined`

**使用示例：**
```javascript
var value = MKXFORM.getControlValue('detailTable.amount', 0)
console.log('第一行的金额', value)
```

---

### 7.2 `updateControl`

**描述：** 更新明细表指定行的指定控件值

**签名：**
```typescript
updateControl(id: string, rowNum: number, value: any): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 字段 ID，格式为 `tableId.controlId` |
| `rowNum` | `number` | 行号（从 0 开始） |
| `value` | `any` | 要设置的值 |

**实现细节：**
- **防抖批量更新机制：** 使用 `window['MXFORM_updateControl']` 作为缓存对象，100ms `setTimeout` 延迟执行
- 多次调用会累积到同一个更新批次中
- 执行时：克隆当前行数据 → 合并新值 → 调用 `detailRef.setTinyValues()` → 调用 `detailRef.updateValues()`
- 执行完成后 300ms 清空 `tinyValues` 缓存，并重置缓存对象
- 若 ID 信息缺失，打印 `console.error` 错误日志

**使用示例：**
```javascript
// 以下两次调用会合并为一个批量更新
MKXFORM.updateControl('detailTable.amount', 0, 1000)
MKXFORM.updateControl('detailTable.name', 0, '张三')
```

---

### 7.3 `updateControlStyle`

**描述：** 更新明细表指定行的指定控件样式

**签名：**
```typescript
updateControlStyle(id: string, rowNum: number, style: React.CSSProperties): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 字段 ID，格式为 `tableId.controlId` |
| `rowNum` | `number` | 行号（从 0 开始） |
| `style` | `React.CSSProperties` | CSS 样式对象 |

**实现细节：**
- **防抖批量更新机制：** 使用 `window['MXFORM_updateControlStyles']` 作为缓存对象，100ms `setTimeout` 延迟执行
- 调用 `$$form(MKXFORM)?.updateFormItemProps(config.key, { rowNumStyles: tables })` 应用样式
- 仅支持 PC 端
- 仅支持只读控件：单行文本、多行文本、日期、通讯录、金额、数字、单选、复选、下拉、多选、滑块、开关

**使用示例：**
```javascript
MKXFORM.updateControlStyle('detailTable.amount', 0, { color: 'red', fontWeight: 'bold' })
```

---

### 7.4 `addRow`

**描述：** 新增明细表行

**签名：**
```typescript
addRow(id: string, rowValue?: Record<string, any> | Record<string, any>[]): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 明细表 ID |
| `rowValue`（可选） | `object \| object[]` | 行数据。对象为单行，数组为多行。不传默认添加一行空行 `[{}]` |

**实现细节：**
- 通过 `getKeyByName(id, MKXFORM)` 获取明细表 key
- 获取当前值 `detailRef.getCurrentValues()`
- 若 `rowValue` 为数组，遍历 `push` 所有项
- 若 `rowValue` 为对象，`push` 单个对象
- 若未传 `rowValue`，默认添加 `[{}]`（一行空行）
- 最后调用 `detailRef.updateValues(newValues)`

**使用示例：**
```javascript
// 添加一行空行
MKXFORM.addRow('detailTable')

// 添加一行带数据
MKXFORM.addRow('detailTable', { name: '张三', amount: 100 })

// 批量添加多行
MKXFORM.addRow('detailTable', [
  { name: '张三', amount: 100 },
  { name: '李四', amount: 200 }
])
```

---

### 7.5 `updateRow`

**描述：** 更新明细表指定行数据

**签名：**
```typescript
updateRow(id: string, rowNum: number, rowValue: Record<string, any> | Record<string, any>[]): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 明细表 ID |
| `rowNum` | `number` | 起始行号（从 0 开始） |
| `rowValue` | `object \| object[]` | 若为对象则通过 `Object.assign` 合并到指定行；若为数组则从 `rowNum` 开始逐个替换多行 |

**实现细节：**
- `rowValue` 为数组时：从 `rowNum` 开始，用 `Object.assign` 逐个替换后续行
- `rowValue` 为对象时：用 `Object.assign(values[rowNum], rowValue)` 合并到指定行
- 最后调用 `detailRef.updateValues(values)`

**使用示例：**
```javascript
// 更新单行（合并属性）
MKXFORM.updateRow('detailTable', 0, { amount: 500 })

// 替换多行（从第 0 行开始替换为以下两行）
MKXFORM.updateRow('detailTable', 0, [
  { name: '王五', amount: 300 },
  { name: '赵六', amount: 400 }
])
```

---

### 7.6 `deleteRow`

**描述：** 删除明细表行

**签名：**
```typescript
deleteRow(id: string, rowNum?: number | number[] | ''): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 明细表 ID |
| `rowNum` | `number \| number[] \| ''`（可选） | 删除方式（见下表） |

**rowNum 取值：**

| 值 | 说明 | 实现逻辑 |
|----|------|----------|
| 省略 | 删除所有行 | 调用 `detailRef.deleteAll()` |
| `''` | 删除所有行 | 调用 `detailRef.deleteAll()` |
| `number` | 删除指定行号的一行 | 获取该行值，调用 `detailRef.deleteRow(values, deleteIds, deleteValues)` |
| `number[]` | 删除多个指定行号（如 `[0, 2, 4]`） | 遍历收集 `deleteIds` 和 `deleteValues`，调用 `detailRef.deleteRow()` |

**实现细节：**
- 删除时同时收集被删除行的 ID（`deleteIds`）和值（`deleteValues`）传给底层方法

**使用示例：**
```javascript
// 删除第 2 行
MKXFORM.deleteRow('detailTable', 1)

// 删除第 1、3、5 行
MKXFORM.deleteRow('detailTable', [0, 2, 4])

// 删除所有行
MKXFORM.deleteRow('detailTable')
MKXFORM.deleteRow('detailTable', '')
```

---

### 7.7 `getRowCount`

**描述：** 获取明细表总行数

**签名：**
```typescript
getRowCount(id: string): number
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 明细表 ID |

**返回值：** 明细表总行数。

**注意：** 不能在表单 `onLoad` 中调用（此时明细表可能尚未初始化）。

**实现细节：**
- 调用 `detailRef.getDataLength()`

**使用示例：**
```javascript
var count = MKXFORM.getRowCount('detailTable')
console.log('明细表共有 ' + count + ' 行')
```

---

### 7.8 `getSelectedRowIndex`

**描述：** 获取明细表选中行的下标数组

**签名：**
```typescript
getSelectedRowIndex(id: string): number[]
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 明细表 ID |

**返回值：** 选中行下标数组（如 `[0, 2, 5]`）。

**使用示例：**
```javascript
var selectedRows = MKXFORM.getSelectedRowIndex('detailTable')
console.log('选中行', selectedRows)
```

---

### 7.9 `checkDetailRow`

**描述：** 选中明细表指定行

**签名：**
```typescript
checkDetailRow(id: string, indexArr: number[]): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 明细表 ID |
| `indexArr` | `number[]` | 要选中的行号数组 |

**注意：** 不支持移动端。

**使用示例：**
```javascript
// 选中第 1、3 行
MKXFORM.checkDetailRow('detailTable', [0, 2])
```

---

### 7.10 `controlDetailRowCanDelete`

**描述：** 控制明细行是否可删除

**签名：**
```typescript
controlDetailRowCanDelete(id: string, canDeleteRow: boolean, rowNum?: number | number[]): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 明细表 ID |
| `canDeleteRow` | `boolean` | 是否允许删除 |
| `rowNum`（可选） | `number \| number[]` | 指定行号。省略则对整个明细表生效 |

**注意：** 仅支持 PC 端。

**使用示例：**
```javascript
// 禁用整个明细表的删除
MKXFORM.controlDetailRowCanDelete('detailTable', false)

// 仅禁用第 2 行的删除
MKXFORM.controlDetailRowCanDelete('detailTable', false, 1)

// 禁用第 1、3 行的删除
MKXFORM.controlDetailRowCanDelete('detailTable', false, [0, 2])

// 启用整个明细表的删除
MKXFORM.controlDetailRowCanDelete('detailTable', true)
```

---

### 7.11 `cacluColumnValue`

**描述：** 计算明细表某列的最大值、最小值和平均值

**签名：**
```typescript
cacluColumnValue(id: string): { max: number, min: number, average: number }
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 字段 ID，格式为 `tableId.controlId` |

**返回值：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `max` | `number` | 列最大值 |
| `min` | `number` | 列最小值 |
| `average` | `number` | 列平均值 |

**实现细节：**
- 通过 `getKeyByName(id, MKXFORM)` 获取明细表 key
- 调用 `detailRef.getCurrentValues()` 获取所有行数据
- 提取指定列的所有值，过滤空值后计算 `Math.max`、`Math.min` 和平均值
- 无数据或列不存在时打印 `console.error` 并返回 `{ max: 0, min: 0, average: 0 }`

**使用示例：**
```javascript
var result = MKXFORM.cacluColumnValue('detailTable.amount')
console.log('最大值', result.max)
console.log('最小值', result.min)
console.log('平均值', result.average)
```

---

### 7.12 `getPageControlValue`

**描述：** 获取当前分页中指定行的指定控件值

**签名：**
```typescript
getPageControlValue(id: string, rowNum: number): any
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 字段 ID，格式为 `tableId.controlId` |
| `rowNum` | `number` | 当前分页内的行号（从 0 开始） |

**注意：** 仅支持 PC 端。与 `getControlValue` 的区别在于使用 `getPageCurrentValues()` 而非 `getCurrentValues()`，仅获取当前分页的数据。

**使用示例：**
```javascript
var value = MKXFORM.getPageControlValue('detailTable.amount', 0)
```

---

### 7.13 `setDetailFieldAttr`

**描述：** 改变明细表单个字段列的显示属性（只读/必填/隐藏等）

**签名：**
```typescript
setDetailFieldAttr(id: string, value: number): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 字段 ID，格式为 `tableId.controlId` |
| `value` | `number` | 属性值（见下表） |

**value 取值：**

| 值 | 含义 |
|----|------|
| `1` | 设为只读 |
| `2` | 设为可编辑（遵循 view2edit 规则） |
| `3` | 设为必填 |
| `4` | 隐藏（标签和内容） |
| `5` | 显示（取消隐藏） |
| `6` | 设为非必填 |

**实现细节：**
- 使用 `cloneDeep` 深拷贝明细表字段的 `columns` 配置对象，避免直接修改原始引用
- 通过 `getKeyByName(id, MKXFORM)` 解析 ID，获取明细表 key 和字段名
- 在明细表的 `columns` 数组中查找目标列
- 通过 `$$form(MKXFORM).updateFormItemProps(key, { columns: newColumns })` 应用更新
- `value` 不在 `[1,2,3,4,5,6]` 范围内时抛出异常
- ID 格式无效（不含 `.`）时打印 `console.error` 并返回
- 使用与 `setFieldAttr` 相同的 `view2edit` 辅助函数检查是否可从只读转为编辑

**使用示例：**
```javascript
// 将明细表金额列设为只读
MKXFORM.setDetailFieldAttr('detailTable.amount', 1)

// 将明细表金额列设为必填
MKXFORM.setDetailFieldAttr('detailTable.amount', 3)
```

---

### 7.14 `setDetailRowAttr`

**描述：** 改变明细表指定行的显示属性

**签名：**
```typescript
setDetailRowAttr(id: string, value: number, rowNum: number, fieldId?: string): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 明细表 ID |
| `value` | `number` | 属性值（1~6，同 `setFieldAttr`） |
| `rowNum` | `number` | 行号（从 0 开始） |
| `fieldId`（可选） | `string` | 指定字段 ID。省略则对整行生效 |

**value 取值：** 同 `setFieldAttr`（1=只读, 2=可编辑, 3=必填, 4=隐藏, 5=显示, 6=非必填）

**实现细节：**
- 委托给 `detailRef?.setRowAttr(value, rowNum, fieldId)` 执行
- `value` 不在 1~6 范围内时抛出异常
- `rowNum` 无效时打印 `console.error` 并返回

**使用示例：**
```javascript
// 第 2 行整行设为只读
MKXFORM.setDetailRowAttr('detailTable', 1, 1)

// 第 2 行的金额列设为必填
MKXFORM.setDetailRowAttr('detailTable', 3, 1, 'amount')
```

---

### 7.15 `setDetailFieldItemAttr`

**描述：** 改变明细表指定行指定字段的显示属性

**签名：**
```typescript
setDetailFieldItemAttr(id: string, value: number, rowKey: number, fieldId?: string): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 明细表 ID |
| `value` | `number` | 属性值（1~6） |
| `rowKey` | `number` | 行 key |
| `fieldId`（可选） | `string` | 字段 ID。省略则对整行生效 |

**value 取值：** 同 `setFieldAttr`（1~6）。

**实现细节：**
- 使用 `getKeyByName` 而非 `getConfig` 来获取明细表 key
- 委托给 `detailRef.setRowAttr(value, rowKey, fieldId)` 执行
- 与 `setDetailRowAttr` 的区别在于使用 `rowKey`（行的唯一 key）而非 `rowNum`（行号）

**使用示例：**
```javascript
// 第 2 行金额列设为只读
MKXFORM.setDetailFieldItemAttr('detailTable', 1, 1, 'amount')

// 第 2 行整行设为必填
MKXFORM.setDetailFieldItemAttr('detailTable', 3, 1)
```

---

### 7.16 `reload`

**描述：** 重新加载明细表数据

**签名：**
```typescript
reload(id: string): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 明细表 ID |

**注意：** 不支持移动端。

**实现细节：**
- 直接委托给 `detailRef?.reload()` 执行

**使用示例：**
```javascript
MKXFORM.reload('detailTable')
```

---

### 7.17 `disabledOperation`

**描述：** 禁用明细表操作按钮

**签名：**
```typescript
disabledOperation(id: string, limitList: Array<string> | boolean, rowNum?: number): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 明细表 ID |
| `limitList` | `Array<string> \| boolean` | 要禁用的操作名数组，或 `false` 禁用所有 |
| `rowNum`（可选） | `number` | 指定行号。省略则对整个明细表生效 |

**可禁用的操作名：**

| 操作名 | 说明 |
|--------|------|
| `'edit'` | 编辑 |
| `'insert'` | 插入行 |
| `'addNest'` | 添加子表行 |
| `'copy'` | 复制行 |
| `'delete'` | 删除行 |
| `'viewDetail'` | 查看详情 |
| `'isTrace'` | 追踪 |

**实现细节：**
- `limitList` 可为数组 `['edit','insert','addNest','copy','delete','viewDetail','isTrace']` 指定禁用操作，或传 `false` 禁用所有操作
- 委托给 `detailRef.disabledOperation(limitList, rowNum)` 执行

**注意：** 不支持移动端。

**使用示例：**
```javascript
// 禁用所有操作
MKXFORM.disabledOperation('detailTable', false)

// 禁用新增和删除
MKXFORM.disabledOperation('detailTable', ['insert', 'delete'])

// 仅禁用第 2 行的删除
MKXFORM.disabledOperation('detailTable', ['delete'], 1)
```

---

## 8. 事件（events）

> 模块名：`event`，分组：`EApiGroup.xhtml`

### 8.1 `onChange`

**描述：** 根据控件 ID 监听值变化事件

**签名：**
```typescript
onChange(id: string, change: (value: any, extValue: any) => void): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 控件 ID |
| `change` | `(value, extValue) => void` | 值变化回调函数 |

**回调参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `value` | `any` | 新值 |
| `extValue` | `any` | 扩展值。明细表时为 `tinyValues`（单元格变更集合） |

**实现细节：**
- 对于明细表类型的控件，回调中会获取 `tinyValues`（单元格级别的变更数据），若 `tinyValues` 为空则跳过回调
- `extValue` 仅在明细表场景下有值，包含 `tinyValues` 对象
- 内置 `withdraw()` 存根方法，用于移除已注册的监听器

**使用示例：**
```javascript
// 监听字段值变化
MKXFORM.onChange('field_id', function(value, extValue) {
  console.log('新值', value)
  console.log('扩展值', extValue)
})

// 监听明细表变化
MKXFORM.onChange('detailTable', function(value, extValue) {
  console.log('明细表值变化', value)
  console.log('单元格变更', extValue)  // tinyValues 对象
})
```

---

### 8.2 `beforeSubmit`

**描述：** 注册表单提交前的拦截函数

**签名：**
```typescript
beforeSubmit(fn: Function, message?: string): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `fn` | `Function` | 拦截函数，返回 `true` 表示通过，返回 `false` 表示阻止提交 |
| `message`（可选） | `string` | 阻止提交时的错误提示信息 |

**使用示例：**
```javascript
// 提交前校验金额必须大于 0
MKXFORM.beforeSubmit(function() {
  var amount = MKXFORM.getValue('amount')
  if (amount <= 0) {
    return false  // 阻止提交
  }
  return true  // 允许提交
}, '金额必须大于0')
```

**实现细节：**
- 将 `[fn, message]` 推入 `MKXFORM['MKXFORM_DATA_CONTAINER'].$$beforeSubmit` 数组
- 执行时通过 `executeIntercepts` 以 `Promise.all` 并行执行所有拦截函数
- 拦截函数返回 `undefined` 时视为 `true`（允许通过）
- 所有拦截执行完毕后有 500ms 延迟再 resolve
- 内置 `withdraw()` 方法，用于清除所有已注册的 beforeSubmit 处理器

---

### 8.3 `afterSubmit`

**描述：** 注册表单提交成功后的回调函数

**签名：**
```typescript
afterSubmit(fn: Function, message?: string): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `fn` | `Function` | 提交成功后执行的函数 |
| `message`（可选） | `string` | 提示信息 |

**使用示例：**
```javascript
MKXFORM.afterSubmit(function() {
  console.log('表单已成功提交')
  MKXFORM.message.success('提交成功')
})
```

**实现细节：**
- 与 `beforeSubmit` 类似，将 `[fn, message]` 推入 `MKXFORM['MKXFORM_DATA_CONTAINER'].$$afterSubmit` 数组
- 执行时通过 `executeInterceptsAfterSubmit` 以 `Promise.all` 并行执行
- 与 `beforeSubmit` 的区别：无 500ms 延迟，立即 resolve

---

## 9. 流程函数（lbpms）

### 9.1 同步流程函数（fixLbpms）

> 模块名：`lbpm`，同步注册

#### 9.1.1 `getLbpmFormValues`

**描述：** 获取审批提交信息

**签名：**
```typescript
getLbpmFormValues(): Promise<any>
```

**返回值：** Promise，resolve 时返回审批表单数据。

**实现细节：**
- 注意：此方法会触发流程的校验
- 委托给 `$$lbpm(MKXFORM)?.getLbpmFormValues()` 执行

**使用示例：**
```javascript
MKXFORM.getLbpmFormValues().then(function(data) {
  console.log('审批信息', data)
})
```

---

#### 9.1.2 `getOperationParameter`

**描述：** 获取审批当前操作的配置信息

**签名：**
```typescript
getOperationParameter(): any
```

**返回值：** 当前审批操作的配置对象。

**实现细节：**
- 委托给 `$$lbpm(MKXFORM)?.getOperationParameter()` 执行

**使用示例：**
```javascript
var param = MKXFORM.getOperationParameter()
console.log('操作配置', param)
```

---

#### 9.1.3 `getIdentity`

**描述：** 获取当前处理人的身份信息列表

**签名：**
```typescript
getIdentity(): any
```

**返回值：** 当前处理人身份信息。

**实现细节：**
- 委托给 `$$lbpm(MKXFORM)?.getIdentity()` 执行

**使用示例：**
```javascript
var identity = MKXFORM.getIdentity()
console.log('当前身份', identity)
```

---

#### 9.1.4 `getProcessInstanceId`

**描述：** 获取当前流程实例 ID

**签名：**
```typescript
// 只读属性
MKXFORM.processInstanceId  // 等价于 MKXFORM.getProcessInstanceId
```

**使用示例：**
```javascript
var pid = MKXFORM.processInstanceId
console.log('流程实例ID', pid)
```

---

#### 9.1.5 `获取流程当前节点编号`

**描述：** 调用流程平台接口获取流程当前节点编号，返回以';'分隔的节点编号

代码（可直接复制）：

```javascript
/**
 * 获取流程当前节点编号
 * 回调函数 callback
* 1. 参数error，当请求出错是会返回错误信息
* 2. 参数res，请求数据
* {"type":"string"}
 */
function getCurrentNodesNumber() {
  var formid = MKXFORM.formId
  var instanceId = MKXFORM.processInstanceId
  MKXFORM.callLbpm({
    functionCode: "getCurrentNodesNumber",
    param: { "formInstanceId": formid, "processInstanceId": instanceId }
  }, function (error, res) {
    console.log('当前流程节点编号为：',res)
  })
}
```

### 9.2 异步流程函数（lbpms）

> 仅在 `initDesign` 中异步注册，API 名称格式为 `promise_<name>`，数量取决于后端返回。

动态注册的流程函数通过 `callLbpm` 调用，命名格式：`promise_{functionName}`。

**使用示例：**
```javascript
// 具体函数名取决于后端配置
MKXFORM.promise_getNextApprover({ param: {} }, function(error, res) {
  console.log(res)
})
```

---

## 10. 集成平台（integrate）

> 仅在 `initDesign` 中异步注册，分组名：`promise`

集成平台接口从后端动态获取，命名格式为 `promise_{systemName}`，每个系统下有子接口 `tic_{interfaceCode}`。

**使用示例：**
```javascript
// 调用指定系统的接口
MKXFORM.promise_systemName({ interfaceCode: 'CODE_001', param: {} }, function(error, res) {
  console.log(res)
})
```

---

## 11. 组织架构（orgFunctions）

> 仅在 `initDesign` 中异步注册，分组名：`org_promise`

组织架构函数从后端动态获取，命名格式为 `org_{description}`。后端 API 位于 `/data/sys-org/sysOrgJsFormula/*`。

**实现细节：**
- 调用 `api.getJsFormulaList()` 获取组织架构函数列表
- 生成 `org_{description}` 格式的 API 名称
- 通过 `callOrg` 发起请求，内部调用 `OrgHttp.post('/sysOrgJsFormula/{path}', param)` 执行

### 11.1 调用方式

**签名：**
```typescript
callOrg(config: { id: string, param?: any }, callback: (error: any, res: any) => void): Promise<void>
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `config.id` | `string` | 组织函数 ID，格式为 `sysorg.xxx`（如 `sysorg.getCurUserInfo`、`sysorg.getThisDepartment`） |
| `config.param` | `any`（可选） | 函数参数 |

### 11.2 常用组织架构函数

以下为后端提供的常用函数（通过 `jsFormulaList` 接口动态获取）：

| 函数 ID                                         | 函数名称        | 说明            | 参数示例                                                                                                             |
| --------------------------------------------- | ----------- | ------------- | ---------------------------------------------------------------------------------------------------------------- |
| `sysorg.getCurUserInfo`                       | 获取当前用户      | 获取当前登录用户信息    | `{}`                                                                                                             |
| `sysorg.getElementDatas`                      | 查找人员和岗位     | 根据地址查找组织      | `{ address: [{fdId: 'xxx', fdName: 'xxx', fdOrgType: 8}] }`                                                      |
| `sysorg.getPersonByLoginName`                 | 根据登录名查找人员   | 通过登录名获取人员     | `{ loginName: 'zhangsan' }`                                                                                      |
| `sysorg.getPersonByPersonId`                  | 根据用户ID查找人员  | 通过人员ID获取信息    | `{ fdPersonId: 'xxx' }`                                                                                          |
| `sysorg.getThisDepartment`                    | 查找所属部门      | 获取当前人员主部门     | `{ address: [{fdId: 'xxx', fdName: 'xxx', fdOrgType: 8}] }`                                                      |
| `sysorg.getDepartmentAllPath`                 | 获取部门全路径     | 获取部门完整层级路径    | `{ addressObject: {fdId: 'xxx'} }`                                                                               |
| `sysorg.getDepartmentByLevel`                 | 查找第X级部门     | 获取第N级部门       | `{ addressObject: {fdId: 'xxx'}, level: 2 }`                                                                     |
| `sysorg.getOrganization`                      | 查找所属机构      | 获取上级机构        | `{ address: [{fdId: 'xxx', fdName: 'xxx', fdOrgType: 8}] }`                                                      |
| `sysorg.getDepartmentHead`                    | 查找部门领导      | 获取部门负责人       | `{ address: [{fdId: 'xxx', fdName: 'xxx', fdOrgType: 2}] }`                                                      |
| `sysorg.getSuperiorDepartmenthead`            | 查找上级部门领导    | 获取上级部门负责人     | `{ address: [{fdId: 'xxx', fdName: 'xxx', fdOrgType: 8}], condition: true }`                                     |
| `sysorg.getDepartmentLeaderByLevel`           | 获取第X级部门领导   | 获取第N级部门领导     | `{ addressObject: {fdId: 'xxx'}, level: 1 }`                                                                     |
| `sysorg.getDepartmentLeadersByLevel`          | 递归查找多级部门领导  | 获取多级部门领导      | `{ addressObject: {fdId: 'xxx'}, level: 3 }`                                                                     |
| `sysorg.isDepartmentLeaderMyself`             | 是否本部门领导     | 判断是否为本部门领导    | `{ address: [{fdId: 'xxx', fdName: 'xxx', fdOrgType: 2}] }`                                                      |
| `sysorg.isDepartmentLeaderForPerson`          | 是否部门领导      | 判断指定人员是否为部门领导 | `{ address: [{fdId: 'xxx', fdName: 'xxx', fdOrgType: 8}], organizations: [...] }`                                |
| `sysorg.getOrgHead`                           | 查找机构领导      | 获取机构负责人       | `{ address: [{fdId: 'xxx', fdName: 'xxx', fdOrgType: 1}] }`                                                      |
| `sysorg.isRoleMember`                         | 岗位判断函数      | 判断是否属于某岗位     | `{ orgPost: {fdId: 'xxx', fdName: 'xxx', fdOrgType: 4}, address: [{fdId: 'xxx', fdName: 'xxx', fdOrgType: 8}] }` |
| `sysorg.getDepartmentSuperLeaderByLevel`      | 查找部门上级领导    | 获取部门上级领导      | `{ organizations: [{fdId: 'xxx', fdName: 'xxx', fdOrgType: 8}], level: 2 }`                                      |
| `sysorg.isMember`                             | 成员判定函数      | 判断是否属于某组织     | `{ parent: {fdId: 'xxx', fdName: 'xxx', fdOrgType: 2}, address: [{fdId: 'xxx', fdName: 'xxx', fdOrgType: 8}] }`  |
| `sysorg.isContainsLabel`                      | 组织包含标签函数    | 判断组织是否包含标签    | `{ org: {fdId: 'xxx', fdName: 'xxx', fdOrgType: 2}, orgLabel: '标签名' }`                                           |
| `sysorg.isUserContainsAnyLabel`               | 当前用户包含任一标签  | 判断当前用户是否有某标签  | `{ orgLabels: ['标签1', '标签2'] }`                                                                                  |
| `sysorg.getOrgAttributeVal`                   | 查找组织属性      | 获取组织属性值       | `{ addressObject: {fdId: 'xxx'}, orgType: 2, strOrgAttribute: 'attrName' }`                                      |
| `sysorg.checkDeptIsMain`                      | 主部门判断函数     | 判断是否为主部门      | `{ person: {fdId: 'xxx', fdName: 'xxx', fdOrgType: 8}, dept: {fdId: 'xxx', fdName: 'xxx', fdOrgType: 2} }`       |
| `sysorg.findUserAuxiliaryDept`                | 查找用户辅部门     | 获取用户辅助部门列表    | `{ addressObject: {fdId: 'xxx'} }`                                                                               |
| `sysorg.getElementByNo`                       | 根据组织编码查找组织  | 通过编码获取组织      | `{ fdNo: 'ORG001', orgType: 2 }`                                                                                 |
| `sysorg.getPersonAndPostByGroup`              | 查找群组下的人员/岗位 | 获取群组成员        | `{ group: {fdId: 'xxx', fdName: 'xxx', fdOrgType: 16}, isCross: false }`                                         |
| `sysorg.isOrganizationBelongOrIncludeAnother` | 组织包含/属于判断   | 判断组织关系        | `{ firstOrgs: [...], secondOrgs: [...], relationType: 1, isCross: false }`                                       |
| `sysorg.findUpXLevelLeader`                   | 向上查找X级部门领导  | 获取第N级上级领导     | `{ addressObject: {fdId: 'xxx'}, level: 2, isCross: false }`                                                     |
| `sysorg.queryDeptPersons`                     | 查找部门下人员     | 获取部门下所有人员     | `{ addressObject: {fdId: 'xxx'}, isIncludeChild: true }`                                                         |
| `sysorg.getPersonsByPost`                     | 根据岗位查找人员    | 获取岗位下所有人员     | `{ address: [{fdId: 'xxx', fdName: 'xxx', fdOrgType: 4}] }`                                                      |
| `sysorg.getPostOrPostPersonsByPostName`       | 根据岗位名称查找    | 通过岗位名获取人员     | `{ postNameObj: {fdName: '总经理'}, orgType: 4 }`                                                                   |
| `sysorg.getCurIdentityInfo`                   | 获取当前身份      | 获取当前用户身份信息    | `{}`                                                                                                             |
| `sysorg.expandByGroup`                        | 查找群组下全部成员   | 获取群组完整成员列表    | `{ group: {fdId: 'xxx', fdName: 'xxx', fdOrgType: 16} }`                                                         |

### 11.3 参数详解

#### 11.3.1 参数对象结构

**DefaultOrganization（组织对象）：**
```typescript
interface DefaultOrganization {
  fdId: string          // 组织ID
  fdName: string       // 组织名称
  fdOrgType: number    // 组织类型：1-机构, 2-部门, 4-岗位, 8-人员, 16-群组, 128-公共岗位, 256-身份
  fdNo?: string        // 组织编码（可选）
  fdOriId?: string     // 原始ID（可选）
  fdIsAvailable?: boolean  // 是否有效（可选）
}
```

#### 11.3.2 参数字段说明

| 参数名               | 类型                      | 说明         | 常用值                                               |
| ----------------- | ----------------------- | ---------- | ------------------------------------------------- |
| `address`         | `DefaultOrganization[]` | 地址本数据，组织数组 | `[ {fdId: 'xxx', fdName: '张三', fdOrgType: 8} ]`   |
| `addressObject`   | `{fdId: string}`        | 简化的地址对象    | `{ fdId: 'deptId_xxx' }`                          |
| `organizations`   | `DefaultOrganization[]` | 组织数组，多个组织  | `[ {...}, {...} ]`                                |
| `org`             | `DefaultOrganization`   | 单个组织       | `{fdId: 'xxx', fdName: 'xxx', fdOrgType: 2}`      |
| `parent`          | `DefaultOrganization`   | 父级组织       | 同上                                                |
| `group`           | `DefaultOrganization`   | 群组         | 同上                                                |
| `person`          | `DefaultOrganization`   | 人员         | 同上                                                |
| `dept`            | `DefaultOrganization`   | 部门         | 同上                                                |
| `orgPost`         | `DefaultOrganization`   | 岗位         | 同上                                                |
| `loginName`       | `string`                | 登录名        | `'zhangsan'`                                      |
| `fdPersonId`      | `string`                | 人员ID       | `'person_xxx'`                                    |
| `fdNo`            | `string`                | 组织编码       | `'ORG001'`                                        |
| `orgType`         | `number`                | 组织类型       | `1-机构, 2-部门, 4-岗位, 8-人员, 16-群组, 128-公共岗位, 256-身份` |
| `level`           | `number`                | 层级数字       | `0-根组织, 1-一级部门, 2-二级部门...`                        |
| `condition`       | `boolean`               | 条件开关       | `true-继续向上查找, false-不继续`                          |
| `isCross`         | `boolean`               | 是否跨组织      | `true/false`                                      |
| `isIncludeChild`  | `boolean`               | 是否包含下级     | `true-包含, false-仅本级`                              |
| `orgLabel`        | `string`                | 组织标签名称     | `'标签名'`                                           |
| `orgLabels`       | `string[]`              | 组织标签名称数组   | `['标签1', '标签2']`                                  |
| `strOrgAttribute` | `string`                | 组织属性名      | `'属性字段名'`                                         |
| `postNameObj`     | `{fdName: string}`      | 岗位名称对象     | `{fdName: '总经理'}`                                 |
| `relationType`    | `number`                | 关系类型       | `1-包含所有, 2-包含任意, 3-所有属于, 4-属于任意`                  |
| `strList`         | `string[]`              | ID字符串列表    | `['id1', 'id2']`                                  |
| `orgList`         | `DefaultOrganization[]` | 组织列表       | 同 address                                         |

#### 11.3.3 常用调用场景参数示例

**场景1：根据人员获取所属部门**
```javascript
// address 使用人员对象
MKXFORM.callOrg({
  id: 'sysorg.getThisDepartment',
  param: {
    address: [
      { fdId: 'person_123', fdName: '张三', fdOrgType: 8 }
    ]
  }
}, callback)
```

**场景2：获取部门领导**
```javascript
// address 使用部门对象
MKXFORM.callOrg({
  id: 'sysorg.getDepartmentHead',
  param: {
    address: [
      { fdId: 'dept_456', fdName: '研发部', fdOrgType: 2 }
    ]
  }
}, callback)
```

**场景3：获取第N级部门领导**
```javascript
// addressObject 使用简化对象
MKXFORM.callOrg({
  id: 'sysorg.getDepartmentLeaderByLevel',
  param: {
    addressObject: { fdId: 'dept_456' },
    level: 1  // 0-根组织, 1-一级部门, 2-二级部门...
  }
}, callback)
```

**场景4：查找上级部门领导（是否继续向上）**
```javascript
MKXFORM.callOrg({
  id: 'sysorg.getSuperiorDepartmenthead',
  param: {
    address: [{ fdId: 'person_123', fdName: '张三', fdOrgType: 8 }],
    condition: true  // true-领导为空时继续向上查找, false-不再向上
  }
}, callback)
```

**场景5：判断是否属于某岗位**
```javascript
MKXFORM.callOrg({
  id: 'sysorg.isRoleMember',
  param: {
    orgPost: { fdId: 'post_789', fdName: '总经理', fdOrgType: 4 },
    address: [{ fdId: 'person_123', fdName: '张三', fdOrgType: 8 }]
  }
}, callback)
```

**场景6：根据岗位名称查找人员**
```javascript
MKXFORM.callOrg({
  id: 'sysorg.getPostOrPostPersonsByPostName',
  param: {
    postNameObj: { fdName: '总经理' },
    orgType: 4  // 可选，指定组织类型
  }
}, callback)
```

**场景7：获取部门下所有人员（含下级）**
```javascript
MKXFORM.callOrg({
  id: 'sysorg.queryDeptPersons',
  param: {
    addressObject: { fdId: 'dept_456' },
    isIncludeChild: true  // true-包含子部门人员, false-仅本部门
  }
}, callback)
```

**场景8：查找群组下全部成员**
```javascript
MKXFORM.callOrg({
  id: 'sysorg.expandByGroup',
  param: {
    group: { fdId: 'group_111', fdName: '项目组A', fdOrgType: 16 }
  }
}, callback)
```

**场景9：根据组织编码查找**
```javascript
MKXFORM.callOrg({
  id: 'sysorg.getElementByNo',
  param: {
    fdNo: 'DEPT001',  // 组织编码
    orgType: 2  // 可选，1-机构 2-部门 4-岗位 8-人员 16-群组
  }
}, callback)
```

### 11.4 使用示例

```javascript
// 获取当前用户信息
MKXFORM.callOrg({ id: 'sysorg.getCurUserInfo', param: {} }, function(error, res) {
  console.log('当前用户', res)  // { fdId, fdName, fdOrgType, fdLoginName }
})

// 查找所属部门（address 使用人员数组）
MKXFORM.callOrg({ 
  id: 'sysorg.getThisDepartment', 
  param: { 
    address: [{ fdId: 'person_123', fdName: '张三', fdOrgType: 8 }] 
  } 
}, function(error, res) {
  console.log('所属部门', res)
})

// 查找部门领导（address 使用部门数组）
MKXFORM.callOrg({ 
  id: 'sysorg.getDepartmentHead', 
  param: { 
    address: [{ fdId: 'dept_456', fdName: '研发部', fdOrgType: 2 }] 
  } 
}, function(error, res) {
  console.log('部门领导', res)
})

// 获取部门全路径
MKXFORM.callOrg({ id: 'sysorg.getDepartmentAllPath', param: { addressObject: { fdId: 'dept_456' } } }, function(error, res) {
  console.log('部门全路径', res)
})

// 判断是否为本部门领导
MKXFORM.callOrg({ 
  id: 'sysorg.isDepartmentLeaderMyself', 
  param: { 
    address: [{ fdId: 'dept_456', fdName: '研发部', fdOrgType: 2 }] 
  } 
}, function(error, res) {
  console.log('是否部门领导', res)  // true/false
})

// 获取第2级部门领导
MKXFORM.callOrg({ id: 'sysorg.getDepartmentLeaderByLevel', param: { addressObject: { fdId: 'dept_456' }, level: 2 } }, function(error, res) {
  console.log('第2级部门领导', res)
})
```

### 11.5 返回值结构

不同函数返回不同结构，常见结构示例：

```javascript
// 人员对象
{
  fdId: '人员ID',
  fdName: '人员名称',
  fdOrgType: 8,  // 人员类型
  fdLoginName: '登录名'
}

// 部门对象
{
  fdId: '部门ID',
  fdName: '部门名称',
  fdHierarchyId: '层级ID',
  fdParentId: '上级部门ID'
}

// 机构对象
{
  fdId: '机构ID',
  fdName: '机构名称',
  fdOrgType: 1  // 机构类型
}

// 部门全路径
'集团_子公司_部门'
```

---

## 12. 动作流（flow）

> 仅在 `initDesign` 中异步注册，分组名：`flow`

动作流函数从后端动态获取，命名格式为 `flow_{fdCode}`。数量可能为 0。

**使用示例：**
```javascript
MKXFORM.flow_APPROVE({
  context: {},
  fdProcessId: 'process_001',
  incParams: {},
  fdProcessCode: 'FLOW_CODE'
}, function(error, res, context) {
  console.log(res)
})
```

---

## 13. LanBots AI（lanbots）

> 仅在 `initDesign` 中异步注册，分组名：`lanbots`

LanBots AI 函数从后端动态获取，命名格式为 `lanbotsPromises_{categoryValue}`，子接口为 `lanbots_{fdId}`。

**使用示例：**
```javascript
MKXFORM.callLanBots({ fdCode: 'CAT_001', id: 'BOT_001', lanBotsType: 'quickRead' }, function(error, res) {
  console.log(res)
})
```

---

## 14. 全局环境变量（GLOBALJS）

> 仅在 `formAttr.controlAction` 存在时通过 `registerGlobalEnvToWindow` 注册

当表单配置了 `controlAction.$$env.data` 时，会自动注册到 `MKXFORM.GLOBALJS` 对象中。

- **变量：** `MKXFORM.GLOBALJS[varName]` — 注册为只读变量
- **函数：** `MKXFORM.GLOBALJS[fnName](...args)` — 注册为函数，自动注入 MKXFORM 作为最后一个参数

**使用示例：**
```javascript
// 使用全局环境变量
var config = MKXFORM.GLOBALJS.someConfig

// 调用全局环境函数
MKXFORM.GLOBALJS.someFunction('arg1', 'arg2')
```

---

## 15. 注册顺序与生命周期

### initRuntime（同步注册）

```
1. 设置直接属性（MKXFORM_DATA_CONTAINER、viewStatus、docStatus 等）
2. inner      → callTic, callLbpm, callOrg, callFlow, callLanBots
3. vars       → mkXform, viewStatus, docStatus, platform, formId
4. global     → ajax, getLocale, validateFields, getFormConfigs, getFormValues,
                message, toast, modal, mobileModal, tableModal, HTMLModal,
                executeOperation, authOperation
5. function   → $, setValue, getValue, setStyle, setProps,
                getFieldAttr, setFieldAttr, getValueText, getControlHtml
6. detail     → getControlValue, updateControl, updateControlStyle,
                addRow, updateRow, deleteRow, getRowCount,
                getSelectedRowIndex, checkDetailRow, controlDetailRowCanDelete,
                cacluColumnValue, getPageControlValue,
                setDetailFieldAttr, setDetailRowAttr, setDetailFieldItemAttr,
                reload, disabledOperation
7. event      → onChange, beforeSubmit, afterSubmit
8. fixLbpms   → getLbpmFormValues, getOperationParameter, getIdentity, getProcessInstanceId
9. fixLbpms   → （重复注册，疑似 bug）
10. [条件] registerGlobalEnvToWindow → GLOBALJS
```

### initDesign（异步注册）

```
window.MKXFORM = MKXFORM  ← 挂载到全局
Promise.all([
  integrate()     → promise_{systemName} / tic_{interfaceCode}
  lbpms()         → promise_{name} / getIdentity / getLbpmFormValues / getOperationParameter
  orgFunctions()  → org_{description}
  flow(props)     → flow_{fdCode}
  lanbots()       → lanbotsPromises_{value} / lanbots_{fdId}
])
```

---

文档错误纠正？联系：hexb@landray.com.cn