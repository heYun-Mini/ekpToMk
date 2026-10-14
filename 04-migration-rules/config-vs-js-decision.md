# 配置 vs JS 代码决策规则

> **核心原则**：MK 平台提供强大的**声明式配置能力**，许多 EKP 时代必须写 JS 实现的逻辑，在 MK 中可以通过表单设计器配置直接完成。
>
> Agent 在 Step 6（workflow.md）中必须扫描 JS 草稿，识别可配置化的部分并从 JS 中移除，仅在 `migration-notes.md` 中记录配置建议。

---

## 一、决策矩阵

| 场景 | EKP 实现方式 | MK 推荐方式 | 决策 |
|---|---|---|---|
| **静态默认值** | `fd_values.defaultValue` 属性 | 字段配置 → 默认值 | ✅ **配置化** |
| **公式默认值** | `defaultValue="$组织架构.xxx$"` | 字段配置 → 公式 | ✅ **配置化** |
| **静态选项列表** | `fd_values.items` 属性 | 字段配置 → 选项 | ✅ **配置化** |
| **单条件显示/隐藏** | JS 监听 A 变化 → 设 B 显隐 | 字段配置 → 显示条件 | ✅ **配置化** |
| **单条件必填** | JS 监听 A 变化 → 设 B 必填 | 字段配置 → 必填条件 | ✅ **配置化** |
| **单条件只读** | JS 监听 A 变化 → 设 B 只读 | 字段配置 → 只读条件 | ✅ **配置化** |
| **多条件复合联动** | JS 复杂 if/else | JS 代码 | ❌ **保留 JS** |
| **跨字段计算** | JS 取值 → 计算 → 赋值 | 字段配置 → 公式 或 JS | ⚠️ **视复杂度** |
| **异步数据加载** | AJAX → 填充选项 | 集成平台配置 或 JS | ⚠️ **视场景** |
| **明细表遍历处理** | JS 循环 | JS 代码 | ❌ **保留 JS** |
| **提交前复杂校验** | JS 校验 | JS 代码（beforeSubmit） | ❌ **保留 JS** |
| **业务流程集成** | JS 调用后端 | JS 代码（callTic/callOrg） | ❌ **保留 JS** |

---

## 二、应配置化的 6 类场景（详细）

### 场景 1：静态默认值

**EKP HTML：**
```html
fd_values='{..., defaultValue:"台", ...}'
```

**EKP JS（有时会重复设置）：**
```javascript
SetXFormFieldValueById("fd_unit", "台");
```

**MK 处理：**
- ❌ 不生成 JS
- ✅ 在 `migration-notes.md` 中记录：
  ```
  建议配置化:
  - 字段: fdNewUnit (原 fd_unit, label: 单位)
  - 配置项: 默认值 = "台"
  - 位置: MK 表单设计器 → 选中字段 → 属性面板 → 默认值
  ```

---

### 场景 2：公式默认值

**EKP HTML：**
```html
fd_values='{..., defaultValue:"$组织架构.获取组织架构对象全路径$($申请人$)", ...}'
```

**MK 处理：**
- ❌ 不生成 JS（MK 字段配置支持公式）
- ✅ 记录：
  ```
  建议配置化:
  - 字段: fdNewApplyUnit (原 fd_apply_unit, label: 申请单位)
  - 配置项: 默认值公式 = 组织架构.获取组织架构对象全路径(申请人)
  - 位置: MK 表单设计器 → 字段属性 → 默认值 → 公式模式
  - 备注: MK 公式语法可能与 EKP 略有差异，需人工核对
  ```

**⚠️ 注意**：MK 的公式语法与 EKP 不完全一致。Agent 应记录原公式，由人工在 MK 设计器中重新配置。

---

### 场景 3：静态选项列表

**EKP HTML：**
```html
fd_values='{..., items:"燃气热水器&amp;#;电热水器&amp;#;烟机", ...}'
```

**MK 处理：**
- ❌ 不生成 JS
- ✅ 记录：
  ```
  建议配置化:
  - 字段: fdNewChanPinType (原 fd_ChanPinType, label: 产品类型)
  - 配置项: 选项列表 = [燃气热水器, 电热水器, 烟机, ...]
  - 位置: MK 表单设计器 → 字段属性 → 选项
  ```

---

### 场景 4：单条件显示/隐藏

**EKP JS：**
```javascript
AttachXFormValueChangeEventById("fd_A", function() {
  var v = GetXFormFieldValueById("fd_A")[0];
  var bElem = GetXFormFieldById("fd_B", true)[0];
  if (v === "1") {
    bElem.style.display = "inline";
  } else {
    bElem.style.display = "none";
  }
});
```

**MK 处理：**
- ❌ 不生成 JS
- ✅ 记录：
  ```
  建议配置化:
  - 字段: fdNewB (原 fd_B)
  - 配置项: 显示条件 = 当 fdNewA == "1" 时显示
  - 位置: MK 表单设计器 → 字段属性 → 显示条件
  ```

**判断标准**：
- ✅ 配置化：**单个**条件、**等值**判断、**只影响一个**字段
- ❌ 保留 JS：多条件复合、涉及计算、影响多个字段

---

### 场景 5：单条件必填

**EKP JS：**
```javascript
AttachXFormValueChangeEventById("fd_ChanPinType", function() {
  var v = GetXFormFieldValueById("fd_ChanPinType")[0];
  var elem = GetXFormFieldById("fd_CustomType", true)[0];
  if (v === "0") {
    elem.setAttribute("validate", "required");
  } else {
    elem.removeAttribute("validate");
  }
});
```

