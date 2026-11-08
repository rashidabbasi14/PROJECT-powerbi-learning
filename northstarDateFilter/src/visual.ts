import powerbi from 'powerbi-visuals-api';
import '../style/visual.less';
type State={mode:string;week:string;month:string;from:string;to:string};
const iso=(d:Date)=>d.toISOString().slice(0,10);
const weekOf=(s:string)=>{const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return iso(d);};
const addDays=(s:string,n:number)=>{const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return iso(d);};
const pretty=(s:string)=>new Date(s+'T12:00:00Z').toLocaleDateString('en-US',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
export class Visual implements powerbi.extensibility.visual.IVisual {
 private host:powerbi.extensibility.visual.IVisualHost;private root:HTMLElement;private dates:string[]=[];private weeks:string[]=[];private months:string[]=[];private state:State;private initialized=false;private lastFilter='';private pendingFilter:string|undefined;
 constructor(o:powerbi.extensibility.visual.VisualConstructorOptions){this.host=o.host;this.root=document.createElement('div');this.root.className='northstar-date';o.element.appendChild(this.root);}
 public getFormattingModel():powerbi.visuals.FormattingModel{return {cards:[]};}
 public update(o:powerbi.extensibility.visual.VisualUpdateOptions):void{
  const dv=o.dataViews?.[0],values=dv?.categorical?.categories?.[0]?.values||[];
  const dates=values.map(v=>v instanceof Date?iso(v):String(v).slice(0,10)).filter(v=>/^\d{4}-\d{2}-\d{2}$/.test(v)).sort();
  if(dates.length)this.dates=Array.from(new Set([...this.dates,...dates])).sort();
  if(!this.dates.length){this.root.textContent='Refresh the report to load date controls.';return;}
  this.weeks=Array.from(new Set(this.dates.map(weekOf))).sort().reverse();this.months=Array.from(new Set(this.dates.map(v=>v.slice(0,7)))).sort().reverse();
  const latest=this.dates[this.dates.length-1];
  if(!this.state){this.state={mode:'Weekly',week:this.weeks[0],month:this.months[0],from:weekOf(latest),to:latest};const stored=dv.metadata.objects?.general?.state;if(typeof stored==='string'){try{this.state={...this.state,...JSON.parse(stored)};}catch{/* Keep the available-date defaults. */}}}
  const filters=(o.jsonFilters||[]) as any[],filter=filters.find(f=>f.target?.table==='Dates'&&f.target?.column==='date');const signature=JSON.stringify(filter||null);
  const pending=this.pendingFilter!==undefined&&signature!==this.pendingFilter;if(signature===this.pendingFilter)this.pendingFilter=undefined;
  if(!pending&&((this.initialized&&signature!==this.lastFilter)||(!this.initialized&&filter))){if(filter){const from=filter.conditions?.find((x:any)=>x.operator==='GreaterThanOrEqual')?.value,to=filter.conditions?.find((x:any)=>x.operator==='LessThanOrEqual')?.value;if(from&&to){const current=this.range();if(current.from!==from||current.to!==to){if(weekOf(from)===from&&addDays(from,6)===to){this.state.mode='Weekly';this.state.week=from;}else if(from.endsWith('-01')&&this.monthEnd(from.slice(0,7))===to){this.state.mode='Monthly';this.state.month=from.slice(0,7);}else{this.state.mode='Custom dates';this.state.from=from;this.state.to=to;}}}}else{this.state.mode='All time';}}
  if(!pending)this.lastFilter=signature;this.render();
  if(!this.initialized){this.initialized=true;if(!filter)this.apply();}
 }
 private monthEnd(m:string):string{const d=new Date(m+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);d.setUTCDate(0);return iso(d);}
 private range():{from:string;to:string}{const s=this.state;return s.mode==='Weekly'?{from:s.week,to:addDays(s.week,6)}:s.mode==='Monthly'?{from:s.month+'-01',to:this.monthEnd(s.month)}:s.mode==='Custom dates'?{from:s.from,to:s.to}:{from:this.dates[0],to:this.dates[this.dates.length-1]};}
 private apply():void{const r=this.range();if(!r.from||!r.to||r.from>r.to){this.render('From must be on or before To.');return;}
  const filter=this.state.mode==='All time'?null:{$schema:'https://powerbi.com/product/schema#advanced',filterType:0,target:{table:'Dates',column:'date'},logicalOperator:'And',conditions:[{operator:'GreaterThanOrEqual',value:r.from},{operator:'LessThanOrEqual',value:r.to}]};
  this.lastFilter=JSON.stringify(filter);this.pendingFilter=this.lastFilter;this.host.applyJsonFilter(filter as any,'general','filter',0);this.host.persistProperties({merge:[{objectName:'general',selector:null,properties:{state:JSON.stringify(this.state)}}]});this.render();
 }
 private button(text:string,title:string,action:()=>void,disabled=false):HTMLButtonElement{const b=document.createElement('button');b.textContent=text;b.title=title;b.setAttribute('aria-label',title);b.disabled=disabled;b.onclick=action;return b;}
 private render(error=''):void{this.root.replaceChildren();const row=document.createElement('div');row.className='date-row';const tabs=document.createElement('div');tabs.className='date-tabs';for(const mode of ['All time','Weekly','Monthly','Custom dates']){const b=this.button(mode,mode,()=>{this.state.mode=mode;if(mode==='Weekly')this.state.week=this.weeks[0];if(mode==='Monthly')this.state.month=this.months[0];this.apply();});b.classList.toggle('selected',mode===this.state.mode);b.setAttribute('aria-pressed',String(mode===this.state.mode));tabs.appendChild(b);}row.appendChild(tabs);
  if(this.state.mode==='Weekly'||this.state.mode==='Monthly'){const weekly=this.state.mode==='Weekly',items=weekly?this.weeks:this.months,value=weekly?this.state.week:this.state.month,index=items.indexOf(value),picker=document.createElement('div');picker.className='date-picker';const change=(i:number)=>{if(weekly)this.state.week=items[i];else this.state.month=items[i];this.apply();};picker.appendChild(this.button('←','Previous '+(weekly?'week':'month'),()=>change(index+1),index<0||index>=items.length-1));const select=document.createElement('select');select.setAttribute('aria-label',weekly?'Select week':'Select month');for(const item of items){const opt=document.createElement('option');opt.value=item;opt.textContent=weekly?pretty(item)+' – '+pretty(addDays(item,6)):new Date(item+'-01T12:00:00Z').toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'});opt.selected=item===value;select.appendChild(opt);}select.onchange=()=>{if(weekly)this.state.week=select.value;else this.state.month=select.value;this.apply();};picker.appendChild(select);picker.appendChild(this.button('→','Next '+(weekly?'week':'month'),()=>change(index-1),index<=0));picker.appendChild(this.button(weekly?'This week':'This month',weekly?'Current week':'Current month',()=>change(0),index===0));row.appendChild(picker);
  }else if(this.state.mode==='Custom dates'){const picker=document.createElement('div');picker.className='date-picker';for(const [label,key] of [['From','from'],['To','to']]){const wrapper=document.createElement('label');wrapper.textContent=label;const input=document.createElement('input');input.type='date';input.value=this.state[key];input.min=this.dates[0];input.max=this.dates[this.dates.length-1];input.setAttribute('aria-label',label);input.onchange=()=>{this.state[key]=input.value;this.apply();};wrapper.appendChild(input);picker.appendChild(wrapper);}row.appendChild(picker);}
  this.root.appendChild(row);const note=document.createElement('div');note.className=error?'date-note error':'date-note';const r=this.range();note.textContent=error||`${this.state.mode}  •  ${pretty(r.from)} – ${pretty(r.to)}  •  Applies to all cards, charts and tables`;this.root.appendChild(note);
 }
}
