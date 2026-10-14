# 数据集/JDBC 调用迁移：GetJdbcData → callTic

> **适用场景**：EKP 表单 JS 通过 `GetJdbcData` 查询外部数据源（如 SPM、EHR、EKP 扩展数据集），
> 迁移到 MK 时改为 `MKXFORM.callTic` 调用集成平台注册接口。
> **难度定级**：L6（异步数据加载）。

---

## 一、核心结论

`GetJdbcData` **可以迁移为代码**（不是只能配置），映射到 `MKXFORM.callTic`：

```javascript
// EKP
GetJdbcData(id, obj, souce, retFunc);

// MK
MKXFORM.callTic({ interfaceCode: 'XXX', param: { ... } }, function (error, res) {
  if (error) { /* callTic 已自动弹 Message.error，这里通常只需 return */ return; }
  var data = res.data;   // 返回数据在 res.data
  // ...
});
```

**`callTic` 关键事实：**

| 项 | 说明 |
|---|---|
| 签名 | `callTic(config: { interfaceCode, param }, callback: (error, res) => void)` |
| 返回数据位置 | `res.data`（`res` 结构：`{ success, code, msg, data, traceId }`）|
| 失败处理 | **框架自动**调用 `Message.error('接口调用异常，请联系管理员处理！')`，无需自己再弹错误提示 |
| 底层 | `api.executeForAjax(interfaceCode, param)` |

---

## 二、⚠️ 强制检查点：接口契约必须实际分析

> **这是本规则最重要的部分。**
> EKP 与 MK 两侧的数据集/接口**通常都不由迁移人员注册维护**。因此遇到 `GetJdbcData`
> **绝不能机械照搬字段名**，必须先拿到并分析 MK 侧目标接口的真实契约，再定稿代码。

### 为什么不能照搬

EKP 的 `GetJdbcData` 与 MK 的 `callTic` 是两套独立注册的东西：

- **数据集 ID ≠ interfaceCode**：EKP 用数据集 ID（如 `1830185cb7ea796db0dc13e4d82bbbdc`），MK 用 `interfaceCode`（如 `function_2d58a9ba2b3068f4`），两者无对应关系，需人工找到 MK 侧等价接口。
- **入参字段名可能不同**：✅ **真实案例已验证**——EKP 传 `{ NAME, EMPID }`（大写），MK 接口实际是 `{ name, empId }`（小写驼峰）。**仅大小写不同，照搬就会传空值、查不到数据。**
- **出参字段名/结构可能不同**：本案例 `res.data` 是数组 `[{ yymmdd, years }]`，出参字段名恰好与 EKP 相同；但其它接口可能不同，且需注意类型（如 `years` 是数值 `0`，不是字符串）。

### 分析流程（每个 GetJdbcData 调用都要走一遍）

**第 1 步：从 EKP 源码提取"调用契约"**

```
数据集 ID  : ____________
数据源     : ____________（如 SPM）
入参对象   : { 字段1: 来源控件/值, 字段2: ... }
回调消费的出参字段 : res.data[?].字段A → 写入哪个控件
                    res.data[?].字段B → 写入哪个控件
无数据/undefined 默认值 : ____________（如 "未领用"）
```

**第 2 步：向接口维护方/集成平台确认 MK 侧等价接口契约**

```
interfaceCode : ____________
param 入参 schema : { MK字段名: 类型/含义 }   ← 与 EKP 入参做映射
res.data 结构 : 数组 / 对象？单条还是多条？
res.data 内字段名 : { MK出参字段: 含义 }      ← 与 EKP 出参做映射
```

**第 3 步：建立字段映射表（EKP → MK）**

以本规则的真实来源案例（SPM 制服最后领用日期）为例：

```
interfaceCode : function_2d58a9ba2b3068f4
res.data 结构 : 数组，单条 [{ yymmdd, years }]
```

| 用途 | EKP 字段 | MK 字段 | 备注 |
|---|---|---|---|
| 入参-物料名称 | `NAME` | `name` | ⚠️ 大小写不同 |
| 入参-工号 | `EMPID` | `empId` | ⚠️ 大小写+驼峰不同 |
| 出参-最后领用时间 | `yymmdd` | `yymmdd` | 相同（字符串）|
| 出参-已领用年限 | `years` | `years` | 相同（数值，如 `0`）|

**第 4 步：才能定稿 callTic 代码。** 契约未确认前，代码里的 interfaceCode 和字段名一律用 `/* TODO 待接口确认 */` 占位，不得臆测。

---

## 三、常见陷阱

### 陷阱 1：循环中逐行异步调用的闭包/时序

EKP 常"遍历每行 → 每行发一次 GetJdbcData → 回调里按行号写入"。迁移到 `callTic` 时：

- **行号必须作为函数参数传入回调**（或用 `let`/`const` 块级作用域），**不能**直接用共享的 `var` 循环变量——否则所有回调拿到的都是循环结束后的最终值，写错行。

```javascript
// ✅ 正确：rowNum 作为参数传入，每次调用形成独立闭包
function fetchRow(rowNum) {
  MKXFORM.callTic({ interfaceCode: 'XXX', param: { ... } }, function (error, res) {
    if (error) return;
    MKXFORM.updateControl('tableId.fd_lastTime', rowNum, res.data[0].____);
  });
}
for (var i = 0; i < rowCount; i++) { fetchRow(i); }

// ❌ 错误：回调里直接用 var i，异步返回时 i 已等于 rowCount
```

### 陷阱 2：重复弹错误提示

`callTic` 失败时框架**已自动**弹 `Message.error`。回调里 `if (error)` 分支**不要再弹一次**，只需 `return`。

### 陷阱 3：res.data 空值/多条判断

EKP 原逻辑常有 `if(reJson.data != undefined && reJson.data.length != 0)`。迁移时保留等价判断，并处理"无数据默认值"（如写 `"未领用"`）：

```javascript
var data = res.data;
if (data && data.length !== 0) {
  var val = data[0].____ == undefined ? '未领用' : data[0].____;
  MKXFORM.updateControl('tableId.fd_xxx', rowNum, val);
} else {
  // 无数据的处理（提示或写默认值）
}
```

### 陷阱 4：批量循环 vs 批量接口

若每行都发一次 `callTic`，行数多时会产生 N 次请求。确认 MK 接口是否支持**一次传多行、批量返回**——若支持，应改为单次批量调用，性能和时序都更好。

---

## 四、与其它规则的关系

- 写入明细表用 `updateControl(id, rowNum, value)`，见 [`detail-table-patterns.md`](./detail-table-patterns.md)。
- 回调里若写入的字段在报告中被标为"读取"，仍是间接写入，见 [`indirect-write-patterns.md`](./indirect-write-patterns.md)。
- `alert` → 按端选 `message`/`toast`，见 [`api-mapping-table.md`](./api-mapping-table.md) §3.2。
