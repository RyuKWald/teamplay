import data from '../data/who.js';
import {storage} from '../storage.js';
import {notify} from '../telegram.js';
import {startTilt} from '../tilt.js';
import {presentation} from '../orientation.js';
import {el,button,panel,text,card,categories,pool,select,toggle,timer} from '../ui.js';

export function mount(ctx) {
  const s = storage.get('who', {categories:['characters'], seconds:60, control:'tilt', reverse:false, threshold:.55});
  const cats = categories(data,s.categories), seconds = select('Секунд на раунд',[30,60,90,120],s.seconds);
  const control = select('Управление',[['tilt','Наклоны у лба'],['buttons','Кнопки']],s.control);
  const reverse = toggle('Поменять наклоны местами',s.reverse);
  const sensitivity = select('Порог наклона',[[.4,'Чувствительный'],[.55,'Обычный'],[.7,'Сильный наклон']],s.threshold);
  const hint = text('','help'), directions = text('','help');
  function updateHelp() {
    const tilt = control.value === 'tilt';
    reverse.node.hidden = sensitivity.node.hidden = directions.hidden = !tilt;
    directions.textContent = reverse.value ? 'Вниз: угадал. Вверх: пропуск.' : 'Вверх: угадал. Вниз: пропуск.';
  }
  control.input.onchange = reverse.input.onchange = updateHelp;
  updateHelp();
  let stopTimer = () => {}, countId, sensor, deck, running = false, preparing = false;
  let end = 0, guessed = 0, passed = 0, display;
  ctx.onClean(() => { running = false; stopTimer(); clearTimeout(countId); });
  ctx.setup('Приложите телефон ко лбу экраном к друзьям. Они дают подсказки, а вы стараетесь угадать как можно больше слов.',
    [['Управление',control.node,reverse.node,sensitivity.node,directions],['Раунд',seconds.node,presentation(ctx)],['Колоды',cats.node]],
    ctx.launch('Подготовиться',() => {
      if (preparing) return;
      deck = pool(data,cats.value);
      if (!deck.length) { ctx.toast('Выберите категорию'); return; }
      preparing = true;
      storage.set('who',{categories:cats.value,seconds:+seconds.value,control:control.value,reverse:reverse.value,threshold:+sensitivity.value});
      ctx.setActive(true);
      if (control.value === 'tilt') sensor = startTilt(ctx,mark,t => hint.textContent = t,{threshold:+sensitivity.value,reverse:reverse.value});
      countdown(3);
    }));
  function mark(ok) {
    if (!running || Date.now() >= end) return;
    ok ? guessed++ : passed++;
    notify(ok ? 'success' : 'warning');
    display.firstChild.textContent = storage.draw('who',deck);
  }
  function countdown(n) {
    if (!n) { start(); return; }
    ctx.show(panel(el('h2',{},'Приложите телефон ко лбу'),el('div',{class:'countdown'},n),directions,hint));
    countId = setTimeout(() => countdown(n-1),1000);
  }
  function start() {
    running = true;
    end = Date.now()+Number(seconds.value)*1000;
    display = card(storage.draw('who',deck));
    const clock = el('div',{class:'timer'});
    ctx.show(el('section',{class:'forehead'},clock,display,el('div',{class:'zones'},
      button('Угадал',() => mark(true)),button('Пропустить',() => mark(false),'secondary'))),
      sensor ? panel(directions,hint,button('Калибровка',sensor.recalibrate,'secondary')) : null);
    stopTimer = timer(+seconds.value,clock,() => {
      running = false;
      sensor?.stop();
      ctx.setActive(false);
      ctx.show(panel(el('h2',{},'Раунд завершён'),text(`Угадано: ${guessed} · пропущено: ${passed}`),button('В меню',ctx.home)));
    });
  }
}
