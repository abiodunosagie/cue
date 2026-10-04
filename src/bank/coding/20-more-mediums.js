// More frequently asked medium problems.
const { design } = require('../helpers');

function problem(id, title, level, statement, sig, fn, asks, idea, steps, code, check, complexity, tests, extra = {}) {
  return {
    id, title, level, statement, signature: sig, fn, asks, idea,
    where: { dart: 'the Solution class, replacing the ' + fn + ' method.', typescript: 'the ' + fn + ' function, replacing its body.' },
    steps, code, check, complexity, tests, ...extra
  };
}

module.exports = [
  problem('search-insert-position', 'Search Insert Position', 'easy',
    'Given a sorted array of distinct integers nums and a target, return the index if the target is found, otherwise the index where it would be inserted to keep the order, in O(log n). Example: nums = [1,3,5,6], target = 5 returns 2; target = 2 returns 1; target = 7 returns 4.',
    { dart: 'class Solution { int searchInsert(List<int> nums, int target) }', typescript: 'function searchInsert(nums: number[], target: number): number' },
    'searchInsert',
    'Find where the target is, or where it should go, in a sorted list.',
    'Binary search for the first position whose value is at least the target. That is both the index of the target if present and the insert position if not.',
    [
      { what: 'open the method with low at 0 and high at the length', say: 'The answer can be the length itself, after the last element.' },
      { what: 'move low past the middle when the middle is smaller than the target, else bring high to the middle', say: 'This finds the first value not smaller than the target.' },
      { what: 'return low', say: 'log n steps.' }
    ],
    {
      dart: `//@step
class Solution {
  int searchInsert(List<int> nums, int target) {
    var low = 0;
    var high = nums.length;
//@step
    while (low < high) {
      final mid = (low + high) ~/ 2;
      if (nums[mid] < target) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
//@step
    return low;
  }
}`,
      typescript: `//@step
function searchInsert(nums: number[], target: number): number {
  let low = 0;
  let high = nums.length;
//@step
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (nums[mid] < target) low = mid + 1;
    else high = mid;
  }
//@step
  return low;
}`
    },
    'With [1, 3, 5, 6] and 2: the middle 5 is not smaller, so high moves to 2; the middle 3 is not smaller, so high moves to 1; the middle 1 is smaller, so low becomes 1. Answer 1.',
    'O(log n) time. O(1) space.',
    [{ args: [[1, 3, 5, 6], 5], expected: 2 }, { args: [[1, 3, 5, 6], 2], expected: 1 }, { args: [[1, 3, 5, 6], 7], expected: 4 }]),
  problem('decode-string', 'Decode String', 'medium',
    'Given an encoded string where k[encoded] means encoded repeated k times (k is a positive integer, brackets can nest), return the decoded string. Example: s = "3[a]2[bc]" returns "aaabcbc". Example: s = "3[a2[c]]" returns "accaccacc".',
    { dart: 'class Solution { String decodeString(String s) }', typescript: 'function decodeString(s: string): string' },
    'decodeString',
    'Expand a compressed string where a number before brackets repeats what is inside: "3[a2[c]]" becomes "accaccacc".',
    'Use a stack. On an opening bracket, push the text built so far and the repeat count, then start fresh. On a closing bracket, pop them and append the current text repeated count times to the saved text. Digits build the count; letters extend the current text.',
    [
      { what: 'open the method with a stack, the current text and the current number', say: 'The stack saves the outer context at each bracket.' },
      { what: 'digits build the count, an opening bracket pushes and resets, a closing bracket pops and repeats, letters append', say: 'Nested brackets are handled naturally by the stack.' },
      { what: 'return the current text', say: 'Linear in the size of the output.' }
    ],
    {
      dart: `//@step
class Solution {
  String decodeString(String s) {
    final counts = <int>[];
    final texts = <String>[];
    var current = '';
    var number = 0;
//@step
    for (final c in s.split('')) {
      final d = c.codeUnitAt(0) - 48;
      if (d >= 0 && d <= 9) {
        number = number * 10 + d;
      } else if (c == '[') {
        counts.add(number);
        texts.add(current);
        number = 0;
        current = '';
      } else if (c == ']') {
        current = texts.removeLast() + current * counts.removeLast();
      } else {
        current += c;
      }
    }
//@step
    return current;
  }
}`,
      typescript: `//@step
function decodeString(s: string): string {
  const counts: number[] = [];
  const texts: string[] = [];
  let current = '';
  let number = 0;
//@step
  for (const c of s) {
    if (c >= '0' && c <= '9') number = number * 10 + Number(c);
    else if (c === '[') {
      counts.push(number);
      texts.push(current);
      number = 0;
      current = '';
    } else if (c === ']') {
      current = (texts.pop() as string) + current.repeat(counts.pop() as number);
    } else {
      current += c;
    }
  }
//@step
  return current;
}`
    },
    'With "3[a2[c]]": at the inner closing bracket, "c" repeated 2 times joins "a" to make "acc"; at the outer one, "acc" repeated 3 times gives "accaccacc".',
    'O(output length) time and space.',
    [{ args: ['3[a]2[bc]'], expected: 'aaabcbc' }, { args: ['3[a2[c]]'], expected: 'accaccacc' }, { args: ['2[abc]3[cd]ef'], expected: 'abcabccdcdcdef' }, { args: ['10[x]'], expected: 'xxxxxxxxxx' }]),
  problem('asteroid-collision', 'Asteroid Collision', 'medium',
    'Given an array asteroids where the absolute value is the size and the sign is the direction (positive right, negative left), all moving at the same speed, return the state after all collisions. When two meet, the smaller explodes; equal sizes both explode. ' +
      'Example: asteroids = [5,10,-5] returns [5,10]. Example: [8,-8] returns []. Example: [10,2,-5] returns [10].',
    { dart: 'class Solution { List<int> asteroidCollision(List<int> asteroids) }', typescript: 'function asteroidCollision(asteroids: number[]): number[]' },
    'asteroidCollision',
    'Work out which asteroids survive when right-moving and left-moving ones crash into each other.',
    'Use a stack of survivors. A left-moving asteroid collides with right-moving ones on top of the stack: smaller ones on top explode and are popped; an equal one explodes together with it; a bigger one destroys it. If nothing stops it, it survives.',
    [
      { what: 'open the method with a stack of survivors', say: 'Only a left-mover meeting a right-mover on the stack can collide.' },
      { what: 'for each asteroid, while it moves left and the top moves right, resolve the collision', say: 'It keeps destroying smaller right-movers until it is stopped.' },
      { what: 'push it if it survived, then return the stack', say: 'Each asteroid is pushed and popped at most once.' }
    ],
    {
      dart: `//@step
class Solution {
  List<int> asteroidCollision(List<int> asteroids) {
    final stack = <int>[];
//@step
    for (final a in asteroids) {
      var alive = true;
      while (alive && a < 0 && stack.isNotEmpty && stack.last > 0) {
        if (stack.last < -a) {
          stack.removeLast();
        } else {
          if (stack.last == -a) stack.removeLast();
          alive = false;
        }
      }
      if (alive) stack.add(a);
    }
//@step
    return stack;
  }
}`,
      typescript: `//@step
function asteroidCollision(asteroids: number[]): number[] {
  const stack: number[] = [];
//@step
  for (const a of asteroids) {
    let alive = true;
    while (alive && a < 0 && stack.length > 0 && stack[stack.length - 1] > 0) {
      const top = stack[stack.length - 1];
      if (top < -a) stack.pop();
      else {
        if (top === -a) stack.pop();
        alive = false;
      }
    }
    if (alive) stack.push(a);
  }
//@step
  return stack;
}`
    },
    'With [10, 2, -5]: 10 and 2 are pushed; -5 destroys 2, then meets 10, which is bigger, so -5 explodes. Result [10].',
    'O(n) time. O(n) space.',
    [{ args: [[5, 10, -5]], expected: [5, 10] }, { args: [[8, -8]], expected: [] }, { args: [[10, 2, -5]], expected: [10] }, { args: [[-2, -1, 1, 2]], expected: [-2, -1, 1, 2] }]),
  {
    id: 'online-stock-span',
    title: 'Online Stock Span',
    level: 'medium',
    statement: 'Design StockSpanner with int next(int price), which returns the span of today\'s price: the number of consecutive days, up to and including today, on which the price was at most today\'s price. ' +
      'Example: next(100), next(80), next(60), next(70), next(60), next(75), next(85) return 1, 1, 1, 2, 1, 4, 6.',
    signature: { dart: 'class StockSpanner { int next(int price) }', typescript: 'class StockSpanner { next(price: number): number }' },
    asks: 'For each new daily price, say how many days in a row, ending today, were at or below today\'s price.',
    idea: 'Keep a stack of (price, span) pairs with decreasing prices. A new price absorbs every pair on top that is not higher, adding their spans to its own, then is pushed. Absorbed days can never limit a future span on their own.',
    where: { dart: 'the StockSpanner class, replacing the starter class.', typescript: 'the StockSpanner class, replacing the starter class.' },
    steps: [
      { what: 'create the class with a stack of prices and spans', say: 'The stack holds only prices that could still block a future span.' },
      { what: 'next starts with span 1 and pops every lower or equal price, adding its span', say: 'Their days all count towards today\'s span.' },
      { what: 'push the price with its span and return the span', say: 'Amortised constant time per call.' }
    ],
    code: {
      dart: `//@step
class StockSpanner {
  final _prices = <int>[];
  final _spans = <int>[];

  StockSpanner();
//@step
  int next(int price) {
    var span = 1;
    while (_prices.isNotEmpty && _prices.last <= price) {
      _prices.removeLast();
      span += _spans.removeLast();
    }
//@step
    _prices.add(price);
    _spans.add(span);
    return span;
  }
}`,
      typescript: `//@step
class StockSpanner {
  private prices: number[] = [];
  private spans: number[] = [];
//@step
  next(price: number): number {
    let span = 1;
    while (this.prices.length > 0 && this.prices[this.prices.length - 1] <= price) {
      this.prices.pop();
      span += this.spans.pop() as number;
    }
//@step
    this.prices.push(price);
    this.spans.push(span);
    return span;
  }
}`
    },
    check: 'When 75 arrives, the stack holds 100, 80, 70 with span 2, and 60 with span 1. 75 absorbs 60 and 70, giving 1 + 1 + 2 = 4.',
    complexity: 'Amortised O(1) per call. O(n) space.',
    ...design({
      cls: 'StockSpanner',
      ops: ['StockSpanner', 'next', 'next', 'next', 'next', 'next', 'next', 'next'],
      args: [[], [100], [80], [60], [70], [60], [75], [85]],
      expected: [null, 1, 1, 1, 2, 1, 4, 6]
    })
  },
  problem('top-k-frequent-words', 'Top K Frequent Words', 'medium',
    'Given an array of strings words and an integer k, return the k most frequent words, sorted by frequency from highest to lowest, and words with the same frequency in alphabetical order. ' +
      'Example: words = ["i","love","leetcode","i","love","coding"], k = 2 returns ["i","love"].',
    { dart: 'class Solution { List<String> topKFrequent(List<String> words, int k) }', typescript: 'function topKFrequent(words: string[], k: number): string[]' },
    'topKFrequent',
    'List the k most common words, breaking ties alphabetically.',
    'Count each word, then sort the distinct words by count descending and alphabetically for ties, and take the first k.',
    [
      { what: 'open the method and count each word', say: 'A map gives the frequencies.' },
      { what: 'sort the distinct words by count, then alphabetically', say: 'The tie-break is part of the required order.' },
      { what: 'return the first k', say: 'n log n for the sort.' }
    ],
    {
      dart: `//@step
class Solution {
  List<String> topKFrequent(List<String> words, int k) {
    final counts = <String, int>{};
    for (final w in words) {
      counts[w] = (counts[w] ?? 0) + 1;
    }
//@step
    final distinct = counts.keys.toList()
      ..sort((a, b) => counts[b] != counts[a] ? counts[b]!.compareTo(counts[a]!) : a.compareTo(b));
//@step
    return distinct.take(k).toList();
  }
}`,
      typescript: `//@step
function topKFrequent(words: string[], k: number): string[] {
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
//@step
  const distinct = [...counts.keys()].sort((a, b) => {
    const diff = (counts.get(b) as number) - (counts.get(a) as number);
    return diff !== 0 ? diff : a < b ? -1 : a > b ? 1 : 0;
  });
//@step
  return distinct.slice(0, k);
}`
    },
    'With the example, "i" and "love" both appear twice; alphabetically "i" comes first. They are the top two.',
    'O(n log n) time. O(n) space.',
    [{ args: [['i', 'love', 'leetcode', 'i', 'love', 'coding'], 2], expected: ['i', 'love'] }, { args: [['the', 'day', 'is', 'sunny', 'the', 'the', 'the', 'sunny', 'is', 'is'], 4], expected: ['the', 'is', 'sunny', 'day'] }]),
  problem('minimum-path-sum', 'Minimum Path Sum', 'medium',
    'Given an m x n grid of non-negative numbers, find a path from the top-left to the bottom-right, moving only right or down, that minimises the sum of the numbers along it, and return that sum. Example: grid = [[1,3,1],[1,5,1],[4,2,1]] returns 7.',
    { dart: 'class Solution { int minPathSum(List<List<int>> grid) }', typescript: 'function minPathSum(grid: number[][]): number' },
    'minPathSum',
    'Find the cheapest route from the top-left to the bottom-right corner moving only right or down.',
    'The cheapest cost to reach a cell is its own value plus the cheaper of the cell above and the cell to the left. Fill one row array left to right, row by row.',
    [
      { what: 'open the method with a row of costs, filling the first row as running sums', say: 'The first row can only be reached from the left.' },
      { what: 'for each later row, the first cell adds from above, and every other cell takes the cheaper of above and left', say: 'The row array already holds the costs from the row above.' },
      { what: 'return the last cell', say: 'm times n time, n space.' }
    ],
    {
      dart: `//@step
class Solution {
  int minPathSum(List<List<int>> grid) {
    final cols = grid[0].length;
    final cost = List<int>.filled(cols, 0);
    cost[0] = grid[0][0];
    for (var c = 1; c < cols; c++) {
      cost[c] = cost[c - 1] + grid[0][c];
    }
//@step
    for (var r = 1; r < grid.length; r++) {
      cost[0] += grid[r][0];
      for (var c = 1; c < cols; c++) {
        cost[c] = (cost[c] < cost[c - 1] ? cost[c] : cost[c - 1]) + grid[r][c];
      }
    }
//@step
    return cost[cols - 1];
  }
}`,
      typescript: `//@step
function minPathSum(grid: number[][]): number {
  const cols = grid[0].length;
  const cost: number[] = new Array(cols).fill(0);
  cost[0] = grid[0][0];
  for (let c = 1; c < cols; c++) cost[c] = cost[c - 1] + grid[0][c];
//@step
  for (let r = 1; r < grid.length; r++) {
    cost[0] += grid[r][0];
    for (let c = 1; c < cols; c++) cost[c] = Math.min(cost[c], cost[c - 1]) + grid[r][c];
  }
//@step
  return cost[cols - 1];
}`
    },
    'In the example, the path 1, 3, 1, 1, 1 along the top and down the right side costs 7, and the table finds no cheaper path.',
    'O(m times n) time. O(n) space.',
    [{ args: [[[1, 3, 1], [1, 5, 1], [4, 2, 1]]], expected: 7 }, { args: [[[1, 2, 3], [4, 5, 6]]], expected: 12 }]),
  problem('triangle', 'Triangle', 'medium',
    'Given a triangle array, return the minimum path sum from top to bottom, where from index i on a row you may move to index i or i + 1 on the next row. Example: triangle = [[2],[3,4],[6,5,7],[4,1,8,3]] returns 11 (2 + 3 + 5 + 1).',
    { dart: 'class Solution { int minimumTotal(List<List<int>> triangle) }', typescript: 'function minimumTotal(triangle: number[][]): number' },
    'minimumTotal',
    'Find the cheapest path from the top of the triangle to the bottom, stepping to one of the two numbers below each time.',
    'Work bottom-up: start with the last row, and for each row above, each cell\'s best is its value plus the smaller of the two cells below. The top ends up holding the answer.',
    [
      { what: 'open the method with a copy of the bottom row', say: 'Going bottom-up means every cell has exactly two options.' },
      { what: 'for each row above, replace each value with itself plus the smaller of the two below', say: 'The array shrinks by one useful cell each row.' },
      { what: 'return the first value', say: 'n squared time, n space.' }
    ],
    {
      dart: `//@step
class Solution {
  int minimumTotal(List<List<int>> triangle) {
    final best = [...triangle.last];
//@step
    for (var r = triangle.length - 2; r >= 0; r--) {
      for (var i = 0; i <= r; i++) {
        best[i] = triangle[r][i] + (best[i] < best[i + 1] ? best[i] : best[i + 1]);
      }
    }
//@step
    return best[0];
  }
}`,
      typescript: `//@step
function minimumTotal(triangle: number[][]): number {
  const best = [...triangle[triangle.length - 1]];
//@step
  for (let r = triangle.length - 2; r >= 0; r--) {
    for (let i = 0; i <= r; i++) best[i] = triangle[r][i] + Math.min(best[i], best[i + 1]);
  }
//@step
  return best[0];
}`
    },
    'From the bottom [4, 1, 8, 3]: the row 6, 5, 7 becomes 7, 6, 10; the row 3, 4 becomes 9, 10; the top becomes 2 + 9 = 11.',
    'O(n squared) time. O(n) space.',
    [{ args: [[[2], [3, 4], [6, 5, 7], [4, 1, 8, 3]]], expected: 11 }, { args: [[[-10]]], expected: -10 }]),
  problem('next-permutation', 'Next Permutation', 'medium',
    'Given an array nums, rearrange it into the next lexicographically greater permutation; if it is the largest, rearrange it into the smallest (sorted ascending). Do it in place with constant extra space. The function returns the array here for checking. ' +
      'Example: [1,2,3] becomes [1,3,2]. Example: [3,2,1] becomes [1,2,3]. Example: [1,1,5] becomes [1,5,1].',
    { dart: 'class Solution { List<int> nextPermutation(List<int> nums) }', typescript: 'function nextPermutation(nums: number[]): number[]' },
    'nextPermutation',
    'Rearrange the numbers into the next ordering in dictionary order, wrapping round to the smallest after the largest.',
    'From the right, find the first index i where nums[i] is smaller than nums[i + 1]. If there is one, swap it with the smallest larger number to its right, which is the rightmost one larger than it. Then reverse everything after i, which turns the descending tail into ascending.',
    [
      { what: 'open the method and find the rightmost i with nums[i] smaller than the next value', say: 'Everything after i is in descending order, the largest it can be.' },
      { what: 'if found, swap nums[i] with the rightmost value larger than it', say: 'That makes the smallest possible increase at position i.' },
      { what: 'reverse the part after i and return the array', say: 'The tail becomes its smallest arrangement. Linear time.' }
    ],
    {
      dart: `//@step
class Solution {
  List<int> nextPermutation(List<int> nums) {
    void swap(int a, int b) {
      final t = nums[a];
      nums[a] = nums[b];
      nums[b] = t;
    }
    var i = nums.length - 2;
    while (i >= 0 && nums[i] >= nums[i + 1]) {
      i--;
    }
//@step
    if (i >= 0) {
      var j = nums.length - 1;
      while (nums[j] <= nums[i]) {
        j--;
      }
      swap(i, j);
    }
//@step
    for (var a = i + 1, b = nums.length - 1; a < b; a++, b--) {
      swap(a, b);
    }
    return nums;
  }
}`,
      typescript: `//@step
function nextPermutation(nums: number[]): number[] {
  const swap = (a: number, b: number) => { [nums[a], nums[b]] = [nums[b], nums[a]]; };
  let i = nums.length - 2;
  while (i >= 0 && nums[i] >= nums[i + 1]) i--;
//@step
  if (i >= 0) {
    let j = nums.length - 1;
    while (nums[j] <= nums[i]) j--;
    swap(i, j);
  }
//@step
  for (let a = i + 1, b = nums.length - 1; a < b; a++, b--) swap(a, b);
  return nums;
}`
    },
    'With [1, 1, 5]: i is index 1, since 1 is less than 5. The rightmost value larger than 1 is 5, so they swap, giving [1, 5, 1], and reversing the one-element tail changes nothing.',
    'O(n) time. O(1) space.',
    [{ args: [[1, 2, 3]], expected: [1, 3, 2] }, { args: [[3, 2, 1]], expected: [1, 2, 3] }, { args: [[1, 1, 5]], expected: [1, 5, 1] }, { args: [[1, 3, 2]], expected: [2, 1, 3] }]),
  problem('game-of-life', 'Game of Life', 'medium',
    'Given an m x n board where 1 is a live cell and 0 is dead, compute the next state using Conway\'s rules: a live cell with 2 or 3 live neighbours lives, otherwise it dies; a dead cell with exactly 3 live neighbours becomes alive. All cells update at once. ' +
      'The function returns the board here for checking. Example: [[0,1,0],[0,0,1],[1,1,1],[0,0,0]] becomes [[0,0,0],[1,0,1],[0,1,1],[0,1,0]].',
    { dart: 'class Solution { List<List<int>> gameOfLife(List<List<int>> board) }', typescript: 'function gameOfLife(board: number[][]): number[][]' },
    'gameOfLife',
    'Compute the next generation of Conway\'s Game of Life, where every cell updates at the same time.',
    'Updates must use the old state, so count neighbours against a snapshot. To stay in place, encode the transition in each cell: bit 0 holds the current state and bit 1 the next one; at the end shift every cell right by one.',
    [
      { what: 'open the method with a helper that counts live neighbours using bit 0 only', say: 'Bit 0 still holds the old state while I write bit 1.' },
      { what: 'for each cell, set bit 1 when the cell should be alive next', say: 'Two or three neighbours keep a live cell, exactly three create one.' },
      { what: 'shift every cell right by one to move to the next state, and return the board', say: 'm times n time, constant extra space.' }
    ],
    {
      dart: `//@step
class Solution {
  List<List<int>> gameOfLife(List<List<int>> board) {
    final rows = board.length;
    final cols = board[0].length;
    int live(int r, int c) {
      var n = 0;
      for (var dr = -1; dr <= 1; dr++) {
        for (var dc = -1; dc <= 1; dc++) {
          if (dr == 0 && dc == 0) continue;
          final nr = r + dr;
          final nc = c + dc;
          if (nr >= 0 && nc >= 0 && nr < rows && nc < cols) n += board[nr][nc] & 1;
        }
      }
      return n;
    }
//@step
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        final n = live(r, c);
        if ((board[r][c] & 1) == 1 ? (n == 2 || n == 3) : n == 3) board[r][c] |= 2;
      }
    }
//@step
    for (final row in board) {
      for (var c = 0; c < cols; c++) {
        row[c] >>= 1;
      }
    }
    return board;
  }
}`,
      typescript: `//@step
function gameOfLife(board: number[][]): number[][] {
  const rows = board.length;
  const cols = board[0].length;
  const live = (r: number, c: number): number => {
    let n = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nc >= 0 && nr < rows && nc < cols) n += board[nr][nc] & 1;
      }
    }
    return n;
  };
//@step
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const n = live(r, c);
      if ((board[r][c] & 1) === 1 ? n === 2 || n === 3 : n === 3) board[r][c] |= 2;
    }
  }
//@step
  for (const row of board) for (let c = 0; c < cols; c++) row[c] >>= 1;
  return board;
}`
    },
    'In the example, the dead cell at row 1, column 0 has exactly three live neighbours, so it comes alive; the live cell at the top has only one neighbour, so it dies.',
    'O(m times n) time. O(1) extra space.',
    [{ args: [[[0, 1, 0], [0, 0, 1], [1, 1, 1], [0, 0, 0]]], expected: [[0, 0, 0], [1, 0, 1], [0, 1, 1], [0, 1, 0]] }, { args: [[[1, 1], [1, 0]]], expected: [[1, 1], [1, 1]] }]),
  problem('combination-sum-ii', 'Combination Sum II', 'medium',
    'Given candidates, which may contain duplicates, and a target, return all unique combinations that sum to target, where each candidate may be used at most once, in any order. ' +
      'Example: candidates = [10,1,2,7,6,1,5], target = 8 returns [[1,1,6],[1,2,5],[1,7],[2,6]].',
    { dart: 'class Solution { List<List<int>> combinationSum2(List<int> candidates, int target) }', typescript: 'function combinationSum2(candidates: number[], target: number): number[][]' },
    'combinationSum2',
    'Find every distinct way to reach the target using each number at most once, when the list has repeats.',
    'Sort the numbers. Backtrack from a start index, moving to i plus 1 after picking i so each number is used once. Skip a number equal to the previous one at the same level, so the same combination is not built twice. Stop early once numbers exceed what is left.',
    [
      { what: 'open the method, sort a copy and set up the result and current pick', say: 'Sorting groups duplicates and allows early stopping.' },
      { what: 'backtrack from each start, skipping same-level duplicates and stopping when a number is too big', say: 'Moving to the next index means each number is used once.' },
      { what: 'record the pick when the remaining target is zero, and return the result', say: 'Exponential in the worst case, pruned heavily in practice.' }
    ],
    {
      dart: `//@step
class Solution {
  List<List<int>> combinationSum2(List<int> candidates, int target) {
    final a = [...candidates]..sort();
    final result = <List<int>>[];
    final pick = <int>[];
//@step
    void explore(int start, int remaining) {
      if (remaining == 0) {
        result.add([...pick]);
        return;
      }
      for (var i = start; i < a.length; i++) {
        if (i > start && a[i] == a[i - 1]) continue;
        if (a[i] > remaining) break;
        pick.add(a[i]);
        explore(i + 1, remaining - a[i]);
        pick.removeLast();
      }
    }
//@step
    explore(0, target);
    return result;
  }
}`,
      typescript: `//@step
function combinationSum2(candidates: number[], target: number): number[][] {
  const a = [...candidates].sort((x, y) => x - y);
  const result: number[][] = [];
  const pick: number[] = [];
//@step
  const explore = (start: number, remaining: number): void => {
    if (remaining === 0) {
      result.push([...pick]);
      return;
    }
    for (let i = start; i < a.length; i++) {
      if (i > start && a[i] === a[i - 1]) continue;
      if (a[i] > remaining) break;
      pick.push(a[i]);
      explore(i + 1, remaining - a[i]);
      pick.pop();
    }
  };
//@step
  explore(0, target);
  return result;
}`
    },
    'Sorted, the list is [1, 1, 2, 5, 6, 7, 10]. Starting with the first 1: 1, 1, 6 and 1, 2, 5 and 1, 7 reach 8. The second 1 at the top level is skipped. Starting with 2: 2, 6. Four combinations.',
    'Exponential in the worst case. O(n) recursion depth.',
    [{ args: [[10, 1, 2, 7, 6, 1, 5], 8], expected: [[1, 1, 6], [1, 2, 5], [1, 7], [2, 6]] }, { args: [[2, 5, 2, 1, 2], 5], expected: [[1, 2, 2], [5]] }],
    { compare: 'sorted' }),
  problem('island-perimeter', 'Island Perimeter', 'easy',
    'Given a grid where 1 is land and 0 is water, with exactly one island and no lakes, return the perimeter of the island. Example: grid = [[0,1,0,0],[1,1,1,0],[0,1,0,0],[1,1,0,0]] returns 16.',
    { dart: 'class Solution { int islandPerimeter(List<List<int>> grid) }', typescript: 'function islandPerimeter(grid: number[][]): number' },
    'islandPerimeter',
    'Measure the length of the coastline around the single island.',
    'Each land cell contributes 4 edges, minus 2 for every pair of neighbouring land cells, since that shared edge is inside the island. Counting each land cell and its right and down neighbours counts every shared edge once.',
    [
      { what: 'open the method with a perimeter of zero', say: 'One scan of the grid is enough.' },
      { what: 'for each land cell add 4, and subtract 2 for land to its right and 2 for land below', say: 'Shared edges are not on the coast.' },
      { what: 'return the perimeter', say: 'm times n time.' }
    ],
    {
      dart: `//@step
class Solution {
  int islandPerimeter(List<List<int>> grid) {
    var perimeter = 0;
//@step
    for (var r = 0; r < grid.length; r++) {
      for (var c = 0; c < grid[0].length; c++) {
        if (grid[r][c] != 1) continue;
        perimeter += 4;
        if (r + 1 < grid.length && grid[r + 1][c] == 1) perimeter -= 2;
        if (c + 1 < grid[0].length && grid[r][c + 1] == 1) perimeter -= 2;
      }
    }
//@step
    return perimeter;
  }
}`,
      typescript: `//@step
function islandPerimeter(grid: number[][]): number {
  let perimeter = 0;
//@step
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c] !== 1) continue;
      perimeter += 4;
      if (r + 1 < grid.length && grid[r + 1][c] === 1) perimeter -= 2;
      if (c + 1 < grid[0].length && grid[r][c + 1] === 1) perimeter -= 2;
    }
  }
//@step
  return perimeter;
}`
    },
    'The example island has 7 land cells, 28 edges in total, with 6 shared edges removing 12, leaving 16.',
    'O(m times n) time. O(1) space.',
    [{ args: [[[0, 1, 0, 0], [1, 1, 1, 0], [0, 1, 0, 0], [1, 1, 0, 0]]], expected: 16 }, { args: [[[1]]], expected: 4 }, { args: [[[1, 0]]], expected: 4 }]),
  problem('longest-substring-k-distinct', 'Longest Substring with At Most K Distinct Characters', 'medium',
    'Given a string s and an integer k, return the length of the longest substring that contains at most k distinct characters. Example: s = "eceba", k = 2 returns 3 ("ece"). Example: s = "aa", k = 1 returns 2.',
    { dart: 'class Solution { int lengthOfLongestSubstringKDistinct(String s, int k) }', typescript: 'function lengthOfLongestSubstringKDistinct(s: string, k: number): number' },
    'lengthOfLongestSubstringKDistinct',
    'Find the longest stretch of the text that uses at most k different letters.',
    'Sliding window with letter counts. Grow on the right; when the window has more than k distinct letters, shrink from the left, removing letters whose count drops to zero. Track the largest valid window.',
    [
      { what: 'open the method with a map of letter counts, the window start and the best length', say: 'The map size is the number of distinct letters.' },
      { what: 'add each letter, and while there are more than k distinct letters, drop letters from the left', say: 'Removing a letter fully shrinks the distinct count.' },
      { what: 'update the best length and return it', say: 'Linear time.' }
    ],
    {
      dart: `//@step
class Solution {
  int lengthOfLongestSubstringKDistinct(String s, int k) {
    final counts = <String, int>{};
    var start = 0;
    var best = 0;
//@step
    for (var i = 0; i < s.length; i++) {
      counts[s[i]] = (counts[s[i]] ?? 0) + 1;
      while (counts.length > k) {
        final out = s[start++];
        counts[out] = counts[out]! - 1;
        if (counts[out] == 0) counts.remove(out);
      }
//@step
      if (i - start + 1 > best) best = i - start + 1;
    }
    return best;
  }
}`,
      typescript: `//@step
function lengthOfLongestSubstringKDistinct(s: string, k: number): number {
  const counts = new Map<string, number>();
  let start = 0;
  let best = 0;
//@step
  for (let i = 0; i < s.length; i++) {
    counts.set(s[i], (counts.get(s[i]) ?? 0) + 1);
    while (counts.size > k) {
      const out = s[start++];
      counts.set(out, (counts.get(out) as number) - 1);
      if (counts.get(out) === 0) counts.delete(out);
    }
//@step
    best = Math.max(best, i - start + 1);
  }
  return best;
}`
    },
    'With "eceba" and k = 2: "ece" has two distinct letters, length 3. Adding b makes three, so the window shrinks to "eb". The best stays 3.',
    'O(n) time. O(k) space.',
    [{ args: ['eceba', 2], expected: 3 }, { args: ['aa', 1], expected: 2 }, { args: ['abc', 0], expected: 0 }])
];
