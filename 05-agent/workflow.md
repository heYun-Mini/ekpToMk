# Agent 迁移工作流（Workflow）

> 本文档定义 Agent 处理一份 EKP → MK 迁移任务时的**强制 7 步流程**。
> 每一步都有明确的输入、输出、检查点，不得跳步。

---

## 流程总览

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: 解析分析报告 → 建立"引用控件索引"                    │
│ Step 2: 加载字段映射 → 建立"旧ID→新ID"字典 + 完整性校验      │
│ Step 3: 逐段扫描 JS → 识别 API 调用与 DOM 模式               │
│ Step 4: 间接写入回读 → 补齐分析报告的静态分析盲区            │
│ Step 5: 应用转换规则 → 生成 MK JS 草稿                       │
│ Step 6: 配置 vs JS 决策 → 简化能配置化的部分                 │
│ Step 7: 自检 + 输出三份产出                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 1 · 解析分析报告

### 输入
- `analysis-report.md`（工具生成的分析报告）

### 操作

1. 读取【表单元信息】章节，提取：
   - 主表 ID（`standardTable` 的 fd_xxx）
   - 所有子表 ID 及 label（`detailsTable`）
   - JSP 片段数量
2. 读取【JS 片段（合并）】章节 → 保存为 `sourceJs` 字符串
3. 读取【JS 引用的控件】表格 → 构建控件索引 `controlIndex`：
   ```javascript
   controlIndex = {
     "fd_xxx": {
       label: "产品类型",
       type: "select",
       owner: "子表: 产品拆解明细表",   // 或 "主表"
       ownerTableId: "fd_3aa1c3c0849216", // 若属于子表
       directRefs: 3,
       rowLevelRefs: 5,
       roles: ["读取", "监听"]
     },
     ...
   }
   ```
4. 读取【全局钩子】章节 → 记录 `hasGlobalHook`、`pushCount`
5. 读取【按 label 引用】章节 → 记录 `byLabelRefs[]`
6. 读取【未匹配引用】章节 → 记录 `unmatchedRefs[]`（后续需人工确认）
7. 读取【解析警告】章节 → 若存在异常，标记 `hasWarnings=true`

### 输出
- `controlIndex` — 控件字典
- `sourceJs` — JS 源码
- `formMeta` — 主表/子表元信息
- `specialFlags` — { hasGlobalHook, byLabelRefs, unmatchedRefs, hasWarnings }

### 检查点
- ✅ `controlIndex` 至少包含 1 个控件（否则分析报告为空，中止）
- ✅ `sourceJs` 非空
- ⚠️ 若 `hasWarnings=true`，在 migration-notes.md 中记录警告

---

## Step 2 · 加载字段映射

### 输入
- `field-mapping.txt`（用户填写的字段映射表）
- Step 1 的 `controlIndex`

### 操作

1. 解析映射表文本，构建 `idMap`：
   ```javascript
   idMap = {
     "fd_xxx": "fdNewYyy",
     "fd_ChanPinType": "fdNewChanPinType",
     ...
   }
   ```
2. **完整性校验**：对 `controlIndex` 中每个旧 ID 检查 `idMap` 中是否存在
   - 缺失 → **立即中止**，向用户报错：
     ```
     字段映射表缺失以下 ID：
     - fd_xxx (label: 产品类型, 所属: 子表: 产品拆解明细表)
     - fd_yyy (label: 单位, 所属: 主表)
     请补充后重新提交。
     ```
3. **额外项检测**：`idMap` 中存在但 `controlIndex` 中不存在的 ID → 记录到 migration-notes.md（可能是用户误填或分析报告遗漏）
4. **子表 ID 映射**：明细表自身也有 ID，需检查是否也映射（若 JS 中直接使用 `tableId`）

### 输出
- `idMap` — 旧ID→新ID 字典
- `missingIds[]` — 缺失列表（若非空则中止）
- `extraIds[]` — 多余列表（记录）

### 检查点
- ✅ `missingIds.length === 0`
- ✅ 所有子表 ID 也已完成映射（若 JS 中直接引用）

---

## Step 3 · 逐段扫描 JS 源码

