# API de Control Parental

Backend NestJS con TypeORM, PostgreSQL, WebSockets (Socket.io) y WebRTC para registrar padres, vincular dispositivos de los hijos, monitorear ubicación, notificaciones y streaming en tiempo real.

## Despliegue con Docker

```bash
docker compose up -d --build
```

Servicios:
- `api` en `http://localhost:3000`
- `postgres` en `localhost:5433` (interno 5432)

## Configuración Local (.env)

```bash
copy .env.example .env
npm install
npm run start:dev
```

## Endpoints REST

### Autenticación
- `POST /auth/register` — `{ "email": "padre@example.com", "password": "una-clave-segura" }`
- `POST /auth/login` — Devuelve `accessToken` Bearer para el padre.

### Dispositivos
- `POST /devices/generate-code` — (Padre) Genera código temporal de 6 dígitos con expiración de 15 minutos. Body opcional: `{ "deviceName": "Teléfono de Ana" }`.
- `POST /devices/pair` — (Agente Móvil) Consume el código de 6 dígitos: `{ "pairingCode": "123456", "deviceName": "Samsung A54" }`. Devuelve JWT de agente (30 días).
- `GET /devices` — (Padre) Lista los dispositivos asociados al padre con su estado de vinculación.
- `GET /devices/status` — (Agente Móvil) Valida si el dispositivo sigue vinculado y activo.

### Monitoreo e Historial
- `GET /devices/:id/locations` — (Padre) Historial de ubicaciones GPS.
- `GET /devices/:id/notifications` — (Padre) Registro de notificaciones recibidas.
- `GET /devices/:id/streams` — (Padre) Historial de sesiones de streaming.

### WebRTC
- `GET /webrtc/config` — (Padre / Agente) Devuelve la configuración de `iceServers` (servidores STUN y TURN configurados).

## Gateway en Tiempo Real (Socket.io)

* **Namespace:** `/events`
* **Transportes:** `websocket`, `polling`
* **Autenticación:** Token JWT obligatorio en handshake (`auth: { token: "..." }` o header `Authorization: Bearer <token>`).
* **Salas:** `device:<deviceId>`
* **Eventos:**
  - `subscribe_device`: Padre se suscribe al canal del dispositivo y recibe el estado actual (`online` / `offline`).
  - `device_status_changed`: Notificación en tiempo real cuando el dispositivo se conecta (`online`) o desconecta (`offline`).
  - `update_location` / `location_updated`: Transmisión y persistencia de GPS y batería.
  - `new_notification` / `notification_received`: Transmisión y persistencia de notificaciones del sistema.
  - `start_stream` / `stop_stream`: Control de sesión de streaming (`camera_front`, `camera_back`, `microphone`, `screen`).
  - `webrtc_offer`, `webrtc_answer`, `webrtc_ice_candidate`: Señalización WebRTC P2P (transmitida sin eco al emisor).
