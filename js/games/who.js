import data from '../data/who.js';
import { storage } from '../storage.js';
import { notify } from '../telegram.js';
import { el, button, panel, row, text, card, categories, pool, select, timer } from '../ui.js';
export function mount(ctx) {
  const s = storage.get('who', {
      categories: ['characters'],
      seconds: 60
    }),
    cats = categories(data, s.categories),
    seconds = select('Секунд на раунд', [30, 60, 90, 120], s.seconds);
  let stop = () => {},
    countId,
    deck,
    guessed = 0,
    passed = 0,
    running = false;
  ctx.onClean(() => {
    stop();
    clearTimeout(countId);
  });
  ctx.show(panel(el('h2', {}, 'Кто я?'), text('Задавайте вопросы с ответом «да» или «нет». Держите экран ко всем, а не к себе. В горизонтальном положении кнопки будут по краям.', 'help'), seconds.node), cats.node, button('Начать обратный отсчёт', () => {
    deck = pool(data, cats.value);
    if (!deck.length) {
      ctx.toast('Выберите категорию');
      return;
    }
    storage.set('who', {
      categories: cats.value,
      seconds: +seconds.value
    });
    ctx.setActive(true);
    countdown(3);
  }));
  function countdown(n) {
    if (!n) {
      start();
      return;
    }
    ctx.show(panel(el('h2', {}, 'Приложите телефон ко лбу'), el('div', {
      class: 'countdown'
    }, n)));
    countId = setTimeout(() => countdown(n - 1), 1000);
  }
  function start() {
    running = true;
    const c = card(storage.draw('who', deck)),
      clock = el('div', {
        class: 'timer'
      });
    function mark(ok) {
      if (!running) return;
      ok ? guessed++ : passed++;
      notify(ok ? 'success' : 'warning');
      c.firstChild.textContent = storage.draw('who', deck);
    }
    ctx.show(el('section', {
      class: 'forehead'
    }, clock, c, el('div', {
      class: 'zones'
    }, button('Угадал', () => mark(true)), button('Пропустить', () => mark(false), 'secondary'))));
    stop = timer(+seconds.value, clock, () => {
      running = false;
      ctx.setActive(false);
      ctx.show(panel(el('h2', {}, 'Отличный раунд!'), text(`Угадано: ${guessed} · пропущено: ${passed}`), button('В меню', ctx.home)));
    });
  }
}
