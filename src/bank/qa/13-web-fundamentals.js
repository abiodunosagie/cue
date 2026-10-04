// Web fundamentals: performance, accessibility, CSS, the browser and web security.
module.exports = [
  {
    id: 'web-core-web-vitals',
    roles: ['frontend'],
    anchors: ['core web vitals', 'lcp', 'cls', 'inp'],
    level: 'senior',
    question: 'What are Core Web Vitals and how do you improve them?',
    variants: [
      'What are LCP, CLS and INP?',
      'How do you make a website load faster?',
      'Your Lighthouse score is low, what do you do?',
      'How do you measure front end performance for real users?'
    ],
    answer: 'They are Google\'s three user-centred metrics. Largest Contentful Paint is how fast the main content appears, aiming under 2.5 seconds. Cumulative Layout Shift is how much the page jumps around while loading. ' +
      'Interaction to Next Paint is how quickly the page responds to clicks and typing.\n\n' +
      'For LCP: serve the hero image optimised, sized and preloaded, render the content on the server, cut render-blocking scripts and fonts, and use a CDN. ' +
      'For CLS: give images, ads and embeds reserved space with width and height or aspect ratio, and load fonts with matching fallbacks so text does not shift. ' +
      'For INP: ship less JavaScript, break up long tasks, avoid heavy work in event handlers, and defer third-party scripts.\n\n' +
      'Lighthouse is a useful lab test, but I trust field data from real users more, through the web-vitals library or Search Console, because real devices and networks are slower than mine.'
  },
  {
    id: 'web-accessibility',
    roles: ['frontend'],
    anchors: ['aria', 'wcag'],
    level: 'mid',
    question: 'How do you make a web application accessible?',
    variants: [
      'What is WCAG?',
      'When should you use ARIA attributes?',
      'How do you test accessibility on a website?',
      'How do you make a custom dropdown or modal accessible?'
    ],
    answer: 'Most accessibility comes from semantic HTML. A real button, link, label, heading structure and list gives keyboard support and screen reader meaning for free, while a clickable div gives neither.\n\n' +
      'Then the essentials: every form field has a visible label, images have meaningful alt text or empty alt if decorative, colour contrast meets WCAG AA, focus is always visible, ' +
      'and everything works with a keyboard in a logical order.\n\n' +
      'ARIA is for what HTML cannot express, like a live region announcing a toast, or the state of a custom widget. The first rule of ARIA is not to use it when a native element does the job, because wrong ARIA is worse than none. ' +
      'For custom components like modals, menus and comboboxes I follow the ARIA authoring patterns, or use a headless library like Radix that already does: focus trapping, Escape to close, returning focus.\n\n' +
      'To test, I use axe in development and CI, then actually navigate with the keyboard and a screen reader, because automated tools catch only part of the problems.'
  },
  {
    id: 'web-css-layout',
    roles: ['frontend'],
    anchors: ['css', 'flexbox'],
    level: 'mid',
    question: 'When do you use Flexbox and when do you use CSS Grid?',
    variants: [
      'Flexbox versus Grid, what is the difference?',
      'How do you build a responsive layout with CSS?',
      'How do you centre an element in CSS?',
      'What are container queries?'
    ],
    answer: 'Flexbox is one-dimensional: it lays items out in a row or a column and is great for distributing space between them, like a navbar, a toolbar, or a button with an icon and text. ' +
      'Content decides the sizes, and items can grow, shrink and wrap.\n\n' +
      'Grid is two-dimensional: I define rows and columns and place items into them, so it is right for page layouts, card grids and anything that has to line up both ways. ' +
      'With repeat, auto-fit and minmax, a grid becomes responsive without any media queries.\n\n' +
      'I often combine them: grid for the page structure, flex inside the components. For centring, either works: display grid with place-items center is the shortest.\n\n' +
      'For responsive design I go mobile first, use relative units and clamp for fluid type, and container queries, which let a component adapt to the space its container gives it rather than the screen width.'
  },
  {
    id: 'web-css-specificity',
    roles: ['frontend'],
    anchors: ['css'],
    level: 'junior',
    question: 'How does CSS specificity work, and how do you avoid specificity wars?',
    variants: [
      'Why is my CSS style not being applied?',
      'What is the cascade in CSS?',
      'Why should you avoid !important?',
      'What are cascade layers?'
    ],
    answer: 'When several rules target the same element, the browser picks the winner by origin and importance, then specificity, then order. ' +
      'Specificity counts inline styles, then ids, then classes, attributes and pseudo-classes, then element selectors. So an id selector beats any number of classes, and a later rule wins a tie.\n\n' +
      'Specificity wars start when people fix conflicts by adding ids, longer selectors or !important, and each fix forces the next one to be even stronger.\n\n' +
      'I avoid them by keeping specificity low and flat, mostly single class selectors, with a methodology like BEM, CSS Modules for scoping, or utility classes with Tailwind. ' +
      'Cascade layers are the modern tool: I put resets, base styles, components and utilities in ordered layers, so the layer order decides who wins, not selector weight. ' +
      'I keep !important for rare cases like utility overrides.'
  },
  {
    id: 'web-browser-rendering',
    roles: ['frontend'],
    anchors: ['css', 'javascript'],
    level: 'senior',
    question: 'What happens when the browser renders a page, and what are reflow and repaint?',
    variants: [
      'Explain the critical rendering path.',
      'What causes layout thrashing?',
      'Which CSS properties are cheap to animate?',
      'What happens when you type a URL and press enter?'
    ],
    answer: 'The browser parses HTML into the DOM and CSS into the CSSOM, combines them into a render tree, calculates layout, meaning the size and position of every element, ' +
      'paints the pixels into layers, and composites the layers on screen. Scripts can pause parsing, which is why blocking scripts and CSS slow the first render.\n\n' +
      'Reflow is recalculating layout, triggered by changing sizes, positions or content. It is the expensive step, because it can affect the whole page. ' +
      'Repaint redraws pixels without layout changes, like a colour change. Compositing only moves existing layers.\n\n' +
      'So for animations I use transform and opacity, which the compositor handles without layout or paint. ' +
      'And I avoid layout thrashing, which is reading a layout value like offsetHeight right after writing styles, in a loop, forcing the browser to recalculate layout every time; ' +
      'I batch the reads first and the writes after.'
  },
  {
    id: 'web-cors',
    roles: ['frontend', 'backend'],
    anchors: ['cors'],
    level: 'mid',
    question: 'What is CORS and how do you fix a CORS error?',
    variants: [
      'What is CORS?',
      'Why does the browser block my API request?',
      'What is a preflight request?',
      'Is CORS a security feature for the server?',
      'How do you configure CORS on an API?'
    ],
    answer: 'Browsers follow the same-origin policy: a page can only read responses from its own origin, meaning scheme, domain and port. CORS is how a server says which other origins may read its responses, through headers like Access-Control-Allow-Origin.\n\n' +
      'For requests that are not simple, like JSON posts or ones with an Authorization header, the browser first sends an OPTIONS preflight, asking which methods and headers are allowed, and only then the real request.\n\n' +
      'A CORS error is fixed on the server, never in the front end: allow the specific origins of my apps, the methods and headers they use, and allow credentials only when cookies are needed, which also requires a specific origin, not a wildcard. ' +
      'In development, a proxy in the dev server avoids the issue.\n\n' +
      'It is important to understand CORS only protects users in browsers. It does not stop curl or another server calling my API, so authentication and authorisation are still required.'
  },
  {
    id: 'web-storage-cookies',
    roles: ['frontend'],
    anchors: ['css', 'javascript'],
    level: 'mid',
    question: 'Where should you store auth tokens in the browser: cookies or localStorage?',
    variants: [
      'What is the difference between cookies, localStorage and sessionStorage?',
      'Is it safe to store a JWT in localStorage?',
      'What are httpOnly, Secure and SameSite cookies?',
      'How do you store user preferences in the browser?'
    ],
    answer: 'localStorage persists until cleared and sessionStorage lasts for the tab, both readable by any JavaScript on the page. Cookies are sent automatically with requests to their domain, and can be made inaccessible to JavaScript.\n\n' +
      'For session tokens I prefer an httpOnly, Secure cookie with SameSite set to Lax or Strict. httpOnly means a cross-site scripting bug cannot read the token, Secure keeps it on HTTPS, ' +
      'and SameSite blocks most cross-site request forgery. If the API is on another domain, I still use a cookie through a backend-for-frontend rather than exposing tokens.\n\n' +
      'Putting a long-lived token in localStorage means any XSS can steal it and use it elsewhere. If an app must hold a token in JavaScript, I keep the access token short-lived and in memory, ' +
      'with refresh handled by an httpOnly cookie.\n\n' +
      'localStorage is fine for non-sensitive things like theme or layout preferences.'
  },
  {
    id: 'web-xss-csrf',
    roles: ['frontend', 'backend'],
    anchors: ['xss', 'csrf', 'cross site scripting', 'content security policy', 'csp'],
    level: 'senior',
    question: 'What are XSS and CSRF, and how do you prevent them?',
    variants: [
      'How do you prevent cross site scripting?',
      'What is a Content Security Policy?',
      'What is cross site request forgery?',
      'Is dangerouslySetInnerHTML dangerous?'
    ],
    answer: 'XSS is an attacker getting their script to run on my page, usually through user content that is rendered as HTML. Then it can act as the user and read anything JavaScript can.\n\n' +
      'Prevention: frameworks like React escape output by default, so the risk is in escape hatches like dangerouslySetInnerHTML, rendering user-provided URLs, and third-party scripts. ' +
      'When HTML from users must be rendered, I sanitise it with a library like DOMPurify, and I only allow http and https in links. ' +
      'A Content Security Policy is the second line of defence: it restricts which scripts can run, ideally with nonces, so injected scripts are blocked even if a bug slips through. Session cookies are httpOnly.\n\n' +
      'CSRF is a malicious site making the user\'s browser send a request to my app with their cookies. SameSite cookies block most of it, and for sensitive actions I add CSRF tokens or check the Origin header. ' +
      'State changes never happen on GET requests.'
  },
  {
    id: 'web-http-caching',
    roles: ['frontend', 'backend'],
    anchors: ['css', 'javascript'],
    level: 'senior',
    question: 'How does HTTP caching work, and how do you set Cache-Control for a web app?',
    variants: [
      'What is the difference between max-age and no-cache?',
      'What is an ETag?',
      'How do you make sure users get new JavaScript after a deploy?',
      'How do you use a CDN effectively?'
    ],
    answer: 'Cache-Control tells browsers and CDNs how long they may reuse a response. max-age is how long it is fresh. no-cache means it can be stored, but must be revalidated with the server before use. ' +
      'no-store means never store it. ETag or Last-Modified let the client revalidate cheaply: the server answers 304 Not Modified when nothing changed.\n\n' +
      'For a web app, the pattern is: static assets like JavaScript, CSS and images get a content hash in their filename and a long max-age with immutable, so they are cached for a year. ' +
      'When the code changes, the filename changes, so users get the new version automatically. The HTML that references them is short-lived or revalidated, so a deploy is picked up quickly.\n\n' +
      'API responses depend on the data: private, user-specific responses are never cached by shared caches, and public data can use a short max-age or stale-while-revalidate at the CDN.'
  },
  {
    id: 'web-lazy-loading-assets',
    roles: ['frontend'],
    anchors: ['css', 'javascript'],
    level: 'mid',
    question: 'How do you load scripts, images and other assets efficiently?',
    variants: [
      'What is the difference between async and defer on a script tag?',
      'What are preload and prefetch?',
      'How do you lazy load images?',
      'How do you handle third party scripts without slowing the page?'
    ],
    answer: 'For scripts, a plain script tag blocks parsing. defer downloads in parallel and runs after the HTML is parsed, in order, which is right for most app code. ' +
      'async runs as soon as it downloads, in any order, which suits independent scripts like analytics.\n\n' +
      'Images below the fold get loading lazy, and every image has dimensions to avoid layout shift. The hero image is the opposite: loaded eagerly, with high fetch priority, possibly preloaded.\n\n' +
      'preload tells the browser to fetch something critical for this page early, like a font or the hero image. prefetch fetches something the user will probably need next, at low priority, like the next route\'s code.\n\n' +
      'Third-party scripts are often the biggest cost, so I audit them, load them after the page is interactive, and consider a facade, like a static preview of a video or chat widget that loads the real thing only on click.'
  },
  {
    id: 'web-pwa',
    roles: ['frontend'],
    anchors: ['pwa'],
    level: 'mid',
    question: 'What is a progressive web app, and when would you build one?',
    variants: [
      'What is a PWA?',
      'What makes a web app a PWA?',
      'Can a PWA replace a native app?',
      'How do you make a web app installable?',
      'What are the limitations of PWAs on iOS?'
    ],
    answer: 'A PWA is a web app that behaves more like an installed app: it has a web app manifest with the name, icons and display mode, so it can be installed to the home screen, ' +
      'and a service worker, so it loads fast on repeat visits, works offline or on bad networks, and can receive push notifications. It must be served over HTTPS.\n\n' +
      'I would build one when reach matters more than deep device features: internal tools, dashboards, ordering or booking apps, and products for markets where people have limited storage or data and avoid installing apps. ' +
      'One codebase, no store review, and instant updates are big advantages.\n\n' +
      'The limits are mostly on iOS, which supports install and push now, but with restrictions on background work and storage. ' +
      'For heavy hardware access, background tasks or a strong store presence, a native or Flutter app is still better.'
  },
  {
    id: 'web-security-headers',
    roles: ['frontend', 'backend'],
    anchors: ['hsts'],
    level: 'senior',
    question: 'Which security headers do you set on a web application?',
    variants: [
      'What is HSTS?',
      'How do you prevent clickjacking?',
      'How do you harden a website\'s HTTP headers?',
      'What does X-Content-Type-Options do?'
    ],
    answer: 'A small set of headers blocks whole classes of attacks cheaply.\n\n' +
      'Strict-Transport-Security makes browsers use HTTPS only for my domain, so nobody can downgrade a connection. ' +
      'A Content Security Policy limits where scripts, styles and other resources may load from, which contains cross-site scripting. ' +
      'frame-ancestors in the CSP, or X-Frame-Options, stops other sites framing my pages, which prevents clickjacking. ' +
      'X-Content-Type-Options nosniff stops the browser guessing content types. Referrer-Policy limits how much of the URL leaks to other sites, ' +
      'and Permissions-Policy turns off browser features the app does not use, like the camera.\n\n' +
      'I set them once, at the framework, server or CDN level, check them with a scanner, and roll out a strict CSP in report-only mode first, so it does not break legitimate scripts.'
  },
  {
    id: 'web-tailwind-css-strategy',
    roles: ['frontend'],
    anchors: ['tailwind', 'css modules', 'styled components'],
    level: 'mid',
    question: 'How do you approach styling in a large front end project: Tailwind, CSS Modules or CSS-in-JS?',
    variants: [
      'What do you think of Tailwind CSS?',
      'Why are teams moving away from runtime CSS-in-JS?',
      'How do you keep styles consistent across a big app?',
      'CSS Modules versus Tailwind?'
    ],
    answer: 'Any of them works when the team is consistent; the real goals are no global leaks, a shared design language, and no runtime cost.\n\n' +
      'Tailwind is my usual choice now. Utility classes keep styles next to the markup, the design tokens live in the config so spacing and colours stay consistent, and unused CSS is removed at build time. ' +
      'The trade-off is long class lists, which I manage by extracting components, not by writing custom classes everywhere.\n\n' +
      'CSS Modules are great when a team prefers real CSS: scoped by default, zero runtime and simple.\n\n' +
      'Runtime CSS-in-JS like styled-components lost favour because it injects styles in JavaScript at runtime, which costs performance and does not fit server components well. ' +
      'Zero-runtime options solve that if a team likes the style. Whatever the tool, the tokens, colours, spacing and typography, are defined once and used everywhere.'
  },
  {
    id: 'web-micro-frontends',
    roles: ['frontend'],
    anchors: ['module federation'],
    level: 'senior',
    question: 'What are micro frontends, and when are they worth it?',
    variants: [
      'Have you used Module Federation?',
      'How do several teams work on one big front end?',
      'Monorepo or micro frontends for a large web app?',
      'What are the downsides of micro frontends?'
    ],
    answer: 'Micro frontends split one product\'s front end into parts owned and deployed independently by different teams, like checkout, search and account, composed at runtime with something like Module Federation or at the edge.\n\n' +
      'They are worth it for large organisations where many teams block each other on one deployment, or where parts of the app need different release speeds or even different frameworks during a migration.\n\n' +
      'The costs are real: shared dependencies and design consistency get harder, bundles can grow with duplicated libraries, cross-app state and routing need contracts, and local development is more complex.\n\n' +
      'For most companies, a well-structured monorepo with clear module boundaries, shared design system packages and good CI gives the team independence without those costs. ' +
      'I would only go to micro frontends when the organisational problem is real.'
  },
  {
    id: 'web-browser-apis-observers',
    roles: ['frontend'],
    anchors: ['intersectionobserver', 'resizeobserver', 'mutationobserver', 'requestanimationframe'],
    level: 'mid',
    question: 'Which browser APIs do you use for performance, like IntersectionObserver or requestAnimationFrame?',
    variants: [
      'What is IntersectionObserver used for?',
      'When do you use requestAnimationFrame?',
      'How do you detect when an element enters the viewport?',
      'How do you react to an element changing size?'
    ],
    answer: 'IntersectionObserver tells me when an element enters or leaves the viewport without listening to scroll events. I use it for lazy loading, infinite scroll sentinels, ' +
      'pausing videos off screen, and tracking which section is visible for analytics or a table of contents.\n\n' +
      'ResizeObserver reports when an element\'s size changes, which is better than window resize for components that adapt to their container, like charts.\n\n' +
      'requestAnimationFrame runs a callback right before the next paint. I use it for custom animations and for batching visual updates, so they happen once per frame in sync with the display, ' +
      'instead of with timers that drift.\n\n' +
      'MutationObserver watches DOM changes, mostly for integrating third-party content. And requestIdleCallback or scheduler APIs let low-priority work run when the main thread is free.'
  },
  {
    id: 'web-internationalisation',
    roles: ['frontend'],
    anchors: ['css', 'javascript'],
    level: 'mid',
    question: 'How do you internationalise a web application?',
    variants: [
      'How do you add multiple languages to a React or Next.js app?',
      'How do you format dates and currencies for different locales?',
      'How do you support right to left languages on the web?',
      'How do you handle plurals in translations?'
    ],
    answer: 'All user-facing text goes through a translation library, like next-intl or i18next, with messages in files per locale and keys instead of hard-coded strings. ' +
      'Messages use ICU format for placeholders and plurals, because plural rules differ a lot between languages; I never build sentences by concatenating pieces.\n\n' +
      'Dates, numbers and currencies are formatted with the built-in Intl APIs for the user\'s locale and time zone, never by hand.\n\n' +
      'The locale is part of the URL, like a language prefix, which is good for SEO with hreflang tags, and it is remembered for the user. ' +
      'For right to left languages I set the dir attribute and use CSS logical properties like margin-inline-start, so the layout mirrors correctly.\n\n' +
      'I test with longer languages and a pseudo-locale, because translated text is often much longer and breaks tight layouts.'
  }
];
