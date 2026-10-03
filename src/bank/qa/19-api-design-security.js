// API design and application security.
module.exports = [
  {
    id: 'api-rest-design',
    roles: ['backend', 'frontend'],
    anchors: ['rest', 'restful'],
    level: 'mid',
    question: 'What makes a well designed REST API?',
    variants: [
      'How do you design REST endpoints?',
      'What are REST API best practices?',
      'How do you name API routes?',
      'PUT versus PATCH, what is the difference?'
    ],
    answer: 'Resources are nouns in the URL and the HTTP method is the verb: GET to read, POST to create, PUT to replace, PATCH to update part of a resource, and DELETE. ' +
      'So orders, and order by id with its items nested only one level, never verbs like getOrders in the path.\n\n' +
      'Responses are consistent across the whole API: the same casing, the same error shape, proper status codes, ISO dates in UTC, and lists that are always paginated with a limit, ' +
      'with filtering and sorting through query parameters.\n\n' +
      'GET, PUT and DELETE are idempotent, so calling them twice has the same effect, and for POSTs that create things like payments I accept an idempotency key.\n\n' +
      'And it is documented with OpenAPI, generated from the code where possible, so clients and tests share the contract. ' +
      'Good design is mostly about being predictable: a developer who has used two endpoints can guess how the third one works.'
  },
  {
    id: 'api-rest-vs-graphql',
    roles: ['backend', 'frontend'],
    anchors: ['graphql', 'rest', 'grpc'],
    level: 'senior',
    question: 'REST, GraphQL or gRPC, how do you choose?',
    variants: [
      'When would you use GraphQL instead of REST?',
      'What are the downsides of GraphQL?',
      'What is gRPC used for?',
      'How do you choose an API style for a new project?'
    ],
    answer: 'REST is my default for public and general APIs: simple, cacheable with HTTP, easy to debug and understood by everyone.\n\n' +
      'GraphQL shines when there are many different clients with different data needs, like a web app and mobile apps, or screens that combine many resources. ' +
      'Clients ask for exactly what they need in one request, and the typed schema gives great tooling. The costs are server complexity, N+1 queries solved with DataLoaders, ' +
      'harder HTTP caching, and the need to limit query depth and cost so one query cannot overload the server.\n\n' +
      'gRPC is for service-to-service communication inside a system: fast binary protocol, strict contracts from protobuf files, streaming, and generated clients in many languages. ' +
      'It is not great directly in browsers.\n\n' +
      'In practice many systems mix them: gRPC or events between internal services, and REST or GraphQL at the edge for apps.'
  },
  {
    id: 'api-versioning',
    roles: ['backend'],
    anchors: ['versioning', 'api version', 'breaking change'],
    level: 'senior',
    question: 'How do you version an API and handle breaking changes?',
    variants: [
      'How do you change an API without breaking clients?',
      'URL versioning or header versioning?',
      'How do you deprecate an API endpoint?',
      'What counts as a breaking change in an API?'
    ],
    answer: 'The best breaking change is the one I avoid. Most changes can be additive: new optional fields, new endpoints, new enum values that clients are told to tolerate. ' +
      'Removing or renaming a field, changing a type or a meaning, or adding a required parameter is breaking.\n\n' +
      'When a breaking change is truly needed, I version. A version in the URL, like v2, is the most visible and easiest to route and cache; header-based versioning is cleaner but harder to debug. ' +
      'The old version keeps working while clients migrate.\n\n' +
      'Deprecation is a process: announce it with a date, add Deprecation and Sunset headers, log who still calls the old version and contact them, and only remove it when usage is near zero. ' +
      'Mobile apps make this slower, because old versions stay installed for months, so I keep old endpoints longer and can force an update for critical changes.'
  },
  {
    id: 'api-idempotency',
    roles: ['backend'],
    anchors: ['idempotency', 'idempotent', 'idempotency key'],
    level: 'senior',
    question: 'What is idempotency and why does it matter for payments?',
    variants: [
      'How do you prevent a double charge if the client retries?',
      'What is an idempotency key?',
      'How do you make a POST request safe to retry?',
      'How do you handle duplicate webhook deliveries?'
    ],
    answer: 'An operation is idempotent if doing it twice has the same effect as doing it once. That matters because networks fail: the client sends a payment, the response is lost, and the client retries. ' +
      'Without protection, the customer is charged twice.\n\n' +
      'For POST requests that create something important, the client generates an idempotency key, a unique id per attempt, and sends it as a header. ' +
      'The server stores the key with the result in the same transaction as the operation, with a unique constraint. A retry with the same key gets the stored result instead of running again, ' +
      'and a concurrent duplicate is rejected or waits.\n\n' +
      'Webhooks need the same thinking from the receiving side: providers deliver at least once, so I record each event id and ignore ones already processed. ' +
      'Background jobs, too, should be safe to run twice. Idempotency is what makes retries, which every reliable system needs, safe.'
  },
  {
    id: 'api-webhooks',
    roles: ['backend'],
    anchors: ['webhook', 'webhooks'],
    level: 'senior',
    question: 'How do you receive and send webhooks reliably and securely?',
    variants: [
      'How do you verify a webhook signature?',
      'How do you handle a Stripe or Paystack webhook?',
      'How would you design a webhook system for your customers?',
      'What do you do if your webhook handler fails?'
    ],
    answer: 'Receiving: first verify the signature, computed over the raw request body with the shared secret, and compare in constant time, and reject old timestamps to stop replays. ' +
      'Never trust the payload just because it arrived. Then record the event id, return 200 quickly, and process it in a background job, so slow processing does not cause the provider to retry. ' +
      'Processing is idempotent, since events can arrive twice or out of order, so for payments I re-fetch the latest state from the provider\'s API when the order matters.\n\n' +
      'Sending to customers: each event is stored first, delivered by a worker with a signature header, retried with exponential backoff for a day or so on failure, ' +
      'and endpoints that keep failing are disabled with a notification. Customers get a log of deliveries and a way to replay events, plus a secret per endpoint they can rotate.'
  },
  {
    id: 'api-oauth-oidc',
    roles: ['backend', 'frontend'],
    anchors: ['oauth', 'oauth2', 'openid connect', 'oidc', 'sso', 'pkce'],
    level: 'senior',
    question: 'How do OAuth 2 and OpenID Connect work, for example "Sign in with Google"?',
    variants: [
      'What is the authorization code flow with PKCE?',
      'What is the difference between OAuth and OpenID Connect?',
      'How do you implement social login securely?',
      'What is an ID token versus an access token?'
    ],
    answer: 'OAuth 2 is about authorisation: letting an app access an API on a user\'s behalf without getting their password. OpenID Connect adds authentication on top: an ID token that says who the user is.\n\n' +
      'For "Sign in with Google", the app redirects the user to Google with a code challenge and a state value. The user logs in and consents, and Google redirects back with a short-lived code. ' +
      'The app exchanges that code, together with the code verifier, for tokens. That is the authorization code flow with PKCE, and it is the right flow for web, mobile and single-page apps, ' +
      'because an intercepted code is useless without the verifier.\n\n' +
      'The backend validates the ID token\'s signature, issuer, audience and expiry, finds or creates the user by the provider\'s stable subject id, not by email alone, and then creates its own session. ' +
      'The state parameter protects against forged callbacks, and redirect URIs are registered exactly.'
  },
  {
    id: 'security-owasp',
    roles: ['backend', 'frontend'],
    anchors: ['owasp', 'security', 'vulnerability', 'vulnerabilities'],
    level: 'senior',
    question: 'What are the most common web security vulnerabilities, and how do you prevent them?',
    variants: [
      'What is the OWASP Top 10?',
      'How do you write secure backend code?',
      'What security issues do you look for in code review?',
      'How do you protect an application from attacks?'
    ],
    answer: 'The OWASP Top 10 is a good checklist. The one I see most in real code is broken access control: an endpoint that checks the user is logged in but not that the record belongs to them, ' +
      'so changing an id in the URL shows someone else\'s data. I prevent it by scoping every query to the current user or tenant and checking permissions on the server for every action.\n\n' +
      'Injection is prevented with parameterised queries and an ORM, never building SQL from strings. Cross-site scripting with output escaping, sanitising any HTML and a Content Security Policy. ' +
      'Authentication failures with strong password hashing, rate limits and MFA. Security misconfiguration with secure defaults, no debug output in production and least privilege for services.\n\n' +
      'And around the code: dependencies kept updated and scanned, secrets out of the repository, errors that never leak internals, and logging of security events, so attacks are noticed.'
  },
  {
    id: 'security-sql-injection',
    roles: ['backend'],
    anchors: ['sql injection', 'injection'],
    level: 'mid',
    question: 'What is SQL injection and how do you prevent it?',
    variants: [
      'How do parameterised queries prevent SQL injection?',
      'Can an ORM still be vulnerable to injection?',
      'How do you safely build a dynamic ORDER BY?',
      'Give an example of SQL injection.'
    ],
    answer: 'SQL injection happens when user input is concatenated into a SQL string, so the input becomes part of the query. A login form where the username is a quote followed by OR one equals one can turn the WHERE clause into something always true, ' +
      'and worse inputs can read or delete entire tables.\n\n' +
      'The fix is parameterised queries, also called prepared statements: the SQL and the values travel separately, so the database always treats input as data, never as code. ' +
      'ORMs and query builders do this by default.\n\n' +
      'ORMs are still vulnerable where raw SQL is used, like a raw where clause built with string interpolation. ' +
      'Identifiers such as column names for sorting cannot be parameters, so for a dynamic ORDER BY I map the user\'s choice against an allow-list of known columns and directions.\n\n' +
      'On top of that, the app\'s database user has only the permissions it needs, which limits the damage if something slips through.'
  },
  {
    id: 'security-authorization-design',
    roles: ['backend'],
    anchors: ['rbac', 'authorization', 'authorisation', 'permissions'],
    level: 'senior',
    question: 'How do you design roles and permissions in an application?',
    variants: [
      'RBAC or ABAC, how do you model permissions?',
      'How do you check if a user can edit a resource?',
      'Where should authorisation checks live?',
      'How do you implement admin and user roles?'
    ],
    answer: 'I separate who someone is from what they can do. Roles, like admin, manager or member, map to permissions, like order.refund or user.invite, and code checks permissions, never role names directly. ' +
      'That way adding a role or changing what a role can do does not mean editing checks all over the code.\n\n' +
      'Many real rules depend on the resource too: a user can edit their own posts, a manager can approve expenses in their own team. ' +
      'So I combine roles with ownership and attribute checks in one policy layer, like policies in Laravel or a permissions service, that answers "can this user do this action on this resource".\n\n' +
      'Checks happen on the server for every request, close to the data, and queries are scoped so users only ever load what they may see. ' +
      'The front end hides buttons the user cannot use, but that is convenience, not security. Admin actions are logged in an audit trail.'
  },
  {
    id: 'api-gateway-bff',
    roles: ['backend'],
    anchors: ['api gateway', 'bff', 'backend for frontend'],
    level: 'senior',
    question: 'What is an API gateway, and what is the backend for frontend pattern?',
    variants: [
      'Why would you use an API gateway?',
      'What is a BFF?',
      'How do mobile and web clients talk to many microservices?',
      'What responsibilities belong in a gateway?'
    ],
    answer: 'An API gateway is the single entry point in front of backend services. It handles the cross-cutting work so each service does not have to: routing, TLS, authentication of tokens, rate limiting, request logging, and sometimes caching.\n\n' +
      'A backend for frontend is a thin service made for one type of client, like one for the mobile app and one for the web app. ' +
      'It calls the underlying services, combines and shapes the data exactly for that client\'s screens, and hides internal changes. ' +
      'That keeps mobile apps from making many calls over slow networks, and lets each client team evolve its API without negotiating with every other client.\n\n' +
      'The rule I keep is that gateways and BFFs contain no core business logic. Business rules live in the services, so they are not duplicated per client.'
  },
  {
    id: 'security-secrets-dependencies',
    roles: ['backend', 'frontend'],
    anchors: ['dependabot', 'npm audit', 'supply chain', 'dependencies'],
    level: 'senior',
    question: 'How do you manage security in third-party dependencies?',
    variants: [
      'How do you protect against supply chain attacks?',
      'How do you handle vulnerable npm packages?',
      'What is a lock file for?',
      'How do you decide whether to add a dependency?'
    ],
    answer: 'Every dependency is code I did not write running with my app\'s permissions, so I add them deliberately: is it maintained, widely used, small enough, and do I really need it, or is it a few lines I could own.\n\n' +
      'Lock files are committed, so builds install exactly the versions that were tested, and CI installs with the frozen lock file. ' +
      'Automated tools, like Dependabot or Renovate plus npm audit or a scanner, flag known vulnerabilities and open update pull requests, which run through the normal tests before merging.\n\n' +
      'For supply-chain risk, I prefer packages with provenance, avoid install scripts where possible, and review what a new package actually pulls in. ' +
      'In CI, tokens and secrets are scoped tightly, so a compromised build step cannot reach production credentials. ' +
      'And when a serious vulnerability appears, I check whether the vulnerable code path is actually used, then patch quickly either way.'
  },
  {
    id: 'api-documentation-contract',
    roles: ['backend'],
    anchors: ['openapi', 'swagger', 'api documentation'],
    level: 'mid',
    question: 'How do you document an API and keep the documentation accurate?',
    variants: [
      'Do you use OpenAPI or Swagger?',
      'How do front end and back end teams agree on an API contract?',
      'Code first or design first API?',
      'How do you stop API docs going out of date?'
    ],
    answer: 'I use OpenAPI as the contract. The important part is that it is never written separately from the code and forgotten: either it is generated from the code, like route definitions and validation schemas, ' +
      'or for a new API we write it first, agree on it with the front end and mobile developers, and then validate that the implementation matches it in CI.\n\n' +
      'From the spec we get interactive docs, typed clients for the apps, and mock servers, so the front end can start building before the endpoint exists.\n\n' +
      'Good docs explain more than the shapes: authentication, error codes and what they mean, pagination, rate limits, idempotency, and examples of real requests and responses. ' +
      'A changelog of API changes, and contract tests that fail when a response no longer matches the spec, keep it honest over time.'
  }
];
