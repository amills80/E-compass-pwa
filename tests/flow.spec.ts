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

async function holdGrownUps(page: Page) {
  const btn = page.getByRole('button', { name: /Grown-ups/ });
  await btn.hover();
  await page.mouse.down();
  await page.waitForTimeout(3300);
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
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
  const card = page.getByRole('group', { name: 'My feeling card' });
  await expect(card).toContainText('My tummy hurts.');
  await expect(card).toContainText('I feel worried.');
  await expect(card).toContainText('A lot.');
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
  await tap(page, "I'm done");
  await expect(heading(page)).toHaveText('Saved.');
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toHaveCount(0);
  await tap(page, 'Back to start');

  await holdGrownUps(page);
  await expect(heading(page)).toHaveText('Check-ins');
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

test('comfortable: bouncy energy gets energy ideas, not "feel better"', async ({ page }) => {
  await tap(page, 'Comfortable');
  await tap(page, 'In my body');
  await tap(page, 'Bouncy energy');
  await tap(page, 'Skip');
  await expect(page.getByRole('group', { name: 'My feeling card' })).toContainText('I have bouncy energy.');
  await expect(page.getByRole('button', { name: /Use my energy/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Help me feel better/ })).toHaveCount(0);
});

test('comfortable + calm: no coping button at all', async ({ page }) => {
  await tap(page, 'Comfortable');
  await tap(page, 'In my feelings');
  await tap(page, 'Calm');
  await tap(page, 'Medium');
  await expect(page.getByRole('group', { name: 'My feeling card' })).toContainText('I feel calm.');
  await expect(page.locator('.actions .choice')).toHaveCount(1); // just Done
});

test('not sure is a valid answer and can be saved', async ({ page }) => {
  await tap(page, "I'm not sure");
  await expect(heading(page)).toHaveText("That's OK.");
  await axe(page, 'notsure');
  await tap(page, "Save: I'm not sure");
  await expect(page.getByRole('group', { name: 'My feeling card' })).toContainText("I'm not sure how I feel.");
  await tap(page, 'Done');
  await expect(heading(page)).toHaveText('Saved.');
});

test('skipping every level still makes a sensible card', async ({ page }) => {
  await tap(page, 'Uncomfortable');
  await tap(page, 'Not sure — skip');
  await tap(page, 'Skip');
  await expect(page.getByRole('group', { name: 'My feeling card' })).toContainText("I don't feel good.");
});

test('Help works from a deep screen and Close returns to it', async ({ page }) => {
  await tap(page, 'Uncomfortable');
  await tap(page, 'In my feelings');
  await tap(page, 'Help');
  await expect(page.locator('.help-card')).toContainText('I need help.');
  await axe(page, 'help');
  await tap(page, 'Close');
  await expect(heading(page)).toHaveText('Which feeling?');
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
  await check('body');
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
