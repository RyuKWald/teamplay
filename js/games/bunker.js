import data from '../data/bunker.js';
import { storage, shuffle } from '../storage.js';
import { el, button, panel, text, number, toggle, privateDeal, confirm } from '../ui.js';
const core = [['profession', 'Профессия'], ['identity', 'Пол и возраст'], ['health', 'Здоровье'], ['hobby', 'Хобби'], ['phobia', 'Фобия'], ['baggage', 'Багаж'], ['trait', 'Черта характера'], ['action', 'Особая карта']];
const extended = [['skill', 'Практический навык'], ['secret', 'Секрет'], ['goal', 'Личная цель']];
const pick = a => a[Math.floor(Math.random() * a.length)];
export function mount(ctx) {
  const s = storage.get('bunker', {
    players: 8,
    extended: true,
    events: true
  });
  const count = number('Игроков', 4, 12, s.players),
    rich = toggle('Расширенные персонажи: навык, секрет, цель', s.extended),
    events = toggle('Неожиданные события во время партии', s.events);
  ctx.setup('Мест в убежище хватит не всем. Получите персонажей, раскрывайте характеристики и решайте вместе, кто останется. Особые карты и события разыгрывает компания.',
    [['Участники',count.node],['Правила партии',rich.node,events.node]],ctx.launch('Создать партию', () => {
    const n = count.value,
      fields = [...core, ...(rich.value ? extended : [])],
      seats = Math.floor(n / 2);
    const bunker = {
      disaster: storage.draw('bunker.disaster', data.disaster),
      area: pick(data.area),
      term: pick(data.term),
      supplies: pick(data.supplies),
      feature: pick(data.feature)
    };
    const cards = Array.from({
      length: n
    }, () => ({}));
    for (const [k] of fields) {
      const a = shuffle(data[k]);
      cards.forEach((c, i) => c[k] = a[i]);
    }
    storage.set('bunker', {
      players: n,
      extended: rich.value,
      events: events.value
    });
    ctx.setActive(true);
    privateDeal(ctx, cards.map((c, i) => ({
      name: `Игрок ${i + 1}`,
      content: () => el('div', {
        class: 'private-scroll stack'
      }, fields.map(([k, label]) => el('p', {
        class: 'public-value'
      }, `${label}: ${c[k]}`)))
    })), () => board(cards, fields, seats, bunker, events.value));
  }));
  function board(cards, fields, seats, bunker, withEvents) {
    const out = cards.map(() => false),
      opened = cards.map(() => ({})),
      expanded = cards.map(() => false);
    let currentEvent = '',
      eventCount = 0;
    function render() {
      const alive = out.filter(x => !x).length;
      const world = panel(el('h2', {}, 'Общий экран'), text(`Катастрофа: ${bunker.disaster}`), text(`Площадь: ${bunker.area} · срок: ${bunker.term}`), text(`Запасы: ${bunker.supplies}`), text(`Особенность: ${bunker.feature}`), el('p', {
        class: 'expansion-note'
      }, `Осталось игроков: ${alive} · мест: ${seats}${alive <= seats ? ' · места распределены' : ''}`));
      const eventPanel = withEvents ? panel(el('h3', {}, `События · ${eventCount}`), text(currentEvent || 'Событие можно вытянуть между кругами обсуждения.'), button('Новое событие', () => {
        currentEvent = storage.draw('bunker.events', data.events);
        eventCount++;
        render();
      }, 'secondary')) : null;
      ctx.show(world, eventPanel, ...cards.map((c, i) => {
        const details = el('details', {
          class: out[i] ? 'panel out' : 'panel',
          open: expanded[i]
        }, el('summary', {}, `Игрок ${i + 1}${out[i] ? ' · выбыл' : ''}`));
        details.addEventListener('toggle', () => expanded[i] = details.open);
        for (const [k, label] of fields) {
          const sw = toggle(`${label}${opened[i][k] ? ': ' + c[k] : ''}`, opened[i][k]);
          sw.input.onchange = () => {
            opened[i][k] = sw.value;
            render();
          };
          details.append(sw.node);
        }
        details.append(button(out[i] ? 'Вернуть игрока' : 'Отметить выбывшим', () => {
          out[i] = !out[i];
          render();
        }, 'secondary'));
        return details;
      }), text('Характеристики открываются по договорённости. Итоги голосований отмечаются вручную. Состояние здоровья персонажа не определяет ценность реального человека.', 'help'), button('Завершить партию', async () => {
        if (await confirm('Завершить партию?', 'Карточки текущей раздачи не сохранятся.')) {
          ctx.setActive(false);
          ctx.home();
        }
      }, 'secondary'));
    }
    render();
  }
}
