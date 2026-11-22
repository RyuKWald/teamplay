import{countdownFeedback,cancelHaptics}from'./telegram.js';
export function timer(seconds,node,onEnd){let stopped=false,finished=false,last=-1;const deadline=Date.now()+Math.max(0,Number(seconds)||0)*1000;let id;
function tick(){if(stopped||finished)return;const n=Math.max(0,Math.ceil((deadline-Date.now())/1000));node.textContent=`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;node.classList.toggle('urgent',n<=10);if(n!==last){if(!document.hidden&&n<=10)countdownFeedback(n);last=n}if(n===0){finished=true;clearInterval(id);document.removeEventListener('visibilitychange',tick);onEnd()}}
id=setInterval(tick,100);document.addEventListener('visibilitychange',tick);tick();return()=>{stopped=true;clearInterval(id);document.removeEventListener('visibilitychange',tick);cancelHaptics()}}
