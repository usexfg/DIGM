# DIGM Platform (ARCH variant)

This app is a separate variant of the DIGM frontend, created to follow the architecture described in the shared chat reference.

Reference: https://chatgpt.com/share/68ab91e2-1084-8002-9634-78410d14cff2

What is set up now:
- Isolated app under `frontend-arch/` with its own package metadata and title
- Runs on port 3001 (see `.env`)
- Uses the same dependencies via a symlinked `node_modules` to save disk space
- Independent build output under `frontend-arch/build`

Immediate next steps to align with the referenced architecture:
- Replace temporary storage with the defined data/transport layer per the architecture
- Wire `utils/gunConfig.ts` and `utils/fuegoDiscovery.ts` to the specified peer discovery and relay rules
- Confirm playlist, curation, and Paradio components use the prescribed data flows and real-time sync
- Add environment profiles for local, testnet, and mainnet (e.g. `.env.local`, `.env.testnet`)
- Add end-to-end checks for upload/stream/curation flows in this isolated app

How to run:
- Development: `npm start` (port 3001)
- Production build: `npm run build`

## Elder Node WSS Trackers (WebTorrent)

Run secure WSS trackers on Elder nodes and auto-discover them in the ARCH app.

1) Install tracker (Node 18+)
```bash
sudo npm i -g bittorrent-tracker
```

2) System user and work dir
```bash
sudo useradd -r -s /usr/sbin/nologin tracker
sudo mkdir -p /var/lib/digm-tracker
sudo chown -R tracker:tracker /var/lib/digm-tracker
```

3) Systemd service `/etc/systemd/system/digm-wss-tracker.service`
```ini
[Unit]
Description=DIGM WSS WebTorrent Tracker
After=network.target

[Service]
Type=simple
User=tracker
WorkingDirectory=/var/lib/digm-tracker
ExecStart=/usr/bin/env bittorrent-tracker --ws --http=false --udp=false -p 8000 --trust-proxy
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now digm-wss-tracker
```

4) TLS via Nginx + certbot (example domain `tracker1.usexfg.org`)
- Point DNS A/AAAA to the Elder node
- Nginx site `/etc/nginx/sites-available/tracker1`:
```nginx
server {
  listen 80;
  server_name tracker1.usexfg.org;
  location /.well-known/acme-challenge/ { root /var/www/html; }
  location / { return 301 https://$host$request_uri; }
}
server {
  listen 443 ssl http2;
  server_name tracker1.usexfg.org;

  ssl_certificate     /etc/letsencrypt/live/tracker1.usexfg.org/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/tracker1.usexfg.org/privkey.pem;

  location /announce {
    proxy_pass http://127.0.0.1:8000/announce;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_read_timeout 300s;
  }
}
```
Apply and issue cert:
```bash
sudo ln -s /etc/nginx/sites-available/tracker1 /etc/nginx/sites-enabled/tracker1
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d tracker1.usexfg.org
```

5) Smoke test
```bash
curl -s https://tracker1.usexfg.org/announce
```

6) Register in Fuego discovery so clients auto-pick
```ts
registerPeer({
  id: 'elder-tracker-1',
  url: 'wss://tracker1.usexfg.org/announce',
  capabilities: ['wss-tracker'],
  region: 'us-east',
  lastSeenAt: Date.now(),
  health: { alive: true, latencyMs: 0 }
});
```

7) Use trackers in client (ARCH)
```ts
import WebTorrent from 'webtorrent';
import { getPeersWithCapability, getFallbackPeerUrls } from '../utils/fuegoDiscovery';

export async function createClient() {
  const primary = (await getPeersWithCapability('wss-tracker')).map(p => p.url);
  const fallback = await getFallbackPeerUrls('wss-tracker');
  const announce = [...primary, ...fallback];
  return new WebTorrent({ tracker: { announce } });
}
```

Notes:
- Run 2–3 trackers across regions; rotate via `fuegoDiscovery`.
- Keep only WSS (disable UDP/HTTP); add Nginx rate limits if needed.
- Public WSS trackers may be allowed as policy fallback.
