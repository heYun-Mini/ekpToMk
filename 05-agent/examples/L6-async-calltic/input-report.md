# 表单 JS 分析报告（TZ 片段摘取）

> 原始报告含 3 个 JSP 片段（WhatType 汇总 + XZ 西装获取时间 + TZ 制服获取时间）。
> 本示例仅摘取 **片段 3: fd_3b0fea5746cc44**（制服衬衫领用 — 获取最后领用时间）相关内容。

## 表单元信息

- **主表**：`fd_3ad2a2a2c10ad6`（主表）
- **子表**：
  - `fd_3ada4bc085904a`（西装公司申购明细表）
  - `fd_clothingTable`（制服衬衫领用明细表）
- **业务控件总数**：61
- **JSP 片段数量**：3（本示例仅涉及第 3 个）

## JS 片段（TZ 制服衬衫领用 — 获取最后领用时间）

```javascript
// ==== JSP 片段: fd_3b0fea5746cc44 ====
<a id="getLastTime" href="javascript:void(0)" style="color:red">点击获取时间</a>
<script type="text/javascript">
//fdId=1830185cb7ea796db0dc13e4d82bbbdc（扩展模块下的单数据集：制服衬衫领用日期）的ID

//绑定明细表物料名称&实际使用人姓名工号的值变化事件：清空最后领用时间&已领用年限的值
AttachXFormValueChangeEventById('fd_clothingName',function(){
	reSetLastTime();
});
AttachXFormValueChangeEventById('fd_actualUserCode',function(){
	reSetLastTime();
});

function reSetLastTime(){
	var lastTime=GetXFormFieldById("fd_lastTime",true);
	var usedYear=GetXFormFieldById("fd_usedYear",true);
	for(n=0;n<lastTime.length;n++){
		lastTime[n].value="";
		usedYear[n].value="";
	}
}

//根据明细表每行的实际使用人工号&物料名称，获取对应的最后领用时间
document.getElementById('getLastTime').onclick=function(){
	var clothingName=GetXFormFieldById("fd_clothingName",true);
	var actualUserCode=GetXFormFieldById("fd_actualUserCode",true);

	for(k=0;k<clothingName.length;k++){
		var line=k+1;
		if(clothingName[k].value==''||actualUserCode[k].value==''){
			alert("第"+line+"行的 实际使用人姓名工号&物料名称 不能为空！");
			return;
		}
	}

	for(l=0;l<clothingName.length;l++){
		getDongBaoColthingTime(clothingName[l].value,actualUserCode[l].value,l);
	}
}

function getDongBaoColthingTime(clothingNames,actualUserCodes,lineNum){

	//通过扩展模块下的单数据集（SPM系统）获取数据
	var id = "1830185cb7ea796db0dc13e4d82bbbdc";
	var json = new Object();
	json.NAME=clothingNames;
	json.EMPID=actualUserCodes;

	GetJdbcData(id,json,"SPM",function(reJson){
		value_fg = true;
		if(reJson.data!= undefined){
			if(reJson.data.length!=0){
				var vals = reJson.data;
				var arrPublic = new Array();
				for(i=0;i<vals.length;i++){
						arrPublic.push(vals[i]);
				}
				MYDocList_WriteRow(null,arrPublic,lineNum);
			}else{
				alert("找不到相应的信息！请检查实际使用人姓名&物料名称！");
			}

		}else{
			console.log("获取后台失败，请重新再试！");
		}
	});
}

function MYDocList_WriteRow(optTR,list_vals,line_Index){
	var lastTime=GetXFormFieldById("fd_lastTime",true);
	var usedYear=GetXFormFieldById("fd_usedYear",true);
	lastTime[line_Index].value=list_vals[0].yymmdd==undefined?"未领用":list_vals[0].yymmdd;
	usedYear[line_Index].value=list_vals[0].years==undefined?"未领用":list_vals[0].years;
}

</script>
```

## JS 引用的控件（TZ 片段相关）

| 控件 ID | label | 类型 | 所属表 | 直接引用 | 行级引用 | 入参/出参 |
|---|---|---|---|---|---|---|
| `fd_clothingName` | 物料名称 | inputText | (未知表: fd_3b206a70f4e064) | 3 | — | 读取 → 写入 |
| `fd_actualUserCode` | 工号 | inputText | (未知表: fd_3b206a61f6c2c2) | 2 | — | 读取 → 写入 |
| `fd_lastTime` | 最后领用时间 | inputText | (未知表: fd_3b20f800e14a1a) | 2 | — | 读取 |
| `fd_usedYear` | 已领用年限（年） | inputText | (未知表: fd_3b20f80390d9fc) | 2 | — | 读取 |

> **注意**：`fd_lastTime` 和 `fd_usedYear` 在报告中标注为"读取"，实际存在**间接写入**
> （通过 `lastTime[line_Index].value = ...`），属于分析报告的标注盲区。

## 数据集调用

`GetJdbcData` 调用次数：1（本片段内）

| 数据集 ID | 数据源 | 入参 | 出参消费 |
|---|---|---|---|
| `1830185cb7ea796db0dc13e4d82bbbdc` | SPM | `{ NAME: 物料名称, EMPID: 工号 }` | `data[0].yymmdd` → fd_lastTime; `data[0].years` → fd_usedYear |

## 未匹配引用

| 原始引用 | 解析到的 API | 未匹配原因 |
|---|---|---|
| `getLastTime` | `document.getElementById` | DOM ID（非控件 ID） |

## 全局钩子

（本次无）
