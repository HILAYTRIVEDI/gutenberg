# End-to-End Testing

This living document serves to prescribe instructions and best practices for writing end-to-end (E2E) tests with Playwright in the Gutenberg project.

<div class="callout callout-info">

See the dedicated guide if you're working with the previous Jest + Puppeteer framework. See the [migration guide](https://github.com/WordPress/gutenberg/tree/HEAD/docs/contributors/code/e2e/migration.md) if you're migrating tests from Jest + Puppeteer.
</div>


## Running tests

```bash
# Run all available tests.
npm run test:e2e:playwright

# Run in headed mode.
npm run test:e2e:playwright -- --headed

# Run tests with specific browsers (`chromium`, `firefox`, or `webkit`).
npm run test:e2e:playwright -- --project=webkit --project=firefox

# Run a single test file.
npm run test:e2e:playwright -- <path_to_test_file> # E.g., npm run test:e2e:playwright -- site-editor/title.spec.js

# Debugging.
npm run test:e2e:playwright -- --debug
```

If you're developing in Linux, it currently requires testing Webkit browsers in headed mode. If you don't want to or can't run it with the GUI (e.g. if you don't have a graphic interface), prepend the command with [`xvfb-run`](https://manpages.ubuntu.com/manpages/xenial/man1/xvfb-run.1.html) to run it in a virtual environment.

```bash
# Run all available tests.
xvfb-run npm run test:e2e:playwright

# Only run webkit tests.
xvfb-run -- npm run test:e2e:playwright -- --project=webkit
```

## Best practices

Read the [best practices](https://playwright.dev/docs/best-practices) guide for Playwright.

### Forbid `$`, use `locator` instead

In fact, any API that returns `ElementHandle` is [discouraged](https://playwright.dev/docs/api/class-page#page-query-selector). This includes `$`, `$$`, `$eval`, `$$eval`, etc. [`Locator`](https://playwright.dev/docs/api/class-locator) is a much better API and can be used with playwright's [assertions](https://playwright.dev/docs/api/class-locatorassertions). This also works great with Page Object Model since that locator is lazy and doesn't return a promise.

### Use accessible selectors

Use [`getByRole`](https://playwright.dev/docs/locators#locate-by-role) to construct the query wherever possible. It enables us to write accessible queries without having to rely on internal implementations.

```js
// Select a button which includes the accessible name "Hello World" (case-insensitive).
page.getByRole( 'button', { name: 'Hello World' } );
```

It can also be chained to perform complex queries:

```js
// Select an option with a name "Buttons" under the "Block Library" region.
page.getByRole( 'region', { name: 'Block Library' } )
	.getByRole( 'option', { name: 'Buttons' } )
```

See the [official documentation](https://playwright.dev/docs/locators) for more info on how to use them.

### Selectors are strict by default

To encourage better practices for querying elements, selectors are [strict](https://playwright.dev/docs/api/class-browser#browser-new-page-option-strict-selectors) by default, meaning that it will throw an error if the query returns more than one element.

### Don't overload test-utils, inline simple utils

`e2e-test-utils` are too bloated with too many utils. Most of them are simple enough to be inlined directly in tests. With the help of accessible selectors, simple utils are easier to write now. For utils that only take place on a certain page, use Page Object Model instead (with an exception of clearing states with `requestUtils` which are better placed in `e2e-test-utils`). Otherwise, only create an util if the action is complex and repetitive enough.

### Favor Page Object Model over utils

As mentioned above, [Page Object Model](https://playwright.dev/docs/test-pom) is the preferred way to create reusable utility functions on a certain page.

The rationale behind using a POM is to group utils under namespaces to be easier to discover and use. In fact, `PageUtils` in the `e2e-test-utils-playwright` package is also a POM, which avoids the need for global variables, and utils can reference each other with `this`.

### Restify actions to clear or set states

It's slow to set states manually before or after tests, especially when they're repeated multiple times between tests. It's recommended to set them via API calls. Use `requestUtils.rest` and `requestUtils.batchRest` instead to call the [REST API](https://developer.wordpress.org/rest-api/reference/) (and add them to `requestUtils` if needed). We should still add a test for manually setting them, but that should only be tested once.

### Avoid global variables

Previously in our Jest + Puppeteer E2E tests, `page` and `browser` are exposed as global variables. This makes it harder to work with when we have multiple pages/tabs in the same test, or if we want to run multiple tests in parallel. `@playwright/test` has the concept of [fixtures](https://playwright.dev/docs/test-fixtures) which allows us to inject `page`, `browser`, and other parameters into the tests.

### Make explicit assertions

We can insert as many assertions in one test as needed. It's better to make explicit assertions whenever possible. For instance, if we want to assert that a button exists before clicking on it, we can do `expect( locator ).toBeVisible()` before performing `locator.click()`. This makes the tests flow better and easier to read

## Common pitfalls

### [Overusing snapshots](https://github.com/WordPress/gutenberg/tree/HEAD/docs/contributors/code/e2e/overusing-snapshots.md)


## Cross-browser testing

By default, tests are only run in chromium. You can _tag_ tests to run them in different browsers. Use `@browser` anywhere in the test title to run it in that browser. Tests will always run in chromium by default, append `-chromium` to disable testing in chromium. Available browsers are `chromium`, `firefox`, and `webkit`.

```js
test( 'I will run in @firefox and @webkit (and chromium by default)', async ( { page } ) => {
	// ...
} );

test( 'I will only run in @firefox but not -chromium', async ( { page } ) => {
	// ...
} );

test.describe( 'Grouping tests (@webkit, -chromium)', () => {
	test( 'I will only run in webkit', async ( { page } ) => {
		// ...
	} );
} );
```

## Local configuration of Playwright

Sometimes the deafults that Gutenberg offers for Playwright configuration need to be changed. While most configuration can be overriden by passing arguments to the test runner command line, we may want to make permanent confguration changes, such as setting the test to always run with `headless` mode set to `false` and you own custom slow motion value.

To do this one can create a file named `playwright.config.override.ts` file in the `/test/e2e/` folder. In this new file we need to import the exiting configuration, then use the new values on top to override the defaults.

For example:

```ts
/**
 * External dependencies
 */
import { defineConfig } from '@playwright/test';
/**
 * Internal dependencies
 */
import base from './playwright.config.ts';

const config = defineConfig( {
	...base,
	use: {
		...base.use,
		headless: true,
		launchOptions: {
			//slowMo: 500,
		},
		trace: 'off',
		screenshot: 'off',
		video: 'off',
	},
} );

export default config;

```

After making this file you can now run your tests passing the new configuration file with the `--config` argument:

```bash
npm run test:e2e:playwright -- --config=test/e2e/playwright.override.config.ts
```
