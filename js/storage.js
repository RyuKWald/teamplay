const KEY = 'krug-v1';
let state = {
  adult: false,
  teams: ['Комета', 'Лимон'],
  settings: {},
  used: {}
};
try {
  const saved = JSON.parse(localStorage.getItem(KEY));
  if (saved && typeof saved === 'object') {
    state.adult = saved.adult === true;
    if (Array.isArray(saved.teams) && saved.teams.length >= 2 && saved.teams.length <= 6) state.teams = saved.teams.map(String);
    if (saved.settings && typeof saved.settings === 'object') state.settings = saved.settings;
    if (saved.used && typeof saved.used === 'object') state.used = saved.used;
  }
} catch {}
let warned = false;
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    if (!warned) {
      warned = true;
      window.dispatchEvent(new CustomEvent('krugnotice', {
        detail: 'Хранилище недоступно: прогресс останется только до закрытия страницы.'
      }));
    }
  }
}
export const storage = {
  get adult() {
    return state.adult;
  },
  setAdult(v) {
    state.adult = !!v;
    persist();
  },
  get teams() {
    return [...state.teams];
  },
  setTeams(v) {
    state.teams = [...v];
    persist();
  },
  get(key, defaults) {
    return {
      ...defaults,
      ...state.settings[key]
    };
  },
  set(key, v) {
    state.settings[key] = v;
    persist();
  },
  resetUsed() {
    state.used = {};
    persist();
  },
  draw(key, values) {
    const pool = [...new Set(values)];
    if (!pool.length) throw Error('Выберите хотя бы одну доступную колоду');
    let used = new Set(Array.isArray(state.used[key]) ? state.used[key] : []);
    let available = pool.filter(x => !used.has(x));
    if (!available.length) {
      const previous = [...used].at(-1);
      pool.forEach(x => used.delete(x));
      available = pool.length > 1 ? pool.filter(x => x !== previous) : pool;
      window.dispatchEvent(new CustomEvent('krugnotice', {
        detail: 'Колода закончилась — начинаем новый перемешанный круг.'
      }));
    }
    const word = available[Math.floor(Math.random() * available.length)];
    used.add(word);
    state.used[key] = [...used];
    persist();
    return word;
  }
};
export function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
