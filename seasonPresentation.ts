import type { Mask, PlayerScore, Season } from './types';
import { progressEpisode, S13_GROUPS } from './appearanceAuto';

// Display only: qualification and grouping never modify appearances or settlements.
export function maskStatus(season: Season, mask: Mask): 'Enthüllt' | 'Halbfinale' | 'Finale' | undefined {
  if (mask.isRevealed) return 'Enthüllt';
  const auto = season.appearanceRules?.automatic;
  const debut = auto?.debuts[mask.id];
  if (!auto || !debut) return undefined;
  if (progressEpisode(season) >= 6) return 'Finale';
  const group = season.masks.filter(m => auto.debuts[m.id] === debut);
  const revealed = group.filter(m => m.isRevealed && season.shows.find(s => s.id === m.revealedInShowId)?.episodeNumber === debut);
  return group.length === 4 && revealed.length === 2 ? 'Halbfinale' : undefined;
}
const nameKey = (name: string) => name.toLocaleLowerCase('de').replace(/[.\s]/g, '');
export function debutGroups(season: Season): { episode: number | null; masks: Mask[]; missing: string[] }[] {
  const auto = season.appearanceRules?.automatic;
  if (!auto) return [{ episode: null, masks: season.masks, missing: [] }];
  const groups = S13_GROUPS.map((names, i) => {
    const masks = season.masks.filter(m => auto.debuts[m.id] === i + 1);
    const missing = names.filter(name => !masks.some(m => nameKey(m.name) === nameKey(name))).slice(0, Math.max(0, 4 - masks.length));
    return { episode: i + 1, masks, missing };
  });
  const unassigned = season.masks.filter(m => ![1, 2, 3, 4].includes(auto.debuts[m.id]));
  return [...groups, ...(unassigned.length ? [{ episode: null, masks: unassigned, missing: [] }] : [])];
}

// Narrative consumes already awarded components and the existing engine explanation.
// If a legacy explanation lacks these markers, use neutral wording, never infer new points.
export function simpleScoreSummary(row: PlayerScore, explanation: string): string {
  let text: string;
  if (!row.correctMasks) text = row.score === 0 ? 'Du hattest keinen richtigen Tipp. Deshalb gibt es keine Tipppunkte.' : `Deine gespeicherten Tipps bringen ${row.score} Punkte.`;
  else if (explanation.includes('späterer Treffer: 40 %')) text = 'Du lagst richtig, aber ein anderer Spieler war früher richtig. Deshalb zählt dein Treffer mit dem reduzierten Anteil.';
  else if (explanation.includes('erster Treffer: 100 %')) text = explanation.startsWith('Auftritt 1:')
    ? 'Du hattest die Maske schon beim ersten Auftritt oder davor richtig und warst zuerst richtig. Deshalb bekommst du den vollen Basiswert.'
    : 'Du warst zuerst richtig. Deshalb bekommst du den vollen Basiswert deines Trefferzeitpunkts.';
  else text = `Dein richtiger Tipp bringt ${row.score} Tipppunkte.`;
  if (row.correctMasks && /Final ×1,[58]/.test(explanation)) text += ' Dein Finaltipp erhöht die Tipppunkte.';
  if (row.counterBetPoints > 0) text += ` Deine Gegenwetten bringen zusätzlich ${row.counterBetPoints} Punkte.`;
  else if (row.counterBetPoints < 0) text += ` Deine Gegenwetten ziehen insgesamt ${Math.abs(row.counterBetPoints)} Punkte ab.`;
  return text;
}
