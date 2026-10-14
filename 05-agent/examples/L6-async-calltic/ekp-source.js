// ==== EKP JSP 片段: fd_3b0fea5746cc44 ====
// 制服衬衫领用 — 获取最后领用时间
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
	//console.log(json);

	GetJdbcData(id,json,"SPM",function(reJson){
		value_fg = true;
		//console.log(reJson);
		if(reJson.data!= undefined){
			if(reJson.data.length!=0){
				var vals = reJson.data;
				var arrPublic = new Array();
				for(i=0;i<vals.length;i++){
						arrPublic.push(vals[i]);
				}
				//console.log(arrPublic);
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
