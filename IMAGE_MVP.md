# Maskenbilder: Zwischenstand 06.10.2026

Aktueller Auftrag: `JH-MASKED-IMAGES-MVP-20261006-012`, Version 1. Branch `feature/promi-images-mvp`, Fortsetzung des Vier-Porträt-Batches `dddf806`. Dieser geprüfte Zwischenstand ist noch kein vollständiger Staffel-1–3-MVP. Maskenbilder haben Vorrang; keine weiteren Porträts in diesem Batch.

## Coverage

| Bereich | Kostümbilder | Status |
| --- | --- | --- |
| Staffel 1 | 5/10 | Astronaut, Engel, Kudu, Monster, Kakadu: TEMPORARY_REMOTE / RIGHTS_UNRESOLVED |
| Staffel 2 | 0/10 | Folgebatch |
| Staffel 3 | 0/10 | Folgebatch; 11 Teilnahmezeilen teilen 10 Maskenschlüssel |
| Staffel 13 | 12/12 bedingt | USER_GAMESTATE / RIGHTS_UNRESOLVED: aus eindeutig passendem lokalem Spielstand |
| Manifest insgesamt | 5/127 | Keine lokal lizenzgeprüften Masken; 122 ohne öffentliches Asset |
| Mit vorhandenem passenden Spielstand | 17/127 | 5 remote + 12 bestehende Nutzerbilder; 110 verbleibende Bildlücken |

Porträts separat: **4/125 unterschiedliche bekannte Personen**, 4/126 bekannte Teilnahmezeilen. Isabel Edvardsson, Ben Zucker, Stefan Mross und Prince Damien bleiben als lokale Commons-WebPs erhalten (`LOCAL_VERIFIED`, `FILE_LICENSE_REVIEWED`; 76.732 Byte). Quellen, Autoren, Lizenzlinks und Datei-Hashes im Manifest; dateiseitig geprüfte CC-BY-SA-Lizenzen sind keine pauschale Garantie für Persönlichkeitsrechte oder beliebige Nutzung. Acht unbekannte Identitäten bleiben ohne Porträt. Katalogstand 30.09.2026 unverändert.

Die zwölf Nutzerbilder zählen nicht zur allgemeinen öffentlichen Coverage. Eine frische Preview hat ohne eigenen passenden Spielstand nur fünf Kostümbilder. Browser-Spielstände der Production-Domain sind auf einer Preview-Domain nicht automatisch verfügbar. Kein privater Export wurde in eine gehostete Preview importiert.

## Vorhandene Staffel-13-Bilder

Der vorhandene lokale Nutzerexport enthält zwölf eingebettete PNG/JPEG/WebP-Kostümbilder in `Staffel 2026`. Alle wurden visuell geprüft; eine separate lesende Prüfung bestätigte zwölf Zuordnungen und unveränderten Datei-/Objektinhalt.

`App.tsx` reicht nur vorhandene Staffeln als lesende Props an den Promi-Check weiter. Die Anzeige akzeptiert genau eine Staffel namens `Staffel 2026` oder `Staffel 13` mit mindestens acht unterschiedlichen passenden Maskennamen. Bei mehrdeutigen Staffeln oder Maskennamen wird nicht geraten. Großschreibung, Leerzeichen und Punkte werden nur für die Zuordnung normalisiert (`MR. MIC` / `Mr. Mic`, `P.S` / `P.S.`). Gespeicherte Namen und Katalogschlüssel bleiben unverändert. Nur eingebettete PNG/JPEG/WebP-Bilder, keine SVGs oder externen Nutzer-URLs. Keine Bildkopie im Manifest, kein neuer Speicher, kein Upload.

## Quellen und offene Rechte

