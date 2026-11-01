# Flip 7 Punkteblock — Release v1

Ein inoffizieller, deutschsprachiger Flip-7-Punkteblock mit PWA, Rundenwertung, Spielerprofilen, Kartenrechner, PNG-Freigabe, Statistik und manueller Datenübertragung. **Docker und GitHub Pages sind unabhängige Clients desselben Datenmodells und nicht automatisch synchronisiert.**

## Funktionen

- 2–8 Spielerprofile, Umbenennen ohne Verlust der historischen Referenzen; bestehende Profile mit gespeicherten Spielen sind nicht löschbar.
- Laufende Partie mit Runden, kumulierten Punkten, korrigierbaren Einträgen, Rückgängig für die letzte erfolgreiche Änderung und Spielende ab 200 Punkten mit eindeutigem Führenden.
- Manuelle Punkte oder Kartenrechner: 0–12 (max. 7 eindeutige Zahlen), ×2, +2/+4/+6/+8/+10, Flip-7-Bonus +15 ab 7 Zahlen, Bust = 0. Aktionen wie Freeze/Flip Three/Second Chance werden physisch gespielt, nicht in der App simuliert.
- Historie, Siegerstatistik, kleine Auszeichnungen, PNG per iOS Teilen-Menü oder Download.
- Backup / Import von JSON, sichere Vorschau auf Anzahl und ID-Konflikte, Ersetzen oder konfliktfreies Zusammenführen; vor Ersetzen kann ein Sicherheitsbackup exportiert werden.

## Architektur und Datenmodelle

Frontend (Vanilla JavaScript, CSS, HTML) verwendet austauschbare Data Provider: Server → `/api/data` (REST, revisionierte vollständige Snapshots); Lokal → IndexedDB `flip7-local`, Schema-Version 1. Getrennte operative Speicher, **kein automatischer Sync**. `localStorage` enthält nur den Betriebsmodus. Einstellungen und optionale Token liegen im separaten IndexedDB-Store `secrets` und **nicht** in Datenexporten. Server-Snapshots bleiben mittels SQLite `profiles`, `games`, `meta`, `schema_migrations` persistent; Revisionen verhindern unbemerkte Schreibkonflikte (HTTP 409).

Pro Spiel: ID, Spieler-IDs, Status, Datum, Runden. Pro Runde: ID und Score je Spieler. Score: `kind: cards|manual`, `points`, optional `numbers`, `plus`, `double`, `bust`. IDs bleiben dauerhaft stabil. Versionierte Backups: `{ "format":"flip7-punkteblock-backup", "version":1, "createdAt":"...", "data":{"profiles":[],"games":[]} }`.

**Nicht implementiert (bewusst):** Kartengeber, Spiele-Live-Synchronisierung, Spielcode-Lobbys, Gerätekopplung, echte Offline-Queue, Benutzerkonten, Bilder/Uploads/Projektdateien (für Punkteblock nicht relevant). Statistik berücksichtigt abgeschlossene Partien. Ein neuer Spieler kann erst nach dem Ende oder Löschen der laufenden Partie in einer neuen Partie teilnehmen.

## Regeln

Original-FAQ: https://theop.games/pages/flip-7-faqs — Summe der Zahlenkarten ×2 (falls vorhanden), danach Pluskarten, zuletzt +15 für sieben unterschiedliche Zahlenkarten. Bust zählt null. Spielende nach abgeschlossener Runde, wenn jemand mindestens 200 Punkte und allein die höchste Punktzahl hat; Gleichstände spielen weiter. Flip 7 ist eine Marke des jeweiligen Rechteinhabers; diese App ist ein unabhängiger Punkteblock.

## Docker / Portainer

Die Docker-Weboberfläche beinhaltet **alles**: statisches Frontend, PWA, Flask, Gunicorn, SQLite und Backups. GitHub Pages wird weder geladen noch benötigt. Build aus dem Docker-ZIP-Repository-Root via Git oder lokal mit `docker build -t flip7 .` und `docker run -p 8095:8080 -v /eigener/pfad:/app/data flip7`.

Wenn `AUTH_ENABLED=true` ist, im Docker-Setup den **optionalen API-Token** hinterlegen; eine Backend-URL ist dabei nicht nötig.

