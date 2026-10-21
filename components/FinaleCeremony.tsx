import React, { useEffect, useRef, useState } from 'react';
import type { Player, Season } from '../types';
import { finaleReadiness, finaleSummary, RankedPlayer, ShowAllocation } from '../finaleSummary';
import './FinaleCeremony.css';

const number = (n: number) => n.toLocaleString('de-DE');
const signed = (n: number) => `${n > 0 ? '+' : ''}${number(n)}`;
const colors = ['#6de2fa', '#bc9bff', '#edcd86', '#9beaaf', '#fb9ebd'];

export function CeremonyEntry({ season, players, storageIssue, onStart }: { season: Season; players: Player[]; storageIssue?: string | null; onStart: () => void }) {
  const readiness = finaleReadiness(season, players);
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => { setConfirmed(false); }, [season, players, storageIssue]);
  return <section className="finale-entry" aria-label="Siegerehrung vorbereiten">
    <div><p className="finale-entry__eyebrow">DER LETZTE AKT</p><h2>Siegerehrung</h2>
      {readiness.ready ? <p>Alle 16 erfassten Masken sind enthüllt und gültig abgerechnet. Die Siegerehrung öffnet sich erst auf deinen Wunsch.</p>
        : <p>Noch nicht bereit: {readiness.reasons[0]}</p>}
      {!readiness.ready && <details><summary>Abschlussprüfung anzeigen</summary><ul>{readiness.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul></details>}
      {storageIssue && <p role="alert">Bitte zuerst den angezeigten Speicherfehler beheben.</p>}
    </div>
    <div className="finale-entry__action">
      {readiness.ready && <label><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /> Die Besetzung ist vollständig erfasst und das TV-Finale ist beendet.</label>}
      <button id="start-ceremony" type="button" disabled={!readiness.ready || !confirmed || !!storageIssue} onClick={() => { if (readiness.ready && confirmed && !storageIssue) onStart(); }}>Siegerehrung starten</button>
    </div>
  </section>;
}

function ScoreChart({ rows, players }: { rows: ShowAllocation[]; players: RankedPlayer[] }) {
  const values = rows.flatMap(r => players.map(p => r.cumulative[p.playerId]));
  const low = Math.min(0, ...values), high = Math.max(1, ...values), span = high - low;
  const x = (i: number) => 46 + i * 108;
  const y = (n: number) => 208 - (n - low) / span * 170;
  return <div className="ceremony-chart">
    <ul className="ceremony-legend">{players.map((p, i) => <li key={p.playerId}><span style={{ background: colors[i % colors.length] }} />{p.name}</li>)}</ul>
    <svg role="img" aria-labelledby="ceremony-chart-title ceremony-chart-desc" viewBox="0 0 640 250">
      <title id="ceremony-chart-title">Kumulative Abrechnungspunkte nach Enthüllungsshow</title>
      <desc id="ceremony-chart-desc">Rekonstruktion aus den heute gespeicherten Maskenabrechnungen. Die exakten Zahlen stehen in der Tabelle darunter. Keine historischen Live-Snapshots.</desc>
      {[0, 1, 2, 3, 4].map(i => { const value = low + span * i / 4; return <g key={i}><line x1="46" x2="592" y1={y(value)} y2={y(value)} stroke="#6c7ba02b" /><text x="35" y={y(value) + 4} textAnchor="end" fill="#93a4bd" fontSize="11">{Math.round(value)}</text></g>; })}
      {rows.map((r, i) => <text key={r.episode} x={x(i)} y="235" fill="#aebbd2" fontSize="12" textAnchor="middle">Show {r.episode}</text>)}
      {players.map((p, j) => <g key={p.playerId}>
        <polyline points={rows.map((r, i) => `${x(i)},${y(r.cumulative[p.playerId])}`).join(' ')} fill="none" stroke={colors[j % colors.length]} strokeWidth="2.5" strokeLinejoin="round" />
        {rows.map((r, i) => <circle key={r.episode} cx={x(i)} cy={y(r.cumulative[p.playerId])} r="4" fill={colors[j % colors.length]}><title>{`${p.name}, Show ${r.episode}: ${r.cumulative[p.playerId]} Punkte`}</title></circle>)}
      </g>)}
    </svg>
    <details><summary>Exakte Werte als Tabelle</summary><div className="ceremony-table-scroll"><table><thead><tr><th>Show</th>{players.map(p => <th key={p.playerId}>{p.name}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.episode}><th>{r.episode}</th>{players.map(p => <td key={p.playerId}>{number(r.cumulative[p.playerId])}</td>)}</tr>)}</tbody></table></div></details>
  </div>;
}

