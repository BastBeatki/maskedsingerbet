# Lokale S13-Vorschau (Aufträge 022–024)

LAN-Adresse beim Abschluss: **http://192.168.178.20:4317/**.
Die öffentliche Version https://maskedsingerbet.vercel.app/ bleibt unverändert.
Kein Push, main-Merge oder Deployment.

## Öffnen und aktivieren

1. Im selben Heimnetz die LAN-Adresse öffnen/refreshen. Der PC muss eingeschaltet bleiben.
2. Den reparierten Show3-Export über **Import** öffnen, falls noch kein lokaler Stand besteht.
   Ausgangsstand Staffel2026: BastBeat35, Schütti17, Schum0. Vor Umstieg exportieren.
3. **Einstellungen → Staffel-13-Wertung → Wertungsvorschau berechnen**.
   Ohne Eingabefelder erscheint **35/17/0 → 41/21/0**.
4. **S13-Wertung in dieser Staffel aktivieren** und bestätigen.
   Bei bereits nach021 aktivierten Saves heißt der Knopf **S13-Automatik einschalten**;
   bestehende Abrechnungen bleiben identisch. Keine versteckte Migration beim Laden.
5. Zur Staffel zurückkehren. **S13-Automatik aktiv** bestätigt den Modus.
   Gewünschte tatsächliche Show wie bisher auswählen/anlegen. Die ursprüngliche Auswahl
   Show2 wird beim Umstieg nicht heimlich geändert.

## Spielen ohne Auftrittslisten

Die versionierte Zuordnung `s13-2026-v1` gilt nur für die ausdrücklich aktivierte Staffel:

| Debüt | Masken |
| --- | --- |
| Show1 | Bubble, Emily Wau, Professor Dr. Dr. Schweinstein, Momo |
| Show2 | Erdbär, MR. MIC, Hippo Jones, Perla |
| Show3 | Cosma, P.S, Yeti Cat, Luigi Eishörnchen |
| Show4 | Wild Thing, Three Sixty, Groovy, Fernando El Toro |

Bestätigte Formatdaten: Handoff022 vom07.10.2026. Die Namen ordnen beim Aktivieren
oder normalen Anlegen einer bekannten neuen Maske deren stabile Masken-ID zu.
Eine spätere Umbenennung ändert diese Zuordnung nicht. Fehlende Masken wie bisher
vor der Sendung anlegen; historische Daten/Bilder werden nicht ergänzt oder überschrieben.
**Keine Auftrittsnummern eingeben.**

Vorrunden: je vier Debüts, zwei Enthüllungen. Ab Show5 treten alle dann noch offenen
Masken zum zweiten Mal auf (Basis18). Ab Show6 bleiben alle nach Show5 nicht enthüllten
Masken übrig (Basis16). Keine vorab festgelegte Finalistenanzahl. Debüt/Vor-Debüt20,
mehrere Songs innerhalb einer Show zählen einmal. Tipps behalten echte Show/Zeit;
Slots, Final, Pionieranteile und Gegenwetten bleiben unverändert.

## Nur bei einer Formatabweichung

**Erweitert / Auftritte korrigieren** bleibt eingeklappt. Erkennbare abweichende
Vorrundenbesetzung, unbekannte Masken oder Shows außerhalb des Formats erzeugen
Hinweise und blockieren neue Tipps/Abrechnungen bis zur Prüfung. Erst Daten berichtigen;
bei tatsächlich geänderter Besetzung ausdrücklich **Abweichende Besetzung nach Prüfung
bestätigen**. Eine ausgesetzte TV-Show kann die App nicht selbst beobachten:
Dann die tatsächliche Showfolge der betroffenen offenen Maske korrigieren. Die normale
Folge entfernt ihre Ausnahme wieder. Nur abweichende Masken erhalten Overrides;
alle anderen bleiben automatisch. Abgerechnete Masken/Ergebnisse sind geschützt.

## Server starten

Im Projektordner in PowerShell:

```powershell
npm.cmd run build
npm.cmd run preview -- --host 0.0.0.0 --port 4317 --strictPort
```

Die `Network`-Adresse verwenden; IP kann sich ändern. Der vorhandene Hintergrundserver
bleibt beim Abschluss laufen. Nur `dist` wird ausgeliefert; Backups und Testkopien liegen
außerhalb. Kein Tunnel, keine Router-/Firewall-Änderung, keine neue Cloud-API oder Kosten.

## Spielstände und Grenzen

Jedes Gerät/jede Browser-Adresse besitzt einen eigenen IndexedDB-Spielstand. LAN liefert
die App, keine automatische Synchronisierung. Gleichen Stand per Export/Import übertragen
oder ein Gerät als führenden Spielstand verwenden. localhost/LAN-IP/Vercel sind getrennte
Ursprünge. Aktivierte neue Exporte nicht in die alte Production importieren; dort nur den
behaltenen CLASSIC-Export verwenden. Lokal Rückkehr über den ursprünglichen Export.
Nach019 konservativ erhaltene CLASSIC-Ledger werden beim Einschalten der Automatik nicht
umgewertet; für einheitliche historische41/21/0 mit dem unaktivierten reparierten Export starten.

