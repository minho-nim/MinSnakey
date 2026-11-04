import { test, expect } from '@playwright/test';
for (const width of [320, 390, 768, 1280]) test(`compact layout at ${width}px`, async ({page}) => {
 await page.setViewportSize({width,height:740});
 const fits = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 await page.goto('/'); await fits();
 const canvas=page.getByLabel('머리 그리기 캔버스'); await expect(canvas).toBeVisible();
 expect((await canvas.boundingBox())!.y).toBeLessThan(350);
 await page.screenshot({path:`/tmp/minsnakey-draw-${width}.png`,fullPage:true});
 const tips=page.locator('details.part-draw-guide'); await expect(tips).not.toHaveAttribute('open');
 await tips.locator('summary').click(); await expect(tips).toHaveAttribute('open',''); await fits();
 await page.getByText('연결점 설정',{exact:true}).click(); await expect(page.getByRole('button',{name:/연결점 옮기기/})).toBeVisible(); await fits();
 await page.getByRole('button',{name:'샘플 경기',exact:true}).click(); await fits();
 const start=page.getByRole('button',{name:'경주 시작 →'}); await start.scrollIntoViewIfNeeded(); await expect(start).toBeVisible();
 expect(await start.evaluate(el=>getComputedStyle(el.parentElement!).position)).toBe('static');
 await start.click(); await fits();
 await page.getByRole('button',{name:'결과보기 →'}).click(); await fits();
 await page.screenshot({path:`/tmp/minsnakey-layout-${width}.png`,fullPage:true});
});
