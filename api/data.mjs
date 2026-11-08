export const employees = ['Alex Morgan','Jordan Lee','Sam Rivera','Casey Patel','Taylor Brooks','Jamie Chen','Riley Wilson','Drew Ahmed','Cameron Diaz','Avery Khan','Robin Scott','Skyler Davis'].map((name,i)=>({employeeId:`E${String(i+1).padStart(3,'0')}`,name,department:i<8?'Service':'Front Office',role:i<8?'Technician':'Service Advisor',hourlyRate:i<8?28+i:24+i,shopId:'SHOP01'}));
export function localDate(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi'}).format(new Date());}
export const iso=d=>d.toISOString().slice(0,10);
export function weekOf(date){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return iso(d);}
function random(seed){let x=seed;return ()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296;};}
export function dataset(asOf=localDate()){
 const rand=random(42026),attendance=[],orders=[],dates=[];
 const end=new Date(asOf+'T12:00:00Z'), start=new Date(end);start.setUTCMonth(start.getUTCMonth()-6);start.setUTCDate(1);
 let oid=1000;
 for(let d=new Date(start);d<=end;d.setUTCDate(d.getUTCDate()+1)){
  const date=iso(d),weekStart=weekOf(date),month=date.slice(0,7),workday=d.getUTCDay()>0&&d.getUTCDay()<6;
  dates.push({date,weekStart,month,day:d.toLocaleDateString('en-US',{weekday:'short',timeZone:'UTC'}),currentWeek:weekStart===weekOf(asOf)?1:0,currentMonth:month===asOf.slice(0,7)?1:0,today:date===asOf?1:0});
  if(!workday)continue;
  for(const e of employees){
   const r=rand(),status=r<.045?'Absent':r<.095?'Leave':'Present',lateMinutes=status==='Present'&&rand()<.16?Math.ceil(rand()*35):0;
   const workedHours=status==='Present'?+(8-lateMinutes/60+(rand()<.22?rand()*2:0)).toFixed(2):0;
   attendance.push({attendanceId:e.employeeId+'-'+date,employeeId:e.employeeId,employeeName:e.name,department:e.department,date,weekStart,month,status,scheduledHours:8,workedHours,leaveHours:status==='Leave'?8:0,lateMinutes,overtimeHours:+Math.max(0,workedHours-8).toFixed(2),laborCost:+(workedHours*e.hourlyRate).toFixed(2)});
  }
  for(let i=0,n=8+Math.floor(rand()*12);i<n;i++){
   const laborHours=+(rand()*3+.5).toFixed(2),laborSales=+(laborHours*110).toFixed(2),partsSales=+(30+rand()*450).toFixed(2),partsCost=+(partsSales*.62).toFixed(2),total=+(laborSales+partsSales).toFixed(2);
   orders.push({repairOrderId:`RO${++oid}`,shopId:'SHOP01',date,weekStart,month,technicianId:employees[Math.floor(rand()*8)].employeeId,service:['Oil & filter','Brake service','Diagnostics','Tire service','Engine repair'][Math.floor(rand()*5)],status:date===asOf?['In progress','Awaiting parts','Ready','Completed'][Math.floor(rand()*4)]:'Completed',laborHours,laborSales,partsSales,partsCost,total,grossProfit:+(laborSales+partsSales-partsCost-laborHours*32).toFixed(2)});
  }
 }
 return {asOf,employees,attendance,orders,dates};
}
export function summarize(rows){const sum=k=>+rows.reduce((a,r)=>a+r[k],0).toFixed(2);return {scheduledDays:rows.length,presentDays:rows.filter(r=>r.status==='Present').length,absentDays:rows.filter(r=>r.status==='Absent').length,leaveDays:rows.filter(r=>r.status==='Leave').length,workedHours:sum('workedHours'),scheduledHours:sum('scheduledHours'),lateMinutes:sum('lateMinutes'),overtimeHours:sum('overtimeHours'),attendanceRate:rows.length?rows.filter(r=>r.status==='Present').length/rows.length:0};}
