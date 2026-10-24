/* =====================================================================
   script.js – user interface, animation player, quiz and comparison.
   Uses ALGOS and makeArray from algorithms.js.
   ===================================================================== */
const $ = id => document.getElementById(id);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ----- State -----
let algoKey = 'bubble';
let base = [];            // original array (what Reset restores)
let cur = [];             // array as displayed right now
let steps = [];           // recorded operations, grouped (each step may carry 'sorted' marks)
let pos = 0;              // how many steps have been applied
let doneSet = new Set();  // positions shown in green
let hl = { c: [], s: [] };// highlighted compare / swap positions
let stats = { cmp: 0, swp: 0, acc: 0 };
let status = 'Ready';     // Ready | Running | Paused | Completed
let timer = null, elapsed = 0, runStart = 0, lastMsg = '';
let soundOn = false, audioCtx = null;
const results = {};       // measured counts for the compare table

// ----- Setup -----
function init() {
  for (const k in ALGOS) $('algoSelect').add(new Option(ALGOS[k].name, k));
  buildCards(); renderCompare(); initQuiz();
  $('algoSelect').onchange = e => selectAlgo(e.target.value);
  $('typeSelect').onchange = newArray;
  $('sizeRange').oninput = () => { $('sizeLabel').textContent = $('sizeRange').value; newArray(); };
  $('newBtn').onclick = newArray;
  $('startBtn').onclick = start;
  $('pauseBtn').onclick = pause;
  $('stepBtn').onclick = stepForward;
  $('backBtn').onclick = stepBack;
  $('resetBtn').onclick = reset;
  $('soundToggle').onchange = e => { soundOn = e.target.checked; };
  $('measureBtn').onclick = measureAll;
  $('themeBtn').onclick = () => {
    const h = document.documentElement;
    h.dataset.theme = h.dataset.theme === 'dark' ? 'light' : 'dark';
  };
  setInterval(() => { if (status === 'Running') $('stTime').textContent = (currentElapsed() / 1000).toFixed(2) + ' s'; }, 100);
  newArray();
  renderInfo();
}

function newArray() {
  if (status === 'Running') return;                       // never change data mid-run
  const n = clamp(parseInt($('sizeRange').value, 10) || 30, 5, 100);
  base = makeArray(n, $('typeSelect').value);
  const bars = $('bars'); bars.innerHTML = '';
  for (let i = 0; i < n; i++) { const d = document.createElement('div'); d.className = 'bar'; bars.appendChild(d); }
  bars.classList.toggle('labels', n <= 25);
  reset();
}

function selectAlgo(key) {
  if (status === 'Running') pause();
  algoKey = key; $('algoSelect').value = key;
  reset(); renderInfo();
}

// Reset cancels any running animation and restores the original array
function reset() {
  clearTimeout(timer); timer = null;
  cur = base.slice(); steps = []; pos = 0; doneSet = new Set(); hl = { c: [], s: [] };
  stats = { cmp: 0, swp: 0, acc: 0 }; elapsed = 0; runStart = 0;
  lastMsg = 'Press Start to animate, or Step forward to go one operation at a time.';
  setStatus('Ready');
}
function setStatus(s) { status = s; render(); }

// ----- Player -----
// Run the real algorithm once on a copy; group "sorted" marks with the previous operation
function prepare() {
  if (steps.length) return;
  for (const op of ALGOS[algoKey].run(base.slice())) {
    if (op.t === 'd' && steps.length) steps[steps.length - 1].push(op);
    else steps.push([op]);
  }
}

function applyStep(group, silent) {
  hl = { c: [], s: [] };
  for (const op of group) {
    if (op.t === 'c') { stats.cmp++; stats.acc += 2; hl.c = [op.i, op.j]; if (!silent) beep(cur[op.i]); }
    else if (op.t === 's') {
      stats.swp++; stats.acc += 4; hl.s = [op.i, op.j];
      const t = cur[op.i]; cur[op.i] = cur[op.j]; cur[op.j] = t;
      if (!silent) beep(cur[op.i]);
    } else if (op.t === 'w') { stats.swp++; stats.acc += 1; cur[op.i] = op.v; hl.s = [op.i]; if (!silent) beep(op.v); }
    else if (op.t === 'd') doneSet.add(op.i);
    if (op.t !== 'd') lastMsg = op.m;
  }
}

function stepOnce() {
  if (pos >= steps.length) return;
  applyStep(steps[pos++], false);
  if (pos >= steps.length) finish();
}

