// Laravel and PHP back ends.
module.exports = [
  {
    id: 'laravel-service-container',
    roles: ['backend'],
    anchors: ['laravel', 'php', 'service container', 'service provider'],
    level: 'senior',
    question: 'How do the service container and service providers work in Laravel?',
    variants: [
      'What is dependency injection in Laravel?',
      'What is a service provider in Laravel?',
      'How do you bind an interface to an implementation in Laravel?',
      'What are facades in Laravel?'
    ],
    answer: 'The service container is Laravel\'s dependency injection system. When a controller, job or class asks for a dependency in its constructor, the container builds it, ' +
      'resolving that class\'s own dependencies too, automatically through reflection for concrete classes.\n\n' +
      'Service providers are where I register bindings and bootstrap things. For example, binding a PaymentGateway interface to a Paystack or Stripe implementation, ' +
      'so the rest of the code depends on the interface and I can swap the implementation per environment or fake it in tests. Singletons are registered there too.\n\n' +
      'Facades are a static-looking interface to services in the container, like Cache or Mail. They are convenient and still testable, because Laravel can swap the underlying object with a fake. ' +
      'In my own domain code I prefer constructor injection, because the dependencies are visible in the signature.'
  },
  {
    id: 'laravel-eloquent-relationships',
    roles: ['backend'],
    anchors: ['laravel', 'eloquent', 'php'],
    level: 'mid',
    question: 'How do you work with Eloquent relationships efficiently?',
    variants: [
      'What is eager loading in Laravel?',
      'How do you avoid N+1 queries in Eloquent?',
      'What is the difference between with and load in Eloquent?',
      'How do you define relationships in Eloquent?'
    ],
    answer: 'Relationships are defined as methods on the model, like hasMany, belongsTo and belongsToMany, which makes code readable: an order\'s customer is just a property.\n\n' +
      'The trap is lazy loading in loops. Looping over fifty orders and reading each customer runs fifty extra queries. So I eager load with with when building the query, or load on a collection I already have, ' +
      'and withCount or withSum when I only need aggregates instead of whole related models.\n\n' +
      'I turn on Model::preventLazyLoading in development, which throws when lazy loading happens, so N+1 problems are caught before production. ' +
      'For large data I select only needed columns, chunk or use lazy collections for batch processing, and for complex reports I am happy to drop to the query builder or raw SQL, ' +
      'because Eloquent is a convenience, not a requirement.'
  },
  {
    id: 'laravel-queues-jobs',
    roles: ['backend'],
    anchors: ['laravel', 'horizon', 'php'],
    level: 'mid',
    question: 'How do you use queues and jobs in Laravel?',
    variants: [
      'How do you send emails in the background with Laravel?',
      'What is Laravel Horizon?',
      'How do you handle failed jobs in Laravel?',
      'How do you make Laravel jobs idempotent?'
    ],
    answer: 'Slow or unreliable work, like sending email, notifications, generating PDFs or calling external APIs, goes into a job class that implements ShouldQueue. ' +
      'The request dispatches it and responds immediately, and queue workers process it, usually with Redis as the driver and Horizon to monitor throughput, failures and wait times.\n\n' +
      'Each job sets its number of tries, backoff and timeout. Failed jobs land in the failed jobs table, where I can inspect and retry them, and a failed method lets the job clean up or alert.\n\n' +
      'Because a job can run more than once, I make them idempotent, for example by checking whether the email was already sent or using a unique job. ' +
      'Jobs receive model ids or serialised models that are re-fetched when they run, so they work with fresh data, and dispatching after the database commit ensures a job never runs before its data exists.'
  },
  {
    id: 'laravel-auth-sanctum',
    roles: ['backend'],
    anchors: ['laravel', 'sanctum', 'passport', 'php'],
    level: 'mid',
    question: 'How do you handle API authentication in Laravel, Sanctum or Passport?',
    variants: [
      'What is Laravel Sanctum?',
      'How do you authenticate a mobile app against a Laravel API?',
      'When would you use Passport instead of Sanctum?',
      'How do you protect API routes in Laravel?'
    ],
    answer: 'For most apps I use Sanctum. It does two things: for a single-page app on the same top-level domain, it uses Laravel\'s normal cookie session with CSRF protection, which is the most secure option for a browser. ' +
      'For mobile apps and third parties, it issues personal access tokens, stored hashed in the database, which can have abilities and be revoked per device.\n\n' +
      'Passport is a full OAuth2 server. I would use it only when I need OAuth flows, like letting other companies\' applications access user data with consent.\n\n' +
      'Routes are protected with the auth middleware, and authorisation goes through policies and gates, so "can this user update this order" lives in one place and controllers call authorize. ' +
      'Login endpoints are rate limited, and tokens are revoked on logout and password change.'
  },
  {
    id: 'laravel-request-lifecycle-middleware',
    roles: ['backend'],
    anchors: ['laravel', 'php', 'form request'],
    level: 'mid',
    question: 'What is the Laravel request lifecycle, and how do you use middleware and form requests?',
    variants: [
      'How does a request flow through Laravel?',
      'What are form requests in Laravel?',
      'How do you validate input in Laravel?',
      'How do you write custom middleware in Laravel?'
    ],
    answer: 'A request enters through public index.php, the application boots its service providers, then the request passes through the global and route middleware, reaches the router, ' +
      'is dispatched to the controller, and the response travels back out through the middleware.\n\n' +
      'Middleware handle cross-cutting concerns before or after the controller: authentication, rate limiting, CORS, setting the locale, or checking that a tenant is active. ' +
      'I write custom ones for things like requiring a verified phone number on certain routes.\n\n' +
      'Validation lives in form request classes rather than controllers. A form request holds the rules, custom messages and the authorize check, ' +
      'and the controller only receives already validated data through validated, so it never touches unchecked input. That keeps controllers thin, with the real work in services or actions.'
  },
  {
    id: 'laravel-architecture',
    roles: ['backend'],
    anchors: ['laravel', 'php'],
    level: 'senior',
    question: 'How do you structure a large Laravel application?',
    variants: [
      'How do you keep Laravel controllers thin?',
      'Do you use services, actions or repositories in Laravel?',
      'How do you organise business logic in Laravel?',
      'What does a clean Laravel codebase look like?'
    ],
    answer: 'I keep the framework at the edges and the business logic in plain classes. Controllers only handle HTTP: take a validated form request, call one action or service, and return a resource.\n\n' +
      'Business operations live in single-purpose action classes, like PlaceOrder or RefundPayment, which are easy to find, reuse from a controller, a job or a console command, and test. ' +
      'API responses go through API resources, so the JSON shape is controlled and does not change when a column is added.\n\n' +
      'Eloquent models stay focused on relationships, casts and scopes, not giant business methods. I do not add a repository over Eloquent by default, ' +
      'only where I need to hide a complex or swappable data source.\n\n' +
      'For a big app, grouping by domain, like Billing or Orders, with events for side effects, keeps features independent. And Pest or PHPUnit feature tests cover the endpoints with a real database.'
  },
  {
    id: 'laravel-performance',
    roles: ['backend'],
    anchors: ['laravel', 'php', 'octane', 'opcache'],
    level: 'senior',
    question: 'How do you make a Laravel application fast?',
    variants: [
      'How do you optimise Laravel performance?',
      'What is Laravel Octane?',
      'How do you cache in Laravel?',
      'What do you run when deploying Laravel to production?'
    ],
    answer: 'First, the database, since that is where most Laravel apps are slow: eager loading to remove N+1 queries, the right indexes, selecting only needed columns and paginating.\n\n' +
      'Then caching. On deploy, config, route, view and event caching are turned on, and OPcache is enabled in PHP. ' +
      'For data, Cache::remember around expensive queries with sensible TTLs and clear invalidation on writes, using Redis.\n\n' +
      'Slow work goes to queues, so requests stay fast. And for high traffic, Octane keeps the application booted in memory between requests with Swoole or FrankenPHP, ' +
      'which removes the bootstrap cost on every request, but it requires care with state that leaks between requests, like static properties and singletons.\n\n' +
      'I measure with Telescope or Debugbar in development, and with APM in production, to find the actual slow endpoints before optimising.'
  },
  {
    id: 'laravel-testing',
    roles: ['backend'],
    anchors: ['laravel', 'pest', 'phpunit', 'php'],
    level: 'mid',
    question: 'How do you test a Laravel application?',
    variants: [
      'Pest or PHPUnit?',
      'How do you write feature tests in Laravel?',
      'How do you fake mail, queues and HTTP calls in Laravel tests?',
      'How do you use factories in Laravel tests?'
    ],
    answer: 'Most of my Laravel tests are feature tests. They call the real routes with the HTTP test helpers, against a test database refreshed between tests, ' +
      'and assert on the status code, the JSON response and what was stored, for example acting as a user, posting an order, and checking the order exists and stock went down.\n\n' +
      'Model factories create realistic data with states, like a paid order or an admin user, which keeps tests short and readable.\n\n' +
      'Laravel\'s fakes make side effects easy to test: Mail::fake, Queue::fake, Notification::fake and Event::fake let me assert something was sent or dispatched without sending it, ' +
      'and Http::fake stubs external APIs, including failures, so I can test how the app handles a payment provider being down.\n\n' +
      'I like Pest for its readable syntax, but the ideas are the same with PHPUnit. Unit tests cover pure logic like price calculations.'
  },
  {
    id: 'laravel-events-observers',
    roles: ['backend'],
    anchors: ['laravel', 'php', 'observer', 'observers'],
    level: 'mid',
    question: 'When do you use events, listeners and observers in Laravel?',
    variants: [
      'What is the difference between events and observers in Laravel?',
      'How do you decouple side effects in Laravel?',
      'Are model observers a good idea?',
      'How do you send a welcome email after registration in Laravel?'
    ],
    answer: 'Events decouple "something happened" from "what should happen because of it". After an order is placed, the action dispatches an OrderPlaced event, and separate listeners send the confirmation email, notify the warehouse and update analytics. ' +
      'Adding a new reaction means adding a listener, not editing the order code, and listeners can be queued so the request stays fast.\n\n' +
      'Model observers hook into Eloquent lifecycle events like created or updated. They are handy for simple, model-level housekeeping, like generating a slug or clearing a cache key.\n\n' +
      'I am careful with observers for business logic, because they fire implicitly and can surprise people, for example during seeding, imports or tests, and they can hide important steps. ' +
      'For business flows I prefer explicit domain events dispatched from the action, after the database transaction commits, so listeners never act on data that was rolled back.'
  },
  {
    id: 'laravel-vs-node',
    roles: ['backend'],
    anchors: ['laravel', 'php', 'node', 'node.js'],
    level: 'mid',
    question: 'Laravel or Node.js for a new backend, how would you decide?',
    variants: [
      'Why would you choose Laravel?',
      'PHP versus Node.js for APIs?',
      'When is Node a better fit than Laravel?',
      'Is PHP still a good choice for backends?'
    ],
    answer: 'Both are solid; I decide on the product and the team.\n\n' +
      'Laravel is excellent for business applications with a lot of CRUD, admin panels, authentication, queues, mail and payments, because it includes all of that with strong conventions. ' +
      'A small team ships very fast, and the ecosystem, like Horizon, Sanctum and Cashier, covers common needs. Modern PHP is fast and typed.\n\n' +
      'Node fits well when the team is already TypeScript end to end and wants to share types and validation with a React or React Native front end, ' +
      'for real-time features with many open connections, and for I/O-heavy services and backends-for-frontends.\n\n' +
      'So for a full-stack TypeScript team building real-time features, I lean to Node. For a business platform with lots of standard back-office features and a team that knows PHP, Laravel. ' +
      'What matters more is clean architecture, tests and good database design, whichever is chosen.'
  }
];
