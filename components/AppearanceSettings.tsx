import React, { useEffect, useState } from 'react';
import { Season } from '../types';
import { isAppearanceSeason, validateAppearancePlan } from '../appearanceRules';
import { Button, Card, Input } from './common/UI';

export const AppearanceSettings: React.FC<{ season: Season; onConfigure: (plan: Record<string, number[]>) => void }> = ({ season, onConfigure }) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  useEffect(() => { setValues(Object.fromEntries(season.masks.filter(m => !m.isRevealed).map(m => [m.id, (season.appearanceRules?.appearances[m.id] || []).join(', ')]))); setError(''); }, [season]);
  const enabled = isAppearanceSeason(season);
  const submit = () => {
    try {
      const plan = Object.fromEntries(Object.entries(values).map(([id, value]) => [id, value.trim() ? value.split(',').map(n => Number(n.trim())) : []]));
      validateAppearancePlan(season, plan);
      if (!enabled && !window.confirm('Staffel-13-Wertung in dieser Staffel aktivieren? Bereits enthüllte Masken behalten exakt ihre bisherigen Punkte. Offene Tipps und Gegenwetten bleiben erhalten. Bitte vorher einen Export sichern.')) return;
      onConfigure(plan);
    } catch (e) { setError(String(e)); }
  };
  return <Card className="space-y-4">
    <h2 className="text-2xl font-bold">Staffel-13-Wertung</h2>
    <p>{enabled ? 'Aktiv: Punkte nach Maskenauftritt. Abgerechnete Masken bleiben unverändert.' : 'Aktiv: CLASSIC. Staffel-13-Wertung wird nur durch deine Bestätigung eingeschaltet.'}</p>
    <p className="text-text-secondary">Einmal die Auftritts-Shows der noch offenen Masken festlegen. Beispiel: Debüt in Show 4, Halbfinale in 5 und Finale in 6 → 4, 5, 6. Eine Show zählt einmal, auch bei mehreren Songs. Nur die bestätigte Reihenfolge bestimmt die Basis; keine laufende Uhr und keine Ratechance-Buttons.</p>
    <p className="text-text-secondary">Vergangene Auftritte mit angeben, auch wenn niemand getippt hat. Das Debüt wird nicht aus alten Tipps geraten. Falls eine Maske eine spätere Show aussetzt, die Folge vor der Abrechnung hier korrigieren. Bereits ausgegebene Punkte bleiben geschützt.</p>
    {season.masks.filter(m => !m.isRevealed).map(mask => <Input key={mask.id} label={`Auftritts-Shows: ${mask.name}`} placeholder="z. B. 4, 5, 6" value={values[mask.id] || ''} onChange={e => setValues(v => ({ ...v, [mask.id]: e.target.value }))} />)}
    {error && <p role="alert" className="text-red-400">{error}</p>}
    <Button onClick={submit}>{enabled ? 'Auftrittsfolge speichern' : 'S13-Wertung in dieser Staffel aktivieren'}</Button>
  </Card>;
};
