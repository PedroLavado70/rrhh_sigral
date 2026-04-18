# SIGRAL RRHH & Proyectos · listo para GitHub + Netlify + Supabase

## Qué contiene
- `index.html` → web lista para usar
- `schema.sql` → crea las tablas en Supabase
- `netlify/functions/api.js` → backend que guarda/lee en Supabase
- `netlify.toml` → redirección de `/api/*`
- `package.json` → dependencias del proyecto

## Paso 1 · Crear la base de datos en Supabase
1. Entra a tu proyecto Supabase
2. Abre **SQL Editor**
3. Copia y pega el contenido de `schema.sql`
4. Ejecuta el script

## Paso 2 · Subir a GitHub
Sube esta carpeta completa a un repositorio de GitHub.

## Paso 3 · Conectar con Netlify
1. En Netlify crea un sitio nuevo desde tu repositorio GitHub
2. Build command: `npm install`
3. Publish directory: `.`

## Paso 4 · Variables de entorno en Netlify
En Netlify ve a **Site configuration > Environment variables** y crea:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Estos valores se copian desde **Supabase > Project Settings > API**.

## Paso 5 · Volver a desplegar
Haz redeploy del sitio.

## Listo
Tu web ya podrá:
- crear empleados
- crear proyectos
- crear asignaciones
- editar y eliminar
- guardar todo en Supabase

## Importante
Esta versión es la más simple y práctica para que empieces rápido.
No incluye login real todavía. Primero deja funcionando el guardado de datos.
Luego, si quieres, se puede añadir acceso con usuarios y contraseñas.