function finish() {
  clearTimeout(timer);
  if (status === 'Running') elapsed += performance.now() - runStart;
  hl = { c: [], s: [] };
  for (let i = 0; i < cur.length; i++) doneSet.add(i);
  const ok = isSorted(cur);                                // safety check
  lastMsg = ok ? 'Done! The array is sorted.' : 'Error: the array is not sorted.';
  results[algoKey] = { n: cur.length, cmp: stats.cmp, mov: stats.swp };
  renderCompare();
  setStatus('Completed');
}
const isSorted = a => a.every((v, i) => i === 0 || a[i - 1] <= v);
const getDelay = () => Math.max(4, Math.round(Math.pow(101 - clamp(+$('speedRange').value, 1, 100), 2) / 12));
const currentElapsed = () => elapsed + (status === 'Running' ? performance.now() - runStart : 0);

function tick() {                                          // one animation frame, then schedule the next
  if (status !== 'Running') return;
  stepOnce();
  if (status === 'Running') { render(); timer = setTimeout(tick, getDelay()); }
}
function start() {
  if (status === 'Completed') reset();
  if (status === 'Running') return;
  prepare();
  runStart = performance.now();
  setStatus('Running');
  tick();
}
function pause() {
  if (status !== 'Running') return;
  clearTimeout(timer); elapsed += performance.now() - runStart;
  setStatus('Paused');
}
function stepForward() {
  if (status === 'Running' || status === 'Completed') return;
  prepare(); stepOnce();
  if (status !== 'Completed') setStatus('Paused');
}
function stepBack() {                                      // replay from the start up to pos-1
  if (status === 'Running' || pos === 0) return;
  const target = pos - 1;
  cur = base.slice(); doneSet = new Set(); hl = { c: [], s: [] }; stats = { cmp: 0, swp: 0, acc: 0 }; pos = 0;
  lastMsg = 'Back at the start.';
  while (pos < target) applyStep(steps[pos++], true);
  setStatus(pos === 0 ? 'Ready' : 'Paused');
}

// ----- Rendering -----
function render() {
  const bars = $('bars').children, running = status === 'Running';
  for (let i = 0; i < cur.length; i++) {
    const b = bars[i];
    b.style.height = cur[i] + '%'; b.dataset.v = cur[i];
    b.className = 'bar' + (doneSet.has(i) ? ' sorted' : hl.s.includes(i) ? ' swap' : hl.c.includes(i) ? ' compare' : '');
  }
  $('algoLabel').textContent = ALGOS[algoKey].name; $('sizeInfo').textContent = cur.length; $('status').textContent = status;
  $('stCmp').textContent = stats.cmp; $('stSwp').textContent = stats.swp; $('stAcc').textContent = stats.acc;
  $('stTime').textContent = (currentElapsed() / 1000).toFixed(2) + ' s';
  $('stepMsg').textContent = (steps.length ? `Step ${pos} of ${steps.length}: ` : '') + lastMsg;
  $('stepArr').textContent = '[' + cur.join(', ') + ']';
  $('startBtn').textContent = status === 'Paused' ? 'Resume' : status === 'Completed' ? 'Run again' : 'Start';
  $('startBtn').disabled = running; $('pauseBtn').disabled = !running;
  $('stepBtn').disabled = running || status === 'Completed'; $('backBtn').disabled = running || pos === 0;
  for (const id of ['newBtn', 'algoSelect', 'typeSelect', 'sizeRange']) $(id).disabled = running;
}

function renderInfo() {
  const a = ALGOS[algoKey];
  $('infoName').textContent = a.name; $('infoDesc').textContent = a.desc;
  $('infoBest').textContent = a.best; $('infoAvg').textContent = a.avg; $('infoWorst').textContent = a.worst;
  $('infoSpace').textContent = a.space; $('infoStable').textContent = a.stable; $('infoInPlace').textContent = a.inPlace;
}

function buildCards() {
  const grid = $('cardGrid');
  for (const k in ALGOS) {
    const a = ALGOS[k], card = document.createElement('div');
    card.className = 'card algo-card';
    card.innerHTML = `<h3>${a.name}</h3><p>${a.desc}</p><table class="info">
      <tr><th>Best</th><td>${a.best}</td></tr><tr><th>Average</th><td>${a.avg}</td></tr><tr><th>Worst</th><td>${a.worst}</td></tr>
      <tr><th>Space</th><td>${a.space}</td></tr><tr><th>Stable</th><td>${a.stable}</td></tr><tr><th>In-place</th><td>${a.inPlace}</td></tr></table>
      <button class="btn primary" type="button">Visualize ${a.name}</button>`;
    card.querySelector('button').onclick = () => { selectAlgo(k); $('visualizer').scrollIntoView(); };
    grid.appendChild(card);
  }
}

