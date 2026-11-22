// node --experimental-default-type=module --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {tiltMachine, startTilt} from '../js/tilt.js';
import {storage} from '../js/storage.js';

for (const reverse of [false,true]) {
  for (const [axis,sign] of [['portrait',1],['landscape',1],['landscape',-1]]) {
    test(`${axis} ${sign}, reverse=${reverse}: sparse updates, holds and reset`, () => {
      const marks = [], machine = tiltMachine(ok => marks.push(ok),{reverse});
      const sample = elevation => {
        const angle = (90-elevation)*sign*Math.PI/180;
        // Landscape face-down also has an equivalent representation (beta=pi).
        if (axis === 'portrait') machine.sample(angle,0);
        else if (elevation >= 0) machine.sample(0,angle);
        else machine.sample(Math.PI,sign*Math.PI-angle);
      };
      sample(90); // table is not a valid baseline
      sample(0); sample(4); sample(45); sample(65); sample(45);
      sample(0); sample(-45); sample(-60);
      assert.deepEqual(marks,[!reverse,reverse]);
      machine.reset(); sample(-50); sample(0); sample(45);
      assert.deepEqual(marks,[!reverse,reverse,!reverse]);
    });
  }
}

function environment() {
  globalThis.window = new EventTarget();
  globalThis.document = Object.assign(new EventTarget(),{hidden:false});
  window.DeviceOrientationEvent = class {};
  return (beta,gamma=0) => window.dispatchEvent(Object.assign(new Event('deviceorientation'),{beta,gamma}));
}
test('web degrees, visibility pause, permission retry and cleanup', async () => {
  const send = environment(), marks = [], messages = [];
  let clean, grant = false;
  window.DeviceOrientationEvent.requestPermission = async () => grant ? 'granted' : 'denied';
  const ctl = startTilt({onClean: f => clean=f},ok => marks.push(ok),s => messages.push(s));
  await Promise.resolve();
  assert.match(messages.at(-1),/Нет разрешения/);
  grant=true; ctl.recalibrate(); await Promise.resolve();
  send(null); send(90); send(45);
  document.hidden=true; document.dispatchEvent(new Event('visibilitychange'));
  document.hidden=false; document.dispatchEvent(new Event('visibilitychange'));
  send(90); send(135); assert.deepEqual(marks,[true]);
  ctl.recalibrate(); send(90); send(135);
  clean(); send(90); send(45); assert.deepEqual(marks,[true,false]);
});
test('native radians and fallback after Telegram failure; no duplicate streams', () => {
  const send = environment(), handlers = new Map(), marks = [];
  const d = {isStarted:true,beta:0,gamma:0,stop(){assert.fail('borrowed sensor was stopped')}};
  window.Telegram = {WebApp:{platform:'ios',isVersionAtLeast:()=>true,DeviceOrientation:d,
    onEvent:(k,f)=>handlers.set(k,f),offEvent:k=>handlers.delete(k)}};
  const ctl = startTilt({onClean(){}},ok => marks.push(ok),()=>{});
  for (d.beta of [Math.PI/2,Math.PI/4]) handlers.get('deviceOrientationChanged')();
  handlers.get('deviceOrientationFailed')();
  send(90); send(135); send(135);
  assert.deepEqual(marks,[true,false]); ctl.stop();
  assert.equal(handlers.size,0);
});
test('deck cycles do not immediately repeat, including two-card decks', () => {
  environment();
  for (let i=0,previous=null; i<100; i++) {
    const next=storage.draw('two',['a','b']); assert.notEqual(next,previous); previous=next;
  }
  assert.equal(storage.draw('one',['a']),'a');
  assert.equal(storage.draw('one',['a']),'a');
});
