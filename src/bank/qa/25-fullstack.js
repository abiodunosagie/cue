// Full stack: questions about shipping a feature across every layer, browser,
// API, data and deployment. Sources checked 2026-10-04: KORE1's full stack
// interview questions and the common senior full stack lists, which test
// integration across layers more than any one framework.
module.exports = [
  {
    id: 'fs-what-happens-url',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'mid',
    question: 'What happens when you type a URL into the browser and press enter?',
    variants: [
      'Walk me through what happens between typing a web address and seeing the page.',
      'Explain the journey of a web request from the browser to the server and back.',
      'What happens behind the scenes when a page loads?',
      'Describe how a browser loads a website.'
    ],
    answer: `The browser first works out where to go. It checks its caches, then resolves the domain name through DNS to an IP address. It opens a TCP connection, or a QUIC one for HTTP 3, and does a TLS handshake so the connection is encrypted and the server's certificate is verified.

Then it sends the HTTP request with headers and cookies. Often it first reaches a CDN or load balancer, which may answer from cache or forward it to an application server. The server routes the request, runs the code, perhaps queries a database or cache, and returns a response with a status code, headers and the HTML.

The browser parses the HTML into the DOM, discovers CSS, scripts, fonts and images and fetches them, builds the CSS rules, runs scripts, and then lays out and paints the page. JavaScript frameworks may then hydrate the page to make it interactive.

For performance, each step is a place to optimise: DNS and connection reuse, CDN caching, server response time, and how much blocking CSS and JavaScript the page needs.`
  },
  {
    id: 'fs-feature-end-to-end',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'senior',
    question: 'How do you build a new feature end to end, from the database to the user interface?',
    variants: [
      'Walk me through shipping a full stack feature.',
      'How do you plan a feature across the frontend, the API and the database?',
      'What steps do you take to deliver a feature across every layer?',
      'Where do you start when building a full stack feature?'
    ],
    answer: `I start from the user and the data, not from a layer. I clarify what the user needs to do, the edge cases and the permissions, then sketch the data model: which tables or fields change, the constraints and indexes, and how a migration rolls out safely on existing data.

Next I define the API contract: the endpoints or mutations, request and response shapes, validation rules and error cases. Agreeing on the contract early lets the frontend and backend move in parallel, and I share the types or a schema so both sides stay in sync.

Then I build the backend with validation, authorisation checks and tests around the business rules, and the frontend with every state covered: loading, empty, error and success, plus accessibility. For risky changes I ship behind a feature flag.

Finally I think about operations: logging and metrics for the new path, how to roll back, and what success looks like after release. Small vertical slices that work end to end beat building each layer completely in isolation.`
  },
  {
    id: 'fs-shared-types-contracts',
    roles: ['frontend', 'backend'],
    anchors: ['typescript'],
    level: 'senior',
    question: 'How do you keep the frontend and backend in sync on API types and contracts?',
    variants: [
      'How do you share types between the client and the server?',
      'Do you use OpenAPI, tRPC or shared schemas?',
      'How do you type a generic API response that handles both success and error states?',
      'How do you keep API types in sync across the stack?'
    ],
    answer: `I want one source of truth for the contract and types generated or inferred from it, so a mismatch fails at build time instead of in production.

In a TypeScript monorepo, I define request and response schemas once with a validation library, use them to validate on the server, and infer the types for the client from the same schemas. For a public or multi-language API, I keep an OpenAPI spec as the contract and generate the client and types from it, with a check in CI that the spec and the implementation agree.

For responses, I type them as a discriminated union: either ok true with the data, or ok false with an error code and message. The client has to check the flag before touching the data, so error handling cannot be forgotten.

For changes, I treat the contract like a public API: additive changes first, never removing or renaming a field the deployed client still reads, and remembering that mobile apps and open browser tabs keep running old code for a while.`
  },
  {
    id: 'fs-validation-layers',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'mid',
    question: 'Should you validate input on the client, the server, or both?',
    variants: [
      'Why validate on the server if the form already validates?',
      'Where should validation logic live in a full stack app?',
      'Is client side validation enough?',
      'How do you avoid duplicating validation rules between frontend and backend?'
    ],
    answer: `Both, for different reasons. Client side validation is for the user: instant feedback, clear messages next to the field, and fewer wasted round trips. Server side validation is for correctness and security, because anyone can bypass the browser and call the API directly with whatever they like.

So the server is the authority. It validates types, required fields, lengths and formats at the edge of every endpoint, and the business rules that need the database, like a unique email or enough stock, can only be checked there. It returns structured errors per field, so the client can show them in the same places as its own validation.

To avoid the rules drifting apart, I define the shape once in a shared schema used by both sides in a TypeScript stack, or generate client rules from the API schema. The database adds a final layer with constraints like not null, unique and foreign keys, which catch bugs that slip past the code.`
  },
  {
    id: 'fs-realtime-collaboration',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'senior',
    question: 'How would you design real-time collaborative editing, like a shared document?',
    variants: [
      'Design a real-time collaborative editing feature and walk through every layer of the stack.',
      'How do you handle two people editing the same document at the same time?',
      'What are CRDTs and operational transformation?',
      'How would you build something like Google Docs collaboration?'
    ],
    answer: `The hard part is merging concurrent edits so everyone ends with the same document without losing anyone's changes.

On the client, edits apply locally first so typing feels instant, then go out as small operations, not whole documents. They travel over a WebSocket to a collaboration service that relays them to everyone in the same document.

For merging there are two families. Operational transformation sends operations through a central server that transforms each one against concurrent operations, which is proven but complex. CRDTs are data structures designed so concurrent changes always merge to the same result in any order, which also enables offline editing. Today I would use a mature CRDT library rather than write either myself.

The server persists the document as snapshots plus recent operations, handles reconnects by sending what a client missed, and shows presence like cursors and who is online. Around it I need permissions checked on connect, rate limits, and a way to scale rooms across instances, usually by routing each document to one server or sharing updates through a pub-sub layer.`
  },
  {
    id: 'fs-media-heavy-platform',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'senior',
    question: 'How would you architect a content platform with images and video that must load almost instantly?',
    variants: [
      'You are building a content platform where posts have images and video and users expect near-instant loads. Walk through your architecture.',
      'How do you serve images and video fast to users worldwide?',
      'How do you optimise media heavy pages?',
      'How would you handle user uploaded images and videos at scale?'
    ],
    answer: `Media should never flow through my application servers. Clients upload directly to object storage using short-lived signed URLs from my API, and the API only stores metadata. Uploads then trigger background processing: images are resized into several widths and modern formats, and videos are transcoded into adaptive streaming with several bitrates and a poster frame.

Everything is served through a CDN close to the user, with long cache lifetimes and file names that change when the content changes, so caches never serve stale media.

On the page, I serve the right size for each screen with responsive images, lazy load anything below the fold, reserve space so the layout does not jump, load a small blurred placeholder first, and only start a video when it is about to play. The page itself is server rendered or static with the post data, so text appears immediately while media streams in.

For the feed, I cache rendered post data, paginate with cursors, and prefetch the next page before the user reaches it.`
  },
  {
    id: 'fs-optimistic-updates',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'mid',
    question: 'What are optimistic updates and how do you handle them when the server call fails?',
    variants: [
      'How do you make a UI feel instant when the API is slow?',
      'Explain optimistic UI updates.',
      'How do you roll back an optimistic update?',
      'When should you not use optimistic updates?'
    ],
    answer: `An optimistic update changes the UI immediately as if the server call already succeeded, like a like button turning on or a message appearing in the list, and then sends the request in the background. The app feels instant even on a slow network.

The important part is failure. Before applying the change, I keep a snapshot of the previous state. If the request fails, I restore the snapshot and tell the user clearly, with a retry option. When the request succeeds, I replace my guess with what the server returned, because the server may have added an id, a timestamp or changed the value. Data fetching libraries handle most of this, including cancelling in-flight refetches that would overwrite the optimistic value.

The server side has to be ready for retries, so the endpoint should be idempotent or accept a client generated id. I avoid optimistic updates when failure is likely or costly to show, like payments or anything the server must validate first, where an honest loading state is better.`
  },
  {
    id: 'fs-error-handling-layers',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'senior',
    question: 'How do you handle errors consistently across the frontend and backend?',
    variants: [
      'What should an API return when something goes wrong?',
      'How do you show backend errors to users in a friendly way?',
      'How do you design error handling across a full stack application?',
      'What should an error look like from the API to the screen?'
    ],
    answer: `I agree on one error format for the whole API: an HTTP status that matches the category, a stable machine-readable code, a safe human message, and field-level details for validation errors, plus a request id. The client branches on the code, never on the message text.

On the backend, expected errors, like not found, forbidden or a business rule failing, are thrown as typed errors and mapped to that format in one central handler. Anything unexpected becomes a generic 500 with the request id, while the full stack trace goes to the logs and the error tracker, never to the client, because internal details leak information.

On the frontend, I have a layer that turns API errors into user-facing states: inline messages for validation, a clear message with retry for network or server problems, a redirect for an expired session, and an error boundary so one broken component does not blank the page. Frontend errors are reported too, tagged with the same request id so I can follow one failure from the browser to the database.`
  },
  {
    id: 'fs-slow-page-diagnosis',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'senior',
    question: 'A page is slow. How do you find out whether the problem is in the frontend or the backend?',
    variants: [
      'How do you debug a slow web page end to end?',
      'Users say the dashboard is slow. Where do you start?',
      'How do you measure web performance across the stack?',
      'How do you tell if slowness comes from the API or the browser?'
    ],
    answer: `I measure before guessing, starting from what the user actually experiences. Real user metrics and the browser's performance and network panels show whether the time is spent waiting for the first byte, downloading assets, running JavaScript, or waiting for API calls after the page loads.

If time to first byte or the API calls are slow, it is the backend: I trace those requests and look at database query times, N plus one patterns, calls to other services and missing caching. If the network is fast but the page is still slow, it is the frontend: large JavaScript bundles, long tasks blocking the main thread, too many re-renders, render-blocking resources, or images that are too big. Waterfalls are another common cause, where calls run one after another when they could run in parallel or be combined into one request.

Then I fix the biggest contributor first and measure again. To stop regressions, I set performance budgets in CI and alert on real user metrics, not just on lab scores.`
  },
  {
    id: 'fs-testing-flow',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'senior',
    question: 'How do you test a flow that spans the frontend and several API calls, like a checkout?',
    variants: [
      'You are adding a feature to a checkout flow with three API calls in sequence. How do you test it?',
      'How do you structure tests for a full stack application?',
      'Unit, integration or end to end tests, how do you balance them?',
      'How do you test a multi-step user flow?'
    ],
    answer: `I test each layer where it is cheapest to be thorough, and keep a thin end to end layer on top.

The business rules, like pricing, discounts and stock checks, get fast unit tests with many cases. Each endpoint gets integration tests against a real test database, covering validation, authorisation, and the failure of each external call. For the sequence of three calls, I test what happens when the second or third fails: whether anything is left half done, whether a retry is safe, and whether the user sees the right state.

On the frontend, component tests check every state of each step, with the API mocked at the network level, so loading, errors and partial failures render correctly.

Then a few end to end tests run the real happy path and the most important failure through a real browser against a deployed environment, with test payment credentials. I keep those few, because they are slow and flaky when overused. In production, monitoring and alerts on checkout success rate are the last safety net.`
  },
  {
    id: 'fs-deployment-environments',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'senior',
    question: 'How do you deploy a full stack application safely, with environments and configuration?',
    variants: [
      'What does your deployment setup look like for a web app and its API?',
      'How do you manage environment variables across development, staging and production?',
      'How do you deploy frontend and backend changes that depend on each other?',
      'What are preview environments and why use them?'
    ],
    answer: `I keep at least three environments: local development, a staging or preview environment that mirrors production, and production. Preview deployments per pull request are very useful, because reviewers and designers can try the real change before merging.

Configuration lives in environment variables managed by the platform, never in the repository, with secrets kept server side only. Frontend builds only receive values that are safe to be public, and I validate the configuration at startup so a missing variable fails the deploy instead of failing a user.

For releases, CI runs tests and builds, then deploys automatically, with database migrations run as a separate, backward compatible step. When the frontend and backend change together, I deploy in an order that never breaks: the backend first, supporting both the old and new contract, then the frontend, then a later cleanup of the old path. Feature flags let me separate deploying from releasing, and I keep rollback quick: the previous build one click away, and migrations that do not need reversing.`
  },
  {
    id: 'fs-monorepo',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'senior',
    question: 'Monorepo or separate repositories for the frontend and backend, which do you prefer?',
    variants: [
      'What are the pros and cons of a monorepo?',
      'How would you organise code for a web app, mobile app and API?',
      'When does a monorepo become a problem?',
      'How do you share code between frontend and backend?'
    ],
    answer: `For one product team building a web app, an API and maybe a mobile app, I prefer a monorepo. Shared code, like types, validation schemas and utilities, lives in packages everyone uses directly, a change across the API and the frontend lands in one pull request, and tooling and CI are consistent.

It needs discipline to stay fast: a workspace tool that understands dependencies, so CI only builds and tests what a change affects, with caching, clear package boundaries so the frontend cannot import server-only code, and ownership rules so teams know what they maintain.

Separate repositories make more sense when parts are owned by different teams with different release cycles, different languages, or strict access needs. The cost is versioning the shared pieces as published packages and coordinating changes across repositories.

So my default is a monorepo while the system is one team's product, and splitting along team boundaries when the organisation grows, rather than the other way around.`
  },
  {
    id: 'fs-offline-sync',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'senior',
    question: 'How would you make a web or mobile app work offline and sync when it reconnects?',
    variants: [
      'How do you build offline-first support?',
      'How do you sync local changes with the server after being offline?',
      'How do you resolve conflicts when two devices change the same data offline?',
      'What do you need on the backend to support offline clients?'
    ],
    answer: `Offline-first means the app reads and writes a local store, and syncing with the server happens in the background. On the web that is IndexedDB with a service worker caching the app shell, on mobile a local database.

Writes go into a local outbox of pending operations, each with a client-generated id so retries are idempotent. When the connection returns, the client sends the outbox in order, then pulls changes since its last sync cursor.

Conflicts need a policy per type of data, decided with the product side. Last write wins, using a server-assigned time or version rather than client clocks, is simple and fine for something like a profile setting. For lists or documents, I merge at the field level or use data types that merge automatically. For anything with money or stock, the server stays the authority and rejects or flags a conflicting change for the user to resolve.

The backend needs endpoints that accept batches, return changes since a cursor, keep tombstones for deleted records so other devices learn about deletions, and treat every client operation as possibly arriving twice.`
  },
  {
    id: 'fs-infinite-scroll',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'mid',
    question: 'How would you build infinite scrolling end to end?',
    variants: [
      'Infinite scroll or pagination, how do you implement it across the stack?',
      'How do you load more items as the user scrolls?',
      'How do you keep a long list fast in the browser?',
      'What API do you need for an infinite feed?'
    ],
    answer: `On the backend, I use cursor pagination: the client asks for a page size and the cursor from the last response, and the API returns the items plus the next cursor. That keeps every page equally fast and avoids duplicates when new items arrive at the top. The query is backed by an index that matches the sort order.

On the frontend, an Intersection Observer watches a sentinel element near the end of the list and triggers the next fetch slightly before the user reaches the bottom, so loading is invisible. I guard against duplicate requests while one is in flight, show a small loading indicator and an error with retry, and stop when there is no next cursor.

For very long lists, I virtualise the rendering so only the visible rows exist in the DOM, otherwise memory use and scrolling degrade as the list gets long. I also preserve the scroll position when the user goes to a detail page and comes back, and keep a link or button fallback for accessibility and for users who want to reach the footer.`
  },
  {
    id: 'fs-feature-flags',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'mid',
    question: 'How do you use feature flags, and what problems do they bring?',
    variants: [
      'What are feature flags and why use them?',
      'How do you release a feature to a small percentage of users?',
      'How do you separate deploying from releasing?',
      'What are the risks of too many feature flags?'
    ],
    answer: `A feature flag is a runtime switch that turns a code path on or off without a deploy. It separates deploying code from releasing it: I can merge unfinished work to the main branch hidden behind a flag, turn a feature on for internal users first, roll it out to a percentage of users, and switch it off instantly if something goes wrong.

I evaluate flags on the server where possible, so the decision is consistent and secret logic is not shipped to the browser, and pass the result to the frontend. Percentage rollouts are keyed on the user id, so a user does not flip between versions.

The problems are flag debt and complexity. Every flag doubles the paths through that code, so tests need to cover both, and old flags left in the code make it confusing and risky. So each flag has an owner and a removal date, and once a feature is fully rolled out the flag and the old path are deleted. Long-lived flags for configuration or entitlements are kept separate from short-lived release flags.`
  },
  {
    id: 'fs-tech-stack-choice',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'senior',
    question: 'How do you choose a tech stack for a new product?',
    variants: [
      'What would you build a new web application with, and why?',
      'How do you decide on frameworks and databases for a project?',
      'What factors matter when picking technology for a startup?',
      'How do you evaluate a new framework before adopting it?'
    ],
    answer: `I choose for the product and the team, not for novelty. The main questions are what the product needs, like real-time features, heavy data processing, SEO or mobile apps; what the team already knows well, because familiarity ships faster and with fewer bugs; how mature the ecosystem is, with libraries, documentation and hiring; and the operating cost and effort at the expected scale.

For a typical new web product, I lean to a boring, proven setup: a typed language across the stack so types can be shared, a mainstream framework with server rendering for the frontend, a relational database because most business data is relational, and a managed platform so the team spends its time on the product rather than on infrastructure.

Before adopting something new, I build a small spike on the riskiest part, check how it handles testing, deployment and debugging, and make sure there is a way out if it does not work. I write the decision and its reasons down, so the team can revisit it when the situation changes.`
  },
  {
    id: 'fs-trace-user-problem',
    roles: ['frontend', 'backend'],
    anchors: [],
    level: 'senior',
    question: 'How do you trace a single user\'s problem from the browser all the way to the database?',
    variants: [
      'How do you do observability across the frontend and backend?',
      'How do you connect a frontend error to the backend logs?',
      'What is distributed tracing and how do you use it in a web app?',
      'A user reports an error. How do you find out exactly what happened?'
    ],
    answer: `The key is one id that follows the request through every layer. The frontend starts a trace or request id for each action and sends it in a header, the API logs it on every line and passes it to queues and other services, and errors returned to the client include it.

On the frontend, an error tracker captures exceptions with the user id, the page, the browser and that trace id, and session replay or breadcrumbs show what the user did before it. On the backend, structured logs with the same id, plus distributed tracing, show every service call and database query in that request with its timing.

So when a user reports a problem, I find their session or the error, take the trace id, and see the full path: which API call failed, what the server logged, which query was slow or which dependency returned an error. I make sure no personal data like passwords or tokens is ever logged, and that sampling keeps all error traces even when normal traffic is sampled.`
  }
];
