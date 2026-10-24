/* =====================================================================
   algorithms.js – the REAL sorting algorithms (no built-in sort()).
   Each algorithm sorts a COPY of the array and records every operation:
     {t:'c', i, j, m}  compare two positions
     {t:'s', i, j, m}  swap two positions
     {t:'w', i, v, m}  write value v at position i (used by Merge Sort)
     {t:'d', i}        position i is now in its final sorted place
   (m = short explanation shown in learning mode)
   The UI later replays these operations as an animation.
   ===================================================================== */

// Helper that records operations while the algorithm modifies array a
function recorder(a) {
  const ops = [];
  return {
    ops,
    cmp(i, j) {            // returns a[i] - a[j]
      ops.push({ t: 'c', i, j, m: `Compare ${a[i]} (position ${i}) with ${a[j]} (position ${j}).` });
      return a[i] - a[j];
    },
    swap(i, j) {
      ops.push({ t: 's', i, j, m: `Swap ${a[i]} and ${a[j]} (positions ${i} and ${j}).` });
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    },
    write(i, v, m) {
      ops.push({ t: 'w', i, v, m: m || `Write ${v} into position ${i}.` });
      a[i] = v;
    },
    done(i) { ops.push({ t: 'd', i }); }
  };
}

function bubbleSort(a) {
  const r = recorder(a), n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - i - 1; j++) {
      if (r.cmp(j, j + 1) > 0) { r.swap(j, j + 1); swapped = true; }
    }
    r.done(n - i - 1);                       // largest of this pass is in place
    if (!swapped) {                          // early exit: no swaps => already sorted
      for (let k = 0; k < n - i - 1; k++) r.done(k);
      break;
    }
  }
  r.done(0);
  return r.ops;
}

function selectionSort(a) {
  const r = recorder(a), n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let min = i;
    for (let j = i + 1; j < n; j++) if (r.cmp(j, min) < 0) min = j;
    if (min !== i) r.swap(i, min);
    r.done(i);
  }
  r.done(n - 1);
  return r.ops;
}

// Insertion sort implemented with adjacent swaps (the element "moves left")
function insertionSort(a) {
  const r = recorder(a), n = a.length;
  for (let i = 1; i < n; i++) {
    let j = i;
    while (j > 0) {
      if (r.cmp(j - 1, j) > 0) { r.swap(j - 1, j); j--; }
      else break;
    }
  }
  return r.ops;
}

function mergeSort(a) {
  const r = recorder(a), n = a.length;
  function sort(lo, hi) {
    if (lo >= hi) return;
    const mid = (lo + hi) >> 1;
    sort(lo, mid); sort(mid + 1, hi); merge(lo, mid, hi);
  }
  function merge(lo, mid, hi) {
    const tmp = a.slice(lo, hi + 1);         // O(n) auxiliary space
    const isLast = lo === 0 && hi === n - 1; // final merge produces final positions
    let i = lo, j = mid + 1, k = lo;
    const put = v => { r.write(k, v); if (isLast) r.done(k); k++; };
    while (i <= mid && j <= hi) {
      r.ops.push({ t: 'c', i, j, m: `Merge: compare ${tmp[i - lo]} (left half) with ${tmp[j - lo]} (right half).` });
      if (tmp[i - lo] <= tmp[j - lo]) put(tmp[(i++) - lo]);   // <= keeps it stable
      else put(tmp[(j++) - lo]);
    }
    while (i <= mid) put(tmp[(i++) - lo]);
    while (j <= hi) put(tmp[(j++) - lo]);
  }
  sort(0, n - 1);
  return r.ops;
}

