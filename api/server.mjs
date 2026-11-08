import http from 'node:http';
import {readFileSync,appendFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {dataset,localDate,weekOf,summarize} from './data.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),port=Number(process.env.PORT||8765);
mkdirSync(path.join(root,'logs'),{recursive:true});let data=dataset();
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1'),p=url.pathname;
 if(data.asOf!==localDate())data=dataset();
 const json=(body,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
 res.on('finish',()=>{if(p.startsWith('/api/'))appendFileSync(path.join(root,'logs','requests.ndjson'),JSON.stringify({at:new Date().toISOString(),method:req.method,path:p,status:res.statusCode})+'\n');});
 if(req.method!=='GET')return json({error:'Read-only learning API'},405);
 if(p==='/health')return json({status:'ok',simulation:true,asOf:data.asOf});
 if(p==='/api/dashboard')return json({...data,generatedAt:new Date().toISOString(),simulation:true,live:{sequence:Math.floor(Date.now()/15000),nextUpdateSeconds:15}});
 let rows;
 const sources={'/api/trinet/v1/employees':data.employees,'/api/trinet/v1/attendance':data.attendance,'/api/tekmetric/v1/repair-orders':data.orders,'/api/tekmetric/v1/shops':[{shopId:'SHOP01',name:'Northstar Auto Care',currency:'USD',timezone:'Asia/Karachi'}],'/api/powerbi/dates':data.dates};
 if(p==='/api/trinet/v1/attendance/weekly'){
  const start=url.searchParams.get('weekStart')||weekOf(data.asOf);if(!/^\d{4}-\d{2}-\d{2}$/.test(start))return json({error:'weekStart must be YYYY-MM-DD'},400);
  return json({simulation:true,weekStart:start,asOf:data.asOf,data:data.employees.map(e=>({...e,...summarize(data.attendance.filter(r=>r.employeeId===e.employeeId&&r.weekStart===start))}))});
 }
 if(Object.hasOwn(sources,p)){
  rows=sources[p];for(const k of ['employeeId','department','status','month','weekStart']){const v=url.searchParams.get(k);if(v)rows=rows.filter(r=>r[k]===v);}
  for(const [q,op] of [['from',(a,b)=>a>=b],['to',(a,b)=>a<=b]]){const v=url.searchParams.get(q);if(v)rows=rows.filter(r=>op(r.date,v));}
  const page=Number(url.searchParams.get('page')||1),pageSize=Number(url.searchParams.get('pageSize')||100);
  if(!Number.isInteger(page)||page<1||!Number.isInteger(pageSize)||pageSize<1||pageSize>10000)return json({error:'page >= 1; pageSize 1..10000'},400);
  return json({simulation:true,asOf:data.asOf,data:rows.slice((page-1)*pageSize,page*pageSize),pagination:{page,pageSize,total:rows.length,hasMore:page*pageSize<rows.length}});
 }
 const files={'/':'index.html','/dashboard.js':'dashboard.js','/styles.css':'styles.css','/filters.js':'filters.js'};
 if(files[p]){res.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html'});return res.end(readFileSync(path.join(root,'dashboard',files[p])));}
 return json({error:'Not found'},404);
});
server.listen(port,'127.0.0.1',()=>console.log(`Northstar demo ready: http://127.0.0.1:${port} (fictional data only)`));
server.on('error',e=>{console.error(e.message);process.exitCode=1;});
