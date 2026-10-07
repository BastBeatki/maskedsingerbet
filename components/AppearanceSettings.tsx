import React, { useEffect, useState } from 'react';
import { Player, Season } from '../types';
import { isAppearanceSeason, previewAppearanceActivation, validateAppearancePlan } from '../appearanceRules';
import { Button, Card, Input } from './common/UI';

export const AppearanceSettings: React.FC<{ season: Season; players: Player[]; onConfigure: (plan: Record<string, number[]>) => void }> = ({ season, players, onConfigure }) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<ReturnType<typeof previewAppearanceActivation> | null>(null);
  useEffect(() => {
    setValues(Object.fromEntries(season.masks.filter(m => !isAppearanceSeason(season) || !m.isRevealed)
      .map(m => [m.id, (season.appearanceRules?.appearances[m.id] || []).join(', ')])));
    setError(''); setPreview(null);
  }, [season, players]);
  const enabled = isAppearanceSeason(season);
  const readPlan = () => Object.fromEntries(Object.entries(values).map(([id, value]) =>
    [id, value.trim() ? value.split(',').map(n => Number(n.trim())) : []]));
  const showPreview = () => {
    try { setPreview(previewAppearanceActivation(season, players, readPlan())); setError(''); }
    catch (e) { setPreview(null); setError(String(e)); }
  };
  const submit = () => {
    try {
      const plan = readPlan();
      validateAppearancePlan(season, plan, !enabled);
      if (!enabled) {
        if (!preview) return;
        const current = previewAppearanceActivation(season, players, plan);
        const totals = current.next.scores.map(s => `${s.name}: ${current.old.scores.find(old => old.playerId === s.playerId)?.totalScore ?? 0} → ${s.totalScore}`).join('\n');
        if (!window.confirm(`Einheitliche S13-Wertung aktivieren? Auch bereits enthüllte Masken werden nach den bestätigten Auftritten neu berechnet.\n${totals}\nTipps, Finalmarker und Gegenwetten bleiben erhalten. Vorher den bisherigen Stand exportieren. Rückkehr über diesen Export.`)) return;
      }
      onConfigure(plan);
    } catch (e) { setError(String(e)); }
  };
  return <Card className="space-y-4">
    <h2 className="text-2xl font-bold">Staffel-13-Wertung</h2>
    <p>{enabled ? 'Aktiv: Punkte nach Maskenauftritt. Abgerechnete Masken bleiben unverändert.' : 'Aktiv: CLASSIC. Erst Vorschau prüfen, dann die neue Wertung bestätigen.'}</p>
    <p className="text-text-secondary">Punktebasis nach Maskenauftritt statt globaler Show. Bestehende Tipps, Finalmarker und Gegenwetten bleiben. Ein Tipp vor dem Debüt zählt wie der erste Auftritt: Basis 20.</p>
    <p className="text-text-secondary">Nur tatsächliche, bestätigte Auftritts-Shows eintragen, auch vergangene ohne Tipp. Eine Show zählt einmal. Unbekannte spätere Shows weglassen und vor weiteren Tipps oder der Abrechnung ergänzen. Das Debüt wird nicht aus Tippzeiten geraten.</p>
    {!enabled && <p className="text-text-secondary">Auch enthüllte Masken eintragen: Ihre bisherigen Punkte werden bei Bestätigung neu berechnet. Bitte zuerst einen Export sichern.</p>}
    {season.masks.filter(m => !enabled || !m.isRevealed).map(mask => <Input key={mask.id} label={`Auftritts-Shows: ${mask.name}`} placeholder="z. B. 2 oder 2, 5" value={values[mask.id] || ''} onChange={e => {
      setValues(v => ({ ...v, [mask.id]: e.target.value })); setPreview(null); setError('');
    }} />)}
    {preview && <div className="overflow-x-auto" role="region" aria-label="Wertungsvorschau">
      <table className="w-full text-left"><caption className="text-left font-bold mb-2">Gesamtstand: CLASSIC → S13</caption>
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
    {!enabled && <Button variant="secondary" onClick={showPreview}>Wertungsvorschau berechnen</Button>}
    <Button onClick={submit} disabled={!enabled && !preview}>{enabled ? 'Auftrittsfolge speichern' : 'S13-Wertung in dieser Staffel aktivieren'}</Button>
  </Card>;
};
