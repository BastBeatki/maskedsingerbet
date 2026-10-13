# Staffel-12-Bilder: Auftrag026

`JH-MASKED-S12-IMAGE-FIX-20261007-026`, Version1.

## Ursache und Bestand

Im reparierten Originalexport enthält `Staffel 2025` alle neun Masken mit gültigen
eingebetteten PNG-Kostümen und JPEG/WebP-Porträts. Kein Asset ist verloren gegangen.
Der Katalog hat dagegen für S12 neun explizit leere Masken-/Porträteinträge im
öffentlichen Manifest. Die vorhandene private Anzeigeanbindung `gameStateMaskImages`
in `catalog.ts` berücksichtigt seit Commit2db7d88 ausschließlich S13-Masken und
liest keine Promifotos. Die Spielkarten verwendeten ihre gespeicherten Bilder direkt,
die Katalogkarten konnten S12 so nie aus diesem Spielstand beziehen. Keine404/CORS-
oder Datei-/Case-Ursache: Es wurde gar keine S12-Bildquelle an die Karten übergeben.

Zwei konkrete Anzeigevarianten im Export: `Smile` statt Katalog-`Smiley`, sowie
`Jared Evil Jared Hasselhoff` statt `Evil Jared Hasselhoff`. Nur deren belegte
Zuordnung wird unterstützt; gespeicherte Namen und Katalogdaten bleiben unverändert.

## Kleiner Fix für beide App-Stände

`gameStateS12Images.ts` liefert rein lesend zwei Maps für Kostüme und Porträts.
Genau eine Staffel namens `Staffel 2025` oder `Staffel 12` mit mindestens sieben
unterschiedlichen passenden Masken muss vorhanden sein. Doppelte Staffeln/Masken
werden nicht geraten. Porträts erfordern zusätzlich eine enthüllte Maske mit zum
Katalog passender Person. Ausschließlich eingebettete PNG/JPEG/WebP-Bilder erlaubt.
Fehlende/unsichere Bilder behalten den bisherigen Platzhalter.

Production: minimale Einbindung in `components/PromiCheckView.tsx`.
Neue Version: dieselbe Utility in `components/CatalogBrowser.tsx`, daher Home,
globaler In-Game-Check und Promi-prüfen-Dialog gleichzeitig repariert.
S13-Anbindung, öffentliche Bilder/Manifest/Quellen, Punkte, Regeln, Rohdaten,
Storage und Persistenz bleiben unverändert. Keine neuen Bilder, Suche oder APIs.

## Prüfung und Grenzen

Tests prüfen neun plus neun Zuordnungen, Originaldaten-Unveränderlichkeit,
beide Anzeigevarianten, Mehrdeutigkeit, falsche Personen und unsichere Bildtypen.
Isolierte Browser prüfen alle18 tatsächlichen Bilder pro Ansicht, Dekodierung und
identische Original-srcs, alle übrigen Staffeln1–11/13 stichprobenartig,
keinen Upload/Pageerror/Overflow sowie denselben Save vor/nach Nutzung und Reload.
Private Prüfexporte/Screenshots bleiben außerhalb Git und Hosting.

Ohne den passenden eigenen Spielstand bleiben S12-Platzhalter korrekt. Der Fix
veröffentlicht keine privaten Bilder und erzeugt keine Synchronisierung zwischen
Geräten oder Adressen. Refresh lädt die Bildanbindung; ein Import ist nur nötig,
wenn auf diesem Gerät dieser Spielstand tatsächlich fehlt. PC/LAN-Grenzen wie zuvor.
Kein tatsächlicher iPad/Safari-Gerätetest behauptet.
