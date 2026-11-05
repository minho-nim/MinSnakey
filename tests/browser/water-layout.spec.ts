import {test,expect} from '@playwright/test';
for (const width of [320,1280]) test(`track stays fixed on water entry and exit at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/');
 await page.getByRole('button',{name:'샘플 경기',exact:true}).click();
 await page.clock.install();await page.getByRole('button',{name:'경주 시작 →'}).click();
 const track=page.locator('canvas.terrain-canvas');
 const top=(await track.boundingBox())!.y;
 let wet=false,dryAfter=false;
 for(let i=0;i<16;i++){
  await page.clock.runFor(500);
  const note=page.locator('.water-status');
  if(await note.isVisible())wet=true;else if(wet)dryAfter=true;
  if(await track.count())expect(Math.abs((await track.boundingBox())!.y-top)).toBeLessThan(1);
 }
 expect(wet).toBe(true);expect(dryAfter).toBe(true);
});
