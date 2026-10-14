# L3 示例讲解：间接写入 + 明细表分组汇总

> **难度**：L3（复杂）
> **场景**：制服衬衫领用明细表按物料编号分组累加，结果写入表头汇总字段
> **核心教学点**：分析报告的"读取"标注盲区、明细表逐行取值、分组保序、跨端消息提示
> **本示例经真实案例审阅后归档**，含 4 处修正（见 §五）。

---

## 一、输入

| 文件 | 内容 |
|---|---|
| [`input-report.md`](./input-report.md) | 分析报告：1 个 JSP 片段、7 个引用控件，全部标注"读取" |
| [`input-mapping.txt`](./input-mapping.txt) | 字段映射：2 个主表字段（`mkModelId.*`）+ 5 个明细表字段（`mkModelId_details.*`）|
| [`ekp-source.js`](./ekp-source.js) | EKP 原始 JSP 片段 JS |

**输出**：[`mk-output.js`](./mk-output.js)

---

## 二、按工作流逐步分析

### Step 1 — 解析分析报告

报告引用 7 个控件，全部标注为"读取"。**注意报告的所属表有多处"(未知表)"**——`fd_clothingType`、`fd_SumNumber`、`fd_clothingName` 的归属静态分析没认出来。这正是需要字段映射表补全的地方。

### Step 2 — 加载字段映射表

映射表澄清了归属：

| 旧 ID | 新 ID | 归属 |
|---|---|---|
| `fd_clothingType` | `mkModelId.fd_clothingType` | 主表 |
| `fd_SumNumber` | `mkModelId.fd_SumNumber` | 主表 |
| `fd_clothingCode` | `mkModelId_details.fd_clothingCode` | 明细表 |
| `fd_clothingName` | `mkModelId_details.fd_clothingName` | 明细表 |
| `fd_clothingSpecs` | `mkModelId_details.fd_clothingSpecs` | 明细表 |
| `fd_actualNumber` | `mkModelId_details.fd_actualNumber` | 明细表 |
| `fd_clothingUomtrl` | `mkModelId_details.fd_clothingUomtrl` | 明细表 |

子表自身 tableId = `mkModelId_details`。7 个映射齐全，无缺失。

### Step 3 — 逐段扫描 JS，识别调用模式

EKP 源码用 `GetXFormFieldById('id', true)` 一次性拿到某列**所有行的 DOM 数组**，然后 `.value` 遍历。这是 EKP 明细表的典型惯用法，对应 MK 的 `getRowCount` + `getControlValue(id, rowNum)` 逐行取值。

### Step 4 — 间接写入回读（本示例的关键）

**触发条件命中**：`fd_SumNumber` 报告标注"读取"，但源码里出现 `GetXFormFieldById('fd_SumNumber', true)`，且 `WriteSum` 末尾执行：

```javascript
TargetSumNumber[0].value = SumValue;   // ← 这是写入，不是读取！
```

按 [`indirect-write-patterns.md`](../../../04-migration-rules/indirect-write-patterns.md) 模式 A（`.value=` 赋值），这是**间接写入**，必须转换为主表写入 API：

```javascript
MKXFORM.setValue('mkModelId.fd_SumNumber', sumValue);
```

> 📌 **教训**：分析报告基于 API 调用点做静态分类，`GetXFormFieldById` 只被识别为"取值"，无法看出返回的 DOM 数组后续被 `.value=` 写入。**凡"读取" + `GetXFormFieldById(_, true)` 组合，一律回读源码确认。**

### Step 5 — 应用转换规则

| EKP 写法 | MK 写法 | 依据 |
|---|---|---|
| `GetXFormFieldById('fd_clothingType',true)[0].value` | `MKXFORM.getValue('mkModelId.fd_clothingType')` | api-mapping §1.1 主表取值 |
| `Target[i].value`（明细列遍历） | `MKXFORM.getControlValue('mkModelId_details.fd_xxx', i)` | detail-table-patterns 模式 1 |
| 数组长度 `Target.length` | `MKXFORM.getRowCount('mkModelId_details')` | api-mapping §1.5 |
| `TargetSumNumber[0].value=SumValue` | `MKXFORM.setValue('mkModelId.fd_SumNumber', sumValue)` | indirect-write 模式 A |
| `<a onclick="WhatType()">` 手动点击 | 函数绑定到按钮控件的自定义 JS 点击动作 | 触发方式迁移 |

