// Back end in production: concurrency, failure handling, messaging and the
// "walk me through it" diagnosis questions senior loops ask. Sources checked
// 2026-10-04: KORE1's backend developer interview questions and the common
// senior backend lists (distributed systems, caching, consistency).
module.exports = [
  {
    id: 'be-optimistic-pessimistic-locking',
    roles: ['backend'],
    anchors: [],
    level: 'senior',
    question: 'What is the difference between optimistic and pessimistic locking?',
    variants: [
      'Optimistic or pessimistic locking, when do you use each?',
      'How do you stop two users overwriting each other\'s changes?',
      'Explain optimistic concurrency control with a version column.',
      'How do you handle lost updates in a database?'
    ],
    answer: `Both stop two writers from silently overwriting each other, they differ in when they deal with the conflict.

Pessimistic locking takes the lock up front. I read the row with SELECT FOR UPDATE inside a transaction, so anyone else wanting that row waits until I commit. It is safe and simple when conflicts are frequent and the work is short, like decrementing stock on a hot item or moving money between accounts. The cost is waiting and the risk of deadlocks if locks are held too long.

Optimistic locking assumes conflicts are rare. Each row carries a version number. I read it, and my update says set the new values and version plus one where the id matches and the version is still the one I read. If zero rows change, someone else got there first, so I reload and retry or tell the user. It needs no locks, which suits web apps where a user edits a form for minutes.

I default to optimistic for user edits and pessimistic for short, contested critical sections.`
  },
  {
    id: 'be-concurrent-requests-same-resource',
    roles: ['backend'],
    anchors: [],
    level: 'senior',
    question: 'How do you stop two requests from processing the same thing at the same time?',
    variants: [
      'How do you prevent a double charge when a user clicks twice?',
      'How do you handle race conditions across several server instances?',
      'When would you use a distributed lock?',
      'How do you make sure only one worker handles a job?'
    ],
    answer: `I try to let the database enforce it first, because application checks like "if not exists, then insert" race between instances.

A unique constraint is the strongest tool: an idempotency key, an order reference or a one-active-row-per-user index means the second request fails cleanly and I return the first result. For counters and balances, I use a single atomic update with a condition, like reduce the balance where the balance is enough, and check the affected row count. For a row that several requests modify, I lock it inside a transaction.

For work that is not one row, like a scheduled job running on several servers, I use a lease: a lock with an expiry, kept in the database or a shared cache, that the holder must renew. I give it a fencing token or a version so a worker that paused and lost the lease cannot still write. And for job queues, I use a claim step like SELECT FOR UPDATE SKIP LOCKED so only one worker claims a job at a time, and I still make the job idempotent in case it is retried after a crash.`
  },
  {
    id: 'be-pagination',
    roles: ['backend'],
    anchors: [],
    level: 'mid',
    question: 'How would you add pagination to an API, offset or cursor based?',
    variants: [
      'Offset pagination or cursor pagination, which is better?',
      'Talk me through adding pagination to an existing API that does not have it.',
      'Why does offset pagination get slow on large tables?',
      'How do you paginate a feed that keeps getting new items?'
    ],
    answer: `Offset pagination, page and page size turned into LIMIT and OFFSET, is easy to build and lets users jump to page fifty. But the database still reads and throws away every skipped row, so deep pages get slow, and if rows are inserted while someone pages, items shift and they see duplicates or miss some.

Cursor pagination returns an opaque cursor that encodes where the last page ended, usually the sort value plus the id as a tie breaker. The next query asks for rows after that position, which an index serves directly, so every page costs the same and new inserts do not shift anything. The trade-off is no random page jumps.

So I use cursors for feeds, timelines, infinite scroll and anything large, and offsets for small admin tables. Adding it to an existing endpoint, I keep the current response working, add an optional limit with a sensible default and a hard maximum, return the next cursor in the response, and make sure there is an index matching the sort order.`
  },
  {
    id: 'be-safe-idempotent-methods',
    roles: ['backend'],
    anchors: [],
    level: 'mid',
    question: 'What is the difference between safe and idempotent HTTP methods, and why does it matter?',
    variants: [
      'Which HTTP methods are idempotent?',
      'Is PUT idempotent? Is POST?',
      'Explain safe versus idempotent HTTP methods.',
      'Why should GET never change data?'
    ],
    answer: `A safe method does not change anything on the server: GET, HEAD and OPTIONS. An idempotent method can be repeated and the end state is the same as doing it once: all the safe ones, plus PUT and DELETE. Putting the same document twice leaves the same document, deleting twice still leaves it deleted. POST is neither, because two POSTs usually create two things, and PATCH depends on how it is written.

It matters because the network and the tools around it rely on it. Browsers, proxies and crawlers may prefetch or retry GET requests freely, so a GET that changes data will eventually change it by accident. Clients and load balancers retry idempotent requests after a timeout without worrying about duplicates.

For POSTs that must be safe to retry, like payments or order creation, I add an idempotency key: the client sends a unique key, the server stores the result against it, and a retry with the same key gets the original response instead of a second charge.`
  },
  {
    id: 'be-retries-backoff-circuit-breaker',
    roles: ['backend'],
    anchors: [],
    level: 'senior',
    question: 'How do you handle calls to a service that is slow or failing: retries, backoff and circuit breakers?',
    variants: [
      'What is a circuit breaker and why use one?',
      'How do you retry failed requests safely?',
      'What is exponential backoff with jitter?',
      'How do you stop one failing dependency from taking down your service?'
    ],
    answer: `I treat every remote call as something that can be slow, fail or partly succeed.

First, timeouts on everything, shorter than the caller's own deadline, because a call without a timeout ties up a connection or worker forever. Then retries, but only for errors that can succeed on a second try, like timeouts or 503s, only for idempotent operations or ones with an idempotency key, and with exponential backoff plus random jitter so a thousand clients do not retry in lockstep and hammer the service as it recovers. I cap the attempts.

A circuit breaker sits on top: after a run of failures it opens and fails fast for a while instead of calling the dead service, then lets a few test requests through and closes again when they succeed. That protects both sides.

Finally I decide what the user gets when the dependency is down: a cached value, a degraded feature, or a queued action, rather than a page that hangs. And I keep separate connection pools per dependency, so one slow service cannot use up all the capacity.`
  },
  {
    id: 'be-delivery-guarantees',
    roles: ['backend'],
    anchors: [],
    level: 'senior',
    question: 'What do at-most-once, at-least-once and exactly-once delivery mean for messages?',
    variants: [
      'Is exactly-once delivery possible?',
      'How do you handle duplicate messages from a queue?',
      'Explain message delivery guarantees in a queue.',
      'How do you make a message consumer idempotent?',
      'How do you make sure a message from the queue is not processed twice?'
    ],
    answer: `At-most-once means a message is delivered zero or one time: if something fails, it is lost. At-least-once means it is retried until acknowledged, so it is never lost but can arrive more than once. Exactly-once delivery across a network is not really achievable in general, because the sender can never be sure whether a lost acknowledgement means the message was processed or not.

What we build instead is exactly-once processing: at-least-once delivery plus an idempotent consumer. Each message carries a unique id, and the consumer records processed ids, ideally in the same database transaction as the side effect, so a duplicate is recognised and skipped. Or I design the operation itself to be idempotent, like setting a status instead of incrementing a counter.

I also acknowledge a message only after the work is committed, put messages that keep failing into a dead letter queue so they do not block the rest, and remember that ordering is usually only guaranteed within a partition or key.`
  },
  {
    id: 'be-outbox-pattern',
    roles: ['backend'],
    anchors: [],
    level: 'senior',
    question: 'How do you update the database and publish an event without losing one of them?',
    variants: [
      'What is the transactional outbox pattern?',
      'What is the dual write problem?',
      'How do you add an event-driven side effect to an existing synchronous endpoint without breaking it?',
      'How do you reliably send an event after saving an order?'
    ],
    answer: `This is the dual write problem: if I save an order and then publish an event, a crash between the two leaves the order saved with no event, and publishing first can send an event for an order that was rolled back.

The fix I use is the transactional outbox. In the same database transaction that saves the order, I insert a row into an outbox table describing the event. Either both commit or neither does. A separate relay process then reads unpublished outbox rows, publishes them to the queue, and marks them sent. That can deliver an event twice if it crashes after publishing, so consumers are idempotent, using the event id.

It is also how I add a side effect to an existing synchronous endpoint without risking it: the endpoint only writes one extra row in its transaction, its latency and behaviour stay the same, and the slow work, like emails or syncing another system, happens asynchronously from the outbox. The alternative at larger scale is change data capture, which reads the database log directly.`
  },
  {
    id: 'be-saga',
    roles: ['backend'],
    anchors: [],
    level: 'senior',
    question: 'How do you handle a transaction that spans several services?',
    variants: [
      'What is the saga pattern?',
      'Why not use two phase commit across microservices?',
      'How do you roll back a business process across services?',
      'What is a compensating transaction?'
    ],
    answer: `Across services I cannot use one database transaction, and two phase commit couples the services tightly and blocks everything when the coordinator fails, so I use a saga.

A saga splits the business process into local transactions, one per service, each committed on its own. If a later step fails, I run compensating actions for the steps that already happened, like refund the payment and release the reserved stock when shipping cannot be booked. Compensation is a business undo, not a database rollback, so it has to be designed per step.

There are two styles. With choreography, each service reacts to events from the previous one, which is loose but hard to follow as it grows. With orchestration, one coordinator tells each service what to do next and tracks the state, which is easier to reason about and monitor. I lean to orchestration once there are several steps.

Each step must be idempotent and retryable, and the user interface has to accept that the process is eventually consistent, showing states like payment pending.`
  },
  {
    id: 'be-event-sourcing-cqrs',
    roles: ['backend'],
    anchors: [],
    level: 'senior',
    question: 'What are event sourcing and CQRS, and when are they worth it?',
    variants: [
      'Explain CQRS.',
      'What is event sourcing?',
      'When would you separate reads from writes in your architecture?',
      'What are the downsides of event sourcing?'
    ],
    answer: `CQRS, command query responsibility segregation, separates the model that handles writes from the model that serves reads. Writes go through a model that enforces the business rules, and reads come from views shaped exactly for the screens that need them, which can be denormalised, cached or even stored in another database.

Event sourcing stores every change as an immutable event, like money deposited or address changed, instead of only the current state. The current state is rebuilt by replaying events, and read models are projections built from them. You get a perfect audit history and the ability to rebuild or add views later.

They are worth it where the history itself matters, like ledgers, bookings or compliance-heavy domains, or where read and write loads are very different. The costs are real: eventual consistency between writes and read views, versioning old events as the schema changes, and more moving parts. For a typical CRUD application, I would use a normal database with an audit table and only split reads where a specific query needs it.`
  },
  {
    id: 'be-health-checks-graceful-shutdown',
    roles: ['backend'],
    anchors: [],
    level: 'senior',
    question: 'How do you implement health checks and graceful shutdown for a service?',
    variants: [
      'What is the difference between liveness and readiness checks?',
      'How do you deploy without dropping in-flight requests?',
      'What should a health check endpoint actually check?',
      'How does a service shut down cleanly?'
    ],
    answer: `I expose two kinds of checks. Liveness answers "is the process stuck?" and should be cheap, because failing it gets the instance restarted. Readiness answers "should this instance receive traffic right now?" and can check that the app has finished starting, can reach its database, and is not overloaded. I avoid making liveness depend on the database, otherwise one database blip restarts every instance at once.

Graceful shutdown matters for zero-downtime deploys. When the process gets the stop signal, it first marks itself not ready so the load balancer stops sending new requests, waits a moment for that to take effect, finishes the requests in flight within a timeout, stops taking new jobs from queues and finishes or releases the current one, then closes database pools and connections and exits.

Without this, every deploy cuts off a few requests mid-flight, which shows up as random errors that nobody can reproduce. I also make sure jobs are safe to be retried if a shutdown does cut one off.`
  },
  {
    id: 'be-stateless-services',
    roles: ['backend'],
    anchors: [],
    level: 'mid',
    question: 'Why should backend services be stateless, and where does the state go instead?',
    variants: [
      'What does stateless mean for a web server?',
      'How do you scale a service horizontally?',
      'What are sticky sessions and why avoid them?',
      'Horizontal or vertical scaling, which do you prefer?'
    ],
    answer: `A stateless service keeps nothing between requests in its own memory or disk that another instance would need. Any instance can serve any request, so I can add or remove instances freely, deploy by replacing them, and lose one without losing user data. That is what makes horizontal scaling easy.

The state still exists, it just lives in shared places: user data in the database, sessions in a shared session store or in signed tokens, uploaded files in object storage, and caches in a shared cache or treated as disposable per instance. Background work goes through a queue rather than an in-memory list.

Sticky sessions, where the load balancer always sends a user to the same instance, are a workaround for stateful servers. They make load uneven and break when that instance restarts, so I avoid them.

Vertical scaling, a bigger machine, is simpler and often the right first step, but it has a ceiling and a single point of failure. Stateless design keeps both options open.`
  },
  {
    id: 'be-cache-stampede-hit-rate',
    roles: ['backend'],
    anchors: [],
    level: 'senior',
    question: 'Your cache hit rate suddenly drops and the database is overloaded. What do you do?',
    variants: [
      'What is a cache stampede or thundering herd?',
      'Cache hit rate dropped from 92 percent to 40 percent and nobody changed cache code. What is your first hour?',
      'How do you protect the database when many cache keys expire at once?',
      'What happens when a popular cache key expires?'
    ],
    answer: `First I protect the system, then I find the cause. If the database is struggling, I would shed load: rate limit the expensive endpoints, serve stale data where acceptable, and scale reads if I can.

Then I look at what changed, because hit rates rarely drop on their own. Common causes are a deploy that changed the cache key format or added a parameter to it, so every key is new; a cache node restarting or being evicted because memory filled up with new or bigger values; many keys set with the same expiry and expiring together; or a traffic change, like a crawler hitting long-tail pages that were never cached. I compare keys and memory metrics before and after the drop.

To prevent stampedes, where many requests miss on the same hot key and all rebuild it at once, I let only one request rebuild while others get the stale value, refresh popular keys slightly before they expire, and add random jitter to expiry times. I also alert on hit rate, not just on database load.`
  },
  {
    id: 'be-intermittent-500s',
    roles: ['backend'],
    anchors: [],
    level: 'senior',
    question: 'A service returns intermittent 500 errors but the logs look clean. Where do you start?',
    variants: [
      'How do you debug errors you cannot see in the logs?',
      'How do you investigate a flaky error in production?',
      'Users report random failures but nothing shows in the logs. What do you do?',
      'How do you track down an error that only happens sometimes?'
    ],
    answer: `Clean application logs with 500s usually means the error is not coming from where I am looking, or it is not being logged.

I start by finding who is actually returning the 500. The load balancer, gateway or proxy may be returning it because an instance timed out, was restarting, or failed a health check, and the app never saw the request. So I check the load balancer logs and metrics for the same time window and see whether the errors cluster on one instance, one endpoint or one region.

Then I look for patterns: do they line up with deploys, with traffic peaks, with scheduled jobs, or with a dependency's latency? Connection pool exhaustion, a slow database query under load, memory pressure causing restarts and timeouts to a third party are common culprits.

If I still cannot see it, I improve observability: a request id that flows through every layer, logging of unhandled errors at the framework level, and tracing on the failing path, so the next occurrence is fully visible.`
  },
  {
    id: 'be-endpoint-timeout-under-load',
    roles: ['backend'],
    anchors: [],
    level: 'senior',
    question: 'A read endpoint is timing out under load. How do you diagnose and fix it?',
    variants: [
      'An API is slow only when traffic is high. What do you check?',
      'How do you find the bottleneck in a slow endpoint?',
      'Walk me through fixing an endpoint that falls over at peak traffic.',
      'Why would an endpoint be fast in testing but time out in production?'
    ],
    answer: `I want to know where the time goes before changing anything, so I trace a slow request and break it into database time, calls to other services and time spent in the app itself.

If it is fast in testing but slow under load, it is usually a shared resource running out. The connection pool is the classic one: requests queue waiting for a database connection, so each request looks slow even though each query is fast. Others are a query that becomes slow at production data size or with lock contention, a downstream service with its own limits, or CPU-heavy work like serialising huge responses blocking the event loop.

Fixes follow the cause: an index or a rewritten query, fixing N plus one queries, caching the response or its expensive parts, returning less data with pagination, moving heavy work off the request path, or sizing pools to what the database can actually handle. Then I load test the endpoint at realistic concurrency to confirm the fix, and add an alert on its latency percentiles so it does not creep back.`
  },
  {
    id: 'be-testing-third-party-apis',
    roles: ['backend'],
    anchors: [],
    level: 'senior',
    question: 'How do you test code that depends on a third-party API?',
    variants: [
      'How do you mock external services in tests?',
      'How do you test a payment provider integration?',
      'What is contract testing?',
      'How do you stop tests from calling real external APIs?'
    ],
    answer: `I put the third-party API behind a small interface of my own, an adapter that speaks in my domain's terms. The rest of the code depends on that interface, which makes it easy to test.

Unit tests use a fake or stub of the adapter, so business logic can be tested for success, failure, timeouts and odd responses without any network. The adapter itself gets tests against recorded or hand-written responses at the HTTP level, including error codes, rate limits and malformed payloads, because that translation is where integration bugs hide.

Then I run a smaller set of integration tests against the provider's sandbox, in a separate job, since sandboxes are slow and sometimes flaky. For webhooks I test signature verification and replaying the same event twice.

Where both sides are owned by different teams, contract tests check that the provider still returns what the consumer expects. In production, I still monitor the integration, because a provider can change behaviour without warning.`
  },
  {
    id: 'be-database-deadlocks',
    roles: ['backend'],
    anchors: [],
    level: 'senior',
    question: 'What causes database deadlocks and how do you prevent them?',
    variants: [
      'How do you deal with deadlocks in Postgres or MySQL?',
      'What is a deadlock?',
      'Your logs show deadlock errors under load. What do you do?',
      'How do you avoid lock contention in a busy database?'
    ],
    answer: `A deadlock happens when two transactions each hold a lock the other needs, for example one locks row A then wants row B, while another locks B then wants A. Neither can continue, so the database detects the cycle and aborts one of them with an error.

The main prevention is consistent lock ordering: if every code path locks rows in the same order, like by id, the cycle cannot form. Beyond that, I keep transactions short and do no slow work, like network calls, while holding locks; I touch as few rows as possible; and I make sure updates use indexes, because in MySQL an update that cannot use an index can lock far more rows than it changes.

Because a deadlock can still happen occasionally, the application should treat the error as retryable and retry the whole transaction with a small backoff. When I see them in logs, the database's deadlock report tells me the two statements involved, which usually points straight at the code paths taking locks in a different order.`
  },
  {
    id: 'be-concurrency-vs-parallelism',
    roles: ['backend'],
    anchors: [],
    level: 'mid',
    question: 'What is the difference between concurrency and parallelism, and between async I/O and threads?',
    variants: [
      'Concurrency versus parallelism, explain the difference.',
      'When would you use threads instead of async code?',
      'Why is async I/O good for web servers?',
      'How do you handle CPU-heavy work in an async server?'
    ],
    answer: `Concurrency is dealing with many tasks at once by interleaving them, and parallelism is actually running several at the same moment on different cores. A single thread can be highly concurrent without any parallelism.

For web servers, most time is spent waiting on the network and the database. Async I/O lets one thread start a request, move on to others while it waits, and come back when the result is ready, so it handles many connections with little memory. Threads can do the same by blocking each thread on its own request, which is simpler to write, but each thread costs memory and switching, so very high connection counts favour async.

The weakness of async is CPU-heavy work: a long computation blocks the event loop and every other request waits. For that I move the work to a worker thread or process, or to a background job queue. So my rule is async for waiting, and separate threads or processes for computing.`
  },
  {
    id: 'be-python-gil-asyncio',
    roles: ['backend'],
    anchors: ['python'],
    level: 'senior',
    question: 'What is the GIL in Python, and how do you get concurrency in a Python service?',
    variants: [
      'How does the global interpreter lock affect Python performance?',
      'Threads, multiprocessing or asyncio in Python, when do you use each?',
      'How do you make a Python service handle many requests?',
      'Why are Python threads not good for CPU-bound work?'
    ],
    answer: `The GIL, the global interpreter lock in standard Python, lets only one thread run Python bytecode at a time. Newer free-threaded builds remove it, but they are still opt-in. So threads do not speed up CPU-bound Python code, but they still help with I/O, because a thread releases the lock while it waits on the network or disk.

So I pick by workload. For lots of waiting, like calling APIs or databases, asyncio gives the most concurrency per process: one event loop, async libraries, and awaiting many calls at once. Threads are fine for I/O too, especially with libraries that are not async. For CPU-heavy work, I use multiple processes, through a process pool or several worker processes behind the server, so each has its own interpreter and lock. Heavy numeric work in libraries written in C often releases the lock anyway.

For long-running services I also keep blocking calls out of the event loop, run a few worker processes per machine, and push slow jobs to a queue so the request path stays fast.`
  },
  {
    id: 'be-service-communication',
    roles: ['backend'],
    anchors: [],
    level: 'senior',
    question: 'How should services communicate with each other, synchronous calls or asynchronous messages?',
    variants: [
      'When should microservices call each other directly and when should they use events?',
      'What are the problems with chains of synchronous service calls?',
      'How do services find each other?',
      'REST between services or a message broker?'
    ],
    answer: `Synchronous request and response calls are right when the caller needs the answer to continue, like checking a price or authorising a payment. They are simple to reason about, but they couple availability: if a chain of five services each has to be up, the whole request is only as reliable as all five together, and latency adds up.

Asynchronous messages fit when the caller does not need an immediate answer, like sending a confirmation, updating search, or notifying other parts of the business that an order was placed. The producer publishes an event and carries on, consumers process it in their own time, and a slow consumer does not slow the user down. The cost is eventual consistency and harder debugging.

So I keep synchronous calls for queries and short command paths, keep the chains shallow, and use events for side effects and integration between domains. Either way I want timeouts and retries on calls, a correlation id across both, and service discovery through the platform rather than hard-coded addresses.`
  },
  {
    id: 'be-solid',
    roles: ['backend'],
    anchors: [],
    level: 'mid',
    question: 'What are the SOLID principles, and how do you apply them in practice?',
    variants: [
      'Explain the SOLID principles.',
      'What is the single responsibility principle?',
      'What does dependency inversion mean in real code?',
      'How do SOLID principles make code easier to change?'
    ],
    answer: `SOLID is five guidelines for keeping object-oriented code easy to change.

Single responsibility: a class or module should have one reason to change, so pricing rules do not live in the same class as email formatting. Open for extension, closed for modification: add new behaviour, like a new payment method, by adding a new implementation rather than editing a growing switch statement. Liskov substitution: a subtype must work anywhere its parent is expected, without surprising callers. Interface segregation: small, focused interfaces, so a class is not forced to implement methods it does not need. Dependency inversion: business logic depends on abstractions, like a repository interface, not on concrete database or HTTP code, which is what makes it testable.

In practice I apply them as a tool, not a rule. The ones I lean on most are single responsibility and dependency inversion, because they directly drive testability and clear boundaries. Applied too early, they create layers of interfaces nobody needs, so I introduce an abstraction when there is a second use or a test that needs it.`
  },
  {
    id: 'be-dependency-injection',
    roles: ['backend'],
    anchors: [],
    level: 'mid',
    question: 'What is dependency injection and why is it useful?',
    variants: [
      'Explain dependency injection.',
      'Why inject dependencies instead of creating them inside a class?',
      'Do you need a framework for dependency injection?',
      'How does dependency injection help testing?'
    ],
    answer: `Dependency injection means a class receives the things it depends on, like a database client, a clock or a payment gateway, from outside, usually through its constructor, instead of creating them itself.

The main benefit is that the class no longer decides which concrete implementation it uses. In tests I can pass a fake repository or a fixed clock and test the logic without a database or real time. In production I can swap an implementation, like a different email provider, in one place. It also makes dependencies visible: a constructor with eight parameters tells me the class is doing too much.

It does not need a framework. Passing dependencies into constructors and wiring them together once at startup is often enough, and it keeps everything explicit. Dependency injection containers in the bigger frameworks help when the object graph gets large, with features like scoped lifetimes, at the cost of some magic. I keep business logic free of the container so it stays plain and portable.`
  }
];
