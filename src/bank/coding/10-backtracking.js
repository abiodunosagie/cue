// Backtracking: build a choice, explore, undo, try the next one.
module.exports = [
  {
    id: 'subsets',
    title: 'Subsets',
    level: 'medium',
    statement: 'Given an integer array nums of unique elements, return all possible subsets (the power set), without duplicates, in any order. ' +
      'Example: nums = [1,2,3] returns [[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]. Example: nums = [0] returns [[],[0]].',
    signature: { dart: 'class Solution { List<List<int>> subsets(List<int> nums) }', typescript: 'function subsets(nums: number[]): number[][]' },
    fn: 'subsets',
    compare: 'nested',
    asks: 'List every possible selection of the numbers, including none and all: for [1, 2] that is [], [1], [2] and [1, 2].',
    idea: 'For each number we either take it or skip it. Backtracking walks those choices: at each index, record the current pick as a subset, then try adding each later number, explore, and remove it again.',
    where: { dart: 'the Solution class, replacing the subsets method.', typescript: 'the subsets function, replacing its body.' },
    steps: [
      { what: 'open the method with the result, the current pick and a recursive helper starting at an index', say: 'The current pick grows and shrinks as I explore.' },
      { what: 'in the helper, save a copy of the pick, then for each later number add it, recurse and remove it', say: 'Adding, exploring and undoing is the backtracking pattern.' },
      { what: 'start at index 0 and return the result', say: 'There are 2 to the n subsets, so that is the cost.' }
    ],
    code: {
      dart: `//@step
class Solution {
  List<List<int>> subsets(List<int> nums) {
    final result = <List<int>>[];
    final pick = <int>[];
    void explore(int start) {
//@step
      result.add([...pick]);
      for (var i = start; i < nums.length; i++) {
        pick.add(nums[i]);
        explore(i + 1);
        pick.removeLast();
      }
    }
//@step
    explore(0);
    return result;
  }
}`,
      typescript: `//@step
function subsets(nums: number[]): number[][] {
  const result: number[][] = [];
  const pick: number[] = [];
  const explore = (start: number): void => {
//@step
    result.push([...pick]);
    for (let i = start; i < nums.length; i++) {
      pick.push(nums[i]);
      explore(i + 1);
      pick.pop();
    }
  };
//@step
  explore(0);
  return result;
}`
    },
    check: 'With [1, 2]: the empty pick is saved, then 1 is added and saved as [1], then 2 is added to make [1, 2]. Backing out, 2 alone is tried and saved as [2]. Four subsets.',
    complexity: 'O(n times 2 to the n) time and output size. O(n) recursion depth.',
    tests: [
      { args: [[1, 2, 3]], expected: [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]] },
      { args: [[0]], expected: [[], [0]] }
    ]
  },
  {
    id: 'subsets-ii',
    title: 'Subsets II',
    level: 'medium',
    statement: 'Given an integer array nums that may contain duplicates, return all possible subsets without duplicate subsets, in any order. ' +
      'Example: nums = [1,2,2] returns [[],[1],[1,2],[1,2,2],[2],[2,2]].',
    signature: { dart: 'class Solution { List<List<int>> subsetsWithDup(List<int> nums) }', typescript: 'function subsetsWithDup(nums: number[]): number[][]' },
    fn: 'subsetsWithDup',
    compare: 'nested',
    asks: 'List every selection of the numbers, but never the same selection twice when values repeat.',
    idea: 'Sort first, so equal values are next to each other. In the backtracking loop, skip a value if it equals the previous one at the same level, because picking it would recreate a subset already made.',
    where: { dart: 'the Solution class, replacing the subsetsWithDup method.', typescript: 'the subsetsWithDup function, replacing its body.' },
    steps: [
      { what: 'open the method, sort the numbers, and set up the result and current pick', say: 'Sorting groups the duplicates.' },
      { what: 'in the helper, save the pick, then try each later number, skipping one equal to the previous at this level', say: 'Skipping same-level duplicates removes repeated subsets.' },
      { what: 'start at index 0 and return the result', say: 'Same cost as the plain version in the worst case.' }
    ],
    code: {
      dart: `//@step
class Solution {
  List<List<int>> subsetsWithDup(List<int> nums) {
    final a = [...nums]..sort();
    final result = <List<int>>[];
    final pick = <int>[];
    void explore(int start) {
//@step
      result.add([...pick]);
      for (var i = start; i < a.length; i++) {
        if (i > start && a[i] == a[i - 1]) continue;
        pick.add(a[i]);
        explore(i + 1);
        pick.removeLast();
      }
    }
//@step
    explore(0);
    return result;
  }
}`,
      typescript: `//@step
function subsetsWithDup(nums: number[]): number[][] {
  const a = [...nums].sort((x, y) => x - y);
  const result: number[][] = [];
  const pick: number[] = [];
  const explore = (start: number): void => {
//@step
    result.push([...pick]);
    for (let i = start; i < a.length; i++) {
      if (i > start && a[i] === a[i - 1]) continue;
      pick.push(a[i]);
      explore(i + 1);
      pick.pop();
    }
  };
//@step
  explore(0);
  return result;
}`
    },
    check: 'With [1, 2, 2]: at the top level, the second 2 is skipped because it equals the first, so [2] is made only once, and [2, 2] comes from going deeper. Six subsets in total.',
    complexity: 'O(n times 2 to the n) time in the worst case. O(n) recursion depth.',
    tests: [
      { args: [[1, 2, 2]], expected: [[], [1], [1, 2], [1, 2, 2], [2], [2, 2]] },
      { args: [[0]], expected: [[], [0]] }
    ]
  },
  {
    id: 'permutations',
    title: 'Permutations',
    level: 'medium',
    statement: 'Given an array nums of distinct integers, return all possible permutations, in any order. ' +
      'Example: nums = [1,2,3] returns [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]. Example: nums = [0,1] returns [[0,1],[1,0]].',
    signature: { dart: 'class Solution { List<List<int>> permute(List<int> nums) }', typescript: 'function permute(nums: number[]): number[][]' },
    fn: 'permute',
    compare: 'sorted',
    asks: 'List every ordering of the numbers: [0, 1] gives [0, 1] and [1, 0].',
    idea: 'Build the order one position at a time. Keep track of which numbers are used. At each step try every unused number, recurse, then mark it unused again.',
    where: { dart: 'the Solution class, replacing the permute method.', typescript: 'the permute function, replacing its body.' },
    steps: [
      { what: 'open the method with the result, the current order and a used flag per number', say: 'The flags stop a number appearing twice.' },
      { what: 'when the order is full, save it; otherwise try each unused number, recurse and undo', say: 'Undo means removing it and clearing its flag.' },
      { what: 'start the recursion and return the result', say: 'n factorial permutations, each of length n.' }
    ],
    code: {
      dart: `//@step
class Solution {
  List<List<int>> permute(List<int> nums) {
    final result = <List<int>>[];
    final order = <int>[];
    final used = List<bool>.filled(nums.length, false);
    void explore() {
//@step
      if (order.length == nums.length) {
        result.add([...order]);
        return;
      }
      for (var i = 0; i < nums.length; i++) {
        if (used[i]) continue;
        used[i] = true;
        order.add(nums[i]);
        explore();
        order.removeLast();
        used[i] = false;
      }
    }
//@step
    explore();
    return result;
  }
}`,
      typescript: `//@step
function permute(nums: number[]): number[][] {
  const result: number[][] = [];
  const order: number[] = [];
  const used: boolean[] = new Array(nums.length).fill(false);
  const explore = (): void => {
//@step
    if (order.length === nums.length) {
      result.push([...order]);
      return;
    }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      order.push(nums[i]);
      explore();
      order.pop();
      used[i] = false;
    }
  };
//@step
  explore();
  return result;
}`
    },
    check: 'With [1, 2, 3]: picking 1 first, then 2 then 3 gives [1, 2, 3]; undoing 2 and picking 3 then 2 gives [1, 3, 2]. Then 2 first, then 3 first, six orders in all.',
    complexity: 'O(n times n factorial) time. O(n) recursion depth.',
    tests: [
      { args: [[1, 2, 3]], expected: [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]] },
      { args: [[0, 1]], expected: [[0, 1], [1, 0]] },
      { args: [[1]], expected: [[1]] }
    ]
  },
  {
    id: 'combination-sum',
    title: 'Combination Sum',
    level: 'medium',
    statement: 'Given an array of distinct positive integers candidates and a target, return all unique combinations of candidates that sum to target. The same number may be used any number of times; order does not matter. ' +
      'Example: candidates = [2,3,6,7], target = 7 returns [[2,2,3],[7]]. Example: candidates = [2,3,5], target = 8 returns [[2,2,2,2],[2,3,3],[3,5]].',
    signature: { dart: 'class Solution { List<List<int>> combinationSum(List<int> candidates, int target) }', typescript: 'function combinationSum(candidates: number[], target: number): number[][]' },
    fn: 'combinationSum',
    compare: 'nested',
    asks: 'Find every way to add up to the target using the numbers as often as you like: 7 is 2 + 2 + 3, or just 7.',
    idea: 'Backtrack with a start index so combinations are built in non-decreasing order, which prevents the same set in a different order. ' +
      'Because a number can repeat, the recursive call stays at the same index. Stop a branch when the remaining target goes below zero.',
    where: { dart: 'the Solution class, replacing the combinationSum method.', typescript: 'the combinationSum function, replacing its body.' },
    steps: [
      { what: 'open the method with the result, the current pick and a helper taking a start index and the remaining target', say: 'The start index keeps combinations in one order.' },
      { what: 'save the pick when the remaining target is zero; otherwise try each candidate from start that still fits', say: 'Staying at the same index allows reusing a number.' },
      { what: 'start at index 0 with the full target and return the result', say: 'Exponential in the worst case, but pruned by the target.' }
    ],
    code: {
      dart: `//@step
class Solution {
  List<List<int>> combinationSum(List<int> candidates, int target) {
    final result = <List<int>>[];
    final pick = <int>[];
    void explore(int start, int remaining) {
//@step
      if (remaining == 0) {
        result.add([...pick]);
        return;
      }
      for (var i = start; i < candidates.length; i++) {
        if (candidates[i] > remaining) continue;
        pick.add(candidates[i]);
        explore(i, remaining - candidates[i]);
        pick.removeLast();
      }
    }
//@step
    explore(0, target);
    return result;
  }
}`,
      typescript: `//@step
function combinationSum(candidates: number[], target: number): number[][] {
  const result: number[][] = [];
  const pick: number[] = [];
  const explore = (start: number, remaining: number): void => {
//@step
    if (remaining === 0) {
      result.push([...pick]);
      return;
    }
    for (let i = start; i < candidates.length; i++) {
      if (candidates[i] > remaining) continue;
      pick.push(candidates[i]);
      explore(i, remaining - candidates[i]);
      pick.pop();
    }
  };
//@step
  explore(0, target);
  return result;
}`
    },
    check: 'With [2, 3, 6, 7] and 7: 2, 2, 3 reaches 0, saved. Other paths starting with 2 overshoot or run out. 3 then 3 leaves 1, no fit. 7 alone reaches 0, saved. Result [[2, 2, 3], [7]].',
    complexity: 'Exponential in the worst case, bounded by the number of combinations. O(target) recursion depth.',
    tests: [
      { args: [[2, 3, 6, 7], 7], expected: [[2, 2, 3], [7]] },
      { args: [[2, 3, 5], 8], expected: [[2, 2, 2, 2], [2, 3, 3], [3, 5]] },
      { args: [[2], 1], expected: [] }
    ]
  },
  {
    id: 'word-search',
    title: 'Word Search',
    level: 'medium',
    statement: 'Given an m x n grid of characters board and a string word, return true if word can be formed from letters of sequentially adjacent cells, horizontally or vertically, using each cell at most once. ' +
      'Example: board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCCED" returns true; word = "ABCB" returns false.',
    signature: { dart: 'class Solution { bool exist(List<List<String>> board, String word) }', typescript: 'function exist(board: string[][], word: string): boolean' },
    fn: 'exist',
    asks: 'Check whether the word can be traced through neighbouring cells of the grid without reusing a cell.',
    idea: 'Try every cell as a start. From a cell, depth-first search matches the next letter in the four directions. Mark a cell as used while it is on the current path, and unmark it when backing out.',
    where: { dart: 'the Solution class, replacing the exist method.', typescript: 'the exist function, replacing its body.' },
    steps: [
      { what: 'open the method with a search helper taking a cell and the index of the letter to match', say: 'The helper says whether the rest of the word can be traced from here.' },
      { what: 'in the helper, stop on a mismatch or out of bounds, mark the cell, try the four neighbours, then restore it', say: 'Marking prevents reusing a cell; restoring lets other paths use it.' },
      { what: 'try every cell as a start and return true on the first success', say: 'Worst case m times n times 4 to the length of the word.' }
    ],
    code: {
      dart: `//@step
class Solution {
  bool exist(List<List<String>> board, String word) {
    final rows = board.length;
    final cols = board[0].length;
    bool search(int r, int c, int i) {
      if (i == word.length) return true;
//@step
      if (r < 0 || c < 0 || r >= rows || c >= cols || board[r][c] != word[i]) return false;
      final saved = board[r][c];
      board[r][c] = '#';
      final found = search(r + 1, c, i + 1) || search(r - 1, c, i + 1) || search(r, c + 1, i + 1) || search(r, c - 1, i + 1);
      board[r][c] = saved;
      return found;
    }
//@step
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (search(r, c, 0)) return true;
      }
    }
    return false;
  }
}`,
      typescript: `//@step
function exist(board: string[][], word: string): boolean {
  const rows = board.length;
  const cols = board[0].length;
  const search = (r: number, c: number, i: number): boolean => {
    if (i === word.length) return true;
//@step
    if (r < 0 || c < 0 || r >= rows || c >= cols || board[r][c] !== word[i]) return false;
    const saved = board[r][c];
    board[r][c] = '#';
    const found = search(r + 1, c, i + 1) || search(r - 1, c, i + 1) || search(r, c + 1, i + 1) || search(r, c - 1, i + 1);
    board[r][c] = saved;
    return found;
  };
//@step
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (search(r, c, 0)) return true;
    }
  }
  return false;
}`
    },
    check: 'For "ABCCED": start at A top left, right to B and C, down to C, down to E, left to D. Every letter matched, so true. For "ABCB", the second B would need the B already used, so false.',
    complexity: 'O(m times n times 3 to the L) time, where L is the word length. O(L) recursion depth.',
    tests: [
      { args: [[['A', 'B', 'C', 'E'], ['S', 'F', 'C', 'S'], ['A', 'D', 'E', 'E']], 'ABCCED'], expected: true },
      { args: [[['A', 'B', 'C', 'E'], ['S', 'F', 'C', 'S'], ['A', 'D', 'E', 'E']], 'SEE'], expected: true },
      { args: [[['A', 'B', 'C', 'E'], ['S', 'F', 'C', 'S'], ['A', 'D', 'E', 'E']], 'ABCB'], expected: false }
    ]
  },
  {
    id: 'letter-combinations-phone',
    title: 'Letter Combinations of a Phone Number',
    level: 'medium',
    statement: 'Given a string of digits from 2 to 9, return all letter combinations the number could represent on a phone keypad (2 is abc, 3 is def, 4 is ghi, 5 is jkl, 6 is mno, 7 is pqrs, 8 is tuv, 9 is wxyz), in any order. ' +
      'Return an empty list for an empty string. Example: digits = "23" returns ["ad","ae","af","bd","be","bf","cd","ce","cf"].',
    signature: { dart: 'class Solution { List<String> letterCombinations(String digits) }', typescript: 'function letterCombinations(digits: string): string[]' },
    fn: 'letterCombinations',
    compare: 'sorted',
    asks: 'List every word you could type with those phone keys: "23" gives nine combinations from "ad" to "cf".',
    idea: 'Backtrack over the digits: for each digit, try each of its letters, append it and move to the next digit. When every digit has a letter, save the string.',
    where: { dart: 'the Solution class, replacing the letterCombinations method.', typescript: 'the letterCombinations function, replacing its body.' },
    steps: [
      { what: 'open the method with the keypad letters and an empty result for empty input', say: 'An empty number has no combinations.' },
      { what: 'recurse over the digits, trying each letter of the current digit', say: 'Each level of recursion fills one position.' },
      { what: 'save the string when it has one letter per digit, then return the result', say: 'Up to 4 to the n combinations.' }
    ],
    code: {
      dart: `//@step
class Solution {
  List<String> letterCombinations(String digits) {
    const keys = ['', '', 'abc', 'def', 'ghi', 'jkl', 'mno', 'pqrs', 'tuv', 'wxyz'];
    final result = <String>[];
    if (digits.isEmpty) return result;
//@step
    void explore(int i, String current) {
      if (i == digits.length) {
        result.add(current);
        return;
      }
      for (final letter in keys[int.parse(digits[i])].split('')) {
        explore(i + 1, current + letter);
      }
    }
//@step
    explore(0, '');
    return result;
  }
}`,
      typescript: `//@step
function letterCombinations(digits: string): string[] {
  const keys = ['', '', 'abc', 'def', 'ghi', 'jkl', 'mno', 'pqrs', 'tuv', 'wxyz'];
  const result: string[] = [];
  if (digits.length === 0) return result;
//@step
  const explore = (i: number, current: string): void => {
    if (i === digits.length) {
      result.push(current);
      return;
    }
    for (const letter of keys[Number(digits[i])]) explore(i + 1, current + letter);
  };
//@step
  explore(0, '');
  return result;
}`
    },
    check: 'With "23": for a, the second digit gives d, e, f, so ad, ae, af. Then b and c do the same, nine strings in total.',
    complexity: 'O(4 to the n times n) time. O(n) recursion depth.',
    tests: [
      { args: ['23'], expected: ['ad', 'ae', 'af', 'bd', 'be', 'bf', 'cd', 'ce', 'cf'] },
      { args: [''], expected: [] },
      { args: ['2'], expected: ['a', 'b', 'c'] }
    ]
  },
  {
    id: 'palindrome-partitioning',
    title: 'Palindrome Partitioning',
    level: 'medium',
    statement: 'Given a string s, partition it so that every substring of the partition is a palindrome, and return all possible partitions, in any order. ' +
      'Example: s = "aab" returns [["a","a","b"],["aa","b"]]. Example: s = "a" returns [["a"]].',
    signature: { dart: 'class Solution { List<List<String>> partition(String s) }', typescript: 'function partition(s: string): string[][]' },
    fn: 'partition',
    compare: 'sorted',
    asks: 'Cut the string into pieces that each read the same backwards, in every possible way: "aab" can be a, a, b or aa, b.',
    idea: 'Backtrack over cut positions: from the current start, try every end; if that piece is a palindrome, add it and continue from the next position. When the start reaches the end, save the partition.',
    where: { dart: 'the Solution class, replacing the partition method.', typescript: 'the partition function, replacing its body.' },
    steps: [
      { what: 'open the method with a palindrome check, the result and the current pieces', say: 'Only palindrome pieces are allowed.' },
      { what: 'from each start, try every end, and if the piece is a palindrome, add it, recurse and remove it', say: 'Each valid first piece leads to the partitions of the rest.' },
      { what: 'save the pieces when the whole string is used, and return the result', say: 'Exponential in the worst case, as the output can be.' }
    ],
    code: {
      dart: `//@step
class Solution {
  List<List<String>> partition(String s) {
    bool isPal(int i, int j) {
      while (i < j) {
        if (s[i++] != s[j--]) return false;
      }
      return true;
    }
    final result = <List<String>>[];
    final pieces = <String>[];
//@step
    void explore(int start) {
      if (start == s.length) {
        result.add([...pieces]);
        return;
      }
      for (var end = start; end < s.length; end++) {
        if (!isPal(start, end)) continue;
        pieces.add(s.substring(start, end + 1));
        explore(end + 1);
        pieces.removeLast();
      }
    }
//@step
    explore(0);
    return result;
  }
}`,
      typescript: `//@step
function partition(s: string): string[][] {
  const isPal = (i: number, j: number): boolean => {
    while (i < j) if (s[i++] !== s[j--]) return false;
    return true;
  };
  const result: string[][] = [];
  const pieces: string[] = [];
//@step
  const explore = (start: number): void => {
    if (start === s.length) {
      result.push([...pieces]);
      return;
    }
    for (let end = start; end < s.length; end++) {
      if (!isPal(start, end)) continue;
      pieces.push(s.substring(start, end + 1));
      explore(end + 1);
      pieces.pop();
    }
  };
//@step
  explore(0);
  return result;
}`
    },
    check: 'With "aab": cutting "a" then "a" then "b" works. Cutting "aa" then "b" works. "aab" itself is not a palindrome. Two partitions.',
    complexity: 'O(n times 2 to the n) time in the worst case. O(n) recursion depth.',
    tests: [
      { args: ['aab'], expected: [['a', 'a', 'b'], ['aa', 'b']] },
      { args: ['a'], expected: [['a']] }
    ]
  },
  {
    id: 'n-queens',
    title: 'N-Queens',
    level: 'hard',
    statement: 'Place n queens on an n x n chessboard so that no two attack each other (no shared row, column or diagonal). Return the number of distinct solutions. ' +
      'Example: n = 4 returns 2. Example: n = 1 returns 1. Example: n = 8 returns 92.',
    signature: { dart: 'class Solution { int totalNQueens(int n) }', typescript: 'function totalNQueens(n: number): number' },
    fn: 'totalNQueens',
    asks: 'Count the ways to put n queens on an n by n board so none can attack another: for a 4 by 4 board there are 2.',
    idea: 'Place one queen per row. For each row, try each column that is not attacked, tracking used columns and both diagonals in sets: cells on one diagonal share row minus column, on the other row plus column. Recurse to the next row and undo.',
    where: { dart: 'the Solution class, replacing the totalNQueens method.', typescript: 'the totalNQueens function, replacing its body.' },
    steps: [
      { what: 'open the method with sets for used columns and both diagonals', say: 'Those three sets tell me in constant time whether a cell is attacked.' },
      { what: 'for each row, try each safe column: mark it, recurse to the next row, then unmark it', say: 'Reaching row n means a full valid placement.' },
      { what: 'start at row 0 and return the count', say: 'Exponential, but pruning makes it fast for normal sizes.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int totalNQueens(int n) {
    final cols = <int>{};
    final diag = <int>{};
    final anti = <int>{};
    var count = 0;
//@step
    void place(int row) {
      if (row == n) {
        count++;
        return;
      }
      for (var c = 0; c < n; c++) {
        if (cols.contains(c) || diag.contains(row - c) || anti.contains(row + c)) continue;
        cols.add(c);
        diag.add(row - c);
        anti.add(row + c);
        place(row + 1);
        cols.remove(c);
        diag.remove(row - c);
        anti.remove(row + c);
      }
    }
//@step
    place(0);
    return count;
  }
}`,
      typescript: `//@step
function totalNQueens(n: number): number {
  const cols = new Set<number>();
  const diag = new Set<number>();
  const anti = new Set<number>();
  let count = 0;
//@step
  const place = (row: number): void => {
    if (row === n) {
      count++;
      return;
    }
    for (let c = 0; c < n; c++) {
      if (cols.has(c) || diag.has(row - c) || anti.has(row + c)) continue;
      cols.add(c);
      diag.add(row - c);
      anti.add(row + c);
      place(row + 1);
      cols.delete(c);
      diag.delete(row - c);
      anti.delete(row + c);
    }
  };
//@step
  place(0);
  return count;
}`
    },
    check: 'With n = 4: a queen in row 0, column 1 allows row 1 column 3, row 2 column 0 and row 3 column 2, one solution. The mirror image, starting at column 2, is the other. Answer 2.',
    complexity: 'O(n factorial) time in the worst case. O(n) space for the sets and recursion.',
    tests: [
      { args: [4], expected: 2 },
      { args: [1], expected: 1 },
      { args: [8], expected: 92 }
    ]
  }
];
