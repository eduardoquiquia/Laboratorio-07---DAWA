# Laboratorio 07 · Express + MongoDB

## Ejecutar

1. Instala las dependencias con `npm install`.
2. Copia `.env.example` a `.env` si aún no existe y configura MongoDB y un `JWT_SECRET` privado.
3. Inicia MongoDB y ejecuta `npm start` (o `npm run dev`).
4. Abre http://localhost:3000/signIn.

El arranque crea los roles y, si no existe ningún administrador, crea uno con `ADMIN_EMAIL` y `ADMIN_PASSWORD`. Si no configuras estas variables, utiliza `admin@laboratorio.local` y genera una contraseña aleatoria que muestra una sola vez en la consola. Guárdala y cámbiala en **Mi cuenta**. El seed no modifica usuarios existentes. Los usuarios antiguos deben completar los nuevos campos obligatorios al editar su perfil.

## Funcionalidad

- EJS y Materialize: registro, ingreso, perfil editable, dashboard de usuario, administración, detalle de usuario, 403 y 404.
- Registro público siempre con rol `user`; administrador con acceso a ambos dashboards.
- JWT en `sessionStorage` para la API y cookie HttpOnly para proteger las páginas en el servidor. Las páginas redirigen a `/signIn` sin JWT válido; la API responde 401. El navegador cierra la sesión al expirar.
- Contraseña validada antes del hash bcrypt. Las respuestas nunca incluyen el hash.
- Edad calculada desde la fecha de nacimiento. El campo persistido `phoneNumer` acepta también `phoneNumber`; se conserva `adress` como pide el enunciado.
- Materialize se carga desde CDN y requiere acceso a Internet para su diseño completo.

## Rutas

| Página | Acceso |
| --- | --- |
| `/signIn`, `/signUp` | Público |
| `/dashboard`, `/profile` | user o admin |
| `/admin`, `/admin/users/:id` | admin |

API: `POST /api/auth/signUp`, `POST /api/auth/signIn`, `POST /api/auth/signOut`, `GET /api/users/me`, `PATCH /api/users/me`, `GET /api/users` y `GET /api/users/:id`. Las rutas de usuarios requieren `Authorization: Bearer <token>`; las dos últimas requieren admin. La edición de perfil solo permite datos personales y contraseña, nunca roles.

## Comprobación

`npm test` ejecuta pruebas con el runner nativo de Node: validación del modelo, edad, protección HTTP, renderizado EJS y flujos API con persistencia real. Requiere MongoDB disponible mediante `MONGODB_URI`; crea una base temporal `lab07_test_<id>` y elimina exclusivamente esa base al finalizar. No requiere dependencias de pruebas. Para revisar la interfaz, recorre registro → ingreso → perfil → salida; luego ingresa con el administrador y abre la tabla y el detalle.