// Quick sort with Lomuto partition (last element is the pivot)
function quickSort(a) {
  const r = recorder(a);
  function sort(lo, hi) {
    if (lo > hi) return;
    if (lo === hi) { r.done(lo); return; }
    let i = lo;
    for (let j = lo; j < hi; j++) {
      if (r.cmp(j, hi) < 0) { if (i !== j) r.swap(i, j); i++; }   // a[hi] is the pivot
    }
    if (i !== hi) r.swap(i, hi);             // put pivot in its final place
    r.done(i);
    sort(lo, i - 1); sort(i + 1, hi);
  }
  sort(0, a.length - 1);
  return r.ops;
}

function heapSort(a) {
  const r = recorder(a), n = a.length;
  function siftDown(size, i) {               // iterative => O(1) extra space
    while (true) {
      let largest = i; const l = 2 * i + 1, rt = 2 * i + 2;
      if (l < size && r.cmp(l, largest) > 0) largest = l;
      if (rt < size && r.cmp(rt, largest) > 0) largest = rt;
      if (largest === i) return;
      r.swap(i, largest); i = largest;
    }
  }
  for (let i = (n >> 1) - 1; i >= 0; i--) siftDown(n, i);   // build max-heap
  for (let end = n - 1; end > 0; end--) {
    r.swap(0, end); r.done(end);             // move current max to the end
    siftDown(end, 0);
  }
  r.done(0);
  return r.ops;
}

// Algorithm descriptions + complexity table (matches the implementations above)
const ALGOS = {
  bubble:    { name: 'Bubble Sort',    run: bubbleSort,    best: 'O(n) with early exit', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: 'Yes', inPlace: 'Yes',
    desc: 'Repeatedly compares neighbouring elements and swaps them if they are in the wrong order. After each pass the largest remaining element "bubbles" to the end.' },
  selection: { name: 'Selection Sort', run: selectionSort, best: 'O(n²)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: 'No', inPlace: 'Yes',
    desc: 'Finds the smallest element in the unsorted part and swaps it to the front. Repeats until the whole array is sorted.' },
  insertion: { name: 'Insertion Sort', run: insertionSort, best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: 'Yes', inPlace: 'Yes',
    desc: 'Takes one element at a time and moves it left until it sits in the right place, like sorting playing cards in your hand.' },
  merge:     { name: 'Merge Sort',     run: mergeSort,     best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)', space: 'O(n) for arrays', stable: 'Yes', inPlace: 'No',
    desc: 'Divide and conquer: splits the array into halves, sorts each half, then merges the two sorted halves into one sorted array.' },
  quick:     { name: 'Quick Sort',     run: quickSort,     best: 'O(n log n) expected', avg: 'O(n log n) expected', worst: 'O(n²)', space: 'O(log n) expected recursion stack', stable: 'Usually no', inPlace: 'Yes',
    desc: 'Picks a pivot (the last element here), moves smaller elements before it and larger after it, then sorts both sides recursively.' },
  heap:      { name: 'Heap Sort',      run: heapSort,      best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)', space: 'O(1) (iterative version)', stable: 'No', inPlace: 'Yes',
    desc: 'Builds a max-heap, then repeatedly swaps the largest element (the root) to the end and restores the heap on the remaining elements.' }
};

// Array generators (values 6..100 so bars are always visible)
function makeArray(n, type) {
  const rnd = () => Math.floor(Math.random() * 95) + 6;
  const ramp = i => Math.round(6 + i * (94 / Math.max(1, n - 1)));
  let a;
  if (type === 'reversed') a = Array.from({ length: n }, (_, i) => ramp(n - 1 - i));
  else if (type === 'nearly') {
    a = Array.from({ length: n }, (_, i) => ramp(i));
    for (let k = 0; k < Math.max(1, Math.floor(n / 10)); k++) {
      const i = Math.floor(Math.random() * n), j = Math.floor(Math.random() * n);
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
  } else if (type === 'duplicates') {
    const pool = [20, 40, 60, 80, 100];
    a = Array.from({ length: n }, () => pool[Math.floor(Math.random() * pool.length)]);
  } else a = Array.from({ length: n }, rnd);
  return a;
}

if (typeof module !== 'undefined') module.exports = { ALGOS, makeArray };