// ----- Compare table -----
function renderCompare() {
  let h = '<tr><th>Algorithm</th><th>Best</th><th>Average</th><th>Worst</th><th>Space</th><th>Stable</th><th>In-place</th><th>Comparisons</th><th>Swaps / moves</th><th>Array size</th></tr>';
  for (const k in ALGOS) {
    const a = ALGOS[k], r = results[k];
    h += `<tr><td><b>${a.name}</b></td><td>${a.best}</td><td>${a.avg}</td><td>${a.worst}</td><td>${a.space}</td><td>${a.stable}</td><td>${a.inPlace}</td>` +
         (r ? `<td>${r.cmp}</td><td>${r.mov}</td><td>${r.n}</td>` : '<td>–</td><td>–</td><td>–</td>') + '</tr>';
  }
  $('compareTable').innerHTML = h;
}
// Run every algorithm on the same array without animation and count operations
function measureAll() {
  for (const k in ALGOS) {
    let c = 0, m = 0;
    for (const op of ALGOS[k].run(base.slice())) { if (op.t === 'c') c++; else if (op.t === 's' || op.t === 'w') m++; }
    results[k] = { n: base.length, cmp: c, mov: m };
  }
  renderCompare();
}

// ----- Sound -----
function beep(value) {
  if (!soundOn) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = 200 + value * 8; g.gain.value = 0.04;
    o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.05);
  } catch (e) { soundOn = false; $('soundToggle').checked = false; }
}

// ----- Quiz -----
const QUIZ = [
  { q: 'Which sorting algorithm has a worst case of O(n log n)?', o: ['Bubble Sort', 'Quick Sort', 'Heap Sort', 'Insertion Sort'], a: 2, e: 'Heap Sort and Merge Sort are O(n log n) in every case. Quick Sort can degrade to O(n²).' },
  { q: 'What does Bubble Sort do on each pass?', o: ['Splits the array in half', 'Swaps neighbours that are out of order', 'Builds a heap', 'Picks a random pivot'], a: 1, e: 'It compares adjacent elements and swaps them if they are in the wrong order.' },
  { q: 'Which of these algorithms needs O(n) extra space for arrays?', o: ['Merge Sort', 'Selection Sort', 'Heap Sort', 'Insertion Sort'], a: 0, e: 'Merge Sort copies parts of the array while merging.' },
  { q: 'What does "stable" mean for a sorting algorithm?', o: ['It never crashes', 'It runs in constant time', 'Equal elements keep their original order', 'It uses no extra memory'], a: 2, e: 'A stable sort keeps equal elements in the same relative order.' },
  { q: 'Which algorithm repeatedly selects the smallest remaining element and moves it to the front?', o: ['Merge Sort', 'Selection Sort', 'Quick Sort', 'Heap Sort'], a: 1, e: 'Selection Sort finds the minimum of the unsorted part and swaps it into place.' }
];
let qi = 0, score = 0;
function initQuiz() { qi = 0; score = 0; showQuestion(); }
function showQuestion() {
  const box = $('quizBox');
  if (qi >= QUIZ.length) {
    box.innerHTML = `<h3>Quiz complete</h3><p>Your score: <b>${score} / ${QUIZ.length}</b></p><button class="btn primary" type="button" id="qRestart">Try again</button>`;
    $('qRestart').onclick = initQuiz; return;
  }
  const q = QUIZ[qi];
  box.innerHTML = `<p class="note">Question ${qi + 1} of ${QUIZ.length}</p><h3>${q.q}</h3>` +
    q.o.map((t, i) => `<button class="btn opt" type="button" data-i="${i}">${t}</button>`).join('') + '<p id="qFeedback"></p><div id="qNext"></div>';
  box.querySelectorAll('.opt').forEach(btn => btn.onclick = () => {
    const pick = +btn.dataset.i;
    box.querySelectorAll('.opt').forEach((b, i) => { b.disabled = true; if (i === q.a) b.classList.add('right'); });
    if (pick === q.a) score++; else btn.classList.add('wrong');
    $('qFeedback').textContent = (pick === q.a ? 'Correct! ' : 'Not quite. ') + q.e;
    $('qNext').innerHTML = `<button class="btn primary" type="button" id="qNextBtn">${qi === QUIZ.length - 1 ? 'See score' : 'Next question'}</button>`;
    $('qNextBtn').onclick = () => { qi++; showQuestion(); };
  });
}

init();
