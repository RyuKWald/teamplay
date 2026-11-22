import {storage} from './storage.js';
const tg=window.Telegram?.WebApp;
export const inTelegram=!!tg&&tg.platform!=='unknown';
export const supported=v=>inTelegram&&typeof tg.isVersionAtLeast==='function'&&tg.isVersionAtLeast(v);
const safe=f=>{try{return f()}catch{return undefined}};
let mode=storage.get('haptics',{mode:'normal'}).mode, pending=new Set(),lastSemantic=0;
export function cancelHaptics(){pending.forEach(clearTimeout);pending.clear();if(mode!=='off')safe(()=>navigator.vibrate?.(0))}
export function getHaptics(){return mode}
export function setHaptics(v){cancelHaptics();mode=['off','soft','normal','strong'].includes(v)?v:'normal';storage.set('haptics',{mode})}
function raw(style){if(mode==='off'||document.hidden)return;if(mode==='soft')style='light';if(mode==='strong'&&style==='medium')style='heavy';if(supported('6.1'))safe(()=>tg.HapticFeedback.impactOccurred(style));else safe(()=>navigator.vibrate?.({light:12,medium:35,heavy:65}[style]||12))}
export function impact(style='light'){raw(style)}
function schedule(fn,ms){const id=setTimeout(()=>{pending.delete(id);fn()},ms);pending.add(id)}
export function pulse(styles,spacing=160){if(mode==='off'||document.hidden)return;cancelHaptics();styles.forEach((s,i)=>i?schedule(()=>raw(s),i*spacing):raw(s))}
export function notify(type){lastSemantic=performance.now();cancelHaptics();if(mode==='off'||document.hidden)return;if(mode==='soft'){raw('light');return}if(supported('6.1'))safe(()=>tg.HapticFeedback.notificationOccurred(type));else safe(()=>navigator.vibrate?.(type==='error'?[90,40,90]:type==='warning'?[35,30,35]:35))}
export function countdownFeedback(n){if(document.hidden||mode==='off')return;if(n===0){notify('error');[120,300,480].forEach(ms=>schedule(()=>raw('heavy'),ms))}else if(n<=2)pulse(['heavy','heavy']);else if(n<=4)pulse(['heavy']);else if(n<=7)pulse(['medium']);else if(n<=10)pulse(['light'])}
export const theme=()=>inTelegram?tg.colorScheme:(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');
export function nativeBack(v){if(supported('6.1'))safe(()=>v?tg.BackButton.show():tg.BackButton.hide());document.querySelector('#back').hidden=!v||supported('6.1')}
export function colors(c){if(supported('6.9'))safe(()=>tg.setHeaderColor(c));if(supported('6.1'))safe(()=>tg.setBackgroundColor(c))}
export function closing(v){if(supported('6.2'))safe(()=>v?tg.enableClosingConfirmation():tg.disableClosingConfirmation())}
export function init(back){safe(()=>{tg?.ready();tg?.expand()});if(supported('6.1'))tg.BackButton.onClick(back);const apply=()=>{document.documentElement.dataset.theme=theme();dispatchEvent(new Event('krugtheme'))};if(inTelegram)tg.onEvent('themeChanged',apply);matchMedia('(prefers-color-scheme:dark)').addEventListener('change',apply);apply();document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelHaptics()});document.addEventListener('click',e=>{if(e.target.closest('button,input[type=checkbox],summary,.card')&&!e.target.closest('[disabled]'))queueMicrotask(()=>{if(performance.now()-lastSemantic>80)raw('light')})})}
