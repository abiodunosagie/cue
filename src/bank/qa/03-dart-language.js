// The Dart language: what mobile interviews ask before any Flutter question.
module.exports = [
  {
    id: 'dart-null-safety',
    roles: ['mobile'],
    anchors: ['dart'],
    level: 'junior',
    question: 'How does null safety work in Dart?',
    variants: [
      'Explain sound null safety in Dart.',
      'What is the difference between String and String? in Dart?',
      'What does the bang operator do in Dart?',
      'How do you handle nullable values in Dart?',
      'When is it okay to use the null assertion operator?'
    ],
    answer: 'In Dart, types are non-nullable by default. A String can never be null; if something can be missing, I have to say so with String with a question mark, and then the compiler makes me handle the null case before I use it. ' +
      'Because it is sound, the compiler can trust those types, so a whole class of null crashes is caught at compile time.\n\n' +
      'To work with nullable values I use the null-aware operators: question mark dot to call something only if it is not null, double question mark to give a default, and flow analysis, ' +
      'where after an if check the variable is promoted to non-nullable.\n\n' +
      'The bang operator tells the compiler "trust me, this is not null", and it throws if I am wrong. I avoid it in normal code. When I see it, it usually means the type should not be nullable in the first place, ' +
      'or the value should be checked properly. The one place it is reasonable is right after a check the compiler cannot follow, like a field read twice.'
  },
  {
    id: 'dart-final-const-late',
    roles: ['mobile'],
    anchors: ['dart'],
    level: 'junior',
    question: 'What is the difference between final, const and late in Dart?',
    variants: [
      'Final versus const in Dart, what is the difference?',
      'When do you use the late keyword?',
      'Why do Flutter widgets use const constructors?',
      'What does const mean in Dart?'
    ],
    answer: 'final means the variable is set once and never reassigned, but the value is decided at runtime, like the result of a function call or DateTime.now.\n\n' +
      'const is stronger: the value must be known at compile time, and the object is deeply immutable. Identical const objects are created once and shared, which is why const widgets matter in Flutter. ' +
      'When a widget is const, Flutter knows it cannot change and can skip rebuilding it.\n\n' +
      'late tells the compiler a non-nullable variable will be set before it is read, even though it is not set at declaration. It is useful for fields initialised in initState, or for lazy initialisation, ' +
      'where a late final with an initializer is only computed the first time it is read. The risk is that reading it too early throws at runtime, so I use it only when the order is guaranteed.'
  },
  {
    id: 'dart-future-vs-stream',
    roles: ['mobile'],
    anchors: ['dart'],
    level: 'junior',
    question: 'What is the difference between a Future and a Stream in Dart?',
    variants: [
      'Future versus Stream, when do you use each?',
      'Explain async and await in Dart.',
      'What is async* and yield in Dart?',
      'How do you handle errors with async and await in Dart?'
    ],
    answer: 'A Future is one value that arrives later, like the response of an HTTP call. A Stream is a sequence of values over time, like messages from a websocket, location updates or a database that emits on every change.\n\n' +
      'With a Future I use async and await, which reads like normal code, and handle errors with try and catch around the await. ' +
      'With a Stream I either listen to it, or use await for inside an async function to process each event as it comes. To produce one, I can write an async star function and yield values.\n\n' +
      'The things I watch for: a Future error that nobody awaits or catches gets lost or crashes the zone, and stream subscriptions have to be cancelled when the screen goes away. ' +
      'And when calls do not depend on each other, I start them together with Future.wait instead of awaiting them one by one.'
  },
  {
    id: 'dart-event-loop',
    roles: ['mobile'],
    anchors: ['dart', 'event loop'],
    level: 'senior',
    question: 'How does the Dart event loop work?',
    variants: [
      'Explain the event queue and the microtask queue in Dart.',
      'Is Dart single threaded?',
      'In what order do Future and scheduleMicrotask run?',
      'Why does a heavy loop freeze the Flutter UI?'
    ],
    answer: 'Each Dart isolate runs on a single thread with an event loop. The loop has two queues: the microtask queue and the event queue. ' +
      'Before it takes the next event, like a timer, a tap or an I/O result, it empties the microtask queue completely. Completed futures schedule their callbacks as microtasks, so they run before the next event.\n\n' +
      'The important consequence is that async code is not parallel. await just pauses the function and lets the loop run other things. ' +
      'If I do heavy synchronous work, like parsing a huge JSON or processing an image on the main isolate, nothing else runs, frames are not drawn and the app janks.\n\n' +
      'So I keep the main isolate for UI work. Real CPU-heavy work goes to another isolate, with Isolate.run or compute, and I avoid flooding the microtask queue, because that can starve rendering too.'
  },
  {
    id: 'dart-isolates',
    roles: ['mobile'],
    anchors: ['dart', 'isolate', 'isolates'],
    level: 'senior',
    question: 'What are isolates and when do you use them?',
    variants: [
      'How do you run heavy work off the main thread in Flutter?',
      'What is the difference between async and an isolate?',
      'How does compute or Isolate.run work?',
      'How do isolates communicate?'
    ],
    answer: 'An isolate is Dart\'s unit of concurrency. Each one has its own memory and its own event loop, and they do not share state; they talk by passing messages through ports. ' +
      'That design means no locks and no data races, but data has to be copied or transferred between them.\n\n' +
      'I use one when work is CPU heavy and would block the UI: decoding a large JSON response, image or PDF processing, encryption, or searching a big list. ' +
      'For a one-off job, Isolate.run or Flutter\'s compute is enough: it spawns an isolate, runs the function and returns the result as a Future.\n\n' +
      'For ongoing work, like processing a stream of data, I keep a long-lived isolate and talk to it over a SendPort and ReceivePort. ' +
      'The trade-off is the cost of starting it and copying data, so for small tasks an isolate is slower than just doing the work. I measure first and move only what actually drops frames.'
  },
  {
    id: 'dart-mixins-extensions',
    roles: ['mobile'],
    anchors: ['dart'],
    level: 'mid',
    question: 'What are mixins and extension methods in Dart?',
    variants: [
      'What is a mixin in Dart?',
      'How are mixins different from inheritance?',
      'When do you use extension methods?',
      'Explain the with keyword in Dart.'
    ],
    answer: 'A mixin is a way to reuse a set of methods and fields in several classes without making them share a parent. I apply it with the with keyword. ' +
      'Dart only has single inheritance, so mixins are how you add a capability, like logging, validation or Flutter\'s TickerProviderStateMixin, to classes from different hierarchies. ' +
      'With the on keyword, a mixin can require the class it is mixed into to extend a certain type.\n\n' +
      'Extension methods add methods to a type I do not own, like String or DateTime, without subclassing it. For example a capitalize method on String, or a formatted method on DateTime. ' +
      'They are resolved at compile time from the static type, so they are just sugar over a helper function.\n\n' +
      'I use both sparingly: mixins for real shared behaviour, and extensions for small readable helpers, not for hiding important logic where people will not look for it.'
  },
  {
    id: 'dart-sealed-records-patterns',
    roles: ['mobile'],
    anchors: ['dart'],
    level: 'senior',
    question: 'How do you use sealed classes, records and pattern matching in Dart 3?',
    variants: [
      'What are sealed classes in Dart?',
      'What are records in Dart?',
      'How does pattern matching work with switch in Dart?',
      'What changed in Dart 3?'
    ],
    answer: 'Dart 3 made modelling states much cleaner. A sealed class means all its subclasses are known in the same library, so a switch over it is exhaustive: ' +
      'if I add a new state, every switch that does not handle it fails to compile. I use that for things like Loading, Loaded and Failed, or for the result of an operation.\n\n' +
      'Records are anonymous, immutable groups of values, like a pair of a user and a token. They are great for returning several values from a function without creating a class just for that, and they have value equality built in.\n\n' +
      'Pattern matching ties it together: a switch expression can destructure a sealed state or a record, bind its fields and use guards in one readable expression. ' +
      'It removes a lot of if chains and casting, and the exhaustiveness check catches mistakes the compiler used to miss.'
  },
  {
    id: 'dart-equality',
    roles: ['mobile'],
    anchors: ['dart', 'equatable'],
    level: 'mid',
    question: 'How does equality work in Dart, and why do state classes override it?',
    variants: [
      'Why do you need to override == and hashCode?',
      'What does Equatable do?',
      'Why does my BlocBuilder not rebuild when I emit a new state?',
      'What is value equality versus identity?'
    ],
    answer: 'By default, two objects in Dart are equal only if they are the same instance. So two User objects with the same id and name are not equal unless the class overrides the equality operator and hashCode.\n\n' +
      'That matters a lot for state. BLoC and Riverpod compare the new state with the old one to decide whether to notify. ' +
      'Without value equality, two identical states look different and cause extra rebuilds, and if I mutate a list inside the same state object and emit it again, the framework sees the same instance and does not rebuild at all.\n\n' +
      'So I make state classes immutable and give them value equality, with Equatable, or with freezed which also generates copyWith. ' +
      'The rule is that equal objects must have equal hash codes, otherwise sets and maps behave strangely, which is why I never write one without the other by hand.'
  },
  {
    id: 'dart-generics',
    roles: ['mobile'],
    anchors: ['dart'],
    level: 'mid',
    question: 'How do you use generics in Dart?',
    variants: [
      'Give an example of generics in your Dart code.',
      'What is a bounded generic type in Dart?',
      'Why are generics useful?',
      'How would you write a generic repository or result type?'
    ],
    answer: 'Generics let me write one class or function that works with many types while keeping type safety. The collections are the everyday example: a List of int can only hold ints, and the compiler knows what comes out.\n\n' +
      'In my own code I use them for shared building blocks. A Result type that holds either a value of type T or a failure, so every repository method returns the same shape. ' +
      'A paginated response of T for any list from the API. Or a base cache keyed by one type and storing another.\n\n' +
      'I use bounds with extends when the code needs something from the type, for example T extends Comparable so I can sort it. ' +
      'And Dart generics are reified, which means the type is kept at runtime, so I can check it with is, unlike in Java where it is erased.'
  },
  {
    id: 'dart-factory-named-constructors',
    roles: ['mobile'],
    anchors: ['dart'],
    level: 'junior',
    question: 'What are named and factory constructors in Dart?',
    variants: [
      'When do you use a factory constructor?',
      'What is the difference between a factory and a normal constructor?',
      'How do you write fromJson in Dart?',
      'What is an initializer list in Dart?'
    ],
    answer: 'Dart has no constructor overloading, so named constructors give a class several clear ways to be created, like Point.origin or User.guest.\n\n' +
      'A factory constructor does not have to create a new instance. It can return a cached one, return a subclass, or run logic before deciding what to build. ' +
      'The most common use is fromJson: a factory reads the map, validates and converts the fields, and then calls the real constructor. Singletons and caches are other uses.\n\n' +
      'A normal generative constructor always creates a new instance, and it can use an initializer list to set final fields or run asserts before the body runs. ' +
      'I also use redirecting constructors to keep one place where the real setup happens, so the named ones stay short.'
  },
  {
    id: 'dart-iterable-lazy',
    roles: ['mobile'],
    anchors: ['dart'],
    level: 'mid',
    question: 'What does it mean that Iterable operations in Dart are lazy?',
    variants: [
      'Why do you call toList after map in Dart?',
      'What is the difference between a List and an Iterable?',
      'Why is my map function running twice?',
      'Explain lazy evaluation in Dart collections.'
    ],
    answer: 'Methods like map, where and expand on an Iterable do not run straight away. They return a new Iterable that describes the work, and the work happens only when something iterates it.\n\n' +
      'That is efficient when I chain operations and only need the first few results, because nothing extra is computed. ' +
      'But it has two traps. If I iterate the result twice, the mapping function runs twice, which is a problem if it is expensive or has side effects. ' +
      'And the result reflects the source at the time it is iterated, so if the source list changes in between, I get different values.\n\n' +
      'So when I need a stable result, or I will read it more than once, or I am storing it in state, I call toList to evaluate it once. ' +
      'In Flutter build methods, that also avoids redoing the work on every access.'
  },
  {
    id: 'dart-error-handling',
    roles: ['mobile'],
    anchors: ['dart'],
    level: 'senior',
    question: 'How do you handle errors in a Dart and Flutter codebase?',
    variants: [
      'What is the difference between an Error and an Exception in Dart?',
      'How do you catch uncaught errors in Flutter?',
      'Do you use a Result or Either type for errors?',
      'How do you handle API errors across layers?'
    ],
    answer: 'In Dart, an Exception is something expected that the program should handle, like a network failure. An Error is a programming bug, like a null assertion failing or a range error, and it should crash loudly in development rather than be swallowed.\n\n' +
      'Across layers, the data layer catches the raw exceptions, like a socket exception or a 500 response, and turns them into my own failure types, like NoConnection or Unauthorized. ' +
      'The layers above then deal with meaningful failures, sometimes returned as a Result or Either type so the caller is forced to handle them.\n\n' +
      'The UI maps each failure to a friendly message, never the raw text. And at the top I set FlutterError.onError and PlatformDispatcher.instance.onError, ' +
      'so anything uncaught is reported to crash reporting with its stack trace. I avoid empty catch blocks; if I catch something, I either handle it or rethrow it.'
  },
  {
    id: 'dart-abstract-interface',
    roles: ['mobile'],
    anchors: ['dart'],
    level: 'mid',
    question: 'What is the difference between extends, implements and an abstract class in Dart?',
    variants: [
      'Dart has no interface keyword, so how do interfaces work?',
      'When do you use implements instead of extends?',
      'What is an abstract interface class in Dart 3?',
      'Why do you define repositories as abstract classes?'
    ],
    answer: 'extends is inheritance: the subclass gets the parent\'s implementation and can override parts of it. A class can only extend one class.\n\n' +
      'implements is a contract: every class in Dart is also an interface, and implementing it means providing my own version of every member, inheriting no code. A class can implement many interfaces.\n\n' +
      'An abstract class cannot be created directly and can declare methods without a body. I use one to define a contract like AuthRepository, ' +
      'then have a real implementation that talks to the API and a fake one for tests, both implementing it. ' +
      'Dart 3 added class modifiers to make the intent explicit: abstract interface class means it can only be implemented, not extended, and final or base classes limit how others can subclass them.'
  },
  {
    id: 'dart-code-generation',
    roles: ['mobile'],
    anchors: ['dart', 'freezed', 'build_runner', 'json_serializable'],
    level: 'mid',
    question: 'Do you use code generation like freezed and json_serializable, and what are the trade-offs?',
    variants: [
      'What is build_runner used for?',
      'Why use freezed?',
      'How do you parse JSON in Dart?',
      'What are the downsides of code generation in Flutter?'
    ],
    answer: 'Yes, for models I usually do. json_serializable writes the fromJson and toJson code, so field names and types stay in sync with the class and I do not hand-write error-prone map parsing. ' +
      'freezed adds immutable data classes with value equality, copyWith and sealed unions, which is very handy for state.\n\n' +
      'The trade-offs are real. build_runner adds a step to the workflow, generated files can get out of date and cause confusing errors until it runs again, and on big projects the generation can be slow. ' +
      'It also adds dependencies to keep updated.\n\n' +
      'So I keep generation to models and state, run it in watch mode while developing, commit or regenerate the files consistently as the team prefers, and check them in CI. ' +
      'For a tiny model I am fine writing fromJson by hand, and Dart 3 records and sealed classes have reduced how much I need freezed.'
  },
  {
    id: 'dart-async-concurrency-control',
    roles: ['mobile'],
    anchors: ['dart'],
    level: 'senior',
    question: 'How do you run several async calls at once, add timeouts or cancel them in Dart?',
    variants: [
      'How do you call three APIs in parallel in Dart?',
      'How do you add a timeout to a Future?',
      'Can you cancel a Future in Dart?',
      'How do you debounce a search request in Flutter?'
    ],
    answer: 'When calls do not depend on each other I start them together with Future.wait, so the total time is the slowest call, not the sum. ' +
      'If one failing should not fail the rest, I catch per call, or in newer Dart use the wait extension on records, which reports which one failed.\n\n' +
      'For timeouts I use the timeout method on the future, and the HTTP client\'s own timeouts, and turn a timeout into a clear failure the UI can show with a retry.\n\n' +
      'A Future cannot be cancelled itself, but the work can be. Dio supports cancel tokens, a stream subscription can be cancelled, and for things like search I make sure stale results are ignored, ' +
      'for example by checking that the query is still the latest before applying the result. For search I also debounce the input, so I only call the API once the user pauses typing.'
  },
  {
    id: 'dart-typedef-callbacks',
    roles: ['mobile'],
    anchors: ['dart'],
    level: 'junior',
    question: 'What are closures and typedefs in Dart?',
    variants: [
      'Explain closures in Dart.',
      'What is a typedef used for?',
      'How do you pass a function as a parameter in Dart?',
      'What is a callback in Flutter?'
    ],
    answer: 'In Dart, functions are objects, so I can pass them around, store them and return them. A closure is a function that captures variables from the scope where it was created and keeps using them later. ' +
      'For example, a counter function that returns another function which increments a captured variable each time it is called.\n\n' +
      'In Flutter that is everywhere: onPressed callbacks capture the item they belong to, and builder functions capture the context and state around them.\n\n' +
      'A typedef gives a name to a function type, like typedef OnItemSelected = void Function(Item item). It makes signatures easier to read and keeps the type consistent wherever the callback is used. ' +
      'Since Dart 2.13 a typedef can also alias any type, which is useful for long generic types.'
  },
  {
    id: 'dart-memory-leaks',
    roles: ['mobile'],
    anchors: ['dart', 'flutter'],
    level: 'senior',
    question: 'How do you find and prevent memory leaks in a Flutter app?',
    variants: [
      'What causes memory leaks in Flutter?',
      'Why do you need to call dispose?',
      'How do you investigate high memory usage in Flutter?',
      'What does the DevTools memory tab show?'
    ],
    answer: 'Most Flutter leaks come from things that outlive the widget that created them: animation controllers, text editing controllers, stream subscriptions, timers and listeners added to a global object. ' +
      'If they are not disposed or cancelled, they keep the State and everything it references alive.\n\n' +
      'So the habit is simple: anything I create in initState, I release in dispose, and I prefer tools that do it for me, like autoDispose providers or blocs that close their subscriptions. ' +
      'Another source is large images, so I size them for the screen with cacheWidth and keep an eye on the image cache.\n\n' +
      'To investigate, I use the DevTools memory view: take a snapshot, navigate in and out of a screen several times, snapshot again, and see whether instances of that screen\'s State keep growing. ' +
      'The leak_tracker package can also flag undisposed objects in tests.'
  },
  {
    id: 'dart-jit-aot',
    roles: ['mobile'],
    anchors: ['dart', 'jit', 'aot', 'hot reload'],
    level: 'mid',
    question: 'What is the difference between JIT and AOT compilation in Dart?',
    variants: [
      'How is hot reload possible in Flutter?',
      'Why is a release build faster than debug?',
      'Explain JIT versus AOT.',
      'Why should you never measure performance in debug mode?'
    ],
    answer: 'Dart can run in two ways. In development it uses JIT, just in time compilation, on the Dart VM. That is what makes hot reload possible: changed code is compiled and injected into the running app while state is kept.\n\n' +
      'For release, Flutter compiles the app ahead of time, AOT, into native machine code. That gives fast start up and predictable performance, with no compiler running on the device, but no hot reload.\n\n' +
      'The practical consequence is that debug builds are much slower and also run extra checks, so I never judge performance in debug. ' +
      'I profile in profile mode on a real device, which is AOT compiled but keeps the tooling, and I check start up time and frame times there before saying something is fast or slow.'
  }
];
