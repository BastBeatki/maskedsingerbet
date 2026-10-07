# Lokale S13-Vorschau (Auftrag 021)

Die neue Version läuft parallel zur unveränderten öffentlichen Version
https://maskedsingerbet.vercel.app/. Kein Production-Deploy oder main-Merge.

## Starten und öffnen

Im Projektordner in PowerShell:

```powershell
npm.cmd run build
npm.cmd run preview -- --host 0.0.0.0 --port 4317 --strictPort
```

Die `Network`-Adresse im Terminal auf iPad/iPhone im selben Heimnetz öffnen.
Der PC muss eingeschaltet bleiben; nach Neustart die zwei Befehle ausführen.
Beim Abschluss von Auftrag 021 läuft der Preview-Server im Hintergrund.
Die aktuelle konkrete LAN-Adresse und Prozess-ID stehen im Airtable-Rückbericht.
Nur `dist` wird ausgeliefert; Backups und Testartefakte liegen außerhalb dieses Builds.
Kein Tunnel, keine Router-Portfreigabe, kein öffentlicher Host und keine neue Cloud-API.

## Import und bestätigter Umstieg

1. Den unveränderten `masked-singer-tipper_ALL-DATA_2026-10-05_REPAIRED_SHOW3.json`
   über **Import** öffnen. Ausgangsstand Staffel2026: BastBeat35, Schütti17, Schum0.
2. Vor Änderungen den Ausgangsstand exportieren. **Einstellungen** von Staffel2026 öffnen.
3. Im Abschnitt **Staffel-13-Wertung** die Auftritts-Shows jeder Maske bestätigen.
   Für den geprüften Export genügen die nachfolgend belegten bisherigen Shows.
4. **Wertungsvorschau berechnen**: erwartet BastBeat35→41, Schütti17→21, Schum0→0.
   Die Vorschau speichert nichts; geänderte Eingaben verwerfen sie.
5. **S13-Wertung in dieser Staffel aktivieren** und den Dialog bestätigen.
   Die sechs historischen Masken erhalten S13-Abrechnungen; alte unbekannte
   Enthüllungszeit bleibt ausdrücklich nicht aufgezeichnet. Roh-Tipps, Finalmarker,
   Gegenwetten, Show-Verweise und Tippzeitstempel bleiben erhalten.

| Feldname aus dem Export | Bisherige Auftritts-Shows |
| --- | --- |
| Bubble | 1 |
| Emily Wau | 1 |
| Professor Dr. Dr. Schweinstein | 1 |
| Momo | 1 |
| Erdbär | 2 |
| MR. MIC | 2 |
| Hippo Jones | 2 |
| Perla | 2 |
| Cosma | 3 |
| P.S | 3 |
| Yeti Cat | 3 |
| Luigi Eishörnchen | 3 |

Die sechs Enthüllungen stammen aus Audit020/Handoff021 und der
[offiziellen Maskenübersicht](https://www.joyn.de/bts/serien/the-masked-singer/2026-alle-masken-im-ueberblick-inklusive-folge4-166735).
Für offene Masken belegt Joyns [Folgen-/Clipmetadaten](https://www.joyn.de/serien/the-masked-singer?page=13)
Schweinstein/Momo in Folge1, der [Folge2-Rückblick](https://www.joyn.de/bts/serien/the-masked-singer/so-fuehrte-stefan-mross-alle-hinters-licht-189947)
Erdbär/Mr.Mic in Folge2 und die [Folge3-Clips](https://www.joyn.de/serien/the-masked-singer?page=19)
P.S./YetiCat in Folge3; am 07.10.2026 gelesen. Debüt folgt daraus zusammen mit der
verbindlichen Vorrundenstruktur aus dem Handoff, nicht aus Tippzeiten.

Für offene Masken wurden **keine späteren Auftritte vorausgesetzt**. Sobald eine weitere
Show tatsächlich feststeht, ihre Nummer vor weiteren Tipps/Abrechnung in der offenen
Auftrittsfolge ergänzen (z.B. `2, 5`, wenn beide Auftritte bestätigt sind). Fremde Shows
zwischen den Auftritten nicht eintragen. Eine bekannte Show vor Debüt darf als Tipp-Show
verwendet werden und zählt für die Basis wie Auftritt1; die echten Daten bleiben erhalten.
Neue Masken zuerst anlegen und ihre Auftrittsfolge in den Einstellungen bestätigen.
Die aktive Show des reparierten Exports bleibt bewusst Show2; vor neuen Eingaben die
gewünschte tatsächliche Show anlegen/auswählen. Keine automatische Änderung dieser Auswahl.

## Spielstände und Grenzen

Jedes Gerät und jede Browser-Adresse besitzt einen eigenen IndexedDB-Spielstand.
Die LAN-Version synchronisiert Geräte nicht automatisch. Den gleichen Stand per
Export/Import übertragen oder ein Gerät als führenden Spielstand benutzen. Auch
`localhost` und die LAN-IP sind verschiedene Browser-Ursprünge. Auf einem Gerät stets
dieselbe Adresse verwenden. Die öffentliche Live-App und ihre Daten bleiben getrennt.

Aktivierte neue Saves passen nicht in die alte Production-Logik: Nur den behaltenen
ursprünglichen CLASSIC-Export dort verwenden. Für Rückkehr in der lokalen Version den
vorher gesicherten CLASSIC-Export importieren; keine automatische Rückkonvertierung.
Schon nach 019 aktivierte, konservative CLASSIC-Ledger werden nicht automatisch umgewertet;
für den einheitlichen 021-Umstieg mit dem unaktivierten Originalexport beginnen.

Tailwind/Fonts und externe Katalogbilder benötigen weiterhin Internet. Browser-Tests
prüfen Chromium mit Handy/iPad-Abmessungen, keine echte Safari-Hardware. Der Abruf
über die LAN-IP wurde am PC verifiziert; WLAN-Gastnetz, Firewall und tatsächlicher
Mobilgerätezugriff sind erst durch Öffnen auf dem jeweiligen Gerät bestätigt.
