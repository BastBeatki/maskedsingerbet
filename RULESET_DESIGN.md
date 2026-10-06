# Staffel 13: Regelentwurf und überprüfbare Feature-Implementierung

Handoff `JH-MASKED-S13-RULESET-DESIGN-20261006-018`, Version 3, 2026-10-06.
Basis: Production/main `b0ca9953d04776afc8d11369502f441c5b95fa27`.
Feature: `feature/s13-ruleset`. Keine Freigabe für main/Production durch diesen Auftrag.

## Phase A: kleine Promi-Link-Ergänzung

Vier exakt zugeordnete Wikipedia-Artikel: [Max Mutzke](https://de.wikipedia.org/wiki/Max_Mutzke),
[Tom Beck](https://de.wikipedia.org/wiki/Tom_Beck), [Bülent Ceylan](https://de.wikipedia.org/wiki/B%C3%BClent_Ceylan),
[Stefanie Heinzmann](https://de.wikipedia.org/wiki/Stefanie_Heinzmann).
Titel/Personen am 2026-10-06 geprüft; fünf Teilnahmezeilen, weil Max Mutzke zweimal vorkommt.
`celebrityLinks.ts` löst ausschließlich diese exakten Katalogidentitäten auf. HTTPS-Personenartikel,
`target="_blank"`, `rel="noopener noreferrer"`; keine Bilder werden von diesen Seiten geladen.
Vier bestehende LOCAL_VERIFIED-Porträts bleiben bevorzugt. Unbekannte/nicht geprüfte Namen: kein Link.
Bewusst teilweise Abdeckung: 117 der 125 bekannten Personen haben weiterhin weder lokalen Porträt-
noch geprüften Info-Fallback. Keine Bildbeschaffung, keine Lizenz-Sidequest, Katalog unverändert.

## Offizieller Ablauf: Fakten und Wissensgrenzen

[Joyn: aktueller Modus](https://www.joyn.de/bts/serien/the-masked-singer/2026-wissenswertes-ueber-die-aktuelle-staffel-149792)
(aktualisiert 05.10.2026) bestätigt 16 Masken, vier Vorrunden mit je vier konkurrierenden Masken,
je zwei Enthüllungen und zwei Halbfinal-Qualifikationen. Die Sendung ist voraufgezeichnet;
unser Spiel misst die private Beobachtung während der Ausstrahlung bzw. gemeinsamen Wiedergabe.
Aus vier mal zwei Qualifikationen folgen acht Halbfinalplätze (Ableitung aus diesem Modus).
[Joyn: Sendetermine](https://www.joyn.de/bts/serien/the-masked-singer/alle-sendezeiten-und-sendetermine-166741)
(aktualisiert 01.10.2026) listet sechs Folgen: 16./23./30.09., 07./14./21.10.2026, jeweils 20:15 Uhr.
UNKNOWN: genaue Auftrittsrunden, neue Indizblöcke und Enthüllungsfolge in Halbfinale/Finale,
finale Teilnehmerzahl und die Anzahl tatsächlich verfügbarer Ratechancen pro Maske.
Diese unbekannten Details sind nicht im Code als TV-Fakten hinterlegt. Keine Web-Enthüllungen oder
externen Prominamen werden in einen Spielstand geschrieben.

## CLASSIC: exakt rekonstruierter Bestand

`calculateClassicScores` in `utils.ts` hat denselben Funktionskörper wie die bisherige
`calculateScores`-Funktion. Der alte Export bleibt als Alias bestehen.

- Basis nach globaler Show-Nummer: <=1:20, 2:18, 3:16, 4:14, 5:12, >=6:10.
- Trim + Kleinbuchstaben; nur richtige Tipps mit einer vorhandenen Show werden gewertet.
  Richtige Tipps sortieren nach Show-Nummer, dann `createdAt`.
- Jeder Spieler erhält seinen ersten historischen richtigen Tipp. Der insgesamt erste richtige
  Tipp bekommt 100%; alle anderen 40%, jeweils `Math.round`. Bei exakt gleichen Zeitstempeln
  entscheidet die vorhandene Spieler-/Tipp-Reihenfolge; kein zusätzlicher Gleichstandsbonus.
- Final: erster Tippslot ×1,8, zweiter ×1,5, dritter ×1. Ein späterer richtiger Finaltipp in derselben
  Show-Nummer wertet den ersten richtigen Tipp effektiv als final; dessen Slot bestimmt den Faktor.
- Später falsch tippen entfernt den historischen Treffer nicht. Falsche Tipps selbst kosten 0.
  Bis drei Tipps, Final in Slot 1/2 beim Hinzufügen; das vorhandene UI erlaubt Final rückgängig
  zu machen. Keine heimliche Korrektur dieser alten Mechanik.
- Gegenwette bindet den letzten Tippindex zum Zeitpunkt der Platzierung. Pro Wettender/Ziel/Maske
  eine Wette. Gegen normalen/finalen falschen Tipp: Wettender +3/+5, Ziel −2/−3.
  Gegen richtigen Tipp: Wettender −2/−3, Ziel 0. Finalstatus wird im Bestand aus dem Tipp gelesen.
  Alle Beträge ×max(0, 1−0,15×max(0, Wettshow−Tippshow)), dann JS `Math.round` (auch negativ).
- Rangliste ausschließlich Gesamtpunkte; Masken/Wetten sind zusätzliche Anzeigen.
  Punkte bisher rein abgeleitet, nicht als Ledger gespeichert. Kein Revealtime gespeichert.
  `constants.ts` 10/5/2 ist für diese Berechnung nicht maßgeblich.
- IndexedDB-Vertrag unverändert: `MaskedSingerTipperDB`, Version 1, `appStateStore/mainState`;
  volle State-JSON-Exporte/Import und bestehende Legacy-Migration bleiben erhalten.
  Keine automatische Umschreibung alter Saves beim Laden.

## Modellvergleich und Empfehlung

| Modell | Debüt Vorrunde 4 | Früh/spät in derselben Chance | Hauptproblem |
|---|---:|---|---|
| Bestehendes CLASSIC | 14 (weitere Spieler 6) | meist nur Pionier/40% | globale Folgen benachteiligen späte Debüts; historische Mehrfachkandidaten |
| Nur maskenspezifischer Chancenindex | 20 | beide 20 | gute Robustheit, aber langes Abwarten innerhalb einer Chance wertneutral |
| Anteil verbleibender Zeit bis Enthüllung | abhängig vom Fenster | stark abgestuft | Revealzeit vorher unbekannt; Laufzeit/Voraufzeichnung/Pausen verzerren; späte Tipps fast wertlos |
| Empfohlener Hybrid | 20 | z.B. 20 vs 17 | kleiner kalibrierter Zeitfaktor; ehrliche manuelle Infoereignisse nötig |

Eigene Empfehlung, keine behauptete Senderregel: `tournament-v1` mit persönlicher Wertung,
letzter Identität und beobachtbaren maskenspezifischen Infoereignissen. Keine Turnier-/Platzierungstipps:
kein belegter Mehrwert gegenüber Identitätsraten, zusätzliche unbekannte TV-Dramaturgie.

Eine **Ratechance** ist der erste verfügbare Auftritt/Indizblock oder später ein wesentlich neuer
Informationsblock zur betreffenden Maske. Basti öffnet sie einmal für alle Spieler dieser Maske;
neue Shows und bloße Wiederholungen erhöhen den Index nicht automatisch. Bei mehreren echten
neuen Blöcken innerhalb einer Show sind weitere Chancen möglich. Kein Vorwarn-/Enthüllungsbutton
und kein spätes Sonderfenster. Eine Direktenthüllung ohne weiteren Auftritt braucht keine neue Chance.

Für Index `n` und Minuten `t` seit Öffnung der Chance:

```
B(n) = max(8, 20 − 4 × (n − 1))
L(t) = min(3, floor(t / 15))
Richtig, offen = B(n) − L(t) − C
Richtig, final = B(n) − L(t) + floor(6 × (B(n_final) − L(t_final)) / 20) − C
Falsch, offen = −2 − C
Falsch, final = −6 − C
Kein Tipp = 0
C = Anzahl tatsächlicher Identitätswechsel
```

Jeder Spieler bekommt seine eigenen Punkte; kein 40%-Abzug wegen eines anderen Spielers.
Der letzte Tipp zählt. Unbegrenzte offene Änderungen bis zur manuellen Enthüllung, −1 je Wechsel;
gleiche Namen (Trim/Kleinbuchstaben) kosten keinen Wechsel. A→B→A zählt zweimal und datiert A neu.
Unveränderte Identität behält ihre erste Zeit/Chance. Final wird dauerhaft gesperrt; sein Risiko-Bonus
verwendet den echten späteren Sperrzeitpunkt, niemals das frühere Entdeckungsdatum.
Tipphistorie/Wetten werden im Turnier nicht gelöscht. Kein gleichzeitiges Sammeln verschiedener Identitäten.

Beispiele ohne Gegenwetten/Wechsel: früh Chance 1:20, nach >=45 Minuten:17, sofort final:26,
spät final:22, erste neue richtige Identität Chance 2:16, Chance 3:12.
Ein früher richtiger Tipp bleibt auch bei späterer Finalteilnahme 20 wert: kein Ausschied-/Finalisten-Malus.
Spät final darf mehr bringen als früh offen: freiwilliges Risiko; früh final ist weiterhin wertvoller.
Myopischer Erwartungswert Chance 1: final `32p−6`, offen `22p−2`; final lohnt relativ ab `p>0,4`.
Die spätere Möglichkeit, offene Tipps noch zu ändern, besitzt zusätzlich Optionswert.
Abwarten kann mit neuen Informationen vernünftig sein (z.B. offenes EV früh bei p=0,6:11,2,
spät bei p=0,9:15,1); es bekommt geringere Trefferpunkte, keine moralische Sonderstrafe.
Die 15-Minuten-Stufen sind eine kleine Designkalibrierung, keine Erkennung konkreter TV-Indizien.
Beim Pausieren läuft die Uhr weiter, der Abschlag bleibt auf drei Punkte begrenzt.

Gegenwetten behalten Einsätze/Einmaligkeit; 15%-Abschlag nun nach Chancenindex-Differenz derselben
Maske statt globalen Folgen. Ziel-Tippindex und Finalstatus zum Wettzeitpunkt werden gespeichert.
Der alte gezielte Tipp entscheidet die Wette auch nach einem späteren Identitätswechsel.

## Audit, Versionen, Vergleich und konservativer Umstieg

Neue Seasons speichern explizit `classic-v1`; TOURNAMENT wird in Einstellungen vor dem ersten
Tipp gewählt. Alte fehlende Version bedeutet CLASSIC, unabhängig von Name/Jahr/Staffelnummer.
Neue Felder sind additive State-JSON-Felder; unbekannte Ruleset-Versionen/defekte Zeit- oder
Auditdaten werden ohne Überschreiben zurückgewiesen. Keine DB-Schemaänderung.

Manuelle Enthüllung im Turnier erzeugt **einmalig** `scoringAudit` (Schema 1): Ruleset, Zeit,
manuell eingegebene Identität, jeder Spieler mit +/-Komponenten, Tipp-/Wettpunkte, Ergebnis,
Treffer/Wettgewinne, Textgrund und vollständigem verwendeten Tipp-/Chance-/Wett-/Show-Snapshot.
Aktive Turnierpunkte stammen aus diesem gespeicherten Audit; Render/Reload buchen nichts erneut.
Neue CLASSIC-Enthüllungen speichern ebenfalls einen Snapshot. CLASSIC bleibt dynamisch nach
seiner alten Formel; das UI erklärt die aktuelle Berechnung, alte fehlende Revealzeiten bleiben unbekannt.

`?rulesetDebug=1` aktiviert einen **Feature-Switch**, keine behauptete Authentifizierung.
Vergleich auf denselben gespeicherten Tipps/Enthüllungen, ausschließlich lesend. CLASSIC-Formel
kann im Turnier auf mehr als drei Events treffen; das ist eine Formelsimulation, kein Replay der
alten Eingabebeschränkungen. Fehlende alte Rate-/Sperrzeiten: `UNKNOWN`, keine Scheingenauigkeit.

Für laufendes S13: freiwillige **Turnier-Testkopie** im Debug-Menü der Staffeleinstellungen.
Original und ID bleiben erhalten; Kopie hat neue ID. Bereits enthüllte Masken bekommen eingefrorene
CLASSIC-Abrechnungen mit exakt bisherigen Punkten (fehlende alte Enthüllungszeit bleibt 0/UNKNOWN).
Offene Tipps/Gegenwetten werden in der Kopie als Legacy-Archiv behalten; keine alten Zeit-/Finalboni
erfunden. Pro offener Maske sind bekannte vergangene Ratechancen einmalig ausdrücklich anzugeben:
0 bei Debüt, z.B. 1 nach einer bisherigen Infochance. Danach beim tatsächlichen neuen Infoereignis
Ratechance öffnen und alten Tipp per Button als **neuen** offenen/finalen Tipp bestätigen oder neu tippen.
Dieser sichtbare Neubeginn der noch offenen Masken ist eine konservative neue Spielepoche, keine
exakte rückwirkende Bewertung alter Tipps. Alte offene Gegenwetten werden in der Kopie nicht fortgeführt;
Archiv und Original bleiben vollständig, neue Wetten sind möglich. Halbfinal-/Finalchronologie wird
nicht geraten. Zurückgehen jederzeit durch Öffnen des unveränderten CLASSIC-Originals; zuvor Export sichern.
Keine automatische Umstellung, keine Erstellung einer Kopie mit Bastis echten Daten in diesem Lauf.

## Prüfung

Typecheck, Build, 56 Unit-/Storage-/Scoring-Tests; isolierte Browserprüfungen für Mobile 390 px,
iPad-Abmessungen 1024×1366, langen Dialog bei 390×660, gespeicherte Abrechnung/Debug ohne Writes,
Export/Import/Reload, alte Saves und freiwillige Kopie. Bestehende 13 Bild-/Classic-Browserregressionen
einschließlich 106 Kostümen/vier Porträts erhalten. Kein realer Safari/iPad-Hardwaretest.
Prüfergebnisse/Screenshots unter `artifacts/ruleset-018*` (nicht in Git/Hosting).
Keine neuen Abhängigkeiten, Services oder laufenden Kosten. Main/Production bleiben beim Basis-SHA.
