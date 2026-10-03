// Binary trees and binary search trees. The platform defines TreeNode, so
// solutions never do; tests build trees from level order (null for a gap).
const { structured, NODES } = require('../helpers');

const TREE_NODE = 'TreeNode is defined by the platform with val, left and right. The tree is given in level order, with null for a missing child';

function treeProblem(item, kinds) {
  return { ...structured({ fn: item.fn, tests: item.tests, args: kinds.args, returns: kinds.returns }), ...item };
}

module.exports = [
  treeProblem({
    id: 'invert-binary-tree',
    title: 'Invert Binary Tree',
    level: 'easy',
    statement: 'Given the root of a binary tree, invert the tree, swapping every left and right child, and return its root. ' + TREE_NODE + '. ' +
      'Example: root = [4,2,7,1,3,6,9] returns [4,7,2,9,6,3,1].',
    signature: { dart: 'class Solution { TreeNode? invertTree(TreeNode? root) }', typescript: 'function invertTree(root: TreeNode | null): TreeNode | null' },
    fn: 'invertTree',
    asks: 'Mirror the tree, so every left child becomes the right child and the other way round.',
    idea: 'Recursively: an empty tree stays empty. Otherwise invert the left and right subtrees and swap them. Every node is visited once.',
    where: { dart: 'the Solution class, replacing the invertTree method.', typescript: 'the invertTree function, replacing its body.' },
    steps: [
      { what: 'open the method and return null for an empty tree', say: 'The base case is an empty subtree.' },
      { what: 'invert both subtrees and swap them', say: 'Each node swaps its children after they have been mirrored.' },
      { what: 'return the root', say: 'Linear time, recursion depth equal to the tree height.' }
    ],
    code: {
      dart: `//@step
class Solution {
  TreeNode? invertTree(TreeNode? root) {
    if (root == null) return null;
//@step
    final left = invertTree(root.left);
    root.left = invertTree(root.right);
    root.right = left;
//@step
    return root;
  }
}`,
      typescript: `//@step
function invertTree(root: TreeNode | null): TreeNode | null {
  if (root === null) return null;
//@step
  const left = invertTree(root.left);
  root.left = invertTree(root.right);
  root.right = left;
//@step
  return root;
}`
    },
    check: 'With [4, 2, 7, 1, 3, 6, 9]: under 2, the children 1 and 3 swap; under 7, 6 and 9 swap; then 2 and 7 swap at the root, giving [4, 7, 2, 9, 6, 3, 1].',
    complexity: 'O(n) time. O(h) space for the recursion, where h is the height.',
    tests: [
      { args: [[4, 2, 7, 1, 3, 6, 9]], expected: [4, 7, 2, 9, 6, 3, 1] },
      { args: [[2, 1, 3]], expected: [2, 3, 1] },
      { args: [[]], expected: [] }
    ]
  }, { args: ['tree'], returns: 'tree' }),
  treeProblem({
    id: 'maximum-depth-binary-tree',
    title: 'Maximum Depth of Binary Tree',
    level: 'easy',
    statement: 'Given the root of a binary tree, return its maximum depth, the number of nodes on the longest path from the root down to a leaf. ' + TREE_NODE + '. ' +
      'Example: root = [3,9,20,null,null,15,7] returns 3. Example: root = [1,null,2] returns 2.',
    signature: { dart: 'class Solution { int maxDepth(TreeNode? root) }', typescript: 'function maxDepth(root: TreeNode | null): number' },
    fn: 'maxDepth',
    asks: 'Count the levels on the deepest path: the tree 3, with 9 and 20 below it, and 15 and 7 under 20, has depth 3.',
    idea: 'The depth of a tree is one plus the larger depth of its two subtrees, and an empty tree has depth zero.',
    where: { dart: 'the Solution class, replacing the maxDepth method.', typescript: 'the maxDepth function, replacing its body.' },
    steps: [
      { what: 'open the method and return 0 for an empty tree', say: 'An empty subtree adds no levels.' },
      { what: 'compute the depth of each subtree recursively', say: 'Each side reports its own deepest path.' },
      { what: 'return one plus the larger of the two', say: 'Visits every node once.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int maxDepth(TreeNode? root) {
    if (root == null) return 0;
//@step
    final left = maxDepth(root.left);
    final right = maxDepth(root.right);
//@step
    return 1 + (left > right ? left : right);
  }
}`,
      typescript: `//@step
function maxDepth(root: TreeNode | null): number {
  if (root === null) return 0;
//@step
  const left = maxDepth(root.left);
  const right = maxDepth(root.right);
//@step
  return 1 + Math.max(left, right);
}`
    },
    check: 'With [3, 9, 20, null, null, 15, 7]: 9 has depth 1, 20 has depth 2 through 15 or 7, so the root has depth 1 plus 2, which is 3.',
    complexity: 'O(n) time. O(h) recursion space.',
    tests: [
      { args: [[3, 9, 20, null, null, 15, 7]], expected: 3 },
      { args: [[1, null, 2]], expected: 2 },
      { args: [[]], expected: 0 }
    ]
  }, { args: ['tree'], returns: 'value' }),
  treeProblem({
    id: 'same-tree',
    title: 'Same Tree',
    level: 'easy',
    statement: 'Given the roots of two binary trees p and q, return true if they are structurally identical and their nodes have the same values. ' + TREE_NODE + '. ' +
      'Example: p = [1,2,3], q = [1,2,3] returns true. Example: p = [1,2], q = [1,null,2] returns false.',
    signature: { dart: 'class Solution { bool isSameTree(TreeNode? p, TreeNode? q) }', typescript: 'function isSameTree(p: TreeNode | null, q: TreeNode | null): boolean' },
    fn: 'isSameTree',
    asks: 'Check whether two trees have exactly the same shape and values.',
    idea: 'Two empty trees are the same. If only one is empty, or the root values differ, they are not. Otherwise both left subtrees and both right subtrees must be the same.',
    where: { dart: 'the Solution class, replacing the isSameTree method.', typescript: 'the isSameTree function, replacing its body.' },
    steps: [
      { what: 'open the method and handle the empty cases', say: 'Both empty is true, one empty is false.' },
      { what: 'return false if the values differ', say: 'Different values at the same spot means different trees.' },
      { what: 'return whether both pairs of subtrees are the same', say: 'Linear in the smaller tree.' }
    ],
    code: {
      dart: `//@step
class Solution {
  bool isSameTree(TreeNode? p, TreeNode? q) {
    if (p == null && q == null) return true;
    if (p == null || q == null) return false;
//@step
    if (p.val != q.val) return false;
//@step
    return isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
  }
}`,
      typescript: `//@step
function isSameTree(p: TreeNode | null, q: TreeNode | null): boolean {
  if (p === null && q === null) return true;
  if (p === null || q === null) return false;
//@step
  if (p.val !== q.val) return false;
//@step
  return isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
}`
    },
    check: 'With [1, 2] and [1, null, 2]: the roots match, but the first tree has 2 on the left and the second has nothing there, so the answer is false.',
    complexity: 'O(n) time. O(h) recursion space.',
    tests: [
      { args: [[1, 2, 3], [1, 2, 3]], expected: true },
      { args: [[1, 2], [1, null, 2]], expected: false },
      { args: [[1, 2, 1], [1, 1, 2]], expected: false }
    ]
  }, { args: ['tree', 'tree'], returns: 'value' }),
  treeProblem({
    id: 'diameter-of-binary-tree',
    title: 'Diameter of Binary Tree',
    level: 'easy',
    statement: 'Given the root of a binary tree, return the length of its diameter, the number of edges on the longest path between any two nodes, which may not pass through the root. ' + TREE_NODE + '. ' +
      'Example: root = [1,2,3,4,5] returns 3, the path 4 to 2 to 1 to 3.',
    signature: { dart: 'class Solution { int diameterOfBinaryTree(TreeNode? root) }', typescript: 'function diameterOfBinaryTree(root: TreeNode | null): number' },
    fn: 'diameterOfBinaryTree',
    asks: 'Find the longest path, counted in edges, between any two nodes of the tree.',
    idea: 'The longest path through a node is the height of its left subtree plus the height of its right subtree. ' +
      'One depth-first pass computes each node\'s height and updates the best sum along the way.',
    where: { dart: 'the Solution class, replacing the diameterOfBinaryTree method.', typescript: 'the diameterOfBinaryTree function, replacing its body.' },
    steps: [
      { what: 'open the method with a best value and a helper that returns a subtree\'s height', say: 'The helper returns height and records the best path on the side.' },
      { what: 'in the helper, get both heights, update the best with their sum, and return one plus the larger', say: 'The path through this node uses both sides.' },
      { what: 'call the helper on the root and return the best', say: 'One pass, linear time.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int diameterOfBinaryTree(TreeNode? root) {
    var best = 0;
    int height(TreeNode? node) {
      if (node == null) return 0;
//@step
      final left = height(node.left);
      final right = height(node.right);
      if (left + right > best) best = left + right;
      return 1 + (left > right ? left : right);
    }
//@step
    height(root);
    return best;
  }
}`,
      typescript: `//@step
function diameterOfBinaryTree(root: TreeNode | null): number {
  let best = 0;
  const height = (node: TreeNode | null): number => {
    if (node === null) return 0;
//@step
    const left = height(node.left);
    const right = height(node.right);
    best = Math.max(best, left + right);
    return 1 + Math.max(left, right);
  };
//@step
  height(root);
  return best;
}`
    },
    check: 'With [1, 2, 3, 4, 5]: node 2 has heights 1 and 1, a path of 2. At the root, the left height is 2 and the right is 1, a path of 3, the best.',
    complexity: 'O(n) time. O(h) recursion space.',
    tests: [
      { args: [[1, 2, 3, 4, 5]], expected: 3 },
      { args: [[1, 2]], expected: 1 },
      { args: [[1]], expected: 0 }
    ]
  }, { args: ['tree'], returns: 'value' }),
  treeProblem({
    id: 'balanced-binary-tree',
    title: 'Balanced Binary Tree',
    level: 'easy',
    statement: 'Given a binary tree, return true if it is height-balanced: for every node, the heights of the left and right subtrees differ by at most one. ' + TREE_NODE + '. ' +
      'Example: root = [3,9,20,null,null,15,7] returns true. Example: root = [1,2,2,3,3,null,null,4,4] returns false.',
    signature: { dart: 'class Solution { bool isBalanced(TreeNode? root) }', typescript: 'function isBalanced(root: TreeNode | null): boolean' },
    fn: 'isBalanced',
    asks: 'Check that at every node the two sides differ in height by at most one.',
    idea: 'Compute heights bottom-up, and use minus one as a signal that a subtree is already unbalanced, so the answer bubbles up without recomputing heights.',
    where: { dart: 'the Solution class, replacing the isBalanced method.', typescript: 'the isBalanced function, replacing its body.' },
    steps: [
      { what: 'open the method with a helper that returns a height, or -1 if unbalanced', say: 'One pass that both measures and checks.' },
      { what: 'in the helper, return -1 if either side is -1 or their heights differ by more than one', say: 'An unbalanced subtree makes the whole tree unbalanced.' },
      { what: 'return whether the root\'s result is not -1', say: 'Linear time instead of n log n.' }
    ],
    code: {
      dart: `//@step
class Solution {
  bool isBalanced(TreeNode? root) {
    int height(TreeNode? node) {
      if (node == null) return 0;
//@step
      final left = height(node.left);
      final right = height(node.right);
      if (left < 0 || right < 0 || (left - right).abs() > 1) return -1;
      return 1 + (left > right ? left : right);
    }
//@step
    return height(root) >= 0;
  }
}`,
      typescript: `//@step
function isBalanced(root: TreeNode | null): boolean {
  const height = (node: TreeNode | null): number => {
    if (node === null) return 0;
//@step
    const left = height(node.left);
    const right = height(node.right);
    if (left < 0 || right < 0 || Math.abs(left - right) > 1) return -1;
    return 1 + Math.max(left, right);
  };
//@step
  return height(root) >= 0;
}`
    },
    check: 'With [1, 2, 2, 3, 3, null, null, 4, 4]: the left 2 has height 3 while the right 2 has height 1, a difference of 2, so the answer is false.',
    complexity: 'O(n) time. O(h) recursion space.',
    tests: [
      { args: [[3, 9, 20, null, null, 15, 7]], expected: true },
      { args: [[1, 2, 2, 3, 3, null, null, 4, 4]], expected: false },
      { args: [[]], expected: true }
    ]
  }, { args: ['tree'], returns: 'value' }),
  treeProblem({
    id: 'binary-tree-level-order-traversal',
    title: 'Binary Tree Level Order Traversal',
    level: 'medium',
    statement: 'Given the root of a binary tree, return the level order traversal of its values: from left to right, level by level, as a list per level. ' + TREE_NODE + '. ' +
      'Example: root = [3,9,20,null,null,15,7] returns [[3],[9,20],[15,7]].',
    signature: { dart: 'class Solution { List<List<int>> levelOrder(TreeNode? root) }', typescript: 'function levelOrder(root: TreeNode | null): number[][]' },
    fn: 'levelOrder',
    asks: 'List the values level by level: [[3], [9, 20], [15, 7]].',
    idea: 'Breadth-first search with a queue. Process the tree one level at a time: the number of nodes in the queue at the start of a round is the size of that level.',
    where: { dart: 'the Solution class, replacing the levelOrder method.', typescript: 'the levelOrder function, replacing its body.' },
    steps: [
      { what: 'open the method, return an empty list for an empty tree, and start a queue with the root', say: 'A queue gives nodes in level order.' },
      { what: 'for each level, take exactly the nodes currently queued, collect their values and queue their children', say: 'Counting the queue first keeps levels separate.' },
      { what: 'add each level\'s values to the result and return it', say: 'Every node is visited once.' }
    ],
    code: {
      dart: `//@step
class Solution {
  List<List<int>> levelOrder(TreeNode? root) {
    final result = <List<int>>[];
    if (root == null) return result;
    var level = <TreeNode>[root];
//@step
    while (level.isNotEmpty) {
      final next = <TreeNode>[];
      for (final node in level) {
        if (node.left != null) next.add(node.left!);
        if (node.right != null) next.add(node.right!);
      }
//@step
      result.add(level.map((n) => n.val).toList());
      level = next;
    }
    return result;
  }
}`,
      typescript: `//@step
function levelOrder(root: TreeNode | null): number[][] {
  const result: number[][] = [];
  if (root === null) return result;
  let level: TreeNode[] = [root];
//@step
  while (level.length > 0) {
    const next: TreeNode[] = [];
    for (const node of level) {
      if (node.left !== null) next.push(node.left);
      if (node.right !== null) next.push(node.right);
    }
//@step
    result.push(level.map((n) => n.val));
    level = next;
  }
  return result;
}`
    },
    check: 'With [3, 9, 20, null, null, 15, 7]: the first level is [3]; its children make [9, 20]; 9 has none and 20 has 15 and 7, making [15, 7]. Result [[3], [9, 20], [15, 7]].',
    complexity: 'O(n) time. O(w) space, where w is the widest level.',
    tests: [
      { args: [[3, 9, 20, null, null, 15, 7]], expected: [[3], [9, 20], [15, 7]] },
      { args: [[1]], expected: [[1]] },
      { args: [[]], expected: [] }
    ]
  }, { args: ['tree'], returns: 'value' }),
  treeProblem({
    id: 'binary-tree-right-side-view',
    title: 'Binary Tree Right Side View',
    level: 'medium',
    statement: 'Given the root of a binary tree, imagine standing on its right side, and return the values of the nodes you can see, from top to bottom. ' + TREE_NODE + '. ' +
      'Example: root = [1,2,3,null,5,null,4] returns [1,3,4]. Example: root = [1,2,3,4,null,null,null,5] returns [1,3,4,5].',
    signature: { dart: 'class Solution { List<int> rightSideView(TreeNode? root) }', typescript: 'function rightSideView(root: TreeNode | null): number[]' },
    fn: 'rightSideView',
    asks: 'List the rightmost node of each level, the ones you see from the right.',
    idea: 'Go level by level with breadth-first search, and take the last node of each level.',
    where: { dart: 'the Solution class, replacing the rightSideView method.', typescript: 'the rightSideView function, replacing its body.' },
    steps: [
      { what: 'open the method with the result and the first level', say: 'I walk the tree one level at a time.' },
      { what: 'for each level, record its last node, then build the next level', say: 'The last node of each level is the one visible from the right.' },
      { what: 'return the recorded values', say: 'Linear time.' }
    ],
    code: {
      dart: `//@step
class Solution {
  List<int> rightSideView(TreeNode? root) {
    final result = <int>[];
    var level = root == null ? <TreeNode>[] : <TreeNode>[root];
//@step
    while (level.isNotEmpty) {
      result.add(level.last.val);
      final next = <TreeNode>[];
      for (final node in level) {
        if (node.left != null) next.add(node.left!);
        if (node.right != null) next.add(node.right!);
      }
      level = next;
    }
//@step
    return result;
  }
}`,
      typescript: `//@step
function rightSideView(root: TreeNode | null): number[] {
  const result: number[] = [];
  let level: TreeNode[] = root === null ? [] : [root];
//@step
  while (level.length > 0) {
    result.push(level[level.length - 1].val);
    const next: TreeNode[] = [];
    for (const node of level) {
      if (node.left !== null) next.push(node.left);
      if (node.right !== null) next.push(node.right);
    }
    level = next;
  }
//@step
  return result;
}`
    },
    check: 'With [1, 2, 3, 4, null, null, null, 5]: the levels are [1], [2, 3], [4] and [5], so the last values are 1, 3, 4 and 5.',
    complexity: 'O(n) time. O(w) space for one level.',
    tests: [
      { args: [[1, 2, 3, null, 5, null, 4]], expected: [1, 3, 4] },
      { args: [[1, 2, 3, 4, null, null, null, 5]], expected: [1, 3, 4, 5] },
      { args: [[]], expected: [] }
    ]
  }, { args: ['tree'], returns: 'value' }),
  treeProblem({
    id: 'validate-binary-search-tree',
    title: 'Validate Binary Search Tree',
    level: 'medium',
    statement: 'Given the root of a binary tree, determine whether it is a valid binary search tree: every node\'s left subtree holds only smaller values, its right subtree only larger values, and both subtrees are valid. ' + TREE_NODE + '. ' +
      'Example: root = [2,1,3] returns true. Example: root = [5,1,4,null,null,3,6] returns false.',
    signature: { dart: 'class Solution { bool isValidBST(TreeNode? root) }', typescript: 'function isValidBST(root: TreeNode | null): boolean' },
    fn: 'isValidBST',
    asks: 'Check that every value on the left of a node is smaller and every value on the right is larger, all the way down.',
    idea: 'Checking only a node against its children is not enough; a deep node can break a rule set higher up. So pass down the allowed range: going left, the upper bound becomes the node\'s value; going right, the lower bound does.',
    where: { dart: 'the Solution class, replacing the isValidBST method.', typescript: 'the isValidBST function, replacing its body.' },
    steps: [
      { what: 'open the method with a helper taking a node and its allowed lower and upper bounds', say: 'Each node must sit strictly inside the range its ancestors allow.' },
      { what: 'return false if the value is outside the range, else check both children with narrowed ranges', say: 'Going left tightens the upper bound, going right the lower one.' },
      { what: 'start with no bounds at the root', say: 'Linear time.' }
    ],
    code: {
      dart: `//@step
class Solution {
  bool isValidBST(TreeNode? root) {
    bool check(TreeNode? node, int? low, int? high) {
      if (node == null) return true;
//@step
      if ((low != null && node.val <= low) || (high != null && node.val >= high)) return false;
      return check(node.left, low, node.val) && check(node.right, node.val, high);
    }
//@step
    return check(root, null, null);
  }
}`,
      typescript: `//@step
function isValidBST(root: TreeNode | null): boolean {
  const check = (node: TreeNode | null, low: number, high: number): boolean => {
    if (node === null) return true;
//@step
    if (node.val <= low || node.val >= high) return false;
    return check(node.left, low, node.val) && check(node.right, node.val, high);
  };
//@step
  return check(root, -Infinity, Infinity);
}`
    },
    check: 'With [5, 1, 4, null, null, 3, 6]: the right child of 5 is 4, which must be greater than 5, so the answer is false.',
    complexity: 'O(n) time. O(h) recursion space.',
    tests: [
      { args: [[2, 1, 3]], expected: true },
      { args: [[5, 1, 4, null, null, 3, 6]], expected: false },
      { args: [[5, 4, 6, null, null, 3, 7]], expected: false },
      { args: [[2, 2, 2]], expected: false }
    ]
  }, { args: ['tree'], returns: 'value' }),
  treeProblem({
    id: 'kth-smallest-in-bst',
    title: 'Kth Smallest Element in a BST',
    level: 'medium',
    statement: 'Given the root of a binary search tree and an integer k, return the kth smallest value (1-indexed) of all node values. ' + TREE_NODE + '. ' +
      'Example: root = [3,1,4,null,2], k = 1 returns 1. Example: root = [5,3,6,2,4,null,null,1], k = 3 returns 3.',
    signature: { dart: 'class Solution { int kthSmallest(TreeNode? root, int k) }', typescript: 'function kthSmallest(root: TreeNode | null, k: number): number' },
    fn: 'kthSmallest',
    asks: 'Find the kth smallest value in a binary search tree.',
    idea: 'An in-order traversal of a binary search tree visits values in sorted order. Walk it iteratively with a stack and stop at the kth node.',
    where: { dart: 'the Solution class, replacing the kthSmallest method.', typescript: 'the kthSmallest function, replacing its body.' },
    steps: [
      { what: 'open the method with a stack and the current node', say: 'In-order means left, node, right, which is sorted for a BST.' },
      { what: 'go left as far as possible, then pop a node and count it, returning it when the count reaches k', say: 'I stop as soon as I reach the kth value.' },
      { what: 'continue with the popped node\'s right subtree', say: 'O(h plus k) time.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int kthSmallest(TreeNode? root, int k) {
    final stack = <TreeNode>[];
    var node = root;
    while (true) {
//@step
      while (node != null) {
        stack.add(node);
        node = node.left;
      }
      final top = stack.removeLast();
      if (--k == 0) return top.val;
//@step
      node = top.right;
    }
  }
}`,
      typescript: `//@step
function kthSmallest(root: TreeNode | null, k: number): number {
  const stack: TreeNode[] = [];
  let node = root;
  while (true) {
//@step
    while (node !== null) {
      stack.push(node);
      node = node.left;
    }
    const top = stack.pop() as TreeNode;
    if (--k === 0) return top.val;
//@step
    node = top.right;
  }
}`
    },
    check: 'With [5, 3, 6, 2, 4, null, null, 1] and k = 3: in-order visits 1, 2, 3, so the third value is 3.',
    complexity: 'O(h + k) time. O(h) space for the stack.',
    tests: [
      { args: [[3, 1, 4, null, 2], 1], expected: 1 },
      { args: [[5, 3, 6, 2, 4, null, null, 1], 3], expected: 3 },
      { args: [[1], 1], expected: 1 }
    ]
  }, { args: ['tree', 'value'], returns: 'value' }),
  treeProblem({
    id: 'subtree-of-another-tree',
    title: 'Subtree of Another Tree',
    level: 'easy',
    statement: 'Given the roots of two binary trees root and subRoot, return true if some node of root has a subtree identical to subRoot in structure and values. ' + TREE_NODE + '. ' +
      'Example: root = [3,4,5,1,2], subRoot = [4,1,2] returns true. Example: root = [3,4,5,1,2,null,null,null,null,0], subRoot = [4,1,2] returns false.',
    signature: { dart: 'class Solution { bool isSubtree(TreeNode? root, TreeNode? subRoot) }', typescript: 'function isSubtree(root: TreeNode | null, subRoot: TreeNode | null): boolean' },
    fn: 'isSubtree',
    asks: 'Check whether the second tree appears, exactly, somewhere inside the first.',
    idea: 'For each node of the big tree, check whether the tree starting there is identical to subRoot, with a same-tree helper. Return true on the first match.',
    where: { dart: 'the Solution class, replacing the isSubtree method.', typescript: 'the isSubtree function, replacing its body.' },
    steps: [
      { what: 'open the method with a helper that checks whether two trees are identical', say: 'Same shape and same values at every position.' },
      { what: 'return false for an empty root, true if the tree here matches', say: 'Every node of the big tree is a possible starting point.' },
      { what: 'otherwise check the left and right subtrees', say: 'O(m times n) in the worst case.' }
    ],
    code: {
      dart: `//@step
class Solution {
  bool isSubtree(TreeNode? root, TreeNode? subRoot) {
    bool same(TreeNode? a, TreeNode? b) {
      if (a == null || b == null) return a == b;
      return a.val == b.val && same(a.left, b.left) && same(a.right, b.right);
    }
//@step
    if (root == null) return false;
    if (same(root, subRoot)) return true;
//@step
    return isSubtree(root.left, subRoot) || isSubtree(root.right, subRoot);
  }
}`,
      typescript: `//@step
function isSubtree(root: TreeNode | null, subRoot: TreeNode | null): boolean {
  const same = (a: TreeNode | null, b: TreeNode | null): boolean => {
    if (a === null || b === null) return a === b;
    return a.val === b.val && same(a.left, b.left) && same(a.right, b.right);
  };
//@step
  if (root === null) return false;
  if (same(root, subRoot)) return true;
//@step
  return isSubtree(root.left, subRoot) || isSubtree(root.right, subRoot);
}`
    },
    check: 'With [3, 4, 5, 1, 2] and [4, 1, 2]: the root 3 does not match, but its left child 4 with children 1 and 2 is identical, so the answer is true.',
    complexity: 'O(m times n) time in the worst case. O(h) recursion space.',
    tests: [
      { args: [[3, 4, 5, 1, 2], [4, 1, 2]], expected: true },
      { args: [[3, 4, 5, 1, 2, null, null, null, null, 0], [4, 1, 2]], expected: false },
      { args: [[1, 1], [1]], expected: true }
    ]
  }, { args: ['tree', 'tree'], returns: 'value' }),
  treeProblem({
    id: 'lowest-common-ancestor-bst',
    title: 'Lowest Common Ancestor of a Binary Search Tree',
    level: 'medium',
    statement: 'Given a binary search tree and two values p and q present in it, return the value of their lowest common ancestor, the deepest node that has both as descendants (a node counts as its own descendant). ' + TREE_NODE + '. ' +
      'Here p and q are given as values. Example: root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 8 returns 6. Example: same tree, p = 2, q = 4 returns 2.',
    signature: { dart: 'class Solution { int lowestCommonAncestor(TreeNode? root, int p, int q) }', typescript: 'function lowestCommonAncestor(root: TreeNode | null, p: number, q: number): number' },
    fn: 'lowestCommonAncestor',
    asks: 'Find the lowest node that has both values below it, or is one of them.',
    idea: 'Use the search tree order. If both values are smaller than the current node, the answer is on the left; if both are larger, on the right. Otherwise the paths split here, so this node is the answer.',
    where: { dart: 'the Solution class, replacing the lowestCommonAncestor method.', typescript: 'the lowestCommonAncestor function, replacing its body.' },
    steps: [
      { what: 'open the method starting at the root', say: 'The ordering tells me which way both values lie.' },
      { what: 'move left while both are smaller and right while both are larger', say: 'Both on one side means the split happens deeper.' },
      { what: 'return the current node\'s value when they split', say: 'O(h) time, no recursion needed.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int lowestCommonAncestor(TreeNode? root, int p, int q) {
    var node = root;
//@step
    while (node != null) {
      if (p < node.val && q < node.val) {
        node = node.left;
      } else if (p > node.val && q > node.val) {
        node = node.right;
      } else {
        return node.val;
      }
    }
//@step
    return -1;
  }
}`,
      typescript: `//@step
function lowestCommonAncestor(root: TreeNode | null, p: number, q: number): number {
  let node = root;
//@step
  while (node !== null) {
    if (p < node.val && q < node.val) node = node.left;
    else if (p > node.val && q > node.val) node = node.right;
    else return node.val;
  }
//@step
  return -1;
}`
    },
    check: 'With p = 2 and q = 4: at 6 both are smaller, so go left to 2. At 2, p equals the node, so the paths split here and the answer is 2.',
    complexity: 'O(h) time. O(1) space.',
    tests: [
      { args: [[6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], 2, 8], expected: 6 },
      { args: [[6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], 2, 4], expected: 2 },
      { args: [[2, 1], 2, 1], expected: 2 }
    ]
  }, { args: ['tree', 'value', 'value'], returns: 'value' }),
  treeProblem({
    id: 'construct-tree-preorder-inorder',
    title: 'Construct Binary Tree from Preorder and Inorder Traversal',
    level: 'medium',
    statement: 'Given two integer arrays preorder and inorder, the preorder and inorder traversals of the same binary tree with unique values, build and return the tree. ' + TREE_NODE + '. ' +
      'Example: preorder = [3,9,20,15,7], inorder = [9,3,15,20,7] returns [3,9,20,null,null,15,7].',
    signature: { dart: 'class Solution { TreeNode? buildTree(List<int> preorder, List<int> inorder) }', typescript: 'function buildTree(preorder: number[], inorder: number[]): TreeNode | null' },
    fn: 'buildTree',
    asks: 'Rebuild the tree from its preorder and inorder listings.',
    idea: 'The first value in preorder is the root. In inorder, everything left of the root is the left subtree and everything right is the right subtree. ' +
      'Take preorder values one by one, and recurse on the matching inorder ranges, using a map from value to inorder index for constant-time lookups.',
    where: { dart: 'the Solution class, replacing the buildTree method.', typescript: 'the buildTree function, replacing its body.' },
    steps: [
      { what: 'open the method with a map from each value to its inorder index and a preorder pointer', say: 'The map makes finding the root in inorder constant time.' },
      { what: 'build recursively: take the next preorder value as the root, then build left from the inorder part before it and right from the part after', say: 'Preorder gives roots in exactly the order I build them.' },
      { what: 'call the builder on the whole inorder range and return the root', say: 'Linear time thanks to the map.' }
    ],
    code: {
      dart: `//@step
class Solution {
  TreeNode? buildTree(List<int> preorder, List<int> inorder) {
    final index = <int, int>{};
    for (var i = 0; i < inorder.length; i++) {
      index[inorder[i]] = i;
    }
    var next = 0;
//@step
    TreeNode? build(int low, int high) {
      if (low > high) return null;
      final value = preorder[next++];
      final mid = index[value]!;
      final node = TreeNode(value);
      node.left = build(low, mid - 1);
      node.right = build(mid + 1, high);
      return node;
    }
//@step
    return build(0, inorder.length - 1);
  }
}`,
      typescript: `//@step
function buildTree(preorder: number[], inorder: number[]): TreeNode | null {
  const index = new Map<number, number>();
  inorder.forEach((v, i) => index.set(v, i));
  let next = 0;
//@step
  const build = (low: number, high: number): TreeNode | null => {
    if (low > high) return null;
    const value = preorder[next++];
    const mid = index.get(value) as number;
    const node = new TreeNode(value);
    node.left = build(low, mid - 1);
    node.right = build(mid + 1, high);
    return node;
  };
//@step
  return build(0, inorder.length - 1);
}`
    },
    check: 'The root is 3, at inorder index 1, so [9] is the left part and [15, 20, 7] the right. The next preorder value 9 becomes the left child. Then 20 roots the right part, with 15 left and 7 right.',
    complexity: 'O(n) time. O(n) space for the map and recursion.',
    tests: [
      { args: [[3, 9, 20, 15, 7], [9, 3, 15, 20, 7]], expected: [3, 9, 20, null, null, 15, 7] },
      { args: [[-1], [-1]], expected: [-1] },
      { args: [[1, 2], [2, 1]], expected: [1, 2] }
    ]
  }, { args: ['value', 'value'], returns: 'tree' }),
  treeProblem({
    id: 'binary-tree-maximum-path-sum',
    title: 'Binary Tree Maximum Path Sum',
    level: 'hard',
    statement: 'A path in a binary tree is a sequence of nodes where each pair of neighbours is joined by an edge; a node appears at most once and the path need not pass through the root. ' +
      'Given the root, return the maximum sum of node values over all non-empty paths. ' + TREE_NODE + '. ' +
      'Example: root = [1,2,3] returns 6. Example: root = [-10,9,20,null,null,15,7] returns 42.',
    signature: { dart: 'class Solution { int maxPathSum(TreeNode? root) }', typescript: 'function maxPathSum(root: TreeNode | null): number' },
    fn: 'maxPathSum',
    asks: 'Find the path, between any two nodes, with the biggest total: in the second example it is 15, 20, 7, adding up to 42.',
    idea: 'For each node, compute the best downward path starting at it: its value plus the better of its two children\'s downward paths, ignoring a child if its path is negative. ' +
      'The best path that peaks at this node uses both sides, so update a global best with value plus both non-negative sides.',
    where: { dart: 'the Solution class, replacing the maxPathSum method.', typescript: 'the maxPathSum function, replacing its body.' },
    steps: [
      { what: 'open the method with a best value and a helper returning the best downward path from a node', say: 'Each node reports one branch upwards and records its own peak path.' },
      { what: 'in the helper, take each child\'s gain or zero if negative, update the best with value plus both gains', say: 'A negative branch would only lower the sum, so it is dropped.' },
      { what: 'return value plus the larger gain, and finally return the best', say: 'Linear time, one pass.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int maxPathSum(TreeNode? root) {
    var best = -(1 << 62);
    int gain(TreeNode? node) {
      if (node == null) return 0;
//@step
      final left = gain(node.left).clamp(0, 1 << 62);
      final right = gain(node.right).clamp(0, 1 << 62);
      if (node.val + left + right > best) best = node.val + left + right;
//@step
      return node.val + (left > right ? left : right);
    }
    gain(root);
    return best;
  }
}`,
      typescript: `//@step
function maxPathSum(root: TreeNode | null): number {
  let best = -Infinity;
  const gain = (node: TreeNode | null): number => {
    if (node === null) return 0;
//@step
    const left = Math.max(gain(node.left), 0);
    const right = Math.max(gain(node.right), 0);
    best = Math.max(best, node.val + left + right);
//@step
    return node.val + Math.max(left, right);
  };
  gain(root);
  return best;
}`
    },
    check: 'With [-10, 9, 20, null, null, 15, 7]: at 20 the gains are 15 and 7, so the path peaking at 20 is 42. At -10, the path would be -10 + 9 + 35 = 34, smaller. Answer 42.',
    complexity: 'O(n) time. O(h) recursion space.',
    tests: [
      { args: [[1, 2, 3]], expected: 6 },
      { args: [[-10, 9, 20, null, null, 15, 7]], expected: 42 },
      { args: [[-3]], expected: -3 }
    ]
  }, { args: ['tree'], returns: 'value' }),
  treeProblem({
    id: 'count-good-nodes',
    title: 'Count Good Nodes in Binary Tree',
    level: 'medium',
    statement: 'Given a binary tree root, a node X is good if on the path from the root to X there is no node with a value greater than X. Return the number of good nodes. ' + TREE_NODE + '. ' +
      'Example: root = [3,1,4,3,null,1,5] returns 4. Example: root = [3,3,null,4,2] returns 3.',
    signature: { dart: 'class Solution { int goodNodes(TreeNode? root) }', typescript: 'function goodNodes(root: TreeNode | null): number' },
    fn: 'goodNodes',
    asks: 'Count the nodes that are at least as large as everything above them on their path from the root.',
    idea: 'Depth-first search, carrying the largest value seen on the path so far. A node is good if its value is at least that maximum; pass the updated maximum to its children.',
    where: { dart: 'the Solution class, replacing the goodNodes method.', typescript: 'the goodNodes function, replacing its body.' },
    steps: [
      { what: 'open the method with a helper taking a node and the path maximum', say: 'The path maximum is all I need to judge a node.' },
      { what: 'count the node if it is at least the maximum, then add the counts from both children with the new maximum', say: 'Each child sees the maximum including its parent.' },
      { what: 'start at the root with its own value as the maximum', say: 'Linear time.' }
    ],
    code: {
      dart: `//@step
class Solution {
  int goodNodes(TreeNode? root) {
    int count(TreeNode? node, int maxSoFar) {
      if (node == null) return 0;
//@step
      final good = node.val >= maxSoFar ? 1 : 0;
      final top = node.val > maxSoFar ? node.val : maxSoFar;
      return good + count(node.left, top) + count(node.right, top);
    }
//@step
    return root == null ? 0 : count(root, root.val);
  }
}`,
      typescript: `//@step
function goodNodes(root: TreeNode | null): number {
  const count = (node: TreeNode | null, maxSoFar: number): number => {
    if (node === null) return 0;
//@step
    const good = node.val >= maxSoFar ? 1 : 0;
    const top = Math.max(maxSoFar, node.val);
    return good + count(node.left, top) + count(node.right, top);
  };
//@step
  return root === null ? 0 : count(root, root.val);
}`
    },
    check: 'With [3, 1, 4, 3, null, 1, 5]: the root 3 is good; 1 is not; the 3 under 1 is good since the path maximum is 3; 4 is good; the 1 under 4 is not; 5 is good. That is 4.',
    complexity: 'O(n) time. O(h) recursion space.',
    tests: [
      { args: [[3, 1, 4, 3, null, 1, 5]], expected: 4 },
      { args: [[3, 3, null, 4, 2]], expected: 3 },
      { args: [[1]], expected: 1 }
    ]
  }, { args: ['tree'], returns: 'value' }),
  {
    id: 'serialize-deserialize-binary-tree',
    title: 'Serialize and Deserialize Binary Tree',
    level: 'hard',
    statement: 'Design an algorithm to serialize a binary tree to a string and deserialize that string back to the same tree. Implement class Codec with String serialize(TreeNode? root) and TreeNode? deserialize(String data). ' +
      'Any format is fine as long as deserialize(serialize(root)) rebuilds the tree. ' + TREE_NODE + '. Example: root = [1,2,3,null,null,4,5] round-trips to [1,2,3,null,null,4,5].',
    signature: { dart: 'class Codec { String serialize(TreeNode? root); TreeNode? deserialize(String data) }', typescript: 'function serialize(root: TreeNode | null): string; function deserialize(data: string): TreeNode | null' },
    asks: 'Turn a tree into a string and back again, so the rebuilt tree is identical.',
    idea: 'Write a preorder traversal with a marker for every missing child, like "1,2,#,#,3,4,#,#,5,#,#". The markers make the shape unambiguous. ' +
      'To rebuild, read the values in the same preorder: a marker means null, otherwise create the node and build its left then right subtree.',
    where: { dart: 'the Codec class, replacing the starter class.', typescript: 'the serialize and deserialize functions, replacing their bodies.' },
    steps: [
      { what: 'write serialize as a preorder walk that outputs # for every null child', say: 'The null markers record the exact shape.' },
      { what: 'write deserialize to split the string and read values in the same order', say: 'Reading in preorder rebuilds the root, then the left subtree, then the right.' },
      { what: 'a # becomes null, any other value a node whose children are built recursively', say: 'Both directions are linear.' }
    ],
    code: {
      dart: `//@step
class Codec {
  String serialize(TreeNode? root) {
    final out = <String>[];
    void walk(TreeNode? node) {
      if (node == null) {
        out.add('#');
        return;
      }
      out.add('\${node.val}');
      walk(node.left);
      walk(node.right);
    }
    walk(root);
    return out.join(',');
  }
//@step
  TreeNode? deserialize(String data) {
    final values = data.split(',');
    var i = 0;
//@step
    TreeNode? build() {
      final v = values[i++];
      if (v == '#') return null;
      final node = TreeNode(int.parse(v));
      node.left = build();
      node.right = build();
      return node;
    }
    return build();
  }
}`,
      typescript: `//@step
function serialize(root: TreeNode | null): string {
  const out: string[] = [];
  const walk = (node: TreeNode | null): void => {
    if (node === null) {
      out.push('#');
      return;
    }
    out.push(String(node.val));
    walk(node.left);
    walk(node.right);
  };
  walk(root);
  return out.join(',');
}
//@step
function deserialize(data: string): TreeNode | null {
  const values = data.split(',');
  let i = 0;
//@step
  const build = (): TreeNode | null => {
    const v = values[i++];
    if (v === '#') return null;
    const node = new TreeNode(Number(v));
    node.left = build();
    node.right = build();
    return node;
  };
  return build();
}`
    },
    check: 'For [1, 2, 3, null, null, 4, 5] the string is "1,2,#,#,3,4,#,#,5,#,#". Reading it back: 1 is the root, 2 is its left child with two nulls, 3 is its right child with 4 and 5 below.',
    complexity: 'O(n) time for both directions. O(n) space for the string.',
    tests: [
      { args: [[1, 2, 3, null, null, 4, 5]], expected: [1, 2, 3, null, null, 4, 5] },
      { args: [[]], expected: [] },
      { args: [[1, null, 2]], expected: [1, null, 2] }
    ],
    verify: {
      dart: NODES.dart + `

void main() {
  final c = Codec();
  print(__c.jsonEncode(fromTree(c.deserialize(c.serialize(toTree([1, 2, 3, null, null, 4, 5]))))));
  print(__c.jsonEncode(fromTree(c.deserialize(c.serialize(toTree([]))))));
  print(__c.jsonEncode(fromTree(c.deserialize(c.serialize(toTree([1, null, 2]))))));
}`,
      typescript: NODES.typescript + `

console.log(JSON.stringify(fromTree(deserialize(serialize(toTree([1, 2, 3, null, null, 4, 5]))))));
console.log(JSON.stringify(fromTree(deserialize(serialize(toTree([]))))));
console.log(JSON.stringify(fromTree(deserialize(serialize(toTree([1, null, 2]))))));`
    },
    run: {
      dart: NODES.dart + `

void main() {
  final c = Codec();
  final text = c.serialize(toTree([1, 2, 3, null, null, 4, 5]));
  print(text); // 1,2,#,#,3,4,#,#,5,#,#
  print(fromTree(c.deserialize(text))); // [1, 2, 3, null, null, 4, 5]
}`,
      typescript: NODES.typescript + `

const text = serialize(toTree([1, 2, 3, null, null, 4, 5]));
console.log(text); // 1,2,#,#,3,4,#,#,5,#,#
console.log(fromTree(deserialize(text))); // [1, 2, 3, null, null, 4, 5]`
    }
  }
];
