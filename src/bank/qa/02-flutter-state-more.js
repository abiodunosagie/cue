// Flutter state management in depth: the follow-ups after "which approach".
module.exports = [
  {
    id: 'flutter-setstate-limits',
    roles: ['mobile'],
    anchors: ['flutter', 'setstate'],
    level: 'junior',
    question: 'When is setState enough, and when do you need a state management library?',
    variants: [
      'Why not just use setState everywhere?',
      'What are the limits of setState in Flutter?',
      'When do you stop using setState?',
      'Is setState bad practice?',
      'When should state move out of a StatefulWidget?'
    ],
    answer: 'setState is perfectly fine for state that belongs to one widget and nobody else needs: a toggle, a text field\'s focus, an animation, the selected tab. ' +
      'It is simple and Flutter is fast at rebuilding a small subtree.\n\n' +
      'It stops being enough when the same data is needed in several places, when it has to outlive the screen, or when there is real logic behind it, like loading from an API, retrying, caching or validating. ' +
      'If I keep that in setState, I end up passing callbacks down many levels, duplicating logic between screens, and the logic cannot be tested without pumping widgets.\n\n' +
      'So my rule is: local and visual, setState. Shared, long-lived or containing business rules, it goes into a state layer like Riverpod or BLoC, where the UI just listens and the logic is plain Dart I can unit test.'
  },
  {
    id: 'flutter-inheritedwidget',
    roles: ['mobile'],
    anchors: ['flutter', 'inheritedwidget'],
    level: 'mid',
    question: 'What is an InheritedWidget and how does Provider build on it?',
    variants: [
      'How does InheritedWidget work?',
      'How does data get passed down the widget tree without constructors?',
      'What does Provider do under the hood?',
      'How does Theme.of(context) find the theme?',
      'Explain dependOnInheritedWidgetOfExactType.'
    ],
    answer: 'An InheritedWidget is how Flutter shares data down the tree without passing it through every constructor. Any widget below it can look it up through the BuildContext, ' +
      'and when it calls dependOnInheritedWidgetOfExactType, Flutter registers that widget as a dependent. When the InheritedWidget is replaced and updateShouldNotify returns true, only those dependents rebuild. ' +
      'That is exactly how Theme.of and MediaQuery.of work.\n\n' +
      'On its own it is awkward, because the data is immutable and you need a StatefulWidget above it to change anything. ' +
      'Provider wraps that pattern: it creates and disposes the object for you, combines an InheritedWidget with a listenable like ChangeNotifier, and gives you watch, read and select so a widget rebuilds only for the part it uses.\n\n' +
      'Riverpod took the next step and moved the state out of the widget tree completely, so it no longer depends on BuildContext at all.'
  },
  {
    id: 'flutter-riverpod-watch-read-listen',
    roles: ['mobile'],
    anchors: ['riverpod'],
    level: 'mid',
    question: 'In Riverpod, what is the difference between ref.watch, ref.read and ref.listen?',
    variants: [
      'When do you use ref.read instead of ref.watch?',
      'Explain ref.watch versus ref.read in Riverpod.',
      'What does ref.listen do in Riverpod?',
      'Why should you not use ref.read inside build?'
    ],
    answer: 'ref.watch subscribes. I use it in build methods and inside other providers, so when the value changes, the widget rebuilds or the dependent provider recomputes. That is the default.\n\n' +
      'ref.read gets the current value once with no subscription. I use it in callbacks, like a button\'s onPressed calling a notifier method. ' +
      'Using read inside build is a classic bug, because the widget will not update when the value changes.\n\n' +
      'ref.listen is for side effects rather than rebuilding: showing a snackbar when a save fails, navigating after login, or logging. It gives me the previous and the next value, so I can react to a transition.\n\n' +
      'And when a widget only cares about one field of a bigger object, I watch it with select, so it rebuilds only when that field changes.'
  },
  {
    id: 'flutter-riverpod-provider-types',
    roles: ['mobile'],
    anchors: ['riverpod'],
    level: 'mid',
    question: 'Which Riverpod provider types do you use, and what are autoDispose and family for?',
    variants: [
      'What is the difference between Provider, FutureProvider and NotifierProvider?',
      'What does autoDispose do in Riverpod?',
      'What is a family provider?',
      'How do you pass a parameter to a Riverpod provider?',
      'Explain AsyncNotifier in Riverpod.'
    ],
    answer: 'Day to day I use a few. A plain Provider for things that do not change, like a repository or an API client, so they can be injected and overridden in tests. ' +
      'FutureProvider or StreamProvider for read-only async data. And Notifier or AsyncNotifier when there is state plus methods that change it, like a cart or a form with a submit.\n\n' +
      'autoDispose means the provider\'s state is thrown away when nothing listens to it any more. I use it for screen-level state, like a search query or a detail page, so it does not leak memory or show stale data when the user comes back. ' +
      'If I want to keep it briefly, keepAlive lets me hold it for a while.\n\n' +
      'family is for providers that need a parameter, like a product by id. Each id gets its own cached instance, and together with autoDispose each one is cleaned up when its screen closes.'
  },
  {
    id: 'flutter-asyncvalue',
    roles: ['mobile'],
    anchors: ['riverpod', 'asyncvalue', 'flutter'],
    level: 'mid',
    question: 'How do you handle loading, error and data states in the UI?',
    variants: [
      'How do you show loading and error states in Flutter?',
      'How do you use AsyncValue in Riverpod?',
      'How do you model API call states in your app?',
      'How do you avoid showing stale data while something reloads?'
    ],
    answer: 'I make the three states explicit in the type instead of juggling booleans. With Riverpod that is AsyncValue, and with BLoC it is a sealed state class with loading, success and failure. ' +
      'Then the screen handles every case on purpose: a skeleton or spinner while loading, the content on data, and an error view with a retry on failure.\n\n' +
      'The reason is that separate isLoading and error flags drift apart, and you get screens that show a spinner and an old error at the same time.\n\n' +
      'Two details I care about. On a refresh I keep showing the previous data with a small progress indicator, rather than wiping the screen, because that feels much better to the user. ' +
      'And errors are mapped to messages a user understands, like "No connection, try again", while the technical detail goes to logging, never to the screen.'
  },
  {
    id: 'flutter-bloc-vs-cubit',
    roles: ['mobile'],
    anchors: ['bloc', 'cubit'],
    level: 'mid',
    question: 'What is the difference between a Bloc and a Cubit?',
    variants: [
      'When would you use a Cubit instead of a Bloc?',
      'Bloc or Cubit, how do you choose?',
      'Explain Cubit in the bloc library.',
      'Why would you use events in BLoC?'
    ],
    answer: 'Both hold state and emit new states, and the UI rebuilds with BlocBuilder in the same way. The difference is how changes come in.\n\n' +
      'A Cubit exposes plain methods, like increment or loadProfile, and calls emit directly. It is less code and easy to read, so it is my default for most features.\n\n' +
      'A Bloc takes events instead, and each event is handled by a registered handler. That adds code, but it gives you things a Cubit does not: every change has a named event you can log and trace, ' +
      'and you can apply event transformers, like debouncing a search box or dropping duplicate taps with droppable, or processing events one after another.\n\n' +
      'So I start with a Cubit, and move to a Bloc when I need that control over how events are processed or a clear audit trail of what the user did.'
  },
  {
    id: 'flutter-changenotifier-valuenotifier',
    roles: ['mobile'],
    anchors: ['flutter', 'changenotifier', 'valuenotifier'],
    level: 'junior',
    question: 'What are ChangeNotifier and ValueNotifier, and when would you use them?',
    variants: [
      'Explain ValueNotifier and ValueListenableBuilder.',
      'What is ChangeNotifier in Flutter?',
      'How do you update one small part of a screen without a library?',
      'What is notifyListeners?'
    ],
    answer: 'Both come with Flutter and implement Listenable, so widgets can rebuild when they change.\n\n' +
      'A ValueNotifier holds a single value and notifies when that value is replaced. With a ValueListenableBuilder I can rebuild just one small part of the screen, ' +
      'like a counter, a password visibility toggle or a selected filter, without touching the rest. It is a nice light tool for local state.\n\n' +
      'A ChangeNotifier is a class where I hold several fields and call notifyListeners myself after changing them. It is what Provider was built around, and it works, but it is mutable, ' +
      'so it is easy to forget a notify or to notify too often and rebuild everything listening.\n\n' +
      'For anything bigger I prefer immutable state in a Notifier or a Cubit, where every change produces a new state object. That is easier to test and to reason about.'
  },
  {
    id: 'flutter-rebuild-scope',
    roles: ['mobile'],
    anchors: ['flutter'],
    level: 'senior',
    question: 'How do you stop unnecessary rebuilds in a Flutter app?',
    variants: [
      'How do you minimise widget rebuilds?',
      'Your screen rebuilds too often, how do you fix it?',
      'How do you find out which widgets are rebuilding?',
      'How do you optimise build methods in Flutter?',
      'What causes too many rebuilds in Flutter?'
    ],
    answer: 'First I measure instead of guessing. The Flutter DevTools rebuild counts and the performance overlay show which widgets rebuild and whether frames are actually slow, because a rebuild on its own is cheap.\n\n' +
      'Then the usual fixes. I listen to state as low in the tree as possible, so a change rebuilds a small widget instead of the whole screen. ' +
      'I select only the field a widget uses, with select in Riverpod or buildWhen in BLoC. I use const constructors, so Flutter can skip unchanged subtrees completely. ' +
      'And I split large build methods into smaller widget classes rather than helper methods, because a separate widget has its own element and can be skipped.\n\n' +
      'I also avoid creating new objects in build that are passed down as parameters, like a fresh list or a new callback every frame, when they could be created once. ' +
      'For expensive painting that changes on its own, a RepaintBoundary keeps it from repainting the rest.'
  },
  {
    id: 'flutter-global-state-auth',
    roles: ['mobile'],
    anchors: ['flutter'],
    level: 'senior',
    question: 'How do you manage the logged in user and authentication state across the app?',
    variants: [
      'How do you handle auth state in Flutter?',
      'How do you redirect to login when the session expires?',
      'Where do you keep the current user in your app?',
      'How do you handle token refresh in a Flutter app?',
      'How do you protect screens that need login?'
    ],
    answer: 'I treat the session as one source of truth: an auth state with signed out, signed in with the user, and loading while it is being restored at start up. ' +
      'It lives in a provider or a bloc at the top of the app, and the rest of the app depends on it rather than holding its own copy.\n\n' +
      'The router listens to that state. With GoRouter, a redirect sends a signed out user to login and brings them back to where they were going afterwards, so no screen has to check on its own.\n\n' +
      'Tokens are kept in secure storage, never in plain preferences. An HTTP interceptor adds the access token to requests and, on a 401, refreshes it once and retries, ' +
      'making sure several failing requests share a single refresh instead of each starting their own. If the refresh fails, the auth state goes to signed out, ' +
      'user-specific caches are cleared, and the router takes the user to login.'
  },
  {
    id: 'flutter-state-persistence',
    roles: ['mobile'],
    anchors: ['flutter', 'hydrated'],
    level: 'mid',
    question: 'How do you keep state when the app is killed and reopened?',
    variants: [
      'How do you persist state in Flutter?',
      'How do you restore the app where the user left off?',
      'How do you save state across app restarts?',
      'What is HydratedBloc?'
    ],
    answer: 'First I decide what is worth keeping. Settings, a draft the user was typing, a cart or the last screen, yes. Data I can fetch again from the server, usually not, or only as a cache.\n\n' +
      'Small values like settings go into shared preferences, sensitive ones like tokens into secure storage, and structured data into a local database such as Drift, Isar or Hive, ' +
      'behind a repository so the rest of the app does not know where it comes from.\n\n' +
      'For state objects, HydratedBloc or a similar approach in Riverpod can save the state as JSON on every change and restore it on start, which works well for things like a form draft. ' +
      'The details that matter are versioning the stored format, so an app update does not crash on old data, and handling a failed restore by falling back to defaults instead of breaking start up.\n\n' +
      'For the screen itself, Flutter\'s restoration API can bring back scroll position and route when the operating system kills the app in the background.'
  },
  {
    id: 'flutter-streams-in-state',
    roles: ['mobile'],
    anchors: ['flutter', 'streambuilder'],
    level: 'mid',
    question: 'How do you use streams in Flutter, and what are the pitfalls of StreamBuilder?',
    variants: [
      'When do you use StreamBuilder?',
      'How do you handle real time data in Flutter?',
      'What mistakes do people make with StreamBuilder?',
      'How do you listen to a Firestore or websocket stream in Flutter?'
    ],
    answer: 'Streams are the right fit for data that keeps changing: a chat, a live location, a websocket, or a database query that emits on every change.\n\n' +
      'The most common StreamBuilder bug is creating the stream inside build. Every rebuild then subscribes to a new stream, you lose the current value and may open new connections. ' +
      'The stream should be created once, in a provider, a bloc or initState, and only consumed in build.\n\n' +
      'Other things I watch: handling the waiting and error states, not just data, cancelling subscriptions in dispose so nothing leaks, and using a broadcast stream when several listeners need the same source.\n\n' +
      'In practice I rarely wire StreamBuilder straight to a service. I put the stream behind a StreamProvider or a bloc, which handles the subscription lifecycle and gives the UI the same loading, data and error states as everything else.'
  },
  {
    id: 'flutter-form-state',
    roles: ['mobile'],
    anchors: ['flutter'],
    level: 'mid',
    question: 'How do you handle forms and validation in Flutter?',
    variants: [
      'How do you build a form with validation in Flutter?',
      'Where do you put validation logic in a Flutter app?',
      'How do you manage a multi step form?',
      'How do you handle form submission and errors?'
    ],
    answer: 'For a simple form I use Flutter\'s Form with TextFormField validators and a GlobalKey to validate on submit. It is built in and handles showing the error under each field.\n\n' +
      'For anything with real rules, like a sign up or a multi step checkout, I move the form state out of the widgets. The values, errors and the submitting flag live in a notifier or a cubit, ' +
      'and validation is plain Dart functions I can unit test without a widget. The UI just shows what the state says and sends changes.\n\n' +
      'A few details make forms feel professional: validate a field after the user leaves it rather than on every keystroke, disable submit while it is sending so there is no double submit, ' +
      'keep the controllers alive across steps so nothing is lost when going back, and show server side errors, like an email already taken, on the right field rather than in a generic message.'
  },
  {
    id: 'flutter-dependency-injection',
    roles: ['mobile'],
    anchors: ['flutter', 'get_it'],
    level: 'senior',
    question: 'How do you do dependency injection in Flutter?',
    variants: [
      'What is dependency injection and how do you use it in Flutter?',
      'Do you use get_it or Riverpod for dependency injection?',
      'How do you swap a real service for a fake in tests?',
      'How do you provide repositories to your widgets?'
    ],
    answer: 'Dependency injection just means a class receives what it needs, like a repository or an API client, instead of creating it itself. ' +
      'That keeps classes loosely coupled and lets me pass a fake in tests.\n\n' +
      'In Flutter I do it in one of two ways. With Riverpod, providers are the injection: a repository provider depends on the client provider, and in tests I override any of them in a ProviderContainer or ProviderScope. ' +
      'With BLoC, I usually register services in get_it or provide them with RepositoryProvider at the top, and pass them into each bloc\'s constructor.\n\n' +
      'Whatever the tool, the rules are the same: constructor injection, depend on abstractions at the boundaries, like an AuthRepository interface, ' +
      'and build the object graph in one place at start up, so the app can switch between dev and production setups, or real and fake services, without touching feature code.'
  },
  {
    id: 'flutter-state-testing',
    roles: ['mobile'],
    anchors: ['flutter', 'bloc_test', 'riverpod'],
    level: 'mid',
    question: 'How do you test your state management logic?',
    variants: [
      'How do you unit test a Bloc or a Cubit?',
      'How do you test Riverpod providers?',
      'How do you test business logic in Flutter without widgets?',
      'How do you mock a repository in a bloc test?'
    ],
    answer: 'Because the logic lives outside the widgets, I can test it as plain Dart, which is fast and reliable.\n\n' +
      'For a bloc or cubit I use bloc_test: build it with a mocked repository from mocktail, act by calling a method or adding an event, and expect the exact sequence of states, ' +
      'like loading then success, or loading then failure when the repository throws.\n\n' +
      'For Riverpod I create a ProviderContainer with the repository provider overridden by a fake, read the notifier, call its method and check the state, including the AsyncValue going through loading to data or error.\n\n' +
      'I focus the tests on the rules that matter: the happy path, the error path, and edge cases like an empty list or a retry after a failure. ' +
      'Then a few widget tests check that the screen shows the right thing for each state, without repeating the logic tests.'
  },
  {
    id: 'flutter-state-choice-new-project',
    roles: ['mobile'],
    anchors: ['flutter', 'getx', 'mobx', 'redux'],
    level: 'senior',
    question: 'What do you think about GetX, MobX or Redux for Flutter?',
    variants: [
      'Why do you not use GetX?',
      'Have you used Redux in Flutter?',
      'What are the downsides of GetX?',
      'How do you choose a state management solution for a new project?'
    ],
    answer: 'I judge a state solution on a few things: does it keep business logic out of the UI, is it easy to test, does the team know it, and will it still be maintained in a few years.\n\n' +
      'GetX is quick to start with, but it bundles state, navigation and dependency injection with a lot of global access and magic, so large apps get hard to test and reason about, ' +
      'and teams I have seen tend to migrate away from it. MobX works well with observables and code generation, but it is less common in Flutter teams now. ' +
      'Redux gives a single store and very predictable updates, but it is a lot of boilerplate for most mobile apps.\n\n' +
      'For a new project I would pick Riverpod or BLoC, because both are well maintained, widely known, and testable. ' +
      'If I join a team on something else that is working, I would not rewrite it for taste; I would keep the architecture clean around it.'
  }
];
