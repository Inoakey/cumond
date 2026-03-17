# Cumond

> *cumond* (Rumantsch) – gemeinsam / together

Ende-zu-Ende-verschlüsselte Terminumfrage. Zero-Knowledge-Architektur.
Deine Daten gehören dir – nicht mal wir können sie lesen.

## Features

- Ende-zu-Ende-Verschlüsselung (AES-256-GCM)
- Gehostet in der Schweiz
- Zero-Knowledge – Server sieht nur verschlüsselte Blobs
- Automatische Löschung nach 90 Tagen
- Mehrsprachig (DE/FR/IT/EN)
- Responsive Design
- Open Source (AGPL-3.0)

## Wie funktioniert die Verschlüsselung?

1. Dein Browser generiert einen zufälligen Schlüssel
2. Alle Daten werden im Browser verschlüsselt, bevor sie den Server erreichen
3. Der Schlüssel ist nur im Link enthalten (URL-Fragment #)
4. Das Fragment wird nie an den Server gesendet
5. Selbst der Betreiber kann deine Daten nicht lesen

## Self-Hosting

### Voraussetzungen
- Docker & Docker Compose
- PostgreSQL mit pgcrypto Extension
- Nginx (Reverse Proxy)

### Quick Start
```bash
git clone https://github.com/Inoakey/cumond.git
cd cumond
cp .env.example .env
# .env anpassen (CUMOND_DB_PASS setzen)
docker compose -f docker-compose.cumond.yml up -d
```

### Vollständige Anleitung
Siehe [SETUP.md](SETUP.md)

## Lizenz

AGPL-3.0 – siehe [LICENSE](LICENSE)
