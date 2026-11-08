export const weekOf=date=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d.toISOString().slice(0,10);};
export function addDays(date,n){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export function dateRange(mode,{asOf,minDate,week,month,from,to}){
 if(mode==='all')return {from:minDate,to:asOf};
 if(mode==='weekly'){const start=week||weekOf(asOf);return {from:start,to:addDays(start,6)};}
 if(mode==='monthly'){const m=month||asOf.slice(0,7),d=new Date(m+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);d.setUTCDate(0);return {from:m+'-01',to:d.toISOString().slice(0,10)};}
 if(mode==='custom'){if(!from||!to)return {error:'Choose both a From and To date.'};if(from>to)return {error:'The From date must be on or before the To date.'};return {from,to};}
 throw new Error('Unknown time period');
}
export function filterData(model,range,department='',employee=''){
 if(range.error)return {attendance:[],orders:[],employees:[]};
 const employees=model.employees.filter(e=>(!department||e.department===department)&&(!employee||e.employeeId===employee)),ids=new Set(employees.map(e=>e.employeeId)),matches=r=>r.date>=range.from&&r.date<=range.to;
 return {employees,attendance:model.attendance.filter(r=>matches(r)&&ids.has(r.employeeId)),orders:model.orders.filter(r=>matches(r)&&ids.has(r.technicianId))};
}
