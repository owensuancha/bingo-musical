// Entry point: expone las funciones usadas por los handlers inline de index.html
// y arranca la app (deep-link ?join= y restauración de sesión del director).

import {goTo,dirNavGo} from './shared.js';
import {randomCode,loadExample,previewSongs,startGame,pullSong,triggerSuspense,resetGame,endGame,toggleVerification,restoreDirectorSession,winModeChanged,confirmClaim,rejectClaim,designateWinner,continueRound,endRound,newRound,searchSongs} from './director.js';
import {joinGame,leaveGame,clearMarks,buildPrint,restorePlayerSession,sayBingo,closeBingoPopup} from './jugador.js';
import {tvConnect,disconnectTV,toggleFS} from './tv.js';

// Handlers inline (onclick/oninput) de index.html — exponerlos en window
Object.assign(window,{
  goTo,dirNavGo,
  randomCode,loadExample,previewSongs,startGame,pullSong,triggerSuspense,resetGame,endGame,toggleVerification,winModeChanged,
  confirmClaim,rejectClaim,designateWinner,continueRound,endRound,newRound,searchSongs,
  joinGame,leaveGame,clearMarks,buildPrint,sayBingo,closeBingoPopup,
  tvConnect,disconnectTV,toggleFS
});

window.addEventListener('load',async()=>{
  const params=new URLSearchParams(window.location.search);
  const joinCode=params.get('join');
  // Prioridad: sesión del director → sesión del jugador → deep-link ?join=
  if(await restoreDirectorSession())return;
  if(await restorePlayerSession(joinCode?joinCode.toUpperCase():null))return;
  if(joinCode){
    document.getElementById('join-code').value=joinCode.toUpperCase();
    goTo('join');
  }
});
