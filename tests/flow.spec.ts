import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Let screen transitions finish first: mid-fade text has lower contrast. */
async function settle(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => {
          const t = a.effect?.getTiming();
          // Screen transitions only; the slow breathing guide keeps going.
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

/** Tap a button by its exact name, then wait for the next screen's heading. */
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
    // These tests cover the check-in flow; the welcome screen has its own spec.
    localStorage.setItem('ecompass.prefs.v1', JSON.stringify({ showWelcome: false }));
  });
  await page.reload();
  await expect(heading(page)).toHaveText('How do I feel?');
});

test('not good → family → ladder word → two causes → card → breathing → saved → history', async ({ page }) => {
  await axe(page, 'start');
  await expect(page.getByRole('button', { name: 'Calm', exact: true })).toBeVisible();
  await tap(page, 'Not good', 'Which feeling?');
  await axe(page, 'family');
  await tap(page, 'Mad', 'What kind of mad?');
  await axe(page, 'word');
  await tap(page, 'Annoyed', 'What made it happen?');
  await axe(page, 'cause kind');
  await tap(page, 'My body', "What's happening in my body?");
  await axe(page, 'cause list');
  await tap(page, 'Headache', 'Anything else?');
  await expect(card(page)).toHaveText(/I feel annoyed\s*because my head hurts\./);
  await axe(page, 'anything else');
  await tap(page, 'Add another', 'What else?');
  await tap(page, 'My senses', "What's bothering my senses?");
  await tap(page, 'Too loud', 'Anything else?');
  await expect(card(page)).toHaveText(/because my head hurts and it's too loud\./);
  await tap(page, "That's all", 'My feeling card');
  await axe(page, 'card');

  await tap(page, 'Show someone');
  await expect(page.locator('.show-card')).toContainText("I feel annoyed because my head hurts and it's too loud.");
  await tap(page, 'Close', 'My feeling card');

  await tap(page, 'Help me feel better', 'Try one?');
  await expect(page.getByRole('button', { name: 'Push the wall' })).toBeVisible(); // mad set first
  await tap(page, 'Breathe with the dot', 'Breathe with the dot');
  await expect(page.locator('.sphere.is-homeward')).toHaveCount(1);
  await axe(page, 'breathing');
  await tap(page, 'Stop');
  await expect(page.locator('.sphere.is-paused')).toHaveCount(1);
  await tap(page, 'I feel better', 'How do I feel?');
  await expect(page.locator('.notice')).toHaveText('Saved. Thanks for checking in.');
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toHaveCount(0);

  await holdGrownUps(page);
  const row = page.locator('.history-row');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("I feel annoyed because my head hurts and it's too loud.");
  await expect(row).toContainText('Not good');
  await expect(row).toContainText('Tried: breathe');
  await axe(page, 'history');
});

test('a tapped choice shows as picked before moving on', async ({ page }) => {
  const good = page.getByRole('button', { name: 'Good', exact: true });
  await good.click();
  await expect(good).toHaveAttribute('aria-pressed', 'true');
  await expect(heading(page)).toHaveText('Which feeling?');
});

test('Back is an exact undo, including the last cause added', async ({ page }) => {
  await tap(page, 'Not good', 'Which feeling?');
  await tap(page, 'Mad', 'What kind of mad?');
  await tap(page, 'Annoyed', 'What made it happen?');
  await tap(page, 'My body', "What's happening in my body?");
  await tap(page, 'Headache', 'Anything else?');
  await tap(page, 'Back', "What's happening in my body?");
  await expect(page.getByRole('button', { name: 'Headache', exact: true })).toBeVisible();
  await expect(page.locator('.crumbs')).toHaveText(/Not good\s*Mad\s*Annoyed/);
  await tap(page, 'Back', 'What made it happen?');
  await tap(page, 'Back', 'What kind of mad?');
  await tap(page, 'Back', 'Which feeling?');
  await tap(page, 'Back', 'How do I feel?');
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toHaveCount(0);
});

test('calm sits at the center and goes straight to causes', async ({ page }) => {
  await tap(page, 'Calm', 'What made it happen?');
  await expect(page.locator('.calm-glow')).toHaveCount(1);
  // Good things are offered first when things are calm or good.
  await expect(page.locator('.choices .choice').first()).toHaveText(/Something good happened/);
  await tap(page, 'Something good happened', 'What happened?');
  await tap(page, 'A quiet, comfy place', 'Anything else?');
  await tap(page, "That's all", 'My feeling card');
  await expect(card(page)).toHaveText(/I feel calm\s*because I'm in a quiet, comfy place\./);
});

test('flavor word asks how big and builds the sentence', async ({ page }) => {
  await tap(page, 'Good', 'Which feeling?');
  await tap(page, 'Proud', 'What kind of proud?');
  await tap(page, 'Loved', 'How big is it?');
  await tap(page, 'A lot', 'What made it happen?');
  await tap(page, 'Not sure why', 'My feeling card');
  await expect(card(page)).toHaveText('I feel very loved.');
  await expect(page.locator('.actions .choice')).toHaveCount(0); // no calm-down needed
  await expect(page.getByRole('button', { name: 'Finish', exact: true })).toBeVisible();
});

test('a big excited feeling offers energy ideas, not "feel better"', async ({ page }) => {
  await tap(page, 'Good', 'Which feeling?');
  await tap(page, 'Excited', 'What kind of excited?');
  await tap(page, 'Bouncy', 'What made it happen?');
  await tap(page, 'Not sure why', 'My feeling card');
  await expect(page.getByRole('button', { name: /Use my energy/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Help me feel better/ })).toHaveCount(0);
});

test('not sure is a valid answer and can be saved', async ({ page }) => {
  await tap(page, "I'm not sure", "That's OK. What would help?");
  await axe(page, 'notsure');
  await tap(page, 'Just save it', 'My feeling card');
  await expect(card(page)).toHaveText("I'm not sure how I feel.");
  await tap(page, 'Finish', 'How do I feel?');
  await expect(page.locator('.notice')).toBeVisible();
});

test('skipping every step still makes a sensible card', async ({ page }) => {
  await tap(page, 'Not good', 'Which feeling?');
  await tap(page, 'Not sure', 'What made it happen?');
  await tap(page, 'Not sure why', 'My feeling card');
  await expect(card(page)).toHaveText("I don't feel good.");
});

test('safety cause opens the grown-up card, puts Get a grown-up first, and marks history', async ({ page }) => {
  await tap(page, 'Not good', 'Which feeling?');
  await tap(page, 'Not sure', 'What made it happen?');
  await tap(page, 'Something hard happened', 'What happened?');
  await tap(page, 'Someone hurt or scared me');
  await expect(page.locator('.help-card')).toContainText('I need a grown-up I trust.');
  await axe(page, 'safety');
  await tap(page, 'Close', 'Anything else?');
  await tap(page, "That's all", 'My feeling card');
  await tap(page, 'Help me feel better', 'Try one?');
  await expect(page.locator('.choices .choice').first()).toHaveText(/Get a grown-up/);
  await tap(page, 'Back', 'My feeling card');
  await tap(page, 'Finish', 'How do I feel?');
  await holdGrownUps(page);
  await expect(page.locator('.safety-tag')).toHaveCount(1);
});

test('long cause lists show four at a time, and picked causes disappear', async ({ page }) => {
  await tap(page, 'Not good', 'Which feeling?');
  await tap(page, 'Not sure', 'What made it happen?');
  await tap(page, 'My body', "What's happening in my body?");
  await expect(page.locator('.choices .choice')).toHaveCount(4);
  await tap(page, 'More choices', "What's happening in my body?");
  await expect(page.getByRole('button', { name: 'Feel sick', exact: true })).toBeVisible();
  await tap(page, 'Back', "What's happening in my body?");
  await tap(page, 'Headache', 'Anything else?');
  await tap(page, 'Add another', 'What else?');
  await tap(page, 'My body', "What's happening in my body?");
  await expect(page.getByRole('button', { name: 'Headache', exact: true })).toHaveCount(0);
  await expect(page.locator('.choices .choice').first()).toHaveText(/Tummy ache/);
});

test('I need help works from a deep screen, Close returns to it, and it is saved', async ({ page }) => {
  await tap(page, 'Not good', 'Which feeling?');
  await tap(page, 'I need help');
  await expect(page.locator('.help-card')).toContainText('I need help.');
  await axe(page, 'help');
  await tap(page, 'Close', 'Which feeling?');
  await page.reload(); // e.g. the iPad is put down
  await holdGrownUps(page);
  await expect(page.locator('.history-row')).toHaveCount(1);
  await expect(page.locator('.history-row')).toContainText('Asked for help');
});

test('tapping a step in the path jumps back to that question', async ({ page }) => {
  await tap(page, 'Not good', 'Which feeling?');
  await tap(page, 'Sad', 'What kind of sad?');
  await tap(page, 'Down', 'What made it happen?');
  await tap(page, 'My body', "What's happening in my body?");
  await tap(page, 'Tired', 'Anything else?');
  await expect(page.locator('.crumbs')).toHaveText(/Not good\s*Sad\s*Down\s*Tired/);
  await tap(page, 'Go back to Sad', 'Which feeling?');
  await expect(page.locator('.crumbs')).toHaveText(/^\s*Not good\s*$/);
  // Back still works as an exact undo from here.
  await tap(page, 'Back', 'How do I feel?');
});

test('Finish questions jumps to the card from the second question on', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Finish questions' })).toHaveCount(0); // not on the first question
  await tap(page, 'Not good', 'Which feeling?');
  await tap(page, 'Scared', 'What kind of scared?');
  await tap(page, 'Finish questions', 'My feeling card');
  await expect(card(page)).toHaveText('I feel scared.');
});

test("the helper menu can go back to the feelings question", async ({ page }) => {
  await tap(page, "I'm not sure", "That's OK. What would help?");
  await tap(page, 'Check my feelings', 'How do I feel?');
  await tap(page, 'Good', 'Which feeling?');
  await tap(page, 'Back', 'How do I feel?');
  await tap(page, 'Back', "That's OK. What would help?");
  await tap(page, 'Check my body', "What's happening in my body?");
});

test('the check-in is saved as soon as the card appears, once, even after Back and changes', async ({ page }) => {
  await tap(page, 'Not good', 'Which feeling?');
  await tap(page, 'Sad', 'What kind of sad?');
  await tap(page, 'Lonely', 'How big is it?');
  await tap(page, 'A little', 'What made it happen?');
  await tap(page, 'Not sure why', 'My feeling card');
  await expect(page.locator('.saved-tag')).toBeVisible();
  await tap(page, 'Back', 'What made it happen?');
  await tap(page, 'Back', 'How big is it?');
  await tap(page, 'A lot', 'What made it happen?');
  await tap(page, 'Not sure why', 'My feeling card');
  await tap(page, 'Show someone');
  await page.reload(); // shown to a grown-up, then the app is closed: nothing lost
  await holdGrownUps(page);
  await expect(page.locator('.history-row')).toHaveCount(1);
  await expect(page.locator('.history-row')).toContainText('I feel very lonely.');
  await expect(page.locator('.history-row')).toContainText('A lot');
});

test('after a calm-down: try something else, or show my card', async ({ page }) => {
  await tap(page, 'Not good', 'Which feeling?');
  await tap(page, 'Mad', 'What kind of mad?');
  await tap(page, 'Frustrated', 'What made it happen?');
  await tap(page, 'Not sure why', 'My feeling card');
  await tap(page, 'Help me feel better', 'Try one?');
  await tap(page, 'Push the wall', 'Push the wall');
  await tap(page, 'Try something else', 'Try one?');
  await tap(page, 'Squeeze my hands', 'Squeeze my hands');
  await tap(page, 'Show my card');
  await expect(page.locator('.show-card')).toContainText('I feel frustrated.');
  await tap(page, 'Close', 'Squeeze my hands');
  await tap(page, 'I feel better', 'How do I feel?');
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
  await tap(page, 'Not good', 'Which feeling?');
  await check('family');
  await tap(page, 'Sad', 'What kind of sad?');
  await check('word');
  await tap(page, 'Down', 'What made it happen?');
  await tap(page, 'My body', "What's happening in my body?");
  await tap(page, 'Tired', 'Anything else?');
  await check('anything else');
});

test('200% text size: no sideways scrolling', async ({ page }) => {
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  const steps: [string, string][] = [
    ['Not good', 'Which feeling?'],
    ['Overwhelmed', 'What kind of overwhelmed?'],
    ['Overloaded', 'What made it happen?'],
    ['Something hard happened', 'What happened?'],
    ["Didn't get what I wanted", 'Anything else?']
  ];
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(await overflow(), 'start').toBeLessThanOrEqual(0);
  for (const [name, next] of steps) {
    await tap(page, name, next);
    expect(await overflow(), `after ${name}`).toBeLessThanOrEqual(0);
  }
});

test.describe('dark mode', () => {
  test.use({ colorScheme: 'dark' });
  test('passes contrast and a11y checks', async ({ page }) => {
    await axe(page, 'dark start');
    await tap(page, 'Not good', 'Which feeling?');
    await axe(page, 'dark family');
    await tap(page, 'Scared', 'What kind of scared?');
    await axe(page, 'dark word');
  });
});

test.describe('reduce motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('breathing moves the dot home one step per tap', async ({ page }) => {
    await tap(page, 'Not good', 'Which feeling?');
    await tap(page, 'Scared', 'What kind of scared?');
    await tap(page, 'Panicky', 'What made it happen?');
    await tap(page, 'Not sure why', 'My feeling card');
    await tap(page, 'Help me feel better', 'Try one?');
    await tap(page, 'Breathe with the dot', 'Breathe with the dot');
    await expect(page.locator('.sphere.is-homeward')).toHaveCount(0);
    for (let i = 0; i < 4; i++) await tap(page, 'Next breath');
    await expect(page.getByRole('button', { name: 'Your dot is home' })).toBeDisabled();
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
