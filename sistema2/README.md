# Sistema de Ventas Web - JavaScript + Vite

Réplica web del sistema de ventas. Incluye inicio de sesión, gestión de empleados y registro de ventas.

## Requisitos

- Node.js 18 o superior.
- MySQL/MariaDB o un clúster TiDB compatible con el protocolo MySQL.

El dump SQL está en `BASE/db_ventas.sql`. Sus tablas deben importarse en el esquema `trinidad` antes de iniciar la API. El archivo contiene datos de ejemplo con nombres, DNI, teléfonos y direcciones; no lo publiques en un repositorio público.

## Inicio local

1. Copia `.env.example` como `.env` y configura la conexión a tu base de datos.
2. Para una base local, usa `DB_HOST=localhost`, `DB_PORT=3306` y `DB_SSL=false`.
3. Instala dependencias con `npm install`.
4. Inicia Vite y la API con `npm run dev`.
5. Abre `http://localhost:5173`.

La API escucha en el puerto 3001. El inicio de sesión usa el usuario del empleado y su DNI como contraseña.

## Conexión a TiDB Cloud

Importa `BASE/db_ventas.sql` en el esquema `trinidad` desde la herramienta SQL de TiDB Cloud. En las variables de entorno de la aplicación configura los valores de conexión que muestra TiDB: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` y `DB_PASSWORD`. Activa `DB_SSL=true` para usar TLS. Configura también un valor largo y aleatorio para `SESSION_SECRET`; no compartas ni publiques esas credenciales.

## Despliegue

En Vercel, importa el repositorio y establece `sistema2` como **Root Directory**. `npm run build` genera el frontend en `dist/` y `api/[...path].js` expone las rutas Express como una Function. Configura `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL=true` y un `SESSION_SECRET` aleatorio en Environment Variables antes de desplegar. No publiques esas credenciales.

## Funciones

- Inicio de sesión y cierre de sesión.
- Alta, listado, edición y eliminación de empleados.
- Búsqueda de clientes activos por DNI.
- Búsqueda de productos, carrito de venta, consulta de stock y generación de venta.
- El guardado de venta actualiza stock y registra venta/detalles en una transacción.

Producto y Clientes no tienen pantallas CRUD en el alcance del proyecto original; en esta réplica se conservan como funciones de búsqueda dentro del registro de venta.