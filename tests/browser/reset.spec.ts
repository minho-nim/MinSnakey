import {test,expect} from '@playwright/test';
test('part erasing preserves other drawings and full reset clears all three',async({page})=>{
 await page.goto('/'); const tabs=page.getByRole('navigation',{name:'그리기 단계'});
 for(const part of ['머리','몸통','꼬리']){await tabs.getByRole('button',{name:new RegExp(part)}).click(); await page.getByRole('button',{name:'샘플 ＋',exact:true}).click();}
 await page.getByRole('button',{name:'이 부위 지우기',exact:true}).click();
 await expect(tabs.getByRole('button',{name:/머리/})).toHaveAttribute('data-drawn','true');
 await expect(tabs.getByRole('button',{name:/몸통/})).toHaveAttribute('data-drawn','true');
 await expect(tabs.getByRole('button',{name:/꼬리/})).toHaveAttribute('data-drawn','false');
 await page.getByRole('button',{name:'전체 초기화',exact:true}).click();
 for(const part of ['머리','몸통','꼬리'])await expect(tabs.getByRole('button',{name:new RegExp(part)})).toHaveAttribute('data-drawn','false');
 await expect(page.getByLabel('그림 분석')).toContainText('아직 빈 종이');
});
