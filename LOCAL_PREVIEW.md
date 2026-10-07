# Lokale S13-Automatik (Auftrag 022)

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
