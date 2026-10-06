import React, { useMemo, useState } from 'react';
import { Button, Card, Input } from './common/UI';
import { catalogImages, filterCatalog, getCatalog, gameStateMaskImages, maskKey, participationKey, type ImageAsset } from '../catalog';
import type { Season } from '../types';

const ImageCredit: React.FC<{ asset: ImageAsset | null }> = ({ asset }) => asset?.sourceType === 'USER_GAMESTATE' ?
  <p className="text-xs text-text-secondary mt-1">Bild aus deinem Spielstand · Rechte ungeklärt</p> : asset?.sourceType === 'TEMPORARY_REMOTE' ?
  <p className="text-xs text-text-secondary mt-1 break-words">Foto: {asset.author} · <a href={asset.source} target="_blank" rel="noopener noreferrer" className="underline">Quelle</a><br />Temporäres externes Bild · Rechte ungeklärt</p> : asset ?
  <p className="text-xs text-text-secondary mt-1 break-words" title={`${asset.title}. ${asset.changes}`}>
    Foto: <a href={asset.authorUrl} target="_blank" rel="noopener noreferrer" className="underline">{asset.author}</a>
    {' · '}<a href={asset.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline">{asset.rights}</a>
    {' · '}<a href={asset.source} target="_blank" rel="noopener noreferrer" className="underline">Quelle</a>
  </p> : null;

export const CatalogImage: React.FC<{ src?: string; label: string; costume?: boolean }> = ({ src, label, costume = false }) => {
  const [failed, setFailed] = useState(false);
  const size = costume ? 'w-28 h-28' : 'w-16 h-16';
  return src && !failed ? <img src={src} alt={label} loading="lazy" onError={() => setFailed(true)}
    width={costume ? 112 : 64} height={costume ? 112 : 64} decoding="async" referrerPolicy="no-referrer" className={`${size} rounded-lg object-contain bg-background shrink-0`} /> :
    <div role="img" aria-label={`${label}: kein Bild verfügbar`} className={`${size} rounded-lg bg-background border border-border flex flex-col items-center justify-center shrink-0 text-text-secondary`}>
      <span aria-hidden="true" className="font-bold text-xl">{label.slice(0, 1).toLocaleUpperCase('de-DE')}</span>
      <span aria-hidden="true" className="text-xs">Bild fehlt</span>
    </div>;
};

export const PromiCheckView: React.FC<{ onBack: () => void; seasons?: readonly Season[] }> = ({ onBack, seasons: gameSeasons = [] }) => {
  const [query, setQuery] = useState('');
  const [season, setSeason] = useState('all');
  const userMasks = useMemo(() => gameStateMaskImages(gameSeasons), [gameSeasons]);
  const loaded = useMemo(() => {
    try { return { catalog: getCatalog(), error: null }; }
    catch (error) { return { catalog: null, error: String(error) }; }
  }, []);
  if (!loaded.catalog) return <main className="min-h-screen p-4"><Button onClick={onBack}>Zurück</Button><p role="alert">{loaded.error}</p></main>;
  const catalog = loaded.catalog;
  const rows = filterCatalog(catalog.rows, query, season);
  const seasons = [...new Set<number>(catalog.rows.map(row => row.season))].sort((a, b) => b - a);
  return <main className="min-h-screen p-4 sm:p-6 max-w-7xl mx-auto">
    <header className="mb-6"><Button onClick={onBack} variant="secondary">Zurück zur Startseite</Button>
      <h1 className="text-3xl sm:text-4xl font-bold mt-5 mb-2">Promi-Check</h1>
      <p className="text-text-secondary">134 Teilnahmezeilen · Datenstand {catalog.asOf} · unabhängig von deinem Spielstand</p>
    </header>
    <section aria-label="Katalog durchsuchen" className="flex flex-col sm:flex-row gap-4 mb-5">
      <label className="flex-1">Promi oder Maske suchen
        <Input aria-label="Promi oder Maske suchen" value={query} onChange={event => setQuery(event.target.value)} placeholder="Zum Beispiel Astronaut oder Bülent" className="w-full mt-2" />
      </label>
      <label>Staffel<select aria-label="Staffel" value={season} onChange={event => setSeason(event.target.value)}
        className="block w-full bg-surface border border-border rounded-lg p-3 mt-2">
        <option value="all">Alle Staffeln</option>{seasons.map(number => <option key={number} value={number}>Staffel {number}</option>)}
      </select></label>
    </section>
    <p role="status" className="mb-4 text-text-secondary">{rows.length} von 134 Teilnahmezeilen</p>
    {rows.length === 0 && <Card>Keine Treffer. Suche oder Staffelfilter anpassen.</Card>}
    <section aria-label="Teilnahmen" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {rows.map(row => {
        const images = catalogImages(row);
        const costume = userMasks.get(maskKey(row)) ?? images.mask;
        return <article key={participationKey(row)} data-testid="participation"><Card className="min-w-0 h-full">
          <div className="flex gap-3 mb-3"><CatalogImage costume key={costume?.src ?? 'mask-fallback'} src={costume?.src} label={row.mask_name} />
            <div className="min-w-0 break-words"><p className="text-sm text-text-secondary">Staffel {row.season}{row.placement !== null ? ` · Platz ${row.placement}` : ''}</p>
              <h2 className="text-xl font-bold">{row.mask_name}</h2><p>{row.result}</p><ImageCredit asset={costume} /></div></div>
          <div className="flex gap-3 items-center"><CatalogImage key={images.celebrity?.src ?? 'person-fallback'} src={images.celebrity?.src} label={row.celebrity_name ?? 'Promi noch unbekannt'} />
            <div className="break-words min-w-0"><p className="font-semibold">{row.celebrity_name ?? 'Noch nicht enthüllt'}</p><ImageCredit asset={images.celebrity} /></div></div>
          {row.reveal_episode !== null && <p className="text-sm mt-3">Enthüllung: Show {row.reveal_episode}{row.reveal_date ? ` · ${row.reveal_date}` : ''}</p>}
          {row.special_case && <p className="text-sm mt-3 text-yellow-300">Sonderfall: {row.special_case}</p>}
          {row.notes && <p className="text-sm text-text-secondary mt-2">{row.notes}</p>}
        </Card></article>;
      })}
    </section>
    <details className="mt-6 text-sm text-text-secondary"><summary>Hinweise zu Daten und Bildern</summary>
      <p className="mt-2">Rekonstruierter Katalog aus dem bereitgestellten Rechercheexport. Quellenkennungen sind interne Rechercheverweise und keine direkt aufrufbaren Quellenlinks. Unbekannte Identitäten bleiben unbekannt.</p>
      <p className="mt-2">Bilder sind optional. Fehlende oder nicht ladbare Bilder erhalten einen Platzhalter. Der Katalog verändert keine Tipps, Namen oder Spielstände.</p>
      <p className="mt-2">Die vier lokalen Promifotos sind verkleinerte WebP-Dateien mit dem jeweiligen CC-Lizenznachweis. Externe Kostümbilder sind vorläufig eingebunden: Ihre Verfügbarkeit und Nutzungsrechte sind nicht zugesichert. Bilder aus deinem Spielstand werden nur lokal gelesen; sie werden weder in den Katalog kopiert noch veröffentlicht. Fehlende Bilder bleiben Platzhalter.</p>
      <p lang="en" className="mt-2">{catalog.notice}</p>
    </details>
  </main>;
};
