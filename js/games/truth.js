import data from '../data/truth.js';
import { storage, shuffle } from '../storage.js';
import { el, button, panel, row, text, card, select, players } from '../ui.js';
export function mount(ctx) {
  const s = storage.get('truth', {
      names: ['Игрок 1', 'Игрок 2'],
      mode: 'light',
      order: 'turn'
    }),
    names = players(s.names),
    mode = select('Режим', [['light', 'Лайт'], ['party', 'Вечеринка'], ...(storage.adult ? [['adult', '18+']] : [])], s.mode),
    order = select('Порядок', [['turn', 'По очереди'], ['random', 'Случайный без повторов в круге']], s.order);
  let people = [],
    index = -1,
    bag = [],
    chosen,
    type;
  ctx.show(panel(el('h2', {}, 'Правда или действие'), text('Любой вопрос или действие можно пропустить без объяснений. Никаких обязательных прикосновений и опасных заданий.', 'help'), names.node, mode.node, order.node, button('Начать', () => {
    people = names.value;
    if (people.length < 2) {
      ctx.toast('Добавьте минимум два имени');
      return;
    }
    storage.set('truth', {
      names: people,
      mode: mode.value,
      order: order.value
    });
    ctx.setActive(true);
    nextPlayer();
  })));
  function nextPlayer() {
    if (order.value === 'turn') chosen = people[++index % people.length];else {
      if (!bag.length) bag = shuffle(people.map((_, i) => i));
      chosen = people[bag.pop()];
    }
    ctx.show(panel(el('h2', {}, `Ход: ${chosen}`), text('Что выбираете?'), row(button('Правда', () => show('truth')), button('Действие', () => show('dare'), 'secondary'))));
  }
  function show(t) {
    type = t;
    const task = storage.draw(`truth.${mode.value}.${t}`, data[mode.value][t]);
    const c = card(task, 'prompt');
    c.classList.add('flip');
    ctx.show(panel(el('span', {
      class: 'badge'
    }, `${chosen} · ${t === 'truth' ? 'Правда' : 'Действие'}`), c, row(button('Выполнено', nextPlayer), button('Сменить задание', () => show(type), 'secondary')), button('Отказаться · следующий игрок', nextPlayer, 'secondary')));
  }
}
