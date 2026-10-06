# Promi-Bilder: erster Zwischenstand, 06.10.2026

Auftrag: `JH-MASKED-IMAGES-MVP-20261006-010`, Version 1. Isolierter Branch `feature/promi-images-mvp`, Ausgangspunkt `8a4dccb13b64610efd529ab47a69c0ffcdb26ba0`. Dieser Batch ist der beauftragte Zwischenstopp, nicht der vollständige Bilder-MVP.

## Ergebnis und Coverage

- Vier lokale Commons-Fotos, insgesamt 76.732 Byte, maximal 512 px, WebP. Keine Hotlinks, keine API zur Laufzeit und keine neue App-Abhängigkeit.
- Bekannte Personen: **4/125 unterschiedliche Katalognamen**; Teilnahmezeilen mit bekannten Personen: **4/126**. Masken: **0/127 Staffel-/Maskenschlüssel**.
- Staffel 13 laut unverändertem Katalog: **4/4 bekannte Personen**, **0/12 Masken**. Acht noch unbekannte Identitäten bleiben ohne Foto. Das ist der Katalogstand vom 30.09.2026, kein Live-Datenstand.
- Isabel Edvardsson, Ben Zucker, Stefan Mross und Prince Damien sind bebildert. Alle anderen Personen sind noch nicht in diesem Batch bearbeitet; die vollständige Lückenliste steht in `data/promi-image-gaps.json`.
- Bildnachweise stehen beim Foto: Urheberlink, Lizenzlink und Originalquelle. WebP-Dateien stehen jeweils unter der im Manifest angegebenen CC-BY-SA-Lizenz. Größen-/Formatänderung ist auch im UI erklärt. Bilddarstellung ohne zusätzlichen Ausschnitt.
- Fehlende, defekte oder unvollständig belegte Assets erhalten einen Platzhalter. Unbekannte Personen können durch das Manifest nicht versehentlich bebildert werden.

## Quellen und Rechte

Jeder eingebundene Manifest-Eintrag enthält Originaldateiseite, Urheber, Lizenzname/-URL, Beschreibung, Prüfdatum, Downloadquelle, Commons-SHA1 sowie lokale SHA256/Größe/Abmessungen. `FILE_LICENSE_REVIEWED` bezeichnet die auf der Commons-Dateiseite geprüfte Urheberlizenz; es ist keine pauschale Aussage über Persönlichkeitsrechte oder eine Garantie für beliebige Nutzungszwecke.

Die Dateibeschreibungen identifizieren jeweils die abgebildete Person; alle vier lokalen Bilder und ihre Darstellung wurden zusätzlich visuell geprüft. Ben Zuckers Foto nennt Olaf Kosinsky einschließlich gefordertem Homepage-Link. Keine E-Mail an Fotografen gesendet; die Bitte um URL-Mitteilung auf der Quelldateiseite ist separat von der CC-Lizenz zu lesen. Keine Endorsement-Aussage.

