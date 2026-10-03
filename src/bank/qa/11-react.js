// React: hooks, rendering, state and architecture.
module.exports = [
  {
    id: 'react-useeffect',
    roles: ['frontend'],
    anchors: ['react', 'useeffect', 'effect'],
    level: 'mid',
    question: 'How does useEffect work, and what are the common mistakes with it?',
    variants: [
      'What is the dependency array in useEffect?',
      'Why does my useEffect run twice in development?',
      'When should you not use useEffect?',
      'How do you clean up an effect in React?',
      'How do you fetch data in useEffect correctly?'
    ],
    answer: 'useEffect runs code after render to sync the component with something outside React: a subscription, a timer, the document title, or a non-React widget. ' +
      'The dependency array says when to re-run it, and the function it returns is the cleanup, which runs before the next effect and on unmount.\n\n' +
      'The common mistakes: leaving out dependencies, which captures stale values; using effects to compute data from props or state, which should just be calculated during render; ' +
      'and chaining effects that set state, which causes extra renders and bugs.\n\n' +
      'In development, Strict Mode mounts, unmounts and mounts again on purpose, to expose effects that do not clean up properly. If that breaks something, the effect has a bug.\n\n' +
      'For data fetching in an effect I ignore or abort stale responses in the cleanup, but in real apps I prefer a data library like TanStack Query, or fetching on the server, which handles caching, races and loading states for me.'
  },
  {
    id: 'react-usememo-usecallback',
    roles: ['frontend'],
    anchors: ['react', 'usememo', 'usecallback', 'memo'],
    level: 'mid',
    question: 'When do you use useMemo, useCallback and React.memo?',
    variants: [
      'Should you wrap everything in useMemo?',
      'What is the difference between useMemo and useCallback?',
      'How does React.memo work?',
      'Does the React Compiler make useMemo unnecessary?'
    ],
    answer: 'useMemo caches a computed value between renders and useCallback caches a function, both until their dependencies change. React.memo makes a component skip re-rendering when its props are the same.\n\n' +
      'They work together: React.memo compares props by reference, so if a parent passes a new function or object every render, memo never helps. ' +
      'useCallback and useMemo keep those references stable so the memoised child can actually skip.\n\n' +
      'I do not wrap everything. Memoisation has a cost and makes code harder to read, and most renders are cheap. I use it when I have measured a real problem with the React Profiler, ' +
      'when a calculation is genuinely expensive, or when a value is a dependency of an effect and must stay stable.\n\n' +
      'The React Compiler now does much of this memoisation automatically, so in projects using it, manual useMemo and useCallback are needed far less.'
  },
  {
    id: 'react-rerenders',
    roles: ['frontend'],
    anchors: ['react', 're-render', 'rerender', 'rerenders'],
    level: 'senior',
    question: 'What causes a React component to re-render, and how do you optimise rendering?',
    variants: [
      'Why is my React app slow?',
      'How do you find unnecessary re-renders in React?',
      'Does a re-render always update the DOM?',
      'How do you improve React performance?'
    ],
    answer: 'A component re-renders when its state changes, when its parent re-renders, or when a context it uses changes. A re-render only means React calls the function again; the DOM is only touched where the result differs.\n\n' +
      'So re-renders are usually fine. They become a problem when a big tree re-renders on every keystroke, or a component does expensive work in render.\n\n' +
      'I start with the React Profiler to see what renders and how long it takes. The fixes, roughly in order: move state down to the component that uses it, ' +
      'so typing in an input does not re-render the whole page; pass components as children so they are not re-rendered by a parent\'s state; split contexts so fast-changing values do not wake up the whole app; ' +
      'virtualise long lists; and only then memoise with React.memo and stable props. For heavy updates, useTransition keeps typing responsive while the expensive part renders.'
  },
  {
    id: 'react-context',
    roles: ['frontend'],
    anchors: ['react', 'context', 'usecontext'],
    level: 'mid',
    question: 'When do you use React Context, and what are its performance pitfalls?',
    variants: [
      'Context versus Redux, when do you use each?',
      'Why does my whole app re-render when context changes?',
      'Is Context a state management library?',
      'How do you avoid prop drilling?'
    ],
    answer: 'Context solves prop drilling: it makes a value available to any component below the provider without passing it through every level. ' +
      'It is ideal for values that change rarely and are needed widely, like the theme, the current user, the locale or feature flags.\n\n' +
      'It is not a full state manager. When the context value changes, every component that reads it re-renders, and if the provider creates a new object on each render, ' +
      'they all re-render every time the parent does.\n\n' +
      'So I memoise the value, split contexts by how often they change, for example the state in one and the actions in another, and keep fast-changing state out of context. ' +
      'For server data I use a data-fetching library, and for complex client state that many parts of the app update, a store like Zustand or Redux Toolkit, ' +
      'which lets components subscribe to just the slice they need.'
  },
  {
    id: 'react-state-management-choice',
    roles: ['frontend'],
    anchors: ['react', 'redux', 'zustand', 'tanstack query', 'react query'],
    level: 'senior',
    question: 'How do you manage state in a large React application?',
    variants: [
      'Redux, Zustand or React Query, how do you choose?',
      'What is the difference between server state and client state?',
      'Do you still use Redux?',
      'How do you structure state in a big React app?'
    ],
    answer: 'I split state by kind, because each kind has a different best tool.\n\n' +
      'Server state, meaning data that lives on the backend, like products or orders, goes into TanStack Query or a similar library. It handles caching, background refetching, deduplication, loading and error states, and invalidation after mutations. ' +
      'In most apps, that removes the majority of what people used to put in Redux.\n\n' +
      'Local UI state stays in the component with useState or useReducer. URL state, like filters and pagination, goes in the URL, so it can be shared and survives a refresh. ' +
      'Form state goes in a form library.\n\n' +
      'What remains is real global client state, like a cart, a multi-step flow or editor state. For that, a small store like Zustand is my default, ' +
      'and Redux Toolkit when the team wants strict patterns, middleware and dev tools in a large codebase.'
  },
  {
    id: 'react-controlled-uncontrolled',
    roles: ['frontend'],
    anchors: ['react', 'controlled', 'uncontrolled', 'form', 'forms'],
    level: 'mid',
    question: 'What are controlled and uncontrolled components, and how do you handle forms in React?',
    variants: [
      'How do you build forms in React?',
      'Do you use React Hook Form?',
      'What is the difference between controlled and uncontrolled inputs?',
      'How do you validate forms in React?'
    ],
    answer: 'A controlled input gets its value from React state and reports every change, so React is the single source of truth. That makes things like live validation, formatting and dependent fields easy, ' +
      'but every keystroke re-renders the form.\n\n' +
      'An uncontrolled input keeps its own value in the DOM, and I read it when needed, through a ref or the form data on submit. It is less code and faster for big forms.\n\n' +
      'For real forms I use React Hook Form, which is mostly uncontrolled under the hood, so it stays fast, and pairs it with a Zod schema for validation, ' +
      'the same schema the API can use. With React 19 and server actions, simple forms can also post straight to the server with progressive enhancement.\n\n' +
      'Either way, I handle the details users notice: errors shown after a field is touched, server errors on the right field, a disabled submit while sending, and no lost input on failure.'
  },
  {
    id: 'react-custom-hooks',
    roles: ['frontend'],
    anchors: ['react', 'custom hook', 'hooks', 'rules of hooks'],
    level: 'mid',
    question: 'How do you write custom hooks, and what are the rules of hooks?',
    variants: [
      'Why can you not call hooks inside a condition?',
      'Give an example of a custom hook you wrote.',
      'What are the rules of hooks?',
      'When do you extract logic into a custom hook?'
    ],
    answer: 'The rules are: call hooks only at the top level of a component or another hook, never inside conditions, loops or after an early return, and only from React functions. ' +
      'React identifies each hook by the order it is called in, so if a condition skips one, every hook after it gets the wrong state.\n\n' +
      'A custom hook is just a function starting with use that calls other hooks. I extract one when logic with state or effects is reused or makes a component hard to read: ' +
      'useDebouncedValue for search inputs, useMediaQuery, useLocalStorage, or a useOrders hook that wraps the query and the mutations for one feature.\n\n' +
      'Good custom hooks have a small, clear return value, handle their own cleanup, and do not hide surprising side effects. ' +
      'Each component that uses a hook gets its own state; sharing state between them still needs context or a store.'
  },
  {
    id: 'react-error-boundaries-suspense',
    roles: ['frontend'],
    anchors: ['react', 'error boundary', 'suspense'],
    level: 'mid',
    question: 'What are error boundaries and Suspense in React?',
    variants: [
      'How do you stop one broken component from crashing the whole page?',
      'What does Suspense do?',
      'How do you show loading states with Suspense?',
      'Can error boundaries catch errors in event handlers?'
    ],
    answer: 'An error boundary catches errors thrown while rendering its children and shows a fallback instead of unmounting the whole app. ' +
      'I place them around independent sections, like a widget on a dashboard, so one failing part does not take the page down, and report the error to monitoring. ' +
      'They do not catch errors in event handlers or async code, which I handle with normal try and catch.\n\n' +
      'Suspense is the loading counterpart: when a child is waiting, for lazy-loaded code or data from a Suspense-enabled source, the nearest Suspense boundary shows a fallback. ' +
      'It lets me design loading states by layout, for example a skeleton for the sidebar and another for the main content, instead of spinners scattered in every component.\n\n' +
      'In Next.js, the loading and error files create these boundaries per route, and with streaming the server sends the shell first and fills each Suspense area as its data arrives.'
  },
  {
    id: 'react-concurrent-transitions',
    roles: ['frontend'],
    anchors: ['react', 'usetransition', 'usedeferredvalue', 'concurrent'],
    level: 'senior',
    question: 'What did concurrent rendering bring in React 18, like useTransition and useDeferredValue?',
    variants: [
      'What is useTransition used for?',
      'What is automatic batching in React 18?',
      'How do you keep typing responsive while a big list filters?',
      'What is concurrent rendering?'
    ],
    answer: 'Concurrent rendering lets React prepare a new UI in the background and interrupt that work when something more urgent happens, like a keystroke.\n\n' +
      'useTransition marks an update as non-urgent. For example, typing in a search box updates the input immediately, and filtering a large list is wrapped in a transition, ' +
      'so React keeps the input responsive and renders the list when it can, with isPending to show a subtle indicator. useDeferredValue does the same from the consumer side: the expensive part renders with a slightly older value while the input stays current.\n\n' +
      'React 18 also made batching automatic, so several state updates in a timeout or promise cause one render, not several.\n\n' +
      'These are tools for specific problems. I reach for them when profiling shows an update blocking input, after the basics like moving state down and virtualising lists.'
  },
  {
    id: 'react-server-components',
    roles: ['frontend'],
    anchors: ['react', 'server components', 'rsc', 'use client'],
    level: 'senior',
    question: 'What are React Server Components, and how are they different from server side rendering?',
    variants: [
      'What does "use client" mean?',
      'Server components versus client components, how do you decide?',
      'What are the benefits of React Server Components?',
      'Is RSC the same as SSR?'
    ],
    answer: 'Server-side rendering renders components to HTML on the server for a fast first paint, but all the component code is still sent to the browser and hydrated.\n\n' +
      'Server Components are different: they run only on the server and their code never goes to the browser. They can read the database or call internal services directly, and they send a serialised result. ' +
      'That means less JavaScript shipped, secrets and heavy libraries stay on the server, and data fetching happens next to the data, without client-side waterfalls.\n\n' +
      'Client Components, marked with "use client", are the ones with state, effects, event handlers or browser APIs. ' +
      'My rule in the App Router is server by default, and push "use client" as far down as possible, like the interactive button inside an otherwise static product card. ' +
      'Props crossing that boundary must be serialisable, and I keep server-only code in modules marked server-only so it cannot leak into the client bundle.'
  },
  {
    id: 'react-refs',
    roles: ['frontend'],
    anchors: ['react', 'useref', 'ref', 'refs', 'forwardref'],
    level: 'mid',
    question: 'What is useRef for, and when is it better than state?',
    variants: [
      'useRef versus useState, what is the difference?',
      'How do you focus an input in React?',
      'How do you pass a ref to a child component?',
      'Why does changing a ref not re-render?'
    ],
    answer: 'useRef gives me a mutable box that survives renders, and changing it does not cause a re-render.\n\n' +
      'The first use is DOM access: focusing an input, measuring an element, scrolling into view or integrating a non-React library. ' +
      'The second is keeping values that the UI does not display, like a timer id, the previous value of a prop, or a flag that a request is in flight.\n\n' +
      'The rule is: if changing the value should update what the user sees, it is state. If it is bookkeeping, it is a ref. Reading or writing refs during render is a mistake, since React will not know about it.\n\n' +
      'To pass a ref to a child, React 19 lets function components take ref as a normal prop; before that, forwardRef was needed. ' +
      'useImperativeHandle lets a component expose a small API, like a focus method, instead of its whole DOM node.'
  },
  {
    id: 'react-reducer',
    roles: ['frontend'],
    anchors: ['react', 'usereducer', 'reducer'],
    level: 'mid',
    question: 'When do you use useReducer instead of useState?',
    variants: [
      'What is useReducer?',
      'How do you manage complex state in one component?',
      'Why use a reducer for a multi step form?',
      'useState versus useReducer?'
    ],
    answer: 'useState is perfect for independent, simple values. I switch to useReducer when several pieces of state change together or the next state depends on the current one in non-trivial ways: ' +
      'a multi-step form, a wizard with validation, a shopping cart, or a data table with sorting, filtering and pagination that interact.\n\n' +
      'A reducer is a pure function from the current state and an action to the next state. That puts all the transition logic in one place, ' +
      'so the component just dispatches what happened, like "item added" or "step completed", and it is easy to unit test without rendering anything.\n\n' +
      'It also makes impossible states easier to prevent, and dispatch is stable, so passing it down does not break memoisation. ' +
      'If the same reducer logic is needed across the app, that is a sign it belongs in a store instead.'
  },
  {
    id: 'react-lists-virtualization',
    roles: ['frontend'],
    anchors: ['react', 'virtualization', 'virtualized', 'large list'],
    level: 'senior',
    question: 'How do you render a list of thousands of rows in React without it being slow?',
    variants: [
      'What is list virtualisation?',
      'Have you used react-window or TanStack Virtual?',
      'How do you build a fast data table in React?',
      'How do you handle infinite scroll in React?'
    ],
    answer: 'Rendering thousands of DOM nodes is slow to create, slow to update and heavy on memory, so I virtualise: only the rows in the viewport, plus a small buffer, are rendered, ' +
      'and the container has the full height so the scrollbar behaves normally. TanStack Virtual or react-window do this well, including variable row heights.\n\n' +
      'Rows themselves stay cheap: stable keys from the data, memoised row components so scrolling does not re-render the ones already on screen, and no heavy work in render.\n\n' +
      'Often the best fix is not rendering that much at all: server-side pagination or filtering, so the user sees what they need. ' +
      'For infinite scroll, I use an IntersectionObserver on a sentinel element to load the next page, combined with a data library so pages are cached and requests are not duplicated.'
  },
  {
    id: 'react-code-splitting',
    roles: ['frontend'],
    anchors: ['react', 'lazy', 'code splitting', 'bundle'],
    level: 'mid',
    question: 'How do you reduce the JavaScript bundle size of a React app?',
    variants: [
      'What is code splitting in React?',
      'How does React.lazy work?',
      'How do you analyse what is in your bundle?',
      'Why is my React app slow to load?'
    ],
    answer: 'First I measure with a bundle analyser to see what is actually big. Very often it is one or two libraries, like a full date library, a charting package or an icon set imported as a whole.\n\n' +
      'Then the fixes. Code splitting by route, so each page loads only its own code; frameworks like Next.js do this automatically. React.lazy with Suspense, or dynamic imports, for heavy components only some users need, like an editor, a map or a chart behind a tab. ' +
      'Importing only what I use, so tree shaking can drop the rest, and replacing heavy dependencies with lighter ones or native APIs, like Intl for formatting.\n\n' +
      'In the App Router, keeping components on the server means their code is not shipped at all. I also set a performance budget in CI, so the bundle does not quietly grow back.'
  },
  {
    id: 'react-testing',
    roles: ['frontend'],
    anchors: ['react', 'testing library', 'jest', 'vitest', 'playwright', 'cypress'],
    level: 'mid',
    question: 'How do you test React applications?',
    variants: [
      'What is React Testing Library and why use it?',
      'How do you mock API calls in React tests?',
      'Jest or Vitest, Cypress or Playwright?',
      'What do you test in a React component?'
    ],
    answer: 'I test behaviour the way a user experiences it. With React Testing Library and Vitest or Jest, I render a component, find elements by role and label, like a button named "Save", ' +
      'interact with user-event, and assert what appears. That also nudges the markup towards being accessible, because inaccessible elements are hard to find.\n\n' +
      'For network calls I use Mock Service Worker, which intercepts requests at the network level, so components use their real data-fetching code and the same mocks work in tests and in the browser.\n\n' +
      'Pure logic, like reducers, hooks and utilities, gets fast unit tests. And a handful of Playwright end to end tests cover the critical journeys, like sign up and checkout, against a real build.\n\n' +
      'I avoid testing implementation details, like internal state or which hook was called, because those tests break on every refactor without catching real bugs.'
  },
  {
    id: 'react-component-architecture',
    roles: ['frontend'],
    anchors: ['react', 'component', 'components', 'architecture'],
    level: 'senior',
    question: 'How do you structure components and folders in a large React codebase?',
    variants: [
      'How do you organise a React project?',
      'How do you design reusable components?',
      'What makes a good React component API?',
      'How do you avoid giant components in React?'
    ],
    answer: 'I organise by feature: each feature folder holds its components, hooks, API calls and types, and a shared folder holds the design system components and utilities. ' +
      'Features only import from each other through a small public entry, which keeps boundaries clear as the app grows.\n\n' +
      'For components, I separate the reusable, presentational pieces, like Button, Modal or DataTable, which take props and know nothing about the business, ' +
      'from feature components that fetch data and wire the pieces together.\n\n' +
      'Good component APIs are small and predictable: sensible defaults, composition with children instead of dozens of props, and forwarding native attributes. ' +
      'When a component passes about 200 lines or has several reasons to change, I split it, usually by extracting a custom hook for the logic and subcomponents for the sections. ' +
      'The design system components are documented in Storybook so the team reuses them instead of rebuilding.'
  },
  {
    id: 'react-19-features',
    roles: ['frontend'],
    anchors: ['react', 'react 19', 'server actions', 'useactionstate', 'useoptimistic'],
    level: 'senior',
    question: 'What is new in React 19 that changes how you write apps?',
    variants: [
      'What are actions in React 19?',
      'What does useOptimistic do?',
      'What is useActionState?',
      'What is the use hook in React 19?'
    ],
    answer: 'The big theme is actions: async functions that handle a form submission or mutation, with React managing the pending state, errors and form reset. ' +
      'A form can take an action directly, useActionState gives me the result and pending flag, and useFormStatus lets a submit button know the form is sending without prop drilling.\n\n' +
      'useOptimistic shows the expected result immediately, like a liked post or a sent message, and reverts automatically if the action fails, which makes the UI feel instant.\n\n' +
      'The use hook reads a promise or context, and works with Suspense. Refs can be passed as normal props, so forwardRef is no longer needed, and metadata tags like title can be rendered from components.\n\n' +
      'And the React Compiler, which became stable, memoises components automatically, so a lot of manual useMemo and useCallback can go away. Together with server components, it means less client code for the same features.'
  }
];
