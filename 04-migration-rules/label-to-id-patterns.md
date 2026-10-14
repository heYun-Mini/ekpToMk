# ByLabel 引用处理模式

> **风险等级：🟡 中**
> MK **不提供** ByLabel 系列 API。EKP 中通过 label（显示文字）引用控件的代码，必须**先反查 ID**才能迁移。

---

## 一、EKP ByLabel API 清单

| EKP API | 语义 |
|---|---|
| `GetXFormFieldByLabel(label, nocache)` | 根据 label 获取 DOM 对象数组 |
| `GetXFormFieldValueByLabel(label, nocache)` | 根据 label 获取值数组 |
| `SetXFormFieldValueByLabel(label, value, nocache)` | 根据 label 设置值 |
| `AttachXFormValueChangeEventByLabel(label, fn)` | 根据 label 绑定值变化监听 |

**EKP 使用示例：**
```javascript
var v = GetXFormFieldValueByLabel("产品类型")[0];
SetXFormFieldValueByLabel("申请单位", "研发部");
AttachXFormValueChangeEventByLabel("申请人", function() { /* ... */ });
```

---

## 二、MK 侧无对应 API

**MK MKXFORM 对象中不存在 ByLabel 系列方法。** 所有 MK API 都基于 ID：
- `MKXFORM.getValue(id)`
- `MKXFORM.setValue(id, value)`
- `MKXFORM.onChange(id, fn)`

---

## 三、转换策略：字段映射表反查

### 3.1 反查流程

```
EKP JS 中: GetXFormFieldValueByLabel("产品类型")
                       │
                       ↓
Step 1: 在字段映射表中按 label 查找
        ┌──────────────────────────────────┐
        │ 3. 旧ID: fd_ChanPinType          │
        │    label: 产品类型 | 类型: select │
        │    所属: 子表: 产品拆解明细表     │
        │    新ID: fdNewChanPinType         │
        └──────────────────────────────────┘
                       │
                       ↓
Step 2: 得到旧ID = fd_ChanPinType，新ID = fdNewChanPinType
                       │
                       ↓
Step 3: 判断所属表 → 子表，需要用明细表 API
                       │
                       ↓
Step 4: 转换为 MK 代码
        MKXFORM.getControlValue("fdNewTable.fdNewChanPinType", rowNum)
```

### 3.2 反查伪代码（Agent 内部执行）

```javascript
function resolveByLabel(label, fieldMapping) {
  // 在字段映射表中查找 label 匹配的条目
  var matches = fieldMapping.filter(function(item) {
    return item.label === label;
  });

  if (matches.length === 0) {
    // ❌ 找不到 → 中止并报错
    throw new Error("ByLabel 引用无法解析: label='" + label + "' 在字段映射表中不存在");
  }

  if (matches.length > 1) {
    // ⚠️ 多个匹配 → 记录警告，取第一个（或请求用户澄清）
    console.warn("ByLabel 引用有歧义: label='" + label + "' 匹配到 " + matches.length + " 个控件");
  }

  return matches[0];   // { oldId, newId, type, owner, role }
}
```

---

## 四、4 种典型转换

### 模式 1：ByLabel 取值

**EKP：**
```javascript
var v = GetXFormFieldValueByLabel("产品类型")[0];
```

**MK（主表）：**
```javascript
var v = MKXFORM.getValue("fdNewChanPinType");
```

**MK（明细表某行）：**
```javascript
var v = MKXFORM.getControlValue("fdNewTable.fdNewChanPinType", 0);
```

---

### 模式 2：ByLabel 赋值

**EKP：**
```javascript
SetXFormFieldValueByLabel("申请单位", "研发部");
```

**MK（主表）：**
```javascript
MKXFORM.setValue("fdNewApplyDept", "研发部");
```

**MK（明细表）：**
```javascript
MKXFORM.updateControl("fdNewTable.fdNewApplyDept", rowNum, "研发部");
```

---

### 模式 3：ByLabel 监听

**EKP：**
```javascript
AttachXFormValueChangeEventByLabel("申请人", function() {
  var applicant = GetXFormFieldValueByLabel("申请人")[0];
  // ...
});
```

