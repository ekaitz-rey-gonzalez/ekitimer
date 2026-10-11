/*!
 * EKITIMER — core
 * Almacenamiento, cálculos de rondas WCA e importadores (sin DOM).
 * Copyright (C) 2026 EKITIMER contributors · GPL-3.0-or-later
 */
'use strict';
// ====== STORAGE SEGURO ======
let storageOK=true;
try{const k='__ekitimer_test';localStorage.setItem(k,'1');localStorage.removeItem(k);}catch(e){storageOK=false;}
const store={
  get(k,d){try{const v=localStorage.getItem(k);if(v==null)return d;try{return JSON.parse(v);}catch(e){return v;}}catch(e){return d;}},
  set(k,v){try{localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));return true;}catch(e){return false;}}
};

// ==LOGIC START==
// Lógica pura (sin DOM): unidades, rondas WCA e importadores.
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const isFmc=cat=>WCA[cat].fmt==='fmc';

// Unidades enteras: centésimas (singles truncados como en la WCA) o movimientos×100 en FMC.
function unitsOf(cat,time,penalty){
  if(penalty==='DNF')return Infinity;
  if(isFmc(cat))return Math.round(time)*100;
  return Math.floor(time*100+1e-6)+(penalty==='+2'?200:0);
}

// Formatos de ronda por tipo de evento
const COMP_FMT={
  ao5:{n:5,type:'ao',cutN:2,label:'Media de 5',short:'Ao5'},
  mo3:{n:3,type:'mo',cutN:1,label:'Media de 3',short:'Mo3'},
  bo3:{n:3,type:'bo',cutN:0,label:'Mejor de 3',short:'Bo3'},
  fmc:{n:3,type:'mo',cutN:0,label:'Media de 3',short:'Mo3'},
};

// Resultado de una ronda completa (medias redondeadas a la centésima, como la WCA)
function roundResult(u,type){
  const n=u.length;if(!n)return null;
  if(type==='bo')return Math.min(...u);
  if(type==='mo')return u.some(v=>v===Infinity)?Infinity:Math.round(u.reduce((a,b)=>a+b,0)/n);
  const s=[...u].sort((a,b)=>a-b),mid=s.slice(1,n-1);
  return mid.some(v=>v===Infinity)?Infinity:Math.round(mid.reduce((a,b)=>a+b,0)/mid.length);
}
// Índices del mejor y peor intento (los que no cuentan en una Ao5)
function trimmedIdx(u){
  if(u.length<3)return[];
  let b=0,w=-1;
  u.forEach((v,i)=>{if(v<u[b])b=i;});
  u.forEach((v,i)=>{if(i!==b&&(w<0||v>=u[w]))w=i;});
  return[b,w];
}
// ¿No pasó el corte? (debe bajar ESTRICTAMENTE del corte en los primeros cutN intentos)
function cutoffFailed(u,cutN,cutoff){
  if(cutoff==null||!cutN||u.length<cutN)return false;
  return!u.slice(0,cutN).some(v=>v<cutoff);
}
// Mejor y peor resultado posibles con un intento por hacer
function bpaWpa(prev,type){
  return{bpa:roundResult(prev.concat([0]),type),wpa:roundResult(prev.concat([Infinity]),type)};
}
// Qué hace falta en el último intento para que el resultado baje de target (estricto).
// step: 1 (centésimas) o 100 (movimientos en FMC). Devuelve {kind:'any'|'impossible'|'max', max}
function needFor(prev,n,type,target,step){
  if(target==null||prev.length!==n-1)return null;
  const f=x=>roundResult(prev.concat([x]),type);
  if(f(Infinity)<target)return{kind:'any'};
  if(!(f(0)<target))return{kind:'impossible'};
  let lo=0,hi=Math.ceil(36e5/step);
  if(f(hi*step)<target)return{kind:'any'};
  while(hi-lo>1){const m=(lo+hi)>>1;if(f(m*step)<target)lo=m;else hi=m;}
  return{kind:'max',max:lo*step};
}

// ---------- Importadores ----------
const sigOf=s=>[s.category,Math.round(Date.parse(s.date)/1000),Math.round(s.time*1000),s.penalty||''].join('|');