### 输入
- `sourceJs`（Step 1）
- `controlIndex`（Step 1）
- `idMap`（Step 2）

### 操作

按顺序扫描源码，识别以下 8 类模式并构建 `callGraph`：

| # | 模式 | 识别正则/关键字 | 对应规则文档 |
|---|---|---|---|
| 1 | EKP xform API 调用 | `GetXFormFieldById`、`SetXFormFieldValueById`、`AttachXFormValueChangeEventById`、`XFormOnValueChange` 等 | api-mapping-table.md §1 |
| 2 | DOM 元素查找 | `document.getElementById`、`document.querySelector`、`$(selector)` | api-mapping-table.md §2.1 |
| 3 | DOM 值读写 | `elem.value`、`elem.innerText`、`elem.checked` | api-mapping-table.md §2.2 |
| 4 | DOM 属性操作 | `setAttribute`、`removeAttribute`、`hasAttribute` | api-mapping-table.md §2.3 |
| 5 | DOM 样式操作 | `elem.style.xxx`、`elem.className` | api-mapping-table.md §2.4 |
| 6 | DOM 结构操作 | `createElement`、`appendChild`、`removeChild`、`insertBefore` | api-mapping-table.md §2.5 |
| 7 | AJAX / 提示 | `$.ajax`、`fetch`、`alert`、`confirm` | api-mapping-table.md §3.1-3.2 |
| 8 | 定时器 | `setTimeout`、`setInterval`、`$(function(){})` | api-mapping-table.md §3.5 |

对每个识别到的调用点，记录：
```javascript
callGraph.push({
  lineNo: 12,
  category: 1,             // 上表编号
  ekpApi: "SetXFormFieldValueById",
  args: ["fd_xxx", "newVal"],
  context: "在 for 循环内，遍历明细表所有行",
  mappedTo: "MKXFORM.setValue" 或 "MKXFORM.updateControl"
})
```

### 输出
- `callGraph` — 调用图（所有需要转换的点）

### 检查点
- ✅ `callGraph` 覆盖了 `controlIndex` 中所有"读取/写入/监听"角色的控件
- ⚠️ 若有 `controlIndex` 中的控件未在 `callGraph` 出现，记录到 migration-notes.md

---

## Step 4 · 间接写入回读（关键！）

### 输入
- `sourceJs`
- `controlIndex`（重点关注 roles 含"读取"的控件）

### 操作

**触发条件**：对所有满足以下条件的控件强制回读源码：
- 角色标注为"读取"（不含"写入"）
- 源码中出现 `GetXFormFieldById(<该控件ID>, true)` 且第二参数为 `true`

**回读方式**：
1. 在源码中定位 `GetXFormFieldById(<id>, true)` 的调用点
2. 追踪返回值赋给的变量（如 `var TargetInput = GetXFormFieldById(...)`）
3. 在该变量的所有使用点，检查是否存在：
   - `TargetInput[i].value = xxx` → **间接写入**
   - `TargetInput[i].setAttribute(...)` → **间接属性修改**
   - `TargetInput[i].style.xxx = xxx` → **间接样式修改**
   - `TargetInput[i].appendChild/removeChild` → **间接 DOM 结构修改**
4. 每发现一处，追加到 `indirectWrites[]`：
   ```javascript
   indirectWrites.push({
     controlId: "fd_CustomType",
     lineNo: 25,
     operation: "value=",
     value: "空字符串",
     context: "在 else 分支中清空值"
   })
   ```

### 输出
- `indirectWrites[]` — 间接写入清单

### 检查点
- ✅ 所有"读取"角色 + `GetXFormFieldById(_, true)` 组合都已回读
- ✅ 每处间接写入都已记录，将在 Step 5 中转换为 MK API

**⚠️ 这一步是分析报告静态分析的盲区，Agent 必须主动补齐，不得跳过。**

---

## Step 5 · 应用转换规则

### 输入
- `callGraph`（Step 3）
- `indirectWrites[]`（Step 4）
- `idMap`（Step 2）
- `formMeta`（Step 1）
- 规则文档：`04-migration-rules/*.md`

### 操作

按以下顺序处理：

