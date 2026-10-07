import React from 'react';
import { Mask, Player, Season } from '../types';
import { explainMask, isAppearanceSeason, simulatedMask } from '../appearanceRules';
import { Card } from './common/UI';

export const ScoringDetails: React.FC<{ season: Season; mask: Mask; players: Player[] }> = ({ season, mask, players }) => {
  if (!mask.isRevealed) return null;
  const active = isAppearanceSeason(season);
  const snapshot = active ? mask.settlement : undefined;
  const result = snapshot?.result || simulatedMask(season, mask, players, false);
  const explanations = snapshot?.explanations || explainMask(season, mask, players, false, result);
  const debug = new URLSearchParams(window.location.search).get('rulesetDebug') === '1';
  let comparison: React.ReactNode = null;
  if (debug) {
    if (snapshot?.ruleset === 'classic-v1') comparison = <p>Bisherige CLASSIC-Abrechnung übernommen. In beiden Ansichten unverändert; keine rückwirkende Neuberechnung.</p>;
    else {
      try {
        const classic = simulatedMask(season, mask, players, false), s13 = simulatedMask(season, mask, players, true);
        comparison = <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Spieler</th><th>Staffel-12/CLASSIC</th><th>S13 nach Auftritt</th></tr></thead><tbody>{classic.scores.map(row => <tr key={row.playerId}><td>{row.name}</td><td>{row.totalScore}</td><td>{s13.scores.find(s => s.playerId === row.playerId)?.totalScore ?? 0}</td></tr>)}</tbody></table><p className="text-text-secondary mt-2">Dieselben Tipps, Finalmarkierungen und Gegenwetten. Nur die aktive Abrechnung zählt.</p></div>;
      } catch (e) { comparison = <p>Vergleich noch nicht möglich: {String(e)}</p>; }
    }
  }
  return <Card className="space-y-3 text-sm">
    <h3 className="text-xl font-bold">Abrechnung: {mask.name}</h3>
    <p className="text-text-secondary">{snapshot ? `${snapshot.ruleset === 'classic-v1' ? 'Übernommene CLASSIC-Punkte' : 'S13 nach Auftritt'} · ${snapshot.settledAt ? new Date(snapshot.settledAt).toLocaleString('de-DE') : 'alte Enthüllungszeit nicht aufgezeichnet'}` : 'CLASSIC · nach bestehenden Regeln berechnet'}</p>
    {result.scores.map(row => <div key={row.playerId} className="border-t border-border pt-2">
      <strong>{players.find(p => p.id === row.playerId)?.name || row.name}: {row.totalScore} Punkte</strong>
      <p>{explanations[row.playerId]}</p>
      {season.counterBets.filter(cb => cb.maskId === mask.id && (cb.bettorPlayerId === row.playerId || cb.targetPlayerId === row.playerId)).map(cb => {
        const points = result.counterBetPoints[cb.id];
        if (!points) return null;
        const value = cb.bettorPlayerId === row.playerId ? points.bettor : points.target;
        const target = mask.tips[cb.targetPlayerId]?.[cb.targetTipIndex];
        const tipShow = season.shows.find(s => s.id === target?.showId), betShow = season.shows.find(s => s.id === cb.showId);
        const decay = Math.max(0, 1 - .15 * Math.max(0, (betShow?.episodeNumber || 0) - (tipShow?.episodeNumber || 0)));
        return <p key={cb.id}>Gegenwette auf {players.find(p => p.id === cb.targetPlayerId)?.name || cb.targetPlayerId}, Tipp {cb.targetTipIndex + 1} ({target?.celebrityName}): {value > 0 ? '+' : ''}{value} · {target?.isFinal ? 'finaler Einsatz +5/−3' : 'offener Einsatz +3/−2'} · {Math.round(decay * 100)} % nach Show-Abstand, gerundet.</p>;
      })}
      <p>Tipps {row.score} + Gegenwetten {row.counterBetPoints} = {row.totalScore}</p>
    </div>)}
    {debug && <details><summary className="cursor-pointer text-accent">Regelvergleich (nur lesen)</summary>{comparison}</details>}
  </Card>;
};
