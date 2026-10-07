# ThoughtAnchor

[Alle Sprachen](../README.md) · [Windows / Android herunterladen](https://github.com/kkaede4444/ThoughtAnchor/releases/latest)

ThoughtAnchor ist eine lokal arbeitende Gedankenwand für Windows und Android. Halte Fragmente fest, ordne Karten, zeichne, verbinde wiederverwendbare Gruppen und füge Originaltexte zu einem Artikel zusammen. Warmes Papier, Aquarell und Serifenschrift bleiben auf allen Geräten gleich.

Ich habe ThoughtAnchor begonnen, damit ich selbst und Menschen mit ADHS verstreute Gedanken mit weniger Aufwand ordnen können. Eine Idee zuerst festhalten und später verbinden, wenn die Kraft dafür da ist. Das Ziel ist, beim Ordnen weniger Geduld zu verbrauchen, mehr Aufmerksamkeit für die Gedanken zu behalten und leichter in einen Flow zu finden. Erst sammeln, eigene Worte wiederverwenden und Schritte zurücknehmen – im eigenen Tempo.

Das Projekt wurde **vollständig von Codex erstellt**, nach den Anforderungen und der Produktidee des Betreuers: Implementierung, Oberfläche, Tests, Dokumentation und Paketierung. Drittanbieterkomponenten behalten ihre jeweiligen Lizenzen. Die [MIT-Lizenz](../../LICENSE) erlaubt Nutzung, Änderung, Weitergabe und kommerzielle Verwendung ohne vorherige Erlaubnis. Urheberrechts- und Lizenzhinweise müssen erhalten bleiben. Die Software wird ohne Gewähr bereitgestellt.

Beim ersten Start erscheint eine Auswahl mit acht Sprachen; die Systemsprache ist vorausgewählt. Mit Loslegen öffnet sich das Board. Titel, drei Karten und Verbindungsbeschriftung des Spaziergang-Beispiels verwenden die gewählte Sprache. Später lässt sich die Oberflächensprache in den Einstellungen ändern; gespeicherte Notizen behalten ihren ursprünglichen Text. Bei Updates wird die Seite bestehenden Nutzern nicht erneut angezeigt.

## Installation und Bedienung

- Windows 10/11 x64: Installationsprogramm, portable EXE oder ZIP. Nach dem Entpacken der ZIP `ThoughtAnchor.exe` starten. WebView2 Runtime und .NET Framework 4.8 werden benötigt. Nach dem Schließen bleibt die App im Infobereich; dort lässt sie sich beenden. Windows-Dateien sind nicht codesigniert.
- Android ab 8.0: APK installieren und System-WebView aktuell halten. Smartphones öffnen die mobile Oberfläche, Tablets das Desktop-Layout. Das Layout lässt sich pro Gerät in den Einstellungen ändern. Verfügbar sind Windows- und Android-Pakete.
- Den SHA-256-Wert mit `SHA256SUMS.txt` der Veröffentlichung vergleichen.

Im Posteingang speichert Enter; Shift+Enter fügt einen Zeilenumbruch ein. Unter Windows öffnet `Ctrl+Shift+Space` die Schnellerfassung, solange die App läuft. Karten auf die Wand ziehen, über vier Anschlusspunkte verbinden und gruppieren. Text per Doppelklick bearbeiten. Ausgewählte Karten/Gruppen zum Artikel hinzufügen und die Reihenfolge ändern.

Verschieben, Auswahl, Stift und Radierer merken sich das vorherige Werkzeug. Doppelklick oder Doppeltippen auf die Wand wechselt zurück; erneut ausführen wechselt wieder. Rückgängig/Wiederholen unter Windows: `Ctrl+Z` / `Ctrl+Y`. Das Zeichenfenster einer Karte zeigt den vollständigen Text und zusätzlichen Platz darunter. Breite/Höhe können geändert werden. Speichern übernimmt Zeichnung und Größe gemeinsam, Abbrechen verwirft beides. Direktes Zeichnen auf Karten ist **standardmäßig aus**; aktiviert speichert es jeden Strich.

Auf Smartphones öffnet Rechtswischen oder die Navigationstaste die Seitenleiste; Einstellungen stehen unten. LAN-Synchronisierung benötigt ein gemeinsames erreichbares Netzwerk und eine laufende Windows-App. Den Kopplungscode unter Android scannen oder einfügen. Offline-Konflikte behalten beide Gedankenwände. Schlüssel und gerätespezifische Einstellungen bleiben lokal. Export: `.thoughtanchor`, Artikel/Entwürfe als Markdown oder Text. Import erzeugt eine Kopie. Regelmäßig sichern; die Rückgängig-Historie gilt nur für die aktuelle Sitzung.

## Optionale KI und Datenschutz

Die Gedankenwand braucht keinen Schlüssel. Einstellungen enthalten GLM, Kimi, Qwen, MiMo, MiniMax, Grok, Tencent Hunyuan und bisherige Dienste. Anbieter, Basis-URL, verfügbares Modell und passenden Schlüssel wählen. Regionen und JSON-Einstellungen erklärt die [API-Anleitung](../providers.md). Zusammenfügen bewahrt Originalfragmente; Überarbeiten erstellt einen getrennten Entwurf. Ergebnisse bleiben bis zur Übernahme Vorschauen und überschreiben keine Karten.

Nur eine ausdrückliche KI-Aktion sendet den benötigten aktuellen Artikel/Entwurf. Schlüssel werden mit DPAPI oder Android Keystore verschlüsselt und weder exportiert noch synchronisiert. Es gibt keine Telemetrie oder gehostete Cloud-Synchronisierung. Exporte sind lesbare Dateien. [Sicherheit](../../SECURITY.md) · [Prüfgrenzen](../verification.md). Bezahlte Anbieteraufrufe wurden nicht getestet.

## Entwicklung

Node.js 24 LTS; Windows benötigt die oben genannte Umgebung. Für Android: JDK 21 und SDK 36, siehe [Android-Anleitung](../android-runtime.md).

```sh
npm ci
npm test
npm run security
npm run package
npm run build:android
```

Ausgaben liegen in `release/`. Den privaten Android-Signaturschlüssel für Updates aufbewahren und niemals einchecken. Regressionen mit getrennten Testdaten: `npm run test:native` / `npm run test:android`. [Architektur](../native-runtime.md) · [Drittanbieter-Lizenzen](../third-party-notices.md).