**MK 处理：**
- ⚠️ **部分配置化**：
  - 必填条件可配置化
  - 但若同时涉及"清空值"等副作用，需保留 JS
- ✅ 记录：
  ```
  建议配置化:
  - 字段: fdNewCustomType
  - 配置项: 必填条件 = 当 fdNewChanPinType == "0" 时必填

  保留 JS 部分:
  - 清空值逻辑（else 分支中的 setValue("")），因 MK 配置化必填不会自动清值
  ```

---

### 场景 6：单条件只读

**EKP JS：**
```javascript
if (docStatus === "approved") {
  elem.readOnly = true;
}
```

**MK 处理：**
- ✅ 通常由 MK **流程配置**处理（审批通过后表单自动只读），无需 JS
- ✅ 记录：
  ```
  建议配置化:
  - 场景: 审批通过后全表单只读
  - 配置位置: MK 流程配置 → 节点权限 → 表单字段权限
  - 备注: 无需 JS 实现
  ```

---

## 三、必须保留 JS 的 5 类场景

### 场景 A：多条件复合联动

```javascript
// 3 个以上条件组合
if (a === "1" && b > 100 && c !== "") {
  // 复杂逻辑
}
```
**→ 保留 JS**（MK 配置化不支持复杂表达式）

### 场景 B：跨字段计算

```javascript
var total = price * quantity - discount;
MKXFORM.setValue("fdNewTotal", total);
```
**→ 保留 JS**（除非 MK 字段配置支持公式，则优先公式）

### 场景 C：明细表遍历处理

```javascript
for (var i = 0; i < rowCount; i++) {
  // 逐行处理
}
```
**→ 保留 JS**（MK 无配置化的行级处理）

### 场景 D：异步数据加载

```javascript
MKXFORM.ajax({...}, function(err, res) {
  // 根据返回数据填充字段
});
```
**→ 保留 JS**（除非用 MK 集成平台配置）

### 场景 E：提交前复杂校验

```javascript
MKXFORM.beforeSubmit(function() {
  // 多字段联合校验
});
```
**→ 保留 JS**

---

## 四、Agent 决策流程

在 Step 6（workflow.md）中，对 `mkJsDraft` 的每个代码段执行：

```
┌─────────────────────────────────────────┐
│ 该段代码是否只涉及单个字段的属性切换？   │
│ （显示/隐藏/必填/只读）                  │
└───────────────┬─────────────────────────┘
                │
       ┌────────┴────────┐
       ↓ 是              ↓ 否
┌──────────────┐   ┌──────────────────┐
│ 条件是否单一？│   │ 保留 JS          │
│ （单字段等值）│   │ 记录到 notes     │
└──────┬───────┘   └──────────────────┘
       │
  ┌────┴────┐
  ↓ 是      ↓ 否
┌──────┐  ┌──────────┐
│配置化│  │ 保留 JS  │
│记录到│  │ 记录到   │
│notes │  │ notes    │
└──────┘  └──────────┘
```

---

## 五、配置化建议的输出格式

在 `migration-notes.md` 中，配置化建议应单独成节：

```markdown
## 配置化建议

以下逻辑**不应**写入 MK JS 代码，建议在 MK 表单设计器中通过配置实现：

### 1. 字段默认值
| 字段新ID | 原字段 | 默认值 | 配置位置 |
|---|---|---|---|
| fdNewUnit | fd_unit (单位) | "台" | 字段属性 → 默认值 |

### 2. 字段选项
| 字段新ID | 原字段 | 选项 | 配置位置 |
|---|---|---|---|
| fdNewChanPinType | fd_ChanPinType (产品类型) | 燃气热水器/电热水器/... | 字段属性 → 选项 |

### 3. 显示条件
| 字段新ID | 条件 | 配置位置 |
|---|---|---|
| fdNewCustomType | 当 fdNewChanPinType == "0" 时显示 | 字段属性 → 显示条件 |

### 4. 必填条件
| 字段新ID | 条件 | 配置位置 |
|---|---|---|
| fdNewCustomType | 当 fdNewChanPinType == "0" 时必填 | 字段属性 → 必填条件 |

### 5. 公式默认值
| 字段新ID | 原公式（EKP） | 备注 |
|---|---|---|
| fdNewApplyUnit | `$组织架构.获取组织架构对象全路径$($申请人$)` | 需在 MK 设计器中用 MK 公式语法重新配置 |
```

---

## 六、常见错误

| ❌ 错误 | ✅ 正确 |
|---|---|
| 保留 `MKXFORM.setFieldAttr(id, 4)` 实现"A=X 时隐藏 B" | 改为配置化，从 JS 中移除 |
| 保留 `MKXFORM.setValue(id, "台")` 设置静态默认值 | 改为配置化默认值 |
| 配置化建议只写"建议配置"不写具体位置 | 必须写明"字段属性 → 显示条件"等具体路径 |
| 把所有 JS 都配置化 | 复杂逻辑必须保留 JS |
| 忽略公式默认值的语法差异 | 必须标注"需在 MK 中重新配置公式" |

---

## 七、相关文档

- [`../03-target-mk/mkxform-api-reference.md`](../03-target-mk/mkxform-api-reference.md) — MK API 手册
- [`../02-source-ekp/form-html-spec.md`](../02-source-ekp/form-html-spec.md) — EKP HTML 中的 `fd_values` 属性说明
- [`workflow.md §Step 6`](../05-agent/workflow.md) — 配置化决策在工作流中的位置
