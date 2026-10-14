# 表单 JS 分析报告

## 表单元信息

- **主表**：`fd_3ad2a2a2c10ad6`（主表）
- **子表**：
  - `fd_3ada4bc085904a`（西装公司申购明细表）
  - `fd_clothingTable`（制服衬衫领用明细表）
- **业务控件总数**：60
- **JSP 片段数量**：1

## JS 片段（合并）

```javascript
// ==== JSP 片段: fd_3aeb94b1295e7a ====
<a onclick="WhatType()" style="color:red;" href="javascript:void(0);">点击计算数量</a>

<script type="text/javascript">

	function WhatType(){
		var ClothingType=GetXFormFieldById('fd_clothingType',true);			//获取表头的服装性质
		var SumNumber=GetXFormFieldById('fd_SumNumber',true);				//获取表头最终要写入的目标字段

		var TableClothingCode=GetXFormFieldById('fd_clothingCode',true);	//获取(制服申领)明细表-物料编号
		var TableClothingName=GetXFormFieldById('fd_clothingName',true);	//获取(制服申领)明细表-物料名称
		var TableClothingSpecs=GetXFormFieldById('fd_clothingSpecs',true);	//获取(制服申领)明细表-规格
		var TableActualNumber=GetXFormFieldById('fd_actualNumber',true);	//获取(制服申领)明细表-申请数量
		var TableClothingUomtrl=GetXFormFieldById('fd_clothingUomtrl',true);	//获取(制服申领)明细表-单位

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
		//console.log(OnlyClothingCodeArr);
		return OnlyClothingCodeArr;
	}

	/*数组去重*/
	function unique(arr) {
		return Array.from(new Set(arr));
	}

	/*根据明细表每个料品（按料号）的唯一值，获取对应的单位*/
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
		//console.log(OnlyClothingUomtrlArr);
		return OnlyClothingUomtrlArr;
	}

	/*根据明细表每个料品（按料号）的唯一值，获取对应的申请数量并相加*/
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
		//console.log(OnlyActualNumberArr)
		return OnlyActualNumberArr;
	}

	/*根据明细表每个料品（按料号）的唯一值，获取对应的其他字段*/
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
		//console.log(OnlyOtherValueArr);
		return OnlyOtherValueArr;
	}

	/*汇总以上数据，并写入最终目标字段控件中*/
	function WriteSum(TargetSumNumber,SourceTableClothingCode,SourceTableClothingName,SourceTableClothingSpecs,SourceTableActualNumber,SourceClothingUomtrl){
		var LastClothingValue=getOnlyOtherValue(SourceTableClothingCode,SourceTableClothingName,SourceTableClothingSpecs);
		var LastActualNumber=getOnlyActualNumber(SourceTableClothingCode,SourceTableActualNumber);
		var LastClothingUomtrl=getOnlyClothingUomtrl(SourceTableClothingCode,SourceClothingUomtrl);

		for(x=0,SumValue='';x<LastClothingValue.length;x++){
			SumValue=SumValue+"【"+LastClothingValue[x]+"："+LastActualNumber[x]+LastClothingUomtrl[x]+"】";
		}
		TargetSumNumber[0].value=SumValue;
	}

</script>
```

## JS 引用的控件

| 控件 ID | label | 类型 | 所属表 | 直接引用 | 行级引用 | 入参/出参 |
|---|---|---|---|---|---|---|
| `fd_clothingType` | 服装性质 | select | (未知表: fd_3af4585c2e292a) | 1 | — | 读取 |
| `fd_SumNumber` | 汇总数量 | textarea | (未知表: fd_3af447218db28e) | 1 | — | 读取 |
| `fd_clothingCode` | 物料编号 | inputText | 子表: 制服衬衫领用明细表 | 1 | — | 读取 |
| `fd_clothingName` | 物料名称 | inputText | (未知表: fd_3b206a70f4e064) | 1 | — | 读取 |
| `fd_clothingSpecs` | 规格 | inputText | 子表: 制服衬衫领用明细表 | 1 | — | 读取 |
| `fd_actualNumber` | 申请数量 | inputText | 子表: 制服衬衫领用明细表 | 1 | — | 读取 |
| `fd_clothingUomtrl` | 单位 | inputText | 子表: 制服衬衫领用明细表 | 1 | — | 读取 |

## 未匹配引用

（本次无）

## 全局钩子

（本次无）

## 按 label 引用

（本次无）

---

> ⚠️ **分析报告的静态盲区（本示例的关键教学点）**
> 报告把 `fd_SumNumber`（汇总数量）标为 **"读取"**，但源码 `WriteSum` 里
> `TargetSumNumber[0].value = SumValue` 是通过 `GetXFormFieldById(_, true)[0].value=`
> 完成的**间接写入**。凡角色标注为"读取"、源码又出现 `GetXFormFieldById(_, true)`
> 的字段，必须回读源码确认是否实为写入目标。