Tailwind/Fonts/externe Bilder benötigen Internet. Chromium-Handy/iPad-Abmessungen und
LAN-Abruf am PC wurden geprüft; keine reale iPad/Safari-/WLAN-Hardwareabnahme behauptet.
Private Testkopien: `_workshop/masked-singer-022`, außerhalb Git und Hosting.

## Ruhigere Staffelansicht (Auftrag 023)

In der S13-Automatik bleiben alle Masken sichtbar, dauerhaft nach Debütshow1–4 gruppiert.
Die aktive Show ist nur dezent mit „Aktiv“ markiert und bestimmt weiterhin die Eingabe.
Geschlossene Vorrundengruppen mit vier Masken/zwei Enthüllungen liefern für verbleibende
Masken den Badge „Halbfinale“, auch wenn eine ältere Show ausgewählt ist. Momo ist im
aktuellen Stand Halbfinalist. Abgerechnete Masken zeigen „Enthüllt“; „Finale“ erscheint
frühestens bei tatsächlichem Fortschritt bisShow6. Kein neuer TV-/Punkte-Zustand wird gespeichert.

Der reparierte Export enthält zwölf Masken. Show4 zeigt zusätzlich vier klar bezeichnete,
noch nicht angelegte Plätze. Anzeigen schreibt keine Rohmasken. „Maske anlegen“ nutzt
ausschließlich die vorhandene explizite Anlagefunktion; vorhandene16-Masken-Saves zeigen
sofort vier echte Karten pro Gruppe. Keine Duplikate oder automatische Showfilterung.

„Punkte erklären“ öffnet die Abrechnung unabhängig pro enthüllter Maske. Initial und nach
Reload geschlossen. Je Spieler zuerst eine kurze deterministische Alltagserklärung aus
bereits berechneten Komponenten/Engine-Erklärung, dann unveränderte Detailmathematik.
Spieler-Maskenpunkte bleiben außen sichtbar. Auf-/Zuklappen verändert weder Save noch Ledger;
keine KI/API und keine neue Persistenz. Originaldaten,41/21/0 und öffentliche Version bleiben.

## Promi-Check direkt im Spiel (Auftrag 024)

Der globale **Promi-Check** öffnet den vorhandenen Katalog innerhalb der Staffel:
auf dem Handy als Bottom-Sheet, auf größeren Bildschirmen als Dialog. **Promi prüfen**
am Tipp übernimmt den eingegebenen Namen; ein leeres Feld öffnet die fokussierte Suche.
Im Spiel wird erst mit **Suchen** oder Enter gesucht, nicht bei jedem Buchstaben.
Schließen/Escape erhält Tippentwurf, Final-Markierung, Spielstand und Scrollposition.
Der Katalog auf der Startseite bleibt erreichbar und nutzt dieselbe Suchfunktion.

Treffer zeigen zuerst Prominame/Bild und „Bereits dabei“ mit Staffel und Maske.
**Als Tipp übernehmen** zeigt einen Hinweis auf frühere Teilnahme, blockiert aber nicht.
Kein Treffer ist nur ein fehlender Katalogtreffer, kein Beweis einer Nichtteilnahme.
Vorhandene Bilder und Quellen-/Lizenzlinks werden unverändert verwendet; keine erfundenen
Personen-Links oder neue Datenbank. Teilnamen, vertauschte Namen, Interpunktion,
Diakritika, Masken und Staffeln sind suchbar; die Suche ist toleranter als die Wertung.

Nur neu gespeicherte Tipps erhalten additive Metadaten `catalog-names-v1`.
Der Originaltext bleibt erhalten. Sichere Normalisierung und eindeutige sehr nahe
Schreibvarianten können zählen; volle Namen, höchstens eine Änderung in einem langen
Namensbestandteil und kein weiterer plausibler Kandidat sind für fuzzy Wertung nötig.
Namensbasis: vorhandener Katalog plus bekannte Enthüllungen. Keine erfundene Aliasliste.
Mehrdeutige Fälle bekommen einen Prüfhinweis und keine automatische fuzzy Zuordnung.
Bei späterer Enthüllung wird die Eindeutigkeit erneut geprüft; neu bekannt gewordene
Konkurrenten dürfen keine falschen Punkte erzeugen. Die Anzeige macht Zuordnungen sichtbar.

Historische Tipps ohne diese Metadaten behalten ihre bisherige Trim/Kleinschreibung-
Wertung. Bestehende Punkte/Ledger werden nicht migriert oder still neu interpretiert.
Import/Export/Reload erhält Text und Metadaten; der reparierte S13-Test bleibt41/21/0.
Kein Push/Deployment, keine Cloud-Synchronisierung. Diese gehört erst in Auftrag025.
