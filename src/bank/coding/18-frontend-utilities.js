// Front end utility tasks asked in JavaScript and TypeScript rounds. TypeScript
// only: these are about the browser and the language, not about algorithms.
const { design } = require('../helpers');

function ts(id, title, level, statement, signature, fn, asks, idea, steps, code, check, complexity, tests, extra = {}) {
  return {
    id, title, level, statement, signature: { typescript: signature }, fn, asks, idea,
    where: { typescript: 'the ' + (fn || 'starter') + ' code, replacing its body.' },
    steps, code: { typescript: code }, check, complexity, tests, ...extra
  };
}

module.exports = [
  ts('js-debounce', 'Implement Debounce', 'medium',
    'Implement debounce(fn, wait): it returns a function that delays calling fn until wait milliseconds have passed since the last call, then calls fn once with the latest arguments. ' +
      'Example: calling the debounced function with 1, 2 and 3 quickly, then waiting, calls fn once with 3.',
    'function debounce<T extends (...args: any[]) => void>(fn: T, wait: number): (...args: Parameters<T>) => void',
    null,
    'Write a debounce helper: many quick calls in a row should cause one call at the end, with the last arguments.',
    'Keep a timer in a closure. Every call clears the pending timer and starts a new one with the latest arguments. Only when the calls stop for the full wait does the timer fire.',
    [
      { what: 'create the function with a timer variable in its closure', say: 'The closure keeps the timer between calls.' },
      { what: 'return a wrapper that clears the old timer and starts a new one calling fn with the latest arguments and this', say: 'Each call pushes the deadline back.' },
      { what: 'that is all; the last call within a burst wins', say: 'I use it for search boxes and resize handlers.' }
    ],
    `//@step
function debounce<T extends (...args: any[]) => void>(fn: T, wait: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
//@step
  return function (this: unknown, ...args: Parameters<T>) {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      fn.apply(this, args);
    }, wait);
  };
//@step
}`,
    'Calling it with 1, 2 and 3 within the wait cancels the first two timers, so after the wait fn runs once, with 3.',
    'O(1) per call. O(1) space.',
    [{ args: [], expected: [[3], [5]] }],
    {
      verify: { typescript: `const calls: number[][] = [];
const d = debounce((x: number) => { calls.push([x]); }, 20);
d(1); d(2); d(3);
setTimeout(() => { d(4); d(5); }, 60);
setTimeout(() => console.log(JSON.stringify(calls)), 140);` },
      run: { typescript: `const log = debounce((x: number) => console.log('called with', x), 100);
log(1);
log(2);
log(3); // after 100ms: called with 3` }
    }),
  ts('js-throttle', 'Implement Throttle', 'medium',
    'Implement throttle(fn, wait): the returned function calls fn at most once every wait milliseconds. The first call runs at once; calls during the wait are dropped, except the last one, which runs when the wait ends. ' +
      'Example: calls with 1, 2, 3 in quick succession run fn with 1 at once and with 3 after the wait.',
    'function throttle<T extends (...args: any[]) => void>(fn: T, wait: number): (...args: Parameters<T>) => void',
    null,
    'Write a throttle helper: it lets a function run at most once per interval, keeping the latest call for the end of the interval.',
    'Run immediately if no interval is active. During an interval, remember only the latest arguments. When the interval ends, run those pending arguments, which starts a new interval.',
    [
      { what: 'create the function with a timer and the pending arguments', say: 'The timer marks the interval during which calls are held back.' },
      { what: 'if no interval is running, call fn now and start one; otherwise store the latest arguments', say: 'Only the most recent held call matters.' },
      { what: 'when the interval ends, run the stored call if there is one, which starts the next interval', say: 'This keeps a steady rate, good for scroll and drag handlers.' }
    ],
    `//@step
function throttle<T extends (...args: any[]) => void>(fn: T, wait: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: Parameters<T> | undefined;
//@step
  const run = (args: Parameters<T>) => {
    fn(...args);
    timer = setTimeout(() => {
      timer = undefined;
      if (pending !== undefined) {
        const next = pending;
        pending = undefined;
        run(next);
      }
    }, wait);
  };
//@step
  return (...args: Parameters<T>) => {
    if (timer === undefined) run(args);
    else pending = args;
  };
}`,
    'Calls with 1, 2 and 3 at once: 1 runs immediately, 2 is replaced by 3, and 3 runs when the wait ends.',
    'O(1) per call. O(1) space.',
    [{ args: [], expected: [1, 3] }],
    {
      verify: { typescript: `const calls: number[] = [];
const t = throttle((x: number) => { calls.push(x); }, 30);
t(1); t(2); t(3);
setTimeout(() => console.log(JSON.stringify(calls)), 120);` },
      run: { typescript: `const t = throttle((x: number) => console.log('ran', x), 100);
t(1); // ran 1
t(2);
t(3); // after 100ms: ran 3` }
    }),
  ts('js-deep-clone', 'Deep Clone an Object', 'medium',
    'Implement deepClone(value) that returns a deep copy of plain objects, arrays, Dates, Maps and Sets, keeping circular references working, without using structuredClone or JSON. ' +
      'Example: cloning { a: [1, { b: 2 }] } gives an equal object whose nested array and object are new instances.',
    'function deepClone<T>(value: T): T',
    'deepClone',
    'Copy a value so that no nested object is shared with the original, including dates, maps, sets and objects that refer to themselves.',
    'Recurse through the value. Primitives are returned as they are. For objects, keep a WeakMap from originals to copies: register the copy before filling it, so a circular reference finds the copy instead of recursing forever.',
    [
      { what: 'create the function with a WeakMap of already-copied objects and a recursive helper', say: 'The map handles cycles and shared references.' },
      { what: 'return primitives directly, handle Date, Map and Set specially, and copy arrays and plain objects key by key', say: 'Each type is rebuilt with copies of its contents.' },
      { what: 'register each copy before recursing into it', say: 'That is what makes circular structures safe.' }
    ],
    `//@step
function deepClone<T>(value: T): T {
  const seen = new WeakMap<object, unknown>();
  const copy = (v: unknown): unknown => {
    if (v === null || typeof v !== 'object') return v;
    if (seen.has(v)) return seen.get(v);
//@step
    if (v instanceof Date) return new Date(v.getTime());
    if (v instanceof Map) {
      const m = new Map();
      seen.set(v, m);
      v.forEach((val, key) => m.set(copy(key), copy(val)));
      return m;
    }
    if (v instanceof Set) {
      const s = new Set();
      seen.set(v, s);
      v.forEach((val) => s.add(copy(val)));
      return s;
    }
//@step
    const out: Record<string, unknown> | unknown[] = Array.isArray(v) ? [] : Object.create(Object.getPrototypeOf(v));
    seen.set(v, out);
    for (const key of Object.keys(v)) (out as Record<string, unknown>)[key] = copy((v as Record<string, unknown>)[key]);
    return out;
  };
  return copy(value) as T;
}`,
    'Cloning { a: [1, { b: 2 }] }: the outer object, the array and the inner object are each new, but the values inside are equal.',
    'O(n) time and space in the number of properties.',
    [{ args: [], expected: [true, false, false, true, true] }],
    {
      verify: { typescript: `const original: any = { a: [1, { b: 2 }], when: new Date(0), tags: new Set(['x']) };
original.self = original;
const c = deepClone(original);
console.log(JSON.stringify([
  JSON.stringify(c.a) === JSON.stringify(original.a),
  c.a === original.a,
  c.a[1] === original.a[1],
  c.self === c,
  c.when.getTime() === 0 && c.tags.has('x')
]));` },
      run: { typescript: `const source = { a: [1, { b: 2 }] };
const copy = deepClone(source);
console.log(copy, copy.a !== source.a); // { a: [ 1, { b: 2 } ] } true` }
    }),
  ts('js-deep-equal', 'Deep Equal', 'medium',
    'Implement deepEqual(a, b) that returns true when two values are structurally equal: same primitives (NaN equal to NaN), arrays with equal items in order, and plain objects with the same keys and equal values. ' +
      'Example: deepEqual({ a: [1, 2] }, { a: [1, 2] }) returns true; deepEqual({ a: 1 }, { a: 1, b: 2 }) returns false.',
    'function deepEqual(a: unknown, b: unknown): boolean',
    'deepEqual',
    'Write a function that says whether two values have exactly the same structure and contents.',
    'If Object.is says they are the same, they are equal, which also handles NaN. Otherwise both must be objects of the same kind: arrays compared item by item, objects compared by having the same set of keys with equal values, recursively.',
    [
      { what: 'create the function and return true when Object.is says the values are the same', say: 'That covers primitives and the same reference.' },
      { what: 'return false unless both are non-null objects of the same array-ness', say: 'An array never equals a plain object.' },
      { what: 'compare key counts, then every key recursively', say: 'Same number of keys and every key equal means equal.' }
    ],
    `//@step
function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
//@step
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
//@step
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}`,
    'With { a: [1, 2] } and { a: [1, 2] }: both have one key, a, and the arrays have equal items in order, so true.',
    'O(n) time in the total number of values. O(d) recursion depth.',
    [
      { args: [{ a: [1, 2] }, { a: [1, 2] }], expected: true },
      { args: [{ a: 1 }, { a: 1, b: 2 }], expected: false },
      { args: [[1, [2, 3]], [1, [2, 4]]], expected: false },
      { args: [{ x: null }, { x: null }], expected: true }
    ]),
  ts('js-flatten-array', 'Flatten a Nested Array', 'easy',
    'Implement flatten(arr, depth = Infinity) that flattens nested arrays up to the given depth, like Array.prototype.flat, without using flat. ' +
      'Example: flatten([1, [2, [3, [4]]]]) returns [1, 2, 3, 4]. Example: flatten([1, [2, [3, [4]]]], 1) returns [1, 2, [3, [4]]].',
    'function flatten(arr: unknown[], depth?: number): unknown[]',
    'flatten',
    'Flatten a nested array to a given depth, like the built-in flat method.',
    'Walk the array; when an item is an array and depth remains, flatten it one level deeper and spread its items in; otherwise push the item as it is.',
    [
      { what: 'create the function with a default depth of Infinity and an output array', say: 'Infinity means flatten everything.' },
      { what: 'for each item, recurse with depth minus one when it is an array and depth is left, else push it', say: 'Depth limits how many levels are opened.' },
      { what: 'return the output', say: 'Linear in the total number of items.' }
    ],
    `//@step
function flatten(arr: unknown[], depth: number = Infinity): unknown[] {
  const out: unknown[] = [];
//@step
  for (const item of arr) {
    if (Array.isArray(item) && depth > 0) out.push(...flatten(item, depth - 1));
    else out.push(item);
  }
//@step
  return out;
}`,
    'With [1, [2, [3, [4]]]] and depth 1: 1 is pushed, the array [2, [3, [4]]] is opened once, giving 2 and [3, [4]]. Result [1, 2, [3, [4]]].',
    'O(n) time in the total number of items. O(d) recursion depth.',
    [{ args: [[1, [2, [3, [4]]]]], expected: [1, 2, 3, 4] }, { args: [[1, [2, [3, [4]]]], 1], expected: [1, 2, [3, [4]]] }, { args: [[]], expected: [] }]),
  ts('js-curry', 'Implement Curry', 'medium',
    'Implement curry(fn) that lets fn be called with its arguments in several groups: curry(sum3)(1)(2)(3), curry(sum3)(1, 2)(3) and curry(sum3)(1)(2, 3) all return the same as sum3(1, 2, 3).',
    'function curry(fn: (...args: any[]) => any): (...args: any[]) => any',
    null,
    'Write curry so a function can take its arguments a few at a time.',
    'Return a function that collects arguments. If it has at least fn.length arguments, call fn; otherwise return another function that remembers what it has and keeps collecting.',
    [
      { what: 'create curry, returning a collector function', say: 'fn.length tells me how many arguments fn expects.' },
      { what: 'when enough arguments have arrived, call fn with them', say: 'Extra calls are not needed once all are here.' },
      { what: 'otherwise return a new collector that joins the old and new arguments', say: 'Closures keep the arguments gathered so far.' }
    ],
    `//@step
function curry(fn: (...args: any[]) => any): (...args: any[]) => any {
  const collect = (...have: any[]): any => {
//@step
    if (have.length >= fn.length) return fn(...have);
//@step
    return (...more: any[]) => collect(...have, ...more);
  };
  return collect;
}`,
    'With sum3: curry(sum3)(1) has one argument, so returns a collector; adding 2 makes two; adding 3 makes three, so sum3(1, 2, 3) runs and gives 6.',
    'O(n) per call for copying arguments.',
    [{ args: [], expected: [6, 6, 6] }],
    {
      verify: { typescript: `const sum3 = (a: number, b: number, c: number) => a + b + c;
const c = curry(sum3);
console.log(JSON.stringify([c(1)(2)(3), c(1, 2)(3), c(1)(2, 3)]));` },
      run: { typescript: `const add = curry((a: number, b: number, c: number) => a + b + c);
console.log(add(1)(2)(3)); // 6
console.log(add(1, 2)(3)); // 6` }
    }),
  ts('js-memoize', 'Implement Memoize', 'easy',
    'Implement memoize(fn) that caches results by arguments, so calling the memoized function again with the same arguments returns the cached result without calling fn. ' +
      'Example: a memoized slowSquare called twice with 4 calls the original once.',
    'function memoize<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R',
    null,
    'Write memoize so repeated calls with the same arguments reuse the earlier result.',
    'Keep a Map from a key built from the arguments to the result. On a call, return the cached result if the key exists; otherwise call fn, store and return. JSON of the arguments works as a key for plain values.',
    [
      { what: 'create memoize with a Map cache', say: 'The cache lives in the closure.' },
      { what: 'build a key from the arguments and return the cached value if present', say: 'Has, not get, so undefined results are cached too.' },
      { what: 'otherwise call fn, store the result and return it', say: 'Each distinct input is computed once.' }
    ],
    `//@step
function memoize<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const cache = new Map<string, R>();
//@step
  return (...args: A): R => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key) as R;
//@step
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}`,
    'Calling the memoized square with 4 computes 16 and caches it; the second call with 4 returns 16 straight from the cache, so the original runs once.',
    'O(k) per call to build the key from k arguments. Space grows with distinct inputs.',
    [{ args: [], expected: [16, 16, 1] }],
    {
      verify: { typescript: `let calls = 0;
const sq = memoize((n: number) => { calls++; return n * n; });
console.log(JSON.stringify([sq(4), sq(4), calls]));` },
      run: { typescript: `const slowSquare = memoize((n: number) => { console.log('computing'); return n * n; });
console.log(slowSquare(4)); // computing, 16
console.log(slowSquare(4)); // 16, from the cache` }
    }),
  ts('js-promise-all', 'Implement Promise.all', 'medium',
    'Implement promiseAll(promises) that behaves like Promise.all: it resolves with an array of results in the original order once all inputs resolve, and rejects as soon as any input rejects. Non-promise values count as resolved. ' +
      'Example: promiseAll([Promise.resolve(1), 2, delay(3)]) resolves to [1, 2, 3].',
    'function promiseAll<T>(values: (T | Promise<T>)[]): Promise<T[]>',
    null,
    'Write your own Promise.all: wait for everything, keep the results in order, and fail fast on the first error.',
    'Return a new promise. Wrap every input in Promise.resolve, and when each settles, store its result at its own index and count it. When the count reaches the length, resolve with the array. Any rejection rejects the whole thing. An empty input resolves at once.',
    [
      { what: 'return a new promise with a results array and a counter', say: 'Results go by index, so order is kept even if they finish out of order.' },
      { what: 'for each input, resolve it, store the value at its index and resolve when all are done; pass rejections straight to reject', say: 'The first rejection wins; later ones are ignored by the promise.' },
      { what: 'resolve immediately for an empty list', say: 'Otherwise it would never settle.' }
    ],
    `//@step
function promiseAll<T>(values: (T | Promise<T>)[]): Promise<T[]> {
  return new Promise<T[]>((resolve, reject) => {
    const results: T[] = new Array(values.length);
    let done = 0;
//@step
    values.forEach((v, i) => {
      Promise.resolve(v).then((result) => {
        results[i] = result;
        done++;
        if (done === values.length) resolve(results);
      }, reject);
    });
//@step
    if (values.length === 0) resolve(results);
  });
}`,
    'With a resolved 1, a plain 2 and a 3 that arrives later: 1 and 2 are stored at once, 3 is stored when its timer fires, and then the array [1, 2, 3] resolves.',
    'O(n) time and space.',
    [{ args: [], expected: ['[1,2,3]', 'boom', '[]'] }],
    {
      verify: { typescript: `const delay = <T>(v: T, ms: number) => new Promise<T>((r) => setTimeout(() => r(v), ms));
(async () => {
  const out: string[] = [];
  out.push(JSON.stringify(await promiseAll([Promise.resolve(1), 2, delay(3, 10)])));
  try { await promiseAll([delay(1, 30), Promise.reject(new Error('boom'))]); } catch (e) { out.push((e as Error).message); }
  out.push(JSON.stringify(await promiseAll([])));
  console.log(JSON.stringify(out));
})();` },
      run: { typescript: `const delay = <T>(v: T, ms: number) => new Promise<T>((r) => setTimeout(() => r(v), ms));
promiseAll([Promise.resolve(1), 2, delay(3, 100)]).then((r) => console.log(r)); // [1, 2, 3]` }
    }),
  ts('js-event-emitter', 'Implement an Event Emitter', 'medium',
    'Implement class EventEmitter with on(event, listener), off(event, listener), once(event, listener) and emit(event, ...args), which calls the listeners for that event in the order they were added and returns how many were called. ' +
      'Example: after on("a", f) and once("a", g), emit("a") returns 2 and a second emit("a") returns 1.',
    'class EventEmitter { on(event: string, listener: (...args: any[]) => void): this; off(event: string, listener: (...args: any[]) => void): this; once(event: string, listener: (...args: any[]) => void): this; emit(event: string, ...args: any[]): number }',
    null,
    'Build a small publish and subscribe class with on, off, once and emit.',
    'Keep a Map from event name to an array of listeners. on adds, off removes, emit calls a copy of the array so listeners that remove themselves do not disturb the loop. once wraps the listener in a function that removes itself before calling it.',
    [
      { what: 'create the class with a Map of listener lists, and on to add a listener', say: 'Each event name has its own ordered list.' },
      { what: 'off removes a listener, matching either the listener itself or the original behind a once wrapper', say: 'That lets off cancel a once listener too.' },
      { what: 'once wraps the listener to remove itself, and emit calls a copy of the list and returns the count', say: 'Copying first keeps the loop safe while listeners change.' }
    ],
    `//@step
type Listener = ((...args: any[]) => void) & { original?: (...args: any[]) => void };

class EventEmitter {
  private listeners = new Map<string, Listener[]>();

  on(event: string, listener: Listener): this {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    (this.listeners.get(event) as Listener[]).push(listener);
    return this;
  }
//@step
  off(event: string, listener: Listener): this {
    const list = this.listeners.get(event);
    if (list) this.listeners.set(event, list.filter((l) => l !== listener && l.original !== listener));
    return this;
  }
//@step
  once(event: string, listener: Listener): this {
    const wrapper: Listener = (...args: any[]) => {
      this.off(event, wrapper);
      listener(...args);
    };
    wrapper.original = listener;
    return this.on(event, wrapper);
  }

  emit(event: string, ...args: any[]): number {
    const list = [...(this.listeners.get(event) ?? [])];
    list.forEach((l) => l(...args));
    return list.length;
  }
}`,
    'After on("a", f) and once("a", g), the first emit calls f and g, and g\'s wrapper removes itself, so it returns 2; the next emit only calls f and returns 1.',
    'O(k) per emit for k listeners. O(total listeners) space.',
    [],
    {
      ...design({
        cls: 'EventEmitter',
        ops: ['EventEmitter', 'emit', 'emit'],
        args: [[], ['a'], ['a']],
        expected: [null, 2, 1]
      }),
      verify: { typescript: `const e = new EventEmitter();
const seen: string[] = [];
const f = (x: string) => seen.push('f' + x);
e.on('a', f);
e.once('a', (x: string) => seen.push('g' + x));
const counts = [e.emit('a', 1), e.emit('a', 2)];
e.off('a', f);
counts.push(e.emit('a', 3));
console.log(JSON.stringify([counts, seen]));` },
      tests: [{ args: [], expected: [[2, 1, 0], ['f1', 'g1', 'f2']] }],
      run: { typescript: `const bus = new EventEmitter();
bus.on('saved', (id: number) => console.log('saved', id));
bus.once('saved', () => console.log('first save only'));
console.log(bus.emit('saved', 7)); // saved 7, first save only, 2
console.log(bus.emit('saved', 8)); // saved 8, 1` }
    }),
  ts('js-get-by-path', 'Get a Nested Value by Path', 'easy',
    'Implement get(obj, path, defaultValue) like lodash get: path is a string such as "a.b[0].c", and it returns the value at that path, or defaultValue if any step is missing. ' +
      'Example: get({ a: { b: [{ c: 3 }] } }, "a.b[0].c") returns 3. Example: get({ a: 1 }, "a.x.y", "none") returns "none".',
    'function get(obj: unknown, path: string, defaultValue?: unknown): unknown',
    'get',
    'Read a deeply nested value safely from a path string, returning a default when anything along the way is missing.',
    'Turn the path into keys by treating brackets as dots and splitting, then walk the object one key at a time. If the current value is null or undefined before the end, return the default.',
    [
      { what: 'create the function and split the path into keys, turning a[0] into a.0', say: 'Brackets and dots end up as the same kind of step.' },
      { what: 'walk the keys, returning the default as soon as the current value is null or undefined', say: 'Optional chaining in a loop.' },
      { what: 'return the final value, or the default if it is undefined', say: 'Linear in the path length.' }
    ],
    `//@step
function get(obj: unknown, path: string, defaultValue?: unknown): unknown {
  const keys = path.replace(/\\[(\\w+)\\]/g, '.$1').split('.').filter(Boolean);
  let current: unknown = obj;
//@step
  for (const key of keys) {
    if (current === null || current === undefined) return defaultValue;
    current = (current as Record<string, unknown>)[key];
  }
//@step
  return current === undefined ? defaultValue : current;
}`,
    'With "a.b[0].c": the keys are a, b, 0 and c, which walk to the object { c: 3 } and then 3.',
    'O(p) time for a path of p keys. O(p) space for the keys.',
    [{ args: [{ a: { b: [{ c: 3 }] } }, 'a.b[0].c'], expected: 3 }, { args: [{ a: 1 }, 'a.x.y', 'none'], expected: 'none' }, { args: [{ a: { b: null } }, 'a.b'], expected: null }]),
  ts('js-group-by', 'Implement groupBy', 'easy',
    'Implement groupBy(items, keyFn) that returns an object mapping each key returned by keyFn to the array of items with that key, in their original order. ' +
      'Example: groupBy([1.2, 1.8, 2.5], Math.floor) returns { "1": [1.2, 1.8], "2": [2.5] }.',
    'function groupBy<T>(items: T[], keyFn: (item: T) => string | number): Record<string, T[]>',
    'groupBy',
    'Group a list into buckets by a key, like grouping orders by status.',
    'Walk the items once, compute each key, and push the item into the array for that key, creating the array the first time.',
    [
      { what: 'create the function with an empty result object', say: 'One pass is enough.' },
      { what: 'for each item, compute its key and push it into that key\'s array, creating it if needed', say: 'Original order is kept inside each group.' },
      { what: 'return the groups', say: 'Linear time.' }
    ],
    `//@step
function groupBy<T>(items: T[], keyFn: (item: T) => string | number): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
//@step
  for (const item of items) {
    const key = String(keyFn(item));
    (groups[key] ??= []).push(item);
  }
//@step
  return groups;
}`,
    'With [1.2, 1.8, 2.5] and Math.floor: 1.2 and 1.8 both have key 1, and 2.5 has key 2.',
    'O(n) time and space.',
    [{ args: [], expected: { 1: [1.2, 1.8], 2: [2.5] } }],
    {
      verify: { typescript: `console.log(JSON.stringify(groupBy([1.2, 1.8, 2.5], Math.floor)));` },
      run: { typescript: `console.log(groupBy([1.2, 1.8, 2.5], Math.floor)); // { '1': [ 1.2, 1.8 ], '2': [ 2.5 ] }` }
    }),
  ts('js-retry-with-backoff', 'Retry a Promise with Backoff', 'medium',
    'Implement retry(task, retries, baseDelay) that calls the async task, and if it rejects, waits and tries again, up to retries extra attempts, doubling the delay each time (baseDelay, 2 x baseDelay, ...). ' +
      'It resolves with the first success or rejects with the last error. Example: a task that fails twice then succeeds resolves after three attempts.',
    'function retry<T>(task: () => Promise<T>, retries: number, baseDelay: number): Promise<T>',
    null,
    'Write a helper that retries a failing async call a few times, waiting longer after each failure.',
    'Loop over attempts. Try the task and return its result on success. On failure, if attempts remain, wait baseDelay times 2 to the attempt number, then try again; otherwise throw the last error.',
    [
      { what: 'create the async function with an attempt loop', say: 'async and await keep the retry loop readable.' },
      { what: 'try the task and return its result; on error, rethrow if out of attempts', say: 'The last error is what the caller sees.' },
      { what: 'otherwise wait an exponentially growing delay before the next attempt', say: 'Backoff stops a struggling service from being hammered.' }
    ],
    `//@step
async function retry<T>(task: () => Promise<T>, retries: number, baseDelay: number): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
//@step
      return await task();
    } catch (error) {
      if (attempt >= retries) throw error;
//@step
      await new Promise((r) => setTimeout(r, baseDelay * 2 ** attempt));
    }
  }
}`,
    'A task that fails twice: attempt 0 fails and waits baseDelay, attempt 1 fails and waits twice that, attempt 2 succeeds and its value is returned.',
    'O(retries) attempts. O(1) extra space.',
    [{ args: [], expected: ['ok after 3', 'still failing'] }],
    {
      verify: { typescript: `(async () => {
  const out: string[] = [];
  let n = 0;
  out.push(await retry(async () => { n++; if (n < 3) throw new Error('fail'); return 'ok after ' + n; }, 3, 5));
  try { await retry(async () => { throw new Error('still failing'); }, 2, 5); } catch (e) { out.push((e as Error).message); }
  console.log(JSON.stringify(out));
})();` },
      run: { typescript: `let calls = 0;
retry(async () => { calls++; if (calls < 3) throw new Error('flaky'); return 'done'; }, 3, 100)
  .then((r) => console.log(r, 'after', calls, 'calls')); // done after 3 calls` }
    })
];
