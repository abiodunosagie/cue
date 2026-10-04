// Classic easy-to-medium problems that open many screening rounds.
const { problem } = require('../helpers');

module.exports = [
  problem('valid-sudoku', 'Valid Sudoku', 'medium',
    'Given a 9 x 9 Sudoku board with digits "1" to "9" and "." for empty cells, return true if the filled cells are valid: no digit repeats in any row, column or 3 x 3 box. The board does not need to be solvable. ' +
      'Example: a standard valid partial board returns true; the same board with an extra "8" in the top-left box returns false.',
    { dart: 'class Solution { bool isValidSudoku(List<List<String>> board) }', typescript: 'function isValidSudoku(board: string[][]): boolean' },
    'isValidSudoku',
    'Check that no digit appears twice in any row, column or 3 by 3 box of the Sudoku grid.',
    'Make one pass over the board and record each digit in three sets of keys: one for its row, one for its column and one for its box, where the box index is row divided by 3 times 3 plus column divided by 3. A repeat in any set means invalid.',
    [
      { what: 'open the method with a set of seen keys', say: 'One set with tagged keys covers rows, columns and boxes.' },
      { what: 'for each filled cell, build its row, column and box keys and return false if any was seen', say: 'The box key groups cells into the nine 3 by 3 blocks.' },
      { what: 'return true if no repeat was found', say: 'Constant time, since the board is always 9 by 9.' }
    ],
    {
      dart: `//@step
class Solution {
  bool isValidSudoku(List<List<String>> board) {
    final seen = <String>{};
//@step
    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        final d = board[r][c];
        if (d == '.') continue;
        final box = (r ~/ 3) * 3 + c ~/ 3;
        if (!seen.add('r\$r\$d') || !seen.add('c\$c\$d') || !seen.add('b\$box\$d')) return false;
      }
    }
//@step
    return true;
  }
}`,
      typescript: `//@step
function isValidSudoku(board: string[][]): boolean {
  const seen = new Set<string>();
//@step
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const d = board[r][c];
      if (d === '.') continue;
      const box = Math.floor(r / 3) * 3 + Math.floor(c / 3);
      const keys = ['r' + r + d, 'c' + c + d, 'b' + box + d];
      if (keys.some((k) => seen.has(k))) return false;
      keys.forEach((k) => seen.add(k));
    }
  }
//@step
  return true;
}`
    },
    'On the invalid board, the 8 at the top-left cell and the 8 lower in the same 3 by 3 box produce the same box key, so the second one is caught and the answer is false.',
    'O(1) time and space, since the board is fixed at 81 cells.',
    [
      { args: [[['5', '3', '.', '.', '7', '.', '.', '.', '.'], ['6', '.', '.', '1', '9', '5', '.', '.', '.'], ['.', '9', '8', '.', '.', '.', '.', '6', '.'], ['8', '.', '.', '.', '6', '.', '.', '.', '3'], ['4', '.', '.', '8', '.', '3', '.', '.', '1'], ['7', '.', '.', '.', '2', '.', '.', '.', '6'], ['.', '6', '.', '.', '.', '.', '2', '8', '.'], ['.', '.', '.', '4', '1', '9', '.', '.', '5'], ['.', '.', '.', '.', '8', '.', '.', '7', '9']]], expected: true },
      { args: [[['8', '3', '.', '.', '7', '.', '.', '.', '.'], ['6', '.', '.', '1', '9', '5', '.', '.', '.'], ['.', '9', '8', '.', '.', '.', '.', '6', '.'], ['8', '.', '.', '.', '6', '.', '.', '.', '3'], ['4', '.', '.', '8', '.', '3', '.', '.', '1'], ['7', '.', '.', '.', '2', '.', '.', '.', '6'], ['.', '6', '.', '.', '.', '.', '2', '8', '.'], ['.', '.', '.', '4', '1', '9', '.', '.', '5'], ['.', '.', '.', '.', '8', '.', '.', '7', '9']]], expected: false }
    ]),
  problem('set-matrix-zeroes', 'Set Matrix Zeroes', 'medium',
    'Given an m x n integer matrix, if an element is 0, set its entire row and column to 0, in place. The function returns the matrix here for checking. Example: matrix = [[1,1,1],[1,0,1],[1,1,1]] becomes [[1,0,1],[0,0,0],[1,0,1]].',
    { dart: 'class Solution { List<List<int>> setZeroes(List<List<int>> matrix) }', typescript: 'function setZeroes(matrix: number[][]): number[][]' },
    'setZeroes',
    'Wherever there is a zero, zero out its whole row and column.',
    'First record which rows and columns contain a zero, then make a second pass setting every cell in those rows or columns to zero. Recording first stops new zeros from spreading. Two sets keep it simple; the first row and column can hold the markers for constant space.',
    [
      { what: 'open the method and collect the rows and columns that contain a zero', say: 'I must find all original zeros before changing anything.' },
      { what: 'set every cell whose row or column was recorded to zero', say: 'The second pass uses only the original zeros.' },
      { what: 'return the matrix', say: 'm times n time.' }
    ],
    {
      dart: `//@step
class Solution {
  List<List<int>> setZeroes(List<List<int>> matrix) {
    final rows = <int>{};
    final cols = <int>{};
    for (var r = 0; r < matrix.length; r++) {
      for (var c = 0; c < matrix[0].length; c++) {
        if (matrix[r][c] == 0) {
          rows.add(r);
          cols.add(c);
        }
      }
    }
//@step
    for (var r = 0; r < matrix.length; r++) {
      for (var c = 0; c < matrix[0].length; c++) {
        if (rows.contains(r) || cols.contains(c)) matrix[r][c] = 0;
      }
    }
//@step
    return matrix;
  }
}`,
      typescript: `//@step
function setZeroes(matrix: number[][]): number[][] {
  const rows = new Set<number>();
  const cols = new Set<number>();
  matrix.forEach((row, r) => row.forEach((v, c) => {
    if (v === 0) {
      rows.add(r);
      cols.add(c);
    }
  }));
//@step
  matrix.forEach((row, r) => row.forEach((_, c) => {
    if (rows.has(r) || cols.has(c)) row[c] = 0;
  }));
//@step
  return matrix;
}`
    },
    'With [[1, 1, 1], [1, 0, 1], [1, 1, 1]]: the only zero is at row 1, column 1, so row 1 and column 1 become zeros: [[1, 0, 1], [0, 0, 0], [1, 0, 1]].',
    'O(m times n) time. O(m + n) space for the sets.',
    [{ args: [[[1, 1, 1], [1, 0, 1], [1, 1, 1]]], expected: [[1, 0, 1], [0, 0, 0], [1, 0, 1]] }, { args: [[[0, 1, 2, 0], [3, 4, 5, 2], [1, 3, 1, 5]]], expected: [[0, 0, 0, 0], [0, 4, 5, 0], [0, 3, 1, 0]] }]),
  problem('find-the-duplicate-number', 'Find the Duplicate Number', 'medium',
    'Given an array nums of n + 1 integers where each is between 1 and n, there is exactly one repeated number (possibly repeated more than once). Find it without modifying the array and with constant extra space. ' +
      'Example: nums = [1,3,4,2,2] returns 2. Example: nums = [3,1,3,4,2] returns 3.',
    { dart: 'class Solution { int findDuplicate(List<int> nums) }', typescript: 'function findDuplicate(nums: number[]): number' },
    'findDuplicate',
    'Find the repeated number without changing the array or using extra memory.',
    'Treat each value as a pointer to the next index: i goes to nums[i]. Because a value repeats, two indexes point to the same place, which makes a cycle, and the duplicate is where the cycle starts. Floyd\'s algorithm finds it: meet inside the cycle, then walk one pointer from the start until they meet again.',
    [
      { what: 'open the method with slow and fast pointers starting at index 0', say: 'Following values as links forms a linked list with a cycle.' },
      { what: 'move slow one step and fast two steps until they meet', say: 'They must meet inside the cycle.' },
      { what: 'restart slow from 0 and move both one step until they meet; that value is the duplicate', say: 'The meeting point is the entrance of the cycle.' }
    ],
    {
      dart: `//@step
class Solution {
  int findDuplicate(List<int> nums) {
    var slow = nums[0];
    var fast = nums[nums[0]];
//@step
    while (slow != fast) {
      slow = nums[slow];
      fast = nums[nums[fast]];
    }
//@step
    slow = 0;
    while (slow != fast) {
      slow = nums[slow];
      fast = nums[fast];
    }
    return slow;
  }
}`,
      typescript: `//@step
function findDuplicate(nums: number[]): number {
  let slow = nums[0];
  let fast = nums[nums[0]];
//@step
  while (slow !== fast) {
    slow = nums[slow];
    fast = nums[nums[fast]];
  }
//@step
  slow = 0;
  while (slow !== fast) {
    slow = nums[slow];
    fast = nums[fast];
  }
  return slow;
}`
    },
    'With [1, 3, 4, 2, 2]: following values, 0 goes to 1, then 3, then 2, then 4, then 2 again, so the loop starts at 2. Floyd\'s two phases land on 2.',
    'O(n) time. O(1) space.',
    [{ args: [[1, 3, 4, 2, 2]], expected: 2 }, { args: [[3, 1, 3, 4, 2]], expected: 3 }, { args: [[3, 3, 3, 3, 3]], expected: 3 }]),
  problem('sqrt-x', 'Sqrt(x)', 'easy',
    'Given a non-negative integer x, return the square root of x rounded down to the nearest integer, without a built-in power or square root function. Example: x = 4 returns 2. Example: x = 8 returns 2.',
    { dart: 'class Solution { int mySqrt(int x) }', typescript: 'function mySqrt(x: number): number' },
    'mySqrt',
    'Compute the whole-number part of the square root: for 8 it is 2, because 2 squared is 4 and 3 squared is 9.',
    'Binary search for the largest number whose square is at most x.',
    [
      { what: 'open the method with a search range from 0 to x', say: 'The answer is somewhere in that range.' },
      { what: 'move the range up when the middle squared fits, down when it is too big', say: 'I keep the last middle that fit.' },
      { what: 'return the best value found', say: 'log x steps.' }
    ],
    {
      dart: `//@step
class Solution {
  int mySqrt(int x) {
    var low = 0;
    var high = x;
    var best = 0;
//@step
    while (low <= high) {
      final mid = (low + high) ~/ 2;
      if (mid * mid <= x) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
//@step
    return best;
  }
}`,
      typescript: `//@step
function mySqrt(x: number): number {
  let low = 0;
  let high = x;
  let best = 0;
//@step
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (mid * mid <= x) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
//@step
  return best;
}`
    },
    'With 8: the middle 4 squared is 16, too big; 1 squared fits; 2 squared, 4, fits; 3 squared, 9, does not. The answer is 2.',
    'O(log x) time. O(1) space.',
    [{ args: [4], expected: 2 }, { args: [8], expected: 2 }, { args: [0], expected: 0 }, { args: [2147395599], expected: 46339 }]),
  problem('plus-one', 'Plus One', 'easy',
    'Given a large integer as an array of digits, most significant first, add one and return the resulting digits. Example: digits = [1,2,3] returns [1,2,4]. Example: digits = [9,9] returns [1,0,0].',
    { dart: 'class Solution { List<int> plusOne(List<int> digits) }', typescript: 'function plusOne(digits: number[]): number[]' },
    'plusOne',
    'Add one to a number stored digit by digit: [9, 9] becomes [1, 0, 0].',
    'Walk from the last digit. A digit below 9 just goes up by one and we are done. A 9 becomes 0 and the carry moves left. If every digit was 9, put a 1 in front.',
    [
      { what: 'open the method and copy the digits', say: 'I avoid changing the input.' },
      { what: 'from the right, increase the first digit below 9 and return, turning 9s into 0s along the way', say: 'That is exactly how carrying works.' },
      { what: 'if all digits were 9, return a 1 followed by the zeros', say: 'Linear time.' }
    ],
    {
      dart: `//@step
class Solution {
  List<int> plusOne(List<int> digits) {
    final out = [...digits];
//@step
    for (var i = out.length - 1; i >= 0; i--) {
      if (out[i] < 9) {
        out[i]++;
        return out;
      }
      out[i] = 0;
    }
//@step
    return [1, ...out];
  }
}`,
      typescript: `//@step
function plusOne(digits: number[]): number[] {
  const out = [...digits];
//@step
  for (let i = out.length - 1; i >= 0; i--) {
    if (out[i] < 9) {
      out[i]++;
      return out;
    }
    out[i] = 0;
  }
//@step
  return [1, ...out];
}`
    },
    'With [9, 9]: both 9s become 0, and with no digit left to increase, a 1 goes in front: [1, 0, 0].',
    'O(n) time. O(n) space for the copy.',
    [{ args: [[1, 2, 3]], expected: [1, 2, 4] }, { args: [[9, 9]], expected: [1, 0, 0] }, { args: [[0]], expected: [1] }]),
  problem('add-binary', 'Add Binary', 'easy',
    'Given two binary strings a and b, return their sum as a binary string. Example: a = "11", b = "1" returns "100". Example: a = "1010", b = "1011" returns "10101".',
    { dart: 'class Solution { String addBinary(String a, String b) }', typescript: 'function addBinary(a: string, b: string): string' },
    'addBinary',
    'Add two binary numbers given as strings: "11" plus "1" is "100".',
    'Add from the right with a carry, like decimal addition but in base 2: the digit written is the sum modulo 2 and the carry is the sum divided by 2. Build the result in reverse and flip it.',
    [
      { what: 'open the method with pointers at the end of both strings and a carry', say: 'Binary addition goes right to left too.' },
      { what: 'while digits or a carry remain, add them and record the last bit', say: 'Sum modulo 2 is the digit, sum divided by 2 is the carry.' },
      { what: 'reverse the collected bits and return them', say: 'Linear time.' }
    ],
    {
      dart: `//@step
class Solution {
  String addBinary(String a, String b) {
    final out = StringBuffer();
    var i = a.length - 1;
    var j = b.length - 1;
    var carry = 0;
//@step
    final bits = <int>[];
    while (i >= 0 || j >= 0 || carry > 0) {
      var sum = carry;
      if (i >= 0) sum += a.codeUnitAt(i--) - 48;
      if (j >= 0) sum += b.codeUnitAt(j--) - 48;
      bits.add(sum % 2);
      carry = sum ~/ 2;
    }
//@step
    for (final bit in bits.reversed) {
      out.write(bit);
    }
    return out.toString();
  }
}`,
      typescript: `//@step
function addBinary(a: string, b: string): string {
  let i = a.length - 1;
  let j = b.length - 1;
  let carry = 0;
//@step
  const bits: number[] = [];
  while (i >= 0 || j >= 0 || carry > 0) {
    let sum = carry;
    if (i >= 0) sum += Number(a[i--]);
    if (j >= 0) sum += Number(b[j--]);
    bits.push(sum % 2);
    carry = Math.floor(sum / 2);
  }
//@step
  return bits.reverse().join('');
}`
    },
    'With "11" and "1": 1 + 1 is 2, write 0 carry 1; 1 + 1 is 2, write 0 carry 1; the carry writes 1. Reversed: "100".',
    'O(max(m, n)) time and space.',
    [{ args: ['11', '1'], expected: '100' }, { args: ['1010', '1011'], expected: '10101' }, { args: ['0', '0'], expected: '0' }]),
  problem('pascals-triangle', 'Pascal\'s Triangle', 'easy',
    'Given an integer numRows, return the first numRows rows of Pascal\'s triangle, where each number is the sum of the two numbers directly above it. Example: numRows = 5 returns [[1],[1,1],[1,2,1],[1,3,3,1],[1,4,6,4,1]].',
    { dart: 'class Solution { List<List<int>> generate(int numRows) }', typescript: 'function generate(numRows: number): number[][]' },
    'generate',
    'Build the first rows of Pascal\'s triangle, where each inner number is the sum of the two above it.',
    'Each row starts and ends with 1. Every inner value is the sum of the two neighbouring values in the previous row.',
    [
      { what: 'open the method with an empty list of rows', say: 'Each row is built from the one before.' },
      { what: 'for each row, start with ones and fill the inner values from the previous row', say: 'Value j is the previous row\'s j minus 1 plus j.' },
      { what: 'return the rows', say: 'Quadratic in the number of rows, the size of the output.' }
    ],
    {
      dart: `//@step
class Solution {
  List<List<int>> generate(int numRows) {
    final rows = <List<int>>[];
//@step
    for (var r = 0; r < numRows; r++) {
      final row = List<int>.filled(r + 1, 1);
      for (var j = 1; j < r; j++) {
        row[j] = rows[r - 1][j - 1] + rows[r - 1][j];
      }
      rows.add(row);
    }
//@step
    return rows;
  }
}`,
      typescript: `//@step
function generate(numRows: number): number[][] {
  const rows: number[][] = [];
//@step
  for (let r = 0; r < numRows; r++) {
    const row: number[] = new Array(r + 1).fill(1);
    for (let j = 1; j < r; j++) row[j] = rows[r - 1][j - 1] + rows[r - 1][j];
    rows.push(row);
  }
//@step
  return rows;
}`
    },
    'Row 3 is [1, 3, 3, 1]: its inner values are 1 + 2 and 2 + 1 from row 2, [1, 2, 1].',
    'O(numRows squared) time and space.',
    [{ args: [5], expected: [[1], [1, 1], [1, 2, 1], [1, 3, 3, 1], [1, 4, 6, 4, 1]] }, { args: [1], expected: [[1]] }]),
  problem('first-unique-character', 'First Unique Character in a String', 'easy',
    'Given a string s, return the index of the first character that does not repeat, or -1 if there is none. Example: s = "leetcode" returns 0. Example: s = "loveleetcode" returns 2. Example: s = "aabb" returns -1.',
    { dart: 'class Solution { int firstUniqChar(String s) }', typescript: 'function firstUniqChar(s: string): number' },
    'firstUniqChar',
    'Find the position of the first letter that appears only once.',
    'Count every character in one pass, then walk the string again and return the first index whose character has a count of one.',
    [
      { what: 'open the method and count each character', say: 'Two passes are enough.' },
      { what: 'walk the string and return the first index with a count of one', say: 'The second pass keeps the original order.' },
      { what: 'return -1 if none is found', say: 'Linear time.' }
    ],
    {
      dart: `//@step
class Solution {
  int firstUniqChar(String s) {
    final counts = <String, int>{};
    for (final c in s.split('')) {
      counts[c] = (counts[c] ?? 0) + 1;
    }
//@step
    for (var i = 0; i < s.length; i++) {
      if (counts[s[i]] == 1) return i;
    }
//@step
    return -1;
  }
}`,
      typescript: `//@step
function firstUniqChar(s: string): number {
  const counts = new Map<string, number>();
  for (const c of s) counts.set(c, (counts.get(c) ?? 0) + 1);
//@step
  for (let i = 0; i < s.length; i++) if (counts.get(s[i]) === 1) return i;
//@step
  return -1;
}`
    },
    'With "loveleetcode": l, o and e repeat, and v at index 2 appears once, so the answer is 2.',
    'O(n) time. O(1) space for a fixed alphabet.',
    [{ args: ['leetcode'], expected: 0 }, { args: ['loveleetcode'], expected: 2 }, { args: ['aabb'], expected: -1 }]),
  problem('isomorphic-strings', 'Isomorphic Strings', 'easy',
    'Given two strings s and t, return true if they are isomorphic: characters of s can be replaced to get t, with every occurrence of a character replaced by the same character and no two characters mapping to the same one. ' +
      'Example: s = "egg", t = "add" returns true. Example: s = "foo", t = "bar" returns false. Example: s = "paper", t = "title" returns true.',
    { dart: 'class Solution { bool isIsomorphic(String s, String t) }', typescript: 'function isIsomorphic(s: string, t: string): boolean' },
    'isIsomorphic',
    'Check whether one word can be turned into the other by consistently swapping letters: "egg" and "add" have the same pattern.',
    'Keep two maps, s to t and t to s. For each position, both mappings must either be new or agree with what was seen before; that guarantees a one-to-one replacement.',
    [
      { what: 'open the method with two maps', say: 'Two directions stop two letters mapping to the same one.' },
      { what: 'for each position, return false if either existing mapping disagrees, else record both', say: 'Consistency in both directions means the same pattern.' },
      { what: 'return true', say: 'Linear time.' }
    ],
    {
      dart: `//@step
class Solution {
  bool isIsomorphic(String s, String t) {
    final st = <String, String>{};
    final ts = <String, String>{};
//@step
    for (var i = 0; i < s.length; i++) {
      final a = s[i];
      final b = t[i];
      if ((st[a] ?? b) != b || (ts[b] ?? a) != a) return false;
      st[a] = b;
      ts[b] = a;
    }
//@step
    return true;
  }
}`,
      typescript: `//@step
function isIsomorphic(s: string, t: string): boolean {
  const st = new Map<string, string>();
  const ts = new Map<string, string>();
//@step
  for (let i = 0; i < s.length; i++) {
    const a = s[i];
    const b = t[i];
    if ((st.get(a) ?? b) !== b || (ts.get(b) ?? a) !== a) return false;
    st.set(a, b);
    ts.set(b, a);
  }
//@step
  return true;
}`
    },
    'With "foo" and "bar": f maps to b and o to a, but the second o would need to map to r, which disagrees, so false.',
    'O(n) time. O(1) space for a fixed alphabet.',
    [{ args: ['egg', 'add'], expected: true }, { args: ['foo', 'bar'], expected: false }, { args: ['paper', 'title'], expected: true }, { args: ['badc', 'baba'], expected: false }]),
  problem('contains-duplicate-ii', 'Contains Duplicate II', 'easy',
    'Given an integer array nums and an integer k, return true if there are two distinct indexes i and j with nums[i] == nums[j] and abs(i - j) <= k. Example: nums = [1,2,3,1], k = 3 returns true. Example: nums = [1,2,3,1,2,3], k = 2 returns false.',
    { dart: 'class Solution { bool containsNearbyDuplicate(List<int> nums, int k) }', typescript: 'function containsNearbyDuplicate(nums: number[], k: number): boolean' },
    'containsNearbyDuplicate',
    'Check whether the same value appears twice within k positions of each other.',
    'Remember the last index where each value was seen. When a value appears again, check whether the gap to its last position is at most k.',
    [
      { what: 'open the method with a map from value to its last index', say: 'The most recent position is the closest one.' },
      { what: 'for each index, return true if the value was seen within k, then update its last index', say: 'Updating keeps the nearest earlier position.' },
      { what: 'return false', say: 'Linear time.' }
    ],
    {
      dart: `//@step
class Solution {
  bool containsNearbyDuplicate(List<int> nums, int k) {
    final last = <int, int>{};
//@step
    for (var i = 0; i < nums.length; i++) {
      final prev = last[nums[i]];
      if (prev != null && i - prev <= k) return true;
      last[nums[i]] = i;
    }
//@step
    return false;
  }
}`,
      typescript: `//@step
function containsNearbyDuplicate(nums: number[], k: number): boolean {
  const last = new Map<number, number>();
//@step
  for (let i = 0; i < nums.length; i++) {
    const prev = last.get(nums[i]);
    if (prev !== undefined && i - prev <= k) return true;
    last.set(nums[i], i);
  }
//@step
  return false;
}`
    },
    'With [1, 2, 3, 1] and k = 3: the second 1 at index 3 is 3 away from index 0, within k, so true.',
    'O(n) time. O(n) space.',
    [{ args: [[1, 2, 3, 1], 3], expected: true }, { args: [[1, 0, 1, 1], 1], expected: true }, { args: [[1, 2, 3, 1, 2, 3], 2], expected: false }]),
  problem('summary-ranges', 'Summary Ranges', 'easy',
    'Given a sorted array of unique integers nums, return the smallest list of ranges that covers all the numbers exactly, written "a->b" for a range and "a" for a single number. ' +
      'Example: nums = [0,1,2,4,5,7] returns ["0->2","4->5","7"]. Example: nums = [0,2,3,4,6,8,9] returns ["0","2->4","6","8->9"].',
    { dart: 'class Solution { List<String> summaryRanges(List<int> nums) }', typescript: 'function summaryRanges(nums: number[]): string[]' },
    'summaryRanges',
    'Describe a sorted list as runs of consecutive numbers: 0, 1, 2 becomes "0->2".',
    'Walk the list and extend the current run while the next number is exactly one more. When a run ends, write it as a single number or as start->end.',
    [
      { what: 'open the method with the result and an index', say: 'Each outer step consumes one run.' },
      { what: 'from each start, move forward while numbers are consecutive, then write the run', say: 'A run of one is written as just the number.' },
      { what: 'return the list', say: 'Linear time.' }
    ],
    {
      dart: `//@step
class Solution {
  List<String> summaryRanges(List<int> nums) {
    final result = <String>[];
    var i = 0;
//@step
    while (i < nums.length) {
      final start = nums[i];
      while (i + 1 < nums.length && nums[i + 1] == nums[i] + 1) {
        i++;
      }
      result.add(start == nums[i] ? '\$start' : '\$start->\${nums[i]}');
      i++;
    }
//@step
    return result;
  }
}`,
      typescript: `//@step
function summaryRanges(nums: number[]): string[] {
  const result: string[] = [];
  let i = 0;
//@step
  while (i < nums.length) {
    const start = nums[i];
    while (i + 1 < nums.length && nums[i + 1] === nums[i] + 1) i++;
    result.push(start === nums[i] ? String(start) : start + '->' + nums[i]);
    i++;
  }
//@step
  return result;
}`
    },
    'With [0, 1, 2, 4, 5, 7]: 0 to 2 is one run, 4 to 5 another, and 7 stands alone: ["0->2", "4->5", "7"].',
    'O(n) time. O(1) extra space besides the output.',
    [{ args: [[0, 1, 2, 4, 5, 7]], expected: ['0->2', '4->5', '7'] }, { args: [[0, 2, 3, 4, 6, 8, 9]], expected: ['0', '2->4', '6', '8->9'] }, { args: [[]], expected: [] }]),
  problem('best-time-to-buy-and-sell-stock-ii', 'Best Time to Buy and Sell Stock II', 'medium',
    'Given an array prices of a stock price per day, you may buy and sell as many times as you like but hold at most one share at a time (you can sell and buy on the same day). Return the maximum profit. ' +
      'Example: prices = [7,1,5,3,6,4] returns 7. Example: prices = [1,2,3,4,5] returns 4.',
    { dart: 'class Solution { int maxProfit(List<int> prices) }', typescript: 'function maxProfit(prices: number[]): number' },
    'maxProfit',
    'Make as much as possible trading as often as you like, holding at most one share at a time.',
    'Every rise from one day to the next can be captured, by buying the day before and selling that day. So the answer is the sum of all positive day-to-day differences.',
    [
      { what: 'open the method with a total profit of zero', say: 'Each upward step is free money.' },
      { what: 'for each day, add the rise from the previous day when positive', say: 'Downward steps are simply skipped.' },
      { what: 'return the total', say: 'Linear time.' }
    ],
    {
      dart: `//@step
class Solution {
  int maxProfit(List<int> prices) {
    var profit = 0;
//@step
    for (var i = 1; i < prices.length; i++) {
      if (prices[i] > prices[i - 1]) profit += prices[i] - prices[i - 1];
    }
//@step
    return profit;
  }
}`,
      typescript: `//@step
function maxProfit(prices: number[]): number {
  let profit = 0;
//@step
  for (let i = 1; i < prices.length; i++) profit += Math.max(0, prices[i] - prices[i - 1]);
//@step
  return profit;
}`
    },
    'With [7, 1, 5, 3, 6, 4]: the rises are 1 to 5, worth 4, and 3 to 6, worth 3. Total 7.',
    'O(n) time. O(1) space.',
    [{ args: [[7, 1, 5, 3, 6, 4]], expected: 7 }, { args: [[1, 2, 3, 4, 5]], expected: 4 }, { args: [[7, 6, 4, 3, 1]], expected: 0 }])
];
