# Nova Salud

## Ejecutar con Docker

Desde esta carpeta:

```powershell
docker compose up -d --build
```

Abre http://localhost:3000 en el navegador. El frontend, la API y WebSocket se sirven juntos desde el servicio app. No uses el HTML como archivo local; redirige al servidor.

MySQL usa el host db y el puerto 3306 dentro de Docker. El puerto publicado en Windows es independiente de esa conexión interna.

El esquema database/schema.sql se importa automáticamente solo cuando el volumen de MySQL se crea por primera vez. Los datos existentes se conservan al reconstruir la aplicación.

## Diagnóstico

```powershell
docker compose ps
docker compose logs --tail 50 app db
Invoke-RestMethod http://localhost:3000/api/dashboard/resumen
```

Después de cambiar el frontend, reconstruye app con `docker compose up -d --build app` y recarga el navegador.