function csScrToCat(t){
  t=String(t||'333');
  const M={'333':'3x3','222so':'2x2','444wca':'4x4','555wca':'5x5','666wca':'6x6','777wca':'7x7','333ni':'3x3bld',
    '333fm':'3x3fmc','333oh':'3x3oh','clkwca':'clock','mgmp':'megaminx','pyrso':'pyraminx','skbso':'skewb','sqrs':'square1',
    '444bld':'4x4bld','555bld':'5x5bld','r3ni':'mbld','input':'3x3','blank':'3x3'};
  if(M[t])return M[t];
  const P=[[/^222/,'2x2'],[/^444/,'4x4'],[/^555/,'5x5'],[/^666/,'6x6'],[/^777/,'7x7'],[/^pyr/,'pyraminx'],[/^skb/,'skewb'],
    [/^sq/,'square1'],[/^clk/,'clock'],[/^(mgm|minx)/,'megaminx'],[/^333/,'3x3']];
  for(const[re,c]of P)if(re.test(t))return c;
  return null;
}
// Nombre legible de tipos de scramble de csTimer que EKITIMER no tiene
function csEvName(t){
  const N=[[/^fto/,'FTO'],[/^redi/,'Redi Cube'],[/^mpyr/,'Master Pyraminx'],[/^(r|rel)/,'relevos'],[/^133|^1x3x3|^bic|^223|^233|^334|^335|^336|^337/,'cuboides'],
    [/^(gear|gr)/,'Gear Cube'],[/^(dino)/,'Dino Cube'],[/^(heli)/,'Helicopter'],[/^(ivy)/,'Ivy Cube'],[/^(kilo)/,'Kilominx'],[/^(giga)/,'Gigaminx'],[/^(15p|8p|24p)/,'puzzles deslizantes']];
  for(const[re,n]of N)if(re.test(t))return n;
  return t;
}
const parseMaybe=v=>{if(typeof v!=='string')return v;try{return JSON.parse(v);}catch(e){return null;}};

// Export de csTimer: {session1:[[[pen,ms,...],scr,comment,ts],...], properties:{sessionData:"{...}"}}
function parseCsTimer(obj){
  let sd=parseMaybe(obj.properties&&obj.properties.sessionData)||{};
  const groups=[],skippedEv={};let skipped=0;
  Object.keys(obj).filter(k=>/^session\d+$/.test(k)).sort((a,b)=>a.slice(7)-b.slice(7)).forEach(k=>{
    const arr=parseMaybe(obj[k]);if(!Array.isArray(arr)||!arr.length)return;
    const idx=k.slice(7),m=sd[idx]||{},scr=(m.opt&&m.opt.scrType)||'333',cat=csScrToCat(scr);
    const name=String(m.name!=null&&m.name!==''?m.name:idx).slice(0,40);
    if(!cat){skipped+=arr.length;skippedEv[scr]=1;return;}
    const list=[];
    for(const r of arr){
      if(!Array.isArray(r)||!Array.isArray(r[0]))continue;
      const pen=Number(r[0][0]),ms=Number(r[0][1]);
      if(!isFinite(ms)||ms<0||!isFinite(pen))continue;
      const ts=Number(r[3]);
      const s={category:cat,scramble:String(r[1]==null?'':r[1]),comment:String(r[2]==null?'':r[2]).slice(0,500),
        date:new Date((isFinite(ts)&&ts>0?ts:0)*1000).toISOString(),time:ms/1000,penalty:null};
      if(pen===-1)s.penalty='DNF';
      else if(pen>0){s.penalty='+2';if(pen>2000)s.time=(ms+pen-2000)/1000;}
      if(cat==='3x3fmc')s.time=Math.round(ms/1000);
      if(cat==='mbld'){
        const nums=(s.comment.match(/\d+/g)||[]).map(Number);
        s.mbld={s:nums[0]||0,a:nums[1]||0};if(s.penalty==='+2')s.penalty=null;
      }
      list.push(s);
    }
    if(list.length)groups.push({cat,name,solves:list});
  });
  return{source:'csTimer',groups,skipped,skippedEv:[...new Set(Object.keys(skippedEv).map(csEvName))]};
}

