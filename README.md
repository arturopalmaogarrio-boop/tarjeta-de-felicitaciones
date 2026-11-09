# CumpleBack

Este proyecto es un backend para llevar el control de cumpleaños y automatizar la parte de felicitaciones. La idea es simple: guardar a las personas, saber quién cumple hoy y dejar de lado a quienes ya no quieren recibir mensajes.

Sí, suena como algo pequeñito, pero con una buena base sirve para conectarlo con workflows automáticos, correos, tarjetas y otros sistemas que quieran lanzar una felicitación sin tener que hacerlo manualmente.

## ¿Qué hace?

La app guarda personas con:

- nombre
- día de nacimiento
- mes de nacimiento
- estado activo/inactivo

Luego, cuando alguien consulta la API, la app calcula la fecha actual y devuelve quiénes cumplen años hoy.

También puedes desactivar a una persona para que ya no aparezca en las felicitaciones futuras.

## ¿Cómo funciona?

La aplicación está hecha con:

- Node.js + TypeScript
- Express
- PostgreSQL
- TypeORM
- Docker + Docker Compose
- n8n para automatizar el envío de mensajes o tarjetas

La idea general es:

1. Guardas a las personas en la base de datos.
2. El backend revisa quién cumple hoy.
3. n8n toma esa información y puede disparar una acción (por ejemplo, enviar un correo o una tarjeta de felicitación).
4. Si alguien ya no quiere recibir la nota, se desactiva en la base de datos.

## Estructura del proyecto

```bash
.
├── src/
│   ├── app.ts
│   ├── config/
│   ├── controllers/
│   ├── models/
│   ├── repositories/
│   ├── routes/
│   └── services/
├── docker-compose.yml
├── Dockerfile
├── .env
├── package.json
├── tsconfig.json
└── README.md
```

## Endpoints principales

A continuación te dejo las rutas y URLs esperadas del proyecto. Por defecto, el backend escucha en el puerto 3000 y la API queda disponible en:

- Backend local: http://localhost:3000
- pgAdmin: http://localhost:8080
- n8n: http://localhost:5678

### Obtener cumpleaños de hoy

```http
GET http://localhost:3000/api/personas/hoy
```

Devuelve la lista de personas activas que cumplen años el día actual.

Ejemplo de respuesta:

```json
[
  {
    "id": 1,
    "nombre": "Ana",
    "dia": 12,
    "mes": 5,
    "activo": true
  }
]
```

### Desactivar persona

```http
DELETE http://localhost:3000/api/personas/:id
```

Ejemplo:

```http
DELETE http://localhost:3000/api/personas/12
```

Marca una persona como inactiva para que no vuelva a aparecer en los cumpleaños futuros.

Ejemplo de respuesta exitosa:

```json
{
  "mensaje": "Persona 12 desactivada correctamente",
  "id": 12,
  "activo": false
}
```

### Rutas útiles del stack

- http://localhost:3000/api/personas/hoy
- http://localhost:8080 (pgAdmin)
- http://localhost:5678 (n8n)

> Si cambias los puertos en el archivo `.env`, esas URLs también cambian.

## Correos de cumpleaños (n8n)

Todos los días a las 8:00 AM el workflow de n8n envía:

- **Tarjeta** a cada cumpleañero ([n8n/tarjeta-cumpleanos.html](n8n/tarjeta-cumpleanos.html)).
- **Aviso** a las demás personas activas ([n8n/notificacion-cumpleanos.html](n8n/notificacion-cumpleanos.html)).

El GIF de Pusheen vive en `public/img/pusheen-pastel.gif`. El backend lo entrega en `GET /api/recursos/pusheen-gif` y n8n lo adjunta **incrustado (CID)** en cada correo, así que se ve siempre, sin depender de internet ni de Giphy. Los correos se envían con la API de Gmail usando la credencial OAuth2 de n8n.

Si cambias las plantillas HTML (marcadores `{{ nombre }}` y `{{ cumpleanerosTexto }}`), regenera el workflow y vuelve a importarlo en n8n:

```bash
npm run workflow
```

## Requisitos

Necesitas tener instalado:

- Docker Desktop (incluye Docker Compose) → suficiente para correr todo
- Node.js 22 o superior → solo para modo desarrollo o para regenerar el workflow (`npm run workflow`)

## Cómo correrlo con Docker Compose

Todos los comandos se ejecutan en la carpeta raíz del proyecto (donde está `docker-compose.yml`). Asegúrate de que **Docker Desktop esté abierto** antes de empezar.

### 1. Revisar el `.env`

