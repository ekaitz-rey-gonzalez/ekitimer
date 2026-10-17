/*!
 * EKITIMER — app
 * Interfaz: scrambles, timer, competición, datos y ajustes.
 * Copyright (C) 2026 EKITIMER contributors · GPL-3.0-or-later
 */
'use strict';
// ====== RANDOM-STATE (cubing.js) ======
const RS_URL='https://cdn.cubing.net/v0/js/cubing/scramble';
let cubing=null,cubingP=null,cubingDead=false;
const timeoutP=ms=>new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms));
function loadCubing(){
  if(cubing)return Promise.resolve(cubing);
  if(cubingDead)return Promise.reject(new Error('cubing no disponible'));
  if(!cubingP)cubingP=import(RS_URL).then(m=>{if(!m.randomScrambleForEvent)throw new Error('api');cubing=m;return m;}).catch(e=>{cubingDead=true;throw e;});
  return cubingP;
}
async function rsOne(ev,ms){
  const m=await Promise.race([loadCubing(),timeoutP(ms)]);
  let alg;
  try{alg=await Promise.race([m.randomScrambleForEvent(ev),timeoutP(ms)]);}
  catch(e){if(e.message!=='timeout')cubingDead=true;throw e;}
  return alg.toString().trim();
}
async function makeScramble(cat){
  const c=WCA[cat];
  if(c.isMulti){
    const out=[];let src='rs';
    for(let i=0;i<mbldN;i++){const r=await makeScramble('3x3bld');out.push(`${i+1}. ${r.s}`);if(r.src!=='rs')src='rm';}
    return{s:out.join('\n'),src};
  }
  if(settings.rs&&c.ev&&!cubingDead){
    try{return{s:await rsOne(c.ev,cubing?8000:6000),src:'rs'};}catch(e){}
  }
  return{s:genScramble(cat),src:'rm'};
}

// ====== RENDER: puzzles ======
function svgEl(tag,attrs){
  const e=document.createElementNS('http://www.w3.org/2000/svg',tag);
  for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);
  return e;
}
const CMAP={W:'#fff',Y:'#ffd600',G:'#2e7d32',B:'#1565c0',R:'#e53935',O:'#ff8f00',X:'#888'};
function netReset(){const el=$('cubeNet');el.innerHTML='';el.style.gridTemplateColumns='1fr';el.style.gridTemplateRows='1fr';el.style.gap='0';return el;}
function svgText(svg,x,y,t,size=9){
  const e=svgEl('text',{x,y,'text-anchor':'middle','font-size':size,'font-family':'Nunito,sans-serif','font-weight':'700',style:'fill:var(--text3)'});
  e.textContent=t;svg.appendChild(e);return e;
}

function renderNet(state,n){
  const el=$('cubeNet');
  const narrow=window.innerWidth<=768,cs=Math.max(narrow?6:8,Math.min(narrow?11:22,Math.floor((narrow?66:120)/n))),g=n<=4?2:1;
  const sz=n*cs+(n-1)*g;
  el.style.gridTemplateColumns=`${sz}px `.repeat(4);
  el.style.gridTemplateRows=`${sz}px `.repeat(3);
  el.style.gap='4px';el.innerHTML='';
  const layout=[[null,0,null,null],[5,2,4,3],[null,1,null,null]];
  for(let row=0;row<3;row++)for(let col=0;col<4;col++){
    const fi=layout[row][col],div=document.createElement('div');
    if(fi===null){div.style.visibility='hidden';}
    else{
      div.style.display='grid';
      div.style.gridTemplateColumns=`repeat(${n},${cs}px)`;
      div.style.gridTemplateRows=`repeat(${n},${cs}px)`;
      div.style.gap=g+'px';
      for(let i=0;i<n*n;i++){
        const cell=document.createElement('div');
        cell.className=`cube-cell c-${state[fi*n*n+i]}`;
        div.appendChild(cell);
      }
    }
    el.appendChild(div);
  }
}
function renderPolys(P,state){
  const el=netReset(),vb=P.vb;
  const svg=svgEl('svg',{viewBox:vb.join(' '),width:vb[2],height:vb[3]});
  P.st.forEach((s,i)=>svg.appendChild(svgEl('polygon',{
    points:s.poly.map(q=>q[0].toFixed(1)+','+q[1].toFixed(1)).join(' '),
    fill:CMAP[state[i]]||state[i]||'#888',stroke:'#1a1a1a','stroke-width':P.sw||'1.4','stroke-linejoin':'round'})));
  el.appendChild(svg);
}
function renderClockNet(cl){
  const el=netReset();
  const svg=svgEl('svg',{viewBox:'0 0 270 125',width:'270',height:'125'});
  const drawFace=(ox,oy,dials,label,faceCol,dialCol)=>{
    svg.appendChild(svgEl('rect',{x:ox,y:oy,width:100,height:100,fill:faceCol,stroke:'#1a1a1a','stroke-width':'1.5',rx:'8'}));
    for(let r=0;r<3;r++)for(let c=0;c<3;c++){
      const cx=ox+18+c*32,cy=oy+18+r*32,di=r*3+c;
      svg.appendChild(svgEl('circle',{cx,cy,r:12,fill:dialCol,stroke:'#0d1b2a','stroke-width':'1'}));
      const a=(dials[di]*30-90)*Math.PI/180;
      svg.appendChild(svgEl('line',{x1:cx,y1:cy,x2:cx+9*Math.cos(a),y2:cy+9*Math.sin(a),stroke:dials[di]===0?'#2e7d32':'#e53935','stroke-width':'2.2','stroke-linecap':'round'}));
      svg.appendChild(svgEl('circle',{cx,cy,r:1.5,fill:'#0d1b2a'}));
    }
    [[34,34],[66,34],[34,66],[66,66]].forEach(([px,py])=>svg.appendChild(svgEl('circle',{cx:ox+px,cy:oy+py,r:3.5,fill:'#ffd600',stroke:'#1a1a1a','stroke-width':'.8'})));
    svgText(svg,ox+50,oy+115,label);
  };
  drawFace(10,2,cl.front,'Frente','#1565c0','#e3f2fd');
  drawFace(160,2,cl.back,'Atrás','#90caf9','#0d47a1');
  el.appendChild(svg);
}
const SQ1_COL={U:'#ffd600',D:'#ffffff',F:'#e53935',R:'#2e9e4f',B:'#ff8f00',L:'#1565c0'};
function renderSq1(st){
  const el=netReset();
  const svg=svgEl('svg',{viewBox:'0 0 300 196',width:'300',height:'196'});
  const s=34,Rr=s/Math.cos(Math.PI/12),Rc=s*Math.SQRT2,K=1.24;
  const P=(cx,cy,deg,r)=>[cx+r*Math.cos(deg*Math.PI/180),cy+r*Math.sin(deg*Math.PI/180)];
  const poly=(pts,fill)=>svg.appendChild(svgEl('polygon',{points:pts.map(q=>q[0].toFixed(1)+','+q[1].toFixed(1)).join(' '),fill,stroke:'#1a1a1a','stroke-width':'1.2','stroke-linejoin':'round'}));
  // base = ángulo en pantalla donde empieza el hueco 0 (el corte frontal); así el cuadrado resuelto queda recto
  const drawLayer=(cx,cy,layer,base,label)=>{
    let start=0;for(let i=0;i<12;i++)if(layer[i]!==layer[(i+11)%12]){start=i;break;}
    for(let k=0;k<12;){
      const i=(start+k)%12,pc=layer[i],span=(pc.k==='C'&&layer[(i+1)%12]===pc)?2:1,a0=base+i*30;
      const top=SQ1_COL[pc.o];
      if(span===2){
        const p0=P(cx,cy,a0,Rr),p1=P(cx,cy,a0+30,Rc),p2=P(cx,cy,a0+60,Rr);
        poly([[cx,cy],p0,p1,p2],top);
        poly([p0,p1,P(cx,cy,a0+30,Rc*K),P(cx,cy,a0,Rr*K)],SQ1_COL[pc.sd[0]]);
        poly([p1,p2,P(cx,cy,a0+60,Rr*K),P(cx,cy,a0+30,Rc*K)],SQ1_COL[pc.sd[1]]);
      }else{
        const p0=P(cx,cy,a0,Rr),p1=P(cx,cy,a0+30,Rr);
        poly([[cx,cy],p0,p1],top);
        poly([p0,p1,P(cx,cy,a0+30,Rr*K),P(cx,cy,a0,Rr*K)],SQ1_COL[pc.sd[0]]);
      }
      k+=span;
    }
    const q0=P(cx,cy,base,Rc*K+5),q1=P(cx,cy,base+180,Rc*K+5);
    svg.appendChild(svgEl('line',{x1:q0[0],y1:q0[1],x2:q1[0],y2:q1[1],style:'stroke:var(--accent)','stroke-width':'1.8','stroke-dasharray':'5 3'}));
    svgText(svg,cx,cy+Rc*K+16,label);
  };
  drawLayer(75,78,st.top,105,'Arriba');
  drawLayer(225,78,st.bot,255,'Abajo');
  // Capa media vista de frente: pieza izquierda (corta) y derecha (larga); si está girada se ve la cara B
  const mx=110,my=172,w=80,h=12,lw=w*0.365;
  poly([[mx,my],[mx+lw,my],[mx+lw,my+h],[mx,my+h]],SQ1_COL.F);
  poly([[mx+lw,my],[mx+w,my],[mx+w,my+h],[mx+lw,my+h]],SQ1_COL[st.mid?'B':'F']);
  svgText(svg,150,my-4,'Capa media'+(st.mid?' (girada)':''),8.5);
  if(!st.valid)svgText(svg,150,12,'scramble no válido',9).setAttribute('style','fill:var(--red)');
  el.appendChild(svg);
}
function renderMegaRef(){
  const el=netReset();
  const svg=svgEl('svg',{viewBox:'0 0 250 128',width:'250',height:'128'});
  const colors=['#fff','#e53935','#2e7d32','#8b5cf6','#ffd600','#1565c0'];
  const cx=125,cy=60,r=30;
  const pent=(x,y,rr,fill)=>{let pts='';for(let i=0;i<5;i++){const a=-Math.PI/2+i*2*Math.PI/5;pts+=(i?' ':'')+`${x+rr*Math.cos(a)},${y+rr*Math.sin(a)}`;}svg.appendChild(svgEl('polygon',{points:pts,fill,stroke:'#1a1a1a','stroke-width':'1.2'}));};
  pent(cx,cy,r,colors[0]);
  for(let i=0;i<5;i++){const a=-Math.PI/2+i*2*Math.PI/5;pent(cx+Math.cos(a)*(r+18),cy+Math.sin(a)*(r+18),12,colors[i+1]);}
  svgText(svg,125,124,'Megaminx · diagrama de referencia',8);
  el.appendChild(svg);
}

// ====== APP STATE ======
const $=id=>document.getElementById(id);
const DEF_SETTINGS={insp:true,inspDur:15,beep:true,focus:true,rs:true,wake:true,scrSize:'m'};
const INSP_OPTS=[8,10,12,15,20,30,45,60],SCR_FS={s:'.9rem',m:'1.05rem',l:'1.3rem',xl:'1.6rem'};
let settings=Object.assign({},DEF_SETTINGS,(()=>{const v=store.get('ekitimer-settings',{});return v&&typeof v==='object'?v:{};})());
settings.inspDur=INSP_OPTS.includes(+settings.inspDur)?+settings.inspDur:15;
if(!SCR_FS[settings.scrSize])settings.scrSize='m';
let curCat=store.get('ekitimer-cat','3x3');if(!WCA[curCat])curCat='3x3';
let solves=[],sessions={},rounds=[],comp=null;
let compPrefs=(()=>{const v=store.get('ekitimer-comp-prefs',{});return v&&typeof v==='object'?v:{};})();
let meta=(()=>{const v=store.get('ekitimer-meta',{});return v&&typeof v==='object'?v:{};})();
let curScr='',curSrc='',tState='idle',startT=0,inspStart=null,holdT=null,holdFrom='idle',rafId=0,beeped={},pendingInsp=null;
let undoBuf=null,toastT=null,activeTab='times',detailId=null,lastStopAt=0,roundView=null,impPending=null;
let selMode=false,sel=new Set(),selAnchor=null,animateFirst=false;
let practice=null; // práctica libre con mezclas oficiales de la WCA
let mbldN=Math.min(60,Math.max(2,parseInt(store.get('ekitimer-mbld',3))||3));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plural=(n,a,b)=>n===1?a:b;
const nf=n=>n.toLocaleString('es-ES');

// ====== DATOS / SESIONES ======
function sessFor(cat){
  if(!sessions[cat]||!Array.isArray(sessions[cat].list)||!sessions[cat].list.length)sessions[cat]={list:[{id:'s1',name:'Sesión 1'}],cur:'s1'};
  const S=sessions[cat];if(!S.list.find(x=>x.id===S.cur))S.cur=S.list[0].id;
  return S;
}
function sessName(cat,id){const x=sessFor(cat).list.find(s=>s.id===id);return x?x.name:'';}
function sortSolves(){solves.sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:(a.id<b.id?1:-1));}
function sanitizeSolves(arr){
  return(Array.isArray(arr)?arr:[]).filter(s=>s&&typeof s==='object'&&WCA[s.category]&&isFinite(s.time)).map(s=>{
    if(!s.id)s.id=uid();if(!s.session)s.session='s1';if(s.comment==null)s.comment='';
    if(!s.date||isNaN(Date.parse(s.date)))s.date=new Date(0).toISOString();
    if(s.penalty!=='+2'&&s.penalty!=='DNF')s.penalty=null;
    if(s.category==='mbld'&&!s.mbld)s.mbld={s:0,a:0};
    if(s.scramble==null)s.scramble='';
    return s;
  });
}
function ensureSessionsForSolves(){
  solves.forEach(s=>{
    const S=sessFor(s.category);
    if(!S.list.find(x=>x.id===s.session))S.list.push({id:s.session,name:'Sesión '+(S.list.length+1)});
  });
}
function validRound(r){return r&&typeof r==='object'&&WCA[r.cat]&&COMP_FMT[WCA[r.cat].fmt]&&Array.isArray(r.attempts);}
function loadData(){
  solves=sanitizeSolves(store.get('ekitimer-solves',[]));
  const ss=store.get('ekitimer-sessions',{});sessions=(ss&&typeof ss==='object'&&!Array.isArray(ss))?ss:{};
  ensureSessionsForSolves();
  const rr=store.get('ekitimer-rounds',[]);rounds=Array.isArray(rr)?rr.filter(validRound):[];
  const c=store.get('ekitimer-comp',null);comp=validRound(c)&&!c.done?c:null;
  if(comp)curCat=comp.cat;
  sortSolves();
}
let saveWarned=false;
function save(){
  const ok=[store.set('ekitimer-solves',solves),store.set('ekitimer-sessions',sessions),
    store.set('ekitimer-rounds',rounds),store.set('ekitimer-comp',comp)].every(Boolean);
  if(!ok&&!saveWarned){saveWarned=true;showBanner('No se ha podido guardar en este navegador (puede que esté lleno o en modo privado). Descarga una copia para no perder tus tiempos.',true);}
  updateBackupHint();
  return ok;
}
const curSess=()=>sessFor(curCat).cur;
const catSolves=()=>solves.filter(s=>s.category===curCat&&s.session===curSess());

