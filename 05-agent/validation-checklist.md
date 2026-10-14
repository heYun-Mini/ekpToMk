# 迁移交付前自检清单

> Agent 在 Step 7（workflow.md）中**必须逐项对照**本清单，为每项标注 ✅ / ❌ / ⚠️ 并附证据。
> 任何 ❌ 项必须回到 Step 5 修复后重新自检，不得直接交付。

---

## 使用说明

- **✅ 通过**：附证据（如"grep 结果 = 0"、"callGraph 长度 = 12"、代码行号）
- **❌ 失败**：附失败原因，返回 Step 5 修复
- **⚠️ 警告**：附说明，记录到 migration-notes.md，不阻断交付

输出到 `06-workspace/outputs/<form-name>/self-check.md`，格式见文末。

---

## 一、输入完整性（5 项）

| # | 检查项 | 通过标准 | 失败处理 |
|---|---|---|---|
| 1.1 | 分析报告已成功解析 | `controlIndex` 非空，`sourceJs` 非空 | 中止：报告格式异常 |
| 1.2 | 字段映射表已成功解析 | `idMap` 非空 | 中止：映射表缺失 |
| 1.3 | 所有引用控件都有映射 | `missingIds.length === 0` | 中止：列出缺失 ID |
| 1.4 | 子表 ID 也已映射（若 JS 中直接引用） | 明细表 tableId 在 idMap 中 | 中止：列出缺失 tableId |
| 1.5 | 分析报告警告已记录 | 若有 warnings，已写入 notes | ⚠️ 警告 |

---

## 二、EKP API 清理（8 项）

对输出 JS 执行文本搜索，确认以下关键字**全部为 0**：

| # | 关键字 | 通过标准 |
|---|---|---|
| 2.1 | `GetXFormFieldById` | 出现次数 = 0 |
| 2.2 | `GetXFormFieldValueById` | 出现次数 = 0 |
| 2.3 | `SetXFormFieldValueById` | 出现次数 = 0 |
| 2.4 | `AttachXFormValueChangeEventById` | 出现次数 = 0 |
| 2.5 | `GetXFormFieldByLabel` / `GetXFormFieldValueByLabel` / `SetXFormFieldValueByLabel` / `AttachXFormValueChangeEventByLabel` | 出现次数 = 0 |
| 2.6 | `XFormOnValueChange` | 出现次数 = 0 |
| 2.7 | `XFormOnValueChangeFuns` | 出现次数 = 0 |
| 2.8 | 旧 ID 残留（`fd_` 开头且不在 idMap 的 value 中） | 出现次数 = 0 |

**检测方式**：对 `mk-form.js` 逐行 grep 或用正则扫描。

---

## 三、DOM/jQuery 清理（7 项）

| # | 关键字 | 通过标准 |
|---|---|---|
| 3.1 | `document.getElementById` / `document.querySelector` | 出现次数 = 0 |
| 3.2 | `document.createElement` / `appendChild` / `removeChild` / `insertBefore` | 出现次数 = 0 |
| 3.3 | `.value =` （赋值形式，排除 `getValue` 返回值使用） | 出现次数 = 0 |
| 3.4 | `.style.` | 出现次数 = 0 |
| 3.5 | `.setAttribute` / `.removeAttribute` / `.hasAttribute` | 出现次数 = 0 |
| 3.6 | `jQuery` / `$.ajax` / `$(document)` / `$(function` | 出现次数 = 0 |
| 3.7 | `alert(` / `confirm(` / `prompt(` | 出现次数 = 0 |

---

## 四、MK API 使用正确性（10 项）

