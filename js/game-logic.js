// Lógica pura del bingo — sin DOM, sin Firebase (testable con node --test)

export function seededRng(s){return function(){s=(s*1664525+1013904223)&0xffffffff;return(s>>>0)/0xffffffff;};}

export function shuffleSeeded(arr,seed){const rng=seededRng(seed),a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

export function makeCarton(songList,seed){const s=shuffleSeeded(songList,seed).slice(0,24);s.splice(12,0,{title:'LIBRE',artist:'',free:true});return s;}

export function parseSongs(raw){
  const lines=raw.split('\n').filter(l=>l.trim()),res=[];let autoNum=1;
  for(const l of lines){
    let parts=l.includes('\t')?l.split('\t').map(x=>x.trim()).filter(x=>x):l.split(',').map(x=>x.trim()).filter(x=>x);
    if(!parts.length)continue;
    const firstIsNum=/^\d+$/.test(parts[0]);
    let num,title,artist;
    if(firstIsNum&&parts.length>=2){num=parts[0];title=parts[1];artist=parts.slice(2).join(', ');}
    else if(!firstIsNum&&parts.length>=1){num=String(autoNum);title=parts[0];artist=parts.slice(1).join(', ');}
    else continue;
    if(title){res.push({num,title,artist:artist||''});autoNum++;}
  }
  return res;
}

// Líneas clásicas de bingo (5 filas + 5 columnas + 2 diagonales) en cuadrícula 5×5
export const BINGO_LINES=[[0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24],[0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24],[0,6,12,18,24],[4,8,12,16,20]];

// Victoria pura: todas las casillas de al menos una línea marcadas
export function checkWin(marks){
  return BINGO_LINES.some(l=>l.every(i=>marks[i]));
}
