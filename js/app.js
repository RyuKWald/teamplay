import {init,nativeBack,colors,closing,theme,cancelHaptics} from './telegram.js';
import {el,button,text,toast,confirm,closeModal} from './ui.js';
import {mount as settings} from './settings.js';
import {presentation} from './orientation.js';
import {games,formats} from './catalog.js';
import {createSetup} from './setup.js';

const app=document.querySelector('#app'), title=document.querySelector('#title'), gear=document.querySelector('#settings');
const home={page:'home',step:0};
let path=[home], screen='', wizard=null, active=false, cleaners=[], generation=0, canWrite=true;
const here=()=>path.at(-1);
const game=id=>games.find(g=>g[0]===id);
const format=id=>formats.find(f=>f[0]===id);
function write(method) {
  try { history[method]({krug:true,path},''); }
  catch(e) { if(e.name!=='SecurityError') throw e; canWrite=false; }
}
function show(...nodes) {
  app.replaceChildren(el('div',{class:'screen stack'},...nodes));
  const heading=app.querySelector('.launch-shell h2');
  if(heading)heading.tabIndex=-1;
  (heading||app).focus({preventScroll:true}); window.scrollTo(0,0);
}
function reset() {
  cleaners.splice(0).forEach(f=>{try{f()}catch(e){console.debug(e)}});
  wizard=null; active=false; closing(false); cancelHaptics(); closeModal();
}
function visit(page,step=0) {
  path=[...path,{page,step}]; write('pushState'); render();
}
let pendingBack=false,restoring=false;
async function acceptExit() {
  return !active || await confirm('Выйти из игры?','Текущий раунд и счёт будут потеряны.');
}
async function rewind(index) {
  if(index<0||index>=path.length-1||pendingBack) return;
  if(canWrite) { pendingBack=true; history.go(index-path.length+1); }
  else if(await acceptExit()) { path=path.slice(0,index+1); render(); }
}
function back() {
  // Leaving a round returns to its game list, not a stale setup step.
  const catalog=path.findLastIndex(r=>r.page.startsWith('list:'));
  rewind(game(screen)&&!wizard&&catalog>=0 ? catalog : path.length-2);
}
addEventListener('popstate',async e=>{
  pendingBack=false;
  if(restoring){restoring=false;return;}
  const next=e.state?.path || [home];
  if(!await acceptExit()){
    const delta=path.length-next.length;
    if(delta && canWrite){restoring=true;history.go(delta);}
    else write('replaceState');
    return;
  }
  path=next;render();
});

const ctx={
  show,toast,onClean:f=>cleaners.push(f),home:()=>rewind(0),presentation:()=>presentation(ctx),
  launch:(label,run)=>({label,run}),
  setActive:value=>{active=value; if(value) wizard=null; closing(value);},
  setup:(intro,steps,start)=>{
    const g=game(screen);
    wizard=createSetup({game:g,intro,steps,start,show,move:step=>visit(g[0],step)});
    wizard(here().step);
  }
};

function homeView(){
  const rows=formats.map(([id,name,desc,icon])=>buttonRow(name,desc,icon,()=>visit('list:'+id)));
  show(el('div',{class:'launch-shell'},
    el('div',{class:'launch-heading'},el('small',{},'КРУГ / ИГРЫ ДЛЯ КОМПАНИИ'),el('h2',{},'Во что сыграем?'),
      text('Выберите, что хочется делать вместе.')),
    el('div',{class:'format-grid'},rows),
    button(`Все игры · ${games.length}`,()=>visit('list:all'),'all-games secondary')));
}
function buttonRow(name,desc,icon,click){
  return el('button',{type:'button',class:'format-row',onclick:click},
    el('span',{class:'format-icon','aria-hidden':'true'},icon),el('span',{},el('strong',{},name),el('small',{},desc)),
    el('span',{class:'chevron','aria-hidden':'true'},'›'));
}
function catalogView(id){
  const f=format(id),list=f ? f[4].map(game) : games;
  show(el('div',{class:'launch-shell'},
    el('div',{class:'launch-heading'},el('small',{},'ВЫБОР ИГРЫ'),el('h2',{},f?.[1]||'Все игры'),
      text('Откройте карточку, чтобы узнать правила и начать.')),
    el('div',{class:'game-list'},list.map(([id,name,icon,desc,color,,size])=>
      el('button',{type:'button',class:'tile game-row',style:`--tile:${color}`,onclick:()=>visit(id)},
        el('span',{class:'icon','aria-hidden':'true'},icon),
        el('span',{class:'game-copy'},el('strong',{},name),el('small',{},desc),el('span',{class:'group-size'},size)),
        el('span',{class:'chevron','aria-hidden':'true'},'›'))))));
}
async function render(){
  const {page,step}=here(), token=++generation;
  if(screen===page && wizard){wizard(step);return;}
  reset(); screen=page;
  const g=game(page), list=page.startsWith('list:');
  nativeBack(page!=='home');gear.hidden=page!=='home'&&!list;
  title.textContent=g?.[1]||(page==='settings'?'Настройки':'Круг');
  for(const [key,value] of [['--accent',g?.[4]||'#7378ed'],['--second',g?.[5]||'#d39bcf'],['--on-accent',['croc','alias','who','bunker'].includes(page)?'#14202b':'#fff']])
    document.documentElement.style.setProperty(key,value);
  if(list) return catalogView(page.slice(5));
  if(page==='settings') return settings(ctx);
  if(!g) return homeView();
  show(text('Открываем игру…','help'));
  try {const mod=await import(`./games/${g[0]}.js`);if(token===generation)mod.mount(ctx);}
  catch(e){if(token!==generation)return;console.error(e);show(text('Не удалось открыть игру.'),button('Вернуться к выбору',back));}
}
init(back);document.querySelector('#back').onclick=back;gear.onclick=()=>visit('settings');
const applyColors=()=>colors(theme()==='dark'?'#101320':'#edf0fa');
addEventListener('krugtheme',applyColors);addEventListener('krugnotice',e=>toast(e.detail));
write('replaceState');applyColors();render();
