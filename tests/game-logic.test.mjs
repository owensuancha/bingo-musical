// Tests de caracterizaciÃ³n de js/game-logic.js
// Documentan el comportamiento ACTUAL (antes de cambiar nada). node --test tests/
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeCarton,parseSongs,checkWin,BINGO_LINES} from '../js/game-logic.js';

const songList=Array.from({length:40},(_,i)=>({num:String(i+1),title:'CanciÃ³n '+(i+1),artist:'Artista '+(i+1)}));

test('makeCarton: 25 casillas con LIBRE en el centro (Ã­ndice 12)',()=>{
  const c=makeCarton(songList,42);
  assert.equal(c.length,25);
  assert.equal(c[12].free,true);
  assert.equal(c[12].title,'LIBRE');
});

test('makeCarton: las 24 cancillas provienen de la lista y son Ãºnicas',()=>{
  const c=makeCarton(songList,7);
  const noFree=c.filter(x=>!x.free);
  assert.equal(noFree.length,24);
  const titles=new Set(noFree.map(x=>x.title));
  assert.equal(titles.size,24);
  for(const s of noFree)assert.ok(songList.some(x=>x.title===s.title),'canciÃ³n fuera de la lista: '+s.title);
});

test('makeCarton: misma semilla = mismo cartÃ³n (determinista)',()=>{
  assert.deepEqual(makeCarton(songList,123),makeCarton(songList,123));
});

test('makeCarton: semillas distintas dan cartones distintos',()=>{
  assert.notDeepEqual(makeCarton(songList,1),makeCarton(songList,2));
});

test('parseSongs: formato "nÃºmero, tÃ­tulo, artista"',()=>{
  const r=parseSongs('1, Shape of You, Ed Sheeran');
  assert.deepEqual(r,[{num:'1',title:'Shape of You',artist:'Ed Sheeran'}]);
});

test('parseSongs: sin nÃºmero, auto-numera desde 1',()=>{
  const r=parseSongs('HawÃ¡i, Maluma\nTusa, Karol G');
  assert.deepEqual(r,[{num:'1',title:'HawÃ¡i',artist:'Maluma'},{num:'2',title:'Tusa',artist:'Karol G'}]);
});

test('parseSongs: artista con comas se conserva completo',()=>{
  const r=parseSongs('5, CanciÃ³n, Artista, Jr., Featuring');
  assert.equal(r[0].artist,'Artista, Jr., Featuring');
});

test('parseSongs: lÃ­neas vacÃ­as se ignoran',()=>{
  const r=parseSongs('\n\n1, A, B\n\n   \n2, C, D\n');
  assert.equal(r.length,2);
});

test('checkWin: lÃ­nea completa de casillas marcadas gana',()=>{
  const marks=new Array(25).fill(false);
  [0,1,2,3,4].forEach(i=>marks[i]=true); // primera fila
  assert.equal(checkWin(marks),true);
});

test('checkWin: sin lÃ­nea completa no gana',()=>{
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

test('BINGO_LINES: 12 lÃ­neas de 5 Ã­ndices vÃ¡lidos (0-24)',()=>{
  assert.equal(BINGO_LINES.length,12);
  for(const l of BINGO_LINES){
    assert.equal(l.length,5);
    for(const i of l)assert.ok(i>=0&&i<24+1);
  }
});

// ===== Task 3: modos de victoria (full | columns | ring) =====
// Firma nueva: checkWin(marks, winMode='full', winColumns=[])

// Perímetro de una cuadrícula 5×5 (16 casillas) — forma de O/ring
const RING=[0,1,2,3,4, 5,9, 10,14, 15,19, 20,21,22,23,24];
function marksOf(idx){const m=new Array(25).fill(false);idx.forEach(i=>m[i]=true);return m;}

test('full: por defecto gana con línea clásica (compatibilidad)',()=>{
  assert.equal(checkWin(marksOf([0,1,2,3,4])),true);
});

test('columns: gana solo si TODAS las filas de las columnas seleccionadas están marcadas',()=>{
  // columnas B(0) e I(1) completas = 10 casillas
  const idx=[0,5,10,15,20, 1,6,11,16,21];
  assert.equal(checkWin(marksOf(idx),'columns',[0,1]),true);
});

test('columns: una fila completa NO gana si las columnas seleccionadas están incompletas',()=>{
  // fila 1 completa (línea clásica) pero columna O(4) casi vacía
  assert.equal(checkWin(marksOf([5,6,7,8,9]),'columns',[4]),false);
});

test('columns: al menos una columna seleccionada basta',()=>{
  const idx=[0,5,10,15,20]; // columna B completa
  assert.equal(checkWin(marksOf(idx),'columns',[0]),true);
});

test('columns: sin columnas seleccionadas no se gana',()=>{
  assert.equal(checkWin(marksOf([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24]),'columns',[]),false);
});

test('ring: gana con las 16 casillas del perímetro marcadas',()=>{
  assert.equal(checkWin(marksOf(RING),'ring'),true);
});

test('ring: una línea clásica NO gana si falta algún borde',()=>{
  // fila 1 completa pero el anillo incompleto
  assert.equal(checkWin(marksOf([5,6,7,8,9]),'ring'),false);
});

test('ring: perímetro incompleto no gana',()=>{
  const incompleto=RING.filter(i=>i!==24); // falta una esquina
  assert.equal(checkWin(marksOf(incompleto),'ring'),false);
});

test('RING tiene 16 casillas de borde sin incluir el centro',()=>{
  assert.equal(RING.length,16);
  assert.ok(!RING.includes(12));
  for(const i of RING){
    const r=Math.floor(i/5),c=i%5;
    assert.ok(r===0||r===4||c===0||c===4,'índice '+i+' no es borde');
  }
});