Im Portainer-Repository kann die mitgelieferte `compose.yml` als Startpunkt dienen. Passe **vorher** den Git-Build-Kontext und Synology-Bind-Pfad an. Beispielport: **8095:8080**. Daten: `/app/data/app.sqlite`, automatische Sicherheitsbackups `/app/data/backups/*.json`. SQLite mit WAL, `synchronous=FULL`, Foreign Keys, transaktionaler Version-1-Migration und Schema-Check beim Start. Datenbanken werden niemals im Zuge von Updates gelöscht. Container-UID/GID **10001:10001**: Vorher Host-Verzeichnis entsprechend beschreibbar machen (`chown -R 10001:10001 /volume1/docker/flip7/data`). Bei Fehlern erscheint `FATAL: ... /app/data` im Log. `HEALTHCHECK` prüft `/health`.

Umgebungsvariablen: `APP_TITLE` (Titel nur in API-Konfig), `APP_URL` (Dokumentations-/öffentliche Backend-Adresse, in v1 keine extern generierten Links), `DATA_DIR=/app/data`, `AUTH_ENABLED=false|true`, `APP_API_TOKEN` (mindestens 24 Zeichen falls Auth aktiviert), `PWA_ALLOWED_ORIGIN=https://USER.github.io` (mehrere durch Komma getrennt), `BACKUP_KEEP=50`. `SECRET_KEY` ist in v1 nicht notwendig, da keine serverseitigen Sitzungen verwendet werden; keine Dummy-Secrets. `DOCKER_WEB_URL` wird im Docker-Backend nicht für API-Aufrufe verwendet. In der Pages-PWA kann die Docker-Web-URL optional separat und gerätebezogen für einen rein manuellen Fallback-Link hinterlegt werden. **Die Docker-Weboberfläche verwendet unabhängig von jedem Pages-Setup immer Same-Origin `/api/...`, ohne CORS und ohne Cloudflare-Service-Header.**

**Sicherheit:** Ohne `AUTH_ENABLED` hat jede Person mit Netzwerkzugang vollständigen Schreibzugriff. Daher Docker-Port nur im vertrauenswürdigen LAN freigeben oder einen Zugangsschutz am Reverse-Proxy/Cloudflare-Tunnel einrichten. Für Veröffentlichungen mit API-Token ist `AUTH_ENABLED=true` möglich; dann den API-Token über die Setup-Verbindung eingeben. Secrets gehören ausschließlich in Portainer-Umgebungsvariablen, niemals ins Repository. Zugang über HTTPS (Cloudflare Tunnel), optional Cloudflare Access. Für Pages-Server-Modus die öffentliche HTTPS-Backend-URL sowie die exakte `PWA_ALLOWED_ORIGIN` setzen. Der Browser sendet API-Token und optional CF-Access-Client-ID/Secret nur bei externen Pages-API-Requests. Bei Cloudflare Access muss OPTIONS-Preflight die passende CORS-Antwort erhalten können; eine Access-Policy für Service-Token und korrekte Preflight-Behandlung ist gesondert zu konfigurieren. Browser-Speicherung von Service-Secrets ist risikobehaftet, bitte pro Gerät eigene, minimal berechtigte, einzeln widerrufbare Tokens einsetzen. Keine Drittanbieter-Skripte.

**Hinweis:** Docker-PWA-Installation und Service Worker benötigen HTTPS oder `localhost`. Auf einer reinen LAN-HTTP-IP funktioniert die vollständige Web-App trotzdem, aber der Browser erlaubt dort normalerweise keinen Service Worker.

## GitHub Pages

Inhalte von `flip7-pages-v1.zip` direkt ins Repository-Root legen. GitHub Pages aus Root (`main`) veröffentlichen. Im ersten Start Lokal oder Server wählen. Der lokale Modus arbeitet nach Installation offline; der Server-Modus startet aus dem lokalen App-Shell-Cache und benötigt für Datenoperationen eine erreichbare Docker-API. Bei GitHub-Pages-Ausfall kein automatischer Wechsel zu Docker und keine automatische Weiterleitung; ein optional eingetragener Docker-Web-Link kann manuell geöffnet werden. Für Server-CORS immer die **Origin** verwenden, z. B. `https://name.github.io` (ohne Pfad). Daten auf einem anderen Gerät werden nicht automatisch übernommen. Übertragung unter Setup manuell mit Datensatzanzahl, Konfliktprüfung, optionalem Backup und expliziter Bestätigung. Merge bricht bei widersprüchlichen IDs ab, um keine Daten zu überschreiben.

## Backup, Restore, Migration

