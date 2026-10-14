# 转换决策树

> Agent 在 Step 5（workflow.md）中遇到每个 EKP 代码模式时，按本决策树选择转换路径。
> 本树是 [`api-mapping-table.md`](../04-migration-rules/api-mapping-table.md) 的**流程化视图**。

---

## 主决策树

```
                    ┌─────────────────────────┐
                    │ 扫描到一处 EKP 代码模式 │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ↓                  ↓                  ↓
      ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
      │ EKP xform API │  │ DOM 操作      │  │ 其他（AJAX/   │
      │ 调用          │  │               │  │ alert/定时器）│
      └───────┬───────┘  └───────┬───────┘  └───────┬───────┘
              │                  │                  │
              ↓                  ↓                  ↓
         【子树 A】         【子树 B】         【子树 C】
```

---

## 子树 A：EKP xform API 调用

```
                    ┌─────────────────────────┐
                    │ EKP xform API 调用      │
                    └────────────┬────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ↓                       ↓                       ↓
  ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
  │ Get 系列     │       │ Set 系列     │       │ Attach 系列  │
  │ (读取)       │       │ (写入)       │       │ (监听)       │
  └──────┬───────┘       └──────┬───────┘       └──────┬───────┘
         │                      │                      │
         ↓                      ↓                      ↓
    ById 还是 ByLabel?     ById 还是 ByLabel?     ById 还是 ByLabel?
         │                      │                      │
    ┌────┴────┐            ┌────┴────┐            ┌────┴────┐
    ↓         ↓            ↓         ↓            ↓         ↓
  ById     ByLabel       ById     ByLabel       ById     ByLabel
    │         │            │         │            │         │
    │         ↓            │         ↓            │         ↓
    │    【子树 D】        │    【子树 D】        │    【子树 D】
    │    label反查         │    label反查         │    label反查
    ↓                      ↓                      ↓
  控件属于主表还是明细表?  控件属于主表还是明细表?  直接转换
    │                      │                      │
  ┌─┴─┐                  ┌─┴─┐                    ↓
  ↓   ↓                  ↓   ↓            MKXFORM.onChange(newId, fn)
主表 明细表             主表 明细表        回调签名 (value, extValue)
  │   │                  │   │
  ↓   ↓                  ↓   ↓
getValue  getControlValue  setValue  updateControl
(newId)   (id, rowNum)     (newId,v) (id, rowNum, v)
```

---

## 子树 B：DOM 操作

```
                    ┌─────────────────────────┐
                    │ DOM 操作                │
                    └────────────┬────────────┘
                                 │
      ┌──────────────────────────┼──────────────────────────┐
      ↓                          ↓                          ↓
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│ 值读写       │         │ 属性操作     │         │ 样式/结构    │
│ .value=      │         │ setAttribute │         │ .style.      │
│ .innerText   │         │ removeAttr   │         │ createElement│
└──────┬───────┘         └──────┬───────┘         └──────┬───────┘
       │                        │                        │
       ↓                        ↓                        ↓
  是读取还是写入?          修改什么属性?            是样式还是结构?
       │                        │                        │
  ┌────┴────┐              ┌────┼────┬────┐         ┌────┴────┐
  ↓         ↓              ↓    ↓    ↓    ↓         ↓         ↓
 读        写           validate readOnly display  样式      结构
  │         │              │    │    │              │         │
  ↓         ↓              ↓    ↓    ↓              ↓         ↓
getValue  setValue      必填?  只读? 显隐?      setStyle   ❌禁止
或        或            ↓      ↓     ↓          或         必须重构
getValueText updateCtl  3/6    1/2   4/5        setProps   为MK API
                       ↓      ↓     ↓
                  setFieldAttr(id, 1~6)
```

