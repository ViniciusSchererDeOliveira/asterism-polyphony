import { expect, test, type Locator, type Page } from '@playwright/test';

function degreeButton(page: Page, degree: string): Locator {
  return page.locator('.movement-score__selectors button').filter({ hasText: new RegExp(`^\\s*${degree}\\s*$`) });
}

async function openMovementBoard(page: Page) {
  await page.goto('/');
  await expect(page.locator('.movement-score__selectors')).toBeVisible();
  await expect(page.locator('.fretboard-board svg[role="img"]')).toBeVisible();
}

test('Root is an anchor without route or portal', async ({ page }) => {
  await openMovementBoard(page);
  await degreeButton(page, 'I').click();

  await expect(page.locator('.movement-score__grid')).toHaveAttribute('data-layout-state', 'anchor-only');
  await expect(page.locator('.movement-card--root-idle')).toContainText('NO PATH');
  await expect(page.locator('[data-degree-route]')).toHaveCount(0);
  await expect(page.locator('[data-route-segment="portal"]')).toHaveCount(0);
});

test('III uses a green Bishop route after a portal-first translation', async ({ page }) => {
  await openMovementBoard(page);
  await degreeButton(page, 'III').click();

  const route = page.locator('[data-degree-route="III"]');
  await expect(route).toHaveAttribute('data-rule-piece', 'bishop');
  await expect(route).toHaveAttribute('data-route-tone', 'third');
  await expect(route).toHaveAttribute('data-movement-order', 'portal-before-route');
  await expect(route).toHaveAttribute('data-portal-order', 'before-rule');
  await expect(route.locator('[data-route-segment="portal"]')).toHaveAttribute('data-sequence-step', '1');
  await expect(route.locator('[data-route-segment="degree"]')).toHaveAttribute('data-sequence-step', '2');
});

test('V exposes the nut fallback as route-first then portal', async ({ page }) => {
  await openMovementBoard(page);
  await degreeButton(page, 'V').click();

  const route = page.locator('[data-degree-route="V"]');
  await expect(route).toHaveAttribute('data-movement-order', 'route-before-portal');
  await expect(route).toHaveAttribute('data-portal-order', 'after-rule');
  await expect(route).toHaveAttribute('data-boundary-fallback', 'nut');
  await expect(route.locator('[data-route-segment="degree"]')).toHaveAttribute('data-sequence-step', '1');
  await expect(route.locator('[data-route-segment="portal"]')).toHaveAttribute('data-sequence-step', '2');
});

test('tablet and mobile keep overflow inside the fretboard scroller', async ({ page }) => {
  for (const viewport of [{ width: 936, height: 894 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await openMovementBoard(page);
    const globalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(globalOverflow).toBeLessThanOrEqual(1);
    const shell = page.locator('.fretboard-shell');
    await expect(shell).toBeVisible();
    if (viewport.width === 390) {
      const dimensions = await shell.evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth
      }));
      expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth);
    }
  }
});

test('critical movement interactions emit no browser errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await openMovementBoard(page);
  await degreeButton(page, 'I').click();
  await degreeButton(page, 'III').click();
  await degreeButton(page, 'V').click();
  await page.waitForTimeout(100);

  expect(errors).toEqual([]);
});

test('current controls expose accessible names and selection state', async ({ page }) => {
  await openMovementBoard(page);

  const configurationButton = page.getByRole('button', { name: 'Guitar & Hand' });
  await expect(configurationButton).toHaveAttribute('aria-controls', 'solver-configuration');
  await configurationButton.click();
  await expect(page.locator('#solver-configuration')).toBeVisible();

  const selectedVoicing = page.getByRole('button', { name: 'Select ranked voicing 1' });
  await expect(selectedVoicing).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Add ranked voicing 1 to progression' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Prefer this reusable shape' }).first()).toBeVisible();
});

test('inspect view exposes score and solver provenance', async ({ page }) => {
  await openMovementBoard(page);
  await page.getByRole('button', { name: 'Generate' }).click();
  await page.getByText('Open harmonic and spectral diagnosis').click();

  await expect(page.getByText('Score composition')).toBeVisible();
  await expect(page.getByText('Solver provenance')).toBeVisible();
  await expect(page.locator('dd').filter({ hasText: /^[0-9a-f]{16}$/ })).toBeVisible();
  await expect(page.getByText(/ranking-policy\/1 · style-policy\/1/)).toBeVisible();
});
