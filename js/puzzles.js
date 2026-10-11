/*!
 * EKITIMER — puzzles
 * Categorías WCA, generadores de scrambles y simulación de stickers (sin DOM).
 * Copyright (C) 2026 EKITIMER contributors · GPL-3.0-or-later
 */
'use strict';
// ==ENGINE START==
// ====== WCA CATEGORIES (orden oficial) ======
// fmt: ao5 = Ao5/Ao12 · mo3 = Mean of 3 · bo3 = Best of 3 (BLD) · fmc = movimientos · mbld = puntos
const CUBE_MOVES={
  2:["R","U","F"],
  3:["R","L","U","D","F","B"],
  4:["R","L","U","D","F","B","Rw","Uw","Fw"],
  5:["R","L","U","D","F","B","Rw","Lw","Uw","Dw","Fw","Bw"],
  6:["R","L","U","D","F","B","Rw","Lw","Uw","Dw","Fw","Bw","3Rw","3Uw","3Fw"],
  7:["R","L","U","D","F","B","Rw","Lw","Uw","Dw","Fw","Bw","3Rw","3Lw","3Uw","3Dw","3Fw","3Bw"]
};
const WCA = {
  '3x3':     {name:'3×3×3',      ev:'333',  size:3, fmt:'ao5', moves:CUBE_MOVES[3], mods:["","'","2"], len:[19,21]},
  '2x2':     {name:'2×2×2',      ev:'222',  size:2, fmt:'ao5', moves:CUBE_MOVES[2], mods:["","'","2"], len:[9,11]},
  '4x4':     {name:'4×4×4',      ev:'444',  size:4, fmt:'ao5', moves:CUBE_MOVES[4], mods:["","'","2"], len:[40,44]},
  '5x5':     {name:'5×5×5',      ev:'555',  size:5, fmt:'ao5', moves:CUBE_MOVES[5], mods:["","'","2"], len:[60,60]},
  '6x6':     {name:'6×6×6',      ev:'666',  size:6, fmt:'mo3', moves:CUBE_MOVES[6], mods:["","'","2"], len:[80,80]},
  '7x7':     {name:'7×7×7',      ev:'777',  size:7, fmt:'mo3', moves:CUBE_MOVES[7], mods:["","'","2"], len:[100,100]},
  '3x3bld':  {name:'3×3×3 BLD',  ev:'333bf',size:3, fmt:'bo3', base:'3x3', orient:'wide', noInsp:true},
  '3x3fmc':  {name:'3×3×3 FMC',  ev:'333fm',size:3, fmt:'fmc', base:'3x3', fmcWrap:true, noInsp:true, noTimer:true},
  '3x3oh':   {name:'3×3×3 OH',   ev:'333oh',size:3, fmt:'ao5', base:'3x3'},
  'clock':   {name:'Clock',      ev:'clock', fmt:'ao5', isClock:true},
  'megaminx':{name:'Megaminx',   ev:'minx',  fmt:'ao5', isMega:true},
  'pyraminx':{name:'Pyraminx',   ev:'pyram', fmt:'ao5', moves:["R","U","L","B"], mods:["","'"], len:[8,11], tips:["u","l","r","b"]},
  'skewb':   {name:'Skewb',      ev:'skewb', fmt:'ao5', moves:["R","U","L","B"], mods:["","'"], len:[9,11]},
  'square1': {name:'Square-1',   ev:'sq1',   fmt:'ao5', isSq1:true},
  '4x4bld':  {name:'4×4×4 BLD',  ev:'444bf',size:4, fmt:'bo3', base:'4x4', orient:'rot', noInsp:true},
  '5x5bld':  {name:'5×5×5 BLD',  ev:'555bf',size:5, fmt:'bo3', base:'5x5', orient:'rot', noInsp:true},
  'mbld':    {name:'3×3×3 Multi-BLD', ev:'333bf', fmt:'mbld', noInsp:true, isMulti:true},
};

