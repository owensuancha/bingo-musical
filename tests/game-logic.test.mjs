// Tests de caracterizaci√≥n de js/game-logic.js
// Documentan el comportamiento ACTUAL (antes de cambiar nada). node --test tests/
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeCarton,parseSongs,checkWin,BINGO_LINES,validateNewSongs} from '../js/game-logic.js';

const songList=Array.from({length:40},(_,i)=>({num:String(i+1),title:'Canci√≥n '+(i+1),artist:'Artista '+(i+1)}));

test('makeCarton: 25 casillas con LIBRE en el centro (√≠ndice 12)',()=>{
  const c=makeCarton(songList,42);
  assert.equal(c.length,25);
  assert.equal(c[12].free,true);
  assert.equal(c[12].title,'LIBRE');
});

test('makeCarton: las 24 cancillas provienen de la lista y son √∫nicas',()=>{
  const c=makeCarton(songList,7);
  const noFree=c.filter(x=>!x.free);
  assert.equal(noFree.length,24);
  const titles=new Set(noFree.map(x=>x.title));
  assert.equal(titles.size,24);
  for(const s of noFree)assert.ok(songList.some(x=>x.title===s.title),'canci√≥n fuera de la lista: '+s.title);
});

test('makeCarton: misma semilla = mismo cart√≥n (determinista)',()=>{
  assert.deepEqual(makeCarton(songList,123),makeCarton(songList,123));
});

test('makeCarton: semillas distintas dan cartones distintos',()=>{
  assert.notDeepEqual(makeCarton(songList,1),makeCarton(songList,2));
});

test('parseSongs: formato "n√∫mero, t√≠tulo, artista"',()=>{
  const r=parseSongs('1, Shape of You, Ed Sheeran');
  assert.deepEqual(r,[{num:'1',title:'Shape of You',artist:'Ed Sheeran'}]);
});

test('parseSongs: sin n√∫mero, auto-numera desde 1',()=>{
  const r=parseSongs('Haw√°i, Maluma\nTusa, Karol G');
  assert.deepEqual(r,[{num:'1',title:'Haw√°i',artist:'Maluma'},{num:'2',title:'Tusa',artist:'Karol G'}]);
});

test('parseSongs: artista con comas se conserva completo',()=>{
  const r=parseSongs('5, Canci√≥n, Artista, Jr., Featuring');
  assert.equal(r[0].artist,'Artista, Jr., Featuring');
});

test('parseSongs: l√≠neas vac√≠as se ignoran',()=>{
  const r=parseSongs('\n\n1, A, B\n\n   \n2, C, D\n');
  assert.equal(r.length,2);
});

test('checkWin: l√≠nea completa de casillas marcadas gana',()=>{
  const marks=new Array(25).fill(false);
  [0,1,2,3,4].forEach(i=>marks[i]=true); // primera fila
  assert.equal(checkWin(marks),true);
});

