// Vista de TV: conexión, secuencia de suspenso, canvas y confeti

import {db,state,goTo,getAppURL,generateQR,setCanvasHooks} from './shared.js';

let ptcAnim=null, ptcList=[], confList=[], cdInterval=null;

export async function tvConnect(){
  const code=document.getElementById('tv-sala-input').value.trim().toUpperCase();
  const err=document.getElementById('tv-pre-error');
  if(!code){err.textContent='Ingresa el código de sala.';err.style.display='block';return;}
  const snap=await db.ref('salas/'+code).get();
  if(!snap.exists()){err.textContent='Sala no encontrada. Verifica el código.';err.style.display='block';return;}
  err.style.display='none';state.tvSala=code;
  goTo('tv');
  document.getElementById('tv-code-display').textContent=code;
  document.getElementById('tv-sala-display').textContent='Sala: '+code;
  generateQR('tv-qr',getAppURL()+'?join='+code,100);
  setTVState('waiting');
  if(state.tvListener)db.ref('salas/'+state.tvSala).off('value',state.tvListener);
  state.tvListener=db.ref('salas/'+state.tvSala).on('value',snap=>{
    const data=snap.val();if(!data)return;
    const st=data.tvState||'waiting';const cur=data.current;
    if(st==='suspense'&&cur){runSuspenseSequence(cur);db.ref('salas/'+state.tvSala+'/tvState').set('playing');}
  });
}

export function disconnectTV(){
  if(state.tvListener&&state.tvSala)db.ref('salas/'+state.tvSala).off('value',state.tvListener);
  state.tvListener=null;state.tvSala=null;goTo('home');
}

export function setTVState(st,song){
  ['tv-waiting','tv-suspense','tv-countdown','tv-reveal'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
  if(st==='waiting')document.getElementById('tv-waiting').style.display='block';
  else if(st==='suspense')document.getElementById('tv-suspense').style.display='block';
  else if(st==='countdown')document.getElementById('tv-countdown').style.display='block';
  else if(st==='reveal'&&song){
    document.getElementById('tv-reveal').style.display='block';
    document.getElementById('tv-r-num').textContent='#'+song.num;
    document.getElementById('tv-r-song').textContent=song.title;
    document.getElementById('tv-r-artist').textContent=song.artist;
    launchConfetti();
  }
}

export function runSuspenseSequence(song){
  setTVState('suspense');
  setTimeout(()=>{
    setTVState('countdown');
    let c=3;const nd=document.getElementById('tv-cd-n');nd.textContent=c;
    if(cdInterval)clearInterval(cdInterval);
    cdInterval=setInterval(()=>{
      c--;
      if(c<=0){clearInterval(cdInterval);setTVState('reveal',song);}
      else{nd.textContent=c;nd.style.animation='none';nd.offsetHeight;nd.style.animation='popIn .45s cubic-bezier(.34,1.56,.64,1)';}
    },900);
  },3500);
}

export function toggleFS(){
  if(!document.fullscreenElement)document.documentElement.requestFullscreen().catch(()=>{});
  else document.exitFullscreen();
}

export function startCanvas(){
  const cv=document.getElementById('tv-canvas');if(!cv)return;
  ptcList=Array.from({length:50},()=>({x:Math.random(),y:Math.random(),vx:(Math.random()-.5)*.0012,vy:(Math.random()-.5)*.0012,r:Math.random()*1.8+.4,a:Math.random()*.2+.05}));
  if(ptcAnim)cancelAnimationFrame(ptcAnim);
  function draw(){
    cv.width=cv.offsetWidth;cv.height=cv.offsetHeight;
    const ctx=cv.getContext('2d'),w=cv.width,h=cv.height;
    ctx.clearRect(0,0,w,h);
    ptcList.forEach(p=>{
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0)p.x=1;if(p.x>1)p.x=0;if(p.y<0)p.y=1;if(p.y>1)p.y=0;
      ctx.beginPath();ctx.arc(p.x*w,p.y*h,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(0,194,124,${p.a})`;ctx.fill();
    });
    confList.forEach(p=>{
      p.x+=p.vx;p.y+=p.vy;p.rot+=p.rv;
      ctx.save();ctx.translate(p.x*w,p.y*h);ctx.rotate(p.rot*Math.PI/180);
      ctx.fillStyle=p.c;ctx.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);ctx.restore();
    });
    confList=confList.filter(p=>p.y<1.2);
    ptcAnim=requestAnimationFrame(draw);
  }
  draw();
}

export function stopCanvas(){if(ptcAnim){cancelAnimationFrame(ptcAnim);ptcAnim=null;}}

export function launchConfetti(){
  const cols=['#00c27c','#e8b84b','#7c3aed','#ec4899','#ffffff','#00e0ff'];
  confList=Array.from({length:100},()=>({x:Math.random(),y:-.05,vx:(Math.random()-.5)*.008,vy:Math.random()*.013+.004,c:cols[Math.floor(Math.random()*cols.length)],s:Math.random()*9+3,rot:Math.random()*360,rv:(Math.random()-.5)*6}));
}

// Registrar hooks de canvas en shared (goTo los usa) — evita dependencia circular
setCanvasHooks({start:startCanvas,stop:stopCanvas});
