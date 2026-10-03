// Two pointers: walking from both ends, or a slow and a fast index.
module.exports = [
  {
    id: 'valid-palindrome',
    title: 'Valid Palindrome',
    level: 'easy',
    statement: 'Given a string s, return true if it is a palindrome after converting all uppercase letters to lowercase and removing every character that is not a letter or a digit. ' +
      'Example: s = "A man, a plan, a canal: Panama" returns true. Example: s = "race a car" returns false. An empty string counts as a palindrome.',
    signature: { dart: 'class Solution { bool isPalindrome(String s) }', typescript: 'function isPalindrome(s: string): boolean' },
    fn: 'isPalindrome',
    asks: 'Check whether the text reads the same both ways once we ignore case, spaces and punctuation: "A man, a plan, a canal: Panama" does.',
    idea: 'Put one pointer at each end. Skip anything that is not a letter or digit, compare the two characters in lowercase, and move both pointers inward. Any mismatch means false.',
    where: { dart: 'the Solution class, replacing the isPalindrome method.', typescript: 'the isPalindrome function, replacing its body.' },
    steps: [
      { what: 'open the method with a helper that says whether a character is a letter or digit, and two pointers at the ends', say: 'I compare from both ends, skipping characters that do not count.' },
      { what: 'move each pointer past characters that do not count, then compare the two in lowercase', say: 'If the two meaningful characters differ, it is not a palindrome.' },
      { what: 'move both pointers inward and return true when they meet', say: 'If they meet without a mismatch, it is a palindrome. Constant extra space.' }
    ],
    code: {
      dart: `//@step
class Solution {
  bool isPalindrome(String s) {
    bool keep(String c) => RegExp(r'[a-zA-Z0-9]').hasMatch(c);
    var i = 0;
    var j = s.length - 1;
    while (i < j) {
//@step
      if (!keep(s[i])) {
        i++;
        continue;
      }
      if (!keep(s[j])) {
        j--;
        continue;
      }
      if (s[i].toLowerCase() != s[j].toLowerCase()) return false;
//@step
      i++;
      j--;
    }
    return true;
  }
}`,
      typescript: `//@step
function isPalindrome(s: string): boolean {
  const keep = (c: string) => /[a-zA-Z0-9]/.test(c);
  let i = 0;
  let j = s.length - 1;
  while (i < j) {
//@step
    if (!keep(s[i])) { i++; continue; }
    if (!keep(s[j])) { j--; continue; }
    if (s[i].toLowerCase() !== s[j].toLowerCase()) return false;
//@step
    i++;
    j--;
  }
  return true;
}`
    },
    check: 'With "race a car": the ends r and r match, then a and a, c and c, then e against a after skipping the space, which differ, so the answer is false.',
    complexity: 'O(n) time, each character looked at once. O(1) extra space.',
    tests: [
      { args: ['A man, a plan, a canal: Panama'], expected: true },
      { args: ['race a car'], expected: false },
      { args: [' '], expected: true },
      { args: ['0P'], expected: false }
    ]
  },
  {
    id: 'two-sum-ii-sorted',
    title: 'Two Sum II - Input Array Is Sorted',
    level: 'medium',
    statement: 'Given a 1-indexed array numbers sorted in non-decreasing order, find two numbers that add up to target and return their indices, each plus one, as [index1, index2] with index1 < index2. ' +
      'There is exactly one solution, and only constant extra space may be used. Example: numbers = [2,7,11,15], target = 9 returns [1,2].',
    signature: { dart: 'class Solution { List<int> twoSum(List<int> numbers, int target) }', typescript: 'function twoSum(numbers: number[], target: number): number[]' },
    fn: 'twoSum',
    asks: 'In a sorted list, find the two numbers that add to the target and give their positions counting from 1: with [2, 7, 11, 15] and 9 that is [1, 2].',
    idea: 'Because the list is sorted, start with one pointer at each end. If the sum is too small, move the left pointer right to increase it; if too big, move the right pointer left. They meet the answer without extra memory.',
    where: { dart: 'the Solution class, replacing the twoSum method.', typescript: 'the twoSum function, replacing its body.' },
    steps: [
      { what: 'open the method with pointers at both ends', say: 'Sorted input means I can steer the sum by moving the ends.' },
      { what: 'while they have not met, return the positions plus one if the sum matches, else move one pointer', say: 'Too small, move left up; too big, move right down.' },
      { what: 'return an empty list as a fallback', say: 'A solution always exists, so this line is only for the compiler.' }
    ],
    code: {
      dart: `//@step
class Solution {
  List<int> twoSum(List<int> numbers, int target) {
    var i = 0;
    var j = numbers.length - 1;
//@step
    while (i < j) {
      final sum = numbers[i] + numbers[j];
      if (sum == target) return [i + 1, j + 1];
      if (sum < target) {
        i++;
      } else {
        j--;
      }
    }
//@step
    return [];
  }
}`,
      typescript: `//@step
function twoSum(numbers: number[], target: number): number[] {
  let i = 0;
  let j = numbers.length - 1;
//@step
  while (i < j) {
    const sum = numbers[i] + numbers[j];
    if (sum === target) return [i + 1, j + 1];
    if (sum < target) i++;
    else j--;
  }
//@step
  return [];
}`
    },
    check: 'With [2, 7, 11, 15] and 9: 2 plus 15 is 17, too big, so the right pointer moves to 11; 13 is too big, it moves to 7; 2 plus 7 is 9, so the answer is [1, 2].',
    complexity: 'O(n) time, each pointer moves at most n steps. O(1) space.',
    tests: [
      { args: [[2, 7, 11, 15], 9], expected: [1, 2] },
      { args: [[2, 3, 4], 6], expected: [1, 3] },
      { args: [[-1, 0], -1], expected: [1, 2] }
    ]
  },
  {
    id: 'three-sum',
    title: '3Sum',
    level: 'medium',
    statement: 'Given an integer array nums, return all unique triplets [a, b, c] of values at different indices such that a + b + c = 0. The answer must not contain duplicate triplets; order does not matter. ' +
      'Example: nums = [-1,0,1,2,-1,-4] returns [[-1,-1,2],[-1,0,1]]. Example: nums = [0,0,0] returns [[0,0,0]].',
    signature: { dart: 'class Solution { List<List<int>> threeSum(List<int> nums) }', typescript: 'function threeSum(nums: number[]): number[][]' },
    fn: 'threeSum',
    compare: 'nested',
    asks: 'Find every distinct group of three numbers that adds to zero: in [-1, 0, 1, 2, -1, -4] those are [-1, -1, 2] and [-1, 0, 1].',
    idea: 'Sort the numbers. Fix the first number, then find pairs after it that add up to its negative with two pointers from both ends. ' +
      'Skip repeated values for the first number and after each found triplet, so no triplet appears twice.',
    where: { dart: 'the Solution class, replacing the threeSum method.', typescript: 'the threeSum function, replacing its body.' },
    steps: [
      { what: 'open the method, sort the numbers and loop over each first number, skipping repeats', say: 'Sorting lets me use two pointers and skip duplicates easily.' },
      { what: 'move two pointers over the rest, steering the sum towards zero, and record matches', say: 'For a fixed first number this is two sum on a sorted list.' },
      { what: 'after a match, skip repeated values on both sides, then return the triplets', say: 'Skipping equal neighbours keeps every triplet unique.' }
    ],
    code: {
      dart: `//@step
class Solution {
  List<List<int>> threeSum(List<int> nums) {
    final a = [...nums]..sort();
    final result = <List<int>>[];
    for (var i = 0; i < a.length - 2; i++) {
      if (i > 0 && a[i] == a[i - 1]) continue;
//@step
      var lo = i + 1;
      var hi = a.length - 1;
      while (lo < hi) {
        final sum = a[i] + a[lo] + a[hi];
        if (sum < 0) {
          lo++;
        } else if (sum > 0) {
          hi--;
        } else {
          result.add([a[i], a[lo], a[hi]]);
//@step
          while (lo < hi && a[lo] == a[lo + 1]) lo++;
          while (lo < hi && a[hi] == a[hi - 1]) hi--;
          lo++;
          hi--;
        }
      }
    }
    return result;
  }
}`,
      typescript: `//@step
function threeSum(nums: number[]): number[][] {
  const a = [...nums].sort((x, y) => x - y);
  const result: number[][] = [];
  for (let i = 0; i < a.length - 2; i++) {
    if (i > 0 && a[i] === a[i - 1]) continue;
//@step
    let lo = i + 1;
    let hi = a.length - 1;
    while (lo < hi) {
      const sum = a[i] + a[lo] + a[hi];
      if (sum < 0) lo++;
      else if (sum > 0) hi--;
      else {
        result.push([a[i], a[lo], a[hi]]);
//@step
        while (lo < hi && a[lo] === a[lo + 1]) lo++;
        while (lo < hi && a[hi] === a[hi - 1]) hi--;
        lo++;
        hi--;
      }
    }
  }
  return result;
}`
    },
    check: 'Sorted, the list is [-4, -1, -1, 0, 1, 2]. With -4 first, no pair makes 4. With the first -1, the pointers find -1 with 2, then 0 with 1. The second -1 is skipped as a repeat. Answer [[-1, -1, 2], [-1, 0, 1]].',
    complexity: 'O(n squared) time: sorting is n log n, and for each first number the two pointers take linear time. O(1) extra space besides the output and sort.',
    tests: [
      { args: [[-1, 0, 1, 2, -1, -4]], expected: [[-1, -1, 2], [-1, 0, 1]] },
      { args: [[0, 1, 1]], expected: [] },
      { args: [[0, 0, 0, 0]], expected: [[0, 0, 0]] }
    ]
  },
  {
    id: 'container-with-most-water',
    title: 'Container With Most Water',
    level: 'medium',
    statement: 'Given an integer array height of n vertical lines, find two lines that together with the x-axis form a container holding the most water, and return that amount. ' +
      'The water held is the distance between the lines times the shorter line. Example: height = [1,8,6,2,5,4,8,3,7] returns 49. Example: height = [1,1] returns 1.',
    signature: { dart: 'class Solution { int maxArea(List<int> height) }', typescript: 'function maxArea(height: number[]): number' },
    fn: 'maxArea',
    asks: 'Pick two lines to hold the most water, where the amount is the gap between them times the shorter line: in the example, the lines of height 8 and 7 are 7 apart, giving 49.',
    idea: 'Start with the widest container, a pointer at each end. The shorter line limits the water, and moving the taller line inward can only make things worse, ' +
      'so always move the shorter one, hoping to find a taller line. Track the best area as you go.',
    where: { dart: 'the Solution class, replacing the maxArea method.', typescript: 'the maxArea function, replacing its body.' },
    steps: [
      { what: 'open the method with pointers at both ends and the best area so far', say: 'I start with the widest possible container.' },
      { what: 'while the pointers have not met, compute the area and move the pointer at the shorter line inward', say: 'The shorter side is the limit, so it is the only one worth replacing.' },
      { what: 'return the best area', say: 'One pass, so linear time.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int maxArea(List<int> height) {
    var i = 0;
    var j = height.length - 1;
    var best = 0;
//@step
    while (i < j) {
      final h = height[i] < height[j] ? height[i] : height[j];
      if (h * (j - i) > best) best = h * (j - i);
      if (height[i] < height[j]) {
        i++;
      } else {
        j--;
      }
    }
//@step
    return best;
  }
}`,
      typescript: `//@step
function maxArea(height: number[]): number {
  let i = 0;
  let j = height.length - 1;
  let best = 0;
//@step
  while (i < j) {
    best = Math.max(best, Math.min(height[i], height[j]) * (j - i));
    if (height[i] < height[j]) i++;
    else j--;
  }
//@step
  return best;
}`
    },
    check: 'With [1, 8, 6, 2, 5, 4, 8, 3, 7]: the ends give 1 times 8 = 8, then the left moves to 8. 8 against 7 at distance 7 gives 49, and no later pair beats it, so the answer is 49.',
    complexity: 'O(n) time, the pointers move n steps in total. O(1) space.',
    tests: [
      { args: [[1, 8, 6, 2, 5, 4, 8, 3, 7]], expected: 49 },
      { args: [[1, 1]], expected: 1 },
      { args: [[4, 3, 2, 1, 4]], expected: 16 }
    ]
  },
  {
    id: 'trapping-rain-water',
    title: 'Trapping Rain Water',
    level: 'hard',
    statement: 'Given n non-negative integers representing an elevation map where each bar has width 1, compute how much water is trapped after raining. ' +
      'Example: height = [0,1,0,2,1,0,1,3,2,1,2,1] returns 6. Example: height = [4,2,0,3,2,5] returns 9.',
    signature: { dart: 'class Solution { int trap(List<int> height) }', typescript: 'function trap(height: number[]): number' },
    fn: 'trap',
    asks: 'Work out how much rain sits between the bars: in [4, 2, 0, 3, 2, 5] the dips fill with 9 units of water.',
    idea: 'Water above a bar is the smaller of the tallest bar to its left and the tallest to its right, minus its own height. ' +
      'With two pointers from both ends, keep the highest wall seen on each side. Whichever side has the lower wall is decided: its water level is that wall, so add its water and move inward.',
    where: { dart: 'the Solution class, replacing the trap method.', typescript: 'the trap function, replacing its body.' },
    steps: [
      { what: 'open the method with pointers at both ends and the highest wall seen from each side', say: 'Each bar holds water up to the lower of its two tallest walls.' },
      { what: 'move the side with the lower wall inward, adding the water above that bar', say: 'The lower side is already limited by its own wall, so I can settle that bar now.' },
      { what: 'return the total', say: 'One pass and constant space, instead of two arrays of maximums.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int trap(List<int> height) {
    var i = 0;
    var j = height.length - 1;
    var leftMax = 0;
    var rightMax = 0;
    var water = 0;
//@step
    while (i < j) {
      if (height[i] < height[j]) {
        if (height[i] > leftMax) leftMax = height[i];
        water += leftMax - height[i];
        i++;
      } else {
        if (height[j] > rightMax) rightMax = height[j];
        water += rightMax - height[j];
        j--;
      }
    }
//@step
    return water;
  }
}`,
      typescript: `//@step
function trap(height: number[]): number {
  let i = 0;
  let j = height.length - 1;
  let leftMax = 0;
  let rightMax = 0;
  let water = 0;
//@step
  while (i < j) {
    if (height[i] < height[j]) {
      leftMax = Math.max(leftMax, height[i]);
      water += leftMax - height[i];
      i++;
    } else {
      rightMax = Math.max(rightMax, height[j]);
      water += rightMax - height[j];
      j--;
    }
  }
//@step
  return water;
}`
    },
    check: 'With [4, 2, 0, 3, 2, 5]: the right end 5 is taller, so the left side moves. Left max is 4; the bars 2, 0, 3 and 2 hold 2, 4, 1 and 2 units. Total 9.',
    complexity: 'O(n) time, one pass. O(1) space.',
    tests: [
      { args: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], expected: 6 },
      { args: [[4, 2, 0, 3, 2, 5]], expected: 9 },
      { args: [[]], expected: 0 }
    ]
  },
  {
    id: 'remove-duplicates-sorted-array',
    title: 'Remove Duplicates from Sorted Array',
    level: 'easy',
    statement: 'Given an integer array nums sorted in non-decreasing order, remove the duplicates in place so each unique value appears once, keeping their order, and return the number of unique values k. ' +
      'The first k slots of nums must hold the unique values. Example: nums = [1,1,2] returns 2 with nums starting [1,2]. Example: nums = [0,0,1,1,1,2,2,3,3,4] returns 5.',
    signature: { dart: 'class Solution { int removeDuplicates(List<int> nums) }', typescript: 'function removeDuplicates(nums: number[]): number' },
    fn: 'removeDuplicates',
    asks: 'Squash repeated values at the front of a sorted list and say how many unique values there are: [1, 1, 2] becomes [1, 2, ...] and the answer is 2.',
    idea: 'Keep a write position for the next unique value. Walk through the list, and whenever a value differs from the last one written, copy it to the write position and move on. The write position is the count.',
    where: { dart: 'the Solution class, replacing the removeDuplicates method.', typescript: 'the removeDuplicates function, replacing its body.' },
    steps: [
      { what: 'open the method, returning 0 for an empty list, with the write position after the first value', say: 'The first value is always unique, so writing starts at position 1.' },
      { what: 'copy each value that differs from the last unique one into the write position', say: 'Because the list is sorted, duplicates are next to each other.' },
      { what: 'return the write position, which is the number of unique values', say: 'The first k slots now hold the unique values in order.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int removeDuplicates(List<int> nums) {
    if (nums.isEmpty) return 0;
    var write = 1;
//@step
    for (var read = 1; read < nums.length; read++) {
      if (nums[read] != nums[write - 1]) {
        nums[write++] = nums[read];
      }
    }
//@step
    return write;
  }
}`,
      typescript: `//@step
function removeDuplicates(nums: number[]): number {
  if (nums.length === 0) return 0;
  let write = 1;
//@step
  for (let read = 1; read < nums.length; read++) {
    if (nums[read] !== nums[write - 1]) nums[write++] = nums[read];
  }
//@step
  return write;
}`
    },
    check: 'With [0, 0, 1, 1, 1, 2, 2, 3, 3, 4]: the values 1, 2, 3 and 4 are written to positions 1 to 4 as they first appear, so the list starts [0, 1, 2, 3, 4] and the answer is 5.',
    complexity: 'O(n) time, one pass. O(1) space.',
    tests: [
      { args: [[1, 1, 2]], expected: 2 },
      { args: [[0, 0, 1, 1, 1, 2, 2, 3, 3, 4]], expected: 5 },
      { args: [[]], expected: 0 }
    ]
  },
  {
    id: 'is-subsequence',
    title: 'Is Subsequence',
    level: 'easy',
    statement: 'Given two strings s and t, return true if s is a subsequence of t: s can be formed by deleting some characters from t without changing the order of the rest. ' +
      'Example: s = "abc", t = "ahbgdc" returns true. Example: s = "axc", t = "ahbgdc" returns false.',
    signature: { dart: 'class Solution { bool isSubsequence(String s, String t) }', typescript: 'function isSubsequence(s: string, t: string): boolean' },
    fn: 'isSubsequence',
    asks: 'Check whether the letters of s appear in t in the same order, not necessarily next to each other: "abc" appears in "ahbgdc".',
    idea: 'Walk through t with one pointer and keep a second pointer on the next letter of s we need. Each time they match, move the s pointer. If it reaches the end of s, every letter was found in order.',
    where: { dart: 'the Solution class, replacing the isSubsequence method.', typescript: 'the isSubsequence function, replacing its body.' },
    steps: [
      { what: 'open the method with a pointer into s', say: 'The pointer marks the next letter of s I still need to find.' },
      { what: 'walk through t and move the pointer each time the letters match', say: 'Greedy matching is safe: taking the earliest match never hurts.' },
      { what: 'return whether the pointer reached the end of s', say: 'If it did, all of s was found in order.' }
    ],
    code: {
      dart: `//@step
class Solution {
  bool isSubsequence(String s, String t) {
    var i = 0;
//@step
    for (var j = 0; j < t.length && i < s.length; j++) {
      if (s[i] == t[j]) i++;
    }
//@step
    return i == s.length;
  }
}`,
      typescript: `//@step
function isSubsequence(s: string, t: string): boolean {
  let i = 0;
//@step
  for (let j = 0; j < t.length && i < s.length; j++) {
    if (s[i] === t[j]) i++;
  }
//@step
  return i === s.length;
}`
    },
    check: 'With "abc" and "ahbgdc": a matches a, h is skipped, b matches b, g and d are skipped, c matches c. The pointer reached the end, so true.',
    complexity: 'O(n) time in the length of t. O(1) space.',
    tests: [
      { args: ['abc', 'ahbgdc'], expected: true },
      { args: ['axc', 'ahbgdc'], expected: false },
      { args: ['', 'abc'], expected: true }
    ]
  },
  {
    id: 'sort-colors',
    title: 'Sort Colors',
    level: 'medium',
    statement: 'Given an array nums with n objects coloured red, white or blue, represented by 0, 1 and 2, sort them in place so the same colours are together in the order 0, 1, 2, without a library sort, in one pass. ' +
      'The function returns the sorted array here for checking. Example: nums = [2,0,2,1,1,0] gives [0,0,1,1,2,2].',
    signature: { dart: 'class Solution { List<int> sortColors(List<int> nums) }', typescript: 'function sortColors(nums: number[]): number[]' },
    fn: 'sortColors',
    asks: 'Sort a list of 0s, 1s and 2s in one pass without a sort function: [2, 0, 2, 1, 1, 0] becomes [0, 0, 1, 1, 2, 2].',
    idea: 'Dutch national flag: keep three regions with a low pointer for the next 0, a high pointer for the next 2, and a current pointer. ' +
      'A 0 is swapped to low, a 2 is swapped to high, and a 1 is left where it is. After swapping a 2 in, the new value at current still needs checking.',
    where: { dart: 'the Solution class, replacing the sortColors method.', typescript: 'the sortColors function, replacing its body.' },
    steps: [
      { what: 'open the method with low, current and high pointers', say: 'Everything before low is 0, everything after high is 2.' },
      { what: 'while current has not passed high, swap 0s to low, 2s to high, and step over 1s', say: 'When a 2 comes in from the high end, I do not move current, because that value is new.' },
      { what: 'return the array', say: 'One pass and constant space.' }
    ],
    code: {
      dart: `//@step
class Solution {
  List<int> sortColors(List<int> nums) {
    var low = 0;
    var cur = 0;
    var high = nums.length - 1;
    void swap(int a, int b) {
      final t = nums[a];
      nums[a] = nums[b];
      nums[b] = t;
    }
//@step
    while (cur <= high) {
      if (nums[cur] == 0) {
        swap(cur++, low++);
      } else if (nums[cur] == 2) {
        swap(cur, high--);
      } else {
        cur++;
      }
    }
//@step
    return nums;
  }
}`,
      typescript: `//@step
function sortColors(nums: number[]): number[] {
  let low = 0;
  let cur = 0;
  let high = nums.length - 1;
  const swap = (a: number, b: number) => { [nums[a], nums[b]] = [nums[b], nums[a]]; };
//@step
  while (cur <= high) {
    if (nums[cur] === 0) swap(cur++, low++);
    else if (nums[cur] === 2) swap(cur, high--);
    else cur++;
  }
//@step
  return nums;
}`
    },
    check: 'With [2, 0, 2, 1, 1, 0]: the first 2 swaps with the last 0, giving [0, 0, 2, 1, 1, 2]; the two 0s go to low; the 2 swaps with a 1 near high; then the 1s stay. Result [0, 0, 1, 1, 2, 2].',
    complexity: 'O(n) time, one pass. O(1) space.',
    tests: [
      { args: [[2, 0, 2, 1, 1, 0]], expected: [0, 0, 1, 1, 2, 2] },
      { args: [[2, 0, 1]], expected: [0, 1, 2] },
      { args: [[1]], expected: [1] }
    ]
  }
];
