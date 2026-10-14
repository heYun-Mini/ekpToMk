# 间接写入识别与转换

> **风险等级：🔴 极高**
> 分析报告基于**静态 API 调用分类**，不做数据流分析。因此 `elem[0].value = xxx` 这类"间接写入"**不会被标为"写入"角色**，只会被标为"读取"（因为 `GetXFormFieldById` 被识别为读取 API）。
>
> Agent **必须主动回读源码**识别这类隐藏写入。

---

## 一、什么是间接写入

### 直接写入（分析报告可识别）

```javascript
SetXFormFieldValueById("fd_xxx", "new value");
```
分析报告会将 `fd_xxx` 标为 **"写入"** 角色。

### 间接写入（分析报告识别不到）

```javascript
var elem = GetXFormFieldById("fd_xxx", true);   // 分析报告标"读取"
elem[0].value = "new value";                     // ← 实际是写入！分析报告看不到
```

分析报告只会将 `fd_xxx` 标为 **"读取"**，因为工具是基于 API 调用点分类的，不追踪返回值后续如何被使用。

---

## 二、识别规则（Agent 必执行）

### 触发条件

对**每一个**满足以下**全部**条件的控件，强制回读源码：

1. 分析报告中标注为 **"读取"** 角色（不含"写入"）
2. 源码中出现 `GetXFormFieldById(<该控件ID>, true)` 调用
3. 第二参数为 `true`（表示返回 DOM 元素数组，而非值数组）

**为什么第二参数是关键**：
- `GetXFormFieldById(id, false)` 或省略 → 通常只读值，不改 DOM
- `GetXFormFieldById(id, true)` → **拿到 DOM 引用，大概率后续会修改**

### 追踪步骤

以变量为线索，在源码中扫描：

```javascript
// Step 1: 找到 GetXFormFieldById 的调用点
var TargetInput = GetXFormFieldById("fd_CustomType", true);

// Step 2: 追踪 TargetInput 变量的所有使用点
// 在 for 循环、if 分支、函数调用中搜索 TargetInput

// Step 3: 检查每处使用是否为写入操作
TargetInput[i].value = "";                     // ← 间接写入
TargetInput[i].setAttribute("validate", ...);   // ← 间接属性修改
TargetInput[i].style.display = "none";          // ← 间接样式修改
TargetInput[i].parentNode.appendChild(span);    // ← 间接 DOM 结构修改
TargetInput[i].removeAttribute("validate");     // ← 间接属性移除
```

---

## 三、5 种间接写入模式与转换

### 模式 A：`.value =` 值赋值

**EKP 原代码：**
```javascript
var elem = GetXFormFieldById("fd_xxx", true);
elem[0].value = "new value";
```

**MK 转换（主表）：**
```javascript
MKXFORM.setValue("fdNewXxx", "new value");
```

**MK 转换（明细表某行）：**
```javascript
MKXFORM.updateControl("fdNewTable.fdNewXxx", 0, "new value");
```

**判断主表 vs 明细表**：查分析报告【JS 引用的控件】表格中的"所属表"列。

---

### 模式 B：`.setAttribute("validate", "required")` 必填切换

**EKP 原代码：**
```javascript
var elem = GetXFormFieldById("fd_xxx", true);
elem[0].setAttribute("validate", "required");
// 常伴随手动加星号
var span = document.createElement("span");
span.innerHTML = "*";
span.className = "txtstrong";
elem[0].parentNode.appendChild(span);
```

**MK 转换（一行搞定）：**
```javascript
MKXFORM.setFieldAttr("fdNewXxx", 3);   // 3 = 必填（自动带红色星号）
```

**要点：**
- **必须删除**手动创建星号 span 的所有代码
- MK 的 `setFieldAttr(id, 3)` 内置星号渲染

---

### 模式 C：`.removeAttribute("validate")` 取消必填

**EKP 原代码：**
```javascript
elem[0].removeAttribute("validate");
// 常伴随手动删星号
if (elem[0].parentNode.children.length > 1) {
  elem[0].parentNode.removeChild(elem[0].parentNode.children[1]);
}
```

**MK 转换：**
```javascript
MKXFORM.setFieldAttr("fdNewXxx", 6);   // 6 = 非必填（自动移除星号）
```

**要点：**
- **必须删除**所有 `removeChild` / `parentNode.children` 操作
- MK 的 `setFieldAttr(id, 6)` 会自动移除星号

---

### 模式 D：`.style.display = "none" / "inline"` 显示切换

**EKP 原代码：**
```javascript
elem[0].style.display = "none";    // 隐藏
elem[0].style.display = "inline";  // 显示
```

**MK 转换：**
```javascript
MKXFORM.setFieldAttr("fdNewXxx", 4);   // 4 = 隐藏
MKXFORM.setFieldAttr("fdNewXxx", 5);   // 5 = 显示
```

---

### 模式 E：`.readOnly = true/false` 只读切换

**EKP 原代码：**
```javascript
elem[0].readOnly = true;
elem[0].setAttribute("readOnly", "true");
```

**MK 转换：**
```javascript
MKXFORM.setFieldAttr("fdNewXxx", 1);   // 1 = 只读
MKXFORM.setFieldAttr("fdNewXxx", 2);   // 2 = 可编辑
```

---

## 四、复合场景：明细表遍历中的间接写入

