# 07-tooling · 辅助工具

> 迁移工作配套的工具与参考资料。

---

## 表单 JS 分析工具

**文件**：[`standalone-form-js-extract.html`](./standalone-form-js-extract.html)

**一句话**：粘贴 EKP 表单 HTML → 自动提取 JSP 片段 JS、识别控件引用 → 实时生成 Markdown 分析报告 + 字段映射模板。

### 打开方式

双击文件用浏览器打开即可（Chrome / Edge 均可）。纯前端单文件：无需安装、无需服务器、无外部依赖、可离线使用；输入内容自动保存在浏览器本地，刷新页面不丢失。

### 使用步骤

1. 在 EKP 中打开目标表单，复制表单 HTML 全文（含 `fd_type` / `fd_values` 属性的 TABLE 结构）
2. 粘贴到左侧【表单 HTML】框 —— 右侧报告实时自动生成（首次可点【加载示例】看效果）
3. 核对顶部统计：主表 / 子表 / 控件 / JSP 片段 / 引用 / 未匹配
4. 点报告区【复制】→ 保存为 `analysis-report.md`
5. 点【字段映射模板】区【复制】→ 保存为 `field-mapping.txt`，对照 label 填写新 ID
6. 两份文件放入 [`06-workspace/inputs/<form-name>/`](../06-workspace/README.md)，交给迁移 Agent

> 若浏览器限制剪贴板导致【复制】无反应，手动全选文本框内容复制即可。

### 报告包含什么

| 章节 | 内容 |
|---|---|
| 表单元信息 | 主表 / 子表 ID 与 label、业务控件数、JSP 片段数 |
| JS 片段（合并） | 所有 JSP 片段的 JS 代码（合并输出，含片段 ID 标注） |
| JS 引用的控件 | 每个被引用控件的直接引用 / 行级引用次数、入参/出参（读取 · 写入 · 监听） |
| 未匹配引用 | 引用了但表单中不存在的 ID（未知 ID / 未知子表 / 子表字段未知） |
| 全局钩子 | 是否声明 `XFormOnValueChange`、`XFormOnValueChangeFuns.push` 次数 |
| 按 label 引用 | ByLabel 系列 API 的 label 参数及匹配到的控件 |
| 数据集调用 | `GetJdbcData` 字面量调用的数据集 ID、数据源、EKP 后台查看链接 |

产出物对应契约：[`01-contracts/analysis-report-spec.md`](../01-contracts/analysis-report-spec.md)（分析报告）、[`01-contracts/field-mapping-spec.md`](../01-contracts/field-mapping-spec.md)（字段映射模板）。

### 已知限制（重要）

- **仅静态分析**：只识别 JS 中通过 xform API 的显式引用；**“间接写入”识别不了**（如 `elem[0].value = xxx` 这类 DOM 直接赋值）—— 迁移时须按 [`04-migration-rules/indirect-write-patterns.md`](../04-migration-rules/indirect-write-patterns.md) 人工 / Agent 复核
- 数据集 ID 为变量（非字面量）时无法静态提取，报告只提示调用次数
- 报告中的“数据集定义链接”指向 EKP 后台，供人工查阅；工具本身不产生任何网络请求

---

## glossary.md

术语表：EKP / MK 双平台术语统一约定，见 [`glossary.md`](./glossary.md)。
