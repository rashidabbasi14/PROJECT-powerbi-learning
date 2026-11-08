import fs from 'node:fs';
const p='dashboard/dashboard.js';let s=fs.readFileSync(p,'utf8');
s=s.replace("document.querySelectorAll('[data-period]').forEach(b=>{", "for(const [kind,suffix] of [['week','Week'],['month','Month']]){const select=$('#'+kind);$('#next'+suffix).disabled=select.selectedIndex<=0;$('#previous'+suffix).disabled=select.selectedIndex>=select.options.length-1;}document.querySelectorAll('[data-period]').forEach(b=>{");
s=s.replace('await refresh();setInterval(refresh,15000);',"for(const [kind,suffix] of [['week','Week'],['month','Month']]){for(const [prefix,step] of [['previous',1],['next',-1]])$('#'+prefix+suffix).onclick=()=>{const select=$('#'+kind);select.selectedIndex=Math.max(0,Math.min(select.options.length-1,select.selectedIndex+step));render();};$('#current'+suffix).onclick=()=>{$('#'+kind).selectedIndex=0;render();};}\nawait refresh();setInterval(refresh,15000);");
fs.writeFileSync(p,s);
