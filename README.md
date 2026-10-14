# EKP → MK 表单 JS 迁移工程

> 将蓝凌 EKP 低代码表单的 JSP 片段 JS，重构为 MK-PaaS 平台可执行的表单 JS 代码。
> 本项目既是**知识库**（API 对照、迁移规则），也是 **Agent 工作台**（提示词、示例、工作区）。

---

## 快速导航

| 你是谁 | 从这里开始 |
|---|---|
| **迁移 Agent（LLM）** | [`05-agent/system-prompt.md`](./05-agent/system-prompt.md) → [`05-agent/workflow.md`](./05-agent/workflow.md) |
| **迁移工程师（人）** | [`01-contracts/analysis-report-spec.md`](./01-contracts/analysis-report-spec.md) 了解输入 → [`04-migration-rules/`](./04-migration-rules/) 掌握规则 |
| **首次接触本项目** | 先读本 README，再按下方"目录结构"逐层探索 |
| **要生成分析报告** | 打开 [`07-tooling/standalone-form-js-extract.html`](./07-tooling/standalone-form-js-extract.html)（双击用浏览器打开），粘贴 EKP 表单 HTML 自动生成 |
| **要开始一次实际迁移** | 把分析报告放入 [`06-workspace/inputs/<form-name>/`](./06-workspace/inputs/) |

---

## 约束

当有不明确的情况时，例如字段信息、控件类型、值格式无法确认而影响迁移结果时，第一时间与迁移工程师沟通，确认后再进行迁移，切勿自行假设或猜测！！

## 目录结构

```
ekpToMk/
├── README.md                       # 本文件 · 总入口
│
├── 01-contracts/                   # 【输入契约】Agent 读什么
│   ├── analysis-report-spec.md     # 表单 JS 分析报告规范（迁移的主要输入）
│   ├── field-mapping-spec.md       # 字段映射模板规范（旧ID→新ID）
│   └── samples/                    # 输入样例
│
├── 02-source-ekp/                  # 【源端知识】EKP 长什么样
│   ├── form-html-spec.md           # EKP 低代码表单 HTML 示例与结构
│   └── xform-api-reference.md      # EKP xform 全局函数参考（GetXFormFieldById 等）
│
├── 03-target-mk/                   # 【目标端知识】MK 长什么样
│   ├── mkxform-api-reference.md    # MKXFORM 完整 API 手册
│   ├── control-value-format.md     # MK 控件值格式约定（日期毫秒数、多选数组等）
│   └── lifecycle-and-events.md     # MKXFORM 注册顺序与生命周期
│
├── 04-migration-rules/             # 【转换规则】核心知识层
│   ├── api-mapping-table.md        # ⭐ EKP API → MK API 一一对照表
│   ├── detail-table-patterns.md    # ⭐ 明细表行级访问的转换模式
│   ├── indirect-write-patterns.md  # ⭐ 间接写入识别与转换
│   ├── global-hook-patterns.md     # ⭐ XFormOnValueChange 全局钩子转换
│   ├── label-to-id-patterns.md     # ByLabel 引用处理
│   ├── config-vs-js-decision.md    # 何时用 MK 配置替代 JS 联动
│   └── value-format-conversion.md  # 值格式差异处理
│
├── 05-agent/                       # 【Agent 执行层】
│   ├── system-prompt.md            # Agent 系统提示词（角色、约束、输出格式）
│   ├── workflow.md                 # 强制工作流（7 步骤）
│   ├── decision-tree.md            # 转换决策树
│   ├── output-template.md          # 输出 JS 骨架模板
│   ├── validation-checklist.md     # 交付前自检清单
│   └── examples/                   # ⭐ Few-shot 示例库
│       ├── L3-indirect-write/      # 间接写入（DOM .value= 赋值）
│       └── L6-async-calltic/       # 异步接口（GetJdbcData→callTic）
│
├── 06-workspace/                   # 【运行时数据】实际迁移工作区
│   ├── README.md                   # 目录规范
│   ├── inputs/<form-name>/         # 待迁移表单输入
│   └── outputs/<form-name>/        # Agent 迁移产出
│
└── 07-tooling/                     # 【辅助工具】
    ├── standalone-form-js-extract.html  # ⭐ 表单 JS 分析工具（浏览器打开）
    ├── README.md                   # 工具目录说明
    └── glossary.md                 # 术语表
```

---

## 迁移工作流总览

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 用户提供 EKP 表单 HTML                                    │
│           ↓                                                  │
│ 2. 分析工具生成：分析报告 MD + 字段映射模板                  │
│           ↓                                                  │
│ 3. 用户填写字段映射模板（旧ID → 新ID）                       │
│           ↓                                                  │
│ 4. Agent 读取【报告 + 映射】→ 按 workflow.md 7 步执行        │
│           ↓                                                  │
│ 5. Agent 产出：MK JS 代码 + 迁移说明 + 自检报告              │
│           ↓                                                  │
│ 6. 人工审阅 → 粘贴到 MK 表单 JS 面板 → 联调                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 三大迁移风险（Agent 必读）

来自 [`01-contracts/analysis-report-spec.md`](./01-contracts/analysis-report-spec.md)：

| 风险 | 表现 | 应对文档 |
|---|---|---|
| **间接写入不可见** | 分析报告只标"读取"，实际 JS 中有 `elem[0].value = xxx` | [`indirect-write-patterns.md`](./04-migration-rules/indirect-write-patterns.md) |
| **明细表行级引用格式差异** | EKP 用 `"tableId.rowIdx.fieldId"`，MK 用 `(id, rowNum)` 分离参数 | [`detail-table-patterns.md`](./04-migration-rules/detail-table-patterns.md) |
| **全局钩子需拆解** | `XFormOnValueChange` 单函数监听全表单，MK 需拆为多个 `onChange` | [`global-hook-patterns.md`](./04-migration-rules/global-hook-patterns.md) |

---

## 使用建议

### 单次迁移
1. 用 [`07-tooling/standalone-form-js-extract.html`](./07-tooling/standalone-form-js-extract.html) 生成 `analysis-report.md` 与 `field-mapping.txt` 模板，映射表填写新 ID
2. 在 [`06-workspace/inputs/`](./06-workspace/inputs/) 新建 `<form-name>/` 目录，放入两份文件
3. 让 Agent 读取 [`05-agent/system-prompt.md`](./05-agent/system-prompt.md) 启动
4. Agent 输出到 [`06-workspace/outputs/<form-name>/`](./06-workspace/outputs/)

### 知识库维护
- 每次迁移完成后，把 Agent 出错的点回填到 [`04-migration-rules/`](./04-migration-rules/)
- 有代表性的完整案例，脱敏后加入 [`05-agent/examples/`](./05-agent/examples/)

---

## 版本

- **v0.1** · 初版骨架建立，含核心映射表、Agent 提示词、L1/L3 示例
