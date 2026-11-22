import { impact, notify } from './telegram.js';
import { storage } from './storage.js';
export function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) n.addEventListener(k.slice(2).toLowerCase(), v);else if (k === 'class') n.className = v;else if (k === 'text') n.textContent = v;else if (k in n) n[k] = v;else n.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) if (c !== null && c !== undefined && c !== false) n.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return n;
}
export const button = (text, fn, cls = 'primary') => el('button', {
  class: cls,
  type: 'button',
  onclick: fn
}, text);
export const panel = (...nodes) => el('section', {
  class: 'panel stack'
}, nodes);
export const row = (...nodes) => el('div', {
  class: 'row'
}, nodes);
export const text = (t, cls = '') => el('p', {
  class: cls
}, t);
export const card = (t, cls = 'word') => el('div', {
  class: 'card'
}, el('div', {
  class: cls
}, t));
export function select(label, values, value) {
  const input = el('select');
  for (const v of values) {
    const [id, title] = Array.isArray(v) ? v : [v, v];
    input.append(el('option', {
      value: id,
      selected: String(id) === String(value)
    }, title));
  }
  return {
    input,
    node: el('label', {
      class: 'field'
    }, label, input),
    get value() {
      return input.value;
    }
  };
}
export function toggle(label, value) {
  const input = el('input', {
    type: 'checkbox',
    class: 'switch',
    checked: !!value
  });
  return {
    input,
    node: el('label', {
      class: 'check'
    }, label, input),
    get value() {
      return input.checked;
    }
  };
}
export function number(label, min, max, value) {
  const input = el('input', {
    type: 'number',
    min,
    max,
    value,
    step: 1,
    inputMode: 'numeric'
  });
  return {
    input,
    node: el('label', {
      class: 'field'
    }, label, input),
    get value() {
      return Math.min(max, Math.max(min, Math.round(Number(input.value) || min)));
    }
  };
}
export function categories(data, selected = []) {
  const checks = Object.entries(data).filter(([id]) => id !== 'adult' || storage.adult).map(([id, d]) => {
    const input = el('input', {
      type: 'checkbox',
      checked: selected.includes(id)
    });
    return {
      id,
      input,
      node: el('label', {
        class: 'check'
      }, `${d.label} · ${d.cards.length}`, input)
    };
  });
  if (!checks.some(x => x.input.checked) && checks[0]) checks[0].input.checked = true;
  return {
    node: el('fieldset', {
      class: 'panel'
    }, el('legend', {}, 'Колоды'), checks.map(x => x.node)),
    get value() {
      return checks.filter(x => x.input.checked).map(x => x.id);
    }
  };
}
export function pool(data, keys) {
  return keys.filter(k => data[k] && (k !== 'adult' || storage.adult)).flatMap(k => data[k].cards);
}
export function teamEditor(initial = storage.teams) {
  let names = [...initial];
  const host = el('div');
  function render() {
    host.replaceChildren(...names.map((name, i) => {
      const input = el('input', {
        value: name,
        maxLength: 24,
        'aria-label': `Команда ${i + 1}`,
        oninput: e => names[i] = e.target.value
      });
      const remove = button('−', () => {
        if (names.length > 2) {
          names.splice(i, 1);
          render();
        }
      }, 'secondary');
      remove.disabled = names.length <= 2;
      return el('div', {
        class: 'teamrow'
      }, input, remove);
    }));
    const add = button('Добавить команду', () => {
      if (names.length < 6) {
        names.push(`Команда ${names.length + 1}`);
        render();
      }
    }, 'secondary');
    add.disabled = names.length >= 6;
    host.append(add);
  }
  render();
  return {
    node: panel(el('h3', {}, 'Команды · 2–6'), host),
    get value() {
      return names.map((x, i) => x.trim() || `Команда ${i + 1}`);
    }
  };
}
export function players(initial = ['Игрок 1', 'Игрок 2']) {
  const input = el('textarea', {
    value: initial.join('\n'),
    maxLength: 1200,
    'aria-label': 'Имена игроков, каждое с новой строки'
  });
  return {
    node: el('label', {
      class: 'field'
    }, 'Имена игроков — каждое с новой строки (2–20)', input),
    get value() {
      return input.value.split('\n').map(x => x.trim().slice(0, 30)).filter(Boolean).slice(0, 20);
    }
  };
}
export function score(names, scores) {
  return panel(el('h3', {}, 'Таблица счёта'), names.map((n, i) => el('div', {
    class: 'scoreline'
  }, el('span', {}, n), el('strong', {}, scores[i]))));
}
let toastId;
export function toast(t) {
  const n = document.querySelector('#toast');
  clearTimeout(toastId);
  n.textContent = t;
  n.hidden = false;
  toastId = setTimeout(() => n.hidden = true, 4500);
}
let modalCancel = null;
export function closeModal() {
  modalCancel?.();
}
export function modal(title, content, actions) {
  closeModal();
  const root = document.querySelector('#modal-root');
  const old = document.activeElement;
  const box = el('section', {
    class: 'dialog panel',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': title,
    tabIndex: -1
  }, el('h2', {}, title), content);
  let finish;
  const promise = new Promise(resolve => {
    finish = v => {
      document.removeEventListener('keydown', keys);
      root.replaceChildren();
      modalCancel = null;
      old?.focus?.();
      resolve(v);
    };
  });
  const keys = e => {
    if (e.key === 'Escape') {
      e.preventDefault();
      finish(false);
    }
    if (e.key === 'Tab') {
      const a = [...box.querySelectorAll('button,input,select,textarea,[tabindex="0"]')].filter(n => !n.disabled);
      if (!a.length) {
        e.preventDefault();
        box.focus();
      } else if (e.shiftKey && document.activeElement === a[0]) {
        e.preventDefault();
        a.at(-1).focus();
      } else if (!e.shiftKey && document.activeElement === a.at(-1)) {
        e.preventDefault();
        a[0].focus();
      }
    }
  };
  modalCancel = () => finish(false);
  box.append(row(...actions(finish)));
  root.append(el('div', {
    class: 'overlay'
  }, box));
  document.addEventListener('keydown', keys);
  setTimeout(() => box.querySelector('input,button')?.focus(), 0);
  return promise;
}
export const confirm = (title, body) => modal(title, text(body), done => [button('Отмена', () => done(false), 'secondary'), button('Да, продолжить', () => done(true))]);
export function adultGate() {
  const kind = Math.floor(Math.random() * 3);
  const a = kind === 1 ? 6 + Math.floor(Math.random() * 4) : 17 + Math.floor(Math.random() * 25);
  const b = kind === 1 ? 5 + Math.floor(Math.random() * 5) : 5 + Math.floor(Math.random() * 12);
  const answer = kind === 0 ? a + b : kind === 1 ? a * b : a - b;
  const input = el('input', {
    type: 'number',
    inputMode: 'numeric',
    'aria-label': 'Ответ на задачу'
  });
  const error = text('', 'error');
  return modal('Контент для взрослых', el('div', {}, text('Только для совершеннолетних. Задача — бытовой барьер, а не проверка возраста.'), el('h3', {}, `${a} ${['+', '×', '−'][kind]} ${b} = ?`), input, error), done => {
    const check = () => {
      if (input.value.trim() !== '' && Number(input.value) === answer) {
        storage.setAdult(true);
        done(true);
      } else {
        error.textContent = 'Пока неверно. Попробуйте ещё раз.';
        notify('warning');
      }
    };
    input.onkeydown = e => {
      if (e.key === 'Enter') check();
    };
    return [button('Отмена', () => done(false), 'secondary'), button('Мне есть 18 · включить', check)];
  });
}
export function timer(seconds, node, onEnd) {
  let disposed = false,
    last = -1,
    interval;
  const later = [];
  const end = Date.now() + seconds * 1000;
  function tick() {
    if (disposed) return;
    const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
    node.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    node.classList.toggle('urgent', left <= 5);
    if (left !== last) {
      if (left > 0 && left <= 5) impact(left <= 3 ? 'heavy' : 'medium');
      last = left;
    }
    if (left === 0) {
      clearInterval(interval);
      notify('error');
      impact('heavy');
      later.push(setTimeout(() => !disposed && impact('heavy'), 180));
      onEnd();
    }
  }
  interval = setInterval(tick, 100);
  tick();
  return () => {
    disposed = true;
    clearInterval(interval);
    later.forEach(clearTimeout);
  };
}
export function swipe(node, right, left) {
  let start = null;
  node.addEventListener('pointerdown', e => start = {
    x: e.clientX,
    y: e.clientY
  });
  node.addEventListener('pointerup', e => {
    if (!start) return;
    const dx = e.clientX - start.x,
      dy = e.clientY - start.y;
    start = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.4) (dx > 0 ? right : left)();
  });
  node.addEventListener('pointercancel', () => start = null);
}
export function privateDeal(ctx, items, onDone) {
  let index = 0;
  const controller = new AbortController();
  const signal = controller.signal;
  let hide = () => {};
  function render() {
    const secret = el('div', {
      class: 'secret blurred stack',
      'aria-hidden': 'true'
    }, items[index].content());
    const hold = button('Удерживайте, чтобы увидеть', () => {}, 'secondary hold');
    const next = button('Скрыть и передать', () => {
      hide();
      if (++index === items.length) {
        controller.abort();
        onDone();
      } else render();
    });
    const reveal = () => {
      secret.classList.remove('blurred');
      secret.setAttribute('aria-hidden', 'false');
    };
    hide = () => {
      secret.classList.add('blurred');
      secret.setAttribute('aria-hidden', 'true');
    };
    hold.addEventListener('pointerdown', e => {
      e.preventDefault();
      hold.setPointerCapture(e.pointerId);
      reveal();
    });
    hold.addEventListener('pointerup', hide);
    hold.addEventListener('pointercancel', hide);
    hold.addEventListener('lostpointercapture', hide);
    hold.addEventListener('contextmenu', e => e.preventDefault());
    hold.addEventListener('keydown', e => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        reveal();
      }
    });
    hold.addEventListener('keyup', hide);
    hold.addEventListener('blur', hide);
    ctx.show(panel(el('h2', {}, `Передайте телефон: ${items[index].name}`), text('Остальные отворачиваются. Содержимое видно только пока кнопка нажата.', 'help'), secret, hold, next));
  }
  window.addEventListener('blur', () => hide(), {
    signal
  });
  document.addEventListener('visibilitychange', () => hide(), {
    signal
  });
  ctx.onClean(() => controller.abort());
  render();
}
