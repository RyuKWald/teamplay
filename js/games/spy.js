import locations from '../data/spy.js';
import themed from '../data/expansion/spy.js';
import { expansion, spyQuestions } from '../expansion/runtime.js';
import { storage, shuffle } from '../storage.js';
import { el, button, panel, text, card, number, select, categories, pool, privateDeal, timer, confirm } from '../ui.js';
export function mount(ctx) {
  const s = storage.get('spy', {
    players: 6,
    spies: 1,
    minutes: 5,
    categories: ['classic', 'unusual'],
    style: 'questions'
  });
  const packs = {
    classic: {
      label: 'Классические локации',
      cards: expansion.classicLocations.length ? expansion.classicLocations : locations
    },
    ...Object.fromEntries(Object.entries(themed).map(([id, v]) => [id, {
      label: v.label,
      cards: v.locations
    }]))
  };
  const count = number('Игроков', 3, 12, s.players),
    spies = number('Шпионов', 1, 3, s.spies),
    minutes = select('Минут на обсуждение', [3, 5, 7, 10], s.minutes),
    cats = categories(packs, s.categories);
  const style = select('Вариант обсуждения', [['questions', 'Классика: вопросы друг другу'], ['guided', 'Вопросы с подсказками'], ['word', 'Ассоциации: по одному слову в круг']], s.style);
  let stop = () => {};
  ctx.onClean(() => stop());
  ctx.setup('Все, кроме шпиона, знают место встречи. Задавайте друг другу косвенные вопросы и попробуйте вычислить, кто не в курсе.',
    [['Участники',count.node,spies.node,()=>spies.value*2>=count.value && 'Шпионов должно быть меньше половины игроков'],['Обсуждение',minutes.node,style.node],['Локации',cats.node]], ctx.launch('Раздать роли', () => {
    if (spies.value * 2 >= count.value) {
      ctx.toast('Шпионов должно быть меньше половины игроков');
      return;
    }
    const deck = pool(packs, cats.value);
    if (!deck.length) {
      ctx.toast('Выберите хотя бы один набор');
      return;
    }
    storage.set('spy', {
      players: count.value,
      spies: spies.value,
      minutes: +minutes.value,
      categories: cats.value,
      style: style.value
    });
    const location = storage.draw('spy.locations', deck),
      assigned = shuffle(Array.from({
        length: count.value
      }, (_, i) => i < spies.value));
    ctx.setActive(true);
    privateDeal(ctx, assigned.map((spy, i) => ({
      name: `Игрок ${i + 1}`,
      content: () => card(spy ? 'Вы — Шпион!' : location, 'prompt')
    })), discussion);
    function discussion() {
      const clock = el('div', {
          class: 'timer'
        }),
        prompt = el('p', {
          class: 'expansion-note'
        });
      const nextQuestion = () => prompt.textContent = storage.draw('spy.questions', spyQuestions);
      if (style.value === 'guided') nextQuestion();
      ctx.show(panel(el('h2', {}, 'Обсуждение'), clock, text(style.value === 'word' ? 'По очереди называйте по одной косвенной ассоциации. После полного круга обсуждайте подозрения и голосуйте. Шпион тоже называет слово.' : 'Задавайте друг другу косвенные вопросы. Не произносите название локации.'), style.value === 'guided' && prompt, style.value === 'guided' && button('Другой вопрос', nextQuestion, 'secondary'), button('Показать шпионов', async () => {
        if (await confirm('Завершить раунд?', 'Локация и номера шпионов станут видны всем.')) finish();
      })));
      stop = timer(+minutes.value * 60, clock, () => {
        ctx.toast('Время вышло. Примите решение, затем раскройте роли.');
        clock.after(text('Время обсуждения закончилось.'));
      });
    }
    function finish() {
      stop();
      ctx.setActive(false);
      ctx.show(panel(el('h2', {}, 'Раунд раскрыт'), text(`Локация: ${location}`), text(`Шпионы: ${assigned.map((x, i) => x ? `Игрок ${i + 1}` : null).filter(Boolean).join(', ')}`), button('В главное меню', ctx.home)));
    }
  }));
}
