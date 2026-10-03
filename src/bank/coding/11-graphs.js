// Graphs: grids, BFS and DFS, topological sort and union find.
module.exports = [
  {
    id: 'number-of-islands',
    title: 'Number of Islands',
    level: 'medium',
    statement: 'Given an m x n grid of "1" (land) and "0" (water), return the number of islands. An island is land connected horizontally or vertically and surrounded by water; the grid edges are water. ' +
      'Example: grid = [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]] returns 3.',
    signature: { dart: 'class Solution { int numIslands(List<List<String>> grid) }', typescript: 'function numIslands(grid: string[][]): number' },
    fn: 'numIslands',
    asks: 'Count the separate pieces of land in the grid, where land touches only up, down, left or right.',
    idea: 'Scan every cell. When a land cell is found, count a new island and flood it, turning all connected land into water with depth-first search, so it is not counted again.',
    where: { dart: 'the Solution class, replacing the numIslands method.', typescript: 'the numIslands function, replacing its body.' },
    steps: [
      { what: 'open the method with a flood helper that sinks a cell and its land neighbours', say: 'Sinking marks the whole island as visited.' },
      { what: 'scan the grid; on land, add one island and flood from there', say: 'Each island is found once, at its first cell.' },
      { what: 'return the count', say: 'Each cell is visited a constant number of times.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int numIslands(List<List<String>> grid) {
    final rows = grid.length;
    final cols = grid[0].length;
    void sink(int r, int c) {
      if (r < 0 || c < 0 || r >= rows || c >= cols || grid[r][c] != '1') return;
      grid[r][c] = '0';
      sink(r + 1, c);
      sink(r - 1, c);
      sink(r, c + 1);
      sink(r, c - 1);
    }
//@step
    var islands = 0;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (grid[r][c] == '1') {
          islands++;
          sink(r, c);
        }
      }
    }
//@step
    return islands;
  }
}`,
      typescript: `//@step
function numIslands(grid: string[][]): number {
  const rows = grid.length;
  const cols = grid[0].length;
  const sink = (r: number, c: number): void => {
    if (r < 0 || c < 0 || r >= rows || c >= cols || grid[r][c] !== '1') return;
    grid[r][c] = '0';
    sink(r + 1, c);
    sink(r - 1, c);
    sink(r, c + 1);
    sink(r, c - 1);
  };
//@step
  let islands = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === '1') {
        islands++;
        sink(r, c);
      }
    }
  }
