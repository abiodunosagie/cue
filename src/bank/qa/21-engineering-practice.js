// Engineering practice and DevOps: how a senior engineer works, without stories.
// Behavioral questions ("tell me about a time") are not here on purpose: those
// come from the candidate's own stories.
module.exports = [
  {
    id: 'eng-git-workflow',
    roles: ['all'],
    anchors: ['git'],
    level: 'mid',
    question: 'What Git workflow do you prefer for a team?',
    variants: [
      'Trunk based development or Git flow?',
      'How do you manage branches in a team?',
      'Merge or rebase, which do you use?',
      'How do you keep pull requests small?'
    ],
    answer: 'I prefer trunk-based development with short-lived feature branches: branch from main, open a small pull request within a day or two, get it reviewed, and merge after CI passes. ' +
      'Main is always releasable. Unfinished features are merged behind feature flags rather than living for weeks on a branch, which avoids painful merges.\n\n' +
      'Git flow, with long-lived develop and release branches, makes sense for products that ship versioned releases on a schedule, like some mobile or on-premise software, but it slows down a team that deploys continuously.\n\n' +
      'On my own branch I rebase to keep history clean and up to date with main, and I squash or tidy commits before merging so each commit on main is meaningful. ' +
      'I never rewrite shared history. Commit messages explain why a change was made, not just what, because that is what people need when they read the history later.'
  },
  {
    id: 'eng-ci-cd-general',
    roles: ['frontend', 'backend'],
    anchors: ['ci', 'cd', 'ci/cd', 'github actions', 'pipeline'],
    level: 'mid',
    question: 'What does a good CI/CD pipeline look like?',
    variants: [
      'How do you set up continuous integration and deployment?',
      'What runs in your pipeline before code is merged?',
      'How do you deploy to production safely?',
      'What is the difference between continuous delivery and continuous deployment?'
    ],
    answer: 'On every pull request: install with the lock file, lint, type check, run unit and integration tests, build, and run security scans. It should be fast, ideally under ten minutes, with caching, because slow pipelines get bypassed.\n\n' +
      'Each pull request also gets a preview deployment, so reviewers and product people can try the change.\n\n' +
      'On merge, the same build artifact moves through environments: deploy to staging, run smoke and end-to-end tests, then promote to production. ' +
      'Building once and promoting the same artifact means production runs exactly what was tested. Database migrations run as part of the deploy and are backward compatible.\n\n' +
      'Continuous delivery means every change is ready to release with a button; continuous deployment means it goes out automatically. ' +
      'Either way, production deploys are small, frequent and easy to roll back, with monitoring and alerts watching right after each one.'
  },
  {
    id: 'eng-deployment-strategies',
    roles: ['frontend', 'backend'],
    anchors: ['blue green', 'canary', 'rolling deployment', 'feature flags'],
    level: 'senior',
    question: 'What deployment strategies do you know, like blue green or canary?',
    variants: [
      'How do you release changes with minimal risk?',
      'What is a canary release?',
      'What are feature flags used for?',
      'How do you roll back a bad deployment?'
    ],
    answer: 'A rolling deployment replaces instances a few at a time, so there is no downtime, but old and new versions run side by side for a while.\n\n' +
      'Blue green keeps two identical environments: the new version is deployed to the idle one, tested, and traffic is switched over at once. Rolling back is switching back. It costs double the infrastructure during the switch.\n\n' +
      'A canary sends a small percentage of traffic to the new version first, watches error rates and latency, and increases gradually, so a bad release affects few users.\n\n' +
      'Feature flags separate deploying code from releasing a feature: the code ships turned off, and we enable it for internal users, then a percentage, then everyone, and can turn it off instantly without a deploy. ' +
      'They need discipline, though: old flags get removed, or the code fills up with dead branches.\n\n' +
      'Whatever the strategy, database changes must work with both versions, because that is what makes rollback actually possible.'
  },
  {
    id: 'eng-docker-basics',
    roles: ['backend', 'frontend'],
    anchors: ['docker', 'container', 'containers', 'dockerfile'],
    level: 'mid',
    question: 'How do you use Docker, and what makes a good Dockerfile?',
    variants: [
      'What is the difference between a container and a virtual machine?',
      'How do you make Docker images smaller?',
      'What is a multi-stage build?',
      'Why use Docker for local development?'
    ],
    answer: 'A container packages the app with its runtime and dependencies, sharing the host\'s kernel, so it is much lighter than a virtual machine and starts in seconds. ' +
      'The value is that the same image runs on my laptop, in CI and in production, which removes "works on my machine" problems.\n\n' +
      'A good Dockerfile uses a small, pinned base image, a multi-stage build so build tools and source files stay out of the final image, ' +
      'and copies the dependency manifest and installs before copying the code, so the dependency layer is cached between builds. ' +
      'It runs as a non-root user, has a health check, and keeps secrets out of the image entirely, passing them at runtime instead. A dockerignore file keeps junk out of the build context.\n\n' +
      'Locally, Docker Compose starts the database, cache and other services the app needs with one command, so a new developer is running the project in minutes.'
  },
  {
    id: 'eng-kubernetes-cloud',
    roles: ['backend'],
    anchors: ['kubernetes', 'k8s', 'aws', 'gcp', 'azure', 'serverless'],
    level: 'senior',
    question: 'How do you choose where to run a backend: serverless, containers or Kubernetes?',
    variants: [
      'Have you used Kubernetes?',
      'When is serverless a good fit?',
      'What does Kubernetes give you?',
      'How do you deploy a backend on AWS?'
    ],
    answer: 'I pick the simplest option that meets the needs, because operations time is expensive.\n\n' +
      'Serverless functions or a managed platform are great for APIs with variable traffic and small teams: no servers to manage, automatic scaling, and you pay for use. ' +
      'The limits are execution time, cold starts on some platforms, and long-lived connections.\n\n' +
      'Managed containers, like Cloud Run, ECS or a platform service, run any containerised app with autoscaling and little operational work. That is my usual default for a typical backend with workers.\n\n' +
      'Kubernetes gives full control over scheduling, networking, scaling and deployments, and a standard way to run many services. It makes sense for larger organisations with many services and a platform team. ' +
      'For a small team, it often adds more complexity than it removes.\n\n' +
      'Whatever runs the code, I define the infrastructure as code with Terraform or similar, so environments are reproducible and changes are reviewed.'
  },
  {
    id: 'eng-tech-debt',
    roles: ['all'],
    anchors: [],
    level: 'senior',
    question: 'How do you manage technical debt?',
    variants: [
      'How do you balance new features and refactoring?',
      'How do you convince product managers to spend time on tech debt?',
      'When is technical debt acceptable?',
      'How do you decide which tech debt to pay off first?'
    ],
    answer: 'Some debt is a reasonable choice: shipping a simpler solution to learn faster is fine, as long as it is a conscious decision and written down.\n\n' +
      'The debt worth paying is the debt that slows us down or causes incidents. So I keep a visible list, and for each item, note its cost in practical terms: ' +
      'this module causes a bug every sprint, or every change here takes three days instead of one. That language is what makes the case to product people, because it is about delivery speed and reliability, not code beauty.\n\n' +
      'I prefer paying it continuously over big rewrite projects: improve the code we are already touching for a feature, the boy scout rule, and reserve a steady share of each cycle, ' +
      'something like fifteen to twenty percent, for the highest-cost items. Big rewrites are risky; incremental refactoring behind tests, with the old and new paths side by side, is safer and keeps delivering value.'
  },
  {
    id: 'eng-legacy-refactoring',
    roles: ['all'],
    anchors: [],
    level: 'senior',
    question: 'How do you safely refactor or improve a legacy codebase?',
    variants: [
      'How do you work with old code that has no tests?',
      'Would you rewrite a legacy system from scratch?',
      'What is the strangler fig pattern?',
      'How do you approach a messy codebase you just joined?'
    ],
    answer: 'First I understand before changing: run it, read the main flows, talk to the people who know it, and find where the pain actually is. Code that is ugly but stable and rarely touched can usually stay.\n\n' +
      'Before changing a risky area, I add characterisation tests that capture what it does today, even the odd behaviour, so I can refactor and know I have not changed the results.\n\n' +
      'Then I refactor in small, safe steps, each one shippable: extract functions, introduce interfaces at the boundaries, separate business logic from framework code. ' +
      'For bigger replacements, the strangler fig pattern works well: build the new part next to the old one, route a slice of traffic or one feature to it, and grow it until the old part can be removed.\n\n' +
      'I avoid full rewrites unless the platform itself is dead, because a rewrite has to rediscover every hidden business rule the old code encodes, while the product stands still.'
  },
  {
    id: 'eng-debugging-approach',
    roles: ['all'],
    anchors: [],
    level: 'senior',
    question: 'How do you approach debugging a difficult bug?',
    variants: [
      'What is your debugging process?',
      'How do you find the root cause of a bug?',
      'How do you debug an issue you cannot reproduce?',
      'How do you debug a problem that only happens in production?'
    ],
    answer: 'I start by reproducing it reliably, because a bug I can trigger on demand is half solved. I collect the facts first: the exact error, logs and traces around the time, which users, devices or versions, and what changed recently.\n\n' +
      'Then I narrow it down systematically instead of guessing: form a hypothesis, test it, and cut the search space, for example with git bisect to find the commit that introduced it, ' +
      'or by isolating layers to see whether the problem is in the client, the API or the data.\n\n' +
      'For bugs that only appear in production, I add targeted logging or tracing around the suspected path, compare the production data and configuration with mine, and look for timing issues like race conditions.\n\n' +
      'When I find it, I fix the root cause, not the symptom, write a test that fails without the fix, and check whether the same mistake exists elsewhere in the code.'
  },
  {
    id: 'eng-incident-response',
    roles: ['all'],
    anchors: ['incident', 'outage', 'postmortem', 'on call'],
    level: 'senior',
    question: 'Production is down. What do you do?',
    variants: [
      'How do you handle a production incident?',
      'What is a blameless postmortem?',
      'What do you do first when an alert fires?',
      'How do you communicate during an outage?'
    ],
    answer: 'The first goal is to restore service, not to find the perfect fix. I confirm the impact from monitoring: what is broken, for whom and since when, and I say in the team channel that I am on it, so people do not duplicate work.\n\n' +
      'Then I check what changed. Most incidents follow a deploy, a configuration change or a dependency failing, so the fastest fix is often a rollback, turning off a feature flag, or failing over. ' +
      'For bigger incidents, one person coordinates and communicates updates to stakeholders on a regular rhythm, while others investigate.\n\n' +
      'Once it is stable, I verify with the metrics that users are actually recovered, and handle any damaged data.\n\n' +
      'Afterwards we write a blameless postmortem: the timeline, the root cause, why detection and recovery took as long as they did, and concrete follow-up actions with owners, ' +
      'like an alert, a test or a safer deploy step, so the same class of problem does not happen again.'
  },
  {
    id: 'eng-design-patterns',
    roles: ['all'],
    anchors: ['design pattern', 'design patterns'],
    level: 'mid',
    question: 'Which design patterns do you use most in practice?',
    variants: [
      'Give examples of design patterns you have used.',
      'What is the strategy pattern?',
      'What is the observer pattern?',
      'When is the singleton pattern a problem?'
    ],
    answer: 'The ones that show up every day are often built into frameworks. The observer pattern is behind state management, streams and event listeners: subscribers react when something changes. ' +
      'The repository pattern hides data access behind an interface. The adapter pattern wraps a third-party SDK, like a payment provider, behind my own interface, so it can be swapped.\n\n' +
      'The strategy pattern is useful for interchangeable behaviour, like different pricing rules or payment methods implementing one interface, chosen at runtime, instead of a growing switch statement. ' +
      'Factories create the right implementation, and the decorator pattern adds behaviour, like caching or logging around a service, without changing it.\n\n' +
      'Singletons are useful for truly single resources like a configuration or a database pool, but as global state they make testing hard, so I provide them through dependency injection instead of static access.\n\n' +
      'I treat patterns as vocabulary for common solutions, not goals; using one where a simple function works just adds complexity.'
  },
  {
    id: 'eng-clean-code',
    roles: ['all'],
    anchors: [],
    level: 'mid',
    question: 'What does clean, maintainable code mean to you?',
    variants: [
      'How do you write readable code?',
      'What makes code easy to maintain?',
      'How do you name things in code?',
      'When do you write comments?'
    ],
    answer: 'Clean code is code the next person can understand and change safely, often that next person being me in six months.\n\n' +
      'In practice: clear names that say what something is or does, so comments are rarely needed to explain what. Small functions and classes with one responsibility. ' +
      'Consistent structure, so similar things look similar across the codebase. Error handling that is explicit, not swallowed. And no clever tricks where plain code would do.\n\n' +
      'Comments explain why, the business reason or the non-obvious decision, like why we retry only twice here, because that cannot be read from the code.\n\n' +
      'Tests are part of it: they document how the code is meant to be used and make refactoring safe. ' +
      'And I avoid both extremes: duplication everywhere, and abstractions built too early for needs that never come. Simple and clear beats general and clever.'
  },
  {
    id: 'eng-estimation-planning',
    roles: ['all'],
    anchors: [],
    level: 'senior',
    question: 'How do you estimate work and plan a feature?',
    variants: [
      'How do you give estimates to product managers?',
      'How do you break down a large feature?',
      'What do you do when an estimate turns out wrong?',
      'How do you handle unclear requirements?'
    ],
    answer: 'Before estimating, I make sure I understand the problem: the goal, the users, the edge cases and what is out of scope. Unclear requirements are clarified with product and design first, ' +
      'because most bad estimates come from misunderstood scope, not slow coding.\n\n' +
      'Then I break the feature into small, independently shippable pieces, ideally vertical slices that deliver something end to end, and estimate those. Small pieces are much easier to estimate than one big one, ' +
      'and the parts with real uncertainty, like a new third-party integration, get a short spike to learn before committing.\n\n' +
      'I give a range with my confidence and the assumptions behind it, rather than a single date.\n\n' +
      'If it turns out wrong, I say so as soon as I know, with the reason and options: cut scope, move the date or add help. Early bad news is useful; late bad news is a problem.'
  },
  {
    id: 'eng-mentoring',
    roles: ['all'],
    anchors: [],
    level: 'senior',
    question: 'How do you help junior developers grow?',
    variants: [
      'How do you mentor less experienced engineers?',
      'How do you onboard a new developer to a project?',
      'How do you give feedback to a junior developer?',
      'What does a senior engineer do besides writing code?'
    ],
    answer: 'I try to make them independent rather than dependent on me. When they ask a question, I often ask what they have tried and guide them to the answer, and I explain the reasoning, not just the fix, ' +
      'so they can solve the next similar problem themselves.\n\n' +
      'Code review is a big teaching tool: I explain why a change matters, link to examples in the codebase, separate must-fix issues from suggestions, and point out what they did well too.\n\n' +
      'Pairing works well for tricky areas, with them driving. I give them tasks slightly above their level with support available, and gradually more ownership, from a small fix to a whole feature.\n\n' +
      'For onboarding, good documentation, a working local setup in one command, and a first small task that ships in the first days help a lot. ' +
      'Beyond code, a senior engineer raises the level of the whole team through good defaults, clear standards and being approachable.'
  },
  {
    id: 'eng-documentation',
    roles: ['all'],
    anchors: ['documentation', 'adr', 'readme'],
    level: 'mid',
    question: 'What documentation do you write, and how do you keep it useful?',
    variants: [
      'What are architecture decision records?',
      'How do you document a project?',
      'What goes in a good README?',
      'How do you keep documentation up to date?'
    ],
    answer: 'I write the documentation people actually need, and keep it close to the code so it gets updated with it.\n\n' +
      'A good README gets a new developer running the project quickly: what it is, how to set it up and run it, the main commands, environment variables, and how to deploy.\n\n' +
      'For important technical decisions I write short architecture decision records: the context, the options considered, the decision and its consequences. ' +
      'They answer the question everyone asks a year later: why is it built this way.\n\n' +
      'APIs are documented with OpenAPI generated from the code. For complex flows, a simple diagram helps more than pages of text.\n\n' +
      'To keep it alive, documentation changes are part of the pull request that changes the behaviour, and I prefer fewer, accurate documents over many stale ones.'
  },
  {
    id: 'eng-agile-process',
    roles: ['all'],
    anchors: ['agile', 'scrum', 'kanban', 'sprint'],
    level: 'mid',
    question: 'How do you work in an agile team, Scrum or Kanban?',
    variants: [
      'What is your experience with Scrum?',
      'Scrum or Kanban, which do you prefer?',
      'What makes sprint planning work well?',
      'What is the purpose of a retrospective?'
    ],
    answer: 'I have worked in both, and I care more about the principles than the ceremony: small increments, frequent feedback from users and stakeholders, and the team improving how it works.\n\n' +
      'Scrum suits product teams building towards goals in fixed cycles: planning sets a realistic sprint goal, stand-ups are short and about blockers, the review shows working software, ' +
      'and the retrospective turns problems into one or two concrete changes for the next sprint.\n\n' +
      'Kanban suits work that arrives continuously, like support, maintenance or platform teams, with work-in-progress limits so the team finishes things instead of starting too many.\n\n' +
      'What makes either work is well-refined tickets with clear acceptance criteria before they are started, breaking work into small pieces, and protecting focus time, ' +
      'because too many meetings is the most common way agile goes wrong.'
  },
  {
    id: 'eng-code-review-general',
    roles: ['frontend', 'backend'],
    anchors: ['code review', 'pull request'],
    level: 'senior',
    question: 'What do you look for when reviewing a pull request?',
    variants: [
      'How do you do code reviews?',
      'What makes a good pull request?',
      'How do you handle disagreement in a code review?',
      'How quickly should code reviews happen?'
    ],
    answer: 'Automated checks handle formatting, lint and tests, so I focus on what tools cannot judge.\n\n' +
      'First, does it do the right thing: the logic, edge cases, error handling, and what happens with bad input, concurrency or partial failures. ' +
      'Then security and data: authorisation checks, queries scoped to the user, secrets, and anything that could leak personal data. ' +
      'Then design and maintainability: does it fit the existing structure, is it simpler than it could be, and is the new behaviour tested.\n\n' +
      'I keep comments specific and kind, explain the reasoning, mark what is blocking and what is a suggestion, and approve when it is good enough rather than perfect. ' +
      'If we disagree, a quick conversation beats a long comment thread, and team conventions settle style debates.\n\n' +
      'I review promptly, within the day, because waiting on reviews is one of the biggest slowdowns for a team, and I ask authors for small pull requests with a clear description.'
  }
];
