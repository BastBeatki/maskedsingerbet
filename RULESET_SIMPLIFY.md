# Staffel 13: bestehendes Spiel, Punkte nach Maskenauftritt

Handoff `JH-MASKED-S13-RULESET-SIMPLIFY-20261007-019`, Version 1.
Aktualisiert durch `JH-MASKED-S13-LOCAL-PREVIEW-20261007-021`, Version 1:
Vor-Debüt-Basis und bestätigte rückwirkende S13-Umwertung für die lokale LAN-Vorschau.
Aktueller Normalbetrieb durch Handoff022: versionierte S13-Automatik statt manueller Listen.
Neuer Branch `feature/s13-simple` direkt von Production/main
`b0ca9953d04776afc8d11369502f441c5b95fa27`.
018 (`feature/s13-ruleset`, `5f31d6ba4cc102a06aa46645ecf2dd51015bf9a8`)
bleibt separat und wird nicht gemergt/promotet. Keine neue Live-Freigabe durch diesen Auftrag.

## Prüfung des Bestands und kleinster Änderungsplan

018 änderte unter anderem Tippanzahl, finale Sperre, Gewinnerauswahl, Zeitfaktoren,
Gegenwetten und Übergang. Das ist für die jetzt gewünschte Basiskorrektur zu viel.
019 beginnt vom funktionierenden main, behält dessen Bilder/Katalog/Bedienung und
ergänzt nur eine andere Basis, ausdrückliche Aktivierung, Ergebnis-Snapshots und
Abrechnung/Vergleich. Die kleine Promi-Link-Ergänzung aus 018 ist nicht Bestandteil
dieses neuen Branches; sie bleibt auf 018 verfügbar. Keine Bildarbeiten.

CLASSIC-Engine wird wiederverwendet: einziger Eingriff im Berechnungsrumpf ist
ein optionaler Resolver für die Basis-Folgennummer; der Default bleibt die globale
Show-Nummer. Der bisherige `calculateScores`-Export bleibt kompatibel.
Alle weiteren Berechnungen sind unverändert:

- Basis globale Show <=1:20, 2:18, 3:16, 4:14, 5:12, >=6:10.
- Richtige Tipps mit vorhandener Show: Trim/Kleinbuchstaben, sortiert nach
  Show-Nummer und `createdAt`. Bei exakten Zeitgleichständen bleibt die
  vorhandene Spieler-/Tipp-Reihenfolge maßgeblich.
- Jeder Spieler erhält seinen ersten historischen Treffer. Ein späterer falscher
  Tipp löscht diesen Treffer nicht. Erster Treffer insgesamt: 100 %, andere: 40 %.
- Finalfaktor Slot 1:1,8, Slot 2:1,5, Slot 3:1. Gleiche-Show-Final-Upgrade:
  späterer richtiger Finaltipp in derselben Show erhöht den ersten richtigen Tipp;
  dessen Slot bestimmt den Faktor. Gerundet wird erst nach Final- und Pionierfaktor.
- Maximal drei Tipps. Final-Checkbox beim Hinzufügen nur Slot 1/2; die bisherige
  nachträgliche Finalfunktion funktioniert auch für Slot 3, dort ohne Bonus.
  Final setzt die Eingabesperre; das bestehende Entfernen der Markierung bleibt.
  Löschen des letzten offenen Tipps bleibt möglich. Falsche Tipps kosten 0.
- Offene Slots haben für sich allein keine 1/2/3-Abstufung. Die strategische
  Wertigkeit entsteht aus verbleibenden Versuchen, Finalfaktoren und frühem Treffer.
  Eine zusätzliche Slotstrafe wäre eine Regeländerung und wird nicht eingeführt.
- Gegenwetten zielen auf den letzten Tippindex bei Platzierung. Pro Wettender,
  Zielspieler und Maske eine Wette; nicht gegen sich selbst. Gegen falschen
  normalen/finalen Tipp: Wettender +3/+5, Ziel −2/−3; gegen richtigen Tipp:
  Wettender −2/−3, Ziel 0. Finalstatus bleibt wie bisher aus dem gezielten Tipp gelesen.
  Faktor `max(0, 1 − 0,15 × max(0, Wettshow − Tippshow))`, anschließend JS-Rundung,
  auch bei negativen Halbwerten. Dieser Show-Abstand bleibt bewusst CLASSIC:
  Auftrag korrigiert die Tippbasis, nicht sämtliche Gegenwettenregeln.
