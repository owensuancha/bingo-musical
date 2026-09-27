// Vista del jugador: entrada, cartón, marcas e impresión
// Persistencia: Firebase `salas/{CODIGO}/players/{seed}` (primario) + localStorage (respaldo)

import {db,state,goTo} from './shared.js';
import {makeCarton,checkWin as checkWinLogic,normalizeMarks} from './game-logic.js';

const LOCAL_KEY='bingo_player';
let playerListener=null;

function baseMarks(){const m=new Array(25).fill(false);m[12]=true;return m;}

function playerRef(){return db.ref('salas/'+state.currentSala+'/players/'+state.playerSeed);}

function savePlayerLocal(){
  try{
    localStorage.setItem(LOCAL_KEY,JSON.stringify({
      sala:state.currentSala,seed:state.playerSeed,name:state.playerName,
      songs:state.songs,config:{winMode:state.winMode,winColumns:state.winColumns},
      marks:state.playerMarks
    }));
  }catch(e){}
}
function clearPlayerLocal(){try{localStorage.removeItem(LOCAL_KEY);}catch(e){}}

async function persistMarks(){
  savePlayerLocal();
  if(state.currentSala&&state.playerSeed){
    try{await playerRef().set({name:state.playerName,seed:state.playerSeed,joinedAt:Date.now(),marks:state.playerMarks});}
    catch(e){}
  }
}

// Suscripción en tiempo real a las marcas propias (multi-dispositivo / refresco)
function subscribePlayer(){
  if(playerListener&&state.currentSala)playerRef().off('value',playerListener);
  if(!state.currentSala)return;
  playerListener=playerRef().on('value',snap=>{
    const data=snap.val();
    if(!data)return;
    if(data.marks){
      const m=normalizeMarks(data.marks);
      if(m.join()!==state.playerMarks.join()){
        state.playerMarks=m;
        renderCarton();checkWin();
      }
    }
  });
}

export function applyRoomConfig(config){
  state.winMode=config?.winMode||'full';
  state.winColumns=config?.winColumns||[];
}

function setPlayerLabels(){
  document.getElementById('carton-player-name').textContent=state.playerName?state.playerName+' — Mi cartón':'Mi cartón';
  document.getElementById('carton-id-label').textContent='Sala: '+state.currentSala+' · Cartón #'+state.playerSeed;
}

export async function joinGame(){
  const code=document.getElementById('join-code').value.trim().toUpperCase();
  const name=document.getElementById('join-name').value.trim()||'Jugador';
  const err=document.getElementById('join-error');
  if(!code){err.textContent='Ingresa el código de sala.';err.style.display='block';return;}
  const snap=await db.ref('salas/'+code).get();
  if(!snap.exists()){err.textContent='Sala no encontrada. Verifica el código con el director.';err.style.display='block';return;}
  err.style.display='none';
  const data=snap.val();
  state.songs=data.songs||[];state.currentSala=code;state.playerName=name;
  applyRoomConfig(data.config);
  state.playerSeed=Math.floor(Math.random()*9999999);
  state.playerMarks=baseMarks();
  setPlayerLabels();
  savePlayerLocal();
  try{await playerRef().set({name,seed:state.playerSeed,joinedAt:Date.now(),marks:state.playerMarks});}catch(e){}
  subscribePlayer();
  renderCarton();goTo('carton');
}

// Restaurar sesión del jugador tras refrescar (Firebase primario, localStorage respaldo)
export async function restorePlayerSession(){
  let saved=null;
  try{saved=JSON.parse(localStorage.getItem(LOCAL_KEY));}catch(e){}
  if(!saved||!saved.sala||!saved.seed)return false;
  let data=null;
  try{const snap=await db.ref('salas/'+saved.sala).get();data=snap.exists()?snap.val():null;}
  catch(e){data=null;}
  if(!data){clearPlayerLocal();return false;} // la sala ya no existe
  state.songs=data.songs||saved.songs||[];
  state.currentSala=saved.sala;
  state.playerName=saved.name||'Jugador';
  state.playerSeed=saved.seed;
  applyRoomConfig(data.config||saved.config);
  const remote=data.players&&data.players[saved.seed]&&data.players[saved.seed].marks;
  state.playerMarks=normalizeMarks(remote||saved.marks||baseMarks());
  if(!data.players||!data.players[saved.seed]){
    try{await playerRef().set({name:state.playerName,seed:state.playerSeed,joinedAt:Date.now(),marks:state.playerMarks});}catch(e){}
  }
  setPlayerLabels();
  subscribePlayer();
  renderCarton();checkWin();
  goTo('carton');
  return true;
}

export async function leaveGame(){
  if(playerListener&&state.currentSala){try{playerRef().off('value',playerListener);}catch(e){}}
  playerListener=null;
  if(state.currentSala){try{await playerRef().remove();}catch(e){}}
  clearPlayerLocal();
  state.currentSala=null;state.songs=[];state.playerSeed=0;state.playerMarks=[];goTo('home');
}

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
    if(!s.free)d.onclick=()=>{state.playerMarks[i]=!state.playerMarks[i];renderCarton();checkWin();persistMarks();};
    g.appendChild(d);
  });
}

// Wrapper de UI: muestra/oculta el banner según la lógica pura + modo de la sala
export function checkWin(){
  document.getElementById('win-banner').style.display=
    checkWinLogic(state.playerMarks,state.winMode,state.winColumns)?'block':'none';
}

export function clearMarks(){
  state.playerMarks=baseMarks();
  renderCarton();checkWin();persistMarks();
}

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
