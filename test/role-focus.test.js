const test = require('node:test');
const assert = require('node:assert/strict');
const { detectRoleFocus, resolveRoleFocus, normalizeRoleFocus, FOCUS_RULES } = require('../renderer/role-focus');
const { rulesWithFocus } = require('../src/role-focus');
const { MAX_AI_RULES_CHARS, MAX_RULES_WITH_FOCUS_CHARS, appendAiRules } = require('../src/profile-context');

test('a Flutter posting reads as mobile, a full stack one as full stack', () => {
  assert.equal(detectRoleFocus('Mobile Developer (Flutter), IndexRide Technologies Limited, Lagos. The role is Flutter mobile development.'), 'mobile');
  assert.equal(detectRoleFocus('Mobile Full Stack Developer, Out of the Box Systems. Flutter and Rust.'), 'fullstack');
  assert.equal(detectRoleFocus('We need a full-stack engineer'), 'fullstack');
});

test('one server word in a mobile posting stays mobile; two make it full stack', () => {
  assert.equal(detectRoleFocus('Flutter developer. You will work with our Node.js team and integrate REST APIs.'), 'mobile');
  assert.equal(detectRoleFocus('Flutter developer who will also build the REST APIs in Node.js.'), 'fullstack');
  assert.equal(detectRoleFocus('Android engineer. Backend development with PostgreSQL is part of the job.'), 'fullstack');
});

test('a CMS title reads as cms, even when it also says web developer', () => {
  assert.equal(detectRoleFocus('WordPress Developer. Build custom themes and plugins.'), 'cms');
  assert.equal(detectRoleFocus('Senior WordPress Web Developer, remote. React a plus.'), 'cms');
  assert.equal(detectRoleFocus('Headless CMS Engineer for our Next.js sites.'), 'cms');
  assert.equal(detectRoleFocus('Front end developer. Some WordPress experience is a plus.'), 'frontend');
  assert.equal(detectRoleFocus('CMS Developer\nRemote. Maintain our content platform.'), 'cms');
  assert.equal(detectRoleFocus('Role: CMS Engineer. Content platform work.'), 'cms');
  assert.equal(detectRoleFocus('Looking for a React developer. Experience working with a CMS developer team. Next.js, Node.js'), 'frontend');
  assert.equal(detectRoleFocus('Flutter developer; integrate with our CMS developer portal.'), 'mobile');
  assert.equal(detectRoleFocus('Backend engineer. Maintain our cms developer tools. Node.js, PostgreSQL, microservices.'), 'backend');
  assert.equal(resolveRoleFocus({ roleFocus: 'cms', jobDescription: 'React developer' }), 'cms');
  assert.equal(normalizeRoleFocus('cms'), 'cms');
});

test('an empty or unrelated description gives no focus', () => {
  assert.equal(detectRoleFocus(''), null);
  assert.equal(detectRoleFocus('   '), null);
  assert.equal(detectRoleFocus(undefined), null);
  assert.equal(detectRoleFocus('Accountant, Port Harcourt'), null);
});

test('a hand-set focus wins over the job description; unknown values mean auto', () => {
  assert.equal(resolveRoleFocus({ roleFocus: 'mobile', jobDescription: 'Full stack engineer' }), 'mobile');
  assert.equal(resolveRoleFocus({ roleFocus: 'fullstack', jobDescription: 'Flutter developer' }), 'fullstack');
  assert.equal(resolveRoleFocus({ roleFocus: 'auto', jobDescription: 'Flutter developer' }), 'mobile');
  assert.equal(resolveRoleFocus({ roleFocus: '', jobDescription: 'Flutter developer' }), 'mobile');
  assert.equal(normalizeRoleFocus('devops'), 'auto');
  assert.equal(normalizeRoleFocus('frontend'), 'frontend');
  assert.equal(resolveRoleFocus({ roleFocus: 'backend', jobDescription: 'Flutter developer' }), 'backend');
  assert.equal(resolveRoleFocus({}), null);
});