| # | 检查项 | 通过标准 |
|---|---|---|
| 4.1 | 所有 `MKXFORM.getValue` / `setValue` 的 ID 都在 idMap 的 value 集合中 | 无未映射 ID |
| 4.2 | 明细表 API 使用双参数格式 `("tableId.fieldId", rowNum)` | 无字符串拼接 `"tableId.0.fieldId"` |
| 4.3 | `MKXFORM.onChange` 回调签名为 `(value, extValue)` | 无遗留 EKP 无参回调 |
| 4.4 | `setFieldAttr` 参数值在 `[1,2,3,4,5,6]` 范围内 | 无越界 |
| 4.5 | `setDetailFieldAttr` / `setDetailRowAttr` / `setDetailFieldItemAttr` 参数正确 | 参照 API 手册 |
| 4.6 | `setStyle` 第三参数为 `'label'` 或 `'content'` | 无遗漏 |
| 4.7 | `ajax` 回调签名为 `(error, res)`，res 结构 `{msg, success, data}` | 无 EKP 风格回调 |
| 4.8 | `modal` / `message` / `toast` 使用正确（PC vs 移动端） | 无 `alert/confirm` |
| 4.9 | `beforeSubmit` 返回 `true/false` 控制提交 | 无 `event.preventDefault()` |
| 4.10 | `getRowCount` 未在 `onLoad` 时机直接调用（或有延时保护） | 无时序问题 |

---

## 五、值格式正确性（6 项）

| # | 检查项 | 通过标准 |
|---|---|---|
| 5.1 | 多选字段值用**数组**，非分号字符串 | 无 `"a;b;c"` 硬编码 |
| 5.2 | 日期时间字段值用**毫秒数** | 无 `"2024-01-15"` 硬编码 |
| 5.3 | 数字字段值用**数字类型** | 无 `parseFloat` 冗余转换 |
| 5.4 | 人员字段值用 `{fdId, fdName, fdOrgType}` 对象 | 无纯字符串 |
| 5.5 | 附件字段处理了 `undefined` 空状态 | 有空值判断 |
| 5.6 | 空值判断兼容 `null` / `undefined` / `""` | 无仅判断 `""` 的情况 |

---

## 六、间接写入处理（4 项）

| # | 检查项 | 通过标准 |
|---|---|---|
| 6.1 | 所有"读取"角色 + `GetXFormFieldById(_, true)` 的控件都已回读 | `indirectWrites[]` 完整 |
| 6.2 | 每处间接写入都已转换为 MK API | 无遗漏 |
| 6.3 | 手动创建星号 span 的代码已全部删除 | 无 `createElement("span")` |
| 6.4 | `hasAttribute("validate")` 类判断已删除或改为 `getFieldAttr` | 无遗留 |

---

## 七、全局钩子处理（3 项）

| # | 检查项 | 通过标准 |
|---|---|---|
| 7.1 | 所有 `XFormOnValueChange` 声明已拆解 | 输出中无残留 |
| 7.2 | 所有 `XFormOnValueChangeFuns.push` 已拆解 | 输出中无残留 |
| 7.3 | 若用模式 3（分发器），字段清单完整 | 覆盖 controlIndex 所有需监听字段 |

---

## 八、明细表处理（5 项）

| # | 检查项 | 通过标准 |
|---|---|---|
| 8.1 | 所有行级 ID 字符串已拆分为双参数 | 无 `"tableId.rowIdx.fieldId"` 格式 |
| 8.2 | 遍历用 `getRowCount` + `getControlValue`，非 DOM 数组 | 无 `elems.length` |
| 8.3 | 行内属性切换用 `setDetailFieldItemAttr`，非 DOM 操作 | 无 `elems[i].setAttribute` |
| 8.4 | 行内值修改用 `updateControl`，非 `.value=` | 无 `elems[i].value=` |
| 8.5 | 添加/删除行用 `addRow` / `deleteRow`，非 DOM 操作 | 无 `insertRow` / `deleteRow` DOM API |

---

## 九、配置化决策（3 项）

| # | 检查项 | 通过标准 |
|---|---|---|
| 9.1 | 静态默认值已移至配置建议，不在 JS 中 | JS 中无 `setValue(id, "静态值")` |
| 9.2 | 单条件显示/必填已移至配置建议 | JS 中无简单 `if (a===x) setFieldAttr(b,4)` |
| 9.3 | 所有配置建议已在 migration-notes.md 中记录，含具体配置路径 | notes 中有"配置化建议"章节 |

