// Heaps and priority queues. Neither Dart's core library nor TypeScript ships a
// heap, so each solution carries a small binary heap of its own.
const { design } = require('../helpers');

const HEAP = {
  dart: `class MinHeap {
  final _a = <int>[];
  int get length => _a.length;
  int get top => _a[0];
  void push(int v) {
    _a.add(v);
    var i = _a.length - 1;
    while (i > 0 && _a[(i - 1) >> 1] > _a[i]) {
      final p = (i - 1) >> 1;
      final t = _a[p];
      _a[p] = _a[i];
      _a[i] = t;
      i = p;
    }
  }
  int pop() {
    final top = _a[0];
    final last = _a.removeLast();
    if (_a.isNotEmpty) {
      _a[0] = last;
      var i = 0;
      while (true) {
        final l = 2 * i + 1;
        final r = l + 1;
        var m = i;
        if (l < _a.length && _a[l] < _a[m]) m = l;
        if (r < _a.length && _a[r] < _a[m]) m = r;
        if (m == i) break;
        final t = _a[m];
        _a[m] = _a[i];
        _a[i] = t;
        i = m;
      }
    }
    return top;
  }
}`,
  typescript: `class MinHeap {
  private a: number[] = [];
  get length(): number { return this.a.length; }
  get top(): number { return this.a[0]; }
  push(v: number): void {
    const a = this.a;
    a.push(v);
    let i = a.length - 1;
    while (i > 0 && a[(i - 1) >> 1] > a[i]) {
      const p = (i - 1) >> 1;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop(): number {
    const a = this.a;
    const top = a[0];
    const last = a.pop() as number;
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      while (true) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l] < a[m]) m = l;
        if (r < a.length && a[r] < a[m]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}`
};

