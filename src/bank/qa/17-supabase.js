// Supabase: Postgres with auth, row level security, edge functions and realtime.
// Only matched when a question names Supabase or its parts (roles 'named'):
// the candidate never volunteers Supabase, so a generic database question
// never gets a Supabase answer.
module.exports = [
  {
    id: 'supabase-rls',
    roles: ['named'],
    anchors: ['supabase'],
    level: 'senior',
    question: 'How does row level security work in Supabase, and how do you write good policies?',
    variants: [
      'What is RLS in Supabase?',
      'How do you secure tables in Supabase?',
      'Why is RLS important when the client talks to the database directly?',
      'How do you test Supabase RLS policies?'
    ],
    answer: 'In Supabase, the client can query Postgres directly through the auto-generated API with the public anon key, so row level security is the real authorisation layer. ' +
      'With RLS enabled on a table, every query is filtered by policies, and with no policy, nothing is allowed, which is the safe default.\n\n' +
      'Policies are SQL conditions per operation. For example, users can select and update only rows where user id equals auth.uid. ' +
      'Insert policies use with check, so a user cannot create a row that belongs to someone else. For roles or team membership, the policy checks a membership table, ' +
      'and I wrap that lookup in a security definer function with a fixed search path, both for performance and to avoid recursive policies.\n\n' +
      'I enable RLS on every table in exposed schemas, index the columns policies filter on, never send the service role key to a client, and test policies by running queries as different users, ' +
      'including trying to read and write someone else\'s data.'
  },
  {
    id: 'supabase-auth',
    roles: ['named'],
    anchors: ['supabase', 'supabase auth', 'gotrue'],
    level: 'mid',
    question: 'How does authentication work in Supabase?',
    variants: [
      'How do you add login with Supabase?',
      'How do you link Supabase auth users to your own tables?',
      'How does Supabase handle sessions and tokens?',
      'What is the difference between the anon key and the service role key?'
    ],
    answer: 'Supabase Auth handles sign-up and sign-in with email and password, magic links, one-time codes, phone and OAuth providers. ' +
      'After login, the client gets a short-lived JWT access token and a refresh token, and the client library refreshes it automatically. ' +
      'Every database request carries the JWT, so Postgres knows the user through auth.uid and RLS policies can use it.\n\n' +
      'User accounts live in the auth schema, which I do not modify directly. App data goes into a public profiles table keyed by the user\'s id, ' +
      'usually created by a trigger when a user signs up, with RLS so users can only edit their own profile.\n\n' +
      'The anon key is public and safe in apps because RLS limits it. The service role key bypasses RLS completely, so it only exists on the server, in edge functions or a backend, never in client code. ' +
      'On the server I always verify the user\'s token, rather than trusting a user id sent in the request.'
  },
  {
    id: 'supabase-edge-functions',
    roles: ['named'],
    anchors: ['supabase', 'edge function', 'edge functions', 'deno'],
    level: 'mid',
    question: 'What are Supabase Edge Functions and when do you use them?',
    variants: [
      'When should logic go into an edge function instead of the client?',
      'How do you handle payment webhooks with Supabase?',
      'How do you keep secrets in Supabase?',
      'Edge functions versus database functions in Supabase?'
    ],
    answer: 'Edge Functions are server-side TypeScript functions running on Deno, close to users. I use them for anything that must not run on the client: calling third-party APIs with secret keys, ' +
      'like payments, SMS or email, handling webhooks, verifying their signatures, and business operations that need several steps the client should not control.\n\n' +
      'Secrets are set as function secrets, never in the client. Inside a function I verify the caller\'s JWT, and only use the service role key for the specific privileged step that needs it, ' +
      'with my own checks, since it bypasses RLS.\n\n' +
      'For logic that is purely about data, like keeping a counter in sync or validating a row, a Postgres function or trigger is often better, because it runs inside the transaction. ' +
      'So my rule is: data rules in the database, integrations and secrets in edge functions, and the client only does what RLS allows.'
  },
  {
    id: 'supabase-realtime-storage',
    roles: ['named'],
    anchors: ['supabase', 'supabase realtime', 'supabase storage'],
    level: 'mid',
    question: 'How do you use Supabase Realtime and Storage safely?',
    variants: [
      'How does Supabase Realtime work?',
      'How do you secure files in Supabase Storage?',
      'How do you build live updates with Supabase?',
      'What are storage policies in Supabase?'
    ],
    answer: 'Realtime lets clients subscribe to database changes, broadcast messages and presence. For database changes, the subscription respects RLS, so users only receive rows they could read anyway, ' +
      'which is why RLS has to be correct first. I subscribe narrowly, filtered by the relevant id, and unsubscribe when the screen closes, because each channel costs resources. ' +
      'For things like typing indicators or cursor positions, broadcast is better than writing to a table.\n\n' +
      'Storage keeps files in buckets with policies on the storage objects table, written like RLS. Private buckets are the default for user files, ' +
      'with a path convention like the user\'s id as the first folder, so a policy can say users can only read and write inside their own folder. ' +
      'Files are shared through short-lived signed URLs, and public buckets are only for genuinely public assets. Size and type limits are set on the bucket, not just checked in the app.'
  },
  {
    id: 'supabase-vs-firebase',
    roles: ['named'],
    anchors: ['supabase', 'firebase'],
    level: 'mid',
    question: 'Why would you choose Supabase over Firebase, or the other way round?',
    variants: [
      'Supabase versus Firebase?',
      'What are the limits of Supabase?',
      'When would you outgrow a backend as a service?',
      'Is Supabase good for production apps?'
    ],
    answer: 'Supabase is built on Postgres, so I get a real relational database: joins, transactions, constraints, SQL, and extensions like PostGIS for location. ' +
      'Authorisation is row level security in SQL, and since it is open source and standard Postgres, I can move the database elsewhere if needed. ' +
      'That suits data with lots of relationships, like orders, payments or bookings.\n\n' +
      'Firebase uses Firestore, a document database that scales very easily and has excellent offline sync and mobile SDKs, with pricing per read and write. ' +
      'It is great for apps built around real-time documents, but relational queries and reporting are harder.\n\n' +
      'Both let a small team ship fast. The things I plan for with either: authorisation rules are the real backend and must be tested, ' +
      'complex business logic belongs in server functions, and costs and limits should be monitored, because a backend as a service can get expensive or restrictive at scale.'
  },
  {
    id: 'supabase-migrations-workflow',
    roles: ['named'],
    anchors: ['supabase', 'supabase cli'],
    level: 'senior',
    question: 'How do you manage schema changes and environments with Supabase?',
    variants: [
      'How do you do migrations in Supabase?',
      'Do you change the schema in the Supabase dashboard?',
      'How do you keep local, staging and production Supabase in sync?',
      'How do you generate TypeScript types from Supabase?'
    ],
    answer: 'I treat the database like code. Every schema change, including tables, RLS policies, functions and triggers, is a SQL migration file in the repository, created with the Supabase CLI and reviewed in a pull request. ' +
      'I do not click changes into the production dashboard, because then nobody knows the real state of the schema.\n\n' +
      'Locally I run Supabase in Docker, apply the migrations and seed data, and test there. Then the pipeline applies the same migrations to staging and production, which are separate projects with separate keys.\n\n' +
      'After schema changes I regenerate the TypeScript types from the database, so the app code knows the exact columns and a removed field becomes a compile error. ' +
      'And I follow the same zero-downtime rules as any Postgres: additive changes first, backfills in batches, and removing old columns only after the app no longer uses them.'
  },
  {
    id: 'postgres-functions-triggers',
    roles: ['backend'],
    anchors: ['postgres', 'postgresql', 'trigger', 'triggers', 'plpgsql', 'rpc'],
    level: 'senior',
    question: 'When do you put logic in Postgres functions and triggers instead of application code?',
    variants: [
      'What are the pros and cons of database triggers?',
      'When would you write a stored procedure?',
      'How do you keep a counter column in sync?',
      'What is a security definer function?'
    ],
    answer: 'I put logic in the database when it must hold no matter which client writes the data, or when it must be atomic with the write. ' +
      'Examples: keeping a denormalised counter or updated-at column in sync, creating a profile row when a user signs up, enforcing an invariant that constraints cannot express, ' +
      'or a multi-step operation, like transferring credit between wallets, done in one function so it runs in a single transaction.\n\n' +
      'The downsides are real: logic hidden in triggers surprises developers, it is harder to test and debug, and heavy triggers slow down every write. ' +
      'So I keep them small, named clearly, documented and covered by migration tests, and keep complex business workflows and external calls in application code.\n\n' +
      'A security definer function runs with its owner\'s privileges instead of the caller\'s, which is useful but dangerous: I set a fixed search path, check the caller inside it, and grant execute only to the roles that need it.'
  },
  {
    id: 'postgres-json-postgis',
    roles: ['backend'],
    anchors: ['postgres', 'postgresql', 'jsonb', 'postgis'],
    level: 'senior',
    question: 'When do you use JSONB columns or PostGIS in Postgres?',
    variants: [
      'Should I store JSON in Postgres?',
      'How do you query nearby locations in Postgres?',
      'What is PostGIS?',
      'JSONB versus separate columns?'
    ],
    answer: 'JSONB is great for data whose shape varies or that I do not query much: settings, metadata from a third party, or flexible attributes on a product. ' +
      'It can be indexed with GIN for containment queries. But if I filter, join or validate on a field regularly, it deserves a real column with a type and constraints, ' +
      'because JSONB loses type safety, makes queries clumsy and hides schema changes.\n\n' +
      'PostGIS adds geographic types and functions to Postgres. For a ride-hailing or delivery app, I store locations as geography points with a spatial GiST index, ' +
      'and query "drivers within 3 kilometres, nearest first" with ST_DWithin and a distance sort, which uses the index and stays fast with many rows. ' +
      'It also handles polygons, like service areas or geofences, so I can check whether a pickup point is inside a city zone directly in SQL.'
  }
];