test('checkWin: sin l√≠nea completa no gana',()=>{
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

test('BINGO_LINES: 12 l√≠neas de 5 √≠ndices v√°lidos (0-24)',()=>{
  assert.equal(BINGO_LINES.length,12);
  for(const l of BINGO_LINES){
    assert.equal(l.length,5);
    for(const i of l)assert.ok(i>=0&&i<24+1);
  }
});

// ===== Task 3: modos de victoria (full | columns | ring) =====
// Firma nueva: checkWin(marks, winMode='full', winColumns=[])

// PerÌmetro de una cuadrÌcula 5◊5 (16 casillas) ó forma de O/ring
const RING=[0,1,2,3,4, 5,9, 10,14, 15,19, 20,21,22,23,24];
function marksOf(idx){const m=new Array(25).fill(false);idx.forEach(i=>m[i]=true);return m;}

test('full: por defecto gana con lÌnea cl·sica (compatibilidad)',()=>{
  assert.equal(checkWin(marksOf([0,1,2,3,4])),true);
});

test('columns: gana solo si TODAS las filas de las columnas seleccionadas est·n marcadas',()=>{
  // columnas B(0) e I(1) completas = 10 casillas
  const idx=[0,5,10,15,20, 1,6,11,16,21];
  assert.equal(checkWin(marksOf(idx),'columns',[0,1]),true);
});

test('columns: una fila completa NO gana si las columnas seleccionadas est·n incompletas',()=>{
  // fila 1 completa (lÌnea cl·sica) pero columna O(4) casi vacÌa
  assert.equal(checkWin(marksOf([5,6,7,8,9]),'columns',[4]),false);
});

test('columns: al menos una columna seleccionada basta',()=>{
  const idx=[0,5,10,15,20]; // columna B completa
  assert.equal(checkWin(marksOf(idx),'columns',[0]),true);
});

test('columns: sin columnas seleccionadas no se gana',()=>{
  assert.equal(checkWin(marksOf([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24]),'columns',[]),false);
});

test('ring: gana con las 16 casillas del perÌmetro marcadas',()=>{
  assert.equal(checkWin(marksOf(RING),'ring'),true);
});

test('ring: una lÌnea cl·sica NO gana si falta alg˙n borde',()=>{
  // fila 1 completa pero el anillo incompleto
  assert.equal(checkWin(marksOf([5,6,7,8,9]),'ring'),false);
});

test('ring: perÌmetro incompleto no gana',()=>{
  const incompleto=RING.filter(i=>i!==24); // falta una esquina
  assert.equal(checkWin(marksOf(incompleto),'ring'),false);
});

test('RING tiene 16 casillas de borde sin incluir el centro',()=>{
  assert.equal(RING.length,16);
  assert.ok(!RING.includes(12));
  for(const i of RING){
    const r=Math.floor(i/5),c=i%5;
    assert.ok(r===0||r===4||c===0||c===4,'Ìndice '+i+' no es borde');
  }
});

// ===== Task 4: persistencia de marcas =====
import {normalizeMarks} from '../js/game-logic.js';

test('normalizeMarks: array de Firebase se conserva tal cual',()=>{
  const arr=new Array(25).fill(false);arr[0]=arr[12]=true;
  assert.deepEqual(normalizeMarks(arr),arr);
});

test('normalizeMarks: objeto con Ìndices (RTDB sin arrays) rellena huecos',()=>{
  const obj={0:true,4:true,12:true,24:true};
  const m=normalizeMarks(obj);
  assert.equal(m.length,25);
  assert.equal(m[0],true);assert.equal(m[4],true);assert.equal(m[12],true);assert.equal(m[24],true);
  assert.equal(m[1],false);assert.equal(m[13],false);
});

test('normalizeMarks: null/undefined devuelve 25 casillas en false',()=>{
  assert.deepEqual(normalizeMarks(null),new Array(25).fill(false));
  assert.deepEqual(normalizeMarks(undefined),new Array(25).fill(false));
});

test('normalizeMarks: claves fuera de rango o valores falsos se ignoran',()=>{
  const m=normalizeMarks({0:true,30:true,7:false,'99':true});
  assert.equal(m[0],true);
  assert.equal(m[7],false);
  assert.equal(m.filter(Boolean).length,1);
});

// ===== validateNewSongs (lista nueva de "Otras canciones") =====
test('validateNewSongs: menos de 25 ‚Üí error', () => {
  const r = validateNewSongs('1, A, B\n2, C, D');
  assert.equal(r.ok, false);
  assert.equal(r.songs.length, 0);
  assert.match(r.error, /25/);
});
test('validateNewSongs: vac√≠o ‚Üí error', () => {
  const r = validateNewSongs('');
  assert.equal(r.ok, false);
  assert.match(r.error, /25/);
});
test('validateNewSongs: 25 v√°lidas ‚Üí ok con parseo completo', () => {
  const raw = Array.from({length:25},(_,i)=>(i+1)+', T√≠tulo '+(i+1)+', Artista '+(i+1)).join('\n');
  const r = validateNewSongs(raw);
  assert.equal(r.ok, true);
  assert.equal(r.songs.length, 25);
  assert.equal(r.songs[0].num, '1');
  assert.equal(r.songs[0].artist, 'Artista 1');
  assert.equal(r.error, null);
});
test('validateNewSongs: formatos mixtos (con y sin n√∫mero)', () => {
  const raw = Array.from({length:24},(_,i)=>'Canci√≥n '+(i+1)+', Autor '+(i+1)).join('\n');
  const r = validateNewSongs('99, Con n√∫mero, Alguien\n' + raw);
  assert.equal(r.ok, true);
  assert.equal(r.songs.length, 25);
  assert.equal(r.songs[0].num, '99');
});
