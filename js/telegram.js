const tg = window.Telegram?.WebApp;
export const inTelegram = !!tg && tg.platform !== 'unknown';
const supported = v => inTelegram && tg.isVersionAtLeast(v);
function safe(fn) {
  try {
    fn();
  } catch (e) {
    console.debug('Telegram fallback', e);
  }
}
export function impact(style = 'light') {
  if (supported('6.1')) safe(() => tg.HapticFeedback.impactOccurred(style));else if (navigator.vibrate) safe(() => navigator.vibrate(style === 'heavy' ? 65 : style === 'medium' ? 35 : 12));
}
export function notify(type) {
  if (supported('6.1')) safe(() => tg.HapticFeedback.notificationOccurred(type));else if (navigator.vibrate) safe(() => navigator.vibrate(type === 'error' ? [90, 40, 90] : 35));
}
export function theme() {
  return inTelegram ? tg.colorScheme : matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
}
export function nativeBack(visible) {
  if (supported('6.1')) safe(() => visible ? tg.BackButton.show() : tg.BackButton.hide());
  document.querySelector('#back').hidden = !visible || supported('6.1');
}
export function colors(color) {
  if (supported('6.9')) safe(() => tg.setHeaderColor(color));
  if (supported('6.1')) safe(() => tg.setBackgroundColor(color));
}
export function closing(active) {
  if (supported('6.2')) safe(() => active ? tg.enableClosingConfirmation() : tg.disableClosingConfirmation());
}
export function init(back) {
  if (tg) safe(() => {
    tg.ready();
    tg.expand();
  });
  if (supported('6.1')) tg.BackButton.onClick(back);
  const apply = () => {
    document.documentElement.dataset.theme = theme();
    window.dispatchEvent(new Event('krugtheme'));
  };
  if (inTelegram) tg.onEvent('themeChanged', apply);
  matchMedia('(prefers-color-scheme:dark)').addEventListener('change', apply);
  apply();
  document.addEventListener('click', e => {
    if (e.target.closest('button,input[type=checkbox],summary') && !e.target.closest('[disabled]')) impact('light');
  });
}
