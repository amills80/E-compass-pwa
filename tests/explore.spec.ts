import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Home + Explore feelings (v0.5). Helpers match flow.spec.ts.

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function settle(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => {
          const t = a.effect?.getTiming();
          return t?.iterations !== Infinity && Number(t?.duration) < 2000;
        })
        .map((a) => a.finished.catch(() => undefined))
    )
  );
}

async function axe(page: Page, label: string) {
  await settle(page);
  const r = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(r.violations.map((v) => `${label}: ${v.id} (${v.nodes.length})`)).toEqual([]);
}

const heading = (page: Page) => page.getByRole('heading', { level: 1 });
const card = (page: Page) => page.getByRole('group', { name: 'My feeling card' });

async function tap(page: Page, name: string, next?: string | RegExp) {
  await page.getByRole('button', { name, exact: true }).click();
  if (next) await expect(heading(page)).toHaveText(next);
}

async function holdGrownUps(page: Page) {
  const btn = page.getByRole('button', { name: /Grown-ups/ });
  await btn.hover();
  await page.mouse.down();
  await page.waitForTimeout(3300);
  await page.mouse.up();
  await expect(heading(page)).toHaveText('Grown-ups');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('ecompass.prefs.v1', JSON.stringify({ showWelcome: false }));
  });
  await page.reload();
  await expect(heading(page)).toHaveText('How do I feel?');
});

test('home leads with the check-in; Explore is a smaller link below the answers', async ({ page }) => {
  const answer = await page.getByRole('button', { name: 'Not good', exact: true }).boundingBox();
  const unsure = await page.getByRole('button', { name: "I'm not sure", exact: true }).boundingBox();
  const explore = await page.getByRole('button', { name: 'Explore feelings', exact: true }).boundingBox();
  const grownUps = await page.getByRole('button', { name: /Grown-ups/ }).boundingBox();
  expect(explore!.y).toBeGreaterThan(unsure!.y);
  expect(grownUps!.y).toBeGreaterThan(explore!.y);
  expect(explore!.height).toBeLessThan(answer!.height);
  // VoiceOver order: question and answers before Explore.
  const order = await page.$$eval('button', (els) => els.map((e) => (e.textContent || '').trim()));
  expect(order.findIndex((t) => t.includes('Not good'))).toBeLessThan(order.indexOf('Explore feelings'));
});

test('browse to a feeling, then "I feel this now" picks up the check-in', async ({ page }) => {
  await tap(page, 'Explore feelings', 'Explore feelings');
  await axe(page, 'explore list');
  await tap(page, 'Mad', 'Mad feelings');
  await axe(page, 'explore family');
  await tap(page, 'Annoyed', 'Annoyed');
  await expect(page.getByText('A small mad feeling. Close to calm.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'You might notice' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What can help' })).toBeVisible();
  await axe(page, 'explore feeling');
  await tap(page, 'I feel this now', 'What made it happen?');
  // The path chips show the feeling as if it had been tapped.
  await expect(page.getByRole('button', { name: 'Go back to Annoyed' })).toBeVisible();
  await tap(page, 'Not sure why', 'My feeling card');
  await expect(card(page)).toHaveText('I feel annoyed.');
});

test('a flavor word lands on "How big is it?", and Back goes to the word question', async ({ page }) => {
  await tap(page, 'Explore feelings', 'Explore feelings');
  await tap(page, 'Sad', 'Sad feelings');
  await tap(page, 'Lonely', 'Lonely');
  await expect(page.getByText('A kind of sad. It can be a little or a lot.')).toBeVisible();
  await tap(page, 'I feel this now', 'How big is it?');
  await tap(page, 'Back', 'What kind of sad?');
});

test('calm can be explored and checked in from', async ({ page }) => {
  await tap(page, 'Explore feelings', 'Explore feelings');
  await tap(page, 'Calm', 'Calm');
  await axe(page, 'explore calm');
  await tap(page, 'I feel this now', 'What made it happen?');
  await tap(page, 'Not sure why', 'My feeling card');
  await expect(card(page)).toHaveText('I feel calm.');
});

test('Back from Explore returns home, and browsing is never saved', async ({ page }) => {
  await tap(page, 'Explore feelings', 'Explore feelings');
  await tap(page, 'Proud', 'Proud feelings');
  await tap(page, 'Pleased', 'Pleased');
  await tap(page, 'Back', 'Proud feelings');
  await tap(page, 'Back', 'Explore feelings');
  await tap(page, 'Back', 'How do I feel?');
  await holdGrownUps(page);
  await expect(page.getByText('No check-ins yet.')).toBeVisible();
});

test('"I\'m not sure" offers Explore, and Back returns to the helper menu', async ({ page }) => {
  await tap(page, "I'm not sure", "That's OK. What would help?");
  await tap(page, 'Look at feelings', 'Explore feelings');
  await tap(page, 'Back', "That's OK. What would help?");
});

test('I need help works inside Explore and Close returns home', async ({ page }) => {
  await tap(page, 'Explore feelings', 'Explore feelings');
  await tap(page, 'Scared', 'Scared feelings');
  await tap(page, 'I need help', 'I need help');
  await tap(page, 'Close', 'How do I feel?');
});

test('Explore: 44pt buttons and no sideways scrolling at 200% text', async ({ page }) => {
  const small = () =>
    page.$$eval('button', (els) =>
      els
        .map((e) => ({ t: (e.textContent || '').trim(), r: e.getBoundingClientRect() }))
        .filter((x) => x.r.width < 44 || x.r.height < 44)
        .map((x) => `${x.t} ${Math.round(x.r.width)}x${Math.round(x.r.height)}`)
    );
  expect(await small(), 'home').toEqual([]);
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(await overflow(), 'home').toBeLessThanOrEqual(0);
  await tap(page, 'Explore feelings', 'Explore feelings');
  expect(await overflow(), 'list').toBeLessThanOrEqual(0);
  await tap(page, 'Overwhelmed', 'Overwhelmed feelings');
  expect(await overflow(), 'family').toBeLessThanOrEqual(0);
  await tap(page, 'Overloaded', 'Overloaded');
  expect(await overflow(), 'feeling').toBeLessThanOrEqual(0);
  expect(await small(), 'feeling').toEqual([]);
});
