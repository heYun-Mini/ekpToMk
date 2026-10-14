# 术语表（Glossary）

> 本项目涉及蓝凌 EKP 与 MK-PaaS 两套平台，术语众多。本表统一约定，避免歧义。

---

## 平台与系统

| 术语 | 全称/含义 |
|---|---|
| **EKP** | 蓝凌 Knowledge Management System，传统 SpringMVC 单体架构的 OA/知识管理平台 |
| **MK / MK-PaaS** | 蓝凌新一代低代码平台，微服务架构 + React 前端 |
| **KMSS** | EKP 的核心代码库名称（`src/com/landray/kmss`） |
| **Lcode** | MK 平台的在线开发环境 |

---

## 表单相关

| 术语 | 含义 |
|---|---|
| **低代码表单** | 通过设计器拖拽搭建的表单，非手写 HTML |
| **xform** | EKP 的表单引擎名称，相关 API 以 `XForm` 开头 |
| **MKXFORM** | MK 的表单运行时全局 API 对象，挂载在 `window.MKXFORM` |
| **MKXFORMFACTORY** | MKXFORM 的工厂对象，提供 `initRuntime` / `initDesign` |
| **主表 (standardTable)** | 表单的主容器，通常一个表单只有一个 |
| **子表 / 明细表 (detailsTable)** | 类似 Excel 的多行表格，可多个 |
| **JSP 片段** | EKP 表单中嵌入的 JSP 代码块，常用于插入自定义 JS |
| **JS 面板** | MK 表单设计器中编写自定义 JS 的面板 |

---

## 控件相关

| 术语 | 含义 |
|---|---|
| **fd_type** | EKP 控件类型标识（如 `inputText`、`select`、`detailsTable`） |
| **fd_values** | EKP 控件属性 JSON（含 id、label、defaultValue、items 等） |
| **fd_xxx** | EKP 控件 ID 格式（`fd_` + 12~16 位随机字符） |
| **label** | 控件的显示标签（如"产品类型"） |
| **控件 ID** | 控件在表单中的唯一标识 |
| **行级引用** | 明细表字段的引用格式：EKP 用 `tableId.rowIdx.fieldId`，MK 用 `(tableId.fieldId, rowNum)` |

---

## API 相关

### EKP xform API

| 术语 | 含义 |
|---|---|
| **GetXFormFieldById** | 根据 ID 获取 DOM 对象数组 |
| **GetXFormFieldValueById** | 根据 ID 获取值数组 |
| **SetXFormFieldValueById** | 根据 ID 设置值 |
| **AttachXFormValueChangeEventById** | 根据 ID 绑定值变化监听 |
| **XFormOnValueChange** | 全局值变化钩子函数（单例） |
| **XFormOnValueChangeFuns** | 全局值变化钩子队列（数组） |
| **ByLabel API** | 通过显示文字引用控件的系列 API（MK 无对应） |

### MK MKXFORM API

| 术语 | 含义 |
|---|---|
| **getValue / setValue** | 主表字段取值/赋值 |
| **getControlValue / updateControl** | 明细表单元格取值/赋值 |
| **onChange** | 控件值变化监听 |
| **beforeSubmit / afterSubmit** | 提交前拦截 / 提交后回调 |
| **setFieldAttr** | 设置字段显示属性（1只读/2编辑/3必填/4隐藏/5显示/6非必填） |
| **setDetailFieldAttr** | 设置明细表整列属性 |
| **setDetailRowAttr** | 设置明细表整行属性 |
| **setDetailFieldItemAttr** | 设置明细表单元格属性 |
| **getRowCount** | 获取明细表行数 |
| **addRow / updateRow / deleteRow** | 明细表行增改删 |
| **callTic / callOrg / callLbpm / callFlow** | 调用集成平台/组织架构/流程/动作流 |
| **executeOperation** | 执行业务操作（新增/编辑/删除/打印等） |
| **GLOBALJS** | 全局环境变量容器 |

---

## 迁移相关

| 术语 | 含义 |
|---|---|
| **分析报告** | 分析工具从 EKP HTML 提取的 MD 报告，含控件引用清单 |
| **字段映射表** | 旧 ID → 新 ID 的对照表，由用户填写 |
| **idMap** | Agent 内部解析字段映射表后构建的字典 |
| **controlIndex** | Agent 内部解析分析报告后构建的控件索引 |
| **callGraph** | Agent 扫描 JS 源码后构建的调用图 |
| **间接写入** | 通过 `GetXFormFieldById(_, true)` 拿到 DOM 后修改 `.value`/`.style`/属性，分析报告识别不到 |
| **配置化** | 将 JS 逻辑改为 MK 表单设计器配置（如显示条件、必填条件、默认值） |
| **few-shot** | 给 LLM 提供的示例，用于引导输出风格 |

---

## 角色标注

分析报告中对每个控件标注的角色：

| 角色 | 判定 API | 语义 |
|---|---|---|
| **读取** | `GetXFormFieldById` / `GetXFormFieldValueById` | JS 从该控件取值 |
| **写入** | `SetXFormFieldValueById` | JS 修改该控件的值 |
| **监听** | `AttachXFormValueChangeEventById` | JS 监听该控件的值变化事件 |

**⚠️ 注意**：间接写入不会被标为"写入"，只会被标为"读取"。Agent 必须主动回读源码识别。

---

## 值格式术语

| 术语 | 含义 |
|---|---|
| **毫秒数 (timestamp)** | 从 1970-01-01 00:00:00 UTC 起的毫秒数，MK 日期时间控件的统一值格式 |
| **选项值 vs 选项文本** | 值 = `itemvalues`（如 `"0"`），文本 = `items`（如 `"以上都没有"`） |
| **getValueText** | MK API，获取控件的显示文本而非原始值 |
| **tinyValues** | MK 明细表 onChange 回调中 `extValue` 的字段，含本次批量变更的单元格 |

---

## 缩写

| 缩写 | 全称 |
|---|---|
| **DOM** | Document Object Model |
| **JSP** | JavaServer Pages |
| **API** | Application Programming Interface |
| **LLM** | Large Language Model |
| **PC** | Personal Computer（桌面端） |
| **AJAX** | Asynchronous JavaScript and XML |
| **LBPM** | Landray Business Process Management（蓝凌流程管理） |
| **TIC** | 集成平台（Third-party Integration Center） |

---

## 相关文档

- [`../README.md`](../README.md) — 项目总入口
- [`../02-source-ekp/xform-api-reference.md`](../02-source-ekp/xform-api-reference.md) — EKP API 详解
- [`../03-target-mk/mkxform-api-reference.md`](../03-target-mk/mkxform-api-reference.md) — MK API 详解
- [`../04-migration-rules/api-mapping-table.md`](../04-migration-rules/api-mapping-table.md) — API 映射表
