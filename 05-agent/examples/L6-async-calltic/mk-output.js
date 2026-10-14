/**
 * ============================================================
 * MK 表单 JS 面板 —— 制服衬衫领用「获取最后领用时间」
 * 源：EKP JSP 片段 fd_3b0fea5746cc44
 * 触发：2 个 onChange 绑定入口 + 1 个按钮点击绑定入口
 * ============================================================
 *
 * 逻辑：
 *   1) 物料名称/工号变更时 → 清空该行「最后领用时间」「已领用年限」
 *   2) 点击"获取时间"按钮 → 逐行校验非空 → 逐行调 SPM 集成接口 → 回填
 *
 * 迁移关键点：
 *   1) GetJdbcData → MKXFORM.callTic（接口契约需实际确认，字段名大小写可能不同）
 *   2) EKP AttachXFormValueChangeEventById → MK 设计器绑定 onChange 入口函数
 *   3) EKP reSetLastTime 清空所有行 → MK 利用 onChange 的 rowNum 参数精确清空当前行
 *   4) 逐行异步调用需将 rowNum+值作为参数传入（闭包陷阱）
 *   5) callTic 失败框架已自动弹 Message.error，回调内 if(error) 只需 return
 *   6) 跨端提示：platform === 'mobile' → toast，否则 → message.warning
 *   7) JS 面板无法调用全局函数面板的函数，helper 嵌套在入口函数体内
 */

// ==================== onChange 入口函数 ====================

/**
 * 绑定到 fd_clothingName 字段的 onChange 事件
 * 物料名称变更时，清空该行的最后领用时间 & 已领用年限
 */
function clothingNameOnChange(value, rowNum) {
  // 制服衬衫领用明细表（子表）
  var TZ_TABLE = 'mk_model_20260814t18f5_d_79ls9';
  // 最后领用时间（子表 - 单行文本）
  MKXFORM.updateControl(TZ_TABLE + '.fd_lastTime', rowNum, '');
  // 已领用年限（子表 - 单行文本）
  MKXFORM.updateControl(TZ_TABLE + '.fd_usedYear', rowNum, '');
}

/**
 * 绑定到 fd_actualUserCode 字段的 onChange 事件
 * 工号变更时，清空该行的最后领用时间 & 已领用年限
 */
function actualUserCodeOnChange(value, rowNum) {
  // 制服衬衫领用明细表（子表）
  var TZ_TABLE = 'mk_model_20260814t18f5_d_79ls9';
  // 最后领用时间（子表 - 单行文本）
  MKXFORM.updateControl(TZ_TABLE + '.fd_lastTime', rowNum, '');
  // 已领用年限（子表 - 单行文本）
  MKXFORM.updateControl(TZ_TABLE + '.fd_usedYear', rowNum, '');
}

// ==================== 点击入口函数 ====================

/**
 * 绑定到"点击获取时间"按钮
 * 逐行校验 → 逐行调 SPM 接口 → 回填最后领用时间 & 已领用年限
 */
function fetchLastTime_TZ(evt) {
  // 制服衬衫领用明细表（子表）
  var TZ_TABLE = 'mk_model_20260814t18f5_d_79ls9';

  function notifyWarning(text) {
    if (MKXFORM.platform === 'mobile') {
      MKXFORM.toast({ content: text, icon: 'warning' });
    } else {
      MKXFORM.message.warning(text);
    }
  }

  function fetchRow(rowNum, name, code) {
    MKXFORM.callTic({
      interfaceCode: 'function_2d58a9ba2b3068f4',
      param: { name: name, empId: code }
    }, function (error, res) {
      if (error) { return; }
      var data = res.data;
      if (data && data.length !== 0) {
        var lastTime = data[0].yymmdd == undefined ? '未领用' : data[0].yymmdd;
        var usedYear = data[0].years == undefined ? '未领用' : data[0].years;
        // 回填最后领用时间（子表 - 单行文本）
        MKXFORM.updateControl(TZ_TABLE + '.fd_lastTime', rowNum, lastTime);
        // 回填已领用年限（子表 - 单行文本）
        MKXFORM.updateControl(TZ_TABLE + '.fd_usedYear', rowNum, usedYear);
      } else {
        notifyWarning('找不到相应的信息！请检查实际使用人姓名&物料名称！');
      }
    });
  }

  var rowCount = MKXFORM.getRowCount(TZ_TABLE);
  var names = [];
  var codes = [];
  for (var k = 0; k < rowCount; k++) {
    // 物料名称（子表 - 单行文本）
    names.push(MKXFORM.getControlValue(TZ_TABLE + '.fd_clothingName', k));
    // 工号（子表 - 单行文本）
    codes.push(MKXFORM.getControlValue(TZ_TABLE + '.fd_actualUserCode', k));
    if (!names[k] || !codes[k]) {
      notifyWarning('第' + (k + 1) + '行的 实际使用人姓名工号&物料名称 不能为空！');
      return;
    }
  }

  for (var r = 0; r < rowCount; r++) {
    fetchRow(r, names[r], codes[r]);
  }
}
