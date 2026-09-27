// Estado compartido, Firebase y navegación de pantallas

const firebaseConfig = {
  apiKey: "AIzaSyCXg3wEhMNwPdxTA2iWp-ssDC5g6jmBe_I",
  authDomain: "bingo-musical-9d8f7.firebaseapp.com",
  databaseURL: "https://bingo-musical-9d8f7-default-rtdb.firebaseio.com",
  projectId: "bingo-musical-9d8f7",
  storageBucket: "bingo-musical-9d8f7.firebasestorage.app",
  messagingSenderId: "400401289821",
  appId: "1:400401289821:web:949eea408ddeef9ec233b4"
};
firebase.initializeApp(firebaseConfig);
export const db = firebase.database();

// Estado compartido entre director, jugador y TV (mutar propiedades, no reasignar)
export const state = {
  songs: [],
  played: [],
  currentSala: null,
  currentSong: null,
  playerSeed: 0,
  playerMarks: [],
  playerName: '',
  winMode: 'full',
  winColumns: [],
  tvSala: null,
  tvListener: null
};

const DIR_SCREENS=['director','tv-pre','tv','print-view'];

// Hooks del canvas de TV (registrados por tv.js para evitar dependencias circulares)
let canvasHooks={start(){},stop(){}};
export function setCanvasHooks(h){canvasHooks={...canvasHooks,...h};}

export function showDirectorNav(show){document.getElementById('dir-nav').classList.toggle('visible',show);}

export function goTo(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const el=document.getElementById(id);
  if(el)el.classList.add('active');
  showDirectorNav(DIR_SCREENS.includes(id)&&state.currentSala);
  if(id==='tv'||id==='tv-pre')canvasHooks.start();else canvasHooks.stop();
}

export function dirNavGo(id){
  document.querySelectorAll('.dir-nav-tab').forEach(t=>t.classList.remove('active'));
  const tab=document.getElementById('nav-'+id);
  if(tab)tab.classList.add('active');
  if(id==='tv-pre'){const i=document.getElementById('tv-sala-input');if(i&&state.currentSala)i.value=state.currentSala;}
  if(id==='print-view'){const i=document.getElementById('print-sala-input');if(i&&state.currentSala)i.value=state.currentSala;}
  goTo(id);
}

export function getAppURL(){return window.location.href.split('?')[0];}
export function generateQR(elementId,text,size){const el=document.getElementById(elementId);if(!el)return;el.innerHTML='';try{new QRCode(el,{text,width:size,height:size,correctLevel:QRCode.CorrectLevel.M});}catch(e){}}
