# SETUP

Cara jalanin Snapp secara lokal dan via Docker.

## Prasyarat

- Node.js 20+ atau Bun
- PostgreSQL
- `config/settings.yaml`
- `config/oauth.json` kalau pakai login provider OAuth

## Setup Lokal

1. Install dependency.

```bash
npm install
```

2. Siapkan config.

- Copy `config/settings.example.yaml` ke `config/settings.yaml`
- Copy `config/oauth.example.json` ke `config/oauth.json` kalau mau pakai OAuth

3. Set environment minimum.

```bash
DATABASE_URL=postgres://user:pass@localhost:5432/snapp
```

4. Jalankan app.

```bash
npm run dev
```

5. Kalau mau build production lokal.

```bash
npm run build
npm run preview
```

## Setup Docker

1. Pastikan `config/` sudah terisi.

2. Build image.

```bash
docker build -t snapp .
```

3. Run container.

```bash
docker run --rm -p 1000:1000 \
  -e DATABASE_URL="postgres://user:pass@host.docker.internal:5432/snapp" \
  -e PORT=1000 \
  snapp
```

4. Kalau pakai `docker compose`, pastikan service Postgres aktif dan `DATABASE_URL` diarahkan ke service DB yang benar.

## File Config Penting

### `config/settings.yaml`

Wajib ada. Minimal isi:

```yaml
appname: Snapp
admin:
  - email: admin@example.org
    username: admin
hosts:
  - origin: http://localhost:5173
    options:
      customRedirect: /dashboard
      disable:
        homepage: false
        twoFactor: true
smtp:
  enabled: false
```

### `config/oauth.json`

Opsional, tapi wajib kalau pakai provider login external.

## Environment Variables

Minimal:

- `DATABASE_URL`

Umum dipakai juga:

- `SNAPP_DEBUG`
- `PORT`
- `PUBLIC_VERSION`
- `FACEBOOK_CLIENT_ID`
- `FACEBOOK_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## Catatan Deploy

- `hosts[].origin` harus cocok dengan origin request asli.
- Kalau app di belakang reverse proxy, pastikan `X-Forwarded-Host` dan `X-Forwarded-Proto` diteruskan benar.
- Kalau `settings.yaml` atau `oauth.json` belum ada, app sekarang bisa bootstrap dari file example, tapi tetap lebih aman kalau disiapkan eksplisit.
- Kalau file MaxMind tidak ada, app tetap jalan; fitur geo cuma jadi `null`.
