// Next.js: rendering, routing, data and deployment.
module.exports = [
  {
    id: 'next-rendering-modes',
    roles: ['frontend'],
    anchors: ['next.js', 'nextjs', 'ssr', 'ssg', 'isr'],
    level: 'mid',
    question: 'What is the difference between SSR, SSG, ISR and client side rendering in Next.js?',
    variants: [
      'When do you use static generation versus server rendering?',
      'What is incremental static regeneration?',
      'How do you choose a rendering strategy for a page?',
      'Explain SSR versus CSR.'
    ],
    answer: 'They differ in when the HTML is produced.\n\n' +
      'Static generation builds the HTML at build time, so it is served from a CDN, extremely fast and cheap. It is right for marketing pages, blogs and docs.\n\n' +
      'Incremental static regeneration keeps that speed but refreshes the page after a time or on demand, when the content changes, so a product page can be static and still update without a rebuild.\n\n' +
      'Server-side rendering builds the HTML on every request, which I use when the page depends on the request, like the logged-in user, or must always be fresh.\n\n' +
      'Client-side rendering ships a shell and fetches data in the browser, fine for highly interactive, private areas like a dashboard after login, but slower first paint and weaker SEO.\n\n' +
      'In the App Router these are decided per route and even per fetch, by caching options and whether dynamic functions like cookies are used, and a single page can mix static and dynamic parts.'
  },
  {
    id: 'next-app-vs-pages-router',
    roles: ['frontend'],
    anchors: ['next.js', 'nextjs', 'app router', 'pages router'],
    level: 'mid',
    question: 'What changed with the App Router compared with the Pages Router in Next.js?',
    variants: [
      'App Router or Pages Router, which do you use?',
      'How do layouts work in the Next.js App Router?',
      'What replaced getServerSideProps in the App Router?',
      'Would you migrate a Pages Router app to the App Router?'
    ],
    answer: 'The App Router is built on React Server Components. Components are server components by default, so data is fetched directly inside them with async and await, and getServerSideProps and getStaticProps are no longer needed.\n\n' +
      'Routing is folder-based with special files: page for the route, layout for UI that wraps child routes and keeps its state between navigations, ' +
      'loading and error for Suspense and error boundaries, and route handlers for API endpoints. Nested layouts, streaming and parallel routes come out of that structure.\n\n' +
      'Mutations can use server actions instead of separate API routes for the app\'s own forms.\n\n' +
      'For new projects I use the App Router. For an existing Pages Router app, both routers can live side by side, so I would migrate incrementally, route by route, starting with simpler pages, rather than a big rewrite.'
  },
  {
    id: 'next-caching',
    roles: ['frontend'],
    anchors: ['next.js', 'nextjs', 'cache', 'caching', 'revalidate'],
    level: 'senior',
    question: 'How does caching work in the Next.js App Router?',
    variants: [
      'What is revalidatePath and revalidateTag?',
      'Why is my Next.js page showing stale data?',
      'How do you cache data fetching in Next.js?',
      'What is the difference between the data cache and the full route cache?'
    ],
    answer: 'There are several layers. Request memoisation deduplicates identical fetches during one render. The data cache keeps fetch results across requests and deployments until they are revalidated. ' +
      'The full route cache stores the rendered output of static routes. And the router cache in the browser keeps visited route segments for fast back and forward navigation.\n\n' +
      'Stale data almost always comes from one of those layers, so I make caching explicit per fetch: either a revalidate time, or tags, and after a mutation I call revalidateTag or revalidatePath, ' +
      'for example in the server action that updates a product, so every page showing it refreshes. Anything user-specific or real-time opts out of caching.\n\n' +
      'Newer versions moved towards opt-in caching with the "use cache" directive and cache life profiles, which is easier to reason about. Whatever the version, I check in a production build, because the dev server does not cache the same way.'
  },
  {
    id: 'next-server-actions',
    roles: ['frontend'],
    anchors: ['next.js', 'nextjs', 'server actions', 'server action'],
    level: 'senior',
    question: 'What are server actions in Next.js and how do you use them safely?',
    variants: [
      'Server actions versus API routes, when do you use each?',
      'Are server actions secure?',
      'How do you handle form submissions in the Next.js App Router?',
      'How do you validate input in a server action?'
    ],
    answer: 'A server action is an async function marked "use server" that the client can call, typically as a form action or from an event handler. Next.js turns it into a POST endpoint, ' +
      'so mutations can live next to the components that use them, with progressive enhancement and built-in pending states.\n\n' +
      'The key point for security is that every server action is a public endpoint, even if only one button calls it. So inside each action I authenticate the user, check they are allowed to do this specific thing, ' +
      'validate the input with a schema like Zod, and return safe error messages, never raw exceptions. After the change, I revalidate the affected paths or tags.\n\n' +
      'I use server actions for the app\'s own forms and mutations. For anything consumed by other clients, like a mobile app or webhooks, I use route handlers, which are a proper, versionable HTTP API.'
  },
  {
    id: 'next-middleware',
    roles: ['frontend'],
    anchors: ['next.js', 'nextjs', 'middleware', 'proxy'],
    level: 'senior',
    question: 'What is middleware in Next.js and what do you use it for?',
    variants: [
      'How do you protect routes in Next.js?',
      'How do you redirect users based on a cookie in Next.js?',
      'What should and should not go in Next.js middleware?',
      'How do you handle authentication checks in Next.js?'
    ],
    answer: 'Middleware runs before a request reaches a route, so it can redirect, rewrite, or set headers and cookies based on the request. ' +
      'I use it for cheap, cross-cutting checks: sending signed-out users away from protected sections based on the session cookie, locale detection, A/B test bucketing, and security headers.\n\n' +
      'What I do not do is rely on it as the only authorization check. It is a fast first gate for user experience, but every server component, route handler and server action that reads private data still verifies the session and the user\'s permissions itself, ' +
      'close to the data. A real vulnerability in 2025 let attackers skip middleware, which is exactly why defence in depth matters.\n\n' +
      'I also keep middleware light and use a matcher so it does not run on static files, because it runs on every matched request and slows everything down if it does too much.'
  },
  {
    id: 'next-seo-metadata',
    roles: ['frontend'],
    anchors: ['next.js', 'nextjs', 'seo', 'metadata', 'open graph'],
    level: 'mid',
    question: 'How do you handle SEO in a Next.js application?',
    variants: [
      'How do you set page titles and meta tags in Next.js?',
      'How do you generate Open Graph images in Next.js?',
      'How do you add a sitemap and robots.txt in Next.js?',
      'Why is Next.js good for SEO?'
    ],
    answer: 'The foundation is that pages are rendered on the server or statically, so search engines get real HTML with the content, not an empty shell.\n\n' +
      'On top of that, I use the Metadata API: a metadata export or generateMetadata per route for titles, descriptions, canonical URLs and Open Graph and Twitter tags, ' +
      'with a title template in the root layout. Dynamic pages build their metadata from the same data as the page.\n\n' +
      'Next.js can generate the sitemap and robots files from code, and Open Graph images with the image response API, so shared links look good. ' +
      'I add structured data as JSON-LD for things like products or articles.\n\n' +
      'And performance is part of SEO: good Core Web Vitals through next/image, next/font and small client bundles, plus semantic HTML with proper headings and links.'
  },
  {
    id: 'next-image-font',
    roles: ['frontend'],
    anchors: ['next.js', 'nextjs', 'next/image', 'next/font', 'image optimization'],
    level: 'mid',
    question: 'What do next/image and next/font do for performance?',
    variants: [
      'Why use the Next.js Image component?',
      'How does Next.js prevent layout shift from images and fonts?',
      'How do you load fonts efficiently in Next.js?',
      'What is the priority prop on next/image?'
    ],
    answer: 'next/image serves images resized for each device and in modern formats like WebP or AVIF, lazy loads images below the fold, and requires a width and height or a fill container, ' +
      'which reserves the space and prevents layout shift. For the hero image, which is usually the largest contentful paint, I mark it as priority so it loads straight away, and I set sizes so the browser picks the right resolution.\n\n' +
      'next/font downloads fonts at build time and serves them from my own domain, so there is no extra request to Google at runtime, which helps both speed and privacy. ' +
      'It also sets fallback font metrics that match the real font, so text does not jump when the font loads.\n\n' +
      'Together they fix two of the most common Core Web Vitals problems, slow LCP and layout shift, with very little effort.'
  },
  {
    id: 'next-data-fetching-patterns',
    roles: ['frontend'],
    anchors: ['next.js', 'nextjs', 'data fetching', 'waterfall', 'streaming'],
    level: 'senior',
    question: 'How do you fetch data in the Next.js App Router without waterfalls?',
    variants: [
      'How do you avoid request waterfalls in server components?',
      'What is streaming in Next.js?',
      'Where do you fetch data in the App Router?',
      'How do you fetch data in parallel in Next.js?'
    ],
    answer: 'In the App Router I fetch data in server components, close to where it is used. The risk is a waterfall: a parent awaits its data before rendering a child that then awaits its own, so requests run one after another.\n\n' +
      'To avoid that, I start independent requests together with Promise.all, or start a promise early and await it lower down. ' +
      'Identical fetches are deduplicated within a render, and for database calls I wrap the function in React\'s cache, so several components can ask for the current user without extra queries.\n\n' +
      'Then I use streaming: slow sections are wrapped in Suspense with a skeleton, so the page shell and fast parts arrive at once and the slow part fills in when ready, instead of the whole page waiting for the slowest query.\n\n' +
      'For client-side interactions, like infinite scroll or polling, I still use a client data library on top of a route handler.'
  },
  {
    id: 'next-route-handlers',
    roles: ['frontend', 'backend'],
    anchors: ['next.js', 'nextjs', 'route handler', 'api route', 'api routes'],
    level: 'mid',
    question: 'How do you build API endpoints in Next.js?',
    variants: [
      'What are route handlers in the App Router?',
      'Can Next.js be your backend?',
      'How do you handle webhooks in Next.js?',
      'When would you use a separate backend instead of Next.js API routes?'
    ],
    answer: 'In the App Router, a route file exports functions named after HTTP methods, like GET and POST, that take a standard Request and return a Response. ' +
      'I treat them like any backend endpoint: authenticate, authorise, validate the input with a schema, call the service layer, and return proper status codes and safe error messages.\n\n' +
      'They are a good fit for webhooks from payment providers, where I read the raw body to verify the signature, for endpoints a mobile app also uses, and for small backend-for-frontend APIs.\n\n' +
      'Next.js can absolutely be the whole backend for many products, running on serverless or Node functions. I would split out a separate service when there is long-running or heavy background work, ' +
      'persistent connections like websockets at scale, several clients needing a shared API owned by another team, or a need to scale the API independently of the web app.'
  },
  {
    id: 'next-auth',
    roles: ['frontend'],
    anchors: ['next.js', 'nextjs', 'auth', 'authentication', 'session', 'auth.js'],
    level: 'senior',
    question: 'How do you implement authentication in a Next.js app?',
    variants: [
      'How do you handle sessions in Next.js?',
      'Have you used NextAuth or Auth.js?',
      'How do you check the user in a server component?',
      'Where do you store the session in a Next.js app?'
    ],
    answer: 'I use a proven library or provider rather than building auth from scratch: Auth.js, Clerk, Supabase Auth or the company\'s identity provider. ' +
      'The session lives in an httpOnly, secure, same-site cookie, so JavaScript in the page cannot read it, which protects it from cross-site scripting.\n\n' +
      'On the server, I have one helper that reads and verifies the session, and every server component, route handler and server action that touches private data calls it and checks permissions. ' +
      'Middleware does a quick redirect for signed-out users, but it is not the security boundary.\n\n' +
      'Data access goes through a small data layer that always takes the current user, so queries are scoped by default. ' +
      'The client only gets the minimum user info it needs to render, never tokens it does not need, and sign out invalidates the session on the server, not just in the browser.'
  },
  {
    id: 'next-deployment-performance',
    roles: ['frontend'],
    anchors: ['next.js', 'nextjs', 'vercel', 'deploy', 'edge'],
    level: 'mid',
    question: 'How do you deploy a Next.js app, and what do you check for production?',
    variants: [
      'Vercel or self hosting for Next.js?',
      'What is the edge runtime?',
      'How do you manage environment variables in Next.js?',
      'What is the difference between NEXT_PUBLIC variables and server variables?'
    ],
    answer: 'The simplest path is Vercel, which builds from git, gives preview deployments for every pull request, and handles the CDN, functions and caching. ' +
      'Self-hosting works too, with the standalone output in a container, but then I own the caching, image optimisation and scaling setup.\n\n' +
      'Environment variables are the classic risk: anything prefixed NEXT_PUBLIC is bundled into the client and visible to everyone, so only public values go there. Secrets stay server-only, set per environment in the platform, never committed.\n\n' +
      'Before going live I check the production build locally, look at which routes are static and which are dynamic, run Lighthouse on key pages, set security headers, ' +
      'and make sure error monitoring with source maps and analytics are in place. I keep functions on the default Node runtime unless there is a clear reason for something else.'
  },
  {
    id: 'next-hydration-errors',
    roles: ['frontend'],
    anchors: ['next.js', 'nextjs', 'react', 'hydration'],
    level: 'mid',
    question: 'What is a hydration error and how do you fix it?',
    variants: [
      'What does "text content does not match server rendered HTML" mean?',
      'What is hydration in React?',
      'Why do dates or random values cause hydration errors?',
      'How do you render something only on the client in Next.js?'
    ],
    answer: 'Hydration is React attaching event handlers and state to HTML that was rendered on the server. For that, the first client render must produce exactly the same markup. A hydration error means it did not.\n\n' +
      'The usual causes are values that differ between server and browser: the current time or a date formatted in the user\'s time zone, random ids, reading window or localStorage during render, ' +
      'browser extensions changing the DOM, and invalid HTML nesting, like a div inside a p, which the browser silently fixes.\n\n' +
      'The fixes depend on the cause. Use useId for ids. Move browser-only values into an effect, so the first render matches and the client updates after. ' +
      'Format dates in a fixed time zone on the server, or render them in a client component. And fix invalid nesting. Suppressing the warning is only for a deliberate, tiny case like a timestamp.'
  }
];