Primäre Maskenkandidaten: [Joyn, Staffel-13-Maskenübersicht](https://www.joyn.de/bts/serien/the-masked-singer/2026-alle-masken-im-ueberblick-inklusive-folge4-166735). Diese Webseite enthält Senderbilder/Credits, aber eine Quellenangabe allein belegt keine Wiederverwendungslizenz. Kein Maskenfoto heruntergeladen oder hotverlinkt.

[Seven.One-Presselounge-AGB](https://presse.prosiebensat1.com/service/agb), insbesondere 4.2–4.4, haben Anforderungen an Berechtigte, redaktionelle Nutzung, IPTC-Nennung, Bearbeitung, Weitergabe und Lizenzzeit. Die [Joyn-AGB 2026](https://static.joyn.de/Joyn_AGB_2026.pdf), Abschnitt 2.7, gewähren normale private Dienstnutzung; sie wurden nicht als Freigabe zum Rehosting von BTS-Standbildern interpretiert. Der genaue Anwendungsbereich der Pressebedingungen auf einzelne BTS-Assets ist nicht abschließend geklärt. Für den dauerhaft gehosteten Tipper ist keine passende Erlaubnis festgestellt. Status deshalb **RIGHTS_UNRESOLVED**, keine Behauptung einer verifizierten Maskenlizenz oder eines generellen rechtlichen Verbots. Ältere 115 Maskenschlüssel sind im ersten Batch nicht einzeln recherchiert.

## Datenstand: separate Folgemaßnahme

Die [offizielle Enthüllungsübersicht nach Folge 3](https://www.joyn.de/bts/serien/the-masked-singer/the-masked-singer2026-alle-enthuellungen-nach-folge3-190242) nennt zusätzlich Evelyn Burdecki / Cosma und Mathias Mester / Luigi Eishörnchen. Beide sind im beauftragten Katalog noch unbekannt. Der Bilderauftrag erhält sämtliche Kataloginhalte und Schlüssel unverändert; daher weder Identitäten ergänzt noch zusätzliche Personenfotos in diese Null-Schlüssel geschrieben. Eine freigegebene separate Katalogaktualisierung ist nötig, wenn vor der nächsten Sendung der Live-Stand abgebildet werden soll. Keine vollständige aktuelle Staffelprüfung behauptet.

## Reproduktion und Tests

```powershell
python scripts/fetch-catalog-images.py data/image-batches/season13.json
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Der Entwicklungs-Downloader benötigt Python/Pillow und Netzwerkzugriff; die Anwendung braucht beides nicht. Er lädt ausschließlich explizit geprüfte Zuordnungen, kontrolliert die konkrete Lizenz nochmals und ändert das bestehende Manifest erst nach erfolgreichem Download des gesamten Batches. Keine automatische Veröffentlichungsentscheidung aus Suchtreffern.

Typecheck, 28 Katalog-/Persistenztests und Build bestanden. Fünf Browserprüfungen mit frischen Chromium-Kontexten bestanden: echte Bilddekodierung, Credits/Unbekannte/Suche, absichtlich blockiertes Bild plus Wiederherstellung, synthetischer Import/Export mit tiefer Gleichheit, Home/Game/beide Settings-Ansichten, Final-Tipp-Persistenz und Reload, ungültiger Import, mobile und Desktop-Ansicht. Im neuen und bereits befüllten synthetischen Spielstand erzeugt Katalognutzung keine IndexedDB-`put`-Aufrufe. Keine realen Nutzerprofile oder privaten Backups im Bildtest verwendet. Kein realer iPad/Safari-Test in diesem Run.

`tests/browser-images.mjs` nutzt ein vorhandenes Playwright-Paket und einen isolierten lokalen CDP-Browser. `JARVIS_PLAYWRIGHT_PACKAGE` kann auf dessen vorhandene Installation zeigen. Aufruf: `node tests/browser-images.mjs <local-cdp-url> <artifact-directory> [local-base-url]`.

Katalog-Arbeitskopie gegenüber dem Run-Start unverändert; Git normalisiert deren CRLF-Zeilenenden, und der normalisierte Inhalt entspricht exakt dem Ausgangscommit. Spiel-/Punkte-/Persistenzcode und Datenbankschema unverändert. Prüfartefakte/Screenshots liegen außerhalb des Repositories unter `../../_workshop/masked-images-20261006/`. Arbeitskopie-SHA256: `638c6e738cfd019f57e52406ecc489c6fe80f0da69ea1412583c2381336ae047`; Git speichert dieselbe Katalogdatei mit LF. Die älteren Hashangaben in `WORKSHOP.md` beziehen sich auf diese LF-Fassung.

## Nächster Schritt

Preview visuell abnehmen. Dann weitere geprüfte Commons-Porträts in Batches ergänzen; zuerst Staffel 12/11, dann ältere Staffeln. Maskenrechte anhand konkreter Erlaubnis/geeigneter Lizenz klären; bis dahin Platzhalter. Separates Katalogupdate für nachträglich enthüllte Personen beauftragen. Kein Merge oder Production-Release durch diesen Auftrag.
