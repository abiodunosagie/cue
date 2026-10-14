// Adobe Experience Manager (AEM): architecture, Sling, JCR, OSGi, components,
// the Maven project, the front end build, the dispatcher, headless delivery,
// multi-site, Cloud Manager and Edge Delivery Services. Role 'named': these
// answers only come up when the question names AEM or one of its parts, never on
// generic CMS, Java or caching words. The candidate has studied AEM but not
// shipped it for a client, so the answers explain how it works and never claim
// a project; the experience question leads with his closest real work.
// Anchors are AEM's own names only: words like dispatcher, run mode or live
// copy also mean other things, so they never pull an AEM answer on their own.
// Speech to text writes AEM several ways.
const AEM = ['aem', 'aems', 'a e m', 'a.e.m', 'adobe experience manager'];

module.exports = [
  {
    id: 'aem-experience',
    roles: ['named'],
    anchors: AEM,
    level: 'mid',
    question: 'Have you worked with Adobe Experience Manager?',
    variants: [
      'What is your experience with AEM?',
      'Have you worked with AEM?',
      'Any AEM in your background?',
      'How comfortable are you with Adobe Experience Manager?',
      'Have you built anything on AEM?',
      'How would you ramp up on an AEM project?'
    ],
    answer: `My content platform work is WordPress sites for clients since 2018, and admins I built where editors change a draft and publish it when it is ready, like the Communitee landing page. That draft and publish split is the same idea as AEM's author and publish tiers. AEM itself I have studied rather than run for a client.

I know how it fits together: authors edit on the author tier, content is published to publish instances behind the dispatcher and the CDN, Sling maps each URL to a resource and its component, and components are HTL templates backed by Sling Models in Java. The project is a Maven build with a Webpack front end module that produces the client libraries.

An AEM project is a Java, Maven and Node.js build, which I can work in. I would ramp up by reading the project's archetype modules and running it locally, then picking small backlog items and pairing with the team's AEM engineers.`
  },
  {
    id: 'aem-architecture',
    roles: ['named'],
    anchors: AEM,
    level: 'mid',
    question: 'Explain the AEM architecture: author, publish and dispatcher.',
    variants: [
      'What is the difference between the author and publish tiers in AEM?',
      'How does content get from author to publish in AEM?',
      'Walk me through how an AEM page reaches the visitor.',
      'What sits in front of AEM publish?'
    ],
    answer: `AEM runs in tiers. The author tier is where editors create and manage pages, assets and content fragments, behind a login. When they publish, the replication service sends that content to the publish tier, which renders pages and APIs for visitors.

In AEM as a Cloud Service, publishing works through queues, so author does not need to know how many publish nodes exist and publish can scale out with traffic. Each publish instance has its own copy of published content and is paired with an Apache web server running the dispatcher, which caches rendered pages and filters requests. The dispatcher is the origin for the Adobe-managed CDN.

So a visitor normally gets the page from the CDN, then the dispatcher cache, and only reaches the publish JVM on a miss. There is also a preview tier for checking content before it goes live.`
  },
  {
    id: 'aem-cloud-vs-65',
    roles: ['named'],
    anchors: [...AEM, 'aemaacs'],
    level: 'senior',
    question: 'What changes between AEM 6.5 and AEM as a Cloud Service?',
    variants: [
      'How is AEM as a Cloud Service different from on-premise AEM?',
      'What is new in AEM Cloud Service for developers?',
      'What do you need to know when moving from AEM 6.5 to the cloud?',
      'Why is /apps immutable in AEM as a Cloud Service?'
    ],
    answer: `The biggest change is that code becomes immutable. In AEM as a Cloud Service, code and configuration are baked into an image built by a Cloud Manager pipeline, and every author and publish node runs that same image. You never install a package on a running instance, so /apps and /libs cannot be changed at runtime, while /content and /conf stay mutable.

Because of that, things you used to do by hand move into code: OSGi configurations live in the repository with run modes like config.publish.prod, and service users, ACLs and paths are created with repoinit scripts. Deployments are rolling, so old and new code run side by side and changes must stay backward compatible.

Scaling is automatic, binaries go to cloud storage instead of through the JVM, and the old replication agents are replaced by a publish and subscribe service. Locally you develop against the AEM SDK quickstart.`
  },
  {
    id: 'aem-sling-resolution',
    roles: ['named'],
    anchors: [...AEM, 'sling', 'apache sling', 'sling:resourcetype', 'sling:resourcesupertype'],
    level: 'senior',
    question: 'How does Apache Sling resolve a request to a script in AEM?',
    variants: [
      'Explain Sling resolution.',
      'How does AEM decide which component renders a URL?',
      'What are selectors and suffixes in a Sling URL?',
      'How does sling:resourceSuperType work?'
    ],
    answer: `Sling is resource first. It takes the URL, finds the longest path that exists in the repository, and treats the rest as selectors, the extension and an optional suffix. In /content/site/page.mobile.html/extra, the resource is the page, mobile is a selector, html the extension and /extra the suffix.

Then it reads the resource's sling:resourceType, which points to a component, and looks for the script or servlet that matches best: more matching selectors and the extension win, then the closest resource type, then service ranking. Scripts are searched in /apps before /libs, which is how a project overlays product code.

If the component has no match, Sling walks up sling:resourceSuperType, so a proxy component inherits everything from a core component. At the bottom is sling/servlet/default. Servlets can also be registered on a fixed path, but registering by resource type is preferred because it respects access control.`
  },
  {
    id: 'aem-sling-models',
    roles: ['named'],
    anchors: [...AEM, 'sling model', 'sling models', 'valuemapvalue', 'osgiservice'],
    level: 'mid',
    question: 'What are Sling Models and how do you write one?',
    variants: [
      'How does a Sling Model get its data?',
      'Explain the @Model annotation.',
      'What does @ValueMapValue do?',
      'How do you connect a Sling Model to an HTL template?'
    ],
    answer: `A Sling Model is a plain Java class that turns a resource or request into data a template can use, so logic stays out of the markup.

You annotate the class with @Model, set adaptables to Resource or SlingHttpServletRequest, expose it through an interface with adapters, and bind it to the component with resourceType. Fields are injected: @ValueMapValue reads a property the author saved in the dialog, @Self gives you the adaptable, and @OSGiService gives you a service. Setting defaultInjectionStrategy to OPTIONAL keeps a missing property from failing the whole model. Anything computed goes in a @PostConstruct method.

HTL loads it with data-sly-use and calls getters without the get prefix. Models can also implement ComponentExporter so the same component is available as JSON. I would unit test them with AEM Mocks, loading sample content into the context and asserting what the getters return.`
  },
  {
    id: 'aem-htl',
    roles: ['named'],
    anchors: [...AEM, 'htl', 'sightly', 'data-sly-use', 'data-sly'],
    level: 'mid',
    question: 'What is HTL and how is it different from JSP?',
    variants: [
      'Explain HTL in AEM.',
      'What is Sightly?',
      'How do data-sly attributes work?',
      'Why does AEM use HTL instead of JSP?'
    ],
    answer: `HTL, formerly called Sightly, is AEM's server-side template language. It is plain HTML with data-sly attributes and expressions, so front end developers can read it and the logic has to live in Java or JavaScript use objects, not in the template.

data-sly-use loads a Sling Model, data-sly-test shows an element only when a condition is true, data-sly-list and data-sly-repeat loop, data-sly-resource includes another component, data-sly-template and data-sly-call define reusable snippets, and expressions look like dollar-brace with options such as join or format.

The main advantage over JSP is security. HTL escapes output by default based on context, so a value printed in an attribute, a URL or text is escaped correctly without the developer remembering to do it, which closes most cross-site scripting bugs. It also stops people putting business logic in templates, which keeps components testable.`
  },
  {
    id: 'aem-jcr',
    roles: ['named'],
    anchors: [...AEM, 'jcr', 'apache oak', 'crxde'],
    level: 'mid',
    question: 'What is the JCR and how is content stored in AEM?',
    variants: [
      'Explain the Java Content Repository.',
      'What is Apache Oak in AEM?',
      'What is the difference between /apps, /libs, /content and /conf?',
      'How are nodes and properties used in AEM?'
    ],
    answer: `AEM stores everything in a Java Content Repository, implemented by Apache Oak. It is a tree of nodes with properties, so a page is a node, its components are child nodes, and what an author typed into a dialog is stored as properties on them. Node types define what a node may hold.

The top folders have clear jobs. /libs is Adobe's product code and is never edited. /apps is the project's code: components, templates, client libraries. /content holds pages and assets, /conf holds editable templates, policies and configuration, and /var holds runtime data.

Because content is a tree, permissions are ACLs on paths, queries go through Oak indexes, and slow queries usually mean a missing index. In the cloud, binaries sit in cloud blob storage and the repository keeps the references. Locally you browse the tree in CRXDE Lite.`
  },
  {
    id: 'aem-osgi',
    roles: ['named'],
    anchors: [...AEM, 'osgi', 'apache felix'],
    level: 'mid',
    question: 'What is OSGi and how is it used in AEM?',
    variants: [
      'Explain OSGi bundles and services.',
      'How do you configure an OSGi service per environment?',
      'What are run modes in AEM?',
      'How do you write an OSGi component in AEM?'
    ],
    answer: `OSGi is the module system AEM runs on, Apache Felix underneath. Java code ships as bundles, each declaring which packages it exports and imports, and bundles can be started or replaced without restarting the server.

Inside a bundle you write components with the @Component annotation, and they can provide services other code asks for with @Reference, or inside a Sling Model with @OSGiService. Configuration is defined with an @ObjectClassDefinition interface, bound to the component with @Designate and read in its @Activate method, so the same code behaves differently per environment.

Environments are chosen with run modes. Configuration files live in the project's ui.config module in folders like config.author or config.publish.prod, and the folder with the most matching run modes wins. It is dependency injection and environment config, with the container also managing module versions.`
  },
  {
    id: 'aem-component',
    roles: ['named'],
    anchors: [...AEM, 'cq:dialog', 'cq:component'],
    level: 'mid',
    question: 'How do you build a custom component in AEM?',
    variants: [
      'Walk me through creating an AEM component.',
      'What files make up an AEM component?',
      'What are AEM Core Components and proxy components?',
      'How do you add a dialog to an AEM component?'
    ],
    answer: `A component is a folder under /apps with a cq:Component node. Its title and componentGroup control where authors find it, and sling:resourceSuperType lets it inherit from another component. Next to it sits an HTL file with the same name as the folder, a cq:dialog built from Granite UI fields that defines what authors can edit, and optionally a design dialog for template policies.

The logic goes in a Sling Model bound to the component's resource type, and the HTL loads it with data-sly-use. Styles and scripts come from the front end module through a client library.

Adobe recommends starting from the Core Components rather than writing from scratch. You create a proxy component in your own app that points to the core component through sling:resourceSuperType, so you get their accessibility, JSON export and upgrades, and only override what the design needs. Unit tests for the model use AEM Mocks.`
  },
  {
    id: 'aem-archetype',
    roles: ['named'],
    anchors: [...AEM, 'ui.apps', 'ui.frontend', 'ui.content', 'ui.config'],
    level: 'senior',
    question: 'How is an AEM Maven project structured?',
    variants: [
      'What is the AEM project archetype?',
      'Explain the modules in an AEM project.',
      'How do Maven and Node.js fit together in AEM?',
      'How do you build and deploy an AEM project locally?'
    ],
    answer: `Most AEM projects start from Adobe's project archetype, a Maven template. You give it the app name and Java package, and set the AEM version to cloud.

It is a multi-module Maven build. core is the Java OSGi bundle with Sling Models, servlets, schedulers and services. ui.apps holds /apps: components, templates and client libraries. ui.content holds sample content and ui.config the OSGi configurations per run mode. ui.frontend is a Webpack and TypeScript build that npm runs during the Maven build and that writes its output into ui.apps as client libraries. dispatcher holds the web server and cache configuration, it.tests and ui.tests hold integration and browser tests, and all embeds every package into one deployable package.

Locally you run mvn clean install with an autoInstall profile against the SDK quickstart. In the cloud, Cloud Manager runs the same Maven build, so a pipeline failure is something you can reproduce on your machine.`
  },
  {
    id: 'aem-clientlibs',
    roles: ['named'],
    anchors: [...AEM, 'clientlib', 'clientlibs', 'ui.frontend'],
    level: 'mid',
    question: 'How does front end code get into AEM through client libraries?',
    variants: [
      'What are clientlibs in AEM?',
      'How does the ui.frontend module work?',
      'How do you add CSS and JavaScript to an AEM site?',
      'How do you develop the front end of an AEM site locally?'
    ],
    answer: `AEM serves CSS and JavaScript through client libraries, folders with a category that a page or template includes, and AEM combines and minifies their files.

In an archetype project the source lives in ui.frontend, TypeScript and Sass compiled by Webpack. There are dev and production builds, and a Webpack dev server that proxies a local AEM, so you can style components without redeploying. After the build, aem-clientlib-generator copies the output into ui.apps as clientlib-site and clientlib-dependencies, and the page policy on the template includes those categories.

The Maven build runs the npm build through the frontend Maven plugin, so one mvn command builds Java and front end together. So a front end developer can work on it without touching the Java side.`
  },
  {
    id: 'aem-dispatcher',
    roles: ['named'],
    anchors: [...AEM, 'statfile', 'statfileslevel'],
    level: 'senior',
    question: 'How does the AEM dispatcher cache and invalidate content?',
    variants: [
      'What is the dispatcher in AEM?',
      'How does the dispatcher cache work?',
      'How do you clear the dispatcher cache after publishing?',
      'How do dispatcher filters protect AEM?',
      'Why is a page not updating on the live AEM site?'
    ],
    answer: `The dispatcher is AEM's module for the Apache web server in front of each publish instance. It caches rendered responses as files in the document root, laid out like the URL, and only GET and HEAD requests with an extension and no query string are cached by default.

Invalidation is triggered by publishing. AEM sends an invalidation request, the dispatcher deletes the changed files and touches a stat file, and with auto invalidation any cached file older than the nearest stat file is fetched again on the next request. The statfileslevel setting controls how far up the tree that reaches, so one page change does not empty the whole site.

Filters are the security side: deny everything by default and allow only the paths, selectors and extensions the site needs, so visitors cannot reach system paths. When a page will not update, I check the CDN headers first, then the dispatcher cache file and its stat file, then whether the content was actually published.`
  },
  {
    id: 'aem-headless',
    roles: ['named'],
    anchors: [...AEM, 'content fragment model', 'content fragment models'],
    level: 'senior',
    question: 'How does headless content delivery work in AEM?',
    variants: [
      'What are Content Fragments and Content Fragment Models?',
      'How do you use GraphQL with AEM?',
      'Why use persisted queries in AEM?',
      'How would a React or mobile app read content from AEM?'
    ],
    answer: `For headless use, content is modelled without layout. A Content Fragment Model defines the fields, much like a schema, and authors create Content Fragments from it, which are stored as assets.

Apps read them through AEM's GraphQL API. The recommended way is persisted queries: the query is saved on AEM, under the project's configuration, and the app calls it with a GET request to /graphql/execute.json followed by the configuration and query name, with variables after semicolons. Because it is a GET, the response can be cached by the dispatcher and the CDN, with cache-control and surrogate-control headers you can set per query. Plain GraphQL POST requests are hard to cache, so they are best kept for development.

On the client side, Adobe's headless client SDK handles the URL encoding. Any web or mobile client calls it like any typed content API, with the cache in front doing most of the work.`
  },
  {
    id: 'aem-fragments',
    roles: ['named'],
    anchors: [...AEM, 'experience fragment', 'experience fragments'],
    level: 'mid',
    question: 'What is the difference between Experience Fragments and Content Fragments?',
    variants: [
      'When would you use an Experience Fragment?',
      'Content Fragment or Experience Fragment, which one and why?',
      'How do you reuse a header or footer across AEM pages?',
      'Where do reusable page parts go in AEM?'
    ],
    answer: `The difference is presentation. A Content Fragment is structured content with no layout, fields defined by a model, so the same text and data can go to a web page, an app or another channel through GraphQL or JSON.

An Experience Fragment is a group of components with their layout and styling, a ready-made piece of a page. It is the right tool for things like a header, a footer or a promotional banner that should look the same on many pages and be edited in one place. Experience Fragments can have variations, for example per channel, and they can be exported for personalisation tools.

So my rule would be: if the question is what is the content, use a Content Fragment; if the question is what does this block look like everywhere, use an Experience Fragment. Pages then include either through the matching Core Component.`
  },
  {
    id: 'aem-templates',
    roles: ['named'],
    anchors: [...AEM, 'editable template', 'editable templates'],
    level: 'mid',
    question: 'How do editable templates and policies work in AEM?',
    variants: [
      'What are editable templates in AEM?',
      'What is a content policy in AEM?',
      'How do you control which components authors can use on an AEM page?',
      'How do page policies work in AEM?'
    ],
    answer: `Editable templates are created and changed by template authors in the template editor, not hard-coded by developers, and they live under /conf rather than /apps.

A template has three parts. The structure is what every page gets and authors cannot change, like the header and footer. Initial content is what a new page starts with but authors may edit. The layout defines the responsive grid.

Policies are the rules attached to the template and its containers: which components authors are allowed to place in a container, which styles they can pick, and which client libraries the page loads. That is how a team keeps a site consistent while authors stay independent. Because templates and policies live under /conf, they are content, so they can differ per site without a code deployment.`
  },
  {
    id: 'aem-msm',
    roles: ['named'],
    anchors: [...AEM, 'msm', 'multi site manager', 'multi-site manager'],
    level: 'senior',
    question: 'How does Multi Site Manager work in AEM?',
    variants: [
      'What is a live copy in AEM?',
      'How would you run sites for several countries in AEM?',
      'What happens when you cancel inheritance on a live copy?',
      'How do rollouts work in AEM?'
    ],
    answer: `Multi Site Manager lets you write content once and reuse it across sites. The source is the blueprint, and each copy is a live copy that keeps a live relationship with it.

Rollout configurations decide when and how changes flow, for example copying content when the source page is activated. Authors can roll out from the blueprint or synchronise a single live copy. On a live copy you can suspend inheritance for a page, or cancel inheritance on one component so local edits stay, while the rest of the page keeps updating. Detach removes the relationship for good.

For several countries, the usual setup is language masters, one branch per language, with regional sites as live copies of them, like us/en and ca/en from the English master. MSM handles structure and reuse; translation is a separate step.`
  },
  {
    id: 'aem-cloud-manager',
    roles: ['named'],
    anchors: [...AEM, 'adobe cloud manager', 'repoinit'],
    level: 'senior',
    question: 'How do deployments work in AEM as a Cloud Service?',
    variants: [
      'What is Cloud Manager?',
      'How does the AEM CI/CD pipeline work?',
      'How do you create service users and ACLs in AEM Cloud?',
      'How do you test a change quickly in AEM Cloud Service?'
    ],
    answer: `Cloud Manager is the only way to deploy code to the dev, stage and production environments. A pipeline takes the Git repository and runs the Maven build. It combines the packages with Adobe's latest baseline image. Then it checks the result with code quality rules, security and performance tests, and the project's own functional and UI tests on stage before production. Deployments are rolling, so there is no downtime, which also means the new code must work alongside the old.

Things that used to be done by hand go into code: OSGi configurations with run modes, and service users, groups, paths and ACLs in repoinit scripts, which run at startup and are safe to run again. Mutable content under /content and /conf deploys separately and has no automatic rollback.

For fast feedback there is the local SDK, and a Rapid Development Environment where you can sync changes without a full pipeline. My CI habit transfers: the same build runs locally and in the pipeline, and a red build stops the release.`
  },
  {
    id: 'aem-edge-delivery',
    roles: ['named'],
    anchors: [...AEM, 'edge delivery services'],
    level: 'mid',
    question: 'What is AEM Edge Delivery Services?',
    variants: [
      'How do you build a site on Edge Delivery Services?',
      'What are blocks in AEM Edge Delivery?',
      'What is the difference between Edge Delivery and classic AEM Sites?',
      'How does document-based authoring work in AEM?'
    ],
    answer: `Edge Delivery Services is Adobe's newer, performance-first way to deliver AEM sites. The code is a GitHub repository, usually from the aem-boilerplate template, connected with the AEM Code Sync app. Content comes from document authoring, Google Docs or SharePoint, or from AEM through the Universal Editor, and a serverless layer turns it into semantic HTML served from the CDN.

Development is plain front end work. Each block is a folder with a JavaScript decorate function and a CSS file that turn the generated markup into the component. You run it locally with the AEM CLI and aem up on port 3000, and every push updates the preview on aem.page and the live site on aem.live.

Compared with classic AEM Sites there is no Java, no Sling Models and no dispatcher to manage, and the focus is Lighthouse scores near 100. The two can run on the same domain, page by page.`
  },
  {
    id: 'aem-testing',
    roles: ['named'],
    anchors: [...AEM, 'aemcontext', 'wcm.io'],
    level: 'mid',
    question: 'How do you test AEM code?',
    variants: [
      'How do you unit test a Sling Model?',
      'What is AEM Mocks?',
      'What tests does an AEM project have?',
      'How do you write tests for AEM?'
    ],
    answer: `There are three layers in an archetype project. Unit tests in the core module test Sling Models, servlets and services with JUnit 5 and AEM Mocks from wcm.io. You create an AemContext, load a small piece of JSON content into the mock repository, set the current resource, adapt it to the model and assert on the getters. Services can be registered into the context, and Mockito covers the rest.

Integration tests in it.tests run HTTP calls against a running AEM, and ui.tests run browser tests, both of which Cloud Manager can run in the pipeline along with its own quality and performance checks.

I would work the same way as on any codebase: a regression test for every bug fixed, model logic covered by fast unit tests, and the pipeline blocks the merge when they fail.`
  }
];
