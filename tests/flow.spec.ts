import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function axe(page: Page, label: string) {
  const r = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(r.violations.map((v) => `${label}: ${v.id} (${v.nodes.length})`)).toEqual([]);
}

const tap = (page: Page, name: string | RegExp) =>
  page.getByRole('button', { name, exact: typeof name === 'string' }).click();

const heading = (page: Page) => page.getByRole('heading', { level: 1 });
const cardText = (page: Page) => page.getByRole('group', { name: 'My feeling card' });

async function holdGrownUps(page: Page) {
  const btn = page.getByRole('button', { name: /Grown-ups/ });
  await btn.hover();
  await page.mouse.down();
  await page.waitForTimeout(3300);
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    // These tests cover the check-in flow; the welcome screen has its own spec.
    localStorage.setItem('ecompass.prefs.v1', JSON.stringify({ showWelcome: false }));
  });
  await page.reload();
});

test('uncomfortable + both: body then feelings, card, coping, save, history', async ({ page }) => {
  await expect(heading(page)).toHaveText('How do I feel?');
  await axe(page, 'start');
  await tap(page, 'Uncomfortable');
  await expect(heading(page)).toHaveText('Where is it?');
  await axe(page, 'where');
  await tap(page, 'Both');
  await expect(heading(page)).toHaveText('Where in my body?');
  await tap(page, 'Tummy');
  await expect(heading(page)).toHaveText('What kind?');
  await axe(page, 'tummy');
  await tap(page, 'Tummy ache');
  // "Both" queues the feelings question after the body questions.
  await expect(heading(page)).toHaveText('Which feeling?');
  await tap(page, 'Scared');
  await tap(page, 'Worried');
  await expect(heading(page)).toHaveText('How big is it?');
  await axe(page, 'size');
  await tap(page, 'A lot');
  await expect(heading(page)).toHaveText('My feeling card');
  await expect(cardText(page)).toContainText('My tummy hurts.');
  await expect(cardText(page)).toContainText('I feel worried.');
  await expect(cardText(page)).toContainText('A lot.');
  await expect(page.locator('.saved-tag')).toBeVisible();
  await axe(page, 'card');

  await tap(page, 'Show someone');
  await expect(page.locator('.show-card')).toContainText('I feel worried.');
  await axe(page, 'show');
  await tap(page, 'Close');

  await tap(page, /Help me feel better/);
  await expect(heading(page)).toHaveText('Try one?');
  await expect(page.getByRole('button', { name: /Breathe slowly/ })).toBeVisible(); // scared set
  await tap(page, /Breathe slowly/);
  await axe(page, 'breathe');
  await tap(page, 'I feel better');
  // Finish goes straight back to the first question with a quiet confirmation.
  await expect(heading(page)).toHaveText('How do I feel?');
  await expect(page.locator('.notice')).toHaveText('Saved. Thanks for checking in.');
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toHaveCount(0);
  await axe(page, 'start after save');

  await holdGrownUps(page);
  await expect(heading(page)).toHaveText('Grown-ups');
  await expect(page.locator('.history-row')).toHaveCount(1);
  await expect(page.locator('.history-row')).toContainText('My tummy hurts. I feel worried.');
  await expect(page.locator('.history-row')).toContainText('Tried: breathe');
  await axe(page, 'history');
});

test('Back is an exact undo, including the Both queue', async ({ page }) => {
  await tap(page, 'Uncomfortable');
  await tap(page, 'Both');
  await tap(page, 'Head');
  await tap(page, 'Back');
  await expect(heading(page)).toHaveText('Where in my body?');
  await expect(page.locator('.crumbs')).toHaveText(/Uncomfortable\s*Both/);
  await tap(page, 'Back');
  await tap(page, 'In my body'); // no feelings question queued this time
  await tap(page, 'Head');
  await tap(page, 'Headache');
  await expect(heading(page)).toHaveText('How big is it?');
  await tap(page, 'Back');
  await tap(page, 'Back');
  await tap(page, 'Back');
  await tap(page, 'Back');
  await expect(heading(page)).toHaveText('How do I feel?');
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toHaveCount(0);
});

