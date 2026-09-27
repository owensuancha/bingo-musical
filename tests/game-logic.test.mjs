// Tests de caracterización de js/game-logic.js
// Documentan el comportamiento ACTUAL (antes de cambiar nada). node --test tests/
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeCarton,parseSongs,checkWin,BINGO_LINES} from '../js/game-logic.js';

const songList=Array.from({length:40},(_,i)=>({num:String(i+1),title:'Canción '+(i+1),artist:'Artista '+(i+1)}));

test('makeCarton: 25 casillas con LIBRE en el centro (índice 12)',()=>{
  const c=makeCarton(songList,42);
  assert.equal(c.length,25);
  assert.equal(c[12].free,true);
  assert.equal(c[12].title,'LIBRE');
});

test('makeCarton: las 24 cancillas provienen de la lista y son únicas',()=>{
  const c=makeCarton(songList,7);
  const noFree=c.filter(x=>!x.free);
  assert.equal(noFree.length,24);
  const titles=new Set(noFree.map(x=>x.title));
  assert.equal(titles.size,24);
  for(const s of noFree)assert.ok(songList.some(x=>x.title===s.title),'canción fuera de la lista: '+s.title);
});

test('makeCarton: misma semilla = mismo cartón (determinista)',()=>{
  assert.deepEqual(makeCarton(songList,123),makeCarton(songList,123));
});

test('makeCarton: semillas distintas dan cartones distintos',()=>{
  assert.notDeepEqual(makeCarton(songList,1),makeCarton(songList,2));
});

test('parseSongs: formato "número, título, artista"',()=>{
  const r=parseSongs('1, Shape of You, Ed Sheeran');
  assert.deepEqual(r,[{num:'1',title:'Shape of You',artist:'Ed Sheeran'}]);
});

test('parseSongs: sin número, auto-numera desde 1',()=>{
  const r=parseSongs('Hawái, Maluma\nTusa, Karol G');
  assert.deepEqual(r,[{num:'1',title:'Hawái',artist:'Maluma'},{num:'2',title:'Tusa',artist:'Karol G'}]);
});

test('parseSongs: artista con comas se conserva completo',()=>{
  const r=parseSongs('5, Canción, Artista, Jr., Featuring');
  assert.equal(r[0].artist,'Artista, Jr., Featuring');
});

test('parseSongs: líneas vacías se ignoran',()=>{
  const r=parseSongs('\n\n1, A, B\n\n   \n2, C, D\n');
  assert.equal(r.length,2);
});

test('checkWin: línea completa de casillas marcadas gana',()=>{
  const marks=new Array(25).fill(false);
  [0,1,2,3,4].forEach(i=>marks[i]=true); // primera fila
  assert.equal(checkWin(marks),true);
});

test('checkWin: sin línea completa no gana',()=>{
  const marks=new Array(25).fill(false);
  [0,1,2,3].forEach(i=>marks[i]=true); // fila 1 incompleta
  assert.equal(checkWin(marks),false);
});

test('checkWin: todas las casillas marcadas gana',()=>{
  assert.equal(checkWin(new Array(25).fill(true)),true);
});

test('checkWin: solo la casilla libre marcada no gana',()=>{
  const marks=new Array(25).fill(false);marks[12]=true;
  assert.equal(checkWin(marks),false);
});

test('BINGO_LINES: 12 líneas de 5 índices válidos (0-24)',()=>{
  assert.equal(BINGO_LINES.length,12);
  for(const l of BINGO_LINES){
    assert.equal(l.length,5);
    for(const i of l)assert.ok(i>=0&&i<24+1);
  }
});
