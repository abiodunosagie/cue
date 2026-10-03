// Sliding window: a range that grows on the right and shrinks on the left.
module.exports = [
  {
    id: 'longest-substring-without-repeating',
    title: 'Longest Substring Without Repeating Characters',
    level: 'medium',
    statement: 'Given a string s, find the length of the longest substring without repeating characters. ' +
      'Example: s = "abcabcbb" returns 3 ("abc"). Example: s = "bbbbb" returns 1. Example: s = "pwwkew" returns 3 ("wke").',
    signature: { dart: 'class Solution { int lengthOfLongestSubstring(String s) }', typescript: 'function lengthOfLongestSubstring(s: string): number' },
    fn: 'lengthOfLongestSubstring',
    asks: 'Find the longest stretch of the text with no letter repeated: in "abcabcbb" that is "abc", length 3.',
    idea: 'Slide a window over the string. Remember the last index of each character. When the new character was already seen inside the window, ' +
      'jump the window\'s start just past that earlier position. The window then never contains repeats, and its largest size is the answer.',
    where: { dart: 'the Solution class, replacing the lengthOfLongestSubstring method.', typescript: 'the lengthOfLongestSubstring function, replacing its body.' },
    steps: [
      { what: 'open the method with a map of last positions, the window start and the best length', say: 'The map tells me where each character was last seen.' },
      { what: 'for each character, move the start past its previous position if that is inside the window', say: 'That removes the repeat in one jump instead of shrinking one by one.' },
      { what: 'record the position, update the best length, and return it', say: 'Each character is visited once, so it is linear.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int lengthOfLongestSubstring(String s) {
    final last = <String, int>{};
    var start = 0;
    var best = 0;
//@step
    for (var i = 0; i < s.length; i++) {
      final prev = last[s[i]];
      if (prev != null && prev >= start) start = prev + 1;
//@step
      last[s[i]] = i;
      if (i - start + 1 > best) best = i - start + 1;
    }
    return best;
  }
}`,
      typescript: `//@step
function lengthOfLongestSubstring(s: string): number {
  const last = new Map<string, number>();
  let start = 0;
  let best = 0;
//@step
  for (let i = 0; i < s.length; i++) {
    const prev = last.get(s[i]);
    if (prev !== undefined && prev >= start) start = prev + 1;
//@step
    last.set(s[i], i);
    best = Math.max(best, i - start + 1);
  }
  return best;
}`
    },
    check: 'With "abcabcbb": a, b, c grow the window to 3. The next a was seen at 0, so the start moves to 1, keeping length 3. The pattern repeats, and the best stays 3.',
    complexity: 'O(n) time, one pass. O(k) space for the map, where k is the number of distinct characters.',
    tests: [
      { args: ['abcabcbb'], expected: 3 },
      { args: ['bbbbb'], expected: 1 },
      { args: ['pwwkew'], expected: 3 },
      { args: [''], expected: 0 },
      { args: ['abba'], expected: 2 }
    ]
  },
  {
    id: 'longest-repeating-character-replacement',
    title: 'Longest Repeating Character Replacement',
    level: 'medium',
    statement: 'Given a string s of uppercase English letters and an integer k, you may change at most k characters to any other uppercase letter. ' +
      'Return the length of the longest substring containing a single repeated letter you can get. Example: s = "ABAB", k = 2 returns 4. Example: s = "AABABBA", k = 1 returns 4.',
    signature: { dart: 'class Solution { int characterReplacement(String s, int k) }', typescript: 'function characterReplacement(s: string, k: number): number' },
    fn: 'characterReplacement',
    asks: 'With up to k letter changes, how long a block of one repeated letter can you make: in "AABABBA" with one change, "AABA" becomes "AAAA", length 4.',
    idea: 'A window is fine if its length minus the count of its most common letter is at most k, because those are the letters to change. ' +
      'Grow the window on the right; when it becomes invalid, move the left side by one. The best window length is the answer.',
    where: { dart: 'the Solution class, replacing the characterReplacement method.', typescript: 'the characterReplacement function, replacing its body.' },
    steps: [
      { what: 'open the method with letter counts, the window start, the highest count seen and the best length', say: 'I count letters inside the window.' },
      { what: 'add each letter, and if the window needs more than k changes, drop the leftmost letter', say: 'The letters to change are the window size minus the most frequent letter.' },
      { what: 'update the best window length and return it', say: 'Each letter enters and leaves the window once, so it is linear.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int characterReplacement(String s, int k) {
    final counts = List<int>.filled(26, 0);
    var start = 0;
    var top = 0;
    var best = 0;
//@step
    for (var i = 0; i < s.length; i++) {
      final c = s.codeUnitAt(i) - 65;
      counts[c]++;
      if (counts[c] > top) top = counts[c];
      if (i - start + 1 - top > k) {
        counts[s.codeUnitAt(start) - 65]--;
        start++;
      }
//@step
      if (i - start + 1 > best) best = i - start + 1;
    }
    return best;
  }
}`,
      typescript: `//@step
function characterReplacement(s: string, k: number): number {
  const counts: number[] = new Array(26).fill(0);
  let start = 0;
  let top = 0;
  let best = 0;
//@step
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i) - 65;
    counts[c]++;
    top = Math.max(top, counts[c]);
    if (i - start + 1 - top > k) {
      counts[s.charCodeAt(start) - 65]--;
      start++;
    }
//@step
    best = Math.max(best, i - start + 1);
  }
  return best;
}`
    },
    check: 'With "ABAB" and k = 2: the window grows to all four letters; the top count is 2, so 4 minus 2 is 2 changes, which is allowed. Answer 4.',
    complexity: 'O(n) time. O(1) space, 26 counters.',
    tests: [
      { args: ['ABAB', 2], expected: 4 },
      { args: ['AABABBA', 1], expected: 4 },
      { args: ['A', 0], expected: 1 }
    ]
  },
  {
    id: 'minimum-window-substring',
    title: 'Minimum Window Substring',
    level: 'hard',
    statement: 'Given strings s and t, return the shortest substring of s that contains every character of t, including duplicates. If there is none, return an empty string. The answer is unique. ' +
      'Example: s = "ADOBECODEBANC", t = "ABC" returns "BANC". Example: s = "a", t = "aa" returns "".',
    signature: { dart: 'class Solution { String minWindow(String s, String t) }', typescript: 'function minWindow(s: string, t: string): string' },
    fn: 'minWindow',
    asks: 'Find the shortest piece of s that contains all the letters of t: in "ADOBECODEBANC" with "ABC", that is "BANC".',
    idea: 'Count what t needs. Grow a window on the right, tracking how many of the needed characters are covered. ' +
      'Once everything is covered, shrink from the left as far as possible while still covering, recording the smallest window. Then continue growing.',
    where: { dart: 'the Solution class, replacing the minWindow method.', typescript: 'the minWindow function, replacing its body.' },
    steps: [
      { what: 'open the method and count how many of each character t needs', say: 'need tells me how many of each character are still missing.' },
      { what: 'grow the window on the right, lowering the missing count when a needed character comes in', say: 'missing reaches zero when the window covers all of t.' },
      { what: 'while everything is covered, record the window if it is the smallest, then shrink from the left', say: 'Shrinking finds the tightest window ending at this position.' },
      { what: 'return the smallest window, or an empty string', say: 'Each character enters and leaves once, so it is linear.' }
    ],
    code: {
      dart: `//@step
class Solution {
  String minWindow(String s, String t) {
    final need = <String, int>{};
    for (final c in t.split('')) {
      need[c] = (need[c] ?? 0) + 1;
    }
    var missing = t.length;
    var start = 0;
    var bestStart = 0;
    var bestLen = -1;
//@step
    for (var i = 0; i < s.length; i++) {
      final c = s[i];
      if ((need[c] ?? 0) > 0) missing--;
      need[c] = (need[c] ?? 0) - 1;
//@step
      while (missing == 0) {
        if (bestLen == -1 || i - start + 1 < bestLen) {
          bestStart = start;
          bestLen = i - start + 1;
        }
        final out = s[start];
        need[out] = need[out]! + 1;
        if (need[out]! > 0) missing++;
        start++;
      }
    }
//@step
    return bestLen == -1 ? '' : s.substring(bestStart, bestStart + bestLen);
  }
}`,
      typescript: `//@step
function minWindow(s: string, t: string): string {
  const need = new Map<string, number>();
  for (const c of t) need.set(c, (need.get(c) ?? 0) + 1);
  let missing = t.length;
  let start = 0;
  let bestStart = 0;
  let bestLen = -1;
//@step
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if ((need.get(c) ?? 0) > 0) missing--;
    need.set(c, (need.get(c) ?? 0) - 1);
//@step
    while (missing === 0) {
      if (bestLen === -1 || i - start + 1 < bestLen) {
        bestStart = start;
        bestLen = i - start + 1;
      }
      const out = s[start];
      need.set(out, (need.get(out) as number) + 1);
      if ((need.get(out) as number) > 0) missing++;
      start++;
    }
  }
//@step
  return bestLen === -1 ? '' : s.substring(bestStart, bestStart + bestLen);
}`
    },
    check: 'With "ADOBECODEBANC" and "ABC": the first full window is "ADOBEC", length 6. Moving on, windows are shrunk each time all three are covered, and the smallest found is "BANC" at the end, length 4.',
    complexity: 'O(m + n) time, each character of s enters and leaves the window once. O(k) space for the counts.',
    tests: [
      { args: ['ADOBECODEBANC', 'ABC'], expected: 'BANC' },
      { args: ['a', 'a'], expected: 'a' },
      { args: ['a', 'aa'], expected: '' }
    ]
  },
  {
    id: 'permutation-in-string',
    title: 'Permutation in String',
    level: 'medium',
    statement: 'Given two strings s1 and s2 of lowercase letters, return true if s2 contains a permutation of s1 as a substring, meaning some rearrangement of s1 appears in s2. ' +
      'Example: s1 = "ab", s2 = "eidbaooo" returns true ("ba"). Example: s1 = "ab", s2 = "eidboaoo" returns false.',
    signature: { dart: 'class Solution { bool checkInclusion(String s1, String s2) }', typescript: 'function checkInclusion(s1: string, s2: string): boolean' },
    fn: 'checkInclusion',
    asks: 'Check whether some shuffle of s1 appears as a block in s2: "ab" appears as "ba" inside "eidbaooo".',
    idea: 'A permutation has the same letter counts. Slide a window the length of s1 across s2, keeping letter counts for the window, and compare with the counts of s1. ' +
      'Moving the window changes just one letter in and one out.',
    where: { dart: 'the Solution class, replacing the checkInclusion method.', typescript: 'the checkInclusion function, replacing its body.' },
    steps: [
      { what: 'open the method, return false if s1 is longer, and count the letters of s1', say: 'A permutation must have exactly the same letter counts.' },
      { what: 'slide a window of the same length over s2, adding the new letter and removing the one that left', say: 'Each step changes only two counts.' },
      { what: 'return true as soon as the window counts equal s1\'s counts, else false at the end', say: 'Comparing 26 counts per step keeps it linear.' }
    ],
    code: {
      dart: `//@step
class Solution {
  bool checkInclusion(String s1, String s2) {
    if (s1.length > s2.length) return false;
    final want = List<int>.filled(26, 0);
    final have = List<int>.filled(26, 0);
    for (var i = 0; i < s1.length; i++) {
      want[s1.codeUnitAt(i) - 97]++;
    }
    bool same() {
      for (var i = 0; i < 26; i++) {
        if (want[i] != have[i]) return false;
      }
      return true;
    }
//@step
    for (var i = 0; i < s2.length; i++) {
      have[s2.codeUnitAt(i) - 97]++;
      if (i >= s1.length) have[s2.codeUnitAt(i - s1.length) - 97]--;
//@step
      if (i >= s1.length - 1 && same()) return true;
    }
    return false;
  }
}`,
      typescript: `//@step
function checkInclusion(s1: string, s2: string): boolean {
  if (s1.length > s2.length) return false;
  const want: number[] = new Array(26).fill(0);
  const have: number[] = new Array(26).fill(0);
  for (const c of s1) want[c.charCodeAt(0) - 97]++;
  const same = () => want.every((v, i) => v === have[i]);
//@step
  for (let i = 0; i < s2.length; i++) {
    have[s2.charCodeAt(i) - 97]++;
    if (i >= s1.length) have[s2.charCodeAt(i - s1.length) - 97]--;
//@step
    if (i >= s1.length - 1 && same()) return true;
  }
  return false;
}`
    },
    check: 'With "ab" and "eidbaooo": windows of length 2 are "ei", "id", "db", then "ba", whose counts match a and b once each, so the answer is true.',
    complexity: 'O(n) time in the length of s2, with a 26-count comparison per step. O(1) space.',
    tests: [
      { args: ['ab', 'eidbaooo'], expected: true },
      { args: ['ab', 'eidboaoo'], expected: false },
      { args: ['abc', 'ab'], expected: false }
    ]
  },
  {
    id: 'minimum-size-subarray-sum',
    title: 'Minimum Size Subarray Sum',
    level: 'medium',
    statement: 'Given an array of positive integers nums and a positive integer target, return the minimal length of a contiguous subarray whose sum is greater than or equal to target, or 0 if there is none. ' +
      'Example: target = 7, nums = [2,3,1,2,4,3] returns 2 ([4,3]). Example: target = 11, nums = [1,1,1,1,1,1,1,1] returns 0.',
    signature: { dart: 'class Solution { int minSubArrayLen(int target, List<int> nums) }', typescript: 'function minSubArrayLen(target: number, nums: number[]): number' },
    fn: 'minSubArrayLen',
    asks: 'Find the shortest run of neighbouring numbers whose sum reaches the target: with target 7 in [2, 3, 1, 2, 4, 3], the run [4, 3] has length 2.',
    idea: 'All numbers are positive, so growing a window increases the sum and shrinking decreases it. Add numbers on the right; ' +
      'whenever the sum reaches the target, record the length and remove from the left while it still holds.',
    where: { dart: 'the Solution class, replacing the minSubArrayLen method.', typescript: 'the minSubArrayLen function, replacing its body.' },
    steps: [
      { what: 'open the method with the window start, the running sum and the best length', say: 'I keep a window and its sum.' },
      { what: 'add each number, and while the sum reaches the target, record the length and drop from the left', say: 'Shrinking finds the shortest window ending here.' },
      { what: 'return the best length, or 0 if none was found', say: 'Each number enters and leaves once, so it is linear.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int minSubArrayLen(int target, List<int> nums) {
    var start = 0;
    var sum = 0;
    var best = nums.length + 1;
//@step
    for (var i = 0; i < nums.length; i++) {
      sum += nums[i];
      while (sum >= target) {
        if (i - start + 1 < best) best = i - start + 1;
        sum -= nums[start++];
      }
    }
//@step
    return best > nums.length ? 0 : best;
  }
}`,
      typescript: `//@step
function minSubArrayLen(target: number, nums: number[]): number {
  let start = 0;
  let sum = 0;
  let best = nums.length + 1;
//@step
  for (let i = 0; i < nums.length; i++) {
    sum += nums[i];
    while (sum >= target) {
      best = Math.min(best, i - start + 1);
      sum -= nums[start++];
    }
  }
//@step
  return best > nums.length ? 0 : best;
}`
    },
    check: 'With target 7 and [2, 3, 1, 2, 4, 3]: the window reaches 8 with [2, 3, 1, 2], length 4. Shrinking and growing, [1, 2, 4] gives length 3, then [4, 3] reaches 7 with length 2. Answer 2.',
    complexity: 'O(n) time. O(1) space.',
    tests: [
      { args: [7, [2, 3, 1, 2, 4, 3]], expected: 2 },
      { args: [4, [1, 4, 4]], expected: 1 },
      { args: [11, [1, 1, 1, 1, 1, 1, 1, 1]], expected: 0 }
    ]
  },
  {
    id: 'sliding-window-maximum',
    title: 'Sliding Window Maximum',
    level: 'hard',
    statement: 'Given an array nums and a window size k that moves from the left to the right one position at a time, return the maximum of each window. ' +
      'Example: nums = [1,3,-1,-3,5,3,6,7], k = 3 returns [3,3,5,5,6,7]. Example: nums = [1], k = 1 returns [1].',
    signature: { dart: 'class Solution { List<int> maxSlidingWindow(List<int> nums, int k) }', typescript: 'function maxSlidingWindow(nums: number[], k: number): number[]' },
    fn: 'maxSlidingWindow',
    asks: 'Give the largest number in each window of k neighbours as it slides along: in the example, the first window [1, 3, -1] has maximum 3.',
    idea: 'Keep a deque of indices whose values are in decreasing order. Before adding a new index, drop smaller values from the back, since they can never be a maximum again. ' +
      'Drop the front when it falls out of the window. The front is always the current maximum.',
    where: { dart: 'the Solution class, replacing the maxSlidingWindow method.', typescript: 'the maxSlidingWindow function, replacing its body.' },
    steps: [
      { what: 'open the method with a deque of indices and the result list', say: 'The deque keeps candidates for the maximum in decreasing order.' },
      { what: 'for each index, drop the front if it left the window and drop smaller values from the back, then add it', say: 'A smaller value behind a bigger, newer one can never win, so it goes.' },
      { what: 'once the first window is full, add the front value to the result, then return it', say: 'Each index is added and removed once, so it is linear.' }
    ],
    code: {
      dart: `//@step
class Solution {
  List<int> maxSlidingWindow(List<int> nums, int k) {
    final deque = <int>[];
    var head = 0;
    final result = <int>[];
//@step
    for (var i = 0; i < nums.length; i++) {
      if (head < deque.length && deque[head] <= i - k) head++;
      while (deque.length > head && nums[deque.last] < nums[i]) {
        deque.removeLast();
      }
      deque.add(i);
//@step
      if (i >= k - 1) result.add(nums[deque[head]]);
    }
    return result;
  }
}`,
      typescript: `//@step
function maxSlidingWindow(nums: number[], k: number): number[] {
  const deque: number[] = [];
  let head = 0;
  const result: number[] = [];
//@step
  for (let i = 0; i < nums.length; i++) {
    if (head < deque.length && deque[head] <= i - k) head++;
    while (deque.length > head && nums[deque[deque.length - 1]] < nums[i]) deque.pop();
    deque.push(i);
//@step
    if (i >= k - 1) result.push(nums[deque[head]]);
  }
  return result;
}`
    },
    check: 'With [1, 3, -1, -3, 5, 3, 6, 7] and k = 3: after 1, 3, -1 the deque front is 3. Adding -3 keeps 3 as the maximum. Adding 5 clears the smaller values, so 5 leads for two windows, then 6 and 7. Result [3, 3, 5, 5, 6, 7].',
    complexity: 'O(n) time, each index enters and leaves the deque once. O(k) space.',
    tests: [
      { args: [[1, 3, -1, -3, 5, 3, 6, 7], 3], expected: [3, 3, 5, 5, 6, 7] },
      { args: [[1], 1], expected: [1] },
      { args: [[9, 8, 7, 6], 2], expected: [9, 8, 7] }
    ]
  },
  {
    id: 'find-all-anagrams',
    title: 'Find All Anagrams in a String',
    level: 'medium',
    statement: 'Given two strings s and p of lowercase letters, return the start indices of all anagrams of p in s, in any order. ' +
      'Example: s = "cbaebabacd", p = "abc" returns [0,6]. Example: s = "abab", p = "ab" returns [0,1,2].',
    signature: { dart: 'class Solution { List<int> findAnagrams(String s, String p) }', typescript: 'function findAnagrams(s: string, p: string): number[]' },
    fn: 'findAnagrams',
    compare: 'sorted',
    asks: 'List every position in s where a rearrangement of p starts: in "cbaebabacd" with "abc", at 0 ("cba") and 6 ("bac").',
    idea: 'Slide a window the length of p across s with letter counts, and compare to the counts of p. When they match, the window\'s start is an answer.',
    where: { dart: 'the Solution class, replacing the findAnagrams method.', typescript: 'the findAnagrams function, replacing its body.' },
    steps: [
      { what: 'open the method and count the letters of p', say: 'Anagrams share exact letter counts.' },
      { what: 'slide a window over s, adding the new letter and removing the one that left', say: 'Moving the window changes two counts.' },
      { what: 'when the counts match, record the start index, then return the list', say: 'Linear time with a 26-count check per step.' }
    ],
    code: {
      dart: `//@step
class Solution {
  List<int> findAnagrams(String s, String p) {
    final result = <int>[];
    if (p.length > s.length) return result;
    final want = List<int>.filled(26, 0);
    final have = List<int>.filled(26, 0);
    for (var i = 0; i < p.length; i++) {
      want[p.codeUnitAt(i) - 97]++;
    }
//@step
    for (var i = 0; i < s.length; i++) {
      have[s.codeUnitAt(i) - 97]++;
      if (i >= p.length) have[s.codeUnitAt(i - p.length) - 97]--;
//@step
      if (i >= p.length - 1) {
        var same = true;
        for (var c = 0; c < 26 && same; c++) {
          same = want[c] == have[c];
        }
        if (same) result.add(i - p.length + 1);
      }
    }
    return result;
  }
}`,
      typescript: `//@step
function findAnagrams(s: string, p: string): number[] {
  const result: number[] = [];
  if (p.length > s.length) return result;
  const want: number[] = new Array(26).fill(0);
  const have: number[] = new Array(26).fill(0);
  for (const c of p) want[c.charCodeAt(0) - 97]++;
//@step
  for (let i = 0; i < s.length; i++) {
    have[s.charCodeAt(i) - 97]++;
    if (i >= p.length) have[s.charCodeAt(i - p.length) - 97]--;
//@step
    if (i >= p.length - 1 && want.every((v, c) => v === have[c])) result.push(i - p.length + 1);
  }
  return result;
}`
    },
    check: 'With "abab" and "ab": the windows "ab", "ba" and "ab" all have one a and one b, so the answer is [0, 1, 2].',
    complexity: 'O(n) time in the length of s. O(1) space.',
    tests: [
      { args: ['cbaebabacd', 'abc'], expected: [0, 6] },
      { args: ['abab', 'ab'], expected: [0, 1, 2] },
      { args: ['a', 'ab'], expected: [] }
    ]
  },
  {
    id: 'max-consecutive-ones-iii',
    title: 'Max Consecutive Ones III',
    level: 'medium',
    statement: 'Given a binary array nums and an integer k, return the maximum number of consecutive 1s in the array if you can flip at most k 0s. ' +
      'Example: nums = [1,1,1,0,0,0,1,1,1,1,0], k = 2 returns 6. Example: nums = [0,0,1,1,0,0,1,1,1,0,1,1,0,0,0,1,1,1,1], k = 3 returns 10.',
    signature: { dart: 'class Solution { int longestOnes(List<int> nums, int k) }', typescript: 'function longestOnes(nums: number[], k: number): number' },
    fn: 'longestOnes',
    asks: 'With up to k zeros turned into ones, what is the longest run of ones: in the first example, flipping two zeros gives a run of 6.',
    idea: 'Keep a window with at most k zeros in it. Grow it on the right; if it gets more than k zeros, move the left side until one zero leaves. The largest valid window is the answer.',
    where: { dart: 'the Solution class, replacing the longestOnes method.', typescript: 'the longestOnes function, replacing its body.' },
    steps: [
      { what: 'open the method with the window start, the zero count and the best length', say: 'The window may hold at most k zeros, which I would flip.' },
      { what: 'add each number, and while there are too many zeros, move the start forward', say: 'Shrinking until only k zeros remain keeps the window valid.' },
      { what: 'update the best window length and return it', say: 'Linear time, constant space.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int longestOnes(List<int> nums, int k) {
    var start = 0;
    var zeros = 0;
    var best = 0;
//@step
    for (var i = 0; i < nums.length; i++) {
      if (nums[i] == 0) zeros++;
      while (zeros > k) {
        if (nums[start] == 0) zeros--;
        start++;
      }
//@step
      if (i - start + 1 > best) best = i - start + 1;
    }
    return best;
  }
}`,
      typescript: `//@step
function longestOnes(nums: number[], k: number): number {
  let start = 0;
  let zeros = 0;
  let best = 0;
//@step
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === 0) zeros++;
    while (zeros > k) {
      if (nums[start] === 0) zeros--;
      start++;
    }
//@step
    best = Math.max(best, i - start + 1);
  }
  return best;
}`
    },
    check: 'With [1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0] and k = 2: the window grows over two zeros; the third zero pushes the start past the first zero. The window covering 0, 0, 1, 1, 1, 1 has two zeros and length 6, the best.',
    complexity: 'O(n) time. O(1) space.',
    tests: [
      { args: [[1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0], 2], expected: 6 },
      { args: [[0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1], 3], expected: 10 },
      { args: [[0, 0, 0], 0], expected: 0 }
    ]
  }
];
