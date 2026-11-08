import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../powerbi/',import.meta.url));
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,'')),write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2));
const lit=v=>({expr:{Literal:{Value:typeof v==='string'?"'"+v+"'":String(v)}}});
for(const [page,flag,label] of [['Overview','today','Today · no weekend shifts'],['Weekly','currentWeek','Current week · Monday–Sunday'],['Monthly','currentMonth','Current calendar month']]){
 const folder=path.join(root,'Northstar.Report','definition','pages',page),p=path.join(folder,'page.json'),j=read(p);
 j.filterConfig={filters:[{name:'CurrentPeriod',field:{Column:{Expression:{SourceRef:{Entity:'Dates'}},Property:flag}},type:'Categorical',filter:{Version:2,From:[{Name:'d',Entity:'Dates',Type:0}],Where:[{Condition:{In:{Expressions:[{Column:{Expression:{SourceRef:{Source:'d'}},Property:flag}}],Values:[[{Literal:{Value:'1L'}}]]}}}]}}]};write(p,j);
 for(const dir of fs.readdirSync(path.join(folder,'visuals'))){const vp=path.join(folder,'visuals',dir,'visual.json');if(!fs.existsSync(vp))continue;const v=read(vp);
  if(dir==='PeriodFilter'){v.visual={visualType:'textbox',objects:{general:[{properties:{paragraphs:[{textRuns:[{value:label,textStyle:{fontFamily:'Segoe UI',fontSize:'14pt',color:'#247E70'}}]},{textRuns:[{value:'Historical periods: use browser dashboard',textStyle:{fontSize:'10pt',color:'#71828D'}}]}]}}]}};}
  if(v.visual.visualType==='card'){v.visual.objects={...(v.visual.objects||{}),categoryLabels:[{properties:{show:lit(false)}}],labels:[{properties:{fontSize:lit(32),color:{solid:{color:lit('#172F39')}}}}]};}
  if(['Heading','Title','Note','Footer'].includes(dir)){v.position.height+=10;v.visual.visualContainerObjects={background:[{properties:{show:lit(false)}}]};const run=v.visual.objects?.general?.[0]?.properties?.paragraphs?.[0]?.textRuns?.[0];if(run)run.textStyle.fontSize=dir==='Title'?'25pt':dir==='Heading'?'10pt':dir==='Note'?'9pt':'8pt';}
  if(dir==='Trend'){v.visual.visualContainerObjects.title[0].properties.text=lit(page==='Monthly'?'Daily revenue & modeled gross profit':'Attendance in the current period');if(page==='Monthly'){const proj=v.visual.query.queryState.Category.projections[0];proj.field.Column.Property='date';proj.queryRef='Dates.date';proj.nativeQueryRef='date';}}
  if(['Trend','Exceptions'].includes(dir))v.visual.objects={...(v.visual.objects||{}),dataPoint:[{properties:{defaultColor:{solid:{color:lit('#19A58A')}}}}]};
  write(vp,v);
 }
}
const modelPath=path.join(root,'Northstar.SemanticModel','model.bim');if(fs.existsSync(modelPath)){const model=read(modelPath);for(const t of model.model.tables)for(const m of t.measures||[]){if(m.name!=='Report Note'&&!m.expression.startsWith('COALESCE('))m.expression='COALESCE('+m.expression+', 0)';}write(modelPath,model);}
console.log('Polished period defaults, chart color and card labels.');
