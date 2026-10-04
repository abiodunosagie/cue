// More Flutter and Dart questions: tooling, async UI and newer language features.
module.exports = [
  {
    id: 'flutter-hot-reload-restart',
    roles: ['mobile'],
    anchors: ['flutter', 'hot reload', 'hot restart'],
    level: 'junior',
    question: 'What is the difference between hot reload and hot restart in Flutter?',
    variants: [
      'When does hot reload not pick up a change?',
      'Hot reload versus hot restart versus full restart?',
      'Why did my change not show after hot reload?',
      'How does hot reload work?'
    ],
    answer: 'Hot reload injects the changed code into the running Dart VM and rebuilds the widget tree, keeping the app\'s state. It is what makes UI work so fast: I change padding or a colour and see it in about a second, still on the same screen.\n\n' +
      'Hot restart reloads the code and restarts the app from main, so all state is lost, but it is still faster than a full rebuild.\n\n' +
      'Hot reload cannot apply everything. Changes to initState or main do not run again, because those already ran. Changing a field\'s initialiser, enums, generic types, or global and static variables usually needs a hot restart. ' +
      'Native code changes, like Kotlin or Swift files, new plugins or Info.plist edits, need a full rebuild.\n\n' +
      'So when a change does not appear, I first ask whether that code runs on rebuild at all, and use a hot restart before assuming something is broken.'
  },
  {
    id: 'flutter-futurebuilder-pitfalls',
    roles: ['mobile'],
    anchors: ['flutter', 'futurebuilder'],
    level: 'mid',
    question: 'What are the common mistakes with FutureBuilder?',
    variants: [
      'Why does my FutureBuilder call the API again on every rebuild?',
      'How do you use FutureBuilder correctly?',
      'When should you not use FutureBuilder?',
      'FutureBuilder keeps showing the loading spinner, why?'
    ],
    answer: 'The classic mistake is creating the future inside build, like passing fetchUser() directly to FutureBuilder. Every rebuild then starts a new request and resets the builder to loading, so the API is called many times and the UI flickers.\n\n' +
      'The future must be created once, in initState, or better in a provider or bloc, and stored, so build only reads it. ' +
      'The builder must also handle every state: waiting, error and data, including the case where data is null.\n\n' +
      'FutureBuilder is fine for a simple one-off load on a single screen. For anything with refresh, caching, retry or sharing between screens, I move it into Riverpod\'s FutureProvider or a notifier, ' +
      'which handles the lifecycle, keeps the previous data during a refresh, and makes the logic testable.'
  },
  {
    id: 'flutter-passing-data-between-screens',
    roles: ['mobile'],
    anchors: ['flutter', 'gorouter'],
    level: 'junior',
    question: 'How do you pass data to a screen and get a result back in Flutter?',
    variants: [
      'How do you return a value from a screen in Flutter?',
      'How do you pass arguments when navigating?',
      'How do you get data back from a bottom sheet or dialog?',
      'Should you pass whole objects or ids between screens?'
    ],
    answer: 'To pass data in, I prefer passing an id rather than a whole object, for example the order id in the route path. The next screen loads the latest data from the repository, which also makes deep links and app restarts work, because the URL alone is enough.\n\n' +
      'For a result back, Navigator.push returns a Future that completes with whatever the next screen passes to pop. In GoRouter, context.push also returns that value, and context.pop sends it. ' +
      'Dialogs and bottom sheets work the same way: showDialog returns a Future with the value the dialog popped with, and I handle null for when the user dismissed it.\n\n' +
      'If several screens need to know about a change, like a profile edit, I do not rely on returned values; the change goes through shared state, so every screen watching it updates.'
  },
  {
    id: 'flutter-mediaquery-sizeof',
    roles: ['mobile'],
    anchors: ['flutter', 'mediaquery'],
    level: 'senior',
    question: 'Why should you use MediaQuery.sizeOf instead of MediaQuery.of(context).size?',
    variants: [
      'Why does the keyboard opening rebuild my whole screen?',
      'What are the MediaQuery aspect methods?',
      'How do you avoid unnecessary rebuilds from MediaQuery?',
      'What does MediaQuery.paddingOf do?'
    ],
    answer: 'MediaQuery.of(context) makes the widget depend on the entire MediaQueryData. Whenever any part of it changes, like the keyboard insets while the keyboard animates, text scaling or the padding, every widget that called it rebuilds, even if it only needed the screen size.\n\n' +
      'Since Flutter 3.10 there are aspect methods: sizeOf, paddingOf, viewInsetsOf, textScalerOf and so on. They make the widget depend only on that one property, using InheritedModel, so a screen that reads only the size no longer rebuilds on every frame of the keyboard animation.\n\n' +
      'It is a small change with a noticeable effect on complex screens, and I combine it with LayoutBuilder when a widget really needs its own available space rather than the screen\'s.'
  },
  {
    id: 'flutter-riverpod-generator',
    roles: ['mobile'],
    anchors: ['riverpod', 'riverpod_generator'],
    level: 'mid',
    question: 'Do you use Riverpod code generation, and what does it change?',
    variants: [
      'What is riverpod_generator?',
      'What does the @riverpod annotation do?',
      'Riverpod with or without code generation?',
      'What are the benefits of Riverpod 2 code generation?'
    ],
    answer: 'With riverpod_generator, I annotate a function or a class with @riverpod and the generator creates the provider. A function becomes a read-only provider, a class with a build method becomes a Notifier or AsyncNotifier.\n\n' +
      'The benefits: I stop choosing between many provider types by hand, because the right one is picked from the return type; parameters become family providers automatically, with any number of typed arguments; ' +
      'and autoDispose is the default, which prevents leaks, with keepAlive when I want state to stay.\n\n' +
      'The cost is the build_runner step, like any generation. On a new project I use it because it removes a lot of decisions and boilerplate; on an existing project with manual providers, both styles can live together, so there is no need for a big migration.'
  },
  {
    id: 'flutter-bloc-event-transformers',
    roles: ['mobile'],
    anchors: ['bloc', 'bloc_concurrency'],
    level: 'senior',
    question: 'How do you control how BLoC processes events, for example debouncing search or ignoring double taps?',
    variants: [
      'What are event transformers in BLoC?',
      'What is bloc_concurrency used for?',
      'How do you debounce events in a Bloc?',
      'What is the difference between sequential, droppable and restartable in BLoC?'
    ],
    answer: 'Since bloc 8, each event handler can take a transformer that decides how events of that type are processed. The bloc_concurrency package gives the common ones.\n\n' +
      'concurrent, the default, processes events in parallel. sequential processes them one at a time in order, which suits operations that must not overlap, like saving. ' +
      'droppable ignores new events while one is being handled, which is perfect for a pay or submit button, so a double tap does not send two payments. ' +
      'restartable cancels the running handler when a new event arrives, which is what search needs: only the latest query matters.\n\n' +
      'For search I combine a debounce with restartable, written as a custom transformer, so the API is called only after typing pauses, and any older in-flight request is dropped. ' +
      'It keeps that logic out of the widgets and makes it testable.'
  },
  {
    id: 'dart-extension-types',
    roles: ['mobile'],
    anchors: ['dart', 'extension type', 'extension types'],
    level: 'senior',
    question: 'What are extension types in Dart and when would you use them?',
    variants: [
      'Explain Dart 3.3 extension types.',
      'How do you make a type-safe id in Dart without overhead?',
      'Extension type versus a wrapper class?',
      'How do you stop mixing up a userId and an orderId in Dart?'
    ],
    answer: 'Extension types, added in Dart 3.3, give a new static type to an existing representation type with zero runtime cost. At compile time it is a distinct type with its own API; at runtime it is just the underlying value, with no wrapper object.\n\n' +
      'The classic use is type-safe ids and units. If UserId and OrderId are both extension types over String, the compiler stops me passing an order id where a user id is expected, which plain strings would allow. ' +
      'The same goes for amounts in minor units, or a validated email.\n\n' +
      'They are also used for interop, like JavaScript interop types in Dart for the web.\n\n' +
      'The trade-off is that they are a compile-time view only: a cast can bypass them, and there is no runtime check. When I need runtime guarantees or real behaviour, like validation that cannot be skipped, a small class is still the better choice.'
  },
  {
    id: 'dart-pubspec-versioning',
    roles: ['mobile'],
    anchors: ['pubspec', 'dart', 'flutter'],
    level: 'mid',
    question: 'How do version constraints work in pubspec.yaml, and when would you use dependency_overrides?',
    variants: [
      'What does the caret in a pubspec version mean?',
      'How do you resolve a version conflict between two packages?',
      'Should pubspec.lock be committed?',
      'What is dependency_overrides for?'
    ],
    answer: 'A caret constraint like ^2.3.0 means any compatible version from 2.3.0 up to, but not including, 3.0.0, following semantic versioning, where a new major version may break the API.\n\n' +
      'For an app I commit pubspec.lock, so everyone and the CI build with exactly the same versions; for a package published for others, the lock file is not used by consumers.\n\n' +
      'When two packages need incompatible versions of a shared dependency, I first check for newer versions of either that agree, with flutter pub outdated. ' +
      'dependency_overrides forces a version for the whole app, and it is useful for a temporary fix, like pointing to a git fork with a patch, but it bypasses the solver\'s safety. ' +
      'So I treat any override as temporary, with a comment explaining why and when to remove it.'
  },
  {
    id: 'flutter-assets-fonts',
    roles: ['mobile'],
    anchors: ['flutter', 'flutter_gen'],
    level: 'junior',
    question: 'How do you manage images, fonts and other assets in a Flutter project?',
    variants: [
      'How do you add custom fonts to Flutter?',
      'How do you handle images for different screen densities?',
      'Do you use flutter_gen for assets?',
      'SVG or PNG for icons in Flutter?'
    ],
    answer: 'Assets are declared in pubspec under flutter assets, usually by folder, and fonts under fonts with their weights and styles, so the right file is picked for bold or italic text.\n\n' +
      'For raster images I provide 2x and 3x variants in subfolders, and Flutter picks the right one for the device\'s pixel density. For icons and illustrations I prefer SVG with flutter_svg, or an icon font, because one file stays sharp at every size and keeps the app smaller.\n\n' +
      'I avoid string paths scattered in code: flutter_gen generates typed references to every asset, so a renamed or missing file is a compile error instead of a runtime crash.\n\n' +
      'And I keep assets lean: compressed images, subset fonts, and large or rarely used media downloaded on demand instead of bundled.'
  },
  {
    id: 'flutter-conditional-imports',
    roles: ['mobile'],
    anchors: ['flutter', 'conditional import', 'kIsWeb'],
    level: 'senior',
    question: 'How do you write platform-specific code in a Flutter app that also runs on the web?',
    variants: [
      'What are conditional imports in Dart?',
      'Why does dart:io break my Flutter web build?',
      'How do you use kIsWeb and Platform checks?',
      'How do you share code between mobile and web in Flutter?'
    ],
    answer: 'dart:io is not available on the web, so code that imports it directly breaks the web build, even if it is never called there.\n\n' +
      'For small behaviour differences I check kIsWeb first and then defaultTargetPlatform, which works everywhere, instead of Platform from dart:io.\n\n' +
      'For real implementation differences I use conditional imports: one file defines an abstract interface, and the import line chooses a mobile implementation when dart:io is available or a web implementation when dart:js_interop is, ' +
      'like a file saver that writes to disk on mobile and triggers a download in the browser. The rest of the app only knows the interface.\n\n' +
      'Plugins often do this for me with federated implementations, so I check a plugin\'s platform support before relying on it.'
  },
  {
    id: 'flutter-skeleton-loading',
    roles: ['mobile'],
    anchors: ['flutter'],
    level: 'mid',
    question: 'How do you design loading states that feel fast in a Flutter app?',
    variants: [
      'Spinner or skeleton screen?',
      'How do you implement shimmer loading in Flutter?',
      'How do you make an app feel faster without making it faster?',
      'What is optimistic UI on mobile?'
    ],
    answer: 'Perceived speed matters as much as real speed. A blank screen with a spinner feels slow; a skeleton that matches the final layout feels fast, because the user sees the structure immediately and nothing jumps when the content arrives.\n\n' +
      'So for lists and detail screens I show skeleton placeholders, with a subtle shimmer or the skeletonizer package, which can turn the real widgets into skeletons so the layout matches exactly. ' +
      'Spinners are for short actions, like a button submitting.\n\n' +
      'Other techniques: show cached data instantly and refresh in the background, optimistic updates for actions like liking or adding to a cart, rolled back on failure, ' +
      'and prefetching the next screen\'s data when the user is likely to go there. And the loading state is never infinite: there is a timeout and a clear retry.'
  },
  {
    id: 'flutter-keep-alive-tabs',
    roles: ['mobile'],
    anchors: ['flutter', 'automatickeepaliveclientmixin', 'pageview', 'tabbarview'],
    level: 'mid',
    question: 'Why do my tabs lose their scroll position and state, and how do you keep it?',
    variants: [
      'What is AutomaticKeepAliveClientMixin?',
      'How do you keep the state of a page in a PageView?',
      'Why does my list reload when I switch tabs?',
      'How do you preserve scroll position in Flutter?'
    ],
    answer: 'TabBarView and PageView build pages lazily and dispose pages that go off screen, so their State, including scroll position and loaded data, is thrown away and rebuilt when the user comes back.\n\n' +
      'To keep a page alive, its State mixes in AutomaticKeepAliveClientMixin, returns true from wantKeepAlive and calls super.build. Then the page stays in memory while the tab is not visible.\n\n' +
      'For scroll position alone, a PageStorageKey on the scrollable restores the offset without keeping the whole page alive. ' +
      'For bottom navigation, an IndexedStack or GoRouter\'s StatefulShellRoute keeps each tab\'s subtree.\n\n' +
      'I am selective, because every kept-alive page holds memory. And data itself should live in state management, so even if a page is rebuilt, the list is not fetched again.'
  },
  {
    id: 'flutter-error-widget-release',
    roles: ['mobile'],
    anchors: ['flutter', 'errorwidget'],
    level: 'senior',
    question: 'What do users see when a widget throws in a release build, and how do you handle it?',
    variants: [
      'How do you replace the red error screen in Flutter?',
      'What is ErrorWidget.builder?',
      'Why does part of my release app show a grey box?',
      'How do you handle build errors gracefully in production?'
    ],
    answer: 'In debug mode, a widget that throws during build shows the red error screen. In release, Flutter shows a plain grey box instead, which looks broken and tells the user nothing.\n\n' +
      'I set ErrorWidget.builder at start up to show a small, friendly fallback, like "Something went wrong here" with the app\'s styling, so a failing widget does not leave an ugly hole, and the rest of the screen keeps working. ' +
      'In debug I keep the detailed version, so developers still see the problem.\n\n' +
      'At the same time, FlutterError.onError reports the error with its stack trace to crash reporting, so the team knows it happened.\n\n' +
      'The real fix is preventing it: handling null and empty data, validating API models in the data layer, and widget tests for unusual states. The fallback is a safety net, not the plan.'
  }
];