test('tapping a step in the path jumps back to that question', async ({ page }) => {
  await tap(page, 'Uncomfortable');
  await tap(page, 'Both');
  await tap(page, 'Tummy');
  await tap(page, 'Tummy ache');
  await expect(heading(page)).toHaveText('Which feeling?');
  await expect(page.locator('.crumbs')).toHaveText(/Uncomfortable\s*Both\s*Tummy\s*Tummy ache/);
  await tap(page, 'Go back to Both');
  await expect(heading(page)).toHaveText('Where is it?');
  await expect(page.locator('.crumbs')).toHaveText(/^\s*Uncomfortable\s*$/);
  // Back still works as an exact undo from here.
  await tap(page, 'Back');
  await expect(heading(page)).toHaveText('How do I feel?');
});

test('Finish questions jumps to the card from the second question on, skipping the Both queue', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Finish questions' })).toHaveCount(0); // not on the first question
  await tap(page, 'Uncomfortable');
  await tap(page, 'Both');
  await tap(page, 'Tummy');
  await tap(page, 'Finish questions');
  await expect(heading(page)).toHaveText('My feeling card');
  await expect(cardText(page)).toHaveText("My tummy doesn't feel good.");
});

test('comfortable: bouncy energy gets energy ideas, not "feel better"', async ({ page }) => {
  await tap(page, 'Comfortable');
  await tap(page, 'In my body');
  await tap(page, 'Bouncy energy');
  await tap(page, 'Not sure');
  await expect(cardText(page)).toContainText('I have bouncy energy.');
  await expect(page.getByRole('button', { name: /Use my energy/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Help me feel better/ })).toHaveCount(0);
});

