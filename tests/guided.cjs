// Use the same local server and Playwright installation as tests/smoke.cjs.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
  try{
    const p=await b.newPage({viewport:{width:375,height:812}});
    p.setDefaultTimeout(3500);
    const errors=[];p.on('pageerror',e=>errors.push(String(e)));
    await p.route('**/telegram-web-app.js',r=>r.fulfill({body:''}));
    const click=name=>p.getByRole('button',{name,exact:true}).click();
    await p.goto(process.env.TEST_URL||'http://localhost:8080');
    const visited=new Set();
    for(let f=0;f<4;f++){
      await p.locator('.format-row').nth(f).click();
      const names=await p.locator('.tile strong').allTextContents();
      assert.equal(names.length,[4,4,3,3][f]);
      for(const name of names){
        assert.ok(!visited.has(name));visited.add(name);
        await p.locator('.tile').filter({has:p.getByText(name,{exact:true})}).click();
        await click('Настроить игру');
        if(name==='Шпион'){
          await p.getByLabel('Игроков',{exact:true}).fill('3');
          await p.getByLabel('Шпионов',{exact:true}).fill('2');
          await click('Далее');await p.getByRole('alert').waitFor();
          await p.getByLabel('Шпионов',{exact:true}).fill('1');
          await click('Далее');await p.goBack();
          assert.equal(await p.getByLabel('Игроков',{exact:true}).inputValue(),'3');
          await p.goForward();
        }
        if(name==='История по кругу'){
          const input=p.locator('textarea');await input.fill('Лена');
          await click('Далее');await p.getByRole('alert').waitFor();await input.fill('Лена\nИра');
        }
        while(await p.getByRole('button',{name:'Далее',exact:true}).count())await click('Далее');
        const start=p.locator('.setup-shell > button.primary');
        if(name==='Я никогда не'){
          const checked=p.locator('fieldset input:checked');
          while(await checked.count())await checked.first().uncheck();
          await start.click();await p.getByRole('alert').waitFor();
          await p.locator('fieldset input').first().check();
        }
        await start.click();
        await p.locator('.setup-shell').waitFor({state:'detached'});
        await p.locator('#back').click();await click('Да, продолжить');
        await p.locator('.tile').first().waitFor();
      }
      await p.locator('#back').click();await p.locator('.format-row').first().waitFor();
    }
    assert.equal(visited.size,14);assert.deepEqual(errors,[]);
    console.log('All 14 guided launches, 4 formats, 3 validation paths and history passed.');
  }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
