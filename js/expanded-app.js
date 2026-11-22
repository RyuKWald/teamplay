import crocExtra from './data/expansion/croc.js';
import aliasExtra from './data/expansion/alias.js';
import whoExtra from './data/expansion/who.js';
import neverExtra from './data/expansion/never.js';
import truthExtra from './data/expansion/truth.js';
import spyExtra from './data/expansion/spy.js';
import bunkerExtra from './data/expansion/bunker.js';
import { expansion } from './expansion/runtime.js';
import { unique, mergeCategories } from './expansion/merge.js';
async function start() {
  const ids = ['croc', 'alias', 'who', 'never', 'truth', 'spy', 'bunker'];
  const imported = await Promise.all(ids.map(id => import(`./data/${id}.js`)));
  const [croc, alias, who, never, truth, spy, bunker] = imported.map(m => m.default);
  const before = imported.map(m => JSON.stringify(m.default));
  mergeCategories(croc, crocExtra);
  mergeCategories(alias, aliasExtra);
  mergeCategories(who, whoExtra);
  mergeCategories(never, neverExtra);
  for (const [mode, sets] of Object.entries(truthExtra)) {
    truth[mode] ??= {
      truth: [],
      dare: []
    };
    for (const kind of ['truth', 'dare']) truth[mode][kind] = unique([...truth[mode][kind], ...sets[kind]]);
  }
  expansion.classicLocations.push(...spy);
  spy.splice(0, spy.length, ...unique([...spy, ...Object.values(spyExtra).flatMap(p => p.locations)]));
  for (const [key, values] of Object.entries(bunkerExtra)) bunker[key] = unique([...(bunker[key] || []), ...values]);
  const count = (id, d) => id === 'truth' ? Object.values(d).reduce((n, p) => n + p.truth.length + p.dare.length, 0) : id === 'spy' ? d.length : id === 'bunker' ? Object.values(d).reduce((n, a) => n + a.length, 0) : Object.values(d).reduce((n, p) => n + p.cards.length, 0);
  expansion.report = Object.fromEntries(ids.map((id, i) => [id, {
    before: count(id, JSON.parse(before[i])),
    after: count(id, imported[i].default)
  }]));
  window.KRUG_EXPANSION = Object.freeze({
    version: expansion.version,
    report: expansion.report
  });
  console.info('Круг: контент-пак 2.0 подключён', expansion.report);
  await import('./app.js');
}
start().catch(error => {
  console.error(error);
  const root = document.getElementById('app');
  const title = document.createElement('h2');
  title.textContent = 'Не удалось подключить контент-пак';
  const p = document.createElement('p');
  p.textContent = 'Это обновление для предыдущей версии «Круга». Распакуйте его поверх проекта с сохранением папок. Проверьте наличие js/app.js и исходных js/data/*.js, затем обновите страницу.';
  root.replaceChildren(title, p);
});
