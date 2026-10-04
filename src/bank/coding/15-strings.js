// String problems that come up often in screening rounds.
const { problem } = require('../helpers');

module.exports = [
  problem('longest-common-prefix', 'Longest Common Prefix', 'easy',
    'Given an array of strings strs, return the longest common prefix shared by all of them, or an empty string if there is none. Example: strs = ["flower","flow","flight"] returns "fl". Example: strs = ["dog","racecar","car"] returns "".',
    { dart: 'class Solution { String longestCommonPrefix(List<String> strs) }', typescript: 'function longestCommonPrefix(strs: string[]): string' },
    'longestCommonPrefix',
    'Find the longest start that every word shares: "flower", "flow" and "flight" all start with "fl".',
    'Take the first word as the candidate prefix. For each other word, shorten the candidate until the word starts with it. If it becomes empty, stop early.',
    [
      { what: 'open the method with the first word as the prefix', say: 'The answer can be no longer than any word.' },
      { what: 'for each other word, cut the last character off the prefix until the word starts with it', say: 'Each word can only shorten the prefix.' },
      { what: 'return the prefix', say: 'At most the total number of characters is examined.' }
    ],
    {
      dart: `//@step
class Solution {
  String longestCommonPrefix(List<String> strs) {
    var prefix = strs[0];
//@step
    for (final word in strs.skip(1)) {
      while (!word.startsWith(prefix)) {
        prefix = prefix.substring(0, prefix.length - 1);
        if (prefix.isEmpty) return '';
      }
    }
//@step
    return prefix;
  }
}`,
      typescript: `//@step
function longestCommonPrefix(strs: string[]): string {
  let prefix = strs[0];
//@step
  for (const word of strs.slice(1)) {
    while (!word.startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
      if (prefix === '') return '';
    }
  }
//@step
  return prefix;
}`
    },
    'With ["flower", "flow", "flight"]: "flow" shortens "flower" to "flow"; "flight" shortens it to "fl". Answer "fl".',
    'O(S) time, where S is the total number of characters. O(1) extra space.',
    [{ args: [['flower', 'flow', 'flight']], expected: 'fl' }, { args: [['dog', 'racecar', 'car']], expected: '' }, { args: [['a']], expected: 'a' }]),
  problem('string-to-integer-atoi', 'String to Integer (atoi)', 'medium',
    'Implement myAtoi(s): skip leading spaces, read an optional + or - sign, then read digits until a non-digit or the end, and clamp the result to the 32-bit signed range [-2147483648, 2147483647]. Return 0 if no digits are read. ' +
      'Example: s = "42" returns 42. Example: s = "   -042" returns -42. Example: s = "1337c0d3" returns 1337. Example: s = "words 987" returns 0.',
    { dart: 'class Solution { int myAtoi(String s) }', typescript: 'function myAtoi(s: string): number' },
    'myAtoi',
    'Turn the start of the text into a whole number the way C\'s atoi does, stopping at the first non-digit and clamping to 32 bits.',
    'Walk through the string in stages: skip spaces, read one sign, then accumulate digits. Clamp as soon as the value passes the limit, so it never grows without bound.',
    [
      { what: 'open the method, skip leading spaces and read an optional sign', say: 'Only one sign is allowed, right before the digits.' },
      { what: 'read digits one by one, building the number and stopping early once it passes the 32-bit limit', say: 'Clamping as I go avoids overflow.' },
      { what: 'apply the sign, clamp, and return', say: 'Linear time.' }
    ],
    {
      dart: `//@step
class Solution {
  int myAtoi(String s) {
    var i = 0;
    while (i < s.length && s[i] == ' ') {
      i++;
    }
    var sign = 1;
    if (i < s.length && (s[i] == '+' || s[i] == '-')) {
      if (s[i] == '-') sign = -1;
      i++;
    }
//@step
    var value = 0;
    while (i < s.length) {
      final d = s.codeUnitAt(i) - 48;
      if (d < 0 || d > 9) break;
      value = value * 10 + d;
      if (value > 2147483648) break;
      i++;
    }
//@step
    final result = sign * value;
    if (result > 2147483647) return 2147483647;
    if (result < -2147483648) return -2147483648;
    return result;
  }
}`,
      typescript: `//@step
function myAtoi(s: string): number {
  let i = 0;
  while (i < s.length && s[i] === ' ') i++;
  let sign = 1;
  if (i < s.length && (s[i] === '+' || s[i] === '-')) {
    if (s[i] === '-') sign = -1;
    i++;
  }
//@step
  let value = 0;
  while (i < s.length && s[i] >= '0' && s[i] <= '9') {
    value = value * 10 + Number(s[i]);
    if (value > 2147483648) break;
    i++;
  }
//@step
  const result = sign * value;
  if (result > 2147483647) return 2147483647;
  if (result < -2147483648) return -2147483648;
  return result === 0 ? 0 : result;
}`
    },
    'With "   -042": the spaces are skipped, the minus sets the sign, the digits 0, 4, 2 give 42, and the result is -42.',
    'O(n) time. O(1) space.',
    [{ args: ['42'], expected: 42 }, { args: ['   -042'], expected: -42 }, { args: ['1337c0d3'], expected: 1337 }, { args: ['words 987'], expected: 0 }, { args: ['-91283472332'], expected: -2147483648 }]),
  problem('roman-to-integer', 'Roman to Integer', 'easy',
    'Given a Roman numeral string, convert it to an integer. The symbols are I = 1, V = 5, X = 10, L = 50, C = 100, D = 500, M = 1000, and a smaller symbol before a larger one is subtracted (IV = 4, IX = 9, XL = 40, XC = 90, CD = 400, CM = 900). ' +
      'Example: s = "III" returns 3. Example: s = "LVIII" returns 58. Example: s = "MCMXCIV" returns 1994.',
    { dart: 'class Solution { int romanToInt(String s) }', typescript: 'function romanToInt(s: string): number' },
    'romanToInt',
    'Turn a Roman numeral into a normal number: "MCMXCIV" is 1994.',
    'Add each symbol\'s value, except when it is smaller than the symbol after it, in which case subtract it. That handles every subtractive pair like IV or CM.',
    [
      { what: 'open the method with a map of symbol values', say: 'Seven symbols cover everything.' },
      { what: 'for each symbol, subtract it if the next symbol is bigger, else add it', say: 'A smaller symbol in front means subtraction.' },
      { what: 'return the total', say: 'Linear time.' }
    ],
    {
      dart: `//@step
class Solution {
  int romanToInt(String s) {
    const values = {'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000};
    var total = 0;
//@step
    for (var i = 0; i < s.length; i++) {
      final v = values[s[i]]!;
      if (i + 1 < s.length && v < values[s[i + 1]]!) {
        total -= v;
      } else {
        total += v;
      }
    }
//@step
    return total;
  }
}`,
      typescript: `//@step
function romanToInt(s: string): number {
  const values: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
//@step
  for (let i = 0; i < s.length; i++) {
    const v = values[s[i]];
    if (i + 1 < s.length && v < values[s[i + 1]]) total -= v;
    else total += v;
  }
//@step
  return total;
}`
    },
    'With "MCMXCIV": M adds 1000, C before M subtracts 100, M adds 1000, X before C subtracts 10, C adds 100, I before V subtracts 1, V adds 5. Total 1994.',
    'O(n) time. O(1) space.',
    [{ args: ['III'], expected: 3 }, { args: ['LVIII'], expected: 58 }, { args: ['MCMXCIV'], expected: 1994 }]),
  problem('string-compression', 'String Compression', 'medium',
    'Given an array of characters chars, compress it in place: each group of consecutive repeating characters becomes the character followed by the group length if it is more than 1, with multi-digit counts split into separate characters. Return the new length. ' +
      'Example: chars = ["a","a","b","b","c","c","c"] returns 6 (["a","2","b","2","c","3"]). Example: chars = ["a"] returns 1.',
    { dart: 'class Solution { int compress(List<String> chars) }', typescript: 'function compress(chars: string[]): number' },
    'compress',
    'Squash runs of the same letter into the letter plus its count, in place, and return the new length: "aabbccc" becomes "a2b2c3".',
    'Use a read pointer to find each run and a write pointer to write the compressed form. For each run, write the character, then the digits of the count if it is more than one.',
    [
      { what: 'open the method with read and write pointers', say: 'Writing never overtakes reading, so in place is safe.' },
      { what: 'for each run, write its character and, if longer than one, each digit of its length', say: 'A count like 12 becomes two characters.' },
      { what: 'return the write pointer', say: 'Linear time, constant space.' }
    ],
    {
      dart: `//@step
class Solution {
  int compress(List<String> chars) {
    var write = 0;
    var read = 0;
//@step
    while (read < chars.length) {
      final c = chars[read];
      var run = 0;
      while (read < chars.length && chars[read] == c) {
        read++;
        run++;
      }
      chars[write++] = c;
      if (run > 1) {
        for (final d in run.toString().split('')) {
          chars[write++] = d;
        }
      }
    }
//@step
    return write;
  }
}`,
      typescript: `//@step
function compress(chars: string[]): number {
  let write = 0;
  let read = 0;
//@step
  while (read < chars.length) {
    const c = chars[read];
    let run = 0;
    while (read < chars.length && chars[read] === c) {
      read++;
      run++;
    }
    chars[write++] = c;
    if (run > 1) for (const d of String(run)) chars[write++] = d;
  }
//@step
  return write;
}`
    },
    'With a, a, b, b, c, c, c: the runs are a times 2, b times 2 and c times 3, written as a, 2, b, 2, c, 3, so the new length is 6.',
    'O(n) time. O(1) extra space.',
    [{ args: [['a', 'a', 'b', 'b', 'c', 'c', 'c']], expected: 6 }, { args: [['a']], expected: 1 }, { args: [['a', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'b']], expected: 4 }]),
  problem('reverse-words-in-a-string', 'Reverse Words in a String', 'medium',
    'Given a string s, reverse the order of the words, where words are separated by one or more spaces. The result must have single spaces between words and no leading or trailing spaces. ' +
      'Example: s = "the sky is blue" returns "blue is sky the". Example: s = "  hello world  " returns "world hello".',
    { dart: 'class Solution { String reverseWords(String s) }', typescript: 'function reverseWords(s: string): string' },
    'reverseWords',
    'Flip the order of the words and tidy the spacing: "the sky is blue" becomes "blue is sky the".',
    'Split on runs of whitespace after trimming, which drops empty pieces, reverse the list of words, and join with single spaces.',
    [
      { what: 'open the method and split the trimmed string on one or more spaces', say: 'Trimming first avoids empty words at the ends.' },
      { what: 'reverse the list of words', say: 'The words keep their spelling, only their order changes.' },
      { what: 'join with single spaces and return', say: 'Linear time.' }
    ],
    {
      dart: `//@step
class Solution {
  String reverseWords(String s) {
    final words = s.trim().split(RegExp(r'\\s+'));
//@step
    final reversed = words.reversed;
//@step
    return reversed.join(' ');
  }
}`,
      typescript: `//@step
function reverseWords(s: string): string {
  const words = s.trim().split(/\\s+/);
//@step
  words.reverse();
//@step
  return words.join(' ');
}`
    },
    'With "  hello world  ": trimming gives "hello world", splitting gives hello and world, and reversed and joined it is "world hello".',
    'O(n) time and space.',
    [{ args: ['the sky is blue'], expected: 'blue is sky the' }, { args: ['  hello world  '], expected: 'world hello' }, { args: ['a good   example'], expected: 'example good a' }]),
  problem('encode-and-decode-strings', 'Encode and Decode Strings', 'medium',
    'Design a way to encode a list of strings into one string and decode it back to the original list. Strings may contain any characters, including the separator you would choose. Here encodeDecode(strs) encodes then decodes and returns the result. ' +
      'Example: strs = ["lint","code","love","you"] returns ["lint","code","love","you"]. Example: strs = ["we",":","say","yes"] returns the same list.',
    { dart: 'class Solution { List<String> encodeDecode(List<String> strs) }', typescript: 'function encodeDecode(strs: string[]): string[]' },
    'encodeDecode',
    'Pack a list of strings into a single string and unpack it again exactly, even if the strings contain your separator.',
    'Length-prefix each string: write its length, a marker like "#", then the string itself. To decode, read digits up to the marker to get the length, then take exactly that many characters. The content never needs escaping.',
    [
      { what: 'open the method with an encode step that writes length, a hash and the string for each item', say: 'The length tells the decoder exactly where each string ends.' },
      { what: 'decode by reading the number before each hash, then taking that many characters', say: 'A hash inside a string is never mistaken for a marker.' },
      { what: 'return the decoded list', say: 'Linear in the total length.' }
    ],
    {
      dart: `//@step
class Solution {
  List<String> encodeDecode(List<String> strs) {
    final encoded = strs.map((s) => '\${s.length}#\$s').join();
//@step
    final out = <String>[];
    var i = 0;
    while (i < encoded.length) {
      final hash = encoded.indexOf('#', i);
      final length = int.parse(encoded.substring(i, hash));
      out.add(encoded.substring(hash + 1, hash + 1 + length));
      i = hash + 1 + length;
    }
//@step
    return out;
  }
}`,
      typescript: `//@step
function encodeDecode(strs: string[]): string[] {
  const encoded = strs.map((s) => s.length + '#' + s).join('');
//@step
  const out: string[] = [];
  let i = 0;
  while (i < encoded.length) {
    const hash = encoded.indexOf('#', i);
    const length = Number(encoded.slice(i, hash));
    out.push(encoded.slice(hash + 1, hash + 1 + length));
    i = hash + 1 + length;
  }
//@step
  return out;
}`
    },
    'With ["we", ":", "say", "yes"]: the encoding is "2#we1#:3#say3#yes". Reading back: 2 characters "we", 1 character ":", then "say" and "yes".',
    'O(n) time and space in the total length.',
    [{ args: [['lint', 'code', 'love', 'you']], expected: ['lint', 'code', 'love', 'you'] }, { args: [['we', ':', 'say', 'yes']], expected: ['we', ':', 'say', 'yes'] }, { args: [['', '#', '12#ab']], expected: ['', '#', '12#ab'] }]),
  problem('palindromic-substrings', 'Palindromic Substrings', 'medium',
    'Given a string s, return the number of substrings that are palindromes. Substrings at different positions count separately. Example: s = "abc" returns 3. Example: s = "aaa" returns 6.',
    { dart: 'class Solution { int countSubstrings(String s) }', typescript: 'function countSubstrings(s: string): number' },
    'countSubstrings',
    'Count every piece of the text that reads the same both ways: "aaa" has six, three single letters, two "aa" and one "aaa".',
    'Expand around every centre, each character for odd lengths and each gap for even lengths, and count one palindrome for every successful expansion step.',
    [
      { what: 'open the method with a count and a helper that expands from a centre', say: 'Each step outwards that still matches is one more palindrome.' },
      { what: 'expand from every character and every gap', say: 'There are 2n minus 1 centres.' },
      { what: 'return the count', say: 'n squared time, constant space.' }
    ],
    {
      dart: `//@step
class Solution {
  int countSubstrings(String s) {
    var count = 0;
    void expand(int lo, int hi) {
      while (lo >= 0 && hi < s.length && s[lo] == s[hi]) {
        count++;
        lo--;
        hi++;
      }
    }
//@step
    for (var i = 0; i < s.length; i++) {
      expand(i, i);
      expand(i, i + 1);
    }
//@step
    return count;
  }
}`,
      typescript: `//@step
function countSubstrings(s: string): number {
  let count = 0;
  const expand = (lo: number, hi: number): void => {
    while (lo >= 0 && hi < s.length && s[lo] === s[hi]) {
      count++;
      lo--;
      hi++;
    }
  };
//@step
  for (let i = 0; i < s.length; i++) {
    expand(i, i);
    expand(i, i + 1);
  }
//@step
  return count;
}`
    },
    'With "aaa": the three single letters count 3, the two "aa" gaps count 2, and the centre letter expands once more to "aaa", 1. Total 6.',
    'O(n squared) time. O(1) space.',
    [{ args: ['abc'], expected: 3 }, { args: ['aaa'], expected: 6 }]),
  problem('valid-palindrome-ii', 'Valid Palindrome II', 'easy',
    'Given a string s, return true if it can be a palindrome after deleting at most one character. Example: s = "aba" returns true. Example: s = "abca" returns true. Example: s = "abc" returns false.',
    { dart: 'class Solution { bool validPalindrome(String s) }', typescript: 'function validPalindrome(s: string): boolean' },
    'validPalindrome',
    'Check whether removing at most one letter makes the text read the same both ways: "abca" works by removing c or b.',
    'Compare from both ends. At the first mismatch, we must delete one of the two characters, so check whether the rest is a palindrome after skipping the left one or the right one.',
    [
      { what: 'open the method with a helper that checks a range is a palindrome', say: 'I only need the helper after the first mismatch.' },
      { what: 'move two pointers inward; at the first mismatch, try skipping either side', say: 'One deletion is allowed, so two options are enough.' },
      { what: 'return true if no mismatch was found', say: 'Linear time.' }
    ],
    {
      dart: `//@step
class Solution {
  bool validPalindrome(String s) {
    bool isPal(int i, int j) {
      while (i < j) {
        if (s[i++] != s[j--]) return false;
      }
      return true;
    }
//@step
    var i = 0;
    var j = s.length - 1;
    while (i < j) {
      if (s[i] != s[j]) return isPal(i + 1, j) || isPal(i, j - 1);
      i++;
      j--;
    }
//@step
    return true;
  }
}`,
      typescript: `//@step
function validPalindrome(s: string): boolean {
  const isPal = (i: number, j: number): boolean => {
    while (i < j) if (s[i++] !== s[j--]) return false;
    return true;
  };
//@step
  let i = 0;
  let j = s.length - 1;
  while (i < j) {
    if (s[i] !== s[j]) return isPal(i + 1, j) || isPal(i, j - 1);
    i++;
    j--;
  }
//@step
  return true;
}`
    },
    'With "abca": a matches a, then b and c differ. Skipping b leaves "c", a palindrome, so the answer is true.',
    'O(n) time. O(1) space.',
    [{ args: ['aba'], expected: true }, { args: ['abca'], expected: true }, { args: ['abc'], expected: false }])
];
