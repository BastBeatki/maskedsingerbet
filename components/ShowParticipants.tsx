import React from 'react';
import type { Player, Season } from '../types';
import { showParticipants } from '../showParticipants';
import './ShowParticipants.css';

export const canonicalMaskAnchor = (id: string) => `canonical-mask-${encodeURIComponent(id)}`;

export function ShowParticipants({ season, players, points }: {
  season: Season; players: Player[]; points: Record<string, number>;
}) {
  const views = showParticipants(season);
  return <>{views.map(view => <section key={view.episode} className={`show-participants show-participants--${view.episode}`}
    aria-label={`Teilnehmer Show ${view.episode}`}>
    <details open>
      <summary><span>SHOW {view.episode} · {view.episode === 5 ? 'HALBFINALE' : 'FINALE'}</span>
        <span className="show-participants__count">{view.state === 'known' ? `${view.masks.length} Masken` : view.state === 'pending' ? 'Teilnehmer noch offen' : 'Zuordnung offen'}</span>
      </summary>
      <p className="show-participants__note">{view.state === 'known'
        ? 'Teilnehmer laut Spielstand · derselbe aktuelle Maskenstand wie oben. Zum Tippen oder Demaskieren die ursprüngliche Karte öffnen.'
        : view.state === 'pending' ? 'Teilnehmer werden aus dem Spielstand angezeigt, sobald diese Show aktiv ist oder spätere Enthüllungen sie belegen.'
        : 'Die gespeicherten Auftritte oder das S13-Format sind nicht eindeutig. Bitte unter Einstellungen → Erweitert prüfen.'}</p>
      {view.state === 'known' && <div className="show-participants__grid">{view.masks.map(mask => <article key={mask.id}
        data-participant-mask-id={mask.id} className="show-participants__card">
        <div className="show-participants__identity">
          {(mask.isRevealed ? mask.celebrityImageUrl || mask.imageUrl : mask.imageUrl) && <img
            src={mask.isRevealed ? mask.celebrityImageUrl || mask.imageUrl : mask.imageUrl}
            alt={mask.isRevealed ? mask.revealedCelebrity || mask.name : mask.name} loading="lazy" />}
          <div><h3>{mask.name}</h3><p className="show-participants__status">{mask.isRevealed ? 'Enthüllt' : view.episode === 5 ? 'Halbfinale' : 'Finale'}</p>
            {mask.isRevealed && <p className="show-participants__celebrity">{mask.revealedCelebrity}</p>}</div>
        </div>
        {mask.isRevealed && <ul className="show-participants__points">{players.filter(p => season.playerIds.includes(p.id)).map(player =>
          <li key={player.id}><span>{player.name}</span><strong>{points[`${mask.id}-${player.id}`] ?? '–'} P.</strong></li>)}</ul>}
        <a href={`#${canonicalMaskAnchor(mask.id)}`} onClick={event => {
          event.preventDefault();
          const card = document.getElementById(canonicalMaskAnchor(mask.id));
          card?.scrollIntoView({ block: 'center' }); card?.focus({ preventScroll: true });
        }}>Zur Maske <span aria-hidden="true">↑</span><span className="sr-only">: {mask.name}</span></a>
      </article>)}</div>}
    </details>
  </section>)}</>;
}
