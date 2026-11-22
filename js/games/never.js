import data from '../data/never.js';
import { storage } from '../storage.js';
import { el, button, panel, text, card, categories, pool, swipe } from '../ui.js';
export function mount(ctx) {
  const s = storage.get('never', {
      categories: ['light']
    }),
    cats = categories(data, s.categories);
  let count = 0,
    deck;
  ctx.setup('Читайте карточки по очереди. Те, с кем это случалось, поднимают руку или загибают палец. Любую карточку можно пропустить.', [['Колоды', cats.node]], ctx.launch('Начать', () => {
    deck = pool(data, cats.value);
    if (!deck.length) {
      ctx.toast('Выберите хотя бы одну колоду');
      return;
    }
    storage.set('never', {
      categories: cats.value
    });
    ctx.setActive(true);
    next();
  }));
  function next() {
    const c = card(storage.draw('never', deck), 'prompt');
    swipe(c, next, next);
    ctx.show(panel(el('span', {
      class: 'badge'
    }, `Карточка ${++count}`), c, button('Следующая карточка', next), text('Свайп в любую сторону — следующая карта.', 'help')));
  }
}