export function FinaleCeremony({ season, players, storageIssue, onClose }: { season: Season; players: Player[]; storageIssue?: string | null; onClose: () => void }) {
  const summary = finaleSummary(season, players);
  const [intro, setIntro] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { window.scrollTo(0, 0); titleRef.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => { if (!intro) return; const timer = window.setTimeout(() => setIntro(false), 2800); return () => window.clearTimeout(timer); }, [intro]);
  if (!summary.readiness.ready || storageIssue) return <main className="ceremony ceremony--blocked"><h1 ref={titleRef} tabIndex={-1}>Abschluss noch nicht verifiziert</h1><p>{storageIssue ? 'Bitte zuerst den Speicherfehler beheben.' : summary.readiness.reasons.join(' ')}</p><button onClick={onClose}>Zurück zur Staffel</button></main>;
  const winners = summary.rankings.filter(p => p.rank === 1);
  const tie = winners.length > 1;
  const chartPlayers = season.playerIds.map(id => summary.rankings.find(p => p.playerId === id)!);
  const bestValue = summary.allocation ? Math.max(...summary.allocation.flatMap(r => season.playerIds.map(id => r.delta[id]))) : null;
  const best = summary.allocation?.flatMap(r => season.playerIds.filter(id => r.delta[id] === bestValue).map(id => ({ episode: r.episode, name: players.find(p => p.id === id)!.name })));
  return <main className={`ceremony ${intro ? 'ceremony--arriving' : ''}`} aria-label="Siegerehrung">
    <div className="ceremony-shell">
      <nav className="ceremony-nav" aria-label="Siegerehrung steuern"><button onClick={onClose}>‹ Zurück zur Staffel</button><span>FINALE · {season.seasonName}</span>{intro && <button onClick={() => setIntro(false)}>Animation überspringen</button>}</nav>
      <header className="ceremony-hero">
        <div className="ceremony-orbit" aria-hidden="true"><svg viewBox="0 0 120 70"><path d="M8 15 45 25 60 10 75 25 112 15 96 56 71 60 60 49 49 60 24 56Z" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="m24 33 22 7-17 6Zm72 0-22 7 17 6Z" fill="currentColor" /></svg></div>
        <p className="ceremony-kicker">DAS LICHT GEHÖRT EUCH</p>
        <h1 ref={titleRef} tabIndex={-1}>{tie ? 'Gemeinsam an der Spitze.' : 'Das Finale ist entschieden.'}</h1>
        <p className="ceremony-winner">{winners.map(p => p.name).join(' & ')}</p>
        <p className="ceremony-verdict">{tie ? 'Geteilter erster Platz' : 'Platz 1'} · <strong>{number(winners[0].totalScore)} Punkte</strong></p>
        <span className="ceremony-seal">16 Masken enthüllt · Abrechnungen geprüft</span>
      </header>

      <section className="ceremony-podium" aria-label="Podest" data-tie={tie}>
        {summary.rankings.slice(0, 3).map(p => <article key={p.playerId} className={`ceremony-step ceremony-step--${p.rank === 1 ? 'first' : p.rank === 2 ? 'second' : 'third'}`}>
          <span className="ceremony-place">{p.rank === 1 ? '★' : `0${p.rank}`}</span>
          <span className="ceremony-avatar" style={{ '--player-color': p.color } as React.CSSProperties}>{p.name.slice(0, 1)}</span>
          <h2>{p.name}</h2><p className="ceremony-points">{number(p.totalScore)}<small>PUNKTE</small></p><p className="ceremony-rank">{tie && p.rank === 1 ? 'Geteilter Platz 1' : `Platz ${p.rank}`}</p>
        </article>)}
      </section>

      <section className="ceremony-section" aria-labelledby="ceremony-scores"><div className="ceremony-section-heading"><div><p className="ceremony-kicker">SO STEHT ES FEST</p><h2 id="ceremony-scores">Die offizielle Gesamtwertung</h2></div><span>Unveränderte gespeicherte Punkte</span></div>
        <div className="ceremony-table-scroll" tabIndex={0} aria-label="Gesamtwertung, bei Bedarf horizontal scrollen"><table className="ceremony-score-table"><thead><tr><th>Platz</th><th>Mitspieler</th><th>Tipppunkte</th><th>Gegenwetten netto</th><th>Gesamt</th></tr></thead><tbody>{summary.rankings.map(p => <tr key={p.playerId} className={p.rank === 1 ? 'is-first' : undefined}><td>{p.rank}</td><th>{p.name}</th><td>{number(p.score)}</td><td>{signed(p.counterBetPoints)}</td><td><strong>{number(p.totalScore)}</strong></td></tr>)}</tbody></table></div>
        <p className="ceremony-scroll-hint">Für alle Spalten die Tabelle seitlich wischen.</p>
      </section>

      <section className="ceremony-section" aria-labelledby="ceremony-highlights"><div className="ceremony-section-heading"><div><p className="ceremony-kicker">WAS VON DIESEM ABEND BLEIBT</p><h2 id="ceremony-highlights">Die Staffel in Zahlen</h2></div></div>
        <div className="ceremony-highlights">
          <article><span>Richtig erkannte Masken</span>{summary.rankings.map(p => <p key={p.playerId}>{p.name}<strong>{p.correctMasks} / 16</strong></p>)}<small>Gezählte Maskentreffer aus den Abrechnungen, keine Anzahl einzelner Tippversuche.</small></article>
          <article><span>Gegenwetten · Nettopunkte</span>{summary.rankings.map(p => <p key={p.playerId}>{p.name}<strong>{signed(p.counterBetPoints)}</strong></p>)}<small>Offizieller Netto-Punktebeitrag. Keine Bonus- oder Spaßpunkte.</small></article>
          <article><span>Größte Show-Zuordnung</span><b>{bestValue === null ? 'Nicht verfügbar' : `${signed(bestValue)} Punkte`}</b><p>{best?.map(r => `${r.name} · Show ${r.episode}`).join(' / ')}</p><small>Höchste Punktevergabe aus heutigen Abrechnungen einer Enthüllungsshow.</small></article>
          {!!summary.exclusive.length && <article><span>Einzig richtig</span><b>{summary.exclusive.length} {summary.exclusive.length === 1 ? 'Maske' : 'Masken'}</b><p>{summary.exclusive.map(e => `${players.find(p => p.id === e.playerId)?.name}: ${e.mask}`).join(' · ')}</p><small>Nur Masken mit gespeicherten Tipps aller Mitspieler. Fehlende Tipps sind keine falschen Tipps.</small></article>}
        </div>
      </section>

      <section className="ceremony-section" aria-labelledby="ceremony-history"><div className="ceremony-section-heading"><div><p className="ceremony-kicker">SECHS SHOWS, EIN GESAMTBILD</p><h2 id="ceremony-history">Abrechnung nach Shows</h2></div><span>Kumulativ · alle Mitspieler</span></div>
        <p className="ceremony-data-note">Aus den heute gespeicherten Maskenabrechnungen rekonstruiert und ihrer Enthüllungsshow zugeordnet. Keine historischen Live-Snapshots; frühere Änderungen oder Neuwertungen sind nicht rekonstruierbar.</p>
        {summary.allocation ? <ScoreChart rows={summary.allocation} players={chartPlayers} /> : <p>Historische Zuordnung nicht verfügbar.</p>}
      </section>
      <footer className="ceremony-footer"><p>Ein guter Tipp bleibt. Ein guter Abend auch.</p><button onClick={onClose}>Zurück zur Staffel</button><span>Diese Ansicht liest den Stand. Sie verändert keine Punkte.</span></footer>
    </div>
  </main>;
}