- Rangliste nur Gesamtpunkte. `constants.ts` 10/5/2 ist kein Scoring-Vertrag.

## Vereinfachte Regel und konkrete Beispiele

`s13-appearances-v1` ersetzt nur die Basis-Show-Nummer durch die Position der
Tipp-Show in der bestätigten Auftrittsliste dieser Maske. Eine bekannte Tipp-Show
vor dem Debüt liefert ebenfalls Auftritt 1, ohne ihre Referenz/Zeit zu ändern oder
einen zusätzlichen Auftritt einzufügen. Ungelistete Shows nach dem Debüt bleiben Fehler.
Diese Regel gilt konsistent für Aktivierung, Eingabe, Berechnung und Import. Beispiele:

| Maskenfolge | richtiger Tipp | Basis CLASSIC | Basis S13 |
| --- | --- | ---: | ---: |
| 1,5,6 | Show 1 / Debüt | 20 | 20 |
| 4,5,6 | Show 4 / Debüt | 14 | 20 |
| 4,5,6 | Show 2 / vor Debüt | 18 | 20 |
| 4,5,6 | Show 5 / zweiter Auftritt | 12 | 18 |
| 4,5,6 | Show 6 / dritter Auftritt | 10 | 16 |
| 4,6 | Show 6 / tatsächlich zweiter Auftritt | 10 | 18 |

Ein richtiger Debüt-Tipp bleibt 20 Basis wert, wenn die Maske das Finale erreicht.
Ein erster Treffer erst im dritten Auftritt nutzt 16. Mehrere Songs/Indizien in
derselben Show zählen als ein Auftritt im Sinne dieses privaten Regelwerks;
keine neue Event-Erfassung während der Sendung.

| erster persönlicher Treffer im Debüt | Pionier | späterer Spieler |
| --- | ---: | ---: |
| offen, beliebiger Slot | 20 | 8 |
| final, Slot 1 | 36 | 14 |
| final, Slot 2 | 30 | 12 |
| final, Slot 3 | 20 | 8 |

Bastis Fall: A ist früh richtig/offen in Slot 1:20. B liegt zweimal falsch und
trifft später in Slot 3, selbst final:8. Ohne zusätzliche Gegenwetten gewinnt A
klar. Früh final (Slot 1) bringt36. Ein späterer zweiter finaler Treffer bringt12.
Keine Identitätswechselstrafe, kein unbegrenztes Tippen, kein laufender Zeitabschlag.
Der bisherige Zeitstempel entscheidet weiterhin nur, wer zuerst richtig lag.

Die kleineren Basisstufen 20/18/16 statt 018s 20/16/12 bewahren den Bestand.
Ein Offset nach Debüt plus globale Show-Differenz wäre zwar noch kürzer, würde
die fremden Vorrunden 2–4 fälschlich mitzählen. Eine explizite kurze Auftrittsliste
ist robuster, unterstützt ausgelassene Shows und benötigt keine Performance-Events.

## Quellen und ehrliche Auftrittszuordnung

