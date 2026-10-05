# Isolierte Masked-Singer-Werkstatt – 05.10.2026

Ausgangspunkt: `BastBeatki/maskedsingerbet`, Commit `a0eda60df1b3d8f4915ae5629db9c4c98f96d928`. Release-Preview-Gate vom 05.10.2026: geprüfter Werkstattstand für den separaten Branch `feature/promi-check-mvp` und eine nicht-produktive Vercel Preview freigegeben. Kein Merge nach `main`, kein Production-Deployment und kein Production-Import.

## Prüfen und starten

```powershell
npm.cmd ci --ignore-scripts
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run dev -- --host 127.0.0.1 --port 4317 --strictPort
```

Die lokale Ansicht liegt unter `http://127.0.0.1:4317`. Für den fertigen Build alternativ `npm.cmd run preview -- --host 127.0.0.1 --port 4318 --strictPort` verwenden. Eigener Browser-Ursprung: keine gemeinsame IndexedDB mit Vercel-Production. Der Prüflauf beendet seine Browserprofile und Server; es läuft keine Dauerautomation.

## Umfang und Grenzen

- Promi-Check mit Suche und Staffelfilter, unveränderte Datenkopie vom 30.09.2026: 134 Teilnahmezeilen, darunter acht unbekannte Identitäten. Sonderfälle bleiben separate Zeilen. Kein Abgleich oder Schreiben in den Spielstand.
- Original: `../../Projekt Masked Singer Tipper App Promi DB/Data/the_masked_singer_de_bis_2026-09-30_reconstructed.json`; Kopie: `data/promi-catalog-2026-09-30.json`. Beide SHA-256: `47f6f32ab07854e445425354a0463db10ab8f05049ae98c5b6a348a1ba59388b`.
- `data/promi-image-manifest.json`: 127 Masken- und 134 Teilnahme-Schlüssel. Null bedeutet Platzhalter. Optionaler Bildeintrag: `{ "src": "/catalog-images/example.webp", "source": "verified source", "rights": "verified usage rights" }`. Masken-Schlüssel enthalten Staffel + exakten Maskennamen; Personen-Schlüssel zusätzlich den exakten Prominamen. Keine Bildbeschaffung durchgeführt. Keine privaten Backup-Bilder in den Katalog kopiert.
- Ladefehler/ungültige Spielstände sperren die Bearbeitung; keine automatische Leerspeicherung. Legacy-Migration entfernt `maskedSingerTipperApp` erst nach IndexedDB-Commit. Speicherfehler erscheinen mit Export-Hinweis und Wiederholungsmöglichkeit. DB/Store/Key/Version unverändert; keine neue Cloud-Datenbank oder API.
- Final-Tipp-Callback ist durchgereicht; Punktecode und Final-Regeln bleiben unverändert. Keine neue Tipp-Autovervollständigung oder vollständige Bildausstattung.
- Vorbestehende Tailwind-CDN-Abhängigkeit bleibt erhalten; vollständiger Offline-Betrieb und Mehrtab-Konfliktauflösung wurden nicht verifiziert. Basti hat die reale iPad/Safari-Abnahme laut freigegebenem Handoff `JH-MASKED-RELEASE-PREVIEW-20261005-009` erfolgreich durchgeführt.

## Lokale Prüfarbelege

25 automatisierte Katalog-/Persistenztests und zehn Browserprüfungen bestanden, einschließlich Import → IndexedDB-Readback → Neuladen → Export, Speicherfehler und Final-Callback. Mobile Chromium-Ansichten wurden bei 390 × 844 geprüft; Katalog und importierter Spielstand zeigten keinen horizontalen Überlauf.

`tests/browser.mjs` nutzt einen bereits isolierten, mit `agent-browser` geprüften lokalen Browser über dessen CDP-Adresse. `JARVIS_PLAYWRIGHT_PACKAGE` zeigt bei dieser Umgebung auf das gebündelte Playwright-Paket; andernorts kann ein vorhandenes Playwright-Paket verwendet werden. Aufruf: `node tests/browser.mjs <local-cdp-url> <repaired-export-path> <local-artifact-directory>`.

Private Reparatur- und Browserartefakte liegen außerhalb dieses Repositories unter `../../_workshop/masked-singer-20261005/`; der separate Reparaturexport unter `../../_incoming/masked-singer-live-backup/`. Sie dürfen nicht ins Repository oder in ein Deployment übernommen werden. Der Originalexport bleibt unverändert. `REPAIR_REPORT.json` enthält jeden der elf geänderten Show-Verweise und sämtliche Hashes sowie den isolierten Rundlaufnachweis. Die ursprüngliche Show-Auswahl bleibt bewusst Show 2; vor neuen Show-3-Eingaben ist Show 3 auszuwählen.

Die Reparatur verändert keine gespeicherten Punkte oder Punktelogik. Korrigierte Show-Verweise können nach bestehenden Regeln andere Summen ergeben; persönliche Ergebnisse bleiben ausschließlich in den privaten Reparaturartefakten außerhalb dieses Repositories.

Produktionsdeployment und Import des Reparaturexports benötigen jeweils eine separate Freigabe durch Basti.
