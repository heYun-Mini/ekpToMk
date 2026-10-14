# 分析报告样例索引

本目录存放**分析报告**与**字段映射表**的样例文件，供 Agent few-shot 学习与人工参考。

---

## 样例清单

| 文件 | 说明 | 对应示例 |
|---|---|---|
| [`mapping-sample.txt`](./mapping-sample.txt) | 字段映射表样例（含子表自身 ID 映射） | L3 间接写入示例 |
| [`../../05-agent/examples/L1-simple-readonly/input-report.md`](../../05-agent/examples/L1-simple-readonly/input-report.md) | 简单场景分析报告（主表、无明细表） | L1 简单只读联动 |
| [`../../05-agent/examples/L1-simple-readonly/input-mapping.txt`](../../05-agent/examples/L1-simple-readonly/input-mapping.txt) | 简单场景字段映射表 | L1 简单只读联动 |
| [`../../05-agent/examples/L3-indirect-write/input-report.md`](../../05-agent/examples/L3-indirect-write/input-report.md) | 复杂场景分析报告（明细表 + 间接写入） | L3 间接写入 |
| [`../../05-agent/examples/L3-indirect-write/input-mapping.txt`](../../05-agent/examples/L3-indirect-write/input-mapping.txt) | 复杂场景字段映射表 | L3 间接写入 |

---

## 使用方式

### Agent few-shot 学习

启动 Agent 时，可将 L1/L3 的完整示例（input + output + explanation）作为 few-shot 上下文，
显著提升迁移准确率。

### 人工参考

迁移工程师填写字段映射表时，可参考 `mapping-sample.txt` 的格式。

---

## 相关文档

- [`../analysis-report-spec.md`](../analysis-report-spec.md) — 分析报告规范
- [`../field-mapping-spec.md`](../field-mapping-spec.md) — 字段映射表规范
- [`../../05-agent/examples/`](../../05-agent/examples/) — 完整示例库
