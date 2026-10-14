// ==== EKP 源码：JSP 片段 fd_3aeb94b1295e7a ====
// 触发方式：<a onclick="WhatType()">点击计算数量</a> 手动点击
// 教学关注点：
//   1) fd_SumNumber 通过 GetXFormFieldById(_, true)[0].value= 间接写入（报告误标"读取"）
//   2) 明细表按物料编号分组累加，输出按首次出现顺序
//   3) 大量 .value / 数组遍历 / 字符串拼接需转换为 MK 明细表 API

function WhatType(){
    var ClothingType=GetXFormFieldById('fd_clothingType',true);
    var SumNumber=GetXFormFieldById('fd_SumNumber',true);

    var TableClothingCode=GetXFormFieldById('fd_clothingCode',true);
    var TableClothingName=GetXFormFieldById('fd_clothingName',true);
    var TableClothingSpecs=GetXFormFieldById('fd_clothingSpecs',true);
    var TableActualNumber=GetXFormFieldById('fd_actualNumber',true);
    var TableClothingUomtrl=GetXFormFieldById('fd_clothingUomtrl',true);

    if(ClothingType[0].value=="制服/衬衫-员工领用"){
        WriteSum(SumNumber,TableClothingCode,TableClothingName,TableClothingSpecs,TableActualNumber,TableClothingUomtrl);
    }
}

/*获取明细表每个料品（按料号）的唯一值*/
function getOnlyClothingCode(TargetTableClothingCode){
    var OnlyClothingCodeArr=[];
    for(i=0,SourceClothingCodeValue="";i<TargetTableClothingCode.length;i++){
        SourceClothingCodeValue=TargetTableClothingCode[i].value;
        OnlyClothingCodeArr.push(SourceClothingCodeValue);
    }
    OnlyClothingCodeArr=unique(OnlyClothingCodeArr);
    return OnlyClothingCodeArr;
}

/*数组去重*/
function unique(arr) {
    return Array.from(new Set(arr));
}

/*根据唯一料号获取对应单位*/
function getOnlyClothingUomtrl(TargetTableClothingCode,TargetTableClothingUomtrl){
    var LastClothingCode=getOnlyClothingCode(TargetTableClothingCode);
    var OnlyClothingUomtrlArr=[];
    for(j=0;j<LastClothingCode.length;j++){
        for(z=0;z<TargetTableClothingCode.length;z++){
            if(TargetTableClothingCode[z].value==LastClothingCode[j]){
                OnlyClothingUomtrlArr.push(TargetTableClothingUomtrl[z].value)
                break;
            }
        }
    }
    return OnlyClothingUomtrlArr;
}

/*根据唯一料号累加申请数量*/
function getOnlyActualNumber(TargetTableClothingCode,TargetTableActualNumber){
    var LastClothingCode=getOnlyClothingCode(TargetTableClothingCode);
    var OnlyActualNumberArr=[];
    for(y=0;y<LastClothingCode.length;y++){
        var v=0;
        for(w=0;w<TargetTableClothingCode.length;w++){
            if(TargetTableClothingCode[w].value==LastClothingCode[y]){
                v=v+Number(TargetTableActualNumber[w].value);
            }
        }
        OnlyActualNumberArr.push(v);
    }
    return OnlyActualNumberArr;
}

/*根据唯一料号拼接"名称（规格）"*/
function getOnlyOtherValue(TargetTableClothingCode,TargetTableClothingName,TargetTableClothingSpecs){
    var LastClothingCode=getOnlyClothingCode(TargetTableClothingCode);
    var OnlyOtherValueArr=[];
    for(j=0;j<LastClothingCode.length;j++){
        for(z=0;z<TargetTableClothingCode.length;z++){
            if(TargetTableClothingCode[z].value==LastClothingCode[j]){
                OnlyOtherValueArr.push(TargetTableClothingName[z].value+"（"+TargetTableClothingSpecs[z].value+"）")
                break;
            }
        }
    }
    return OnlyOtherValueArr;
}

/*汇总并写入目标字段控件（间接写入）*/
function WriteSum(TargetSumNumber,SourceTableClothingCode,SourceTableClothingName,SourceTableClothingSpecs,SourceTableActualNumber,SourceClothingUomtrl){
    var LastClothingValue=getOnlyOtherValue(SourceTableClothingCode,SourceTableClothingName,SourceTableClothingSpecs);
    var LastActualNumber=getOnlyActualNumber(SourceTableClothingCode,SourceTableActualNumber);
    var LastClothingUomtrl=getOnlyClothingUomtrl(SourceTableClothingCode,SourceClothingUomtrl);

    for(x=0,SumValue='';x<LastClothingValue.length;x++){
        SumValue=SumValue+"【"+LastClothingValue[x]+"："+LastActualNumber[x]+LastClothingUomtrl[x]+"】";
    }
    TargetSumNumber[0].value=SumValue;   // ← 间接写入：报告误标为"读取"
}
