import { test, expect } from '@playwright/test';
test('Phaser renders and accepts pointer input after resizing', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-ready', 'true');
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(200);
    const box = await canvas.boundingBox();
    if (!box) throw Error('Canvas missing');
    await canvas.click({
      position: { x: box.width * 0.5, y: (box.height * 300) / 540 },
    });
  }
  await expect(canvas).toHaveAttribute('data-clicks', '2');
  expect(errors).toEqual([]);
});