//@step
  return islands;
}`
    },
    check: 'In the example, the top-left block of four is one island and gets sunk; the single 1 in the middle is a second; the two 1s at the bottom right are a third. Answer 3.',
    complexity: 'O(m times n) time. O(m times n) recursion depth in the worst case.',
    tests: [
      { args: [[['1', '1', '0', '0', '0'], ['1', '1', '0', '0', '0'], ['0', '0', '1', '0', '0'], ['0', '0', '0', '1', '1']]], expected: 3 },
      { args: [[['1', '1', '1'], ['0', '1', '0'], ['1', '1', '1']]], expected: 1 },
      { args: [[['0']]], expected: 0 }
    ]
  },
  {
    id: 'max-area-of-island',
    title: 'Max Area of Island',
    level: 'medium',
    statement: 'Given an m x n binary grid where 1 is land and 0 is water, return the area of the largest island (connected horizontally or vertically), or 0 if there is none. ' +
      'Example: grid = [[0,1,1],[0,1,0],[1,0,1]] returns 3.',
    signature: { dart: 'class Solution { int maxAreaOfIsland(List<List<int>> grid) }', typescript: 'function maxAreaOfIsland(grid: number[][]): number' },
    fn: 'maxAreaOfIsland',
    asks: 'Find the island with the most cells.',
    idea: 'Like counting islands, but the flood fill returns how many cells it sank. Keep the biggest result.',
    where: { dart: 'the Solution class, replacing the maxAreaOfIsland method.', typescript: 'the maxAreaOfIsland function, replacing its body.' },
    steps: [
      { what: 'open the method with a helper that sinks an island and returns its size', say: 'The size is one plus the sizes found from the four neighbours.' },
      { what: 'scan the grid and flood each island found, keeping the largest size', say: 'Every cell is visited once.' },
      { what: 'return the largest size', say: 'Linear in the grid size.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int maxAreaOfIsland(List<List<int>> grid) {
    final rows = grid.length;
    final cols = grid[0].length;
    int area(int r, int c) {
      if (r < 0 || c < 0 || r >= rows || c >= cols || grid[r][c] != 1) return 0;
      grid[r][c] = 0;
      return 1 + area(r + 1, c) + area(r - 1, c) + area(r, c + 1) + area(r, c - 1);
    }
//@step
    var best = 0;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        final a = area(r, c);
        if (a > best) best = a;
      }
    }
//@step
    return best;
  }
}`,
      typescript: `//@step
function maxAreaOfIsland(grid: number[][]): number {
  const rows = grid.length;
  const cols = grid[0].length;
  const area = (r: number, c: number): number => {
    if (r < 0 || c < 0 || r >= rows || c >= cols || grid[r][c] !== 1) return 0;
    grid[r][c] = 0;
    return 1 + area(r + 1, c) + area(r - 1, c) + area(r, c + 1) + area(r, c - 1);
  };
//@step
  let best = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) best = Math.max(best, area(r, c));
  }
//@step
  return best;
}`
    },
    check: 'With [[0, 1, 1], [0, 1, 0], [1, 0, 1]]: the three connected 1s at the top form an island of size 3; the other two 1s are size 1 each. Answer 3.',
    complexity: 'O(m times n) time and worst-case recursion depth.',
    tests: [
      { args: [[[0, 1, 1], [0, 1, 0], [1, 0, 1]]], expected: 3 },
      { args: [[[0, 0, 0]]], expected: 0 },
      { args: [[[1, 1], [1, 1]]], expected: 4 }
    ]
  },
  {
    id: 'rotting-oranges',
    title: 'Rotting Oranges',
    level: 'medium',
    statement: 'In an m x n grid, 0 is empty, 1 is a fresh orange and 2 is a rotten one. Every minute, fresh oranges next to a rotten one (up, down, left, right) become rotten. ' +
      'Return the minimum minutes until no fresh orange remains, or -1 if that is impossible. Example: grid = [[2,1,1],[1,1,0],[0,1,1]] returns 4. Example: grid = [[2,1,1],[0,1,1],[1,0,1]] returns -1.',
    signature: { dart: 'class Solution { int orangesRotting(List<List<int>> grid) }', typescript: 'function orangesRotting(grid: number[][]): number' },
    fn: 'orangesRotting',
    asks: 'Work out how many minutes it takes for the rot to spread to every orange, or -1 if some can never be reached.',
    idea: 'Multi-source breadth-first search: start with all rotten oranges in the queue at once, and process the queue minute by minute, rotting fresh neighbours. Count the fresh ones; if any remain at the end, return -1.',
    where: { dart: 'the Solution class, replacing the orangesRotting method.', typescript: 'the orangesRotting function, replacing its body.' },
    steps: [
      { what: 'open the method, queue every rotten orange and count the fresh ones', say: 'All rotten oranges spread at the same time, so they all start the search.' },
      { what: 'process one minute at a time, rotting fresh neighbours and queueing them', say: 'Each round of the queue is one minute.' },
      { what: 'return the minutes if nothing fresh is left, else -1', say: 'Linear in the grid size.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int orangesRotting(List<List<int>> grid) {
    final rows = grid.length;
    final cols = grid[0].length;
    var queue = <List<int>>[];
    var fresh = 0;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (grid[r][c] == 2) queue.add([r, c]);
        if (grid[r][c] == 1) fresh++;
      }
    }
//@step
    var minutes = 0;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (queue.isNotEmpty && fresh > 0) {
      final next = <List<int>>[];
      for (final cell in queue) {
        for (final d in dirs) {
          final r = cell[0] + d[0];
          final c = cell[1] + d[1];
          if (r < 0 || c < 0 || r >= rows || c >= cols || grid[r][c] != 1) continue;
          grid[r][c] = 2;
          fresh--;
          next.add([r, c]);
        }
      }
      queue = next;
      minutes++;
    }
//@step
    return fresh == 0 ? minutes : -1;
  }
}`,
      typescript: `//@step
function orangesRotting(grid: number[][]): number {
  const rows = grid.length;
  const cols = grid[0].length;
  let queue: number[][] = [];
  let fresh = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 2) queue.push([r, c]);
      if (grid[r][c] === 1) fresh++;
    }
  }
//@step
  let minutes = 0;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (queue.length > 0 && fresh > 0) {
    const next: number[][] = [];
    for (const [cr, cc] of queue) {
      for (const [dr, dc] of dirs) {
        const r = cr + dr;
        const c = cc + dc;
        if (r < 0 || c < 0 || r >= rows || c >= cols || grid[r][c] !== 1) continue;
        grid[r][c] = 2;
        fresh--;
        next.push([r, c]);
      }
    }
    queue = next;
    minutes++;
  }
