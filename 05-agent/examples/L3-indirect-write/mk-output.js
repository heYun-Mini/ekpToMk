/**
 * ============================================================
 * MK 表单 JS —— 制服衬衫领用「汇总数量」计算
 * 源：EKP JSP 片段 fd_3aeb94b1295e7a 的 WhatType()
 * 触发：绑定到「点击计算数量」按钮控件的自定义 JS 点击动作
 * ============================================================
 *
 * 逻辑：服装性质为"制服-员工领用"时，遍历制服衬衫领用明细表，
 *       按物料编号分组累加申请数量，拼接为【名称（规格）：数量单位】
 *       写入表头「汇总数量」字段。
 *
 * 迁移关键点：
 *   1) fd_SumNumber 在分析报告中误标为"读取"，实为间接写入
 *      （EKP: TargetSumNumber[0].value=SumValue）→ 改用 MKXFORM.setValue。
 *   2) 明细表逐行取值用 getControlValue(id, rowNum)，替代 EKP 的 [i].value 数组。
 *   3) 分组用 order[] 数组保序，避免 for...in 对数字型 key 重排
 *      导致汇总顺序与 EKP（首次出现顺序）不一致。
 *   4) 服装性质不符时补 return，与 EKP 的 if 包裹逻辑一致（原实现漏了 return）。
 *   5) 提示按端分支：桌面端 message.warning、移动端 toast（platform 实测 PC 返回 'desktop'，
 *      故用 === 'mobile' 判断移动端）。
 */
function totalNumberOfClaims(evt) {
  // 服装性质（主表 - 下拉框）
  var clothingType = MKXFORM.getValue('mkModelId.fd_clothingType');

  // 服装性质不符：提示并中止
  if (clothingType !== '制服-员工领用') {
    var tip = '当前服装性质不是"制服-员工领用"，将不进行汇总';
    if (MKXFORM.platform === 'mobile') {
      MKXFORM.toast({ content: tip, icon: 'warning' });   // 移动端瞬时通知
    } else {
      MKXFORM.message.warning(tip);                        // 桌面端瞬时通知
    }
    return;
  }

  // 制服衬衫领用明细表（子表）
  var tableId = 'mkModelId_details';
  var rowCount = MKXFORM.getRowCount(tableId);

  var order = [];        // 物料编号首次出现顺序（保序）
  var summaryMap = {};   // 编号 -> { name, specs, uom, totalNumber }

  for (var i = 0; i < rowCount; i++) {
    // 物料编号（子表 - 单行文本）
    var clothingCode = MKXFORM.getControlValue(tableId + '.fd_clothingCode', i);

    // 容错：空编号跳过（防空行/脏数据）
    if (!clothingCode || String(clothingCode).trim() === '') {
      continue;
    }

    // 首次出现该编号：初始化汇总对象
    if (!summaryMap[clothingCode]) {
      order.push(clothingCode);
      summaryMap[clothingCode] = {
        // 物料名称（子表 - 单行文本）
        name: MKXFORM.getControlValue(tableId + '.fd_clothingName', i) || '',
        // 规格（子表 - 单行文本）
        specs: MKXFORM.getControlValue(tableId + '.fd_clothingSpecs', i) || '',
        // 单位（子表 - 单行文本）
        uom: MKXFORM.getControlValue(tableId + '.fd_clothingUomtrl', i) || '',
        totalNumber: 0
      };
    }

    // 累加数量（非数字按 0 处理）
    // 申请数量（子表 - 单行文本）
    var actualNumber = MKXFORM.getControlValue(tableId + '.fd_actualNumber', i);
    var num = parseFloat(actualNumber);
    summaryMap[clothingCode].totalNumber += isNaN(num) ? 0 : num;
  }

  // 按首次出现顺序拼接：【名称（规格）：数量单位】
  var sumValue = '';
  for (var k = 0; k < order.length; k++) {
    var item = summaryMap[order[k]];
    var nameSpecStr = item.specs ? (item.name + '（' + item.specs + '）') : item.name;
    sumValue += '【' + nameSpecStr + '：' + item.totalNumber + item.uom + '】';
  }

  // 写入表头汇总字段（对应 EKP 的 TargetSumNumber[0].value=SumValue 间接写入）
  // 汇总数量（主表 - 多行文本）
  MKXFORM.setValue('mkModelId.fd_SumNumber', sumValue);
}
