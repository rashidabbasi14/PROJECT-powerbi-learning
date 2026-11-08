import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../powerbi/',import.meta.url));
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const write=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(v,null,2));};
const schema=(t,v)=>`https://developer.microsoft.com/json-schemas/fabric/item/report/definition/${t}/${v}/schema.json`;
const lit=v=>({expr:{Literal:{Value:typeof v==='string'?"'"+v.replaceAll("'","''")+"'":String(v)}}});
const mp=path.join(root,'Northstar.SemanticModel/model.bim'),model=read(mp);
const tables=model.model.tables.filter(t=>!['Period','WeekPicker','MonthPicker','CustomDates'].includes(t.name));
function picker(name,columns,m){return {name,columns,partitions:[{name,mode:'import',source:{type:'m',expression:m.split('\n')}}]};}
const stringCol=(name,extra={})=>({name,dataType:'string',sourceColumn:name,summarizeBy:'none',...extra});
tables.push(picker('Period',[stringCol('Time period',{sortByColumn:'Sort'}),{name:'Sort',dataType:'int64',sourceColumn:'Sort',summarizeBy:'none',isHidden:true}],`#table(type table [#"Time period"=text, Sort=Int64.Type], {{"All time",0},{"Weekly",1},{"Monthly",2},{"Custom dates",3}})`));
tables.push(picker('WeekPicker',[stringCol('Week of',{isHidden:true}),stringCol('Week',{sortByColumn:'Week of'})],`let
 Source=Table.Distinct(Table.SelectColumns(Dates,{"weekStart"})),
 Renamed=Table.RenameColumns(Source,{{"weekStart","Week of"}}),
 Labeled=Table.AddColumn(Renamed,"Week",each Date.ToText(Date.From([Week of]),"dd MMM yyyy") & " – " & Date.ToText(Date.AddDays(Date.From([Week of]),6),"dd MMM yyyy"),type text)
in Labeled`));
tables.push(picker('MonthPicker',[stringCol('Month key',{isHidden:true}),stringCol('Month',{sortByColumn:'Month key'})],`let
 Source=Table.Distinct(Table.SelectColumns(Dates,{"month"})),
 Renamed=Table.RenameColumns(Source,{{"month","Month key"}}),
 Labeled=Table.AddColumn(Renamed,"Month",each Date.ToText(Date.From([Month key]&"-01"),"MMMM yyyy"),type text)
in Labeled`));
tables.push(picker('CustomDates',[{name:'Date',dataType:'dateTime',sourceColumn:'Date',summarizeBy:'none',formatString:'dd MMM yyyy'}],`let Source=Table.SelectColumns(Dates,{"date"}), Renamed=Table.RenameColumns(Source,{{"date","Date"}}), Typed=Table.TransformColumnTypes(Renamed,{{"Date",type date}}) in Typed`));
const periodVars=`VAR _mode = SELECTEDVALUE('Period'[Time period], "All time")
VAR _asof = MAXX(ALL(Dates), Dates[date])
VAR _week = SELECTEDVALUE(WeekPicker[Week of], MAXX(FILTER(ALL(Dates), Dates[date] = _asof), Dates[weekStart]))
VAR _month = SELECTEDVALUE(MonthPicker[Month key], LEFT(_asof, 7))
VAR _start = SWITCH(_mode, "Weekly", _week, "Monthly", _month & "-01", "Custom dates", FORMAT(MIN(CustomDates[Date]), "yyyy-MM-dd"), MINX(ALL(Dates), Dates[date]))
VAR _end = SWITCH(_mode, "Weekly", FORMAT(DATEVALUE(_week) + 6, "yyyy-MM-dd"), "Monthly", FORMAT(EOMONTH(DATEVALUE(_month & "-01"),0), "yyyy-MM-dd"), "Custom dates", FORMAT(MAX(CustomDates[Date]), "yyyy-MM-dd"), _asof)
`;
const base=[['Scheduled Shifts','COUNTROWS(Attendance)','0'],['Present Shifts','CALCULATE(COUNTROWS(Attendance), Attendance[status]="Present")','0'],['Absent Shifts','CALCULATE(COUNTROWS(Attendance), Attendance[status]="Absent")','0'],['Leave Shifts','CALCULATE(COUNTROWS(Attendance), Attendance[status]="Leave")','0'],['Attendance Rate','DIVIDE([Present Shifts],[Scheduled Shifts])','0.0%'],['Worked Hours','SUM(Attendance[workedHours])','0.0'],['Scheduled Hours','SUM(Attendance[scheduledHours])','0.0'],['Overtime Hours','SUM(Attendance[overtimeHours])','0.0'],['Late Minutes','SUM(Attendance[lateMinutes])','0'],['Revenue','SUM(RepairOrders[total])','$#,0'],['Gross Profit','SUM(RepairOrders[grossProfit])','$#,0'],['Repair Orders','COUNTROWS(RepairOrders)','0'],['Average Invoice','DIVIDE([Revenue],[Repair Orders])','$#,0'],['Billed Hours','SUM(RepairOrders[laborHours])','0.0']];
const at=tables.find(t=>t.name==='Attendance'),old=new Map((at.measures||[]).map(m=>[m.name,m]));
at.measures=base.map(([name,expr,formatString])=>({...old.get(name),name,expression:periodVars+'RETURN '+(name==='Attendance Rate'||name==='Average Invoice'?'':'COALESCE(')+`CALCULATE(${expr}, KEEPFILTERS(FILTER(ALL(Dates), Dates[date] >= _start && Dates[date] <= _end)))`+(name==='Attendance Rate'||name==='Average Invoice'?'':',0)'),formatString}));
at.measures.push({name:'Selected Period',expression:periodVars+'RETURN _mode & "  |  " & FORMAT(DATEVALUE(_start), "dd MMM yyyy") & " – " & FORMAT(DATEVALUE(_end), "dd MMM yyyy")'});
model.model.tables=tables;model.model.annotations=(model.model.annotations||[]).filter(a=>a.name!=='PBI_QueryOrder');model.model.annotations.push({name:'PBI_QueryOrder',value:JSON.stringify(tables.map(t=>t.name))});write(mp,model);
const pagesRoot=path.join(root,'Northstar.Report/definition/pages');
for(const name of ['Overview','Weekly','Monthly','Dashboard','Attendance','Performance']){const p=path.resolve(pagesRoot,name);if(!p.startsWith(path.resolve(pagesRoot)+path.sep))throw Error('Unsafe report folder');if(fs.existsSync(p))fs.rmSync(p,{recursive:true});}
const col=(t,c)=>({field:{Column:{Expression:{SourceRef:{Entity:t}},Property:c}},queryRef:t+'.'+c,nativeQueryRef:c});
const mea=n=>({field:{Measure:{Expression:{SourceRef:{Entity:'Attendance'}},Property:n}},queryRef:'Attendance.'+n,nativeQueryRef:n});
let z=0;
function visual(page,id,type,x,y,w,h,query,title,objects={}){const v={$schema:schema('visualContainer','2.1.0'),name:id,position:{x,y,width:w,height:h,z:z++,tabOrder:z},visual:{visualType:type,...(query?{query:{queryState:Object.fromEntries(Object.entries(query).map(([k,v])=>[k,{projections:v}]))}}:{}),objects,visualContainerObjects:{title:[{properties:{show:lit(Boolean(title)),text:lit(title),fontSize:lit(11),fontColor:{solid:{color:lit('#27444C')}}}}],background:[{properties:{show:lit(true),color:{solid:{color:lit('#FFFFFF')}},transparency:lit(0)}}],border:[{properties:{show:lit(true),color:{solid:{color:lit('#E1E7EB')}},radius:lit(7)}}]}}};write(path.join(pagesRoot,page,'visuals',id,'visual.json'),v);return v;}
function text(page,id,str,x,y,w,h,size=12,color='#172F39'){visual(page,id,'textbox',x,y,w,h,null,'',{general:[{properties:{paragraphs:[{textRuns:[{value:str,textStyle:{fontFamily:'Segoe UI',fontSize:size+'pt',color}}]}]}}]});}
function slicer(page,id,t,c,title,x,y,w,h,mode='Dropdown',single=false){const v=visual(page,id,'slicer',x,y,w,h,{Values:[col(t,c)]},title,{data:[{properties:{mode:lit(mode)}}],header:[{properties:{show:lit(false)}}],selection:[{properties:{singleSelect:lit(single)}}]});v.visual.syncGroup={groupName:id,fieldChanges:true,filterChanges:true};write(path.join(pagesRoot,page,'visuals',id,'visual.json'),v);}
const cardStyle={categoryLabels:[{properties:{show:lit(false)}}],labels:[{properties:{fontSize:lit(28),color:{solid:{color:lit('#172F39')}}}}]};
const pages=[['Dashboard','01  Dashboard','Attendance and sales, together.',['Attendance Rate','Worked Hours','Absent Shifts','Revenue','Gross Profit','Repair Orders']],['Attendance','02  Attendance','A clear view of your team.',['Attendance Rate','Worked Hours','Overtime Hours','Absent Shifts']],['Performance','03  Performance','See what drives your sales.',['Revenue','Gross Profit','Repair Orders','Average Invoice']]];
write(path.join(pagesRoot,'pages.json'),{$schema:schema('pagesMetadata','1.0.0'),pageOrder:pages.map(p=>p[0]),activePageName:'Dashboard'});
for(const [page,displayName,title,cards] of pages){
 write(path.join(pagesRoot,page,'page.json'),{$schema:schema('page','2.0.0'),name:page,displayName,displayOption:'FitToPage',height:940,width:1440,objects:{background:[{properties:{color:{solid:{color:lit('#F3F5F8')}},transparency:lit(0)}}]}});
 text(page,'Heading','NORTHSTAR  /  AUTO CARE INTELLIGENCE',24,8,1360,32,10,'#247E70');text(page,'Title',title,24,43,1360,52,25);text(page,'Note','Fictional client demo  •  USD  •  Asia/Karachi  •  API import: Home → Refresh',24,98,1360,32,9,'#71828D');
 slicer(page,'TimePeriod','Period','Time period','1. Time period',24,142,230,85,'Dropdown',true);
 slicer(page,'Week','WeekPicker','Week','2. Weekly only • choose a week',270,142,330,85,'Dropdown',true);
 slicer(page,'Month','MonthPicker','Month','2. Monthly only • choose a month',616,142,270,85,'Dropdown',true);
 slicer(page,'CustomRange','CustomDates','Date','2. Custom dates only • From / To',902,142,514,100,'Between');
 slicer(page,'Department','Employees','department','Department',24,250,310,75);
 slicer(page,'Employee','Employees','name','Employee',350,250,350,75);
 visual(page,'PeriodSummary','card',716,250,700,75,{Values:[mea('Selected Period')]},'',{...cardStyle,labels:[{properties:{fontSize:lit(14),color:{solid:{color:lit('#247E70')}}}}]});
 text(page,'FilterHelp','Start with Time period. Weekly and Monthly default to the latest period until you choose one; Custom dates uses the From / To boxes. Filters carry across pages.',24,330,1392,34,9,'#71828D');
 const n=cards.length,gap=14,w=(1392-gap*(n-1))/n;cards.forEach((m,i)=>visual(page,'KPI'+i,'card',24+i*(w+gap),374,w,110,{Values:[mea(m)]},m==='Revenue'?'Service revenue':m,cardStyle));
 const colors={dataPoint:[{selector:{metadata:'Attendance.Present Shifts'},properties:{fill:{solid:{color:lit('#19A58A')}}}},{selector:{metadata:'Attendance.Absent Shifts'},properties:{fill:{solid:{color:lit('#EDB857')}}}},{selector:{metadata:'Attendance.Revenue'},properties:{fill:{solid:{color:lit('#19A58A')}}}},{selector:{metadata:'Attendance.Gross Profit'},properties:{fill:{solid:{color:lit('#234B57')}}}}]};
 if(page==='Dashboard'){
 visual(page,'AttendanceTrend','clusteredColumnChart',24,504,689,210,{Category:[col('Dates','weekStart')],Y:[mea('Present Shifts'),mea('Absent Shifts')]},'Attendance · present & absent shifts',colors);
 visual(page,'SalesTrend','clusteredColumnChart',729,504,687,210,{Category:[col('Dates','weekStart')],Y:[mea('Revenue'),mea('Gross Profit')]},'Sales · revenue & gross profit',colors);
 visual(page,'TeamTable','tableEx',24,734,1392,160,{Values:[col('Employees','name'),col('Employees','department'),mea('Attendance Rate'),mea('Worked Hours'),mea('Revenue'),mea('Repair Orders')]},'Employee attendance & attributed sales');
 }else if(page==='Attendance'){
 visual(page,'AttendanceTrend','clusteredColumnChart',24,504,900,210,{Category:[col('Dates','weekStart')],Y:[mea('Present Shifts'),mea('Absent Shifts'),mea('Leave Shifts')]},'Attendance · present, absent & approved leave',colors);
 visual(page,'Lateness','clusteredBarChart',940,504,476,210,{Category:[col('Employees','name')],Y:[mea('Late Minutes')]},'Late minutes by employee');
 visual(page,'TeamTable','tableEx',24,734,1392,160,{Values:[col('Employees','name'),col('Employees','department'),mea('Present Shifts'),mea('Scheduled Shifts'),mea('Attendance Rate'),mea('Worked Hours'),mea('Overtime Hours'),mea('Absent Shifts'),mea('Leave Shifts'),mea('Late Minutes')]},'Attendance & hours by employee');
 }else{
 visual(page,'SalesTrend','clusteredColumnChart',24,504,900,210,{Category:[col('Dates','weekStart')],Y:[mea('Revenue'),mea('Gross Profit')]},'Sales · revenue & gross profit',colors);
 visual(page,'ServiceMix','clusteredBarChart',940,504,476,210,{Category:[col('RepairOrders','service')],Y:[mea('Revenue')]},'Revenue by service');
 visual(page,'TeamTable','tableEx',24,734,1392,160,{Values:[col('Employees','name'),col('Employees','role'),mea('Repair Orders'),mea('Billed Hours'),mea('Revenue'),mea('Average Invoice'),mea('Gross Profit')]},'Sales & productivity by employee');
 }
 text(page,'Footer','Sales are attributed to the repair technician. Demo overtime: daily hours above 8. Gross profit uses modeled costs; excludes overhead and tax.',24,908,1392,30,8,'#71828D');
}
const localSettings=path.join(root,'Northstar.Report/.pbi/localSettings.json');if(fs.existsSync(localSettings)){const j=read(localSettings);if('activePageName' in j)j.activePageName='Dashboard';write(localSettings,j);}
console.log('Created Dashboard, Attendance and Performance with shared period selectors.');