---

## 十、输出格式（5 项）

| # | 检查项 | 通过标准 |
|---|---|---|
| 10.1 | mk-form.js 头部有注释块（表单名、源系统、迁移时间、Agent 版本） | 符合 output-template.md |
| 10.2 | 每段代码前有 3 行注释说明对应 EKP 原逻辑 | 无裸代码段 |
| 10.3 | migration-notes.md 含"转换记录"表格，每处可追溯 | 无遗漏 |
| 10.4 | migration-notes.md 含"未处理项 / 假设"章节 | 有则填，无则写"无" |
| 10.5 | self-check.md 逐项标注 ✅/❌/⚠️ 并附证据 | 无空白项 |
| 10.6 | 每个字段 ID 出现处有行内注释标注业务字段名（中文 label + 表归属，不重复写 ID） | 无未注释的裸新 ID |
| 10.7 | 关键逻辑语句/分支有中文注释说明"做了什么"（如锁定、赋值、显隐动作） | 无无注释的分支块 |

---

## 十一、语义完整性（4 项）

| # | 检查项 | 通过标准 |
|---|---|---|
| 11.1 | controlIndex 中所有"读取"角色控件都在输出 JS 中被读取 | 无遗漏 |
| 11.2 | controlIndex 中所有"写入"角色控件都在输出 JS 中被写入 | 无遗漏 |
| 11.3 | controlIndex 中所有"监听"角色控件都在输出 JS 中注册了 onChange | 无遗漏 |
| 11.4 | 分析报告【未匹配引用】已记录到 notes，标注需人工确认 | 有则记录 |

---

## 十二、总计

**共 62 项自检**，分布：
- 输入完整性：5
- EKP API 清理：8
- DOM/jQuery 清理：7
- MK API 正确性：10
- 值格式：6
- 间接写入：4
- 全局钩子：3
- 明细表：5
- 配置化：3
- 输出格式：7
- 语义完整性：4

**交付标准**：全部 ✅ 或 ⚠️（⚠️ 需在 notes 中说明），**不得有任何 ❌**。

---

## 附：self-check.md 输出模板

```markdown
# 自检报告 · <form-name>

**生成时间**: <timestamp>
**Agent 版本**: v0.1
**总计**: 62 项 · ✅ 通过 X 项 · ⚠️ 警告 Y 项 · ❌ 失败 0 项

## 一、输入完整性

| # | 检查项 | 状态 | 证据 |
|---|---|---|---|
| 1.1 | 分析报告已成功解析 | ✅ | controlIndex 含 12 个控件，sourceJs 长度 3456 字符 |
| 1.2 | 字段映射表已成功解析 | ✅ | idMap 含 12 条映射 |
| 1.3 | 所有引用控件都有映射 | ✅ | missingIds = [] |
| 1.4 | 子表 ID 已映射 | ✅ | fd_3aa1c3c0849216 → fdNewTable |
| 1.5 | 分析报告警告已记录 | ⚠️ | 报告中含 1 条解析警告，已记入 notes §警告 |

## 二、EKP API 清理

| # | 关键字 | 状态 | 证据 |
|---|---|---|---|
| 2.1 | `GetXFormFieldById` | ✅ | grep 结果 = 0 |
| 2.2 | `GetXFormFieldValueById` | ✅ | grep 结果 = 0 |
| ... | ... | ... | ... |

## 三、DOM/jQuery 清理

...

（依此类推，逐项填写）

## 结论

✅ **自检通过**，可交付。

⚠️ 警告项汇总（需人工关注）：
1. 分析报告含 1 条解析警告（JSP 片段找不到 input[type=hidden]），不影响主体迁移
2. 人员字段值格式变化，需人工确认数据来源（详见 notes §未处理项）
```

---

## 相关文档

- [`workflow.md §Step 7`](./workflow.md) — 自检在工作流中的位置
- [`output-template.md`](./output-template.md) — 输出 JS 骨架
- [`system-prompt.md`](./system-prompt.md) — Agent 硬约束
