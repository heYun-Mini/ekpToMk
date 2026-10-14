# 字段映射模板规范

> 字段映射表是 Agent 迁移的**第二关键输入**（第一是分析报告）。
> 本文档定义其格式、填写流程、Agent 解析方式。

---

## 一、用途

将 EKP 旧系统的控件 ID 与 MK 新系统的控件 ID 建立**一一对应**关系。

**为什么需要**：
- EKP 中每个控件 ID 是随机生成的 `fd_xxxxxxxxxxxx` 格式
- MK 中新建表单时，控件 ID 也是新生成的（可能仍是 `fd_xxx` 或用户自定义）
- **两者无规律可循**，必须通过人工对照 label 建立映射

**谁填写**：迁移工程师（人），不是 Agent。

**Agent 用途**：
- Step 2（workflow.md）中解析为 `idMap` 字典
- Step 5 中所有 ID 替换都依赖此字典
- 缺失映射时**立即中止**，不得猜测

---

## 二、模板格式

分析工具会**自动生成**映射模板（仅包含 JS 实际引用的字段），格式如下：

```
字段映射（共 N 个）

1. 旧ID: fd_ChanPinType
   label: 产品类型 | 类型: select | 所属: 子表: 产品拆解明细表 | 角色: 读取 · 监听
   新ID:

2. 旧ID: fd_CustomType
   label: 产品类型自定义 | 类型: inputText | 所属: 子表: 产品拆解明细表 | 角色: 读取
   新ID:

3. 旧ID: fd_3aa1c3c0849216
   label: 产品拆解明细表 | 类型: detailsTable | 所属: (子表自身) | 角色: -
   新ID:
```

---

## 三、字段含义

| 字段 | 说明 | 来源 |
|---|---|---|
| **序号** | 从 1 开始的编号 | 工具生成 |
| **旧ID** | EKP 系统中的控件 ID | 工具从 HTML 提取 |
| **label** | 控件显示标签，用于在新系统中定位对应字段 | 工具从 HTML 提取 |
| **类型** | 控件的 `fd_type`（如 inputText、select、detailsTable） | 工具从 HTML 提取 |
| **所属** | `主表` 或 `子表: <子表 label>`；子表自身标 `(子表自身)` | 工具从 HTML 提取 |
| **角色** | JS 对该控件的操作类型（读取/写入/监听），用 ` · ` 拼接 | 工具静态分析 |
| **新ID** | **留空**，由用户填写 MK 新系统中对应字段的 ID | 用户填写 |

---

## 四、填写流程（人工操作）

### 步骤 1：复制模板到 MK JS 编辑器面板

打开 MK 表单设计器 → JS 面板 → 粘贴模板内容作为注释。

### 步骤 2：逐个字段对照 label 查找

对模板中每一项：
1. 读取 `label`（如"产品类型"）
2. 在 MK 新表单中找到同名/同义的字段
3. 点击该字段 → MK 会显示其 ID（如 `fdNewChanPinType`）

### 步骤 3：填写新ID

在 `新ID:` 后填入 MK 字段 ID：

```
1. 旧ID: fd_ChanPinType
   label: 产品类型 | 类型: select | 所属: 子表: 产品拆解明细表 | 角色: 读取 · 监听
   新ID: fdNewChanPinType
```

### 步骤 4：处理子表自身 ID

**关键**：子表（detailsTable）本身也有 ID，若 JS 中直接使用 `tableId`（如遍历行、添加行），必须映射：

```
3. 旧ID: fd_3aa1c3c0849216
   label: 产品拆解明细表 | 类型: detailsTable | 所属: (子表自身) | 角色: -
   新ID: fdNewTable
```

### 步骤 5：保存映射表

将填好的映射表保存为 `field-mapping.txt`，放入 `06-workspace/inputs/<form-name>/`。

---

## 五、Agent 解析方式

Agent 在 Step 2（workflow.md）中按以下伪代码解析：

```javascript
function parseFieldMapping(text) {
  var idMap = {};
  var entries = [];

  // 按空行分段
  var blocks = text.split(/\n\s*\n/);

  blocks.forEach(function(block) {
    // 匹配 "N. 旧ID: xxx"
    var oldIdMatch = block.match(/旧ID:\s*(\S+)/);
    var newIdMatch = block.match(/新ID:\s*(\S*)/);
    var labelMatch = block.match(/label:\s*([^|]+)/);
    var typeMatch = block.match(/类型:\s*(\S+)/);
    var ownerMatch = block.match(/所属:\s*([^|]+)/);
    var roleMatch = block.match(/角色:\s*(.+)/);

    if (oldIdMatch) {
      var entry = {
        oldId: oldIdMatch[1].trim(),
        newId: newIdMatch ? newIdMatch[1].trim() : "",
        label: labelMatch ? labelMatch[1].trim() : "",
        type: typeMatch ? typeMatch[1].trim() : "",
        owner: ownerMatch ? ownerMatch[1].trim() : "",
        role: roleMatch ? roleMatch[1].trim() : ""
      };
      entries.push(entry);
      if (entry.newId) {
        idMap[entry.oldId] = entry.newId;
      }
    }
  });

  return { idMap: idMap, entries: entries };
}
```

