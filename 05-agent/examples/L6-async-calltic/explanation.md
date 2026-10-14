# L6 示例讲解：异步数据集调用 GetJdbcData → callTic

> **难度**：L6（异步数据加载）
> **场景**：制服衬衫领用明细表逐行调 SPM 接口查询最后领用时间，回填到明细行
> **核心教学点**：GetJdbcData→callTic 接口契约分析、异步闭包陷阱、onChange 绑定入口函数、JS 面板自包含结构
> **本示例经真实案例测试通过后归档**，含 5 处关键修正（见 §六）。

---

## 一、输入

| 文件 | 内容 |
|---|---|
| [`input-report.md`](./input-report.md) | 分析报告（TZ 片段摘取）：1 个 JSP 片段、4 个引用控件、1 次 GetJdbcData 调用 |
| [`input-mapping.txt`](./input-mapping.txt) | 字段映射：4 个明细表字段 + interfaceCode + 入参出参 schema |
| [`ekp-source.js`](./ekp-source.js) | EKP 原始 JSP 片段 JS |

**输出**：[`mk-output.js`](./mk-output.js)

---

## 二、按工作流逐步分析

### Step 1 — 解析分析报告

报告引用 4 个控件：`fd_clothingName`（物料名称）、`fd_actualUserCode`（工号）、`fd_lastTime`（最后领用时间）、`fd_usedYear`（已领用年限）。

**报告标注盲区**：`fd_lastTime` 和 `fd_usedYear` 标注为"读取"，但源码中存在 `lastTime[line_Index].value = ...` 间接写入。凡"读取" + `GetXFormFieldById(_, true)` 组合，一律回读源码确认。

### Step 2 — 加载字段映射表

4 个字段均在同一明细表 `mk_model_20260814t18f5_d_79ls9`，字段 ID 与 EKP 相同（未改名）。

映射表还包含 MK 侧集成接口信息：
- interfaceCode: `function_2d58a9ba2b3068f4`
- 入参: `{ name: string, empId: string }`（注意大小写与 EKP 的 `NAME`/`EMPID` 不同）
- 出参: `res.data` 为数组 `[{ yymmdd: string, years: number }]`

### Step 3 — 逐段扫描 JS，识别调用模式

| EKP 模式 | 出现位置 | MK 对应 |
|---|---|---|
| `AttachXFormValueChangeEventById(id, fn)` | 注册 onChange | 设计器绑定 onChange 入口函数 |
| `GetXFormFieldById(id, true)[i].value` | 逐行读取 | `MKXFORM.getControlValue(tableId + '.' + fieldId, i)` |
| `elems[i].value = x` | 间接写入（清空/回填） | `MKXFORM.updateControl(tableId + '.' + fieldId, rowNum, value)` |
| `document.getElementById('getLastTime').onclick = fn` | DOM 事件绑定 | 按钮控件绑定点击入口函数 |
| `GetJdbcData(id, json, "SPM", callback)` | 异步数据集查询 | `MKXFORM.callTic({ interfaceCode, param }, callback)` |
| `alert(msg)` | 阻塞式提示 | 跨端非阻塞提示（message/toast） |

### Step 4 — 接口契约分析（本示例核心）

按 [`dataset-jdbc-to-calltic.md`](../../../04-migration-rules/dataset-jdbc-to-calltic.md) 的强制检查流程：

| 用途 | EKP 字段 | MK 字段 | 备注 |
|---|---|---|---|
| 入参-物料名称 | `NAME`（大写） | `name`（小写） | ⚠️ 大小写不同 |
| 入参-工号 | `EMPID`（大写） | `empId`（驼峰） | ⚠️ 大小写+命名风格不同 |
| 出参-最后领用时间 | `data[0].yymmdd` | `res.data[0].yymmdd` | 字段名相同 |
| 出参-已领用年限 | `data[0].years` | `res.data[0].years` | 字段名相同 |
| 无数据默认值 | `"未领用"` | `"未领用"` | 保持一致 |

> **教训**：EKP 与 MK 两侧接口**不由同一人维护**，字段名不能照搬。本例中入参大小写完全不同（`NAME`→`name`、`EMPID`→`empId`），若机械复制会导致接口查无数据。

### Step 5 — 应用转换规则

**onChange 迁移**：

EKP 的 `AttachXFormValueChangeEventById` 注册回调清空**所有行**。MK 的 onChange 入口函数签名自带 `rowNum` 参数，可精确清空**当前变更行**——行为更精准，且代码更简洁。

**点击入口迁移**：

EKP 用 `document.getElementById('getLastTime').onclick = fn`（DOM 绑定）。MK 改为设计器中将函数绑定到按钮控件的点击事件。

**异步调用迁移**：

```javascript
// EKP
GetJdbcData(id, { NAME: name, EMPID: code }, "SPM", function(reJson) { ... });

// MK
MKXFORM.callTic({
  interfaceCode: 'function_2d58a9ba2b3068f4',
  param: { name: name, empId: code }
}, function(error, res) { ... });
```

### Step 6 — 配置 vs JS 决策

逐行异步查询 + 回填 + 校验 + 错误处理，**无法配置化**，必须保留 JS。

### Step 7 — 自检