// ====== FALLBACK SCRAMBLE GENERATORS (movimientos aleatorios) ======
function bm(m){return m.replace(/[\dw'+-]/g,'');}
function sameAx(a,b){const x={R:'x',L:'x',U:'y',D:'y',F:'z',B:'z'};return x[bm(a)]===x[bm(b)];}
function ri(a,b){return a+Math.floor(Math.random()*(b-a+1));}
function pk(a){return a[Math.floor(Math.random()*a.length)];}

function genStd(cat){
  const c=WCA[cat],g=WCA[c.base||cat],isCube=!!g.size;
  for(;;){
    const len=ri(g.len[0],g.len[1]),mv=[],out=[];
    for(let i=0;i<len;i++){
      let m;
      do{m=pk(g.moves);}while(mv.length>0&&(
        (isCube?bm(m)===bm(mv[mv.length-1]):m===mv[mv.length-1])||
        (isCube&&mv.length>1&&sameAx(m,mv[mv.length-1])&&sameAx(m,mv[mv.length-2]))));
      mv.push(m);out.push(m+pk(g.mods));
    }
    // FMC: el scramble no puede empezar por F/B ni acabar en R/L (va entre R' U' F)
    if(c.fmcWrap&&(sameAx(mv[0],'F')||sameAx(mv[mv.length-1],'R')))continue;
    let r=out.join(' ');
    if(g.tips){const t=g.tips.map(x=>{const p=Math.random();return p<.33?x+"'":p<.66?x:"";}).filter(Boolean);if(t.length)r+=' '+t.join(' ');}
    if(c.orient==='wide'){const a=pk(['','Rw','Rw2',"Rw'"]),b=pk(['','Uw','Uw2',"Uw'"]);[a,b].forEach(x=>{if(x)r+=' '+x;});}
    if(c.orient==='rot'){const a=pk(['','x','x2',"x'"]),b=pk(['','y','y2',"y'"]);[a,b].forEach(x=>{if(x)r+=' '+x;});}
    if(c.fmcWrap)r="R' U' F "+r+" R' U' F";
    return r;
  }
}
// Megaminx (Pochmann, formato WCA): 7 líneas de 10 movimientos R/D + U, cuyo sentido sigue al último D
function genMega(){
  const L=[];
  for(let i=0;i<7;i++){
    const l=[];let last='++';
    for(let j=0;j<10;j++){last=Math.random()<.5?'++':'--';l.push((j%2?'D':'R')+last);}
    l.push(last==='++'?'U':"U'");
    L.push(l.join(' '));
  }
  return L.join('\n');
}
// Clock (formato WCA actual): U R D L ALL UR DR DL UL y2 U R D L ALL
function genClock(){
  const f=n=>(n>=0?n+'+':(-n)+'-');
  const a=["U","R","D","L","ALL","UR","DR","DL","UL"].map(p=>p+f(ri(-5,6)));
  const b=["U","R","D","L","ALL"].map(p=>p+f(ri(-5,6)));
  return a.join(' ')+' y2 '+b.join(' ');
}

// ====== SQUARE-1 (modelo de forma) ======
// Cada capa: 12 huecos de 30°, numerados en sentido horario mirando esa capa desde fuera.
// El corte "/" pasa entre los huecos 11|0 y 5|6. Esquinas ocupan 2 huecos, aristas 1.
// Colores laterales en el orden de los huecos (horario visto desde fuera de cada capa).
// Arriba, desde el corte frontal: esquina FL, arista L, esquina LB, arista B | esquina BR, arista R, esquina RF, arista F
// Abajo, desde el corte frontal:  arista F, esquina FR, arista R, esquina RB | arista B, esquina BL, arista L, esquina LF
const SQ1_TOP=[['C',['F','L']],['E',['L']],['C',['L','B']],['E',['B']],['C',['B','R']],['E',['R']],['C',['R','F']],['E',['F']]];
const SQ1_BOT=[['E',['F']],['C',['F','R']],['E',['R']],['C',['R','B']],['E',['B']],['C',['B','L']],['E',['L']],['C',['L','F']]];
function sq1Solved(){
  const top=[],bot=[];let id=0;
  const fill=(arr,def,o)=>def.forEach(([k,sd])=>{const pc={k,o,sd,id:id++};arr.push(pc);if(k==='C')arr.push(pc);});
  fill(top,SQ1_TOP,'U');fill(bot,SQ1_BOT,'D');
  return{top,bot,mid:0};
}
const md12=v=>((v%12)+12)%12;
function sq1Turn(st,x,y){
  return{top:st.top.map((_,i)=>st.top[md12(i-x)]),bot:st.bot.map((_,i)=>st.bot[md12(i-y)]),mid:st.mid};
}
function sq1CanSlice(st){
  return st.top[0]!==st.top[11]&&st.top[5]!==st.top[6]&&st.bot[0]!==st.bot[11]&&st.bot[5]!==st.bot[6];
}
function sq1Slice(st){
  const t=st.top.slice(),b=st.bot.slice();
  for(let i=0;i<6;i++){t[6+i]=st.bot[i];b[i]=st.top[6+i];}
  return{top:t,bot:b,mid:st.mid^1};
}
function genSq1(){
  let st=sq1Solved();const parts=[];
  const n=ri(13,15);
  for(let k=0;k<n;k++){
    let x,y,nx;
    do{x=ri(-5,6);y=ri(-5,6);nx=sq1Turn(st,x,y);}while((x===0&&y===0)||!sq1CanSlice(nx));
    st=sq1Slice(nx);
    parts.push(`(${x},${y})`,'/');
  }
  return parts.join(' ');
}
function sq1State(scr){
  let st=sq1Solved(),ok=true;
  const re=/\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)|\//g;let m;
  while((m=re.exec(scr||''))){
    if(m[0]==='/'){if(!sq1CanSlice(st))ok=false;st=sq1Slice(st);}
    else st=sq1Turn(st,parseInt(m[1]),parseInt(m[2]));
  }
  st.valid=ok;return st;
}

function genScramble(cat){
  const c=WCA[cat];
  if(c.isMega)return genMega();
  if(c.isSq1)return genSq1();
  if(c.isClock)return genClock();
  if(c.isMulti)return genStd('3x3bld');
  return genStd(cat);
}

// ====== MOTOR GEOMÉTRICO DE STICKERS ======
// Cada sticker tiene una posición 3D. Un movimiento gira los stickers de una capa
// alrededor de un eje; la permutación resultante se calcula una vez y se cachea.
const add3=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const sc3=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
const dot3=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const len3=a=>Math.hypot(a[0],a[1],a[2]);
const nrm3=a=>sc3(a,1/len3(a));
function rot3(p,k,th){
  const c=Math.cos(th),s=Math.sin(th),d=dot3(k,p);
  const x=[k[1]*p[2]-k[2]*p[1],k[2]*p[0]-k[0]*p[2],k[0]*p[1]-k[1]*p[0]];
  return[p[0]*c+x[0]*s+k[0]*d*(1-c),p[1]*c+x[1]*s+k[1]*d*(1-c),p[2]*c+x[2]*s+k[2]*d*(1-c)];
}
function permFor(P,key,axis,ang,pred){
  if(P.cache[key])return P.cache[key];
  const n=P.st.length,perm=new Array(n);
  for(let i=0;i<n;i++){
    const p=P.st[i].p;
    if(!pred(p,i)){perm[i]=i;continue;}
    const q=rot3(p,axis,ang);let b=i,bd=Infinity;
    for(let j=0;j<n;j++){const s=P.st[j].p,dx=q[0]-s[0],dy=q[1]-s[1],dz=q[2]-s[2],d=dx*dx+dy*dy+dz*dz;if(d<bd){bd=d;b=j;}}
    perm[i]=b;
  }
  return P.cache[key]=perm;
}
function applyPerm(s,perm){const o=s.slice();for(let i=0;i<perm.length;i++)o[perm[i]]=s[i];return o;}
const toks=s=>(s||'').replace(/\n/g,' ').split(/\s+/).filter(Boolean);
const PZ={};

// --- Cubos NxN --- (WCA: U blanco, F verde). u = derecha y v = abajo al mirar la cara en la red.
const CF=[
  {c:'W',n:[0,1,0], u:[1,0,0], v:[0,0,1]},   // U
  {c:'Y',n:[0,-1,0],u:[1,0,0], v:[0,0,-1]},  // D
  {c:'G',n:[0,0,1], u:[1,0,0], v:[0,-1,0]},  // F
  {c:'B',n:[0,0,-1],u:[-1,0,0],v:[0,-1,0]},  // B
  {c:'R',n:[1,0,0], u:[0,0,-1],v:[0,-1,0]},  // R
  {c:'O',n:[-1,0,0],u:[0,0,1], v:[0,-1,0]},  // L
];
const AX={U:[0,1,0],D:[0,-1,0],F:[0,0,1],B:[0,0,-1],R:[1,0,0],L:[-1,0,0],x:[1,0,0],y:[0,1,0],z:[0,0,1]};
function cubePuzzle(N){
  const k='c'+N;if(PZ[k])return PZ[k];
  const st=[];
  CF.forEach(f=>{for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    st.push({p:add3(sc3(f.n,N),add3(sc3(f.u,-N+1+2*c),sc3(f.v,-N+1+2*r))),c:f.c});
  }});
  return PZ[k]={st,cache:{},N};
}
function cubeMove(P,state,t){
  const N=P.N;let m,axis,lo,hi,amt;
  if((m=t.match(/^(\d*)([RLUDFB])(w?)(\d*)('?)$/))){
    const pre=m[1]?parseInt(m[1]):0;
    if(m[3]){lo=1;hi=pre||2;}else if(pre){lo=hi=pre;}else{lo=hi=1;}
    axis=m[2];amt=(m[4]?parseInt(m[4]):1)*(m[5]?-1:1);
  }else if((m=t.match(/^([xyz])(\d*)('?)$/))){
    axis=m[1];lo=1;hi=N;amt=(m[2]?parseInt(m[2]):1)*(m[3]?-1:1);
  }else return state;
  hi=Math.min(hi,N);
  const q=((amt%4)+4)%4;if(!q)return state;
  const n=AX[axis];
  const top=lo===1?Infinity:N-2*lo+2,bot=hi>=N?-Infinity:N-2*hi;
  const perm=permFor(P,axis+lo+'-'+hi+'-'+q,n,-q*Math.PI/2,p=>{const d=dot3(p,n);return d>bot&&d<top+0.5;});
  return applyPerm(state,perm);
}
function cubeState(scr,N){
  const P=cubePuzzle(N);let s=P.st.map(x=>x.c);
  for(const t of toks(scr))s=cubeMove(P,s,t);
  return s;
}

// --- Pyraminx --- (WCA: F verde, L rojo, R azul, D amarillo)
function pyraPuzzle(){
  if(PZ.pyra)return PZ.pyra;
  const s3=Math.sqrt(3),h=2*Math.sqrt(2/3);
  const raw={U:[0,h,0],L:[-1,0,s3/3],R:[1,0,s3/3],B:[0,0,-2*s3/3]};
  const V={};for(const k in raw)V[k]=[raw[k][0],raw[k][1]-h/4,raw[k][2]];
  // Red: triángulo grande invertido; F en el centro (apunta arriba)
  const S=110,m=10,A=[m,m],C=[m+2*S,m],E=[m+S,m+S*s3],MAC=[m+S,m],MAE=[m+S/2,m+S*s3/2],MCE=[m+1.5*S,m+S*s3/2];
  const faces=[
    {c:'G',v3:[V.U,V.L,V.R],v2:[MAC,MAE,MCE]},
    {c:'R',v3:[V.U,V.L,V.B],v2:[MAC,MAE,A]},
    {c:'B',v3:[V.U,V.R,V.B],v2:[MAC,MCE,C]},
    {c:'Y',v3:[V.L,V.R,V.B],v2:[MAE,MCE,E]},
  ];
  const st=[];
  faces.forEach(f=>{
    const G=(i,j)=>{const w=[1-i/3,(i-j)/3,j/3];
      return{p:[0,1,2].map(k=>w[0]*f.v3[0][k]+w[1]*f.v3[1][k]+w[2]*f.v3[2][k]),q:[0,1].map(k=>w[0]*f.v2[0][k]+w[1]*f.v2[1][k]+w[2]*f.v2[2][k])};};
    const tri=(a,b,c)=>st.push({p:sc3(add3(add3(a.p,b.p),c.p),1/3),poly:[a.q,b.q,c.q],c:f.c});
    for(let r=0;r<3;r++){
      for(let k=0;k<=r;k++){
        tri(G(r,k),G(r+1,k),G(r+1,k+1));
        if(k<r)tri(G(r,k),G(r,k+1),G(r+1,k+1));
      }
    }
  });
  return PZ.pyra={st,cache:{},V,vb:[0,0,2*S+2*m,S*s3+2*m]};
}
function pyraState(scr){
  const P=pyraPuzzle();let s=P.st.map(x=>x.c);
  for(const t of toks(scr)){
    const m=t.match(/^([URLBurlb])('?)$/);if(!m)continue;
    const tip=m[1]===m[1].toLowerCase(),v=P.V[m[1].toUpperCase()],R=len3(v),ax=nrm3(v);
    const thr=tip?0.55:0.15,ang=(m[2]?1:-1)*2*Math.PI/3;
    s=applyPerm(s,permFor(P,t,ax,ang,p=>dot3(p,ax)/R>thr));
  }
  return s;
}

// --- Skewb --- (notación WCA de esquina fija: R=DRB, U=UBL, L=DLF, B=DBL)
function skewbPuzzle(){
  if(PZ.skewb)return PZ.skewb;
  const S=44,g=4,ox=10,oy=6,pos=[[1,0],[1,2],[1,1],[3,1],[2,1],[0,1]];
  const st=[];
  CF.forEach((f,fi)=>{
    const x0=ox+pos[fi][0]*(S+g),y0=oy+pos[fi][1]*(S+g);
    const P2=(a,b)=>[x0+(a+1)/2*S,y0+(b+1)/2*S];
    const add=(pts,cen)=>st.push({p:add3(f.n,add3(sc3(f.u,cen[0]),sc3(f.v,cen[1]))),poly:pts.map(q=>P2(q[0],q[1])),c:f.c});
    add([[0,-1],[1,0],[0,1],[-1,0]],[0,0]);
    add([[-1,-1],[0,-1],[-1,0]],[-2/3,-2/3]);
    add([[1,-1],[1,0],[0,-1]],[2/3,-2/3]);
    add([[-1,1],[-1,0],[0,1]],[-2/3,2/3]);
    add([[1,1],[0,1],[1,0]],[2/3,2/3]);
  });
  return PZ.skewb={st,cache:{},vb:[0,0,ox*2+4*S+3*g,oy*2+3*S+2*g]};
}
const SKEWB_AX={R:[1,-1,-1],U:[-1,1,-1],L:[-1,-1,1],B:[-1,-1,-1]};
function skewbState(scr){
  const P=skewbPuzzle();let s=P.st.map(x=>x.c);
  for(const t of toks(scr)){
    const m=t.match(/^([RULB])('?)$/);if(!m)continue;
    const ax=nrm3(SKEWB_AX[m[1]]),ang=(m[2]?1:-1)*2*Math.PI/3;
    s=applyPerm(s,permFor(P,t,ax,ang,p=>dot3(p,ax)>0));
  }
  return s;
}

// --- Megaminx --- (esquema WCA/cubing.js; notación Pochmann)
// R++ = todo menos la capa L (cara de arriba a la izquierda de F), 2/5 en sentido horario visto desde el lado opuesto a L.
// D++ = todo menos la capa U, 2/5 horario visto desde D. U = capa U 1/5 horario.
const MEGA_COL={U:'#ffffff',F:'#1b7a3a',R:'#e53935',BR:'#1e4fd8',BL:'#ffd600',L:'#7b3fa0',
  D:'#9e9e9e',BF:'#9be35a',I:'#ff8f00',A:'#4fd1e0',C:'#fff1c1',E:'#f48fb1'};
function megaPuzzle(){
  if(PZ.mega)return PZ.mega;
  const cphi=1/Math.sqrt(5),sphi=2/Math.sqrt(5),N={U:[0,1,0],D:[0,-1,0]};
  const up=['F','R','BR','BL','L'],opp={F:'BF',R:'I',BR:'A',BL:'C',L:'E'};
  up.forEach((f,i)=>{const a=i*2*Math.PI/5;N[f]=[sphi*Math.sin(a),cphi,sphi*Math.cos(a)];N[opp[f]]=sc3(N[f],-1);});
  const names=Object.keys(N),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const F={},st=[];
  for(const f of names){
    const n=N[f],t=Math.abs(n[1])>0.9?[0,0,1]:[0,1,0],e1=nrm3(cross(t,n)),e2=cross(n,e1);
    const nb=names.filter(g=>g!==f&&Math.abs(dot3(N[g],n)-cphi)<1e-6)
      .sort((g,h)=>Math.atan2(dot3(N[g],e2),dot3(N[g],e1))-Math.atan2(dot3(N[h],e2),dot3(N[h],e1)));
    const O=nb.map((g,j)=>nrm3(add3(add3(n,N[nb[(j+4)%5]]),N[g])));
    const rin=dot3(O[0],n),c=sc3(n,rin);
    const to3=q=>add3(c,add3(sc3(e1,q[0]),sc3(e2,q[1])));
    const line=(g,h)=>[dot3(e1,N[g]),dot3(e2,N[g]),h-dot3(c,N[g])];
    const X=(l1,l2)=>{const d=l1[0]*l2[1]-l1[1]*l2[0];return[(l1[2]*l2[1]-l1[1]*l2[2])/d,(l1[0]*l2[2]-l1[2]*l2[0])/d];};
    const Lc=nb.map(g=>line(g,0.7*rin)),Sd=nb.map(g=>line(g,rin)),m=j=>(j+5)%5;
    const I=nb.map((_,j)=>X(Lc[m(j-1)],Lc[j])),A=nb.map((_,j)=>X(Lc[m(j-1)],Sd[j])),B=nb.map((_,j)=>X(Lc[m(j+1)],Sd[j]));
    const Ol=nb.map((_,j)=>X(Sd[m(j-1)],Sd[j]));
    const polys=[I];
    for(let j=0;j<5;j++){
      polys.push([A[j],B[j],I[m(j+1)],I[j]]);
      polys.push([Ol[m(j+1)],A[m(j+1)],I[m(j+1)],B[j]]);
    }
    F[f]={n,c,O,rin};
    for(const pl of polys){const v3=pl.map(to3);st.push({f,v3,p:sc3(v3.reduce(add3),1/v3.length),c:MEGA_COL[f]});}
  }
  // Capa de cada cara: sus stickers + los que tocan su plano (aristas y esquinas vecinas)
  const layer={};
  for(const f of names){const n=N[f],r=F[f].rin;layer[f]=st.map(s=>s.f===f||s.v3.some(v=>dot3(v,n)>r-1e-6));}
  // Red: flor U (F abajo) y flor D (vista tras x2, BF abajo)
  const SC=62,maps={},dist=(a,b)=>len3([a[0]-b[0],a[1]-b[1],a[2]-b[2]]);
  maps.U=P=>[P[0]*SC,P[2]*SC];
  maps.D=P=>[P[0]*SC+4.3*SC,-P[2]*SC];
  const petal=(f,par)=>{
    const sh=F[f].O.filter(v=>F[par].O.some(w=>dist(v,w)<1e-6));
    const Va=sh[0],Vb=sh[1],A2=maps[par](Va),B2=maps[par](Vb);
    const e1=nrm3(add3(Vb,sc3(Va,-1))),w=add3(F[f].c,sc3(Va,-1)),e2=nrm3(add3(w,sc3(e1,-dot3(w,e1))));
    const dx=B2[0]-A2[0],dy=B2[1]-A2[1],L2=Math.hypot(dx,dy),E1=[dx/L2,dy/L2],sc=L2/dist(Va,Vb);
    const pc=maps[par](F[par].c),mid=[(A2[0]+B2[0])/2-pc[0],(A2[1]+B2[1])/2-pc[1]];
    let E2=[-E1[1],E1[0]];if(E2[0]*mid[0]+E2[1]*mid[1]<0)E2=[-E2[0],-E2[1]];
    maps[f]=P=>{const d=add3(P,sc3(Va,-1)),s=dot3(d,e1),t=dot3(d,e2);return[A2[0]+sc*(s*E1[0]+t*E2[0]),A2[1]+sc*(s*E1[1]+t*E2[1])];};
  };
  up.forEach(f=>petal(f,'U'));up.forEach(f=>petal(opp[f],'D'));
  st.forEach(s=>{s.poly=s.v3.map(maps[s.f]);});
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  st.forEach(s=>s.poly.forEach(([x,y])=>{x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}));
  st.forEach(s=>{s.poly=s.poly.map(([x,y])=>[x-x0+6,y-y0+6]);});
  return PZ.mega={st,cache:{},N,layer,vb:[0,0,x1-x0+12,y1-y0+12],sw:1};
}
function megaState(scr){
  const P=megaPuzzle();let s=P.st.map(x=>x.c);
  for(const t of toks(scr)){
    let ax,ang,pred;
    if(t==='R++'||t==='R--'){ax=sc3(P.N.L,-1);ang=(t==='R++'?-1:1)*4*Math.PI/5;pred=(p,i)=>!P.layer.L[i];}
    else if(t==='D++'||t==='D--'){ax=P.N.D;ang=(t==='D++'?-1:1)*4*Math.PI/5;pred=(p,i)=>!P.layer.U[i];}
    else{
      const m=t.match(/^(U|D|F|R|L|BR|BL|BF|I|A|C|E)(2?)('?)$/);if(!m)continue;
      ax=P.N[m[1]];const f=m[1];ang=(m[3]?1:-1)*(m[2]?2:1)*2*Math.PI/5;pred=(p,i)=>P.layer[f][i];
    }
    s=applyPerm(s,permFor(P,t,ax,ang,pred));
  }
  return s;
}

// --- Clock ---
// Con un pin arriba, los relojes de ese grupo giran por delante; las esquinas son
// un mismo engranaje, así que la esquina de detrás gira en sentido contrario.
const CLOCK_G={UR:[1,2,4,5],DR:[4,5,7,8],DL:[3,4,6,7],UL:[0,1,3,4],U:[0,1,2,3,4,5],R:[1,2,4,5,7,8],D:[3,4,5,6,7,8],L:[0,1,3,4,6,7],ALL:[0,1,2,3,4,5,6,7,8]};
const CLOCK_MIR=[2,1,0,5,4,3,8,7,6],CLOCK_CORN=[0,2,6,8];
function simClock(scr){
  const front=Array(9).fill(0),back=Array(9).fill(0);let flip=false;
  for(const t of toks(scr)){
    if(t==='y2'){flip=!flip;continue;}
    const m=t.match(/^(UR|DR|DL|UL|U|R|D|L|ALL)(\d+)([+-])$/);if(!m)continue;
    const v=parseInt(m[2])*(m[3]==='+'?1:-1),A=flip?back:front,Bk=flip?front:back;
    for(const d of CLOCK_G[m[1]]){
      A[d]=md12(A[d]+v);
      if(CLOCK_CORN.includes(d))Bk[CLOCK_MIR[d]]=md12(Bk[CLOCK_MIR[d]]-v);
    }
  }
  return{front,back};
}
// ==ENGINE END==