test('the focus line follows the rules, even when the rules use the whole limit', () => {
  assert.equal(rulesWithFocus({ aiRules: ' Be brief. ', jobDescription: '' }), 'Be brief.');
  assert.equal(rulesWithFocus({ aiRules: '', roleFocus: 'mobile' }), FOCUS_RULES.mobile);
  assert.equal(rulesWithFocus({ aiRules: 'Be brief.', roleFocus: 'fullstack' }), 'Be brief.\n' + FOCUS_RULES.fullstack);
  const full = rulesWithFocus({ aiRules: 'x'.repeat(MAX_AI_RULES_CHARS + 50), roleFocus: 'mobile' });
  assert.ok(full.endsWith(FOCUS_RULES.mobile));
  assert.ok(full.startsWith('x'.repeat(MAX_AI_RULES_CHARS) + '\n'));
  assert.equal(rulesWithFocus(null), '');
});

test('nice-to-have tools, the backend team and "not full stack" stay mobile', () => {
  assert.equal(detectRoleFocus('Mobile developer (Flutter). Experience with PostgreSQL and Docker preferred.'), 'mobile');
  assert.equal(detectRoleFocus('Flutter dev. Not a full stack role, no backend work.'), 'mobile');
  assert.equal(detectRoleFocus('Senior Flutter Developer. Work with the backend team on their services. Familiar with Docker CI/CD.'), 'mobile');
  assert.equal(detectRoleFocus('Flutter developer. Please express your interest by email.'), 'mobile');
  assert.equal(detectRoleFocus('Flutter developer. Node.js services with PostgreSQL.'), 'fullstack');
});

test('the longest focus line always survives the rules cap', () => {
  for (const line of Object.values(FOCUS_RULES)) {
    const prompt = appendAiRules('', 'x'.repeat(MAX_AI_RULES_CHARS) + '\n' + line);
    assert.ok(prompt.includes(line));
  }
  assert.ok(MAX_RULES_WITH_FOCUS_CHARS > MAX_AI_RULES_CHARS);
});

test('a web posting reads as front end, even when it says mobile-first', () => {
  assert.equal(detectRoleFocus('Front-end Software Engineer. React, TypeScript, Next.js. Mobile-first responsive design.'), 'frontend');
  assert.equal(detectRoleFocus('Frontend Developer (Vue 3, Tailwind CSS).'), 'frontend');
  assert.equal(detectRoleFocus('UI engineer building our web app in Angular.'), 'frontend');
});

test('a server-only posting reads as back end; React Native stays mobile', () => {
  assert.equal(detectRoleFocus('Senior Backend Engineer. Node.js, PostgreSQL, microservices.'), 'backend');
  assert.equal(detectRoleFocus('Back-end developer: build REST APIs in Django.'), 'backend');
  assert.equal(detectRoleFocus('React Native developer for our iOS and Android apps.'), 'mobile');
  assert.equal(detectRoleFocus('React frontend plus Node.js APIs and PostgreSQL.'), 'fullstack');
});

test('front end and back end each get their own focus line', () => {
  assert.doesNotMatch(FOCUS_RULES.backend, /web interface/);
  assert.doesNotMatch(FOCUS_RULES.frontend, /APIs, data models/);
  assert.equal(rulesWithFocus({ aiRules: '', roleFocus: 'frontend' }), FOCUS_RULES.frontend);
});

test('the job title decides over passing words elsewhere in the posting', () => {
  assert.equal(detectRoleFocus('Back-end Engineer at a mobile-first fintech. Python, Postgres, Django.'), 'backend');
  assert.equal(detectRoleFocus('Backend engineer. Node.js, PostgreSQL. Our mobile app consumes your APIs.'), 'backend');
  assert.equal(detectRoleFocus('Java Backend Developer, Spring Boot, MySQL; Android client team'), 'backend');
  assert.equal(detectRoleFocus('Backend engineer for web app platform in Django and PostgreSQL'), 'backend');
  assert.equal(detectRoleFocus('We use iOS and React for our site. Frontend engineer'), 'frontend');
  assert.equal(detectRoleFocus('Frontend dev. React Native not required. Typescript'), 'frontend');
  assert.equal(detectRoleFocus('Flutter developer; our front-end team uses React and we have a web app'), 'mobile');
});

test('a title alone decides, with no stack words at all', () => {
  assert.equal(detectRoleFocus('Backend Engineer, Lagos.'), 'backend');
  assert.equal(detectRoleFocus('Backend Engineer for our Flutter app.'), 'backend');
  assert.equal(detectRoleFocus('Frontend Engineer, remote.'), 'frontend');
  assert.equal(detectRoleFocus('Mobile Engineer, remote.'), 'mobile');
  // No title: a web posting that names iOS Safari reads as mobile, as before.
  assert.equal(detectRoleFocus('React app tested on iOS Safari'), 'mobile');
});
