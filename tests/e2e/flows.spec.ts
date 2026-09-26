import { expect, test, type Page } from '@playwright/test';

// A minimal deterministic map style replaces only the tile provider. MapLibre,
// drawing, API requests, authentication sessions and PostgreSQL remain real.
test.beforeEach(async ({ page }) => {
  await page.route('**/e2e-map-style.json', (route) =>
    route.fulfill({
      json: {
        version: 8,
        glyphs: 'http://127.0.0.1:4173/e2e-glyphs/{fontstack}/{range}.pbf',
        sources: {},
        layers: [
          { id: 'background', type: 'background', paint: { 'background-color': '#e6eee9' } },
        ],
      },
    }),
  );
  await page.route('**/e2e-glyphs/**', (route) => route.fulfill({ body: Buffer.alloc(0) }));
  // The frontend dev server can accept requests before the API process has
  // connected to PostgreSQL. Wait through the proxy before the first page load.
  await expect
    .poll(
      async () => {
        try {
          return (await page.request.get('/health')).status();
        } catch {
          return 0;
        }
      },
      { timeout: 30_000 },
    )
    .toBe(200);
  await page.goto('/');
});

async function signIn(page: Page, persona: 'user' | 'admin') {
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: `Continue as test ${persona}` }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

test('anonymous visitors browse reports, open details and read privacy information', async ({
  page,
}) => {
  await expect(
    page.getByRole('region', { name: 'Interactive community safety map' }),
  ).toBeVisible();
  await expect(
    page.getByText('Community reports, not official crime statistics.', { exact: false }).first(),
  ).toBeVisible();
  await expect(page.locator('.area-card').first()).toBeVisible();
  await page.locator('.area-card').first().click();
  await expect(page.getByText('Self-attested', { exact: false }).first()).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Share an experience here', exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/browse-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test('a signed-in visitor draws, edits and rates an area; cooldown blocks a duplicate', async ({
  page,
}) => {
  await signIn(page, 'user');
  await page.getByRole('button', { name: 'Rate an area', exact: true }).first().click();
  await page.getByRole('button', { name: 'Start with an adjustable shape' }).click();
  // Distinct coordinates avoid interference between runs and device projects.
  // Editing all four fields exercises the keyboard alternative to corner dragging.
  const offset = (Date.now() % 10_000_000) / 10_000_000;
  const west = 24 + offset;
  const latitude = -28 - (test.info().project.name === 'mobile' ? 1 : 0);
  const ring = [
    [west, latitude],
    [west + 0.002, latitude],
    [west + 0.002, latitude + 0.002],
    [west, latitude + 0.002],
  ];
  for (let i = 0; i < 4; i++) {
    const corner = page.getByRole('group', { name: `Corner ${i + 1}`, exact: true });
    await corner.getByLabel('Longitude').fill(String(ring[i][0]));
    await corner.getByLabel('Latitude').fill(String(ring[i][1]));
  }
  await page.getByRole('button', { name: 'Confirm area' }).click();
  const name = `E2E visit ${Date.now()}`;
  await page.getByLabel('Area name', { exact: false }).fill(name);
  await page.getByRole('radio', { name: '3', exact: true }).check();
  await page
    .getByLabel('Tell us a little more', { exact: false })
    .fill('A recent personal experience used for a browser test.');
  await page.getByText('Add incidents or concerns', { exact: false }).click();
  await page.getByRole('checkbox', { name: 'Other', exact: true }).check();
  await page.getByLabel('Other incident type').fill('Uneven pavement');
  await page.getByRole('checkbox', { name: /^I personally visited/ }).check();
  await page.getByRole('button', { name: 'Share experience', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Self-attested', { exact: false }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Share an experience here', exact: true }).click();
  await page.getByRole('checkbox', { name: /^I personally visited/ }).check();
  await page.getByRole('button', { name: 'Share experience', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(/7 days|seven days|overlap|again/i);
});

test('an administrator moderates content and the action appears in the audit trail', async ({
  page,
}) => {
  await signIn(page, 'admin');
  const fixture = await page.request.post('/api/v1/areas', {
    headers: { Origin: 'http://127.0.0.1:4173', 'X-MapSafe-Request': 'web' },
    data: {
      name: `Moderation fixture ${Date.now()}`,
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [25, -30],
            [25.002, -30],
            [25.002, -29.998],
            [25, -29.998],
            [25, -30],
          ],
        ],
      },
    },
  });
  expect(fixture.status()).toBe(201);
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('button', { name: 'Admin dashboard' }).click();
  await expect(page.getByRole('dialog', { name: 'Community moderation' })).toBeVisible();
  await page.getByRole('button', { name: 'Areas', exact: true }).click();
  const firstRow = page.locator('tbody tr').first();
  await expect(firstRow).toBeVisible();
  await firstRow.getByRole('button', { name: /Inspect|Review/ }).click();
  await page
    .getByLabel('Reason', { exact: false })
    .fill('Browser acceptance test: checking soft moderation.');
  await page
    .getByRole('button', { name: /Hide area|Hide content|Hide/, exact: false })
    .last()
    .click();
  await expect(page.getByRole('region', { name: 'Review selected record' })).toHaveCount(0);
  await page.getByRole('button', { name: /Audit/ }).click();
  await expect(
    page.getByText('Browser acceptance test: checking soft moderation.').first(),
  ).toBeVisible();
});

test('non-map controls remain usable without a pointer', async ({ page }) => {
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(horizontalOverflow).toBe(false);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