**MK：**
```javascript
MKXFORM.onChange("fdNewApplicant", function(value) {
  // value 已是新值，无需再取
  // ...
});
```

---

### 模式 4：ByLabel 获取 DOM 后间接操作

**EKP：**
```javascript
var elem = GetXFormFieldByLabel("产品类型")[0];
elem.style.display = "none";
elem.setAttribute("validate", "required");
```

**MK：**
```javascript
// 先反查得到新ID
MKXFORM.setFieldAttr("fdNewChanPinType", 4);   // 隐藏
MKXFORM.setFieldAttr("fdNewChanPinType", 3);   // 必填
```

---

## 五、Agent 处理清单

在 Step 5.5（workflow.md）中，遇到 ByLabel 引用时按以下顺序处理：

- [ ] 定位所有 ByLabel API 调用（`GetXFormFieldByLabel` / `GetXFormFieldValueByLabel` / `SetXFormFieldValueByLabel` / `AttachXFormValueChangeEventByLabel`）
- [ ] 提取每处的 label 参数
- [ ] 在字段映射表中按 label 反查
- [ ] **找不到 → 立即中止**，报错：
  ```
  ❌ 迁移中止
  原因: ByLabel 引用无法解析
  详情: label='xxx' 在字段映射表中不存在
  需用户处理:
    1. 检查字段映射表是否遗漏该字段
    2. 若原 EKP JS 中该 label 拼写与实际控件 label 不一致，请手动指定对应新 ID
  ```
- [ ] **多个匹配 → 记录警告**，在 `migration-notes.md` 中标注需人工确认
- [ ] 得到新 ID 后，按控件所属表（主表/明细表）选择合适的 MK API
- [ ] 转换后**不得残留** `ByLabel` 字样

---

## 六、常见陷阱

### 陷阱 1：label 中含空格或特殊字符

EKP 中 label 可能包含空格、括号、中英文标点。反查时需**严格全等**匹配，不做 trim / 大小写转换。

```javascript
// 字段映射表中：label: "产品类型（新）"
GetXFormFieldValueByLabel("产品类型(新)")   // ❌ 半角括号，不匹配
GetXFormFieldValueByLabel("产品类型（新）") // ✅ 全角括号，匹配
```

### 陷阱 2：label 在多语言环境下变化

若表单支持多语言，label 可能随语言切换。**迁移建议**：
- 在 `migration-notes.md` 中标注："此处原用 ByLabel，建议改为 ById 以提升稳定性"
- MK 中统一使用 ID，天然规避此问题

### 陷阱 3：label 与字段类型不一致

同一表单中可能有多个 label 相似的字段（如"申请人"和"申请人姓名"）。反查时**必须精确匹配**，避免误关联。

### 陷阱 4：字段映射表中 label 缺失

字段映射表模板中的 label 来自分析报告，若分析报告本身解析异常，label 可能为空。**Agent 检查**：Step 2 中若发现 label 为空的映射项，标记为"低可信度"，遇到 ByLabel 反查时优先跳过。

---

## 七、迁移建议：从源头避免 ByLabel

ByLabel 引用是 EKP 时代的"便利 API"，但**稳定性差**（依赖 UI 文案）。迁移到新系统后：

1. **建议用户在字段映射表中记录 label**，方便反查
2. **迁移后的 MK JS 全部使用 ID**，不再依赖 label
3. 若原 EKP 代码中 ByLabel 使用频繁，可在 `migration-notes.md` 中建议用户：
   > "原表单大量使用 ByLabel API，迁移后已全部改为 ById。建议后续维护时也统一使用 ID，避免因 UI 文案调整导致 JS 失效。"

---

## 八、相关文档

- [`api-mapping-table.md §1.1`](./api-mapping-table.md) — 取值/赋值 API 映射
- [`../01-contracts/analysis-report-spec.md`](../01-contracts/analysis-report-spec.md) — 分析报告"按 label 引用"章节
- [`../01-contracts/field-mapping-spec.md`](../01-contracts/field-mapping-spec.md) — 字段映射表规范