In v1 fallen keine Binärdateien an, deshalb genügt versioniertes JSON. JSON-Backups enthalten keine Serveradresse, API-Token, Cloudflare-Tokens oder andere Secrets. JSON-Daten werden vor Import/Restore validiert und als eine transaktionale Operation übernommen. Der Server legt vor **jedem** vollständigen Snapshot-Ersatz/Restore automatisch ein JSON-Sicherheitsbackup in `/app/data/backups` ab. Rotationsgrenze `BACKUP_KEEP` (Standard 50). Das ist zusätzlich zu manuellen Exporten; für vollständige Disaster-Recovery auch den Docker-Volume-Pfad separat sichern. Zukünftige Format-Versionen benötigen explizite Migrationslogik; unbekannte Importversionen werden abgelehnt.

API: `GET /health`, `GET /api/health`, `GET /api/config`, `GET/PUT /api/data`, `GET /api/profiles`, `GET /api/profiles/<id>`, `GET /api/games`, `GET /api/games/<id>`, `GET /api/export`, `GET /api/backups`, `POST /api/restore`. PUT `/api/data` benötigt `{data,revision}`; 409 bei Konflikt. `POST /api/restore` erwartet formatierte JSON-Backups. Es gibt bewusst kein unauthentifiziertes öffentliches Bearbeitungsformular. Bei gleichzeitigem Mehrgerätezugriff kein Echtzeit-Update; stattdessen bewusstes erneutes Laden nach Konflikt.

## Offline-App-Shell und Updates

`manifest.webmanifest`, `sw.js`, 192/512/maskable PNG, Apple-Touch-Icon, `favicon.svg`, Offline-Fallback. Kern-Shell (`index.html`, CSS, JS, Core, Provider, Icon-SVG, Manifest) wird beim Installieren frisch und vollständig gecacht; optionale Icons/Offline-Datei dürfen separat fehlschlagen. Der Worker benutzt `updateViaCache:'none'`, cached keine API und keine dynamischen Nutzerdaten. Keine automatische Aktivierung eines Updates, kein `clients.claim()`, kein aggressives Reload. Beim Update wird zuerst `registration.update()` aufgerufen und der installierende Worker abgewartet. Dann kann bewusst `Jetzt aktualisieren` gewählt werden; offene Formulare/Dialoge und aktive Datenoperationen blockieren die Aktualisierung. Ein einzelner kontrollierter Reload nach `controllerchange`. Die aktuelle und unmittelbar vorherige Shell bleiben gespeichert, ältere werden entfernt. App-Shell-Cache kann bei voll ausgeschöpftem Gerätespeicher vom System gelöscht werden; Offline-Betrieb ist keine absolute Gerätegarantie.

## Releases und ZIP-Import

`flip7-docker-v1.zip` und `flip7-pages-v1.zip` sind kompatibel und enthalten je das direkte Repo-Root. **Keine** `.git/`, `.github/`, `.gitignore`, Workflow-Dateien oder Secrets. Ein vorhandener ZIP-Import-Workflow wird im Repository selbst verwaltet und durch das Import-ZIP niemals überschrieben. Bei Push eines neuen ZIP: genau dieses anhand des Push-Änderungssets auswählen, Dateiname + SHA-256 protokollieren, Archiveinträge/Symlinks/Traversal/Sonderpfade/Grösse prüfen, alle normalen App-Dateien ersetzen, `.git`, `.github`, `.gitignore` von `rsync --delete` ausschliessen, ZIP entfernen, commit/push. Pages danach im **selben Workflow** via Pages-Actions deployen; Token-Push löst nicht zuverlässig einen zweiten Workflow aus. Für Docker nach Commit/Push im Portainer Stack neu bauen/redeployen.

## Tests / Einschränkungen

Ausgeführt: Syntaktische Prüfungen (`node --check`, `python -m py_compile`), Node-Domänentests (Wertung, Bust, Bonus, JSON-Backup, Merge), isolierter SQLite-Funktionstest (WAL, FULL, FK, Migration, Revision, Konflikterkennung, automatisches Backup) und ZIP-Inspektion. **Nicht ausgeführt:** Flask-HTTP-Testclient (Flask/Gunicorn konnten mangels Paket-Netzwerkzugriff nicht installiert werden); Browser-Smoke-Test (verwalteter Chromium blockiert alle Navigations-URLs). **Nicht durch die Testumgebung garantiert:** reale Portainer-/Synology-Installation, Cloudflare Access/Service-Token-CORS auf externer Domain, iOS-Home-Screen-Lifecycle über mehrere Releases, reale GitHub Actions Deploymentrechte. Diese Schritte auf Zielgeräten manuell prüfen.
