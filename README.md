# Flip 7 Pages-PWA v2 – Spiele-Zentrale

Diese Version verwendet im Server-Modus die **Spiele-Zentrale v1** anstatt des alten Flip-7-Docker-Backends. Die neue API-Adresse muss auf den zentralen Backend-Dienst zeigen. Nur der API-Pfad ist neu: `/api/v1/apps/flip7/state`.

## WICHTIG zur Migration

Die Serverdaten des alten Flip-7-v1-Backends werden **nicht automatisch übernommen**. Zuerst im alten Flip-7-Client die Serverdaten lokal übernehmen und Backup exportieren; dann diese v2 veröffentlichen, Daten im lokalen Modus prüfen und via **Lokale Daten auf Server übertragen** zum neuen Backend übertragen. Alte Daten vorher zusätzlich sichern. Bei einer neuen PWA-Origin ist ein JSON-Export/Import notwendig, da IndexedDB origin-gebunden ist.

## Modi und Datenschutz

Local: IndexedDB, vollständig offline nach erfolgreicher PWA-Installation. Server: zentrale REST-API und HTTPS über Cloudflare Tunnel. Kein Fake-Sync; ein Moduswechsel ändert nur den Speicherort, kein automatisches Zusammenführen. Cloudflare Service-Token und API-Bearer-Token bleiben gerätelokal in IndexedDB. Token nicht mit JSON-Backups exportieren. GitHub-Pages-Paket enthält keinen Servercode und keine Secrets.

## Updates und ZIP

Gleiche PWA-App-Shell, kein CDN; manuell aktivierbarer Service-Worker-Update-Lifecycle, vorherige App-Shell als Fallback. ZIP-Inhalt entspricht Repository-Root, keine .github, .gitignore, .git oder Workflows. Deployment über bestehenden ZIP-Import-Workflow. v2-Version in `VERSION`, JS und Service Worker.

## Einschränkungen

Die Profile der Flip-7-PWA sind weiterhin App-intern; zentrale Spielerprofile und gemeinsame Statistiken müssen gesondert verbunden werden. Yatzy ist noch nicht auf das zentrale Backend umgestellt. Cloudflare CORS und Access müssen auf die korrekte Pages-Origin und die gewünschten Header abgestimmt sein.
