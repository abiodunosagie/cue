// Core JavaScript: the language questions behind every front end interview.
module.exports = [
  {
    id: 'js-closures',
    roles: ['frontend', 'backend'],
    anchors: ['javascript', 'closure', 'closures'],
    level: 'mid',
    question: 'What is a closure in JavaScript, and where do you use one?',
    variants: [
      'Explain closures with an example.',
      'Why does a function remember variables after its parent returned?',
      'What is the classic closure bug with var in a loop?',
      'How are closures used in React hooks?'
    ],
    answer: 'A closure is a function together with the variables from the scope where it was created. Even after the outer function has returned, the inner function keeps access to those variables, ' +
      'because it holds a reference to that scope.\n\n' +
      'I use them all the time, often without naming it: event handlers that remember which item they belong to, factory functions like a counter or a debounce that keep private state, ' +
      'and module patterns that hide internals.\n\n' +
      'The classic bug is a loop with var that creates callbacks: they all share one variable, so they all see its last value. With let, each iteration gets its own binding, which fixes it.\n\n' +
      'In React, closures explain stale state: an effect or a callback captures the values from the render it was created in, so if it is not re-created when they change, it keeps using old values. ' +
      'That is why dependency arrays matter.'
  },
  {
    id: 'js-event-loop',
    roles: ['frontend', 'backend'],
    anchors: ['javascript', 'event loop', 'microtask', 'promise'],
    level: 'senior',
    question: 'How does the JavaScript event loop work?',
    variants: [
      'Explain the call stack, task queue and microtask queue.',
      'Why does a promise callback run before setTimeout with zero delay?',
      'Is JavaScript single threaded?',
      'What is the order of execution for setTimeout, promises and synchronous code?'
    ],
    answer: 'JavaScript runs on a single thread with a call stack. Synchronous code runs to completion first. Asynchronous work, like timers, network requests and events, is handled by the browser or Node, ' +
      'and when it finishes, its callback is queued.\n\n' +
      'There are two kinds of queues. Macrotasks, like setTimeout, I/O and UI events. And microtasks, like promise callbacks and queueMicrotask. ' +
      'After each macrotask, the engine empties the whole microtask queue before doing anything else, and in the browser it can then render.\n\n' +
      'So for a log, a setTimeout with zero and a resolved promise: the synchronous log comes first, then the promise callback, then the timeout. ' +
      'The practical lesson is that long synchronous work blocks everything, including rendering and clicks, so heavy work goes to a Web Worker or is split into chunks, ' +
      'and an endless chain of microtasks can starve rendering too.'
  },
  {
    id: 'js-promises-async',
    roles: ['frontend', 'backend'],
    anchors: ['javascript', 'promise', 'promises', 'async', 'await'],
    level: 'mid',
    question: 'How do promises and async await work, and how do you handle errors with them?',
    variants: [
      'What is the difference between Promise.all, allSettled, race and any?',
      'How do you run async calls in parallel in JavaScript?',
      'What happens to an unhandled promise rejection?',
      'Async await versus then chains, which do you use?'
    ],
    answer: 'A promise represents a value that will be available later, and it is pending, fulfilled or rejected. async and await are syntax over promises that make async code read top to bottom, with try and catch for errors.\n\n' +
      'The common mistake is awaiting independent calls one after another, which adds their times together. If they do not depend on each other, I start them all and await Promise.all, ' +
      'which fails fast if any one rejects. allSettled waits for all and tells me which succeeded, which is better when partial results are fine. race settles with the first to finish, which I use for timeouts, and any takes the first success.\n\n' +
      'Every promise chain needs an error path. An unhandled rejection is logged in the browser and in Node it crashes the process by default, so I always catch at the boundary, ' +
      'like the request handler or the UI action, and show or log a meaningful error.'
  },
  {
    id: 'js-this-binding',
    roles: ['frontend', 'backend'],
    anchors: ['javascript', 'this', 'bind', 'arrow function'],
    level: 'mid',
    question: 'How does this work in JavaScript, and how do arrow functions change it?',
    variants: [
      'Explain the this keyword in JavaScript.',
      'What is the difference between call, apply and bind?',
      'Why do arrow functions not have their own this?',
      'Why is this undefined in my callback?'
    ],
    answer: 'In a normal function, this is decided by how the function is called, not where it is written. Called as obj.method, this is obj. Called as a plain function, it is undefined in strict mode. ' +
      'Called with new, it is the new object. And call, apply and bind set it explicitly: call and apply invoke immediately with arguments listed or as an array, bind returns a new function with this fixed.\n\n' +
      'Arrow functions do not have their own this; they use the this of the surrounding code. That is exactly why they are good for callbacks inside methods, ' +
      'and why they are wrong as object methods that need this to be the object.\n\n' +
      'The classic bug is passing a method as a callback, like an event handler, and losing this, because it is now called as a plain function. The fixes are bind, an arrow function wrapper, or a class field arrow function.'
  },
  {
    id: 'js-prototypes',
    roles: ['frontend', 'backend'],
    anchors: ['javascript', 'prototype', 'prototypes', 'inheritance'],
    level: 'senior',
    question: 'How does prototypal inheritance work in JavaScript?',
    variants: [
      'What is the prototype chain?',
      'Are JavaScript classes real classes?',
      'What is the difference between __proto__ and prototype?',
      'How does method lookup work in JavaScript objects?'
    ],
    answer: 'Every JavaScript object has an internal link to another object, its prototype. When I read a property that the object does not have, the engine looks at its prototype, then that one\'s prototype, ' +
      'and so on until it reaches null. That is the prototype chain, and it is how methods are shared: instances do not copy methods, they find them on the prototype.\n\n' +
      'A constructor function\'s prototype property is the object that becomes the prototype of instances created with new. The internal link on an instance is what __proto__ or Object.getPrototypeOf gives you.\n\n' +
      'Classes are syntax on top of this same model. extends sets up the prototype chain, methods go on the prototype, and super calls the parent. ' +
      'Knowing this helps with things like why adding a method to Array.prototype affects every array, and why it is a bad idea in shared code.'
  },
  {
    id: 'js-hoisting-scope',
    roles: ['frontend', 'backend'],
    anchors: ['javascript', 'hoisting', 'var', 'let', 'const'],
    level: 'junior',
    question: 'What is the difference between var, let and const, and what is hoisting?',
    variants: [
      'Explain hoisting in JavaScript.',
      'What is the temporal dead zone?',
      'Can you change an object declared with const?',
      'Why should you avoid var?'
    ],
    answer: 'var is function scoped and is hoisted with the value undefined, so it can be read before its line without an error. That causes bugs, especially in loops and blocks.\n\n' +
      'let and const are block scoped. They are hoisted too, but they cannot be accessed before their declaration; that gap is the temporal dead zone, and touching them there throws an error, which catches mistakes early.\n\n' +
      'const means the binding cannot be reassigned. It does not make the value immutable: a const object or array can still be changed. If I need that, I use Object.freeze or immutable patterns.\n\n' +
      'Function declarations are fully hoisted, so they can be called before they appear, while function expressions follow the rules of their variable. ' +
      'In practice I use const by default, let when the value must change, and never var.'
  },
  {
    id: 'js-equality-types',
    roles: ['frontend', 'backend'],
    anchors: ['javascript', 'equality', 'coercion', 'typeof'],
    level: 'junior',
    question: 'What is the difference between == and === in JavaScript?',
    variants: [
      'What is type coercion in JavaScript?',
      'Why is null == undefined true?',
      'What are the falsy values in JavaScript?',
      'How do you check if a value is an array or null?'
    ],
    answer: 'Triple equals compares value and type with no conversion. Double equals converts the values to a common type first, which leads to surprises like an empty string equal to zero.\n\n' +
      'So I always use triple equals. The one common exception people allow is checking value == null, which is true for both null and undefined, though I usually write it explicitly.\n\n' +
      'The falsy values are false, zero, minus zero, an empty string, null, undefined, NaN and zero n for BigInt. Everything else is truthy, including an empty array and an empty object, which trips people up in conditions.\n\n' +
      'For type checks, typeof works for primitives but says "object" for null and arrays, so I use Array.isArray for arrays and a direct null check. ' +
      'NaN is not equal to itself, so Number.isNaN is the right test, and Object.is handles those edge cases exactly.'
  },
  {
    id: 'js-debounce-throttle',
    roles: ['frontend'],
    anchors: ['javascript', 'debounce', 'throttle'],
    level: 'mid',
    question: 'What is the difference between debounce and throttle, and when do you use each?',
    variants: [
      'How do you limit how often a function runs on scroll or input?',
      'When would you debounce a search input?',
      'Explain throttling with an example.',
      'How would you implement debounce?'
    ],
    answer: 'Both limit how often a function runs when an event fires rapidly. Debounce waits until the events stop for a set time and then runs once. Throttle runs at most once per interval while events keep coming.\n\n' +
      'I debounce things where only the final value matters: a search box that calls the API after the user pauses typing, auto-saving a form, or recalculating after a window resize.\n\n' +
      'I throttle things that should update steadily during the activity: scroll position tracking, infinite scroll checks, drag handlers or analytics on mouse movement.\n\n' +
      'Debounce is a closure that keeps a timer: each call clears the previous timer and sets a new one. For search, I also cancel the previous request with an AbortController, ' +
      'so a slow old response cannot overwrite a newer one. For scroll and visibility, IntersectionObserver often removes the need for throttling altogether.'
  },
  {
    id: 'js-modules',
    roles: ['frontend', 'backend'],
    anchors: ['javascript', 'esm', 'commonjs', 'modules', 'import'],
    level: 'mid',
    question: 'What is the difference between ES modules and CommonJS?',
    variants: [
      'import versus require, what is the difference?',
      'Why does tree shaking need ES modules?',
      'What is a dynamic import?',
      'Why do I get errors mixing ESM and CommonJS in Node?'
    ],
    answer: 'CommonJS is Node\'s original system: require loads a module synchronously at runtime and module.exports defines what it gives back. Because it is dynamic, tools cannot reliably know what is used.\n\n' +
      'ES modules use import and export, which are static: they are declared at the top level and resolved before the code runs. ' +
      'That is what makes tree shaking possible, since a bundler can see which exports are never imported and drop them. ESM is the standard in browsers and modern Node.\n\n' +
      'Dynamic import is the async, runtime version: it returns a promise of the module, and I use it for code splitting, loading a heavy chart or editor only when the user needs it.\n\n' +
      'Mixing the two in Node causes friction: an ES module can import CommonJS, but CommonJS needs dynamic import to load ESM, and the package type field and file extensions decide which mode applies.'
  },
  {
    id: 'js-memory-leaks-browser',
    roles: ['frontend'],
    anchors: ['javascript', 'memory leak', 'memory leaks', 'garbage collection'],
    level: 'senior',
    question: 'What causes memory leaks in a web app, and how do you find them?',
    variants: [
      'How does garbage collection work in JavaScript?',
      'How do you debug memory issues in Chrome DevTools?',
      'What are common memory leaks in React apps?',
      'Why does my single page app get slower over time?'
    ],
    answer: 'JavaScript frees memory that is no longer reachable from the roots, like globals and the current stack. A leak is memory that is still reachable by accident, so it can never be collected.\n\n' +
      'In a single page app the usual causes are: event listeners added to window or document and never removed, timers and intervals not cleared, subscriptions to sockets or stores not closed when a component unmounts, ' +
      'caches that only grow, and detached DOM nodes still referenced from JavaScript.\n\n' +
      'In React, that means every effect that subscribes or starts something must return a cleanup function.\n\n' +
      'To find leaks I use the Chrome DevTools memory panel: take a heap snapshot, repeat the suspected action several times, like opening and closing a modal, take another and compare. ' +
      'Objects that keep growing, especially detached elements, point to the retainer holding them.'
  },
  {
    id: 'js-map-set-weakmap',
    roles: ['frontend', 'backend'],
    anchors: ['javascript', 'map', 'set', 'weakmap'],
    level: 'mid',
    question: 'When would you use a Map, a Set or a WeakMap instead of a plain object or array?',
    variants: [
      'What is the difference between a Map and an object?',
      'What is a WeakMap used for?',
      'How do you remove duplicates from an array?',
      'Why use a Set for lookups?'
    ],
    answer: 'I use a Map when I need a real dictionary: keys of any type, including objects, insertion order kept, an easy size, and fast frequent additions and deletions. ' +
      'A plain object is fine for fixed shapes and JSON, but its keys are strings and it has a prototype, which can collide with keys like constructor.\n\n' +
      'A Set holds unique values with constant-time has checks. I use it for deduplicating, like new Set of an array spread back into an array, and for fast membership checks instead of includes on a large array, which is linear.\n\n' +
      'A WeakMap holds its keys weakly, so when the key object is no longer used elsewhere, the entry can be garbage collected. ' +
      'That makes it right for attaching metadata or caching results per object, like per DOM node, without causing a memory leak. Its keys must be objects and it cannot be iterated.'
  },
  {
    id: 'js-immutability',
    roles: ['frontend'],
    anchors: ['javascript', 'immutable', 'immutability', 'spread'],
    level: 'mid',
    question: 'Why does immutability matter in front end code, and how do you update nested state?',
    variants: [
      'What is the difference between a shallow copy and a deep copy?',
      'How do you update a nested object without mutating it?',
      'What is structuredClone?',
      'Why does mutating state break React updates?'
    ],
    answer: 'Frameworks like React decide whether to update by comparing references. If I mutate an object in place and set it again, the reference is the same, so React may skip the render and the UI shows old data. ' +
      'Immutable updates also make changes easy to track, undo and debug.\n\n' +
      'The spread operator makes a shallow copy: the top level is new, but nested objects are still shared. So to update a nested field, I copy each level along the path: ' +
      'spread the user, spread the address inside it, and set the new city. For deep or complex updates, Immer lets me write mutating-style code that produces an immutable result, which is what Redux Toolkit uses.\n\n' +
      'For a true deep copy, structuredClone is built in and handles dates, maps and cycles, unlike the old JSON stringify trick, which loses dates, undefined and functions.'
  },
  {
    id: 'js-array-methods',
    roles: ['frontend', 'backend'],
    anchors: ['javascript', 'reduce', 'map', 'filter', 'array'],
    level: 'junior',
    question: 'How do map, filter and reduce work, and when would you use a plain loop instead?',
    variants: [
      'Explain reduce with an example.',
      'What is the difference between forEach and map?',
      'Which array methods mutate the array?',
      'When is a for loop better than array methods?'
    ],
    answer: 'map returns a new array with each item transformed, filter returns a new array with the items that pass a test, and reduce folds the array into one value, like a total, an object grouped by key, or a lookup map.\n\n' +
      'forEach only runs a function for each item and returns nothing, so I use it for side effects, while map is for producing a new array. ' +
      'Some methods mutate the original, like sort, reverse, splice and push, which matters in React state; the newer toSorted and toReversed return copies.\n\n' +
      'I like the declarative methods because they read clearly. But I use a plain for or for-of loop when I need to stop early, when I am doing async work in sequence with await, ' +
      'or in a hot path where chaining several methods creates many intermediate arrays. Readability first, then performance where it is measured.'
  },
  {
    id: 'js-generators-iterators',
    roles: ['frontend', 'backend'],
    anchors: ['javascript', 'generator', 'generators', 'iterator', 'yield'],
    level: 'senior',
    question: 'What are iterators and generators in JavaScript?',
    variants: [
      'What does the yield keyword do?',
      'What is for await of used for?',
      'When would you use a generator function?',
      'How do you make an object iterable?'
    ],
    answer: 'An iterator is an object with a next method that returns a value and a done flag. An iterable is anything with a Symbol.iterator method that gives one, which is what for-of, spread and destructuring use. ' +
      'Arrays, strings, maps and sets are all iterable.\n\n' +
      'A generator function, written with a star, makes writing iterators easy: it pauses at each yield and resumes when the next value is asked for. ' +
      'That makes it lazy, so I can model an infinite sequence, or walk a tree, without building a whole array.\n\n' +
      'Async generators combine this with promises, and for await of consumes them. I use that for paginated APIs, where each iteration fetches the next page only when needed, ' +
      'and for reading streams chunk by chunk in Node. Redux-Saga also used generators for side effects, though most teams now prefer simpler async patterns.'
  },
  {
    id: 'js-web-workers',
    roles: ['frontend'],
    anchors: ['javascript', 'web worker', 'web workers', 'service worker'],
    level: 'senior',
    question: 'What are Web Workers and Service Workers, and how are they different?',
    variants: [
      'How do you run heavy computation without freezing the page?',
      'What is a service worker used for?',
      'How do you make a web app work offline?',
      'Web worker versus service worker?'
    ],
    answer: 'A Web Worker runs JavaScript on a separate thread, so heavy work like parsing a big file, image processing or complex calculations does not block the main thread and the page stays responsive. ' +
      'It has no access to the DOM and talks to the page through postMessage, and transferable objects avoid copying large buffers.\n\n' +
      'A Service Worker is different: it is a proxy between the page and the network, with a lifecycle independent of any tab. ' +
      'It can intercept requests and answer from a cache, which is how a progressive web app works offline and loads instantly on repeat visits, and it handles push notifications and background sync.\n\n' +
      'With service workers the hard part is caching strategy and updates: choosing cache-first for static assets and network-first for data, versioning the cache, ' +
      'and making sure users actually get the new version after a deploy, instead of being stuck on an old one.'
  },
  {
    id: 'js-error-handling-frontend',
    roles: ['frontend'],
    anchors: ['javascript', 'error', 'errors', 'try catch'],
    level: 'mid',
    question: 'How do you handle errors in a front end application?',
    variants: [
      'How do you catch errors globally in the browser?',
      'How do you show API errors to users?',
      'How do you report front end errors to monitoring?',
      'What should happen when a fetch request fails?'
    ],
    answer: 'I handle errors at the right level. Close to the action, a failed request becomes a clear state in the UI: a message the user understands and a retry, without losing what they typed. ' +
      'Note that fetch does not reject on a 404 or 500, so I check response.ok and turn bad statuses into errors myself, ideally in one API client.\n\n' +
      'For rendering errors, an error boundary in React shows a fallback for that part of the page instead of a blank screen.\n\n' +
      'Globally, window error and unhandledrejection listeners, or a tool like Sentry, catch everything that slips through and report it with the release version, the page and the user\'s browser, ' +
      'with source maps uploaded privately so stack traces are readable. User-facing messages never show stack traces or raw server errors, both for clarity and security.'
  }
];
