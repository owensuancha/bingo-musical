// Vista y lógica del director (setup + panel del director)

import {db,state,goTo,showDirectorNav,getAppURL,generateQR} from './shared.js';
import {parseSongs,normalizeMarks} from './game-logic.js';

export function randomCode(){const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let r='';for(let i=0;i<6;i++)r+=c[Math.floor(Math.random()*c.length)];document.getElementById('sala-input').value=r;}

const EXAMPLE=`1, Blinding Lights, The Weeknd
2, Hawái, Maluma
3, Shape of You, Ed Sheeran
4, Con Calma, Daddy Yankee
5, Someone Like You, Adele
6, Tusa, Karol G
7, Despacito, Luis Fonsi
8, Bohemian Rhapsody, Queen
9, Thriller, Michael Jackson
10, Bad Guy, Billie Eilish
11, La Bicicleta, Carlos Vives
12, Vivir Mi Vida, Marc Anthony
13, Felices los 4, Maluma
14, Perfect, Ed Sheeran
15, Shake It Off, Taylor Swift
16, Uptown Funk, Bruno Mars
17, Stay With Me, Sam Smith
18, Lean On, Major Lazer
19, La Tortura, Shakira
20, Waka Waka, Shakira
21, Mi Gente, J Balvin
22, Thinking Out Loud, Ed Sheeran
23, Cheap Thrills, Sia
24, Closer, The Chainsmokers
25, Love Yourself, Justin Bieber
26, Gasolina, Daddy Yankee
27, Loca, Shakira
28, Obsesión, Aventura
29, Propuesta Indecente, Romeo Santos
30, La Camisa Negra, Juanes`;

export function loadExample(){document.getElementById('songs-input').value=EXAMPLE;if(!document.getElementById('sala-input').value)randomCode();previewSongs();}

// Selector de modo de ganar (setup)
export function winModeChanged(){
  const mode=document.querySelector('input[name="win-mode"]:checked')?.value||'full';
  document.getElementById('win-cols').style.display=mode==='columns'?'flex':'none';
}

function readWinConfig(){
  const mode=document.querySelector('input[name="win-mode"]:checked')?.value||'full';
  const cols=[...document.querySelectorAll('input[name="win-col"]:checked')].map(c=>parseInt(c.value,10));
  return {winMode:mode,winColumns:mode==='columns'?cols:[]};
}

export function previewSongs(){
  const raw=document.getElementById('songs-input').value.trim();
  const box=document.getElementById('songs-preview');
  if(!raw){box.style.display='none';return;}
  const parsed=parseSongs(raw);
  if(!parsed.length){box.style.display='none';return;}
  box.style.display='block';
  const ok=parsed.length>=25;
  box.innerHTML=`<div style="margin-bottom:8px;"><span class="${ok?'songs-preview-ok':'songs-preview-warn'}">${ok?'✓':'⚠'} ${parsed.length} canciones detectadas${!ok?' — necesitas al menos 25':''}</span></div>
  <div style="max-height:150px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-sm);">
  <table class="preview-table">
    <thead><tr><th>#</th><th>Canción</th><th>Artista</th></tr></thead>
    <tbody>${parsed.slice(0,60).map(s=>`<tr><td style="color:var(--text2);">${s.num}</td><td>${s.title}</td><td style="color:var(--text2);">${s.artist}</td></tr>`).join('')}</tbody>
  </table></div>`;
}

