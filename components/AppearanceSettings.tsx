import React, { useEffect, useState } from 'react';
import { Player, Season, S13Automatic } from '../types';
import { automaticPlan, isAppearanceSeason, previewAppearanceMode, validateAppearancePlan } from '../appearanceRules';
import { appearanceEpisodes, automaticWarnings, createAutomatic } from '../appearanceAuto';
import { Button, Card, Input } from './common/UI';

export const AppearanceSettings: React.FC<{ season: Season; players: Player[]; onConfigure: (plan: Record<string, number[]>, automatic?: S13Automatic) => void }> = ({ season, players, onConfigure }) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [manual, setManual] = useState(false);
  const [deviation, setDeviation] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<ReturnType<typeof previewAppearanceMode> | null>(null);
  const enabled = isAppearanceSeason(season);
  const automatic = season.appearanceRules?.automatic;
  useEffect(() => {
    setValues(Object.fromEntries(season.masks.filter(m => !isAppearanceSeason(season) || !m.isRevealed)
      .map(m => [m.id, (appearanceEpisodes(season, m) || []).join(', ')])));
    setDeviation(!!season.appearanceRules?.automatic?.deviationConfirmed);
    setManual(false); setError(''); setPreview(null);
  }, [season, players]);
  const changed = () => { setPreview(null); setError(''); };
  const readPlan = () => Object.fromEntries(Object.entries(values).map(([id, value]) =>
    [id, value.trim() ? value.split(',').map(n => Number(n.trim())) : []]));
  const configuration = (corrections = false) => {
    if (manual) return { plan: readPlan(), auto: undefined };
    const auto: S13Automatic = structuredClone(automatic || createAutomatic(season));
    auto.deviationConfirmed = deviation;
    if (corrections) {
      for (const mask of season.masks.filter(m => !m.isRevealed)) {
        const entered = readPlan()[mask.id];
        const withoutOverride = { ...auto, overrides: { ...auto.overrides } };
        delete withoutOverride.overrides[mask.id];
        const defaultPlan = appearanceEpisodes({ ...season, appearanceRules: { ...season.appearanceRules!, automatic: withoutOverride } }, mask);
        if (JSON.stringify(entered) === JSON.stringify(defaultPlan)) delete auto.overrides[mask.id];
        else auto.overrides[mask.id] = entered;
      }
    }
    const plan = automaticPlan(season, auto);
    validateAppearancePlan(season, plan, !enabled);
    return { plan, auto };
  };
  const showPreview = () => {
    try { const { plan, auto } = configuration(); setPreview(previewAppearanceMode(season, players, plan, auto)); setError(''); }
    catch (e) { setPreview(null); setError(String(e)); }
  };
  const submit = (corrections = false) => {
    try {
      const { plan, auto } = configuration(corrections);
      validateAppearancePlan(season, plan, !enabled);
      if (!enabled || (!automatic && !manual)) {
        if (!preview) return;
        const current = previewAppearanceMode(season, players, plan, auto);
        const totals = current.next.scores.map(s => `${s.name}: ${current.old.scores.find(old => old.playerId === s.playerId)?.totalScore ?? 0} → ${s.totalScore}`).join('\n');
        if (!window.confirm(`${enabled ? 'S13-Automatik einschalten? Gespeicherte Abrechnungen bleiben erhalten.' : 'Einheitliche S13-Wertung aktivieren? Auch bereits enthüllte Masken werden neu berechnet.'}\n${totals}\nTipps, Finalmarker und Gegenwetten bleiben erhalten. Vorher den bisherigen Stand exportieren. Rückkehr über diesen Export.`)) return;
      }
      onConfigure(plan, auto);
    } catch (e) { setError(String(e)); }
  };
  const needsPreview = !enabled || (!automatic && !manual);
  return <Card className="space-y-4">
    <h2 className="text-2xl font-bold">Staffel-13-Wertung</h2>
    <p>{automatic ? 'S13-Automatik aktiv' : enabled ? 'S13-Wertung aktiv · Automatik noch einschalten' : 'Aktiv: CLASSIC. Erst Vorschau prüfen, dann bestätigen.'}</p>
    <p className="text-text-secondary">Staffel 13: Das Spiel bleibt gleich. Neu ist nur die Punktebasis: Sie richtet sich danach, zum wievielten Mal eine Maske auftritt. Die Auftritte führt die App automatisch.</p>
    {!automatic && <p className="text-sm text-text-secondary">Für die bestätigten 16 Masken der Staffel 2026. Andere Staffeln bleiben CLASSIC. Bitte vor der Aktivierung exportieren.</p>}
    {automaticWarnings(season).length > 0 && <p role="alert" className="text-amber-300">{automaticWarnings(season).join(' ')} Erweiterte Korrektur prüfen.</p>}
    <details className="border border-border rounded p-3">
      <summary className="cursor-pointer text-text-secondary">Erweitert / Auftritte korrigieren</summary>
      <div className="space-y-3 mt-3">
        <p className="text-sm text-text-secondary">Nur bei einer Abweichung vom bestätigten TV-Format, etwa einer ausgesetzten Show. Die App kann TV-Auftritte nicht selbst beobachten. Enthüllte Abrechnungen bleiben geschützt. Eine Show zählt einmal; Tipps vor dem Debüt behalten Basis 20.</p>
        {!automatic && <label className="flex gap-2"><input type="checkbox" checked={manual} onChange={e => { setManual(e.target.checked); changed(); }} />Manuelle Auftrittsfolgen verwenden</label>}
        {automatic && <label className="flex gap-2"><input type="checkbox" checked={deviation} onChange={e => { setDeviation(e.target.checked); changed(); }} />Abweichende Besetzung nach Prüfung bestätigen</label>}
        {(manual || automatic) && <>
          <p className="text-sm text-text-secondary">Tatsächliche Show-Nummern aufsteigend, durch Komma getrennt. Bei der Automatik ersetzt eine abweichende Liste nur diese offene Maske. Die normale Folge entfernt ihre Ausnahme wieder.</p>
          {season.masks.filter(m => !enabled || !m.isRevealed).map(mask => <Input key={mask.id} label={`Auftritts-Shows: ${mask.name}`} value={values[mask.id] || ''} onChange={e => { setValues(v => ({ ...v, [mask.id]: e.target.value })); changed(); }} />)}
          {enabled && <Button onClick={() => submit(true)}>Auftrittsfolge speichern</Button>}
        </>}
      </div>
    </details>
    {preview && <div className="overflow-x-auto" role="region" aria-label="Wertungsvorschau">
      <table className="w-full text-left"><caption className="text-left font-bold mb-2">Gesamtstand: Alt → S13</caption>
        <thead><tr><th scope="col">Spieler</th><th scope="col">Alt</th><th scope="col">S13</th><th scope="col">Δ</th></tr></thead>
        <tbody>{preview.next.scores.map(s => {
          const old = preview.old.scores.find(o => o.playerId === s.playerId)?.totalScore ?? 0;
          const delta = s.totalScore - old;
          return <tr key={s.playerId}><th scope="row" className="pr-2 break-words">{s.name}</th><td>{old}</td><td>{s.totalScore}</td><td>{delta > 0 ? '+' : ''}{delta}</td></tr>;
        })}</tbody>
      </table>
      <p className="text-sm text-text-secondary mt-2">Nur Vorschau. Noch keine Punkte oder Daten geändert.</p>
    </div>}
    {error && <p role="alert" className="text-red-400">{error}</p>}
    {needsPreview && <><Button variant="secondary" onClick={showPreview}>Wertungsvorschau berechnen</Button>
      <Button onClick={() => submit()} disabled={!preview}>{enabled ? 'S13-Automatik einschalten' : 'S13-Wertung in dieser Staffel aktivieren'}</Button></>}
  </Card>;
};
