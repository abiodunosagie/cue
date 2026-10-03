// Flutter testing, CI/CD, releases and monitoring.
module.exports = [
  {
    id: 'flutter-testing-strategy',
    roles: ['mobile'],
    anchors: ['flutter', 'testing', 'tests'],
    level: 'senior',
    question: 'How do you test a Flutter app?',
    variants: [
      'What is your testing strategy for Flutter?',
      'Unit, widget and integration tests, how do you balance them?',
      'What kinds of tests do you write in Flutter?',
      'How much do you test in a Flutter project?'
    ],
    answer: 'I follow the testing pyramid. Most tests are unit tests of plain Dart: blocs, notifiers, use cases, repositories and mappers, with the dependencies faked. They are fast and they protect the business rules, which is where bugs cost the most.\n\n' +
      'Then widget tests for screens and important components. They pump a widget with fake state and check that the right thing shows for loading, data and error, and that taps send the right actions. They run without a device and are still quick.\n\n' +
      'At the top, a small number of integration tests for the critical journeys, like sign in and checkout, running on a real device or emulator in CI.\n\n' +
      'I care less about a coverage number than about covering the risky paths: money, auth, data loss and error handling. Every bug fix gets a test that would have caught it.'
  },
  {
    id: 'flutter-widget-tests',
    roles: ['mobile'],
    anchors: ['flutter', 'widget test', 'pumpwidget', 'testwidgets'],
    level: 'mid',
    question: 'How do you write a widget test in Flutter?',
    variants: [
      'What is pumpWidget and pumpAndSettle?',
      'How do you find widgets in a widget test?',
      'How do you test a screen that loads data?',
      'How do you mock dependencies in widget tests?'
    ],
    answer: 'A widget test uses testWidgets and a WidgetTester. I pump the widget wrapped in what it needs, usually a MaterialApp and a ProviderScope or BlocProvider with fake or mocked dependencies, so no real network is involved.\n\n' +
      'Then I find widgets with finders, by text, by key or by type, interact with tap or enterText, and call pump to rebuild. pumpAndSettle waits until animations finish, ' +
      'but I avoid it when something animates forever, like a spinner, and pump a fixed duration instead.\n\n' +
      'For a screen that loads data, I test each state: give the fake a delayed result and check the loader shows, complete it and check the content, then make it fail and check the error and retry. ' +
      'I give important widgets keys so tests do not break when wording changes, and I test behaviour the user sees, not internal implementation details.'
  },
  {
    id: 'flutter-mocking',
    roles: ['mobile'],
    anchors: ['flutter', 'mocktail', 'mockito', 'mock', 'fake'],
    level: 'mid',
    question: 'How do you mock dependencies in Dart tests, mocks versus fakes?',
    variants: [
      'mocktail or mockito, which do you use?',
      'What is the difference between a mock, a stub and a fake?',
      'How do you mock an API call in a Flutter test?',
      'How do you verify a method was called in Dart tests?'
    ],
    answer: 'I mostly use mocktail, because it needs no code generation and works well with null safety. With it I stub return values with when and thenAnswer, make calls throw to test the error path, and verify that a method was called with the right arguments.\n\n' +
      'I distinguish between the two kinds of doubles. A mock checks interactions, like "the repository\'s save was called once". A fake is a small working implementation, like an in-memory repository. ' +
      'For repositories I often prefer fakes, because tests read more naturally and do not break when I refactor how the calls are made.\n\n' +
      'The rule I follow is to mock at the boundaries, like the API client or storage, not my own small classes, and never mock the thing I am actually testing. ' +
      'Too much mocking makes tests that pass while the real code is broken.'
  },
  {
    id: 'flutter-golden-tests',
    roles: ['mobile'],
    anchors: ['flutter', 'golden', 'goldens', 'screenshot'],
    level: 'senior',
    question: 'What are golden tests, and do you use them?',
    variants: [
      'How do you do screenshot or visual regression testing in Flutter?',
      'What is matchesGoldenFile?',
      'Why do golden tests fail on different machines?',
      'How do you test that a widget looks right?'
    ],
    answer: 'A golden test renders a widget and compares it pixel by pixel with a saved reference image. It catches visual regressions that normal tests miss, like a padding change, a wrong colour or text overflowing in another language.\n\n' +
      'I use them for the design system components and a few key screens, in light and dark mode and at a large text scale, because those are the places where a small change spreads everywhere.\n\n' +
      'The known pain is that font rendering differs between operating systems, so goldens made on a Mac can fail on a Linux CI machine. ' +
      'The fix is to generate and compare them in the same environment, usually CI or a Docker image, load real fonts in tests, and use a tolerance or tools like alchemist. ' +
      'When a golden fails on purpose, the updated image is reviewed in the pull request like any other change.'
  },
  {
    id: 'flutter-integration-tests',
    roles: ['mobile'],
    anchors: ['flutter', 'integration test', 'patrol', 'e2e'],
    level: 'senior',
    question: 'How do you do end to end or integration testing for a Flutter app?',
    variants: [
      'What is integration_test in Flutter?',
      'Have you used Patrol for Flutter tests?',
      'How do you test native dialogs like permissions in Flutter?',
      'How do you run integration tests in CI?'
    ],
    answer: 'I use the integration_test package for end to end tests. They run the real app on a device or emulator and drive it with the same finders as widget tests, so they cover the full stack, including plugins and navigation.\n\n' +
      'I keep them few and focused on the journeys that must never break, like onboarding, login and payment, because they are slower and more fragile than unit tests. ' +
      'They run against a test backend or a mocked API layer with seeded data, so results are repeatable.\n\n' +
      'Plain Flutter tests cannot tap native UI like permission dialogs or notifications. Patrol solves that, and I have found it worth adding when those flows matter. ' +
      'In CI they run on emulators or on a device farm like Firebase Test Lab, usually on merge rather than every commit, to keep feedback fast.'
  },
  {
    id: 'flutter-ci-cd',
    roles: ['mobile'],
    anchors: ['flutter', 'ci', 'cd', 'fastlane', 'codemagic', 'github actions'],
    level: 'senior',
    question: 'How do you set up CI/CD for a Flutter app?',
    variants: [
      'How do you automate Flutter builds and releases?',
      'Have you used Codemagic, Fastlane or GitHub Actions for Flutter?',
      'What runs in your CI pipeline for a mobile app?',
      'How do you ship a new build to testers automatically?'
    ],
    answer: 'On every pull request the pipeline runs the format check, flutter analyze, and the unit and widget tests, and builds the app, so broken code cannot be merged.\n\n' +
      'On merge to the main or release branch, it builds signed release artifacts per flavor: an app bundle for Android and an IPA for iOS. ' +
      'The signing keys and certificates live in the CI secret store, never in the repository. Builds then go out automatically to testers, through Firebase App Distribution or TestFlight and the Play internal track.\n\n' +
      'For store releases I use Fastlane or Codemagic\'s publishing to upload builds and metadata, with the version and build number set from the pipeline. ' +
      'I like GitHub Actions for the checks and Codemagic for iOS builds, since it handles the Mac machines and signing. The goal is that a release is a button press, not a day of manual steps.'
  },
  {
    id: 'flutter-app-signing-release',
    roles: ['mobile'],
    anchors: ['flutter', 'signing', 'keystore', 'testflight', 'play console', 'app store'],
    level: 'mid',
    question: 'How do you release a Flutter app to the App Store and Google Play?',
    variants: [
      'What are the steps to publish a Flutter app?',
      'How does app signing work on Android and iOS?',
      'What is the Android upload key and Play App Signing?',
      'How do you handle versioning for app releases?'
    ],
    answer: 'Both stores need a signed release build. On Android I build an app bundle signed with the upload key, and Play App Signing holds the real app signing key, so a lost upload key can be reset. ' +
      'On iOS, the build is signed with a distribution certificate and provisioning profile, archived and uploaded to App Store Connect.\n\n' +
      'The version name follows semantic versioning for users, and the build number goes up on every upload, both set in pubspec.\n\n' +
      'I release in stages. Internal testers first, through TestFlight and the Play internal track, then a closed group, then production. ' +
      'On Play I use a staged rollout, starting at a small percentage while watching crash rates, and on iOS the phased release, so a bad build can be halted before it reaches everyone. ' +
      'Store listings, screenshots, the privacy details and the data safety form are kept up to date with each release.'
  },
  {
    id: 'flutter-crash-reporting',
    roles: ['mobile'],
    anchors: ['flutter', 'crashlytics', 'sentry', 'crash', 'crashes'],
    level: 'mid',
    question: 'How do you monitor crashes and errors in production?',
    variants: [
      'How do you set up Crashlytics or Sentry in Flutter?',
      'How do you know when the app crashes for users?',
      'How do you read obfuscated Flutter stack traces?',
      'How do you track non-fatal errors?'
    ],
    answer: 'I set up crash reporting, Crashlytics or Sentry, at the very start of main, and route Flutter errors and uncaught async errors to it, so both fatal crashes and handled problems are reported.\n\n' +
      'Release builds are obfuscated, so I upload the debug symbols from CI for every build, otherwise the stack traces are unreadable. ' +
      'I attach useful context without personal data: app version, flavor, screen, and an anonymous user id, plus breadcrumbs of recent navigation.\n\n' +
      'Non-fatal errors matter too. Failed payments or parsing errors are logged as non-fatal events, which often reveal backend problems before users complain.\n\n' +
      'Then I watch the crash-free users rate after each release and have alerts on new or spiking issues, so a bad release is caught during the staged rollout.'
  },
  {
    id: 'flutter-shorebird-ota',
    roles: ['mobile'],
    anchors: ['flutter', 'shorebird', 'code push', 'hotfix'],
    level: 'senior',
    question: 'How do you ship an urgent fix to a mobile app quickly?',
    variants: [
      'Can you update a Flutter app without the store?',
      'What is Shorebird code push?',
      'How do you handle a critical bug in production on mobile?',
      'How do you roll back a bad mobile release?'
    ],
    answer: 'The first move is to stop the damage. If the bug sits behind a feature flag, I switch the feature off remotely. On Play I halt the staged rollout, and on iOS I pause the phased release, so fewer users get the bad build.\n\n' +
      'Then the fix goes through the pipeline as a hotfix build. Apple can review expedited requests quickly for critical issues, and Play reviews are usually fast.\n\n' +
      'For Flutter there is also code push with Shorebird, which can patch Dart code over the air without a store release, within the store rules, since it changes Dart code, not native code. ' +
      'It is useful for urgent fixes, but I would still treat it with the same testing discipline as a normal release.\n\n' +
      'Mobile releases cannot be rolled back like a website, which is exactly why feature flags, staged rollouts and good monitoring matter so much.'
  },
  {
    id: 'flutter-analytics',
    roles: ['mobile'],
    anchors: ['flutter', 'analytics', 'events', 'tracking'],
    level: 'mid',
    question: 'How do you add analytics to a mobile app without making a mess?',
    variants: [
      'How do you track events in a Flutter app?',
      'How do you structure analytics events?',
      'How do you handle analytics and user privacy?',
      'How do you avoid analytics code spread across the app?'
    ],
    answer: 'I put analytics behind one small interface, like an AnalyticsService with methods for the events we care about. Screens call that, not the Firebase or Mixpanel SDK directly, so we can change providers or send to two at once without touching features.\n\n' +
      'Events are planned with the product team: a short list with clear names and properties, like checkout_started with the cart value, written down so everyone means the same thing. ' +
      'Screen views are tracked automatically through a navigator observer.\n\n' +
      'Privacy is part of the design: no personal data in events, respecting the user\'s consent and App Tracking Transparency on iOS, and a way to turn tracking off. ' +
      'In debug builds events are only logged to the console, so test data does not pollute the real numbers.'
  },
  {
    id: 'flutter-test-coverage-tdd',
    roles: ['mobile'],
    anchors: ['flutter', 'tdd', 'coverage'],
    level: 'mid',
    question: 'Do you practise TDD, and how do you think about test coverage?',
    variants: [
      'What is test driven development?',
      'What test coverage do you aim for?',
      'Is 100 percent coverage worth it?',
      'Do you write tests before or after the code?'
    ],
    answer: 'I use test-first where it pays off most: business logic with clear rules, like a pricing calculation, a validator or a state machine. Writing the test first makes me define the behaviour and edge cases before the code, and the design usually ends up simpler.\n\n' +
      'For UI and exploratory work, I write tests right after, once the shape has settled, because tests written too early for a changing screen just get rewritten.\n\n' +
      'On coverage, I treat the number as a hint, not a goal. Around 70 to 80 percent on the domain and data layers is healthy, but 100 percent usually means testing getters and framework code for the sake of the number. ' +
      'What I really want covered are the risky paths: money, authentication, data loss, error handling and every bug we have already fixed.'
  },
  {
    id: 'flutter-code-review',
    roles: ['mobile'],
    anchors: ['flutter', 'code review', 'pull request'],
    level: 'senior',
    question: 'What do you look for when reviewing Flutter code?',
    variants: [
      'How do you review a pull request in a Flutter project?',
      'What are common mistakes you catch in Flutter code reviews?',
      'What makes a good Flutter pull request?',
      'How do you give feedback in code reviews?'
    ],
    answer: 'Formatting and lint issues should already be handled by CI, so in review I focus on what tools miss.\n\n' +
      'Correctness first: does it handle loading, empty and error states, what happens on a slow network or a double tap, and are there edge cases like an empty list or a null field. ' +
      'Then Flutter-specific traps: controllers and subscriptions not disposed, context used after an await, a heavy build method, or a list that is not built lazily.\n\n' +
      'Then design: is business logic sitting in widgets instead of the state layer, does it follow the project\'s structure, and is the new logic tested.\n\n' +
      'I keep feedback specific and kind, explain the why, separate must-fix from suggestions, and approve quickly when it is good. I also ask for small pull requests, because big ones get shallow reviews.'
  },
  {
    id: 'flutter-version-upgrades',
    roles: ['mobile'],
    anchors: ['flutter', 'upgrade', 'dependencies', 'pubspec'],
    level: 'senior',
    question: 'How do you manage Flutter and package upgrades in a production app?',
    variants: [
      'How do you upgrade Flutter versions safely?',
      'How do you handle breaking changes in packages?',
      'How do you manage dependencies in pubspec?',
      'How do you choose which Flutter packages to depend on?'
    ],
    answer: 'I upgrade regularly in small steps rather than once a year in a painful jump. A pinned Flutter version, with FVM or the CI config, makes sure everyone and the pipeline build with the same SDK.\n\n' +
      'For each upgrade I read the release notes and breaking changes, run dart fix which migrates many changes automatically, then analyze, run all tests and do a manual smoke test on both platforms, ' +
      'especially anything touching native code like permissions, maps or payments.\n\n' +
      'Before adding a package I check how well it is maintained, its scores on pub.dev, open issues, and whether I could write the small part I need myself. ' +
      'Fewer dependencies mean fewer upgrade problems. I keep the lock file committed so builds are reproducible, and upgrade dependencies on purpose, not by accident.'
  },
  {
    id: 'flutter-performance-monitoring',
    roles: ['mobile'],
    anchors: ['flutter', 'monitoring', 'performance monitoring', 'startup time'],
    level: 'senior',
    question: 'How do you monitor app performance in production, not just crashes?',
    variants: [
      'How do you measure start up time and slow screens for real users?',
      'Do you use Firebase Performance Monitoring?',
      'How do you track API latency from the app?',
      'How do you know the app got slower after a release?'
    ],
    answer: 'Crash-free rate is only half the picture, so I also measure how the app feels for real users.\n\n' +
      'I track app start time, time to first meaningful screen for key flows, and slow or frozen frames, using Firebase Performance, Sentry performance or a similar tool. ' +
      'Network requests are traced automatically or through the API client, which gives latency and failure rates per endpoint from real devices and networks, ' +
      'often very different from what we see on office wifi.\n\n' +
      'For important flows, like search or checkout, I add custom traces with start and stop around the operation.\n\n' +
      'Then I compare releases. If start up time or an endpoint\'s latency jumps after a version, I can see it during the staged rollout and investigate before it reaches everyone.'
  }
];