export async function startGame(){
  const code=document.getElementById('sala-input').value.trim().toUpperCase();
  const raw=document.getElementById('songs-input').value.trim();
  const err=document.getElementById('setup-error');
  const colsErr=document.getElementById('win-cols-error');
  if(!code||code.length<3){err.textContent='Ingresa un código de sala (mínimo 3 caracteres).';err.style.display='block';return;}
  const parsed=parseSongs(raw);
  if(parsed.length<25){err.textContent='Necesitas al menos 25 canciones para generar cartones.';err.style.display='block';return;}
  const config=readWinConfig();
  if(config.winMode==='columns'&&!config.winColumns.length){
    colsErr.textContent='Selecciona al menos una columna (B, I, N, G u O).';colsErr.style.display='block';return;
  }
  colsErr.style.display='none';
  err.style.display='none';
  state.songs=parsed;state.currentSala=code;state.played=[];
  state.winMode=config.winMode;state.winColumns=config.winColumns;
  sessionStorage.setItem('bingo_sala',code);
  sessionStorage.setItem('bingo_songs',JSON.stringify(parsed));
  await db.ref('salas/'+code).set({songs:state.songs,played:[],current:null,tvState:'waiting',config,createdAt:Date.now()});
  document.getElementById('nav-sala-code').textContent=code;
  goTo('director');showDirectorNav(true);
  document.getElementById('d-sala-code').textContent=code;
  updateDStats();
  generateQR('d-qr',getAppURL()+'?join='+code,64);
  db.ref('salas/'+code+'/played').on('value',snap=>{});
  startRoomWatch();
}

export async function pullSong(){
  if(!state.currentSala)return;
  const snap=await db.ref('salas/'+state.currentSala).get();
  const data=snap.val();if(!data)return;
  const played=data.played||[];
  const avail=state.songs.filter((_,i)=>!played.includes(i));
  if(!avail.length){alert('¡Se acabaron todas las canciones!');return;}
  const pick=avail[Math.floor(Math.random()*avail.length)];
  const idx=state.songs.indexOf(pick);
  played.push(idx);state.currentSong=pick;
  await db.ref('salas/'+state.currentSala).update({played,current:pick,tvState:'waiting'});
  document.getElementById('d-placeholder').style.display='none';
  document.getElementById('d-current').style.display='block';
  document.getElementById('d-num').textContent='#'+pick.num;
  document.getElementById('d-song').textContent=pick.title;
  document.getElementById('d-artist').textContent=pick.artist;
  document.getElementById('d-yt').href='https://www.youtube.com/results?search_query='+encodeURIComponent(pick.title+' '+pick.artist);
  updateDStats(played.length);updateHist(played);
}

export function updateDStats(n){
  document.getElementById('d-total').textContent=state.songs.length;
  document.getElementById('d-played').textContent=n!==undefined?n:0;
  document.getElementById('d-left').textContent=state.songs.length-(n!==undefined?n:0);
}

export function updateHist(played){
  state.played=played;
  const w=document.getElementById('hist-wrap');
  w.style.display=played.length?'block':'none';
  document.getElementById('hist-pills').innerHTML=played.map(i=>`<span class="pill"><b>${state.songs[i].num}</b> ${state.songs[i].title}</span>`).join('');
  document.getElementById('verification-list').innerHTML=`<table class="verif-table">
    <thead><tr><th>Orden</th><th>Canción</th><th>Artista</th></tr></thead>
    <tbody>${played.map((idx,order)=>`<tr><td style="font-weight:600;color:var(--green);">${order+1}</td><td style="font-weight:500;">${state.songs[idx].title}</td><td style="color:var(--text2);">${state.songs[idx].artist}</td></tr>`).join('')}</tbody>
  </table>`;
}

export function toggleVerification(){
  const p=document.getElementById('verification-panel');
  const visible=p.style.display!=='none';
  p.style.display=visible?'none':'block';
  event.target.textContent=visible?'Ver listado completo ↓':'Ocultar listado ↑';
}

