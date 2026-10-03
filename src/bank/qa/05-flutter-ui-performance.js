// Flutter UI, layout, animation and performance.
module.exports = [
  {
    id: 'flutter-keys',
    roles: ['mobile'],
    anchors: ['flutter', 'key', 'keys', 'globalkey'],
    level: 'mid',
    question: 'What are keys in Flutter and when do you need them?',
    variants: [
      'When should you use a key in Flutter?',
      'What is the difference between ValueKey, ObjectKey and GlobalKey?',
      'Why does my list item keep the wrong state after reordering?',
      'What does a GlobalKey do?'
    ],
    answer: 'A key tells Flutter which widget is which when the tree changes. Without keys, Flutter matches old and new widgets by type and position. ' +
      'That is fine most of the time, but when stateful items in a list are reordered, removed or inserted, the state stays at the old position and ends up attached to the wrong item.\n\n' +
      'So I give list items a ValueKey with something stable from the data, like the id. ObjectKey uses the object\'s identity, and UniqueKey forces a fresh widget every time, which is a way to reset state on purpose.\n\n' +
      'A GlobalKey is unique across the whole app and lets you reach a widget\'s state or keep its state when it moves to another part of the tree, like a Form\'s state for validation. ' +
      'It is more expensive, so I use it only for those cases, never as a default.'
  },
  {
    id: 'flutter-layout-constraints',
    roles: ['mobile'],
    anchors: ['flutter', 'constraints', 'layout', 'overflow'],
    level: 'mid',
    question: 'How does layout work in Flutter, and how do you fix overflow errors?',
    variants: [
      'Explain "constraints go down, sizes go up, parent sets position".',
      'What causes a RenderFlex overflowed error?',
      'Why does my ListView inside a Column throw an error?',
      'What is the difference between Expanded and Flexible?',
      'Why do I get unbounded height errors?'
    ],
    answer: 'Flutter layout is one pass with a simple rule: constraints go down, sizes go up, and the parent sets the position. A parent tells each child the minimum and maximum width and height it may have, ' +
      'the child picks a size within those limits, and the parent places it.\n\n' +
      'Most layout errors come from breaking that rule. A RenderFlex overflow means a Row or Column\'s children want more space than they have; ' +
      'I fix it by letting a child shrink or wrap with Expanded or Flexible, by allowing text to wrap or ellipsize, or by making the area scroll. ' +
      'Unbounded height usually means a ListView inside a Column, where the list gets infinite height; wrapping it in Expanded gives it a bounded size.\n\n' +
      'Expanded forces a child to fill the remaining space, Flexible lets it be smaller. When debugging I use the widget inspector to see the actual constraints each widget received.'
  },
  {
    id: 'flutter-long-lists',
    roles: ['mobile'],
    anchors: ['flutter', 'listview', 'list', 'lists', 'slivers'],
    level: 'mid',
    question: 'How do you build a long list in Flutter that stays smooth?',
    variants: [
      'ListView versus ListView.builder, what is the difference?',
      'How do you render thousands of items in Flutter?',
      'How do you implement infinite scrolling in Flutter?',
      'What are slivers and when do you use them?'
    ],
    answer: 'For long or unknown-length lists I use ListView.builder, so only the items on screen, plus a small buffer, are built. A plain ListView with a children list builds every item up front, which is fine for ten items and terrible for a thousand.\n\n' +
      'Then the details: if all items have the same height, itemExtent or prototypeItem lets Flutter skip measuring each one, which makes scrolling and jumping much cheaper. ' +
      'Item widgets stay light and const where possible, and images are sized and cached.\n\n' +
      'For infinite scrolling, I load the next page when the user gets near the end, guard against firing the request twice, and show a small loader as the last item and an error row with retry if it fails.\n\n' +
      'When a screen mixes a collapsing header, a grid and a list in one scroll, I use a CustomScrollView with slivers, so everything scrolls together and is still built lazily.'
  },
  {
    id: 'flutter-jank-devtools',
    roles: ['mobile'],
    anchors: ['flutter', 'jank', 'devtools', 'fps', 'performance'],
    level: 'senior',
    question: 'The app janks when scrolling. How do you find and fix the problem?',
    variants: [
      'How do you debug performance problems in Flutter?',
      'How do you use Flutter DevTools to find jank?',
      'What is the difference between the UI thread and the raster thread?',
      'How do you get a Flutter app to a smooth 60 frames per second?',
      'Users say the app feels slow, what do you do?'
    ],
    answer: 'First I reproduce it in profile mode on a real, ideally lower-end device, because debug mode is slow by design and simulators lie.\n\n' +
      'Then I open the DevTools performance view and look at the frame chart. Each frame has a UI part, where Dart builds and lays out widgets, and a raster part, where the engine draws. ' +
      'If the UI side is over budget, it is my Dart code: too many rebuilds, heavy work in build, synchronous parsing, or a big list built eagerly. ' +
      'If the raster side is over, it is drawing cost: large images, opacity and clipping, shadows, or saveLayer calls.\n\n' +
      'The fixes follow from that: rebuild less and lower in the tree, move heavy work to an isolate, build lists lazily, resize images to their display size, ' +
      'replace Opacity on animations with FadeTransition, and add RepaintBoundary around things that repaint often. Then I measure again, so I know the change actually helped.'
  },
  {
    id: 'flutter-animations',
    roles: ['mobile'],
    anchors: ['flutter', 'animation', 'animations', 'animationcontroller'],
    level: 'mid',
    question: 'How do you do animations in Flutter, implicit versus explicit?',
    variants: [
      'What is the difference between implicit and explicit animations?',
      'When do you use an AnimationController?',
      'What is a Hero animation?',
      'How do you make animations smooth in Flutter?'
    ],
    answer: 'I start with implicit animations, like AnimatedContainer, AnimatedOpacity or AnimatedSwitcher. I just change a value and Flutter animates to it. They cover most UI polish with almost no code.\n\n' +
      'When I need control, like looping, playing in reverse, chaining several steps or driving it from a gesture, I use explicit animations with an AnimationController and a Tween, ' +
      'and build with AnimatedBuilder or the transition widgets like FadeTransition and SlideTransition. The controller needs a ticker from the State and must be disposed.\n\n' +
      'For shared element transitions between screens I use Hero, and for complex designer-made animations, Rive or Lottie.\n\n' +
      'To keep them smooth, I rebuild only the animated part by passing the static child to AnimatedBuilder, prefer transitions over rebuilding layout every frame, ' +
      'and respect the system setting for reduced motion.'
  },
  {
    id: 'flutter-responsive-design',
    roles: ['mobile'],
    anchors: ['flutter', 'responsive', 'tablet', 'mediaquery', 'layoutbuilder'],
    level: 'mid',
    question: 'How do you make a Flutter app work on phones, tablets and different screen sizes?',
    variants: [
      'How do you build responsive layouts in Flutter?',
      'MediaQuery or LayoutBuilder, which do you use?',
      'How do you handle tablets and foldables in Flutter?',
      'How do you support large text sizes without breaking the layout?'
    ],
    answer: 'I design with flexible layouts first: Rows and Columns with Expanded and Flexible, wrapping text, and scrollable areas, rather than fixed pixel sizes. That alone handles most phones.\n\n' +
      'For real layout changes, like one column on a phone and a list plus detail side by side on a tablet, I use breakpoints. ' +
      'LayoutBuilder is my default because it reacts to the space the widget actually has, which also works in split screen and on foldables. MediaQuery is for screen-level things like padding, the keyboard and text scaling.\n\n' +
      'I also test with large accessibility text sizes, because that breaks more layouts than screen size does, and with landscape. ' +
      'Navigation adapts too: a bottom bar on phones and a navigation rail on wide screens.'
  },
  {
    id: 'flutter-custom-painter',
    roles: ['mobile'],
    anchors: ['flutter', 'custompainter', 'canvas', 'paint'],
    level: 'senior',
    question: 'When would you use CustomPainter or a custom render object?',
    variants: [
      'How do you draw custom shapes or charts in Flutter?',
      'What is CustomPainter?',
      'How does shouldRepaint work?',
      'Have you written a custom RenderObject?'
    ],
    answer: 'I use CustomPainter when the design cannot be built from existing widgets, or would need too many of them: charts, gauges, signature pads, custom progress rings or a route drawn on a map overlay. ' +
      'It gives me a Canvas to draw paths, arcs, text and images directly, which is very efficient.\n\n' +
      'The important method for performance is shouldRepaint. It should return true only when the inputs actually changed, otherwise the painter redraws every frame. ' +
      'For animations, I pass the animation as the repaint listenable, so only the painter repaints, not the whole widget tree, and I put it inside a RepaintBoundary.\n\n' +
      'A custom RenderObject is the next level, for when I need custom layout or hit testing, not just painting, like a special flow layout. ' +
      'It is more code and harder to maintain, so I only go there when composing widgets or a painter cannot do the job.'
  },
  {
    id: 'flutter-images-performance',
    roles: ['mobile'],
    anchors: ['flutter', 'image', 'images', 'cached_network_image'],
    level: 'mid',
    question: 'How do you handle images efficiently in a Flutter app?',
    variants: [
      'How do you cache network images in Flutter?',
      'Why does my app use so much memory with images?',
      'How do you load images faster in Flutter?',
      'What is cacheWidth in Image.network?'
    ],
    answer: 'Images are one of the biggest causes of memory use and jank, so I handle them on purpose.\n\n' +
      'First, size. A 4000 pixel photo shown in a 100 pixel avatar still decodes at full size unless I tell Flutter otherwise, so I set cacheWidth or cacheHeight to the display size, and ideally the server sends a resized version.\n\n' +
      'Second, caching. For network images I use cached_network_image, so images are stored on disk and not downloaded again, with a placeholder and an error widget.\n\n' +
      'Third, format and loading. I use compressed formats like WebP, precache images I know are coming next, like the next screen\'s hero image, and fade them in so loading feels smooth.\n\n' +
      'And in long lists, only visible items load images, thanks to the lazy builder, which keeps memory steady while scrolling.'
  },
  {
    id: 'flutter-stateless-stateful-lifecycle',
    roles: ['mobile'],
    anchors: ['flutter', 'stateful', 'stateless', 'initstate', 'lifecycle'],
    level: 'junior',
    question: 'What is the lifecycle of a StatefulWidget?',
    variants: [
      'What is the difference between StatelessWidget and StatefulWidget?',
      'Explain initState, didChangeDependencies, didUpdateWidget and dispose.',
      'Where should you start an API call in a StatefulWidget?',
      'Why can you not use context in initState?'
    ],
    answer: 'A StatelessWidget only depends on its constructor arguments and its context. A StatefulWidget has a separate State object that lives across rebuilds and can change.\n\n' +
      'The State goes through a clear lifecycle. initState runs once when it is inserted into the tree: that is where I create controllers and start subscriptions. ' +
      'didChangeDependencies runs after that and whenever an inherited widget it depends on changes, so reading Theme or MediaQuery belongs there or in build, not in initState. ' +
      'build runs whenever something changes. didUpdateWidget runs when the parent rebuilds with new arguments, so I can react, for example, to a new id. ' +
      'dispose runs when it is removed for good, and that is where every controller, subscription and timer is released.\n\n' +
      'I also check mounted before calling setState after an await, because the widget may be gone by the time the result arrives.'
  },
  {
    id: 'flutter-buildcontext',
    roles: ['mobile'],
    anchors: ['flutter', 'buildcontext', 'context'],
    level: 'mid',
    question: 'What is BuildContext and what are common mistakes with it?',
    variants: [
      'Explain BuildContext in Flutter.',
      'Why does Navigator.of(context) or Scaffold.of(context) fail sometimes?',
      'Why is it dangerous to use context after an await?',
      'What does use_build_context_synchronously warn about?'
    ],
    answer: 'BuildContext is a widget\'s handle to its position in the tree, in fact it is the element. Through it a widget looks up things above it, like the theme, media query, navigator or a provider.\n\n' +
      'The common mistakes come from that "above it" part. Calling Scaffold.of with the context of the widget that creates the Scaffold fails, because that context is above the Scaffold, not below it; a Builder or a separate widget fixes it.\n\n' +
      'The other big one is using context after an await. By the time the future completes, the widget may have been disposed, and using its context to navigate or show a dialog throws or acts on the wrong screen. ' +
      'The lint use_build_context_synchronously catches this. I check context.mounted before using it, or capture what I need, like the navigator or messenger, before the await.'
  },
  {
    id: 'flutter-platform-adaptive',
    roles: ['mobile'],
    anchors: ['flutter', 'cupertino', 'ios', 'adaptive'],
    level: 'mid',
    question: 'How do you make a Flutter app feel native on both iOS and Android?',
    variants: [
      'Material or Cupertino, how do you choose?',
      'How do you handle platform differences in Flutter UI?',
      'Do you build separate designs for iOS and Android?',
      'How do you make adaptive widgets in Flutter?'
    ],
    answer: 'Most product teams want one brand design on both platforms, and that works well in Flutter. What makes it feel native is respecting the platform conventions where users notice them.\n\n' +
      'So I keep the brand design, but adapt behaviour: the iOS back swipe, bouncing scroll physics, the platform\'s date and time pickers, switches and dialogs through the adaptive constructors, ' +
      'haptics, and text selection handles. Flutter does much of this automatically based on the platform in the theme.\n\n' +
      'For the bigger differences I check the platform in one place, not scattered everywhere, often by building small adaptive widgets that pick the Material or Cupertino version. ' +
      'And I test on real devices of both, because things like safe areas, keyboard behaviour and permission dialogs differ in ways a simulator does not show well.'
  },
  {
    id: 'flutter-accessibility',
    roles: ['mobile'],
    anchors: ['flutter', 'accessibility', 'semantics', 'screen reader'],
    level: 'mid',
    question: 'How do you make a Flutter app accessible?',
    variants: [
      'How do you support screen readers in Flutter?',
      'What is the Semantics widget?',
      'How do you test accessibility in a Flutter app?',
      'What accessibility checks do you do before release?'
    ],
    answer: 'A lot comes for free with standard widgets, so the first step is not breaking it. Custom buttons made from a GestureDetector, for example, have no meaning for a screen reader, ' +
      'so I use real buttons or wrap custom ones with Semantics to give a label, a role and a state.\n\n' +
      'Then the basics: every icon button and meaningful image has a label, decorative images are excluded, tap targets are at least 48 by 48, colour contrast meets the guidelines, ' +
      'and information is never shown by colour alone. The layout has to survive large text scaling without clipping.\n\n' +
      'To test, I turn on TalkBack and VoiceOver and actually use the main flows, I use the semantics debugger, and Flutter\'s accessibility guideline matchers in widget tests catch tap target and contrast problems automatically.'
  },
  {
    id: 'flutter-keyboard-forms-ux',
    roles: ['mobile'],
    anchors: ['flutter', 'keyboard', 'textfield', 'focus'],
    level: 'mid',
    question: 'How do you handle the keyboard and focus in Flutter forms?',
    variants: [
      'The keyboard covers my text field, how do you fix it?',
      'How do you move focus to the next field in Flutter?',
      'How do you dismiss the keyboard when tapping outside?',
      'What is a FocusNode?'
    ],
    answer: 'The usual problem is the keyboard covering inputs. The Scaffold resizes for the keyboard by default, so I make sure the form is scrollable, ' +
      'and Flutter scrolls the focused field into view. Fixed bottom buttons need the view insets padding so they sit above the keyboard.\n\n' +
      'For a smooth flow I set the right keyboard type and text input action on each field, so email shows the email keyboard and the action button says next, ' +
      'and onFieldSubmitted moves focus to the next field, with the last one submitting the form. FocusNodes let me control focus directly, and they are disposed like controllers.\n\n' +
      'Tapping outside to dismiss is done by unfocusing the current focus, and autofill hints let the system fill passwords and one time codes, which users really notice.'
  },
  {
    id: 'flutter-app-size',
    roles: ['mobile'],
    anchors: ['flutter', 'app size', 'apk', 'bundle'],
    level: 'senior',
    question: 'How do you reduce the size of a Flutter app?',
    variants: [
      'Why is my Flutter APK so big?',
      'How do you analyse Flutter app size?',
      'What is split per ABI?',
      'How do you keep the download size small?'
    ],
    answer: 'First I measure with flutter build and the analyze-size flag, which shows what takes space: the Dart code, assets, fonts and native libraries from plugins.\n\n' +
      'The biggest wins are usually: shipping an app bundle on Android so the store delivers only the code for each device\'s architecture, instead of one fat APK. ' +
      'Compressing and resizing images, and using vector icons instead of many PNGs. Subsetting fonts, which Flutter does for icon fonts automatically when tree shaking is on. ' +
      'And removing heavy plugins I barely use, since each one can bring a large native library.\n\n' +
      'Release builds already tree shake unused Dart code, and obfuscation with split debug info shrinks it a bit more while keeping crash reports readable. ' +
      'For rarely used large assets, downloading them on demand instead of bundling them keeps the first install small.'
  },
  {
    id: 'flutter-impeller',
    roles: ['mobile'],
    anchors: ['flutter', 'impeller', 'skia', 'shader'],
    level: 'senior',
    question: 'What is Impeller and why did Flutter move away from Skia?',
    variants: [
      'What is shader compilation jank?',
      'What is the Impeller rendering engine?',
      'Why does the first animation stutter in Flutter?',
      'How does Flutter draw to the screen?'
    ],
    answer: 'Flutter draws every pixel itself with its own rendering engine, rather than using the platform\'s native widgets. For years that engine was Skia.\n\n' +
      'The main problem with Skia was shader compilation jank. Shaders were compiled the first time an effect appeared, which caused a visible stutter the first time an animation or transition ran, especially on iOS. ' +
      'Workarounds like warming up shaders were fragile.\n\n' +
      'Impeller fixes that by compiling all its shaders ahead of time when the engine is built, so there is nothing to compile at runtime and the first frame of an animation is as smooth as the rest. ' +
      'It uses Metal on iOS and Vulkan on Android, and it is now the default on both. For me as an app developer, the practical effect is more predictable frame times, ' +
      'and that I should test on real devices, because behaviour can differ between renderers on older Android phones.'
  },
  {
    id: 'flutter-widget-composition',
    roles: ['mobile'],
    anchors: ['flutter', 'widget', 'widgets', 'helper'],
    level: 'mid',
    question: 'Why should you split UI into small widget classes instead of helper methods?',
    variants: [
      'Widget classes versus functions that return widgets, which is better?',
      'Why is a _buildHeader method considered bad?',
      'How do you keep build methods small?',
      'When do you extract a new widget?'
    ],
    answer: 'A helper method that returns a widget is just part of the parent\'s build. Whenever the parent rebuilds, the whole thing is rebuilt, and it shares the parent\'s context.\n\n' +
      'A separate widget class gets its own element. Flutter can skip rebuilding it when its inputs have not changed, especially if it is const, it can have its own state, ' +
      'and it gets its own BuildContext, which avoids bugs like looking up a Scaffold that is not above you yet. It also shows up properly in the widget inspector and is easier to test on its own.\n\n' +
      'So I extract a widget when a piece of UI has its own meaning, is reused, or rebuilds for different reasons than its parent. ' +
      'A tiny method for a few lines of layout is fine, but anything substantial becomes its own small, ideally const, widget.'
  }
];
