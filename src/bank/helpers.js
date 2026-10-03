// Test and Run it code for bank coding problems whose inputs are not plain
// values: linked lists, binary trees, and design problems (a class driven by a
// sequence of calls). The platform defines ListNode and TreeNode itself, so a
// solution never does; these local programs define them to run it.
// Used by the problem files in src/bank/coding and checked by scripts/verify-bank.js.

const { literal } = require('./literal');

const NODES = {
  dart: `class ListNode {
  int val;
  ListNode? next;
  ListNode([this.val = 0, this.next]);
}

class TreeNode {
  int val;
  TreeNode? left;
  TreeNode? right;
  TreeNode([this.val = 0, this.left, this.right]);
}

ListNode? toLinkedList(List<int> values) {
  ListNode? head;
  for (final v in values.reversed) {
    head = ListNode(v, head);
  }
  return head;
}

List<int> fromLinkedList(ListNode? head) {
  final out = <int>[];
  for (var n = head; n != null; n = n.next) {
    out.add(n.val);
  }
  return out;
}

TreeNode? toTree(List<int?> values) {
  if (values.isEmpty || values[0] == null) return null;
  final root = TreeNode(values[0]!);
  final queue = <TreeNode>[root];
  var i = 1;
  for (var q = 0; q < queue.length && i < values.length; q++) {
    final node = queue[q];
    if (i < values.length && values[i] != null) {
      node.left = TreeNode(values[i]!);
      queue.add(node.left!);
    }
    i++;
    if (i < values.length && values[i] != null) {
      node.right = TreeNode(values[i]!);
      queue.add(node.right!);
    }
    i++;
  }
  return root;
}

List<int?> fromTree(TreeNode? root) {
  final out = <int?>[];
  final queue = <TreeNode?>[root];
  for (var q = 0; q < queue.length; q++) {
    final node = queue[q];
    out.add(node?.val);
    if (node != null) {
      queue.add(node.left);
      queue.add(node.right);
    }
  }
  while (out.isNotEmpty && out.last == null) {
    out.removeLast();
  }
  return out;
}`,
  typescript: `class ListNode {
  val: number;
  next: ListNode | null;
  constructor(val?: number, next?: ListNode | null) {
    this.val = val === undefined ? 0 : val;
    this.next = next === undefined ? null : next;
  }
}

class TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
  constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {
    this.val = val === undefined ? 0 : val;
    this.left = left === undefined ? null : left;
    this.right = right === undefined ? null : right;
  }
}

function toLinkedList(values: number[]): ListNode | null {
  let head: ListNode | null = null;
  for (let i = values.length - 1; i >= 0; i--) head = new ListNode(values[i], head);
  return head;
}

function fromLinkedList(head: ListNode | null): number[] {
  const out: number[] = [];
  for (let n = head; n !== null; n = n.next) out.push(n.val);
  return out;
}

function toTree(values: (number | null)[]): TreeNode | null {
  if (values.length === 0 || values[0] === null) return null;
  const root = new TreeNode(values[0]);
  const queue: TreeNode[] = [root];
  let i = 1;
  for (let q = 0; q < queue.length && i < values.length; q++) {
    const node = queue[q];
    if (i < values.length && values[i] !== null) {
      node.left = new TreeNode(values[i] as number);
      queue.push(node.left);
    }
    i++;
    if (i < values.length && values[i] !== null) {
      node.right = new TreeNode(values[i] as number);
      queue.push(node.right);
    }
    i++;
  }
  return root;
}

function fromTree(root: TreeNode | null): (number | null)[] {
  const out: (number | null)[] = [];
  const queue: (TreeNode | null)[] = [root];
  for (let q = 0; q < queue.length; q++) {
    const node = queue[q];
    out.push(node === null ? null : node.val);
    if (node !== null) {
      queue.push(node.left);
      queue.push(node.right);
    }
  }
  while (out.length > 0 && out[out.length - 1] === null) out.pop();
  return out;
}`
};

// How one argument or the result is written: a plain value, a linked list
// built from an array, or a tree built from its level order (nulls for gaps).
function argCode(value, kind, lang) {
  if (kind === 'list') return 'toLinkedList(' + literal(value, lang) + ')';
  if (kind === 'tree') return 'toTree(' + literal(value, lang) + ')';
  return literal(value, lang);
}

function resultCode(call, kind) {
  if (kind === 'list') return 'fromLinkedList(' + call + ')';
  if (kind === 'tree') return 'fromTree(' + call + ')';
  return call;
}

