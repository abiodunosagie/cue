// Algorithms and data structures, the concept questions: asked in screening
// calls and around a coding round, for every role. Sources checked 2026-10-04:
// the common algorithm interview lists (InterviewBit, Tech Interview Handbook
// topics) and senior loops, where the follow-up is always "what is the cost".
module.exports = [
  {
    id: 'algo-big-o',
    roles: ['all'],
    anchors: [],
    level: 'mid',
    question: 'How do you analyse the time and space complexity of an algorithm?',
    variants: [
      'What is Big O notation?',
      'How do you work out the Big O of your code?',
      'Explain time complexity and space complexity.',
      'How do you compare two algorithms that solve the same problem?'
    ],
    answer: `Big O describes how the work grows as the input grows, ignoring constants, so I can compare approaches before running anything. I count the operations that scale with the input: one loop over n items is O(n), a loop inside a loop over the same data is O(n squared), halving the search space each step is O(log n), and sorting is usually O(n log n).

Space is the same idea for memory: extra arrays, maps, or the recursion stack all count, so a recursive function that goes n levels deep uses O(n) space even if it allocates nothing.

I usually state the worst case, and mention the average when they differ, like a hash map lookup that is O(1) on average. Then I think about real sizes: for a list of fifty items, a simpler O(n squared) solution can be the right call, but for millions of rows the growth rate decides everything.`
  },
  {
    id: 'algo-amortized',
    roles: ['all'],
    anchors: [],
    level: 'senior',
    question: 'What is amortized complexity, for example adding to a dynamic array?',
    variants: [
      'Why is pushing to an array O(1) when it sometimes has to resize?',
      'Explain amortized time complexity.',
      'What does amortized O(1) mean?',
      'How can an operation be constant time on average when it is sometimes slow?'
    ],
    answer: `Amortized complexity is the average cost per operation over a long sequence of operations, not a single call. A dynamic array is the classic example. Most appends just write into spare capacity, which is O(1). When it fills up, it allocates a bigger block, usually double the size, and copies everything over, which is O(n) for that one append.

Because the capacity doubles, those expensive copies happen less and less often. If you add up the total copying over n appends it is at most about 2n, so the cost per append averages out to a constant. That is amortized O(1).

It is different from average case, which depends on the input. Amortized is a guarantee over any sequence. The practical point is that one call can still be slow, so for something latency sensitive I would pre-size the array when I know roughly how big it will get.`
  },
  {
    id: 'algo-array-vs-linked-list',
    roles: ['all'],
    anchors: [],
    level: 'mid',
    question: 'What is the difference between an array and a linked list, and when would you use each?',
    variants: [
      'Array or linked list, how do you choose?',
      'What are the trade-offs between arrays and linked lists?',
      'When is a linked list better than an array?',
      'Compare arrays and linked lists for insertion and lookup.'
    ],
    answer: `An array stores elements next to each other in memory, so reading by index is O(1) and scanning is very fast because it is friendly to the CPU cache. The cost is inserting or deleting in the middle, which shifts everything after it, so that is O(n).

A linked list stores each element in its own node with a pointer to the next one. Inserting or removing is O(1) once you hold the node, and the previous node in a singly linked list, and it never needs to resize. But finding the k-th element means walking from the head, which is O(n), and the scattered nodes are slow to scan in practice.

So I use an array by default, because most code reads far more than it inserts in the middle. A linked list earns its place when I need constant time removal of a node I already have, like the doubly linked list inside an LRU cache, or a queue where I only touch the two ends.`
  },
  {
    id: 'algo-hash-table',
    roles: ['all'],
    anchors: [],
    level: 'mid',
    question: 'How does a hash table work, and how does it handle collisions?',
    variants: [
      'How does a hash map give you constant time lookups?',
      'Explain how hashing works inside a dictionary or map.',
      'What happens when two keys hash to the same bucket?',
      'Why can hash table lookups become slow?'
    ],
    answer: `A hash table runs each key through a hash function that turns it into a number, then uses that number to pick a slot in an array. Looking a key up means hashing it again and going straight to the slot, which is why reads and writes are O(1) on average.

Two keys can land in the same slot, which is a collision. One fix is chaining, where each slot holds a small list and you compare keys within it. The other is open addressing, where you probe the next free slot by a fixed rule. Either way, the table tracks its load factor, and when it gets too full it allocates a larger array and rehashes everything, which is the occasional slow insert.

Performance drops toward O(n) when the hash spreads keys badly or the table is overloaded. So keys need a good hash and equality that agree with each other, and keys must not change while they are in the table, or you can never find them again.`
  },
  {
    id: 'algo-binary-search',
    roles: ['all'],
    anchors: [],
    level: 'mid',
    question: 'How does binary search work, and what does it need to be correct?',
    variants: [
      'Explain binary search.',
      'Can you use binary search on a linked list?',
      'When can you apply binary search?',
      'What are the common bugs in binary search?'
    ],
    answer: `Binary search finds a target in sorted data by checking the middle element and throwing away the half that cannot contain it, so it takes O(log n) steps. A million items take about twenty comparisons.

It needs two things: the data must be sorted, or more generally the question must be monotonic, and you need fast access by index. That is why it does not help on a linked list, since reaching the middle is already O(n).

The bugs are almost always at the edges: the loop condition, whether the bounds are inclusive or exclusive, and moving a bound past the middle so the loop always shrinks. I pick one convention and stick to it. The idea goes beyond arrays too: I use it to find the first failing version in a range, or the smallest capacity that satisfies a condition, by searching over the answer instead of over the data.`
  },
  {
    id: 'algo-sorting-compare',
    roles: ['all'],
    anchors: [],
    level: 'mid',
    question: 'Compare quicksort, merge sort and heap sort. Which would you use?',
    variants: [
      'What is the difference between quicksort and merge sort?',
      'Which sorting algorithm is the fastest?',
      'Explain how merge sort and quicksort work.',
      'When would you choose merge sort over quicksort?'
    ],
    answer: `All three are O(n log n) on average, they differ in the worst case, memory and stability.

Quicksort picks a pivot, partitions smaller and larger elements around it and recurses. It sorts in place and is usually the fastest in practice, but a bad pivot on already sorted data drops it to O(n squared), so implementations pick pivots randomly or switch strategy when recursion gets too deep. It is not stable.

Merge sort splits the list in half, sorts each half and merges them. It is always O(n log n) and stable, but it needs O(n) extra memory. It is also the natural choice for linked lists and for data too large for memory.

Heap sort builds a heap and pulls the maximum out repeatedly. It is O(n log n) worst case with O(1) extra memory, but slower in practice because of poor cache behaviour.

In real code I use the language's built-in sort, which is a tuned hybrid. Knowing these tells me when stability or memory matter.`
  },
  {
    id: 'algo-stable-sort',
    roles: ['all'],
    anchors: [],
    level: 'mid',
    question: 'What is a stable sort and why does it matter?',
    variants: [
      'What does it mean for a sorting algorithm to be stable?',
      'When do you need a stable sort?',
      'Why does sort stability matter in a real application?',
      'Is the built-in sort stable, and does it matter?'
    ],
    answer: `A stable sort keeps items with equal keys in the order they had before sorting. If two orders have the same price and the first came before the second, a stable sort by price keeps that order.

It matters when you sort by more than one thing. The common trick is to sort by the secondary key first and then by the primary key, which only works if the second sort is stable. It also matters in user interfaces: if a table sorted by date is re-sorted by status, users expect rows with the same status to stay in date order, not to shuffle.

Merge sort and insertion sort are stable, quicksort and heap sort are not. Some standard library sorts are stable and some are not, so I do not assume it. When the order of ties matters, I make it explicit by comparing a second field, so the result does not depend on the algorithm at all.`
  },
  {
    id: 'algo-recursion',
    roles: ['all'],
    anchors: [],
    level: 'mid',
    question: 'What are the rules of a recursive function, and when would you use iteration instead?',
    variants: [
      'Recursion or iteration, which is better?',
      'What makes a recursive algorithm correct?',
      'What is a stack overflow and how does recursion cause it?',
      'When would you convert recursion into a loop?'
    ],
    answer: `A recursive function needs a base case that stops it, and every recursive call must move closer to that base case, otherwise it never ends. I also make sure the function trusts the smaller call to be right and only handles combining the result.

Recursion is the clearest way to express problems that are naturally nested: trees, nested folders, JSON structures, divide and conquer, backtracking. The code mirrors the shape of the data.

The cost is the call stack. Each call takes a frame, so very deep recursion, like walking a linked list of a hundred thousand nodes, can overflow the stack, and repeated work can explode if the same sub-problem is solved many times. So I switch to iteration with an explicit stack or queue when the depth depends on input size, and I add memoization when the calls overlap. For a balanced tree, recursion is fine because the depth is only log n.`
  },
  {
    id: 'algo-dynamic-programming',
    roles: ['all'],
    anchors: [],
    level: 'senior',
    question: 'What is dynamic programming, and how do you recognise a problem that needs it?',
    variants: [
      'Explain dynamic programming.',
      'What is the difference between memoization and tabulation?',
      'How do you approach a dynamic programming problem?',
      'When should you use dynamic programming?'
    ],
    answer: `Dynamic programming solves a problem by breaking it into overlapping sub-problems, solving each one once and reusing the answer. It applies when two things are true: the best answer can be built from the best answers to smaller versions, and the same smaller versions come up again and again. Counting paths, the longest common subsequence, coin change and knapsack are typical.

I recognise it when a plain recursive solution keeps recomputing the same inputs, or when the question asks for the number of ways, the minimum or the maximum over many choices.

My approach is to define the state in words first, like the best answer using the first i items with capacity c, then the transition between states and the base cases. From there I either memoize the recursion, which is top-down and only computes what is needed, or fill a table bottom-up, which avoids deep recursion and often lets me keep only the last row to save memory.`
  },
  {
    id: 'algo-greedy',
    roles: ['all'],
    anchors: [],
    level: 'senior',
    question: 'What is a greedy algorithm, and how is it different from dynamic programming?',
    variants: [
      'When does a greedy approach work?',
      'Greedy or dynamic programming, how do you decide?',
      'Give an example of a greedy algorithm.',
      'Why can a greedy algorithm give the wrong answer?'
    ],
    answer: `A greedy algorithm makes the choice that looks best right now and never revisits it. Scheduling the most meetings by always taking the one that ends earliest, or Dijkstra always expanding the closest unvisited node, are greedy and provably correct.

The difference from dynamic programming is that greedy commits to one choice, while dynamic programming considers all choices for each sub-problem and keeps the best. Greedy is faster and simpler, but it is only correct when the problem has the property that a locally best choice is always part of some globally best answer.

The classic trap is making change with unusual coin values: always taking the largest coin can miss the smallest number of coins, and that needs dynamic programming. So when I reach for greedy I try to argue why it is safe, or look for a small counterexample. If I find one, I move to dynamic programming.`
  },
  {
    id: 'algo-divide-and-conquer',
    roles: ['all'],
    anchors: [],
    level: 'mid',
    question: 'What is divide and conquer? Give some examples.',
    variants: [
      'Explain the divide and conquer approach.',
      'Which algorithms use divide and conquer?',
      'How does divide and conquer make an algorithm faster?',
      'What is the difference between divide and conquer and dynamic programming?'
    ],
    answer: `Divide and conquer splits a problem into smaller independent pieces of the same kind, solves each piece, usually recursively, and combines the results. Merge sort splits a list in half, sorts both halves and merges them. Binary search is the simplest case, where you only keep one half. Quicksort, fast exponentiation and the closest pair of points work the same way.

It is fast because each level of splitting shrinks the problem, often by half, so the work is spread over about log n levels. That is where the n log n in merge sort comes from.

The difference from dynamic programming is that the pieces do not overlap. In merge sort, each half is sorted exactly once. When the same sub-problem keeps coming back, plain divide and conquer wastes time, and that is the signal to add memoization and treat it as dynamic programming instead.`
  },
  {
    id: 'algo-bfs-dfs',
    roles: ['all'],
    anchors: [],
    level: 'mid',
    question: 'What is the difference between breadth first search and depth first search?',
    variants: [
      'BFS or DFS, when do you use each?',
      'Explain BFS and DFS on a graph.',
      'Which search finds the shortest path in an unweighted graph?',
      'How do you traverse a graph?'
    ],
    answer: `Both visit every reachable node in a graph in O(V plus E) time, they just explore in a different order.

Breadth first search uses a queue and explores level by level: all neighbours of the start, then their neighbours, and so on. That makes it the right tool for the shortest path in an unweighted graph, like the fewest moves on a grid or the degrees of separation between two users.

Depth first search uses a stack or recursion and goes as deep as possible down one branch before backing up. It fits problems about structure: detecting cycles, topological ordering, finding connected components, or exploring every path in a backtracking search.

In both I keep a visited set, otherwise a cycle sends the search round forever. On a huge graph I also think about memory: breadth first search can hold a whole wide level in the queue, while depth first search only holds the current path, but deep recursion can overflow the stack.`
  },
  {
    id: 'algo-dijkstra',
    roles: ['all'],
    anchors: [],
    level: 'senior',
    question: 'How does Dijkstra\'s algorithm find the shortest path, and when does it fail?',
    variants: [
      'Explain Dijkstra\'s algorithm.',
      'How do you find the shortest path in a weighted graph?',
      'Why does Dijkstra not work with negative weights?',
      'What would you use instead of Dijkstra for negative edges?'
    ],
    answer: `Dijkstra finds the shortest distance from one start node to every other node when edge weights are not negative. It keeps a best known distance for each node and a priority queue ordered by that distance. Each step it takes the closest node not yet finished, marks it final, and tries to improve its neighbours' distances through it. With a binary heap that runs in about O(E log V).

It works because once the closest unfinished node is picked, no other path can reach it more cheaply, since every other path would have to go through nodes that are already further away.

That reasoning breaks with negative weights, because a later edge could make a longer looking path cheaper. For negative weights I would use Bellman-Ford, which is slower but also detects negative cycles. For an unweighted graph, plain breadth first search is enough, and on a map with a good distance estimate, A star searches toward the goal and explores far fewer nodes.`
  },
  {
    id: 'algo-topological-sort',
    roles: ['all'],
    anchors: [],
    level: 'senior',
    question: 'What is topological sorting, and where is it used?',
    variants: [
      'How do you order tasks that depend on each other?',
      'Explain topological sort.',
      'How do you detect a cycle in a dependency graph?',
      'How would you work out a build or course order from dependencies?'
    ],
    answer: `A topological sort orders the nodes of a directed graph so every node comes after everything it depends on. It only exists when the graph has no cycles. Build systems, package managers, task schedulers and course prerequisites all use it.

The approach I use most is Kahn's algorithm. I count how many dependencies each node has, put every node with zero into a queue, and repeatedly take one out, add it to the order and reduce the count of the nodes that depend on it, queueing any that reach zero. If I finish with nodes left over, those nodes are in a cycle or blocked by one, which is also how I report a circular dependency.

The other way is a depth first search that adds each node after all its descendants and then reverses the list. Both are O(V plus E). I like Kahn's version for real systems because it also shows which tasks can run in parallel at each step.`
  },
  {
    id: 'algo-heap-priority-queue',
    roles: ['all'],
    anchors: [],
    level: 'mid',
    question: 'What is a heap or priority queue, and what problems does it solve?',
    variants: [
      'When would you use a priority queue?',
      'How would you find the top k elements efficiently?',
      'Explain how a binary heap works.',
      'How do you get the k largest items from a huge list?'
    ],
    answer: `A heap is a tree, usually stored in an array, where every parent is smaller than its children for a min heap, or larger for a max heap. That keeps the smallest or largest element at the top, readable in O(1), while inserting and removing take O(log n) because an element only moves up or down one path.

A priority queue is the abstraction on top: always give me the most urgent item next. I use it for scheduling jobs by priority, for Dijkstra's shortest path, and for merging many sorted lists.

The classic interview use is the top k items. Instead of sorting everything in O(n log n), I keep a min heap of size k: for each item, if it beats the smallest in the heap, I swap it in. That is O(n log k) time and only O(k) memory, which works even when the data is streamed and never fits in memory. For a one-off k-th element on data in memory, quickselect is faster on average.`
  },
  {
    id: 'algo-bst-balanced',
    roles: ['all'],
    anchors: [],
    level: 'mid',
    question: 'What is a binary search tree, and why does it need to stay balanced?',
    variants: [
      'Explain binary search trees.',
      'What happens to a BST when you insert sorted data?',
      'What are balanced trees like AVL or red-black trees for?',
      'How do database indexes relate to trees?'
    ],
    answer: `A binary search tree keeps every node's left subtree smaller and its right subtree larger, so searching, inserting and deleting walk one path from the root. That costs the height of the tree, and an in-order traversal gives the values sorted for free.

The catch is the height. If you insert already sorted data into a plain tree, every node goes to the right and the tree becomes a linked list, so operations degrade from O(log n) to O(n).

Balanced trees fix that by restructuring with rotations as you insert and delete. AVL trees keep the heights very tight, red-black trees allow a little more slack in exchange for cheaper updates, and both guarantee O(log n). That is why sorted maps in standard libraries use them. Databases go one step further with B-trees, which store many keys per node so the tree stays very shallow and each level is one disk page read.`
  },
  {
    id: 'algo-trie',
    roles: ['all'],
    anchors: [],
    level: 'mid',
    question: 'What is a trie, and when would you use one?',
    variants: [
      'How would you implement autocomplete efficiently?',
      'Explain the trie or prefix tree data structure.',
      'Trie or hash map for storing words?',
      'How do you search for all words with a given prefix?'
    ],
    answer: `A trie, or prefix tree, stores strings one character per level. Each node holds its children by character and a flag that marks the end of a word. Words that share a prefix share the same path, so looking up a word or a prefix costs the length of the string, not the number of words stored.

Its strength is prefix questions: autocomplete, finding every word that starts with something, spell checking, or matching routes and IP prefixes. To autocomplete, I walk down to the node for the prefix and collect the words below it, often keeping the most popular completions cached at each node so suggestions come back instantly.

The trade-off is memory, because every node carries a map of children. If I only need exact lookups, a hash set is simpler and smaller. I reach for a trie when prefixes are the actual question, or I use a compressed version that merges single-child chains to save space.`
  },
  {
    id: 'algo-two-pointers-sliding-window',
    roles: ['all'],
    anchors: [],
    level: 'mid',
    question: 'What are the two pointer and sliding window techniques?',
    variants: [
      'Explain the sliding window technique.',
      'How do two pointers make a solution faster?',
      'How do you find the longest substring without repeating characters efficiently?',
      'When do you use a sliding window?'
    ],
    answer: `Both turn a brute force O(n squared) scan of pairs or ranges into a single O(n) pass by moving indexes intelligently instead of trying every combination.

With two pointers, I usually start one at each end of a sorted array and move them toward each other based on what I see. Finding a pair that sums to a target works this way: if the sum is too small, move the left pointer right, if too big, move the right pointer left. Another form is a fast and a slow pointer, which finds the middle of a linked list or detects a cycle.

A sliding window keeps a range of the array that I grow from the right and shrink from the left while keeping some condition true, like no repeated characters or a sum below a limit. I track the window's contents in a counter or a map, so each element enters and leaves the window once. Whenever a question asks for the longest or shortest contiguous range meeting a rule, I try a sliding window first.`
  },
  {
    id: 'algo-backtracking',
    roles: ['all'],
    anchors: [],
    level: 'senior',
    question: 'What is backtracking, and how do you keep it from being too slow?',
    variants: [
      'Explain backtracking with an example.',
      'How would you generate all permutations or subsets?',
      'How do you solve a sudoku or N queens with backtracking?',
      'What is pruning in a backtracking search?'
    ],
    answer: `Backtracking builds a solution one choice at a time and undoes the last choice when it leads nowhere. It is a depth first search over the tree of possible choices. Generating subsets and permutations, N queens, sudoku and word search all fit it.

The shape is always the same: if the partial solution is complete, record it, otherwise loop over the possible next choices, make one, recurse, then undo it before trying the next. Undoing on the way back lets me reuse one buffer instead of copying it at every step.

The danger is that the number of combinations explodes, so the work is in pruning: checking constraints as early as possible so whole branches are never explored. In N queens I track used columns and diagonals in sets so a bad placement is rejected immediately. I also order choices so the most constrained ones come first, and skip duplicates when the input has repeated values. Good pruning is the difference between instant and never finishing.`
  },
  {
    id: 'algo-union-find',
    roles: ['all'],
    anchors: [],
    level: 'senior',
    question: 'What is union-find, and what problems does it solve?',
    variants: [
      'Explain the disjoint set union data structure.',
      'How do you check if two nodes are connected as edges keep being added?',
      'How do you count connected components efficiently?',
      'What is union by rank and path compression?'
    ],
    answer: `Union-find, or disjoint set union, tracks a collection of items split into groups and answers two questions fast: which group is this item in, and merge these two groups. Each item points to a parent, and the root of each tree represents the group.

Two tricks make it nearly constant time per operation. Path compression makes every node on a lookup path point straight at the root, so later lookups are short. Union by rank or size always attaches the smaller tree under the larger, so trees stay shallow.

I use it when connections arrive over time and I need to keep asking whether two things are connected: counting connected components, detecting a cycle while adding edges to an undirected graph, Kruskal's minimum spanning tree, or merging accounts that share an email. For a single connectivity question on a fixed graph, a breadth first search is just as good, but union-find shines when edges keep coming.`
  },
  {
    id: 'algo-graph-representation',
    roles: ['all'],
    anchors: [],
    level: 'mid',
    question: 'How do you represent a graph in code, adjacency list or adjacency matrix?',
    variants: [
      'Adjacency list or adjacency matrix, which do you use?',
      'How would you store a graph in memory?',
      'What are the trade-offs between graph representations?',
      'How do you model relationships like followers or road networks in code?'
    ],
    answer: `An adjacency list stores, for each node, the list of its neighbours, usually in a map from node to a list or set. It uses memory proportional to the number of nodes plus edges, and iterating a node's neighbours only touches the ones that exist. Since most real graphs, like social networks or road maps, are sparse, this is my default.

An adjacency matrix is a V by V grid where a cell says whether an edge exists, or holds its weight. Checking one specific edge is O(1), but it always uses V squared memory and scanning neighbours costs V even for a node with one edge. It suits small or very dense graphs, and some algorithms like Floyd-Warshall are written naturally on it.

I also pick the edge form to match the questions I will ask: a set of neighbours if I need fast edge checks on a sparse graph, or a plain list of edges if the algorithm, like Kruskal, sorts edges globally.`
  },
  {
    id: 'algo-lru-cache',
    roles: ['all'],
    anchors: [],
    level: 'senior',
    question: 'How would you design an LRU cache with constant time operations?',
    variants: [
      'Implement a least recently used cache.',
      'How do you make both get and put O(1) in an LRU cache?',
      'Which data structures would you combine to build an LRU cache?',
      'How does a cache decide what to evict?'
    ],
    answer: `An LRU cache has a fixed capacity and, when it is full, evicts the item that was used least recently. To make both get and put O(1), I combine two structures.

A hash map from key to node gives constant time lookup. A doubly linked list keeps the nodes in order of use, most recent at the front and least recent at the back. On a get, I find the node through the map and move it to the front, which is O(1) because I can unlink a node from a doubly linked list without walking it. On a put, I either update and move the existing node, or add a new node at the front, and if that exceeds capacity I remove the node at the back and delete its key from the map.

Dummy head and tail nodes remove the edge cases around empty lists. In some languages an ordered map does the same job. In production I also think about thread safety and whether LRU suits the access pattern, since one large scan can push out everything that was hot.`
  },
  {
    id: 'algo-stack-queue',
    roles: ['all'],
    anchors: [],
    level: 'mid',
    question: 'What are stacks and queues used for, and how would you build a queue from two stacks?',
    variants: [
      'What is the difference between a stack and a queue?',
      'Implement a queue using two stacks.',
      'When would you use a stack in an algorithm?',
      'Give real examples of stacks and queues.'
    ],
    answer: `A stack is last in, first out, and a queue is first in, first out. Both give O(1) push and pop at their ends.

Stacks show up whenever something must be undone or matched in reverse order: the call stack, undo history, checking balanced brackets, evaluating expressions, and iterative depth first search. Queues fit anything processed in arrival order: breadth first search, task and job queues, and buffering requests.

To build a queue from two stacks, I push new items onto an input stack. When I need to dequeue, if the output stack is empty, I pop everything from the input stack onto the output stack, which reverses the order, then pop from the output stack. Each item moves between the stacks only once, so although one dequeue can be slow, the amortized cost per operation is O(1). A related trick is the monotonic stack, which keeps elements in sorted order to find the next greater element for every item in one pass.`
  },
  {
    id: 'algo-quickselect',
    roles: ['all'],
    anchors: [],
    level: 'senior',
    question: 'How do you find the k-th largest element without sorting the whole array?',
    variants: [
      'Explain quickselect.',
      'What is the fastest way to find the median of an unsorted array?',
      'How do you find the k-th smallest number efficiently?',
      'Can you find the k-th largest element in linear time?'
    ],
    answer: `I have two good options depending on the situation.

If the data is in memory and I need it once, quickselect. It uses the same partition step as quicksort: pick a pivot, move larger values to one side and smaller to the other, and see where the pivot lands. If that position is k, I am done, otherwise I recurse into only the side that contains position k. Because I throw away half the work each time, the average is O(n), though a run of bad pivots can make it O(n squared), so I choose pivots randomly.

If the data streams in, or k is small compared to n, I keep a min heap of size k. Every element bigger than the heap's smallest replaces it, and at the end the top of the heap is the k-th largest. That is O(n log k) time and O(k) memory.

Sorting first is O(n log n), simpler, and fine for small inputs, so I mention it as the baseline before optimising.`
  },
  {
    id: 'algo-bit-manipulation',
    roles: ['all'],
    anchors: [],
    level: 'mid',
    question: 'Where is bit manipulation useful, and what tricks do you know?',
    variants: [
      'Explain bitwise operators and when you would use them.',
      'How do you check if a number is a power of two?',
      'How can XOR find the number that appears once?',
      'What are bit masks used for?'
    ],
    answer: `Bit manipulation works directly on the binary form of integers, which makes some operations very cheap and compact.

The tricks I use most: x and x minus 1 clears the lowest set bit, so a number is a power of two when that result is zero and the number is positive. XOR cancels equal values, so XOR of every element finds the one value that appears an odd number of times, with no extra memory. Shifting left or right multiplies or divides by powers of two.

In real systems the main use is bit masks: storing a set of flags or permissions in one integer, where each bit means one permission and checking is a single and operation. It also represents subsets in algorithms, where each of n bits says whether an item is included, which lets dynamic programming iterate over all subsets of a small set.

I keep it readable with named constants, because a clever bit trick that nobody can maintain is not worth the saving.`
  },
  {
    id: 'algo-bloom-filter',
    roles: ['all'],
    anchors: [],
    level: 'senior',
    question: 'What is a Bloom filter and when would you use one?',
    variants: [
      'Explain probabilistic data structures like Bloom filters.',
      'How can you check membership in a huge set with little memory?',
      'What are false positives in a Bloom filter?',
      'Where are Bloom filters used in real systems?'
    ],
    answer: `A Bloom filter answers "have I possibly seen this item?" using very little memory. It is a bit array plus a few hash functions. Adding an item sets the bits at each hash position, and checking an item looks at those same bits. If any bit is zero, the item was definitely never added. If all are one, it was probably added, because other items might have set the same bits.

So it can give false positives but never false negatives, and you size the array and the number of hashes for the false positive rate you can accept. A standard filter also cannot delete items.

It is useful as a cheap check in front of something expensive. Databases use it to skip reading files that cannot contain a key, a crawler can skip URLs it has likely visited, and a service can quickly rule out usernames that are definitely free before hitting the database. The design rule is that a false positive must only cost an extra real lookup, never a wrong answer.`
  },
  {
    id: 'algo-interview-approach',
    roles: ['all'],
    anchors: [],
    level: 'senior',
    question: 'How do you approach an algorithm problem you have never seen before?',
    variants: [
      'Walk me through how you solve a coding problem in an interview.',
      'What do you do when you are stuck on an algorithm question?',
      'How do you go from a brute force solution to an optimal one?',
      'How do you think through a new coding challenge?'
    ],
    answer: `I start by making sure I understand the problem: I restate it, ask about input sizes, edge cases like empty input or duplicates, and what to return, and I walk through a small example by hand.

Then I state the brute force solution with its complexity, even if it is slow, so we agree on a baseline. From there I look for the bottleneck. If I am searching repeatedly, a hash map or sorting might remove a loop. If I am checking every range, a sliding window or prefix sums might. If the same sub-problem repeats, dynamic programming. If it is about connections, a graph search.

Once I have a plan I check it on the example before coding, then write clean code with clear names, and finally test it with the normal case and the edge cases, and state the final time and space complexity. When I am stuck, I talk through my thinking so the other person can follow and steer me.`
  },
  {
    id: 'algo-np-hard',
    roles: ['all'],
    anchors: [],
    level: 'senior',
    question: 'What do you do when a problem has no known efficient algorithm?',
    variants: [
      'What does NP-complete mean in practice?',
      'How do you handle an optimisation problem that is too slow to solve exactly?',
      'What are approximation algorithms and heuristics?',
      'How would you solve a travelling salesman style problem in production?'
    ],
    answer: `Some problems, like the travelling salesman or job shop scheduling, are NP-hard: no known algorithm solves every instance quickly, and the exact search grows exponentially. Recognising that early matters, because it changes the goal from perfect to good enough.

In practice I look at three things. First, is the real input small or structured? Exact methods like dynamic programming or a pruned search can be fine for twenty items, or when the data has special structure. Second, can I accept a near-optimal answer? Greedy heuristics and local search that keeps improving a solution often get close to optimal quickly, and some approximation algorithms come with a proven bound. Third, can I use an existing solver for routing or scheduling instead of writing my own.

For something like delivery routing, I would usually start with a greedy plan, improve it with local swaps under a time limit, and measure the result against the business cost, not against theoretical optimality.`
  }
];
