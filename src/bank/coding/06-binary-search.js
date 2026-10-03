// Binary search: on sorted arrays, rotated arrays and on the answer itself.
module.exports = [
  {
    id: 'binary-search',
    title: 'Binary Search',
    level: 'easy',
    statement: 'Given a sorted array of distinct integers nums and a target, return the index of target, or -1 if it is not there. It must run in O(log n) time. ' +
      'Example: nums = [-1,0,3,5,9,12], target = 9 returns 4. Example: nums = [-1,0,3,5,9,12], target = 2 returns -1.',
    signature: { dart: 'class Solution { int search(List<int> nums, int target) }', typescript: 'function search(nums: number[], target: number): number' },
    fn: 'search',
    asks: 'Find where the target sits in a sorted list, quickly: 9 is at index 4 in [-1, 0, 3, 5, 9, 12].',
    idea: 'Look at the middle element. If it is the target, done. If it is smaller, the target can only be in the right half; if bigger, the left half. Each step halves the search range.',
    where: { dart: 'the Solution class, replacing the search method.', typescript: 'the search function, replacing its body.' },
    steps: [
      { what: 'open the method with low and high at the two ends', say: 'The target, if present, is always between low and high.' },
      { what: 'while low is not past high, check the middle and discard the half that cannot hold the target', say: 'Halving each time gives log n steps.' },
      { what: 'return -1 when the range is empty', say: 'An empty range means the target is not there.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int search(List<int> nums, int target) {
    var low = 0;
    var high = nums.length - 1;
//@step
    while (low <= high) {
      final mid = low + (high - low) ~/ 2;
      if (nums[mid] == target) return mid;
      if (nums[mid] < target) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
//@step
    return -1;
  }
}`,
      typescript: `//@step
function search(nums: number[], target: number): number {
  let low = 0;
  let high = nums.length - 1;
//@step
  while (low <= high) {
    const mid = low + Math.floor((high - low) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) low = mid + 1;
    else high = mid - 1;
  }
//@step
  return -1;
}`
    },
    check: 'With target 9: the middle of indexes 0 to 5 is index 2, value 3, too small, so low becomes 3. The middle of 3 to 5 is index 4, value 9, found.',
    complexity: 'O(log n) time. O(1) space.',
    tests: [
      { args: [[-1, 0, 3, 5, 9, 12], 9], expected: 4 },
      { args: [[-1, 0, 3, 5, 9, 12], 2], expected: -1 },
      { args: [[5], 5], expected: 0 }
    ]
  },
  {
    id: 'search-in-rotated-sorted-array',
    title: 'Search in Rotated Sorted Array',
    level: 'medium',
    statement: 'An array of distinct integers sorted in ascending order has been rotated at an unknown pivot, like [4,5,6,7,0,1,2]. Given nums and a target, return its index or -1, in O(log n) time. ' +
      'Example: nums = [4,5,6,7,0,1,2], target = 0 returns 4. Example: same nums, target = 3 returns -1.',
    signature: { dart: 'class Solution { int search(List<int> nums, int target) }', typescript: 'function search(nums: number[], target: number): number' },
    fn: 'search',
    asks: 'Find the target in a sorted list that was rotated: in [4, 5, 6, 7, 0, 1, 2], 0 is at index 4.',
    idea: 'Binary search still works because one half around the middle is always properly sorted. Check which half is sorted, see whether the target lies inside its range, and keep that half or the other one.',
    where: { dart: 'the Solution class, replacing the search method.', typescript: 'the search function, replacing its body.' },
    steps: [
      { what: 'open the method with low and high', say: 'Same binary search frame as usual.' },
      { what: 'at each middle, decide which half is sorted and whether the target fits in it, then keep the right half', say: 'The sorted half has known bounds, so I can tell if the target is there.' },
      { what: 'return -1 if the range empties', say: 'Still log n, since every step halves the range.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int search(List<int> nums, int target) {
    var low = 0;
    var high = nums.length - 1;
//@step
    while (low <= high) {
      final mid = (low + high) ~/ 2;
      if (nums[mid] == target) return mid;
      if (nums[low] <= nums[mid]) {
        if (nums[low] <= target && target < nums[mid]) {
          high = mid - 1;
        } else {
          low = mid + 1;
        }
      } else {
        if (nums[mid] < target && target <= nums[high]) {
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
    }
//@step
    return -1;
  }
}`,
      typescript: `//@step
function search(nums: number[], target: number): number {
  let low = 0;
  let high = nums.length - 1;
//@step
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (nums[mid] === target) return mid;
    if (nums[low] <= nums[mid]) {
      if (nums[low] <= target && target < nums[mid]) high = mid - 1;
      else low = mid + 1;
    } else {
      if (nums[mid] < target && target <= nums[high]) low = mid + 1;
      else high = mid - 1;
    }
  }
//@step
  return -1;
}`
    },
    check: 'With target 0: the middle is index 3, value 7. The left half 4 to 7 is sorted, and 0 is not in it, so search the right. The middle of 4 to 6 is index 5, value 1; the left part 0 to 1 is sorted and holds 0, so high moves to 4, and index 4 is 0.',
    complexity: 'O(log n) time. O(1) space.',
    tests: [
      { args: [[4, 5, 6, 7, 0, 1, 2], 0], expected: 4 },
      { args: [[4, 5, 6, 7, 0, 1, 2], 3], expected: -1 },
      { args: [[1], 0], expected: -1 },
      { args: [[3, 1], 1], expected: 1 }
    ]
  },
  {
    id: 'find-minimum-in-rotated-sorted-array',
    title: 'Find Minimum in Rotated Sorted Array',
    level: 'medium',
    statement: 'Given a sorted array of unique elements that has been rotated between 1 and n times, return its minimum element in O(log n) time. ' +
      'Example: nums = [3,4,5,1,2] returns 1. Example: nums = [4,5,6,7,0,1,2] returns 0. Example: nums = [11,13,15,17] returns 11.',
    signature: { dart: 'class Solution { int findMin(List<int> nums) }', typescript: 'function findMin(nums: number[]): number' },
    fn: 'findMin',
    asks: 'Find the smallest value in a rotated sorted list: in [3, 4, 5, 1, 2] it is 1.',
    idea: 'Compare the middle with the rightmost element. If the middle is bigger, the drop, and so the minimum, is to its right. Otherwise the minimum is at the middle or to its left. Narrow until one element remains.',
    where: { dart: 'the Solution class, replacing the findMin method.', typescript: 'the findMin function, replacing its body.' },
    steps: [
      { what: 'open the method with low and high', say: 'I keep the minimum inside low to high.' },
      { what: 'while low is below high, move low past the middle if the middle is bigger than the right end, else move high to the middle', say: 'The rotation point is where values drop, and comparing with the end tells me which side it is on.' },
      { what: 'return the value at low', say: 'When they meet, that is the minimum. Log n time.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int findMin(List<int> nums) {
    var low = 0;
    var high = nums.length - 1;
//@step
    while (low < high) {
      final mid = (low + high) ~/ 2;
      if (nums[mid] > nums[high]) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
//@step
    return nums[low];
  }
}`,
      typescript: `//@step
function findMin(nums: number[]): number {
  let low = 0;
  let high = nums.length - 1;
//@step
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (nums[mid] > nums[high]) low = mid + 1;
    else high = mid;
  }
//@step
  return nums[low];
}`
    },
    check: 'With [3, 4, 5, 1, 2]: the middle 5 is bigger than 2, so low becomes 3. The middle of 3 and 4 is index 3, value 1, which is not bigger than 2, so high becomes 3. low equals high at value 1.',
    complexity: 'O(log n) time. O(1) space.',
    tests: [
      { args: [[3, 4, 5, 1, 2]], expected: 1 },
      { args: [[4, 5, 6, 7, 0, 1, 2]], expected: 0 },
      { args: [[11, 13, 15, 17]], expected: 11 }
    ]
  },
  {
    id: 'search-a-2d-matrix',
    title: 'Search a 2D Matrix',
    level: 'medium',
    statement: 'Given an m x n integer matrix where each row is sorted and the first number of each row is greater than the last number of the previous row, return true if target is in the matrix. ' +
      'It must run in O(log(m * n)) time. Example: matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 3 returns true; target = 13 returns false.',
    signature: { dart: 'class Solution { bool searchMatrix(List<List<int>> matrix, int target) }', typescript: 'function searchMatrix(matrix: number[][], target: number): boolean' },
    fn: 'searchMatrix',
    asks: 'Say whether the target is in a grid whose rows, read one after another, form one sorted list.',
    idea: 'Treat the matrix as one sorted list of m times n elements. Position k maps to row k divided by n and column k modulo n. Then it is a normal binary search.',
    where: { dart: 'the Solution class, replacing the searchMatrix method.', typescript: 'the searchMatrix function, replacing its body.' },
    steps: [
      { what: 'open the method with the sizes and a search range over all positions', say: 'Read row by row, the matrix is one sorted list.' },
      { what: 'binary search, turning each middle position into a row and a column', say: 'Row is the position divided by the width, column is the remainder.' },
      { what: 'return false if not found', say: 'Log of m times n steps.' }
    ],
    code: {
      dart: `//@step
class Solution {
  bool searchMatrix(List<List<int>> matrix, int target) {
    final n = matrix[0].length;
    var low = 0;
    var high = matrix.length * n - 1;
//@step
    while (low <= high) {
      final mid = (low + high) ~/ 2;
      final value = matrix[mid ~/ n][mid % n];
      if (value == target) return true;
      if (value < target) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
//@step
    return false;
  }
}`,
      typescript: `//@step
function searchMatrix(matrix: number[][], target: number): boolean {
  const n = matrix[0].length;
  let low = 0;
  let high = matrix.length * n - 1;
//@step
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const value = matrix[Math.floor(mid / n)][mid % n];
    if (value === target) return true;
    if (value < target) low = mid + 1;
    else high = mid - 1;
  }
//@step
  return false;
}`
    },
    check: 'With target 3 in a 3 by 4 matrix: positions 0 to 11, the middle is 5, row 1 column 1, value 11, too big. Then the middle of 0 to 4 is 2, value 5, too big. Then position 0 is 1, too small, and position 1 is 3, found.',
    complexity: 'O(log(m times n)) time. O(1) space.',
    tests: [
      { args: [[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 3], expected: true },
      { args: [[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 13], expected: false },
      { args: [[[1]], 1], expected: true }
    ]
  },
  {
    id: 'koko-eating-bananas',
    title: 'Koko Eating Bananas',
    level: 'medium',
    statement: 'There are n piles of bananas, piles[i] in each. Koko eats at a speed of k bananas per hour: each hour she picks one pile and eats k from it, or the whole pile if it has fewer. ' +
      'Return the minimum integer k that lets her finish all piles within h hours. Example: piles = [3,6,7,11], h = 8 returns 4. Example: piles = [30,11,23,4,20], h = 5 returns 30.',
    signature: { dart: 'class Solution { int minEatingSpeed(List<int> piles, int h) }', typescript: 'function minEatingSpeed(piles: number[], h: number): number' },
    fn: 'minEatingSpeed',
    asks: 'Find the slowest eating speed that still finishes every pile in time: with [3, 6, 7, 11] and 8 hours, speed 4 works and 3 does not.',
    idea: 'Binary search on the answer. A speed works if the total hours, the sum of each pile divided by the speed rounded up, is at most h. ' +
      'Faster always works if slower does, so search speeds from 1 to the biggest pile for the smallest that works.',
    where: { dart: 'the Solution class, replacing the minEatingSpeed method.', typescript: 'the minEatingSpeed function, replacing its body.' },
    steps: [
      { what: 'open the method with a search range from 1 to the biggest pile', say: 'The answer is somewhere in that range, and checking a speed is easy.' },
      { what: 'for the middle speed, add up the hours needed and move high down if it fits, else low up', say: 'If a speed works, maybe a slower one does too; if not, I need faster.' },
      { what: 'return low, the smallest speed that works', say: 'Log of the max pile checks, each linear in the number of piles.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int minEatingSpeed(List<int> piles, int h) {
    var low = 1;
    var high = piles.reduce((a, b) => a > b ? a : b);
//@step
    while (low < high) {
      final speed = (low + high) ~/ 2;
      var hours = 0;
      for (final p in piles) {
        hours += (p + speed - 1) ~/ speed;
      }
      if (hours <= h) {
        high = speed;
      } else {
        low = speed + 1;
      }
    }
//@step
    return low;
  }
}`,
      typescript: `//@step
function minEatingSpeed(piles: number[], h: number): number {
  let low = 1;
  let high = Math.max(...piles);
//@step
  while (low < high) {
    const speed = Math.floor((low + high) / 2);
    let hours = 0;
    for (const p of piles) hours += Math.ceil(p / speed);
    if (hours <= h) high = speed;
    else low = speed + 1;
  }
//@step
  return low;
}`
    },
    check: 'With [3, 6, 7, 11] and 8 hours: speed 6 needs 1 + 1 + 2 + 2 = 6 hours, fine, so try slower. Speed 3 needs 1 + 2 + 3 + 4 = 10, too many. Speed 4 needs 1 + 2 + 2 + 3 = 8, which fits, so the answer is 4.',
    complexity: 'O(n log m) time, where m is the biggest pile. O(1) space.',
    tests: [
      { args: [[3, 6, 7, 11], 8], expected: 4 },
      { args: [[30, 11, 23, 4, 20], 5], expected: 30 },
      { args: [[30, 11, 23, 4, 20], 6], expected: 23 }
    ]
  },
  {
    id: 'find-first-and-last-position',
    title: 'Find First and Last Position of Element in Sorted Array',
    level: 'medium',
    statement: 'Given an array of integers nums sorted in non-decreasing order, find the starting and ending position of a target value, or [-1,-1] if it is not found, in O(log n) time. ' +
      'Example: nums = [5,7,7,8,8,10], target = 8 returns [3,4]. Example: target = 6 returns [-1,-1].',
    signature: { dart: 'class Solution { List<int> searchRange(List<int> nums, int target) }', typescript: 'function searchRange(nums: number[], target: number): number[]' },
    fn: 'searchRange',
    asks: 'Give the first and last index of the target in a sorted list: 8 appears at indexes 3 and 4 in [5, 7, 7, 8, 8, 10].',
    idea: 'Run binary search twice with one helper: find the first index whose value is at least the target, and the first index whose value is at least target plus one. ' +
      'If the first spot holds the target, the range is from it to the second spot minus one.',
    where: { dart: 'the Solution class, replacing the searchRange method.', typescript: 'the searchRange function, replacing its body.' },
    steps: [
      { what: 'open the method with a helper that finds the first index with a value at least x', say: 'This lower bound search is the building block.' },
      { what: 'find the start with the target and the end with target plus one', say: 'The end of the run is just before the first larger value.' },
      { what: 'return the pair, or -1 and -1 if the target is not there', say: 'Two binary searches, so log n.' }
    ],
    code: {
      dart: `//@step
class Solution {
  List<int> searchRange(List<int> nums, int target) {
    int lowerBound(int x) {
      var low = 0;
      var high = nums.length;
      while (low < high) {
        final mid = (low + high) ~/ 2;
        if (nums[mid] < x) {
          low = mid + 1;
        } else {
          high = mid;
        }
      }
      return low;
    }
//@step
    final start = lowerBound(target);
    final end = lowerBound(target + 1) - 1;
//@step
    if (start >= nums.length || nums[start] != target) return [-1, -1];
    return [start, end];
  }
}`,
      typescript: `//@step
function searchRange(nums: number[], target: number): number[] {
  const lowerBound = (x: number): number => {
    let low = 0;
    let high = nums.length;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (nums[mid] < x) low = mid + 1;
      else high = mid;
    }
    return low;
  };
//@step
  const start = lowerBound(target);
  const end = lowerBound(target + 1) - 1;
//@step
  if (start >= nums.length || nums[start] !== target) return [-1, -1];
  return [start, end];
}`
    },
    check: 'With [5, 7, 7, 8, 8, 10] and 8: the first value at least 8 is at index 3, and the first value at least 9 is at index 5, so the range is [3, 4].',
    complexity: 'O(log n) time. O(1) space.',
    tests: [
      { args: [[5, 7, 7, 8, 8, 10], 8], expected: [3, 4] },
      { args: [[5, 7, 7, 8, 8, 10], 6], expected: [-1, -1] },
      { args: [[], 0], expected: [-1, -1] }
    ]
  },
  {
    id: 'median-of-two-sorted-arrays',
    title: 'Median of Two Sorted Arrays',
    level: 'hard',
    statement: 'Given two sorted arrays nums1 and nums2 of sizes m and n, return the median of the two arrays combined, in O(log(m + n)) time. ' +
      'Example: nums1 = [1,3], nums2 = [2] returns 2.0. Example: nums1 = [1,2], nums2 = [3,4] returns 2.5.',
    signature: { dart: 'class Solution { double findMedianSortedArrays(List<int> nums1, List<int> nums2) }', typescript: 'function findMedianSortedArrays(nums1: number[], nums2: number[]): number' },
    fn: 'findMedianSortedArrays',
    asks: 'Find the middle value of two sorted lists merged together, without merging them: [1, 2] and [3, 4] have median 2.5.',
    idea: 'Binary search a cut in the shorter array. The cut in the other array is chosen so the left side holds half of all elements. ' +
      'The cut is right when every left element is at most every right element. Then the median comes from the largest left values and smallest right values.',
    where: { dart: 'the Solution class, replacing the findMedianSortedArrays method.', typescript: 'the findMedianSortedArrays function, replacing its body.' },
    steps: [
      { what: 'open the method, make sure the first array is the shorter one, and set up the search over its cut', say: 'Searching the shorter array keeps it to log of the smaller size.' },
      { what: 'for each cut, read the four border values, using infinity past the ends', say: 'The borders tell me whether the cut is too far left or right.' },
      { what: 'if the borders are in order, compute the median; otherwise move the cut and continue', say: 'With an odd total the median is the largest left value, otherwise the average of the two middle values.' }
    ],
    code: {
      dart: `//@step
class Solution {
  double findMedianSortedArrays(List<int> nums1, List<int> nums2) {
    if (nums1.length > nums2.length) return findMedianSortedArrays(nums2, nums1);
    final m = nums1.length;
    final n = nums2.length;
    final half = (m + n + 1) ~/ 2;
    var low = 0;
    var high = m;
    const inf = 1 << 62;
    while (low <= high) {
      final i = (low + high) ~/ 2;
      final j = half - i;
//@step
      final left1 = i == 0 ? -inf : nums1[i - 1];
      final right1 = i == m ? inf : nums1[i];
      final left2 = j == 0 ? -inf : nums2[j - 1];
      final right2 = j == n ? inf : nums2[j];
//@step
      if (left1 <= right2 && left2 <= right1) {
        final leftMax = left1 > left2 ? left1 : left2;
        if ((m + n).isOdd) return leftMax.toDouble();
        final rightMin = right1 < right2 ? right1 : right2;
        return (leftMax + rightMin) / 2;
      }
      if (left1 > right2) {
        high = i - 1;
      } else {
        low = i + 1;
      }
    }
    return 0.0;
  }
}`,
      typescript: `//@step
function findMedianSortedArrays(nums1: number[], nums2: number[]): number {
  if (nums1.length > nums2.length) return findMedianSortedArrays(nums2, nums1);
  const m = nums1.length;
  const n = nums2.length;
  const half = Math.floor((m + n + 1) / 2);
  let low = 0;
  let high = m;
  while (low <= high) {
    const i = Math.floor((low + high) / 2);
    const j = half - i;
//@step
    const left1 = i === 0 ? -Infinity : nums1[i - 1];
    const right1 = i === m ? Infinity : nums1[i];
    const left2 = j === 0 ? -Infinity : nums2[j - 1];
    const right2 = j === n ? Infinity : nums2[j];
//@step
    if (left1 <= right2 && left2 <= right1) {
      const leftMax = Math.max(left1, left2);
      if ((m + n) % 2 === 1) return leftMax;
      return (leftMax + Math.min(right1, right2)) / 2;
    }
    if (left1 > right2) high = i - 1;
    else low = i + 1;
  }
  return 0;
}`
    },
    check: 'With [1, 2] and [3, 4]: half is 2. Cutting [1, 2] after 1 and [3, 4] after 3 fails because 3 is bigger than 2. Cutting [1, 2] after 2 and nothing from [3, 4] works: left max 2, right min 3, median 2.5.',
    complexity: 'O(log(min(m, n))) time. O(1) space.',
    tests: [
      { args: [[1, 3], [2]], expected: 2 },
      { args: [[1, 2], [3, 4]], expected: 2.5 },
      { args: [[], [1]], expected: 1 }
    ]
  },
  {
    id: 'time-based-key-value-store',
    title: 'Time Based Key-Value Store',
    level: 'medium',
    statement: 'Design a key-value store that keeps several values for the same key at different timestamps. Implement TimeMap with TimeMap(), void set(String key, String value, int timestamp), ' +
      'and String get(String key, int timestamp), which returns the value set with the largest timestamp at or before the given timestamp, or an empty string. Timestamps of set calls are strictly increasing. ' +
      'Example: set("foo","bar",1), get("foo",1) returns "bar", get("foo",3) returns "bar", set("foo","bar2",4), get("foo",4) returns "bar2", get("foo",5) returns "bar2".',
    signature: { dart: 'class TimeMap { void set(String key, String value, int timestamp); String get(String key, int timestamp) }', typescript: 'class TimeMap { set(key: string, value: string, timestamp: number): void; get(key: string, timestamp: number): string }' },
    asks: 'Build a store that remembers every version of a value by time, and returns the latest version at or before a given time.',
    idea: 'Keep, for each key, a list of timestamps and values. Sets arrive in increasing time, so the lists stay sorted. For get, binary search the last timestamp that is not after the requested one.',
    where: { dart: 'the TimeMap class, replacing the starter class.', typescript: 'the TimeMap class, replacing the starter class.' },
    steps: [
      { what: 'create the class with a map from key to its list of timestamps and values', say: 'Each key keeps its history in time order.' },
      { what: 'set appends to the key\'s lists', say: 'Timestamps only increase, so appending keeps them sorted.' },
      { what: 'get binary searches for the last timestamp at or before the one asked', say: 'That makes get log n instead of scanning.' }
    ],
    code: {
      dart: `//@step
class TimeMap {
  final _times = <String, List<int>>{};
  final _values = <String, List<String>>{};

  TimeMap();
//@step
  void set(String key, String value, int timestamp) {
    _times.putIfAbsent(key, () => []).add(timestamp);
    _values.putIfAbsent(key, () => []).add(value);
  }
//@step
  String get(String key, int timestamp) {
    final times = _times[key];
    if (times == null) return '';
    var low = 0;
    var high = times.length - 1;
    var found = -1;
    while (low <= high) {
      final mid = (low + high) ~/ 2;
      if (times[mid] <= timestamp) {
        found = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return found == -1 ? '' : _values[key]![found];
  }
}`,
      typescript: `//@step
class TimeMap {
  private times = new Map<string, number[]>();
  private values = new Map<string, string[]>();
//@step
  set(key: string, value: string, timestamp: number): void {
    if (!this.times.has(key)) {
      this.times.set(key, []);
      this.values.set(key, []);
    }
    (this.times.get(key) as number[]).push(timestamp);
    (this.values.get(key) as string[]).push(value);
  }
//@step
  get(key: string, timestamp: number): string {
    const times = this.times.get(key);
    if (!times) return '';
    let low = 0;
    let high = times.length - 1;
    let found = -1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (times[mid] <= timestamp) {
        found = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return found === -1 ? '' : (this.values.get(key) as string[])[found];
  }
}`
    },
    check: 'After set foo to bar at 1, get at 3 finds timestamp 1 as the last one not after 3, so "bar". After set foo to bar2 at 4, get at 5 finds timestamp 4, so "bar2".',
    complexity: 'O(1) for set and O(log n) for get, where n is the number of versions of that key. O(total sets) space.',
    ...require('../helpers').design({
      cls: 'TimeMap',
      ops: ['TimeMap', 'set', 'get', 'get', 'set', 'get', 'get', 'get'],
      args: [[], ['foo', 'bar', 1], ['foo', 1], ['foo', 3], ['foo', 'bar2', 4], ['foo', 4], ['foo', 5], ['foo', 0]],
      expected: [null, null, 'bar', 'bar', null, 'bar2', 'bar2', '']
    })
  }
];
