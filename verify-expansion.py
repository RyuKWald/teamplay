"""Необязательная проверка контент-пака: python3 verify-expansion.py. Зависимостей нет."""
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent

def read_module(name):
    text = (ROOT / 'js' / 'data' / 'expansion' / (name + '.js')).read_text(encoding='utf-8')
    match = re.fullmatch(r'\s*export\s+default\s+(.+);\s*', text, re.S)
    if not match:
        raise ValueError('Неожиданный формат модуля: ' + name)
    return json.loads(match.group(1))

def key(s):
    return ' '.join(unicodedata.normalize('NFKC', s).casefold().replace('ё', 'е').split())

counts = {}
for game in ['croc', 'alias', 'who', 'never', 'truth', 'spy', 'bunker']:
    data = read_module(game)
    if game == 'truth':
        arrays = [a for mode in data.values() for a in mode.values()]
    elif game == 'spy':
        arrays = [pack['locations'] for pack in data.values()]
    elif game == 'bunker':
        arrays = list(data.values())
    else:
        arrays = [pack['cards'] for pack in data.values()]
    for a in arrays:
        assert a and all(isinstance(s, str) and s.strip() for s in a), (game, 'Пустая запись')
        assert len(a) == len(set(map(key, a))), (game, 'Дубль внутри набора')
    counts[game] = sum(map(len, arrays))
manifest = json.loads((ROOT / 'expansion-manifest.json').read_text(encoding='utf-8'))
assert sum(counts.values()) == manifest['entry_count'] == 4030
for game, count in counts.items():
    assert count == manifest['counts'][game]['entries']
    print(f'{game:8}: {count:4} дополнительных записей')
print('ИТОГО:', sum(counts.values()))
required = ['js/app.js', 'js/ui.js', 'js/storage.js', 'js/telegram.js', 'css/styles.css']
required += ['js/data/' + name + '.js' for name in ['croc', 'alias', 'who', 'never', 'truth', 'spy', 'bunker', 'mafia']]
missing = [name for name in required if not (ROOT / name).is_file()]
if missing:
    print('\nБазы пакета корректны. Для запуска приложения распакуйте его поверх первой версии.')
    print('Не найдены файлы основы:', ', '.join(missing))
else:
    print('\nФайлы основы присутствуют. Проверка наличия не заменяет тест в браузере.')
