// Technical writing and structured feedback, and software development
// fundamentals that the other files do not already cover (complexity, hash
// tables, recursion, SOLID, deadlocks and concurrency versus parallelism live
// elsewhere).
// Same roles as the review answers: front end and back end interviews.
module.exports = [
  {
    id: 'writing-structured-feedback',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'mid',
    question: 'How do you give structured feedback on someone\'s code or solution?',
    variants: [
      'How do you write feedback on a submission?',
      'How do you structure a review write up?',
      'How do you give written feedback that is useful?',
      'How would you explain what is wrong with a solution in writing?',
      'How do you write feedback for a developer whose code has a bug?'
    ],
    answer: `I start with a one line verdict, so the reader knows where they stand: correct, correct with issues, or incorrect.

Then the findings, most serious first. Each one has four parts: where it is, the file and line or the function; what is wrong, in one plain sentence; the evidence, an input that produces the wrong result or the rule in the spec it breaks; and what correct looks like or a suggested fix.

After the problems, I say briefly what is good, when it is genuinely good, because it tells the author what to keep doing. And I separate must fix from optional, so style suggestions do not compete with a real bug.

The tone is about the code, never the person, and every claim is checkable. "This fails when the list is empty, it reads index zero on line 12" is feedback someone can act on. "This feels fragile" is not, so I do not write it without the reason behind it.`
  },
  {
    id: 'writing-bug-report',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'mid',
    question: 'How do you write a good bug report?',
    variants: [
      'What goes into a useful bug ticket?',
      'How do you report an issue so a developer can fix it quickly?',
      'What makes a bug report bad?',
      'How do you document a defect?'
    ],
    answer: `A good bug report lets someone reproduce the problem without asking me anything.

It has a specific title that names the symptom and where it happens, not "checkout broken" but "checkout total ignores the discount code when the cart has one item". Then the steps to reproduce, numbered and minimal, starting from a known state. Then expected result and actual result, side by side, because the gap between them is the bug.

Then the context: environment, version or commit, browser or device, the account or data used, and how often it happens. Error messages and logs as text, a screenshot or recording when the problem is visual.

If I have investigated, I add what I found, clearly marked as a finding or a guess, plus the impact: how many users, whether data or money is affected. That decides priority.

The common failures are vague titles, missing steps, and a theory of the cause instead of the observed facts.`
  },
  {
    id: 'writing-justify-rating',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'mid',
    question: 'How do you write a clear justification for a rating or a decision?',
    variants: [
      'How do you explain why you scored a response the way you did?',
      'How do you write a rationale for a technical decision?',
      'How do you justify a verdict in writing?',
      'How do you make your reasoning easy to follow on paper?'
    ],
    answer: `I lead with the conclusion, then give the reasons that actually decided it, then the evidence for each reason.

For a rating, that means the score first, then the one or two things that moved it most, each tied to something checkable: the requirement it meets or misses, the input where it fails, the line that causes it. If it lost points, the reader should be able to point to exactly why. If it is better than another answer, I name the specific difference rather than saying it is clearer or more complete.

I keep it proportional. A minor style issue does not get the same space as a wrong result, and I do not pad with every small observation.

I write it so someone who did not see my screen could reach the same verdict from the same evidence. Consistency matters too: the same problem gets the same treatment every time, so I apply the rubric, not my mood.`
  },
  {
    id: 'writing-compare-solutions',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'mid',
    question: 'Given two solutions to the same problem, how do you decide which is better?',
    variants: [
      'How do you compare two responses to a coding question?',
      'How would you rank two implementations?',
      'What criteria do you use to compare code?',
      'Two answers both work, how do you pick one?'
    ],
    answer: `Correctness comes first and settles most comparisons. I check both against the requirements and the edge cases. A shorter or nicer solution that fails one case loses to a plain one that is right.

If both are correct, I compare what the task cares about. Did it answer exactly what was asked, without changing the requirement or adding things nobody asked for? Complexity, when the input can be large. Then clarity: could the next engineer understand and change it safely? Error handling for real failure cases. And whether it uses the language and libraries properly, rather than reinventing them or calling something that does not exist.

For written answers I also check honesty: an explanation that claims something the code does not do is worse than a shorter accurate one.

Then I write the decision with the deciding difference stated plainly, for example "both pass, but A is linear and B is quadratic on the stated input size", so the choice is checkable.`
  },
  {
    id: 'writing-clear-technical',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'mid',
    question: 'What makes technical writing clear?',
    variants: [
      'How do you write good technical documentation or explanations?',
      'How do you improve your technical writing?',
      'How do you write for other developers?',
      'What are the principles of good technical communication?'
    ],
    answer: `Knowing the reader and what they need to do after reading. A developer integrating an API needs the request, the response and the errors. A manager needs the impact and the decision.

Then the structure: the main point first, details after. Short sentences, one idea each. Concrete examples instead of abstract descriptions, because one real request and response explains more than a paragraph.

Precise words, used consistently. If I call it an account in one place, it is not a wallet or a user in the next. I define terms the reader may not know and drop the ones that only sound impressive.

I cut what does not help: filler, repetition, hedging. Steps go in numbered order, code goes in code blocks, and anything the reader must not miss, like a breaking change, is stated plainly near the top.

Finally I reread it as the reader, or ask someone else to follow it, because the gaps are invisible to the person who already knows the answer.`
  },
  {
    id: 'writing-pr-description',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'mid',
    question: 'How do you write a good pull request description and commit messages?',
    variants: [
      'What goes into a pull request description?',
      'What makes a good commit message?',
      'How do you make your changes easy to review?',
      'How do you describe a change for reviewers?'
    ],
    answer: `The description answers three questions: why this change exists, what it changes, and how the reviewer can check it.

Why is the problem or ticket in a sentence or two, including the root cause for a bug fix. What is the approach and any decision a reviewer might question, with the alternative I rejected and why. How to check is the tests I added, the steps to try it, and screenshots for anything visual. I also call out risk: a migration, a changed API, anything that needs care when deploying.

I keep pull requests small and about one thing, so the description stays short and the review is real instead of a skim.

Commit messages follow the same idea: a short summary line in the imperative, like "fix double charge on retried payments", then a body that explains why when it is not obvious. The diff already shows what changed; the message should explain what the diff cannot.`
  },
  {
    id: 'writing-explain-non-technical',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'mid',
    question: 'How do you explain a technical problem to a non-technical person?',
    variants: [
      'How do you communicate with non-technical stakeholders?',
      'How would you explain an outage to a client?',
      'How do you explain technical trade-offs to a manager?',
      'How do you avoid jargon when you explain your work?'
    ],
    answer: `I start from what they care about, which is almost never the mechanism. For an outage that is what happened to their users, whether data or money is affected, whether it is fixed, and what stops it happening again.

I use their words, not mine. Not "a race condition in the payment webhook", but "when two payment confirmations arrived at the same moment, a few customers were charged twice". If a comparison helps, I use one from their world.

For a decision, I give the options as outcomes: this one ships in a week but needs more work later, that one takes three weeks and holds up as you grow. Then my recommendation and why, and what I need from them.

I keep it short, I say clearly what I know and what I do not know yet, and I give a time for the next update. Being honest early about a problem builds more trust than a polished explanation later.`
  },
  {
    id: 'fund-data-structure-choice',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'mid',
    question: 'How do you choose the right data structure for a problem?',
    variants: [
      'When would you use a hash map, a set, a list or a tree?',
      'How do you pick between a list, a map and a set?',
      'How do data structures affect performance?',
      'Which data structure would you use for fast lookups?'
    ],
    answer: `I look at the operations the code does most and pick the structure that makes those cheap.

An array or list is the default for ordered data I iterate over or index by position. Appending is cheap, inserting or removing in the middle is linear. A linked list makes inserts and removals cheap once you hold the node, but has no fast indexing and poor cache use, so in practice I rarely need one.

A hash map gives constant time lookups by key on average, and a set does the same for "have I seen this", which turns many quadratic loops into linear ones. Neither keeps order unless the language guarantees insertion order.

When I need sorted order with fast inserts, or range queries, a balanced tree or a sorted structure fits. For "always give me the smallest or largest next", a heap or priority queue. A queue for breadth first work, a stack for depth first or undo.

Then I check memory and the real input size before choosing anything clever.`
  },
  {
    id: 'fund-oop-principles',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'mid',
    question: 'What are the main principles of object oriented programming?',
    variants: [
      'Explain encapsulation, inheritance and polymorphism.',
      'What is the difference between abstraction and encapsulation?',
      'Why prefer composition over inheritance?',
      'How do you use object oriented design in practice?'
    ],
    answer: `There are four usually named.

Encapsulation keeps an object's data private and exposes behaviour through methods, so the rules about that data live in one place. An account controls its own balance; nothing outside sets it directly.

Abstraction means callers depend on what something does, not how. A payment gateway interface with a charge method hides whether it is one provider or another.

Inheritance lets a class reuse and extend another. Polymorphism lets different types be used through the same interface, so code calls charge without knowing which gateway it has.

In practice I lean on encapsulation, abstraction through interfaces, and polymorphism, and I use inheritance sparingly. Deep inheritance trees couple classes tightly and break when the base class changes. Composition, building an object from smaller objects it holds, is usually more flexible and easier to test, because I can swap a part without touching a hierarchy.`
  },
  {
    id: 'fund-value-vs-reference',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'mid',
    question: 'What is the difference between passing by value and passing by reference?',
    variants: [
      'Why can a function change an object its caller passed in?',
      'Why did changing an object inside a function change it outside too?',
      'What does it mean that objects are passed by reference?',
      'How are objects passed to functions?'
    ],
    answer: `Passing by value gives the function its own copy, so changes inside do not affect the caller. Passing by reference gives it access to the same data, so changes are visible outside.

Most languages I use pass a copy of a reference for objects. The function cannot replace the caller's variable, but it can mutate the object both point to. That is the classic bug: a function that "just sorts" a list it received changes the caller's list too.

Related is the stack and heap. Local primitive values and call frames live on the stack, which is fast and freed when the function returns. Objects whose size or lifetime is not known in advance live on the heap, managed by a garbage collector or by ownership rules the compiler checks.

And a shallow copy duplicates the outer object but shares the nested ones, while a deep copy duplicates everything. When I need to avoid surprises, I prefer immutable data or explicit copies.`
  },
  {
    id: 'fund-static-dynamic-typing',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'mid',
    question: 'What are the differences between static and dynamic typing, and compiled and interpreted languages?',
    variants: [
      'What are the pros and cons of static typing?',
      'Is Python compiled or interpreted?',
      'What is the difference between strong and weak typing?',
      'Why do teams move to typed languages?'
    ],
    answer: `Static typing checks types before the program runs, so a whole class of mistakes, like passing a string where a number is expected or calling a method that does not exist, is caught at compile time and the editor can help with refactors. Dynamic typing checks at runtime, which is faster to write and flexible, but those mistakes surface only when that line runs.

Strong versus weak is a different axis: how much a language converts types silently. Adding a number to a string quietly in one language is an error in another.

Compiled versus interpreted is about execution, and the line is blurry today. Rust and C plus plus compile ahead of time to machine code. Java and C sharp compile to bytecode that a virtual machine compiles further at runtime. Python compiles to bytecode and interprets it. JavaScript engines compile hot code on the fly.

Teams move to types as codebases and teams grow, because the compiler becomes documentation that cannot go out of date.`
  },
  {
    id: 'fund-errors-exceptions-results',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'mid',
    question: 'What are the different ways to handle errors, like exceptions versus returning errors?',
    variants: [
      'Exceptions or result types, which do you prefer?',
      'How should a function signal that it failed?',
      'When should you catch an exception?',
      'What is wrong with swallowing errors?'
    ],
    answer: `Exceptions jump up the call stack until something catches them. They keep the happy path clean, but the signature does not tell you what can fail, so it is easy to forget a case.

Returning errors as values, like a result type, makes failure part of the signature. The caller has to deal with it, which is more verbose but very explicit, and languages with good syntax for passing an error up keep it short.

Whichever the language uses, the rules are the same. Expected failures, like invalid input or a missing record, are part of the normal design and handled close to where they happen. Unexpected ones, like a bug, should fail loudly and be logged with context.

The worst pattern is catching everything and continuing, or returning null silently, because the failure then shows up far away as wrong data. I catch only where I can do something useful: retry, return a clear error to the user, or add context and pass it on.`
  },
  {
    id: 'fund-floating-point-money',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'mid',
    question: 'Why does 0.1 plus 0.2 not equal 0.3, and how should you store money?',
    variants: [
      'What is floating point precision?',
      'How do you represent currency in code?',
      'Why should you not use floats for money?',
      'How do you compare floating point numbers?'
    ],
    answer: `Floating point numbers are stored in binary, and most decimal fractions, like 0.1, have no exact binary representation, the same way one third has no exact decimal one. Each value is rounded slightly, and the errors show up when you add them, so 0.1 plus 0.2 comes out a tiny bit over 0.3.

For scientific values that is fine; I compare with a tolerance instead of exact equality.

For money it is not fine, because rounding errors accumulate and totals stop matching. So I store money as integers in the smallest unit, kobo or cents, or use a decimal type with a fixed scale in the database. I keep the currency next to the amount, do the arithmetic in integers, and round only once at a defined point, with a stated rounding rule, when splitting or applying a percentage.

The same thinking applies to sums that must balance: if splitting 100 three ways, the leftover unit has to go somewhere explicit, or the books are off by one.`
  },
  {
    id: 'fund-sdlc',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'junior',
    question: 'What does the software development lifecycle look like in your work?',
    variants: [
      'Walk me through how you take a feature from idea to production.',
      'What are the stages of software development?',
      'How do you go from requirements to release?',
      'What is your development process?'
    ],
    answer: `It starts with understanding the problem: who needs it, what done looks like, and the edge cases, written down as acceptance criteria before any code.

Then a short design: where it fits in the existing system, the data model and API changes, and the risky parts. For something large I write it down and get feedback first, because changing a design on paper is cheap.

Then implementation in small pieces, each with tests, behind a feature flag if it cannot ship at once. Every change goes through a pull request, review and CI that runs the tests and checks.

Release is to a staging environment first, then production, with migrations planned so they are safe to run before the new code. After release I watch logs, errors and the metric the feature was meant to move.

Finally maintenance: bugs get a root cause and a regression test, and what we learned feeds the next round of requirements.`
  },
  {
    id: 'fund-immutability-pure-functions',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'mid',
    question: 'What are pure functions and why do they matter?',
    variants: [
      'What is a side effect?',
      'What are the benefits of functional programming ideas?',
      'Why is code without side effects easier to test?',
      'How do you separate logic from side effects?'
    ],
    answer: `A pure function returns the same output for the same input and changes nothing outside itself: no writes to a database, no global state, no reading the clock or a random number.

That makes it easy to reason about, because everything it depends on is in its arguments. It is trivial to test, with no setup or mocks. It is safe to cache, to run in parallel and to reuse.

Real programs need side effects, so the goal is to push them to the edges. I keep the decision making, like pricing rules, validation or what a state machine does next, in pure functions, and keep a thin outer layer that reads input, calls the pure core, and then writes to the database or sends the email.

That structure also makes bugs easier to find. When a total is wrong, I can call the pricing function with the same inputs and see the answer immediately, instead of rebuilding the whole request.`
  }
];