#### 5.1 处理全局钩子（若存在）
参考 [`global-hook-patterns.md`](../04-migration-rules/global-hook-patterns.md)：
- 若 `XFormOnValueChange` 内部按控件 ID 分支 → 拆为多个 `MKXFORM.onChange`
- 若无法拆分 → 封装统一分发器 + 逐个 `onChange` 触发

#### 5.2 处理事件监听
- `AttachXFormValueChangeEventById(id, fn)` → `MKXFORM.onChange(idMap[id], fn)`
- 回调签名调整：MK 回调接收 `(value, extValue)`，若原 EKP 回调内部通过 `GetXFormFieldValueById` 取值，可简化为直接使用 `value` 参数

#### 5.3 处理明细表遍历
参考 [`detail-table-patterns.md`](../04-migration-rules/detail-table-patterns.md)：
- `for(i=0; i<SourceSelect.length; i++)` → `for(var i=0; i<MKXFORM.getRowCount(tableId); i++)`
- 行级 ID `"tableId.rowIdx.fieldId"` → 拆分为 `("tableId.fieldId", rowIdx)` 双参数
- `SourceSelect[i].value` → `MKXFORM.getControlValue("tableId.fieldId", i)`

#### 5.4 处理间接写入
参考 [`indirect-write-patterns.md`](../04-migration-rules/indirect-write-patterns.md)：
- `elem[i].value = xxx`（主表）→ `MKXFORM.setValue(idMap[id], xxx)`
- `elem[i].value = xxx`（明细表）→ `MKXFORM.updateControl("tableId.fieldId", i, xxx)`
- `elem[i].setAttribute("validate","required")` → `MKXFORM.setFieldAttr(idMap[id], 3)`
- `elem[i].style.display = "none"` → `MKXFORM.setFieldAttr(idMap[id], 4)`
- `elem[i].parentNode.appendChild(span)`（必填星号）→ **删除**（MK 自动渲染）

#### 5.5 处理 ByLabel 引用
参考 [`label-to-id-patterns.md`](../04-migration-rules/label-to-id-patterns.md)：
- 在字段映射表中按 label 反查旧 ID → 再查 idMap 得新 ID
- 找不到 → 中止并报错

#### 5.6 处理 AJAX / 提示 / 定时器
参考 [`api-mapping-table.md §3`](../04-migration-rules/api-mapping-table.md)：
- `$.ajax` → `MKXFORM.ajax`
- `alert` → `MKXFORM.modal` 或 `MKXFORM.message`
- `setTimeout(fn, 1000)` 用于等 DOM 就绪 → **删除**

#### 5.7 处理值格式
参考 [`value-format-conversion.md`](../04-migration-rules/value-format-conversion.md)：
- 日期时间 → 毫秒数
- 多选 → 数组
- 单选/下拉 → 字符串

#### 5.8 组装 JS 代码
按 [`output-template.md`](./output-template.md) 骨架组装，每段前加 3 行注释说明对应的 EKP 原逻辑。

### 输出
- `mkJsDraft` — MK JS 草稿代码
- `decisionLog[]` — 每处转换的决策记录（含引用的规则）

### 检查点
- ✅ `callGraph` 中所有点都已处理
- ✅ `indirectWrites[]` 中所有点都已处理
- ✅ 输出 JS 中无 EKP 全局函数残留
- ✅ 输出 JS 中无 DOM API / jQuery

---

## Step 6 · 配置 vs JS 决策

### 输入
- `mkJsDraft`（Step 5）
- 决策规则：[`config-vs-js-decision.md`](../04-migration-rules/config-vs-js-decision.md)

### 操作

扫描 `mkJsDraft`，识别以下**应改为 MK 表单配置**的场景，从 JS 中移除：

| 场景 | 决策 |
|---|---|
| EKP `defaultValue="$xxx$"` 公式 | 改为 MK 字段"默认值"配置 |
| 简单的"A 字段=X 时 B 字段显示" | 改为 MK 字段"显示条件"配置 |
| 简单的"A 字段=X 时 B 字段必填" | 改为 MK 字段"必填条件"配置 |
| 静态选项列表 | 改为 MK 字段"选项"配置 |
| 静态默认值 | 改为 MK 字段"默认值"配置 |

