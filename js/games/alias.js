import data from '../data/alias.js';
import { teamGame } from './team-engine.js';
export function mount(ctx) {
  return teamGame(ctx, {
    id: 'alias',
    data,
    alias: true
  });
}
