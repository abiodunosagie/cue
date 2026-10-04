// Hard problems that senior rounds use to separate candidates.
const { problem } = require('../helpers');

module.exports = [
  problem('regular-expression-matching', 'Regular Expression Matching', 'hard',
    'Given a string s and a pattern p, implement matching with "." (any single character) and "*" (zero or more of the preceding element). The match must cover the whole string. ' +
      'Example: s = "aa", p = "a" returns false. Example: s = "aa", p = "a*" returns true. Example: s = "ab", p = ".*" returns true.',
    { dart: 'class Solution { bool isMatch(String s, String p) }', typescript: 'function isMatch(s: string, p: string): boolean' },
    'isMatch',
    'Check whether the whole string matches a pattern where a dot is any letter and a star repeats the letter before it any number of times.',
    'Fill a table where match[i][j] says whether the first i characters of s match the first j of p. A star either uses zero copies of its element, looking two pattern places back, ' +
      'or one more copy, if the element matches the current character, looking one string place back.',
    [
      { what: 'open the method with the table, the empty-empty match set true, and patterns like a* able to match an empty string', say: 'A star can erase its element, so a*b* matches nothing at all.' },
      { what: 'fill each cell: a star tries zero copies or one more copy; a normal character or dot needs a match and the diagonal cell', say: 'Each case reuses a smaller, already solved case.' },
      { what: 'return the cell for the full string and full pattern', say: 'm times n time and space.' }
    ],
    {
      dart: `//@step
class Solution {
  bool isMatch(String s, String p) {
    final m = s.length;
    final n = p.length;
    final dp = List.generate(m + 1, (_) => List<bool>.filled(n + 1, false));
    dp[0][0] = true;
    for (var j = 2; j <= n; j++) {
      if (p[j - 1] == '*') dp[0][j] = dp[0][j - 2];
    }
//@step
    bool same(int i, int j) => p[j - 1] == '.' || p[j - 1] == s[i - 1];
    for (var i = 1; i <= m; i++) {
      for (var j = 1; j <= n; j++) {
        if (p[j - 1] == '*') {
          dp[i][j] = dp[i][j - 2] || (same(i, j - 1) && dp[i - 1][j]);
        } else {
          dp[i][j] = same(i, j) && dp[i - 1][j - 1];
        }
      }
    }
//@step
    return dp[m][n];
  }
}`,
      typescript: `//@step
function isMatch(s: string, p: string): boolean {
  const m = s.length;
  const n = p.length;
  const dp = Array.from({ length: m + 1 }, () => new Array<boolean>(n + 1).fill(false));
  dp[0][0] = true;
  for (let j = 2; j <= n; j++) if (p[j - 1] === '*') dp[0][j] = dp[0][j - 2];
//@step
  const same = (i: number, j: number) => p[j - 1] === '.' || p[j - 1] === s[i - 1];
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = p[j - 1] === '*'
        ? dp[i][j - 2] || (same(i, j - 1) && dp[i - 1][j])
        : same(i, j) && dp[i - 1][j - 1];
    }
  }
//@step
  return dp[m][n];
}`
    },
    'With "aa" and "a*": the star can use one a, then another, so the first two characters match the whole pattern. The last cell is true.',
    'O(m times n) time and space.',
    [{ args: ['aa', 'a'], expected: false }, { args: ['aa', 'a*'], expected: true }, { args: ['ab', '.*'], expected: true }, { args: ['aab', 'c*a*b'], expected: true }, { args: ['mississippi', 'mis*is*p*.'], expected: false }]),
  problem('burst-balloons', 'Burst Balloons', 'hard',
    'There are n balloons with numbers nums. Bursting balloon i earns nums[left] * nums[i] * nums[right], where left and right are its current neighbours (treat out-of-range neighbours as 1). Return the most coins you can collect by bursting all of them. ' +
      'Example: nums = [3,1,5,8] returns 167. Example: nums = [1,5] returns 10.',
    { dart: 'class Solution { int maxCoins(List<int> nums) }', typescript: 'function maxCoins(nums: number[]): number' },
    'maxCoins',
    'Choose the order to burst balloons so the coins, the product of a balloon and its current neighbours, add up to the most.',
    'Think about the last balloon burst in a range instead of the first. Pad the array with 1 on both sides. For a range between two walls left and right, if k is burst last, its neighbours at that moment are the walls, ' +
      'so it earns val[left] times val[k] times val[right], plus the best for the two sides, which are independent.',
    [
      { what: 'open the method, pad the numbers with 1 on both ends and create a table of best results per range', say: 'Choosing the last balloon makes the two sides independent.' },
      { what: 'for growing range lengths, try each balloon as the last one burst and keep the best total', say: 'Shorter ranges are already solved when a longer one needs them.' },
      { what: 'return the best for the whole range between the two padded ends', say: 'n cubed time.' }
    ],
    {
      dart: `//@step
class Solution {
  int maxCoins(List<int> nums) {
    final v = [1, ...nums, 1];
    final n = v.length;
    final dp = List.generate(n, (_) => List<int>.filled(n, 0));
//@step
    for (var len = 2; len < n; len++) {
      for (var left = 0; left + len < n; left++) {
        final right = left + len;
        for (var k = left + 1; k < right; k++) {
          final total = dp[left][k] + v[left] * v[k] * v[right] + dp[k][right];
          if (total > dp[left][right]) dp[left][right] = total;
        }
      }
    }
//@step
    return dp[0][n - 1];
  }
}`,
      typescript: `//@step
function maxCoins(nums: number[]): number {
  const v = [1, ...nums, 1];
  const n = v.length;
  const dp = Array.from({ length: n }, () => new Array<number>(n).fill(0));
//@step
  for (let len = 2; len < n; len++) {
    for (let left = 0; left + len < n; left++) {
      const right = left + len;
      for (let k = left + 1; k < right; k++) {
        dp[left][right] = Math.max(dp[left][right], dp[left][k] + v[left] * v[k] * v[right] + dp[k][right]);
      }
    }
  }
//@step
  return dp[0][n - 1];
}`
    },
    'With [3, 1, 5, 8]: the best order bursts 1, then 5, then 3, then 8, earning 15 + 120 + 24 + 8 = 167, which the table finds by trying every last balloon in every range.',
    'O(n cubed) time. O(n squared) space.',
    [{ args: [[3, 1, 5, 8]], expected: 167 }, { args: [[1, 5]], expected: 10 }]),
  problem('longest-increasing-path-in-matrix', 'Longest Increasing Path in a Matrix', 'hard',
    'Given an m x n integer matrix, return the length of the longest strictly increasing path, moving up, down, left or right. Example: matrix = [[9,9,4],[6,6,8],[2,1,1]] returns 4 (1, 2, 6, 9). Example: matrix = [[3,4,5],[3,2,6],[2,2,1]] returns 4.',
    { dart: 'class Solution { int longestIncreasingPath(List<List<int>> matrix) }', typescript: 'function longestIncreasingPath(matrix: number[][]): number' },
    'longestIncreasingPath',
    'Find the longest path through the grid where each step goes to a strictly bigger neighbour.',
    'Depth-first search from each cell with memoisation: the longest path starting at a cell is 1 plus the longest from any bigger neighbour. Because paths only go uphill there are no cycles, so each cell\'s answer is computed once.',
    [
      { what: 'open the method with a memo grid and a search that returns the longest path starting at a cell', say: 'Strictly increasing means no loops, so memoising is safe.' },
      { what: 'in the search, return the memo if set, otherwise take 1 plus the best bigger neighbour and store it', say: 'Each cell is solved once.' },
      { what: 'run the search from every cell and return the best', say: 'm times n time overall.' }
    ],
    {
      dart: `//@step
class Solution {
  int longestIncreasingPath(List<List<int>> matrix) {
    final rows = matrix.length;
    final cols = matrix[0].length;
    final memo = List.generate(rows, (_) => List<int>.filled(cols, 0));
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
//@step
    int longest(int r, int c) {
      if (memo[r][c] > 0) return memo[r][c];
      var best = 1;
      for (final d in dirs) {
        final nr = r + d[0];
        final nc = c + d[1];
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || matrix[nr][nc] <= matrix[r][c]) continue;
        final len = 1 + longest(nr, nc);
        if (len > best) best = len;
      }
      memo[r][c] = best;
      return best;
    }
//@step
    var answer = 0;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        final len = longest(r, c);
        if (len > answer) answer = len;
      }
    }
    return answer;
  }
}`,
      typescript: `//@step
function longestIncreasingPath(matrix: number[][]): number {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const memo = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
//@step
  const longest = (r: number, c: number): number => {
    if (memo[r][c] > 0) return memo[r][c];
    let best = 1;
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || matrix[nr][nc] <= matrix[r][c]) continue;
      best = Math.max(best, 1 + longest(nr, nc));
    }
    memo[r][c] = best;
    return best;
  };
//@step
  let answer = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) answer = Math.max(answer, longest(r, c));
  }
  return answer;
}`
    },
    'In the first example, starting at the 1 in the bottom middle, the path goes up to 2, to 6, to 9, length 4, and no longer path exists.',
    'O(m times n) time and space.',
    [{ args: [[[9, 9, 4], [6, 6, 8], [2, 1, 1]]], expected: 4 }, { args: [[[3, 4, 5], [3, 2, 6], [2, 2, 1]]], expected: 4 }, { args: [[[1]]], expected: 1 }]),
  problem('cheapest-flights-within-k-stops', 'Cheapest Flights Within K Stops', 'medium',
    'There are n cities and flights[i] = [from, to, price]. Return the cheapest price from src to dst with at most k stops, or -1 if there is no such route. ' +
      'Example: n = 4, flights = [[0,1,100],[1,2,100],[2,0,100],[1,3,600],[2,3,200]], src = 0, dst = 3, k = 1 returns 700.',
    { dart: 'class Solution { int findCheapestPrice(int n, List<List<int>> flights, int src, int dst, int k) }', typescript: 'function findCheapestPrice(n: number, flights: number[][], src: number, dst: number, k: number): number' },
    'findCheapestPrice',
    'Find the cheapest way to fly from one city to another using at most k stops in between.',
    'Bellman-Ford limited to k plus 1 rounds: each round relaxes every flight once, using a copy of the prices from the previous round, so each round adds at most one more flight to a route.',
    [
      { what: 'open the method with prices set to infinity except the source at 0', say: 'Prices start unknown.' },
      { what: 'run k plus 1 rounds; in each, relax every flight from a copy of the previous round\'s prices', say: 'The copy stops a round from chaining several flights.' },
      { what: 'return the price to the destination, or -1 if unreachable', say: 'k times the number of flights.' }
    ],
    {
      dart: `//@step
class Solution {
  int findCheapestPrice(int n, List<List<int>> flights, int src, int dst, int k) {
    const inf = 1 << 40;
    var price = List<int>.filled(n, inf);
    price[src] = 0;
//@step
    for (var round = 0; round <= k; round++) {
      final next = [...price];
      for (final f in flights) {
        if (price[f[0]] == inf) continue;
        if (price[f[0]] + f[2] < next[f[1]]) next[f[1]] = price[f[0]] + f[2];
      }
      price = next;
    }
//@step
    return price[dst] == inf ? -1 : price[dst];
  }
}`,
      typescript: `//@step
function findCheapestPrice(n: number, flights: number[][], src: number, dst: number, k: number): number {
  let price: number[] = new Array(n).fill(Infinity);
  price[src] = 0;
//@step
  for (let round = 0; round <= k; round++) {
    const next = [...price];
    for (const [from, to, cost] of flights) {
      if (price[from] === Infinity) continue;
      next[to] = Math.min(next[to], price[from] + cost);
    }
    price = next;
  }
//@step
  return price[dst] === Infinity ? -1 : price[dst];
}`
    },
    'With k = 1: round one reaches city 1 for 100; round two reaches city 3 through 1 for 700, and city 2 for 200, but 2 to 3 would need a second stop. Answer 700.',
    'O(k times E) time. O(n) space.',
    [{ args: [4, [[0, 1, 100], [1, 2, 100], [2, 0, 100], [1, 3, 600], [2, 3, 200]], 0, 3, 1], expected: 700 }, { args: [3, [[0, 1, 100], [1, 2, 100], [0, 2, 500]], 0, 2, 1], expected: 200 }, { args: [3, [[0, 1, 100], [1, 2, 100], [0, 2, 500]], 0, 2, 0], expected: 500 }]),
  problem('min-cost-to-connect-all-points', 'Min Cost to Connect All Points', 'medium',
    'Given points on a plane, the cost to connect two points is their Manhattan distance |x1 - x2| + |y1 - y2|. Return the minimum cost to connect all points so there is exactly one path between any two. ' +
      'Example: points = [[0,0],[2,2],[3,10],[5,2],[7,0]] returns 20.',
    { dart: 'class Solution { int minCostConnectPoints(List<List<int>> points) }', typescript: 'function minCostConnectPoints(points: number[][]): number' },
    'minCostConnectPoints',
    'Connect every point with the least total wiring, where wire length is the Manhattan distance.',
    'This is a minimum spanning tree. Prim\'s algorithm on a dense graph: keep the cheapest known connection cost for every point not yet in the tree; repeatedly add the cheapest one and update the others with distances to it.',
    [
      { what: 'open the method with the cheapest connection cost per point, all infinite except the first at 0', say: 'The tree starts from the first point.' },
      { what: 'repeatedly add the cheapest point not in the tree and update the others\' costs with their distance to it', say: 'Always taking the cheapest edge out of the tree is what makes it minimal.' },
      { what: 'return the total cost', say: 'n squared time, good for a dense graph.' }
    ],
    {
      dart: `//@step
class Solution {
  int minCostConnectPoints(List<List<int>> points) {
    final n = points.length;
    final cost = List<int>.filled(n, 1 << 40);
    final inTree = List<bool>.filled(n, false);
    cost[0] = 0;
    var total = 0;
//@step
    for (var round = 0; round < n; round++) {
      var u = -1;
      for (var v = 0; v < n; v++) {
        if (!inTree[v] && (u == -1 || cost[v] < cost[u])) u = v;
      }
      inTree[u] = true;
      total += cost[u];
      for (var v = 0; v < n; v++) {
        if (inTree[v]) continue;
        final d = (points[u][0] - points[v][0]).abs() + (points[u][1] - points[v][1]).abs();
        if (d < cost[v]) cost[v] = d;
      }
    }
//@step
    return total;
  }
}`,
      typescript: `//@step
function minCostConnectPoints(points: number[][]): number {
  const n = points.length;
  const cost: number[] = new Array(n).fill(Infinity);
  const inTree: boolean[] = new Array(n).fill(false);
  cost[0] = 0;
  let total = 0;
//@step
  for (let round = 0; round < n; round++) {
    let u = -1;
    for (let v = 0; v < n; v++) if (!inTree[v] && (u === -1 || cost[v] < cost[u])) u = v;
    inTree[u] = true;
    total += cost[u];
    for (let v = 0; v < n; v++) {
      if (inTree[v]) continue;
      const d = Math.abs(points[u][0] - points[v][0]) + Math.abs(points[u][1] - points[v][1]);
      cost[v] = Math.min(cost[v], d);
    }
  }
//@step
  return total;
}`
    },
    'With the five points: Prim adds [2, 2] for 4, then [5, 2] for 3, then [7, 0] for 4, then [3, 10] for 9. Total 20.',
    'O(n squared) time. O(n) space.',
    [{ args: [[[0, 0], [2, 2], [3, 10], [5, 2], [7, 0]]], expected: 20 }, { args: [[[3, 12], [-2, 5], [-4, 1]]], expected: 18 }, { args: [[[0, 0]]], expected: 0 }]),
  problem('alien-dictionary', 'Alien Dictionary', 'hard',
    'A list of words is sorted in an unknown alien alphabet that uses lowercase English letters. Return a string of the letters in their alien order; if several orders fit, return the one that puts letters in first-seen order when free, and return "" if the order is invalid. ' +
      'Example: words = ["wrt","wrf","er","ett","rftt"] returns "wertf". Example: words = ["z","x","z"] returns "".',
    { dart: 'class Solution { String alienOrder(List<String> words) }', typescript: 'function alienOrder(words: string[]): string' },
    'alienOrder',
    'Work out the order of an unknown alphabet from a list of words sorted in it.',
    'Compare each pair of neighbouring words: the first position where they differ says the first word\'s letter comes before the second\'s. That gives a graph of letters; a topological sort gives the order. ' +
      'A cycle, or a longer word listed before its own prefix, means the input is invalid.',
    [
      { what: 'open the method, register every letter, and add an edge from the first differing letters of each neighbouring pair', say: 'Only the first difference carries information.' },
      { what: 'return "" if a word comes before its own prefix, then topologically sort, taking ready letters in first-seen order', say: 'A prefix appearing later breaks the sorting rule.' },
      { what: 'return the order, or "" if not every letter was placed', say: 'A leftover letter means a cycle.' }
    ],
    {
      dart: `//@step
class Solution {
  String alienOrder(List<String> words) {
    final order = <String>[];
    final next = <String, Set<String>>{};
    final indegree = <String, int>{};
    for (final w in words) {
      for (final c in w.split('')) {
        if (!next.containsKey(c)) {
          next[c] = <String>{};
          indegree[c] = 0;
          order.add(c);
        }
      }
    }
//@step
    for (var i = 0; i + 1 < words.length; i++) {
      final a = words[i];
      final b = words[i + 1];
      final len = a.length < b.length ? a.length : b.length;
      var j = 0;
      while (j < len && a[j] == b[j]) {
        j++;
      }
      if (j == len) {
        if (a.length > b.length) return '';
        continue;
      }
      if (next[a[j]]!.add(b[j])) indegree[b[j]] = indegree[b[j]]! + 1;
    }
//@step
    final result = StringBuffer();
    final ready = order.where((c) => indegree[c] == 0).toList();
    for (var q = 0; q < ready.length; q++) {
      final c = ready[q];
      result.write(c);
      for (final d in order.where((x) => next[c]!.contains(x))) {
        indegree[d] = indegree[d]! - 1;
        if (indegree[d] == 0) ready.add(d);
      }
    }
    return result.length == order.length ? result.toString() : '';
  }
}`,
      typescript: `//@step
function alienOrder(words: string[]): string {
  const order: string[] = [];
  const next = new Map<string, Set<string>>();
  const indegree = new Map<string, number>();
  for (const w of words) {
    for (const c of w) {
      if (!next.has(c)) {
        next.set(c, new Set());
        indegree.set(c, 0);
        order.push(c);
      }
    }
  }
//@step
  for (let i = 0; i + 1 < words.length; i++) {
    const a = words[i];
    const b = words[i + 1];
    const len = Math.min(a.length, b.length);
    let j = 0;
    while (j < len && a[j] === b[j]) j++;
    if (j === len) {
      if (a.length > b.length) return '';
      continue;
    }
    const edges = next.get(a[j]) as Set<string>;
    if (!edges.has(b[j])) {
      edges.add(b[j]);
      indegree.set(b[j], (indegree.get(b[j]) as number) + 1);
    }
  }
//@step
  let result = '';
  const ready = order.filter((c) => indegree.get(c) === 0);
  for (let q = 0; q < ready.length; q++) {
    const c = ready[q];
    result += c;
    for (const d of order) {
      if (!(next.get(c) as Set<string>).has(d)) continue;
      indegree.set(d, (indegree.get(d) as number) - 1);
      if (indegree.get(d) === 0) ready.push(d);
    }
  }
  return result.length === order.length ? result : '';
}`
    },
    'From the example pairs: t before f, w before e, r before t, e before r. That chains w, e, r, t, f, so the answer is "wertf".',
    'O(C) time, the total number of characters, plus the letter graph. O(1) space for 26 letters.',
    [{ args: [['wrt', 'wrf', 'er', 'ett', 'rftt']], expected: 'wertf' }, { args: [['z', 'x']], expected: 'zx' }, { args: [['z', 'x', 'z']], expected: '' }, { args: [['abc', 'ab']], expected: '' }]),
  problem('distinct-subsequences', 'Distinct Subsequences', 'hard',
    'Given strings s and t, return the number of distinct subsequences of s that equal t. Example: s = "rabbbit", t = "rabbit" returns 3. Example: s = "babgbag", t = "bag" returns 5.',
    { dart: 'class Solution { int numDistinct(String s, String t) }', typescript: 'function numDistinct(s: string, t: string): number' },
    'numDistinct',
    'Count the different ways to pick letters of s, in order, that spell t.',
    'Let ways[j] be the number of ways to form the first j letters of t from the part of s seen so far. For each letter of s, go through t backwards: wherever the letter matches t[j - 1], add ways[j - 1] to ways[j]. Going backwards uses each letter of s at most once per subsequence.',
    [
      { what: 'open the method with ways[0] = 1 and the rest 0', say: 'The empty target can be formed one way.' },
      { what: 'for each letter of s, update ways from the end of t backwards wherever the letters match', say: 'Backwards order keeps this round from reusing the same letter.' },
      { what: 'return ways for the full length of t', say: 'm times n time, n space.' }
    ],
    {
      dart: `//@step
class Solution {
  int numDistinct(String s, String t) {
    final ways = List<int>.filled(t.length + 1, 0);
    ways[0] = 1;
//@step
    for (var i = 0; i < s.length; i++) {
      for (var j = t.length; j >= 1; j--) {
        if (s[i] == t[j - 1]) ways[j] += ways[j - 1];
      }
    }
//@step
    return ways[t.length];
  }
}`,
      typescript: `//@step
function numDistinct(s: string, t: string): number {
  const ways: number[] = new Array(t.length + 1).fill(0);
  ways[0] = 1;
//@step
  for (let i = 0; i < s.length; i++) {
    for (let j = t.length; j >= 1; j--) {
      if (s[i] === t[j - 1]) ways[j] += ways[j - 1];
    }
  }
//@step
  return ways[t.length];
}`
    },
    'With "rabbbit" and "rabbit": the three b letters in s give three choices for which b is left out, so there are 3 ways.',
    'O(m times n) time. O(n) space.',
    [{ args: ['rabbbit', 'rabbit'], expected: 3 }, { args: ['babgbag', 'bag'], expected: 5 }, { args: ['abc', 'abcd'], expected: 0 }]),
  problem('interleaving-string', 'Interleaving String', 'medium',
    'Given strings s1, s2 and s3, return true if s3 is formed by interleaving s1 and s2, keeping the letter order of each. Example: s1 = "aabcc", s2 = "dbbca", s3 = "aadbbcbcac" returns true. Example: s3 = "aadbbbaccc" returns false.',
    { dart: 'class Solution { bool isInterleave(String s1, String s2, String s3) }', typescript: 'function isInterleave(s1: string, s2: string, s3: string): boolean' },
    'isInterleave',
    'Check whether the third string can be made by merging the first two without changing the order inside either.',
    'ok[i][j] says the first i letters of s1 and the first j of s2 can form the first i plus j letters of s3. It is true if the last letter came from s1 and ok[i - 1][j] holds, or from s2 and ok[i][j - 1] holds. A single row is enough.',
    [
      { what: 'open the method, return false if the lengths do not add up, and set up one row of the table', say: 'Lengths must match exactly.' },
      { what: 'fill the table: each cell is true if the next letter of s3 can come from s1 or from s2', say: 'Each cell depends on the cell above and to the left.' },
      { what: 'return the last cell', say: 'm times n time, n space.' }
    ],
    {
      dart: `//@step
class Solution {
  bool isInterleave(String s1, String s2, String s3) {
    final m = s1.length;
    final n = s2.length;
    if (m + n != s3.length) return false;
    final ok = List<bool>.filled(n + 1, false);
//@step
    for (var i = 0; i <= m; i++) {
      for (var j = 0; j <= n; j++) {
        if (i == 0 && j == 0) {
          ok[j] = true;
        } else {
          final fromS1 = i > 0 && ok[j] && s1[i - 1] == s3[i + j - 1];
          final fromS2 = j > 0 && ok[j - 1] && s2[j - 1] == s3[i + j - 1];
          ok[j] = fromS1 || fromS2;
        }
      }
    }
//@step
    return ok[n];
  }
}`,
      typescript: `//@step
function isInterleave(s1: string, s2: string, s3: string): boolean {
  const m = s1.length;
  const n = s2.length;
  if (m + n !== s3.length) return false;
  const ok: boolean[] = new Array(n + 1).fill(false);
//@step
  for (let i = 0; i <= m; i++) {
    for (let j = 0; j <= n; j++) {
      if (i === 0 && j === 0) ok[j] = true;
      else {
        const fromS1 = i > 0 && ok[j] && s1[i - 1] === s3[i + j - 1];
        const fromS2 = j > 0 && ok[j - 1] && s2[j - 1] === s3[i + j - 1];
        ok[j] = fromS1 || fromS2;
      }
    }
  }
//@step
  return ok[n];
}`
    },
    'With "aabcc", "dbbca" and "aadbbcbcac": the table finds a path taking a, a from s1, then d, b, b from s2, and so on to the end, so true.',
    'O(m times n) time. O(n) space.',
    [{ args: ['aabcc', 'dbbca', 'aadbbcbcac'], expected: true }, { args: ['aabcc', 'dbbca', 'aadbbbaccc'], expected: false }, { args: ['', '', ''], expected: true }]),
  problem('basic-calculator', 'Basic Calculator', 'hard',
    'Given a string s with non-negative integers, +, -, parentheses and spaces, evaluate it without eval. A minus may be unary, like "-(2+3)". Example: s = "1 + 1" returns 2. Example: s = " 2-1 + 2 " returns 3. Example: s = "(1+(4+5+2)-3)+(6+8)" returns 23.',
    { dart: 'class Solution { int calculate(String s) }', typescript: 'function calculate(s: string): number' },
    'calculate',
    'Evaluate an expression with plus, minus and brackets.',
    'Keep a running result and the current sign. When an opening bracket comes, push the result and sign onto a stack and start fresh; at a closing bracket, finish the inner result, multiply by the saved sign and add the saved result.',
    [
      { what: 'open the method with the result, the current number, the sign and a stack', say: 'The stack remembers what was outside each bracket.' },
      { what: 'build numbers from digits; on + or - add the number with its sign; on ( push and reset; on ) finish and pop', say: 'A bracket\'s value is combined with what was saved before it.' },
      { what: 'add the last number and return the result', say: 'Linear time.' }
    ],
    {
      dart: `//@step
class Solution {
  int calculate(String s) {
    var result = 0;
    var number = 0;
    var sign = 1;
    final stack = <int>[];
//@step
    for (final c in s.split('')) {
      final d = c.codeUnitAt(0) - 48;
      if (d >= 0 && d <= 9) {
        number = number * 10 + d;
      } else if (c == '+' || c == '-') {
        result += sign * number;
        number = 0;
        sign = c == '+' ? 1 : -1;
      } else if (c == '(') {
        stack.add(result);
        stack.add(sign);
        result = 0;
        sign = 1;
      } else if (c == ')') {
        result += sign * number;
        number = 0;
        result = result * stack.removeLast() + stack.removeLast();
      }
    }
//@step
    return result + sign * number;
  }
}`,
      typescript: `//@step
function calculate(s: string): number {
  let result = 0;
  let number = 0;
  let sign = 1;
  const stack: number[] = [];
//@step
  for (const c of s) {
    if (c >= '0' && c <= '9') number = number * 10 + Number(c);
    else if (c === '+' || c === '-') {
      result += sign * number;
      number = 0;
      sign = c === '+' ? 1 : -1;
    } else if (c === '(') {
      stack.push(result, sign);
      result = 0;
      sign = 1;
    } else if (c === ')') {
      result += sign * number;
      number = 0;
      const savedSign = stack.pop() as number;
      result = result * savedSign + (stack.pop() as number);
    }
  }
//@step
  return result + sign * number;
}`
    },
    'With "(1+(4+5+2)-3)+(6+8)": the inner bracket gives 11, the outer one 1 + 11 - 3 = 9, the second bracket 14, and 9 + 14 = 23.',
    'O(n) time. O(n) space for nested brackets.',
    [{ args: ['1 + 1'], expected: 2 }, { args: [' 2-1 + 2 '], expected: 3 }, { args: ['(1+(4+5+2)-3)+(6+8)'], expected: 23 }, { args: ['-(2+3)'], expected: -5 }]),
  problem('largest-number', 'Largest Number', 'medium',
    'Given a list of non-negative integers nums, arrange them to form the largest number and return it as a string. Example: nums = [10,2] returns "210". Example: nums = [3,30,34,5,9] returns "9534330". Example: nums = [0,0] returns "0".',
    { dart: 'class Solution { String largestNumber(List<int> nums) }', typescript: 'function largestNumber(nums: number[]): string' },
    'largestNumber',
    'Order the numbers so that, written side by side, they make the biggest possible number.',
    'Sort the numbers as strings with a custom rule: a goes before b if a followed by b is bigger than b followed by a. That rule is consistent, so the sorted order is optimal. If the first is "0", everything is zero.',
    [
      { what: 'open the method and turn the numbers into strings', say: 'Comparing joined strings is the key idea.' },
      { what: 'sort with the rule: a before b when a plus b beats b plus a', say: 'So 9 comes before 34, and 3 before 30.' },
      { what: 'join them, and return "0" if the result starts with 0', say: 'n log n comparisons.' }
    ],
    {
      dart: `//@step
class Solution {
  String largestNumber(List<int> nums) {
    final parts = nums.map((n) => n.toString()).toList();
//@step
    parts.sort((a, b) => (b + a).compareTo(a + b));
//@step
    final joined = parts.join();
    return joined.startsWith('0') ? '0' : joined;
  }
}`,
      typescript: `//@step
function largestNumber(nums: number[]): string {
  const parts = nums.map(String);
//@step
  parts.sort((a, b) => (b + a).localeCompare(a + b));
//@step
  const joined = parts.join('');
  return joined.startsWith('0') ? '0' : joined;
}`
    },
    'With [3, 30, 34, 5, 9]: comparing joined pairs orders them 9, 5, 34, 3, 30, giving "9534330".',
    'O(n log n) comparisons, each O(k) for k-digit numbers. O(n) space.',
    [{ args: [[10, 2]], expected: '210' }, { args: [[3, 30, 34, 5, 9]], expected: '9534330' }, { args: [[0, 0]], expected: '0' }]),
  problem('accounts-merge', 'Accounts Merge', 'medium',
    'Given accounts where accounts[i][0] is a name and the rest are emails, merge accounts that share any email (they belong to the same person). Return each merged account as the name followed by its emails sorted, in any order. ' +
      'Example: [["John","johnsmith@mail.com","john_newyork@mail.com"],["John","johnsmith@mail.com","john00@mail.com"],["Mary","mary@mail.com"],["John","johnnybravo@mail.com"]] returns ' +
      '[["John","john00@mail.com","john_newyork@mail.com","johnsmith@mail.com"],["Mary","mary@mail.com"],["John","johnnybravo@mail.com"]].',
    { dart: 'class Solution { List<List<String>> accountsMerge(List<List<String>> accounts) }', typescript: 'function accountsMerge(accounts: string[][]): string[][]' },
    'accountsMerge',
    'Combine accounts that share an email address into one per person.',
    'Union find over accounts: map each email to the first account that had it, and join any later account with the same email to that one. Then group emails by their account\'s root, sort them and put the name in front.',
    [
      { what: 'open the method with a parent per account, a find function, and a map from email to account', say: 'A shared email means two accounts are the same person.' },
      { what: 'for each email, join the account with the first account that had it', say: 'Union find merges chains of shared emails too.' },
      { what: 'group emails by root account, sort each group, add the name, and return', say: 'Sorting the emails dominates the cost.' }
    ],
    {
      dart: `//@step
class Solution {
  List<List<String>> accountsMerge(List<List<String>> accounts) {
    final parent = List<int>.generate(accounts.length, (i) => i);
    int find(int x) {
      while (parent[x] != x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
      }
      return x;
    }
    final owner = <String, int>{};
//@step
    for (var i = 0; i < accounts.length; i++) {
      for (final email in accounts[i].skip(1)) {
        final j = owner[email];
        if (j == null) {
          owner[email] = i;
        } else {
          parent[find(i)] = find(j);
        }
      }
    }
//@step
    final groups = <int, List<String>>{};
    owner.forEach((email, i) => groups.putIfAbsent(find(i), () => []).add(email));
    return groups.entries.map((e) => [accounts[e.key][0], ...(e.value..sort())]).toList();
  }
}`,
      typescript: `//@step
function accountsMerge(accounts: string[][]): string[][] {
  const parent = accounts.map((_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const owner = new Map<string, number>();
//@step
  accounts.forEach((account, i) => {
    for (const email of account.slice(1)) {
      const j = owner.get(email);
      if (j === undefined) owner.set(email, i);
      else parent[find(i)] = find(j);
    }
  });
//@step
  const groups = new Map<number, string[]>();
  for (const [email, i] of owner) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    (groups.get(root) as string[]).push(email);
  }
  return [...groups].map(([root, emails]) => [accounts[root][0], ...emails.sort()]);
}`
    },
    'In the example, the first two John accounts share johnsmith@mail.com, so they merge with three sorted emails. Mary and the other John stay separate.',
    'O(E log E) time for sorting E emails, plus near-linear union find. O(E) space.',
    [{ args: [[['John', 'johnsmith@mail.com', 'john_newyork@mail.com'], ['John', 'johnsmith@mail.com', 'john00@mail.com'], ['Mary', 'mary@mail.com'], ['John', 'johnnybravo@mail.com']]], expected: [['John', 'john00@mail.com', 'john_newyork@mail.com', 'johnsmith@mail.com'], ['Mary', 'mary@mail.com'], ['John', 'johnnybravo@mail.com']] }],
    { compare: 'sorted' }),
  problem('word-break-ii', 'Word Break II', 'hard',
    'Given a string s and a dictionary wordDict, add spaces to s to build sentences where every word is in the dictionary, and return all such sentences in any order. Words may be reused. ' +
      'Example: s = "catsanddog", wordDict = ["cat","cats","and","sand","dog"] returns ["cats and dog","cat sand dog"].',
    { dart: 'class Solution { List<String> wordBreak(String s, List<String> wordDict) }', typescript: 'function wordBreak(s: string, wordDict: string[]): string[]' },
    'wordBreak',
    'List every way to split the text into dictionary words: "catsanddog" can be "cats and dog" or "cat sand dog".',
    'Recursion with memoisation on the start index: the sentences for the suffix starting at i are, for every dictionary word that matches at i, that word followed by each sentence of the rest. The memo stops recomputing the same suffix.',
    [
      { what: 'open the method with the words in a set and a memo from start index to sentences', say: 'The same suffix is reached from many paths.' },
      { what: 'for a start index, try every end; when the piece is a word, combine it with each sentence of the rest', say: 'The end of the string gives one empty sentence to build on.' },
      { what: 'return the sentences for index 0', say: 'Exponential output in the worst case, but no repeated work.' }
    ],
    {
      dart: `//@step
class Solution {
  List<String> wordBreak(String s, List<String> wordDict) {
    final words = wordDict.toSet();
    final memo = <int, List<String>>{};
//@step
    List<String> from(int start) {
      if (start == s.length) return [''];
      final cached = memo[start];
      if (cached != null) return cached;
      final out = <String>[];
      for (var end = start + 1; end <= s.length; end++) {
        final word = s.substring(start, end);
        if (!words.contains(word)) continue;
        for (final rest in from(end)) {
          out.add(rest.isEmpty ? word : '\$word \$rest');
        }
      }
      memo[start] = out;
      return out;
    }
//@step
    return from(0);
  }
}`,
      typescript: `//@step
function wordBreak(s: string, wordDict: string[]): string[] {
  const words = new Set(wordDict);
  const memo = new Map<number, string[]>();
//@step
  const from = (start: number): string[] => {
    if (start === s.length) return [''];
    const cached = memo.get(start);
    if (cached) return cached;
    const out: string[] = [];
    for (let end = start + 1; end <= s.length; end++) {
      const word = s.slice(start, end);
      if (!words.has(word)) continue;
      for (const rest of from(end)) out.push(rest === '' ? word : word + ' ' + rest);
    }
    memo.set(start, out);
    return out;
  };
//@step
  return from(0);
}`
    },
    'With "catsanddog": from 0, "cat" leads to "sanddog", which is "sand dog"; "cats" leads to "anddog", which is "and dog". Two sentences.',
    'Exponential in the worst case because of the output size; memoisation avoids recomputing suffixes. O(n squared) memo entries plus the output.',
    [{ args: ['catsanddog', ['cat', 'cats', 'and', 'sand', 'dog']], expected: ['cats and dog', 'cat sand dog'] }, { args: ['catsandog', ['cats', 'dog', 'sand', 'and', 'cat']], expected: [] }],
    { compare: 'sorted' })
];
