import React from 'react';
import type { RevealAudit, Season, Player } from '../types';
import { buildRevealAudit, rulesetOf, tournamentEvidenceMissing } from '../rulesets';
import { Card } from './common/UI';

const signed = (points: number) => `${points > 0 ? '+' : ''}${points}`;
export const ScoringDetails: React.FC<{ audit: RevealAudit; stored: boolean }> = ({ audit, stored }) =>
  <details className="mt-4 text-sm border-t border-border pt-3">
    <summary className="cursor-pointer py-2 font-semibold">Punkte erklären · {audit.ruleset}</summary>
    <p className="text-text-secondary my-2">{stored ? 'Gespeicherte Abrechnung' : 'Aktuelle CLASSIC-Wertung aus gespeicherten Tipps'} · {audit.revealedAt ? new Date(audit.revealedAt).toLocaleString('de-DE') : 'Enthüllungszeit im alten Spielstand nicht gespeichert'}</p>
    {audit.players.map(row => <section key={row.playerId} className="bg-background p-3 rounded-lg mt-2 break-words">
      <h4 className="font-bold">{row.playerName}: {signed(row.total)} Punkte</h4>
      <p className="text-text-secondary mt-1">{row.explanation}</p>
      <ul className="mt-2 space-y-1">{row.components.map((item, index) =>
        <li key={index} className="flex justify-between gap-3"><span>{item.label}</span><strong className="shrink-0">{signed(item.points)}</strong></li>)}</ul>
      <p className="mt-2 font-bold">Tipps {signed(row.tipPoints)} + Gegenwetten {signed(row.counterBetPoints)} = {signed(row.total)}</p>
    </section>)}
  </details>;

export const RulesetComparison: React.FC<{ season: Season; players: Player[] }> = ({ season, players }) => {
  if (new URLSearchParams(window.location.search).get('rulesetDebug') !== '1') return null;
  const masks = season.masks.filter(m => m.isRevealed && m.revealedCelebrity);
  return <Card className="mb-6 w-full">
    <h2 className="text-xl font-bold">Regelvergleich · nur Simulation</h2>
    <p className="text-sm text-text-secondary mt-2">Aktiv: {rulesetOf(season)}. Dieser Vergleich verändert keine Punkte oder Spielstände. CLASSIC-Formel auf denselben Tipps; im Turnier sind mehr als drei Tipps möglich. Fehlende alte Ratezeiten bleiben UNKNOWN.</p>
    {!masks.length && <p className="mt-3">Nach der ersten Enthüllung erscheint der Vergleich.</p>}
    {masks.map(mask => {
      const at = mask.scoringAudit?.revealedAt ?? 0;
      const classic = buildRevealAudit(season, mask, players, at, 'classic-v1');
      const tournament = tournamentEvidenceMissing(season, mask) ? null : buildRevealAudit(season, mask, players, at, 'tournament-v1');
      return <section key={mask.id} className="mt-4">
        <h3 className="font-bold">{mask.name}</h3>
        {classic.players.map(row => <p key={row.playerId} className="text-sm mt-1 break-words">
          {row.playerName}: CLASSIC {signed(row.total)} · TOURNAMENT {tournament ? signed(tournament.players.find(p => p.playerId === row.playerId)!.total) : 'UNKNOWN – Rate-/Sperrzeiten fehlen'}
        </p>)}
      </section>;
    })}
  </Card>;
};