//@step
  return fresh === 0 ? minutes : -1;
}`
    },
    check: 'With [[2, 1, 1], [1, 1, 0], [0, 1, 1]]: minute 1 rots the two neighbours of the corner, minute 2 the next ring, and so on; the last fresh orange in the bottom right rots at minute 4.',
    complexity: 'O(m times n) time and space.',
    tests: [
      { args: [[[2, 1, 1], [1, 1, 0], [0, 1, 1]]], expected: 4 },
      { args: [[[2, 1, 1], [0, 1, 1], [1, 0, 1]]], expected: -1 },
      { args: [[[0, 2]]], expected: 0 }
    ]
  },
  {
    id: 'course-schedule',
    title: 'Course Schedule',
    level: 'medium',
    statement: 'There are numCourses courses labelled 0 to numCourses - 1, and prerequisites[i] = [a, b] means you must take b before a. Return true if you can finish all courses. ' +
      'Example: numCourses = 2, prerequisites = [[1,0]] returns true. Example: numCourses = 2, prerequisites = [[1,0],[0,1]] returns false.',
    signature: { dart: 'class Solution { bool canFinish(int numCourses, List<List<int>> prerequisites) }', typescript: 'function canFinish(numCourses: number, prerequisites: number[][]): boolean' },
    fn: 'canFinish',
    asks: 'Check whether the prerequisite rules contain a loop; if they do, the courses can never all be finished.',
    idea: 'Kahn\'s topological sort: count each course\'s unmet prerequisites. Start with courses that have none, and each time one is taken, reduce the count of the courses that depend on it. ' +
      'If every course is eventually taken, there is no cycle.',
    where: { dart: 'the Solution class, replacing the canFinish method.', typescript: 'the canFinish function, replacing its body.' },
    steps: [
      { what: 'open the method and build the graph and the count of prerequisites per course', say: 'An edge goes from a prerequisite to the course that needs it.' },
      { what: 'take courses with zero remaining prerequisites, lowering the counts of the courses they unlock', say: 'Courses in a cycle never reach zero.' },
      { what: 'return whether all courses were taken', say: 'Linear in courses plus prerequisites.' }
    ],
    code: {
      dart: `//@step
class Solution {
  bool canFinish(int numCourses, List<List<int>> prerequisites) {
    final unlocks = List.generate(numCourses, (_) => <int>[]);
    final needs = List<int>.filled(numCourses, 0);
    for (final p in prerequisites) {
      unlocks[p[1]].add(p[0]);
      needs[p[0]]++;
    }
//@step
    final ready = [for (var c = 0; c < numCourses; c++) if (needs[c] == 0) c];
    var taken = 0;
    while (ready.isNotEmpty) {
      final course = ready.removeLast();
      taken++;
      for (final next in unlocks[course]) {
        if (--needs[next] == 0) ready.add(next);
      }
    }
//@step
    return taken == numCourses;
  }
}`,
      typescript: `//@step
function canFinish(numCourses: number, prerequisites: number[][]): boolean {
  const unlocks: number[][] = Array.from({ length: numCourses }, () => []);
  const needs: number[] = new Array(numCourses).fill(0);
  for (const [course, pre] of prerequisites) {
    unlocks[pre].push(course);
    needs[course]++;
  }
//@step
  const ready: number[] = [];
  for (let c = 0; c < numCourses; c++) if (needs[c] === 0) ready.push(c);
  let taken = 0;
  while (ready.length > 0) {
    const course = ready.pop() as number;
    taken++;
    for (const next of unlocks[course]) if (--needs[next] === 0) ready.push(next);
  }
//@step
  return taken === numCourses;
}`
    },
    check: 'With 2 courses and [[1, 0], [0, 1]]: each course needs the other, so neither ever reaches zero prerequisites. Nothing is taken, so the answer is false.',
    complexity: 'O(V + E) time and space, courses plus prerequisites.',
    tests: [
      { args: [2, [[1, 0]]], expected: true },
      { args: [2, [[1, 0], [0, 1]]], expected: false },
      { args: [4, [[1, 0], [2, 1], [3, 2]]], expected: true }
    ]
  },
  {
    id: 'course-schedule-ii',
    title: 'Course Schedule II',
    level: 'medium',
    statement: 'There are numCourses courses and prerequisites[i] = [a, b] meaning b must be taken before a. Return an order in which all courses can be taken; if several are valid, any one is fine; if impossible, return an empty array. ' +
      'Example: numCourses = 2, prerequisites = [[1,0]] returns [0,1]. Example: numCourses = 1, prerequisites = [] returns [0].',
    signature: { dart: 'class Solution { List<int> findOrder(int numCourses, List<List<int>> prerequisites) }', typescript: 'function findOrder(numCourses: number, prerequisites: number[][]): number[]' },
    fn: 'findOrder',
    asks: 'Give an order to take all the courses that respects every prerequisite, or nothing if there is a loop.',
    idea: 'The same topological sort as the previous problem, but record the order in which courses become ready. If not all courses get recorded, there is a cycle and the answer is empty.',
    where: { dart: 'the Solution class, replacing the findOrder method.', typescript: 'the findOrder function, replacing its body.' },
    steps: [
      { what: 'open the method and build the graph and prerequisite counts', say: 'Same setup as checking for cycles.' },
      { what: 'process ready courses in a queue, appending each to the order', say: 'Using a queue gives a natural, readable order.' },
      { what: 'return the order if it has every course, else an empty list', say: 'Linear in courses plus edges.' }
    ],
    code: {
      dart: `//@step
class Solution {
  List<int> findOrder(int numCourses, List<List<int>> prerequisites) {
    final unlocks = List.generate(numCourses, (_) => <int>[]);
    final needs = List<int>.filled(numCourses, 0);
    for (final p in prerequisites) {
      unlocks[p[1]].add(p[0]);
      needs[p[0]]++;
    }
//@step
    final order = [for (var c = 0; c < numCourses; c++) if (needs[c] == 0) c];
    for (var i = 0; i < order.length; i++) {
      for (final next in unlocks[order[i]]) {
        if (--needs[next] == 0) order.add(next);
      }
    }
//@step
    return order.length == numCourses ? order : [];
  }
}`,
      typescript: `//@step