---

## 六、完整性校验

Agent 必须执行以下校验（Step 2 检查点）：

### 6.1 缺失检测

对 `controlIndex`（来自分析报告）中每个旧 ID，检查 `idMap` 中是否存在：

```javascript
var missingIds = [];
Object.keys(controlIndex).forEach(function(oldId) {
  if (!idMap[oldId]) {
    missingIds.push({
      oldId: oldId,
      label: controlIndex[oldId].label,
      owner: controlIndex[oldId].owner
    });
  }
});

if (missingIds.length > 0) {
  // ❌ 立即中止
  reportError("字段映射表缺失以下 ID:", missingIds);
}
```

### 6.2 多余检测

`idMap` 中存在但 `controlIndex` 中不存在的 ID → 记录到 migration-notes.md（可能是用户误填或分析报告遗漏）。

### 6.3 子表 ID 检测

对 `type === "detailsTable"` 的条目，若 JS 中直接使用 `tableId`（如 `getRowCount(tableId)`），必须已映射。

### 6.4 label 反查支持

Agent 需构建 `labelToId` 反向索引，供 ByLabel 引用处理（Step 5.5）：

```javascript
var labelToId = {};
entries.forEach(function(e) {
  if (e.label) {
    if (!labelToId[e.label]) labelToId[e.label] = [];
    labelToId[e.label].push(e);
  }
});
```

若某 label 对应多个条目 → 记录警告（迁移时取第一个，但需人工确认）。

---

## 七、错误处理

### 7.1 缺失映射 — 中止

```
❌ 迁移中止

原因: 字段映射表缺失以下 ID:
- fd_xxx (label: 产品类型, 所属: 子表: 产品拆解明细表)
- fd_yyy (label: 单位, 所属: 主表)

需用户处理:
1. 打开 MK 表单设计器
2. 找到 label 为"产品类型"的字段，点击获取其 ID
3. 在 field-mapping.txt 中补充 "新ID: <获取到的ID>"
4. 重新提交迁移

已完成的步骤: Step 1
```

### 7.2 label 歧义 — 警告

```
⚠️ 警告: 字段映射表中 label="申请人" 对应多个条目:
- fd_aaa → fdNewAaa (类型: address, 所属: 主表)
- fd_bbb → fdNewBbb (类型: inputText, 所属: 主表)

Agent 处理: 默认取第一个 (fd_aaa → fdNewAaa)
建议: 人工核对原 EKP JS 中 ByLabel("申请人") 的实际意图，必要时调整映射表
```

### 7.3 新ID 为空 — 视为缺失

若某条目 `新ID:` 后为空（用户忘记填写），Agent 视为**缺失**，中止迁移。

---

## 八、映射表样例

完整的填写样例见 [`samples/mapping-sample.txt`](./samples/mapping-sample.txt)。

**填写前：**
```
字段映射（共 3 个）

1. 旧ID: fd_ChanPinType
   label: 产品类型 | 类型: select | 所属: 子表: 产品拆解明细表 | 角色: 读取 · 监听
   新ID:

2. 旧ID: fd_CustomType
   label: 产品类型自定义 | 类型: inputText | 所属: 子表: 产品拆解明细表 | 角色: 读取
   新ID:

3. 旧ID: fd_3aa1c3c0849216
   label: 产品拆解明细表 | 类型: detailsTable | 所属: (子表自身) | 角色: -
   新ID:
```

**填写后：**
```
字段映射（共 3 个）

1. 旧ID: fd_ChanPinType
   label: 产品类型 | 类型: select | 所属: 子表: 产品拆解明细表 | 角色: 读取 · 监听
   新ID: fdNewChanPinType

2. 旧ID: fd_CustomType
   label: 产品类型自定义 | 类型: inputText | 所属: 子表: 产品拆解明细表 | 角色: 读取
   新ID: fdNewCustomType

3. 旧ID: fd_3aa1c3c0849216
   label: 产品拆解明细表 | 类型: detailsTable | 所属: (子表自身) | 角色: -
   新ID: fdNewTable
```

---

## 九、相关文档

- [`analysis-report-spec.md`](./analysis-report-spec.md) — 分析报告规范（映射模板的来源）
- [`../05-agent/workflow.md §Step 2`](../05-agent/workflow.md) — Agent 加载映射的流程
- [`../04-migration-rules/label-to-id-patterns.md`](../04-migration-rules/label-to-id-patterns.md) — ByLabel 反查