对每处移除的逻辑：
1. 从 `mkJsDraft` 中删除对应代码
2. 在 `migration-notes.md` 中记录："建议配置化：字段 X 的显示条件应为 Y == 'Z'"

### 输出
- `mkJsFinal` — 精简后的 MK JS 代码
- `configSuggestions[]` — 配置化建议清单

### 检查点
- ✅ `mkJsFinal` 中不包含可配置化的逻辑
- ✅ `configSuggestions` 已完整记录

---

## Step 7 · 自检 + 输出

### 输入
- `mkJsFinal`（Step 6）
- `decisionLog`（Step 5）
- `configSuggestions`（Step 6）
- 自检清单：[`validation-checklist.md`](./validation-checklist.md)

### 操作

1. **对照 validation-checklist.md 逐项自检**，为每项标注：
   - ✅ 通过 — 附证据（代码行号或引用规则）
   - ❌ 失败 — 附失败原因，返回 Step 5 修复
   - ⚠️ 警告 — 附说明，记录到 migration-notes.md

2. **组装三份产出**：

   **mk-form.js**（参考 output-template.md）：
   ```javascript
   /**
    * 表单名称：<form-name>
    * 源系统：EKP 低代码表单
    * 目标系统：MK-PaaS
    * 迁移时间：<timestamp>
    * Agent 版本：v0.1
    */

   // ============================
   // 段 1: <业务逻辑描述>
   // 对应 EKP 原逻辑: <简要说明>
   // 应用规则: <api-mapping-table.md §X.Y>
   // ============================
   <code>

   // ...
   ```

   **migration-notes.md**：
   ```markdown
   # 迁移说明 · <form-name>

   ## 转换记录
   | 序号 | EKP 位置 | 应用规则 | MK 输出位置 | 备注 |
   |---|---|---|---|---|
   | 1 | sourceJs:12 | api-mapping-table §1.1 | mk-form.js:15 | ... |

   ## 间接写入处理
   ...

   ## 配置化建议
   ...

   ## 未处理项 / 假设
   ...

   ## 分析报告警告
   ...
   ```

   **self-check.md**：
   ```markdown
   # 自检报告 · <form-name>

   | # | 检查项 | 状态 | 证据 |
   |---|---|---|---|
   | 1 | 所有"读取/写入/监听"控件已处理 | ✅ | callGraph 长度 = 12 |
   | 2 | 无 DOM API 残留 | ✅ | grep 结果 = 0 |
   | ... | ... | ... | ... |
   ```

3. **写入 `06-workspace/outputs/<form-name>/`**

### 输出
- 三份产出文件已写入 `06-workspace/outputs/<form-name>/`

### 检查点
- ✅ 三份产出齐全
- ✅ self-check.md 中所有项为 ✅ 或 ⚠️（无 ❌）
- ✅ migration-notes.md 中每处转换都可追溯

---

## 中止条件（必须立即停止）

以下情况 Agent 必须中止并向用户报错，**不得强行输出**：

1. **字段映射表缺失控件** — Step 2 检测到 `missingIds.length > 0`
2. **ByLabel 引用无法反查** — Step 5.5 找不到对应 ID
3. **分析报告为空** — Step 1 中 `controlIndex` 为空
4. **JS 源码缺失** — Step 1 中 `sourceJs` 为空但 `controlIndex` 非空
5. **未匹配引用**数量 > 引用控件总数的 30% — 暗示分析报告可能不完整
6. **超出职责边界** — 遇到后端接口迁移、流程配置迁移等

中止时的输出格式：
```
❌ 迁移中止

原因: <具体原因>
需用户处理:
1. <具体行动项>
2. <具体行动项>

已完成的步骤: Step 1, Step 2, Step 3
```

---

## 相关文档

- [`system-prompt.md`](./system-prompt.md) — Agent 系统提示词
- [`decision-tree.md`](./decision-tree.md) — 转换决策树
- [`output-template.md`](./output-template.md) — 输出 JS 骨架
- [`validation-checklist.md`](./validation-checklist.md) — 自检清单
- [`../04-migration-rules/`](../04-migration-rules/) — 全部转换规则
