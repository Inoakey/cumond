# Self-Hosting Anleitung

## Voraussetzungen

- Docker & Docker Compose
- PostgreSQL (mit `pgcrypto` Extension)
- Reverse Proxy (z.B. Nginx) mit SSL-Terminierung

## 1. Repository klonen

```bash
git clone https://github.com/Inoakey/cumond.git
cd cumond
```

## 2. PostgreSQL einrichten

Erstelle eine Datenbank und einen User mit minimalen Rechten:

```sql
CREATE USER cumond_user WITH ENCRYPTED PASSWORD 'SICHERES_PASSWORT';
CREATE DATABASE cumond OWNER cumond_user;
\c cumond
CREATE EXTENSION IF NOT EXISTS pgcrypto;
GRANT USAGE ON SCHEMA public TO cumond_user;
GRANT SELECT, INSERT, DELETE ON ALL TABLES IN SCHEMA public TO cumond_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, DELETE ON TABLES TO cumond_user;
```

Falls Docker verwendet wird: Stelle sicher, dass der DB-User sich vom Docker-Netzwerk aus verbinden kann (`pg_hba.conf`).

## 3. Migration ausführen

```bash
psql -U cumond_user -d cumond -f drizzle/0001_initial.sql
```

## 4. Environment konfigurieren

```bash
cp .env.example .env
```

Pflichtfelder in `.env`:

| Variable | Beschreibung |
|----------|-------------|
| `CUMOND_DB_PASS` | Passwort des DB-Users |
| `DATABASE_URL` | `postgresql://cumond_user:PASSWORT@host:5432/cumond` |
| `ORIGIN` | Öffentliche URL, z.B. `https://meine-domain.ch` |

## 5. Build & Start

```bash
docker compose up -d --build
```

Prüfen:
```bash
curl http://localhost:3200/api/health
# Erwartung: {"status":"ok"}
```

## 6. Reverse Proxy

Richte einen Reverse Proxy ein, der auf `localhost:3200` weiterleitet. Beispiel für Nginx:

```nginx
server {
    listen 443 ssl http2;
    server_name meine-domain.ch;

    ssl_certificate     /pfad/zu/fullchain.pem;
    ssl_certificate_key /pfad/zu/privkey.pem;

    client_max_body_size 2m;

    location / {
        proxy_pass http://127.0.0.1:3200;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name meine-domain.ch;
    return 301 https://$host$request_uri;
}
```

## 7. Automatische Bereinigung

Abgelaufene Umfragen sollten regelmässig gelöscht werden. Beispiel als täglicher Cron-Job:

```bash
0 3 * * * psql -U cumond_user -d cumond -c "DELETE FROM polls WHERE expires_at < NOW();"
```

## 8. Testen

```bash
curl https://meine-domain.ch/api/health
# Erwartung: {"status":"ok"}
```

## Deployment-Updates

```bash
cd /pfad/zu/cumond
git pull origin main
docker compose up -d --build
```

## Lizenz

AGPL-3.0 – siehe [LICENSE](LICENSE)
