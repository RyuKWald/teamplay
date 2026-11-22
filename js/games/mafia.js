import { roles, descriptions, nightOrder } from '../data/mafia.js';
import { storage, shuffle } from '../storage.js';
import { el, button, panel, text, number, toggle, privateDeal, timer, card } from '../ui.js';
export function mount(ctx) {
  const s = storage.get('mafia', {
      players: 8,
      mafia: 2,
      don: true,
      commissar: true,
      doctor: true,
      mistress: false,
      maniac: false
    }),
    count = number('Игроков', 5, 15, s.players),
    mafia = number('Простых мафиози', 0, 5, s.mafia),
    opts = Object.fromEntries(['don', 'commissar', 'doctor', 'mistress', 'maniac'].map(k => [k, toggle(roles[k], s[k])]));
  const info = el('p', {
    class: 'notice'
  });
  let stop = () => {};
  ctx.onClean(() => stop());
  function status() {
    const n = count.value,
      bad = mafia.value + (opts.don.value ? 1 : 0),
      single = ['commissar', 'doctor', 'mistress', 'maniac'].filter(k => opts[k].value).length,
      civ = n - bad - single,
      ok = bad >= 1 && civ >= 0 && bad * 2 < n && (bad + (opts.maniac.value ? 1 : 0)) * 2 < n + 1;
    info.textContent = ok ? `Баланс: ${bad} мафии, ${single} особых, ${civ} мирных. Допустимо.` : `Баланс нарушен: нужно ≥1 мафиози, не более ${Math.ceil(n / 2) - 1} мафии и без отрицательных мирных (сейчас ${civ}).`;
    return ok;
  }
  [count, mafia].forEach(x => x.input.oninput = status);
  Object.values(opts).forEach(x => x.input.onchange = status);
  status();
  ctx.show(panel(el('h2', {}, 'Мафия'), text('Нужен отдельный ведущий, не входящий в число игроков. После раздачи передайте телефон ему. Итоги ночи, блокировки и победу определяет ведущий по правилам ниже.', 'help'), count.node, mafia.node, ...Object.values(opts).map(x => x.node), info, button('Раздать роли', () => {
    if (!status()) {
      ctx.toast('Исправьте баланс ролей');
      return;
    }
    const n = count.value,
      list = [];
    if (opts.don.value) list.push('don');
    for (let i = 0; i < mafia.value; i++) list.push('mafia');
    ['commissar', 'doctor', 'mistress', 'maniac'].forEach(k => opts[k].value && list.push(k));
    while (list.length < n) list.push('civilian');
    const assigned = shuffle(list);
    storage.set('mafia', {
      players: n,
      mafia: mafia.value,
      ...Object.fromEntries(Object.entries(opts).map(([k, v]) => [k, v.value]))
    });
    ctx.setActive(true);
    privateDeal(ctx, assigned.map((r, i) => ({
      name: `Игрок ${i + 1}`,
      content: () => el('div', {}, card(roles[r], 'prompt'), text(descriptions[r], 'help'))
    })), () => host(assigned));
  })));
  function host(rolesList) {
    const clock = el('div', {
      class: 'timer'
    });
    const dead = rolesList.map(() => false);
    let step = 0,
      showRoles = false;
    const hide = () => {
      if (showRoles) {
        showRoles = false;
        render();
      }
    };
    window.addEventListener('blur', hide);
    document.addEventListener('visibilitychange', hide);
    ctx.onClean(() => {
      window.removeEventListener('blur', hide);
      document.removeEventListener('visibilitychange', hide);
    });
    function render() {
      const active = nightOrder.filter(([k]) => k === 'dawn' || rolesList.some((r, i) => (r === k || k === 'mafia' && r === 'don') && !dead[i]));
      const [cur, textLine] = active[Math.min(step, active.length - 1)];
      ctx.show(panel(el('h2', {}, 'Помощник ведущего'), el('p', {
        class: 'notice'
      }, `Ночь · шаг ${Math.min(step + 1, active.length)}/${active.length}: ${textLine}`), button(step >= active.length - 1 ? 'Начать сначала' : 'Следующий шаг', () => {
        step = step >= active.length - 1 ? 0 : step + 1;
        render();
      })), panel(el('h3', {}, 'Игроки'), button(showRoles ? 'Скрыть роли' : 'Показать роли ведущему', () => {
        showRoles = !showRoles;
        render();
      }, 'secondary'), ...rolesList.map((r, i) => {
        const t = toggle(`Игрок ${i + 1}${showRoles ? ' — ' + roles[r] : ''}${dead[i] ? ' · выбыл' : ''}`, dead[i]);
        t.input.onchange = () => {
          dead[i] = t.value;
          render();
        };
        return t.node;
      }), el('p', {
        class: 'notice'
      }, 'Живых: ' + dead.filter(x => !x).length)), panel(el('h3', {}, 'Памятка ведущему'), text('Любовница блокирует роль, но не защищает от убийства. Дон входит в мафию и убивает вместе с ней. Проверка Дона ищет Комиссара, проверка Комиссара находит Мафию и Дона. Доктор защищает от обоих убийств. Без Маньяка мирные побеждают при отсутствии мафии, мафия — при равенстве или большинстве. С живым Маньяком игра продолжается; Маньяк побеждает, оставшись единственным живым. Если после ночи не выжил никто — ничья. Ведущий объявляет результат, приложение не вычисляет его автоматически.', 'help')), panel(el('h3', {}, 'Дневной таймер'), clock, button('Обсуждение 3 мин', () => {
        stop();
        stop = timer(180, clock, () => {});
      }, 'secondary'), button('Голосование 1 мин', () => {
        stop();
        stop = timer(60, clock, () => {});
      }, 'secondary')), button('Завершить партию', ctx.home, 'secondary'));
    }
    render();
  }
}
