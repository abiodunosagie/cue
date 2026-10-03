// Databases: indexes, transactions, modelling and scaling.
module.exports = [
  {
    id: 'db-indexes',
    roles: ['backend'],
    anchors: ['sql', 'postgres', 'postgresql', 'mysql', 'index', 'indexes'],
    level: 'mid',
    question: 'How do database indexes work, and when can they hurt?',
    variants: [
      'What is a database index?',
      'How do you decide which columns to index?',
      'What is a composite index and does column order matter?',
      'Why is my query not using the index?'
    ],
    answer: 'An index is a separate structure, usually a B-tree, that keeps a column\'s values sorted with pointers to the rows. Instead of scanning the whole table, the database can jump to the matching rows, ' +
      'which turns a slow query into a fast one on large tables.\n\n' +
      'I index columns used in WHERE filters, JOIN conditions and ORDER BY, guided by the real slow queries, not guesses. ' +
      'For composite indexes, column order matters: an index on user id then created at serves "this user\'s rows by date", but not a filter on created at alone. ' +
      'A query also skips an index when it wraps the column in a function, uses a leading wildcard, or the filter matches so much of the table that a scan is cheaper.\n\n' +
      'They are not free: every insert and update must maintain each index, and they take disk and memory. So on write-heavy tables I keep only the indexes that earn their place, and I check unused ones periodically.'
  },
  {
    id: 'db-explain-slow-query',
    roles: ['backend'],
    anchors: ['sql', 'postgres', 'postgresql', 'mysql', 'explain'],
    level: 'senior',
    question: 'A query is slow in production. How do you investigate and fix it?',
    variants: [
      'How do you use EXPLAIN ANALYZE?',
      'How do you find slow queries in Postgres?',
      'How do you optimise a SQL query?',
      'What is a sequential scan and is it bad?'
    ],
    answer: 'First I find it with data, not guesses: pg_stat_statements in Postgres, or the slow query log, shows which queries take the most total time, which matters more than the single slowest one.\n\n' +
      'Then I run EXPLAIN ANALYZE on it with realistic parameters. It shows the actual plan: sequential scans on big tables, nested loops over many rows, sorts spilling to disk, ' +
      'and especially where the planner\'s row estimates are far from reality, which usually means outdated statistics.\n\n' +
      'Typical fixes: add or adjust an index to match the filter and sort, rewrite the query so it can use the index, select only the needed columns, paginate with a cursor instead of a big offset, ' +
      'remove an N+1 pattern in the application, or run ANALYZE so the statistics are fresh. For heavy reporting queries, a materialised view or a read replica.\n\n' +
      'Then I measure again with the same parameters, and keep the fix covered by monitoring so a regression is noticed.'
  },
  {
    id: 'db-n-plus-one',
    roles: ['backend'],
    anchors: ['orm', 'n+1', 'eloquent', 'prisma', 'typeorm'],
    level: 'mid',
    question: 'What is the N+1 query problem and how do you fix it?',
    variants: [
      'Explain N plus one queries.',
      'How do ORMs cause performance problems?',
      'What is eager loading?',
      'How do you detect N+1 queries?'
    ],
    answer: 'N+1 is when code loads a list with one query and then runs one more query for each item, for example loading 50 orders and then each order\'s customer separately, which makes 51 queries instead of 2. ' +
      'Each query is fast on its own, so it hides in development and becomes slow in production with real data and network latency.\n\n' +
      'ORMs make it easy to fall into, because accessing a relation looks like reading a property.\n\n' +
      'The fix is to load related data in bulk: eager loading with the ORM, like with or include, a JOIN, or a second query with WHERE id IN the collected ids. ' +
      'In GraphQL, a DataLoader batches those lookups per request.\n\n' +
      'To catch it, I log the number of queries per request in development, use tools that flag lazy loading, like Laravel\'s strict mode, and watch for endpoints whose query count grows with the page size.'
  },
  {
    id: 'db-transactions-isolation',
    roles: ['backend'],
    anchors: ['sql', 'postgres', 'transaction', 'transactions', 'acid', 'isolation'],
    level: 'senior',
    question: 'What are transactions and isolation levels, and how do you prevent race conditions in the database?',
    variants: [
      'What does ACID mean?',
      'Explain the isolation levels in SQL.',
      'How do you stop two users buying the last item at the same time?',
      'What is SELECT FOR UPDATE?',
      'Optimistic versus pessimistic locking?'
    ],
    answer: 'A transaction groups changes so they all succeed or all fail, which is the atomicity in ACID, along with consistency, isolation and durability. ' +
      'Transferring money is the classic case: the debit and the credit must happen together.\n\n' +
      'Isolation levels decide what concurrent transactions see. Postgres defaults to read committed, where each statement sees committed data, but two transactions can still read the same stock and both decrement it. ' +
      'Repeatable read and serializable prevent more anomalies, at the cost of retries when conflicts happen.\n\n' +
      'For the last-item problem I have a few tools. An atomic update with a condition, like decrement stock where stock is above zero, and check that a row was updated. ' +
      'Pessimistic locking with SELECT FOR UPDATE when I must read then decide. Or optimistic locking with a version column, where the update fails if someone else changed the row first, and the app retries. ' +
      'Plus constraints, like a check that stock is never negative, as the final guard.'
  },
  {
    id: 'db-sql-vs-nosql',
    roles: ['backend'],
    anchors: ['sql', 'nosql', 'mongodb', 'postgres', 'dynamodb'],
    level: 'mid',
    question: 'SQL or NoSQL, how do you choose a database?',
    variants: [
      'When would you use MongoDB instead of Postgres?',
      'What are the trade-offs of NoSQL databases?',
      'Relational versus document database?',
      'Which database would you pick for a new product?'
    ],
    answer: 'For most products I start with a relational database like Postgres. Business data is usually relational, with users, orders and payments linked together, and I want transactions, constraints, joins and flexible queries for questions I have not thought of yet. ' +
      'Postgres also handles JSON columns, full-text search and geospatial data well, so it covers a lot.\n\n' +
      'NoSQL fits specific needs. A document store like MongoDB when data is naturally self-contained documents with varied shapes. ' +
      'A key-value store like DynamoDB or Redis for massive scale with simple, known access patterns, like sessions or a high-volume event log. ' +
      'Wide-column or time-series databases for metrics.\n\n' +
      'The trade-off with most NoSQL designs is that you model around your queries up front, and joins, ad-hoc queries and multi-record consistency get harder. ' +
      'So I choose based on the access patterns and consistency needs, and it is fine to use more than one, each for what it is good at.'
  },
  {
    id: 'db-normalization',
    roles: ['backend'],
    anchors: ['sql', 'normalization', 'denormalization', 'schema'],
    level: 'mid',
    question: 'What is normalisation, and when do you denormalise?',
    variants: [
      'Explain database normal forms.',
      'How do you design a database schema?',
      'When is duplicating data acceptable?',
      'What are the downsides of denormalisation?'
    ],
    answer: 'Normalisation means storing each fact once and linking with keys, so there is no duplicated data to get out of sync. In practice, getting to third normal form is enough: ' +
      'every column depends on the row\'s key and nothing else, so a customer\'s address lives in one place, not copied into every order.\n\n' +
      'I start normalised, with proper primary keys, foreign keys and constraints, because it keeps data correct and flexible.\n\n' +
      'I denormalise deliberately when reads are hot and the joins or aggregations are expensive: storing a comment count on a post, or copying the price into an order line, ' +
      'which is actually correct, because the order must keep the price at the time of purchase.\n\n' +
      'The cost is keeping copies in sync, so I update them in the same transaction, with triggers, or accept eventual consistency through events, and I document which copy is the source of truth.'
  },
  {
    id: 'db-migrations-zero-downtime',
    roles: ['backend'],
    anchors: ['migration', 'migrations', 'schema change', 'zero downtime'],
    level: 'senior',
    question: 'How do you change a database schema without downtime?',
    variants: [
      'How do you rename a column safely in production?',
      'What is the expand and contract pattern?',
      'How do you run migrations on a large table?',
      'How do you handle database migrations in deployments?'
    ],
    answer: 'During a deploy, old and new versions of the app run at the same time, so every migration must work with both. I use expand and contract.\n\n' +
      'To rename a column, for example: first add the new column; deploy code that writes to both and reads the new one with a fallback; backfill the old rows in batches; ' +
      'then, once nothing uses the old column, drop it in a later release. Each step is safe on its own and can be rolled back.\n\n' +
      'On large tables I am careful with locks: adding a column with a default is fast in modern Postgres, but adding an index uses CREATE INDEX CONCURRENTLY, ' +
      'new constraints are added as not valid and validated separately, and backfills run in small batches so they do not lock the table or flood replication.\n\n' +
      'Migrations are versioned in the repository, reviewed like code, tested against a copy of production-sized data when risky, and run automatically in the pipeline.'
  },
  {
    id: 'db-connection-pooling',
    roles: ['backend'],
    anchors: ['connection pool', 'pooling', 'pgbouncer', 'postgres', 'serverless'],
    level: 'senior',
    question: 'What is connection pooling and why does it matter, especially with serverless?',
    variants: [
      'Why do I get "too many connections" errors?',
      'What is PgBouncer?',
      'How do you connect serverless functions to Postgres?',
      'How big should a connection pool be?'
    ],
    answer: 'Opening a database connection is expensive, and Postgres can only handle a limited number of them, since each uses real memory on the server. ' +
      'A pool keeps a set of open connections that requests borrow and return, so the app reuses them instead of connecting for every query.\n\n' +
      'The pool size should be small, roughly related to the database\'s CPU cores, not the number of users; a bigger pool usually makes things slower, because the database spends time switching between connections.\n\n' +
      'Serverless makes this harder, because each function instance may open its own connections, and a traffic spike creates hundreds of them. ' +
      'The fix is an external pooler like PgBouncer or Supavisor in transaction mode, or a provider\'s HTTP-based driver, so many function instances share a few real connections. ' +
      'Transaction mode has limits, like no session-level features, so I check the ORM is configured for it.'
  },
  {
    id: 'db-replication-sharding',
    roles: ['backend'],
    anchors: ['replication', 'replica', 'replicas', 'sharding', 'partitioning'],
    level: 'senior',
    question: 'How do you scale a database: replicas, partitioning or sharding?',
    variants: [
      'What is the difference between partitioning and sharding?',
      'When do you add a read replica?',
      'How do you handle replication lag?',
      'How would you scale a database that is getting too big?'
    ],
    answer: 'I go in order of cost. First, make the current database efficient: good indexes, fixed slow queries, caching hot reads, and moving reports and heavy jobs off the primary. ' +
      'A bigger machine is also a perfectly good step; vertical scaling goes a long way.\n\n' +
      'Read replicas come next when reads dominate. Reporting and read-only endpoints use the replica, but replication is asynchronous, so a replica can be a moment behind. ' +
      'Reads that must see the user\'s own just-written data, like right after saving a profile, go to the primary.\n\n' +
      'Partitioning splits one huge table into parts inside the same database, often by date, which makes old data cheap to archive and keeps indexes small.\n\n' +
      'Sharding splits data across several databases by a key, like tenant or region. It scales writes, but cross-shard queries and transactions become hard, so I treat it as a last resort, ' +
      'chosen with a shard key that matches how the data is accessed.'
  },
  {
    id: 'db-caching-redis',
    roles: ['backend'],
    anchors: ['redis', 'cache', 'caching', 'memcached'],
    level: 'senior',
    question: 'How do you use caching with Redis, and how do you keep the cache correct?',
    variants: [
      'What caching strategies do you know?',
      'What is cache aside?',
      'How do you invalidate a cache?',
      'What is a cache stampede?'
    ],
    answer: 'My default is cache-aside: the app checks Redis first, and on a miss reads the database and stores the result with a TTL. It is simple and the cache can be emptied safely at any time.\n\n' +
      'Keeping it correct is the hard part. When data changes, I delete the related keys in the same code path that writes, and the TTL is the safety net if a deletion is missed. ' +
      'For data that changes often or must be exact, like a balance, I usually do not cache at all, or only for seconds.\n\n' +
      'A cache stampede is when a popular key expires and hundreds of requests hit the database at once. ' +
      'I prevent it with a lock so only one request rebuilds the value, serving slightly stale data meanwhile, and by adding a little randomness to TTLs so keys do not expire together.\n\n' +
      'Redis is also useful beyond caching, for rate limiting, sessions, queues and distributed locks, but I size and monitor it as the critical service it becomes.'
  },
  {
    id: 'db-soft-delete-audit',
    roles: ['backend'],
    anchors: ['soft delete', 'audit', 'audit log'],
    level: 'mid',
    question: 'How do you handle deleting data and keeping an audit trail?',
    variants: [
      'Soft delete or hard delete?',
      'How do you implement an audit log?',
      'How do you track who changed a record?',
      'How do you handle a user asking to delete their data?'
    ],
    answer: 'It depends on the data and the law. Soft delete, with a deleted at column, is useful when users may want to restore something, or when records are referenced elsewhere, like an order pointing to a product. ' +
      'The costs are that every query must filter deleted rows, which I enforce in one place like a default scope or a view, and unique constraints need to account for deleted rows.\n\n' +
      'For an audit trail, I record who did what and when in an append-only audit table: the actor, the action, the entity, and the before and after values for important fields. ' +
      'For sensitive domains like finance or health, that table is protected from updates and deletes.\n\n' +
      'When a user asks to delete their account under privacy laws, soft delete is not enough. Personal data must be truly erased or anonymised, including in backups over time and in third-party services, ' +
      'while records we are legally required to keep, like invoices, are kept with the personal parts removed.'
  },
  {
    id: 'db-uuid-vs-serial',
    roles: ['backend'],
    anchors: ['uuid', 'primary key', 'serial', 'ulid'],
    level: 'mid',
    question: 'Should primary keys be auto-increment integers or UUIDs?',
    variants: [
      'UUID versus serial id, which is better?',
      'Why not expose sequential ids in URLs?',
      'What is UUID version 7?',
      'How do you choose a primary key?'
    ],
    answer: 'Auto-increment integers are small, fast and naturally ordered, which keeps indexes compact. But they leak information when exposed, like how many orders a shop has, ' +
      'and they invite people to guess other records by changing the number, which is dangerous if any authorisation check is missing. They also need the database to generate them, which complicates offline clients and merging data.\n\n' +
      'UUIDs can be generated anywhere, including on a mobile device for offline-first records, and reveal nothing. The classic downside is that random UUIDs fragment indexes and slow inserts on big tables.\n\n' +
      'UUID version 7, or ULIDs, fix that by putting a timestamp at the front, so they are roughly ordered like integers but still globally unique. ' +
      'That is my default for new systems. If a table already uses integers, a common middle ground is keeping them internally and exposing a separate public id.'
  },
  {
    id: 'db-full-text-search',
    roles: ['backend'],
    anchors: ['search', 'full text search', 'elasticsearch', 'postgres', 'meilisearch'],
    level: 'senior',
    question: 'How would you add search to an application?',
    variants: [
      'Postgres full text search or Elasticsearch?',
      'How do you implement fuzzy search?',
      'Why is LIKE with a wildcard slow?',
      'How do you build product search?'
    ],
    answer: 'A LIKE query with a leading wildcard cannot use a normal index, so it scans the whole table and gets slow quickly, and it has no idea about relevance, typos or word forms.\n\n' +
      'For many apps, Postgres is enough: full-text search with tsvector and a GIN index handles stemming and ranking, and the trigram extension gives fuzzy matching for typos and partial names. ' +
      'It keeps search in the same database, with no syncing.\n\n' +
      'When search is a core feature, like product search with facets, typo tolerance, synonyms and instant results, I would use a dedicated engine like Elasticsearch, OpenSearch, Meilisearch or Typesense. ' +
      'Then the database stays the source of truth, and changes flow to the index through events or a change-data-capture pipeline, with a full reindex job for recovery.\n\n' +
      'Either way, search results are filtered by what the user is allowed to see, on the server.'
  },
  {
    id: 'db-multi-tenancy',
    roles: ['backend'],
    anchors: ['multi-tenant', 'multi tenancy', 'tenant', 'tenants', 'saas'],
    level: 'senior',
    question: 'How would you design a multi-tenant SaaS database?',
    variants: [
      'Shared database or database per tenant?',
      'How do you make sure one customer never sees another customer\'s data?',
      'How do you isolate tenants in Postgres?',
      'What is row level security used for in SaaS?'
    ],
    answer: 'There are three common models. A shared schema, where every table has a tenant id. A schema per tenant. And a database per tenant. ' +
      'The shared model is cheapest and simplest to run for many small customers; separate databases give the strongest isolation and per-customer backups, which large or regulated customers sometimes require, at much higher operational cost.\n\n' +
      'With a shared schema, the risk is a query forgetting the tenant filter, which is a serious data leak. So I enforce it in layers: the tenant comes from the authenticated session, never from the request body; ' +
      'the data layer adds the filter automatically; and Postgres row level security policies enforce it in the database too, so even a buggy query cannot cross tenants.\n\n' +
      'Indexes start with the tenant id, and I watch for a single large tenant affecting others, which is when moving them to their own database becomes worth it.'
  }
];
