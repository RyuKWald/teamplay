const {chromium} = require('playwright');
const assert = require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined});
 try {
 const p=await b.newPage({viewport:{width:375,height:812}}); p.setDefaultTimeout(3000);
 await p.context().grantPermissions(['accelerometer','gyroscope','magnetometer']);
 await p.route('**/telegram-web-app.js',r=>r.fulfill({body:''}));
 const errors=[]; p.on('pageerror',e=>errors.push(String(e)));
 await p.goto(process.env.TEST_URL || 'http://localhost:8080');
 const button=(name)=>p.getByRole('button',{name,exact:true}).click();
 await button('Все игры · 14');
 const names=await p.locator('.tile strong').allTextContents();
 for(const width of [375,844,1280]) {
   await p.setViewportSize({width,height:width===844?390:812});
   assert.equal(await p.locator('.tile .group-size').count(),14);
   const clipped=await p.locator('.tile').evaluateAll(ns=>ns.filter(n=>[...n.children].some(c=>{
     const r=document.createRange();r.selectNodeContents(c);
     return [...r.getClientRects()].some(v=>v.right>n.getBoundingClientRect().right+1);
   })).map(n=>n.innerText));
   assert.deepEqual(clipped,[],`Text clipped at ${width}: ${clipped}`);
 }
 await p.setViewportSize({width:375,height:812});
 const starts=['Начать матч','Начать матч','Раздать роли','Начать','Начать','Подготовиться','Создать партию','Раздать роли','Начать','Начать','Начать','Начать','Выбрать слово','Начать историю'];
 for(let i=0;i<names.length;i++){
   await p.locator('.tile').nth(i).click();
   if(i===5){
     await button('Настроить игру');await button('Далее');
     await p.getByLabel('Секунд на раунд').selectOption('30');
     await p.locator('#back').click();await button('Далее');
     assert.equal(await p.getByLabel('Секунд на раунд').inputValue(),'30');
     await button('Далее');await p.clock.install();await button(starts[i]);
   }else await button('Играть сейчас');
   if(i===0||i===1){await button('Все готовы · начать');await button('Угадали · +1');}
   if([2,6,7,12].includes(i)){
     const hold=p.getByRole('button',{name:'Удерживайте, чтобы увидеть'}); await hold.focus();
     await p.keyboard.down('Space'); assert.equal(await p.locator('.secret').getAttribute('aria-hidden'),'false');
     await p.keyboard.up('Space'); assert.equal(await p.locator('.secret').getAttribute('aria-hidden'),'true');
     await button('Скрыть и передать');
   }
   if(i===3){await button('Правда');await button('Другая карточка');}
   if(i===4){await button('Следующая карточка');assert.match(await p.locator('#app').innerText(),/Карточка 2/);}
   if(i===5){
     const sample=beta=>p.evaluate(beta=>window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{beta,gamma:0})),beta);
     await p.waitForFunction(()=>{dispatchEvent(new DeviceOrientationEvent('deviceorientation',{beta:90,gamma:0}));return document.querySelector('main').textContent.includes('Готово.');});
     await p.clock.runFor(3050);
     const first=await p.locator('.word').innerText(); await sample(45);
     const next=await p.locator('.word').innerText(); assert.notEqual(first,next);
     await sample(40);assert.equal(next,await p.locator('.word').innerText());
     await sample(90);await sample(135);await button('Угадал');await p.clock.fastForward(31000);
     assert.match(await p.locator('#app').innerText(),/Угадано: 2 · пропущено: 1/);
     await button('В меню');await button('Все игры · 14');console.log(names[i], '2:1');continue;
   }
   if(i===8){await button('Начать раунд');await button('Угадано');}
   if(i===9){await button('Голосовать');await button('Готов голосовать');await button('Игрок 2');}
   if(i===10){await button('Готов · показать задание');await button('Ответы готовы');await button('Да · +1');}
   if(i===11){await p.locator('.card').first().waitFor();}
   if(i===13){await button('Неожиданный поворот');await button('Передать дальше');}
   await p.locator('#back').click();await button('Отмена');await p.locator('#back').click();await button('Да, продолжить');
   await p.locator('.tile').first().waitFor();assert.equal(await p.locator('.tile').count(),14); console.log(names[i],'ok');
 }
 await p.locator('#settings').click();await p.getByLabel('Тактильный отклик').selectOption('off');await p.locator('#back').click();
 await p.addInitScript(()=>{for(const method of ['pushState','replaceState']) History.prototype[method]=()=>{throw new DOMException('Blocked','SecurityError')};});
 await p.reload();await button('Все игры · 14');await p.locator('.tile').first().click();await button('Настроить игру');await p.locator('#back').click();await button('Играть сейчас');await p.locator('#back').click();await button('Да, продолжить');
 assert.equal(await p.locator('.tile').count(),14);
 assert.deepEqual(errors,[]); console.log('Settings, restricted history and console OK');
 } finally {await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
