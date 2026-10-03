// Stacks: matching pairs, monotonic stacks and expression evaluation.
const { design } = require('../helpers');

module.exports = [
  {
    id: 'valid-parentheses',
    title: 'Valid Parentheses',
    level: 'easy',
    statement: 'Given a string s containing only the characters ( ) { } [ ], return true if every opening bracket is closed by the same type of bracket in the correct order. ' +
      'Example: s = "()[]{}" returns true. Example: s = "(]" returns false. Example: s = "([])" returns true.',
    signature: { dart: 'class Solution { bool isValid(String s) }', typescript: 'function isValid(s: string): boolean' },
    fn: 'isValid',
    asks: 'Check that every bracket is closed by the right type in the right order: "([])" is fine, "(]" is not.',
    idea: 'Use a stack. Push every opening bracket. For a closing bracket, the top of the stack must be its matching opener; pop it. At the end the stack must be empty.',
    where: { dart: 'the Solution class, replacing the isValid method.', typescript: 'the isValid function, replacing its body.' },
    steps: [
      { what: 'open the method with a stack and a map from each closing bracket to its opener', say: 'The most recent unclosed bracket must be closed first, which is exactly a stack.' },
      { what: 'push openers; for a closer, return false unless the top matches, then pop', say: 'A closer that does not match the latest opener means the order is wrong.' },
      { what: 'return whether the stack is empty', say: 'Anything left open means the string is invalid.' }
    ],
    code: {
      dart: `//@step
class Solution {
  bool isValid(String s) {
    final stack = <String>[];
    const pairs = {')': '(', ']': '[', '}': '{'};
//@step
    for (final c in s.split('')) {
      final opener = pairs[c];
      if (opener == null) {
        stack.add(c);
      } else {
        if (stack.isEmpty || stack.removeLast() != opener) return false;
      }
    }
//@step
    return stack.isEmpty;
  }
}`,
      typescript: `//@step
function isValid(s: string): boolean {
  const stack: string[] = [];
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
//@step
  for (const c of s) {
    const opener = pairs[c];
    if (opener === undefined) stack.push(c);
    else if (stack.pop() !== opener) return false;
  }
//@step
  return stack.length === 0;
}`
    },
    check: 'With "([])": ( and [ are pushed; ] matches [ on top, so it is popped; ) matches (. The stack is empty, so true.',
    complexity: 'O(n) time. O(n) space for the stack in the worst case.',
    tests: [
      { args: ['()[]{}'], expected: true },
      { args: ['(]'], expected: false },
      { args: ['([])'], expected: true },
      { args: ['(['], expected: false },
      { args: [']'], expected: false }
    ]
  },
  {
    id: 'min-stack',
    title: 'Min Stack',
    level: 'medium',
    statement: 'Design a stack that supports push, pop, top and retrieving the minimum element, all in constant time. Implement class MinStack with MinStack(), void push(int val), void pop(), int top() and int getMin(). ' +
      'Example: push(-2), push(0), push(-3), getMin() returns -3, pop(), top() returns 0, getMin() returns -2.',
    signature: { dart: 'class MinStack { void push(int val); void pop(); int top(); int getMin() }', typescript: 'class MinStack { push(val: number): void; pop(): void; top(): number; getMin(): number }' },
    asks: 'Build a stack that can also tell you its smallest value instantly, even after pops.',
    idea: 'Store pairs: each entry keeps the value and the minimum of the stack at the moment it was pushed. The minimum is then always on the top entry, and popping restores the previous minimum automatically.',
    where: { dart: 'the MinStack class, replacing the starter class.', typescript: 'the MinStack class, replacing the starter class.' },
    steps: [
      { what: 'create the class with two lists: values and the minimum at each level', say: 'Each level remembers the minimum up to that point.' },
      { what: 'push adds the value and the smaller of it and the current minimum; pop removes both', say: 'So after a pop, the previous minimum is right there.' },
      { what: 'top and getMin read the last entries', say: 'Every operation is constant time.' }
    ],
    code: {
      dart: `//@step
class MinStack {
  final _values = <int>[];
  final _mins = <int>[];

  MinStack();
//@step
  void push(int val) {
    _values.add(val);
    _mins.add(_mins.isEmpty || val < _mins.last ? val : _mins.last);
  }

  void pop() {
    _values.removeLast();
    _mins.removeLast();
  }
//@step
  int top() => _values.last;

  int getMin() => _mins.last;
}`,
      typescript: `//@step
class MinStack {
  private values: number[] = [];
  private mins: number[] = [];
//@step
  push(val: number): void {
    this.values.push(val);
    const current = this.mins.length === 0 ? val : this.mins[this.mins.length - 1];
    this.mins.push(Math.min(val, current));
  }

  pop(): void {
    this.values.pop();
    this.mins.pop();
  }
//@step
  top(): number {
    return this.values[this.values.length - 1];
  }

  getMin(): number {
    return this.mins[this.mins.length - 1];
  }
}`
    },
    check: 'Pushing -2, 0, -3 stores minimums -2, -2, -3, so getMin gives -3. After a pop, the top value is 0 and the stored minimum is -2.',
    complexity: 'O(1) time for every operation. O(n) space for the two lists.',
    ...design({
      cls: 'MinStack',
      ops: ['MinStack', 'push', 'push', 'push', 'getMin', 'pop', 'top', 'getMin'],
      args: [[], [-2], [0], [-3], [], [], [], []],
      expected: [null, null, null, null, -3, null, 0, -2]
    })
  },
  {
    id: 'evaluate-reverse-polish-notation',
    title: 'Evaluate Reverse Polish Notation',
    level: 'medium',
    statement: 'Given an array of strings tokens representing an arithmetic expression in Reverse Polish Notation, evaluate it and return the integer result. ' +
      'Operators are + - * /, and division truncates toward zero. Example: tokens = ["2","1","+","3","*"] returns 9. Example: tokens = ["4","13","5","/","+"] returns 6.',
    signature: { dart: 'class Solution { int evalRPN(List<String> tokens) }', typescript: 'function evalRPN(tokens: string[]): number' },
    fn: 'evalRPN',
    asks: 'Work out an expression written with the operator after its two numbers: ["2", "1", "+", "3", "*"] means (2 + 1) times 3, which is 9.',
    idea: 'Use a stack of numbers. Push each number. For an operator, pop the right operand then the left, apply the operator, and push the result. The last value left is the answer.',
    where: { dart: 'the Solution class, replacing the evalRPN method.', typescript: 'the evalRPN function, replacing its body.' },
    steps: [
      { what: 'open the method with a stack of numbers', say: 'Each operator works on the two most recent values.' },
      { what: 'for an operator, pop the right and left operands, apply it and push the result; otherwise push the number', say: 'Order matters for minus and divide, so the first pop is the right side.' },
      { what: 'return the single value left on the stack', say: 'Division truncates toward zero, as the problem asks.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int evalRPN(List<String> tokens) {
    final stack = <int>[];
//@step
    for (final t in tokens) {
      if (t == '+' || t == '-' || t == '*' || t == '/') {
        final b = stack.removeLast();
        final a = stack.removeLast();
        stack.add(t == '+' ? a + b : t == '-' ? a - b : t == '*' ? a * b : a ~/ b);
      } else {
        stack.add(int.parse(t));
      }
    }
//@step
    return stack.last;
  }
}`,
      typescript: `//@step
function evalRPN(tokens: string[]): number {
  const stack: number[] = [];
//@step
  for (const t of tokens) {
    if (t === '+' || t === '-' || t === '*' || t === '/') {
      const b = stack.pop() as number;
      const a = stack.pop() as number;
      stack.push(t === '+' ? a + b : t === '-' ? a - b : t === '*' ? a * b : Math.trunc(a / b));
    } else {
      stack.push(Number(t));
    }
  }
//@step
  return stack[stack.length - 1];
}`
    },
    check: 'With ["4", "13", "5", "/", "+"]: 4, 13 and 5 are pushed; / pops 5 and 13 and pushes 13 / 5 truncated, which is 2; + pops 2 and 4 and pushes 6. Answer 6.',
    complexity: 'O(n) time. O(n) space for the stack.',
    tests: [
      { args: [['2', '1', '+', '3', '*']], expected: 9 },
      { args: [['4', '13', '5', '/', '+']], expected: 6 },
      { args: [['10', '6', '9', '3', '+', '-11', '*', '/', '*', '17', '+', '5', '+']], expected: 22 }
    ]
  },
  {
    id: 'daily-temperatures',
    title: 'Daily Temperatures',
    level: 'medium',
    statement: 'Given an array temperatures, return an array answer where answer[i] is the number of days after day i until a warmer temperature, or 0 if there is no warmer future day. ' +
      'Example: temperatures = [73,74,75,71,69,72,76,73] returns [1,1,4,2,1,1,0,0].',
    signature: { dart: 'class Solution { List<int> dailyTemperatures(List<int> temperatures) }', typescript: 'function dailyTemperatures(temperatures: number[]): number[]' },
    fn: 'dailyTemperatures',
    asks: 'For each day, count the days until it gets warmer: after 75 it takes 4 days to reach 76.',
    idea: 'Keep a stack of day indexes still waiting for a warmer day, with temperatures decreasing from bottom to top. ' +
      'When a warmer day arrives, pop every colder day from the stack and record the gap. Then push today.',
    where: { dart: 'the Solution class, replacing the dailyTemperatures method.', typescript: 'the dailyTemperatures function, replacing its body.' },
    steps: [
      { what: 'open the method with an answer of zeros and an empty stack of waiting days', say: 'Days without a warmer future keep 0.' },
      { what: 'for each day, pop every waiting day that is colder and record how many days it waited', say: 'Today is the first warmer day for each of them.' },
      { what: 'push today and return the answers', say: 'Each day is pushed and popped once, so it is linear.' }
    ],
    code: {
      dart: `//@step
class Solution {
  List<int> dailyTemperatures(List<int> temperatures) {
    final answer = List<int>.filled(temperatures.length, 0);
    final stack = <int>[];
//@step
    for (var i = 0; i < temperatures.length; i++) {
      while (stack.isNotEmpty && temperatures[stack.last] < temperatures[i]) {
        final j = stack.removeLast();
        answer[j] = i - j;
      }
//@step
      stack.add(i);
    }
    return answer;
  }
}`,
      typescript: `//@step
function dailyTemperatures(temperatures: number[]): number[] {
  const answer: number[] = new Array(temperatures.length).fill(0);
  const stack: number[] = [];
//@step
  for (let i = 0; i < temperatures.length; i++) {
    while (stack.length > 0 && temperatures[stack[stack.length - 1]] < temperatures[i]) {
      const j = stack.pop() as number;
      answer[j] = i - j;
    }
//@step
    stack.push(i);
  }
  return answer;
}`
    },
    check: 'With [73, 74, 75, 71, 69, 72, 76, 73]: 74 resolves 73 after 1 day, 75 resolves 74. 71 and 69 wait; 72 resolves 69 after 1 and 71 after 2. 76 resolves 72 after 1 and 75 after 4. 76 and 73 stay 0.',
    complexity: 'O(n) time, each index pushed and popped once. O(n) space.',
    tests: [
      { args: [[73, 74, 75, 71, 69, 72, 76, 73]], expected: [1, 1, 4, 2, 1, 1, 0, 0] },
      { args: [[30, 40, 50, 60]], expected: [1, 1, 1, 0] },
      { args: [[30, 60, 90]], expected: [1, 1, 0] }
    ]
  },
  {
    id: 'largest-rectangle-in-histogram',
    title: 'Largest Rectangle in Histogram',
    level: 'hard',
    statement: 'Given an array heights of bar heights in a histogram where each bar has width 1, return the area of the largest rectangle that fits inside the histogram. ' +
      'Example: heights = [2,1,5,6,2,3] returns 10. Example: heights = [2,4] returns 4.',
    signature: { dart: 'class Solution { int largestRectangleArea(List<int> heights) }', typescript: 'function largestRectangleArea(heights: number[]): number' },
    fn: 'largestRectangleArea',
    asks: 'Find the biggest rectangle inside the bar chart: in [2, 1, 5, 6, 2, 3], the bars 5 and 6 give a rectangle of height 5 and width 2, area 10.',
    idea: 'Keep a stack of bar indexes with increasing heights. When a shorter bar arrives, every taller bar on the stack can no longer extend right, ' +
      'so pop it and compute its rectangle: its height times the width between the new top of the stack and the current index. A final zero-height bar flushes the stack.',
    where: { dart: 'the Solution class, replacing the largestRectangleArea method.', typescript: 'the largestRectangleArea function, replacing its body.' },
    steps: [
      { what: 'open the method with a stack of indexes and the best area', say: 'The stack keeps bars in increasing height order.' },
      { what: 'for each index, including one extra position with height 0, pop taller bars and measure their rectangles', say: 'A popped bar spans from just after the new stack top to just before the current bar.' },
      { what: 'push the current index and return the best area', say: 'Each bar is pushed and popped once, so it is linear.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int largestRectangleArea(List<int> heights) {
    final stack = <int>[];
    var best = 0;
//@step
    for (var i = 0; i <= heights.length; i++) {
      final h = i == heights.length ? 0 : heights[i];
      while (stack.isNotEmpty && heights[stack.last] > h) {
        final height = heights[stack.removeLast()];
        final width = stack.isEmpty ? i : i - stack.last - 1;
        if (height * width > best) best = height * width;
      }
//@step
      stack.add(i);
    }
    return best;
  }
}`,
      typescript: `//@step
function largestRectangleArea(heights: number[]): number {
  const stack: number[] = [];
  let best = 0;
//@step
  for (let i = 0; i <= heights.length; i++) {
    const h = i === heights.length ? 0 : heights[i];
    while (stack.length > 0 && heights[stack[stack.length - 1]] > h) {
      const height = heights[stack.pop() as number];
      const width = stack.length === 0 ? i : i - stack[stack.length - 1] - 1;
      best = Math.max(best, height * width);
    }
//@step
    stack.push(i);
  }
  return best;
}`
    },
    check: 'With [2, 1, 5, 6, 2, 3]: when the 2 at index 4 arrives, 6 is popped with width 1, area 6, then 5 is popped with width 2, area 10. The rest give smaller areas, so the answer is 10.',
    complexity: 'O(n) time, each bar pushed and popped once. O(n) space.',
    tests: [
      { args: [[2, 1, 5, 6, 2, 3]], expected: 10 },
      { args: [[2, 4]], expected: 4 },
      { args: [[1, 1, 1, 1]], expected: 4 }
    ]
  },
  {
    id: 'generate-parentheses',
    title: 'Generate Parentheses',
    level: 'medium',
    statement: 'Given n pairs of parentheses, return all combinations of well-formed parentheses, in any order. ' +
      'Example: n = 3 returns ["((()))","(()())","(())()","()(())","()()()"]. Example: n = 1 returns ["()"].',
    signature: { dart: 'class Solution { List<String> generateParenthesis(int n) }', typescript: 'function generateParenthesis(n: number): string[]' },
    fn: 'generateParenthesis',
    compare: 'sorted',
    asks: 'List every valid way to arrange n pairs of brackets: for n = 2 that is "(())" and "()()".',
    idea: 'Build strings one character at a time with backtracking. An opening bracket can be added while fewer than n are used; a closing bracket only while there are more openers than closers. ' +
      'Those two rules make every finished string valid.',
    where: { dart: 'the Solution class, replacing the generateParenthesis method.', typescript: 'the generateParenthesis function, replacing its body.' },
    steps: [
      { what: 'open the method with the result list and a recursive helper taking the current string and counts', say: 'I build each string step by step and back up after each choice.' },
      { what: 'when the string has length 2n, save it; otherwise try adding ( and ) when allowed', say: 'Only add a closer when it has an opener to match, so nothing invalid is ever built.' },
      { what: 'start the recursion empty and return the results', say: 'The number of results is the Catalan number, and each takes O(n) to build.' }
    ],
    code: {
      dart: `//@step
class Solution {
  List<String> generateParenthesis(int n) {
    final result = <String>[];
    void build(String current, int open, int close) {
//@step
      if (current.length == 2 * n) {
        result.add(current);
        return;
      }
      if (open < n) build('\${current}(', open + 1, close);
      if (close < open) build('\${current})', open, close + 1);
    }
//@step
    build('', 0, 0);
    return result;
  }
}`,
      typescript: `//@step
function generateParenthesis(n: number): string[] {
  const result: string[] = [];
  const build = (current: string, open: number, close: number): void => {
//@step
    if (current.length === 2 * n) {
      result.push(current);
      return;
    }
    if (open < n) build(current + '(', open + 1, close);
    if (close < open) build(current + ')', open, close + 1);
  };
//@step
  build('', 0, 0);
  return result;
}`
    },
    check: 'With n = 2: from "(" we can add "(" giving "((" and then "))" to make "(())", or add ")" giving "()" and then "()" to make "()()". Those are the two results.',
    complexity: 'O(4 to the n divided by the square root of n) time and output size, the Catalan number of results. O(n) recursion depth.',
    tests: [
      { args: [3], expected: ['((()))', '(()())', '(())()', '()(())', '()()()'] },
      { args: [1], expected: ['()'] },
      { args: [2], expected: ['(())', '()()'] }
    ]
  },
  {
    id: 'car-fleet',
    title: 'Car Fleet',
    level: 'medium',
    statement: 'There are n cars going to a destination at mile target on a one-lane road. Car i starts at position[i] with speed[i]. A car can catch up to a car ahead and then drives at its speed as one fleet; it never passes it. ' +
      'Return the number of car fleets that arrive at the destination. Example: target = 12, position = [10,8,0,5,3], speed = [2,4,1,1,3] returns 3.',
    signature: { dart: 'class Solution { int carFleet(int target, List<int> position, List<int> speed) }', typescript: 'function carFleet(target: number, position: number[], speed: number[]): number' },
    fn: 'carFleet',
    asks: 'Count how many groups of cars arrive together, when a faster car that catches a slower one ahead must stay behind it.',
    idea: 'Sort cars by starting position, closest to the target first, and compute each car\'s arrival time if it drove alone. ' +
      'Going backwards from the front, a car that would arrive no later than the fleet ahead joins it; a car that arrives later starts a new fleet.',
    where: { dart: 'the Solution class, replacing the carFleet method.', typescript: 'the carFleet function, replacing its body.' },
    steps: [
      { what: 'open the method and sort car indexes by position, nearest the target first', say: 'The car in front decides the speed of anything that catches it.' },
      { what: 'walk the cars in that order, computing each arrival time, and start a new fleet when it is later than the current fleet\'s time', say: 'A car arriving earlier on its own would catch up, so it merges.' },
      { what: 'return the fleet count', say: 'Sorting makes it n log n.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int carFleet(int target, List<int> position, List<int> speed) {
    final order = List<int>.generate(position.length, (i) => i)
      ..sort((a, b) => position[b].compareTo(position[a]));
    var fleets = 0;
    var slowest = 0.0;
//@step
    for (final i in order) {
      final time = (target - position[i]) / speed[i];
      if (time > slowest) {
        fleets++;
        slowest = time;
      }
    }
//@step
    return fleets;
  }
}`,
      typescript: `//@step
function carFleet(target: number, position: number[], speed: number[]): number {
  const order = position.map((_, i) => i).sort((a, b) => position[b] - position[a]);
  let fleets = 0;
  let slowest = 0;
//@step
  for (const i of order) {
    const time = (target - position[i]) / speed[i];
    if (time > slowest) {
      fleets++;
      slowest = time;
    }
  }
//@step
  return fleets;
}`
    },
    check: 'With target 12: the cars at 10 and 8 both need 1 hour, so they form one fleet. The car at 5 needs 7 hours, a new fleet; the car at 3 needs 3 hours, so it catches that one. The car at 0 needs 12 hours, a third fleet. Answer 3.',
    complexity: 'O(n log n) time for sorting. O(n) space for the order.',
    tests: [
      { args: [12, [10, 8, 0, 5, 3], [2, 4, 1, 1, 3]], expected: 3 },
      { args: [10, [3], [3]], expected: 1 },
      { args: [100, [0, 2, 4], [4, 2, 1]], expected: 1 }
    ]
  },
  {
    id: 'basic-calculator-ii',
    title: 'Basic Calculator II',
    level: 'medium',
    statement: 'Given a string s representing an expression with non-negative integers, the operators + - * / and spaces, evaluate it and return the result. ' +
      'Integer division truncates toward zero, and normal operator precedence applies. No built-in eval. Example: s = "3+2*2" returns 7. Example: s = " 3+5 / 2 " returns 5.',
    signature: { dart: 'class Solution { int calculate(String s) }', typescript: 'function calculate(s: string): number' },
    fn: 'calculate',
    asks: 'Evaluate a simple expression with the usual rules, multiply and divide before add and subtract: "3+2*2" is 7.',
    idea: 'Read numbers one by one, remembering the operator before each. For + and - push the number, or its negative, on a stack. For * and / apply it immediately to the top of the stack. ' +
      'At the end, sum the stack. That handles precedence in one pass.',
    where: { dart: 'the Solution class, replacing the calculate method.', typescript: 'the calculate function, replacing its body.' },
    steps: [
      { what: 'open the method with a stack, the current number and the last operator, starting as +', say: 'The stack holds terms to be added at the end.' },
      { what: 'build up digits; at an operator or the end, apply the previous operator to the stack', say: 'Multiply and divide combine with the last term straight away, so they bind tighter.' },
      { what: 'remember the new operator, reset the number, and finally return the sum of the stack', say: 'One pass, linear time.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int calculate(String s) {
    final stack = <int>[];
    var number = 0;
    var op = '+';
//@step
    for (var i = 0; i <= s.length; i++) {
      final c = i < s.length ? s[i] : '+';
      if (c == ' ') continue;
      final digit = c.codeUnitAt(0) - 48;
      if (digit >= 0 && digit <= 9) {
        number = number * 10 + digit;
        continue;
      }
      if (op == '+') stack.add(number);
      if (op == '-') stack.add(-number);
      if (op == '*') stack.add(stack.removeLast() * number);
      if (op == '/') stack.add(stack.removeLast() ~/ number);
//@step
      op = c;
      number = 0;
    }
    return stack.fold(0, (a, b) => a + b);
  }
}`,
      typescript: `//@step
function calculate(s: string): number {
  const stack: number[] = [];
  let number = 0;
  let op = '+';
//@step
  for (let i = 0; i <= s.length; i++) {
    const c = i < s.length ? s[i] : '+';
    if (c === ' ') continue;
    if (c >= '0' && c <= '9') {
      number = number * 10 + Number(c);
      continue;
    }
    if (op === '+') stack.push(number);
    else if (op === '-') stack.push(-number);
    else if (op === '*') stack.push((stack.pop() as number) * number);
    else stack.push(Math.trunc((stack.pop() as number) / number));
//@step
    op = c;
    number = 0;
  }
  return stack.reduce((a, b) => a + b, 0);
}`
    },
    check: 'With "3+2*2": 3 is pushed, then 2 is pushed after +, then * multiplies the top 2 by the next 2 giving 4. The stack is [3, 4], summing to 7.',
    complexity: 'O(n) time, one pass. O(n) space for the stack.',
    tests: [
      { args: ['3+2*2'], expected: 7 },
      { args: [' 3/2 '], expected: 1 },
      { args: [' 3+5 / 2 '], expected: 5 },
      { args: ['14-3/2'], expected: 13 }
    ]
  }
];
