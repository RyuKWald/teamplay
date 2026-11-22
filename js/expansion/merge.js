const canonical = s => s.normalize('NFKC').toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
export function unique(values) {
  const seen = new Set();
  return values.filter(s => {
    const key = canonical(s);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
export function mergeCategories(target, additions) {
  for (const [key, value] of Object.entries(additions)) {
    if (target[key]) target[key].cards = unique([...target[key].cards, ...value.cards]);else target[key] = {
      label: value.label,
      cards: unique(value.cards)
    };
  }
}