function findOrder(numCourses: number, prerequisites: number[][]): number[] {
  const unlocks: number[][] = Array.from({ length: numCourses }, () => []);
  const needs: number[] = new Array(numCourses).fill(0);
  for (const [course, pre] of prerequisites) {
    unlocks[pre].push(course);
    needs[course]++;
  }
//@step
  const order: number[] = [];
  for (let c = 0; c < numCourses; c++) if (needs[c] === 0) order.push(c);
  for (let i = 0; i < order.length; i++) {
    for (const next of unlocks[order[i]]) if (--needs[next] === 0) order.push(next);
  }
//@step
  return order.length === numCourses ? order : [];
}`
    },
    check: 'With 4 courses and [[1, 0], [2, 0], [3, 1], [3, 2]]: 0 is ready first, which unlocks 1 and 2, and after both, 3 is ready. Order [0, 1, 2, 3].',
    complexity: 'O(V + E) time and space.',
    tests: [
      { args: [2, [[1, 0]]], expected: [0, 1] },
      { args: [4, [[1, 0], [2, 0], [3, 1], [3, 2]]], expected: [0, 1, 2, 3] },
      { args: [2, [[0, 1], [1, 0]]], expected: [] }
    ]
  },
  {
    id: 'pacific-atlantic-water-flow',
    title: 'Pacific Atlantic Water Flow',
    level: 'medium',
    statement: 'Given an m x n matrix heights of an island, the Pacific touches the top and left edges and the Atlantic the bottom and right edges. Rain flows to a neighbour (up, down, left, right) of equal or lower height. ' +
      'Return the coordinates [r, c] of all cells from which water can reach both oceans, in any order. Example: heights = [[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]] returns [[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]].',
    signature: { dart: 'class Solution { List<List<int>> pacificAtlantic(List<List<int>> heights) }', typescript: 'function pacificAtlantic(heights: number[][]): number[][]' },
    fn: 'pacificAtlantic',
    compare: 'sorted',
    asks: 'Find every cell from which rain can flow downhill to both the Pacific side and the Atlantic side.',
    idea: 'Search backwards from each ocean: start from the cells touching it and move uphill to neighbours that are equal or higher. That marks every cell that can drain into that ocean. The answer is the cells marked by both searches.',
    where: { dart: 'the Solution class, replacing the pacificAtlantic method.', typescript: 'the pacificAtlantic function, replacing its body.' },
    steps: [
      { what: 'open the method with a reach grid per ocean and a search that climbs to equal or higher neighbours', say: 'Going uphill from the ocean is the reverse of water flowing down.' },
      { what: 'start the Pacific search from the top row and left column, and the Atlantic search from the bottom row and right column', say: 'Each search runs once over the grid.' },
      { what: 'collect cells reached by both and return them', say: 'Linear in the grid size.' }
    ],
    code: {
      dart: `//@step
class Solution {
  List<List<int>> pacificAtlantic(List<List<int>> heights) {
    final rows = heights.length;
    final cols = heights[0].length;
    List<List<bool>> grid() => List.generate(rows, (_) => List<bool>.filled(cols, false));
    final pacific = grid();
    final atlantic = grid();
    void climb(int r, int c, List<List<bool>> seen, int from) {
      if (r < 0 || c < 0 || r >= rows || c >= cols || seen[r][c] || heights[r][c] < from) return;
      seen[r][c] = true;
      climb(r + 1, c, seen, heights[r][c]);
      climb(r - 1, c, seen, heights[r][c]);
      climb(r, c + 1, seen, heights[r][c]);
      climb(r, c - 1, seen, heights[r][c]);
    }
//@step
    for (var r = 0; r < rows; r++) {
      climb(r, 0, pacific, 0);
      climb(r, cols - 1, atlantic, 0);
    }
    for (var c = 0; c < cols; c++) {
      climb(0, c, pacific, 0);
      climb(rows - 1, c, atlantic, 0);
    }
//@step
    final result = <List<int>>[];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (pacific[r][c] && atlantic[r][c]) result.add([r, c]);
      }
    }
    return result;
  }
}`,
      typescript: `//@step