test('comfortable + calm: no coping button, just Finish', async ({ page }) => {
  await tap(page, 'Comfortable');
  await tap(page, 'In my feelings');
  await tap(page, 'Calm');
  await tap(page, 'Medium');
  await expect(cardText(page)).toContainText('I feel calm.');
  await expect(page.locator('.actions .choice')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Finish', exact: true })).toBeVisible();
});

test('comfortable path asks where I feel good, and the card does not repeat itself', async ({ page }) => {
  await tap(page, 'Comfortable');
  await expect(heading(page)).toHaveText('Where do I feel good?');
  await tap(page, 'In my feelings');
  await tap(page, 'Finish questions');
  await expect(cardText(page)).toHaveText('I feel good inside.');
});

test('not sure is a valid answer and can be saved', async ({ page }) => {
  await tap(page, "I'm not sure");
  await expect(heading(page)).toHaveText("That's OK. What would help?");
  await axe(page, 'notsure');
  await tap(page, 'Just save it');
  await expect(cardText(page)).toContainText("I'm not sure how I feel.");
  await tap(page, 'Finish');
  await expect(heading(page)).toHaveText('How do I feel?');
  await expect(page.locator('.notice')).toBeVisible();
});

test("I'm not sure on Where is it? opens the same helper menu, which can check feelings", async ({ page }) => {
  await tap(page, 'Uncomfortable');
  await tap(page, "I'm not sure");
  await expect(heading(page)).toHaveText("That's OK. What would help?");
  await tap(page, 'Check my feelings');
  await expect(heading(page)).toHaveText('Which feeling?');
  await tap(page, 'Back');
  await tap(page, 'Just save it');
  await expect(cardText(page)).toContainText("I don't feel good.");
});

test('skipping every detail level still makes a sensible card', async ({ page }) => {
  await tap(page, 'Uncomfortable');
  await tap(page, 'In my body');
  await tap(page, 'Not sure');
  await expect(heading(page)).toHaveText('How big is it?');
  await tap(page, 'Not sure');
  await expect(cardText(page)).toContainText("My body doesn't feel good.");
});

test('I need help works from a deep screen, Close returns to it, and it is saved', async ({ page }) => {
  await tap(page, 'Uncomfortable');
  await tap(page, 'In my feelings');
  await tap(page, 'I need help');
  await expect(page.locator('.help-card')).toContainText('I need help.');
  await axe(page, 'help');
  await tap(page, 'Close');
  await expect(heading(page)).toHaveText('Which feeling?');
  await page.reload(); // e.g. the iPad is put down
  await holdGrownUps(page);
  await expect(page.locator('.history-row')).toHaveCount(1);
  await expect(page.locator('.history-row')).toContainText('Asked for help');
});

test('the check-in is saved as soon as the card appears, once, even after Back and changes', async ({ page }) => {
  await tap(page, 'Uncomfortable');
  await tap(page, 'In my feelings');
  await tap(page, 'Sad');
  await tap(page, 'Lonely');
  await tap(page, 'A little');
  await expect(page.locator('.saved-tag')).toBeVisible();
  await tap(page, 'Back');
  await tap(page, 'A lot');
  await tap(page, 'Show someone');
  await page.reload(); // shown to a grown-up, then the app is closed: nothing lost
  await holdGrownUps(page);
  await expect(page.locator('.history-row')).toHaveCount(1);
  await expect(page.locator('.history-row')).toContainText('I feel lonely.');
  await expect(page.locator('.history-row')).toContainText('A lot');
});

test('after a calm-down: try something else, or show my card', async ({ page }) => {
  await tap(page, 'Uncomfortable');
  await tap(page, 'In my feelings');
  await tap(page, 'Mad');
  await tap(page, 'Frustrated');
  await tap(page, 'Medium');
  await tap(page, /Help me feel better/);
  await tap(page, /Push the wall/);
  await tap(page, 'Try something else');
  await expect(heading(page)).toHaveText('Try one?');
  await tap(page, /Squeeze my hands/);
  await tap(page, 'Show my card');
  await expect(page.locator('.show-card')).toContainText('I feel frustrated.');
  await tap(page, 'Close');
  await expect(heading(page)).toHaveText('Squeeze my hands');
  await tap(page, 'I feel better');
  await holdGrownUps(page);
  await expect(page.locator('.history-row')).toHaveCount(1);
  await expect(page.locator('.history-row')).toContainText('Tried: squeeze');
});

test('every button is at least 44×44 pt', async ({ page }) => {
  const check = async (label: string) => {
    const small = await page.$$eval('button', (els) =>
      els
        .map((e) => ({ t: (e.textContent || '').trim(), r: e.getBoundingClientRect() }))
        .filter((x) => x.r.width < 44 || x.r.height < 44)
        .map((x) => `${x.t} ${Math.round(x.r.width)}x${Math.round(x.r.height)}`)
    );
    expect(small, label).toEqual([]);
  };
  await check('start');
  await tap(page, 'Uncomfortable');
  await check('where');
  await tap(page, 'In my body');
  await check('body'); // includes the path buttons and Finish questions
});

test('200% text size: no sideways scrolling, nothing cut off', async ({ page }) => {
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  for (const step of [null, 'Uncomfortable', 'In my feelings', 'Overwhelmed']) {
    if (step) await tap(page, step);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `after ${step ?? 'start'}`).toBeLessThanOrEqual(0);
  }
});

test.describe('dark mode', () => {
  test.use({ colorScheme: 'dark' });
  test('passes contrast and a11y checks', async ({ page }) => {
    await axe(page, 'dark start');
    await tap(page, 'Uncomfortable');
    await tap(page, 'In my body');
    await axe(page, 'dark body');
  });
});

test('works offline after first load', async ({ page, context }) => {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload(); // now controlled by the service worker
  await context.setOffline(true);
  await page.reload();
  await expect(heading(page)).toHaveText('How do I feel?');
  await context.setOffline(false);
});