// Verify and Run it code for a function over lists or trees.
// args: one kind per argument ('list', 'tree' or 'value'); returns: the result's kind.
function structured({ fn, tests, args, returns = 'value' }) {
  const calls = (lang) => tests.map((t) => {
    const call = (lang === 'dart' ? 's.' : '') + fn + '(' + t.args.map((a, i) => argCode(a, args[i], lang)).join(', ') + ')';
    return { call: resultCode(call, returns), expected: t.expected };
  });
  const dartBody = (print) => 'void main() {\n  final s = Solution();\n' + calls('dart').map(print).join('\n') + '\n}';
  const tsBody = (print) => calls('typescript').map(print).join('\n');
  return {
    verify: {
      dart: NODES.dart + '\n\n' + dartBody((c) => '  print(__c.jsonEncode(' + c.call + '));'),
      typescript: NODES.typescript + '\n\n' + tsBody((c) => 'console.log(JSON.stringify(' + c.call + '));')
    },
    run: {
      dart: NODES.dart + '\n\n' + dartBody((c) => '  print(' + c.call + '); // ' + JSON.stringify(c.expected)),
      typescript: NODES.typescript + '\n\n' + tsBody((c) => 'console.log(' + c.call + '); // ' + JSON.stringify(c.expected))
    }
  };
}

// Verify and Run it code for a design problem: a class constructed with the
// first call's args, then each later call made in order; a call whose expected
// result is null is a void method. The output is the list of results.
function design({ cls, ops, args, expected }) {
  const lines = (lang, print) => ops.map((op, i) => {
    const a = args[i].map((v) => literal(v, lang)).join(', ');
    if (i === 0) return lang === 'dart' ? '  final obj = ' + cls + '(' + a + ');\n  out.add(null);' : 'const obj = new ' + cls + '(' + a + ');\nout.push(null);';
    const call = 'obj.' + op + '(' + a + ')';
    if (expected[i] === null) return lang === 'dart' ? '  ' + call + ';\n  out.add(null);' : call + ';\nout.push(null);';
    return lang === 'dart' ? '  out.add(' + call + ');' : 'out.push(' + call + ');';
  }).join('\n');
  const want = JSON.stringify(expected);
  return {
    tests: [{ args: [], expected }],
    verify: {
      dart: 'void main() {\n  final out = <Object?>[];\n' + lines('dart') + '\n  print(__c.jsonEncode(out));\n}',
      typescript: 'const out: unknown[] = [];\n' + lines('typescript') + '\nconsole.log(JSON.stringify(out));'
    },
    run: {
      dart: 'void main() {\n  final out = <Object?>[];\n' + lines('dart') + '\n  print(out); // ' + want + '\n}',
      typescript: 'const out: unknown[] = [];\n' + lines('typescript') + '\nconsole.log(out); // ' + want
    }
  };
}

// Verify and Run it code for a function that changes its argument in place and
// returns nothing (the platform checks the argument): prints that argument.
// A Dart variable holding a list needs its element type: an empty literal
// would be List<dynamic>. Taken from the values, else from elementType.
function dartList(value, elementType) {
  if (!Array.isArray(value)) return literal(value, 'dart');
  const type = elementType || (value.length && typeof value[0] === 'string' ? 'String' : Array.isArray(value[0]) ? 'List<int>' : 'int');
  return '<' + type + '>' + literal(value, 'dart');
}

function inPlace({ fn, tests, arg = 0, elementTypes = [] }) {
  const body = (lang, print) => tests.map((t, i) => {
    const vars = t.args.map((a, j) => (lang === 'dart' ? '  final a' + i + '_' + j + ' = ' + dartList(a, elementTypes[j]) : 'const a' + i + '_' + j + ' = ' + literal(a, lang)) + ';').join('\n');
    const call = (lang === 'dart' ? '  s.' : '') + fn + '(' + t.args.map((_, j) => 'a' + i + '_' + j).join(', ') + ');';
    return vars + '\n' + call + '\n' + print('a' + i + '_' + arg, t.expected);
  }).join('\n');
  const dart = (print) => 'void main() {\n  final s = Solution();\n' + body('dart', print) + '\n}';
  return {
    verify: {
      dart: dart((v) => '  print(__c.jsonEncode(' + v + '));'),
      typescript: body('typescript', (v) => 'console.log(JSON.stringify(' + v + '));')
    },
    run: {
      dart: dart((v, e) => '  print(' + v + '); // ' + JSON.stringify(e)),
      typescript: body('typescript', (v, e) => 'console.log(' + v + '); // ' + JSON.stringify(e))
    }
  };
}

module.exports = { structured, design, inPlace, NODES };
