# Maskenbilder: Zwischenstand 06.10.2026

Auftrag `JH-MASKED-IMAGES-MVP-20261006-014`, Version 3, auf `feature/promi-images-mvp`, ausgehend von `3946b8240f750ac7e6c1b922791f2873ad9846ee`. Alle elf offenen Kostümbilder in Staffel 1/2 sind ergänzt; Staffel 3 bleibt vollständig erhalten. Anschließend wurden die zehn Kostümbilder für Staffel 4 ergänzt. Insgesamt 21 neue externe Referenzen in diesem Batch.

## Coverage

| Bereich | Kostümbilder | Status |
| --- | --- | --- |
| Staffel 1 | 10/10 | TEMPORARY_REMOTE / RIGHTS_UNRESOLVED |
| Staffel 2 | 10/10 | TEMPORARY_REMOTE / RIGHTS_UNRESOLVED |
| Staffel 3 | 10/10 | TEMPORARY_REMOTE / RIGHTS_UNRESOLVED; beide Erdmännchen-Teilnahmen teilen ein Asset |
| Staffel 4 | 10/10 | TEMPORARY_REMOTE / RIGHTS_UNRESOLVED |
| Staffel 13 | 12/12 bedingt | USER_GAMESTATE / RIGHTS_UNRESOLVED, nur aus eindeutig passendem lokalem Spielstand |
| Öffentliches Manifest | 40/127 | 40 externe, null LOCAL_VERIFIED Masken; 87 ohne öffentliches Asset |
| Mit passendem vorhandenem Spielstand | 52/127 | 40 externe + zwölf Nutzerbilder; 75 verbleibende Bildlücken |

Porträts separat: vier LOCAL_VERIFIED Commons-WebPs mit FILE_LICENSE_REVIEWED, insgesamt 76.732 Byte, unverändert. Isabel Edvardsson, Ben Zucker, Stefan Mross und Prince Damien: 4/125 bekannte Personen und 4/126 bekannte Teilnahmezeilen. Quellen, Autoren, Lizenzen und Datei-Hashes im Manifest. Geprüfte CC-BY-SA-Dateilizenzen garantieren keine beliebige Nutzung oder Persönlichkeitsrechte. Acht unbekannte Identitäten bleiben ohne Porträt. Katalogstand 30.09.2026 unverändert.

Die zwölf Nutzerbilder zählen nicht zur öffentlichen Coverage. Eine frische Preview zeigt ohne passenden eigenen Spielstand 40 Kostümbilder. Production-Spielstände sind auf anderen Preview-Domains nicht automatisch verfügbar. Kein privater Export oder privates Bild wurde in Git oder eine gehostete Preview kopiert.

## Neue Quellen und offene Rechte

