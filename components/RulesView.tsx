import React from 'react';
import { Button, Card } from './common/UI';

export const RulesView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <Button onClick={onBack} variant="secondary" className="mb-2">‹ Zurück zur Übersicht</Button>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-text-primary">Spielerklärung</h1>
        </div>
        <Card className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-accent mb-3">Ziel</h2>
            <p className="text-lg text-text-secondary">Sammle über die Staffel die meisten wichtigen Erfolge: korrekt erratene Masken, gewonnene Gegenwetten, dann Punkte.</p>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-accent mb-3">Tipps (bis zu 3 pro Maske)</h2>
            <ul className="list-disc list-inside space-y-2 text-lg text-text-secondary">
              <li>Bis zu 3 Tipps pro Maske während der Staffel. <strong className="text-text-primary">Früher = mehr Punkte.</strong></li>
              <li>Der erste korrekte Tipp (über alle Spieler) erhält den großen <strong className="text-text-primary">Pionier-Bonus</strong>. Nachahmer später bekommen deutlich weniger.</li>
              <li>Du kannst nach Tipp 1 oder 2 einfach nichts mehr ändern — kein Zwang, alle 3 zu nutzen.</li>
            </ul>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-accent mb-3">Finaler Tipp (Volles Risiko)</h2>
            <ul className="list-disc list-inside space-y-2 text-lg text-text-secondary">
              <li>Markiere Tipp 1 oder 2 als <strong className="text-text-primary">final</strong> → Tipp wird unwiderruflich. Keine weiteren Tipps für diese Maske.</li>
              <li><strong className="text-text-primary">Belohnung:</strong> hoher Punkte-Bonus (größer bei finalem Tipp als erster Tipp vs. finalem zweiten Tipp).</li>
              <li><strong className="text-text-primary">Risiko:</strong> liegst du falsch, sind alle weiteren Chancen für diese Maske weg.</li>
              <li>Ein finaler Tipp macht dich zu einem attraktiven Ziel für Gegenwetten (größere Einsätze).</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-accent mb-3">Gegenwetten</h2>
            <ul className="list-disc list-inside space-y-2 text-lg text-text-secondary">
              <li>Du wettest darauf, dass der <strong className="text-text-primary">aktuellste Tipp</strong> eines anderen falsch ist (keine alten, überschriebenen Tipps).</li>
              <li><strong className="text-text-primary">Gewinn:</strong> du bekommst Punkte, der Tippgeber verliert Punkte. <strong className="text-text-primary">Verlust:</strong> du verlierst Punkte.</li>
              <li>Gegenwetten gegen finale Tipps zahlen und kosten mehr.</li>
              <li><strong className="text-text-primary">Zeitfaktor:</strong> je näher die Gegenwette am ursprünglichen Tipp (in der aktuellen Show) ist, desto wertvoller; alte Tipps bringen kaum noch Punkte.</li>
            </ul>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-accent mb-3">Punkte-/Risikologik — kurz</h2>
            <ul className="list-disc list-inside space-y-2 text-lg text-text-secondary">
              <li>Frühe, richtige Tipps = hohe Grundpunkte.</li>
              <li>Pionier-Bonus &gt; Nachahmer-Punkte.</li>
              <li>Finaler Tipp = großer Bonus, aber endgültiges Sperren.</li>
              <li>Gegenwette = Hebel auf Fehler anderer; früh wetten zahlt sich am meisten aus.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-accent mb-3">Rangliste (Reihenfolge der Wichtigkeit)</h2>
            <ol className="list-decimal list-inside space-y-2 text-lg text-text-secondary">
              <li>Anzahl korrekt erratener Masken <strong className="text-text-primary">(wichtigstes Kriterium)</strong></li>
              <li>Anzahl gewonnener Gegenwetten (Tie-Breaker)</li>
              <li>Gesamtpunktzahl (letztes Kriterium)</li>
            </ol>
            <p className="mt-3 text-lg text-text-secondary">Also: Eine korrekt erratene Maske schlägt viele kleine späte Gewinne. Die Punkte spiegeln das wider, zählen aber erst an dritter Stelle bei Gleichstand.</p>
          </div>

          <div className="!mt-10 p-4 bg-background rounded-lg border border-border">
            <h3 className="text-xl font-bold text-accent">Kurz-Strategie (eine Zeile)</h3>
            <p className="mt-2 text-lg text-text-secondary">Früh richtig liegen zahlt sich aus — setz final nur wenn du 100% sicher bist; nutze Gegenwetten früh gegen klare Fehler, nicht aus Langeweile.</p>
          </div>
        </Card>
      </div>
    </div>
  );
};