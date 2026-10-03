// Flutter and the platform: native code, permissions, notifications, security.
module.exports = [
  {
    id: 'flutter-platform-channels',
    roles: ['mobile'],
    anchors: ['flutter', 'platform channel', 'method channel', 'pigeon', 'native'],
    level: 'senior',
    question: 'How do you call native Android or iOS code from Flutter?',
    variants: [
      'What are platform channels?',
      'MethodChannel versus EventChannel, what is the difference?',
      'What is Pigeon in Flutter?',
      'How do you use a native SDK that has no Flutter plugin?',
      'Have you written a Flutter plugin?'
    ],
    answer: 'Flutter talks to native code through platform channels. A MethodChannel is request and response: Dart calls a method by name with arguments, Kotlin or Swift handles it and returns a result or an error. ' +
      'An EventChannel is a stream from native to Dart, for things like sensor data or a native SDK\'s callbacks.\n\n' +
      'Hand-written channels pass untyped maps and method names as strings, which breaks silently when one side changes. So I use Pigeon, which generates type-safe Dart, Kotlin and Swift code from one interface definition.\n\n' +
      'When I wrap a native SDK, I put it in a small plugin package with a clean Dart API, handle errors on both sides and turn them into Dart exceptions, and remember that channel calls are asynchronous ' +
      'and that heavy native work must run off the platform\'s main thread. For C libraries, dart:ffi calls them directly without channels.'
  },
  {
    id: 'flutter-ffi',
    roles: ['mobile'],
    anchors: ['flutter', 'ffi', 'dart:ffi', 'rust'],
    level: 'senior',
    question: 'What is Dart FFI and when would you use it instead of platform channels?',
    variants: [
      'How do you call C or Rust code from Flutter?',
      'FFI versus MethodChannel, how do you choose?',
      'What is ffigen?',
      'When is FFI faster than platform channels?'
    ],
    answer: 'FFI, the foreign function interface, lets Dart call C functions directly, in the same process, synchronously, with no message passing. ' +
      'Any language that exposes a C interface works, like C++, Rust or Go.\n\n' +
      'I use it for performance-critical or portable native libraries: image or audio processing, cryptography, a database engine like SQLite, or a shared Rust core used by several platforms. ' +
      'It is much faster than platform channels for many small calls, and the same code works on every platform, including desktop.\n\n' +
      'Platform channels are still the right choice for platform APIs, like the camera, Bluetooth or a vendor SDK written in Kotlin or Swift. ' +
      'With FFI I generate bindings with ffigen, and I am careful with memory, since native allocations are not garbage collected, and with long calls, which block the isolate, so they go to a background isolate.'
  },
  {
    id: 'flutter-permissions',
    roles: ['mobile'],
    anchors: ['flutter', 'permission', 'permissions', 'permission_handler'],
    level: 'mid',
    question: 'How do you handle runtime permissions in a Flutter app?',
    variants: [
      'How do you ask for camera or location permission in Flutter?',
      'What happens if the user permanently denies a permission?',
      'When should an app ask for permissions?',
      'How do you handle permissions differently on iOS and Android?'
    ],
    answer: 'I ask only when the user reaches the feature that needs it, with a short screen first explaining why, rather than a wall of requests at launch. Users accept far more often when the reason is clear.\n\n' +
      'With permission_handler I check the status first, request if needed, and handle every outcome: granted, denied, permanently denied, and limited or provisional on iOS. ' +
      'If it is permanently denied, the app cannot ask again, so I explain and offer a button to open the app settings.\n\n' +
      'Both platforms need setup: usage description strings in the iOS Info.plist, which Apple reviews, and the right entries in the Android manifest, some of which depend on the Android version, ' +
      'like the newer notification and photo permissions. And the feature should degrade gracefully, so the app is still usable when the user says no.'
  },
  {
    id: 'flutter-push-notifications',
    roles: ['mobile'],
    anchors: ['flutter', 'push', 'notification', 'notifications', 'fcm'],
    level: 'senior',
    question: 'How do you implement push notifications in Flutter?',
    variants: [
      'How does Firebase Cloud Messaging work with Flutter?',
      'How do you handle a notification tap when the app is closed?',
      'What is the difference between notification and data messages?',
      'How do you show notifications while the app is in the foreground?'
    ],
    answer: 'I use Firebase Cloud Messaging, which delivers through APNs on iOS. The app asks for notification permission at a sensible moment, gets the device token and sends it to my backend linked to the user, ' +
      'and updates it when the token refreshes. On logout the token is unlinked, so the next user does not get the previous user\'s notifications.\n\n' +
      'There are three app states to handle. In the foreground, FCM does not show a banner by itself, so I show one with flutter_local_notifications if it is relevant. ' +
      'In the background, the system shows it, and onMessageOpenedApp tells me when it is tapped. From terminated, getInitialMessage gives me the message that launched the app.\n\n' +
      'The payload carries a route, so a tap goes through the router to the right screen. Notification messages are shown by the system, while data-only messages wake my handler, ' +
      'which on iOS is not guaranteed, so anything important is also fetched from the API when the app opens.'
  },
  {
    id: 'flutter-background-tasks',
    roles: ['mobile'],
    anchors: ['flutter', 'background', 'workmanager'],
    level: 'senior',
    question: 'How do you run work in the background in a Flutter app?',
    variants: [
      'How do you sync data when the app is closed?',
      'What is WorkManager and how do you use it from Flutter?',
      'What are the limits of background execution on iOS?',
      'How do you schedule periodic tasks in a mobile app?'
    ],
    answer: 'Background work on mobile is limited by the operating system to save battery, so I design for "it will run eventually", not "it runs exactly now".\n\n' +
      'For deferrable work like syncing an outbox or uploading logs, I use the workmanager package, which uses WorkManager on Android and BGTaskScheduler on iOS. ' +
      'I can ask for constraints like network or charging, and Android will run periodic tasks roughly every fifteen minutes at best. iOS decides itself when to run them, based on how the user uses the app, and may not run them for a long time.\n\n' +
      'For work the user started and expects to continue, like a long upload or navigation, I use a foreground service with a visible notification on Android and the matching background modes on iOS. ' +
      'And for anything time-critical, a push from the server is more reliable than scheduling on the device. Background code runs in a separate isolate, so it must initialise its own dependencies.'
  },
  {
    id: 'flutter-app-lifecycle',
    roles: ['mobile'],
    anchors: ['flutter', 'lifecycle', 'applifecyclestate', 'resumed', 'paused'],
    level: 'mid',
    question: 'How do you react to the app going to the background or coming back?',
    variants: [
      'What is AppLifecycleState?',
      'How do you refresh data when the app resumes?',
      'How do you pause a video or a timer when the app goes to the background?',
      'What is WidgetsBindingObserver used for?'
    ],
    answer: 'Flutter reports the app lifecycle through AppLifecycleState: resumed, inactive, hidden, paused and detached. I listen with AppLifecycleListener, or a WidgetsBindingObserver in older code.\n\n' +
      'Typical uses: when the app goes to the background, I pause video and audio, stop location updates that are not needed, save drafts, and close realtime connections after a while to save battery. ' +
      'For apps with sensitive data, I can blur the screen so it does not show in the app switcher.\n\n' +
      'When it comes back, I refresh data that may be stale, like a balance or messages, re-check permissions the user may have changed in settings, ' +
      'and check whether the session expired while away. I keep this logic in one place near the top of the app rather than spread across screens, so it is consistent.'
  },
  {
    id: 'flutter-security',
    roles: ['mobile'],
    anchors: ['flutter', 'security', 'secure', 'pinning', 'obfuscation'],
    level: 'senior',
    question: 'How do you secure a Flutter app, especially one handling money or health data?',
    variants: [
      'What security practices do you follow in mobile apps?',
      'What is certificate pinning and should you use it?',
      'How do you store sensitive data on the device?',
      'How do you protect API keys in a Flutter app?',
      'How do you prevent reverse engineering of a Flutter app?'
    ],
    answer: 'I start from one assumption: the app can be decompiled and the device can be compromised, so the server enforces every rule and holds every secret. The app never contains secret API keys; it calls my backend, which calls third parties.\n\n' +
      'On the device: tokens and sensitive values go into the Keychain and Keystore through secure storage, never plain preferences. ' +
      'Sensitive data is not logged, not kept in analytics, and caches are cleared on logout. For a banking or health app I add a lock with biometrics, blur the app in the switcher, and can block screenshots on sensitive screens.\n\n' +
      'In transit: HTTPS only, and certificate pinning for high-risk apps, with a planned way to rotate pins so a certificate change does not lock users out.\n\n' +
      'For the build: obfuscation with split debug info, plus jailbreak and root detection or app attestation when the risk justifies it. These raise the cost of attacks, but the real protection is still the server.'
  },
  {
    id: 'flutter-localization',
    roles: ['mobile'],
    anchors: ['flutter', 'localization', 'l10n', 'i18n', 'arb', 'translation'],
    level: 'mid',
    question: 'How do you add multiple languages to a Flutter app?',
    variants: [
      'How do you do localization in Flutter?',
      'What are ARB files?',
      'How do you handle right to left languages in Flutter?',
      'How do you format dates and currencies per locale?'
    ],
    answer: 'I use Flutter\'s built-in localization with gen-l10n. Strings live in ARB files, one per language, and code generation gives a typed AppLocalizations class, so a missing or misspelt key is a compile error, not a blank label.\n\n' +
      'ARB supports placeholders and ICU plural and select rules, which matters because plurals work very differently between languages; I never build sentences by joining strings in code.\n\n' +
      'Dates, numbers and currencies are formatted with the intl package for the current locale, not by hand. ' +
      'For right to left languages, Flutter flips the layout automatically as long as I use start and end instead of left and right, directional padding and icons that mirror correctly.\n\n' +
      'I also test with a long language like German and with a pseudo-locale, because longer text is what breaks layouts. Translations come from a service or the team through the ARB files, not from developers editing strings by hand.'
  },
  {
    id: 'flutter-payments',
    roles: ['mobile'],
    anchors: ['flutter', 'payment', 'payments', 'stripe', 'paystack', 'in-app purchase'],
    level: 'senior',
    question: 'How do you integrate payments in a mobile app safely?',
    variants: [
      'How do you add Stripe or Paystack to a Flutter app?',
      'How do in-app purchases work in Flutter?',
      'When do you have to use Apple in-app purchase?',
      'How do you confirm a payment really succeeded?'
    ],
    answer: 'The first rule is that the app never decides a payment succeeded. The server creates the payment with the provider, using the secret key that never leaves the backend, and the app only receives what it needs to show the payment sheet or redirect.\n\n' +
      'After the user pays, the app tells the server, but the server confirms the result itself, by verifying with the provider and, ideally, through a signed webhook. ' +
      'Only then is the order marked paid or the wallet credited, and that update is idempotent, so a webhook that arrives twice does not credit twice.\n\n' +
      'Store rules matter too: digital goods and subscriptions used inside the app must go through Apple and Google in-app purchase, ' +
      'while physical goods and services, like a ride or a delivery, use a normal payment provider. For in-app purchases, receipts are also validated on the server.\n\n' +
      'In the UI I handle every outcome clearly: success, failure, cancelled and pending, and I make the pay button impossible to double tap.'
  },
  {
    id: 'flutter-biometrics',
    roles: ['mobile'],
    anchors: ['flutter', 'biometric', 'biometrics', 'face id', 'fingerprint', 'local_auth'],
    level: 'mid',
    question: 'How do you add biometric login like Face ID or fingerprint?',
    variants: [
      'How does local_auth work in Flutter?',
      'How do you implement biometric authentication securely?',
      'How do you use Face ID in a Flutter app?',
      'Is biometric login secure on its own?'
    ],
    answer: 'I use local_auth to show the system biometric prompt. But a simple yes from local_auth is just a boolean in the app, so on its own it only proves someone passed a check on this device; it should unlock something, not replace authentication.\n\n' +
      'The secure pattern is to keep the refresh token or a private key in the Keychain or Keystore, protected so it can only be read after a successful biometric check. ' +
      'Then biometrics releases a real credential that the server verifies. The user must log in properly once with their password before biometrics can be turned on, and the server can revoke that device.\n\n' +
      'I handle the edge cases: no biometrics enrolled, too many failures falling back to the PIN or password, and biometric data changing, like a new fingerprint being added, ' +
      'which for a banking app should require the password again. The iOS Face ID usage description must be set, or the app crashes.'
  },
  {
    id: 'flutter-camera-media',
    roles: ['mobile'],
    anchors: ['flutter', 'camera', 'video', 'qr', 'scanner'],
    level: 'mid',
    question: 'How do you build camera or scanning features in Flutter?',
    variants: [
      'How do you use the camera plugin in Flutter?',
      'How do you build a QR code or barcode scanner?',
      'How do you handle video playback in Flutter?',
      'What problems have you hit with the camera on Android?'
    ],
    answer: 'For simply taking a photo, image_picker with the system camera is the most reliable choice. When I need a custom camera screen, like a document scanner with an overlay, I use the camera plugin and manage the controller carefully: ' +
      'initialise it after permission, dispose it on leaving, and pause it when the app goes to the background, since the camera is a shared resource and Android is strict about that.\n\n' +
      'For QR and barcodes, mobile_scanner, which uses ML Kit and the native iOS scanner, is fast and works offline. I limit the scan area and debounce results so one code is not processed several times.\n\n' +
      'For video I use video_player or a richer player like media_kit, preload the next item in a feed, dispose players that leave the screen, and test on low-end Android devices, where codecs and memory differ the most.'
  },
  {
    id: 'flutter-web-desktop',
    roles: ['mobile'],
    anchors: ['flutter web', 'flutter desktop', 'web', 'desktop'],
    level: 'mid',
    question: 'Would you use Flutter for web or desktop, and what are the trade-offs?',
    variants: [
      'Is Flutter good for web apps?',
      'What are the limitations of Flutter web?',
      'Have you built a Flutter desktop app?',
      'When would you not use Flutter for a website?'
    ],
    answer: 'Flutter on web is great for app-like experiences that already exist on mobile: dashboards, internal tools, editors, or a web version of the same app, because the code and design are shared.\n\n' +
      'It is not my choice for content sites, marketing pages or anything that depends on search engines, fast first load and native browser behaviour. ' +
      'Flutter web draws to a canvas, so the initial download is larger, SEO and text selection are weaker, and it does not feel like a normal web page. For those I would use a web framework like Next.js.\n\n' +
      'Desktop is solid now for internal and productivity apps, with good performance. The work there is in platform details: keyboard shortcuts, mouse hover, resizable windows, menus and installers. ' +
      'In every case I keep platform-specific code behind interfaces and test on each target, because plugins do not all support every platform.'
  },
  {
    id: 'flutter-maps-native-views',
    roles: ['mobile'],
    anchors: ['flutter', 'platform view', 'platform views', 'webview'],
    level: 'senior',
    question: 'What are platform views in Flutter, and what do they cost?',
    variants: [
      'How does Google Maps or a WebView render inside Flutter?',
      'Why are platform views slow?',
      'What is hybrid composition?',
      'When would you use a WebView in a Flutter app?'
    ],
    answer: 'A platform view embeds a real native view, like Google Maps or a WebView, inside the Flutter widget tree, for things that cannot reasonably be rebuilt in Flutter.\n\n' +
      'The cost is composition. Flutter has to blend its own rendering with the native view, and on Android that can mean extra copying or threading changes, which affects scrolling smoothness and memory, ' +
      'especially on older devices. Hybrid composition and the newer texture-based modes trade compatibility against performance in different ways.\n\n' +
      'So I use them where they are needed, but carefully: I avoid putting several maps or WebViews in a scrolling list, I keep Flutter overlays on top of them simple, and I test on low-end Android phones.\n\n' +
      'For WebViews specifically, I use them for content I do not control, like a payment provider\'s page or help articles, and I restrict which URLs they can open and what JavaScript can call back into the app.'
  },
  {
    id: 'flutter-vs-native-react-native',
    roles: ['mobile'],
    anchors: ['flutter', 'react native', 'native', 'kotlin', 'swift'],
    level: 'mid',
    question: 'Why Flutter instead of native development or React Native?',
    variants: [
      'Flutter versus React Native, which is better?',
      'When would you choose native Kotlin or Swift over Flutter?',
      'What are the downsides of Flutter?',
      'Why did you choose Flutter?'
    ],
    answer: 'Flutter gives one codebase for iOS and Android with its own rendering engine, so the UI looks and behaves the same everywhere, performance is close to native because it compiles to machine code, ' +
      'and hot reload makes building UI very fast. For most product apps, that means a smaller team ships to both platforms faster.\n\n' +
      'React Native is a good choice too, especially for a team that is strong in React and wants to share logic with a web app. Its new architecture closed a lot of the performance gap. ' +
      'The trade-off is that it renders native components, so platform differences show up more.\n\n' +
      'I would go fully native when the app is mostly deep platform features, like heavy camera processing, AR, complex background work or watch apps, or when the newest platform APIs on day one matter. ' +
      'Flutter\'s downsides are larger app size, a dependency on plugins for native features, and platform views being costly.'
  },
  {
    id: 'flutter-android-ios-config',
    roles: ['mobile'],
    anchors: ['flutter', 'gradle', 'xcode', 'cocoapods', 'android', 'ios'],
    level: 'senior',
    question: 'What native Android and iOS configuration do Flutter developers need to understand?',
    variants: [
      'How comfortable are you with Gradle and Xcode in Flutter projects?',
      'How do you fix a CocoaPods or Gradle build error in Flutter?',
      'What do you change in AndroidManifest or Info.plist?',
      'How do you handle minSdk and iOS deployment target?'
    ],
    answer: 'A Flutter developer still owns two native projects, so I am comfortable in both. On Android that means the Gradle files: the application id, minSdk and targetSdk, signing configs, product flavors, ' +
      'and the manifest for permissions, intent filters for deep links and services. On iOS it is Xcode: bundle ids, schemes and configurations for flavors, capabilities like push and associated domains, ' +
      'Info.plist usage descriptions, and CocoaPods or Swift Package Manager for plugin dependencies.\n\n' +
      'When a native build breaks, I read the real error rather than retrying: often it is a plugin needing a higher minSdk or deployment target, a Kotlin or Gradle version mismatch after an upgrade, ' +
      'or stale pods, fixed by updating the pod repo and reinstalling.\n\n' +
      'I also keep the store requirements in mind, like the yearly Play target SDK deadline and Apple\'s privacy manifest, because they block releases if they are missed.'
  },
  {
    id: 'flutter-iot-bluetooth',
    roles: ['mobile'],
    anchors: ['flutter', 'bluetooth', 'ble', 'nfc'],
    level: 'senior',
    question: 'How would you build a Bluetooth Low Energy feature in Flutter?',
    variants: [
      'Have you worked with BLE in Flutter?',
      'How do you connect to a Bluetooth device from a Flutter app?',
      'What are the challenges of Bluetooth on mobile?',
      'How do you use NFC in Flutter?'
    ],
    answer: 'I would use a maintained plugin like flutter_blue_plus, and wrap it in a device service with a clear state machine: idle, scanning, connecting, connected, and disconnected with a reason. ' +
      'The UI only sees that state, never the plugin directly.\n\n' +
      'The flow is scan with a filter on the service UUID, connect, discover services, then read, write and subscribe to characteristics, decoding bytes into typed models in one place.\n\n' +
      'The hard parts are real-world: permissions differ by platform and Android version, connections drop and need a reconnect with backoff, some operations must be queued because the stack cannot do two at once, ' +
      'iOS limits background BLE, and devices behave differently across manufacturers. So I test with real hardware early, add timeouts to every operation, and log the BLE events, because these bugs are hard to reproduce later.'
  }
];