Staffel 1: Grashüpfer, Panther, Eichhörnchen und Oktopus aus der [Nau-Übersicht](https://www.nau.ch/people/tv-serien/the-masked-singer-promis-masken-65867873), Credits ProSieben/Boris Breuer; Schmetterling aus der [24rhein-Galerie](https://www.24rhein.de/unterhaltung/foto-story-the-masked-singer-stars-faultier-wuschel-monster-alien-zr-90111019.html), Credit Henning Kaiser / dpa / Picture Alliance. Vollständig maskierte Kostüme; keine verbleibende Bildlücke in Staffel 1.

Staffel 2: Chamäleon, Dalmatiner, Drache, Göttin, Hase und Roboter aus dem [öffentlichen connect-living-Kostümartikel](https://www.connect-living.de/ratgeber/the-masked-singer-2020-kostueme-3201346.html). Chamäleon: ProSieben/Jens Hartmann; übrige fünf: ProSieben/Willi Weber. Vollständig maskierte Pressebilder mit vorhandenen Credits im Originalbild. Keine verbleibende Bildlücke in Staffel 2.

Staffel 4: Dinosaurier, Leopard, Flamingo, Schildkröte, Monstronaut, Stier, Küken, Quokka, Einhorn und Schwein aus derselben Nau-Übersicht, Credits ProSieben/Willi Weber. Zehn vollständige Kostüme, keine demaskierten Galerie-Nachbarbilder.

Quellen und jeweilige Impressums-/Bedingungsseiten wurden geprüft. Keine Wiederverwendungslizenz oder ausdrückliche Einbettungsfreigabe festgestellt; auf diesen geprüften Seiten wurde keine konkrete Einbettungsuntersagung gefunden. Dies ist keine rechtliche Freigabe. Alle 40 externen Masken sowie zwölf bedingte Nutzerbilder bleiben RIGHTS_UNRESOLVED. Credits sind keine Lizenz. URLs, individuelle Quellen, Autoren und Bedingungen stehen im vorhandenen Manifest; keine konkurrierende Bilddatenbank.

Die 19 bisherigen Joyn/BTS-Referenzen bleiben unverändert. Zehn Quellbilder nennen lediglich „© no source“; dafür wird kein fremder Credit erfunden. Joyn-AGB und Presselounge-Bedingungen sind keine App-Bildlizenz. Senderlayout, Bühnenbilder und teils mehrmegabytegroße Dateien bleiben unveränderte externe Referenzen. Alle Bilder werden verzögert mit object-contain geladen, ohne Referer. Verfügbarkeit und Ladezeiten können schwanken; defekte Bilder fallen auf Platzhalter zurück.

Ausgeschlossen: demaskierte Bilder, ausdrücklich abgelaufene zeitliche Bildfreigaben sowie Quellen mit ausdrücklichen Einschränkungen der Weiterverwendung (unter anderem t-online, Watson und kino.de). Bei regulär mit HTTP 403 antwortenden Quellen wurde kein Schutz umgangen. Kein Presse-Login, Videoextraktion, Referer-Spoofing oder Rehosting zur Umgehung solcher Einschränkungen.

## Nutzerbilder und nächste Schritte

USER_GAMESTATE-Reuse bleibt rein lesend erhalten: genau eine passende Staffel `Staffel 2026` oder `Staffel 13` mit mindestens acht unterschiedlichen passenden Maskennamen, PNG/JPEG/WebP eingebettet. Mehrdeutige Staffeln oder Masken werden nicht geraten. Normalisierung von Punkten, Leerzeichen und Großschreibung dient nur der Zuordnung; gespeicherte Namen und Katalogschlüssel bleiben unverändert. Keine neue Persistenz, kein Upload. Basti bestätigte laut aktuellem Handoff bereits real 12/12 Staffel-13-Bilder; dieser Run wiederholt keinen privaten Import.

Nächster chronologischer Batch: Staffel 5, danach Staffel 6. Staffel 12 später zuerst im vorhandenen `Staffel 2025`-Export rein lesend prüfen. Dieser Export wurde hier nicht neu zugeordnet oder als zusätzliche Coverage gezählt. Vollständige Lückenliste in `data/promi-image-gaps.json`. Basti pflegt aktuelle Masken, Enthüllungen und Spielstand selbst; keine externen Identitäten oder Enthüllungen übernommen.

## Verifikation und Grenzen

Typecheck, 31 Tests, Build und neun isolierte Chromium-Browserprüfungen bestanden. Alle 40 externen Masken und vier lokalen Porträts dekodieren. Ausfall aller externen Bilder in Staffel 1–4 sowie eines lokalen Porträts erzeugt Platzhalter. Mobile 390 px und Desktop 1440 px ohne horizontalen Überlauf oder erfasste App-Fehler. Beide Erdmännchen-Teilnahmen teilen dasselbe Asset.

Frische Testkontexte mit synthetischen Spielständen prüfen zwölf eingebettete Bilder, Aliaszuordnung, unbekannte Identitäten, Suche/Filter/Navigation, exakt gleichen Import/Export, Reload, Home/Game/beide Settings, Final-Tipp-Persistenz und ungültigen Import. Katalognutzung erzeugt keine IndexedDB-Schreibzugriffe. Kein echter iPad-/Safari-Test. Der Resolver akzeptiert zusätzliche Publisher-Pfade nur für exakte geprüfte Manifest-URLs; manipulierte URLs, Credentials und unbekannte Dateien werden zurückgewiesen.

Katalogdaten, Punkte, Tipps, Speicherlogik/-schema, Import/Export, Enthüllungslogik und private Exporte bleiben unverändert. Main und Production bleiben unangetastet. Finaler Commit, Preview und unabhängiger Rückbericht-Readback stehen im festen Airtable-Rückkanal. Die separate C:-Speicher-Sidequest wurde nicht bearbeitet.
