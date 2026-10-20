
# AI MONEY WAR — Deployment-Ready Web App

A real-time multi-device competition system for the AI + finance college event.

## Included
- Participant portal: `/team`
- Organizer dashboard: `/admin`
- Projector/LED scoreboard: `/monitor`
- Node.js + Express + Socket.IO
- 12 preconfigured teams
- ₹10,00,000 starting capital per team
- 12 investment assets
- Configurable market shock
- Portfolio validation
- Locking
- Automatic portfolio valuation
- Performance points + AI score
- Real-time updates without page refresh

## Run locally

Requirements:
- Node.js 20+

Then:

```bash
npm install
npm start
```

Open:
- `http://localhost:3000/team`
- `http://localhost:3000/admin`
- `http://localhost:3000/monitor`

## Use on multiple PCs on the same Wi-Fi/LAN

Run the server on the organizer computer.

On Windows:
```bash
ipconfig
```

Find the organizer computer's IPv4 address, for example `192.168.1.20`.

Participants open:
`http://192.168.1.20:3000/team`

Projector/large monitor:
`http://192.168.1.20:3000/monitor`

Organizer:
`http://192.168.1.20:3000/admin`

All devices must be on the same network. If the college Wi-Fi blocks device-to-device traffic, use a private router/hotspot.

## Cloud deployment

The app is designed so the same project can be deployed to Render, Railway, or another Node-compatible host.

For a production event, add:
- Supabase/PostgreSQL persistence
- Admin authentication
- Team-specific secure tokens
- HTTPS
- Event creation and history
- Audit log
- Export to CSV
- Automatic backup

## Scoring

Performance points are rank-based:
1st 90, 2nd 82, 3rd 75, then 69, 63, 58, 53, 48, 43, 38, 33, 28.

AI score is manually assigned by the organizer from 0–10.

Total = Performance Points + AI Score.

## Important

This package is a working real-time web application for an event. Its current state is held in server memory, so restart the server resets the event. For a public production deployment, connect it to Supabase/PostgreSQL for persistence and proper authentication.