function pacificAtlantic(heights: number[][]): number[][] {
  const rows = heights.length;
  const cols = heights[0].length;
  const grid = () => Array.from({ length: rows }, () => new Array<boolean>(cols).fill(false));
  const pacific = grid();
  const atlantic = grid();
  const climb = (r: number, c: number, seen: boolean[][], from: number): void => {
    if (r < 0 || c < 0 || r >= rows || c >= cols || seen[r][c] || heights[r][c] < from) return;
    seen[r][c] = true;
    climb(r + 1, c, seen, heights[r][c]);
    climb(r - 1, c, seen, heights[r][c]);
    climb(r, c + 1, seen, heights[r][c]);
    climb(r, c - 1, seen, heights[r][c]);
  };
//@step
  for (let r = 0; r < rows; r++) {
    climb(r, 0, pacific, 0);
    climb(r, cols - 1, atlantic, 0);
  }
  for (let c = 0; c < cols; c++) {
    climb(0, c, pacific, 0);
    climb(rows - 1, c, atlantic, 0);
  }
//@step
  const result: number[][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) if (pacific[r][c] && atlantic[r][c]) result.push([r, c]);
  }
  return result;
}`
    },
    check: 'The top-right cell, height 5, touches both oceans directly. The cell at row 2, column 2, height 5, can flow left and up to the Pacific and right and down to the Atlantic, so it is included. Seven cells in all.',
    complexity: 'O(m times n) time and space.',
    tests: [
      { args: [[[1, 2, 2, 3, 5], [3, 2, 3, 4, 4], [2, 4, 5, 3, 1], [6, 7, 1, 4, 5], [5, 1, 1, 2, 4]]], expected: [[0, 4], [1, 3], [1, 4], [2, 2], [3, 0], [3, 1], [4, 0]] },
      { args: [[[1]]], expected: [[0, 0]] }
    ]
  },
  {
    id: 'number-of-connected-components',
    title: 'Number of Connected Components in an Undirected Graph',
    level: 'medium',
    statement: 'Given n nodes labelled 0 to n - 1 and a list of undirected edges, return the number of connected components in the graph. ' +
      'Example: n = 5, edges = [[0,1],[1,2],[3,4]] returns 2. Example: n = 5, edges = [[0,1],[1,2],[2,3],[3,4]] returns 1.',
    signature: { dart: 'class Solution { int countComponents(int n, List<List<int>> edges) }', typescript: 'function countComponents(n: number, edges: number[][]): number' },
    fn: 'countComponents',
    asks: 'Count how many separate groups of connected nodes there are.',
    idea: 'Union find: start with every node as its own group. For each edge, join the two groups if they are different, and each successful join reduces the count by one. ' +
      'Path compression keeps the find operation nearly constant time.',
    where: { dart: 'the Solution class, replacing the countComponents method.', typescript: 'the countComponents function, replacing its body.' },
    steps: [
      { what: 'open the method with a parent per node and a find function with path compression', say: 'find returns the group leader for a node.' },
      { what: 'for each edge, find both leaders and join them if they differ, lowering the count', say: 'An edge inside one group changes nothing.' },
      { what: 'return the count', say: 'Nearly linear time.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int countComponents(int n, List<List<int>> edges) {
    final parent = List<int>.generate(n, (i) => i);
    int find(int x) {
      while (parent[x] != x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
      }
      return x;
    }
//@step
    var components = n;
    for (final e in edges) {
      final a = find(e[0]);
      final b = find(e[1]);
      if (a != b) {
        parent[a] = b;
        components--;
      }
    }
//@step
    return components;
  }
}`,
      typescript: `//@step
function countComponents(n: number, edges: number[][]): number {
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
//@step
  let components = n;
  for (const [u, v] of edges) {
    const a = find(u);
    const b = find(v);
    if (a !== b) {
      parent[a] = b;
      components--;
    }
  }
//@step
  return components;
}`
    },
    check: 'With 5 nodes and edges 0-1, 1-2, 3-4: three joins succeed, so 5 minus 3 leaves 2 components: {0, 1, 2} and {3, 4}.',
    complexity: 'O(E times alpha(n)) time, nearly linear. O(n) space.',
    tests: [
      { args: [5, [[0, 1], [1, 2], [3, 4]]], expected: 2 },
      { args: [5, [[0, 1], [1, 2], [2, 3], [3, 4]]], expected: 1 },
      { args: [3, []], expected: 3 }
    ]
  },
  {
    id: 'graph-valid-tree',
    title: 'Graph Valid Tree',
    level: 'medium',
    statement: 'Given n nodes labelled 0 to n - 1 and a list of undirected edges, return true if the edges form a valid tree: connected and with no cycles. ' +
      'Example: n = 5, edges = [[0,1],[0,2],[0,3],[1,4]] returns true. Example: n = 5, edges = [[0,1],[1,2],[2,3],[1,3],[1,4]] returns false.',
    signature: { dart: 'class Solution { bool validTree(int n, List<List<int>> edges) }', typescript: 'function validTree(n: number, edges: number[][]): boolean' },
    fn: 'validTree',
    asks: 'Check that the edges connect all nodes with no loops.',
    idea: 'A tree with n nodes has exactly n - 1 edges. With that count, it is a tree exactly when there is no cycle, which union find detects: an edge whose two ends are already in the same group closes a loop.',
    where: { dart: 'the Solution class, replacing the validTree method.', typescript: 'the validTree function, replacing its body.' },
    steps: [
      { what: 'open the method and return false unless there are exactly n minus 1 edges', say: 'Fewer edges means disconnected, more means a cycle.' },
      { what: 'join the ends of each edge, returning false if they are already in the same group', say: 'Joining two nodes already connected would make a loop.' },
      { what: 'return true', say: 'Nearly linear time.' }
    ],
    code: {
      dart: `//@step
class Solution {
  bool validTree(int n, List<List<int>> edges) {
    if (edges.length != n - 1) return false;
    final parent = List<int>.generate(n, (i) => i);
    int find(int x) {
      while (parent[x] != x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
      }
      return x;
    }
//@step
    for (final e in edges) {
      final a = find(e[0]);
      final b = find(e[1]);
      if (a == b) return false;
      parent[a] = b;
    }
//@step
    return true;
  }
}`,
      typescript: `//@step
function validTree(n: number, edges: number[][]): boolean {
  if (edges.length !== n - 1) return false;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
//@step
  for (const [u, v] of edges) {
    const a = find(u);
    const b = find(v);
    if (a === b) return false;
    parent[a] = b;
  }
//@step
  return true;
}`
    },
    check: 'With 5 nodes and [[0, 1], [1, 2], [2, 3], [1, 3], [1, 4]]: there are 5 edges, not 4, so it cannot be a tree. Answer false.',
    complexity: 'O(n times alpha(n)) time. O(n) space.',
    tests: [
      { args: [5, [[0, 1], [0, 2], [0, 3], [1, 4]]], expected: true },
      { args: [5, [[0, 1], [1, 2], [2, 3], [1, 3], [1, 4]]], expected: false },
      { args: [4, [[0, 1], [2, 3], [1, 0]]], expected: false }
    ]
  },
  {
    id: 'redundant-connection',
    title: 'Redundant Connection',
    level: 'medium',
    statement: 'A tree with n nodes labelled 1 to n had one extra edge added, creating exactly one cycle. Given the edges in order, return the edge that can be removed to leave a tree; if there are several answers, return the one that appears last. ' +
      'Example: edges = [[1,2],[1,3],[2,3]] returns [2,3]. Example: edges = [[1,2],[2,3],[3,4],[1,4],[1,5]] returns [1,4].',
    signature: { dart: 'class Solution { List<int> findRedundantConnection(List<List<int>> edges) }', typescript: 'function findRedundantConnection(edges: number[][]): number[]' },
    fn: 'findRedundantConnection',
    asks: 'Find the one extra edge that created a loop.',
    idea: 'Add the edges one by one with union find. The first edge whose two ends are already connected is the one that closes the cycle, and with a single cycle it is also the last such edge in the list.',
    where: { dart: 'the Solution class, replacing the findRedundantConnection method.', typescript: 'the findRedundantConnection function, replacing its body.' },
    steps: [
      { what: 'open the method with a parent per node and a find function', say: 'Nodes are labelled from 1, so the array has one extra slot.' },
      { what: 'for each edge, return it if both ends already share a group, else join them', say: 'That edge is the one that makes the loop.' },
      { what: 'return an empty list as a fallback', say: 'Nearly linear time.' }
    ],
    code: {
      dart: `//@step
class Solution {
  List<int> findRedundantConnection(List<List<int>> edges) {
    final parent = List<int>.generate(edges.length + 1, (i) => i);
    int find(int x) {
      while (parent[x] != x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
      }
      return x;
    }
//@step
    for (final e in edges) {
      final a = find(e[0]);
      final b = find(e[1]);
      if (a == b) return e;
      parent[a] = b;
    }
//@step
    return [];
  }
}`,
      typescript: `//@step
function findRedundantConnection(edges: number[][]): number[] {
  const parent = Array.from({ length: edges.length + 1 }, (_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
//@step
  for (const e of edges) {
    const a = find(e[0]);
    const b = find(e[1]);
    if (a === b) return e;
    parent[a] = b;
  }
//@step
  return [];
}`
    },
    check: 'With [[1, 2], [2, 3], [3, 4], [1, 4], [1, 5]]: after the first three edges, 1 to 4 are connected, so [1, 4] joins two nodes already in one group. Answer [1, 4].',
    complexity: 'O(n times alpha(n)) time. O(n) space.',
    tests: [
      { args: [[[1, 2], [1, 3], [2, 3]]], expected: [2, 3] },
      { args: [[[1, 2], [2, 3], [3, 4], [1, 4], [1, 5]]], expected: [1, 4] }
    ]
  },
  {
    id: 'word-ladder',
    title: 'Word Ladder',
    level: 'hard',
    statement: 'Given two words beginWord and endWord and a dictionary wordList, return the number of words in the shortest transformation sequence from beginWord to endWord, changing one letter at a time, where every intermediate word must be in wordList. ' +
      'Return 0 if there is none. Example: beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log","cog"] returns 5 (hit, hot, dot, dog, cog).',
    signature: { dart: 'class Solution { int ladderLength(String beginWord, String endWord, List<String> wordList) }', typescript: 'function ladderLength(beginWord: string, endWord: string, wordList: string[]): number' },
    fn: 'ladderLength',
    asks: 'Find the shortest chain of dictionary words from the start to the end word, changing one letter per step.',
    idea: 'Breadth-first search over words. From each word, try changing each position to every letter from a to z; any result in the dictionary that has not been visited is a neighbour. ' +
      'BFS finds the shortest chain; remove words from the set when visited so they are not revisited.',
    where: { dart: 'the Solution class, replacing the ladderLength method.', typescript: 'the ladderLength function, replacing its body.' },
    steps: [
      { what: 'open the method with the dictionary as a set, returning 0 if the end word is missing', say: 'A set makes "is this a word" constant time.' },
      { what: 'run BFS level by level, generating one-letter changes and queueing the ones in the set', say: 'Each level is one more step in the chain.' },
      { what: 'return the step count when the end word is reached, else 0', say: 'O(n times L times 26) time for n words of length L.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int ladderLength(String beginWord, String endWord, List<String> wordList) {
    final words = wordList.toSet();
    if (!words.contains(endWord)) return 0;
    var level = <String>[beginWord];
    var steps = 1;
//@step
    while (level.isNotEmpty) {
      final next = <String>[];
      for (final word in level) {
        if (word == endWord) return steps;
        for (var i = 0; i < word.length; i++) {
          for (var c = 97; c <= 122; c++) {
            final candidate = word.substring(0, i) + String.fromCharCode(c) + word.substring(i + 1);
            if (words.remove(candidate)) next.add(candidate);
          }
        }
      }
      level = next;
      steps++;
    }
//@step
    return 0;
  }
}`,
      typescript: `//@step
function ladderLength(beginWord: string, endWord: string, wordList: string[]): number {
  const words = new Set(wordList);
  if (!words.has(endWord)) return 0;
  let level: string[] = [beginWord];
  let steps = 1;
//@step
  while (level.length > 0) {
    const next: string[] = [];
    for (const word of level) {
      if (word === endWord) return steps;
      for (let i = 0; i < word.length; i++) {
        for (let c = 97; c <= 122; c++) {
          const candidate = word.slice(0, i) + String.fromCharCode(c) + word.slice(i + 1);
          if (words.delete(candidate)) next.push(candidate);
        }
      }
    }
    level = next;
    steps++;
  }
//@step
  return 0;
}`
    },
    check: 'From "hit", the only dictionary neighbour is "hot". From "hot": "dot" and "lot". From those: "dog" and "log". From "dog": "cog", reached at step 5.',
    complexity: 'O(n times L times 26) time, n words of length L. O(n) space.',
    tests: [
      { args: ['hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log', 'cog']], expected: 5 },
      { args: ['hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log']], expected: 0 }
    ]
  },
  {
    id: 'network-delay-time',
    title: 'Network Delay Time',
    level: 'medium',
    statement: 'You are given a network of n nodes labelled 1 to n and travel times times[i] = [u, v, w], a directed edge from u to v taking w time. A signal is sent from node k. ' +
      'Return the minimum time for all nodes to receive it, or -1 if some never do. Example: times = [[2,1,1],[2,3,1],[3,4,1]], n = 4, k = 2 returns 2.',
    signature: { dart: 'class Solution { int networkDelayTime(List<List<int>> times, int n, int k) }', typescript: 'function networkDelayTime(times: number[][], n: number, k: number): number' },
    fn: 'networkDelayTime',
    asks: 'Work out how long a signal takes to reach every node, following the fastest routes.',
    idea: 'Dijkstra\'s shortest paths from k. Repeatedly take the closest unvisited node and relax its outgoing edges. The answer is the largest shortest distance, or -1 if a node is unreachable. ' +
      'For clarity this picks the closest node by scanning, which is O(n squared), fine for small n; a heap makes it O(E log n).',
    where: { dart: 'the Solution class, replacing the networkDelayTime method.', typescript: 'the networkDelayTime function, replacing its body.' },
    steps: [
      { what: 'open the method, build the adjacency list and set every distance to infinity except k', say: 'Distances start unknown, except the source at zero.' },
      { what: 'repeatedly pick the closest unvisited node and relax its edges', say: 'The closest unvisited node already has its final shortest distance.' },
      { what: 'return the largest distance, or -1 if any node was never reached', say: 'Everyone has the signal once the slowest node does.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int networkDelayTime(List<List<int>> times, int n, int k) {
    const inf = 1 << 40;
    final adj = List.generate(n + 1, (_) => <List<int>>[]);
    for (final t in times) {
      adj[t[0]].add([t[1], t[2]]);
    }
    final dist = List<int>.filled(n + 1, inf);
    final done = List<bool>.filled(n + 1, false);
    dist[k] = 0;
//@step
    for (var round = 0; round < n; round++) {
      var u = -1;
      for (var v = 1; v <= n; v++) {
        if (!done[v] && (u == -1 || dist[v] < dist[u])) u = v;
      }
      if (dist[u] == inf) break;
      done[u] = true;
      for (final e in adj[u]) {
        if (dist[u] + e[1] < dist[e[0]]) dist[e[0]] = dist[u] + e[1];
      }
    }
//@step
    var worst = 0;
    for (var v = 1; v <= n; v++) {
      if (dist[v] == inf) return -1;
      if (dist[v] > worst) worst = dist[v];
    }
    return worst;
  }
}`,
      typescript: `//@step
function networkDelayTime(times: number[][], n: number, k: number): number {
  const adj: number[][][] = Array.from({ length: n + 1 }, () => []);
  for (const [u, v, w] of times) adj[u].push([v, w]);
  const dist: number[] = new Array(n + 1).fill(Infinity);
  const done: boolean[] = new Array(n + 1).fill(false);
  dist[k] = 0;
//@step
  for (let round = 0; round < n; round++) {
    let u = -1;
    for (let v = 1; v <= n; v++) if (!done[v] && (u === -1 || dist[v] < dist[u])) u = v;
    if (dist[u] === Infinity) break;
    done[u] = true;
    for (const [v, w] of adj[u]) if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;
  }
//@step
  let worst = 0;
  for (let v = 1; v <= n; v++) {
    if (dist[v] === Infinity) return -1;
    worst = Math.max(worst, dist[v]);
  }
  return worst;
}`
    },
    check: 'From node 2: nodes 1 and 3 are reached at time 1, then node 4 through 3 at time 2. The slowest node gets it at 2.',
    complexity: 'O(n squared + E) time with the scan, O(E log n) with a heap. O(n + E) space.',
    tests: [
      { args: [[[2, 1, 1], [2, 3, 1], [3, 4, 1]], 4, 2], expected: 2 },
      { args: [[[1, 2, 1]], 2, 1], expected: 1 },
      { args: [[[1, 2, 1]], 2, 2], expected: -1 }
    ]
  },
  {
    id: 'surrounded-regions',
    title: 'Surrounded Regions',
    level: 'medium',
    statement: 'Given an m x n board of "X" and "O", capture every region of "O" that is completely surrounded by "X" (not connected to the border) by flipping it to "X". Regions touching the border stay. ' +
      'The function returns the board here for checking. Example: board = [["X","X","X","X"],["X","O","O","X"],["X","X","O","X"],["X","O","X","X"]] becomes [["X","X","X","X"],["X","X","X","X"],["X","X","X","X"],["X","O","X","X"]].',
    signature: { dart: 'class Solution { List<List<String>> solve(List<List<String>> board) }', typescript: 'function solve(board: string[][]): string[][]' },
    fn: 'solve',
    asks: 'Turn every group of O that cannot reach the edge into X.',
    idea: 'Think in reverse: an O survives only if it connects to the border. Flood from every border O and mark its region as safe. Then flip all remaining O to X and turn the safe marks back into O.',
    where: { dart: 'the Solution class, replacing the solve method.', typescript: 'the solve function, replacing its body.' },
    steps: [
      { what: 'open the method with a flood that marks connected O cells as safe', say: 'Anything connected to the edge cannot be captured.' },
      { what: 'flood from every O on the border', say: 'Only border regions need checking.' },
      { what: 'flip unmarked O to X and marked cells back to O, then return the board', say: 'Linear in the board size.' }
    ],
    code: {
      dart: `//@step
class Solution {
  List<List<String>> solve(List<List<String>> board) {
    final rows = board.length;
    final cols = board[0].length;
    void mark(int r, int c) {
      if (r < 0 || c < 0 || r >= rows || c >= cols || board[r][c] != 'O') return;
      board[r][c] = 'S';
      mark(r + 1, c);
      mark(r - 1, c);
      mark(r, c + 1);
      mark(r, c - 1);
    }
//@step
    for (var r = 0; r < rows; r++) {
      mark(r, 0);
      mark(r, cols - 1);
    }
    for (var c = 0; c < cols; c++) {
      mark(0, c);
      mark(rows - 1, c);
    }
//@step
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        board[r][c] = board[r][c] == 'S' ? 'O' : 'X';
      }
    }
    return board;
  }
}`,
      typescript: `//@step
function solve(board: string[][]): string[][] {
  const rows = board.length;
  const cols = board[0].length;
  const mark = (r: number, c: number): void => {
    if (r < 0 || c < 0 || r >= rows || c >= cols || board[r][c] !== 'O') return;
    board[r][c] = 'S';
    mark(r + 1, c);
    mark(r - 1, c);
    mark(r, c + 1);
    mark(r, c - 1);
  };
//@step
  for (let r = 0; r < rows; r++) {
    mark(r, 0);
    mark(r, cols - 1);
  }
  for (let c = 0; c < cols; c++) {
    mark(0, c);
    mark(rows - 1, c);
  }
//@step
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) board[r][c] = board[r][c] === 'S' ? 'O' : 'X';
  }
  return board;
}`
    },
    check: 'In the example, the O at the bottom edge is marked safe. The three O cells in the middle never connect to the edge, so they become X.',
    complexity: 'O(m times n) time and worst-case recursion depth.',
    tests: [
      { args: [[['X', 'X', 'X', 'X'], ['X', 'O', 'O', 'X'], ['X', 'X', 'O', 'X'], ['X', 'O', 'X', 'X']]], expected: [['X', 'X', 'X', 'X'], ['X', 'X', 'X', 'X'], ['X', 'X', 'X', 'X'], ['X', 'O', 'X', 'X']] },
      { args: [[['X']]], expected: [['X']] }
    ]
  }
];
