import data from '../data/truth.js';
import { truthModes } from '../expansion/runtime.js';
import { storage, shuffle } from '../storage.js';
import { notify } from '../telegram.js';
import { el, button, panel, row, text, card, select, players } from '../ui.js';
export function mount(ctx) {
  const s = storage.get('truth', {
    names: ['Игрок 1', 'Игрок 2'],
    mode: 'light',
    order: 'turn',
    choice: 'choose'
  });
  const names = players(s.names),
    available = Object.entries(truthModes).filter(([id]) => (id !== 'adult' || storage.adult) && data[id]);
  const mode = select('Настроение встречи', available, available.some(([id]) => id === s.mode) ? s.mode : 'light');
  const order = select('Кто ходит', [['turn', 'По очереди'], ['random', 'Случайная очередь без повторов в круге']], s.order);
  const choice = select('Выбор задания', [['choose', 'Игрок выбирает'], ['roulette', 'Рулетка: правда или действие']], s.choice);
  let people = [],
    index = -1,
    bag = [],
    previous = -1,
    chosen = -1,
    currentKind = 'truth';
  const counter = el('p', {
    class: 'expansion-note'
  });
  const update = () => counter.textContent = `${data[mode.value].truth.length} вопросов · ${data[mode.value].dare.length} действий`;
  mode.input.addEventListener('change', update);
  update();
  ctx.setup('Отвечайте на вопросы или выполняйте задания по очереди. Любой участник может отказаться без объяснений.',
    [['Участники',names.node],['Правила',mode.node,counter,order.node,choice.node]],ctx.launch('Начать', () => {
    people = names.value;
    if (people.length < 2) {
      ctx.toast('Нужно минимум два игрока');
      return;
    }
    storage.set('truth', {
      names: people,
      mode: mode.value,
      order: order.value,
      choice: choice.value
    });
    ctx.setActive(true);
    nextPlayer();
  }));
  function nextPlayer() {
    if (order.value === 'turn') chosen = ++index % people.length;else {
      if (!bag.length) {
        bag = shuffle(people.map((_, i) => i));
        if (bag.length > 1 && bag.at(-1) === previous) [bag[0], bag[bag.length - 1]] = [bag.at(-1), bag[0]];
      }
      chosen = bag.pop();
    }
    previous = chosen;
    if (choice.value === 'roulette') {
      show(Math.random() < .5 ? 'truth' : 'dare');
      return;
    }
    ctx.show(panel(el('h2', {}, `Ход: ${people[chosen]}`), text(mode.value === 'duo' ? 'Можно пригласить любого согласного участника. Отказ не требует объяснения.' : 'Выберите свою карточку.'), row(button('Правда', () => show('truth')), button('Действие', () => show('dare'), 'secondary'))));
  }
  function show(kind) {
    currentKind = kind;
    const prompt = storage.draw(`truth.${mode.value}.${kind}`, data[mode.value][kind]);
    const c = card(prompt, 'prompt');
    c.classList.add('flip');
    ctx.show(panel(el('span', {
      class: 'badge'
    }, `${people[chosen]} · ${truthModes[mode.value]} · ${kind === 'truth' ? 'Правда' : 'Действие'}`), c, row(button('Выполнено', () => {
      notify('success');
      nextPlayer();
    }), button('Другая карточка', () => {
      notify('warning');
      show(currentKind);
    }, 'secondary')), button('Пропустить ход', nextPlayer, 'secondary')));
  }
}