El archivo `.env` debe existir en la raíz con estas variables (ver [Variables de entorno](#variables-de-entorno)):

```env
TZ=America/Mexico_City
BACKEND_PORT=3000
POSTGRES_PORT=5432
POSTGRES_USER=...
POSTGRES_PASSWORD=...
POSTGRES_DB=...
PGADMIN_PORT=8080
PGADMIN_DEFAULT_EMAIL=...
PGADMIN_DEFAULT_PASSWORD=...
N8N_PORT=5678
N8N_HOST=localhost
N8N_PROTOCOL=http
N8N_WEBHOOK_URL=http://localhost:5678/
N8N_ENCRYPTION_KEY=...   # cualquier texto largo; no lo cambies después o n8n perderá las credenciales
```

### 2. Construir y levantar todo

```bash
docker compose up --build -d
```

- `--build` compila la imagen del backend (necesario la primera vez y cada vez que cambies código, `public/` o el GIF).
- `-d` lo deja corriendo en segundo plano.

Esto levanta 4 contenedores:

| Servicio   | Contenedor        | URL                      |
|------------|-------------------|--------------------------|
| PostgreSQL | `cumple_postgres` | `localhost:5432`         |
| Backend    | `cumple_backend`  | http://localhost:3000    |
| pgAdmin    | `cumple_pgadmin`  | http://localhost:8080    |
| n8n        | `cumple_n8n`      | http://localhost:5678    |

### 3. Verificar que todo arrancó

```bash
docker compose ps
docker compose logs -f backend
```

En los logs del backend debes ver:

```
[DB] Conexión con PostgreSQL establecida
[HTTP] Backend escuchando en el puerto 3000
```

(Sal de los logs con `Ctrl + C`; los contenedores siguen corriendo.)

Pruebas rápidas en el navegador:

- http://localhost:3000 → formulario para registrar personas
- http://localhost:3000/api/personas/envios-hoy → correos que se mandarían hoy
- http://localhost:3000/api/recursos/pusheen-gif → JSON con el GIF en base64

### 4. (Opcional) Cargar datos de prueba

Con el backend ya arrancado (crea la tabla `personas` solo), ejecuta:

```bash
docker exec -i cumple_postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < db/datos-prueba.sql
```

O pégalo en pgAdmin (Query Tool). Inserta dos personas que cumplen **hoy**, útil para probar los correos.

### 5. Configurar n8n (solo la primera vez)

1. Entra a http://localhost:5678 y crea tu usuario de n8n.
2. **Importar el workflow**, desde la interfaz (*Workflows → Import from File →* `n8n/workflow-cumpleanos.json`) o por comando:

   ```bash
   docker exec cumple_n8n n8n import:workflow --input=/workflows/workflow-cumpleanos.json
   ```

   (La carpeta `n8n/` del proyecto está montada dentro del contenedor en `/workflows`.)
3. **Crear la credencial de Gmail**: *Credentials → Add → Gmail OAuth2 API*, ponle de nombre `Gmail account` y conéctala con tu cuenta de Google.
4. Abre el workflow, entra al nodo **"Enviar Correo (Gmail API)"** y verifica que tenga seleccionada esa credencial.
5. Pruébalo con **Execute Workflow** (con los datos de prueba llegarán los correos) y luego actívalo con el switch **Active** para que corra solo todos los días a las 8:00 AM.

### Comandos del día a día

```bash
docker compose up -d                    # levantar (sin recompilar)
docker compose up --build -d backend    # recompilar solo el backend tras cambios
docker compose logs -f n8n              # ver logs de n8n
docker compose restart backend          # reiniciar el backend
docker compose down                     # apagar todo (los datos se conservan)
docker compose down -v                  # apagar y BORRAR datos (BD, pgAdmin y n8n)
```

> Si cambias las plantillas HTML de los correos, corre `npm run workflow` y vuelve a importar el workflow en n8n (paso 5.2).

## Variables de entorno

El proyecto usa un `.env` con cosas como:

- configuración de PostgreSQL
- puertos del backend y pgAdmin
- datos de n8n
- correo destino para automatizaciones

Si vas a usarlo en local, revisa bien esas variables antes de arrancar porque el backend las usa al iniciar.

## ¿Para qué sirve realmente?

En resumen: sirve para tener un mini sistema de cumpleaños automatizados, ideal si quieres:

- mandar felicitaciones por correo
- generar tarjetas automáticas
- consultar quién cumple hoy desde un sistema externo
- mantener una base ordenada de personas y fechas

## Nota chida

Este proyecto no es un mega-sistema complejo, pero sí tiene una base sólida y clara para crecer. Si quieres, después puedes conectarle:

- envío de correos reales
- generación de tarjetas visuales
- cron jobs más avanzados
- panel web para administrar personas

## Ejecutar en modo desarrollo

Si prefieres correr el backend sin Docker:

```bash
npm install
npm run dev
```

Eso levanta el servidor con `tsx` en modo watch.

## Build de producción

```bash
npm run build
```

Y luego:

```bash
npm start
```

## Resumen corto

Es un backend de cumpleaños con buena vibra: guarda personas, sabe quién cumple hoy y se puede conectar con workflows para mandar felicitaciones automáticas sin que nadie tenga que hacer todo a mano.
