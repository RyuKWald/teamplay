import locations from '../data/spy.js';
import { storage, shuffle } from '../storage.js';
import { el, button, panel, text, card, number, select, privateDeal, timer, confirm } from '../ui.js';
export function mount(ctx) {
  const s = storage.get('spy', {
    players: 6,
    spies: 1,
    minutes: 5
  });
  const count = number('Игроков', 3, 12, s.players),
    spies = number('Шпионов', 1, 3, s.spies),
    minutes = select('Минут на обсуждение', [3, 5, 7, 10], s.minutes);
  let stop = () => {};
  ctx.onClean(() => stop());
  ctx.show(panel(el('h2', {}, 'Шпион'), text('Мирные знают одну локацию, шпионы — нет. Задавайте косвенные вопросы. Шпионов должно быть меньше мирных.', 'help'), count.node, spies.node, minutes.node, button('Раздать роли', () => {
    if (spies.value * 2 >= count.value) {
      ctx.toast('Шпионов должно быть меньше половины игроков');
      return;
    }
    storage.set('spy', {
      players: count.value,
      spies: spies.value,
      minutes: +minutes.value
    });
    const location = storage.draw('spy.locations', locations);
    const roles = shuffle(Array.from({
      length: count.value
    }, (_, i) => i < spies.value));
    ctx.setActive(true);
    privateDeal(ctx, roles.map((spy, i) => ({
      name: `Игрок ${i + 1}`,
      content: () => card(spy ? 'Вы — Шпион!' : location, 'prompt')
    })), discussion);
    function discussion() {
      const clock = el('div', {
        class: 'timer'
      });
      const reveal = async () => {
        if (await confirm('Завершить раунд?', 'Локация и номера шпионов станут видны всем.')) finish();
      };
      ctx.show(panel(el('h2', {}, 'Обсуждение'), clock, text('Не называйте локацию прямо. Передавайте телефон для отслеживания времени.'), button('Показать шпионов', reveal)));
      stop = timer(+minutes.value * 60, clock, () => {
        ctx.toast('Время вышло. Завершите обсуждение и покажите роли.');
        clock.after(text('Время вышло — примите окончательное решение.'));
      });
    }
    function finish() {
      stop();
      ctx.setActive(false);
      ctx.show(panel(el('h2', {}, 'Раунд раскрыт'), text(`Локация: ${location}`), text(`Шпионы: ${roles.map((x, i) => x ? `Игрок ${i + 1}` : null).filter(Boolean).join(', ')}`), button('В меню', ctx.home)));
    }
  })));
}