Die fünf URLs stammen aus öffentlichen Joyn/BTS-Senderseiten: [Astronaut](https://www.joyn.de/bts/serien/the-masked-singer/news/the-masked-singer-der-astronaut-liefert-ein-weiteres-indiz-5483), [Engel](https://www.joyn.de/bts/serien/the-masked-singer/news/the-masked-singer-der-engel-verrat-ein-neues-indiz-5481), [Kudu](https://www.joyn.de/bts/serien/the-masked-singer/the-masked-singer-steckt-daniel-aminati-hinter-dem-kudu-5538), [Monster](https://www.joyn.de/bts/serien/the-masked-singer/news/the-masked-singer-deutschland-ein-neues-indiz-zum-monster-5215), [Kakadu](https://www.joyn.de/bts/serien/the-masked-singer/the-masked-singer-deutschland-neues-indiz-zum-kakadu-5540). Credits laut Quellseiten: ProSieben / Boris Breuer. Astronaut und Kakadu zeigen nähere Ansichten; Engel/Kudu/Monster zeigen Ganzkörper im vorhandenen Senderlayout. Die referenzierten Dateien bleiben unverändert, Anzeige mit object-contain, kein Ausschnitt.

Keine Wiederverwendungslizenz festgestellt. [Joyn-AGB 2026](https://static.joyn.de/Joyn_AGB_2026.pdf) sind als Bedingungen verlinkt, ausdrücklich nicht als Bildlizenz. Sie regeln insbesondere Streaminginhalte und private Dienstnutzung. Der genaue Anwendungsbereich der [Presselounge-AGB](https://presse.prosiebensat1.com/service/agb) auf öffentliche BTS-Standbilder bleibt offen; sie sind keine App-Freigabe. Die Einbindung folgt der beauftragten temporären Strategie mit offenem Rechtestatus und ist keine rechtliche Freigabe. Keine geschützte Presseanmeldung, Videoextraktion, Referer-Spoofing oder andere Schutzumgehung. Requests senden keinen Referer. Verfügbarkeit und spätere Bedingungen können sich ändern.

TEMPORARY_REMOTE und RIGHTS_UNRESOLVED stehen sichtbar neben externen Bildern; Nutzerbilder erhalten ebenfalls keinen erfundenen Lizenzstatus. Fehlerhafte URLs führen zu Platzhaltern und blockieren keine Karte oder App.

## Lücken und Folgebatch

Staffel 1: **Grashüpfer, Panther, Eichhörnchen, Schmetterling, Oktopus**. Geprüfte individuelle Sender-Hero-Bilder zeigen bereits demaskierte Menschen und wurden deshalb nicht als Kostümbilder eingebunden. Keine Aussage, dass geeignete Bilder nicht existieren. Staffel 2–3 sind noch nicht einzeln bebildert. Die geprüfte Staffel-3-Übersicht enthält ein Gruppenbild statt einzeln zuordenbarer Assets. Vollständige Lückenliste: `data/promi-image-gaps.json`.

Nächster Batch: fünf Staffel-1-Lücken kurz nachrecherchieren, danach zügig Masken von Staffel 2–3 bearbeiten und schwierige Fälle dokumentieren. Porträts bleiben sekundär. Basti pflegt aktuelle Masken und Enthüllungen selbst in der App; keine externe Katalog-/Spielstandaktualisierung empfohlen oder ausgeführt.

## Verifikation

Typecheck, **30 Tests**, Build und **sieben Browserprüfungen** bestanden. Fünf echte externe Masken und vier lokale Porträts dekodieren. Simulierter Ausfall aller Senderbilder sowie eines lokalen Porträts erzeugt Platzhalter. Mobile 390 px und Desktop 1440 px ohne horizontalen Überlauf oder App-Fehler.

Browserprüfungen verwenden frische Kontexte und synthetische Spielstände: zwölf eingebettete Testbilder, Aliaszuordnung, acht unbekannte Identitäten, Suche/Filter/Navigation, exakt gleicher Import/Export, Reload, Home/Game/beide Settings, Final-Tipp-Persistenz und ungültiger Import. Katalognutzung erzeugt keine IndexedDB-Schreibzugriffe. Der echte Nutzerexport wurde separat ausschließlich lesend geprüft, nicht in Browsertests importiert. Kein realer iPad/Safari-Test.

Keine Änderungen an Katalogdaten, Punkten, Tipps, Speicherlogik/-schema, Import/Export, Enthüllungslogik oder privatem Export. Einzige App-Verdrahtung außerhalb des Bildrenderers: lesende seasons-Prop. Preview und finaler Commit werden im festen Airtable-Rückkanal dokumentiert; main/Production bleiben unangetastet.