// ---- Deshacer: foto completa del estado antes de cada cambio ----
const snapshot=()=>JSON.stringify({solves,sessions,rounds,comp});
function commit(msg,snap){undoBuf=snap;save();refreshAll();if(msg)showToast(msg,true);}
function undo(){
  if(!undoBuf)return;
  const d=JSON.parse(undoBuf);undoBuf=null;
  solves=d.solves;sessions=d.sessions;rounds=d.rounds;comp=d.comp;
  if(comp&&comp.cat!==curCat){curCat=comp.cat;$('category').value=curCat;store.set('ekitimer-cat',curCat);updateCatUI();newScramble();}
  sel.clear();save();refreshAll();updateCompUI();resetTimerDisplay();showToast('Deshecho',false);
}

// ====== FORMATO Y CÁLCULOS ======
// Singles: truncados a centésimas (como un timer WCA). Medias: redondeadas.
function fmt(t,round){
  if(t==null||!isFinite(t))return t===Infinity?'DNF':'-';
  const c=round?Math.round(t*100):Math.floor(t*100+1e-6),m=Math.floor(c/6000),s=(c%6000)/100;
  return m>0?`${m}:${s.toFixed(2).padStart(5,'0')}`:s.toFixed(2);
}
function fmtFor(cat,v,avg){
  if(v==null)return'-';if(v===Infinity)return'DNF';
  if(WCA[cat].fmt==='fmc')return avg?v.toFixed(2):String(v);
  return fmt(v,avg);
}
// Unidades → texto (centésimas, o movimientos×100 en FMC)
function fmtU(cat,u,avg){
  if(u==null)return'-';if(u===Infinity)return'DNF';
  if(isFmc(cat))return avg?(u/100).toFixed(2):String(Math.round(u/100));
  return fmt(u/100,true);
}
const mbldPts=s=>s.mbld?2*s.mbld.s-s.mbld.a:-1;
const mbldValid=s=>s.mbld&&s.penalty!=='DNF'&&s.mbld.a>=2&&s.mbld.s>=2&&mbldPts(s)>=0;
function getEff(s){
  if(s.penalty==='DNF')return Infinity;
  if(s.mbld)return mbldValid(s)?(1000-mbldPts(s))*1e6+s.time:Infinity;
  return s.penalty==='+2'?s.time+2:s.time;
}
function disp(s){
  if(s.mbld){const r=`${s.mbld.s}/${s.mbld.a} ${fmt(s.time).replace(/\.\d+$/,'')}`;return mbldValid(s)?r:'DNF ('+r+')';}
  if(s.penalty==='DNF')return'DNF';
  if(WCA[s.category].fmt==='fmc')return String(s.time);
  const str=fmt(getEff(s));return s.penalty==='+2'?str+'+':str;
}
// type 'ao': media recortada (5% por lado, mínimo 1) · 'mo': media simple
function avgOf(list,n,type){
  if(list.length<n)return null;
  const l=list.slice(0,n);
  if(type==='mo')return l.some(v=>v===Infinity)?Infinity:l.reduce((a,b)=>a+b,0)/n;
  const trim=Math.max(1,Math.ceil(n*0.05));
  if(l.filter(v=>v===Infinity).length>trim)return Infinity;
  const s=[...l].sort((a,b)=>a-b).slice(trim,n-trim);
  return s.reduce((a,b)=>a+b,0)/s.length;
}
function bestRolling(effs,n,type){
  let best=null;
  for(let i=0;i+n<=effs.length;i++){const v=avgOf(effs.slice(i,i+n),n,type);if(best===null||v<best)best=v;}
  return best;
}
function avgDefs(cat){
  const F=WCA[cat].fmt;
  return F==='ao5'?[['Ao5',5,'ao'],['Ao12',12,'ao']]:F==='mo3'?[['Mo3',3,'mo'],['Ao5',5,'ao']]:(F==='bo3'||F==='fmc')?[['Mo3',3,'mo']]:[];
}

// ====== ENTRADA MANUAL ======
function parseTime(str){
  str=String(str).trim().toLowerCase().replace(',','.');
  if(!str)return null;
  if(str==='dnf')return{time:0,penalty:'DNF'};
  let pen=null;
  if(str.endsWith('+')){pen='+2';str=str.slice(0,-1).trim();}
  if(/^\d+$/.test(str)){ // estilo csTimer: 1234 → 12.34 · 12345 → 1:23.45
    const n=str.padStart(3,'0'),cs=parseInt(n.slice(-2)),rest=n.slice(0,-2),sec=parseInt(rest.slice(-2)),min=parseInt(rest.slice(0,-2)||'0');
    if(min>0&&sec>=60)return null;
    return{time:min*60+sec+cs/100,penalty:pen};
  }
  if(str.includes(':')){
    const p=str.split(':');if(p.length!==2||!/^\d+$/.test(p[0])||!/^\d*\.?\d+$/.test(p[1]))return null;
    const m=parseFloat(p[0]),s=parseFloat(p[1]);
    if(s>=60)return null;
    return{time:m*60+s,penalty:pen};
  }
  if(!/^\d*\.?\d+$/.test(str))return null;
  return{time:parseFloat(str),penalty:pen};
}
function parseFmc(str){
  str=String(str).trim().toLowerCase();
  if(str==='dnf')return{time:0,penalty:'DNF'};
  if(!/^\d+$/.test(str))return null;
  const n=parseInt(str);return n>0&&n<=80?{time:n,penalty:null}:null;
}
function parseMbld(str){
  const m=String(str).trim().match(/^(\d+)\s*\/\s*(\d+)\s+(.+)$/);if(!m)return null;
  const s=parseInt(m[1]),a=parseInt(m[2]),t=parseTime(m[3]);
  if(!t||t.penalty||a<2||s>a||t.time<=0)return null;
  return{time:t.time,penalty:null,mbld:{s,a}};
}
function flashErr(el){el.classList.add('err');el.style.borderColor='var(--red)';setTimeout(()=>{el.classList.remove('err');el.style.borderColor='';},900);}
function addManual(){
  const inp=$('manualInput'),F=WCA[curCat].fmt;
  const rec=F==='fmc'?parseFmc(inp.value):F==='mbld'?parseMbld(inp.value):parseTime(inp.value);
  if(!rec||(rec.penalty!=='DNF'&&F!=='fmc'&&F!=='mbld'&&rec.time<=0)){flashErr(inp);return;}
  inp.value='';inp.blur();
  pushSolve(rec);resetTimerDisplay();
}
function pushSolve(rec){
  const s=Object.assign({id:uid(),scramble:curScr,category:curCat,session:curSess(),date:new Date().toISOString(),comment:''},rec);
  if(s.insp==null)delete s.insp;
  const w=curSrc==='wca'?wcaCurrent():null;
  if(w&&w.scramble===curScr)s.wca={c:w.src.compId,cn:w.src.compName,e:w.src.eventId,r:w.src.roundLabel,g:w.src.group,k:w.item.num,x:w.item.extra?1:0};
  let limitHit=false;
  if(comp){
    s.comp=comp.id;
    if(comp.limit!=null&&s.penalty!=='DNF'&&unitsOf(s.category,s.time,s.penalty)>=comp.limit){s.penalty='DNF';limitHit=true;}
    comp.attempts.push({id:s.id,time:s.time,penalty:s.penalty});
  }
  solves.unshift(s);undoBuf=null;animateFirst=true;
  if(comp&&compCheck())return;
  if(!comp&&w&&practice&&w.src===practice){
    practice.done=practice.done||{};practice.done[practice.idx]=s.id;
    if(practice.idx<practice.list.length-1)practice.idx++;
    else practice.finished=true;
    savePractice();
  }
  save();refreshAll();newScramble();
  if(practice&&practice.finished&&!comp){practice.finished=false;savePractice();setTimeout(()=>openPracticeSummary(),250);}
  if(limitHit)showToast('Límite de tiempo alcanzado: DNF',false);
}

// ====== SCRAMBLE ======
let scrTok=0;const pre={};
const preKey=cat=>cat+(WCA[cat].isMulti?':'+mbldN:'')+(settings.rs?':rs':':rm');
async function newScramble(){
  const w=wcaCurrent();
  if(w){++scrTok;curScr=w.scramble;curSrc='wca';showScramble();return;}
  const tok=++scrTok,cat=curCat,k=preKey(cat);
  updateScrLabel();
  let p=pre[k];delete pre[k];
  if(!p){$('scrambleText').textContent='Generando scramble…';$('scrSrc').textContent='';p=makeScramble(cat);}
  let r;try{r=await p;}catch(e){r={s:genScramble(cat),src:'rm'};}
  if(tok!==scrTok)return;
  curScr=r.s;curSrc=r.src;showScramble();
  pre[k]=makeScramble(cat);
}
function updateScrLabel(){
  const c=WCA[curCat];let t=c.name;
  if(comp){const F=COMP_FMT[c.fmt];t+=` · Intento ${Math.min(comp.attempts.length+1,F.n)}/${F.n}`;}
  $('scrambleLabel').textContent=t;
}
function showScramble(){
  const st=$('scrambleText'),src=$('scrSrc'),c=WCA[curCat];
  st.textContent=curScr;st.classList.toggle('multi',!!c.isMulti);
  if(curSrc==='wca'){
    src.innerHTML='★<span class="lbl"> mezcla oficial WCA</span>';src.className='scr-src wca';
    src.title='Mezcla oficial de una competición de la WCA';
  }else{
    src.innerHTML=curSrc==='rs'?'●<span class="lbl"> estado aleatorio</span>':'○<span class="lbl"> movimientos aleatorios</span>';
    src.className='scr-src'+(curSrc==='rs'?' rs':'');
    src.title=curSrc==='rs'?'Generado con cubing.js, igual que los scrambles oficiales de la WCA':'Generador local de movimientos aleatorios (sin conexión o desactivado en Ajustes)';
  }
  updateScrLabel();renderWcaBar();renderVis();
}
function renderVis(){
  const c=WCA[curCat],w=$('cubeVisWrapper');
  if(c.isMulti){w.style.display='none';return;}
  w.style.display='flex';
  try{
    if(c.size)renderNet(cubeState(curScr,c.size),c.size);
    else if(curCat==='pyraminx')renderPolys(pyraPuzzle(),pyraState(curScr));
    else if(curCat==='skewb')renderPolys(skewbPuzzle(),skewbState(curScr));
    else if(c.isClock)renderClockNet(simClock(curScr));
    else if(c.isSq1)renderSq1(sq1State(curScr));
    else if(c.isMega)renderPolys(megaPuzzle(),megaState(curScr));
    else renderMegaRef();
  }catch(e){console.error(e);w.style.display='none';}
}

// ====== TIMER ======
const useInsp=()=>!WCA[curCat].noInsp&&(comp?true:settings.insp);
const inspD=()=>comp?15:settings.inspDur;
function idleHint(){
  const c=WCA[curCat];
  if(c.noTimer)return comp?'FMC: escribe abajo los movimientos de tu solución':'FMC: escribe abajo el nº de movimientos de tu solución';
  const pre=comp?`Intento ${comp.attempts.length+1} · `:'';
  return pre+(useInsp()?`Pulsa ESPACIO para inspeccionar (${inspD()} s)`:'Mantén ESPACIO para preparar');
}
function tClass(c){$('timer').className='timer-display '+c;}
function setT(s){tState=s;updateFocus();}
function updateFocus(){
  const on=settings.focus&&(tState==='running'||tState==='ready'||tState==='inspecting'||(tState==='holding'&&holdFrom==='inspecting'));
  $('app').classList.toggle('solving',on);
}
function resetTimerDisplay(){
  if(['inspArm','inspecting','holding','ready','running'].includes(tState))return;
  if(WCA[curCat].noTimer){$('timer').textContent='—';tClass('muted');}
  else if(tState==='idle'&&!catSolves().length){$('timer').textContent='0.00';tClass('idle');}
  $('hint').textContent=idleHint();
}
function hDown(){
  if(tState==='running'){stop();return;}
  if(WCA[curCat].noTimer)return;
  if(tState==='idle'||tState==='stopped'){
    if(useInsp()){setT('inspArm');tClass('inspecting');$('timer').textContent=String(inspD());return;}
    startHold('idle');return;
  }
  if(tState==='inspecting')startHold('inspecting');
}
function startHold(from){
  holdFrom=from;setT('holding');tClass('holding');
  holdT=setTimeout(()=>{
    setT('ready');tClass('ready');
    if(!inspStart)$('timer').textContent='0.00';
    $('hint').textContent='Suelta para iniciar';
  },300);
}
function hUp(){
  if(tState==='inspArm'){startInspection();return;}
  if(tState==='holding'){
    clearTimeout(holdT);setT(holdFrom);
    if(holdFrom==='inspecting'){tClass('inspecting');$('hint').textContent='Inspección · mantén ESPACIO para preparar';}
    else{tClass('idle');$('hint').textContent=idleHint();}
    return;
  }
  if(tState==='ready')go();
}
function startInspection(){
  ensureAudio();updateWake();
  inspStart=performance.now();beeped={};setT('inspecting');tClass('inspecting');
  $('hint').textContent='Inspección · mantén ESPACIO para preparar · Esc cancela';
  loop();
}
function cancelTimer(){
  if(!['inspecting','holding','ready','inspArm'].includes(tState))return;
  clearTimeout(holdT);cancelAnimationFrame(rafId);inspStart=null;setT('idle');tClass('idle');
  $('timer').textContent='0.00';$('hint').textContent=idleHint();
}
function go(){
  let ins=null,pen=null;
  if(inspStart){const D=inspD();ins=(performance.now()-inspStart)/1000;pen=ins>D+2?'DNF':ins>D?'+2':null;}
  pendingInsp={ins,pen};inspStart=null;
  startT=performance.now();setT('running');tClass('running');
  $('hint').textContent='Resolviendo… (cualquier tecla para parar)';
  loop();
}
function loop(){
  cancelAnimationFrame(rafId);
  const f=()=>{
    const now=performance.now();
    if(tState==='running'){
      const el=(now-startT)/1000;
      $('timer').textContent=fmt(el);
      if(comp&&comp.limit!=null&&Math.floor(el*100+1e-6)>=comp.limit){stop();return;}
    }
    else if(inspStart&&['inspecting','holding','ready'].includes(tState)){
      const D=inspD(),e=(now-inspStart)/1000;
      $('timer').textContent=e<D?String(Math.ceil(D-e)):e<D+2?'+2':'DNF';
      if(tState==='inspecting')tClass(e>=D?'insp-late':'inspecting');
      const w1=D-7,w2=D-3,wca=D===15;
      if(w1>0&&e>=w1&&!beeped[1]){beeped[1]=1;warn(wca?'¡8 segundos!':'¡Quedan 7 s!',784);}
      if(w2>0&&e>=w2&&!beeped[2]){beeped[2]=1;warn(wca?'¡12 segundos!':'¡Quedan 3 s!',1046);}
    }else return;
    rafId=requestAnimationFrame(f);
  };
  rafId=requestAnimationFrame(f);
}
function stop(){
  const el=(performance.now()-startT)/1000;
  cancelAnimationFrame(rafId);setT('stopped');lastStopAt=Date.now();
  tClass('idle');$('timer').textContent=fmt(el);$('hint').textContent=idleHint();
  const pi=pendingInsp||{};pendingInsp=null;
  if(WCA[curCat].isMulti){
    const inp=$('manualInput');inp.value=`/${mbldN} ${fmt(el)}`;
    setTimeout(()=>{inp.focus();inp.setSelectionRange(0,0);},0);
    $('hint').textContent='Escribe cuántos cubos resolviste delante de la barra y pulsa Enter';
  }else{
    const rec={time:el,penalty:pi.pen||null};
    if(pi.ins!=null)rec.insp=Math.round(pi.ins*100)/100;
    pushSolve(rec);
  }
  setTimeout(()=>{if(tState==='stopped')setT('idle');},200);
}
let actx=null;
function ensureAudio(){try{if(!actx)actx=new(window.AudioContext||window.webkitAudioContext)();if(actx.state==='suspended')actx.resume();}catch(e){}}
function beep(freq){
  if(!settings.beep||!actx)return;
  try{const o=actx.createOscillator(),g=actx.createGain();o.frequency.value=freq;g.gain.setValueAtTime(.1,actx.currentTime);g.gain.exponentialRampToValueAtTime(.001,actx.currentTime+.18);o.connect(g);g.connect(actx.destination);o.start();o.stop(actx.currentTime+.2);}catch(e){}
}
function warn(t,f){beep(f);$('hint').textContent=t;}

