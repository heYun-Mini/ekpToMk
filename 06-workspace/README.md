# 06-workspace · 迁移工作区

> 本目录是**实际迁移任务的运行时数据区**。每个待迁移的表单在此拥有独立的输入/输出目录。
> 与知识库（01~05、07）分离，保证知识稳定、数据隔离。

---

## 目录结构

```
06-workspace/
├── README.md              # 本文件
├── inputs/                # 输入区（每个表单一目录）
│   └── <form-name>/
│       ├── analysis-report.md    # 分析报告（工具生成）
│       ├── field-mapping.txt     # 字段映射表（用户填写）
│       ├── ekp-source.html       # 可选：原始 EKP 表单 HTML
│       └── ekp-source.js         # 可选：提取的 JSP 片段 JS
│
└── outputs/               # 输出区（Agent 产出）
    └── <form-name>/
        ├── mk-form.js            # 迁移后的 MK JS 代码
        ├── migration-notes.md    # 迁移说明（决策记录、未处理项）
        └── self-check.md         # 自检报告（62 项清单结果）
```

---

## 命名约定

### `<form-name>` 命名规则

- 使用**小写字母 + 连字符**，如 `leave-apply`、`product-teardown`
- 若原 EKP 表单有中文名，可用拼音或英文翻译，如 `qingjia-shenqing` → `leave-apply`
- 避免空格、中文、特殊字符
- 保持**输入与输出目录同名**，便于对应

### 文件命名规则

| 文件 | 命名 | 来源 |
|---|---|---|
| 分析报告 | `analysis-report.md` | 分析工具生成 |
| 字段映射 | `field-mapping.txt` | 用户填写（工具生成模板） |
| EKP HTML | `ekp-source.html` | 用户提供（可选） |
| EKP JS | `ekp-source.js` | 用户提供或从 HTML 提取（可选） |
| MK JS | `mk-form.js` | Agent 生成 |
| 迁移说明 | `migration-notes.md` | Agent 生成 |
| 自检报告 | `self-check.md` | Agent 生成 |

---

## 使用流程

### 1. 新建迁移任务

```powershell
# 在 inputs/ 下新建目录
New-Item -ItemType Directory -Path "06-workspace/inputs/leave-apply"

# 放入分析报告和字段映射表
Copy-Item "<path-to-report>" "06-workspace/inputs/leave-apply/analysis-report.md"
Copy-Item "<path-to-mapping>" "06-workspace/inputs/leave-apply/field-mapping.txt"
```

### 2. 启动 Agent

将以下内容作为 Agent 的输入：
- 系统提示词：[`05-agent/system-prompt.md`](../05-agent/system-prompt.md)
- 用户消息：`06-workspace/inputs/leave-apply/` 下所有文件的内容

### 3. Agent 产出

Agent 按 [`05-agent/workflow.md`](../05-agent/workflow.md) 7 步执行，输出到：
- `06-workspace/outputs/leave-apply/mk-form.js`
- `06-workspace/outputs/leave-apply/migration-notes.md`
- `06-workspace/outputs/leave-apply/self-check.md`

### 4. 人工审阅

1. 阅读 `migration-notes.md` 了解转换决策
2. 阅读 `self-check.md` 确认 62 项自检通过
3. 审阅 `mk-form.js` 代码
4. 处理"配置化建议"（在 MK 表单设计器中完成配置）
5. 处理"未处理项"（人工确认或补充映射）

### 5. 部署

将 `mk-form.js` 内容粘贴到 MK 表单设计器 → JS 面板 → 保存 → 联调。

---

## 批量迁移建议

若需批量迁移多个表单：

1. **统一命名**：每个表单一个目录，命名清晰
2. **并行处理**：不同表单之间无依赖，可并行启动多个 Agent 实例
3. **集中审阅**：所有 outputs 生成后，统一人工审阅
4. **知识回填**：审阅中发现的共性问题，回填到 [`04-migration-rules/`](../04-migration-rules/)

---

## 示例参考

完整的输入/输出示例见：
- [`05-agent/examples/L1-simple-readonly/`](../05-agent/examples/L1-simple-readonly/) — 简单场景
- [`05-agent/examples/L3-indirect-write/`](../05-agent/examples/L3-indirect-write/) — 复杂场景

这两个示例目录的结构与本工作区一致，可直接作为模板复制。

---

## 清理策略

- **完成迁移的表单**：保留 outputs 作为历史记录，inputs 可归档或删除
- **废弃的迁移任务**：直接删除对应目录
- **知识库更新**：与 workspace 无关，独立维护

---

## 相关文档

- [`../README.md`](../README.md) — 项目总入口
- [`../05-agent/system-prompt.md`](../05-agent/system-prompt.md) — Agent 系统提示词
- [`../05-agent/workflow.md`](../05-agent/workflow.md) — Agent 工作流
- [`../01-contracts/analysis-report-spec.md`](../01-contracts/analysis-report-spec.md) — 分析报告规范
- [`../01-contracts/field-mapping-spec.md`](../01-contracts/field-mapping-spec.md) — 字段映射规范
