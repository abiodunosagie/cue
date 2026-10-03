// Node.js back end: runtime, APIs, auth and operations.
module.exports = [
  {
    id: 'node-event-loop-blocking',
    roles: ['backend'],
    anchors: ['node', 'node.js', 'nodejs'],
    level: 'senior',
    question: 'How does Node.js handle many requests on one thread, and what blocks it?',
    variants: [
      'Is Node.js single threaded?',
      'Why is Node good for I/O heavy work?',
      'What blocks the Node.js event loop?',
      'How do you handle CPU heavy work in Node?'
    ],
    answer: 'Node runs JavaScript on one main thread with an event loop, and hands I/O, like database queries, network calls and file reads, to the operating system or a small thread pool. ' +
      'While a request waits for the database, the thread serves other requests. That is why one Node process can handle thousands of concurrent connections for I/O-heavy APIs.\n\n' +
      'The flip side is that anything CPU-heavy and synchronous blocks every request: big JSON parsing, image processing, crypto with sync functions, a complex regex on user input, or a long loop. ' +
      'During that time the server answers nobody.\n\n' +
      'So I keep request handlers I/O-bound, use the async versions of APIs, move heavy work to worker threads or, better, a background job queue processed by separate workers, ' +
      'and scale across CPU cores with several processes behind a load balancer. I also monitor event loop lag, because it is the clearest signal that something is blocking.'
  },
  {
    id: 'node-express-middleware',
    roles: ['backend'],
    anchors: ['node', 'node.js', 'express', 'middleware'],
    level: 'mid',
    question: 'How does middleware work in Express, and how do you structure an Express app?',
    variants: [
      'What is middleware in Express?',
      'How do you handle errors in Express?',
      'How do you structure a Node.js API project?',
      'What does next() do in Express middleware?'
    ],
    answer: 'Middleware are functions that run in order for each request, with the request, the response and next. Each one can read or change the request, end the response, or call next to pass control on. ' +
      'That is how cross-cutting concerns are added: parsing JSON, logging, CORS, authentication, rate limiting and validation.\n\n' +
      'Errors go to an error-handling middleware, the one with four arguments, registered last. In Express 5, a rejected promise in an async handler is passed there automatically; in older versions, I wrap handlers or call next with the error. ' +
      'That central handler logs the details and returns a consistent, safe error response, never a stack trace.\n\n' +
      'For structure I keep layers: routes only map URLs, controllers handle HTTP concerns like reading params and sending status codes, services hold the business logic, ' +
      'and a data layer talks to the database. That keeps the logic testable without HTTP and makes it easy to change frameworks later.'
  },
  {
    id: 'node-nestjs',
    roles: ['backend'],
    anchors: ['nestjs', 'nest.js', 'nest'],
    level: 'mid',
    question: 'What does NestJS give you compared with plain Express?',
    variants: [
      'Why use NestJS?',
      'How does dependency injection work in NestJS?',
      'What are modules, controllers and providers in NestJS?',
      'What are guards and pipes in NestJS?'
    ],
    answer: 'NestJS adds structure on top of Express or Fastify. The app is built from modules, each grouping its controllers, which handle routes, and providers, like services and repositories, ' +
      'which are injected through constructors by Nest\'s dependency injection container. That makes large codebases consistent and easy to test with mocked providers.\n\n' +
      'It also gives clear places for cross-cutting concerns: guards for authentication and authorisation, pipes for validation and transformation, usually with class-validator DTOs, ' +
      'interceptors for logging and response mapping, and exception filters for consistent errors.\n\n' +
      'The trade-off is more concepts and decorators to learn, and some overhead for a tiny service. ' +
      'For a small API, Express or Fastify is enough. For a team building a large, long-lived backend, NestJS conventions save a lot of arguments and make onboarding faster.'
  },
  {
    id: 'node-jwt-vs-sessions',
    roles: ['backend'],
    anchors: ['jwt', 'session', 'sessions'],
    level: 'senior',
    question: 'JWT or server sessions for authentication, how do you choose?',
    variants: [
      'What are the downsides of JWT?',
      'How do you log out a user with JWT?',
      'Stateless versus stateful authentication?',
      'Where would you store sessions on the server?'
    ],
    answer: 'With server sessions, the client holds a random session id in a cookie, and the server looks it up in a store like Redis or the database. ' +
      'It is simple, and revoking access is instant: delete the session.\n\n' +
      'A JWT is a signed token holding the claims, so any service can verify it without a lookup, which suits several services or mobile clients calling different APIs. ' +
      'The downside is revocation: a JWT stays valid until it expires, so logging out or banning a user does not take effect immediately.\n\n' +
      'So when I use JWTs, the access token is short-lived, a few minutes, and a refresh token, stored securely and rotated on every use, gets new ones. ' +
      'Refresh tokens are tracked server-side, so they can be revoked, and reuse of an old one revokes the whole family, which detects theft.\n\n' +
      'For a single web app, sessions in httpOnly cookies are usually simpler and safer. For mobile and multi-service setups, short JWTs with rotating refresh tokens.'
  },
  {
    id: 'node-password-hashing',
    roles: ['backend'],
    anchors: ['bcrypt', 'argon2', 'password'],
    level: 'mid',
    question: 'How do you store user passwords securely?',
    variants: [
      'Why not hash passwords with SHA-256?',
      'What is salting?',
      'bcrypt or argon2?',
      'How do you implement a secure password reset?'
    ],
    answer: 'Passwords are never stored or logged in plain text, and never encrypted, because encryption can be reversed. They are hashed with a slow, salted algorithm designed for passwords: Argon2id, bcrypt or scrypt.\n\n' +
      'Fast hashes like SHA-256 are the wrong tool, because attackers can try billions of guesses per second on a stolen database. ' +
      'Password hashes are deliberately slow and tunable, and the salt, a random value per user stored with the hash, means identical passwords get different hashes and precomputed tables are useless. Libraries handle the salt for me.\n\n' +
      'Around that: rate limit login attempts, check new passwords against known breached lists, support multi-factor authentication, and make password reset use a random, single-use token that expires quickly, ' +
      'stored hashed, with the same response whether the email exists or not, so the endpoint cannot be used to discover accounts.'
  },
  {
    id: 'node-rate-limiting',
    roles: ['backend'],
    anchors: ['rate limit', 'rate limiting', 'throttling'],
    level: 'senior',
    question: 'How would you implement rate limiting for an API?',
    variants: [
      'How do you protect an API from abuse?',
      'Token bucket or sliding window, how do you rate limit?',
      'How do you rate limit across several servers?',
      'How do you stop brute force login attempts?'
    ],
    answer: 'First I decide what to limit by: per user or API key for authenticated calls, per IP for public endpoints, and stricter limits on sensitive ones like login, sign-up, password reset and sending SMS, which cost money.\n\n' +
      'The algorithm is usually a token bucket or a sliding window: a token bucket allows short bursts but caps the average rate, which feels fair to real users.\n\n' +
      'With several servers, the counters must be shared, so I keep them in Redis with atomic operations, or use the gateway or CDN\'s rate limiting so abuse is stopped before it reaches my servers.\n\n' +
      'When a limit is hit, the API returns 429 with a Retry-After header, and clients back off. For login specifically, I combine IP and account limits with gradually increasing delays, ' +
      'and alert on spikes, because that is often a credential-stuffing attack rather than one person.'
  },
  {
    id: 'node-input-validation',
    roles: ['backend'],
    anchors: ['validation', 'zod', 'joi', 'class-validator'],
    level: 'mid',
    question: 'How do you validate input in a Node.js API?',
    variants: [
      'Where should validation happen in an API?',
      'How do you prevent bad data reaching your database?',
      'What do you return when validation fails?',
      'Do you trust validation done on the front end?'
    ],
    answer: 'I never trust the client, even my own front end, because anyone can call the API directly. So every request is validated on the server, at the edge of the system, before any business logic runs.\n\n' +
      'I define a schema per endpoint for the body, query and path params, with Zod or class-validator in NestJS, check types, required fields, lengths, formats and allowed values, ' +
      'and strip unknown fields so nobody can sneak in something like a role or an isAdmin flag.\n\n' +
      'Invalid input gets a 400 with clear, field-level messages the client can show, without echoing internals. ' +
      'Business rules that need data, like "this coupon is still valid", are checked in the service layer. And the database has its own constraints, like not null, unique and foreign keys, ' +
      'as the last line of defence. Using the same schema to generate TypeScript types keeps validation and code in sync.'
  },
  {
    id: 'node-logging-observability',
    roles: ['backend'],
    anchors: ['logging', 'observability', 'opentelemetry', 'tracing'],
    level: 'senior',
    question: 'How do you do logging, monitoring and tracing for a backend service?',
    variants: [
      'What is observability?',
      'What do you log in a production API?',
      'How do you trace a request across services?',
      'How do you know your API is healthy?'
    ],
    answer: 'I think in three signals. Logs are structured JSON, not free text, with a level, a timestamp and a request id on every line, so I can follow one request. ' +
      'I log meaningful events and errors with context, and never passwords, tokens or personal data.\n\n' +
      'Metrics give the health over time: request rate, error rate and latency percentiles per endpoint, plus things like queue depth, database pool usage and event loop lag. ' +
      'Alerts are set on symptoms users feel, like error rate or p95 latency, not on every CPU blip.\n\n' +
      'Tracing, usually with OpenTelemetry, follows a request across services and the database, showing where the time went, which is how I find the slow query or the slow downstream call.\n\n' +
      'Health check endpoints tell the load balancer when an instance is ready, and error tracking with Sentry groups exceptions with their stack traces and the release that introduced them.'
  },
  {
    id: 'node-background-jobs',
    roles: ['backend'],
    anchors: ['queue', 'queues', 'bullmq', 'background job', 'background jobs'],
    level: 'senior',
    question: 'How do you handle background jobs and queues in a backend?',
    variants: [
      'When should work move to a background job?',
      'Have you used BullMQ, SQS or RabbitMQ?',
      'How do you make background jobs reliable?',
      'How do you send emails without slowing the API?'
    ],
    answer: 'Anything slow, unreliable or not needed for the response goes to a queue: sending emails and push notifications, generating reports and PDFs, processing images, calling slow third parties, and webhooks to customers. ' +
      'The API saves the request, puts a job on the queue and responds immediately, and workers process it separately.\n\n' +
      'I have used Redis-based queues like BullMQ and managed ones like SQS. Reliability comes from a few rules: jobs are idempotent, because they can run more than once; ' +
      'failures retry with exponential backoff and a maximum, then go to a dead-letter queue I can inspect and replay; ' +
      'and jobs carry ids, not big payloads, reading fresh data when they run.\n\n' +
      'I monitor queue depth and job age, because a growing queue is an early warning, and I scale workers independently of the API. ' +
      'For jobs that must happen together with a database change, the outbox pattern guarantees the job is created only if the transaction commits.'
  },
  {
    id: 'node-streams',
    roles: ['backend'],
    anchors: ['node', 'node.js', 'streams', 'stream'],
    level: 'senior',
    question: 'What are streams in Node.js and when do you use them?',
    variants: [
      'How do you handle large files in Node.js?',
      'What is backpressure?',
      'How do you export a huge CSV from Node without running out of memory?',
      'What is pipeline in Node streams?'
    ],
    answer: 'Streams process data in chunks instead of loading it all into memory. They are the right tool for large files, uploads and downloads, exporting big datasets as CSV, ' +
      'proxying responses, or reading a large database result row by row.\n\n' +
      'Without streams, reading a 2 gigabyte file means 2 gigabytes in memory and a likely crash. With streams, memory stays flat, and the client starts receiving data immediately.\n\n' +
      'Backpressure is the key concept: if the destination, like a slow client, cannot keep up, the source must pause, or the buffers grow without limit. ' +
      'The stream pipeline function handles that for me, and also cleans up and forwards errors from every stage, which manual piping often gets wrong.\n\n' +
      'So for a CSV export I stream rows from the database through a transform that formats them, into the HTTP response, with pipeline, and the memory used is the same for a hundred rows or ten million.'
  },
  {
    id: 'node-scaling',
    roles: ['backend'],
    anchors: ['node', 'node.js', 'cluster', 'pm2', 'scaling'],
    level: 'senior',
    question: 'How do you scale a Node.js API?',
    variants: [
      'How do you use all CPU cores in Node?',
      'How do you scale a backend horizontally?',
      'What makes an API easy to scale?',
      'Vertical versus horizontal scaling?'
    ],
    answer: 'The foundation is making the API stateless: no sessions or uploads kept in process memory or on the local disk. Sessions go to Redis or tokens, files to object storage, and shared state to the database or a cache. ' +
      'Then any instance can serve any request, and scaling is just running more of them behind a load balancer.\n\n' +
      'On one machine, one Node process uses one core, so I run one process per core, with containers or the cluster module. ' +
      'Across machines, an orchestrator or a serverless platform adds instances based on load.\n\n' +
      'Usually the database becomes the bottleneck before Node does, so I also add caching for hot reads, connection pooling, read replicas for heavy reporting, and move slow work to background queues.\n\n' +
      'And I measure under load before and after, because the bottleneck is often not where people guess.'
  },
  {
    id: 'node-error-handling-api',
    roles: ['backend'],
    anchors: ['node', 'node.js', 'express', 'status codes'],
    level: 'mid',
    question: 'How do you design error handling and status codes for an API?',
    variants: [
      'Which HTTP status codes do you use?',
      'What should an API error response look like?',
      'What is the difference between 401 and 403?',
      'How do you avoid leaking internal errors to clients?'
    ],
    answer: 'I use status codes for the category and a consistent JSON body for the details: a stable error code the client can switch on, a human-readable message, and field errors for validation, plus a request id for support.\n\n' +
      'The common codes: 400 for invalid input, 401 when the user is not authenticated, 403 when they are authenticated but not allowed, 404 for not found, ' +
      '409 for conflicts like a duplicate or a version clash, 422 when a team prefers it for validation, 429 for rate limits, and 500 for unexpected server errors. ' +
      'I never return 200 with an error inside.\n\n' +
      'Expected errors are thrown as typed application errors, and one central handler maps them to responses. ' +
      'Unexpected errors are logged with the full stack trace and context, but the client only gets a generic message and the request id, so internals, queries and stack traces never leak.'
  },
  {
    id: 'node-environment-config',
    roles: ['backend'],
    anchors: ['env', 'environment variables', 'secrets', 'dotenv'],
    level: 'mid',
    question: 'How do you manage configuration and secrets in a backend?',
    variants: [
      'Where do you store API keys and database passwords?',
      'How do you handle environment variables safely?',
      'What happens if a secret is committed to git?',
      'How do you rotate secrets?'
    ],
    answer: 'Configuration comes from the environment, following twelve-factor: the same build runs in development, staging and production with different settings. ' +
      'At start up, I validate all required variables with a schema and fail fast with a clear message if one is missing, rather than crashing later in a random request.\n\n' +
      'Secrets never go in the repository. Locally they live in an uncommitted env file or a password manager; in production in the platform\'s secret store or a vault, with access limited to the services that need them.\n\n' +
      'If a secret is ever committed, deleting the commit is not enough, because it is already copied. I rotate it immediately, check logs for misuse, then clean the history. ' +
      'Secret scanning in CI and pre-commit hooks catch most of these mistakes.\n\n' +
      'And each environment has its own credentials with the least privilege needed, so a leak in staging cannot touch production.'
  },
  {
    id: 'node-testing-backend',
    roles: ['backend'],
    anchors: ['node', 'node.js', 'jest', 'vitest', 'supertest', 'testcontainers'],
    level: 'mid',
    question: 'How do you test a backend API?',
    variants: [
      'Unit tests or integration tests for an API?',
      'How do you test code that uses the database?',
      'Do you mock the database in tests?',
      'How do you test an endpoint end to end?'
    ],
    answer: 'I unit test the business logic in the service layer with the dependencies faked, which is fast and covers the rules and edge cases.\n\n' +
      'But for a backend, the most valuable tests are integration tests against a real database, because many bugs live in queries, transactions and constraints that a mock would hide. ' +
      'I run Postgres in Docker, often with Testcontainers, apply the real migrations, and reset data between tests. ' +
      'Then I call the endpoints over HTTP with a tool like Supertest, checking status codes, response bodies and what was written to the database, including the error and permission cases.\n\n' +
      'External services, like payment providers or email, are faked at the HTTP boundary, so the tests are reliable and free. ' +
      'Contract tests or a shared schema keep the API and its clients in agreement, and everything runs in CI on every pull request.'
  },
  {
    id: 'node-websockets-realtime',
    roles: ['backend'],
    anchors: ['websocket', 'websockets', 'socket.io', 'sse', 'server sent events'],
    level: 'senior',
    question: 'How would you build real time features on the backend?',
    variants: [
      'WebSockets, server sent events or polling?',
      'How do you scale websocket connections across servers?',
      'How do you build a chat backend?',
      'What is Socket.IO?'
    ],
    answer: 'I pick the simplest option that fits. Polling is fine for updates every few seconds. Server-sent events are great for one-way streams from server to client, like notifications or progress, over plain HTTP. ' +
      'WebSockets are for two-way, low-latency traffic like chat, collaboration or live tracking.\n\n' +
      'The hard part is scale. Each connection stays open on one server, so when a message is produced on server A for a user connected to server B, the servers need a shared channel, like Redis pub/sub or a message broker, to fan it out. ' +
      'The load balancer must support long-lived connections.\n\n' +
      'I also design for disconnects: clients reconnect with backoff, messages have ids and are stored first, so a client can fetch what it missed after reconnecting, ' +
      'and authentication happens when the socket opens, with authorisation checked for every channel a user joins. Managed services like Ably or Pusher are often worth it to avoid running this infrastructure.'
  },
  {
    id: 'node-file-uploads-backend',
    roles: ['backend'],
    anchors: ['s3', 'presigned', 'upload', 'uploads', 'object storage'],
    level: 'mid',
    question: 'How do you handle file uploads on the backend?',
    variants: [
      'How do you upload files to S3 from an app?',
      'What are presigned URLs?',
      'How do you validate uploaded files?',
      'Should files go through your API server?'
    ],
    answer: 'I avoid sending large files through the API servers. The client asks the API for a presigned upload URL, the API checks the user may upload, decides the storage key, size limit and content type, ' +
      'and the client uploads directly to object storage like S3. The bucket stays private.\n\n' +
      'After the upload, the API is notified, by the client or by a storage event, and records the file in the database. ' +
      'Processing, like resizing images, generating thumbnails or virus scanning, happens in a background job.\n\n' +
      'Validation never trusts the file name or the content type the client claims: I check size limits, the real file type from its content, and for images, re-encode them, which also strips harmful metadata. ' +
      'Files are served through signed, expiring URLs or a CDN, and each user can only access their own files, checked on the server.'
  }
];
