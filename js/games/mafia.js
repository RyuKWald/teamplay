import { roles, descriptions, nightOrder } from '../data/mafia.js';
import { mafiaThemes } from '../expansion/runtime.js';
import { storage, shuffle } from '../storage.js';
import { el, button, panel, text, number, toggle, select, privateDeal, timer, card, confirm } from '../ui.js';
export function composition(n, preset) {
  let team = Math.max(1, Math.floor(n / 3));
  const p = {
    mafia: team,
    don: false,
    commissar: true,
    doctor: n >= 7,
    mistress: false,
    maniac: false
  };
  if (preset === 'first') {
    p.mafia = Math.max(1, Math.floor(n / 4));
    p.commissar = n >= 6;
    p.doctor = false;
  }
  if (preset === 'city') {
    p.don = n >= 7;
    p.mafia = team - (p.don ? 1 : 0);
    p.doctor = true;
    p.mistress = n >= 9;
  }
  if (preset === 'chaos') {
    team = Math.max(1, Math.floor((n - 1) / 3));
    p.don = n >= 8;
    p.mafia = team - (p.don ? 1 : 0);
    p.doctor = n >= 8;
    p.mistress = n >= 11;
    p.maniac = n >= 10;
  }
  return p;
}
export function valid(n, p) {
  const bad = p.mafia + (p.don ? 1 : 0),
    special = ['commissar', 'doctor', 'mistress', 'maniac'].filter(k => p[k]).length,
    civ = n - bad - special;
  return {
    bad,
    special,
    civ,
    ok: bad >= 1 && civ >= 0 && bad * 2 < n && (bad + (p.maniac ? 1 : 0)) * 2 < n + 1
  };
}
export function mount(ctx) {
  const s = storage.get('mafia', {
    players: 8,
    mafia: 2,
    don: true,
    commissar: true,
    doctor: true,
    mistress: false,
    maniac: false,
    preset: 'custom',
    theme: 'city',
    day: 3,
    vote: 60
  });
  const count = number('Игроков, без ведущего', 5, 15, s.players),
    mafia = number('Простых мафиози', 0, 5, s.mafia),
    opts = Object.fromEntries(['don', 'commissar', 'doctor', 'mistress', 'maniac'].map(k => [k, toggle(roles[k], s[k])]));
  const preset = select('Состав ролей', [['custom', 'Свой состав'], ['first', 'Первое знакомство'], ['classic', 'Классика'], ['city', 'Большой город'], ['chaos', 'Хаос']], s.preset);
  const theme = select('Атмосфера', Object.entries(mafiaThemes).map(([id, v]) => [id, v.label]), s.theme);
  const day = select('Дневное обсуждение, минут', [1, 2, 3, 5, 7], s.day),
    vote = select('Голосование, секунд', [30, 60, 90, 120], s.vote);
  const info = el('p', {
      class: 'expansion-note'
    }),
    intro = el('p', {
      class: 'theme-intro'
    });
  let stop = () => {};
  ctx.onClean(() => stop());
  const values = () => ({
    mafia: mafia.value,
    ...Object.fromEntries(Object.entries(opts).map(([k, v]) => [k, v.value]))
  });
  function status() {
    const b = valid(count.value, values());
    info.textContent = b.ok ? `Мафии: ${b.bad} · особых: ${b.special} · мирных: ${b.civ}. Допустимый стартовый состав.` : 'Исправьте состав: нужна мафия, неотрицательное число мирных и отсутствие стартового большинства враждебных ролей.';
    return b.ok;
  }
  function apply() {
    if (preset.value !== 'custom') {
      const p = composition(count.value, preset.value);
      mafia.input.value = p.mafia;
      Object.keys(opts).forEach(k => opts[k].input.checked = p[k]);
    }
    status();
  }
  count.input.oninput = apply;
  preset.input.onchange = apply;
  mafia.input.oninput = () => {
    preset.input.value = 'custom';
    status();
  };
  Object.values(opts).forEach(sw => sw.input.onchange = () => {
    preset.input.value = 'custom';
    status();
  });
  const story = () => intro.textContent = mafiaThemes[theme.value].intro;
  theme.input.onchange = story;
  story();
  apply();
  ctx.setup('Ночью мафия действует тайно, днём город ищет виновных. Нужен отдельный ведущий: он проводит ночные действия и объявляет победителя.',
    [['Состав партии',count.node,preset.node],['Роли',mafia.node,...Object.values(opts).map(sw => sw.node),info,()=>!status() && 'Исправьте состав ролей'],['Обсуждение',theme.node,intro,day.node,vote.node]], ctx.launch('Раздать роли', () => {
    if (!status()) {
      ctx.toast('Исправьте состав ролей');
      return;
    }
    const n = count.value,
      p = values(),
      assigned = [];
    for (let i = 0; i < p.mafia; i++) assigned.push('mafia');
    Object.keys(opts).forEach(k => p[k] && assigned.push(k));
    while (assigned.length < n) assigned.push('civilian');
    const deck = shuffle(assigned);
    storage.set('mafia', {
      players: n,
      ...p,
      preset: preset.value,
      theme: theme.value,
      day: +day.value,
      vote: +vote.value
    });
    ctx.setActive(true);
    privateDeal(ctx, deck.map((r, i) => ({
      name: `Игрок ${i + 1}`,
      content: () => el('div', {}, card(roles[r], 'prompt'), text(descriptions[r], 'help'))
    })), () => host(deck, theme.value));
  }));
  function host(assigned, themeId) {
    const dead = assigned.map(() => false),
      clock = el('div', {
        class: 'timer'
      });
    let step = 0,
      round = 1,
      revealed = false;
    const hide = () => {
      if (revealed) {
        revealed = false;
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
      const phases = nightOrder.filter(([id]) => id === 'dawn' || assigned.some((r, i) => !dead[i] && (r === id || id === 'mafia' && r === 'don')));
      step = Math.min(step, phases.length - 1);
      ctx.show(panel(el('h2', {}, `Ночь ${round} · ${mafiaThemes[themeId].label}`), text(mafiaThemes[themeId].intro, 'theme-intro'), el('p', {
        class: 'expansion-note'
      }, `Шаг ${step + 1}/${phases.length}: ${phases[step][1]}`), button(step === phases.length - 1 ? 'Следующая ночь' : 'Следующий шаг', () => {
        if (step === phases.length - 1) {
          round++;
          step = 0;
        } else step++;
        render();
      })), panel(el('h3', {}, 'Игроки'), button(revealed ? 'Скрыть роли' : 'Показать роли ведущему', () => {
        revealed = !revealed;
        render();
      }, 'secondary'), ...assigned.map((r, i) => {
        const sw = toggle(`Игрок ${i + 1}${revealed ? ' — ' + roles[r] : ''}${dead[i] ? ' · выбыл' : ''}`, dead[i]);
        sw.input.onchange = () => {
          dead[i] = sw.value;
          render();
        };
        return sw.node;
      }), text(`Живых: ${dead.filter(x => !x).length}`)), panel(el('h3', {}, 'Дневной таймер'), clock, button(`Обсуждение · ${day.value} мин`, () => {
        stop();
        stop = timer(+day.value * 60, clock, () => {});
      }, 'secondary'), button(`Голосование · ${vote.value} сек`, () => {
        stop();
        stop = timer(+vote.value, clock, () => {});
      }, 'secondary')), el('details', {
        class: 'panel'
      }, el('summary', {}, 'Правила этой версии'), text('Любовница блокирует действие выбранного игрока, но не защищает его. Дон убивает вместе с Мафией и отдельно ищет Комиссара. Комиссар находит Мафию и Дона. Доктор защищает от обоих убийств; нельзя лечить одного человека две ночи подряд. Если заблокирован единственный действующий мафиози, убийства мафии нет. Без Маньяка мирные побеждают при отсутствии мафии, мафия — при равенстве или большинстве. С живым Маньяком партия продолжается; Маньяк побеждает, оставшись единственным живым. Если не осталось никого — ничья. Ведущий учитывает эффекты и объявляет результат.', 'help')), button('Завершить партию', async () => {
        if (await confirm('Завершить партию?', 'Текущая раздача и отметки выбывших будут потеряны.')) {
          ctx.setActive(false);
          ctx.home();
        }
      }, 'secondary'));
    }
    render();
  }
}
