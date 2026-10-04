// System design: the classic design questions, answered as a structured talk.
module.exports = [
  {
    id: 'sd-approach',
    roles: ['all'],
    anchors: [],
    level: 'senior',
    question: 'How do you approach a system design question?',
    variants: [
      'Walk me through how you would design a system.',
      'What steps do you follow in a system design interview?',
      'How do you start designing a new system?',
      'What do you clarify before designing a system?'
    ],
    answer: 'I start by clarifying instead of drawing. What are the core features for this version, who are the users, how many of them, how much data, how fast must it respond, and what matters most: consistency, availability or cost. ' +
      'A design for a thousand users is very different from one for ten million.\n\n' +
      'Then I do quick estimates, like requests per second and storage per year, so the design is sized to reality.\n\n' +
      'Next, a simple high-level design that works: clients, an API, services, the database and the main data model, and I walk through the key flows end to end.\n\n' +
      'Only then do I go deeper on the hard parts: the bottleneck, scaling reads with caching, scaling writes, failure handling, and consistency, explaining the trade-off of each choice and what I would monitor. ' +
      'I keep checking with the interviewer which area they want to explore, because the conversation matters more than a perfect diagram.'
  },
  {
    id: 'sd-url-shortener',
    roles: ['all'],
    anchors: [],
    level: 'senior',
    question: 'How would you design a URL shortener?',
    variants: [
      'Design something like bit.ly.',
      'How would you generate short codes for a link shortener?',
      'How do you scale a URL shortening service?',
      'Design a tiny URL system.'
    ],
    answer: 'The core is two operations: create a short code for a long URL, and redirect from the code. Reads vastly outnumber writes, maybe a hundred to one, so the design is optimised for fast redirects.\n\n' +
      'For codes, I would take a unique number from an id generator, or a range of ids handed to each server, and encode it in base 62. Seven characters give trillions of codes with no collisions to check. ' +
      'Random codes also work, with a unique constraint and a retry on the rare collision, and they are not guessable.\n\n' +
      'Storage is a simple table of code, long URL, owner and expiry, in a database that handles key lookups well. ' +
      'Redirects go through a cache like Redis in front of it, and a CDN can cache popular redirects at the edge. I would use a 302 when we need click analytics, since a permanent 301 is cached by browsers.\n\n' +
      'Click analytics are written asynchronously to a queue, never slowing the redirect. And I would add rate limiting and URL scanning, because shorteners get abused for spam and phishing.'
  },
  {
    id: 'sd-chat-system',
    roles: ['all'],
    anchors: [],
    level: 'senior',
    question: 'How would you design a chat application like WhatsApp?',
    variants: [
      'Design a messaging system.',
      'How do you deliver chat messages in real time at scale?',
      'How do you handle offline users in a chat app?',
      'How would you design group chat?'
    ],
    answer: 'Clients keep a persistent connection, usually a websocket, to a fleet of connection servers. A presence service records which server each online user is connected to.\n\n' +
      'When a user sends a message, it goes to the chat service, which assigns an id and an ordering per conversation, stores it durably first, then looks up the recipients and routes the message to their connection servers through a pub/sub or message broker. ' +
      'The sender gets an acknowledgement, and delivered and read receipts flow back the same way.\n\n' +
      'Offline recipients get a push notification, and when they reconnect, the client asks for everything after the last message id it has, so nothing is lost even if the connection dropped mid-message. ' +
      'Messages carry client-generated ids so retries do not create duplicates.\n\n' +
      'Messages are stored partitioned by conversation, which matches the main read pattern. Group chats fan out to each member, with large groups handled by fanning out on read instead. ' +
      'Media goes to object storage with only a link in the message, and end-to-end encryption, if required, means the server only stores ciphertext.'
  },
  {
    id: 'sd-notification-system',
    roles: ['all'],
    anchors: [],
    level: 'senior',
    question: 'How would you design a notification system for push, email and SMS?',
    variants: [
      'Design a notification service.',
      'How do you send millions of notifications reliably?',
      'How do you let users control which notifications they get?',
      'How do you avoid sending duplicate notifications?'
    ],
    answer: 'Other services publish an event, like order shipped, and a notification service decides what to send. It looks up the user\'s preferences and channels, renders the right template in their language, ' +
      'and puts one job per channel on separate queues for push, email and SMS.\n\n' +
      'Workers for each channel call the provider, like FCM and APNs, an email service and an SMS gateway, with retries and backoff, and a fallback provider for critical messages like one-time codes. ' +
      'Each notification has an idempotency key, so a retried event never sends twice.\n\n' +
      'Users control their preferences per category and channel, and transactional messages, like security alerts, are separated from marketing ones, which must respect opt-outs and quiet hours. ' +
      'Rate limits per user stop us spamming people.\n\n' +
      'Every attempt is logged with its status, invalid push tokens are cleaned up, and dashboards track delivery rates per provider, so a failing provider is noticed quickly.'
  },
  {
    id: 'sd-rate-limiter',
    roles: ['backend'],
    anchors: [],
    level: 'senior',
    question: 'How would you design a distributed rate limiter?',
    variants: [
      'Design a rate limiting service.',
      'How do you rate limit across many API servers?',
      'What algorithms can a rate limiter use?',
      'Where should a rate limiter sit in the architecture?'
    ],
    answer: 'First, where it lives: ideally at the API gateway or as middleware, so requests are rejected before doing expensive work.\n\n' +
      'The algorithm: a fixed window counter is simplest but allows bursts at window edges. A sliding window log is precise but stores every timestamp. ' +
      'A sliding window counter or a token bucket gives a good balance: fair, smooth limits with little memory. Token bucket also allows small bursts, which suits real users.\n\n' +
      'With many servers, counters must be shared, so they live in Redis, updated atomically with a Lua script or atomic increment with expiry, keyed by user, API key or IP plus the route. ' +
      'For very high traffic, each server can keep a local counter and sync periodically, accepting small inaccuracy.\n\n' +
      'Rejected requests get a 429 with headers telling the client its limit and when to retry. And I decide what happens if Redis is down: usually fail open for normal endpoints and fail closed for sensitive ones like login.'
  },
  {
    id: 'sd-ride-matching',
    roles: ['all'],
    anchors: [],
    level: 'senior',
    question: 'How would you design the matching system for a ride hailing app?',
    variants: [
      'Design Uber.',
      'How do you match riders with nearby drivers?',
      'How would you design ride booking and dispatch?',
      'How do you find the nearest available driver?'
    ],
    answer: 'Drivers send their location every few seconds. The latest position goes into an in-memory geospatial index, like Redis geo or an H3 cell index, partitioned by city, with a short expiry so offline drivers drop out. ' +
      'The history is written in batches for trips and analytics, not on the hot path.\n\n' +
      'When a rider requests a trip, the dispatch service finds available drivers within a radius, ranks them by estimated pickup time rather than straight-line distance, and offers the trip to the best one with a short timeout, ' +
      'moving to the next on decline or timeout.\n\n' +
      'The tricky part is concurrency: two requests must never get the same driver. So assigning a driver is an atomic state change, from available to offered, with a lock or a conditional update, ' +
      'and the trip itself is a state machine: requested, accepted, arrived, in progress, completed or cancelled, with each transition validated.\n\n' +
      'Riders and drivers get updates over websockets with push as a fallback, and pricing, payments and notifications are separate services reacting to trip events.'
  },
  {
    id: 'sd-news-feed',
    roles: ['all'],
    anchors: [],
    level: 'senior',
    question: 'How would you design a social media news feed?',
    variants: [
      'Design the Twitter or Instagram feed.',
      'Fan out on write or fan out on read?',
      'How do you build a timeline at scale?',
      'How do you handle celebrities with millions of followers in a feed?'
    ],
    answer: 'The key decision is when to build each user\'s feed.\n\n' +
      'Fan out on write: when someone posts, the post id is pushed into the cached feed of each follower. Reading a feed is then just reading a precomputed list, which is very fast. ' +
      'But a celebrity with ten million followers would cause ten million writes per post.\n\n' +
      'Fan out on read: the feed is assembled when the user opens it, by pulling recent posts from everyone they follow. No write amplification, but slow reads for users following many accounts.\n\n' +
      'So I would use a hybrid: fan out on write for normal accounts, and merge in posts from the few very large accounts at read time. ' +
      'Feeds store only post ids in a cache like Redis, and the post content is fetched in batches and cached separately. ' +
      'Ranking can then reorder the candidates, and pagination uses a cursor so new posts arriving do not cause duplicates.'
  },
  {
    id: 'sd-file-storage',
    roles: ['all'],
    anchors: [],
    level: 'senior',
    question: 'How would you design a file storage service like Google Drive or Dropbox?',
    variants: [
      'Design a cloud file storage system.',
      'How do you sync files across devices?',
      'How do you upload very large files reliably?',
      'How do you store files efficiently and avoid duplicates?'
    ],
    answer: 'I separate file metadata from file content. Metadata, like names, folders, owners, versions and sharing permissions, lives in a relational database. ' +
      'Content lives in object storage, split into chunks of a few megabytes.\n\n' +
      'Clients upload chunks directly to storage with pre-signed URLs, which allows resuming a failed upload and uploading in parallel. ' +
      'Each chunk is identified by its content hash, so identical chunks are stored once, which saves space across versions and users, and only changed chunks need uploading when a file is edited.\n\n' +
      'For sync, every change creates a new version and an event in a per-user change log. Devices keep a cursor and ask for changes since it, with a notification channel telling them when to check. ' +
      'Conflicts, when two devices edit offline, are kept as separate copies rather than silently overwriting.\n\n' +
      'Downloads go through a CDN with signed, expiring URLs, and permission checks always happen on the metadata service.'
  },
  {
    id: 'sd-caching-strategies',
    roles: ['all'],
    anchors: [],
    level: 'senior',
    question: 'What caching layers would you use in a large web system?',
    variants: [
      'Where can you cache in a system design?',
      'Explain write through, write back and cache aside.',
      'How do you decide what to cache?',
      'What are the risks of caching?'
    ],
    answer: 'Caching happens at several layers, each closer to the user: the browser or app cache, a CDN for static assets and cacheable responses, an application cache like Redis for computed results and hot database rows, ' +
      'and the database\'s own buffer cache.\n\n' +
      'For the application cache, the patterns are: cache aside, where the app reads the cache and fills it on a miss, which is my default; write through, where writes go to the cache and database together, keeping the cache fresh; ' +
      'and write back, where writes go to the cache first and are flushed later, which is fast but risks data loss.\n\n' +
      'I cache data that is read often, changes rarely and is expensive to compute, and I decide for each kind how stale it may be.\n\n' +
      'The risks are stale data, invalidation bugs, cache stampedes when a hot key expires, and the database being overwhelmed if the cache goes down cold. ' +
      'So I use TTLs as a safety net, protect hot keys, and make sure the system can survive without the cache, just slower.'
  },
  {
    id: 'sd-message-queues',
    roles: ['backend'],
    anchors: ['kafka', 'rabbitmq', 'sqs', 'message queue', 'event driven'],
    level: 'senior',
    question: 'When do you use message queues or event streaming, and Kafka versus RabbitMQ?',
    variants: [
      'What is event driven architecture?',
      'Kafka or RabbitMQ, how do you choose?',
      'What are the benefits of asynchronous communication between services?',
      'How do you handle message ordering and duplicates?'
    ],
    answer: 'Queues decouple services in time: the producer does not wait for the consumer, so slow work moves out of the request, spikes are absorbed, and one service being down does not take others with it.\n\n' +
      'RabbitMQ or SQS are task queues: each message is processed by one worker and then removed. Great for jobs like sending emails or processing uploads, with retries and dead-letter queues.\n\n' +
      'Kafka is an event log: messages are kept for a period and many independent consumers read them at their own pace, and can replay history. ' +
      'It suits event-driven systems, where an order placed event feeds billing, inventory and analytics separately, and very high throughput.\n\n' +
      'Whatever the tool, delivery is at least once, so consumers are idempotent. Ordering is only guaranteed within a partition or queue, so I partition by the entity, like the order id, when order matters. ' +
      'And to publish an event reliably together with a database change, I use the outbox pattern.'
  },
  {
    id: 'sd-microservices-monolith',
    roles: ['backend'],
    anchors: ['microservices', 'monolith'],
    level: 'senior',
    question: 'Monolith or microservices, how would you decide?',
    variants: [
      'When should you move to microservices?',
      'What are the downsides of microservices?',
      'What is a modular monolith?',
      'How would you split a monolith into services?'
    ],
    answer: 'For a new product or a small team, I start with a modular monolith: one deployable application, but organised into clear modules with their own data and interfaces, like billing, catalogue and orders. ' +
      'It is fast to build, easy to debug, transactions are simple, and there is no network between parts.\n\n' +
      'Microservices pay off when there are real organisational or technical reasons: several teams that need to deploy independently, parts with very different scaling or reliability needs, ' +
      'or a component that should use different technology. The price is high: network failures, distributed data and transactions, eventual consistency, more infrastructure, and much harder debugging, ' +
      'which needs tracing, central logging and solid CI/CD.\n\n' +
      'If splitting becomes necessary, a well-modularised monolith makes it easy: I extract one module at a time, starting with the one with the clearest boundary and the strongest reason, ' +
      'often using the strangler pattern behind a gateway, so it is gradual and reversible.'
  },
  {
    id: 'sd-cap-consistency',
    roles: ['backend'],
    anchors: ['cap theorem', 'eventual consistency', 'consistency'],
    level: 'senior',
    question: 'What is the CAP theorem, and how does it affect your design choices?',
    variants: [
      'What is the CAP theorem?',
      'Explain eventual consistency.',
      'Strong consistency versus availability, how do you choose?',
      'What does CAP mean in practice?',
      'Where can a system accept stale data?'
    ],
    answer: 'CAP says that when the network partitions, a distributed system must choose between consistency, where every read sees the latest write, and availability, where every request gets an answer. ' +
      'Partitions do happen, so in practice it is a choice of behaviour during failures, and the more useful everyday trade-off is between consistency and latency.\n\n' +
      'I decide per piece of data, not per system. Money, stock levels and permissions need strong consistency: a balance must never be wrong, so those go through a single primary with transactions, and I accept a little latency or an error during a failure.\n\n' +
      'Many things can be eventually consistent: like counts, a feed, search results, analytics or a read replica\'s copy. A few seconds of staleness is fine, and it lets them be fast and highly available.\n\n' +
      'The important part is designing the user experience around it, like showing the user their own write immediately even if replicas are behind.'
  },
  {
    id: 'sd-observability-reliability',
    roles: ['backend'],
    anchors: ['sre', 'slo', 'sla', 'reliability'],
    level: 'senior',
    question: 'How do you make a system reliable and know when it is not?',
    variants: [
      'What are SLOs and error budgets?',
      'How do you design for failure?',
      'What happens when a dependency goes down?',
      'What are circuit breakers and retries with backoff?'
    ],
    answer: 'I start by defining what reliable means for users, as service level objectives, like 99.9 percent of checkout requests succeed within 500 milliseconds. ' +
      'The gap to 100 percent is the error budget, which helps balance shipping features against stability.\n\n' +
      'Then I design for failure, because every dependency will fail at some point: timeouts on every network call, retries only for safe operations with exponential backoff and jitter, ' +
      'circuit breakers so a failing dependency is skipped quickly instead of tying up all threads, and graceful degradation, like showing cached recommendations when that service is down.\n\n' +
      'No single points of failure: several instances across zones, health checks, and tested backups with a known restore time.\n\n' +
      'And I can see it: metrics and alerts on the SLOs, tracing for slow requests, and blameless post-incident reviews, which turn every outage into a concrete improvement.'
  },
  {
    id: 'sd-payment-system',
    roles: ['all'],
    anchors: [],
    level: 'senior',
    question: 'How would you design a payment or wallet system?',
    variants: [
      'Design a digital wallet.',
      'How do you make sure money is never lost or duplicated?',
      'How do you design a ledger?',
      'How do you reconcile payments with a provider?'
    ],
    answer: 'The core is a double-entry ledger. Every money movement is recorded as entries that debit one account and credit another, summing to zero, and entries are never updated or deleted, only reversed with new entries. ' +
      'A balance is derived from the entries, or cached and updated in the same transaction, so it can always be rebuilt and audited.\n\n' +
      'Every operation, like a top-up, a transfer or a withdrawal, is idempotent with a unique key, so retries cannot charge twice, and runs in a database transaction with row locks or conditional updates, ' +
      'so two concurrent transfers cannot overdraw a wallet. Amounts are stored as integers in the smallest unit, never as floats.\n\n' +
      'External payments go through states, pending, succeeded, failed, driven by verified provider webhooks, never by the client. ' +
      'A daily reconciliation job compares our records with the provider\'s settlement reports and flags any difference for review.\n\n' +
      'Everything is audited, sensitive data is minimised, and card data is never stored ourselves, the provider handles it.'
  },
  {
    id: 'sd-search-autocomplete',
    roles: ['all'],
    anchors: [],
    level: 'senior',
    question: 'How would you design search autocomplete?',
    variants: [
      'Design a typeahead suggestion system.',
      'How do you return search suggestions as the user types?',
      'How do you make autocomplete fast?',
      'How do you rank autocomplete suggestions?'
    ],
    answer: 'Autocomplete has to answer in tens of milliseconds while the user types, so the design is all about precomputation.\n\n' +
      'Offline, a job aggregates popular search queries, or product names, with their frequency, and builds a prefix structure, like a trie or a prefix-to-top-results map, ' +
      'storing for each prefix its top ten suggestions already ranked. That is rebuilt periodically and loaded into memory or a fast key-value store, so a lookup is a single read.\n\n' +
      'On the client, I debounce input by around 150 milliseconds, cancel stale requests, and cache results for prefixes already typed. ' +
      'The API sits behind a CDN with short caching, since popular prefixes are requested by many users.\n\n' +
      'Ranking mixes popularity, recency and personal signals, and the system filters inappropriate suggestions. ' +
      'For typo tolerance and richer matching, a search engine with edge n-grams is the alternative to a hand-built trie.'
  },
  {
    id: 'sd-scaling-web-app',
    roles: ['all'],
    anchors: [],
    level: 'senior',
    question: 'How would you scale a web application from a thousand users to a million?',
    variants: [
      'Your app suddenly gets ten times more traffic, what do you do?',
      'What are the steps to scale a backend?',
      'Where do bottlenecks usually appear as an app grows?',
      'How do you prepare an application for growth?'
    ],
    answer: 'I scale in steps, driven by measurements, because each step adds cost and complexity.\n\n' +
      'At the start, one application server and one database are fine. The first steps are cheap: put static assets and cacheable pages behind a CDN, add the right indexes, and fix the slowest queries.\n\n' +
      'Next, make the app stateless and run several instances behind a load balancer, with sessions and files moved out of the servers. ' +
      'Add a cache like Redis for hot data, and move slow work, like emails and image processing, to background queues.\n\n' +
      'Then the database becomes the limit: connection pooling, read replicas for heavy reads, a bigger instance, and partitioning large tables. ' +
      'Only much later, if needed, sharding or splitting out services for parts with very different load.\n\n' +
      'Throughout, monitoring tells me where the real bottleneck is, and load tests before big launches show the next one before users do.'
  }
];
