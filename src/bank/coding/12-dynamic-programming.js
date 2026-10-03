// Dynamic programming: one-dimensional and grid problems.
function dp(id, title, level, statement, sig, fn, asks, idea, steps, code, check, complexity, tests, extra = {}) {
  return {
    id, title, level, statement, signature: sig, fn, asks, idea,
    where: { dart: 'the Solution class, replacing the ' + fn + ' method.', typescript: 'the ' + fn + ' function, replacing its body.' },
    steps, code, check, complexity, tests, ...extra
  };
}

module.exports = [
  dp('climbing-stairs', 'Climbing Stairs', 'easy',
    'You are climbing a staircase of n steps and can climb 1 or 2 steps at a time. In how many distinct ways can you reach the top? Example: n = 2 returns 2. Example: n = 3 returns 3.',
    { dart: 'class Solution { int climbStairs(int n) }', typescript: 'function climbStairs(n: number): number' },
    'climbStairs',
    'Count the ways to climb n steps taking one or two at a time: 3 steps can be 1+1+1, 1+2 or 2+1.',
    'To reach step i, the last move came from step i - 1 or step i - 2, so the ways to reach i are the sum of those two. It is the Fibonacci pattern, and only the last two values need keeping.',
    [
      { what: 'open the method with the ways to reach the two previous steps', say: 'I only need the last two counts.' },
      { what: 'for each step up to n, the new count is the sum of the previous two', say: 'Every path ends with a one-step or a two-step move.' },
      { what: 'return the count for step n', say: 'Linear time, constant space.' }
    ],
    {
      dart: `//@step
class Solution {
  int climbStairs(int n) {
    var a = 1;
    var b = 1;
//@step
    for (var i = 2; i <= n; i++) {
      final next = a + b;
      a = b;
      b = next;
    }
//@step
    return b;
  }
}`,
      typescript: `//@step
function climbStairs(n: number): number {
  let a = 1;
  let b = 1;
//@step
  for (let i = 2; i <= n; i++) {
    const next = a + b;
    a = b;
    b = next;
  }
//@step
  return b;
}`
    },
    'For n = 4: the counts go 1, 1, 2, 3, 5, so there are 5 ways.',
    'O(n) time. O(1) space.',
    [{ args: [2], expected: 2 }, { args: [3], expected: 3 }, { args: [5], expected: 8 }]),
  dp('house-robber', 'House Robber', 'medium',
    'Given an array nums of money in each house along a street, return the most money you can rob without robbing two adjacent houses. Example: nums = [1,2,3,1] returns 4. Example: nums = [2,7,9,3,1] returns 12.',
    { dart: 'class Solution { int rob(List<int> nums) }', typescript: 'function rob(nums: number[]): number' },
    'rob',
    'Pick houses to rob for the biggest total, never two next to each other: in [2, 7, 9, 3, 1], 2 + 9 + 1 makes 12.',
    'At each house, the best total is either the best up to the previous house (skip this one) or this house plus the best up to two houses back. Keep just those two running values.',
    [
      { what: 'open the method with the best totals up to two houses back and one house back', say: 'Those two values are all the decision needs.' },
      { what: 'for each house, take the better of skipping it or robbing it plus the total from two back', say: 'Robbing this house rules out the previous one.' },
      { what: 'return the last best total', say: 'Linear time, constant space.' }
    ],
    {
      dart: `//@step
class Solution {
  int rob(List<int> nums) {
    var twoBack = 0;
    var oneBack = 0;
//@step
    for (final money in nums) {
      final best = oneBack > twoBack + money ? oneBack : twoBack + money;
      twoBack = oneBack;
      oneBack = best;
    }
//@step
    return oneBack;
  }
}`,
      typescript: `//@step
function rob(nums: number[]): number {
  let twoBack = 0;
  let oneBack = 0;
//@step
  for (const money of nums) {
    const best = Math.max(oneBack, twoBack + money);
    twoBack = oneBack;
    oneBack = best;
  }
//@step
  return oneBack;
}`
    },
    'With [2, 7, 9, 3, 1]: the best totals go 2, 7, 11, 11, 12, so the answer is 12.',
    'O(n) time. O(1) space.',
    [{ args: [[1, 2, 3, 1]], expected: 4 }, { args: [[2, 7, 9, 3, 1]], expected: 12 }, { args: [[]], expected: 0 }]),
  dp('house-robber-ii', 'House Robber II', 'medium',
    'Houses are arranged in a circle, so the first and last are neighbours. Given nums, the money in each house, return the most you can rob without robbing two adjacent houses. Example: nums = [2,3,2] returns 3. Example: nums = [1,2,3,1] returns 4.',
    { dart: 'class Solution { int rob(List<int> nums) }', typescript: 'function rob(nums: number[]): number' },
    'rob',
    'Same as robbing a street, but the houses form a circle, so the first and last cannot both be robbed.',
    'Because the first and last are neighbours, at least one of them is skipped. So solve the straight-line problem twice, once without the last house and once without the first, and take the better. With one house, just rob it.',
    [
      { what: 'open the method with a helper that solves the straight street between two indexes', say: 'Same two-variable logic as the street version.' },
      { what: 'handle a single house, then solve without the last house and without the first', say: 'One of the two ends is always skipped.' },
      { what: 'return the larger result', say: 'Two linear passes.' }
    ],
    {
      dart: `//@step
class Solution {
  int rob(List<int> nums) {
    int line(int from, int to) {
      var twoBack = 0;
      var oneBack = 0;
      for (var i = from; i <= to; i++) {
        final best = oneBack > twoBack + nums[i] ? oneBack : twoBack + nums[i];
        twoBack = oneBack;
        oneBack = best;
      }
      return oneBack;
    }
//@step
    if (nums.length == 1) return nums[0];
    final a = line(0, nums.length - 2);
    final b = line(1, nums.length - 1);
//@step
    return a > b ? a : b;
  }
}`,
      typescript: `//@step
function rob(nums: number[]): number {
  const line = (from: number, to: number): number => {
    let twoBack = 0;
    let oneBack = 0;
    for (let i = from; i <= to; i++) {
      const best = Math.max(oneBack, twoBack + nums[i]);
      twoBack = oneBack;
      oneBack = best;
    }
    return oneBack;
  };
//@step
  if (nums.length === 1) return nums[0];
  const a = line(0, nums.length - 2);
  const b = line(1, nums.length - 1);
//@step
  return Math.max(a, b);
}`
    },
    'With [2, 3, 2]: without the last house the best is 3, without the first it is also 3, so the answer is 3.',
    'O(n) time. O(1) space.',
    [{ args: [[2, 3, 2]], expected: 3 }, { args: [[1, 2, 3, 1]], expected: 4 }, { args: [[5]], expected: 5 }]),
  dp('coin-change', 'Coin Change', 'medium',
    'Given coin denominations coins and an amount, return the fewest coins needed to make up that amount, using unlimited coins of each kind, or -1 if it cannot be made. Example: coins = [1,2,5], amount = 11 returns 3 (5 + 5 + 1). Example: coins = [2], amount = 3 returns -1.',
    { dart: 'class Solution { int coinChange(List<int> coins, int amount) }', typescript: 'function coinChange(coins: number[], amount: number): number' },
    'coinChange',
    'Find the smallest number of coins that add up to the amount: 11 with coins 1, 2 and 5 is 5 + 5 + 1, three coins.',
    'Build up the answer for every amount from 0 to the target. The fewest coins for amount a is one plus the fewest for a minus some coin, taking the best over all coins. Amount 0 needs 0 coins.',
    [
      { what: 'open the method with a table of best counts, all set to a value larger than any real answer, and 0 for amount 0', say: 'The large value means "not reachable yet".' },
      { what: 'for every amount and coin, update the best count from amount minus that coin plus one', say: 'Each amount reuses answers for smaller amounts.' },
      { what: 'return the count for the target, or -1 if it was never reached', say: 'Amount times number of coins.' }
    ],
    {
      dart: `//@step
class Solution {
  int coinChange(List<int> coins, int amount) {
    final best = List<int>.filled(amount + 1, amount + 1);
    best[0] = 0;
//@step
    for (var a = 1; a <= amount; a++) {
      for (final c in coins) {
        if (c <= a && best[a - c] + 1 < best[a]) best[a] = best[a - c] + 1;
      }
    }
//@step
    return best[amount] > amount ? -1 : best[amount];
  }
}`,
      typescript: `//@step
function coinChange(coins: number[], amount: number): number {
  const best: number[] = new Array(amount + 1).fill(amount + 1);
  best[0] = 0;
//@step
  for (let a = 1; a <= amount; a++) {
    for (const c of coins) {
      if (c <= a) best[a] = Math.min(best[a], best[a - c] + 1);
    }
  }
//@step
  return best[amount] > amount ? -1 : best[amount];
}`
    },
    'With coins 1, 2, 5 and amount 11: amount 5 needs 1 coin, amount 10 needs 2, and amount 11 is 10 plus a 1-coin, so 3.',
    'O(amount times coins) time. O(amount) space.',
    [{ args: [[1, 2, 5], 11], expected: 3 }, { args: [[2], 3], expected: -1 }, { args: [[1], 0], expected: 0 }]),
  dp('longest-increasing-subsequence', 'Longest Increasing Subsequence', 'medium',
    'Given an integer array nums, return the length of the longest strictly increasing subsequence (not necessarily contiguous). Aim for O(n log n). Example: nums = [10,9,2,5,3,7,101,18] returns 4. Example: nums = [0,1,0,3,2,3] returns 4.',
    { dart: 'class Solution { int lengthOfLIS(List<int> nums) }', typescript: 'function lengthOfLIS(nums: number[]): number' },
    'lengthOfLIS',
    'Find the longest run of numbers that keep increasing, picking them in order but not necessarily next to each other: in the first example, 2, 3, 7, 101 has length 4.',
    'Keep a list tails where tails[i] is the smallest possible last value of an increasing subsequence of length i plus 1. For each number, binary search the first tail that is at least as big and replace it, or append if the number is bigger than all. The list length is the answer.',
    [
      { what: 'open the method with an empty tails list', say: 'Small tails leave the most room to extend later.' },
      { what: 'for each number, binary search the first tail at least as big, and replace it or append', say: 'Replacing keeps tails as small as possible without changing the length found.' },
      { what: 'return the length of tails', say: 'n log n time.' }
    ],
    {
      dart: `//@step
class Solution {
  int lengthOfLIS(List<int> nums) {
    final tails = <int>[];
//@step
    for (final n in nums) {
      var low = 0;
      var high = tails.length;
      while (low < high) {
        final mid = (low + high) ~/ 2;
        if (tails[mid] < n) {
          low = mid + 1;
        } else {
          high = mid;
        }
      }
      if (low == tails.length) {
        tails.add(n);
      } else {
        tails[low] = n;
      }
    }
//@step
    return tails.length;
  }
}`,
      typescript: `//@step
function lengthOfLIS(nums: number[]): number {
  const tails: number[] = [];
//@step
  for (const n of nums) {
    let low = 0;
    let high = tails.length;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (tails[mid] < n) low = mid + 1;
      else high = mid;
    }
    tails[low] = n;
  }
//@step
  return tails.length;
}`
    },
    'With [10, 9, 2, 5, 3, 7, 101, 18]: tails becomes [10], then [9], [2], [2, 5], [2, 3], [2, 3, 7], [2, 3, 7, 101], and 18 replaces 101. Length 4.',
    'O(n log n) time. O(n) space.',
    [{ args: [[10, 9, 2, 5, 3, 7, 101, 18]], expected: 4 }, { args: [[0, 1, 0, 3, 2, 3]], expected: 4 }, { args: [[7, 7, 7, 7]], expected: 1 }]),
  dp('word-break', 'Word Break', 'medium',
    'Given a string s and a dictionary wordDict, return true if s can be split into a sequence of one or more dictionary words, reusing words as needed. Example: s = "leetcode", wordDict = ["leet","code"] returns true. Example: s = "catsandog", wordDict = ["cats","dog","sand","and","cat"] returns false.',
    { dart: 'class Solution { bool wordBreak(String s, List<String> wordDict) }', typescript: 'function wordBreak(s: string, wordDict: string[]): boolean' },
    'wordBreak',
    'Check whether the text can be cut entirely into dictionary words: "leetcode" is "leet" plus "code".',
    'Let ok[i] mean the first i characters can be split. ok[0] is true. For each end position i, look for a split point j where ok[j] is true and the piece from j to i is a word.',
    [
      { what: 'open the method with the words in a set and a table ok with ok[0] true', say: 'The empty prefix can always be split.' },
      { what: 'for each end i, set ok[i] if some earlier split point j is ok and s from j to i is a word', say: 'A good prefix plus one word is a good longer prefix.' },
      { what: 'return ok for the full length', say: 'n squared checks, each a substring lookup.' }
    ],
    {
      dart: `//@step
class Solution {
  bool wordBreak(String s, List<String> wordDict) {
    final words = wordDict.toSet();
    final ok = List<bool>.filled(s.length + 1, false);
    ok[0] = true;
//@step
    for (var i = 1; i <= s.length; i++) {
      for (var j = 0; j < i; j++) {
        if (ok[j] && words.contains(s.substring(j, i))) {
          ok[i] = true;
          break;
        }
      }
    }
//@step
    return ok[s.length];
  }
}`,
      typescript: `//@step
function wordBreak(s: string, wordDict: string[]): boolean {
  const words = new Set(wordDict);
  const ok: boolean[] = new Array(s.length + 1).fill(false);
  ok[0] = true;
//@step
  for (let i = 1; i <= s.length; i++) {
    for (let j = 0; j < i; j++) {
      if (ok[j] && words.has(s.substring(j, i))) {
        ok[i] = true;
        break;
      }
    }
  }
//@step
  return ok[s.length];
}`
    },
    'With "leetcode": ok[4] becomes true because "leet" is a word, and ok[8] becomes true because ok[4] is true and "code" is a word. Answer true.',
    'O(n squared) substring checks, each O(n) to build, so O(n cubed) in the worst case. O(n) space.',
    [{ args: ['leetcode', ['leet', 'code']], expected: true }, { args: ['applepenapple', ['apple', 'pen']], expected: true }, { args: ['catsandog', ['cats', 'dog', 'sand', 'and', 'cat']], expected: false }]),
  dp('decode-ways', 'Decode Ways', 'medium',
    'A message of letters is encoded as numbers, A = 1 to Z = 26. Given a string s of digits, return the number of ways to decode it. A digit or pair with a leading zero is invalid. Example: s = "12" returns 2 ("AB" or "L"). Example: s = "226" returns 3. Example: s = "06" returns 0.',
    { dart: 'class Solution { int numDecodings(String s) }', typescript: 'function numDecodings(s: string): number' },
    'numDecodings',
    'Count how many ways a string of digits can be read as letters, where 1 to 26 map to A to Z: "226" can be 2 2 6, 22 6 or 2 26.',
    'Like climbing stairs: the ways to decode up to position i come from taking the last digit alone, if it is not 0, plus taking the last two digits together, if they form 10 to 26.',
    [
      { what: 'open the method with the counts for the empty prefix and the first character', say: 'A leading zero makes the whole string undecodable.' },
      { what: 'for each next position, add the count from one back if the single digit is valid, and from two back if the pair is 10 to 26', say: 'Each valid last chunk extends the decodings of what came before.' },
      { what: 'return the count for the full string', say: 'Linear time, constant space.' }
    ],
    {
      dart: `//@step
class Solution {
  int numDecodings(String s) {
    var twoBack = 1;
    var oneBack = s[0] == '0' ? 0 : 1;
//@step
    for (var i = 2; i <= s.length; i++) {
      var current = 0;
      if (s[i - 1] != '0') current += oneBack;
      final pair = int.parse(s.substring(i - 2, i));
      if (pair >= 10 && pair <= 26) current += twoBack;
      twoBack = oneBack;
      oneBack = current;
    }
//@step
    return oneBack;
  }
}`,
      typescript: `//@step
function numDecodings(s: string): number {
  let twoBack = 1;
  let oneBack = s[0] === '0' ? 0 : 1;
//@step
  for (let i = 2; i <= s.length; i++) {
    let current = 0;
    if (s[i - 1] !== '0') current += oneBack;
    const pair = Number(s.substring(i - 2, i));
    if (pair >= 10 && pair <= 26) current += twoBack;
    twoBack = oneBack;
    oneBack = current;
  }
//@step
  return oneBack;
}`
    },
    'With "226": after "2" there is 1 way; after "22" there are 2, since 2 alone and 22 both work; after "226" there are 3, since 6 alone gives 2 ways and 26 gives 1 more.',
    'O(n) time. O(1) space.',
    [{ args: ['12'], expected: 2 }, { args: ['226'], expected: 3 }, { args: ['06'], expected: 0 }, { args: ['10'], expected: 1 }],
    { signature: { dart: 'class Solution { int numDecodings(String s) }', typescript: 'function numDecodings(s: string): number' } }),
  dp('min-cost-climbing-stairs', 'Min Cost Climbing Stairs', 'easy',
    'Given an array cost where cost[i] is the price of step i, you can start at step 0 or 1 and climb one or two steps after paying for a step. Return the minimum cost to reach the top, beyond the last step. Example: cost = [10,15,20] returns 15. Example: cost = [1,100,1,1,1,100,1,1,100,1] returns 6.',
    { dart: 'class Solution { int minCostClimbingStairs(List<int> cost) }', typescript: 'function minCostClimbingStairs(cost: number[]): number' },
    'minCostClimbingStairs',
    'Find the cheapest way up the stairs when each step you stand on costs money and you can move one or two steps at a time.',
    'The cheapest way to reach step i is the smaller of reaching step i - 1 and paying for it, or reaching step i - 2 and paying for that. The top is one position past the last step.',
    [
      { what: 'open the method with the cost to reach steps 0 and 1, both zero', say: 'Starting on either of the first two steps is free.' },
      { what: 'for each position up to the top, take the cheaper of the two ways to arrive', say: 'Arriving means paying for the step you came from.' },
      { what: 'return the cost to reach the top', say: 'Linear time, constant space.' }
    ],
    {
      dart: `//@step
class Solution {
  int minCostClimbingStairs(List<int> cost) {
    var twoBack = 0;
    var oneBack = 0;
//@step
    for (var i = 2; i <= cost.length; i++) {
      final a = oneBack + cost[i - 1];
      final b = twoBack + cost[i - 2];
      twoBack = oneBack;
      oneBack = a < b ? a : b;
    }
//@step
    return oneBack;
  }
}`,
      typescript: `//@step
function minCostClimbingStairs(cost: number[]): number {
  let twoBack = 0;
  let oneBack = 0;
//@step
  for (let i = 2; i <= cost.length; i++) {
    const next = Math.min(oneBack + cost[i - 1], twoBack + cost[i - 2]);
    twoBack = oneBack;
    oneBack = next;
  }
//@step
  return oneBack;
}`
    },
    'With [10, 15, 20]: reaching step 2 costs 10, reaching the top costs the smaller of 10 + 20 and 0 + 15, which is 15.',
    'O(n) time. O(1) space.',
    [{ args: [[10, 15, 20]], expected: 15 }, { args: [[1, 100, 1, 1, 1, 100, 1, 1, 100, 1]], expected: 6 }]),
  dp('partition-equal-subset-sum', 'Partition Equal Subset Sum', 'medium',
    'Given an array nums of positive integers, return true if it can be split into two subsets with equal sums. Example: nums = [1,5,11,5] returns true ([1,5,5] and [11]). Example: nums = [1,2,3,5] returns false.',
    { dart: 'class Solution { bool canPartition(List<int> nums) }', typescript: 'function canPartition(nums: number[]): boolean' },
    'canPartition',
    'Check whether the numbers can be split into two groups with the same total.',
    'If the total is odd, it is impossible. Otherwise we need a subset that sums to half the total. Track which sums are reachable with a boolean table, going through the numbers and updating sums from high to low so each number is used once.',
    [
      { what: 'open the method, return false for an odd total, and set the target to half', say: 'Two equal halves need an even total.' },
      { what: 'mark sum 0 reachable, then for each number update reachable sums from the target down', say: 'Going downwards stops a number being counted twice.' },
      { what: 'return whether the target is reachable', say: 'n times target time.' }
    ],
    {
      dart: `//@step
class Solution {
  bool canPartition(List<int> nums) {
    final total = nums.fold<int>(0, (a, b) => a + b);
    if (total.isOdd) return false;
    final target = total ~/ 2;
//@step
    final reachable = List<bool>.filled(target + 1, false);
    reachable[0] = true;
    for (final n in nums) {
      for (var s = target; s >= n; s--) {
        if (reachable[s - n]) reachable[s] = true;
      }
    }
//@step
    return reachable[target];
  }
}`,
      typescript: `//@step
function canPartition(nums: number[]): boolean {
  const total = nums.reduce((a, b) => a + b, 0);
  if (total % 2 === 1) return false;
  const target = total / 2;
//@step
  const reachable: boolean[] = new Array(target + 1).fill(false);
  reachable[0] = true;
  for (const n of nums) {
    for (let s = target; s >= n; s--) {
      if (reachable[s - n]) reachable[s] = true;
    }
  }
//@step
  return reachable[target];
}`
    },
    'With [1, 5, 11, 5]: the total is 22, so the target is 11. After 1, 5 and 11, the sum 11 is reachable from 11 alone, so the answer is true.',
    'O(n times target) time. O(target) space.',
    [{ args: [[1, 5, 11, 5]], expected: true }, { args: [[1, 2, 3, 5]], expected: false }, { args: [[2, 2]], expected: true }]),
  dp('maximum-product-subarray', 'Maximum Product Subarray', 'medium',
    'Given an integer array nums, find the contiguous subarray with the largest product and return that product. Example: nums = [2,3,-2,4] returns 6. Example: nums = [-2,0,-1] returns 0. Example: nums = [-2,3,-4] returns 24.',
    { dart: 'class Solution { int maxProduct(List<int> nums) }', typescript: 'function maxProduct(nums: number[]): number' },
    'maxProduct',
    'Find the run of neighbouring numbers whose product is largest: in [-2, 3, -4] the whole array gives 24.',
    'A negative number turns the smallest product into the largest. So track both the largest and the smallest product ending at each position; the new values come from the number itself, or the number times the previous largest or smallest.',
    [
      { what: 'open the method with the current maximum, minimum and best, all starting at the first number', say: 'The minimum matters because two negatives make a positive.' },
      { what: 'for each next number, compute the new maximum and minimum from the three candidates', say: 'A zero resets both, since the number alone is a candidate.' },
      { what: 'track the best maximum and return it', say: 'Linear time, constant space.' }
    ],
    {
      dart: `//@step
class Solution {
  int maxProduct(List<int> nums) {
    var hi = nums[0];
    var lo = nums[0];
    var best = nums[0];
//@step
    for (var i = 1; i < nums.length; i++) {
      final n = nums[i];
      final a = hi * n;
      final b = lo * n;
      hi = [n, a, b].reduce((x, y) => x > y ? x : y);
      lo = [n, a, b].reduce((x, y) => x < y ? x : y);
//@step
      if (hi > best) best = hi;
    }
    return best;
  }
}`,
      typescript: `//@step
function maxProduct(nums: number[]): number {
  let hi = nums[0];
  let lo = nums[0];
  let best = nums[0];
//@step
  for (let i = 1; i < nums.length; i++) {
    const n = nums[i];
    const a = hi * n;
    const b = lo * n;
    hi = Math.max(n, a, b);
    lo = Math.min(n, a, b);
//@step
    best = Math.max(best, hi);
  }
  return best;
}`
    },
    'With [-2, 3, -4]: after 3 the maximum is 3 and the minimum -6. Times -4, the minimum becomes the new maximum, 24.',
    'O(n) time. O(1) space.',
    [{ args: [[2, 3, -2, 4]], expected: 6 }, { args: [[-2, 0, -1]], expected: 0 }, { args: [[-2, 3, -4]], expected: 24 }]),
  dp('unique-paths', 'Unique Paths', 'medium',
    'A robot starts at the top-left corner of an m x n grid and can only move right or down. Return the number of unique paths to the bottom-right corner. Example: m = 3, n = 7 returns 28. Example: m = 3, n = 2 returns 3.',
    { dart: 'class Solution { int uniquePaths(int m, int n) }', typescript: 'function uniquePaths(m: number, n: number): number' },
    'uniquePaths',
    'Count the routes from the top-left to the bottom-right corner moving only right or down.',
    'The paths into a cell are the paths into the cell above plus the cell to the left. The first row and column have one path each. A single row array updated left to right is enough.',
    [
      { what: 'open the method with one row of ones', say: 'Every cell in the first row has exactly one path.' },
      { what: 'for each following row, add the left neighbour into each cell', say: 'The value already there is the cell above.' },
      { what: 'return the last cell', say: 'm times n time, n space.' }
    ],
    {
      dart: `//@step
class Solution {
  int uniquePaths(int m, int n) {
    final row = List<int>.filled(n, 1);
//@step
    for (var r = 1; r < m; r++) {
      for (var c = 1; c < n; c++) {
        row[c] += row[c - 1];
      }
    }
//@step
    return row[n - 1];
  }
}`,
      typescript: `//@step
function uniquePaths(m: number, n: number): number {
  const row: number[] = new Array(n).fill(1);
//@step
  for (let r = 1; r < m; r++) {
    for (let c = 1; c < n; c++) row[c] += row[c - 1];
  }
//@step
  return row[n - 1];
}`
    },
    'With a 3 by 2 grid: the first row is [1, 1]; the second becomes [1, 2]; the third becomes [1, 3]. Answer 3.',
    'O(m times n) time. O(n) space.',
    [{ args: [3, 7], expected: 28 }, { args: [3, 2], expected: 3 }, { args: [1, 1], expected: 1 }]),
  dp('longest-common-subsequence', 'Longest Common Subsequence', 'medium',
    'Given two strings text1 and text2, return the length of their longest common subsequence, letters that appear in both in the same order but not necessarily together, or 0 if none. Example: text1 = "abcde", text2 = "ace" returns 3. Example: text1 = "abc", text2 = "def" returns 0.',
    { dart: 'class Solution { int longestCommonSubsequence(String text1, String text2) }', typescript: 'function longestCommonSubsequence(text1: string, text2: string): number' },
    'longestCommonSubsequence',
    'Find the longest sequence of letters that appears, in order, in both strings: "abcde" and "ace" share "ace", length 3.',
    'Fill a grid where cell i, j is the answer for the first i letters of one string and the first j of the other. If the letters match, it is one more than the diagonal cell; otherwise the better of the cell above and the cell to the left.',
    [
      { what: 'open the method with a grid of zeros, one larger in each direction', say: 'The extra row and column stand for an empty prefix.' },
      { what: 'fill each cell from the diagonal on a match, else the larger of up and left', say: 'A match extends the best answer without those two letters.' },
      { what: 'return the bottom-right cell', say: 'm times n time and space.' }
    ],
    {
      dart: `//@step
class Solution {
  int longestCommonSubsequence(String text1, String text2) {
    final m = text1.length;
    final n = text2.length;
    final dp = List.generate(m + 1, (_) => List<int>.filled(n + 1, 0));
//@step
    for (var i = 1; i <= m; i++) {
      for (var j = 1; j <= n; j++) {
        if (text1[i - 1] == text2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = dp[i - 1][j] > dp[i][j - 1] ? dp[i - 1][j] : dp[i][j - 1];
        }
      }
    }
//@step
    return dp[m][n];
  }
}`,
      typescript: `//@step
function longestCommonSubsequence(text1: string, text2: string): number {
  const m = text1.length;
  const n = text2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
//@step
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = text1[i - 1] === text2[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
//@step
  return dp[m][n];
}`
    },
    'With "abcde" and "ace": a matches a for 1, c matches c after b is skipped for 2, and e matches e for 3. The bottom-right cell is 3.',
    'O(m times n) time and space.',
    [{ args: ['abcde', 'ace'], expected: 3 }, { args: ['abc', 'abc'], expected: 3 }, { args: ['abc', 'def'], expected: 0 }]),
  dp('edit-distance', 'Edit Distance', 'medium',
    'Given two strings word1 and word2, return the minimum number of operations to turn word1 into word2, where an operation inserts, deletes or replaces one character. Example: word1 = "horse", word2 = "ros" returns 3. Example: word1 = "intention", word2 = "execution" returns 5.',
    { dart: 'class Solution { int minDistance(String word1, String word2) }', typescript: 'function minDistance(word1: string, word2: string): number' },
    'minDistance',
    'Count the fewest single-letter inserts, deletes or replacements to turn one word into the other: "horse" into "ros" takes 3.',
    'Cell i, j is the cost to turn the first i letters into the first j. Turning anything into an empty string costs its length. If the letters match, take the diagonal; otherwise one plus the smallest of replace (diagonal), delete (up) and insert (left).',
    [
      { what: 'open the method with a grid whose first row and column count up from 0', say: 'Converting to or from an empty prefix costs its length.' },
      { what: 'fill each cell from the diagonal on a match, else one plus the cheapest of the three neighbours', say: 'The three neighbours are replace, delete and insert.' },
      { what: 'return the bottom-right cell', say: 'm times n time and space.' }
    ],
    {
      dart: `//@step
class Solution {
  int minDistance(String word1, String word2) {
    final m = word1.length;
    final n = word2.length;
    final dp = List.generate(m + 1, (i) => List<int>.generate(n + 1, (j) => i == 0 ? j : (j == 0 ? i : 0)));
//@step
    for (var i = 1; i <= m; i++) {
      for (var j = 1; j <= n; j++) {
        if (word1[i - 1] == word2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          var best = dp[i - 1][j - 1];
          if (dp[i - 1][j] < best) best = dp[i - 1][j];
          if (dp[i][j - 1] < best) best = dp[i][j - 1];
          dp[i][j] = best + 1;
        }
      }
    }
//@step
    return dp[m][n];
  }
}`,
      typescript: `//@step
function minDistance(word1: string, word2: string): number {
  const m = word1.length;
  const n = word2.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
//@step
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = word1[i - 1] === word2[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
//@step
  return dp[m][n];
}`
    },
    'With "horse" and "ros": replace h with r, delete r, delete e, for 3 operations, and the grid confirms 3 in the bottom-right cell.',
    'O(m times n) time and space.',
    [{ args: ['horse', 'ros'], expected: 3 }, { args: ['intention', 'execution'], expected: 5 }, { args: ['', 'a'], expected: 1 }]),
  dp('longest-palindromic-substring', 'Longest Palindromic Substring', 'medium',
    'Given a string s, return the longest substring that is a palindrome. If several have the same length, return the first one. Example: s = "babad" returns "bab". Example: s = "cbbd" returns "bb".',
    { dart: 'class Solution { String longestPalindrome(String s) }', typescript: 'function longestPalindrome(s: string): string' },
    'longestPalindrome',
    'Find the longest part of the text that reads the same both ways: in "babad" it is "bab".',
    'Every palindrome has a centre: one character for odd lengths, or the gap between two characters for even lengths. Expand outwards from each of the 2n - 1 centres while the ends match, and keep the longest.',
    [
      { what: 'open the method with the best start and length, and a helper that expands from a centre', say: 'Expanding from the middle finds the longest palindrome at each centre.' },
      { what: 'for each index, expand from the character and from the gap after it', say: 'Odd and even lengths have different kinds of centre.' },
      { what: 'return the best substring', say: 'n squared time, constant extra space.' }
    ],
    {
      dart: `//@step
class Solution {
  String longestPalindrome(String s) {
    var start = 0;
    var length = 0;
    void expand(int lo, int hi) {
      while (lo >= 0 && hi < s.length && s[lo] == s[hi]) {
        lo--;
        hi++;
      }
      if (hi - lo - 1 > length) {
        start = lo + 1;
        length = hi - lo - 1;
      }
    }
//@step
    for (var i = 0; i < s.length; i++) {
      expand(i, i);
      expand(i, i + 1);
    }
//@step
    return s.substring(start, start + length);
  }
}`,
      typescript: `//@step
function longestPalindrome(s: string): string {
  let start = 0;
  let length = 0;
  const expand = (lo: number, hi: number): void => {
    while (lo >= 0 && hi < s.length && s[lo] === s[hi]) {
      lo--;
      hi++;
    }
    if (hi - lo - 1 > length) {
      start = lo + 1;
      length = hi - lo - 1;
    }
  };
//@step
  for (let i = 0; i < s.length; i++) {
    expand(i, i);
    expand(i, i + 1);
  }
//@step
  return s.substring(start, start + length);
}`
    },
    'With "babad": centred on the first a, b and b match, giving "bab", length 3. Centred on the second a, "aba" also has length 3 but is not longer, so the first, "bab", is kept.',
    'O(n squared) time. O(1) extra space.',
    [{ args: ['babad'], expected: 'bab' }, { args: ['cbbd'], expected: 'bb' }, { args: ['a'], expected: 'a' }]),
  dp('target-sum', 'Target Sum', 'medium',
    'Given an integer array nums and an integer target, put a + or - in front of every number and return how many ways the expression can equal target. Example: nums = [1,1,1,1,1], target = 3 returns 5. Example: nums = [1], target = 1 returns 1.',
    { dart: 'class Solution { int findTargetSumWays(List<int> nums, int target) }', typescript: 'function findTargetSumWays(nums: number[], target: number): number' },
    'findTargetSumWays',
    'Count the ways to choose a plus or minus sign for every number so the total equals the target.',
    'Track how many ways each running sum can be reached. Start with sum 0 reached one way; for each number, every sum s spreads to s plus the number and s minus the number. A map of sums to counts keeps it simple.',
    [
      { what: 'open the method with a map of reachable sums, starting with 0 reached once', say: 'The map counts the ways to reach each total so far.' },
      { what: 'for each number, build a new map where every sum moves up and down by that number', say: 'Every earlier way splits into a plus and a minus way.' },
      { what: 'return the count for the target, or 0', say: 'n times the range of sums.' }
    ],
    {
      dart: `//@step
class Solution {
  int findTargetSumWays(List<int> nums, int target) {
    var ways = <int, int>{0: 1};
//@step
    for (final n in nums) {
      final next = <int, int>{};
      ways.forEach((sum, count) {
        next[sum + n] = (next[sum + n] ?? 0) + count;
        next[sum - n] = (next[sum - n] ?? 0) + count;
      });
      ways = next;
    }
//@step
    return ways[target] ?? 0;
  }
}`,
      typescript: `//@step
function findTargetSumWays(nums: number[], target: number): number {
  let ways = new Map<number, number>([[0, 1]]);
//@step
  for (const n of nums) {
    const next = new Map<number, number>();
    for (const [sum, count] of ways) {
      next.set(sum + n, (next.get(sum + n) ?? 0) + count);
      next.set(sum - n, (next.get(sum - n) ?? 0) + count);
    }
    ways = next;
  }
//@step
  return ways.get(target) ?? 0;
}`
    },
    'With five 1s and target 3: a total of 3 needs four plus signs and one minus sign, and the minus can go on any of the five numbers, so 5 ways.',
    'O(n times S) time and space, where S is the range of possible sums.',
    [{ args: [[1, 1, 1, 1, 1], 3], expected: 5 }, { args: [[1], 1], expected: 1 }, { args: [[1, 0], 1], expected: 2 }])
];
