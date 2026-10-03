// Bit manipulation, math, tries and other design problems.
const { design } = require('../helpers');

function problem(id, title, level, statement, sig, fn, asks, idea, steps, code, check, complexity, tests, extra = {}) {
  return {
    id, title, level, statement, signature: sig, fn, asks, idea,
    where: { dart: 'the Solution class, replacing the ' + fn + ' method.', typescript: 'the ' + fn + ' function, replacing its body.' },
    steps, code, check, complexity, tests, ...extra
  };
}

module.exports = [
  problem('single-number', 'Single Number', 'easy',
    'Given a non-empty array of integers where every element appears twice except one, find that single one in linear time and constant extra space. Example: nums = [2,2,1] returns 1. Example: nums = [4,1,2,1,2] returns 4.',
    { dart: 'class Solution { int singleNumber(List<int> nums) }', typescript: 'function singleNumber(nums: number[]): number' },
    'singleNumber',
    'Find the one number that appears once when every other number appears twice.',
    'XOR every number together. A number XOR itself is zero and zero XOR x is x, and the order does not matter, so all the pairs cancel and only the single number is left.',
    [
      { what: 'open the method with a result of zero', say: 'XOR with zero leaves a number unchanged.' },
      { what: 'XOR every number into the result', say: 'Pairs cancel each other out.' },
      { what: 'return the result', say: 'Linear time, constant space.' }
    ],
    {
      dart: `//@step
class Solution {
  int singleNumber(List<int> nums) {
    var result = 0;
//@step
    for (final n in nums) {
      result ^= n;
    }
//@step
    return result;
  }
}`,
      typescript: `//@step
function singleNumber(nums: number[]): number {
  let result = 0;
//@step
  for (const n of nums) result ^= n;
//@step
  return result;
}`
    },
    'With [4, 1, 2, 1, 2]: 4 XOR 1 XOR 2 XOR 1 XOR 2 groups into 4 XOR (1 XOR 1) XOR (2 XOR 2), which is 4.',
    'O(n) time. O(1) space.',
    [{ args: [[2, 2, 1]], expected: 1 }, { args: [[4, 1, 2, 1, 2]], expected: 4 }, { args: [[1]], expected: 1 }]),
  problem('number-of-1-bits', 'Number of 1 Bits', 'easy',
    'Given a positive integer n, return the number of set bits in its binary representation (its Hamming weight). Example: n = 11 (binary 1011) returns 3. Example: n = 128 returns 1.',
    { dart: 'class Solution { int hammingWeight(int n) }', typescript: 'function hammingWeight(n: number): number' },
    'hammingWeight',
    'Count how many 1s there are in the binary form of the number: 11 is 1011, which has three.',
    'n AND (n minus 1) clears the lowest set bit. Repeat until n is zero and count the steps; that touches only the set bits.',
    [
      { what: 'open the method with a counter', say: 'Each loop removes exactly one set bit.' },
      { what: 'while n is not zero, clear its lowest set bit and count', say: 'n minus 1 flips the lowest 1 and the zeros below it.' },
      { what: 'return the count', say: 'Time proportional to the number of set bits.' }
    ],
    {
      dart: `//@step
class Solution {
  int hammingWeight(int n) {
    var count = 0;
//@step
    while (n != 0) {
      n &= n - 1;
      count++;
    }
//@step
    return count;
  }
}`,
      typescript: `//@step
function hammingWeight(n: number): number {
  let count = 0;
//@step
  while (n !== 0) {
    n &= n - 1;
    count++;
  }
//@step
  return count;
}`
    },
    'With 11, binary 1011: clearing the lowest bit gives 1010, then 1000, then 0, three steps.',
    'O(k) time where k is the number of set bits. O(1) space.',
    [{ args: [11], expected: 3 }, { args: [128], expected: 1 }, { args: [2147483645], expected: 30 }]),
  problem('counting-bits', 'Counting Bits', 'easy',
    'Given an integer n, return an array ans of length n + 1 where ans[i] is the number of 1 bits in the binary form of i. Do it in O(n). Example: n = 2 returns [0,1,1]. Example: n = 5 returns [0,1,1,2,1,2].',
    { dart: 'class Solution { List<int> countBits(int n) }', typescript: 'function countBits(n: number): number[]' },
    'countBits',
    'For every number from 0 to n, count the 1s in its binary form.',
    'Shifting i right by one drops its last bit, so the count for i is the count for i divided by 2, already computed, plus whether i is odd.',
    [
      { what: 'open the method with an answer array of zeros', say: 'Zero has no set bits.' },
      { what: 'for each i, take the answer for i shifted right and add its last bit', say: 'Each answer reuses a smaller one.' },
      { what: 'return the array', say: 'Linear time.' }
    ],
    {
      dart: `//@step
class Solution {
  List<int> countBits(int n) {
    final ans = List<int>.filled(n + 1, 0);
//@step
    for (var i = 1; i <= n; i++) {
      ans[i] = ans[i >> 1] + (i & 1);
    }
//@step
    return ans;
  }
}`,
      typescript: `//@step
function countBits(n: number): number[] {
  const ans: number[] = new Array(n + 1).fill(0);
//@step
  for (let i = 1; i <= n; i++) ans[i] = ans[i >> 1] + (i & 1);
//@step
  return ans;
}`
    },
    'For 5: 1 gives 1; 2 is 1 shifted, so 1; 3 is 1 plus 1; 4 is 2\'s count, 1; 5 is 2\'s count plus 1, so 2. Result [0, 1, 1, 2, 1, 2].',
    'O(n) time. O(n) space for the output.',
    [{ args: [2], expected: [0, 1, 1] }, { args: [5], expected: [0, 1, 1, 2, 1, 2] }]),
  problem('missing-number', 'Missing Number', 'easy',
    'Given an array nums containing n distinct numbers in the range 0 to n, return the only number in the range that is missing. Example: nums = [3,0,1] returns 2. Example: nums = [9,6,4,2,3,5,7,0,1] returns 8.',
    { dart: 'class Solution { int missingNumber(List<int> nums) }', typescript: 'function missingNumber(nums: number[]): number' },
    'missingNumber',
    'Find the one number from 0 to n that is not in the list.',
    'The numbers 0 to n add up to n times n plus 1 over 2. Subtract the sum of the array, and what is left is the missing number.',
    [
      { what: 'open the method and compute the expected sum of 0 to n', say: 'The full range has a known total.' },
      { what: 'subtract every number in the array', say: 'Whatever remains was never subtracted.' },
      { what: 'return the remainder', say: 'Linear time, constant space.' }
    ],
    {
      dart: `//@step
class Solution {
  int missingNumber(List<int> nums) {
    final n = nums.length;
    var missing = n * (n + 1) ~/ 2;
//@step
    for (final x in nums) {
      missing -= x;
    }
//@step
    return missing;
  }
}`,
      typescript: `//@step
function missingNumber(nums: number[]): number {
  const n = nums.length;
  let missing = (n * (n + 1)) / 2;
//@step
  for (const x of nums) missing -= x;
//@step
  return missing;
}`
    },
    'With [3, 0, 1]: 0 to 3 add up to 6, the array adds up to 4, so 2 is missing.',
    'O(n) time. O(1) space.',
    [{ args: [[3, 0, 1]], expected: 2 }, { args: [[0, 1]], expected: 2 }, { args: [[9, 6, 4, 2, 3, 5, 7, 0, 1]], expected: 8 }]),
  problem('reverse-integer', 'Reverse Integer', 'medium',
    'Given a signed 32-bit integer x, return x with its digits reversed. If the result is outside the 32-bit signed range [-2147483648, 2147483647], return 0. Example: x = 123 returns 321. Example: x = -123 returns -321. Example: x = 120 returns 21.',
    { dart: 'class Solution { int reverse(int x) }', typescript: 'function reverse(x: number): number' },
    'reverse',
    'Reverse the digits of the number, keeping the sign, and return 0 if the result no longer fits in 32 bits.',
    'Pop the last digit with modulo 10 and push it onto the result by multiplying by 10. Work with the absolute value and restore the sign. Check the range at the end.',
    [
      { what: 'open the method, remember the sign and work with the absolute value', say: 'Handling the sign once keeps the loop simple.' },
      { what: 'move digits from the end of x onto the result', say: 'Each step takes the last digit and appends it.' },
      { what: 'apply the sign and return 0 if it is outside the 32-bit range', say: 'Time proportional to the number of digits.' }
    ],
    {
      dart: `//@step
class Solution {
  int reverse(int x) {
    final sign = x < 0 ? -1 : 1;
    var rest = x.abs();
    var result = 0;
//@step
    while (rest > 0) {
      result = result * 10 + rest % 10;
      rest ~/= 10;
    }
//@step
    result *= sign;
    return result < -2147483648 || result > 2147483647 ? 0 : result;
  }
}`,
      typescript: `//@step
function reverse(x: number): number {
  const sign = x < 0 ? -1 : 1;
  let rest = Math.abs(x);
  let result = 0;
//@step
  while (rest > 0) {
    result = result * 10 + (rest % 10);
    rest = Math.floor(rest / 10);
  }
//@step
  result *= sign;
  return result < -2147483648 || result > 2147483647 ? 0 : result;
}`
    },
    'With -123: the sign is negative, and 123 becomes 3, then 32, then 321. With the sign back, -321, which is in range.',
    'O(log x) time, one step per digit. O(1) space.',
    [{ args: [123], expected: 321 }, { args: [-123], expected: -321 }, { args: [120], expected: 21 }, { args: [1534236469], expected: 0 }]),
  problem('pow-x-n', 'Pow(x, n)', 'medium',
    'Implement pow(x, n), x raised to the power n, for a double x and an integer n that may be negative. Example: x = 2.0, n = 10 returns 1024.0. Example: x = 2.0, n = -2 returns 0.25.',
    { dart: 'class Solution { double myPow(double x, int n) }', typescript: 'function myPow(x: number, n: number): number' },
    'myPow',
    'Raise x to the power n quickly, including negative powers.',
    'Fast exponentiation by squaring: x to the n is x squared to the n over 2, times one more x when n is odd. Handle a negative n by using 1 over x and a positive power. That takes log n steps.',
    [
      { what: 'open the method and turn a negative power into a positive one with 1 over x', say: 'x to the minus n is 1 over x to the n.' },
      { what: 'loop over the bits of n, multiplying the result by the current square when the bit is set', say: 'Each step squares the base and halves the power.' },
      { what: 'return the result', say: 'log n multiplications.' }
    ],
    {
      dart: `//@step
class Solution {
  double myPow(double x, int n) {
    var base = n < 0 ? 1 / x : x;
    var power = n.abs();
    var result = 1.0;
//@step
    while (power > 0) {
      if (power.isOdd) result *= base;
      base *= base;
      power >>= 1;
    }
//@step
    return result;
  }
}`,
      typescript: `//@step
function myPow(x: number, n: number): number {
  let base = n < 0 ? 1 / x : x;
  let power = Math.abs(n);
  let result = 1;
//@step
  while (power > 0) {
    if (power % 2 === 1) result *= base;
    base *= base;
    power = Math.floor(power / 2);
  }
//@step
  return result;
}`
    },
    'With 2 and 10, binary 1010: the base squares to 4, 16, 256; the result takes 4 for the second bit and 256 for the fourth, giving 1024.',
    'O(log n) time. O(1) space.',
    [{ args: [2, 10], expected: 1024 }, { args: [2, -2], expected: 0.25 }, { args: [3, 0], expected: 1 }]),
  problem('happy-number', 'Happy Number', 'easy',
    'A happy number is one where repeatedly replacing the number by the sum of the squares of its digits eventually reaches 1; otherwise it loops forever. Return true if n is happy. Example: n = 19 returns true. Example: n = 2 returns false.',
    { dart: 'class Solution { bool isHappy(int n) }', typescript: 'function isHappy(n: number): boolean' },
    'isHappy',
    'Keep replacing the number by the sum of its digits squared, and say whether you ever reach 1.',
    'Either the sequence reaches 1 or it falls into a cycle. Detect the cycle with Floyd\'s slow and fast pointers on the sequence, so no extra memory is needed.',
    [
      { what: 'open the method with a helper that sums the squares of the digits', say: 'That is the step function of the sequence.' },
      { what: 'move a slow value one step and a fast value two steps until they meet', say: 'Like detecting a loop in a linked list.' },
      { what: 'return whether they met at 1', say: 'Meeting anywhere else means a loop without 1.' }
    ],
    {
      dart: `//@step
class Solution {
  bool isHappy(int n) {
    int next(int x) {
      var sum = 0;
      while (x > 0) {
        final d = x % 10;
        sum += d * d;
        x ~/= 10;
      }
      return sum;
    }
//@step
    var slow = n;
    var fast = next(n);
    while (fast != 1 && slow != fast) {
      slow = next(slow);
      fast = next(next(fast));
    }
//@step
    return fast == 1;
  }
}`,
      typescript: `//@step
function isHappy(n: number): boolean {
  const next = (x: number): number => {
    let sum = 0;
    while (x > 0) {
      const d = x % 10;
      sum += d * d;
      x = Math.floor(x / 10);
    }
    return sum;
  };
//@step
  let slow = n;
  let fast = next(n);
  while (fast !== 1 && slow !== fast) {
    slow = next(slow);
    fast = next(next(fast));
  }
//@step
  return fast === 1;
}`
    },
    'With 19: 1 + 81 = 82, then 64 + 4 = 68, then 36 + 64 = 100, then 1. It reaches 1, so true.',
    'O(log n) time per step, and the sequence quickly drops to small numbers. O(1) space.',
    [{ args: [19], expected: true }, { args: [2], expected: false }, { args: [1], expected: true }]),
  problem('rotate-image', 'Rotate Image', 'medium',
    'Given an n x n matrix, rotate it by 90 degrees clockwise in place. The function returns the matrix here for checking. Example: matrix = [[1,2,3],[4,5,6],[7,8,9]] becomes [[7,4,1],[8,5,2],[9,6,3]].',
    { dart: 'class Solution { List<List<int>> rotate(List<List<int>> matrix) }', typescript: 'function rotate(matrix: number[][]): number[][]' },
    'rotate',
    'Turn the square grid a quarter turn to the right without making a copy.',
    'A clockwise rotation equals a transpose, swapping across the main diagonal, followed by reversing each row. Both steps work in place.',
    [
      { what: 'open the method and transpose the matrix by swapping matrix[i][j] with matrix[j][i] above the diagonal', say: 'Rows become columns.' },
      { what: 'reverse every row', say: 'Reversing rows after a transpose gives the clockwise turn.' },
      { what: 'return the matrix', say: 'n squared time, constant extra space.' }
    ],
    {
      dart: `//@step
class Solution {
  List<List<int>> rotate(List<List<int>> matrix) {
    final n = matrix.length;
    for (var i = 0; i < n; i++) {
      for (var j = i + 1; j < n; j++) {
        final t = matrix[i][j];
        matrix[i][j] = matrix[j][i];
        matrix[j][i] = t;
      }
    }
//@step
    for (final row in matrix) {
      for (var a = 0, b = n - 1; a < b; a++, b--) {
        final t = row[a];
        row[a] = row[b];
        row[b] = t;
      }
    }
//@step
    return matrix;
  }
}`,
      typescript: `//@step
function rotate(matrix: number[][]): number[][] {
  const n = matrix.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) [matrix[i][j], matrix[j][i]] = [matrix[j][i], matrix[i][j]];
  }
//@step
  for (const row of matrix) row.reverse();
//@step
  return matrix;
}`
    },
    'With [[1, 2, 3], [4, 5, 6], [7, 8, 9]]: the transpose is [[1, 4, 7], [2, 5, 8], [3, 6, 9]], and reversing each row gives [[7, 4, 1], [8, 5, 2], [9, 6, 3]].',
    'O(n squared) time. O(1) extra space.',
    [{ args: [[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], expected: [[7, 4, 1], [8, 5, 2], [9, 6, 3]] }, { args: [[[1]]], expected: [[1]] }]),
  problem('spiral-matrix', 'Spiral Matrix', 'medium',
    'Given an m x n matrix, return all its elements in spiral order, going right, down, left and up around the edges and inwards. Example: matrix = [[1,2,3],[4,5,6],[7,8,9]] returns [1,2,3,6,9,8,7,4,5]. Example: matrix = [[1,2,3,4],[5,6,7,8],[9,10,11,12]] returns [1,2,3,4,8,12,11,10,9,5,6,7].',
    { dart: 'class Solution { List<int> spiralOrder(List<List<int>> matrix) }', typescript: 'function spiralOrder(matrix: number[][]): number[]' },
    'spiralOrder',
    'Read the grid in a spiral from the outside in.',
    'Keep four boundaries: top, bottom, left and right. Walk the top row and move top down, the right column and move right in, the bottom row backwards and move bottom up, the left column upwards and move left in. Stop when the boundaries cross.',
    [
      { what: 'open the method with the four boundaries and the result', say: 'Each lap peels off the outer ring.' },
      { what: 'walk right, down, left and up, shrinking the matching boundary after each side', say: 'Checking the boundaries before the last two sides avoids repeating a row or column.' },
      { what: 'return the result', say: 'Every element is visited once.' }
    ],
    {
      dart: `//@step
class Solution {
  List<int> spiralOrder(List<List<int>> matrix) {
    final result = <int>[];
    var top = 0;
    var bottom = matrix.length - 1;
    var left = 0;
    var right = matrix[0].length - 1;
//@step
    while (top <= bottom && left <= right) {
      for (var c = left; c <= right; c++) result.add(matrix[top][c]);
      top++;
      for (var r = top; r <= bottom; r++) result.add(matrix[r][right]);
      right--;
      if (top <= bottom) {
        for (var c = right; c >= left; c--) result.add(matrix[bottom][c]);
        bottom--;
      }
      if (left <= right) {
        for (var r = bottom; r >= top; r--) result.add(matrix[r][left]);
        left++;
      }
    }
//@step
    return result;
  }
}`,
      typescript: `//@step
function spiralOrder(matrix: number[][]): number[] {
  const result: number[] = [];
  let top = 0;
  let bottom = matrix.length - 1;
  let left = 0;
  let right = matrix[0].length - 1;
//@step
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) result.push(matrix[top][c]);
    top++;
    for (let r = top; r <= bottom; r++) result.push(matrix[r][right]);
    right--;
    if (top <= bottom) {
      for (let c = right; c >= left; c--) result.push(matrix[bottom][c]);
      bottom--;
    }
    if (left <= right) {
      for (let r = bottom; r >= top; r--) result.push(matrix[r][left]);
      left++;
    }
  }
//@step
  return result;
}`
    },
    'With the 3 by 3 grid: the top row gives 1, 2, 3, the right column 6, 9, the bottom row backwards 8, 7, the left column up 4, and the centre 5.',
    'O(m times n) time. O(1) extra space besides the output.',
    [{ args: [[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], expected: [1, 2, 3, 6, 9, 8, 7, 4, 5] }, { args: [[[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]], expected: [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7] }]),
  {
    id: 'implement-trie',
    title: 'Implement Trie (Prefix Tree)',
    level: 'medium',
    statement: 'Implement a trie with Trie(), void insert(String word), bool search(String word), which is true if the exact word was inserted, and bool startsWith(String prefix), true if any inserted word starts with prefix. ' +
      'Example: insert("apple"), search("apple") returns true, search("app") returns false, startsWith("app") returns true, insert("app"), search("app") returns true.',
    signature: { dart: 'class Trie { void insert(String word); bool search(String word); bool startsWith(String prefix) }', typescript: 'class Trie { insert(word: string): void; search(word: string): boolean; startsWith(prefix: string): boolean }' },
    asks: 'Build a prefix tree that stores words and answers "is this word stored" and "does any word start with this".',
    idea: 'Each node holds a map from a character to a child node and a flag for whether a word ends there. Inserting walks down, creating nodes as needed; searching walks down and checks the flag; a prefix only needs the walk to succeed.',
    where: { dart: 'the Trie class and a small node class, replacing the starter code.', typescript: 'the Trie class and a small node class, replacing the starter code.' },
    steps: [
      { what: 'create a node class with children and an end-of-word flag', say: 'Each level of the tree is one more character.' },
      { what: 'insert walks the word, creating missing children, and marks the last node as a word end', say: 'Shared prefixes share nodes.' },
      { what: 'add a walk helper; search checks the end flag and startsWith just checks the walk succeeds', say: 'Each operation is linear in the word length.' }
    ],
    code: {
      dart: `//@step
class TrieNode {
  final children = <String, TrieNode>{};
  var isWord = false;
}

class Trie {
  final _root = TrieNode();

  Trie();
//@step
  void insert(String word) {
    var node = _root;
    for (final c in word.split('')) {
      node = node.children.putIfAbsent(c, () => TrieNode());
    }
    node.isWord = true;
  }
//@step
  TrieNode? _walk(String s) {
    TrieNode? node = _root;
    for (final c in s.split('')) {
      node = node!.children[c];
      if (node == null) return null;
    }
    return node;
  }

  bool search(String word) => _walk(word)?.isWord ?? false;

  bool startsWith(String prefix) => _walk(prefix) != null;
}`,
      typescript: `//@step
class TrieNode {
  children = new Map<string, TrieNode>();
  isWord = false;
}

class Trie {
  private root = new TrieNode();
//@step
  insert(word: string): void {
    let node = this.root;
    for (const c of word) {
      if (!node.children.has(c)) node.children.set(c, new TrieNode());
      node = node.children.get(c) as TrieNode;
    }
    node.isWord = true;
  }
//@step
  private walk(s: string): TrieNode | null {
    let node: TrieNode | undefined = this.root;
    for (const c of s) {
      node = node.children.get(c);
      if (node === undefined) return null;
    }
    return node;
  }

  search(word: string): boolean {
    const node = this.walk(word);
    return node !== null && node.isWord;
  }

  startsWith(prefix: string): boolean {
    return this.walk(prefix) !== null;
  }
}`
    },
    check: 'After inserting "apple", searching "app" walks to the second p, but that node is not marked as a word end, so false, while startsWith "app" is true. After inserting "app", that node is marked, so search "app" becomes true.',
    complexity: 'O(L) time per operation for a word of length L. O(total characters) space.',
    ...design({
      cls: 'Trie',
      ops: ['Trie', 'insert', 'search', 'search', 'startsWith', 'insert', 'search'],
      args: [[], ['apple'], ['apple'], ['app'], ['app'], ['app'], ['app']],
      expected: [null, null, true, false, true, null, true]
    })
  },
  {
    id: 'design-add-search-words',
    title: 'Design Add and Search Words Data Structure',
    level: 'medium',
    statement: 'Design WordDictionary with void addWord(String word) and bool search(String word), where search may contain dots, and a dot matches any single letter. ' +
      'Example: addWord("bad"), addWord("dad"), addWord("mad"), search("pad") returns false, search("bad") returns true, search(".ad") returns true, search("b..") returns true.',
    signature: { dart: 'class WordDictionary { void addWord(String word); bool search(String word) }', typescript: 'class WordDictionary { addWord(word: string): void; search(word: string): boolean }' },
    asks: 'Store words and search them with a dot acting as a wildcard for any one letter.',
    idea: 'Store words in a trie. Searching walks the trie; on a normal letter it follows that child, and on a dot it tries every child with depth-first search. A match needs the walk to end on a word-end node.',
    where: { dart: 'the WordDictionary class and a node class, replacing the starter code.', typescript: 'the WordDictionary class and a node class, replacing the starter code.' },
    steps: [
      { what: 'create a node class and the dictionary with a root node', say: 'Same trie structure as a prefix tree.' },
      { what: 'addWord inserts the word into the trie and marks its end', say: 'Insertion is linear in the word length.' },
      { what: 'search recurses through the word, branching into every child on a dot', say: 'Wildcards make search exponential in the worst case, but tries keep it fast in practice.' }
    ],
    code: {
      dart: `//@step
class WordNode {
  final children = <String, WordNode>{};
  var isWord = false;
}

class WordDictionary {
  final _root = WordNode();

  WordDictionary();
//@step
  void addWord(String word) {
    var node = _root;
    for (final c in word.split('')) {
      node = node.children.putIfAbsent(c, () => WordNode());
    }
    node.isWord = true;
  }
//@step
  bool search(String word) {
    bool find(WordNode node, int i) {
      if (i == word.length) return node.isWord;
      final c = word[i];
      if (c == '.') {
        return node.children.values.any((child) => find(child, i + 1));
      }
      final next = node.children[c];
      return next != null && find(next, i + 1);
    }
    return find(_root, 0);
  }
}`,
      typescript: `//@step
class WordNode {
  children = new Map<string, WordNode>();
  isWord = false;
}

class WordDictionary {
  private root = new WordNode();
//@step
  addWord(word: string): void {
    let node = this.root;
    for (const c of word) {
      if (!node.children.has(c)) node.children.set(c, new WordNode());
      node = node.children.get(c) as WordNode;
    }
    node.isWord = true;
  }
//@step
  search(word: string): boolean {
    const find = (node: WordNode, i: number): boolean => {
      if (i === word.length) return node.isWord;
      const c = word[i];
      if (c === '.') {
        for (const child of node.children.values()) if (find(child, i + 1)) return true;
        return false;
      }
      const next = node.children.get(c);
      return next !== undefined && find(next, i + 1);
    };
    return find(this.root, 0);
  }
}`
    },
    check: 'After adding bad, dad and mad: "pad" fails at p. ".ad" tries every first letter and finds b, d or m followed by a and d. "b.." follows b, then any letter twice, reaching the end of "bad".',
    complexity: 'O(L) to add; search is O(L) without dots and up to O(26 to the L) with many dots. O(total characters) space.',
    ...design({
      cls: 'WordDictionary',
      ops: ['WordDictionary', 'addWord', 'addWord', 'addWord', 'search', 'search', 'search', 'search'],
      args: [[], ['bad'], ['dad'], ['mad'], ['pad'], ['bad'], ['.ad'], ['b..']],
      expected: [null, null, null, null, false, true, true, true]
    })
  }
];