// Buscador sobre TODA la partida: verde "Ya salió" / rojo "NO HA SALIDO"
export function searchSongs(){
  const input=document.getElementById('song-search');
  const box=document.getElementById('search-results');
  if(!input||!box)return;
  const q=input.value.trim().toLowerCase();
  if(!q){box.style.display='none';box.innerHTML='';return;}
  const played=new Set(state.played);
  const hits=state.songs
    .map((s,i)=>({s,i}))
    .filter(({s})=>s.title.toLowerCase().includes(q)||(s.artist||'').toLowerCase().includes(q)||String(s.num).toLowerCase().includes(q));
  box.style.display='block';
  if(!hits.length){box.innerHTML='<div class="search-empty">Sin resultados en esta partida.</div>';return;}
  box.innerHTML=hits.slice(0,40).map(({s,i})=>{
    const out=played.has(i);
    return `<div class="search-row">
      <span class="search-song"><b>#${esc(s.num)}</b> ${esc(s.title)}<small>${esc(s.artist)}</small></span>
      <span class="search-badge ${out?'out':'pending'}">${out?'Ya salió':'NO HA SALIDO'}</span>
    </div>`;
  }).join('');
}

export async function triggerSuspense(){
  if(!state.currentSala||!state.currentSong){alert('Primero saca una canción.');return;}
  await db.ref('salas/'+state.currentSala+'/tvState').set('suspense');
}

export async function resetGame(){
  if(!confirm('¿Reiniciar la partida? Se borra el historial.'))return;
  state.currentSong=null;
  await db.ref('salas/'+state.currentSala).update({played:[],current:null,tvState:'waiting',claims:null,roundEnded:null,lastWinner:null,designatedSeed:null});
  document.getElementById('d-placeholder').style.display='block';
  document.getElementById('d-current').style.display='none';
  updateDStats(0);updateHist([]);
}

export async function endGame(){
  if(!confirm('¿Terminar y eliminar la partida?'))return;
  stopRoomWatch();
  if(state.currentSala)await db.ref('salas/'+state.currentSala).remove();
  state.currentSala=null;state.songs=[];state.currentSong=null;
  sessionStorage.removeItem('bingo_sala');sessionStorage.removeItem('bingo_songs');
  showDirectorNav(false);goTo('home');
}

// ===== RECLAMOS DE BINGO (panel del director) =====
let roomWatch=null;

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

export function stopRoomWatch(){
  if(roomWatch&&state.currentSala){try{db.ref('salas/'+state.currentSala).off('value',roomWatch);}catch(e){}}
  roomWatch=null;
}

function startRoomWatch(){
  if(!state.currentSala)return;
  if(roomWatch)db.ref('salas/'+state.currentSala).off('value',roomWatch);
  roomWatch=db.ref('salas/'+state.currentSala).on('value',snap=>{
    const data=snap.val();
    renderClaims(data);
    renderPlayers(data);
  });
}

// Jugadores en vivo: nombre, ● en línea / ○ desconectado, progreso X/24, 🏆 ganador
function renderPlayers(data){
  const list=document.getElementById('players-list');
  const count=document.getElementById('players-count');
  if(!list)return;
  const players=(data&&data.players)||{};
  const entries=Object.entries(players).sort((a,b)=>(a[1].joinedAt||0)-(b[1].joinedAt||0));
  if(!entries.length){
    list.innerHTML='<div class="players-empty">Nadie se ha unido aún — comparte el código de sala.</div>';
    if(count)count.textContent='';
    return;
  }
  const claims=(data&&data.claims)||{};
  const winnerSeeds=new Set(Object.values(claims).filter(c=>c.status==='confirmed').map(c=>String(c.playerSeed)));
  if(data&&data.lastWinner)winnerSeeds.add(String(data.lastWinner.seed));
  let online=0;
  const rows=entries.map(([id,p])=>{
    const isOn=p.connected!==false;
    if(isOn)online++;
    const m=normalizeMarks(p.marks);
    const marked=m.filter(Boolean).length-(m[12]?1:0); // sin contar la casilla LIBRE
    const trophy=winnerSeeds.has(String(p.seed??id));
    return `<div class="player-row">
      <span class="player-dot ${isOn?'on':'off'}" title="${isOn?'En línea':'Desconectado'}"></span>
      <span class="player-name">${trophy?'<span class="trophy">🏆</span>':''}${esc(p.name||'Jugador')}</span>
      <span class="player-progress">${marked}/24</span>
    </div>`;
  }).join('');
  list.innerHTML=rows;
  if(count)count.textContent=`● ${online} en línea · ○ ${entries.length-online} desconectado${entries.length-online===1?'':'s'}`;
}