**这是最常见的场景**，也是分析报告最容易漏报的。

**EKP 原代码（真实案例，来自「低代码表单示例.md」）：**
```javascript
function AddInput() {
  var TargetInput = GetXFormFieldById("fd_CustomType", true);
  var SourceSelect = GetXFormFieldById("fd_ChanPinType", true);
  var RequiredSpan = document.createElement("span");
  RequiredSpan.innerHTML = "*";
  RequiredSpan.className = "txtstrong";

  for (i = 0; i < SourceSelect.length; i++) {
    if (SourceSelect[i].value == "0") {
      if (!(TargetInput[i].hasAttribute("validate"))) {
        TargetInput[i].style.display = "inline";
        TargetInput[i].setAttribute("validate", "required");
        TargetInput[i].parentNode.appendChild(RequiredSpan);
      }
    } else {
      TargetInput[i].style.display = "none";
      TargetInput[i].removeAttribute("validate");
      TargetInput[i].value = "";
      if (TargetInput[i].parentNode.children.length > 1) {
        TargetInput[i].parentNode.removeChild(TargetInput[i].parentNode.children[1]);
      }
    }
  }
}
```

**分析报告的标注**（不完整）：
- `fd_ChanPinType` — 读取（✔️ 正确）
- `fd_CustomType` — **读取**（❌ 实际有大量写入！）

**MK 转换后：**
```javascript
function updateCustomTypeByRow() {
  var rowCount = MKXFORM.getRowCount("fdNewTable");
  for (var i = 0; i < rowCount; i++) {
    var chanPinType = MKXFORM.getControlValue("fdNewTable.fdNewChanPinType", i);

    if (chanPinType == "0") {
      // 显示 + 必填（MK 自动渲染星号）
      MKXFORM.setDetailFieldItemAttr("fdNewTable", 5, i, "fdNewCustomType");
      MKXFORM.setDetailFieldItemAttr("fdNewTable", 3, i, "fdNewCustomType");
    } else {
      // 隐藏 + 非必填 + 清空值
      MKXFORM.setDetailFieldItemAttr("fdNewTable", 4, i, "fdNewCustomType");
      MKXFORM.setDetailFieldItemAttr("fdNewTable", 6, i, "fdNewCustomType");
      MKXFORM.updateControl("fdNewTable.fdNewCustomType", i, "");
    }
  }
}
```

**转换要点：**
1. 删除 `document.createElement("span")` 及所有 span 相关代码
2. 删除 `parentNode.appendChild` / `removeChild` / `children.length` 判断
3. `hasAttribute("validate")` 判断可省略 —— MK 的 `setFieldAttr` 幂等，重复调用无副作用
4. `style.display` → `setDetailFieldItemAttr(_, 4/5, i, _)`
5. `setAttribute("validate","required")` → `setDetailFieldItemAttr(_, 3, i, _)`
6. `value = ""` → `updateControl(id, i, "")`
7. `SourceSelect.length` → `MKXFORM.getRowCount(tableId)`
8. `SourceSelect[i].value` → `MKXFORM.getControlValue(id, i)`

---

## 五、Agent 自检清单

对**每一个**"读取"角色 + `GetXFormFieldById(_, true)` 的控件，回答：

- [ ] 是否在源码中定位到 `GetXFormFieldById(<id>, true)` 的调用点？
- [ ] 是否追踪了返回值变量的所有使用点？
- [ ] 是否检查了 `.value=` / `.setAttribute` / `.removeAttribute` / `.style.` / `.readOnly=` / `.parentNode.` 6 类写入模式？
- [ ] 每处间接写入是否已转换为对应 MK API？
- [ ] 是否在 `migration-notes.md` 的"间接写入处理"章节记录了每处的位置和转换？
- [ ] 是否在 `indirectWrites[]` 中记录了所有位置（供后续 self-check 验证）？

**若任一控件漏查，迁移结果必然存在缺陷。**

---

## 六、常见错误对照

| ❌ 错误转换 | ✅ 正确转换 | 原因 |
|---|---|---|
| 保留 `document.createElement("span")` | 删除 | MK 自动渲染星号 |
| 保留 `elem.parentNode.appendChild(span)` | 删除，改用 `setFieldAttr(id, 3)` | MK 声明式渲染 |
| `MKXFORM.setValue(id, elem.value)` | `MKXFORM.setValue(id, "具体值")` | MK 中 elem 不存在 |
| `if (elem.hasAttribute("validate"))` | 删除判断，直接 `setFieldAttr(id, 3)` | MK API 幂等 |
| `elem[i].value = ""` 保留数组下标 | `MKXFORM.updateControl("t.f", i, "")` | MK 用行号参数 |
| `for(i=0; i<elem.length; i++)` | `for(var i=0; i<MKXFORM.getRowCount("t"); i++)` | MK 无 DOM 数组 |

---

## 七、相关文档

- [`api-mapping-table.md §2`](./api-mapping-table.md) — DOM 惯用法映射
- [`detail-table-patterns.md`](./detail-table-patterns.md) — 明细表转换模式
- [`../01-contracts/analysis-report-spec.md`](../01-contracts/analysis-report-spec.md) — 分析报告已知限制说明
- [`../05-agent/examples/L3-indirect-write/`](../05-agent/examples/L3-indirect-write/) — 完整示例
