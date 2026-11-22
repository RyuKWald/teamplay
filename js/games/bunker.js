import data from '../data/bunker.js';
import { storage, shuffle } from '../storage.js';
import { el, button, panel, text, number, privateDeal, toggle } from '../ui.js';
const fields = [['profession', 'Профессия'], ['identity', 'Пол и возраст'], ['health', 'Здоровье'], ['hobby', 'Хобби'], ['phobia', 'Фобия'], ['baggage', 'Багаж'], ['trait', 'Черта характера'], ['action', 'Особая карта']];
const pick = a => a[Math.floor(Math.random() * a.length)];
export function mount(ctx) {
  const s = storage.get('bunker', {
      players: 8
    }),
    count = number('Игроков', 4, 12, s.players);
  ctx.show(panel(el('h2', {}, 'Бункер'), text('Каждый защищает своё место в бункере. Мест будет меньше, чем игроков.', 'help'), count.node, button('Создать партию', () => {
    const n = count.value;
    storage.set('bunker', {
      players: n
    });
    const seats = Math.max(1, Math.floor(n / 2)),
      bunker = {
        disaster: storage.draw('bunker.disaster', data.disaster),
        area: pick(data.area),
        term: pick(data.term),
        supplies: pick(data.supplies),
        feature: pick(data.feature),
        seats
      };
    const cards = Array.from({
      length: n
    }, () => ({}));
    for (const [k] of fields) {
      const values = shuffle(data[k]);
      cards.forEach((c, i) => c[k] = values[i]);
    }
    ctx.setActive(true);
    privateDeal(ctx, cards.map((c, i) => ({
      name: `Игрок ${i + 1}`,
      content: () => el('div', {
        class: 'stack'
      }, fields.map(([k, l]) => el('p', {
        class: 'public-value'
      }, `${l}: ${c[k]}`)))
    })), () => board(n, cards, bunker));
  })));
  function board(n, cards, b) {
    const out = Array(n).fill(false),
      open = cards.map(() => ({}));
    function render() {
      ctx.show(panel(el('h2', {}, 'Общий экран'), text(`Катастрофа: ${b.disaster}`), text(`Бункер: ${b.area}, срок ${b.term}`), text(`Запасы: ${b.supplies}`), text(`Особенность: ${b.feature}`), text(`Мест: ${b.seats}`)), ...cards.map((c, i) => el('details', {
        class: out[i] ? 'panel out' : 'panel',
        open: !out[i]
      }, el('summary', {}, `Игрок ${i + 1}${out[i] ? ' · выбыл' : ''}`), ...fields.map(([k, l]) => {
        const t = toggle(`${l}${open[i][k] ? ': ' + c[k] : ''}`, open[i][k]);
        t.input.onchange = () => {
          open[i][k] = t.value;
          render();
        };
        return t.node;
      }), button(out[i] ? 'Вернуть в игру' : 'Выбыл после голосования', () => {
        out[i] = !out[i];
        render();
      }, 'secondary'))), text(`Остаётся: ${out.filter(x => !x).length}. Когда останется ${b.seats}, партия завершена.`), button('Закончить', ctx.home, 'secondary'));
    }
    render();
  }
}
