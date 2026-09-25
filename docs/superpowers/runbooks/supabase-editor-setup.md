# Conectar el panel privado a Supabase Free

Esta configuración se realiza una única vez desde la cuenta de Maxi. No requiere tarjeta para el plan Free ni instalar nada.

## 1. Crear el proyecto

1. Entrá a [Supabase](https://supabase.com/dashboard) y elegí **New project**.
2. Seleccioná el plan **Free**, poné un nombre como `victor-lanza-catalogo` y elegí la región más cercana.
3. Guardá la contraseña de base de datos en un lugar seguro: no se usa en el sitio ni se pega en este repositorio.

## 2. Crear las tablas y permisos

1. En el proyecto, abrí **SQL Editor** → **New query**.
2. Copiá y ejecutá por completo `supabase/migrations/20260921_catalog_admin.sql`.
3. Copiá y ejecutá `supabase/migrations/20260921_site_media.sql`. Agrega el bucket privado para las fotos y videos de portada, historia y envíos.
4. Verificá en **Storage** que existan los buckets privados `catalog-media` y `site-media`.

## 3. Dar acceso a Maxi y Victor

1. Abrí **Authentication** → **Users** → **Add user**.
2. Creá una cuenta para Maxi y una para Victor con sus emails. Cada uno define o recupera su propia contraseña; no hace falta compartirla.
3. Copiá el UUID de cada usuario que aparece en la tabla.
4. En SQL Editor, ejecutá una vez por cada UUID, reemplazando el texto entre comillas:

```sql
insert into public.editor_profiles (id, can_edit)
values ('UUID_DEL_USUARIO', true)
on conflict (id) do update set can_edit = true;
```

No activar “Allow new users to sign up” para el catálogo: las cuentas se crean sólo desde este panel de Supabase.

## 4. Conectar el sitio

1. Abrí **Project Settings** → **API**.
2. Copiá únicamente **Project URL** y la **Publishable key** (o la antigua `anon` key si el panel todavía la denomina así).
3. Pegalas en `js/supabase-config.js` como `url` y `publishableKey`.

La Publishable/anon key es segura para el navegador: las reglas de la base limitan lo que puede leer. Nunca pegar `service_role`, `secret`, contraseña de base de datos, ni tokens personales en el repositorio.

## 5. Importación inicial y comprobación

Los modelos existentes se copian automáticamente al almacenamiento privado la primera vez que se edita y publica cada uno. No hace falta usar comandos ni cargar archivos técnicos: en el editor visual, abrí el lápiz del modelo, guardá el borrador y publicalo.

Después comprobá:

1. Sin sesión, `admin.html` sólo muestra el ingreso.
2. Con una cuenta que no esté en `editor_profiles`, no aparece el panel.
3. Maxi y Victor sí ven la página real con lápices, y pueden guardar un borrador.
4. Un modelo, una foto o un texto no aparece en la web hasta pulsar **Publicar cambios**.
5. La web pública sigue mostrando el catálogo local si se borra temporalmente la configuración o falla Supabase.

## Uso diario para Victor

1. Abrí `/admin.html` e iniciá sesión.
2. Se abre la página exactamente como la ven los clientes. El lápiz de cada parte permite modificarla; el botón final **Agregar modelo** crea uno nuevo.
3. **Guardar borrador** conserva el trabajo sin alterar la web pública.
4. **Vista previa** recuerda que estás viendo contenido todavía privado.
5. Pulsá **Publicar cambios** sólo cuando todo esté listo. No compartas la dirección de edición: para visitantes se comparte la dirección habitual del sitio.

Para probar localmente: `http://127.0.0.1:4173/admin.html`. La página pública local es `http://127.0.0.1:4173/`.
