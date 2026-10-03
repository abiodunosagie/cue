// More array problems: prefix products, Kadane, in-place edits, prefix sums.
const { inPlace } = require('../helpers');

const moveZeroesTests = [
  { args: [[0, 1, 0, 3, 12]], expected: [1, 3, 12, 0, 0] },
  { args: [[0]], expected: [0] },
  { args: [[1, 2, 3]], expected: [1, 2, 3] }
];
const mergeTests = [
  { args: [[1, 2, 3, 0, 0, 0], 3, [2, 5, 6], 3], expected: [1, 2, 2, 3, 5, 6] },
  { args: [[1], 1, [], 0], expected: [1] },
  { args: [[0], 0, [1], 1], expected: [1] }
];
const rotateTests = [
  { args: [[1, 2, 3, 4, 5, 6, 7], 3], expected: [5, 6, 7, 1, 2, 3, 4] },
  { args: [[-1, -100, 3, 99], 2], expected: [3, 99, -1, -100] },
  { args: [[1, 2], 5], expected: [2, 1] }
];

module.exports = [
  {
    id: 'product-of-array-except-self',
    title: 'Product of Array Except Self',
    level: 'medium',
    statement: 'Given an integer array nums, return an array answer where answer[i] is the product of all elements of nums except nums[i]. ' +
      'It must run in O(n) time without using division. Example: nums = [1,2,3,4] returns [24,12,8,6]. Example: nums = [-1,1,0,-3,3] returns [0,0,9,0,0].',
    signature: {
      dart: 'class Solution { List<int> productExceptSelf(List<int> nums) }',
      typescript: 'function productExceptSelf(nums: number[]): number[]'
    },
    fn: 'productExceptSelf',
    asks: 'For each position, multiply every other number: with [1, 2, 3, 4], position 0 gets 2 times 3 times 4, which is 24.',
    idea: 'The product of everything except position i is the product of everything to its left times everything to its right. ' +
      'One pass from the left writes the left products into the answer, and a second pass from the right multiplies in the right products, keeping a running value. No division needed.',
    where: { dart: 'the Solution class, replacing the productExceptSelf method.', typescript: 'the productExceptSelf function, replacing its body.' },
    steps: [
      { what: 'open the method and fill the answer with the product of everything to the left of each position', say: 'First pass: each slot gets the product of all numbers before it.' },
      { what: 'walk back from the right with a running product and multiply it in', say: 'Second pass: I multiply in the product of all numbers after each slot, using one running variable.' },
      { what: 'return the answer', say: 'Each slot now holds left times right, which is everything except itself.' }
    ],
    code: {
      dart: `//@step
class Solution {
  List<int> productExceptSelf(List<int> nums) {
    final n = nums.length;
    final answer = List<int>.filled(n, 1);
    for (var i = 1; i < n; i++) {
      answer[i] = answer[i - 1] * nums[i - 1];
    }
//@step
    var right = 1;
    for (var i = n - 1; i >= 0; i--) {
      answer[i] *= right;
      right *= nums[i];
    }
//@step
    return answer;
  }
}`,
      typescript: `//@step
function productExceptSelf(nums: number[]): number[] {
  const n = nums.length;
  const answer: number[] = new Array(n).fill(1);
  for (let i = 1; i < n; i++) answer[i] = answer[i - 1] * nums[i - 1];
//@step
  let right = 1;
  for (let i = n - 1; i >= 0; i--) {
    answer[i] *= right;
    right *= nums[i];
  }
//@step
  return answer;
}`
    },
    check: 'With [1, 2, 3, 4]: the left pass gives [1, 1, 2, 6]. Going back, right starts at 1: slot 3 stays 6 and right becomes 4; slot 2 becomes 8 and right 12; slot 1 becomes 12 and right 24; slot 0 becomes 24. Answer [24, 12, 8, 6].',
    complexity: 'O(n) time, two passes. O(1) extra space besides the answer array.',
    tests: [
      { args: [[1, 2, 3, 4]], expected: [24, 12, 8, 6] },
      { args: [[-1, 1, 0, -3, 3]], expected: [0, 0, 9, 0, 0] },
      { args: [[2, 3]], expected: [3, 2] }
    ]
  },
  {
    id: 'longest-consecutive-sequence',
    title: 'Longest Consecutive Sequence',
    level: 'medium',
    statement: 'Given an unsorted array of integers nums, return the length of the longest run of consecutive numbers (like 1, 2, 3, 4) that can be formed from its values. ' +
      'It must run in O(n) time. Example: nums = [100,4,200,1,3,2] returns 4. Example: nums = [0,3,7,2,5,8,4,6,0,1] returns 9.',
    signature: {
      dart: 'class Solution { int longestConsecutive(List<int> nums) }',
      typescript: 'function longestConsecutive(nums: number[]): number'
    },
    fn: 'longestConsecutive',
    asks: 'Find the longest run of numbers that follow each other: in [100, 4, 200, 1, 3, 2] the run 1, 2, 3, 4 has length 4.',
    idea: 'Put all numbers in a set for constant-time lookups. A number starts a run only if the number just below it is not in the set. ' +
      'From each start, count upwards while the next number exists. Every number is counted once, so it is linear.',
    where: { dart: 'the Solution class, replacing the longestConsecutive method.', typescript: 'the longestConsecutive function, replacing its body.' },
    steps: [
      { what: 'open the method and put every number into a set', say: 'A set lets me check "is this number present" in constant time, and removes duplicates.' },
      { what: 'for each number that has no number just below it, count how far the run goes up', say: 'I only start counting from the beginning of a run, so no run is counted twice.' },
      { what: 'keep the longest length and return it', say: 'The answer is the longest run I counted.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int longestConsecutive(List<int> nums) {
    final values = nums.toSet();
    var best = 0;
//@step
    for (final n in values) {
      if (values.contains(n - 1)) continue;
      var length = 1;
      while (values.contains(n + length)) {
        length++;
      }
//@step
      if (length > best) best = length;
    }
    return best;
  }
}`,
      typescript: `//@step
function longestConsecutive(nums: number[]): number {
  const values = new Set(nums);
  let best = 0;
//@step
  for (const n of values) {
    if (values.has(n - 1)) continue;
    let length = 1;
    while (values.has(n + length)) length++;
//@step
    best = Math.max(best, length);
  }
  return best;
}`
    },
    check: 'With [100, 4, 200, 1, 3, 2]: 100 starts a run of 1, 200 a run of 1, and 1 starts a run because 0 is missing; 2, 3 and 4 are present, so that run is 4. The others are skipped as they are not starts. Answer 4.',
    complexity: 'O(n) time, because each number is visited at most twice. O(n) space for the set.',
    tests: [
      { args: [[100, 4, 200, 1, 3, 2]], expected: 4 },
      { args: [[0, 3, 7, 2, 5, 8, 4, 6, 0, 1]], expected: 9 },
      { args: [[]], expected: 0 },
      { args: [[1, 2, 0, 1]], expected: 3 }
    ]
  },
  {
    id: 'best-time-to-buy-and-sell-stock',
    title: 'Best Time to Buy and Sell Stock',
    level: 'easy',
    statement: 'Given an array prices where prices[i] is a stock price on day i, choose one day to buy and a later day to sell to maximise profit. ' +
      'Return the maximum profit, or 0 if no profit is possible. Example: prices = [7,1,5,3,6,4] returns 5. Example: prices = [7,6,4,3,1] returns 0.',
    signature: {
      dart: 'class Solution { int maxProfit(List<int> prices) }',
      typescript: 'function maxProfit(prices: number[]): number'
    },
    fn: 'maxProfit',
    asks: 'Buy once and sell later for the biggest gain: with [7, 1, 5, 3, 6, 4], buy at 1 and sell at 6 for a profit of 5.',
    idea: 'Walk through the days keeping the lowest price seen so far. On each day, selling today would earn today\'s price minus that lowest price; keep the best such profit.',
    where: { dart: 'the Solution class, replacing the maxProfit method.', typescript: 'the maxProfit function, replacing its body.' },
    steps: [
      { what: 'open the method with the lowest price so far and the best profit', say: 'I track the cheapest day to buy so far and the best profit found.' },
      { what: 'for each price, update the lowest price, or the best profit if selling today is better', say: 'Each day I either found a cheaper buy, or I check what selling today would earn.' },
      { what: 'return the best profit', say: 'One pass gives the answer; if prices only fall, it stays zero.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int maxProfit(List<int> prices) {
    var lowest = 1 << 30;
    var best = 0;
//@step
    for (final p in prices) {
      if (p < lowest) {
        lowest = p;
      } else if (p - lowest > best) {
        best = p - lowest;
      }
    }
//@step
    return best;
  }
}`,
      typescript: `//@step
function maxProfit(prices: number[]): number {
  let lowest = Infinity;
  let best = 0;
//@step
  for (const p of prices) {
    if (p < lowest) lowest = p;
    else best = Math.max(best, p - lowest);
  }
//@step
  return best;
}`
    },
    check: 'With [7, 1, 5, 3, 6, 4]: lowest becomes 7 then 1. At 5 the profit is 4, at 3 it is 2, at 6 it is 5, the best, and at 4 it is 3. Answer 5.',
    complexity: 'O(n) time, one pass. O(1) space.',
    tests: [
      { args: [[7, 1, 5, 3, 6, 4]], expected: 5 },
      { args: [[7, 6, 4, 3, 1]], expected: 0 },
      { args: [[2, 4, 1]], expected: 2 }
    ]
  },
  {
    id: 'maximum-subarray',
    title: 'Maximum Subarray',
    level: 'medium',
    statement: 'Given an integer array nums, find the contiguous subarray with the largest sum and return that sum. The array has at least one element. ' +
      'Example: nums = [-2,1,-3,4,-1,2,1,-5,4] returns 6, from [4,-1,2,1]. Example: nums = [5,4,-1,7,8] returns 23.',
    signature: {
      dart: 'class Solution { int maxSubArray(List<int> nums) }',
      typescript: 'function maxSubArray(nums: number[]): number'
    },
    fn: 'maxSubArray',
    asks: 'Find the run of neighbouring numbers with the biggest total: in [-2, 1, -3, 4, -1, 2, 1, -5, 4] it is 4, -1, 2, 1, which adds to 6.',
    idea: 'This is Kadane\'s algorithm. Walk through the numbers keeping the best sum of a run that ends here: either extend the previous run or start fresh at this number, whichever is bigger. ' +
      'A negative running sum can only hurt, so we drop it. Track the best value seen.',
    where: { dart: 'the Solution class, replacing the maxSubArray method.', typescript: 'the maxSubArray function, replacing its body.' },
    steps: [
      { what: 'open the method, starting both the current and the best sum at the first number', say: 'I start with the first number, so an all-negative array still gives the right answer.' },
      { what: 'for each next number, either extend the current run or start a new one, then update the best', say: 'If the run so far is negative, starting over at this number is better.' },
      { what: 'return the best sum', say: 'One pass, constant space.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int maxSubArray(List<int> nums) {
    var current = nums[0];
    var best = nums[0];
//@step
    for (var i = 1; i < nums.length; i++) {
      current = current > 0 ? current + nums[i] : nums[i];
      if (current > best) best = current;
    }
//@step
    return best;
  }
}`,
      typescript: `//@step
function maxSubArray(nums: number[]): number {
  let current = nums[0];
  let best = nums[0];
//@step
  for (let i = 1; i < nums.length; i++) {
    current = current > 0 ? current + nums[i] : nums[i];
    best = Math.max(best, current);
  }
//@step
  return best;
}`
    },
    check: 'With [-2, 1, -3, 4, -1, 2, 1, -5, 4]: current goes -2, then 1 (fresh start), -2, then 4 (fresh start), 3, 5, 6, 1, 5. The best value reached is 6.',
    complexity: 'O(n) time, one pass. O(1) space.',
    tests: [
      { args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6 },
      { args: [[1]], expected: 1 },
      { args: [[5, 4, -1, 7, 8]], expected: 23 },
      { args: [[-3, -1, -2]], expected: -1 }
    ]
  },
  {
    id: 'majority-element',
    title: 'Majority Element',
    level: 'easy',
    statement: 'Given an array nums of size n, return the majority element, the value that appears more than n / 2 times. The majority element always exists. ' +
      'Solve it in O(n) time and O(1) space. Example: nums = [3,2,3] returns 3. Example: nums = [2,2,1,1,1,2,2] returns 2.',
    signature: {
      dart: 'class Solution { int majorityElement(List<int> nums) }',
      typescript: 'function majorityElement(nums: number[]): number'
    },
    fn: 'majorityElement',
    asks: 'Return the value that makes up more than half the list: in [2, 2, 1, 1, 1, 2, 2] that is 2.',
    idea: 'Boyer-Moore voting: keep a candidate and a count. A matching number adds one, a different number takes one away, and when the count hits zero the next number becomes the candidate. ' +
      'Because the majority appears more than all others combined, it survives the cancelling.',
    where: { dart: 'the Solution class, replacing the majorityElement method.', typescript: 'the majorityElement function, replacing its body.' },
    steps: [
      { what: 'open the method with a candidate and a count of zero', say: 'I use a voting trick so I need no extra memory.' },
      { what: 'for each number, pick a new candidate when the count is zero, then add or subtract one', say: 'Equal numbers vote for the candidate, different ones cancel a vote.' },
      { what: 'return the candidate', say: 'The majority always outlasts the others, so the survivor is the answer.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int majorityElement(List<int> nums) {
    var candidate = 0;
    var count = 0;
//@step
    for (final n in nums) {
      if (count == 0) candidate = n;
      count += n == candidate ? 1 : -1;
    }
//@step
    return candidate;
  }
}`,
      typescript: `//@step
function majorityElement(nums: number[]): number {
  let candidate = 0;
  let count = 0;
//@step
  for (const n of nums) {
    if (count === 0) candidate = n;
    count += n === candidate ? 1 : -1;
  }
//@step
  return candidate;
}`
    },
    check: 'With [2, 2, 1, 1, 1, 2, 2]: candidate 2 reaches count 2, the three 1s bring it to 0 and then make 1 the candidate with count 1, the next 2 drops it to 0, and the last 2 becomes the candidate. Answer 2.',
    complexity: 'O(n) time, one pass. O(1) space.',
    tests: [
      { args: [[3, 2, 3]], expected: 3 },
      { args: [[2, 2, 1, 1, 1, 2, 2]], expected: 2 },
      { args: [[1]], expected: 1 }
    ]
  },
  {
    id: 'move-zeroes',
    title: 'Move Zeroes',
    level: 'easy',
    statement: 'Given an integer array nums, move all 0s to the end while keeping the relative order of the non-zero elements. ' +
      'Do it in place without making a copy of the array; the function returns nothing. Example: nums = [0,1,0,3,12] becomes [1,3,12,0,0].',
    signature: {
      dart: 'class Solution { void moveZeroes(List<int> nums) }',
      typescript: 'function moveZeroes(nums: number[]): void'
    },
    fn: 'moveZeroes',
    asks: 'Push every zero to the back without changing the order of the other numbers: [0, 1, 0, 3, 12] becomes [1, 3, 12, 0, 0].',
    idea: 'Use two positions: one reads every element, the other marks where the next non-zero should go. Each non-zero is swapped into that spot, so non-zeros move forward in order and zeros end up at the back.',
    where: { dart: 'the Solution class, replacing the moveZeroes method.', typescript: 'the moveZeroes function, replacing its body.' },
    steps: [
      { what: 'open the method with a write position at the start', say: 'The write position is where the next non-zero number belongs.' },
      { what: 'for each non-zero number, swap it into the write position and move that position on', say: 'Swapping keeps the order of the non-zeros and pushes zeros back, in one pass.' },
      { what: 'close the method; the array is changed in place', say: 'Nothing is returned, the array itself now has the zeros at the end.' }
    ],
    code: {
      dart: `//@step
class Solution {
  void moveZeroes(List<int> nums) {
    var write = 0;
//@step
    for (var read = 0; read < nums.length; read++) {
      if (nums[read] != 0) {
        final tmp = nums[write];
        nums[write] = nums[read];
        nums[read] = tmp;
        write++;
      }
    }
//@step
  }
}`,
      typescript: `//@step
function moveZeroes(nums: number[]): void {
  let write = 0;
//@step
  for (let read = 0; read < nums.length; read++) {
    if (nums[read] !== 0) {
      [nums[write], nums[read]] = [nums[read], nums[write]];
      write++;
    }
  }
//@step
}`
    },
    check: 'With [0, 1, 0, 3, 12]: 1 swaps into position 0, giving [1, 0, 0, 3, 12]; 3 swaps into position 1, giving [1, 3, 0, 0, 12]; 12 swaps into position 2, giving [1, 3, 12, 0, 0].',
    complexity: 'O(n) time, one pass. O(1) space, it works in place.',
    tests: moveZeroesTests,
    ...inPlace({ fn: 'moveZeroes', tests: moveZeroesTests })
  },
  {
    id: 'merge-sorted-array',
    title: 'Merge Sorted Array',
    level: 'easy',
    statement: 'You are given two sorted integer arrays nums1 and nums2 and integers m and n, the number of real elements in each. nums1 has length m + n, with the last n slots set to 0 as space. ' +
      'Merge nums2 into nums1 in place so nums1 is sorted; the function returns nothing. Example: nums1 = [1,2,3,0,0,0], m = 3, nums2 = [2,5,6], n = 3 makes nums1 [1,2,2,3,5,6].',
    signature: {
      dart: 'class Solution { void merge(List<int> nums1, int m, List<int> nums2, int n) }',
      typescript: 'function merge(nums1: number[], m: number, nums2: number[], n: number): void'
    },
    fn: 'merge',
    asks: 'Merge the second sorted list into the free space at the end of the first: [1, 2, 3] and [2, 5, 6] become [1, 2, 2, 3, 5, 6].',
    idea: 'Fill nums1 from the back. Compare the largest remaining element of each list and put the bigger one in the last free slot. ' +
      'Writing from the end never overwrites an element of nums1 we still need.',
    where: { dart: 'the Solution class, replacing the merge method.', typescript: 'the merge function, replacing its body.' },
    steps: [
      { what: 'open the method with pointers to the last real element of each list and the last slot', say: 'I fill from the back, so I never overwrite numbers I still need.' },
      { what: 'while nums2 has elements left, place the bigger of the two last elements in the current slot', say: 'Each step puts the largest remaining number in the last free position.' },
      { what: 'close the method; whatever is left in nums1 is already in place', say: 'Once nums2 is used up, the rest of nums1 is already sorted in position.' }
    ],
    code: {
      dart: `//@step
class Solution {
  void merge(List<int> nums1, int m, List<int> nums2, int n) {
    var i = m - 1;
    var j = n - 1;
    var k = m + n - 1;
//@step
    while (j >= 0) {
      if (i >= 0 && nums1[i] > nums2[j]) {
        nums1[k--] = nums1[i--];
      } else {
        nums1[k--] = nums2[j--];
      }
    }
//@step
  }
}`,
      typescript: `//@step
function merge(nums1: number[], m: number, nums2: number[], n: number): void {
  let i = m - 1;
  let j = n - 1;
  let k = m + n - 1;
//@step
  while (j >= 0) {
    if (i >= 0 && nums1[i] > nums2[j]) nums1[k--] = nums1[i--];
    else nums1[k--] = nums2[j--];
  }
//@step
}`
    },
    check: 'With [1, 2, 3, 0, 0, 0] and [2, 5, 6]: 6 goes to slot 5, 5 to slot 4, then 3 is bigger than 2 so 3 goes to slot 3, then 2 from nums2 to slot 2. nums2 is empty and [1, 2] are already in place: [1, 2, 2, 3, 5, 6].',
    complexity: 'O(m + n) time, each element placed once. O(1) extra space.',
    tests: mergeTests,
    ...inPlace({ fn: 'merge', tests: mergeTests })
  },
  {
    id: 'rotate-array',
    title: 'Rotate Array',
    level: 'medium',
    statement: 'Given an integer array nums, rotate it to the right by k steps, in place; k is non-negative and may be larger than the length. The function returns nothing. ' +
      'Example: nums = [1,2,3,4,5,6,7], k = 3 becomes [5,6,7,1,2,3,4].',
    signature: {
      dart: 'class Solution { void rotate(List<int> nums, int k) }',
      typescript: 'function rotate(nums: number[], k: number): void'
    },
    fn: 'rotate',
    asks: 'Shift every element k places to the right, wrapping around: [1, 2, 3, 4, 5, 6, 7] rotated by 3 is [5, 6, 7, 1, 2, 3, 4].',
    idea: 'Reverse the whole array, then reverse the first k elements, then reverse the rest. ' +
      'Reversing everything brings the last k elements to the front, in backwards order, and the two smaller reversals put both parts back in the right order. Take k modulo the length first.',
    where: { dart: 'the Solution class, replacing the rotate method.', typescript: 'the rotate function, replacing its body.' },
    steps: [
      { what: 'open the method, reduce k by the length, and add a helper that reverses a range in place', say: 'Rotating by the length changes nothing, so only k modulo the length matters.' },
      { what: 'reverse the whole array, then the first k elements, then the rest', say: 'Three reversals move the last k elements to the front in the right order.' },
      { what: 'close the method; the array is rotated in place', say: 'Linear time and no extra array.' }
    ],
    code: {
      dart: `//@step
class Solution {
  void rotate(List<int> nums, int k) {
    final n = nums.length;
    k %= n;
    void reverse(int from, int to) {
      while (from < to) {
        final tmp = nums[from];
        nums[from++] = nums[to];
        nums[to--] = tmp;
      }
    }
//@step
    reverse(0, n - 1);
    reverse(0, k - 1);
    reverse(k, n - 1);
//@step
  }
}`,
      typescript: `//@step
function rotate(nums: number[], k: number): void {
  const n = nums.length;
  k %= n;
  const reverse = (from: number, to: number) => {
    while (from < to) {
      [nums[from], nums[to]] = [nums[to], nums[from]];
      from++;
      to--;
    }
  };
//@step
  reverse(0, n - 1);
  reverse(0, k - 1);
  reverse(k, n - 1);
//@step
}`
    },
    check: 'With [1, 2, 3, 4, 5, 6, 7] and k = 3: reversing all gives [7, 6, 5, 4, 3, 2, 1], reversing the first 3 gives [5, 6, 7, 4, 3, 2, 1], and reversing the rest gives [5, 6, 7, 1, 2, 3, 4].',
    complexity: 'O(n) time, each element is swapped at most twice. O(1) extra space.',
    tests: rotateTests,
    ...inPlace({ fn: 'rotate', tests: rotateTests })
  },
  {
    id: 'subarray-sum-equals-k',
    title: 'Subarray Sum Equals K',
    level: 'medium',
    statement: 'Given an integer array nums, which may contain negative numbers, and an integer k, return the total number of contiguous subarrays whose sum equals k. ' +
      'Example: nums = [1,1,1], k = 2 returns 2. Example: nums = [1,2,3], k = 3 returns 2.',
    signature: {
      dart: 'class Solution { int subarraySum(List<int> nums, int k) }',
      typescript: 'function subarraySum(nums: number[], k: number): number'
    },
    fn: 'subarraySum',
    asks: 'Count the runs of neighbouring numbers that add up to k: in [1, 2, 3] with k = 3, both [1, 2] and [3] do, so the answer is 2.',
    idea: 'Keep a running total, the prefix sum. A run from j to i sums to k exactly when the prefix sum at i minus the prefix sum before j equals k. ' +
      'So at each position, count how many earlier prefix sums equal the current one minus k, using a map of how often each prefix sum appeared. Negative numbers are fine.',
    where: { dart: 'the Solution class, replacing the subarraySum method.', typescript: 'the subarraySum function, replacing its body.' },
    steps: [
      { what: 'open the method with a map of prefix sums seen, starting with sum 0 seen once', say: 'The empty prefix has sum zero, which counts runs that start at the beginning.' },
      { what: 'add each number to the running sum and count earlier prefixes equal to sum minus k', say: 'Each matching earlier prefix marks the start of a run that adds up to k.' },
      { what: 'record the current sum in the map, then return the count', say: 'One pass with a map, so it is linear.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int subarraySum(List<int> nums, int k) {
    final seen = <int, int>{0: 1};
    var sum = 0;
    var count = 0;
//@step
    for (final n in nums) {
      sum += n;
      count += seen[sum - k] ?? 0;
//@step
      seen[sum] = (seen[sum] ?? 0) + 1;
    }
    return count;
  }
}`,
      typescript: `//@step
function subarraySum(nums: number[], k: number): number {
  const seen = new Map<number, number>([[0, 1]]);
  let sum = 0;
  let count = 0;
//@step
  for (const n of nums) {
    sum += n;
    count += seen.get(sum - k) ?? 0;
//@step
    seen.set(sum, (seen.get(sum) ?? 0) + 1);
  }
  return count;
}`
    },
    check: 'With [1, 2, 3] and k = 3: sums are 1, 3 and 6. At sum 3, sum minus k is 0, seen once, so count is 1. At sum 6, sum minus k is 3, seen once, so count is 2.',
    complexity: 'O(n) time, one pass with constant-time map operations. O(n) space for the map.',
    tests: [
      { args: [[1, 1, 1], 2], expected: 2 },
      { args: [[1, 2, 3], 3], expected: 2 },
      { args: [[1, -1, 0], 0], expected: 3 }
    ]
  },
  {
    id: 'first-missing-positive',
    title: 'First Missing Positive',
    level: 'hard',
    statement: 'Given an unsorted integer array nums, return the smallest positive integer that is not present. It must run in O(n) time and use O(1) extra space. ' +
      'Example: nums = [1,2,0] returns 3. Example: nums = [3,4,-1,1] returns 2. Example: nums = [7,8,9,11,12] returns 1.',
    signature: {
      dart: 'class Solution { int firstMissingPositive(List<int> nums) }',
      typescript: 'function firstMissingPositive(nums: number[]): number'
    },
    fn: 'firstMissingPositive',
    asks: 'Find the smallest positive number that is missing: in [3, 4, -1, 1] the number 1 is there but 2 is not, so the answer is 2.',
    idea: 'The answer is between 1 and n + 1. Use the array itself as a table: swap each value v that is between 1 and n into position v minus 1, until every slot holds its own number or a value that does not fit. ' +
      'Then the first slot i that does not hold i plus 1 gives the answer.',
    where: { dart: 'the Solution class, replacing the firstMissingPositive method.', typescript: 'the firstMissingPositive function, replacing its body.' },
    steps: [
      { what: 'open the method and, for each slot, keep swapping its value into its home position while that value is in range and not already home', say: 'I place each number v at index v minus 1, using the array as its own lookup table.' },
      { what: 'scan for the first slot that does not hold its own number', say: 'The first position whose number is wrong tells me which positive is missing.' },
      { what: 'if every slot is right, return n plus 1', say: 'If 1 to n are all there, the answer is the next number.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int firstMissingPositive(List<int> nums) {
    final n = nums.length;
    for (var i = 0; i < n; i++) {
      while (nums[i] > 0 && nums[i] <= n && nums[nums[i] - 1] != nums[i]) {
        final home = nums[i] - 1;
        final tmp = nums[home];
        nums[home] = nums[i];
        nums[i] = tmp;
      }
    }
//@step
    for (var i = 0; i < n; i++) {
      if (nums[i] != i + 1) return i + 1;
    }
//@step
    return n + 1;
  }
}`,
      typescript: `//@step
function firstMissingPositive(nums: number[]): number {
  const n = nums.length;
  for (let i = 0; i < n; i++) {
    while (nums[i] > 0 && nums[i] <= n && nums[nums[i] - 1] !== nums[i]) {
      const home = nums[i] - 1;
      [nums[home], nums[i]] = [nums[i], nums[home]];
    }
  }
//@step
  for (let i = 0; i < n; i++) {
    if (nums[i] !== i + 1) return i + 1;
  }
//@step
  return n + 1;
}`
    },
    check: 'With [3, 4, -1, 1]: 3 swaps to index 2 giving [-1, 4, 3, 1], 4 swaps to index 3 giving [-1, 1, 3, 4], then 1 swaps to index 0 giving [1, -1, 3, 4]. Scanning, index 1 holds -1 instead of 2, so the answer is 2.',
    complexity: 'O(n) time, because each swap puts a number in its final place, so there are at most n swaps. O(1) extra space.',
    tests: [
      { args: [[1, 2, 0]], expected: 3 },
      { args: [[3, 4, -1, 1]], expected: 2 },
      { args: [[7, 8, 9, 11, 12]], expected: 1 },
      { args: [[1, 1]], expected: 2 }
    ]
  }
];
