import {test,expect} from '@playwright/test';
test('quick start reports missing parts and starts from any drawing step', async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:'다음 단계 ▶'}).click();
 await expect(page.getByRole('alert')).toContainText('머리가 안 그려졌어요!');
 await expect(page.getByRole('alert')).toContainText('몸통이 안 그려졌어요!');
 await expect(page.getByRole('alert')).toContainText('꼬리가 안 그려졌어요!');
 for(const part of ['머리','몸통','꼬리']){
  await page.getByRole('navigation',{name:'그리기 단계'}).getByRole('button',{name:new RegExp(part)}).click();
  await page.getByRole('button',{name:'샘플 ＋',exact:true}).click();
 }
 await page.getByRole('navigation',{name:'그리기 단계'}).getByRole('button',{name:/머리/}).click();
 await page.getByRole('button',{name:'다음 단계 ▶'}).click();
 await expect(page.getByRole("heading",{name:"반가워, 나의 꼬물이!"})).toBeVisible();
 await page.getByRole("button",{name:"경기 준비하러 →"}).click();
 await page.getByRole("button",{name:"경주 시작 →"}).click();
 await expect(page.getByRole('button',{name:'결과보기 →'})).toBeVisible();
 await page.getByRole('button',{name:'결과보기 →'}).click();
 await expect(page.getByRole('heading',{name:'끝까지 달렸어요!'})).toBeVisible();
});
