// Linked lists. The platform defines ListNode, so solutions never do; the
// tests and Run it blocks define it to run locally (src/bank/helpers.js).
const { structured, design } = require('../helpers');

const LIST_NODE = {
  dart: 'ListNode is defined by the platform: class ListNode { int val; ListNode? next; ListNode([this.val = 0, this.next]); }',
  typescript: 'ListNode is defined by the platform: class ListNode { val: number; next: ListNode | null }'
};

// An item's own verify and run code (for inputs the helper cannot build, like a
// cycle or a list of lists) wins over the generated code.
function listProblem(item, kinds) {
  return { ...structured({ fn: item.fn, tests: item.tests, args: kinds.args, returns: kinds.returns }), ...item };
}

module.exports = [
  listProblem({
    id: 'reverse-linked-list',
    title: 'Reverse Linked List',
    level: 'easy',
    statement: 'Given the head of a singly linked list, reverse the list and return the new head. ' + LIST_NODE.typescript + '. ' +
      'Example: head = [1,2,3,4,5] returns [5,4,3,2,1]. Example: head = [] returns [].',
    signature: { dart: 'class Solution { ListNode? reverseList(ListNode? head) }', typescript: 'function reverseList(head: ListNode | null): ListNode | null' },
    fn: 'reverseList',
    asks: 'Turn the list around so the last node comes first: 1 to 2 to 3 becomes 3 to 2 to 1.',
    idea: 'Walk the list once, pointing each node\'s next back at the previous node. Keep three references: the previous node, the current node, and the next one saved before we overwrite the link.',
    where: { dart: 'the Solution class, replacing the reverseList method.', typescript: 'the reverseList function, replacing its body.' },
    steps: [
      { what: 'open the method with previous set to null and current at the head', say: 'The new tail, the old head, will point to null.' },
      { what: 'for each node, save its next, point it back at previous, then move both forward', say: 'Saving next first means I do not lose the rest of the list.' },
      { what: 'return previous, which is the new head', say: 'One pass, constant space.' }
    ],
    code: {
      dart: `//@step
class Solution {
  ListNode? reverseList(ListNode? head) {
    ListNode? prev;
    var cur = head;
//@step
    while (cur != null) {
      final next = cur.next;
      cur.next = prev;
      prev = cur;
      cur = next;
    }
//@step
    return prev;
  }
}`,
      typescript: `//@step
function reverseList(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null;
  let cur = head;
//@step
  while (cur !== null) {
    const next: ListNode | null = cur.next;
    cur.next = prev;
    prev = cur;
    cur = next;
  }
//@step
  return prev;
}`
    },
    check: 'With 1, 2, 3: node 1 points to null, then node 2 points to 1, then node 3 points to 2. previous ends on 3, giving 3, 2, 1.',
    complexity: 'O(n) time. O(1) space.',
    tests: [
      { args: [[1, 2, 3, 4, 5]], expected: [5, 4, 3, 2, 1] },
      { args: [[1, 2]], expected: [2, 1] },
      { args: [[]], expected: [] }
    ]
  }, { args: ['list'], returns: 'list' }),
  listProblem({
    id: 'merge-two-sorted-lists',
    title: 'Merge Two Sorted Lists',
    level: 'easy',
    statement: 'Given the heads of two sorted linked lists list1 and list2, merge them into one sorted list made by splicing together the nodes of the two lists, and return its head. ' + LIST_NODE.typescript + '. ' +
      'Example: list1 = [1,2,4], list2 = [1,3,4] returns [1,1,2,3,4,4].',
    signature: { dart: 'class Solution { ListNode? mergeTwoLists(ListNode? list1, ListNode? list2) }', typescript: 'function mergeTwoLists(list1: ListNode | null, list2: ListNode | null): ListNode | null' },
    fn: 'mergeTwoLists',
    asks: 'Combine two sorted lists into one sorted list: [1, 2, 4] and [1, 3, 4] become [1, 1, 2, 3, 4, 4].',
    idea: 'Use a dummy starting node and a tail pointer. Repeatedly attach the smaller of the two current heads to the tail and move that list forward. When one list runs out, attach the rest of the other.',
    where: { dart: 'the Solution class, replacing the mergeTwoLists method.', typescript: 'the mergeTwoLists function, replacing its body.' },
    steps: [
      { what: 'open the method with a dummy node and a tail pointer', say: 'A dummy head avoids special cases for the first node.' },
      { what: 'while both lists have nodes, attach the smaller one and advance', say: 'Taking the smaller head each time keeps the result sorted.' },
      { what: 'attach whatever remains and return the node after the dummy', say: 'Linear time and no new nodes, just relinking.' }
    ],
    code: {
      dart: `//@step
class Solution {
  ListNode? mergeTwoLists(ListNode? list1, ListNode? list2) {
    final dummy = ListNode();
    var tail = dummy;
    var a = list1;
    var b = list2;
//@step
    while (a != null && b != null) {
      if (a.val <= b.val) {
        tail.next = a;
        a = a.next;
      } else {
        tail.next = b;
        b = b.next;
      }
      tail = tail.next!;
    }
//@step
    tail.next = a ?? b;
    return dummy.next;
  }
}`,
      typescript: `//@step
function mergeTwoLists(list1: ListNode | null, list2: ListNode | null): ListNode | null {
  const dummy = new ListNode();
  let tail = dummy;
  let a = list1;
  let b = list2;
//@step
  while (a !== null && b !== null) {
    if (a.val <= b.val) {
      tail.next = a;
      a = a.next;
    } else {
      tail.next = b;
      b = b.next;
    }
    tail = tail.next;
  }
//@step
  tail.next = a !== null ? a : b;
  return dummy.next;
}`
    },
    check: 'With [1, 2, 4] and [1, 3, 4]: take 1 from the first, 1 from the second, 2, 3, 4 from the first, then the remaining 4. Result [1, 1, 2, 3, 4, 4].',
    complexity: 'O(m + n) time. O(1) space.',
    tests: [
      { args: [[1, 2, 4], [1, 3, 4]], expected: [1, 1, 2, 3, 4, 4] },
      { args: [[], []], expected: [] },
      { args: [[], [0]], expected: [0] }
    ]
  }, { args: ['list', 'list'], returns: 'list' }),
  listProblem({
    id: 'linked-list-middle',
    title: 'Middle of the Linked List',
    level: 'easy',
    statement: 'Given the head of a singly linked list, return the middle node; if there are two middle nodes, return the second one. ' + LIST_NODE.typescript + '. ' +
      'Example: head = [1,2,3,4,5] returns the node 3 (list [3,4,5]). Example: head = [1,2,3,4,5,6] returns the node 4.',
    signature: { dart: 'class Solution { ListNode? middleNode(ListNode? head) }', typescript: 'function middleNode(head: ListNode | null): ListNode | null' },
    fn: 'middleNode',
    asks: 'Find the middle node of the list in one pass: for 1 to 5 it is 3.',
    idea: 'Use a slow pointer that moves one step and a fast pointer that moves two. When the fast pointer reaches the end, the slow one is in the middle.',
    where: { dart: 'the Solution class, replacing the middleNode method.', typescript: 'the middleNode function, replacing its body.' },
    steps: [
      { what: 'open the method with slow and fast at the head', say: 'Fast moves twice as quickly as slow.' },
      { what: 'move slow one step and fast two steps until fast reaches the end', say: 'When fast has gone the whole way, slow has gone half.' },
      { what: 'return slow', say: 'One pass, no counting needed.' }
    ],
    code: {
      dart: `//@step
class Solution {
  ListNode? middleNode(ListNode? head) {
    var slow = head;
    var fast = head;
//@step
    while (fast != null && fast.next != null) {
      slow = slow!.next;
      fast = fast.next!.next;
    }
//@step
    return slow;
  }
}`,
      typescript: `//@step
function middleNode(head: ListNode | null): ListNode | null {
  let slow = head;
  let fast = head;
//@step
  while (fast !== null && fast.next !== null) {
    slow = (slow as ListNode).next;
    fast = fast.next.next;
  }
//@step
  return slow;
}`
    },
    check: 'With 1 to 6: slow moves 1, 2, 3, 4 while fast moves 1, 3, 5, then past the end. slow stops on 4, the second middle.',
    complexity: 'O(n) time. O(1) space.',
    tests: [
      { args: [[1, 2, 3, 4, 5]], expected: [3, 4, 5] },
      { args: [[1, 2, 3, 4, 5, 6]], expected: [4, 5, 6] },
      { args: [[1]], expected: [1] }
    ]
  }, { args: ['list'], returns: 'list' }),
  listProblem({
    id: 'remove-nth-node-from-end',
    title: 'Remove Nth Node From End of List',
    level: 'medium',
    statement: 'Given the head of a linked list, remove the nth node from the end and return the head. ' + LIST_NODE.typescript + '. ' +
      'Example: head = [1,2,3,4,5], n = 2 returns [1,2,3,5]. Example: head = [1], n = 1 returns [].',
    signature: { dart: 'class Solution { ListNode? removeNthFromEnd(ListNode? head, int n) }', typescript: 'function removeNthFromEnd(head: ListNode | null, n: number): ListNode | null' },
    fn: 'removeNthFromEnd',
    asks: 'Delete the node that is n places from the end: removing the 2nd from the end of 1 to 5 removes 4.',
    idea: 'Start a fast pointer n steps ahead of a slow pointer, both from a dummy node before the head. Move both until fast is at the last node; slow is then just before the node to remove, so skip it.',
    where: { dart: 'the Solution class, replacing the removeNthFromEnd method.', typescript: 'the removeNthFromEnd function, replacing its body.' },
    steps: [
      { what: 'open the method with a dummy before the head and two pointers on it, moving fast n steps ahead', say: 'The gap of n nodes stays fixed as both move.' },
      { what: 'move both until fast is on the last node', say: 'Then slow sits right before the node to delete.' },
      { what: 'skip the next node and return the node after the dummy', say: 'The dummy handles removing the head itself.' }
    ],
    code: {
      dart: `//@step
class Solution {
  ListNode? removeNthFromEnd(ListNode? head, int n) {
    final dummy = ListNode(0, head);
    var slow = dummy;
    var fast = dummy;
    for (var i = 0; i < n; i++) {
      fast = fast.next!;
    }
//@step
    while (fast.next != null) {
      fast = fast.next!;
      slow = slow.next!;
    }
//@step
    slow.next = slow.next!.next;
    return dummy.next;
  }
}`,
      typescript: `//@step
function removeNthFromEnd(head: ListNode | null, n: number): ListNode | null {
  const dummy = new ListNode(0, head);
  let slow = dummy;
  let fast = dummy;
  for (let i = 0; i < n; i++) fast = fast.next as ListNode;
//@step
  while (fast.next !== null) {
    fast = fast.next;
    slow = slow.next as ListNode;
  }
//@step
  slow.next = (slow.next as ListNode).next;
  return dummy.next;
}`
    },
    check: 'With 1 to 5 and n = 2: fast moves 2 ahead to node 2. Both move until fast is on 5, which puts slow on 3. Skipping 3\'s next removes 4, giving [1, 2, 3, 5].',
    complexity: 'O(n) time, one pass. O(1) space.',
    tests: [
      { args: [[1, 2, 3, 4, 5], 2], expected: [1, 2, 3, 5] },
      { args: [[1], 1], expected: [] },
      { args: [[1, 2], 1], expected: [1] },
      { args: [[1, 2], 2], expected: [2] }
    ]
  }, { args: ['list', 'value'], returns: 'list' }),
  listProblem({
    id: 'reorder-list',
    title: 'Reorder List',
    level: 'medium',
    statement: 'Given the head of a list L0 to Ln, reorder it in place to L0, Ln, L1, Ln-1, L2, Ln-2 and so on, changing links, not values. Here the function returns the head for checking. ' + LIST_NODE.typescript + '. ' +
      'Example: head = [1,2,3,4] becomes [1,4,2,3]. Example: head = [1,2,3,4,5] becomes [1,5,2,4,3].',
    signature: { dart: 'class Solution { ListNode? reorderList(ListNode? head) }', typescript: 'function reorderList(head: ListNode | null): ListNode | null' },
    fn: 'reorderList',
    asks: 'Interleave the list from both ends: 1, 2, 3, 4, 5 becomes 1, 5, 2, 4, 3.',
    idea: 'Three classic steps: find the middle with slow and fast pointers, reverse the second half, then merge the two halves by alternating nodes.',
    where: { dart: 'the Solution class, replacing the reorderList method.', typescript: 'the reorderList function, replacing its body.' },
    steps: [
      { what: 'open the method and find the middle with slow and fast pointers', say: 'The first half keeps its order, the second half is consumed from the end.' },
      { what: 'cut the list after the middle and reverse the second half', say: 'Reversing lets me walk the second half from the end forwards.' },
      { what: 'alternate nodes from the two halves, then return the head', say: 'Three linear passes, constant space.' }
    ],
    code: {
      dart: `//@step
class Solution {
  ListNode? reorderList(ListNode? head) {
    if (head == null || head.next == null) return head;
    var slow = head;
    var fast = head;
    while (fast.next != null && fast.next!.next != null) {
      slow = slow.next!;
      fast = fast.next!.next!;
    }
//@step
    ListNode? prev;
    var cur = slow.next;
    slow.next = null;
    while (cur != null) {
      final next = cur.next;
      cur.next = prev;
      prev = cur;
      cur = next;
    }
//@step
    ListNode? first = head;
    var second = prev;
    while (second != null) {
      final a = first!.next;
      final b = second.next;
      first.next = second;
      second.next = a;
      first = a;
      second = b;
    }
    return head;
  }
}`,
      typescript: `//@step
function reorderList(head: ListNode | null): ListNode | null {
  if (head === null || head.next === null) return head;
  let slow: ListNode = head;
  let fast: ListNode = head;
  while (fast.next !== null && fast.next.next !== null) {
    slow = slow.next as ListNode;
    fast = fast.next.next;
  }
//@step
  let prev: ListNode | null = null;
  let cur = slow.next;
  slow.next = null;
  while (cur !== null) {
    const next: ListNode | null = cur.next;
    cur.next = prev;
    prev = cur;
    cur = next;
  }
//@step
  let first: ListNode | null = head;
  let second = prev;
  while (second !== null) {
    const a: ListNode | null = (first as ListNode).next;
    const b: ListNode | null = second.next;
    (first as ListNode).next = second;
    second.next = a;
    first = a;
    second = b;
  }
  return head;
}`
    },
    check: 'With 1 to 5: the middle is 3, so the halves are 1, 2, 3 and 4, 5, which reversed is 5, 4. Alternating gives 1, 5, 2, 4, 3.',
    complexity: 'O(n) time. O(1) space.',
    tests: [
      { args: [[1, 2, 3, 4]], expected: [1, 4, 2, 3] },
      { args: [[1, 2, 3, 4, 5]], expected: [1, 5, 2, 4, 3] },
      { args: [[1]], expected: [1] }
    ]
  }, { args: ['list'], returns: 'list' }),
  listProblem({
    id: 'add-two-numbers',
    title: 'Add Two Numbers',
    level: 'medium',
    statement: 'You are given two non-empty linked lists representing two non-negative integers, with digits stored in reverse order, one digit per node. Add the two numbers and return the sum as a linked list in the same form. ' + LIST_NODE.typescript + '. ' +
      'Example: l1 = [2,4,3], l2 = [5,6,4] returns [7,0,8], because 342 + 465 = 807.',
    signature: { dart: 'class Solution { ListNode? addTwoNumbers(ListNode? l1, ListNode? l2) }', typescript: 'function addTwoNumbers(l1: ListNode | null, l2: ListNode | null): ListNode | null' },
    fn: 'addTwoNumbers',
    asks: 'Add two numbers stored backwards, one digit per node: 342 plus 465 is 807, stored as 7, 0, 8.',
    idea: 'Add digit by digit like on paper, starting from the ones, which come first. Keep a carry. Each new node holds the sum modulo 10, and the carry is the sum divided by 10. Continue while either list or the carry remains.',
    where: { dart: 'the Solution class, replacing the addTwoNumbers method.', typescript: 'the addTwoNumbers function, replacing its body.' },
    steps: [
      { what: 'open the method with a dummy head, a tail and a carry of zero', say: 'The digits are already in the order I add them.' },
      { what: 'while either list has digits or there is a carry, add them, create a node with the last digit and keep the carry', say: 'Just like school addition, column by column.' },
      { what: 'return the node after the dummy', say: 'Linear in the longer list.' }
    ],
    code: {
      dart: `//@step
class Solution {
  ListNode? addTwoNumbers(ListNode? l1, ListNode? l2) {
    final dummy = ListNode();
    var tail = dummy;
    var carry = 0;
    var a = l1;
    var b = l2;
//@step
    while (a != null || b != null || carry > 0) {
      final sum = (a?.val ?? 0) + (b?.val ?? 0) + carry;
      carry = sum ~/ 10;
      tail.next = ListNode(sum % 10);
      tail = tail.next!;
      a = a?.next;
      b = b?.next;
    }
//@step
    return dummy.next;
  }
}`,
      typescript: `//@step
function addTwoNumbers(l1: ListNode | null, l2: ListNode | null): ListNode | null {
  const dummy = new ListNode();
  let tail = dummy;
  let carry = 0;
  let a = l1;
  let b = l2;
//@step
  while (a !== null || b !== null || carry > 0) {
    const sum = (a !== null ? a.val : 0) + (b !== null ? b.val : 0) + carry;
    carry = Math.floor(sum / 10);
    tail.next = new ListNode(sum % 10);
    tail = tail.next;
    a = a !== null ? a.next : null;
    b = b !== null ? b.next : null;
  }
//@step
  return dummy.next;
}`
    },
    check: 'With [2, 4, 3] and [5, 6, 4]: 2 + 5 = 7, 4 + 6 = 10 so write 0 and carry 1, 3 + 4 + 1 = 8. Result [7, 0, 8].',
    complexity: 'O(max(m, n)) time. O(1) extra space besides the result.',
    tests: [
      { args: [[2, 4, 3], [5, 6, 4]], expected: [7, 0, 8] },
      { args: [[0], [0]], expected: [0] },
      { args: [[9, 9, 9, 9], [9, 9]], expected: [8, 9, 0, 0, 1] }
    ]
  }, { args: ['list', 'list'], returns: 'list' }),
  listProblem({
    id: 'linked-list-cycle',
    title: 'Linked List Cycle',
    level: 'easy',
    statement: 'Given the head of a linked list, return true if the list has a cycle, meaning some node can be reached again by following next. Use O(1) memory. ' + LIST_NODE.typescript + '. ' +
      'Here the list is given as values plus pos, the index the last node links back to, or -1 for no cycle. Example: [3,2,0,-4], pos = 1 returns true. Example: [1], pos = -1 returns false.',
    signature: { dart: 'class Solution { bool hasCycle(ListNode? head) }', typescript: 'function hasCycle(head: ListNode | null): boolean' },
    fn: 'hasCycle',
    asks: 'Detect whether following the links ever loops back: in [3, 2, 0, -4] with the tail pointing at index 1, it does.',
    idea: 'Floyd\'s tortoise and hare: a slow pointer moves one step, a fast one two. If there is a cycle, the fast pointer eventually laps the slow one and they meet; if not, the fast pointer reaches the end.',
    where: { dart: 'the Solution class, replacing the hasCycle method.', typescript: 'the hasCycle function, replacing its body.' },
    steps: [
      { what: 'open the method with slow and fast at the head', say: 'Two speeds, no extra memory.' },
      { what: 'advance them, returning true if they ever point at the same node', say: 'In a loop, the faster one catches up from behind.' },
      { what: 'return false when fast reaches the end', say: 'Reaching null means there is no loop.' }
    ],
    code: {
      dart: `//@step
class Solution {
  bool hasCycle(ListNode? head) {
    var slow = head;
    var fast = head;
//@step
    while (fast != null && fast.next != null) {
      slow = slow!.next;
      fast = fast.next!.next;
      if (identical(slow, fast)) return true;
    }
//@step
    return false;
  }
}`,
      typescript: `//@step
function hasCycle(head: ListNode | null): boolean {
  let slow = head;
  let fast = head;
//@step
  while (fast !== null && fast.next !== null) {
    slow = (slow as ListNode).next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
//@step
  return false;
}`
    },
    check: 'With [3, 2, 0, -4] looping back to 2: slow and fast move around the loop 2, 0, -4 and meet after a few steps, so the answer is true.',
    complexity: 'O(n) time. O(1) space.',
    tests: [
      { args: [[3, 2, 0, -4], 1], expected: true },
      { args: [[1, 2], 0], expected: true },
      { args: [[1], -1], expected: false }
    ],
    verify: {
      dart: require('../helpers').NODES.dart + `

ListNode? withCycle(List<int> values, int pos) {
  final head = toLinkedList(values);
  if (pos < 0) return head;
  ListNode? target;
  ListNode? tail;
  var i = 0;
  for (var n = head; n != null; n = n.next) {
    if (i == pos) target = n;
    tail = n;
    i++;
  }
  tail!.next = target;
  return head;
}

void main() {
  final s = Solution();
  print(__c.jsonEncode(s.hasCycle(withCycle([3, 2, 0, -4], 1))));
  print(__c.jsonEncode(s.hasCycle(withCycle([1, 2], 0))));
  print(__c.jsonEncode(s.hasCycle(withCycle([1], -1))));
}`,
      typescript: require('../helpers').NODES.typescript + `

function withCycle(values: number[], pos: number): ListNode | null {
  const head = toLinkedList(values);
  if (pos < 0) return head;
  let target: ListNode | null = null;
  let tail: ListNode | null = null;
  let i = 0;
  for (let n = head; n !== null; n = n.next) {
    if (i === pos) target = n;
    tail = n;
    i++;
  }
  (tail as ListNode).next = target;
  return head;
}

console.log(JSON.stringify(hasCycle(withCycle([3, 2, 0, -4], 1))));
console.log(JSON.stringify(hasCycle(withCycle([1, 2], 0))));
console.log(JSON.stringify(hasCycle(withCycle([1], -1))));`
    },
    run: {
      dart: require('../helpers').NODES.dart + `

void main() {
  final s = Solution();
  final head = toLinkedList([3, 2, 0, -4]);
  head!.next!.next!.next!.next = head.next;
  print(s.hasCycle(head)); // true
  print(s.hasCycle(toLinkedList([1]))); // false
}`,
      typescript: require('../helpers').NODES.typescript + `

const head = toLinkedList([3, 2, 0, -4]) as ListNode;
((head.next as ListNode).next as ListNode).next!.next = head.next;
console.log(hasCycle(head)); // true
console.log(hasCycle(toLinkedList([1]))); // false`
    }
  }, { args: ['list'], returns: 'value' }),
  listProblem({
    id: 'merge-k-sorted-lists',
    title: 'Merge k Sorted Lists',
    level: 'hard',
    statement: 'You are given an array of k linked lists, each sorted in ascending order. Merge them all into one sorted linked list and return it. ' + LIST_NODE.typescript + '. ' +
      'Example: lists = [[1,4,5],[1,3,4],[2,6]] returns [1,1,2,3,4,4,5,6]. Example: lists = [] returns [].',
    signature: { dart: 'class Solution { ListNode? mergeKLists(List<ListNode?> lists) }', typescript: 'function mergeKLists(lists: Array<ListNode | null>): ListNode | null' },
    fn: 'mergeKLists',
    asks: 'Combine k sorted lists into one sorted list: [1, 4, 5], [1, 3, 4] and [2, 6] become [1, 1, 2, 3, 4, 4, 5, 6].',
    idea: 'Merge the lists in pairs, like merge sort: merge list 0 with 1, 2 with 3, and so on, then merge the results, halving the number of lists each round. ' +
      'Each node takes part in log k merges, so the total is n log k, without needing a heap.',
    where: { dart: 'the Solution class, replacing the mergeKLists method.', typescript: 'the mergeKLists function, replacing its body.' },
    steps: [
      { what: 'open the method with a helper that merges two sorted lists', say: 'Merging two sorted lists is the building block.' },
      { what: 'repeatedly merge neighbouring pairs until one list is left', say: 'Pairwise merging halves the lists each round, so there are log k rounds.' },
      { what: 'return the last list, or null if there were none', say: 'n log k time overall.' }
    ],
    code: {
      dart: `//@step
class Solution {
  ListNode? mergeKLists(List<ListNode?> lists) {
    ListNode? merge(ListNode? a, ListNode? b) {
      final dummy = ListNode();
      var tail = dummy;
      while (a != null && b != null) {
        if (a.val <= b.val) {
          tail.next = a;
          a = a.next;
        } else {
          tail.next = b;
          b = b.next;
        }
        tail = tail.next!;
      }
      tail.next = a ?? b;
      return dummy.next;
    }
//@step
    if (lists.isEmpty) return null;
    var current = lists;
    while (current.length > 1) {
      final next = <ListNode?>[];
      for (var i = 0; i < current.length; i += 2) {
        next.add(i + 1 < current.length ? merge(current[i], current[i + 1]) : current[i]);
      }
      current = next;
    }
//@step
    return current[0];
  }
}`,
      typescript: `//@step
function mergeKLists(lists: Array<ListNode | null>): ListNode | null {
  const merge = (a: ListNode | null, b: ListNode | null): ListNode | null => {
    const dummy = new ListNode();
    let tail = dummy;
    while (a !== null && b !== null) {
      if (a.val <= b.val) {
        tail.next = a;
        a = a.next;
      } else {
        tail.next = b;
        b = b.next;
      }
      tail = tail.next;
    }
    tail.next = a !== null ? a : b;
    return dummy.next;
  };
//@step
  if (lists.length === 0) return null;
  let current = lists;
  while (current.length > 1) {
    const next: Array<ListNode | null> = [];
    for (let i = 0; i < current.length; i += 2) {
      next.push(i + 1 < current.length ? merge(current[i], current[i + 1]) : current[i]);
    }
    current = next;
  }
//@step
  return current[0];
}`
    },
    check: 'With three lists: round one merges [1, 4, 5] with [1, 3, 4] into [1, 1, 3, 4, 4, 5] and keeps [2, 6]. Round two merges those into [1, 1, 2, 3, 4, 4, 5, 6].',
    complexity: 'O(n log k) time, where n is the total number of nodes. O(1) extra space besides the list of lists.',
    tests: [
      { args: [[[1, 4, 5], [1, 3, 4], [2, 6]]], expected: [1, 1, 2, 3, 4, 4, 5, 6] },
      { args: [[]], expected: [] },
      { args: [[[]]], expected: [] }
    ],
    verify: {
      dart: require('../helpers').NODES.dart + `

void main() {
  final s = Solution();
  print(__c.jsonEncode(fromLinkedList(s.mergeKLists([toLinkedList([1, 4, 5]), toLinkedList([1, 3, 4]), toLinkedList([2, 6])]))));
  print(__c.jsonEncode(fromLinkedList(s.mergeKLists([]))));
  print(__c.jsonEncode(fromLinkedList(s.mergeKLists([toLinkedList([])]))));
}`,
      typescript: require('../helpers').NODES.typescript + `

console.log(JSON.stringify(fromLinkedList(mergeKLists([toLinkedList([1, 4, 5]), toLinkedList([1, 3, 4]), toLinkedList([2, 6])]))));
console.log(JSON.stringify(fromLinkedList(mergeKLists([]))));
console.log(JSON.stringify(fromLinkedList(mergeKLists([toLinkedList([])]))));`
    },
    run: {
      dart: require('../helpers').NODES.dart + `

void main() {
  final s = Solution();
  print(fromLinkedList(s.mergeKLists([toLinkedList([1, 4, 5]), toLinkedList([1, 3, 4]), toLinkedList([2, 6])]))); // [1, 1, 2, 3, 4, 4, 5, 6]
}`,
      typescript: require('../helpers').NODES.typescript + `

console.log(fromLinkedList(mergeKLists([toLinkedList([1, 4, 5]), toLinkedList([1, 3, 4]), toLinkedList([2, 6])]))); // [1, 1, 2, 3, 4, 4, 5, 6]`
    }
  }, { args: ['value'], returns: 'value' }),
  listProblem({
    id: 'reverse-nodes-in-k-group',
    title: 'Reverse Nodes in k-Group',
    level: 'hard',
    statement: 'Given the head of a linked list and a positive integer k, reverse the nodes k at a time and return the new head. If the number of nodes left at the end is less than k, leave them as they are. Only links may change, not values. ' + LIST_NODE.typescript + '. ' +
      'Example: head = [1,2,3,4,5], k = 2 returns [2,1,4,3,5]. Example: head = [1,2,3,4,5], k = 3 returns [3,2,1,4,5].',
    signature: { dart: 'class Solution { ListNode? reverseKGroup(ListNode? head, int k) }', typescript: 'function reverseKGroup(head: ListNode | null, k: number): ListNode | null' },
    fn: 'reverseKGroup',
    asks: 'Reverse the list in blocks of k, leaving a short last block alone: with k = 3, 1 to 5 becomes 3, 2, 1, 4, 5.',
    idea: 'Keep a pointer to the node before the current group. Check that k nodes remain; if so, reverse those k nodes in place and reconnect the group to the part before and after it. Then move to the next group.',
    where: { dart: 'the Solution class, replacing the reverseKGroup method.', typescript: 'the reverseKGroup function, replacing its body.' },
    steps: [
      { what: 'open the method with a dummy before the head and a pointer to the node before the current group', say: 'The dummy makes reconnecting the first group the same as any other.' },
      { what: 'check that k nodes remain, then reverse them by moving each node to the front of the group', say: 'If fewer than k remain, I stop and leave them.' },
      { what: 'move the group pointer to the end of the reversed group and repeat, then return the head', say: 'Each node is touched a constant number of times, so it is linear.' }
    ],
    code: {
      dart: `//@step
class Solution {
  ListNode? reverseKGroup(ListNode? head, int k) {
    final dummy = ListNode(0, head);
    var before = dummy;
    while (true) {
//@step
      var count = 0;
      for (var n = before.next; n != null && count < k; n = n.next) {
        count++;
      }
      if (count < k) return dummy.next;
      final first = before.next!;
      var cur = first.next;
      for (var i = 1; i < k; i++) {
        final next = cur!.next;
        cur.next = before.next;
        before.next = cur;
        first.next = next;
        cur = next;
      }
//@step
      before = first;
    }
  }
}`,
      typescript: `//@step
function reverseKGroup(head: ListNode | null, k: number): ListNode | null {
  const dummy = new ListNode(0, head);
  let before = dummy;
  while (true) {
//@step
    let count = 0;
    for (let n = before.next; n !== null && count < k; n = n.next) count++;
    if (count < k) return dummy.next;
    const first = before.next as ListNode;
    let cur = first.next;
    for (let i = 1; i < k; i++) {
      const next: ListNode | null = (cur as ListNode).next;
      (cur as ListNode).next = before.next;
      before.next = cur;
      first.next = next;
      cur = next;
    }
//@step
    before = first;
  }
}`
    },
    check: 'With 1 to 5 and k = 2: the first group 1, 2 becomes 2, 1, and the group pointer moves to 1. The next group 3, 4 becomes 4, 3. Only 5 is left, fewer than k, so it stays: 2, 1, 4, 3, 5.',
    complexity: 'O(n) time. O(1) space.',
    tests: [
      { args: [[1, 2, 3, 4, 5], 2], expected: [2, 1, 4, 3, 5] },
      { args: [[1, 2, 3, 4, 5], 3], expected: [3, 2, 1, 4, 5] },
      { args: [[1, 2], 2], expected: [2, 1] }
    ]
  }, { args: ['list', 'value'], returns: 'list' }),
  {
    id: 'lru-cache',
    title: 'LRU Cache',
    level: 'medium',
    statement: 'Design a least recently used cache. LRUCache(int capacity) sets the size; int get(int key) returns the value or -1 if missing; void put(int key, int value) inserts or updates, ' +
      'and if the cache is over capacity, evicts the least recently used key. get and put must run in O(1) average time. ' +
      'Example: LRUCache(2), put(1,1), put(2,2), get(1) returns 1, put(3,3) evicts key 2, get(2) returns -1, put(4,4) evicts key 1, get(1) returns -1, get(3) returns 3, get(4) returns 4.',
    signature: { dart: 'class LRUCache { LRUCache(int capacity); int get(int key); void put(int key, int value) }', typescript: 'class LRUCache { constructor(capacity: number); get(key: number): number; put(key: number, value: number): void }' },
    asks: 'Build a fixed-size cache that throws out the item used longest ago when it is full, with constant-time get and put.',
    idea: 'An insertion-ordered map does both jobs: lookups are constant time, and it remembers order. On every get or put, remove the key and insert it again, so it moves to the newest end. ' +
      'When over capacity, remove the first key, which is the least recently used. In an interview, I would mention this is a hash map plus a doubly linked list under the hood.',
    where: { dart: 'the LRUCache class, replacing the starter class.', typescript: 'the LRUCache class, replacing the starter class.' },
    steps: [
      { what: 'create the class with the capacity and an insertion-ordered map', say: 'The map keeps keys from least to most recently used.' },
      { what: 'get returns -1 if missing, otherwise moves the key to the newest end and returns its value', say: 'Reading a key counts as using it.' },
      { what: 'put removes the key if present, inserts it at the newest end, and evicts the oldest key when over capacity', say: 'The first key in the map is always the least recently used.' }
    ],
    code: {
      dart: `//@step
import 'dart:collection';

class LRUCache {
  final int capacity;
  final _map = LinkedHashMap<int, int>();

  LRUCache(this.capacity);
//@step
  int get(int key) {
    final value = _map.remove(key);
    if (value == null) return -1;
    _map[key] = value;
    return value;
  }
//@step
  void put(int key, int value) {
    _map.remove(key);
    _map[key] = value;
    if (_map.length > capacity) _map.remove(_map.keys.first);
  }
}`,
      typescript: `//@step
class LRUCache {
  private capacity: number;
  private map = new Map<number, number>();

  constructor(capacity: number) {
    this.capacity = capacity;
  }
//@step
  get(key: number): number {
    const value = this.map.get(key);
    if (value === undefined) return -1;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }
//@step
  put(key: number, value: number): void {
    this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.capacity) this.map.delete(this.map.keys().next().value as number);
  }
}`
    },
    check: 'With capacity 2: after put 1 and put 2, get 1 moves 1 to the newest end. put 3 overflows, so the oldest, key 2, is evicted, and get 2 returns -1. put 4 evicts key 1. get 3 and get 4 return 3 and 4.',
    complexity: 'O(1) average time for get and put. O(capacity) space.',
    ...design({
      cls: 'LRUCache',
      ops: ['LRUCache', 'put', 'put', 'get', 'put', 'get', 'put', 'get', 'get', 'get'],
      args: [[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]],
      expected: [null, null, null, 1, null, -1, null, -1, 3, 4]
    })
  }
];
