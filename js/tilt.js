// Elevation of the outward-facing screen normal. Its sign does not depend
// on which short edge of the phone points up (portrait or either landscape).
export function tiltMachine(onAction, {threshold = .55, reverse = false} = {}) {
  let baseline = null, armed = false;
  return {
    reset() { baseline = null; armed = false; },
    sample(beta, gamma) {
      if (!Number.isFinite(beta) || !Number.isFinite(gamma)) return;
      const angle = Math.asin(Math.cos(beta) * Math.cos(gamma));
      if (baseline === null) {
        if (Math.abs(angle) > Math.PI / 6) return; // Not yet at the forehead.
        baseline = angle;
        armed = true;
        return 'ready';
      }
      const delta = angle - baseline;
      if (Math.abs(delta) < .16) armed = true;
      if (armed && Math.abs(delta) >= Math.asin(threshold)) {
        armed = false;
        onAction((delta > 0) !== reverse);
      }
    }
  };
}

export function startTilt(ctx, onAction, onState, options = {}) {
  const machine = tiltMachine(onAction, options);
  const tg = window.Telegram?.WebApp;
  const native = tg?.platform !== 'unknown' && tg?.isVersionAtLeast?.('8.0') && tg.DeviceOrientation;
  let stopped = false, paused = false, usingWeb = false, ownsNative = false;
  let nativeFailed = false, waitingPermission = false, received = false, timeout;
  const status = message => { if (!stopped && !paused) onState(message); };
  function feed(beta, gamma) {
    if (stopped || paused || document.hidden || !Number.isFinite(beta) || !Number.isFinite(gamma)) return;
    received = true;
    clearTimeout(timeout);
    if (machine.sample(beta, gamma) === 'ready') status('Готово. После каждого наклона возвращайте телефон к исходному положению.');
  }
  const webSample = e => {
    if (Number.isFinite(e.beta) && Number.isFinite(e.gamma)) feed(e.beta * Math.PI / 180, e.gamma * Math.PI / 180);
  };
  const nativeSample = () => { if (!usingWeb && !nativeFailed) feed(native.beta, native.gamma); };
  function watch() {
    clearTimeout(timeout);
    timeout = setTimeout(() => status('Нет данных. Нажмите «Калибровка», чтобы попробовать снова, или используйте кнопки.'), 4000);
  }
  async function web(userGesture) {
    if (usingWeb || waitingPermission || stopped) return;
    const D = window.DeviceOrientationEvent;
    if (!D) { clearTimeout(timeout); status('Датчик недоступен. Играйте кнопками.'); return; }
    if (typeof D.requestPermission === 'function') {
      if (!userGesture) { clearTimeout(timeout); status('Нажмите «Калибровка», чтобы разрешить датчик браузера.'); return; }
      waitingPermission = true;
      try {
        if (await D.requestPermission() !== 'granted') throw Error();
      } catch {
        clearTimeout(timeout);
        status('Нет разрешения на датчик. Используйте кнопки или разрешите доступ и повторите калибровку.');
        return;
      } finally { waitingPermission = false; }
    }
    if (!stopped) {
      usingWeb = true;
      machine.reset();
      window.addEventListener('deviceorientation', webSample);
      watch();
    }
  }
  const failed = () => {
    if (stopped || nativeFailed) return;
    nativeFailed = true;
    web(false);
  };
  function recalibrate() {
    if (stopped) return;
    paused = false;
    machine.reset();
    status('Держите телефон у лба вертикально, экраном к компании.');
    watch();
    if (!native || nativeFailed || !received) web(true);
    received = false;
  }
  function visibility() {
    paused = true;
    clearTimeout(timeout);
    machine.reset();
    if (!document.hidden) onState('Нажмите «Калибровка», чтобы снова включить наклоны.');
  }
  function stop() {
    if (stopped) return;
    stopped = true;
    clearTimeout(timeout);
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('deviceorientation', webSample);
    if (native) {
      tg.offEvent('deviceOrientationChanged', nativeSample);
      tg.offEvent('deviceOrientationFailed', failed);
      if (ownsNative && native.isStarted) native.stop();
    }
  }
  ctx.onClean(stop);
  document.addEventListener('visibilitychange', visibility);
  status('Приложите телефон ко лбу экраном к компании.');
  watch();
  if (native) {
    try {
      tg.onEvent('deviceOrientationChanged', nativeSample);
      tg.onEvent('deviceOrientationFailed', failed);
      if (!native.isStarted) {
        ownsNative = true;
        native.start({refresh_rate: 40, need_absolute: false}, ok => {
          if (!ok) failed();
          else if (stopped && native.isStarted) native.stop();
        });
      }
    } catch { failed(); }
  } else web(true);
  return {stop, recalibrate};
}