function renderClaims(data){
  const sec=document.getElementById('claims-section');
  const list=document.getElementById('claims-list');
  const wbox=document.getElementById('winners-box');
  const wlist=document.getElementById('winners-list');
  const rend=document.getElementById('round-ended-box');
  if(!sec)return;
  const claims=(data&&data.claims)||{};
  const entries=Object.entries(claims);
  const pending=entries.filter(([,c])=>c.status==='pending');
  const confirmed=entries.filter(([,c])=>c.status==='confirmed');
  const rejected=entries.filter(([,c])=>c.status==='rejected');
  const roundEnded=!!(data&&data.roundEnded);
  const lastWinner=(data&&data.lastWinner)||null;
  const designated=data&&data.designatedSeed;

  // Avisos de pendientes: "¡{Nombre} gritó Bingo!" + acciones
  let html='';
  for(const [id,c] of pending){
    html+=`<div class="claim-alert">🔔 <b>¡${esc(c.name)} gritó Bingo!</b></div>
    <div class="claim-item">
      <span class="claim-who">${esc(c.name)}</span>
      <span class="claim-status pending">Pendiente</span>
      <span class="claim-actions">
        <button class="btn btn-primary btn-sm" onclick="confirmClaim('${id}')">✅ Confirmar</button>
        <button class="btn btn-secondary btn-sm" onclick="rejectClaim('${id}')">❌ Rechazar</button>
      </span>
    </div>`;
  }
  for(const [,c] of confirmed){
    html+=`<div class="claim-item"><span class="claim-who">🏆 ${esc(c.name)}</span><span class="claim-status confirmed">Confirmado</span></div>`;
  }
  for(const [,c] of rejected){
    html+=`<div class="claim-item" style="opacity:.55;"><span class="claim-who">${esc(c.name)}</span><span class="claim-status rejected">Rechazado — puede reclamar de nuevo</span></div>`;
  }
  list.innerHTML=html;

  const showList=pending.length||confirmed.length||rejected.length;
  sec.style.display=(showList||roundEnded)?'block':'none';

  // Ganadores confirmados → designar quién gana
  if(confirmed.length&&!roundEnded){
    wbox.style.display='block';
    wlist.innerHTML=confirmed.map(([id,c])=>{
      const picked=String(designated)===String(c.playerSeed);
      return `<label class="winner-option"><input type="radio" name="winner-pick" value="${c.playerSeed}" ${picked?'checked':''} onchange="designateWinner(this.value)"> <span>${esc(c.name)}</span> <span class="claim-status confirmed" style="margin-left:auto;">✓ Confirmado</span></label>`;
    }).join('');
  }else{
    wbox.style.display='none';
  }

  // Ronda terminada → aviso + nueva ronda (la sala NO se borra)
  if(roundEnded){
    rend.style.display='block';
    document.getElementById('round-ended-msg').textContent=
      lastWinner?`🏁 Ronda terminada — ¡${lastWinner.name} ganó!`:'🏁 Ronda terminada.';
  }else{
    rend.style.display='none';
  }
}

export async function confirmClaim(id){
  if(!state.currentSala)return;
  try{
    await db.ref('salas/'+state.currentSala+'/claims/'+id+'/status').set('confirmed');
    // Si nadie está designado aún, designar automáticamente al confirmado
    const snap=await db.ref('salas/'+state.currentSala+'/designatedSeed').get();
    if(!snap.exists()){
      const cs=await db.ref('salas/'+state.currentSala+'/claims/'+id).get();
      const c=cs.val();
      if(c)await db.ref('salas/'+state.currentSala+'/designatedSeed').set(c.playerSeed);
    }
  }catch(e){}
}