`Number(x)` 累加改为 `parseFloat(x)` + `isNaN` 兜底，容错性更好。

### Step 6 — 配置 vs JS 决策

本逻辑是"多行分组聚合 + 字符串拼接 + 条件写入"，**无法配置化**，必须保留 JS。

### Step 7 — 自检

见 [`validation-checklist.md`](../../validation-checklist.md)。重点核对：无 DOM API 残留、无 EKP 全局函数、明细表行号从 0 开始、写入目标正确。

---

## 三、分组保序的处理

EKP 用 `getOnlyClothingCode` + `unique`（`Array.from(new Set(arr))`）得到**按首次出现顺序**去重的料号，再依次拼接。

MK 版若用对象 `summaryMap` 存分组、再 `for...in` 遍历，会有隐患：**JS 中对象若含纯数字字符串 key，`for...in` 会按数值升序遍历，而非插入顺序**。物料编号常是纯数字，会导致汇总顺序与 EKP 不一致。

解决方案：额外用 `order[]` 数组记录编号首次出现顺序，拼接时遍历 `order`：

```javascript
if (!summaryMap[clothingCode]) {
  order.push(clothingCode);        // 记录首次出现顺序
  summaryMap[clothingCode] = { ... };
}
// ...
for (var k = 0; k < order.length; k++) {
  var item = summaryMap[order[k]];
  // 拼接
}
```

---

## 四、跨端消息提示

服装性质不符时的警告提示，需按设备端选择 API（`message` 仅桌面端、`toast` 仅移动端）：

```javascript
if (MKXFORM.platform === 'mobile') {
  MKXFORM.toast({ content: tip, icon: 'warning' });   // 移动端瞬时通知
} else {
  MKXFORM.message.warning(tip);                        // 桌面端瞬时通知
}
```

> ⚠️ **两个坑**：
> 1. `MKXFORM.platform` 官方文档标注 `pc`/`mobile`，但**实测 PC 浏览器返回 `desktop`**。所以判断移动端用 `=== 'mobile'`（可靠），判断桌面端用 `!== 'mobile'`，**禁止 `=== 'pc'`**。
> 2. 纯提示用 `toast`（瞬时通知），**不要用 `mobileModal`**（那是带确认/取消的 confirm 弹窗）。

---

## 五、审阅中发现并修正的 4 处问题

本示例的 MK 代码来自真实迁移，经审阅修正了以下问题，作为反面教材记录：

| # | 问题 | 严重度 | 修正 |
|---|---|---|---|
| 1 | 服装性质不符时只警告、**缺 `return`**，代码继续执行汇总并写入，与 EKP 的 `if` 包裹逻辑相反 | 🔴 逻辑 Bug | 警告后补 `return` |
| 2 | 选项 value 需确认（EKP `制服/衬衫-员工领用` vs MK `制服-员工领用`）| 🟡 待确认 | 经确认新表单 value 为 `制服-员工领用`，正确 |
| 3 | `for...in summaryMap` 对数字型 key 会重排，**汇总顺序可能与 EKP 不一致** | 🟡 隐蔽 Bug | 用 `order[]` 数组保序 |
| 4 | 提示只用了 `message.warning`（仅桌面端），且 platform 判断易误用 `=== 'pc'` | 🔵 端侧适配 | 按 `=== 'mobile'` 分支，移动端用 `toast` |

---

## 六、涉及的规则文档

- [`indirect-write-patterns.md`](../../../04-migration-rules/indirect-write-patterns.md) — 模式 A（`.value=` 间接写入）
- [`detail-table-patterns.md`](../../../04-migration-rules/detail-table-patterns.md) — 模式 1（遍历所有行读取）
- [`api-mapping-table.md`](../../../04-migration-rules/api-mapping-table.md) — §1.1 取值/赋值、§1.5 明细表、§3.2 消息提示
- [`value-format-conversion.md`](../../../04-migration-rules/value-format-conversion.md) — 单选项 value 比对、数字转换
- [`mkxform-api-reference.md`](../../../03-target-mk/mkxform-api-reference.md) — §5.6 message、§5.7 toast、vars.platform
