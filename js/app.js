import { init, nativeBack, colors, closing, theme } from './telegram.js';
import { el, toast, confirm, closeModal } from './ui.js';
import { mount as settings } from './settings.js';
const games = [['croc', 'Крокодил', '🐊', 'Покажи без слов', '#18b66a', '#a7d62a', () => import('./games/croc.js')], ['alias', 'Элиас', '💬', 'Объясни за минуту', '#f2a516', '#ffd34a', () => import('./games/alias.js')], ['spy', 'Шпион', '🕵️', 'Найди шпиона среди своих', '#3045a8', '#162553', () => import('./games/spy.js')], ['truth', 'Правда или действие', '🎯', 'Выбор без повтора', '#e0307c', '#c2185b', () => import('./games/truth.js')], ['never', 'Я никогда не', '🙌', 'Признания без давления', '#8a42d8', '#b57ae8', () => import('./games/never.js')], ['who', 'Кто я', '🧠', 'Угадай на лбу', '#12a8d6', '#1ac6b7', () => import('./games/who.js')], ['bunker', 'Бункер', '🏚️', 'Кто достоин места', '#e1731f', '#b95133', () => import('./games/bunker.js')], ['mafia', 'Мафия', '🎭', 'Ночь, город, подозрения', '#8f1d3f', '#3b2f35', () => import('./games/mafia.js')]];
const app = document.querySelector('#app'),
  title = document.querySelector('#title');
let cleaners = [],
  active = false,
  screen = 'home',
  navId = 0;
const css = (a, b) => {
  document.documentElement.style.setProperty('--accent', a);
  document.documentElement.style.setProperty('--second', b);
  document.documentElement.style.setProperty('--on-accent', ['#18b66a', '#f2a516', '#12a8d6', '#e1731f'].includes(a) ? '#14202b' : '#ffffff');
};
function applyColors() {
  const dark = theme() === 'dark';
  const base = dark ? '#101320' : '#edf0fa';
  document.body.style.setProperty('background', base);
  colors(base);
}
function reset() {
  cleaners.splice(0).forEach(f => {
    try {
      f();
    } catch {}
  });
  active = false;
  closing(false);
  closeModal();
}
const ctx = {
  show: (...n) => {
    app.replaceChildren(el('div', {
      class: 'screen stack'
    }, ...n));
    app.focus({
      preventScroll: true
    });
    scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  },
  onClean: f => cleaners.push(f),
  setActive: v => {
    active = v;
    closing(v);
  },
  home: () => go('home'),
  toast
};
async function go(target, force = false, fromHistory = false) {
  const id = ++navId;
  if (!force && active && target !== screen && !(await confirm('Выйти из игры?', 'Текущий раунд и счёт будут потеряны.'))) {
    return;
  }
  if (id !== navId) return;
  if (!fromHistory && target !== screen) {
    if (target === 'home') history.replaceState({
      krug: true,
      screen: 'home'
    }, '');else history.pushState({
      krug: true,
      screen: target
    }, '');
  }
  reset();
  screen = target;
  nativeBack(target !== 'home');
  document.querySelector('#settings').hidden = target === 'settings';
  if (target === 'home') {
    title.textContent = 'Круг';
    css('#7378ed', '#d39bcf');
    home();
    return;
  }
  if (target === 'settings') {
    title.textContent = 'Настройки';
    css('#6a73d9', '#bc88e3');
    settings(ctx);
    return;
  }
  const g = games.find(x => x[0] === target);
  title.textContent = g[1];
  css(g[4], g[5]);
  try {
    const module = await g[6]();
    if (id !== navId) return;
    module.mount(ctx);
  } catch (e) {
    console.error(e);
    ctx.show(el('section', {
      class: 'panel'
    }, el('h2', {}, 'Не удалось открыть игру'), el('button', {
      class: 'primary',
      onclick: () => go('home', true)
    }, 'На главную')));
  }
}
function home() {
  app.replaceChildren(el('div', {
    class: 'screen'
  }, el('div', {
    class: 'hero'
  }, el('h2', {}, 'Восемь игр на один телефон'), el('p', {}, 'Передавайте устройство по кругу. Всё хранится только на устройстве.')), el('div', {
    class: 'grid'
  }, games.map(([id, name, icon, desc, a, b]) => el('button', {
    class: 'tile',
    type: 'button',
    style: `--tile:${a}`,
    onclick: () => go(id)
  }, el('span', {
    class: 'icon'
  }, icon), el('strong', {}, name), el('small', {}, desc))))));
}
init(() => {
  if (screen !== 'home') go('home');
});
document.querySelector('#back').onclick = () => go('home');
document.querySelector('#settings').onclick = () => go('settings');
window.addEventListener('krugtheme', applyColors);
window.addEventListener('krugnotice', e => toast(e.detail));
history.replaceState({
  krug: true,
  screen: 'home'
}, '');
addEventListener('popstate', async e => {
  const target = e.state?.krug ? e.state.screen : 'home';
  if (active && !(await confirm('Выйти из игры?', 'Текущий раунд и счёт будут потеряны.'))) {
    history.pushState({
      krug: true,
      screen
    }, '');
    return;
  }
  go(target, true, true);
});
applyColors();
go('home', true);