[Joyn: aktueller Modus](https://www.joyn.de/bts/serien/the-masked-singer/2026-wissenswertes-ueber-die-aktuelle-staffel-149792),
am 07.10.2026 gelesen, Artikel aktualisiert05.10.: vier Vorrunden mit je vier
Masken, zwei Enthüllungen und zwei Halbfinal-Qualifikationen je Show. Das erklärt
die Benachteiligung später Debüts. Der genaue spätere Auftritt jeder konkreten
Maske ist keine automatisch bekannte App-Information.

022 führt die bekannten Debüts ausdrücklich pro aktivierter Staffel mit `s13-2026-v1`.
Die vier bestätigten Gruppen stehen in `appearanceAuto.ts`; Masken werden an ihre ID
gebunden, nicht dauerhaft aus einem editierbaren Namen erkannt. Andere Staffeln/Saves
bleiben CLASSIC. Die Namen/Shows stammen aus dem bestätigten Handoff022, nicht aus
Tippzeiten. Halbfinale5/Finale6 werden aus Showfortschritt und Enthüllungsstatus geführt;
keine feste Finalistenanzahl. Mehrere Performances zählen einmal. Bereits abgerechnete
Masken behalten ihre eingefrorene tatsächliche Auftrittsliste und ihren Ledger.

Normal: exportieren, Alt-vs-Neu-Vorschau berechnen, ausdrücklich aktivieren. Kein
Auftrittsformular. Bestehende021-Saves können die Automatik ausdrücklich zuschalten,
ohne Ledgers neu zu berechnen. Historische Aktivierung aus CLASSIC bleibt021-kompatibel.
Nur der eingeklappte Bereich **Erweitert / Auftritte korrigieren** enthält Ausnahmen:
pro offener Maske eine tatsächliche Folge, oder eine bestätigte abweichende Besetzung.
Erkannte Vorrunden-/Referenzabweichungen blockieren Eingaben/Abrechnung mit Hinweis.
Die App beobachtet die TV-Sendung nicht und kann einen nicht gemeldeten Aussetzer
nicht erkennen. Deshalb eine solche Abweichung vor Wertung erweitert melden.
Gegenwetten nutzen weiter CLASSIC; kein neues Timing-/Performance-Modell.
Manuelle019/021-Pläne bleiben in diesem Ausnahmeweg kompatibel; keine Startup-Migration.

## Bestätigter einheitlicher Übergang derselben Staffel (021)

Alte Saves ohne Version bleiben CLASSIC, unabhängig von Name/Jahr. Keine automatische
Startup-Migration, keine neue Season-ID, keine Kopie, keine Neuanlage von Tipps.
Nach Export, automatischer bestätigter Zuordnung, Alt-vs-Neu-Vorschau und ausdrücklicher
Bestätigung in den Staffeleinstellungen:

1. Jede bereits enthüllte Maske wird mit der gemeinsamen CLASSIC-Engine und der
   bestätigten Maskenbasis neu berechnet und als `s13-appearances-v1`-Abrechnung gespeichert.
   Alte fehlende Enthüllungszeit:0, sichtbar als nicht aufgezeichnet; der Zeitpunkt
   der Aktivierung bleibt davon getrennt. Historische Listen benötigen bekannte
   Shows bis zur gespeicherten Enthüllung. Keine erfundenen Auftritte/Zeitstempel.
   Der interne Modus `preserve-classic` bewahrt die API/019-Historie; der neue UI-Umstieg
   verwendet ausdrücklich `revalue-s13`. Schon aktivierte Saves werden beim Laden
   nicht erneut umgewertet; für einen neuen Umstieg den Originalexport verwenden.
2. Offene Masken behalten sämtliche Tipps, Slots, Finalmarkierungen und Gegenwetten.
   Ihr späteres Ergebnis verwendet die neue Auftrittsbasis – auch ein bereits
   vorhandener, noch nicht abgerechneter richtiger Tipp nutzt sein bestätigtes Debüt.
   Auch künftig werden ausschließlich die gespeicherten echten Tipps verwendet.
   Es werden keine neuen Tipp-/Finalzeiten erfunden.
3. Jede neue manuelle Enthüllung speichert einmal einen `s13-appearances-v1`-Snapshot
   mit tatsächlicher Abrechnungszeit, Prominame, Punkten und verständlicher Erklärung.
   Die aktive Rangliste liest diese Snapshots. Render, Vergleich und Reload buchen nichts.
4. Nach Abrechnung keine Tipp-/Final-/Wettmutation, kein Löschen der abgerechneten
   Maske, kein Löschen von Shows oder Entfernen von Staffelspielern. Dadurch bleiben
   Historie und Abrechnungen konsistent. Namen/Bilder können weiter gepflegt werden.
   Eine ganze Staffel kann weiterhin bewusst gelöscht werden. Rückkehr zum alten
   Regelwerk über den gesicherten Export; keine automatische Rückkonvertierung.

IndexedDB bleibt `MaskedSingerTipperDB`, Version1, `appStateStore/mainState`.
Additive JSON-Felder bleiben im vollständigen Export/Import erhalten. Unbekannte
Versionen (auch 018s `tournament-v1`) und strukturell/arithmetisch beschädigte
Abrechnungen werden zurückgewiesen, ohne den vorhandenen Save zu ersetzen.
Keine Übernahme experimenteller 018-Kopien in dieses andere Modell.
In 021 wurde der reparierte Export ausschließlich in einem isolierten lokalen
Testbrowser importiert/aktiviert und exportiert. Originaldatei, bestehende
Vercel-Browserdaten und Production bleiben unverändert. Nach Aktivierung sind
Tipps/Finalmarker/Gegenwetten/Shows/Spieler und die gesamte Staffel2025 identisch.

## Abrechnung und read-only Vergleich

Nach jeder Enthüllung erscheinen Basis, Show/Auftritt, Slot, Finalfaktor,
Pionieranteil, gerundete Tipppunkte, einzelne Gegenwetten samt Einsätzen/
Show-Abschlag und Endsumme für jeden Spieler.
`?rulesetDebug=1` öffnet zusätzlich den ausblendbaren Vergleich auf identischen
Tipps/Finalmarkierungen/Gegenwetten: Staffel-12/CLASSIC vs. S13 nach Auftritt.
Dies ist ein Feature-Switch, keine Authentifizierung. Nur das aktive Regelwerk
bestimmt echte Ranglistenpunkte. Ältere übernommene CLASSIC-Abrechnungen bleiben
kompatibel. Neue bestätigte historische S13-Abrechnungen zeigen den CLASSIC-vs-S13-Vergleich.
Ohne bestätigte Auftrittsfolge lautet der Vergleich ehrlich „noch nicht möglich“.

## Verifikation

83 Unit-/Storage-/Scoring-/Katalogtests:24 Debüt×Slot×Final-Kombinationen,
früh/offen vs. spät/Slot3/final, Same-Show-Final-Upgrade, Follower-Rundung,
Halbfinale/Finale und weitere Basistiers, ausgelassene Shows, alle Gegenwette-
Varianten, historische komplette Lookup-/Score-Parität, offene Alt-Tipps,
Ledger/IndexedDB/JSON-Roundtrip, alte Saves ohne Rewrite, Vergleich ohne Mutation,
unbekannte Versionen und beschädigte Ergebnis-Maps. Typecheck und Build bestanden.
Vier neue isolierte Chromium-Browserflows prüfen den kompletten Weg
Einstellungen→Aktivierung→Tipps/Gegenwette→Enthüllung→Ledger→Abrechnung/Vergleich
→Export→Reload/Import sowie Altstände und fehlgeschlagene Imports.
390px,390×660px und1024×1366px; keine echte iPad-/Safari-Hardwareprüfung.
Bestehende Bild-/CLASSIC-Browserregressionen werden separat im Rückbericht ausgewiesen.
Artefakte unter `artifacts/appearances-019*` sind ignoriert und bleiben lokal.
Katalog-/Bildmanifest-/Portraitdateien sowie Storage-Vertrag bleiben unverändert.
Keine neuen Abhängigkeiten, Services, Environmentvariablen oder laufenden Kosten.

021 ergänzt Vor-Debüt mit/ohne Final, unveränderte Pionierreihenfolge und Gegenwetten,
Ablehnung späterer ungelisteter Shows und bestätigte historische Umwertung/Roundtrip.
Vier synthetische Browserflows bleiben bestanden. Zusätzlich der komplette reale
Rundlauf über die PC-LAN-Adresse: 35/17/0 → Vorschau → Abbruch ohne Write → bestätigter
41/21/0-Umstieg → Export/Import/Reload, ohne Veränderung der Rohdatensätze oder Staffel2025.
Die Testkopie liegt ausschließlich lokal unter `_workshop/masked-singer-021`, außerhalb
des ausgelieferten Builds. Keine echte iPhone/iPad/Safari-Abnahme behauptet.
LAN-Anleitung und bestätigte aktuelle Auftritts-Shows: [LOCAL_PREVIEW.md](LOCAL_PREVIEW.md).

022: 88 automatische Tests plus die vier bisherigen synthetischen Browserflows bestehen.
Realer reparierter Export ohne Auftrittseingaben: Vorschau/Abbruch ohne Write →41/21/0
→Export/Import/Reload; alle Rohdatensätze und Staffel2025 unverändert. Auch021-Manuell-
Regression inklusive ungültiger Liste/staler Vorschau und021→Automatik unveränderte
Ledgers bestanden. Zusätzlicher Browserflow Show4→5→6: vier Debüts/zwei Enthüllungen,
acht Halbfinalisten, beliebige drei Enthüllungen/fünf Finalisten,20/18/16Basis, echter
Vor-Debüt-Tipp, Export/Import/Reload und erweiterter Show-Aussetzer mit18Finalbasis.
Private reale Tests unter `_workshop/masked-singer-022`, synthetische/Serving-/Bildschirm-
Artefakte unter ignoriertem `artifacts/local-022`. LAN-Anleitung: LOCAL_PREVIEW.md.