// CSV con comillas (separador configurable)
function parseCSV(text,sep){
  const rows=[];let row=[],cell='',q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(q){
      if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else q=false;}
      else cell+=c;
    }else if(c==='"')q=true;
    else if(c===sep){row.push(cell);cell='';}
    else if(c==='\n'||c==='\r'){
      if(c==='\r'&&text[i+1]==='\n')i++;
      row.push(cell);rows.push(row);row=[];cell='';
    }else cell+=c;
  }
  if(cell!==''||row.length){row.push(cell);rows.push(row);}
  return rows;
}
// Copia de Twisty Timer / Cubic Timer. Ojo: Twisty guarda el +2 YA SUMADO al tiempo.
function parseTwisty(text){
  const rows=parseCSV(text.replace(/^﻿/,''),';');
  const map={'222':'2x2','333':'3x3','444':'4x4','555':'5x5','666':'6x6','777':'7x7','mega':'megaminx','pyra':'pyraminx',
    'skewb':'skewb','clock':'clock','sq1':'square1','333oh':'3x3oh','333bld':'3x3bld','444bld':'4x4bld','555bld':'5x5bld',
    '333mbld':'mbld','333fmc':'3x3fmc'};
  const byKey={},groups=[],skippedEv={};let skipped=0;
  for(const r of rows.slice(1)){
    if(r.length<7)continue;
    const puzzle=r[0].trim(),sub=(r[1]||'Normal').trim()||'Normal',v=parseInt(r[2]),date=parseInt(r[3]),pen=r[5].trim();
    let cat=map[puzzle];
    if(!cat){skipped++;skippedEv[puzzle]=1;continue;}
    if(!isFinite(v)||v<0)continue;
    if(cat==='3x3'){if(/\boh\b|one.?hand|una mano/i.test(sub))cat='3x3oh';else if(/bld|blind|ciegas/i.test(sub))cat='3x3bld';else if(/fmc|fewest/i.test(sub))cat='3x3fmc';}
    const comment=r[6]==='null'?'':String(r[6]||'').slice(0,500);
    const s={category:cat,scramble:r[4]==='null'?'':String(r[4]||''),comment,
      date:new Date(isFinite(date)&&date>0?date:0).toISOString(),time:v/1000,penalty:null};
    if(pen==='2')s.penalty='DNF';
    else if(pen==='1'){s.penalty='+2';s.time=Math.max(0,v-2000)/1000;}
    if(cat==='3x3fmc')s.time=Math.round(v/1000);
    if(cat==='mbld'){
      const point=1000-Math.trunc(v/1e9),missed=v%1000,solved=point+missed;
      s.time=(Math.trunc(v/1000)%1000000);s.mbld={s:solved,a:solved+missed};s.penalty=null;
    }
    const key=cat+'|'+sub;
    if(!byKey[key]){byKey[key]={cat,name:sub.slice(0,40),solves:[]};groups.push(byKey[key]);}
    byKey[key].solves.push(s);
  }
  return{source:'Twisty Timer',groups,skipped,skippedEv:Object.keys(skippedEv)};
}

// Detecta el formato y devuelve un plan de importación (sin aplicar nada)
function detectImport(text){
  const t=String(text||'').replace(/^﻿/,'').trim();
  if(!t)return{error:'El archivo está vacío.'};
  if(/^"?Puzzle"?[,;]"?Category"?/i.test(t)){
    const r=parseTwisty(t);r.source=t[0]==='"'?'Cubic Timer':'Twisty Timer';return r;
  }
  let obj;try{obj=JSON.parse(t);}catch(e){return{error:'No reconozco este archivo. Usa una copia de EKITIMER, un export de csTimer o una copia de Twisty/Cubic Timer.'};}
  if(obj&&obj.app==='ekitimer'){
    if(!Array.isArray(obj.solves))return{error:'La copia de EKITIMER está dañada.'};
    return{source:'EKITIMER',backup:obj};
  }
  if(obj&&typeof obj==='object'&&Object.keys(obj).some(k=>/^session\d+$/.test(k)))return parseCsTimer(obj);
  return{error:'No reconozco este archivo. Usa una copia de EKITIMER, un export de csTimer o una copia de Twisty/Cubic Timer.'};
}

// Calcula qué se añadiría (sin duplicados) frente a los tiempos existentes
function planImport(res,existing){
  const sigs=new Set(existing.map(sigOf));let dup=0,add=0;
  const groups=res.groups.map(g=>{
    const fresh=[];
    for(const s of g.solves){const k=sigOf(s);if(sigs.has(k)){dup++;continue;}sigs.add(k);fresh.push(s);}
    add+=fresh.length;return{cat:g.cat,name:g.name,solves:fresh};
  }).filter(g=>g.solves.length);
  return{groups,dup,add};
}
// ==LOGIC END==
