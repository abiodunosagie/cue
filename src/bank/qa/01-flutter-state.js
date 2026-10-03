// Flutter state management: the topic nearly every mobile interview opens on.
module.exports = [
  {
    id: 'flutter-state-approach',
    roles: ['mobile'],
    anchors: ['flutter', 'dart'],
    level: 'senior',
    question: 'How do you handle state management in a large Flutter app?',
    variants: [
      'What state management do you use in Flutter and why?',
      'How do you manage state across a big Flutter application?',
      'Which state management approach do you prefer for Flutter apps?',
      'How do you structure state in a Flutter app that keeps growing?'
    ],
    answer: 'I split state by who owns it. State that only one widget cares about, like whether a field is focused or an animation is running, stays local in a StatefulWidget. ' +
      'Anything shared, like the signed-in user, a cart or data from the API, lives outside the widget tree in a state layer the screens listen to.\n\n' +
      'For that shared state I usually use Riverpod, or BLoC when the team already knows it. What matters more than the library is the rules around it: ' +
      'the UI only renders state and sends events, the business logic sits in notifiers or blocs, and data access goes through repositories, so each layer can be tested on its own.\n\n' +
      'I also keep state immutable and model loading, success and error as explicit states, so a screen can never show stale data and a spinner at the same time. ' +
      'That keeps a large app predictable as more people work on it.'
  },
  {
    id: 'flutter-riverpod-vs-bloc',
    roles: ['mobile'],
    anchors: ['flutter', 'riverpod', 'bloc'],
    level: 'senior',
    question: 'What is the difference between Riverpod and BLoC, and when would you pick each?',
    variants: [
      'Riverpod or BLoC, which one would you choose?',
      'How does Riverpod compare to BLoC?',
      'Why would you use BLoC instead of Riverpod?',
      'Can you compare BLoC and Riverpod for state management?'
    ],
    answer: 'Both separate business logic from the UI, they just do it differently. BLoC is event driven: the UI adds events, the bloc handles them and emits new states. ' +
      'That is very explicit and easy to trace, which is why bigger teams and regulated apps like it, but it means more code for each feature.\n\n' +
      'Riverpod is a dependency injection and state container in one. Providers can depend on other providers, they are created lazily and disposed when nothing listens, ' +
      'and you can override any of them in tests without a widget tree. It is less code and handles async data very cleanly.\n\n' +
      'I pick BLoC when the team already uses it or wants a strict event log of every change. For a new app I usually go with Riverpod, because it covers both dependency injection and state, ' +
      'and the testing story is simpler. Either way, the architecture around it matters more than the package.'
  },
  {
    id: 'flutter-three-trees',
    roles: ['mobile'],
    anchors: ['flutter'],
    level: 'mid',
    question: 'Can you explain the widget tree, the element tree and the render tree in Flutter?',
    variants: [
      'What is the difference between a widget, an element and a render object?',
      'How does Flutter render widgets on the screen?',
      'Explain the three trees in Flutter.',
      'What happens under the hood when Flutter builds a widget?'
    ],
    answer: 'Widgets are cheap, immutable descriptions of what the UI should look like. Every build creates new ones, and that is fine because they are just configuration.\n\n' +
      'Elements are the long-lived part. Each element holds a widget and its place in the tree, and it is where state lives for a StatefulWidget. ' +
      'When a parent rebuilds, Flutter compares the new widget with the old one at the same spot. If the type and key match, it keeps the element and only updates it, which is why state survives a rebuild.\n\n' +
      'Render objects do the expensive work: layout, painting and hit testing. They are only created or changed when the element says something real changed.\n\n' +
      'In practice this is why I use const constructors, keep build methods small, and use keys when items in a list can move, so Flutter matches the right elements and skips work it does not need.'
  },
  {
    id: 'react-reconciliation-keys',
    roles: ['frontend'],
    anchors: ['react'],
    level: 'mid',
    question: 'How does React decide what to re-render, and why do keys matter?',
    variants: [
      'Explain React reconciliation.',
      'Why does React need a key prop in lists?',
      'What happens when you use the array index as a key in React?',
      'How does React update the DOM efficiently?'
    ],
    answer: 'When state or props change, React calls the component again and gets a new element tree. It then compares that tree with the previous one, which is reconciliation, ' +
      'and only touches the DOM where something actually changed.\n\n' +
      'To keep that fast it uses two shortcuts. If an element changes type, say a div becomes a section, React throws the old subtree away and builds a new one. ' +
      'And for lists it uses keys to know which item is which between renders.\n\n' +
      'That is why keys matter. With a stable key like the item\'s id, React can move, add or remove items and keep each one\'s state and DOM node. ' +
      'If I use the array index and the list is reordered or an item is inserted at the top, the keys shift, so React reuses the wrong components and you get bugs like an input showing another row\'s text. ' +
      'So I use stable ids from the data, and only fall back to the index for a static list that never changes.'
  },
  {
    id: 'api-pagination-design',
    roles: ['backend', 'frontend'],
    anchors: [],
    level: 'senior',
    question: 'How would you design pagination for an API that returns a large list?',
    variants: [
      'Offset or cursor pagination, which would you use?',
      'How do you paginate a big result set in a REST API?',
      'What is cursor based pagination and why use it?',
      'How would you return a very large list from an API efficiently?'
    ],
    answer: 'It depends on how the list is used. For an admin table where people jump to page 7, offset and limit is simple and fine, as long as the table is not huge.\n\n' +
      'For feeds, timelines or anything large and changing, I use cursor pagination. The response returns a cursor, usually the sort value and id of the last item, ' +
      'and the next request asks for items after that cursor. The database can use an index to seek straight there, so page 1000 is as fast as page 1, ' +
      'and new rows arriving in between do not cause duplicates or skipped items, which is the classic offset problem.\n\n' +
      'A few details I always get right: a stable sort with a unique tie breaker like the id, an index that matches that sort, a capped page size, ' +
      'and the cursor sent back as an opaque string so clients do not depend on what is inside it.'
  }
];
