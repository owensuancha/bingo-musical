// Vista del jugador: entrada, cartón, marcas e impresión

import {db,state,goTo} from './shared.js';
import {makeCarton,checkWin as checkWinLogic} from './game-logic.js';

export async function joinGame(){
  const code=document.getElementById('join-code').value.trim().toUpperCase();
  const name=document.getElementById('join-name').value.trim()||'Jugador';
  const err=document.getElementById('join-error');
  if(!code){err.textContent='Ingresa el código de sala.';err.style.display='block';return;}
  const snap=await db.ref('salas/'+code).get();
  if(!snap.exists()){err.textContent='Sala no encontrada. Verifica el código con el director.';err.style.display='block';return;}
  err.style.display='none';
  const data=snap.val();state.songs=data.songs||[];state.currentSala=code;state.playerName=name;
  state.playerSeed=Math.floor(Math.random()*9999999);
  state.playerMarks=new Array(25).fill(false);state.playerMarks[12]=true;
  document.getElementById('carton-player-name').textContent=name?name+' — Mi cartón':'Mi cartón';
  document.getElementById('carton-id-label').textContent='Sala: '+code+' · Cartón #'+state.playerSeed;
  renderCarton();goTo('carton');
}

export function leaveGame(){state.currentSala=null;state.songs=[];state.playerSeed=0;state.playerMarks=[];goTo('home');}

export function renderCarton(){
  if(state.songs.length<25)return;
  const cells=makeCarton(state.songs,state.playerSeed);
  const g=document.getElementById('p-grid');g.innerHTML='';
  cells.forEach((s,i)=>{
    const d=document.createElement('div');
    d.className='cell'+(s.free?' free':'')+(state.playerMarks[i]?' marked':'');
    if(s.free){d.textContent='★ LIBRE';}
    else{
      const t=document.createElement('span');t.textContent=s.title;
      const a=document.createElement('span');a.className='cell-artist';a.textContent=s.artist;
      d.appendChild(t);d.appendChild(a);
    }
    if(!s.free)d.onclick=()=>{state.playerMarks[i]=!state.playerMarks[i];renderCarton();checkWin();};
    g.appendChild(d);
  });
}

// Wrapper de UI: muestra/oculta el banner según la lógica pura
export function checkWin(){
  document.getElementById('win-banner').style.display=checkWinLogic(state.playerMarks)?'block':'none';
}

export function clearMarks(){state.playerMarks=new Array(25).fill(false);state.playerMarks[12]=true;renderCarton();document.getElementById('win-banner').style.display='none';}

export async function buildPrint(){
  const code=document.getElementById('print-sala-input').value.trim().toUpperCase();
  const qty=Math.min(60,Math.max(1,parseInt(document.getElementById('print-qty').value)||10));
  const err=document.getElementById('print-error');
  if(!code){err.textContent='Ingresa el código de sala.';err.style.display='block';return;}
  const snap=await db.ref('salas/'+code).get();
  if(!snap.exists()){err.textContent='Sala no encontrada.';err.style.display='block';return;}
  err.style.display='none';
  const data=snap.val();const songList=data.songs||[];
  if(songList.length<25){err.textContent='La sala necesita al menos 25 canciones.';err.style.display='block';return;}
  const area=document.getElementById('print-cartons-area');
  area.innerHTML='';area.style.display='grid';
  for(let c=0;c<qty;c++){
    const seed=Math.floor(Math.random()*9999999);
    const cells=makeCarton(songList,seed);
    const wrap=document.createElement('div');wrap.className='p-carton';
    wrap.innerHTML=`<div class="p-title">🎵 Bingo Musical — Cartón ${c+1}</div>
      <div class="p-letters"><span class="p-letter">B</span><span class="p-letter">I</span><span class="p-letter">N</span><span class="p-letter">G</span><span class="p-letter">O</span></div>
      <div class="p-grid">${cells.map(s=>`<div class="p-cell${s.free?' free':''}"><span>${s.free?'★ LIBRE':s.title}</span>${!s.free&&s.artist?`<span class="p-artist">${s.artist}</span>`:''}</div>`).join('')}</div>`;
    area.appendChild(wrap);
  }
  document.getElementById('print-actions').style.display='flex';
  document.getElementById('print-count-label').textContent=qty+' cartones listos para imprimir';
}
