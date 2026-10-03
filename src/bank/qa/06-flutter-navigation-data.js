// Flutter navigation, networking, serialization and local storage.
module.exports = [
  {
    id: 'flutter-gorouter',
    roles: ['mobile'],
    anchors: ['flutter', 'gorouter', 'go_router'],
    level: 'mid',
    question: 'How do you handle navigation in Flutter, and why GoRouter?',
    variants: [
      'What is GoRouter and why use it?',
      'How do you set up routing in a Flutter app?',
      'Navigator 1 versus Navigator 2, what is the difference?',
      'How do you navigate between screens in Flutter?',
      'What is the difference between go and push in GoRouter?'
    ],
    answer: 'For anything beyond a couple of screens I use GoRouter. It sits on top of Navigator 2, which is declarative but very verbose to use directly, and gives me URL-based routes, path and query parameters, ' +
      'deep links, redirects for auth, and nested navigation, with much less code.\n\n' +
      'Routes are defined in one place, so the whole app\'s navigation is visible at a glance. Screens navigate by path, like context.go to the order with its id, instead of constructing widgets for the next screen, which keeps features decoupled.\n\n' +
      'The difference between go and push matters: go replaces the stack to match the URL, which is right for top-level navigation and deep links, while push adds a screen on top, ' +
      'which is right when the user should come back, like opening a detail and returning to the list. I also use typed routes so a wrong parameter is a compile error, not a crash.'
  },
  {
    id: 'flutter-route-guards',
    roles: ['mobile'],
    anchors: ['flutter', 'gorouter'],
    level: 'senior',
    question: 'How do you protect routes that need login or a certain role?',
    variants: [
      'How do route guards work in GoRouter?',
      'How do you redirect unauthenticated users in Flutter?',
      'How do you send the user back to the page they wanted after login?',
      'What is refreshListenable in GoRouter?'
    ],
    answer: 'I keep the rule in the router, not in each screen. GoRouter\'s redirect runs before every navigation, so it checks the auth state: if the user is signed out and the route needs a session, it redirects to login, ' +
      'passing the original location as a parameter so we can send them back after they sign in. If a signed-in user hits the login page, it sends them home.\n\n' +
      'The router listens to the auth state through refreshListenable, so when the session expires or the user logs out anywhere in the app, the redirect runs again and moves them out of protected screens immediately.\n\n' +
      'Roles work the same way, with a check for the admin area for example. But the client check is only for user experience: the real protection is on the server, ' +
      'which must reject the request no matter what the app shows.'
  },
  {
    id: 'flutter-deep-links',
    roles: ['mobile'],
    anchors: ['flutter', 'universal links', 'app links'],
    level: 'senior',
    question: 'How do you implement deep links in a Flutter app?',
    variants: [
      'How do universal links and app links work?',
      'How do you open a specific screen from a link?',
      'How do you handle a deep link when the app is closed?',
      'How do you open the right screen from a push notification?'
    ],
    answer: 'There are two parts. The platform part makes links open the app: on iOS, universal links with an apple-app-site-association file on the domain and the associated domains capability, ' +
      'and on Android, app links with intent filters and an assetlinks file, so links are verified and open the app directly instead of asking.\n\n' +
      'The Flutter part is routing. Because GoRouter is URL-based, an incoming link is just a location, and it lands on the right screen with its parameters. ' +
      'The auth redirect still applies, so a link to a private page goes through login and then continues to the target.\n\n' +
      'The cases I always test are a cold start from a link, a link while the app is in the background, a link with a bad or missing id, which should show a friendly not found screen, ' +
      'and notification taps, which I route the same way by putting a path in the notification payload.'
  },
  {
    id: 'flutter-nested-navigation',
    roles: ['mobile'],
    anchors: ['flutter', 'shellroute'],
    level: 'senior',
    question: 'How do you keep separate navigation stacks for each tab in a bottom navigation bar?',
    variants: [
      'What is StatefulShellRoute in GoRouter?',
      'How do you preserve tab state in Flutter?',
      'How do you build nested navigation in Flutter?',
      'How do you keep each tab\'s scroll position when switching tabs?'
    ],
    answer: 'Users expect each tab to remember where they were: if I open a product in the shop tab, switch to profile and come back, the product should still be open.\n\n' +
      'With GoRouter I use StatefulShellRoute. The shell builds the scaffold with the bottom bar once, and each branch has its own navigator and its own stack of routes. ' +
      'Switching tabs changes the visible branch without destroying the others, so their stacks, scroll positions and state are kept. ' +
      'Tapping the current tab again usually pops that branch back to its root, which is the convention people know.\n\n' +
      'Before that existed, the same thing was done with an IndexedStack of separate Navigators. The shell route is cleaner because deep links can target a screen inside a specific tab and still build the right stack.'
  },
  {
    id: 'flutter-http-dio',
    roles: ['mobile'],
    anchors: ['flutter', 'dio'],
    level: 'mid',
    question: 'How do you set up networking in a Flutter app?',
    variants: [
      'http or Dio, which do you use and why?',
      'What are Dio interceptors used for?',
      'How do you structure API calls in Flutter?',
      'How do you add auth headers to every request?'
    ],
    answer: 'I wrap the HTTP library in one API client class, so the rest of the app never talks to the library directly. I usually use Dio because of interceptors, cancel tokens, timeouts and good error types, but plain http is fine for small apps.\n\n' +
      'The client is configured once: base URL per environment, connect and receive timeouts, and JSON handling. ' +
      'Interceptors handle the cross-cutting work: adding the access token, refreshing it on a 401 and retrying, logging in debug builds only with sensitive fields hidden, and adding headers like the app version.\n\n' +
      'Above the client, each feature has a remote data source with typed methods, like getOrders returning a list of models, and the repository maps errors into domain failures. ' +
      'That way changing the library, or the auth scheme, is a change in one file.'
  },
  {
    id: 'flutter-json-models',
    roles: ['mobile'],
    anchors: ['flutter'],
    level: 'junior',
    question: 'How do you convert JSON into Dart models safely?',
    variants: [
      'How do you parse API responses in Flutter?',
      'How do you handle missing or null fields in JSON?',
      'Do you write fromJson by hand or generate it?',
      'What happens when the API changes a field type?'
    ],
    answer: 'I never pass raw maps around the app. Each response becomes a typed model with a fromJson factory, either generated with json_serializable or written by hand for small cases.\n\n' +
      'Safety comes from being explicit about what can be missing: required fields are non-nullable, optional ones are nullable or get defaults, and enums have an unknown value so a new status from the server does not crash the app. ' +
      'Dates are parsed in one place with a known format, and numbers are read as num and converted, because APIs sometimes send 10 instead of 10.0.\n\n' +
      'Parsing errors are caught in the data layer and reported as a failure with the endpoint name, so a backend change shows up in crash reporting instead of a red screen. ' +
      'For large responses I parse in a background isolate so the UI does not stutter.'
  },
  {
    id: 'flutter-local-storage-options',
    roles: ['mobile'],
    anchors: ['flutter', 'hive', 'drift', 'sqflite', 'isar', 'shared_preferences'],
    level: 'mid',
    question: 'Which local storage options do you use in Flutter, and when?',
    variants: [
      'shared_preferences, Hive, Drift or sqflite, how do you choose?',
      'How do you store data locally in a Flutter app?',
      'Where would you store a user\'s auth token?',
      'What database would you use in a Flutter app?'
    ],
    answer: 'It depends on what the data is.\n\n' +
      'Small settings and flags, like the theme or whether onboarding was seen, go into shared_preferences. It is simple key value storage, but not encrypted and not for big data.\n\n' +
      'Secrets, like tokens, go into flutter_secure_storage, which uses the iOS Keychain and Android Keystore.\n\n' +
      'Structured data that I query, filter and relate, like orders or messages for an offline-first app, goes into a real database. ' +
      'I like Drift on top of SQLite because it is type safe, supports migrations and gives me reactive queries as streams. sqflite is the lower-level option. ' +
      'Hive and Isar are fast NoSQL options that work well for caching objects, though I check how actively a package is maintained before committing to it.\n\n' +
      'Whatever I pick sits behind a repository, so changing it later does not reach the UI.'
  },
  {
    id: 'flutter-caching-strategy',
    roles: ['mobile'],
    anchors: ['flutter'],
    level: 'senior',
    question: 'How do you cache API data in a mobile app?',
    variants: [
      'What caching strategy do you use for API responses?',
      'How do you show data instantly and then refresh it?',
      'What is stale while revalidate on mobile?',
      'How do you invalidate a cache in your app?'
    ],
    answer: 'My default is stale while revalidate: show what we have at once, from memory or the local database, then fetch fresh data in the background and update the screen when it arrives. ' +
      'The app feels instant and still ends up correct.\n\n' +
      'Each kind of data gets its own rule. A product catalogue can be cached for hours. A balance or an order status should always be refreshed when the screen opens, and maybe kept live. ' +
      'User-specific data is cleared on logout, always.\n\n' +
      'Invalidation is where bugs live, so I make it explicit: after the user changes something, the affected entries are updated or marked stale, ' +
      'and a pull to refresh forces a fetch. I also respect cache headers when the API sets them. The logic lives in the repository, so screens just ask for data and do not know any of this.'
  },
  {
    id: 'flutter-pagination-client',
    roles: ['mobile'],
    anchors: ['flutter'],
    level: 'mid',
    question: 'How do you implement pagination and infinite scroll in a Flutter app?',
    variants: [
      'How do you load more items when the user reaches the end of a list?',
      'How do you avoid duplicate page requests while scrolling?',
      'How do you handle errors when loading the next page?',
      'Do you use infinite_scroll_pagination?'
    ],
    answer: 'The state holds the items loaded so far, the cursor or next page number, whether more pages exist, and whether a page is loading or failed.\n\n' +
      'When the list builder reaches the last few items, it asks the notifier to load the next page. The notifier ignores the call if a load is already running or there are no more pages, ' +
      'which prevents the classic double request when the user flings the list. New items are appended, and duplicates from the server are filtered by id.\n\n' +
      'The last row of the list reflects the state: a small loader while fetching, a retry button if the page failed, without wiping what is already shown, and nothing when the end is reached. ' +
      'Pull to refresh resets to the first page. The infinite_scroll_pagination package does this well too, but the logic is simple enough that I am happy owning it.'
  },
  {
    id: 'flutter-realtime-websockets',
    roles: ['mobile'],
    anchors: ['flutter', 'websocket', 'websockets'],
    level: 'senior',
    question: 'How would you add real time updates to a Flutter app?',
    variants: [
      'How do you use websockets in Flutter?',
      'How do you build a chat feature in Flutter?',
      'How do you handle reconnecting a websocket on mobile?',
      'Polling or websockets, how do you choose?'
    ],
    answer: 'First I check how real time it really needs to be. If updates every thirty seconds are fine, polling or a push notification that triggers a refresh is simpler and kinder to the battery. ' +
      'For chat, live tracking or collaborative features, I use a persistent connection, like websockets or a managed realtime service such as Firebase.\n\n' +
      'I put the connection in a service that exposes streams, so screens just listen. The hard part on mobile is that connections drop all the time: network changes, the app going to the background, the phone sleeping. ' +
      'So the service reconnects with exponential backoff, re-subscribes to its channels, and after reconnecting fetches what was missed through a normal API call, using the last message id or timestamp.\n\n' +
      'Messages carry ids so duplicates are ignored, and I close the connection when the app is in the background for a while to save battery.'
  },
  {
    id: 'flutter-firebase-backend',
    roles: ['mobile'],
    anchors: ['flutter', 'firebase', 'firestore'],
    level: 'mid',
    question: 'How do you use Firebase in a Flutter app, and what do you watch out for?',
    variants: [
      'What Firebase services have you used with Flutter?',
      'How do you structure Firestore data?',
      'How do you secure Firestore?',
      'What are the downsides of Firestore?'
    ],
    answer: 'Firebase gives a mobile team a lot quickly: Auth, Firestore, Cloud Messaging for push, Crashlytics, Analytics and Remote Config. I set it up per flavor, so dev and production use separate projects and never mix data.\n\n' +
      'With Firestore, I design the data around the screens and queries, because it has no joins: some data is duplicated on purpose, and every query needs an index. ' +
      'I keep Firestore access inside repositories, so the rest of the app does not depend on it.\n\n' +
      'The things I watch: security rules are the real backend, so every collection has rules checking the user, and I test them with the emulator. ' +
      'Costs scale with reads, so listeners on large collections and unbounded queries get expensive fast; I paginate and limit. ' +
      'And complex business logic or anything involving secrets goes into Cloud Functions, not the client.'
  },
  {
    id: 'flutter-graphql',
    roles: ['mobile'],
    anchors: ['flutter', 'graphql'],
    level: 'mid',
    question: 'Have you used GraphQL in Flutter, and how does it compare to REST for a mobile app?',
    variants: [
      'GraphQL or REST for a mobile app?',
      'How do you use GraphQL in Flutter?',
      'What are the benefits of GraphQL on mobile?',
      'How do you cache GraphQL data in Flutter?'
    ],
    answer: 'GraphQL\'s big advantage on mobile is that the screen asks for exactly the fields it needs in one request, so there is less over-fetching and fewer round trips, which matters on slow networks. ' +
      'The schema also gives strong typing, and with code generation I get typed Dart models for every query.\n\n' +
      'In Flutter I have used graphql_flutter and Ferry, both of which come with a normalised cache, so updating one object updates it on every screen showing it.\n\n' +
      'The trade-offs are more complexity on the server, harder HTTP caching since everything is a POST to one endpoint, and the need to watch query cost. ' +
      'For a simple API, REST is usually the better choice. Either way, it sits behind my repositories, so the app\'s state and UI do not care which one is used.'
  },
  {
    id: 'flutter-file-upload',
    roles: ['mobile'],
    anchors: ['flutter'],
    level: 'mid',
    question: 'How do you upload images or files from a Flutter app?',
    variants: [
      'How do you upload a photo in Flutter?',
      'How do you show upload progress?',
      'How do you upload large files reliably from mobile?',
      'Do you upload through your API or directly to storage?'
    ],
    answer: 'I pick the file with image_picker or file_picker, and compress and resize images on the device first, because a full-size camera photo is several megabytes and the server rarely needs that.\n\n' +
      'For the upload itself I prefer the app getting a short-lived signed URL from my backend and uploading directly to object storage, like S3 or a storage bucket. ' +
      'That keeps big files off my API servers and the bucket stays private. For smaller files a multipart request to the API is fine.\n\n' +
      'With Dio I show real progress from the send progress callback, allow cancelling, and handle failures with a retry. For large files or bad networks, resumable or chunked uploads, ' +
      'and running the upload in a background task so it survives the user leaving the screen, make a big difference. The server still validates type and size, because the client can never be trusted.'
  },
  {
    id: 'flutter-connectivity',
    roles: ['mobile'],
    anchors: ['flutter'],
    level: 'mid',
    question: 'How do you handle poor or no internet connection in a Flutter app?',
    variants: [
      'How do you detect if the user is offline?',
      'How do you handle network errors gracefully?',
      'What do you show when there is no internet?',
      'How do you retry failed requests on mobile?'
    ],
    answer: 'I do not trust the connectivity plugin alone: it tells me whether there is a network interface, not whether the internet actually works. So I treat it as a hint and rely on the real request result.\n\n' +
      'Every request has a timeout, and network failures become a clear failure type, so screens can show a friendly message with a retry instead of a generic error. ' +
      'Where it makes sense, cached data is shown with a small "offline" banner instead of an empty screen.\n\n' +
      'Retries are automatic only for safe requests, with exponential backoff and a limit. For writes, I either queue them to send later, with an idempotency key so they are not applied twice, ' +
      'or ask the user to try again, depending on how important it is. And when the connection comes back, I refresh what is on screen so the user is not left looking at stale data.'
  },
  {
    id: 'flutter-maps-location',
    roles: ['mobile'],
    anchors: ['flutter', 'google maps'],
    level: 'senior',
    question: 'How do you handle location tracking and maps in a Flutter app?',
    variants: [
      'How do you track location in the background in Flutter?',
      'How do you show a moving marker on a map?',
      'How do you save battery when tracking location?',
      'What permissions do you need for location on iOS and Android?'
    ],
    answer: 'Permissions come first and need care: I ask for location only when the feature needs it, explain why, and ask for background location separately and only if the feature truly needs it, ' +
      'because both stores review it strictly and users decline it easily.\n\n' +
      'For tracking, I choose accuracy and a distance filter that fit the feature. A delivery driver needs frequent, accurate updates; a nearby-places feature does not. ' +
      'Sending an update only after the device moves a few metres saves a lot of battery and data. Background tracking needs a foreground service with a notification on Android and the background location mode on iOS.\n\n' +
      'On the map, I animate a marker between updates rather than jumping, keep marker icons as cached bitmaps, and avoid rebuilding the whole map widget on every location event, ' +
      'by updating only the markers through the controller or a small state.'
  },
  {
    id: 'flutter-api-versioning-client',
    roles: ['mobile'],
    anchors: ['flutter', 'remote config'],
    level: 'senior',
    question: 'How do you handle old app versions when the API changes?',
    variants: [
      'How do you force users to update the app?',
      'How do you keep old app versions working after a backend change?',
      'How do you use Remote Config or feature flags in a mobile app?',
      'How do you roll out a risky feature on mobile?'
    ],
    answer: 'On mobile you cannot assume everyone updates, so old versions stay in the wild for months. That shapes how I work with the backend.\n\n' +
      'API changes are additive where possible: new fields are optional, nothing is renamed or removed while old apps use it, and breaking changes go into a new version of the endpoint. ' +
      'The app sends its version in a header, so the server knows who it is talking to.\n\n' +
      'For true emergencies, like a security problem, I have a minimum supported version in Remote Config or an API. On start, the app checks it and shows a blocking update screen, ' +
      'with a softer prompt for recommended updates.\n\n' +
      'And risky features ship behind feature flags, so they can be turned on gradually or switched off without a new release, which is important because a store release takes time to reach users.'
  }
];