**关键规则**：
- `.value =` → `setValue` / `updateControl`
- `.setAttribute("validate","required")` → `setFieldAttr(id, 3)`
- `.removeAttribute("validate")` → `setFieldAttr(id, 6)`
- `.readOnly = true` → `setFieldAttr(id, 1)`
- `.style.display = "none"` → `setFieldAttr(id, 4)`
- `.style.display = "inline"` → `setFieldAttr(id, 5)`
- `.style.color = "red"` → `setStyle(id, {color:'red'}, 'content')`
- `createElement` / `appendChild` / `removeChild` → **删除**，MK 自动渲染

---

## 子树 C：其他（AJAX / 提示 / 定时器）

```
                    ┌─────────────────────────┐
                    │ 其他                    │
                    └────────────┬────────────┘
                                 │
      ┌──────────────────────────┼──────────────────────────┐
      ↓                          ↓                          ↓
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│ AJAX         │         │ 提示框       │         │ 定时器       │
│ $.ajax       │         │ alert        │         │ setTimeout   │
│ fetch        │         │ confirm      │         │ setInterval  │
└──────┬───────┘         └──────┬───────┘         └──────┬───────┘
       │                        │                        │
       ↓                        ↓                        ↓
  调用什么后端?            PC 还是移动端?           用途是什么?
       │                        │                        │
  ┌────┼────┬────┐         ┌────┴────┐              ┌────┴────┐
  ↓    ↓    ↓    ↓         ↓         ↓              ↓         ↓
通用  TIC  ORG  LBPM     PC        移动端         等DOM     业务延时
HTTP                            就绪
  │    │    │    │         │         │              │         │
  ↓    ↓    ↓    ↓         ↓         ↓              ↓         ↓
ajax callTic callOrg callLbpm  modal/    mobileModal/ ❌删除   保留
                              message   toast                  (缩短)
```

**关键规则**：
- `$.ajax` / `fetch` → `MKXFORM.ajax`
- EKP 后端组织接口 → `MKXFORM.callOrg`
- EKP 集成平台 → `MKXFORM.callTic`
- EKP 流程接口 → `MKXFORM.callLbpm`
- `alert` → `MKXFORM.modal` (PC) 或 `MKXFORM.mobileModal` (移动端)
- `confirm` → `MKXFORM.modal({onOk, onCancel})`
- 简单提示 → `MKXFORM.message.success/error/warning/info`
- `setTimeout(fn, 1000)` 用于等 DOM → **删除**
- `$(function(){...})` → **删除**（MK JS 面板已在合适时机执行）

---

## 子树 D：ByLabel 反查

```
                    ┌─────────────────────────┐
                    │ ByLabel 引用            │
                    └────────────┬────────────┘
                                 │
                                 ↓
                    在字段映射表中按 label 查找
                                 │
                    ┌────────────┼────────────┐
                    ↓            ↓            ↓
              ┌─────────┐  ┌─────────┐  ┌─────────┐
              │ 0 匹配  │  │ 1 匹配  │  │ 多匹配  │
              └────┬────┘  └────┬────┘  └────┬────┘
                   │            │            │
                   ↓            ↓            ↓
              ❌ 中止      取 newId      ⚠️ 记录警告
              报错:        继续转换      取第一个
              label 不存在              继续转换
```

详见 [`label-to-id-patterns.md`](../04-migration-rules/label-to-id-patterns.md)。

---

## 子树 E：明细表行级引用

```
                    ┌─────────────────────────┐
                    │ 明细表行级访问          │
                    └────────────┬────────────┘
                                 │
                                 ↓
                    ID 格式是 "tableId.rowIdx.fieldId"?
                                 │
                    ┌────────────┴────────────┐
                    ↓                         ↓
                  是                         否
                    │                         │
                    ↓                         ↓
              拆分为三段                  直接按主表处理
              tableId / rowIdx / fieldId
                    │
                    ↓
              通过 idMap 映射 tableId 和 fieldId
                    │
                    ↓
              组合为 "newTableId.newFieldId" + rowNum
                    │
                    ↓
              选择 API:
              - 读: getControlValue(id, rowNum)
              - 写: updateControl(id, rowNum, value)
              - 属性: setDetailFieldItemAttr(tableId, val, rowNum, fieldId)
```

