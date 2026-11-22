import { storage } from '../storage.js';
import { notify } from '../telegram.js';
import { el, button, panel, row, text, card, select, toggle, categories, pool, teamEditor, score, timer, swipe, toast } from '../ui.js';
export function teamGame(ctx, {
  id,
  data,
  alias
}) {
  const defaults = {
    seconds: 60,
    target: alias ? 50 : 20,
    penalty: true,
    last: true,
    solo: false,
    categories: [alias ? 'easy' : 'movies']
  };
  const s = storage.get(id, defaults),
    teams = teamEditor(),
    solo = toggle('Одиночный режим', !alias && s.solo);
  const seconds = select('Время раунда, секунд', alias ? [30, 60, 90] : [30, 60, 90, 120], s.seconds);
  const target = select('Очков до победы', alias ? [30, 50, 75, 100] : [10, 20, 30, 50], s.target);
  const cats = categories(data, s.categories),
    penalty = toggle('За пропуск −1 очко', s.penalty),
    last = toggle('Общее последнее слово', s.last);
  let names,
    scores,
    turn = 0,
    words = [],
    deck = [],
    current = '',
    running = false,
    stop = () => {},
    round = 0,
    locked = false;
  ctx.onClean(() => stop());
  const intro = alias ? 'Объясняйте слова команде, не называя однокоренные. Свайп вправо засчитывает ответ, влево пропускает слово.' : 'Показывайте слова без звуков. За верный ответ команда получает очко, за пропуск штрафа нет.';
  solo.input.onchange = () => teams.node.hidden = solo.value;
  teams.node.hidden = !alias && solo.value;
  ctx.setup(intro, [['Команды', !alias && solo.node, teams.node], ['Правила раунда', seconds.node,target.node,alias && penalty.node,alias && last.node,ctx.presentation()], ['Колоды',cats.node]], ctx.launch('Начать матч', () => {
    deck = pool(data, cats.value);
    if (!deck.length) {
      toast('Выберите хотя бы одну категорию');
      return;
    }
    names = !alias && solo.value ? ['Одиночная игра'] : teams.value;
    scores = names.map(() => 0);
    storage.setTeams(teams.value);
    storage.set(id, {
      seconds: +seconds.value,
      target: +target.value,
      solo: solo.value,
      penalty: penalty.value,
      last: last.value,
      categories: cats.value
    });
    ctx.setActive(true);
    prepare();
  }));
  function prepare() {
    running = false;
    locked = false;
    ctx.show(panel(el('h2', {}, `Ход: ${names[turn]}`), text(`Раунд ${++round} · ${seconds.value} сек. · цель ${target.value}`), text('Передайте телефон объясняющему. Начинайте, когда команда готова.', 'help'), button('Все готовы · начать', start)), score(names, scores));
  }
  function next() {
    current = storage.draw(id, deck);
    return current;
  }
  function start() {
    words = [];
    running = true;
    const deadline = Date.now() + Number(seconds.value) * 1000;
    const display = card(next()),
      clock = el('div', {
        class: 'timer'
      });
    const controls = row(button('Угадали · +1', () => mark(true)), button(alias && penalty.value ? 'Пропуск · −1' : 'Пропустить', () => mark(false), 'secondary'));
    ctx.show(panel(el('span', {
      class: 'badge'
    }, names[turn]), clock, display, controls, text('Телефон остаётся у объясняющего до конца хода.', 'help')));
    function mark(ok) {
      if (!running || Date.now() >= deadline) return;
      notify(ok ? 'success' : 'warning');
      words.push({
        word: current,
        ok
      });
      display.firstChild.textContent = next();
    }
    swipe(display, () => mark(true), () => mark(false));
    stop();
    stop = timer(+seconds.value, clock, () => {
      running = false;
      alias ? review() : commit(null);
    });
  }
  function review() {
    const list = panel(el('h2', {}, 'Проверка раунда'), text('Исправьте ошибочные нажатия до подсчёта. Отрицательный счёт разрешён.', 'help'));
    if (!words.length) list.append(text('Слова ещё не были отмечены.'));
    for (const item of words) {
      const sw = toggle(item.word, item.ok);
      sw.input.onchange = () => item.ok = sw.value;
      list.append(sw.node);
    }
    ctx.show(list, button(last.value ? 'Далее · последнее слово' : 'Подсчитать очки', () => last.value ? commonWord() : commit(null)));
  }
  function commonWord() {
    ctx.show(panel(el('h2', {}, 'Последнее слово — общее'), card(current), text('Любая команда может ответить. Кто был первым?'), ...names.map((n, i) => button(n, () => commit(i))), button('Никто не угадал', () => commit(null), 'secondary')));
  }
  function commit(lastWinner) {
    if (locked) return;
    locked = true;
    const gain = words.reduce((sum, x) => sum + (x.ok ? 1 : alias && penalty.value ? -1 : 0), 0);
    scores[turn] += gain;
    if (lastWinner !== null) scores[lastWinner]++;
    const top = Math.max(...scores);
    const winners = names.filter((_, i) => scores[i] === top);
    if (top >= +target.value) {
      ctx.setActive(false);
      ctx.show(panel(el('h2', {}, winners.length > 1 ? 'Ничья!' : 'Победитель!'), card(winners.join(' и ')), button('В главное меню', ctx.home)), score(names, scores));
      return;
    }
    ctx.show(panel(el('h2', {}, 'Раунд завершён'), text(`${names[turn]}: ${gain >= 0 ? '+' : ''}${gain} очк.`), lastWinner !== null && text(`Общее слово: +1 команде «${names[lastWinner]}»`), button('Следующий ход', () => {
      turn = (turn + 1) % names.length;
      prepare();
    })), score(names, scores));
  }
}