export async function rejectClaim(id){
  if(!state.currentSala)return;
  try{await db.ref('salas/'+state.currentSala+'/claims/'+id+'/status').set('rejected');}catch(e){}
}

export async function designateWinner(seed){
  if(!state.currentSala)return;
  try{await db.ref('salas/'+state.currentSala+'/designatedSeed').set(parseInt(seed,10));}catch(e){}
}

// Elegido por el director tras designar: limpia los reclamos y sigue jugando
export async function continueRound(){
  if(!state.currentSala)return;
  if(!confirm('¿Seguir jugando? Se limpian los reclamos de esta ronda.'))return;
  try{await db.ref('salas/'+state.currentSala).update({claims:null,designatedSeed:null});}catch(e){}
}

// Termina la ronda: TV muestra "¡{Nombre} GANÓ!" con confeti; la sala NO se borra
export async function endRound(){
  if(!state.currentSala)return;
  const snap=await db.ref('salas/'+state.currentSala+'/claims').get();
  const claims=snap.val()||{};
  const confirmed=Object.entries(claims).filter(([,c])=>c.status==='confirmed');
  if(!confirmed.length){alert('Confirma al menos un reclamo (✅) antes de terminar la ronda.');return;}
  const ds=await db.ref('salas/'+state.currentSala+'/designatedSeed').get();
  const designated=ds.val();
  const winner=confirmed.find(([,c])=>String(c.playerSeed)===String(designated))||confirmed[0];
  const [,w]=winner;
  try{
    await db.ref('salas/'+state.currentSala).update({
      roundEnded:true,
      lastWinner:{name:w.name,seed:w.playerSeed,at:Date.now()},
      claims:null,
      designatedSeed:null
    });
  }catch(e){}
}

// Nueva ronda después de "Terminar ronda"
export async function newRound(){
  if(!state.currentSala)return;
  try{await db.ref('salas/'+state.currentSala).update({roundEnded:null,lastWinner:null,claims:null,designatedSeed:null});}catch(e){}
}

// Restaurar sesión del director al recargar (si hay sala en sessionStorage)
export async function restoreDirectorSession(){
  const savedSala=sessionStorage.getItem('bingo_sala');
  const savedSongs=sessionStorage.getItem('bingo_songs');
  if(!savedSala||!savedSongs)return false;
  try{
    const snap=await db.ref('salas/'+savedSala).get();
    if(snap.exists()){
      state.currentSala=savedSala;state.songs=JSON.parse(savedSongs);
      const data=snap.val();const played=data.played||[];state.currentSong=data.current||null;
      state.winMode=data.config?.winMode||'full';
      state.winColumns=data.config?.winColumns||[];
      document.getElementById('nav-sala-code').textContent=savedSala;
      document.getElementById('d-sala-code').textContent=savedSala;
      updateDStats(played.length);updateHist(played);
      generateQR('d-qr',getAppURL()+'?join='+savedSala,64);
      if(state.currentSong){
        document.getElementById('d-placeholder').style.display='none';
        document.getElementById('d-current').style.display='block';
        document.getElementById('d-num').textContent='#'+state.currentSong.num;
        document.getElementById('d-song').textContent=state.currentSong.title;
        document.getElementById('d-artist').textContent=state.currentSong.artist;
        document.getElementById('d-yt').href='https://www.youtube.com/results?search_query='+encodeURIComponent(state.currentSong.title+' '+state.currentSong.artist);
      }
      goTo('director');showDirectorNav(true);startRoomWatch();return true;
    }
  }catch(e){}
  sessionStorage.removeItem('bingo_sala');sessionStorage.removeItem('bingo_songs');
  return false;
}
