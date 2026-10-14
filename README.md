# API de Control Parental (Fase 1)

Backend NestJS con TypeORM y PostgreSQL para registrar padres, emitir códigos de vinculación y asociar dispositivos.

## Crear el proyecto desde cero con Nest CLI

```bash
npm i -g @nestjs/cli
nest new parental-control-api
cd parental-control-api
npm install @nestjs/config @nestjs/typeorm typeorm pg @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt class-validator class-transformer
npm install -D @types/bcrypt @types/passport-jwt
```

Los archivos de este workspace contienen ya el código de la aplicación. En esta carpeta, configura el entorno e instala las dependencias con:

```bash
copy .env.example .env
npm install
npm run start:dev
```

Completa `DATABASE_URL` y reemplaza `JWT_SECRET` con un secreto largo antes de iniciar. La base PostgreSQL indicada en la URL debe existir. En desarrollo se habilita `synchronize`; en producción usa migraciones de TypeORM y define `NODE_ENV=production`.

## Comandos Nest CLI equivalentes para generar la estructura

```bash
nest g module auth
nest g controller auth
nest g service auth
nest g module devices
nest g controller devices
nest g service devices
```

Las entidades TypeORM están en `src/users/user.entity.ts` y `src/devices/device.entity.ts`; sus DTOs viven en las carpetas `dto` correspondientes.

## Endpoints

- `POST /auth/register` — `{ "email": "adulto@example.com", "password": "una-clave-segura" }`
- `POST /auth/login` — mismas credenciales; devuelve `accessToken` Bearer.
- `POST /devices/generate-code` — requiere `Authorization: Bearer <token>`. Body opcional: `{ "deviceName": "Teléfono de Ana" }`.
- `POST /devices/pair` — público para el agente del hijo: `{ "pairingCode": "123456", "deviceName": "Teléfono de Ana" }`.

El código se consume una sola vez y el dispositivo ya queda relacionado al usuario que lo generó (`parentId`). Las respuestas de autenticación nunca incluyen la contraseña.

## Estructura

```text
src/
  app.module.ts
  main.ts
  auth/       # controller, service, DTOs, estrategia y guard JWT
  devices/    # controller, service, entidad y DTOs
  users/      # entidad User
```
