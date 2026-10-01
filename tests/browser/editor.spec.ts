import { test, expect } from '@playwright/test';

test('real renderer: add, edit, save locally and reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: '+ Aggiungi punto', exact: true })).toBeEnabled();
  await expect(page.getByText('2/100 punti')).toBeVisible();
  await page.getByRole('button', { name: '+ Aggiungi punto', exact: true }).click();
  const stage = page.locator('model-viewer');
  await stage.scrollIntoViewIfNeeded();
  const rect = await stage.boundingBox();
  if (!rect) throw new Error('3D stage missing');
  await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await expect(page.getByText('3/100 punti')).toBeVisible();
  await page.getByLabel('Titolo del punto', { exact: true }).fill('Incisione di prova');
  await page.getByRole('button', { name: 'Memorizza vista', exact: true }).click();
  await page.getByRole('button', { name: 'Salva esperienza', exact: true }).click();
  await expect(page.getByText('Salvato in questo browser.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('2/100 punti')).toBeVisible();
  await page.getByLabel('Esperienza salvata', { exact: true }).press('ArrowDown');
  await page.getByRole('option', { name: 'Vaso di studio' }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Apri', exact: true }).click();
  await expect(page.getByText('3/100 punti')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Punti modificabili' }).getByText('Incisione di prova')).toBeVisible();
  await page.getByRole('button', { name: 'Anteprima visitatore', exact: true }).click();
  await page.getByRole('navigation', { name: 'Punti del modello' }).getByRole('button', { name: '3. Incisione di prova', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Incisione di prova' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('rotation gesture never creates an annotation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '+ Aggiungi punto', exact: true }).click();
  const stage = page.locator('model-viewer');
  await stage.scrollIntoViewIfNeeded();
  const rect = await stage.boundingBox();
  if (!rect) throw new Error('3D stage missing');
  const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + 90, y + 50, { steps: 8 });
  await page.mouse.move(x, y, { steps: 8 }); await page.mouse.up();
  await expect(page.getByText('2/100 punti')).toBeVisible();
});