见 [`validation-checklist.md`](../../validation-checklist.md)。重点核对项：
- [x] 无 DOM API 残留（`document.getElementById`、`elems[i].value`）
- [x] 无 EKP 全局函数残留（`GetJdbcData`、`GetXFormFieldById`、`AttachXFormValueChangeEventById`）
- [x] 明细表行号从 0 开始
- [x] callTic 入参字段名与 MK 接口契约一致（`name`/`empId`，非 `NAME`/`EMPID`）
- [x] 异步回调中不直接引用循环变量（通过参数传入 `rowNum`/`name`/`code`）
- [x] `if (error) { return; }` 不重复弹错误提示
- [x] 跨端提示按 `platform === 'mobile'` 分支
- [x] JS 面板内无顶层 `var`、无未绑定函数
- [x] helper 嵌套在入口函数体内（不依赖全局函数面板）

---

## 三、异步闭包陷阱

EKP 逐行调用 `getDongBaoColthingTime(name, code, lineNum)` 时已将值作为参数传入，天然避免闭包问题。

MK 迁移时同样**必须将行号和值作为参数传入** `fetchRow(rowNum, name, code)`。若在回调内直接引用循环变量 `var r`，由于 `var` 无块级作用域，异步回调执行时 `r` 已等于 `rowCount`，所有行写入同一位置。

```javascript
// ✅ 正确：参数传入
for (var r = 0; r < rowCount; r++) {
  fetchRow(r, names[r], codes[r]);
}

// ❌ 错误：回调内直接引用 r
for (var r = 0; r < rowCount; r++) {
  MKXFORM.callTic({...}, function(error, res) {
    MKXFORM.updateControl(table + '.fd_lastTime', r, ...);  // r 已变为 rowCount
  });
}
```

---

## 四、callTic 错误处理

`MKXFORM.callTic` 失败时框架**自动**调用 `Message.error('接口调用异常，请联系管理员处理！')`。

回调内 `if (error)` 分支**只需 `return`**，不要再弹一次错误提示（否则用户看到两条错误消息）。

EKP 原代码中 `reJson.data == undefined` 分支仅 `console.log`（静默失败），对应 MK 的 error 路径（框架已处理）。

---

## 五、JS 面板结构约束

本示例经历了 3 次结构重构才达到最终形态：

| 版本 | 结构 | 问题 |
|---|---|---|
| v1 | 全部放 JS 面板顶层 | 未绑定函数被清掉 |
| v2 | helper 放全局函数面板，入口放 JS 面板 | JS 面板无法调用全局函数面板的函数 |
| **v3（最终）** | 全部逻辑在 JS 面板，helper 嵌套在入口函数体内 | ✅ 测试通过 |

最终结构：
- `clothingNameOnChange(value, rowNum)` — 绑定到字段 onChange
- `actualUserCodeOnChange(value, rowNum)` — 绑定到字段 onChange
- `fetchLastTime_TZ(evt)` — 绑定到按钮点击，内部嵌套 `notifyWarning` 和 `fetchRow`

---

## 六、审阅/测试中发现并修正的 5 处问题

| # | 问题 | 严重度 | 修正 |
|---|---|---|---|
| 1 | 接口入参字段名大小写不匹配：EKP `NAME`/`EMPID` vs MK `name`/`empId` | 🔴 接口调不通 | 按 MK 接口实际契约使用小写驼峰 |
| 2 | 逐行异步调用若直接引用循环变量 `var r`，回调拿到的永远是最终值 | 🔴 写错行 | 行号+值作为函数参数传入 `fetchRow(r, names[r], codes[r])` |
| 3 | JS 面板无法调用全局函数面板的函数（v2 结构不可行） | 🔴 运行时报错 | 全部逻辑收进 JS 面板，helper 嵌套在入口函数体内 |
| 4 | `platform === 'pc'` 在真实 PC 浏览器中不成立（返回 `'desktop'`） | 🟡 移动端提示失效 | 改用 `=== 'mobile'` 判断移动端，else 分支覆盖桌面端 |
| 5 | EKP reSetLastTime 清空所有行，MK onChange 提供 rowNum 可精确清空当前行 | 🔵 行为优化 | 利用 rowNum 参数只清当前变更行（比 EKP 更精准） |

---

## 七、涉及的规则文档

- [`dataset-jdbc-to-calltic.md`](../../../04-migration-rules/dataset-jdbc-to-calltic.md) — GetJdbcData→callTic 完整迁移规则 + 4 步契约分析流程
- [`detail-table-patterns.md`](../../../04-migration-rules/detail-table-patterns.md) — 明细表逐行取值/写入模式
- [`indirect-write-patterns.md`](../../../04-migration-rules/indirect-write-patterns.md) — 模式 A（`.value=` 间接写入）
- [`api-mapping-table.md`](../../../04-migration-rules/api-mapping-table.md) — §1.2 事件监听、§3.1 AJAX/集成平台、§3.2 消息提示
- [`lifecycle-and-events.md`](../../../03-target-mk/lifecycle-and-events.md) — §4.1 JS 面板结构约束、§五 时序陷阱
- [`mkxform-api-reference.md`](../../../03-target-mk/mkxform-api-reference.md) — §3.1 callTic、§7.2 updateControl、§8.1 onChange
