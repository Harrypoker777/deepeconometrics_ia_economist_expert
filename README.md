# DeepEconometrics Lab

Monorepo con dos aplicaciones y una capa Docker separada:

- `frontend/`: Next.js 15 App Router para la experiencia de chat.
- `backend/`: Fastify + AI SDK + PostgreSQL, expuesto en `http://localhost:3001`.
- `docker-compose.yml`: orquesta `api`, `postgres` y `cloudflared`.

## Arquitectura

- El frontend usa `useChat()` del Vercel AI SDK y consume `NEXT_PUBLIC_API_URL`.
- El backend expone `POST /api/chat` con streaming SSE y herramientas server-side.
- PostgreSQL guarda indicadores, series de tiempo, perfiles de usuario, sesiones autenticadas y archivos generados.
- Los perfiles y sesiones de login viven en el esquema `db_datos_perfiles_usuarios`.
- Cloudflared queda preparado para exponer el backend por tunel sin abrir mas puertos.

## Desarrollo

1. Instala dependencias del monorepo:

```bash
npm install
```

2. Levanta backend, base de datos y tunel:

```bash
make up
```

3. Ejecuta el frontend localmente:

```bash
cd frontend
npm run dev
```

Frontend: `http://localhost:3000`

Backend: `http://localhost:3001`

## Autenticacion

- Si el usuario no inicia sesion, el chat funciona en modo anonimo.
- En modo anonimo, el historial no se guarda y desaparece al recargar la pagina.
- Si el usuario inicia sesion, el historial se guarda por sesion y queda asociado a su cuenta.
- Existe un superusuario sembrado por defecto:

```text
Correo: alinavarro2023@gmail.com
Contrasena: Alijesus1*
```

## Variables

- `.env`: configura Docker y el backend.
- `frontend/.env.example`: variables que debes cargar en Vercel o en local para Next.js.
- `CHAT_TIMEOUT_MS`: tiempo maximo del stream de chat antes de abortar con error controlado.
- `EXTERNAL_SOURCE_TIMEOUT_MS`: tiempo maximo por request a fuentes externas como World Bank, IMF o ECB.

## Versionado recomendado

- Versiona codigo, configuracion, Docker y migraciones/esquema.
- No subas datasets, secretos, archivos generados ni entornos locales.
- Este repositorio ya viene preparado con `.gitignore` para seguir esa practica.

## Notas

- `x-api-secret` en un cliente web no es un secreto real. Se configuro asi porque lo pediste explicitamente.
- Si quieres endurecer la seguridad, el siguiente paso correcto es mover esa autenticacion a un proxy server-side en Vercel.
