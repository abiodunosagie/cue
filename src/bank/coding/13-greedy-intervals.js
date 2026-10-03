// Greedy choices and interval problems.
function problem(id, title, level, statement, sig, fn, asks, idea, steps, code, check, complexity, tests, extra = {}) {
  return {
    id, title, level, statement, signature: sig, fn, asks, idea,
    where: { dart: 'the Solution class, replacing the ' + fn + ' method.', typescript: 'the ' + fn + ' function, replacing its body.' },
    steps, code, check, complexity, tests, ...extra
  };
}

module.exports = [
  problem('jump-game', 'Jump Game', 'medium',
    'Given an integer array nums where you start at index 0 and nums[i] is the maximum jump length from index i, return true if you can reach the last index. Example: nums = [2,3,1,1,4] returns true. Example: nums = [3,2,1,0,4] returns false.',
    { dart: 'class Solution { bool canJump(List<int> nums) }', typescript: 'function canJump(nums: number[]): boolean' },
    'canJump',
    'Check whether you can hop from the first position to the last, where each number says how far you may jump from there.',
    'Track the furthest index reachable so far. Walk forward; if the current index is beyond that reach, you are stuck. Otherwise extend the reach with i plus nums[i].',
    [
      { what: 'open the method with the furthest reachable index at 0', say: 'I only need the furthest point I can get to.' },
      { what: 'for each index, return false if it is beyond reach, else extend the reach', say: 'If I cannot even stand here, I cannot go further.' },
      { what: 'return true after the loop', say: 'Linear time, constant space.' }
    ],
    {
      dart: `//@step
class Solution {
  bool canJump(List<int> nums) {
    var reach = 0;
//@step
    for (var i = 0; i < nums.length; i++) {
      if (i > reach) return false;
      if (i + nums[i] > reach) reach = i + nums[i];
    }
//@step
    return true;
  }
}`,
      typescript: `//@step
function canJump(nums: number[]): boolean {
  let reach = 0;
//@step
  for (let i = 0; i < nums.length; i++) {
    if (i > reach) return false;
    reach = Math.max(reach, i + nums[i]);
  }
//@step
  return true;
}`
    },
    'With [3, 2, 1, 0, 4]: the reach becomes 3 at index 0 and stays 3 through index 3, where the jump is 0. Index 4 is beyond reach, so false.',
    'O(n) time. O(1) space.',
    [{ args: [[2, 3, 1, 1, 4]], expected: true }, { args: [[3, 2, 1, 0, 4]], expected: false }, { args: [[0]], expected: true }]),
  problem('jump-game-ii', 'Jump Game II', 'medium',
    'Given an array nums where nums[i] is the maximum jump length from index i, and the last index is always reachable, return the minimum number of jumps to reach it. Example: nums = [2,3,1,1,4] returns 2. Example: nums = [2,3,0,1,4] returns 2.',
    { dart: 'class Solution { int jump(List<int> nums) }', typescript: 'function jump(nums: number[]): number' },
    'jump',
    'Find the fewest jumps from the first position to the last.',
    'Think in layers, like breadth-first search: the current jump covers a range of indexes, and while scanning that range we find the furthest the next jump can reach. When we reach the end of the current range, take a jump and move to the next range.',
    [
      { what: 'open the method with the jump count, the end of the current range and the furthest reach', say: 'Each range is everything one more jump can land on.' },
      { what: 'scan indexes before the last, extending the furthest reach, and count a jump when the current range ends', say: 'Jumping only when forced gives the minimum.' },
      { what: 'return the jump count', say: 'Linear time.' }
    ],
    {
      dart: `//@step
class Solution {
  int jump(List<int> nums) {
    var jumps = 0;
    var end = 0;
    var furthest = 0;
//@step
    for (var i = 0; i < nums.length - 1; i++) {
      if (i + nums[i] > furthest) furthest = i + nums[i];
      if (i == end) {
        jumps++;
        end = furthest;
      }
    }
//@step
    return jumps;
  }
}`,
      typescript: `//@step
function jump(nums: number[]): number {
  let jumps = 0;
  let end = 0;
  let furthest = 0;
//@step
  for (let i = 0; i < nums.length - 1; i++) {
    furthest = Math.max(furthest, i + nums[i]);
    if (i === end) {
      jumps++;
      end = furthest;
    }
  }
//@step
  return jumps;
}`
    },
    'With [2, 3, 1, 1, 4]: from index 0 the first jump covers up to index 2, and scanning that range finds a reach of 4 from index 1. The second jump reaches the end. Answer 2.',
    'O(n) time. O(1) space.',
    [{ args: [[2, 3, 1, 1, 4]], expected: 2 }, { args: [[2, 3, 0, 1, 4]], expected: 2 }, { args: [[0]], expected: 0 }]),
  problem('gas-station', 'Gas Station', 'medium',
    'There are n gas stations in a circle; station i has gas[i] fuel and getting to the next costs cost[i]. Starting with an empty tank, return the index of the station from which you can drive around once, or -1. The answer is unique if it exists. ' +
      'Example: gas = [1,2,3,4,5], cost = [3,4,5,1,2] returns 3. Example: gas = [2,3,4], cost = [3,4,3] returns -1.',
    { dart: 'class Solution { int canCompleteCircuit(List<int> gas, List<int> cost) }', typescript: 'function canCompleteCircuit(gas: number[], cost: number[]): number' },
    'canCompleteCircuit',
    'Find the station to start at so you can drive all the way round without running out of fuel.',
    'If total gas is less than total cost, no start works. Otherwise, drive from station 0 keeping a tank; whenever the tank goes negative, no station from the current start up to here can work, so the next station becomes the start and the tank resets.',
    [
      { what: 'open the method with the total balance, the tank and the start', say: 'The total tells me whether any answer exists.' },
      { what: 'add each station\'s gas minus cost; if the tank drops below zero, start again from the next station', say: 'Running dry means every start up to here fails.' },
      { what: 'return the start if the total is not negative, else -1', say: 'One pass, linear time.' }
    ],
    {
      dart: `//@step
class Solution {
  int canCompleteCircuit(List<int> gas, List<int> cost) {
    var total = 0;
    var tank = 0;
    var start = 0;
//@step
    for (var i = 0; i < gas.length; i++) {
      total += gas[i] - cost[i];
      tank += gas[i] - cost[i];
      if (tank < 0) {
        start = i + 1;
        tank = 0;
      }
    }
//@step
    return total < 0 ? -1 : start;
  }
}`,
      typescript: `//@step
function canCompleteCircuit(gas: number[], cost: number[]): number {
  let total = 0;
  let tank = 0;
  let start = 0;
//@step
  for (let i = 0; i < gas.length; i++) {
    total += gas[i] - cost[i];
    tank += gas[i] - cost[i];
    if (tank < 0) {
      start = i + 1;
      tank = 0;
    }
  }
//@step
  return total < 0 ? -1 : start;
}`
    },
    'With gas [1, 2, 3, 4, 5] and cost [3, 4, 5, 1, 2]: the tank goes negative at stations 0, 1 and 2, so the start moves to 3. From 3 the tank stays positive, and the total is 0, so the answer is 3.',
    'O(n) time. O(1) space.',
    [{ args: [[1, 2, 3, 4, 5], [3, 4, 5, 1, 2]], expected: 3 }, { args: [[2, 3, 4], [3, 4, 3]], expected: -1 }]),
  problem('merge-intervals', 'Merge Intervals', 'medium',
    'Given an array of intervals [start, end], merge all overlapping intervals and return the non-overlapping intervals that cover all of them. Example: intervals = [[1,3],[2,6],[8,10],[15,18]] returns [[1,6],[8,10],[15,18]]. Example: [[1,4],[4,5]] returns [[1,5]].',
    { dart: 'class Solution { List<List<int>> merge(List<List<int>> intervals) }', typescript: 'function merge(intervals: number[][]): number[][]' },
    'merge',
    'Combine every pair of ranges that overlap: [1, 3] and [2, 6] become [1, 6].',
    'Sort by start. Then walk the intervals: if the next one starts no later than the end of the last merged interval, extend that end; otherwise start a new merged interval.',
    [
      { what: 'open the method and sort a copy of the intervals by start', say: 'After sorting, overlapping intervals are next to each other.' },
      { what: 'for each interval, extend the last merged one if they overlap, else add it as new', say: 'Touching ends count as overlapping.' },
      { what: 'return the merged list', say: 'n log n for the sort.' }
    ],
    {
      dart: `//@step
class Solution {
  List<List<int>> merge(List<List<int>> intervals) {
    final sorted = [...intervals]..sort((a, b) => a[0].compareTo(b[0]));
    final merged = <List<int>>[];
//@step
    for (final iv in sorted) {
      if (merged.isNotEmpty && iv[0] <= merged.last[1]) {
        if (iv[1] > merged.last[1]) merged.last[1] = iv[1];
      } else {
        merged.add([iv[0], iv[1]]);
      }
    }
//@step
    return merged;
  }
}`,
      typescript: `//@step
function merge(intervals: number[][]): number[][] {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged: number[][] = [];
//@step
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
//@step
  return merged;
}`
    },
    'With [[1, 3], [2, 6], [8, 10], [15, 18]]: [2, 6] overlaps [1, 3], making [1, 6]; [8, 10] and [15, 18] start after the previous end, so they stay separate.',
    'O(n log n) time. O(n) space for the result.',
    [{ args: [[[1, 3], [2, 6], [8, 10], [15, 18]]], expected: [[1, 6], [8, 10], [15, 18]] }, { args: [[[1, 4], [4, 5]]], expected: [[1, 5]] }, { args: [[[1, 4], [0, 4]]], expected: [[0, 4]] }]),
  problem('insert-interval', 'Insert Interval', 'medium',
    'Given a sorted list of non-overlapping intervals and a new interval, insert it and merge where needed, returning the sorted, non-overlapping result. Example: intervals = [[1,3],[6,9]], newInterval = [2,5] returns [[1,5],[6,9]]. ' +
      'Example: intervals = [[1,2],[3,5],[6,7],[8,10],[12,16]], newInterval = [4,8] returns [[1,2],[3,10],[12,16]].',
    { dart: 'class Solution { List<List<int>> insert(List<List<int>> intervals, List<int> newInterval) }', typescript: 'function insert(intervals: number[][], newInterval: number[]): number[][]' },
    'insert',
    'Add a new range to a sorted list of ranges, merging it with any it overlaps.',
    'Three phases: copy intervals that end before the new one starts; merge every interval that overlaps the new one into it by widening its start and end; then copy the rest.',
    [
      { what: 'open the method and copy intervals that end before the new one starts', say: 'Those cannot touch it.' },
      { what: 'widen the new interval with every interval that overlaps it, then add it', say: 'Overlapping means starting no later than the new interval ends.' },
      { what: 'copy the remaining intervals and return the result', say: 'Linear time, one pass.' }
    ],
    {
      dart: `//@step
class Solution {
  List<List<int>> insert(List<List<int>> intervals, List<int> newInterval) {
    final result = <List<int>>[];
    var i = 0;
    var start = newInterval[0];
    var end = newInterval[1];
    while (i < intervals.length && intervals[i][1] < start) {
      result.add(intervals[i++]);
    }
//@step
    while (i < intervals.length && intervals[i][0] <= end) {
      if (intervals[i][0] < start) start = intervals[i][0];
      if (intervals[i][1] > end) end = intervals[i][1];
      i++;
    }
    result.add([start, end]);
//@step
    while (i < intervals.length) {
      result.add(intervals[i++]);
    }
    return result;
  }
}`,
      typescript: `//@step
function insert(intervals: number[][], newInterval: number[]): number[][] {
  const result: number[][] = [];
  let i = 0;
  let [start, end] = newInterval;
  while (i < intervals.length && intervals[i][1] < start) result.push(intervals[i++]);
//@step
  while (i < intervals.length && intervals[i][0] <= end) {
    start = Math.min(start, intervals[i][0]);
    end = Math.max(end, intervals[i][1]);
    i++;
  }
  result.push([start, end]);
//@step
  while (i < intervals.length) result.push(intervals[i++]);
  return result;
}`
    },
    'With [[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]] and [4, 8]: [1, 2] is copied; [3, 5], [6, 7] and [8, 10] overlap and widen the new interval to [3, 10]; [12, 16] is copied.',
    'O(n) time. O(n) space for the result.',
    [{ args: [[[1, 3], [6, 9]], [2, 5]], expected: [[1, 5], [6, 9]] }, { args: [[[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]], [4, 8]], expected: [[1, 2], [3, 10], [12, 16]] }, { args: [[], [5, 7]], expected: [[5, 7]] }]),
  problem('non-overlapping-intervals', 'Non-overlapping Intervals', 'medium',
    'Given an array of intervals, return the minimum number of intervals to remove so the rest do not overlap. Intervals that only touch at an end do not overlap. Example: intervals = [[1,2],[2,3],[3,4],[1,3]] returns 1. Example: [[1,2],[1,2],[1,2]] returns 2.',
    { dart: 'class Solution { int eraseOverlapIntervals(List<List<int>> intervals) }', typescript: 'function eraseOverlapIntervals(intervals: number[][]): number' },
    'eraseOverlapIntervals',
    'Remove as few ranges as possible so no two remaining ranges overlap.',
    'Greedy: sort by end. Keep an interval whenever it starts at or after the end of the last kept one; otherwise remove it. Keeping the interval that ends earliest leaves the most room for the rest.',
    [
      { what: 'open the method and sort a copy of the intervals by end', say: 'Finishing early leaves the most space for others.' },
      { what: 'walk the intervals, keeping those that start after the last kept end and counting the others as removed', say: 'Each overlap costs one removal.' },
      { what: 'return the number removed', say: 'n log n for the sort.' }
    ],
    {
      dart: `//@step
class Solution {
  int eraseOverlapIntervals(List<List<int>> intervals) {
    final sorted = [...intervals]..sort((a, b) => a[1].compareTo(b[1]));
    var removed = 0;
    var lastEnd = -(1 << 62);
//@step
    for (final iv in sorted) {
      if (iv[0] >= lastEnd) {
        lastEnd = iv[1];
      } else {
        removed++;
      }
    }
//@step
    return removed;
  }
}`,
      typescript: `//@step
function eraseOverlapIntervals(intervals: number[][]): number {
  const sorted = [...intervals].sort((a, b) => a[1] - b[1]);
  let removed = 0;
  let lastEnd = -Infinity;
//@step
  for (const [start, end] of sorted) {
    if (start >= lastEnd) lastEnd = end;
    else removed++;
  }
//@step
  return removed;
}`
    },
    'With [[1, 2], [2, 3], [3, 4], [1, 3]] sorted by end: keep [1, 2], keep [2, 3], remove [1, 3] since it starts before 3, keep [3, 4]. One removal.',
    'O(n log n) time. O(n) space for the sorted copy.',
    [{ args: [[[1, 2], [2, 3], [3, 4], [1, 3]]], expected: 1 }, { args: [[[1, 2], [1, 2], [1, 2]]], expected: 2 }, { args: [[[1, 2], [2, 3]]], expected: 0 }]),
  problem('meeting-rooms-ii', 'Meeting Rooms II', 'medium',
    'Given an array of meeting time intervals [start, end], return the minimum number of conference rooms required. A meeting ending at time t frees its room for one starting at t. Example: intervals = [[0,30],[5,10],[15,20]] returns 2. Example: [[7,10],[2,4]] returns 1.',
    { dart: 'class Solution { int minMeetingRooms(List<List<int>> intervals) }', typescript: 'function minMeetingRooms(intervals: number[][]): number' },
    'minMeetingRooms',
    'Work out how many rooms are needed so no two meetings that overlap share a room.',
    'Sort the start times and the end times separately. Walk through the starts: if a meeting starts before the earliest unfinished meeting ends, we need another room; otherwise a room has been freed, so move the end pointer forward. The peak count is the answer.',
    [
      { what: 'open the method with sorted start times and sorted end times', say: 'Only the order of events matters, not which meeting is which.' },
      { what: 'for each start, reuse a room if the earliest end has passed, else open a new room', say: 'A room frees up the moment a meeting ends.' },
      { what: 'return the number of rooms opened', say: 'n log n for the sorting.' }
    ],
    {
      dart: `//@step
class Solution {
  int minMeetingRooms(List<List<int>> intervals) {
    final starts = intervals.map((iv) => iv[0]).toList()..sort();
    final ends = intervals.map((iv) => iv[1]).toList()..sort();
    var rooms = 0;
    var e = 0;
//@step
    for (final s in starts) {
      if (s < ends[e]) {
        rooms++;
      } else {
        e++;
      }
    }
//@step
    return rooms;
  }
}`,
      typescript: `//@step
function minMeetingRooms(intervals: number[][]): number {
  const starts = intervals.map((iv) => iv[0]).sort((a, b) => a - b);
  const ends = intervals.map((iv) => iv[1]).sort((a, b) => a - b);
  let rooms = 0;
  let e = 0;
//@step
  for (const s of starts) {
    if (s < ends[e]) rooms++;
    else e++;
  }
//@step
  return rooms;
}`
    },
    'With [[0, 30], [5, 10], [15, 20]]: starts are 0, 5, 15 and ends 10, 20, 30. 0 opens a room, 5 is before 10 so opens a second, 15 is after 10 so reuses one. Answer 2.',
    'O(n log n) time. O(n) space.',
    [{ args: [[[0, 30], [5, 10], [15, 20]]], expected: 2 }, { args: [[[7, 10], [2, 4]]], expected: 1 }, { args: [[[1, 5], [5, 10]]], expected: 1 }]),
  problem('partition-labels', 'Partition Labels', 'medium',
    'Given a string s, partition it into as many parts as possible so each letter appears in at most one part, and return the sizes of the parts in order. Example: s = "ababcbacadefegdehijhklij" returns [9,7,8]. Example: s = "eccbbbbdec" returns [10].',
    { dart: 'class Solution { List<int> partitionLabels(String s) }', typescript: 'function partitionLabels(s: string): number[]' },
    'partitionLabels',
    'Cut the string into as many pieces as possible so no letter appears in two pieces.',
    'Record the last position of each letter. Walk the string extending the current part\'s end to the last position of every letter seen; when the index reaches that end, the part can be closed.',
    [
      { what: 'open the method and record the last index of every letter', say: 'A part must reach at least the last copy of each letter in it.' },
      { what: 'walk the string, extending the end of the current part, and close it when the index reaches the end', say: 'Closing as early as possible gives the most parts.' },
      { what: 'return the part sizes', say: 'Linear time.' }
    ],
    {
      dart: `//@step
class Solution {
  List<int> partitionLabels(String s) {
    final last = <String, int>{};
    for (var i = 0; i < s.length; i++) {
      last[s[i]] = i;
    }
    final sizes = <int>[];
    var start = 0;
    var end = 0;
//@step
    for (var i = 0; i < s.length; i++) {
      if (last[s[i]]! > end) end = last[s[i]]!;
      if (i == end) {
        sizes.add(end - start + 1);
        start = i + 1;
      }
    }
//@step
    return sizes;
  }
}`,
      typescript: `//@step
function partitionLabels(s: string): number[] {
  const last = new Map<string, number>();
  for (let i = 0; i < s.length; i++) last.set(s[i], i);
  const sizes: number[] = [];
  let start = 0;
  let end = 0;
//@step
  for (let i = 0; i < s.length; i++) {
    end = Math.max(end, last.get(s[i]) as number);
    if (i === end) {
      sizes.push(end - start + 1);
      start = i + 1;
    }
  }
//@step
  return sizes;
}`
    },
    'With "ababcbacadefegdehijhklij": the first part must reach the last a at index 8, so its size is 9. The next ends at index 15, size 7, and the last at index 23, size 8.',
    'O(n) time. O(1) space for 26 letters.',
    [{ args: ['ababcbacadefegdehijhklij'], expected: [9, 7, 8] }, { args: ['eccbbbbdec'], expected: [10] }]),
  problem('minimum-arrows-burst-balloons', 'Minimum Number of Arrows to Burst Balloons', 'medium',
    'Balloons are given as horizontal ranges [xstart, xend]. An arrow shot straight up at x bursts every balloon with xstart <= x <= xend. Return the minimum number of arrows to burst all balloons. ' +
      'Example: points = [[10,16],[2,8],[1,6],[7,12]] returns 2. Example: points = [[1,2],[3,4],[5,6],[7,8]] returns 4.',
    { dart: 'class Solution { int findMinArrowShots(List<List<int>> points) }', typescript: 'function findMinArrowShots(points: number[][]): number' },
    'findMinArrowShots',
    'Find the fewest vertical arrows that burst every balloon, where an arrow bursts every balloon its line passes through.',
    'Sort balloons by their end. Shoot the first arrow at the end of the first balloon; it bursts every balloon that starts at or before that point. The first balloon that starts after it needs a new arrow at its own end.',
    [
      { what: 'open the method and sort a copy of the balloons by end', say: 'Shooting at the earliest end covers as many as possible.' },
      { what: 'walk the balloons, adding an arrow at a balloon\'s end whenever it starts after the last arrow', say: 'Balloons the last arrow passes through need nothing more.' },
      { what: 'return the arrow count', say: 'n log n for the sort.' }
    ],
    {
      dart: `//@step
class Solution {
  int findMinArrowShots(List<List<int>> points) {
    final sorted = [...points]..sort((a, b) => a[1].compareTo(b[1]));
    var arrows = 0;
    var arrowAt = 0;
//@step
    for (final p in sorted) {
      if (arrows == 0 || p[0] > arrowAt) {
        arrows++;
        arrowAt = p[1];
      }
    }
//@step
    return arrows;
  }
}`,
      typescript: `//@step
function findMinArrowShots(points: number[][]): number {
  const sorted = [...points].sort((a, b) => a[1] - b[1]);
  let arrows = 0;
  let arrowAt = 0;
//@step
  for (const [start, end] of sorted) {
    if (arrows === 0 || start > arrowAt) {
      arrows++;
      arrowAt = end;
    }
  }
//@step
  return arrows;
}`
    },
    'With [[10, 16], [2, 8], [1, 6], [7, 12]] sorted by end: an arrow at 6 bursts [1, 6] and [2, 8]. [7, 12] starts after 6, so a second arrow at 12 also bursts [10, 16]. Answer 2.',
    'O(n log n) time. O(n) space for the sorted copy.',
    [{ args: [[[10, 16], [2, 8], [1, 6], [7, 12]]], expected: 2 }, { args: [[[1, 2], [3, 4], [5, 6], [7, 8]]], expected: 4 }, { args: [[[1, 2], [2, 3], [3, 4], [4, 5]]], expected: 2 }]),
  problem('candy', 'Candy', 'hard',
    'Children stand in a line with ratings. Each child gets at least one candy, and a child with a higher rating than a neighbour gets more candies than that neighbour. Return the minimum total candies. ' +
      'Example: ratings = [1,0,2] returns 5. Example: ratings = [1,2,2] returns 4.',
    { dart: 'class Solution { int candy(List<int> ratings) }', typescript: 'function candy(ratings: number[]): number' },
    'candy',
    'Hand out the fewest candies so every child gets one and anyone rated higher than a neighbour gets more than that neighbour.',
    'Two passes. Left to right, a child rated higher than the left neighbour gets one more than that neighbour. Right to left, a child rated higher than the right neighbour gets at least one more than that neighbour. Both rules then hold, using the minimum.',
    [
      { what: 'open the method with one candy per child', say: 'Everyone starts with the minimum.' },
      { what: 'left to right, give one more than the left neighbour when rated higher', say: 'This satisfies every left-neighbour rule.' },
      { what: 'right to left, raise to one more than the right neighbour when rated higher, then sum', say: 'Taking the larger value keeps the first pass\'s rule too.' }
    ],
    {
      dart: `//@step
class Solution {
  int candy(List<int> ratings) {
    final n = ratings.length;
    final candies = List<int>.filled(n, 1);
//@step
    for (var i = 1; i < n; i++) {
      if (ratings[i] > ratings[i - 1]) candies[i] = candies[i - 1] + 1;
    }
//@step
    for (var i = n - 2; i >= 0; i--) {
      if (ratings[i] > ratings[i + 1] && candies[i] <= candies[i + 1]) candies[i] = candies[i + 1] + 1;
    }
    return candies.fold(0, (a, b) => a + b);
  }
}`,
      typescript: `//@step
function candy(ratings: number[]): number {
  const n = ratings.length;
  const candies: number[] = new Array(n).fill(1);
//@step
  for (let i = 1; i < n; i++) {
    if (ratings[i] > ratings[i - 1]) candies[i] = candies[i - 1] + 1;
  }
//@step
  for (let i = n - 2; i >= 0; i--) {
    if (ratings[i] > ratings[i + 1]) candies[i] = Math.max(candies[i], candies[i + 1] + 1);
  }
  return candies.reduce((a, b) => a + b, 0);
}`
    },
    'With [1, 0, 2]: the first pass gives [1, 1, 2]; the second pass raises the first child to 2 because it is rated above the second. Total 5.',
    'O(n) time. O(n) space.',
    [{ args: [[1, 0, 2]], expected: 5 }, { args: [[1, 2, 2]], expected: 4 }, { args: [[1, 3, 2, 2, 1]], expected: 7 }]),
  problem('valid-parenthesis-string', 'Valid Parenthesis String', 'medium',
    'Given a string s of "(", ")" and "*", where "*" can be "(", ")" or an empty string, return true if s can be valid. Example: s = "()" returns true. Example: s = "(*)" returns true. Example: s = "(*))" returns true. Example: s = ")(" returns false.',
    { dart: 'class Solution { bool checkValidString(String s) }', typescript: 'function checkValidString(s: string): boolean' },
    'checkValidString',
    'Check whether the brackets can be balanced when each star may be an opening bracket, a closing bracket or nothing.',
    'Track the range of possible open-bracket counts. An opener raises both ends, a closer lowers both, and a star lowers the minimum and raises the maximum. If the maximum goes negative, too many closers; clamp the minimum at zero. Valid if the minimum ends at zero.',
    [
      { what: 'open the method with the lowest and highest possible open counts at zero', say: 'Stars make the count a range rather than one number.' },
      { what: 'update the range for each character, failing if the highest drops below zero, and keeping the lowest at least zero', say: 'A negative maximum means even treating every star as an opener cannot save it.' },
      { what: 'return whether the lowest count can be zero', say: 'Linear time, constant space.' }
    ],
    {
      dart: `//@step
class Solution {
  bool checkValidString(String s) {
    var low = 0;
    var high = 0;
//@step
    for (final c in s.split('')) {
      low += c == '(' ? 1 : -1;
      high += c == ')' ? -1 : 1;
      if (high < 0) return false;
      if (low < 0) low = 0;
    }
//@step
    return low == 0;
  }
}`,
      typescript: `//@step
function checkValidString(s: string): boolean {
  let low = 0;
  let high = 0;
//@step
  for (const c of s) {
    low += c === '(' ? 1 : -1;
    high += c === ')' ? -1 : 1;
    if (high < 0) return false;
    low = Math.max(low, 0);
  }
//@step
  return low === 0;
}`
    },
    'With "(*))": after "(", the range is 1 to 1; after "*", 0 to 2; after ")", 0 to 1 with the low clamped; after ")", the low clamps to 0 and the high is 0. The low is 0, so true.',
    'O(n) time. O(1) space.',
    [{ args: ['()'], expected: true }, { args: ['(*)'], expected: true }, { args: ['(*))'], expected: true }, { args: [')('], expected: false }])
];
