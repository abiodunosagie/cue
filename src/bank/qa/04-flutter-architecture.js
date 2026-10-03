// Flutter architecture: clean architecture, MVVM, repositories, project structure.
module.exports = [
  {
    id: 'flutter-clean-architecture',
    roles: ['mobile'],
    anchors: ['flutter', 'clean architecture'],
    level: 'senior',
    question: 'How do you apply clean architecture in a Flutter app?',
    variants: [
      'What layers does your Flutter app have?',
      'Explain clean architecture in Flutter.',
      'How do you separate presentation, domain and data?',
      'What goes in the domain layer?',
      'How do you structure a Flutter project with clean architecture?'
    ],
    answer: 'I use three layers with one rule: dependencies point inwards. The domain layer is in the middle and is plain Dart: entities, repository interfaces and use cases. It knows nothing about Flutter, HTTP or databases.\n\n' +
      'The data layer implements those repository interfaces. It holds the API clients, local storage and the models that map JSON to and from the domain entities, and it turns raw exceptions into domain failures.\n\n' +
      'The presentation layer is the widgets plus the state holders, like blocs or notifiers, which call use cases or repositories and expose state for the UI.\n\n' +
      'The payoff is that business rules can be tested without any framework, and the data source can change, say from REST to GraphQL or adding an offline cache, without touching the UI. ' +
      'I do not apply it dogmatically, though. For a small feature, a use case that only forwards one call adds nothing, so I let the notifier call the repository directly and add use cases where there is real logic to put in them.'
  },
  {
    id: 'flutter-mvvm',
    roles: ['mobile'],
    anchors: ['flutter', 'mvvm', 'viewmodel'],
    level: 'mid',
    question: 'How does MVVM work in a Flutter app?',
    variants: [
      'What is MVVM?',
      'What is a ViewModel in Flutter?',
      'MVVM versus clean architecture, what is the difference?',
      'How do you implement MVVM with Riverpod or Provider?'
    ],
    answer: 'MVVM splits a screen into three parts. The View is the widgets: it only displays state and forwards user actions. The ViewModel holds the screen\'s state and logic: it calls the data layer, transforms the results into what the screen needs, and exposes it as observable state. ' +
      'The Model is the data and the repositories behind it.\n\n' +
      'In Flutter, the ViewModel is usually a ChangeNotifier, a Riverpod Notifier or a Cubit, and the View listens to it. Flutter\'s own architecture guide now recommends this shape, with repositories and services under the ViewModels.\n\n' +
      'MVVM and clean architecture are not competitors. MVVM describes the presentation layer, and clean architecture describes the layers below it. ' +
      'In most apps I combine them: ViewModels in presentation, use cases where the domain has real rules, and repositories in data.'
  },
  {
    id: 'flutter-repository-pattern',
    roles: ['mobile'],
    anchors: ['flutter', 'repository'],
    level: 'mid',
    question: 'What is the repository pattern and why do you use it?',
    variants: [
      'Why use repositories in Flutter?',
      'What does a repository do?',
      'How do you combine API and local cache data in one place?',
      'What is the difference between a repository and a data source?'
    ],
    answer: 'A repository is the single place the rest of the app asks for data, like a UserRepository with getUser and updateProfile. The callers do not know or care whether the data comes from the network, a local database or a cache.\n\n' +
      'Under it I usually have data sources: a remote one that talks to the API and a local one for storage. The repository decides how to combine them, for example return the cached data at once and refresh it from the network, ' +
      'or write locally first and sync later. It also maps API models to domain entities and turns exceptions into meaningful failures.\n\n' +
      'The benefits are that caching and offline logic live in one place instead of being spread over screens, I can swap the backend without touching the UI, ' +
      'and in tests I can give a bloc or a ViewModel a fake repository and test it without any network.'
  },
  {
    id: 'flutter-use-cases',
    roles: ['mobile'],
    anchors: ['flutter', 'use case', 'usecase', 'use cases'],
    level: 'senior',
    question: 'What are use cases in clean architecture, and are they always needed?',
    variants: [
      'Do you write a use case for every action?',
      'What is an interactor or use case?',
      'Is clean architecture overkill for small apps?',
      'When do you skip the domain layer?'
    ],
    answer: 'A use case is one business action, like PlaceOrder or RefreshSession. It coordinates repositories and holds the rules for that action: checking the cart is not empty, applying a discount, saving the order and clearing the cart.\n\n' +
      'They are valuable when the logic is shared between screens or is complex enough to deserve its own tests. Then it lives in one place instead of being copied into several ViewModels.\n\n' +
      'But I do not create one for every call. A use case that only calls repository.getProducts and returns the result is just ceremony, and it slows the team down. ' +
      'My rule is to start simple, with the ViewModel calling the repository, and extract a use case the moment real business logic appears or the same steps are needed in a second place. ' +
      'Architecture should match the size of the problem, and a small app with a heavy structure is as hard to work in as a large app with none.'
  },
  {
    id: 'flutter-folder-structure',
    roles: ['mobile'],
    anchors: ['flutter', 'folder', 'feature first', 'structure'],
    level: 'mid',
    question: 'How do you organise the folders in a Flutter project?',
    variants: [
      'Feature first or layer first, which do you prefer?',
      'What does your lib folder look like?',
      'How do you structure a large Flutter codebase?',
      'How do you keep a growing Flutter app organised?'
    ],
    answer: 'I organise by feature first, then by layer inside each feature. So lib has a features folder with auth, home, cart and so on, and each feature has its own presentation, domain and data folders. ' +
      'Shared code, like the theme, the network client, common widgets and utilities, goes into a core folder.\n\n' +
      'The reason is that people work on features, not layers. With layer first, adding one screen means touching models, repositories and widgets in folders far apart, and it gets hard to see what belongs to what. ' +
      'Feature first keeps everything for a feature together, makes ownership clear, and makes it easy to delete or move a feature later.\n\n' +
      'I also set rules: a feature does not import another feature\'s internals, only what it exposes, and core never imports from features. ' +
      'In very large apps those features can become separate packages, which enforces the boundaries.'
  },
  {
    id: 'flutter-modularization',
    roles: ['mobile'],
    anchors: ['flutter', 'monorepo', 'melos', 'packages', 'modules'],
    level: 'senior',
    question: 'How would you split a large Flutter app into packages or modules?',
    variants: [
      'Have you used melos or a monorepo for Flutter?',
      'How do you modularise a Flutter app for a big team?',
      'When is it worth splitting a Flutter app into packages?',
      'How do you share code between two Flutter apps?'
    ],
    answer: 'I split into packages when the app or the team gets big enough that boundaries matter: several teams, long build times, or code shared between apps, like a rider and a driver app that use the same models and API client.\n\n' +
      'A typical split is a core package with networking, theme and shared widgets, a domain or models package, and one package per large feature, all in one repository managed with melos or Dart workspaces, so versions and scripts stay in sync.\n\n' +
      'The benefits are real boundaries, since a package can only use what another exports, faster incremental builds and tests per package, and clear ownership. ' +
      'The costs are more setup, dependency management and the temptation to split too early. ' +
      'So I start with a feature-first folder structure inside one app, and only move a feature into its own package when there is a concrete reason like sharing it or a team owning it.'
  },
  {
    id: 'flutter-environments-flavors',
    roles: ['mobile'],
    anchors: ['flutter', 'flavor', 'flavors', 'environment', 'dart-define'],
    level: 'mid',
    question: 'How do you manage development, staging and production environments in Flutter?',
    variants: [
      'How do you set up flavors in Flutter?',
      'How do you keep API keys and base URLs per environment?',
      'What is dart-define used for?',
      'How do you build a staging version of the app?'
    ],
    answer: 'I use flavors so each environment is a separate build: its own app id, name and icon, so dev, staging and production can be installed side by side, and its own Firebase project or backend. ' +
      'On Android that is product flavors, on iOS schemes and configurations, and Flutter ties them together with the flavor flag.\n\n' +
      'Configuration values like the base URL come in through dart-define or a dart-define-from-file JSON per environment, read once at start up into a config object that is injected where needed. ' +
      'There is one main file per flavor, or one main that reads the flavor, and that is where the right services are wired up.\n\n' +
      'One important point: anything shipped in the app can be extracted, so real secrets do not belong there. ' +
      'Public keys and URLs are fine; secret keys stay on the server, and the app talks to my backend instead of calling a third party with a secret.'
  },
  {
    id: 'flutter-solid',
    roles: ['mobile'],
    anchors: ['solid', 'flutter', 'dart'],
    level: 'senior',
    question: 'How do the SOLID principles show up in your Flutter code?',
    variants: [
      'Explain SOLID with Flutter examples.',
      'What is the dependency inversion principle in Flutter?',
      'Give an example of single responsibility in your code.',
      'How do you apply open closed principle in Dart?'
    ],
    answer: 'I use them as practical habits rather than rules to recite.\n\n' +
      'Single responsibility: a widget draws, a ViewModel holds screen logic, a repository fetches data. When a class does two of those, it gets hard to test, and that is my signal to split it.\n\n' +
      'Open closed: I extend behaviour by adding classes rather than editing a big switch. For example, payment methods implement one interface, and adding a new method does not touch the checkout code.\n\n' +
      'Liskov: a fake repository used in tests must behave like the real one, including how it fails, otherwise the tests lie.\n\n' +
      'Interface segregation: small focused interfaces, like a read-only and a write repository, rather than one huge class every caller depends on.\n\n' +
      'Dependency inversion: the domain defines interfaces like AuthRepository and the data layer implements them, and everything is passed in through constructors. That is what makes swapping and testing possible.'
  },
  {
    id: 'flutter-error-architecture',
    roles: ['mobile'],
    anchors: ['flutter', 'either', 'failure', 'dartz'],
    level: 'senior',
    question: 'How do you pass errors from the data layer up to the UI in a clean way?',
    variants: [
      'Do you use Either from dartz or fpdart?',
      'How do you map exceptions to failures?',
      'How should a repository report errors?',
      'How do you show user friendly error messages from API errors?'
    ],
    answer: 'The data layer is the only place that sees raw errors: socket exceptions, timeouts, a 401, a 500 with some JSON body. It catches them and converts them into a small set of domain failures, like NoConnection, Unauthorized, NotFound or ServerError, possibly carrying a safe message.\n\n' +
      'The repository then returns either the data or a failure. I have used Either from fpdart, and with Dart 3 a sealed Result class does the same job without a dependency. ' +
      'The point is that the type forces the caller to handle failure, instead of hoping someone remembered a try and catch.\n\n' +
      'The ViewModel turns a failure into UI state, and the widget maps it to a message the user understands, with a retry when that makes sense. ' +
      'Unauthorized triggers sign out everywhere through the auth state. The raw details, including stack traces, go to logging and crash reporting, never to the screen.'
  },
  {
    id: 'flutter-offline-first-architecture',
    roles: ['mobile'],
    anchors: ['flutter', 'offline'],
    level: 'senior',
    question: 'How would you design an offline first Flutter app?',
    variants: [
      'How do you make a mobile app work without internet?',
      'How do you sync local changes with the server?',
      'How do you handle conflicts when syncing offline data?',
      'How do you handle offline sync in a mobile app?',
      'What is the single source of truth in an offline first app?'
    ],
    answer: 'The key decision is that the local database is the single source of truth. The UI always reads from local storage, through a repository that exposes streams, so screens work the same with or without a connection.\n\n' +
      'Reads: the repository shows local data at once and refreshes from the server in the background, writing the results into the database, which updates the UI.\n\n' +
      'Writes: changes are saved locally first and also added to an outbox queue with an id. A sync worker sends the queue when the connection comes back, retries with backoff, and marks items as synced. ' +
      'The server must accept those requests idempotently, so a retry never creates duplicates.\n\n' +
      'Conflicts need a rule agreed with the product: last write wins with timestamps for simple data, field-level merging, or showing the user the conflict for important records. ' +
      'I also show sync status clearly, so the user knows what is saved only on the device.'
  },
  {
    id: 'flutter-big-app-scaling-team',
    roles: ['mobile'],
    anchors: ['flutter', 'lint', 'analysis_options', 'conventions'],
    level: 'senior',
    question: 'How do you keep code quality high in a Flutter codebase with several developers?',
    variants: [
      'What lint rules do you use in Flutter?',
      'How do you enforce conventions in a Flutter team?',
      'How do you keep a Flutter codebase consistent?',
      'What does your code review process look like for Flutter?'
    ],
    answer: 'I make the machine enforce as much as possible, so code review can focus on design. That means a strict analysis_options with a well-known lint set like very_good_analysis or flutter_lints plus extra rules, ' +
      'dart format on save and in CI, and the build failing on warnings.\n\n' +
      'CI runs analyze, the unit and widget tests and a build on every pull request, so nothing broken gets merged. ' +
      'We agree on a small set of conventions, written down: folder structure, how state is handled, naming, error handling, and a template for new features, so every feature looks familiar.\n\n' +
      'In reviews I look for the things tools cannot catch: logic in widgets, missing error and loading states, untested business rules, and leaks like undisposed controllers. ' +
      'Small pull requests make all of this much easier, so I push for that too.'
  },
  {
    id: 'flutter-design-system',
    roles: ['mobile'],
    anchors: ['flutter', 'theme', 'design system', 'themedata'],
    level: 'mid',
    question: 'How do you build a design system or theme in a Flutter app?',
    variants: [
      'How do you handle theming and dark mode in Flutter?',
      'How do you keep colours and text styles consistent?',
      'Do you use ThemeExtension?',
      'How do you build reusable components in Flutter?'
    ],
    answer: 'I start from ThemeData with a ColorScheme and a TextTheme, so Material widgets pick up the brand automatically, and I define both light and dark themes from the start. ' +
      'For brand values Material does not have, like extra colours or spacing, I use ThemeExtension, so they are still read from the theme and switch with dark mode.\n\n' +
      'Spacing, radii and durations live in a small set of constants, and widgets never use raw hex colours or font sizes. They read from the theme. ' +
      'That makes a rebrand or dark mode a change in one place.\n\n' +
      'On top of that I build a small set of shared components: buttons, inputs, cards, empty and error states, each with clear variants. ' +
      'I keep them in a core or design system package, document them with a simple catalogue screen or Widgetbook, and add golden tests so visual changes are deliberate.'
  },
  {
    id: 'flutter-configuration-di-startup',
    roles: ['mobile'],
    anchors: ['flutter', 'startup', 'splash', 'main'],
    level: 'senior',
    question: 'What happens in your app at start up, and how do you keep it fast?',
    variants: [
      'How do you initialise services before runApp?',
      'How do you reduce Flutter app start up time?',
      'What do you put in main.dart?',
      'How do you handle a splash screen while loading?'
    ],
    answer: 'In main I do only what the first screen needs: ensure the bindings, load configuration for the flavor, set up error reporting first so start up crashes are caught, ' +
      'initialise things like Firebase and local storage, and restore the session. Then runApp.\n\n' +
      'Everything else is lazy. Services are created when first used, through providers or a lazy registration, and heavy work like warming caches or syncing runs after the first frame. ' +
      'Independent initialisations run in parallel with Future.wait instead of one by one.\n\n' +
      'While the session is being restored, the native splash stays up, so the user never sees a blank screen, and the router decides where to go when auth state is known.\n\n' +
      'I measure start up in profile mode on a real, mid-range device, because that is where slow start ups show, and I keep an eye on app size and the number of plugins initialised at launch.'
  },
  {
    id: 'flutter-architecture-tradeoff',
    roles: ['mobile'],
    anchors: ['flutter', 'architecture'],
    level: 'senior',
    question: 'How do you decide on the architecture for a new Flutter project?',
    variants: [
      'What questions do you ask before choosing an architecture?',
      'How do you choose between simple and layered architecture?',
      'What architecture would you use for a startup MVP?',
      'How do you avoid over engineering a Flutter app?'
    ],
    answer: 'I start from the product and the team, not from a pattern. How big will it get, how many developers, how long will it live, does it need offline support, how much real business logic is in the app versus the backend, and what does the team already know.\n\n' +
      'For an MVP with one or two developers, I keep it light: feature-first folders, a state holder per screen and repositories over the API. ' +
      'That is quick to build and still testable, and it can grow into full clean architecture without a rewrite.\n\n' +
      'For a large or long-lived app, like fintech or healthcare with many rules and several teams, I go with explicit layers, a domain layer with use cases, strict boundaries and maybe packages.\n\n' +
      'Either way I write the decisions down briefly, so new people understand why things are the way they are, and I revisit them when the app changes rather than defending them forever.'
  }
];
