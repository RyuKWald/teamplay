import data from '../data/croc.js';
import { teamGame } from './team-engine.js';
export function mount(ctx) {
  return teamGame(ctx, {
    id: 'croc',
    data,
    alias: false
  });
}