// ---- Pantalla siempre encendida ----
let wakeLock=null,wakeBusy=false;
async function updateWake(){
  if(!('wakeLock' in navigator)||wakeBusy)return;
  wakeBusy=true;
  try{
    if(settings.wake&&document.visibilityState==='visible'){
      if(!wakeLock){wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',()=>{wakeLock=null;});}
    }else if(wakeLock){const w=wakeLock;wakeLock=null;await w.release();}
  }catch(e){wakeLock=null;}
  wakeBusy=false;
}

function setupTimer(){
  document.addEventListener('keydown',e=>{
    if(tState==='running'){if(!e.repeat){e.preventDefault();stop();}return;}
    if(anyModalOpen()){if(e.key==='Escape')closeAllModals();return;}
    const tag=e.target.tagName;
    if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT')return;
    if((e.ctrlKey||e.metaKey)&&e.code==='KeyZ'){e.preventDefault();undo();return;}
    if(e.altKey&&e.code==='KeyZ'){e.preventDefault();const s=catSolves()[0];if(s)removeSolves([s.id],'Último tiempo eliminado');return;}
    if(e.altKey&&['Digit1','Digit2','Digit3'].includes(e.code)){
      e.preventDefault();const s=catSolves()[0];if(s)setPen(s.id,{Digit1:null,Digit2:'+2',Digit3:'DNF'}[e.code]);return;
    }
    if(e.code==='Space'||e.key===' '){e.preventDefault();if(!e.repeat)hDown();return;}
    if(e.key==='Escape'){if(selMode){exitSel();return;}cancelTimer();}
  });
  document.addEventListener('keyup',e=>{
    if(e.code!=='Space'&&e.key!==' ')return;
    const tag=e.target.tagName;
    if((tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT')&&!['inspArm','holding','ready'].includes(tState))return;
    if(anyModalOpen()&&!['inspArm','holding','ready'].includes(tState))return;
    e.preventDefault();hUp();
  });
  let touching=false;
  document.addEventListener('touchstart',e=>{
    if(tState==='running'){stop();touching=false;return;}
    if(anyModalOpen())return;
    if(!e.target.closest('main'))return;
    if(e.target.closest('.scramble-box,.stats-bar,.cube-vis-wrapper,.manual-input-row,.banner,button,select,input,textarea'))return;
    touching=true;hDown();
  },{passive:true});
  document.addEventListener('touchend',()=>{if(!touching)return;touching=false;hUp();},{passive:true});
  document.addEventListener('touchcancel',()=>{if(!touching)return;touching=false;hUp();},{passive:true});
}

// ====== MODO COMPETICIÓN ======
const compF=r=>COMP_FMT[WCA[r.cat].fmt];
const cutNOf=r=>r.cutN!=null?r.cutN:compF(r).cutN;
const compUnits=r=>r.attempts.map(a=>unitsOf(r.cat,a.time,a.penalty));
// Devuelve true si la ronda ha terminado (y la cierra)
function compCheck(){
  if(!comp)return false;
  const F=compF(comp),u=compUnits(comp);
  const cut=cutoffFailed(u,cutNOf(comp),comp.cutoff);
  if(cut||u.length>=F.n){finishRound();return true;}
  return false;
}
function scoreRound(r){
  const F=compF(r),u=compUnits(r);
  r.cutFail=cutoffFailed(u,cutNOf(r),r.cutoff);
  r.result=r.cutFail||u.length<F.n?null:roundResult(u.slice(0,F.n),F.type);
  r.best=u.length?Math.min(...u):null;
}
function finishRound(){
  const r=comp;comp=null;
  r.done=true;r.end=new Date().toISOString();scoreRound(r);
  rounds.unshift(r);
  save();refreshAll();updateCompUI();newScramble();resetTimerDisplay();
  showRound(r.id,true);
}
function prevBestRound(r){
  let best=null;
  rounds.forEach(x=>{if(x.id!==r.id&&x.cat===r.cat&&x.result!=null&&x.result!==Infinity&&(best===null||x.result<best))best=x.result;});
  return best;
}
function roundTimesStr(r){
  const F=compF(r),u=compUnits(r),tr=F.type==='ao'&&u.length===F.n?trimmedIdx(u):[];
  return r.attempts.map((a,i)=>{
    const s=fmtU(r.cat,u[i])+(a.penalty==='+2'?'+':'');
    return tr.includes(i)?`(${s})`:s;
  }).join('  ');
}
function openCompSetup(){
  if(comp){
    if(confirm('¿Abandonar la ronda? Los tiempos que ya hiciste se quedan en la sesión.')){
      comp=null;undoBuf=null;save();refreshAll();updateCompUI();newScramble();resetTimerDisplay();showToast('Ronda abandonada',false);
    }
    return;
  }
  const c=WCA[curCat],F=COMP_FMT[c.fmt];
  if(!F){showToast('El modo competición no está disponible en Multi-BLD',false);return;}
  const fmc=isFmc(curCat),p=compPrefs[curCat]||{};
  const fmtTxt=F.type==='bo'?'Mejor de 3 (cuenta tu mejor intento)':F.type==='mo'?'Media de 3':'Media de 5 (se quitan el mejor y el peor)';
  const insp=c.noInsp?'sin inspección':'inspección WCA de 15 s obligatoria';
  $('compDesc').innerHTML=`<b>${esc(c.name)}</b> · ${fmtTxt} · ${insp}. Los tiempos se guardan también en la sesión actual.`;
  $('compTargetLbl').textContent=F.type==='bo'?'Objetivo de single':'Objetivo de media';
  $('compTarget').placeholder=fmc?'opcional, ej: 30':'opcional, ej: '+(F.type==='bo'?'1:30.00':'12.00');
  $('compTargetHelp').textContent=fmc?'Te diré cuántos movimientos necesitas para bajar de este número.':'Te diré qué tiempo necesitas en el último intento para bajar de este objetivo.';
  $('compCutRow').hidden=!F.cutN;
  $('compCutHelp').textContent=F.cutN?`Tienes que bajar de este tiempo en ${F.cutN===1?'el primer intento':'alguno de los 2 primeros intentos'} para seguir la ronda.`:'';
  $('compLimRow').hidden=fmc;
  $('compTarget').value=p.target||'';$('compCutoff').value=p.cutoff||'';$('compLimit').value=p.limit||'';
  ['compTarget','compCutoff','compLimit'].forEach(id=>$(id).classList.remove('err'));
  $('compOverlay').classList.add('active');
  setTimeout(()=>$('compTarget').focus(),50);
}
function readUnitsField(id,fmc,allowEmpty){
  const v=$(id).value.trim();
  if(!v)return allowEmpty?{ok:true,u:null}:{ok:false};
  if(fmc){const m=v.replace(',','.');if(!/^\d+(\.\d+)?$/.test(m))return{ok:false};const n=parseFloat(m);return n>0?{ok:true,u:Math.round(n*100)}:{ok:false};}
  // En objetivos, cortes y límites un número sin separadores son segundos ("12" = 12.00)
  const t=/^\d+$/.test(v)?{time:parseInt(v),penalty:null}:parseTime(v);
  if(!t||t.penalty||t.time<=0)return{ok:false};
  return{ok:true,u:Math.round(t.time*100)};
}
function startRound(){
  const F=COMP_FMT[WCA[curCat].fmt],fmc=isFmc(curCat);
  const tg=readUnitsField('compTarget',fmc,true),cu=F.cutN?readUnitsField('compCutoff',false,true):{ok:true,u:null},li=fmc?{ok:true,u:null}:readUnitsField('compLimit',false,true);
  let bad=false;
  [['compTarget',tg],['compCutoff',cu],['compLimit',li]].forEach(([id,r])=>{if(!r.ok){$(id).classList.add('err');bad=true;}else $(id).classList.remove('err');});
  if(!bad&&cu.u!=null&&li.u!=null&&li.u<=cu.u){$('compLimit').classList.add('err');showToast('El límite debe ser mayor que el corte',false);return;}
  if(bad)return;
  compPrefs[curCat]={target:$('compTarget').value.trim(),cutoff:$('compCutoff').value.trim(),limit:$('compLimit').value.trim()};
  store.set('ekitimer-comp-prefs',compPrefs);
  cancelTimer();
  comp={id:uid(),cat:curCat,fmt:WCA[curCat].fmt,target:tg.u,cutoff:cu.u,limit:li.u,attempts:[],start:new Date().toISOString(),done:false};
  undoBuf=null;
  $('compOverlay').classList.remove('active');
  save();refreshAll();updateCompUI();newScramble();
  $('timer').textContent=WCA[curCat].noTimer?'—':'0.00';tClass(WCA[curCat].noTimer?'muted':'idle');
  $('hint').textContent=idleHint();
}
function updateCompUI(){
  const b=$('compBtn'),c=WCA[curCat];
  b.classList.toggle('on',!!comp);$('app').classList.toggle('in-comp',!!comp);
  $('compBtnLbl').textContent=comp?'Abandonar ronda':'Competición';
  b.title=comp?'Abandonar la ronda actual':(COMP_FMT[c.fmt]?'Modo competición':'No disponible en Multi-BLD');
  b.disabled=!comp&&!COMP_FMT[c.fmt];
  $('category').disabled=!!comp;$('session').disabled=!!comp;
  $('category').title=comp?'Termina o abandona la ronda para cambiar de categoría':'Categoría';
  updateScrLabel();
}
function renderCompPanel(){
  const r=comp,F=compF(r),u=compUnits(r),k=u.length,step=isFmc(r.cat)?100:1,cutN=cutNOf(r);
  const cut=r.cutoff!=null&&cutN?{made:u.slice(0,cutN).some(v=>v<r.cutoff)}:null;
  let slots='';
  for(let i=0;i<F.n;i++){
    const a=r.attempts[i];
    if(a){
      const cls=a.penalty==='DNF'?'dnf':a.penalty==='+2'?'plus2':'';
      slots+=`<div class="cp-slot filled" data-id="${a.id}" title="Ver o corregir"><div class="cp-n">${i+1}</div><div class="cp-v ${cls}">${esc(fmtU(r.cat,u[i])+(a.penalty==='+2'?'+':''))}</div></div>`;
    }else{
      const skip=cut&&!cut.made&&i>=cutN;
      slots+=`<div class="cp-slot${i===k?' cur':''}${skip?' skip':''}"><div class="cp-n">${i+1}</div><div class="cp-v">${i===k?'…':''}</div></div>`;
    }
  }
  const info=[];
  if(r.wca&&r.target!=null)info.push(`<div class="big">Objetivo: mejorar tu <span class="mono">${esc(fmtU(r.cat,r.target,F.type!=='bo'))}</span> oficial</div>`);
  else if(r.target!=null)info.push(`<div class="big">Objetivo: <span class="mono">${F.type==='bo'?'single ':''}sub-${esc(fmtU(r.cat,r.target,F.type!=='bo'))}</span></div>`);
  if(F.type==='bo'){
    const best=k?Math.min(...u):null;
    if(k)info.push(`<div>Mejor hasta ahora: <span class="mono">${esc(fmtU(r.cat,best))}</span></div>`);
    if(r.target!=null)info.push(best!=null&&best<r.target?'<div class="ok">✓ Objetivo conseguido</div>':`<div>Necesitas bajar de <span class="mono">${esc(fmtU(r.cat,r.target))}</span> en ${k===F.n-1?'el último intento':'algún intento'}</div>`);
  }else if(k===F.n-1){
    if(F.type==='ao'){const{bpa,wpa}=bpaWpa(u,'ao');info.push(`<div>Mejor posible: <span class="mono">${esc(fmtU(r.cat,bpa,true))}</span> · Peor posible: <span class="mono">${esc(fmtU(r.cat,wpa,true))}</span></div>`);}
    const need=needFor(u,F.n,F.type,r.target,step);
    if(need){
      if(need.kind==='any')info.push('<div class="ok">✓ Objetivo asegurado: vale cualquier resultado, incluso DNF</div>');
      else if(need.kind==='impossible')info.push('<div class="bad">✗ Ya no se puede bajar del objetivo</div>');
      else info.push(`<div class="ok">Necesitas <span class="mono">${esc(fmtU(r.cat,need.max))}</span> o menos en el último intento</div>`);
    }
  }else if(r.target!=null&&k<F.n-1){
    info.push(`<div>Al llegar al último intento te diré el tiempo que necesitas.</div>`);
  }
  if(cut){
    if(cut.made)info.push('<div class="ok">✓ Corte superado</div>');
    else info.push(`<div>Corte: baja de <span class="mono">${esc(fmtU(r.cat,r.cutoff))}</span> en ${cutN===1?'el primer intento':`los ${cutN} primeros intentos`}</div>`);
  }
  if(r.limit!=null)info.push(`<div>Límite: <span class="mono">${esc(fmtU(r.cat,r.limit))}</span> por intento</div>`);
  const sub=r.wca?`${r.wca.compName} · ${r.wca.roundLabel} · ${r.wca.group}`:`${WCA[r.cat].name} · ${F.label}`;
  return`<div class="comp-panel"><div class="cp-head"><div class="cp-title">${r.wca?'★ Repetición':'Ronda'}<span>${esc(sub)}</span></div><button class="mini-btn" id="cpAbandon">Abandonar</button></div>
    <div class="cp-slots">${slots}</div>${info.length?`<div class="cp-info">${info.join('')}</div>`:''}</div>`;
}
function showRound(id,fresh){
  const r=rounds.find(x=>x.id===id);if(!r)return;
  roundView=id;
  const F=compF(r),cat=r.cat;
  $('rKicker').textContent=(fresh?'Ronda terminada':new Date(r.end||r.start).toLocaleString())+(r.wca?' · '+r.wca.compName:'');
  let big,fmtLine=r.wca?`${F.label} · ${WCA[cat].name} · ${r.wca.roundLabel} · ${r.wca.group}`:`${F.label} · ${WCA[cat].name}`;
  if(r.cutFail)big='Sin media';
  else if(F.type==='bo')big=fmtU(cat,r.result);
  else big=fmtU(cat,r.result,true);
  if(F.type==='bo'&&r.attempts.length===F.n){const m=roundResult(compUnits(r),'mo');if(m!==Infinity)fmtLine+=` · media ${fmtU(cat,m,true)}`;}
  $('rBig').textContent=big;$('rBig').style.color=r.result===Infinity||r.cutFail?'var(--red)':'';
  $('rFmt').textContent=fmtLine;
  $('rTimes').textContent=roundTimesStr(r);
  const notes=[];
  if(r.cutFail)notes.push(`<div class="bad">No pasaste el corte de ${esc(fmtU(cat,r.cutoff))}</div>`);
  if(r.target!=null&&!r.cutFail&&!r.wca){
    const hit=r.result!=null&&r.result<r.target;
    if(hit)notes.push(`<div class="ok">🎯 ¡Objetivo sub-${esc(fmtU(cat,r.target,F.type!=='bo'))} conseguido!</div>`);
    else if(r.result!==Infinity&&r.result!=null){
      const d=r.result-r.target+1;
      notes.push(`<div class="bad">Te faltaron ${esc(isFmc(cat)?(d/100).toFixed(2):fmt(d/100,true))} para sub-${esc(fmtU(cat,r.target,F.type!=='bo'))}</div>`);
    }
    else notes.push(`<div class="bad">Objetivo sub-${esc(fmtU(cat,r.target,F.type!=='bo'))} no conseguido</div>`);
  }
  if(r.wca)notes.push(...wcaRoundNotes(r));
  const prev=prevBestRound(r);
  if(r.result!=null&&r.result!==Infinity&&(prev===null||r.result<prev)&&rounds.filter(x=>x.cat===cat).length>1)notes.push('<div class="pb">🏅 ¡Tu mejor ronda en esta categoría!</div>');
  else if(prev!==null)notes.push(`<div>Tu mejor ronda: ${esc(fmtU(cat,prev,F.type!=='bo'))}</div>`);
  $('rNotes').innerHTML=notes.join('');
  $('rDelete').hidden=!!fresh;
  $('rAgain').hidden=!!comp||cat!==curCat;
  $('rAgain').textContent=r.wca?'Repetir otra vez':'Nueva ronda';
  $('roundOverlay').classList.add('active');
}
function roundShareText(r){
  const F=compF(r);
  const res=r.cutFail?'sin media (corte)':(F.type==='bo'?fmtU(r.cat,r.result):fmtU(r.cat,r.result,true));
  const ctx=r.wca?` (mezclas de ${r.wca.compName}, ${r.wca.roundLabel.toLowerCase()})`:'';
  return`EKITIMER · ${WCA[r.cat].name} ${F.short}${ctx}: ${res} = ${roundTimesStr(r)}`;
}
function renderRounds(){
  const list=rounds.filter(r=>r.cat===curCat),el=$('roundsList');
  if(!list.length){
    el.innerHTML=`<div class="empty-state"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".4"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg><span>Aún no hay rondas de ${esc(WCA[curCat].name)}.<br>Pulsa «Competición» para simular una.</span></div>`;
    return;
  }
  let best=null;list.forEach(r=>{if(r.result!=null&&r.result!==Infinity&&(best===null||r.result<best))best=r.result;});
  el.innerHTML=list.map(r=>{
    const F=compF(r),bo=F.type==='bo';
    const res=r.cutFail?'Sin media':fmtU(r.cat,r.result,!bo);
    const hit=r.target!=null&&!r.cutFail&&r.result!=null&&r.result<r.target;
    let badge='';
    if(r.target!=null)badge+=r.wca?`<span class="ri-badge${hit?' ok':''}">${hit?'Mejoraste ✓':'Sin mejorar'}</span>`:`<span class="ri-badge${hit?' ok':''}">sub-${esc(fmtU(r.cat,r.target,!bo))} ${hit?'✓':'✗'}</span>`;
    if(r.result===best&&best!=null)badge+='<span class="ri-badge pb">Mejor</span>';
    badge=`<span class="ri-badges">${badge}</span>`;
    return`<div class="round-item ${hit?'hit':'miss'}" data-rid="${r.id}"><div class="ri-top"><span class="ri-res${r.result===Infinity||r.cutFail?' dnf':''}">${esc(res)} <small style="color:var(--text3);font-weight:600">${F.short}</small></span>${badge}</div>
      <div class="ri-sub">${esc(roundTimesStr(r))}</div>${r.wca?`<div class="ri-wca">★ ${esc(r.wca.compName)} · ${esc(r.wca.roundLabel)} · ${esc(r.wca.group)}</div>`:''}<div class="ri-date">${esc(new Date(r.end||r.start).toLocaleString())}</div></div>`;
  }).join('');
}

// ====== ESTADÍSTICAS ======
function renderStats(){
  const cs=catSolves();
  $('timesCount').textContent=cs.length;
  if(comp&&comp.cat===curCat){$('statsBar').innerHTML=renderCompPanel();return;}
  const F=WCA[curCat].fmt,effs=cs.map(getEff),valid=effs.filter(v=>v!==Infinity);
  const f=(v,a)=>fmtFor(curCat,v,a),cards=[];
  if(F==='mbld'){
    const vs=cs.filter(mbldValid);
    const best=vs.length?vs.reduce((a,b)=>getEff(b)<getEff(a)?b:a):null;
    cards.push({l:'Mejor',v:best?disp(best):'-',sub:best?mbldPts(best)+' puntos':'',best:true});
    cards.push({l:'Puntos medios',v:vs.length?(vs.reduce((a,s)=>a+mbldPts(s),0)/vs.length).toFixed(1):'-'});
    cards.push({l:'Intentos',v:cs.length,sub:cs.length?`${vs.length} válidos`:''});
  }else{
    cards.push({l:'Mejor',v:valid.length?f(Math.min(...valid),false):'-',best:true});
    for(const[l,n,t]of avgDefs(curCat)){
      const cur=avgOf(effs,n,t),best=bestRolling(effs,n,t);
      cards.push({l,v:cur===null?'-':f(cur,true),sub:best===null?'':'mejor '+f(best,true)});
    }
    if(F==='bo3')cards.push({l:'Éxito',v:cs.length?Math.round(valid.length/cs.length*100)+'%':'-',sub:cs.length?`${valid.length}/${cs.length}`:''});
    cards.push({l:'Media',v:valid.length?f(valid.reduce((a,b)=>a+b,0)/valid.length,true):'-'});
    cards.push({l:'Solves',v:cs.length,sub:cs.length-valid.length?`${cs.length-valid.length} DNF`:''});
  }
  $('statsBar').innerHTML=cards.map(c=>`<div class="stat-card${c.best?' best':''}"><div class="stat-label">${c.l}</div><div class="stat-value">${esc(c.v)}</div>${c.sub?`<div class="stat-sub">${esc(c.sub)}</div>`:''}</div>`).join('');
}

// ====== LISTA DE TIEMPOS ======
function renderTimes(){
  const cs=catSolves(),tl=$('timesList'),F=WCA[curCat].fmt;
  for(const id of [...sel])if(!cs.find(s=>s.id===id))sel.delete(id);
  renderListTools(cs);
  tl.classList.toggle('sel-mode',selMode);
  if(!cs.length){
    tl.innerHTML=`<div class="empty-state"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".4"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span>${WCA[curCat].noTimer?'Añade tu primer resultado abajo':'Pulsa ESPACIO y empieza'}</span></div>`;
    return;
  }
  const valid=cs.map(getEff).filter(v=>v!==Infinity),best=valid.length?Math.min(...valid):null;
  tl.innerHTML=cs.map((s,i)=>{
    const eff=getEff(s),ib=eff===best;
    const cls=eff===Infinity?'dnf':s.penalty==='+2'?'plus2':ib?'best':'';
    let acts='';
    if(F!=='mbld'){
      if(F!=='fmc')acts+=`<button data-act="+2" class="${s.penalty==='+2'?'active-pen':''}" title="+2">+2</button>`;
      acts+=`<button data-act="DNF" class="${s.penalty==='DNF'?'active-pen':''}" title="DNF">DNF</button>`;
    }
    acts+=`<button data-act="del" class="del-btn" title="Eliminar">✕</button>`;
    return`<div class="time-item${sel.has(s.id)?' selected':''}${i===0&&animateFirst?' fresh':''}" data-id="${s.id}"><span class="index">${selMode?(sel.has(s.id)?'✓':'○'):cs.length-i}</span><span class="time-val ${cls}">${esc(disp(s))}</span>${s.comp?'<span class="has-note" title="Intento de una ronda">🏆</span>':''}${s.comment?'<span class="has-note" title="Tiene comentario">✎</span>':''}<div class="time-actions">${acts}</div></div>`;
  }).join('');
  animateFirst=false;
}
function renderListTools(cs){
  const lt=$('listTools');
  lt.hidden=activeTab!=='times';
  if(!selMode){
    lt.innerHTML=`<span class="grow">${esc(sessName(curCat,curSess()))}</span>${cs.length?'<button class="mini-btn" id="selOn">Seleccionar</button>':''}`;
    return;
  }
  const others=sessFor(curCat).list.filter(x=>x.id!==curSess());
  lt.innerHTML=`<span class="grow" title="${sel.size} ${plural(sel.size,'seleccionado','seleccionados')}">${sel.size} sel.</span>
    <button class="mini-btn" id="selAll">${sel.size===cs.length?'Ninguno':'Todos'}</button>
    <div class="select-wrap sm"><select id="selMove" ${sel.size?'':'disabled'}><option value="">Mover a…</option>${others.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}<option value="__new">+ Nueva sesión</option></select></div>
    <button class="mini-btn danger" id="selDel" ${sel.size?'':'disabled'} title="Eliminar seleccionados">🗑</button>
    <button class="mini-btn" id="selOff" title="Salir de la selección">✕</button>`;
}
function exitSel(){selMode=false;sel.clear();selAnchor=null;renderTimes();}
function setPen(id,p){
  const s=solves.find(x=>x.id===id);if(!s||s.mbld)return;
  if(WCA[s.category].fmt==='fmc'&&p==='+2')return;
  s.penalty=p;undoBuf=null;
  for(const r of [comp,...rounds]){
    if(!r)continue;const a=r.attempts.find(a=>a.id===id);
    if(a){a.penalty=p;if(r!==comp)scoreRound(r);}
  }
  if(comp&&comp.attempts.some(a=>a.id===id)&&compCheck()){if(detailId===id)closeDetail();return;}
  save();refreshAll();if(detailId===id)renderDetail();
}
function removeSolves(ids,msg){
  const set=new Set(ids);if(!solves.some(s=>set.has(s.id)))return;
  const snap=snapshot();
  solves=solves.filter(s=>!set.has(s.id));
  if(comp)comp.attempts=comp.attempts.filter(a=>!set.has(a.id));
  ids.forEach(id=>sel.delete(id));
  commit(msg,snap);updateScrLabel();resetTimerDisplay();
}
function moveSolves(ids,toId){
  const set=new Set(ids),snap=snapshot();let n=0;
  solves.forEach(s=>{if(set.has(s.id)&&s.session!==toId){s.session=toId;n++;}});
  if(!n)return;
  sel.clear();
  const s0=solves.find(s=>set.has(s.id));
  commit(`${n} ${plural(n,'tiempo movido','tiempos movidos')} a «${sessName(s0.category,toId)}»`,snap);
  resetTimerDisplay();
}
function newSessionPrompt(cat){
  const S=sessFor(cat),name=prompt('Nombre de la nueva sesión:','Sesión '+(S.list.length+1));
  if(!name||!name.trim())return null;
  const id=uid();S.list.push({id,name:name.trim().slice(0,40)});return id;
}
function showToast(msg,canUndo){
  $('toastMsg').textContent=msg;$('toastUndo').hidden=!canUndo;
  $('toast').classList.add('show');clearTimeout(toastT);
  toastT=setTimeout(()=>$('toast').classList.remove('show'),canUndo?6000:2600);
}
function showBanner(html,withBackup){
  const b=$('banner');b.hidden=false;
  b.innerHTML=`<span>${html}</span>${withBackup?'<button class="btn btn-accent" id="bannerBk">Descargar copia</button>':''}`;
}

// ====== DETALLE ======
function openDetail(id){detailId=id;renderDetail();$('detailOverlay').classList.add('active');}
function closeDetail(){detailId=null;$('detailOverlay').classList.remove('active');}
function renderDetail(){
  const s=solves.find(x=>x.id===detailId);if(!s){closeDetail();return;}
  const F=WCA[s.category].fmt;
  $('dTime').textContent=disp(s)+(F==='fmc'&&s.penalty!=='DNF'?' mov.':'');
  const meta=[esc(WCA[s.category].name),esc(new Date(s.date).toLocaleString())];
  if(s.penalty==='+2')meta.push('Tiempo bruto: '+fmt(s.time));
  if(s.insp!=null)meta.push('Inspección: '+s.insp.toFixed(2)+' s');
  if(s.mbld)meta.push(`${mbldPts(s)} puntos`);
  if(s.wca)meta.push(`★ Mezcla oficial: ${esc(s.wca.cn)} · ${esc(s.wca.r)} · ${esc(s.wca.g)} · ${s.wca.x?'extra ':'nº '}${esc(s.wca.k)}`);
  if(s.comp){
    const r=comp&&comp.id===s.comp?comp:rounds.find(x=>x.id===s.comp);
    if(r){const i=r.attempts.findIndex(a=>a.id===s.id);if(i>=0)meta.push(`🏆 Intento ${i+1} de ${r===comp?'la ronda en curso':'una ronda'}`);}
  }
  $('dMeta').innerHTML=meta.join('<br>');
  const opts=F==='mbld'?[]:F==='fmc'?[[null,'OK'],['DNF','DNF']]:[[null,'OK'],['+2','+2'],['DNF','DNF']];
  $('dPen').innerHTML=opts.map(([p,l])=>`<button data-pen="${p||''}" class="${(s.penalty||null)===p?'on':''}">${l}</button>`).join('');
  $('dPen').style.display=opts.length?'flex':'none';
  $('dScr').textContent=s.scramble||'(sin scramble)';
  const S=sessFor(s.category);
  $('dSess').innerHTML=S.list.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')+'<option value="__new">+ Nueva sesión…</option>';
  $('dSess').value=s.session;
  $('dSess').disabled=!!(comp&&comp.id===s.comp);
  if(document.activeElement!==$('dComment'))$('dComment').value=s.comment||'';
}
async function copyText(t,msg){
  try{await navigator.clipboard.writeText(t);}
  catch(e){const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');}catch(_){}ta.remove();}
  showToast(msg||'Copiado',false);
}

// ====== GRÁFICA ======
function drawChart(){
  if(activeTab!=='chart')return;
  const box=$('chartBox'),cv=$('chart'),dpr=window.devicePixelRatio||1;
  const W=Math.max(120,box.clientWidth-16),H=Math.max(160,box.clientHeight-48);
  cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+'px';cv.style.height=H+'px';
  const ctx=cv.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
  const css=getComputedStyle(document.documentElement),col=n=>css.getPropertyValue(n).trim();
  const F=WCA[curCat].fmt,cs=catSolves().slice().reverse(),effs=cs.map(getEff),leg=$('chartLegend');
  const msg=t=>{ctx.fillStyle=col('--text3');ctx.font='700 12px Nunito, sans-serif';ctx.textAlign='center';ctx.fillText(t,W/2,H/2);leg.innerHTML='';};
  if(F==='mbld')return msg('Gráfica no disponible en Multi-BLD');
  if(effs.filter(v=>v!==Infinity).length<2)return msg('Necesitas al menos 2 tiempos válidos');
  const series=[{name:'Single',vals:effs.map(v=>v===Infinity?null:v),color:col('--text3'),dots:true}];
  const acol=[col('--accent'),col('--green')];
  avgDefs(curCat).forEach(([name,n,t],k)=>{
    series.push({name,color:acol[k],vals:effs.map((_,i)=>{if(i+1<n)return null;const v=avgOf(effs.slice(i+1-n,i+1),n,t);return v===Infinity?null:v;})});
  });
  const all=series.flatMap(s=>s.vals).filter(v=>v!=null);
  let lo=Math.min(...all),hi=Math.max(...all);if(hi-lo<1e-9){lo-=1;hi+=1;}
  const pad=(hi-lo)*.08;lo=Math.max(0,lo-pad);hi+=pad;
  const L=56,R=8,T=8,B=8,n=cs.length;
  const X=i=>L+(n===1?0:i*(W-L-R)/(n-1)),Y=v=>T+(hi-v)/(hi-lo)*(H-T-B);
  ctx.font='600 10px IBM Plex Mono, monospace';ctx.textAlign='right';ctx.textBaseline='middle';
  for(let k=0;k<=4;k++){
    const v=lo+(hi-lo)*k/4,y=Y(v);
    ctx.strokeStyle=col('--bg3');ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(L,y);ctx.lineTo(W-R,y);ctx.stroke();
    ctx.fillStyle=col('--text3');ctx.fillText(fmtFor(curCat,v,true),L-6,y);
  }
  series.forEach(s=>{
    ctx.strokeStyle=s.color;ctx.lineWidth=s.dots?1:2;ctx.globalAlpha=s.dots?.55:1;ctx.beginPath();let on=false;
    s.vals.forEach((v,i)=>{if(v==null){on=false;return;}if(on)ctx.lineTo(X(i),Y(v));else{ctx.moveTo(X(i),Y(v));on=true;}});
    ctx.stroke();ctx.globalAlpha=1;
    if(s.dots&&n<=150){ctx.fillStyle=s.color;s.vals.forEach((v,i)=>{if(v==null)return;ctx.beginPath();ctx.arc(X(i),Y(v),2.2,0,Math.PI*2);ctx.fill();});}
  });
  leg.innerHTML=series.map(s=>`<span><i style="background:${s.color}"></i>${s.name}</span>`).join('');
}

// ====== SESIONES UI ======
function renderSessions(){
  const S=sessFor(curCat),sel=$('session');
  const cnt={};solves.forEach(s=>{if(s.category===curCat)cnt[s.session]=(cnt[s.session]||0)+1;});
  sel.innerHTML=S.list.map(x=>`<option value="${esc(x.id)}">${esc(x.name)} (${cnt[x.id]||0})</option>`).join('')+
    '<option disabled>──────────</option><option value="__new">+ Nueva sesión</option><option value="__ren">✎ Renombrar sesión</option><option value="__clear">🧹 Vaciar sesión</option><option value="__del">🗑 Eliminar sesión</option>';
  sel.value=S.cur;
}
function onSessionChange(){
  const selEl=$('session'),v=selEl.value,S=sessFor(curCat);selEl.blur();
  if(v==='__new'){const id=newSessionPrompt(curCat);if(id)S.cur=id;}
  else if(v==='__ren'){
    const cur=S.list.find(x=>x.id===S.cur),name=prompt('Nuevo nombre de la sesión:',cur.name);
    if(name&&name.trim())cur.name=name.trim().slice(0,40);
  }else if(v==='__clear'){
    renderSessions();
    if(catSolves().length)$('modalOverlay').classList.add('active');else showToast('La sesión ya está vacía',false);
    return;
  }else if(v==='__del'){
    const idx=S.list.findIndex(x=>x.id===S.cur),obj=S.list[idx],ids=solves.filter(s=>s.category===curCat&&s.session===obj.id).map(s=>s.id);
    if(confirm(`¿Eliminar la sesión «${obj.name}» y sus ${ids.length} ${plural(ids.length,'tiempo','tiempos')}?`)){
      const snap=snapshot();
      S.list.splice(idx,1);
      if(!S.list.length)S.list.push({id:uid(),name:'Sesión 1'});
      S.cur=S.list[Math.max(0,idx-1)].id;
      const set=new Set(ids);solves=solves.filter(s=>!set.has(s.id));
      exitSel();commit(`Sesión «${obj.name}» eliminada`,snap);resetTimerDisplay();
      return;
    }
  }else{S.cur=v;selMode=false;sel.clear();}
  save();refreshAll();resetTimerDisplay();
}

// ====== COPIAS DE SEGURIDAD E IMPORTACIÓN ======
function downloadFile(name,text,type){
  const blob=new Blob([text],{type});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;
  document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);
}
function downloadBackup(){
  const now=new Date();
  const data={app:'ekitimer',version:3,exported:now.toISOString(),solves,sessions,rounds,comp,settings,
    theme:document.documentElement.getAttribute('data-theme'),compPrefs};
  downloadFile(`ekitimer-copia-${now.toISOString().slice(0,10)}.json`,JSON.stringify(data),'application/json');
  meta.lastBackup=now.toISOString();meta.solvesAtBackup=solves.length;store.set('ekitimer-meta',meta);
  updateBackupHint();showToast('Copia descargada. Guárdala en un sitio seguro',false);
}
function backupNeeded(){
  if(solves.length<20)return false;
  if(!meta.lastBackup)return true;
  const days=(Date.now()-Date.parse(meta.lastBackup))/864e5;
  return days>=7&&solves.length-(meta.solvesAtBackup||0)>=20;
}
function updateBackupHint(){
  $('dataDot').hidden=!backupNeeded();
  let t;
  if(!meta.lastBackup)t=solves.length?`Tienes ${nf(solves.length)} ${plural(solves.length,'tiempo','tiempos')} y todavía no has hecho ninguna copia.`:'Cuando tengas tiempos, descarga una copia de vez en cuando.';
  else{
    const d=Math.floor((Date.now()-Date.parse(meta.lastBackup))/864e5),nuevos=Math.max(0,solves.length-(meta.solvesAtBackup||0));
    t=`Última copia: ${d===0?'hoy':d===1?'ayer':'hace '+d+' días'}${nuevos?` · ${nf(nuevos)} ${plural(nuevos,'tiempo nuevo','tiempos nuevos')} desde entonces`:''}.`;
  }
  $('bkInfo').textContent=t+' Con el archivo puedes recuperar todo en cualquier navegador o dispositivo.';
}
async function updateStorageInfo(){
  const el=$('storageInfo');
  if(!storageOK){el.className='data-note warn';el.textContent='Este navegador no permite guardar datos (¿modo privado?). Tus tiempos se perderán al cerrar la pestaña: descarga una copia.';return;}
  el.className='data-note';
  let t='Tus tiempos se guardan solo en este navegador.';
  try{if(navigator.storage&&navigator.storage.persisted){t+=await navigator.storage.persisted()?' Almacenamiento protegido: el navegador no los borrará para liberar espacio.':' El navegador podría borrarlos si se queda sin espacio, por eso conviene tener una copia.';}}catch(e){}
  el.textContent=t;
}
function openData(){
  impPending=null;$('impPlan').hidden=true;$('impFile').value='';
  updateBackupHint();updateStorageInfo();
  $('dataOverlay').classList.add('active');
}
function readImportFile(file){
  if(!file)return;
  if(file.size>50*1024*1024){showPlanError('El archivo es demasiado grande.');return;}
  const fr=new FileReader();
  fr.onload=()=>{try{prepareImport(String(fr.result));}catch(e){console.error(e);showPlanError('No se ha podido leer el archivo.');}};
  fr.onerror=()=>showPlanError('No se ha podido leer el archivo.');
  fr.readAsText(file,'UTF-8');
}
function showPlanError(msg){const p=$('impPlan');p.hidden=false;p.innerHTML=`<div class="err">${esc(msg)}</div>`;impPending=null;}
function prepareImport(text){
  const res=detectImport(text);
  if(res.error){showPlanError(res.error);return;}
  const p=$('impPlan');
  if(res.backup){
    const b=res.backup,ids=new Set(solves.map(s=>s.id)),rids=new Set(rounds.map(r=>r.id));
    const bs=sanitizeSolves(b.solves).filter(s=>!ids.has(s.id));
    const br=(Array.isArray(b.rounds)?b.rounds:[]).filter(r=>validRound(r)&&r.done&&!rids.has(r.id));
    impPending={kind:'backup',b,solves:bs,rounds:br};
    const when=b.exported&&!isNaN(Date.parse(b.exported))?new Date(b.exported).toLocaleString():'fecha desconocida';
    const dup=sanitizeSolves(b.solves).length-bs.length;
    p.hidden=false;
    p.innerHTML=`<b>Copia de EKITIMER</b> del ${esc(when)}<br>
      ${bs.length||br.length?`Se añadirán <b>${nf(bs.length)}</b> ${plural(bs.length,'tiempo','tiempos')}${br.length?` y <b>${nf(br.length)}</b> ${plural(br.length,'ronda','rondas')}`:''}.`:'Ya tienes todo lo que hay en esta copia.'}
      ${dup?`<br>${nf(dup)} ${plural(dup,'tiempo ya estaba','tiempos ya estaban')} y no se duplicará${dup===1?'':'n'}.`:''}
      ${b.settings||b.theme?'<br>También se restaurarán tus ajustes y tu tema.':''}
      <div class="modal-actions"><button class="btn btn-outline" id="impCancel">Cancelar</button><button class="btn btn-accent" id="impGo">Restaurar</button></div>`;
    return;
  }
  const plan=planImport(res,solves);
  impPending={kind:'groups',source:res.source,plan};
  const lines=plan.groups.slice(0,8).map(g=>`<li>${esc(WCA[g.cat].name)} · «${esc(g.name)}»: ${nf(g.solves.length)}</li>`).join('')+(plan.groups.length>8?`<li>y ${plan.groups.length-8} sesiones más</li>`:'');
  p.hidden=false;
  p.innerHTML=`<b>Export de ${esc(res.source)}</b><br>
    ${plan.add?`Se añadirán <b>${nf(plan.add)}</b> ${plural(plan.add,'tiempo','tiempos')} en ${plan.groups.length} ${plural(plan.groups.length,'sesión','sesiones')}:<ul>${lines}</ul>`:'No hay tiempos nuevos que importar.<br>'}
    ${plan.dup?`${nf(plan.dup)} ${plural(plan.dup,'tiempo ya estaba','tiempos ya estaban')} y se omite${plan.dup===1?'':'n'}.<br>`:''}
    ${res.skipped?`${nf(res.skipped)} ${plural(res.skipped,'tiempo','tiempos')} de eventos que EKITIMER no tiene (${esc(res.skippedEv.join(', '))}) no se importarán.<br>`:''}
    <div class="modal-actions"><button class="btn btn-outline" id="impCancel">Cancelar</button>${plan.add?'<button class="btn btn-accent" id="impGo">Importar</button>':''}</div>`;
}
function applyImport(){
  if(!impPending)return;
  const snap=snapshot();let msg;
  if(impPending.kind==='backup'){
    const{b,solves:bs,rounds:br}=impPending;
    const bsess=b.sessions&&typeof b.sessions==='object'?b.sessions:{};
    for(const cat of Object.keys(bsess)){
      if(!WCA[cat]||!bsess[cat]||!Array.isArray(bsess[cat].list))continue;
      const S=sessFor(cat);
      bsess[cat].list.forEach(x=>{if(x&&x.id&&!S.list.find(y=>y.id===x.id))S.list.push({id:String(x.id),name:String(x.name||'Sesión').slice(0,40)});});
    }
    solves=solves.concat(bs);rounds=rounds.concat(br).sort((x,y)=>(y.end||y.start||'')>(x.end||x.start||'')?1:-1);
    ensureSessionsForSolves();sortSolves();
    if(b.settings&&typeof b.settings==='object'){
      settings=Object.assign({},DEF_SETTINGS,b.settings);
      settings.inspDur=INSP_OPTS.includes(+settings.inspDur)?+settings.inspDur:15;if(!SCR_FS[settings.scrSize])settings.scrSize='m';
      store.set('ekitimer-settings',settings);applySettingsUI();updateWake();
    }
    if(b.theme)setTheme(b.theme);
    if(b.compPrefs&&typeof b.compPrefs==='object'){compPrefs=Object.assign({},b.compPrefs,compPrefs);store.set('ekitimer-comp-prefs',compPrefs);}
    msg=`Copia restaurada: ${nf(bs.length)} ${plural(bs.length,'tiempo','tiempos')}${br.length?` y ${br.length} ${plural(br.length,'ronda','rondas')}`:''}`;
  }else{
    const{plan,source}=impPending;let n=0;
    for(const g of plan.groups){
      const S=sessFor(g.cat);
      let ses=S.list.find(x=>x.name.toLowerCase()===g.name.toLowerCase());
      if(!ses){ses={id:uid(),name:g.name};S.list.push(ses);}
      g.solves.forEach(s=>{solves.push(Object.assign({},s,{id:uid(),session:ses.id}));n++;});
    }
    sortSolves();
    msg=`Importados ${nf(n)} ${plural(n,'tiempo','tiempos')} de ${source}`;
  }
  impPending=null;$('impPlan').hidden=true;$('dataOverlay').classList.remove('active');
  commit(msg,snap);resetTimerDisplay();
}

// ====== EXCEL ======
// La librería se carga solo al exportar, así la app arranca igual de rápido sin conexión.
const XLSX_URL='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
let xlsxP=null;
function loadXlsx(){
  if(typeof XLSX!=='undefined')return Promise.resolve();
  if(!xlsxP)xlsxP=new Promise((res,rej)=>{
    const sc=document.createElement('script');sc.src=XLSX_URL;sc.async=true;
    sc.onload=()=>res();sc.onerror=()=>{xlsxP=null;sc.remove();rej(new Error('xlsx'));};
    document.head.appendChild(sc);
  });
  return xlsxP;
}
async function exportXlsx(){
  if(!solves.length&&!rounds.length){showToast('No hay tiempos que exportar',false);return;}
  try{await loadXlsx();}catch(e){}
  if(typeof XLSX==='undefined'){showToast('No se pudo cargar la librería de Excel (¿sin conexión?). Usa «Descargar copia».',false);return;}
  const wb=XLSX.utils.book_new(),used=new Set();
  const sheetName=n=>{let name=n.replace(/×/g,'x').replace(/[:\\\/?*\[\]]/g,'').slice(0,31),k=2;while(used.has(name))name=name.slice(0,28)+' '+(k++);used.add(name);return name;};
  const finish=(ws,head,rows,numCols,widths,dateCol)=>{
    for(let r=1;r<=rows.length;r++){
      for(const c in numCols){const cell=ws[XLSX.utils.encode_cell({r,c:+c})];if(cell)cell.z=numCols[c];}
      const dc=ws[XLSX.utils.encode_cell({r,c:dateCol})];if(dc)dc.z='dd/mm/yyyy hh:mm';
    }
    ws['!cols']=widths.map(w=>({wch:w}));
  };
  for(const cat of Object.keys(WCA)){
    const cs=solves.filter(s=>s.category===cat).slice().reverse();if(!cs.length)continue;
    const F=WCA[cat].fmt;let head,rows,numCols,widths;
    if(F==='fmc'){
      head=['Nº','Sesión','Resultado','Movimientos','Penalización','Scramble','Comentario','Fecha'];
      rows=cs.map((s,i)=>[i+1,sessName(cat,s.session),disp(s),s.penalty==='DNF'?null:s.time,s.penalty||'',s.scramble,s.comment||'',new Date(s.date)]);
      numCols={3:'0'};widths=[5,14,10,12,12,60,30,18];
    }else if(F==='mbld'){
      head=['Nº','Sesión','Resultado','Resueltos','Intentados','Puntos','Segundos','Válido','Scrambles','Comentario','Fecha'];
      rows=cs.map((s,i)=>[i+1,sessName(cat,s.session),disp(s),s.mbld.s,s.mbld.a,mbldPts(s),Math.floor(s.time),mbldValid(s)?'Sí':'No',s.scramble,s.comment||'',new Date(s.date)]);
      numCols={6:'0'};widths=[5,14,18,10,10,8,10,8,60,30,18];
    }else{
      head=['Nº','Sesión','Tiempo','Segundos','Penalización','Inspección (s)','Scramble','Comentario','Fecha'];
      rows=cs.map((s,i)=>{const e=getEff(s);return[i+1,sessName(cat,s.session),disp(s),e===Infinity?null:Math.floor(e*100+1e-6)/100,s.penalty||'',s.insp!=null?s.insp:null,s.scramble,s.comment||'',new Date(s.date)];});
      numCols={3:'0.00',5:'0.00'};widths=[5,14,12,10,12,13,60,30,18];
    }
    const ws=XLSX.utils.aoa_to_sheet([head,...rows],{cellDates:true});
    finish(ws,head,rows,numCols,widths,head.length-1);
    XLSX.utils.book_append_sheet(wb,ws,sheetName(WCA[cat].name));
  }
  if(rounds.length){
    const head=['Fecha','Categoría','Formato','Resultado','Resultado (num.)','Mejor single','Objetivo','¿Conseguido?','Intentos'];
    const rows=rounds.slice().reverse().map(r=>{
      const F=compF(r),bo=F.type==='bo',num=v=>v==null||v===Infinity?null:v/100;
      const hit=r.target==null?'':(!r.cutFail&&r.result!=null&&r.result<r.target?'Sí':'No');
      return[new Date(r.end||r.start),WCA[r.cat].name,F.short,r.cutFail?'Sin media (corte)':fmtU(r.cat,r.result,!bo),r.cutFail?null:num(r.result),num(r.best),r.target==null?'':fmtU(r.cat,r.target,!bo),hit,roundTimesStr(r)];
    });
    const ws=XLSX.utils.aoa_to_sheet([head,...rows],{cellDates:true});
    finish(ws,head,rows,{4:'0.00',5:'0.00'},[18,16,8,16,14,12,10,12,48],0);
    XLSX.utils.book_append_sheet(wb,ws,sheetName('Rondas'));
  }
  XLSX.writeFile(wb,`EKITIMER_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ====== COMPETICIONES WCA: practicar con mezclas oficiales ======
const WCA_ID_KEY='ekitimer-wca-id';
let wcaS={id:null,person:null,comps:null,results:null,cache:{},view:'id',err:null,filter:'',comp:null,event:null,round:null,set:null,extras:false};

/** Mezcla oficial que toca ahora (repetición de ronda o práctica libre), o null. */
function wcaCurrent(){
  if(comp&&comp.wca&&comp.cat===curCat){
    const F=compF(comp),i=Math.min(comp.attempts.length,F.n-1),item=comp.wca.list[i];
    return item?{src:comp.wca,item,scramble:item.scramble,idx:i,n:F.n}:null;
  }
  if(!comp&&practice&&practice.cat===curCat){
    const item=practice.list[practice.idx];
    return item?{src:practice,item,scramble:item.scramble,idx:practice.idx,n:practice.list.length}:null;
  }
  return null;
}
function savePractice(){store.set('ekitimer-practice',practice);}
function loadPractice(){
  const p=store.get('ekitimer-practice',null);
  practice=p&&typeof p==='object'&&WCA[p.cat]&&Array.isArray(p.list)&&p.list.length?p:null;
  if(practice)practice.idx=Math.min(Math.max(0,practice.idx|0),practice.list.length-1);
}
function renderWcaBar(){
  const bar=$('wcaBar'),w=wcaCurrent();
  if(!w){bar.hidden=true;bar.innerHTML='';return;}
  bar.hidden=false;
  const s=w.src,where=`${esc(s.compName)} · ${esc(s.roundLabel)} · ${esc(s.group)}`;
  const num=w.item.extra?`extra ${w.item.num}`:`${w.idx+1} de ${w.n}`;
  if(comp&&comp.wca){bar.innerHTML=`<span class="wb-txt">★ <b>${where}</b> · mezcla ${num}</span>`;return;}
  bar.innerHTML=`<span class="wb-txt">★ <b>${where}</b> · mezcla ${num}</span>
    <span class="wb-nav"><button class="mini-btn" id="wbPrev" ${w.idx?'':'disabled'} title="Mezcla anterior">‹</button><button class="mini-btn" id="wbNext" ${w.idx<w.n-1?'':'disabled'} title="Mezcla siguiente">›</button><button class="mini-btn" id="wbExit" title="Dejar de usar mezclas oficiales">Salir</button></span>`;
}
function practiceMove(d){
  if(!practice)return;
  practice.idx=Math.min(Math.max(0,practice.idx+d),practice.list.length-1);savePractice();newScramble();
}
function endPractice(msg){practice=null;savePractice();newScramble();if(msg)showToast(msg,false);}

// ---- Conexión con la API pública de la WCA ----
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wcaGet(path,ms,tries){
  tries=tries==null?2:tries;
  const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),ms||25000);
  let r;
  try{r=await fetch(WCA_API+path,{signal:ctl.signal,headers:{Accept:'application/json'}});}
  finally{clearTimeout(t);}
  if(r.status===404){const e=new Error('404');e.code=404;throw e;}
  if(r.status===429){
    // La WCA limita las peticiones seguidas: se espera un poco y se reintenta
    if(tries>0){const wait=(parseInt(r.headers.get('retry-after'))||0)*1000||(tries===2?4000:10000);await sleep(Math.min(wait,15000));return wcaGet(path,ms,tries-1);}
    const e=new Error('429');e.code=429;throw e;
  }
  if(!r.ok)throw new Error('HTTP '+r.status);
  return await r.json();
}
const wcaNetMsg='No se ha podido conectar con la WCA. Comprueba tu conexión e inténtalo de nuevo.';
const wcaBusyMsg='La WCA está recibiendo demasiadas peticiones ahora mismo. Espera un minuto y vuelve a intentarlo.';
const wcaErrMsg=e=>e&&e.code===429?wcaBusyMsg:wcaNetMsg;
function openWca(){
  const saved=store.get(WCA_ID_KEY,null);
  if(!wcaS.person&&saved&&validWcaId(saved))loadWcaPerson(saved);
  else renderWca();
  $('wcaOverlay').classList.add('active');
  if(wcaS.view==='id')setTimeout(()=>{const i=$('wcaIdInput');if(i)i.focus();},60);
}
async function loadWcaPerson(raw){
  const id=normWcaId(raw);
  if(!validWcaId(id)){wcaS.err='Un WCA ID tiene 10 caracteres: 4 números, 4 letras y 2 números (por ejemplo 2017GONZ50).';wcaS.view='id';renderWca();return;}
  wcaS={...wcaS,id,view:'loading',err:null,loadingMsg:'Buscando tus competiciones…'};renderWca();
  try{
    const [person,comps,results]=await Promise.all([wcaGet(`/persons/${id}`),wcaGet(`/persons/${id}/competitions`),wcaGet(`/persons/${id}/results`,40000)]);
    if(wcaS.id!==id)return;
    Object.assign(wcaS,{person,comps:competitionsWithResults(comps,results),results,cache:{},view:'comps',filter:''});
    store.set(WCA_ID_KEY,id);
  }catch(e){
    wcaS.view='id';wcaS.err=e.code===404?`No hay ningún competidor con el WCA ID ${id}.`:wcaErrMsg(e);
  }
  renderWca();
}
async function openWcaComp(compId){
  const c=wcaS.comps.find(x=>x.id===compId);if(!c)return;
  Object.assign(wcaS,{comp:c,view:'comp',event:null,round:null,set:null});
  if(!wcaS.cache[compId]){
    wcaS.view='loading';wcaS.loadingMsg=`Cargando las mezclas de ${c.name}…`;renderWca();
    try{
      const scr=await wcaGet(`/competitions/${encodeURIComponent(compId)}/scrambles`,40000);
      wcaS.cache[compId]={tree:buildScrambleTree(scr),wcif:null,wcifState:'loading'};
      // El WCIF (grupos y reglas) puede ser grande: se carga aparte y no bloquea
      wcaGet(`/competitions/${encodeURIComponent(compId)}/wcif/public`,60000)
        .then(w=>{const k=wcaS.cache[compId];if(k){k.wcif=w;k.wcifState='ok';if($('wcaOverlay').classList.contains('active')&&wcaS.comp&&wcaS.comp.id===compId)renderWca();}})
        .catch(()=>{const k=wcaS.cache[compId];if(k){k.wcifState='error';if(wcaS.comp&&wcaS.comp.id===compId)renderWca();}});
    }catch(e){
      wcaS.view='comps';wcaS.err=e.code===404?'Esta competición no tiene mezclas publicadas.':wcaErrMsg(e);renderWca();return;
    }
    if(!wcaS.comp||wcaS.comp.id!==compId)return;
    wcaS.view='comp';
  }
  const k=wcaS.cache[compId],mine=resultsByRound(wcaS.results,compId);
  const myEvents=new Set(Object.values(mine).map(r=>r.event_id));
  const first=k.tree.find(e=>myEvents.has(e.eventId))||k.tree[0];
  wcaS.event=first?first.eventId:null;
  renderWca();
}
function wcaCtx(){
  const k=wcaS.comp&&wcaS.cache[wcaS.comp.id];if(!k)return null;
  const ev=k.tree.find(e=>e.eventId===wcaS.event)||null;
  const rd=ev&&wcaS.round!=null?ev.rounds.find(r=>String(r.roundId)===String(wcaS.round)):null;
  const set=rd&&wcaS.set?rd.sets.find(s=>s.group===wcaS.set):null;
  return{k,ev,rd,set,mine:resultsByRound(wcaS.results,wcaS.comp.id)};
}
const fmtDate=d=>{try{return new Date(d+'T12:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'});}catch(e){return d;}};
const flag=iso=>iso&&/^[A-Z]{2}$/.test(iso)?String.fromCodePoint(...[...iso].map(c=>127397+c.charCodeAt(0))):'';
function officialLine(eventId,r){
  if(!r)return'';
  const avg=fmtWcaValue(eventId,r.average,true),best=fmtWcaValue(eventId,r.best,false);
  const main=r.average&&r.average!==0?`media <b class="mono">${esc(avg)}</b> · mejor <span class="mono">${esc(best)}</span>`:`mejor <b class="mono">${esc(best)}</b>`;
  return`${main} · puesto ${r.pos}`;
}
function officialAttempts(eventId,r){
  if(!r||!Array.isArray(r.attempts))return'';
  return r.attempts.filter(v=>v!==0).map((v,i)=>{const t=fmtWcaValue(eventId,v,false);return(i===r.best_index||i===r.worst_index)&&r.average>0&&r.attempts.filter(x=>x!==0).length===5?`(${t})`:t;}).join('  ');
}
function renderWca(){
  const body=$('wcaBody'),head=$('wcaHead');
  const back=t=>`<button class="icon-btn wca-back" data-go="${t}" title="Volver">‹</button>`;
  const err=wcaS.err?`<div class="wca-err">${esc(wcaS.err)}</div>`:'';
  if(wcaS.view==='loading'){
    head.innerHTML=`<h3>Competiciones WCA</h3>`;
    body.innerHTML=`<div class="wca-loading"><span class="spin"></span>${esc(wcaS.loadingMsg||'Cargando…')}</div>`;return;
  }
  if(wcaS.view==='id'||!wcaS.person){
    head.innerHTML=`<h3>Practica con tus competiciones</h3>`;
    body.innerHTML=`<p class="wca-intro">Escribe tu WCA ID y elige una competición en la que hayas participado. Podrás volver a hacer sus <b>mezclas oficiales</b>, de tu ronda o de cualquier otra, e intentar mejorar tu resultado.</p>
      <form class="wca-form" id="wcaForm"><input id="wcaIdInput" maxlength="10" autocomplete="off" spellcheck="false" placeholder="ej: 2017GONZ50" value="${esc(wcaS.id||'')}"><button class="btn btn-accent" type="submit">Buscar</button></form>
      ${err}<small class="wca-help">Lo encuentras en tu perfil de worldcubeassociation.org. Los datos se consultan directamente a la WCA y solo se guarda tu WCA ID en este navegador.</small>`;
    return;
  }
  const p=wcaS.person.person||{};
  if(wcaS.view==='comps'){
    head.innerHTML=`<h3>Tus competiciones</h3>`;
    const f=wcaS.filter.trim().toLowerCase();
    const list=wcaS.comps.filter(c=>!f||(c.name+' '+(c.city||'')+' '+c.start_date).toLowerCase().includes(f));
    body.innerHTML=`<div class="wca-person"><div><b>${esc(p.name||wcaS.id)}</b> ${flag(p.country_iso2)}<div class="wca-sub">${esc(wcaS.id)} · ${wcaS.comps.length} ${plural(wcaS.comps.length,'competición','competiciones')}</div></div><button class="mini-btn" data-go="id">Cambiar</button></div>
      ${err}<input class="wca-search" id="wcaSearch" placeholder="Buscar competición…" value="${esc(wcaS.filter)}" autocomplete="off">
      <div class="wca-list">${list.map(c=>`<button class="wca-item" data-comp="${esc(c.id)}"><span><b>${esc(c.name)}</b><span class="wca-sub">${esc(fmtDate(c.start_date))}${c.city?' · '+esc(c.city):''}</span></span><span class="chev">›</span></button>`).join('')||'<div class="wca-empty">No hay competiciones que coincidan.</div>'}</div>`;
    return;
  }
  const ctx=wcaCtx();if(!ctx){wcaS.view='comps';renderWca();return;}
  const c=wcaS.comp,{k,ev,rd,set,mine}=ctx;
  if(wcaS.view==='comp'){
    head.innerHTML=`${back('comps')}<div><h3>${esc(c.name)}</h3><div class="wca-sub">${esc(fmtDate(c.start_date))}${c.city?' · '+esc(c.city):''}</div></div>`;
    if(!k.tree.length){body.innerHTML=`<div class="wca-empty">La WCA no tiene publicadas las mezclas de esta competición. Suele pasar en competiciones antiguas.</div>`;return;}
    const myEv=new Set(Object.values(mine).map(r=>r.event_id));
    const chips=k.tree.map(e=>`<button class="wca-chip${e.eventId===wcaS.event?' on':''}${myEv.has(e.eventId)?' mine':''}" data-ev="${e.eventId}">${esc(e.name)}${myEv.has(e.eventId)?' ★':''}</button>`).join('');
    let rounds='';
    if(ev){
      rounds=ev.rounds.map(r=>{
        const res=mine[r.roundId];
        const pg=k.wcif?probableGroup(k.wcif,wcaS.id,ev.eventId,r.index,r.sets.length):null;
        const sets=r.sets.map(st=>`<button class="wca-set${pg&&pg.letter===st.group?' mine':''}" data-round="${r.roundId}" data-set="${esc(st.group)}">${esc(st.group)}${pg&&pg.letter===st.group?'<small>tu grupo</small>':''}</button>`).join('');
        const you=res?`<div class="wr-res">Tu resultado: ${officialLine(ev.eventId,res)}</div><div class="wr-atts mono">${esc(officialAttempts(ev.eventId,res))}</div>`:`<div class="wr-res muted">${myEv.has(ev.eventId)?'No llegaste a esta ronda':'No participaste en esta categoría'}</div>`;
        const grp=pg?`<div class="wr-grp">Compitiste en el grupo ${pg.number}${pg.letter?` → mezclas ${pg.letter} (probable)`:''}</div>`:'';
        return`<div class="wr-round"><div class="wr-head"><b>${esc(r.label)}</b><span class="wca-sub">${r.sets.length} ${plural(r.sets.length,'grupo','grupos')} de mezclas</span></div>${you}${grp}<div class="wr-sets">${sets}</div></div>`;
      }).join('');
    }
    const wcifNote=k.wcifState==='loading'?'<div class="wca-note"><span class="spin sm"></span>Buscando en qué grupo compitió…</div>':k.wcifState==='error'?'<div class="wca-note">No se ha podido saber en qué grupo compitió.</div>':'';
    body.innerHTML=`${err}<div class="wca-chips">${chips}</div>${wcifNote}<p class="wca-hint">Elige un grupo de mezclas (A, B, C…) para practicar.</p>${rounds}`;
    return;
  }
  if(wcaS.view==='set'&&ev&&rd&&set){
    const res=mine[rd.roundId],cat=ev.cat,C=WCA[cat];
    const pg=k.wcif?probableGroup(k.wcif,wcaS.id,ev.eventId,rd.index,rd.sets.length):null;
    const rules=k.wcif?wcifRoundRules(k.wcif,ev.eventId,rd.index):null;
    head.innerHTML=`${back('comp')}<div><h3>${esc(ev.name)} · ${esc(rd.label)} · Grupo ${esc(set.group)}</h3><div class="wca-sub">${esc(c.name)}</div></div>`;
    const lines=set.scrambles.map(x=>`<li><span class="n">${x.num}</span><span class="scr">${esc(x.scramble)}</span></li>`).join('')+
      (wcaS.extras?set.extras.map(x=>`<li class="extra"><span class="n">E${x.num}</span><span class="scr">${esc(x.scramble)}</span></li>`).join(''):'');
    const F=COMP_FMT[C.fmt],repeatable=F&&set.scrambles.length===F.n;
    let why='';
    if(!F)why='En Multi-BLD solo está la práctica libre.';
    else if(!repeatable)why=`Para repetir la ronda hacen falta ${F.n} mezclas y este grupo tiene ${set.scrambles.length}.`;
    else if(comp)why='Termina o abandona la ronda que tienes en curso para empezar otra.';
    const info=[];
    if(res)info.push(`Tu resultado oficial en esta ronda: ${officialLine(ev.eventId,res)}`);
    if(pg)info.push(pg.letter===set.group?'Según el horario, este fue <b>tu grupo</b> (probable).':`Según el horario compitió en el grupo ${pg.number}${pg.letter?` (mezclas ${pg.letter})`:''}.`);
    if(rules&&F){
      const r2=[];
      if(rules.cutoff)r2.push(`corte ${fmtWcaValue(ev.eventId,rules.cutoff.value)} en ${rules.cutoff.attempts} ${plural(rules.cutoff.attempts,'intento','intentos')}`);
      if(rules.limit)r2.push(`límite ${fmtWcaValue(ev.eventId,rules.limit)} por intento`);
      if(rules.cumulative)r2.push('límite acumulado (no se aplica aquí)');
      if(r2.length)info.push('Reglas oficiales: '+r2.join(' · ')+'.');
    }
    body.innerHTML=`${err}${info.length?`<div class="wca-info">${info.map(x=>`<div>${x}</div>`).join('')}</div>`:''}
      <ol class="wca-scr">${lines}</ol>
      ${set.extras.length?`<label class="wca-extra"><input type="checkbox" id="wcaExtras" ${wcaS.extras?'checked':''}> Incluir ${set.extras.length} ${plural(set.extras.length,'mezcla extra','mezclas extra')} en la práctica libre</label>`:''}
      <div class="wca-actions">
        <button class="btn btn-outline" id="wcaFree">Practicar libre</button>
        <button class="btn btn-accent" id="wcaRepeat" ${repeatable&&!comp?'':'disabled'}>🏆 Repetir la ronda</button>
      </div>
      <small class="wca-help">${why?esc(why)+' ':''}<b>Libre:</b> pasas las mezclas a tu ritmo. <b>Repetir la ronda:</b> modo competición con estas mezclas${res?' y el objetivo de mejorar tu resultado oficial':''}${rules&&(rules.cutoff||rules.limit)?', con el corte y el límite oficiales':''}.</small>`;
    return;
  }
  wcaS.view='comp';renderWca();
}
function wcaSource(includeExtras){
  const ctx=wcaCtx();if(!ctx||!ctx.ev||!ctx.rd||!ctx.set)return null;
  const{ev,rd,set,mine,k}=ctx,isMbld=ev.cat==='mbld';
  const fix=t=>isMbld?t.split('\n').filter(Boolean).map((l,i)=>`${i+1}. ${l.trim()}`).join('\n'):t;
  const list=set.scrambles.map(x=>({num:x.num,scramble:fix(x.scramble)}));
  if(includeExtras)set.extras.forEach(x=>list.push({num:x.num,scramble:fix(x.scramble),extra:true}));
  const res=mine[rd.roundId]||null;
  const pg=k.wcif?probableGroup(k.wcif,wcaS.id,ev.eventId,rd.index,rd.sets.length):null;
  return{compId:wcaS.comp.id,compName:wcaS.comp.name,eventId:ev.eventId,cat:ev.cat,roundLabel:rd.label,roundIndex:rd.index,group:'Grupo '+set.group,
    list,mine:!!(pg&&pg.letter===set.group),
    official:res?{best:res.best,average:res.average,attempts:res.attempts,pos:res.pos,best_index:res.best_index,worst_index:res.worst_index}:null,
    rules:k.wcif?wcifRoundRules(k.wcif,ev.eventId,rd.index):null};
}
function switchToCat(cat){
  if(curCat===cat)return;
  cancelTimer();curCat=cat;$('category').value=cat;store.set('ekitimer-cat',cat);selMode=false;sel.clear();
  updateCatUI();refreshAll();
}
function startWcaPractice(){
  const src=wcaSource(wcaS.extras);if(!src)return;
  if(comp){showToast('Termina o abandona la ronda en curso primero',false);return;}
  practice={...src,idx:0,done:{}};savePractice();
  $('wcaOverlay').classList.remove('active');
  switchToCat(src.cat);newScramble();resetTimerDisplay();
  showToast(`Practicando ${src.list.length} mezclas oficiales`,false);
}
function startWcaRound(from){
  const src=from||wcaSource(false);if(!src||comp)return;
  const F=COMP_FMT[WCA[src.cat].fmt];if(!F||src.list.length!==F.n)return;
  practice=null;savePractice();
  $('wcaOverlay').classList.remove('active');
  switchToCat(src.cat);cancelTimer();
  const ru=src.rules||{};
  let cutoff=null,cutN=null,limit=null;
  if(ru.cutoff&&ru.cutoff.attempts<F.n){cutoff=ru.cutoff.value;cutN=ru.cutoff.attempts;}
  if(ru.limit&&!isFmc(src.cat))limit=ru.limit;
  comp={id:uid(),cat:src.cat,fmt:WCA[src.cat].fmt,target:officialTarget(src.official,F.type),cutoff,cutN,limit,attempts:[],start:new Date().toISOString(),done:false,wca:src};
  undoBuf=null;save();refreshAll();updateCompUI();newScramble();
  $('timer').textContent=WCA[src.cat].noTimer?'—':'0.00';tClass(WCA[src.cat].noTimer?'muted':'idle');
  $('hint').textContent=idleHint();
}
/** Notas del resultado de una ronda repetida: comparación con la competición. */
function wcaRoundNotes(r){
  const w=r.wca,o=w.official,F=compF(r),out=[];
  if(!o){out.push(`<div>No participaste en esta ronda: no hay resultado oficial con el que comparar.</div>`);return out;}
  const off=F.type==='bo'?o.best:o.average;
  const offTxt=fmtWcaValue(w.eventId,off,F.type!=='bo');
  if(r.cutFail||r.result==null){out.push(`<div>En la competición: <b>${esc(offTxt)}</b></div>`);return out;}
  if(off>0&&r.result!==Infinity){
    const d=r.result-off,dt=isFmc(r.cat)?(Math.abs(d)/100).toFixed(F.type==='bo'?0:2):fmt(Math.abs(d)/100,true);
    if(d<0)out.push(`<div class="ok">🎉 Has mejorado tu ${esc(offTxt)} oficial en ${esc(dt)}</div>`);
    else if(d===0)out.push(`<div>Igual que en la competición (${esc(offTxt)})</div>`);
    else out.push(`<div class="bad">${esc(dt)} peor que tu ${esc(offTxt)} oficial</div>`);
  }else out.push(`<div>En la competición: <b>${esc(offTxt)}</b></div>`);
  out.push(`<div class="muted">En la competición: <span class="mono">${esc(officialAttempts(w.eventId,{...o}))}</span></div>`);
  return out;
}
function openPracticeSummary(){
  if(!practice)return;
  const p=practice,ids=p.list.map((_,i)=>p.done&&p.done[i]).filter(Boolean);
  const ss=ids.map(id=>solves.find(s=>s.id===id)).filter(Boolean);
  const F=COMP_FMT[WCA[p.cat].fmt];
  let avgTxt='';
  if(F&&ss.length===F.n&&F.type!=='bo'){
    const u=ss.map(s=>unitsOf(s.category,s.time,s.penalty)),r=roundResult(u,F.type);
    avgTxt=`<div class="big">Tu ${F.short} con estas mezclas: <b class="mono">${esc(fmtU(p.cat,r,true))}</b></div>`;
    if(p.official&&p.official.average>0&&r!==Infinity){
      const d=r-p.official.average,dt=isFmc(p.cat)?(Math.abs(d)/100).toFixed(2):fmt(Math.abs(d)/100,true);
      avgTxt+=d<0?`<div class="ok">🎉 ${esc(dt)} mejor que tu ${esc(fmtWcaValue(p.eventId,p.official.average,true))} oficial</div>`:d>0?`<div class="bad">${esc(dt)} peor que tu ${esc(fmtWcaValue(p.eventId,p.official.average,true))} oficial</div>`:'<div>Igual que tu resultado oficial</div>';
    }
  }
  $('wcaHead').innerHTML='<h3>¡Mezclas terminadas!</h3>';
  $('wcaBody').innerHTML=`<p class="wca-sub">${esc(p.compName)} · ${esc(WCA[p.cat].name)} · ${esc(p.roundLabel)} · ${esc(p.group)}</p>
    <ol class="wca-scr res">${p.list.map((x,i)=>{const s=p.done&&p.done[i]&&solves.find(z=>z.id===p.done[i]);return`<li${x.extra?' class="extra"':''}><span class="n">${x.extra?'E'+x.num:x.num}</span><span class="scr">${esc(x.scramble.split('\n')[0])}${x.scramble.includes('\n')?'…':''}</span><b class="mono">${s?esc(disp(s)):'—'}</b></li>`;}).join('')}</ol>
    <div class="cp-info">${avgTxt}${p.official?`<div class="muted">En la competición: <span class="mono">${esc(officialAttempts(p.eventId,p.official))}</span></div>`:''}</div>
    <div class="wca-actions"><button class="btn btn-outline" id="wcaSumExit">Terminar</button><button class="btn btn-accent" id="wcaSumAgain">Repetir estas mezclas</button></div>`;
  $('wcaOverlay').classList.add('active');
}

function setupWca(){
  $('wcaBtn').addEventListener('click',openWca);
  $('wcaClose').addEventListener('click',()=>$('wcaOverlay').classList.remove('active'));
  $('wcaOverlay').addEventListener('submit',e=>{if(e.target.id==='wcaForm'){e.preventDefault();loadWcaPerson($('wcaIdInput').value);}});
  $('wcaOverlay').addEventListener('input',e=>{
    if(e.target.id==='wcaIdInput'){const v=e.target.value.toUpperCase();if(v!==e.target.value)e.target.value=v;}
    if(e.target.id==='wcaSearch'){
      wcaS.filter=e.target.value;const f=wcaS.filter.trim().toLowerCase();
      let n=0;document.querySelectorAll('#wcaBody .wca-item').forEach(b=>{const m=!f||b.textContent.toLowerCase().includes(f);b.hidden=!m;if(m)n++;});
      const em=$('wcaBody').querySelector('.wca-empty');if(em)em.hidden=n>0;
    }
  });
  $('wcaOverlay').addEventListener('change',e=>{if(e.target.id==='wcaExtras'){wcaS.extras=e.target.checked;renderWca();}});
  $('wcaOverlay').addEventListener('click',e=>{
    const t=e.target.closest('[data-go],[data-comp],[data-ev],[data-set],#wcaFree,#wcaRepeat,#wcaSumExit,#wcaSumAgain');if(!t)return;
    wcaS.err=null;
    if(t.dataset.go){
      if(t.dataset.go==='id'){wcaS.person=null;wcaS.view='id';renderWca();setTimeout(()=>{const i=$('wcaIdInput');if(i){i.focus();i.select();}},50);}
      else{wcaS.view=t.dataset.go;renderWca();}
    }
    else if(t.dataset.comp)openWcaComp(t.dataset.comp);
    else if(t.dataset.ev){wcaS.event=t.dataset.ev;renderWca();}
    else if(t.dataset.set){wcaS.round=t.dataset.round;wcaS.set=t.dataset.set;wcaS.view='set';renderWca();$('wcaBody').scrollTop=0;}
    else if(t.id==='wcaFree')startWcaPractice();
    else if(t.id==='wcaRepeat')startWcaRound();
    else if(t.id==='wcaSumExit'){$('wcaOverlay').classList.remove('active');endPractice('Práctica terminada');}
    else if(t.id==='wcaSumAgain'){$('wcaOverlay').classList.remove('active');practice.idx=0;practice.done={};savePractice();newScramble();}
  });
  $('wcaBar').addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.id==='wbPrev')practiceMove(-1);else if(b.id==='wbNext')practiceMove(1);else if(b.id==='wbExit')endPractice('Has vuelto a las mezclas normales');
  });
}

// ====== MODALES ======
const OVERLAYS=['modalOverlay','detailOverlay','compOverlay','roundOverlay','dataOverlay','wcaOverlay'];
const anyModalOpen=()=>OVERLAYS.some(id=>$(id).classList.contains('active'));
function closeAllModals(){OVERLAYS.forEach(id=>$(id).classList.remove('active'));detailId=null;roundView=null;}

// ====== TEMA Y AJUSTES ======
function setTheme(n){
  if(!document.querySelector(`.theme-option[data-theme="${n}"]`))n='cream';
  document.documentElement.setAttribute('data-theme',n);
  store.set('ekitimer-theme',n);
  document.querySelectorAll('.theme-option').forEach(b=>b.classList.toggle('active',b.dataset.theme===n));
  drawChart();
}
function applySettingsUI(){
  ['insp','beep','focus','rs','wake'].forEach(k=>{$('set'+k[0].toUpperCase()+k.slice(1)).checked=!!settings[k];});
  $('setInspDur').value=String(settings.inspDur);$('setInspDur').disabled=!settings.insp;
  document.querySelectorAll('#setScrSize button').forEach(b=>b.classList.toggle('on',b.dataset.v===settings.scrSize));
  document.documentElement.style.setProperty('--scr-fs',SCR_FS[settings.scrSize]);
}
function saveSettings(){store.set('ekitimer-settings',settings);applySettingsUI();}

// ====== VERSIÓN Y APP INSTALABLE ======
const APP_VERSION='1.1.0';
function registerSW(){
  if(!('serviceWorker'in navigator)||!/^https?:$/.test(location.protocol))return;
  window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(()=>{});});
}

// ====== INIT ======
function refreshAll(){renderStats();renderTimes();renderSessions();drawChart();if(activeTab==='rounds')renderRounds();}
function updateCatUI(){
  const c=WCA[curCat];
  $('manualInput').placeholder=c.fmt==='fmc'?'movimientos (ej: 28)':c.fmt==='mbld'?'ej: 3/4 45:12':'ej: 12.34 o 1234';
  $('manualInput').setAttribute('inputmode',c.fmt==='mbld'?'text':'decimal');
  $('mbldCtl').hidden=!c.isMulti;
  if(tState==='stopped')setT('idle');
  $('timer').textContent=c.noTimer?'—':'0.00';tClass(c.noTimer?'muted':'idle');
  $('hint').textContent=idleHint();
  updateCompUI();
}
function setTab(t){
  activeTab=t;
  document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===t));
  $('timesList').hidden=t!=='times';$('chartBox').hidden=t!=='chart';$('roundsList').hidden=t!=='rounds';
  $('listTools').hidden=t!=='times';
  if(t==='rounds')renderRounds();
  drawChart();
}
function init(){
  setTheme(store.get('ekitimer-theme','cream'));
  loadData();loadPractice();
  Object.keys(WCA).forEach(k=>{const o=document.createElement('option');o.value=k;o.textContent=WCA[k].name;$('category').appendChild(o);});
  $('category').value=curCat;
  $('mbldCount').value=mbldN;
  applySettingsUI();
  ['insp','beep','focus','rs','wake'].forEach(k=>{
    const el=$('set'+k[0].toUpperCase()+k.slice(1));
    el.addEventListener('change',()=>{settings[k]=el.checked;saveSettings();el.blur();
      if(k==='rs')newScramble();if(k==='insp')resetTimerDisplay();if(k==='wake')updateWake();});
  });
  $('setInspDur').addEventListener('change',()=>{settings.inspDur=+$('setInspDur').value;saveSettings();$('setInspDur').blur();resetTimerDisplay();});
  $('setScrSize').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;settings.scrSize=b.dataset.v;saveSettings();});
  $('category').addEventListener('change',()=>{
    if(comp){$('category').value=curCat;return;}
    cancelTimer();curCat=$('category').value;store.set('ekitimer-cat',curCat);$('category').blur();
    if(practice&&practice.cat!==curCat){practice=null;savePractice();showToast('Práctica con mezclas oficiales terminada',false);}
    selMode=false;sel.clear();
    updateCatUI();newScramble();refreshAll();
  });
  $('session').addEventListener('change',onSessionChange);
  $('mbldCount').addEventListener('change',()=>{
    mbldN=Math.min(60,Math.max(2,parseInt($('mbldCount').value)||2));$('mbldCount').value=mbldN;
    store.set('ekitimer-mbld',String(mbldN));$('mbldCount').blur();newScramble();
  });
  $('newScrambleBtn').addEventListener('click',newScramble);
  $('copyScrambleBtn').addEventListener('click',()=>copyText(curScr,'Scramble copiado'));
  $('modalCancel').addEventListener('click',()=>$('modalOverlay').classList.remove('active'));
  $('modalConfirm').addEventListener('click',()=>{$('modalOverlay').classList.remove('active');removeSolves(catSolves().map(s=>s.id),'Sesión vaciada');});
  $('addManualBtn').addEventListener('click',addManual);
  $('manualInput').addEventListener('keydown',e=>{if(e.key==='Enter')addManual();if(e.key==='Escape')e.target.blur();});
  $('toastUndo').addEventListener('click',undo);
  // Cerrar modales al pulsar fuera
  OVERLAYS.forEach(id=>$(id).addEventListener('click',e=>{if(e.target===$(id)){$(id).classList.remove('active');if(id==='detailOverlay')detailId=null;if(id==='roundOverlay')roundView=null;}}));
  // Lista de tiempos
  $('timesList').addEventListener('click',e=>{
    if(Date.now()-lastStopAt<400)return;
    const item=e.target.closest('.time-item');if(!item)return;
    const id=item.dataset.id;
    if(selMode){
      const cs=catSolves();
      if(e.shiftKey&&selAnchor){
        const a=cs.findIndex(s=>s.id===selAnchor),b=cs.findIndex(s=>s.id===id);
        if(a>=0&&b>=0){const[lo,hi]=a<b?[a,b]:[b,a];for(let i=lo;i<=hi;i++)sel.add(cs[i].id);}
      }else{sel.has(id)?sel.delete(id):sel.add(id);selAnchor=id;}
      renderTimes();return;
    }
    const b=e.target.closest('button[data-act]');
    if(b){
      const a=b.dataset.act;
      if(a==='del')removeSolves([id],'Tiempo eliminado');
      else{const s=solves.find(x=>x.id===id);setPen(id,s.penalty===a?null:a);}
      return;
    }
    openDetail(id);
  });
  // Barra de selección
  $('listTools').addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.id==='selOn'){selMode=true;sel.clear();selAnchor=null;renderTimes();}
    else if(b.id==='selOff')exitSel();
    else if(b.id==='selAll'){const cs=catSolves();if(sel.size===cs.length)sel.clear();else cs.forEach(s=>sel.add(s.id));renderTimes();}
    else if(b.id==='selDel'&&sel.size){const n=sel.size;removeSolves([...sel],`${n} ${plural(n,'tiempo eliminado','tiempos eliminados')}`);selMode=false;renderTimes();}
  });
  $('listTools').addEventListener('change',e=>{
    if(e.target.id!=='selMove'||!sel.size)return;
    let to=e.target.value;if(!to)return;
    if(to==='__new'){to=newSessionPrompt(curCat);if(!to){renderTimes();return;}}
    const ids=[...sel];selMode=false;moveSolves(ids,to);
  });
  // Detalle
  $('dClose').addEventListener('click',closeDetail);$('dDone').addEventListener('click',closeDetail);
  $('dPen').addEventListener('click',e=>{const b=e.target.closest('button');if(b&&detailId)setPen(detailId,b.dataset.pen||null);});
  $('dCopy').addEventListener('click',()=>{const s=solves.find(x=>x.id===detailId);if(s)copyText(s.scramble,'Scramble copiado');});
  $('dComment').addEventListener('input',()=>{const s=solves.find(x=>x.id===detailId);if(s){s.comment=$('dComment').value.slice(0,500);save();}});
  $('dComment').addEventListener('change',renderTimes);
  $('dSess').addEventListener('change',()=>{
    const s=solves.find(x=>x.id===detailId);if(!s)return;
    let to=$('dSess').value;
    if(to==='__new'){to=newSessionPrompt(s.category);if(!to){renderDetail();return;}}
    moveSolves([s.id],to);renderDetail();
  });
  $('dDelete').addEventListener('click',()=>{const id=detailId;closeDetail();removeSolves([id],'Tiempo eliminado');});
  // Competición
  $('compBtn').addEventListener('click',openCompSetup);
  $('compCancel').addEventListener('click',()=>$('compOverlay').classList.remove('active'));
  $('compStart').addEventListener('click',startRound);
  ['compTarget','compCutoff','compLimit'].forEach(id=>$(id).addEventListener('keydown',e=>{if(e.key==='Enter')startRound();if(e.key==='Escape')$('compOverlay').classList.remove('active');}));
  $('statsBar').addEventListener('click',e=>{
    if(e.target.closest('#cpAbandon')){openCompSetup();return;}
    const sl=e.target.closest('.cp-slot.filled');if(sl)openDetail(sl.dataset.id);
  });
  $('rClose').addEventListener('click',()=>{$('roundOverlay').classList.remove('active');roundView=null;});
  $('rCopy').addEventListener('click',()=>{const r=rounds.find(x=>x.id===roundView);if(r)copyText(roundShareText(r),'Resultado copiado');});
  $('rAgain').addEventListener('click',()=>{
    const r=rounds.find(x=>x.id===roundView);$('roundOverlay').classList.remove('active');roundView=null;
    if(r&&r.wca)startWcaRound(r.wca);else openCompSetup();
  });
  $('rDelete').addEventListener('click',()=>{
    const id=roundView;$('roundOverlay').classList.remove('active');roundView=null;
    const snap=snapshot();rounds=rounds.filter(r=>r.id!==id);
    solves.forEach(s=>{if(s.comp===id)delete s.comp;});
    commit('Ronda eliminada (sus tiempos siguen en la sesión)',snap);
  });
  $('roundsList').addEventListener('click',e=>{const it=e.target.closest('.round-item');if(it)showRound(it.dataset.rid,false);});
  // Datos
  $('dataBtn').addEventListener('click',openData);
  $('dataClose').addEventListener('click',()=>$('dataOverlay').classList.remove('active'));
  $('bkDownload').addEventListener('click',downloadBackup);
  $('exportXlsxBtn').addEventListener('click',exportXlsx);
  $('impBtn').addEventListener('click',()=>$('impFile').click());
  $('impFile').addEventListener('change',()=>readImportFile($('impFile').files[0]));
  $('impPlan').addEventListener('click',e=>{
    if(e.target.closest('#impGo'))applyImport();
    else if(e.target.closest('#impCancel')){impPending=null;$('impPlan').hidden=true;$('impFile').value='';}
  });
  $('banner').addEventListener('click',e=>{if(e.target.closest('#bannerBk'))downloadBackup();});
  // Pestañas
  document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>setTab(t.dataset.tab)));
  if('ResizeObserver'in window)new ResizeObserver(()=>drawChart()).observe($('chartBox'));
  // Popups (tema y ajustes) y quitar foco de botones para que ESPACIO no los vuelva a pulsar
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(b)setTimeout(()=>b.blur(),0);
    if(e.target.closest('#themeToggle')){$('themePopup').classList.toggle('open');$('settingsPopup').classList.remove('open');return;}
    if(e.target.closest('#settingsToggle')){$('settingsPopup').classList.toggle('open');$('themePopup').classList.remove('open');return;}
    if(e.target.closest('.theme-option')){setTheme(e.target.closest('.theme-option').dataset.theme);$('themePopup').classList.remove('open');return;}
    if(e.target.closest('#settingsPopup'))return;
    $('themePopup').classList.remove('open');$('settingsPopup').classList.remove('open');
  });
  // Pantalla encendida
  document.addEventListener('visibilitychange',updateWake);
  const firstGesture=()=>{updateWake();ensureAudio();};
  document.addEventListener('pointerdown',firstGesture,{once:true});
  document.addEventListener('keydown',firstGesture,{once:true});
  updateWake();
  // Almacenamiento
  if(!storageOK)showBanner('Este navegador no permite guardar datos (¿modo privado?). Tus tiempos se perderán al cerrar: descarga una copia antes de irte.',true);
  try{if(storageOK&&navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});}catch(e){}
  setupWca();
  setupTimer();
  $('appVersion').textContent='v'+APP_VERSION;
  registerSW();
  updateCatUI();newScramble();refreshAll();updateBackupHint();
}
init();
