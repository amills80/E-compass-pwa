import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const heading = (page: Page) => page.getByRole('heading', { level: 1 });
const tap = (page: Page, name: string) => page.getByRole('button', { name, exact: true }).click();

/** Simulate a fresh app launch: new session, same device storage. */
async function relaunch(page: Page) {
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
}

async function openGrownUps(page: Page) {
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
    sessionStorage.clear();
  });
  await page.reload();
});

test('shows on first launch, passes a11y checks, and Start goes to the first question', async ({ page }) => {
  await expect(heading(page)).toHaveText(/Welcome to E.Feels/);
  await expect(heading(page)).toBeFocused();
  // Not running from the home screen in the test browser, so the install tip shows.
  await expect(page.getByRole('heading', { name: /add it to your Home Screen/ })).toBeVisible();
  // Written for the grown-up setting up: no help button, no opt-out checkbox.
  await expect(page.getByRole('button', { name: 'I need help' })).toHaveCount(0);
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  const r = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(r.violations.map((v) => v.id)).toEqual([]);
  await tap(page, 'Start');
  await expect(heading(page)).toHaveText('How do I feel?');
});

test('shows once: not after a reload, not on the next launch', async ({ page }) => {
  await tap(page, 'Start');
  await page.reload(); // e.g. a quiet update reload
  await expect(heading(page)).toHaveText('How do I feel?');
  await relaunch(page);
  await expect(heading(page)).toHaveText('How do I feel?');
});

test('grown-ups can turn it back on, and reset preferences without touching history', async ({ page }) => {
  // Save one check-in.
  await tap(page, 'Start');
  await tap(page, 'Good');
  await expect(heading(page)).toHaveText('Which feeling?');
  await tap(page, 'Not sure');
  await expect(heading(page)).toHaveText('What made it happen?');
  await tap(page, 'Not sure why');
  await expect(heading(page)).toHaveText('My feeling card');
  await tap(page, 'Finish');
  await expect(heading(page)).toHaveText('How do I feel?');

  await openGrownUps(page);
  const toggle = page.getByRole('checkbox', { name: 'Show welcome screen when the app opens' });
  await expect(toggle).not.toBeChecked();
  await toggle.check();
  await expect(page.getByRole('status')).toContainText('will show next time');
  await relaunch(page);
  await expect(heading(page)).toHaveText(/Welcome to E.Feels/);

  // Start turns it off again; Reset preferences brings back the default.
  await tap(page, 'Start');
  await openGrownUps(page);
  await expect(toggle).not.toBeChecked();
  await tap(page, 'Reset preferences');
  await expect(toggle).toBeChecked();
  await expect(page.getByRole('status')).toContainText('Check-ins were not changed');
  await expect(page.locator('.history-row')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Add to Home Screen' })).toBeVisible();
  const r = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(r.violations.map((v) => v.id)).toEqual([]);
});

test('welcome fits at 200% text with no sideways scrolling', async ({ page }) => {
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
