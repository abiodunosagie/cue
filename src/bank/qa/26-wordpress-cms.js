// WordPress and CMS development: themes, plugins, the block editor, content
// modelling, performance, security, migrations and headless set-ups. Role 'cms'
// so these answers only reach a CMS developer interview, never a React one.
// Products the candidate has not confirmed shipping (Multisite, the hosted
// headless CMSs) are 'named': answered only when the question names them.
module.exports = [
  {
    id: 'wp-template-hierarchy',
    roles: ['cms'],
    anchors: ['wordpress'],
    level: 'mid',
    question: 'How does the WordPress template hierarchy work?',
    variants: [
      'Which template file does WordPress load for a page?',
      'Explain the template hierarchy in WordPress.',
      'How does WordPress decide between single.php, page.php and archive.php?',
      'What happens if a theme has no template for a custom post type?'
    ],
    answer: `WordPress looks at the request, works out what kind of query it is, and then walks a list of template files from the most specific to the most general, using the first one the theme has.

For a single post of a custom type called event, it tries single-event.php, then single.php, then singular.php, and finally index.php, which every theme must have. Pages go page-slug.php, page-id.php, page.php. Archives go from taxonomy or category templates with the term slug down to archive.php.

Child themes are checked first, so a child can override one template without copying the rest. In block themes the same hierarchy applies, only the files are HTML templates in the templates folder instead of PHP files.

Knowing the order lets me add one specific template for a special case instead of filling a general template with conditionals.`
  },
  {
    id: 'wp-hooks-actions-filters',
    roles: ['cms'],
    anchors: ['wordpress'],
    level: 'mid',
    question: 'What is the difference between actions and filters in WordPress?',
    variants: [
      'How do hooks work in WordPress?',
      'Explain add_action and add_filter.',
      'When would you use a filter instead of an action?',
      'How do you change WordPress behaviour without editing core files?'
    ],
    answer: `Both are hooks, the way WordPress lets code run at defined points without touching core or someone else's plugin.

An action is a moment where something happens, like init, wp_enqueue_scripts or save_post. I attach a function with add_action and it does work: registers a post type, enqueues a script, sends an email. It returns nothing.

A filter passes a value through my function and expects it back, changed or not. the_content, the_title or excerpt_length are examples. With add_filter I receive the value, adjust it and return it. Forgetting to return is a classic bug, because the content then disappears.

Priority controls order, the default is 10, and the accepted arguments count matters when a hook passes more than one value. I also add my own do_action and apply_filters calls in plugins, so other developers can extend my code the same way.`
  },
  {
    id: 'wp-custom-post-types',
    roles: ['cms'],
    anchors: ['wordpress', 'custom post type', 'custom post types'],
    level: 'mid',
    question: 'How do you create custom post types and taxonomies in WordPress?',
    variants: [
      'When do you use a custom post type instead of a page?',
      'How do you register a custom taxonomy?',
      'How would you model events or team members in WordPress?',
      'Should custom post types live in the theme or a plugin?'
    ],
    answer: `I register them on the init hook with register_post_type and register_taxonomy. For something like events or team members, a custom post type gives the client its own menu, its own list screen and its own templates, instead of pages mixed with everything else.

The settings I always think about: public and has_archive for the URLs, the rewrite slug, supports for title, editor, thumbnail and excerpt, show_in_rest so the block editor and REST API work, and the capability type when only some roles should manage it.

Taxonomies group them: hierarchical like categories for event types, or flat like tags. I attach them to the right post types.

I put registrations in a plugin or a must-use plugin, not the theme. Content should not disappear when someone changes the theme. After changing slugs I flush rewrite rules once, on activation, never on every request.`
  },
  {
    id: 'wp-custom-fields-acf',
    roles: ['cms'],
    anchors: ['wordpress', 'acf', 'advanced custom fields'],
    level: 'mid',
    question: 'How do you add custom fields in WordPress?',
    variants: [
      'How do you use Advanced Custom Fields?',
      'How is post meta stored in WordPress?',
      'How do you give editors structured fields instead of one big content box?',
      'What are ACF blocks?'
    ],
    answer: `Underneath, custom fields are post meta: rows in the postmeta table keyed by post id and a meta key. I can work with them directly through register_post_meta, get_post_meta and update_post_meta, and registering them with show_in_rest exposes them to the block editor and the API.

For richer editing screens, Advanced Custom Fields is the common choice, because it gives editors proper field types, like repeaters, images, relationships and dates, with validation and conditional logic, and the field groups can live in version control as JSON so every environment matches.

In templates I escape every value on output. For anything I need to filter or sort by heavily, I am careful, because meta queries on large sites are slow; a taxonomy or a custom table can be the better model.

ACF blocks are a fast way to build custom editor blocks with a PHP template, useful when the team is stronger in PHP than React.`
  },
  {
    id: 'wp-gutenberg-blocks',
    roles: ['cms'],
    anchors: ['wordpress', 'gutenberg', 'block editor', 'block.json'],
    level: 'senior',
    question: 'How do you build a custom Gutenberg block?',
    variants: [
      'How does block development work in WordPress?',
      'What is block.json?',
      'What is the difference between a static and a dynamic block?',
      'How do you build custom blocks for the block editor?'
    ],
    answer: `I start with block.json, which describes the block: its name, attributes, supports like colour and spacing, and the scripts and styles. register_block_type reads it on the PHP side, and the build uses the official wordpress scripts package, so it is React and JSX underneath.

The edit function is what editors see in the editor, built from the block editor components like RichText, MediaUpload and InspectorControls for the sidebar settings. The save function returns the markup stored in the post.

A static block saves its HTML, which is fast, but changing the markup later needs deprecations or the editor reports invalid content. A dynamic block saves only its attributes and renders on the server with a render callback or a render.php file, which is better for anything that shows live data, like latest posts.

I keep blocks small, use supports instead of custom controls where possible, and lock patterns so editors cannot break the layout.`
  },
  {
    id: 'wp-block-themes-theme-json',
    roles: ['cms'],
    anchors: ['wordpress', 'theme.json', 'full site editing', 'block theme'],
    level: 'senior',
    question: 'What are block themes and how does theme.json work?',
    variants: [
      'What is full site editing in WordPress?',
      'What is theme.json for?',
      'How is a block theme different from a classic theme?',
      'How do you control the colour palette and typography editors can use?'
    ],
    answer: `A block theme builds the whole site, headers, footers and templates included, out of blocks, so editors can change layouts in the site editor instead of asking a developer to edit PHP. Templates and template parts are HTML files of block markup, and patterns give editors ready-made sections.

theme.json is the design system for the theme. It defines the colour palette, font families and sizes, spacing scale and layout widths, and WordPress turns them into CSS custom properties. It also controls what editors are allowed to do: I can turn off custom colours, custom font sizes or drop caps, so the site stays on brand.

A classic theme uses PHP templates and the customiser, and many sites still run on them, so I am comfortable in both. On a new build I prefer a block theme, or a hybrid, because the client gets more control with less risk of breaking the design.`
  },
  {
    id: 'wp-child-themes',
    roles: ['cms'],
    anchors: ['wordpress', 'child theme'],
    level: 'junior',
    question: 'What is a child theme and when do you use one?',
    variants: [
      'Why should you not edit a parent theme directly?',
      'How do you customise a theme so updates do not overwrite your changes?',
      'How do you create a child theme in WordPress?',
      'Child theme or custom theme, which do you choose?'
    ],
    answer: `A child theme inherits everything from a parent theme and only overrides what I change. It needs a style.css with a Template line naming the parent, and usually a functions.php that enqueues styles.

The reason is updates. If I edit a bought theme or a framework theme directly, the next update wipes my changes. In a child theme, I copy only the template files I need to change, add my CSS and hooks, and the parent can still update for security fixes.

I use one when a client is on a solid commercial or framework theme and needs adjustments. When the design is fully custom, or the parent theme is heavy and the site needs to be fast, I build a custom theme instead, because a child of a bloated theme still loads all of its code.`
  },
  {
    id: 'wp-plugin-development',
    roles: ['cms'],
    anchors: ['wordpress'],
    level: 'senior',
    question: 'How do you structure a custom WordPress plugin?',
    variants: [
      'Walk me through building a WordPress plugin.',
      'When does code belong in a plugin rather than the theme?',
      'How do you handle plugin activation and uninstall?',
      'How do you organise a large WordPress plugin?'
    ],
    answer: `Functionality goes in a plugin, presentation in the theme. If the client would lose a feature by switching themes, it belongs in a plugin.

A plugin starts with a main file and its header comment. For anything bigger than a few hooks I use classes with a namespace and Composer autoloading, a prefix on every function, option and hook name so nothing collides, and a clear split: admin screens, public output, REST routes and data access in their own classes.

register_activation_hook sets up options, roles or custom tables, using dbDelta for table changes, and stores a version so later releases can migrate. Deactivation clears scheduled events. An uninstall file removes data only when the site owner really deletes the plugin.

Every input is sanitised, every output escaped, every form has a nonce and a capability check. I make it translatable, and I add my own actions and filters so others can extend it without editing it.`
  },
  {
    id: 'wp-query',
    roles: ['cms'],
    anchors: ['wordpress', 'wp_query', 'pre_get_posts'],
    level: 'mid',
    question: 'How do you query posts efficiently in WordPress?',
    variants: [
      'What is WP_Query?',
      'What is the difference between WP_Query, get_posts and query_posts?',
      'What is pre_get_posts used for?',
      'How do you change the main query in WordPress?'
    ],
    answer: `WP_Query is the main way to fetch posts with arguments for type, taxonomy, meta, order and pagination. get_posts is a wrapper that returns an array and skips some extras. query_posts I never use, because it replaces the main query and breaks pagination and conditionals.

To change what an archive or search shows, I hook pre_get_posts and adjust the main query, checking is_main_query and not is_admin, instead of running a second query in the template.

For performance I ask only for what I need: fields set to ids when I just need ids, no_found_rows when there is no pagination, and turning off meta or term cache updates when I will not use them. I avoid posts_per_page of minus one on big sites, and I am careful with meta queries, because the postmeta table is not built for heavy filtering. After a custom loop I call wp_reset_postdata.`
  },
  {
    id: 'wp-performance',
    roles: ['cms'],
    anchors: ['wordpress'],
    level: 'senior',
    question: 'How do you make a slow WordPress site fast?',
    variants: [
      'How do you improve WordPress performance?',
      'A client says their WordPress site is slow. What do you do?',
      'How do you improve Core Web Vitals on a WordPress site?',
      'What caching do you use for WordPress?'
    ],
    answer: `I measure first. Lab and field data show what users feel, and a query profiler on the server side shows slow queries, heavy hooks and how many plugins load on each page.

The usual causes are a heavy theme or page builder, too many plugins loading scripts on every page, large unoptimised images, no page caching, and autoloaded options that grew huge.

The biggest win is full page caching, at the host or with a caching plugin, plus a CDN. Next, a persistent object cache, so repeated queries do not hit the database. Then images in modern formats with correct sizes and lazy loading, but never lazy on the hero image. After that, I load scripts and styles only where they are used, and defer non critical JavaScript.

Then the code: fix slow queries, cache expensive results with transients, clean up autoload, and replace plugins that do a small job with heavy code. I recheck the numbers after each change.`
  },
  {
    id: 'wp-security',
    roles: ['cms'],
    anchors: ['wordpress'],
    level: 'senior',
    question: 'How do you secure a WordPress site?',
    variants: [
      'What are the most common WordPress security problems?',
      'How do you harden WordPress?',
      'How do you protect WordPress forms and admin actions?',
      'What do sanitising and escaping mean in WordPress?'
    ],
    answer: `Most WordPress breaches come from outdated or abandoned plugins and weak logins, so the basics matter most: core, themes and plugins kept updated, unused ones deleted, plugins chosen from maintained sources, strong passwords with two factor for admins, and limited login attempts.

On the server: least privilege file permissions, DISALLOW_FILE_EDIT so nobody edits PHP from the dashboard, HTTPS everywhere, security keys set, XML-RPC off if not used, a web application firewall, and tested backups stored off the server.

In my own code: sanitise every input with the right function, like sanitize_text_field or absint, validate it, and escape every output for its context with esc_html, esc_attr, esc_url or wp_kses. Database queries with user input go through wpdb prepare. Every form and AJAX action checks a nonce and current_user_can, because a nonce proves intent but not permission.

Admins get only the roles they need, and I monitor file changes and login activity.`
  },
  {
    id: 'wp-rest-api',
    roles: ['cms'],
    anchors: ['wordpress', 'register_rest_route'],
    level: 'mid',
    question: 'How do you create a custom endpoint with the WordPress REST API?',
    variants: [
      'How does the WordPress REST API work?',
      'How do you use register_rest_route?',
      'How do you secure a custom WordPress REST endpoint?',
      'Should I use admin-ajax or the REST API?'
    ],
    answer: `WordPress ships a REST API under wp-json for posts, pages, users and anything registered with show_in_rest. For custom data I add routes on the rest_api_init hook with register_rest_route, giving a namespace with a version, the HTTP methods, a callback and a permission callback.

The permission callback is the important part. It checks current_user_can for the action, and I never leave it returning true on something that writes or reads private data. Arguments get a schema with types, validate and sanitize callbacks, so bad input is rejected before my code runs.

From JavaScript in the admin or a block, I call it with apiFetch, which sends the REST nonce for cookie authentication. External apps use application passwords or a token plugin.

For new work I use the REST API over admin-ajax: it has clear URLs, proper status codes, schemas, and it is cacheable for public data.`
  },
  {
    id: 'wp-headless-nextjs',
    roles: ['cms'],
    anchors: ['wordpress', 'wpgraphql'],
    level: 'senior',
    question: 'How would you build a headless WordPress site with Next.js?',
    variants: [
      'What is headless WordPress?',
      'How do you use WordPress as a backend for a React front end?',
      'What are the pros and cons of going headless with WordPress?',
      'How do you handle previews and revalidation in headless WordPress?'
    ],
    answer: `Headless means WordPress keeps the editing experience editors already know, and a separate Next.js front end renders the site, fetching content over the REST API or GraphQL.

The way I set it up: content models in WordPress with custom post types and fields exposed to the API; Next.js fetching on the server, with static generation or incremental revalidation for most pages; and a webhook from WordPress on publish that triggers on-demand revalidation, so updates appear quickly without rebuilding the whole site. Draft previews go through Next.js draft mode with an authenticated request back to WordPress. Menus, SEO fields, redirects and images all need a deliberate plan, because the theme no longer handles them.

The gains are speed, security, since WordPress can sit behind a private URL, and a modern front end. The costs are two systems to host and maintain, and losing plugins that render on the front end. So I recommend it when performance or a custom app experience justifies it, not by default.`
  },
  {
    id: 'cms-headless-vs-traditional',
    roles: ['cms'],
    anchors: ['headless cms'],
    level: 'senior',
    question: 'When would you choose a headless CMS over a traditional one?',
    variants: [
      'Headless or traditional CMS, how do you decide?',
      'What is the difference between a coupled and a decoupled CMS?',
      'How do you choose a CMS for a client project?',
      'Why would a company move to a headless CMS?'
    ],
    answer: `I start from who edits the content, where it is shown and who maintains the site after launch.

A traditional CMS like WordPress renders the pages itself. It is quick to build, editors get previews and layout control out of the box, and a small team or a single freelancer can maintain it. For most marketing sites, blogs and small business sites, that is the right answer.

A headless CMS only stores and serves content through an API, and a separate front end renders it. It fits when the same content goes to a website, a mobile app and other channels, when performance or a highly custom interface matters, or when the front end team already works in React or Next.js.

The trade-off is cost and complexity: two codebases, preview to wire up, and more developer involvement for layout changes. So I weigh budget and the team's skills as much as the technology.`
  },
  {
    id: 'cms-content-modelling',
    roles: ['cms'],
    anchors: [],
    level: 'mid',
    question: 'How do you design a content model for a CMS?',
    variants: [
      'How do you plan the content structure for a new website?',
      'What is content modelling?',
      'How do you make a CMS easy for non-technical editors?',
      'How do you stop editors from breaking the design?'
    ],
    answer: `I model content by what it is, not how one page looks. I go through the site with the client and list the real things: services, team members, case studies, locations, events. Each becomes a type with structured fields, and relationships connect them, like a case study linked to a service.

Structured fields mean the same content can show in a card, a full page, a search result or an API without copying it. Reusable pieces, like a call to action or testimonials, are their own content so editors change them in one place.

For editors, I name fields in their language, add help text, mark what is required, set image sizes and character limits, and give them layout patterns or flexible sections that are already designed. They choose and fill sections, they do not style them, so the site stays on brand.

I also plan URLs, SEO fields and how old content is migrated before building.`
  },
  {
    id: 'wp-page-builders',
    roles: ['cms'],
    anchors: ['wordpress', 'elementor', 'page builder'],
    level: 'mid',
    question: 'What do you think of page builders like Elementor?',
    variants: [
      'Elementor or custom theme development, which do you prefer?',
      'What are the downsides of page builders?',
      'When is Elementor the right choice?',
      'How do you keep an Elementor site fast?'
    ],
    answer: `I have built with Elementor and with custom themes, and I choose by the client. A page builder is the right choice when the client wants to build and change pages themselves, the budget is small, and launch speed matters more than peak performance.

The downsides are performance, because of the extra markup, CSS and JavaScript; lock in, because content is stored in the builder's own format, so leaving it means rebuilding pages; and editors breaking the design because they control everything.

When I use Elementor I set global colours and fonts, build reusable templates and sections, turn off widgets and features that are not used, use its optimised loading options, and add page caching and image optimisation.

For a site where speed, accessibility and long-term maintenance matter most, I prefer a custom theme or block theme with patterns, which gives editors flexibility inside a design they cannot break.`
  },
  {
    id: 'wp-migration',
    roles: ['cms'],
    anchors: ['wordpress', 'wp-cli'],
    level: 'mid',
    question: 'How do you migrate a WordPress site to a new host or domain?',
    variants: [
      'How do you move WordPress from staging to production?',
      'How do you change the domain of a WordPress site?',
      'Why can a simple find and replace break a WordPress database?',
      'How do you migrate a WordPress site without downtime?'
    ],
    answer: `I take a full backup first: the database and wp-content, which holds uploads, themes and plugins. Then I copy both to the new server, import the database and update wp-config with the new credentials.

The domain change needs care. WordPress stores some values as serialised PHP, where the string length is saved with the text, so a plain SQL find and replace corrupts them. I use WP-CLI search-replace, which handles serialised data, or a migration plugin that does the same, and I run it as a dry run first.

Then I check permalinks, flush rewrite rules, clear caches, test forms, emails, logins, cron and any payment or API keys that are tied to the domain, and set up 301 redirects if URLs changed.

For no downtime I prepare everything on the new host, test it through a hosts file entry, lower the DNS TTL beforehand, freeze content edits briefly, sync the final changes, then switch DNS.`
  },
  {
    id: 'wp-database-structure',
    roles: ['cms'],
    anchors: ['wordpress', 'wpdb'],
    level: 'mid',
    question: 'How is the WordPress database structured?',
    variants: [
      'What tables does WordPress use?',
      'What is the autoload column in wp_options?',
      'When would you create a custom table in WordPress?',
      'How do you run a safe custom SQL query in WordPress?'
    ],
    answer: `The core is a small set of MySQL tables. wp_posts holds every content type, posts, pages, attachments, menu items and custom types, told apart by post_type. wp_postmeta holds key value fields for them. Users and usermeta work the same way, terms and term relationships handle taxonomies, comments have their own tables, and wp_options stores site settings.

In wp_options, rows marked autoload load on every request. Plugins that autoload large data slow the whole site, so it is one of the first things I check on a slow site.

The flexible meta design is easy to extend but poor for large, filtered data like orders or bookings with many fields. There I create a custom table with proper columns and indexes, created with dbDelta on activation.

Custom SQL goes through the global wpdb object, always using wpdb prepare for any value that comes from outside, and the table prefix instead of hardcoded names.`
  },
  {
    id: 'wp-dev-workflow',
    roles: ['cms'],
    anchors: ['wordpress', 'wp-cli'],
    level: 'senior',
    question: 'What does your WordPress development and deployment workflow look like?',
    variants: [
      'How do you version control a WordPress site?',
      'How do you manage local, staging and production for WordPress?',
      'Do you edit WordPress sites directly on the live server?',
      'How do you deploy changes to a WordPress site?'
    ],
    answer: `I never edit on the live server. I develop locally in a container based environment, with my custom theme and plugins in Git. WordPress core and uploads stay out of the repository, and third party plugins are either managed with Composer or tracked by version so every environment matches.

There are three environments: local, staging with a recent copy of production, and production. Changes go through a pull request, get tested on staging, and deploy through a pipeline or a deploy tool that pushes code only, never the database, because production content keeps changing.

Configuration differs per environment through wp-config and environment variables, so keys and debug settings are never committed. WP-CLI does the repeatable work: updates, search and replace, cache flushes, and running data migrations.

Before updates I take a backup, update on staging first and check the important pages and forms, then roll out to production.`
  },
  {
    id: 'wp-enqueue-assets',
    roles: ['cms'],
    anchors: ['wordpress', 'wp_enqueue_script'],
    level: 'junior',
    question: 'How do you add CSS and JavaScript to a WordPress theme correctly?',
    variants: [
      'Why use wp_enqueue_script instead of a script tag?',
      'How do you load a script only on one page in WordPress?',
      'How do you pass PHP data to JavaScript in WordPress?',
      'How do you avoid loading jQuery twice in WordPress?'
    ],
    answer: `I register and enqueue them on the wp_enqueue_scripts hook, or admin_enqueue_scripts for the dashboard, with wp_enqueue_style and wp_enqueue_script, never a hardcoded tag in header.php.

Enqueuing lets WordPress handle dependencies, so jQuery or another library loads once and in the right order, lets caching and optimisation plugins work with the files, and lets child themes or other plugins remove or replace them.

I pass a version, often the file's modified time or the theme version, so browsers pick up changes. Scripts load in the footer or with the defer strategy, which WordPress supports directly now.

To keep pages light I enqueue conditionally: a slider script only on the templates that use it, checked with is_page_template or has_block. To pass data from PHP, like a REST URL and a nonce, I use wp_add_inline_script or wp_localize_script.`
  },
  {
    id: 'wp-cron',
    roles: ['cms'],
    anchors: ['wordpress', 'wp-cron'],
    level: 'mid',
    question: 'How does WP-Cron work and what are its problems?',
    variants: [
      'How do you schedule tasks in WordPress?',
      'Why do scheduled WordPress events not run on time?',
      'How do you replace WP-Cron with a real cron job?',
      'How do you run background jobs in WordPress?'
    ],
    answer: `WP-Cron is not a real scheduler. It checks for due events when someone visits the site, so on a quiet site tasks run late, and on a busy one the check adds work to page loads.

I schedule with wp_schedule_event on activation, checking wp_next_scheduled first so I never add duplicates, attach my function to the event's hook, and clear it on deactivation.

On any site where timing matters, like sending reminders or syncing with an API, I set DISABLE_WP_CRON to true and run WP-Cron from a real server cron or the host's scheduler on a fixed schedule, so it runs on time and not during a visitor's request.

For heavy or long jobs, like importing a large product catalogue, I split the work into batches with a queue library, so each run is short, failures can retry and nothing times out.`
  },
  {
    id: 'wp-debugging',
    roles: ['cms'],
    anchors: ['wordpress', 'wp_debug', 'query monitor'],
    level: 'mid',
    question: 'How do you debug a WordPress site?',
    variants: [
      'A WordPress site shows a white screen. What do you do?',
      'How do you find which plugin is causing an error?',
      'What is WP_DEBUG?',
      'How do you troubleshoot a critical error in WordPress?'
    ],
    answer: `First I read the error instead of guessing. I turn on WP_DEBUG with WP_DEBUG_LOG and WP_DEBUG_DISPLAY off, so errors go to the debug log and not to visitors, and I check the server's PHP error log. The critical error email from WordPress also names the failing plugin or theme.

If it is not clear, I reproduce it on staging and isolate: switch to a default theme, then deactivate plugins and turn them back on one by one. On a broken live site I can rename a plugin folder to disable it, or use WP-CLI with plugins skipped.

A query profiler plugin shows slow or failing database queries, which hooks ran, PHP errors and HTTP API calls per page, which is the fastest way to find performance and logic problems.

Once I find the cause, I fix it at the source or update the plugin, and check the PHP version compatibility, since many white screens are a plugin that does not support the server's PHP version.`
  },
  {
    id: 'wp-seo',
    roles: ['cms'],
    anchors: ['wordpress', 'yoast', 'rank math'],
    level: 'mid',
    question: 'How do you handle SEO on a WordPress site?',
    variants: [
      'What do you set up for SEO when you build a WordPress site?',
      'Yoast or Rank Math, how do you use them?',
      'How do you add structured data in WordPress?',
      'How do you protect SEO when you redesign a WordPress site?'
    ],
    answer: `Technical SEO starts with the build: clean semantic HTML with one h1 per page, proper heading order, fast pages, mobile first layouts, descriptive alt text and readable permalinks.

An SEO plugin handles titles and meta descriptions per page, an XML sitemap, canonical URLs, Open Graph tags, and schema markup such as organisation, article or local business. I set sensible templates for each post type so editors only override when they need to, and I turn off index for thin archives like tag or attachment pages.

On a redesign or migration, I crawl the old site first, keep URLs where possible, and map every changed URL to a 301 redirect, because broken links lose rankings. Then I submit the sitemap to the search engines and watch coverage and errors for the following weeks.

Speed is part of it too, since Core Web Vitals feed into ranking.`
  },
  {
    id: 'wp-maintenance-plugins',
    roles: ['cms'],
    anchors: ['wordpress'],
    level: 'mid',
    question: 'How do you choose and maintain plugins on a WordPress site?',
    variants: [
      'How do you decide whether to use a plugin or write custom code?',
      'How do you vet a WordPress plugin before installing it?',
      'How do you handle WordPress updates safely?',
      'How many plugins is too many?'
    ],
    answer: `The number of plugins matters less than their quality. One bad plugin can slow or break a site, while many good ones can be fine.

Before installing one I check when it was last updated, whether it supports the current WordPress and PHP versions, how many active installs and support threads it has, and what it loads on the front end. If it is a big plugin used for one small feature, I write the small feature myself.

For maintenance I keep a staging copy, take backups before updates, update on staging first, check the key pages, forms and checkout, then update production. Minor and security updates go out quickly; major versions get more testing. I remove plugins that are inactive or abandoned, and keep a short note of what each plugin does and why it is there.`
  },
  {
    id: 'wp-woocommerce',
    roles: ['cms'],
    anchors: ['woocommerce'],
    level: 'senior',
    question: 'How do you customise WooCommerce?',
    variants: [
      'How do you change the WooCommerce checkout?',
      'How do you override WooCommerce templates?',
      'How do you make a WooCommerce store fast?',
      'What is HPOS in WooCommerce?'
    ],
    answer: `I customise WooCommerce through its hooks first. It fires actions and filters at almost every point of the product page, cart and checkout, so I can add fields, change prices or move sections without copying templates.

When markup must change, I override templates by copying them into the theme's woocommerce folder, as few as possible, because each override has to be checked when WooCommerce updates its templates. Custom checkout fields are validated and saved to the order, and payments go through the gateway's own plugin with webhooks verified on the server.

For speed, I make sure cart fragments and WooCommerce scripts only load on shop pages, exclude cart, checkout and account pages from page caching, use an object cache, and keep large catalogues on good hosting.

High performance order storage moves orders from posts and postmeta into their own tables, which is much faster, so new code should use the order API, not post meta directly.`
  },
  {
    id: 'wp-multisite',
    roles: ['named'],
    anchors: ['multisite'],
    level: 'senior',
    question: 'When would you use WordPress Multisite?',
    variants: [
      'What is WordPress Multisite?',
      'What are the drawbacks of Multisite?',
      'Multisite or separate WordPress installs, how do you decide?',
      'How do plugins and users work across a Multisite network?'
    ],
    answer: `Multisite runs many sites from one WordPress install, one codebase and one database, with a network admin above the site admins. It fits when an organisation runs many similar sites, like branches, campuses or regional sites, that share the same theme and plugins and the same team manages them.

Users are shared across the network and given roles per site. Themes and plugins are installed once; a plugin can be network activated for every site or activated per site. Each site gets its own content tables.

The drawbacks: one bad plugin or update affects every site, not every plugin supports Multisite, moving a single site out later is real work, and hosting and backups are all or nothing.

If the sites are very different, owned by different clients, or need different plugins, separate installs managed with a shared deployment are safer.`
  },
  {
    id: 'cms-hosted-headless',
    roles: ['named'],
    anchors: ['sanity', 'strapi', 'contentful', 'storyblok'],
    level: 'mid',
    question: 'How do Sanity, Strapi and Contentful compare as headless CMS options?',
    variants: [
      'What do you know about Sanity?',
      'What is Strapi and when would you use it?',
      'How does Contentful work with Next.js?',
      'Which headless CMS would you pick for a Next.js site?'
    ],
    answer: `They solve the same problem, structured content served over an API, with different trade-offs.

Contentful is a hosted service with a polished editor, strong roles and localisation, and REST and GraphQL APIs. It suits larger teams, but pricing rises quickly with content types, users and locales.

Sanity is also hosted for the content, but the editing studio is a React app you configure in code, so the schema lives in the repository and the editor can be customised deeply. It queries with GROQ and has real time collaboration.

Strapi is open source and self hosted on Node.js with your own database. You own the data and the cost, but you also own hosting, upgrades and security.

With Next.js the pattern is the same for all three: fetch on the server, revalidate on a publish webhook, use draft mode for previews, and generate types from the schema. My choice depends on budget, who hosts it and how much the editor needs customising.`
  }
];
