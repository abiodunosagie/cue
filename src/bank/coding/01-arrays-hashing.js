// Arrays and hashing: the warm-up problems most coding rounds open with.
module.exports = [
  {
    id: 'two-sum',
    title: 'Two Sum',
    level: 'easy',
    statement: 'Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target. ' +
      'Each input has exactly one solution, the same element cannot be used twice, and the answer can be in any order. ' +
      'Example: nums = [2,7,11,15], target = 9 returns [0,1]. Example: nums = [3,2,4], target = 6 returns [1,2].',
    signature: {
      dart: 'class Solution { List<int> twoSum(List<int> nums, int target) }',
      typescript: 'function twoSum(nums: number[], target: number): number[]'
    },
    fn: 'twoSum',
    asks: 'Find the two positions whose numbers add up to the target: with [2, 7, 11, 15] and 9, that is positions 0 and 1, because 2 plus 7 is 9.',
    idea: 'Walk the list once and remember every number seen so far with its position, in a map. ' +
      'For each number, the partner it needs is target minus that number. If the partner is already in the map, those two positions are the answer.',
    where: {
      dart: 'the Solution class, replacing the twoSum method.',
      typescript: 'the twoSum function, replacing its body.'
    },
    steps: [
      { what: 'open the method and make a map from each number seen to its position', say: 'I keep a map from each number to where I saw it, so finding a partner is a constant time lookup.' },
      { what: 'loop over the numbers and return as soon as the partner is in the map', say: 'For each number I work out what it needs to reach the target. If that is already in the map, I have the pair.' },
      { what: 'otherwise store this number, then close the loop with an empty fallback', say: 'If not, I store this number and move on. One pass is enough.' }
    ],
    code: {
      dart: `//@step
class Solution {
  List<int> twoSum(List<int> nums, int target) {
    final seen = <int, int>{};
//@step
    for (var i = 0; i < nums.length; i++) {
      final need = target - nums[i];
      final j = seen[need];
      if (j != null) return [j, i];
//@step
      seen[nums[i]] = i;
    }
    return [];
  }
}`,
      typescript: `//@step
function twoSum(nums: number[], target: number): number[] {
  const seen = new Map<number, number>();
//@step
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    const j = seen.get(need);
    if (j !== undefined) return [j, i];
//@step
    seen.set(nums[i], i);
  }
  return [];
}`
    },
    check: 'With [2, 7, 11, 15] and 9: at position 0 the number 2 needs 7, the map is empty, so 2 is stored at 0. ' +
      'At position 1 the number 7 needs 2, which is in the map at 0, so the answer is 0 and 1.',
    complexity: 'O(n) time, because each number is looked at once and a map lookup is constant time. O(n) space for the map in the worst case.',
    tests: [
      { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { args: [[3, 2, 4], 6], expected: [1, 2] },
      { args: [[3, 3], 6], expected: [0, 1] }
    ]
  },
  {
    id: 'contains-duplicate',
    title: 'Contains Duplicate',
    level: 'easy',
    statement: 'Given an integer array nums, return true if any value appears at least twice, and false if every element is distinct. ' +
      'Example: nums = [1,2,3,1] returns true. Example: nums = [1,2,3,4] returns false.',
    signature: {
      dart: 'class Solution { bool containsDuplicate(List<int> nums) }',
      typescript: 'function containsDuplicate(nums: number[]): boolean'
    },
    fn: 'containsDuplicate',
    asks: 'Say whether any number shows up more than once: [1, 2, 3, 1] gives true because 1 appears twice.',
    idea: 'Keep a set of the numbers seen so far. A set holds each value once and answers "have I seen this?" in constant time, ' +
      'so the first number already in the set means there is a duplicate.',
    where: {
      dart: 'the Solution class, replacing the containsDuplicate method.',
      typescript: 'the containsDuplicate function, replacing its body.'
    },
    steps: [
      { what: 'open the method and make an empty set', say: 'I use a set, because it tells me in constant time whether I have seen a value.' },
      { what: 'loop over the numbers; return true when one is already in the set, else add it', say: 'The moment a number is already in the set, I know there is a duplicate and I can stop early.' },
      { what: 'after the loop, return false', say: 'If the loop finishes, every number was new, so there is no duplicate.' }
    ],
    code: {
      dart: `//@step
class Solution {
  bool containsDuplicate(List<int> nums) {
    final seen = <int>{};
//@step
    for (final n in nums) {
      if (!seen.add(n)) return true;
    }
//@step
    return false;
  }
}`,
      typescript: `//@step
function containsDuplicate(nums: number[]): boolean {
  const seen = new Set<number>();
//@step
  for (const n of nums) {
    if (seen.has(n)) return true;
    seen.add(n);
  }
//@step
  return false;
}`
    },
    check: 'With [1, 2, 3, 1]: the set fills with 1, 2 and 3. The last 1 is already in the set, so the answer is true.',
    complexity: 'O(n) time, one pass with constant time set checks. O(n) space for the set.',
    tests: [
      { args: [[1, 2, 3, 1]], expected: true },
      { args: [[1, 2, 3, 4]], expected: false },
      { args: [[1, 1, 1, 3, 3, 4, 3, 2, 4, 2]], expected: true },
      { args: [[]], expected: false }
    ]
  },
  {
    id: 'valid-anagram',
    title: 'Valid Anagram',
    level: 'easy',
    statement: 'Given two strings s and t, return true if t is an anagram of s (the same letters, each used the same number of times), and false otherwise. ' +
      'The strings hold lowercase English letters. Example: s = "anagram", t = "nagaram" returns true. Example: s = "rat", t = "car" returns false.',
    signature: {
      dart: 'class Solution { bool isAnagram(String s, String t) }',
      typescript: 'function isAnagram(s: string, t: string): boolean'
    },
    fn: 'isAnagram',
    asks: 'Check whether two words use exactly the same letters the same number of times: "anagram" and "nagaram" do.',
    idea: 'If the lengths differ, it is not an anagram. Otherwise count each letter: add one for every letter of the first word ' +
      'and take one away for every letter of the second. If every count ends at zero, the letters match.',
    where: {
      dart: 'the Solution class, replacing the isAnagram method.',
      typescript: 'the isAnagram function, replacing its body.'
    },
    steps: [
      { what: 'open the method and return false when the lengths differ', say: 'Different lengths can never be anagrams, so I check that first.' },
      { what: 'count the letters: plus one for s, minus one for t', say: 'I keep one count per letter, going up for the first word and down for the second.' },
      { what: 'return true only if every count is back at zero', say: 'If every count is zero, both words used the same letters the same number of times.' }
    ],
    code: {
      dart: `//@step
class Solution {
  bool isAnagram(String s, String t) {
    if (s.length != t.length) return false;
//@step
    final counts = <int, int>{};
    for (var i = 0; i < s.length; i++) {
      counts[s.codeUnitAt(i)] = (counts[s.codeUnitAt(i)] ?? 0) + 1;
      counts[t.codeUnitAt(i)] = (counts[t.codeUnitAt(i)] ?? 0) - 1;
    }
//@step
    return counts.values.every((c) => c == 0);
  }
}`,
      typescript: `//@step
function isAnagram(s: string, t: string): boolean {
  if (s.length !== t.length) return false;
//@step
  const counts = new Map<string, number>();
  for (let i = 0; i < s.length; i++) {
    counts.set(s[i], (counts.get(s[i]) ?? 0) + 1);
    counts.set(t[i], (counts.get(t[i]) ?? 0) - 1);
  }
//@step
  for (const c of counts.values()) if (c !== 0) return false;
  return true;
}`
    },
    check: 'With "rat" and "car": the lengths match. After counting, r is 0, a is 0, t is 1 and c is minus 1, so not every count is zero and the answer is false.',
    complexity: 'O(n) time, one pass over both strings. O(1) space, because there are at most 26 letters to count.',
    tests: [
      { args: ['anagram', 'nagaram'], expected: true },
      { args: ['rat', 'car'], expected: false },
      { args: ['a', 'ab'], expected: false },
      { args: ['', ''], expected: true }
    ]
  },
  {
    id: 'group-anagrams',
    title: 'Group Anagrams',
    level: 'medium',
    statement: 'Given an array of strings strs, group the anagrams together and return the groups in any order. ' +
      'Words are anagrams when they use the same letters the same number of times. The strings hold lowercase English letters. ' +
      'Example: strs = ["eat","tea","tan","ate","nat","bat"] returns [["bat"],["nat","tan"],["ate","eat","tea"]]. Example: strs = [""] returns [[""]].',
    signature: {
      dart: 'class Solution { List<List<String>> groupAnagrams(List<String> strs) }',
      typescript: 'function groupAnagrams(strs: string[]): string[][]'
    },
    fn: 'groupAnagrams',
    compare: 'nested',
    asks: 'Put words with the same letters into the same group: "eat", "tea" and "ate" go together, "tan" and "nat" together, and "bat" alone.',
    idea: 'Words in one group have the same letters, so sorting the letters of each word gives the same key, like "aet" for "eat" and "tea". ' +
      'Use a map from that key to the list of words that share it; the map\'s lists are the groups.',
    where: {
      dart: 'the Solution class, replacing the groupAnagrams method.',
      typescript: 'the groupAnagrams function, replacing its body.'
    },
    steps: [
      { what: 'open the method and make a map from a sorted-letters key to a list of words', say: 'Anagrams sort to the same letters, so the sorted word works as a key for its group.' },
      { what: 'for each word, build its key and add the word to that key\'s list', say: 'For every word I sort its letters and append it to the list under that key.' },
      { what: 'return the lists in the map', say: 'Each list in the map is one group of anagrams.' }
    ],
    code: {
      dart: `//@step
class Solution {
  List<List<String>> groupAnagrams(List<String> strs) {
    final groups = <String, List<String>>{};
//@step
    for (final word in strs) {
      final letters = word.split('')..sort();
      groups.putIfAbsent(letters.join(), () => []).add(word);
    }
//@step
    return groups.values.toList();
  }
}`,
      typescript: `//@step
function groupAnagrams(strs: string[]): string[][] {
  const groups = new Map<string, string[]>();
//@step
  for (const word of strs) {
    const key = word.split('').sort().join('');
    const group = groups.get(key);
    if (group) group.push(word);
    else groups.set(key, [word]);
  }
//@step
  return [...groups.values()];
}`
    },
    check: '"eat" sorts to "aet", so the map gets aet: [eat]. "tea" also sorts to "aet" and joins it. "tan" sorts to "ant", a new group, and "nat" joins it. "bat" makes "abt" alone. The answer is the three lists.',
    complexity: 'O(n times k log k) time, where n is the number of words and k the longest word, because each word is sorted. O(n times k) space for the map.',
    tests: [
      { args: [['eat', 'tea', 'tan', 'ate', 'nat', 'bat']], expected: [['bat'], ['nat', 'tan'], ['ate', 'eat', 'tea']] },
      { args: [['']], expected: [['']] },
      { args: [['a']], expected: [['a']] }
    ]
  },
  {
    id: 'top-k-frequent-elements',
    title: 'Top K Frequent Elements',
    level: 'medium',
    statement: 'Given an integer array nums and an integer k, return the k most frequent elements, in any order. ' +
      'The answer is unique. Better than O(n log n) time is expected. ' +
      'Example: nums = [1,1,1,2,2,3], k = 2 returns [1,2]. Example: nums = [1], k = 1 returns [1].',
    signature: {
      dart: 'class Solution { List<int> topKFrequent(List<int> nums, int k) }',
      typescript: 'function topKFrequent(nums: number[], k: number): number[]'
    },
    fn: 'topKFrequent',
    compare: 'sorted',
    asks: 'Return the k numbers that appear most often: in [1, 1, 1, 2, 2, 3] with k = 2, that is 1 (three times) and 2 (twice).',
    idea: 'Count how often each number appears with a map. Then put each number into a bucket by its count: bucket 3 holds the numbers seen three times. ' +
      'No count can be bigger than the list, so walking the buckets from the highest down and taking numbers until there are k gives the answer without sorting.',
    where: {
      dart: 'the Solution class, replacing the topKFrequent method.',
      typescript: 'the topKFrequent function, replacing its body.'
    },
    steps: [
      { what: 'open the method and count each number with a map', say: 'First I count how many times each number appears.' },
      { what: 'make one bucket per possible count and put each number in the bucket for its count', say: 'Then I group numbers by their count. A count can be at most the length of the list, so that fixes the number of buckets.' },
      { what: 'walk the buckets from the highest count down, collecting numbers until there are k', say: 'Reading the buckets from the top gives the most frequent numbers first, in linear time, with no sort.' }
    ],
    code: {
      dart: `//@step
class Solution {
  List<int> topKFrequent(List<int> nums, int k) {
    final counts = <int, int>{};
    for (final n in nums) {
      counts[n] = (counts[n] ?? 0) + 1;
    }
//@step
    final buckets = List.generate(nums.length + 1, (_) => <int>[]);
    counts.forEach((n, c) => buckets[c].add(n));
//@step
    final result = <int>[];
    for (var c = buckets.length - 1; c >= 0 && result.length < k; c--) {
      for (final n in buckets[c]) {
        if (result.length == k) break;
        result.add(n);
      }
    }
    return result;
  }
}`,
      typescript: `//@step
function topKFrequent(nums: number[], k: number): number[] {
  const counts = new Map<number, number>();
  for (const n of nums) counts.set(n, (counts.get(n) ?? 0) + 1);
//@step
  const buckets: number[][] = Array.from({ length: nums.length + 1 }, () => []);
  for (const [n, c] of counts) buckets[c].push(n);
//@step
  const result: number[] = [];
  for (let c = buckets.length - 1; c >= 0 && result.length < k; c--) {
    for (const n of buckets[c]) {
      if (result.length === k) break;
      result.push(n);
    }
  }
  return result;
}`
    },
    check: 'With [1, 1, 1, 2, 2, 3] and k = 2: the counts are 1 three times, 2 twice and 3 once. Bucket 3 holds 1, bucket 2 holds 2, bucket 1 holds 3. From the top, 1 is taken, then 2, and with two numbers the answer is [1, 2].',
    complexity: 'O(n) time, because counting and filling the buckets are each one pass. O(n) space for the map and the buckets.',
    tests: [
      { args: [[1, 1, 1, 2, 2, 3], 2], expected: [1, 2] },
      { args: [[1], 1], expected: [1] },
      { args: [[4, 4, 5, 5, 5, 6, 6, 6, 6], 2], expected: [6, 5] }
    ]
  }
];
