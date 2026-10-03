// TypeScript: types, generics and the type system in practice.
module.exports = [
  {
    id: 'ts-type-vs-interface',
    roles: ['frontend', 'backend'],
    anchors: ['typescript'],
    level: 'mid',
    question: 'What is the difference between a type alias and an interface in TypeScript?',
    variants: [
      'Type or interface, which do you use?',
      'When should you use an interface in TypeScript?',
      'What is declaration merging?',
      'Can a type alias do things an interface cannot?'
    ],
    answer: 'For describing the shape of an object they are almost interchangeable. The differences are at the edges.\n\n' +
      'An interface can be extended and can be reopened: two declarations with the same name merge, which is how libraries let you add fields to global types like Window. ' +
      'Interfaces also give slightly clearer error messages and are a bit faster for the compiler on very large object hierarchies.\n\n' +
      'A type alias can describe anything, not just objects: unions, intersections, tuples, function types, mapped and conditional types. A union like "loading", "success" or "error" can only be a type.\n\n' +
      'My rule is simple and the team agrees on it: interfaces for object shapes that may be extended, like props and API models, and types for unions and anything computed. Consistency matters more than the choice.'
  },
  {
    id: 'ts-generics',
    roles: ['frontend', 'backend'],
    anchors: ['typescript'],
    level: 'mid',
    question: 'How do you use generics in TypeScript?',
    variants: [
      'Give an example of a generic function in TypeScript.',
      'What is a generic constraint with extends?',
      'How do you type an API response wrapper with generics?',
      'How do generics work with React components?'
    ],
    answer: 'Generics let a function or type work with many types while keeping the relationship between input and output. A simple example is a function that returns the first item of an array: with a generic T, passing an array of users returns a user, not any.\n\n' +
      'In real code I use them for shared building blocks: an API response type that wraps data of type T with metadata, a fetch helper that returns a typed result, ' +
      'a reusable Table component that takes rows of type T and columns that know T\'s keys, or a useLocalStorage hook that keeps the stored type.\n\n' +
      'Constraints with extends say what the type must have, like T extends an object with an id, so the function can use the id safely. ' +
      'And keyof with generics lets me type things like a pick function, where the allowed keys come from the object itself.'
  },
  {
    id: 'ts-any-unknown-never',
    roles: ['frontend', 'backend'],
    anchors: ['typescript'],
    level: 'mid',
    question: 'What is the difference between any, unknown and never?',
    variants: [
      'Why use unknown instead of any?',
      'What is the never type used for?',
      'How do you type data coming from an API safely?',
      'How do you check that a switch handles every case in TypeScript?'
    ],
    answer: 'any switches type checking off. Anything can be done with it, so errors hide until runtime, and it spreads through the code. I avoid it and lint against it.\n\n' +
      'unknown is the safe version: it can hold anything, but I cannot use it until I narrow it with a check, like typeof, instanceof or a schema validation. ' +
      'That is the right type for data from outside, like a parsed JSON body or a caught error.\n\n' +
      'never means a value that cannot exist. Functions that always throw return never, and it is very useful for exhaustiveness: in a switch over a union, ' +
      'the default branch assigns the value to a variable of type never, so if someone adds a new case to the union and forgets to handle it, the code no longer compiles.'
  },
  {
    id: 'ts-narrowing-discriminated-unions',
    roles: ['frontend', 'backend'],
    anchors: ['typescript'],
    level: 'senior',
    question: 'What are discriminated unions and how does narrowing work in TypeScript?',
    variants: [
      'How do you model loading, success and error states in TypeScript?',
      'What is a type guard?',
      'How does TypeScript narrow types in an if statement?',
      'What is a tagged union?'
    ],
    answer: 'A discriminated union is a union of object types that share a literal field, like status. For a request state: status loading with no data, status success with data, status error with an error. ' +
      'When I check status, TypeScript narrows the type, so inside the success branch it knows data exists, and in the error branch it knows error exists.\n\n' +
      'This is much safer than optional fields like isLoading, data and error all on one object, where impossible combinations are allowed, like data and an error at the same time.\n\n' +
      'Narrowing also works with typeof, instanceof, the in operator and equality checks. When the check is complex, I write a type guard: a function returning "value is User", ' +
      'which I use for validating unknown input. Combined with a never check in the default branch, every new state has to be handled before the code compiles.'
  },
  {
    id: 'ts-utility-types',
    roles: ['frontend', 'backend'],
    anchors: ['typescript'],
    level: 'mid',
    question: 'Which TypeScript utility types do you use most?',
    variants: [
      'What do Partial, Pick, Omit and Record do?',
      'How do you derive types from other types?',
      'What is ReturnType and Awaited?',
      'How do you avoid duplicating types in TypeScript?'
    ],
    answer: 'I use them to derive types instead of copying them, so a change in one place flows everywhere.\n\n' +
      'Partial makes every field optional, which fits an update payload. Pick and Omit build a smaller type from a bigger one, like a user without the password hash for the public profile, ' +
      'or the form fields picked from the model. Record describes a map with known key and value types, like a lookup of labels by status. ' +
      'Required and Readonly do what they say.\n\n' +
      'ReturnType and Parameters get types from functions, and Awaited unwraps a promise, so I can type a variable from what an async function returns without writing it again. ' +
      'And with keyof and typeof I can turn a constant object into a union of its keys or values, which keeps runtime constants and types in sync.'
  },
  {
    id: 'ts-strict-mode',
    roles: ['frontend', 'backend'],
    anchors: ['typescript', 'tsconfig'],
    level: 'mid',
    question: 'What does strict mode in TypeScript do, and would you turn it on in an existing project?',
    variants: [
      'What does strictNullChecks catch?',
      'Which tsconfig options do you always enable?',
      'How do you migrate a JavaScript project to TypeScript?',
      'What is noUncheckedIndexedAccess?'
    ],
    answer: 'strict turns on a group of checks, and the most valuable is strictNullChecks: null and undefined are no longer allowed everywhere, so the compiler makes me handle the missing case. ' +
      'That alone prevents the most common runtime error. It also enables noImplicitAny and stricter function and class checks.\n\n' +
      'For new projects I always use strict, and I like noUncheckedIndexedAccess too, which treats array and record lookups as possibly undefined, because they often are.\n\n' +
      'For an existing project, I would not flip it on in one go. I enable it, see the error count, and fix it in steps: per folder, or flag by flag, ' +
      'keeping CI green and not adding new errors. The same goes for migrating JavaScript: allowJs, convert files gradually starting with shared utilities and types, and tighten the settings as coverage grows.'
  },
  {
    id: 'ts-enums-vs-unions',
    roles: ['frontend', 'backend'],
    anchors: ['typescript'],
    level: 'mid',
    question: 'Do you use enums in TypeScript, or union types?',
    variants: [
      'What are the problems with TypeScript enums?',
      'What does as const do?',
      'Enum versus string literal union, which is better?',
      'How do you keep a list of values and a type in sync?'
    ],
    answer: 'Mostly string literal unions. A union like "pending", "paid" or "failed" is erased at compile time, so there is no runtime code, and it works naturally with JSON from an API, which sends strings anyway.\n\n' +
      'Enums generate real JavaScript objects, numeric enums allow any number to be assigned, and const enums cause trouble with some build tools, since they are not plain type erasure. ' +
      'Node\'s built-in TypeScript support also cannot strip enums for the same reason.\n\n' +
      'When I need the values at runtime too, for a dropdown or validation, I declare a constant array or object with as const and derive the type from it. ' +
      'That gives me one source of truth for both the list and the type, without an enum. I still use enums when a codebase already does, for consistency.'
  },
  {
    id: 'ts-runtime-validation',
    roles: ['frontend', 'backend'],
    anchors: ['typescript', 'zod'],
    level: 'senior',
    question: 'TypeScript types disappear at runtime, so how do you validate data from an API or a form?',
    variants: [
      'Why do you use Zod with TypeScript?',
      'How do you validate API responses in TypeScript?',
      'How do you share validation between frontend and backend?',
      'Can TypeScript protect you from bad API data?'
    ],
    answer: 'Right, TypeScript only checks my own code at compile time. Anything crossing a boundary, like a request body, an API response, a form, local storage or environment variables, can be anything at runtime, and casting it to a type is just a promise, not a check.\n\n' +
      'So at those boundaries I validate with a schema library, usually Zod. I write the schema once and infer the TypeScript type from it, so the type and the validation can never drift apart. ' +
      'On the server, every request body and query is parsed with its schema before any logic runs, and invalid input gets a clear 400 response.\n\n' +
      'On the client, form validation uses the same schemas, and in a full stack TypeScript project they live in a shared package, so the front end and back end agree on the contract. ' +
      'For API responses, validating at least the critical ones turns silent backend changes into clear errors.'
  },
  {
    id: 'ts-typing-react',
    roles: ['frontend'],
    anchors: ['typescript', 'react'],
    level: 'mid',
    question: 'How do you type React components, props and events in TypeScript?',
    variants: [
      'React.FC or typed props, what do you use?',
      'How do you type an onChange event in React?',
      'How do you type children in React with TypeScript?',
      'How do you type a custom hook\'s return value?'
    ],
    answer: 'I type props with a props type and annotate the function parameter directly, rather than React.FC, which used to add children implicitly and adds little now. ' +
      'Children are typed as React.ReactNode when the component accepts them.\n\n' +
      'For events I use React\'s event types with the element, like a change event of an HTML input element, so event.target.value is typed. ' +
      'For components that wrap a native element, I extend its props, like ComponentProps of "button", so all native attributes pass through and stay typed.\n\n' +
      'useState usually infers its type, but I annotate it when it starts empty, like a user or null. For custom hooks that return a tuple, I return it as const, so it is a typed tuple instead of an array of a union. ' +
      'And for refs, I give the element type, like a ref to an input element starting as null.'
  },
  {
    id: 'ts-mapped-conditional-types',
    roles: ['frontend', 'backend'],
    anchors: ['typescript'],
    level: 'senior',
    question: 'What are mapped types and conditional types in TypeScript?',
    variants: [
      'What does the infer keyword do?',
      'How do you build your own utility types?',
      'What is a template literal type?',
      'Explain conditional types with an example.'
    ],
    answer: 'A mapped type builds a new object type by going over the keys of another, like "for every key K of T, make it readonly or optional". ' +
      'That is how Partial and Readonly are defined, and I can add or remove modifiers or rename keys with as.\n\n' +
      'A conditional type picks a type based on a check, written like a ternary: if T extends a string, give one type, otherwise another. ' +
      'infer lets me pull a type out of another inside that check, which is how ReturnType and Awaited work: if T is a function, infer its return type.\n\n' +
      'Template literal types combine string types, like generating event names such as "onClick" from "click".\n\n' +
      'I use these mostly in shared library code, like typing an API client from a route map. In application code I keep types simple, because clever types are hard for the next person to read.'
  },
  {
    id: 'ts-satisfies',
    roles: ['frontend', 'backend'],
    anchors: ['typescript'],
    level: 'senior',
    question: 'What does the satisfies operator do, and how is it different from a type annotation or as?',
    variants: [
      'When do you use satisfies in TypeScript?',
      'Why are type assertions with as dangerous?',
      'satisfies versus as, what is the difference?',
      'How do you check an object matches a type without losing its literal types?'
    ],
    answer: 'satisfies checks that a value matches a type, but keeps the more specific type TypeScript inferred.\n\n' +
      'With an annotation, the variable becomes exactly the annotated type. For a config of routes typed as a record of strings, I lose the knowledge of which keys exist. ' +
      'With satisfies, the compiler still checks every value is a string, but remembers the actual keys and literal values, so autocomplete and later checks are precise.\n\n' +
      'as is an assertion: I tell the compiler to trust me, and it mostly does, even when I am wrong. That hides real bugs, so I keep as for rare cases, like after a validation the compiler cannot follow, ' +
      'and never use as unknown as something to silence an error. satisfies is the safe tool when I want both checking and precise types, which is very common for config objects and constant maps.'
  },
  {
    id: 'ts-monorepo-shared-types',
    roles: ['frontend', 'backend'],
    anchors: ['typescript', 'trpc', 'openapi'],
    level: 'senior',
    question: 'How do you keep types in sync between the front end and the back end?',
    variants: [
      'How do you share types in a full stack TypeScript project?',
      'Have you used tRPC or OpenAPI type generation?',
      'How do you avoid the frontend breaking when the API changes?',
      'How do you structure a TypeScript monorepo?'
    ],
    answer: 'The goal is one source of truth for the API contract, so a breaking change fails at build time, not in production.\n\n' +
      'In a TypeScript monorepo, I put the schemas, usually Zod, and the types inferred from them in a shared package that both apps import. ' +
      'With tRPC, the client gets the server\'s procedure types directly, end to end, with no code generation at all, which is great when both sides are TypeScript and owned by the same team.\n\n' +
      'When the back end is a separate service or another language, I use OpenAPI: the API publishes its spec, and the front end generates a typed client from it in CI, ' +
      'so a changed field shows up as a compile error in the pull request.\n\n' +
      'Whichever way, the contract changes are additive where possible, because deployed clients, especially mobile apps, keep calling the old shape for a while.'
  }
];
