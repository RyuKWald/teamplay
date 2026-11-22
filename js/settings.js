import { storage } from './storage.js';
import { el, button, panel, text, toggle, adultGate, confirm, toast } from './ui.js';
export function mount(ctx) {
  const adult = toggle('Контент 18+', storage.adult);
  adult.input.onchange = async () => {
    if (adult.input.checked) {
      adult.input.checked = false;
      if (await adultGate()) {
        adult.input.checked = true;
        toast('Контент 18+ включён');
      }
    } else {
      storage.setAdult(false);
      toast('Контент 18+ выключен');
    }
  };
  ctx.show(panel(el('h2', {}, 'Настройки'), adult.node, text('Тумблер включает отдельные взрослые колоды (в основном флирт и свидания, без откровенных сцен). Задача перед включением не является проверкой возраста.', 'help')), panel(el('h3', {}, 'История слов'), text('Использованные слова хранятся в этом браузере, пока колода не закончится.', 'help'), button('Сбросить историю использованных слов', async () => {
    if (await confirm('Сбросить историю?', 'Все использованные слова и карточки снова появятся в играх.')) {
      storage.resetUsed();
      toast('История очищена');
    }
  }, 'danger')));
}