module.exports = [
  {
    id: 'kth-largest-element',
    title: 'Kth Largest Element in an Array',
    level: 'medium',
    statement: 'Given an integer array nums and an integer k, return the kth largest element in sorted order (not the kth distinct). Try to do better than sorting. ' +
      'Example: nums = [3,2,1,5,6,4], k = 2 returns 5. Example: nums = [3,2,3,1,2,4,5,5,6], k = 4 returns 4.',
    signature: { dart: 'class Solution { int findKthLargest(List<int> nums, int k) }', typescript: 'function findKthLargest(nums: number[], k: number): number' },
    fn: 'findKthLargest',
    asks: 'Find the value that would be in position k if the list were sorted from largest down: in [3, 2, 1, 5, 6, 4], the 2nd largest is 5.',
    idea: 'Keep a min-heap of the k largest values seen so far. Push each number, and if the heap grows past k, pop the smallest. At the end the heap\'s top is the kth largest.',
    where: { dart: 'the Solution class and a MinHeap class below it, replacing the starter code.', typescript: 'the findKthLargest function and a MinHeap class, replacing the starter code.' },
    steps: [
      { what: 'add a small MinHeap class with push, pop and top', say: 'There is no built-in heap, so I write a short binary heap.' },
      { what: 'push each number and pop when the heap holds more than k values', say: 'The heap keeps only the k largest, with the smallest of them on top.' },
      { what: 'return the top of the heap', say: 'n log k time, which beats sorting when k is small.' }
    ],
    code: {
      dart: `//@step
${HEAP.dart}
//@step
class Solution {
  int findKthLargest(List<int> nums, int k) {
    final heap = MinHeap();
    for (final n in nums) {
      heap.push(n);
      if (heap.length > k) heap.pop();
    }
//@step
    return heap.top;
  }
}`,
      typescript: `//@step
${HEAP.typescript}
//@step
function findKthLargest(nums: number[], k: number): number {
  const heap = new MinHeap();
  for (const n of nums) {
    heap.push(n);
    if (heap.length > k) heap.pop();
  }
//@step
  return heap.top;
}`
    },
    check: 'With [3, 2, 1, 5, 6, 4] and k = 2: the heap keeps the two largest seen: after all numbers it holds 5 and 6, and its top, the smaller, is 5.',
    complexity: 'O(n log k) time. O(k) space for the heap.',
    tests: [
      { args: [[3, 2, 1, 5, 6, 4], 2], expected: 5 },
      { args: [[3, 2, 3, 1, 2, 4, 5, 5, 6], 4], expected: 4 },
      { args: [[1], 1], expected: 1 }
    ]
  },
  {
    id: 'last-stone-weight',
    title: 'Last Stone Weight',
    level: 'easy',
    statement: 'Given an array stones of weights, repeatedly smash the two heaviest stones together: if they are equal both are destroyed, otherwise the lighter is destroyed and the heavier loses that much weight. ' +
      'Return the weight of the last stone, or 0 if none is left. Example: stones = [2,7,4,1,8,1] returns 1.',
    signature: { dart: 'class Solution { int lastStoneWeight(List<int> stones) }', typescript: 'function lastStoneWeight(stones: number[]): number' },
    fn: 'lastStoneWeight',
    asks: 'Keep smashing the two heaviest stones and report what is left at the end.',
    idea: 'A max-heap gives the two heaviest stones quickly. Our heap is a min-heap, so store negative weights. Pop two, push back the difference if it is not zero, and repeat.',
    where: { dart: 'the Solution class and a MinHeap class below it, replacing the starter code.', typescript: 'the lastStoneWeight function and a MinHeap class, replacing the starter code.' },
    steps: [
      { what: 'add the MinHeap class', say: 'I store negatives so the min-heap acts as a max-heap.' },
      { what: 'push every stone as a negative, then while two remain, pop both and push back the difference if any', say: 'Each round takes the two heaviest.' },
      { what: 'return the last weight, or 0', say: 'n log n time.' }
    ],
    code: {
      dart: `//@step
${HEAP.dart}
//@step
class Solution {
  int lastStoneWeight(List<int> stones) {
    final heap = MinHeap();
    for (final s in stones) {
      heap.push(-s);
    }
    while (heap.length > 1) {
      final a = -heap.pop();
      final b = -heap.pop();
      if (a != b) heap.push(-(a - b));
    }
//@step
    return heap.length == 0 ? 0 : -heap.top;
  }
}`,
      typescript: `//@step
${HEAP.typescript}
//@step
function lastStoneWeight(stones: number[]): number {
  const heap = new MinHeap();
  for (const s of stones) heap.push(-s);
  while (heap.length > 1) {
    const a = -heap.pop();
    const b = -heap.pop();
    if (a !== b) heap.push(-(a - b));
  }
//@step
  return heap.length === 0 ? 0 : -heap.top;
}`
    },
    check: 'With [2, 7, 4, 1, 8, 1]: 8 and 7 leave 1; 4 and 2 leave 2; 2 and 1 leave 1; 1 and 1 destroy each other; one stone of weight 1 is left.',
    complexity: 'O(n log n) time. O(n) space.',
    tests: [
      { args: [[2, 7, 4, 1, 8, 1]], expected: 1 },
      { args: [[1]], expected: 1 },
      { args: [[2, 2]], expected: 0 }
    ]
  },
  {
    id: 'k-closest-points',
    title: 'K Closest Points to Origin',
    level: 'medium',
    statement: 'Given an array of points [x, y] on a plane and an integer k, return the k points closest to the origin (0, 0), by Euclidean distance, in any order. ' +
      'Example: points = [[1,3],[-2,2]], k = 1 returns [[-2,2]]. Example: points = [[3,3],[5,-1],[-2,4]], k = 2 returns [[3,3],[-2,4]].',
    signature: { dart: 'class Solution { List<List<int>> kClosest(List<List<int>> points, int k) }', typescript: 'function kClosest(points: number[][], k: number): number[][]' },
    fn: 'kClosest',
    compare: 'sorted',
    asks: 'Return the k points nearest to the centre.',
    idea: 'Compare squared distances, x squared plus y squared, so no square roots are needed. Sort the points by squared distance and take the first k. ' +
      'In an interview I would mention that a max-heap of size k gives n log k, or quickselect gives linear time on average.',
    where: { dart: 'the Solution class, replacing the kClosest method.', typescript: 'the kClosest function, replacing its body.' },
    steps: [
      { what: 'open the method with a helper for squared distance', say: 'Squared distance keeps the same order and avoids square roots.' },
      { what: 'sort a copy of the points by that distance', say: 'Sorting is simple and clear here.' },
      { what: 'return the first k points', say: 'n log n time; a heap would make it n log k.' }
    ],
    code: {
      dart: `//@step
class Solution {
  List<List<int>> kClosest(List<List<int>> points, int k) {
    int dist(List<int> p) => p[0] * p[0] + p[1] * p[1];
//@step
    final sorted = [...points]..sort((a, b) => dist(a).compareTo(dist(b)));
//@step
    return sorted.sublist(0, k);
  }
}`,
      typescript: `//@step
function kClosest(points: number[][], k: number): number[][] {
  const dist = (p: number[]) => p[0] * p[0] + p[1] * p[1];
//@step
  const sorted = [...points].sort((a, b) => dist(a) - dist(b));
//@step
  return sorted.slice(0, k);
}`
    },
    check: 'With [[3, 3], [5, -1], [-2, 4]] and k = 2: the squared distances are 18, 26 and 20, so the two closest are [3, 3] and [-2, 4].',
    complexity: 'O(n log n) time for sorting. O(n) space for the copy.',
    tests: [
      { args: [[[1, 3], [-2, 2]], 1], expected: [[-2, 2]] },
      { args: [[[3, 3], [5, -1], [-2, 4]], 2], expected: [[3, 3], [-2, 4]] }
    ]
  },
  {
    id: 'find-median-from-data-stream',
    title: 'Find Median from Data Stream',
    level: 'hard',
    statement: 'Design a structure MedianFinder that receives numbers one at a time: void addNum(int num) adds a number and double findMedian() returns the median of all numbers so far. ' +
      'Example: addNum(1), addNum(2), findMedian() returns 1.5, addNum(3), findMedian() returns 2.0.',
    signature: { dart: 'class MedianFinder { void addNum(int num); double findMedian() }', typescript: 'class MedianFinder { addNum(num: number): void; findMedian(): number }' },
    asks: 'Keep a running median of a stream of numbers, with fast inserts.',
    idea: 'Keep two heaps: a max-heap with the smaller half and a min-heap with the larger half, balanced so the small half has the same size or one more. ' +
      'The median is then the top of the small half, or the average of both tops. Our min-heap stores negatives to act as the max-heap.',
    where: { dart: 'the MedianFinder class and a MinHeap class below it, replacing the starter code.', typescript: 'the MedianFinder class and a MinHeap class, replacing the starter code.' },
    steps: [
      { what: 'add the MinHeap class and create MedianFinder with a low half and a high half', say: 'Low holds the smaller half as negatives, so its top is the largest of them.' },
      { what: 'addNum pushes into low, moves low\'s largest into high, and rebalances if high gets bigger', say: 'That keeps every low value at most every high value, and the sizes balanced.' },
      { what: 'findMedian reads the top of low, or averages both tops when the sizes are equal', say: 'Insert is log n and the median is constant time.' }
    ],
    code: {
      dart: `//@step
${HEAP.dart}
//@step
class MedianFinder {
  final _low = MinHeap();
  final _high = MinHeap();

  MedianFinder();

  void addNum(int num) {
    _low.push(-num);
    _high.push(-_low.pop());
    if (_high.length > _low.length) _low.push(-_high.pop());
  }
//@step
  double findMedian() {
    if (_low.length > _high.length) return (-_low.top).toDouble();
    return (-_low.top + _high.top) / 2;
  }
}`,
      typescript: `//@step
${HEAP.typescript}
//@step
class MedianFinder {
  private low = new MinHeap();
  private high = new MinHeap();

  addNum(num: number): void {
    this.low.push(-num);
    this.high.push(-this.low.pop());
    if (this.high.length > this.low.length) this.low.push(-this.high.pop());
  }
//@step
  findMedian(): number {
    if (this.low.length > this.high.length) return -this.low.top;
    return (-this.low.top + this.high.top) / 2;
  }
}`
    },
    check: 'Adding 1 and 2 leaves 1 in the low half and 2 in the high half, so the median is 1.5. Adding 3 moves things so the low half holds 1 and 2 and the high half 3, so the median is 2.',
    complexity: 'O(log n) per addNum, O(1) per findMedian. O(n) space.',
    ...design({
      cls: 'MedianFinder',
      ops: ['MedianFinder', 'addNum', 'addNum', 'findMedian', 'addNum', 'findMedian'],
      args: [[], [1], [2], [], [3], []],
      expected: [null, null, null, 1.5, null, 2]
    })
  },
  {
    id: 'task-scheduler',
    title: 'Task Scheduler',
    level: 'medium',
    statement: 'Given an array of CPU tasks, each a letter from A to Z, and a cooling time n, each unit of time the CPU does one task or stays idle, and two identical tasks must be at least n units apart. ' +
      'Return the minimum number of units needed to finish all tasks. Example: tasks = ["A","A","A","B","B","B"], n = 2 returns 8. Example: same tasks, n = 0 returns 6.',
    signature: { dart: 'class Solution { int leastInterval(List<String> tasks, int n) }', typescript: 'function leastInterval(tasks: string[], n: number): number' },
    fn: 'leastInterval',
    asks: 'Schedule tasks with a cool-down between repeats of the same task, using as little total time as possible.',
    idea: 'The most frequent task decides the frame: if it appears maxCount times, it needs maxCount minus 1 gaps of size n plus 1 between its runs, plus one final slot for each task that ties for that maximum. ' +
      'If there are so many different tasks that no idle time is needed, the answer is just the number of tasks. Take the larger of the two.',
    where: { dart: 'the Solution class, replacing the leastInterval method.', typescript: 'the leastInterval function, replacing its body.' },
    steps: [
      { what: 'open the method and count each task', say: 'Only the counts matter, not which letter is which.' },
      { what: 'find the highest count and how many tasks share it', say: 'The most frequent task forces the gaps.' },
      { what: 'return the larger of the frame size and the number of tasks', say: 'Linear time, constant space.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int leastInterval(List<String> tasks, int n) {
    final counts = List<int>.filled(26, 0);
    for (final t in tasks) {
      counts[t.codeUnitAt(0) - 65]++;
    }
//@step
    final top = counts.reduce((a, b) => a > b ? a : b);
    final ties = counts.where((c) => c == top).length;
//@step
    final frame = (top - 1) * (n + 1) + ties;
    return frame > tasks.length ? frame : tasks.length;
  }
}`,
      typescript: `//@step
function leastInterval(tasks: string[], n: number): number {
  const counts: number[] = new Array(26).fill(0);
  for (const t of tasks) counts[t.charCodeAt(0) - 65]++;
//@step
  const top = Math.max(...counts);
  const ties = counts.filter((c) => c === top).length;
//@step
  return Math.max((top - 1) * (n + 1) + ties, tasks.length);
}`
    },
    check: 'With three As, three Bs and n = 2: the top count is 3 and two tasks share it, so the frame is 2 times 3 plus 2, which is 8, like A B idle A B idle A B.',
    complexity: 'O(n) time in the number of tasks. O(1) space.',
    tests: [
      { args: [['A', 'A', 'A', 'B', 'B', 'B'], 2], expected: 8 },
      { args: [['A', 'A', 'A', 'B', 'B', 'B'], 0], expected: 6 },
      { args: [['A', 'A', 'A', 'A', 'A', 'A', 'B', 'C', 'D', 'E', 'F', 'G'], 2], expected: 16 }
    ]
  },
  {
    id: 'kth-largest-in-stream',
    title: 'Kth Largest Element in a Stream',
    level: 'easy',
    statement: 'Design a class KthLargest that finds the kth largest element in a stream. KthLargest(int k, List<int> nums) initialises it, and int add(int val) adds a value and returns the current kth largest. ' +
      'Example: KthLargest(3, [4,5,8,2]); add(3) returns 4, add(5) returns 5, add(10) returns 5, add(9) returns 8, add(4) returns 8.',
    signature: { dart: 'class KthLargest { KthLargest(int k, List<int> nums); int add(int val) }', typescript: 'class KthLargest { constructor(k: number, nums: number[]); add(val: number): number }' },
    asks: 'Keep answering "what is the kth largest so far" as numbers keep arriving.',
    idea: 'Keep a min-heap of the k largest values. Adding a value pushes it and pops the smallest if the heap grows past k; the top is then the kth largest.',
    where: { dart: 'the KthLargest class and a MinHeap class below it, replacing the starter code.', typescript: 'the KthLargest class and a MinHeap class, replacing the starter code.' },
    steps: [
      { what: 'add the MinHeap class', say: 'The heap holds only the k largest values.' },
      { what: 'create KthLargest by adding every starting number', say: 'Construction reuses the same add logic.' },
      { what: 'add pushes the value, trims the heap to k, and returns the top', say: 'Each add is log k.' }
    ],
    code: {
      dart: `//@step
${HEAP.dart}
//@step
class KthLargest {
  final int k;
  final _heap = MinHeap();

  KthLargest(this.k, List<int> nums) {
    for (final n in nums) {
      add(n);
    }
  }
//@step
  int add(int val) {
    _heap.push(val);
    if (_heap.length > k) _heap.pop();
    return _heap.top;
  }
}`,
      typescript: `//@step
${HEAP.typescript}
//@step
class KthLargest {
  private k: number;
  private heap = new MinHeap();

  constructor(k: number, nums: number[]) {
    this.k = k;
    for (const n of nums) this.add(n);
  }
//@step
  add(val: number): number {
    this.heap.push(val);
    if (this.heap.length > this.k) this.heap.pop();
    return this.heap.top;
  }
}`
    },
    check: 'With k = 3 and [4, 5, 8, 2], the heap keeps 4, 5, 8. Adding 3 is dropped, top 4. Adding 5 keeps 5, 5, 8, top 5. Adding 10 gives 5, 8, 10, top 5. Adding 9 gives 8, 9, 10, top 8.',
    complexity: 'O(log k) per add. O(k) space.',
    ...design({
      cls: 'KthLargest',
      ops: ['KthLargest', 'add', 'add', 'add', 'add', 'add'],
      args: [[3, [4, 5, 8, 2]], [3], [5], [10], [9], [4]],
      expected: [null, 4, 5, 5, 8, 8]
    })
  }
];