详见 [`detail-table-patterns.md`](../04-migration-rules/detail-table-patterns.md)。

---

## 子树 F：全局钩子

```
                    ┌─────────────────────────┐
                    │ XFormOnValueChange 或   │
                    │ XFormOnValueChangeFuns  │
                    └────────────┬────────────┘
                                 │
                                 ↓
                    内部是否按 controlId 分支?
                                 │
                    ┌────────────┴────────────┐
                    ↓                         ↓
                  是                         否
                    │                         │
                    ↓                         ↓
              分支数 ≤ 10?              【模式 3】
                    │                   封装统一分发器
              ┌─────┴─────┐             为所有字段注册 onChange
              ↓           ↓
            是           否
              │           │
              ↓           ↓
        【模式 1】    【模式 3】
        拆为多个      封装分发器
        onChange
```

详见 [`global-hook-patterns.md`](../04-migration-rules/global-hook-patterns.md)。

---

## 子树 G：间接写入

```
                    ┌─────────────────────────┐
                    │ 分析报告标"读取"        │
                    │ 但源码有 GetXFormField- │
                    │ ById(_, true)           │
                    └────────────┬────────────┘
                                 │
                                 ↓
                    追踪返回值变量的所有使用点
                                 │
                                 ↓
                    是否存在以下 6 类写入?
                    - .value =
                    - .setAttribute
                    - .removeAttribute
                    - .style.xxx =
                    - .readOnly =
                    - .parentNode.appendChild/removeChild
                                 │
                    ┌────────────┴────────────┐
                    ↓                         ↓
                  是                         否
                    │                         │
                    ↓                         ↓
              记录到 indirectWrites[]     确认为纯读取
              按对应模式转换              正常转换
```

详见 [`indirect-write-patterns.md`](../04-migration-rules/indirect-write-patterns.md)。

---

## 快速查表（按 EKP 关键字）

| EKP 关键字 | 走哪个子树 | 最终 MK API |
|---|---|---|
| `GetXFormFieldValueById` | A → Get → ById | `getValue` / `getControlValue` |
| `SetXFormFieldValueById` | A → Set → ById | `setValue` / `updateControl` |
| `GetXFormFieldById` | A → Get → ById | `$` / 配合间接写入检查 |
| `AttachXFormValueChangeEventById` | A → Attach → ById | `onChange` |
| `GetXFormFieldValueByLabel` | A → Get → ByLabel → D | 反查后 `getValue` |
| `XFormOnValueChange` | F | 拆解为多个 `onChange` |
| `.value =` | B → 值读写 → 写 | `setValue` / `updateControl` |
| `.setAttribute("validate",...)` | B → 属性 → validate | `setFieldAttr(id, 3)` |
| `.style.display` | B → 样式 → display | `setFieldAttr(id, 4/5)` |
| `.style.color` 等 | B → 样式 → 其他 | `setStyle` |
| `createElement` / `appendChild` | B → 结构 | ❌ 删除 |
| `$.ajax` | C → AJAX → 通用 | `MKXFORM.ajax` |
| `alert` / `confirm` | C → 提示 → PC | `MKXFORM.modal` |
| `setTimeout(fn, 1000)` 等 DOM | C → 定时器 → 等DOM | ❌ 删除 |
| `for(i=0;i<elems.length;i++)` | E | `getRowCount` + 循环 |
| `"tableId.0.fieldId"` 字符串 | E | 拆分为双参数 |

---

## 相关文档

- [`../04-migration-rules/api-mapping-table.md`](../04-migration-rules/api-mapping-table.md) — 完整映射表
- [`workflow.md`](./workflow.md) — 工作流
- [`system-prompt.md`](./system-prompt.md) — 硬约束
