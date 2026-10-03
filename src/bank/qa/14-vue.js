// Vue.js: reactivity, the Composition API and the ecosystem.
module.exports = [
  {
    id: 'vue-reactivity',
    roles: ['frontend'],
    anchors: ['vue', 'vue.js', 'nuxt', 'pinia', 'vuex'],
    level: 'mid',
    question: 'How does reactivity work in Vue 3, and what is the difference between ref and reactive?',
    variants: [
      'ref versus reactive in Vue, which do you use?',
      'How does Vue know when to re-render?',
      'Why do I lose reactivity when I destructure a reactive object?',
      'Explain Vue 3 reactivity with proxies.'
    ],
    answer: 'Vue 3 wraps state in JavaScript proxies. When a component renders, Vue records which reactive properties it reads, and when one of them changes, only the components and computed values that depend on it update. ' +
      'That is why Vue usually needs no manual memoisation.\n\n' +
      'ref holds a single value, of any type, and is read and written through .value in script, unwrapped automatically in templates. reactive makes a whole object deeply reactive without .value, but only works with objects, ' +
      'and if I destructure it or replace the whole object, I lose reactivity, because the proxy is gone.\n\n' +
      'So my default is ref, which behaves consistently for everything, and toRefs when I need to destructure a reactive object, for example when returning it from a composable.'
  },
  {
    id: 'vue-composition-vs-options',
    roles: ['frontend'],
    anchors: ['vue', 'vue.js', 'nuxt', 'pinia', 'vuex'],
    level: 'mid',
    question: 'Composition API or Options API in Vue, which do you prefer and why?',
    variants: [
      'What are the benefits of the Composition API?',
      'What is script setup in Vue?',
      'How do you share logic between Vue components?',
      'What is a composable in Vue?'
    ],
    answer: 'For anything beyond small components I prefer the Composition API with script setup. The Options API splits a feature across data, computed, methods and watch, ' +
      'so one piece of logic is scattered around the file. With the Composition API, everything about one concern sits together.\n\n' +
      'It also makes reuse clean through composables: functions like useFetch, useDebounce or usePagination that use refs and lifecycle hooks and return reactive values. ' +
      'They replace mixins, which had name collisions and unclear sources of properties.\n\n' +
      'TypeScript support is much better too, and script setup removes boilerplate: imports and variables are available in the template directly, and defineProps and defineEmits give typed props and events.\n\n' +
      'The Options API is still fine and easy for beginners, and both can live in the same app, so I would not rewrite working components just to switch.'
  },
  {
    id: 'vue-computed-watch',
    roles: ['frontend'],
    anchors: ['vue', 'vue.js', 'nuxt', 'pinia', 'vuex'],
    level: 'mid',
    question: 'What is the difference between computed, watch and watchEffect in Vue?',
    variants: [
      'When do you use a watcher instead of a computed property?',
      'What is watchEffect?',
      'Why are computed properties cached?',
      'How do you react to a prop change in Vue?'
    ],
    answer: 'A computed property derives a value from reactive state and is cached: it only recalculates when one of its dependencies changes. ' +
      'Anything I can express as "this value is a function of that state", like a filtered list or a full name, should be computed, and it should have no side effects.\n\n' +
      'A watcher is for side effects in response to a change: calling an API when a search term changes, saving to local storage, or syncing with a non-Vue library. ' +
      'watch is explicit about its source and gives me the old and new values, and it can be lazy or immediate. ' +
      'watchEffect runs immediately and tracks whatever it reads automatically, which is shorter but less explicit.\n\n' +
      'A common smell is using a watcher to set another piece of state that could just be computed. That adds bugs and extra renders.'
  },
  {
    id: 'vue-pinia',
    roles: ['frontend'],
    anchors: ['vue', 'vue.js', 'nuxt', 'pinia', 'vuex'],
    level: 'mid',
    question: 'How do you manage global state in Vue, and why Pinia over Vuex?',
    variants: [
      'What is Pinia?',
      'Pinia versus Vuex?',
      'How do you structure stores in a Vue app?',
      'When do you need a store in Vue?'
    ],
    answer: 'Pinia is the official store for Vue now, and the successor to Vuex. Compared to Vuex it removed mutations, so actions change state directly, it has excellent TypeScript inference, ' +
      'it is modular by design, with one store per domain like auth or cart, and it works with the dev tools for time travel and inspection.\n\n' +
      'I can write a store in the setup style, which is just a composable with refs, computed getters and functions as actions, so it feels like the rest of a Composition API codebase.\n\n' +
      'I only put truly shared client state in stores: the current user, the cart, app-wide preferences. Local component state stays local, and server data is better handled by a data-fetching library like TanStack Query for Vue, ' +
      'with caching and refetching, instead of hand-written loading flags in a store.'
  },
  {
    id: 'vue-vs-react',
    roles: ['frontend'],
    anchors: ['vue', 'vue.js', 'nuxt', 'pinia', 'vuex'],
    level: 'mid',
    question: 'How would you compare Vue and React?',
    variants: [
      'Vue or React, which would you choose for a new project?',
      'What are the main differences between Vue and React?',
      'Have you worked with both Vue and React?',
      'Why would a team choose Vue?'
    ],
    answer: 'Both are component-based and render efficiently; the difference is in philosophy.\n\n' +
      'Vue has fine-grained reactivity, so components update automatically when the state they read changes, with little need for memoisation. ' +
      'It uses HTML-based templates and single file components, and it comes with official router and state libraries, so teams make fewer decisions and the code looks consistent. ' +
      'Many people find it easier to learn.\n\n' +
      'React treats the UI as a function of state, re-rendering components and reconciling the result, with JSX giving the full power of JavaScript in markup. ' +
      'Its ecosystem is larger, React Native shares the model on mobile, and server components with Next.js are a strong full-stack story.\n\n' +
      'For a new project I would mostly look at the team\'s experience and hiring. Either is a sound choice; what makes a codebase good is the structure around it.'
  },
  {
    id: 'vue-nuxt',
    roles: ['frontend'],
    anchors: ['vue', 'vue.js', 'nuxt', 'pinia', 'vuex'],
    level: 'mid',
    question: 'What does Nuxt add on top of Vue?',
    variants: [
      'What is Nuxt?',
      'How does server side rendering work in Nuxt?',
      'Nuxt versus Next.js?',
      'When would you use Nuxt for a Vue project?'
    ],
    answer: 'Nuxt is to Vue roughly what Next.js is to React: a full framework with file-based routing, server-side rendering, static generation and hybrid rendering per route, ' +
      'plus server routes for API endpoints, so the same project can hold the front end and a light backend.\n\n' +
      'It adds conventions that save setup: auto-imported components and composables, layouts, middleware for route guards, and data-fetching helpers like useFetch and useAsyncData, ' +
      'which fetch on the server and pass the data to the client without fetching twice.\n\n' +
      'I would use it whenever a Vue project needs SEO or a fast first load, like a marketing site, a store or content pages. ' +
      'For an internal dashboard behind a login, a plain Vue app with Vite can be simpler.'
  },
  {
    id: 'vue-component-communication',
    roles: ['frontend'],
    anchors: ['vue', 'vue.js', 'nuxt', 'pinia', 'vuex'],
    level: 'junior',
    question: 'How do components communicate in Vue?',
    variants: [
      'How do you pass data from a child to a parent in Vue?',
      'What are provide and inject?',
      'How does v-model work on a custom component?',
      'What are slots in Vue?'
    ],
    answer: 'Data goes down through props and changes go up through events: the child emits an event, the parent listens and updates its own state. Props are read-only in the child, which keeps the data flow predictable.\n\n' +
      'v-model on a component is shorthand for a prop plus an update event, and defineModel in Vue 3.4 makes that a single line.\n\n' +
      'Slots let the parent pass markup into a child, which is how I build flexible components like a card or a modal with custom content, and scoped slots let the child pass data back to that markup, ' +
      'like a list component that lets the parent decide how each row looks.\n\n' +
      'For values needed deep in the tree, provide and inject avoid passing props through every level, like a form context. And for truly app-wide state, a Pinia store.'
  },
  {
    id: 'vue-performance',
    roles: ['frontend'],
    anchors: ['vue', 'vue.js', 'nuxt', 'pinia', 'vuex'],
    level: 'senior',
    question: 'How do you optimise performance in a Vue application?',
    variants: [
      'v-if versus v-show, when do you use each?',
      'Why do you need a key in v-for?',
      'What is keep-alive in Vue?',
      'How do you make a large Vue list fast?'
    ],
    answer: 'Vue is fast by default, so I start by measuring with the Vue dev tools and the browser profiler.\n\n' +
      'Common improvements: v-if removes the element from the DOM and is right for things that rarely toggle, while v-show only hides it with CSS and is right for things toggled often. ' +
      'v-for always gets a stable key from the data. Large lists are virtualised. Heavy derived data goes into computed properties so it is cached, ' +
      'and big, read-only data like a long list from an API can use shallowRef to avoid making every nested object reactive.\n\n' +
      'keep-alive caches inactive components, like tabs, so switching back keeps their state without re-creating them.\n\n' +
      'At the app level: route-level code splitting with lazy-loaded components, async components for heavy widgets, and server-side rendering or static generation with Nuxt for pages that need a fast first paint.'
  }
];
