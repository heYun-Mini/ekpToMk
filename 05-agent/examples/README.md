# 迁移示例库（few-shot）

本目录存放**经真实案例审阅确认**的 EKP → MK 迁移示例，供 Agent few-shot 学习与人工参考。

每个示例为一个子目录，统一采用**五件套**结构：

| 文件 | 说明 |
|---|---|
| `input-report.md` | 输入：分析报告 |
| `input-mapping.txt` | 输入：字段映射表 |
| `ekp-source.js` | 输入：EKP 原始 JSP 片段 JS |
| `mk-output.js` | 输出：迁移后的 MK 表单 JS |
| `explanation.md` | 讲解：逐步分析 + 应用规则 + 踩坑记录 |

---

## 示例清单

| 目录 | 难度 | 场景 | 核心教学点 |
|---|---|---|---|
| [`L3-indirect-write/`](./L3-indirect-write/) | L3 复杂 | 明细表按物料编号分组汇总，写入表头字段 | 分析报告"读取"标注盲区（间接写入）、明细表逐行取值、分组保序、跨端 toast/message |
| [`L6-async-calltic/`](./L6-async-calltic/) | L6 异步 | 逐行调 SPM 集成接口查询最后领用时间并回填明细行 | GetJdbcData→callTic 接口契约分析（字段名大小写）、异步闭包陷阱、onChange 绑定入口函数、JS 面板自包含结构 |

---

## 收录原则

1. **必须来自真实案例**，且经人工审阅确认后才入库，不得使用虚构数据。
2. 每个示例的 `explanation.md` 需记录审阅中发现并修正的问题，作为反面教材。
3. 难度分级：L1 简单只读联动 / L2 明细表遍历 / L3 间接写入 / L4 全局钩子拆解 / L5 ByLabel 解析 / L6 异步 AJAX。

> 待补充：L1、L2、L4、L5 示例（需对应真实案例审阅后归档）。
