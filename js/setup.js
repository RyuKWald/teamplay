import {el,button,text} from './ui.js';

// The same controls are moved between pages, never cloned or remounted.
// Game modules retain their live references, handlers and unsaved values.
export function createSetup({game,intro,steps,start,show,move}){
  const [,name,icon,,,,size]=game;
  const pages=steps.map(([title,...items])=>{
    const validate=typeof items.at(-1)==='function'?items.pop():null;
    const body=el('div',{class:'step-fields stack'},items);
    return {title,body,check(){
      const names=body.querySelector('textarea');
      if(names && names.value.split('\n').filter(s=>s.trim()).length<2) return 'Введите имена хотя бы двух игроков, каждое с новой строки.';
      const deck=body.querySelector('fieldset');
      if(deck&&!deck.querySelector('input:checked')) return 'Выберите хотя бы одну колоду.';
      return validate?.();
    }};
  });
  let message='';
  function quickFacts(){
    const facts=[];
    for(const {body} of pages){
      const names=body.querySelector('textarea'),teams=body.querySelectorAll('.teamrow');
      if(names)facts.push(`Участники: ${names.value.split('\n').filter(v=>v.trim()).length}`);
      if(teams.length)facts.push(teams[0].closest('[hidden]')?'Одиночный режим':`Команды: ${teams.length}`);
      for(const input of body.querySelectorAll('select,input[type="number"]')){
        const label=input.closest('label')?.firstChild;
        if(label?.nodeType===Node.TEXT_NODE && !input.closest('[hidden]'))
          facts.push(`${label.textContent}: ${input.selectedOptions?.[0]?.textContent||input.value}`);
      }
      const deck=body.querySelector('fieldset');
      if(deck)facts.push(`Колоды: ${deck.querySelectorAll('input:checked').length}`);
    }
    return facts.slice(0,2);
  }
  function advance(i,launch=false){
    const indices=launch ? pages.map((_,j)=>j+1) : [i];
    for(const n of indices){
      const problem=pages[n-1].check();
      if(problem){message=problem;if(n===i)render(i);else move(n);return;}
    }
    if(launch) start.run();else move(i+1);
  }
  function render(i=0){
    i=Math.min(Math.max(i,0),pages.length);
    const shell=el('section',{class:'setup-shell launch-shell'});
    if(!i){
      shell.append(el('div',{class:'launch-heading'},el('small',{},'ОБ ИГРЕ'),
        el('div',{class:'intro-icon','aria-hidden':'true'},icon),el('h2',{},name),
        el('span',{class:'group-size'},size)),
        el('div',{class:'intro-rules'},el('h3',{},'Как играть'),typeof intro==='string'?text(intro):intro,
          el('ul',{class:'quick-facts','aria-label':'Параметры быстрого старта'},quickFacts().map(f=>el('li',{},f)))),
        button('Играть сейчас',()=>advance(0,true)),button('Настроить игру',()=>move(1),'secondary'),
        text('При первом запуске действуют обычные правила, затем используются ваши настройки.','launch-note'));
    }else{
      const p=pages[i-1];
      shell.append(el('div',{class:'step-head'},el('small',{},`НАСТРОЙКА · ШАГ ${i} ИЗ ${pages.length}`),
        el('h2',{},p.title),el('div',{class:'step-progress','aria-hidden':'true'},pages.map((_,j)=>el('span',{class:j<i?'done':''})))),
        p.body);
      if(message) shell.append(el('p',{class:'error',role:'alert'},message));
      shell.append(button(i===pages.length?start.label:'Далее',()=>advance(i,i===pages.length)));
    }
    message='';show(shell);
  }
  return render;
}
