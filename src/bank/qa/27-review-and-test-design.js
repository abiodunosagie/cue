// Code quality and correctness review, and problem and test design: reading
// someone else's code (or a model's) for what is wrong, designing realistic
// coding tasks with deterministic verifiers, and test strategy. Asked in
// evaluator and back end interviews, so the roles are front end and back end
// like the general code review answer, which keeps them out of a Flutter
// interview.
module.exports = [
  {
    id: 'review-correctness-first',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'mid',
    question: 'How do you review code for correctness rather than style?',
    variants: [
      'How do you check that a piece of code actually does what it should?',
      'What do you look at first when you read someone else\'s function?',
      'How do you decide whether a solution is correct?',
      'Walk me through how you verify a code change is right.'
    ],
    answer: `I start from the spec, not the code. Before reading a line I write down what the function must return for a normal input, for the edges, and for bad input. Then I read the code against that list.

I trace one small, concrete input by hand, line by line, keeping the values of the variables in my head or on paper. Most bugs show up there: a loop that stops one early, a condition that is inverted, a value that is reused after it changed.

Then I look at what the code assumes but never checks: that the list is not empty, that the input is sorted, that a lookup always finds something, that two calls cannot overlap.

Style comes last and only matters when it hides a bug. If I find a real problem I prove it with the input that breaks it, ideally as a failing test, so the fix can be checked instead of argued about.`
  },
  {
    id: 'review-generated-code',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'mid',
    question: 'How do you review code written by an AI model?',
    variants: [
      'How do you spot code that looks right but is wrong?',
      'What mistakes do AI generated solutions usually make?',
      'How would you evaluate a model\'s answer to a coding task?',
      'How do you judge whether a generated fix really solves the problem?'
    ],
    answer: `I review it like a confident junior's pull request: it usually reads well, so I trust nothing until I have run it in my head or for real.

The common failures are specific. It solves a slightly different problem than the one asked, often the more famous version of it. It handles the happy path and skips empty input, duplicates or the boundary. It calls a function or option that does not exist in that library version. It changes more than the task needed, or it makes a test pass by special casing the test input instead of fixing the logic.

So I check the requirement line by line against the code, run the edge cases, confirm every API it uses is real, and read the diff for anything outside the task. For a bug fix I want to see the failing case pass and the existing tests still pass, not just a plausible explanation.

My write up then says what is wrong, where, which input shows it and what the correct behaviour is.`
  },
  {
    id: 'review-edge-cases',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'mid',
    question: 'What edge cases do you always check when reviewing or testing a function?',
    variants: [
      'Which inputs tend to break code?',
      'How do you find the edge cases of a problem?',
      'What boundary conditions do you test?',
      'Give me your checklist of edge cases.'
    ],
    answer: `I go through the input types and push each one to its limits.

For collections: empty, one element, two elements, all the same values, already sorted, reverse sorted, duplicates, and a very large one for performance. For numbers: zero, negative, the maximum and minimum values, overflow, and floating point rounding. For strings: empty, whitespace only, Unicode and emoji, different case, and very long input.

Then the absence cases: null or missing fields, a lookup that finds nothing, an optional parameter left out.

Then the outside world: a network call that times out or returns an error, a file that is not there, two requests at the same time, a retry of the same request, dates around midnight, month ends, leap years and time zones.

Not every case applies to every function, so I pick the ones the spec makes meaningful, and the ones the code's own conditions suggest, because every if statement has two sides and a boundary.`
  },
  {
    id: 'review-off-by-one',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'mid',
    question: 'How do you catch off by one and boundary errors?',
    variants: [
      'How do you find off by one bugs?',
      'How do you check loop bounds are right?',
      'Why are boundary values so important in testing?',
      'How do you avoid fencepost errors?'
    ],
    answer: `I decide the convention first and check the code keeps it everywhere. Most of the time that is half open ranges, start included and end excluded, because lengths and splits then add up without plus or minus one.

Then I test at the boundary itself and one on each side of it. If a discount applies from 100, I check 99, 100 and 101. For a loop, I check the first iteration, the last iteration and the case where it should not run at all, like an empty list.

While reading, I look closely at less than versus less than or equal, at length minus one, and at slices and substrings, because each language treats the end index a little differently.

Writing the loop invariant down in one sentence helps too. If I can say exactly what is true at the start of each iteration, the bounds usually become obvious, and a wrong bound stands out.`
  },
  {
    id: 'review-severity',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'mid',
    question: 'How do you prioritise the issues you find in a code review?',
    variants: [
      'How do you rank problems by severity?',
      'What is blocking and what is a nitpick in a review?',
      'How do you decide what must be fixed before merge?',
      'If you find ten problems, which do you raise first?'
    ],
    answer: `I sort them by impact on the user and the data, not by how easy they were to spot.

First, wrong results and data loss: incorrect output, a crash on a normal input, money or records that can be corrupted. Second, security: missing authorisation, injection, leaked secrets or personal data. Third, reliability and performance problems that will show up at real scale, like a query in a loop or no timeout on a network call. Those three block the merge.

After that come maintainability issues, missing tests for new behaviour and unclear naming, which I raise as should fix. Style and personal preference are optional and I label them that way, or leave them to the linter.

Each finding gets the location, what goes wrong, an input or scenario that shows it, and a suggested fix. Leading with the one or two blockers matters, because a list of twenty equal looking comments hides the bug that actually matters.`
  },
  {
    id: 'review-find-the-bug',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'mid',
    question: 'If I show you a function with a bug in it, how do you find the bug?',
    variants: [
      'Here is some code that fails sometimes, how would you find out why?',
      'How do you approach a find the bug question?',
      'How do you find a bug in code you did not write?',
      'This code returns the wrong answer for some inputs, where do you start?',
      'What would you look for when reviewing this function for bugs?'
    ],
    answer: `First I read the name, the signature and any comment to understand what it promises, and I say that back in one sentence. Then I pick a small input where I know the right answer and trace the code with it, writing down variable values as they change.

If that input works, I move to the edges: empty input, one element, duplicates, negative numbers, the largest values. The bug is usually in a boundary, an inverted condition, a variable updated in the wrong order, or state shared between calls.

When I find the input that fails, I say exactly which line produces the wrong value and why, then make the smallest fix that addresses the cause, not one that special cases that input.

Finally I rerun the original example and the edge cases with the fix, and I would add the failing input as a regression test, so the bug cannot quietly come back.`
  },
  {
    id: 'review-performance',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'mid',
    question: 'What performance problems do you look for when reviewing code?',
    variants: [
      'How do you spot slow code in a review?',
      'What makes code inefficient?',
      'How do you judge whether a solution will scale?',
      'What are common performance mistakes in pull requests?'
    ],
    answer: `I look for work that grows faster than it needs to.

The classic ones: a loop inside a loop that makes something quadratic when a hash map would make it linear; searching a list repeatedly when a set would do; sorting inside a loop; building a string by repeated concatenation in a hot path.

On the back end, the big one is a database or network call inside a loop, the N plus one problem, plus queries that filter on columns with no index, loading whole tables into memory, and no pagination on a list endpoint. Missing timeouts and unbounded retries also turn a slow dependency into an outage.

On the front end, I look for expensive work repeated on every render and lists that render every row at once.

I always ask how big the input really gets. A quadratic loop over ten items is fine and simpler code wins. If it matters, I ask for a measurement rather than a guess.`
  },
  {
    id: 'review-race-conditions',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'senior',
    question: 'How do you spot race conditions and concurrency bugs in a code review?',
    variants: [
      'What concurrency problems do you look for in code?',
      'How would you find a race condition by reading code?',
      'What is a check then act bug?',
      'How do you review code that runs in parallel?'
    ],
    answer: `I look for shared state and ask what happens if two of these run at exactly the same time.

The most common pattern is check then act: read a balance, check it is enough, then write the new balance. Two requests can both pass the check before either writes. The same shape shows up as read, modify, write on a counter, or "if the user does not exist, create it" without a unique constraint.

The fix is to make the check and the write one atomic step, in the database or with a lock, and I point to the exact two lines that can interleave.

I also look for async code that assumes an order it does not control, like two network responses arriving in either order, and for missing awaits. A review can only point these out; a test that fires the requests concurrently proves them.`
  },
  {
    id: 'review-readable-but-works',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'mid',
    question: 'The code works but it is hard to read. Would you approve it?',
    variants: [
      'How much does readability matter if the tests pass?',
      'Do you block a pull request for code quality issues?',
      'How do you judge code quality beyond correctness?',
      'What makes code maintainable in your view?'
    ],
    answer: `It depends on how hard, and on whether the next person can change it safely.

If correctness is proven but the names are vague or a function does four things, I approve with suggestions, because blocking working code over taste slows the team down. If it is hard enough that I could not confidently say it is correct, then it is not ready, because unreadable code hides bugs and the next change will break it.

What I look for: names that say what a thing is or does, functions that do one job, no duplicated logic that will drift apart, errors handled where they happen instead of swallowed, and no clever trick where a plain loop would do.

I make the comment concrete. Not "this is messy", but "split the validation into its own function and name it, so the main flow reads in three lines." That gives the author something they can do in five minutes.`
  },
  {
    id: 'task-design-coding-task',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'senior',
    question: 'How do you design a good coding task or problem?',
    variants: [
      'What makes a coding problem realistic and challenging?',
      'How would you write a coding task for someone else to solve?',
      'How do you create a feature implementation task?',
      'Walk me through designing a programming exercise.'
    ],
    answer: `I start from something real: a feature or a bug I have actually seen in a codebase, like rate limiting an endpoint, merging overlapping bookings, or a timezone bug in a report. Real problems have the right kind of difficulty, where the tricky part is understanding the requirement and the edge cases, not a puzzle.

Then I write one clear spec: the inputs and their types, the exact output, what happens on invalid input, and any limits on size or time. Every rule the solver needs is written down. If two careful engineers could read it and build different correct answers, the spec is not finished.

I give it enough context, like an existing small codebase or interface, so it feels like real work, and I make sure the challenge comes from the logic, not from guessing hidden conventions.

Before I call it done I solve it myself, write the tests that will judge it, and check those tests against my solution, a different valid solution and a few wrong ones.`
  },
  {
    id: 'task-unambiguous-spec',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'mid',
    question: 'How do you write a problem statement that is not ambiguous?',
    variants: [
      'How do you make a task specification clear?',
      'How do you remove ambiguity from requirements?',
      'What goes into a good problem description?',
      'How do you make sure solvers interpret a task the same way?'
    ],
    answer: `I write it so that a careful reader cannot pick two different behaviours.

That means stating the input format and types, the output format exactly, including order, rounding and case, and the behaviour on every edge: empty input, duplicates, ties, invalid values, and whether to throw, return an error or return a default. I give the limits, like the largest input size, because that tells the solver which approach is acceptable.

I add two or three worked examples, including one edge case, and I make sure the examples agree with the text.

Then I test the statement, not just the code. I reread it as the solver and ask, for each sentence, could this mean something else? Words like "valid", "sorted", "nearby" or "recent" need a definition. If someone else is available, I ask them to solve it from the text alone, and every question they ask becomes a sentence in the spec.`
  },
  {
    id: 'verifier-deterministic',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'senior',
    question: 'How do you build a deterministic verifier that accepts every valid solution and rejects wrong ones?',
    variants: [
      'How do you write tests that grade a solution fairly?',
      'What makes an automated grader reliable?',
      'How do you make a test suite deterministic?',
      'How would you verify solutions to a coding task automatically?',
      'How do you avoid tests that reject correct answers?',
      'What makes a good verifier?'
    ],
    answer: `The verifier checks behaviour through the public interface, never how the solution is built. If the spec allows any order, I compare sorted results or sets. For floating point I compare with a stated tolerance. If several outputs are valid, I check the property that makes an answer valid, instead of matching one expected value.

Deterministic means the same solution always gets the same verdict. So no real clock, no network, no unseeded randomness, no dependence on test order or leftover files. Time and randomness are injected or fixed, and each test sets up its own data.

Coverage comes from the spec: normal cases, every edge it mentions, invalid input, and a large input with a time limit when performance is part of the task.

Then I verify the verifier. It must pass my reference solution and at least one different valid approach, and it must fail a set of wrong solutions I write on purpose: off by one, missing edge case, a hardcoded answer, too slow. If a wrong one passes, the tests have a gap.`
  },
  {
    id: 'verifier-too-strict-loose',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'senior',
    question: 'How do you know your tests are not too strict or too loose?',
    variants: [
      'How do you test your tests?',
      'What is mutation testing?',
      'How do you find false positives and false negatives in a test suite?',
      'How do you check a test would actually catch a bug?'
    ],
    answer: `Too loose means a wrong solution passes. Too strict means a correct one fails. I check both directions on purpose.

For too loose, I break the code deliberately and confirm a test goes red: flip a comparison, drop an edge case, return a constant, remove a line. That is the idea behind mutation testing, and tools can do it automatically. If a mutant survives, some behaviour is untested.

For too strict, I run the tests against other correct solutions, written in a different way, and look for assertions on things the spec does not fix: exact error message wording, internal function calls, the order of results when order was not specified, or floating point compared exactly.

I also run the suite many times, in random order, to make sure the verdict never changes on its own. A test that passes or fails depending on timing is a third failure mode, and it makes every other result less trustworthy.`
  },
  {
    id: 'test-case-design',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'mid',
    question: 'How do you choose which test cases to write?',
    variants: [
      'What techniques do you use to design test cases?',
      'What is equivalence partitioning and boundary value analysis?',
      'How do you get good coverage without hundreds of tests?',
      'How do you decide what to test?'
    ],
    answer: `I start from the requirements and the risk, not from the code's line count.

Equivalence partitioning groups inputs that should behave the same, so one test per group is enough: a valid amount, a negative amount, a zero amount. Boundary value analysis then tests the edges of each group, where most bugs live, so the exact limit and one on each side.

Then I add error guessing from experience: empty collections, duplicates, Unicode, time zones, concurrent calls, a dependency that fails. And one or two realistic end to end examples that mirror how the feature is really used.

For logic with a clear rule, like sorting or parsing, property based tests are great: instead of picking examples, I state a property such as "the output is sorted and has the same elements" and let the tool generate hundreds of inputs.

Every bug I fix also becomes a test, with the exact input that broke it.`
  },
  {
    id: 'test-strategy-team',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'senior',
    question: 'How would you design a test strategy or raise the testing bar on a team?',
    variants: [
      'What does a good test strategy look like?',
      'How do you decide between unit, integration and end to end tests?',
      'How would you improve testing on a project with few tests?',
      'What is the test pyramid?'
    ],
    answer: `I start with where bugs actually hurt: payments, permissions, data that cannot be lost. Those get tested first and deepest.

The shape is roughly the pyramid. Many fast unit tests for pure logic and rules. A good layer of integration tests that hit a real database and the real API layer, because that is where most real bugs are: queries, migrations, serialisation, auth. A few end to end tests for the critical journeys, like sign up and checkout.

On an existing project with few tests, I do not stop to write tests for everything. I add a regression test with every bug fix, require tests for new behaviour in review, and put the suite in CI so a red build blocks the merge.

Then I keep it healthy: fast enough that people run it, no flaky tests tolerated, and clear names so a failure explains itself. Coverage numbers are a hint about gaps, not a target.`
  },
  {
    id: 'test-flaky',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'senior',
    question: 'How do you diagnose and fix flaky tests?',
    variants: [
      'A test passes locally but fails in CI sometimes, what do you do?',
      'What causes flaky tests?',
      'How do you deal with intermittent test failures?',
      'How do you stop tests from failing randomly?'
    ],
    answer: `First I make it reproducible. I rerun that test many times, in a loop, in random order and in parallel, until I can see the failure rate. Then I read the failure output and compare it with a passing run.

The causes are almost always one of a few. Timing: a fixed sleep, or an assertion before the async work finished, so I wait for the condition instead. Shared state: one test leaves data, a global or a file behind, and the next depends on it, so each test sets up and cleans its own. Real time and time zones: tests that break at midnight or in another region, so the clock is injected. Randomness without a seed. Network calls to real services. Order of results that was never guaranteed.

The fix goes at the cause, not a retry. Retrying hides a real race that might also exist in production. If I cannot fix it the same day, I quarantine it with a ticket and an owner, so the rest of the suite stays trusted.`
  },
  {
    id: 'test-behaviour-not-implementation',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'mid',
    question: 'Why should tests check behaviour instead of implementation?',
    variants: [
      'What makes tests brittle?',
      'Should you test private methods?',
      'What is wrong with tests that break on every refactor?',
      'When is mocking too much mocking?'
    ],
    answer: `Because the point of a test is to tell me when the behaviour broke, and nothing else.

A test that asserts which internal functions were called, in which order, or what a private field holds, fails every time I refactor, even when the result is still correct. People then learn to update tests without thinking, and the suite stops protecting anything.

So I test through the public interface: given this input, I get this output, this record is saved, this error is returned. Private methods are covered through the public ones that use them. If something private feels like it needs its own tests, it is often a separate unit that deserves its own interface.

Mocks belong at real boundaries, like a payment provider, an email service or the clock. Mocking my own classes everywhere couples the tests to the structure. For a verifier on a coding task this matters even more, because two correct solutions can be built completely differently and both must pass.`
  },
  {
    id: 'test-property-based',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'senior',
    question: 'What is property based testing and when would you use it?',
    variants: [
      'How is property based testing different from example based tests?',
      'How would you use generative or fuzz testing?',
      'How do you test a function with a huge input space?',
      'What is an invariant in testing?'
    ],
    answer: `Example based tests check specific inputs I chose. Property based tests state a rule that must hold for every input, and a tool generates hundreds of random inputs to try to break it. When it finds a failure, it shrinks the input to the smallest case that still fails, which makes debugging easy.

Good properties are things like: sorting returns the same elements in order; encoding then decoding gives back the original; a ledger's entries always sum to zero; the result never exceeds a limit; a fast implementation agrees with a simple slow one.

I use it where the input space is large and the rules are clear: parsers, serialisation, calculations, data structures and state machines. It finds edge cases I would not think to write, like empty strings, huge numbers or odd Unicode.

It does not replace examples. I keep a few readable examples as documentation, and every failure the property test finds becomes a fixed regression example.`
  },
  {
    id: 'task-difficulty',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'senior',
    question: 'How do you make a coding task challenging but fair?',
    variants: [
      'How do you calibrate the difficulty of a problem?',
      'What makes a task too easy or too hard?',
      'How do you avoid trick questions in a coding task?',
      'How do you make a task interesting to solve?'
    ],
    answer: `Fair means everything needed to solve it is in the statement, and the difficulty comes from reasoning, not from guessing. Challenging means a first, obvious attempt is not enough.

I build the difficulty from real sources: several interacting rules, an edge case that matters, like overlapping ranges or ties, state across multiple steps, or a size limit that rules out the brute force solution. A bug fix task is harder when the symptom is far from the cause.

What I avoid: hidden requirements only the tests know about, unusual output formats, trivia about one library, and puzzles with a single clever trick.

To calibrate, I solve it myself and note where I had to think, try the naive approach and confirm the tests reject it for the right reason, and check that a strong solution fits in a reasonable amount of code. If the only hard part is understanding a vague sentence, I fix the sentence.`
  },
  {
    id: 'task-bug-fix-design',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'senior',
    question: 'How would you design a realistic bug fix task?',
    variants: [
      'How do you create a bug for someone else to find and fix?',
      'What makes a good debugging exercise?',
      'How do you write tests for a bug fix task?',
      'How would you turn a real bug into a task?'
    ],
    answer: `I take the shape of bugs I have actually fixed, because real bugs are subtle in realistic ways: a timezone conversion applied twice, a cache that is not cleared on update, a boundary that is off by one, a retry that charges twice, an async call that is not awaited.

I put it in a small but believable codebase, so finding it needs reading and tracing, not just scanning one function. The task describes the symptom the way a user or a ticket would, "reports for Monday show Sunday's orders", not the cause.

The verifier has a test that reproduces the symptom and fails before the fix, plus the existing tests that must keep passing, so deleting the feature or special casing the input does not count as a fix. Where possible, the reproducing test uses inputs different from the example in the description, so the fix has to be general.

I check it against the correct fix, a plausible wrong fix, and the unfixed code.`
  },
  {
    id: 'test-suite-maintenance',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'senior',
    question: 'How do you keep a large test suite fast and maintainable?',
    variants: [
      'Our test suite takes too long, what would you do?',
      'How do you maintain hundreds of tests?',
      'How do you organise tests in a big codebase?',
      'How do you stop the test suite from becoming a burden?'
    ],
    answer: `First I measure: which tests and which files take the time. Usually a small number are responsible, often ones that start real services, sleep, or rebuild a whole database per test.

Then the fixes: keep pure logic in fast unit tests, share expensive setup like a database across a file and reset data with transactions, replace sleeps with waiting on a condition, run in parallel where tests are isolated, and in CI run the tests related to the change first.

For maintainability, tests follow the same standards as production code. Clear names that read as a sentence, one behaviour per test, small builders or factories for test data so a schema change is fixed in one place, and no logic in the tests that could itself be wrong.

Flaky tests get fixed or quarantined with an owner immediately, and tests that no longer protect anything are deleted. A suite people trust and actually run beats a bigger one they ignore.`
  }
];
