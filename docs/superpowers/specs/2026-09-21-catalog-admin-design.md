# Panel autoadministrable para Víctor Lanza

## Objetivo

Mantener el catálogo público existente —diseño, experiencia de consulta por WhatsApp y funcionamiento responsive— y añadir un panel privado que permita a Víctor administrar el contenido sin GitHub ni código.

Víctor y Maxi serán inicialmente los dos únicos editores. Ambos tendrán permisos completos; Víctor debe poder publicar por sí solo. No habrá traducción automática ni servicios de pago asociados.

## Experiencia de Víctor

1. Abre `.../admin` y entra con su email y contraseña.
2. Ve el catálogo en tarjetas con estado `Publicado` o `Borrador`.
3. Puede crear un modelo, editarlo, subir o quitar fotos y videos, reordenar la galería, ocultarlo o eliminarlo.
4. Completa el contenido en español y guarda el trabajo como borrador.
5. Revisa una vista previa y pulsa `Publicar cambios` cuando quiera hacerlo visible.

El panel usa lenguaje comercial claro, botones grandes y confirmaciones solo para acciones destructivas. En móvil, los formularios y la galería se disponen en una columna.

## Arquitectura propuesta

### Sitio público

GitHub Pages continúa alojando el sitio estático. El navegador consulta solamente el contenido publicado de Supabase y renderiza el catálogo con el diseño existente. Si Supabase no está disponible, se conserva un catálogo base incluido en el sitio para que la página no quede vacía.

Los datos publicados incluyen modelos, galería ordenada, categorías y textos generales editables. El flujo de consulta por WhatsApp sigue siendo local y usa los modelos seleccionados en el navegador.

### Panel privado

Se añade una aplicación estática en `/admin` dentro del mismo repositorio. El login se realiza con Supabase Auth mediante email y contraseña; no habrá registro público. Solo las dos cuentas invitadas podrán ingresar.

El panel obtiene los borradores del editor autenticado. Cada formulario tendrá acciones separadas de `Guardar borrador`, `Vista previa` y `Publicar cambios`.

### Supabase

Supabase Free provee Auth, Postgres y Storage. No se integra Google Translation, API de IA ni ninguna credencial de facturación.

La URL y clave publicable de Supabase se podrán incluir en el cliente; la seguridad no depende de ocultarlas. Las políticas Row Level Security determinan qué puede leer o modificar cada tipo de visitante.

## Datos y publicación

### Modelos

Cada modelo tendrá:

- Identificador interno y orden de catálogo.
- Estado de publicación.
- Categoría.
- Nombre y descripción en español.
- Nombre y descripción opcionales en inglés y portugués de Brasil.
- Portada y una galería ordenada de imágenes y videos.
- Fecha de creación y actualización.

Los cambios se guardan primero en la versión de borrador. Al publicar, esa versión pasa a ser la versión que el sitio público puede consultar. Un modelo nuevo en borrador no aparece en el catálogo hasta publicar. Una eliminación se confirma y solo se refleja públicamente al publicar.

Los archivos se alojan en Storage. Un archivo subido para un borrador puede existir en almacenamiento pero no se muestra públicamente hasta que una versión publicada lo referencia. Quitar una foto o video elimina su referencia y borra el archivo cuando sea seguro hacerlo.

### Textos generales

Teléfono, textos de portada, promesas, experiencia, destinos y textos de pie usarán el mismo esquema de borrador/publicado. El panel los presentará como secciones de contenido, no como código.

### Idiomas

El español es el contenido principal. Inglés y portugués son opcionales y nunca bloquean la publicación.

Al navegar en inglés o portugués:

1. Se muestra el texto traducido si existe y está vigente.
2. Si falta o fue marcado como desactualizado tras modificar el español, se muestra el texto en español.

Al cambiar un texto español, las versiones traducidas se conservan para facilitar su edición, pero quedan marcadas como `requiere revisión`. Esto evita mostrar una traducción que describe una versión anterior del producto.

## Seguridad

- No existe un enlace de alta de usuarios en el panel.
- Las cuentas autorizadas se crean mediante invitación desde Supabase.
- Los visitantes anónimos solo pueden leer datos y recursos marcados como publicados.
- Las cuentas editoras pueden crear, actualizar, eliminar y publicar borradores.
- Las reglas de base de datos y Storage se aplican también si alguien intenta usar la clave pública fuera de la página.
- Los secretos administrativos no se incluyen en GitHub Pages ni en el repositorio.

## Diseño responsive y compatibilidad

El sitio público conserva sus breakpoints actuales. El panel se construye mobile-first: barra superior compacta, lista de modelos de una columna en móvil, formularios con campos grandes y carga de archivos por selección o arrastre cuando el dispositivo lo permite.

La versión publicada se verificará en Chrome, móvil y un navegador Chromium adicional. No se modificarán las interacciones existentes de filtro, galería, carrito ni WhatsApp salvo para leer el contenido administrado.

## Migración

Se cargarán inicialmente los 17 modelos existentes, sus categorías, descripciones, galerías, videos, textos generales y rutas de imágenes. El sitio seguirá usando esos datos actuales hasta que Supabase entregue contenido publicado válido.

## Fuera de alcance inicial

- Traducción automática o API de pago.
- Gestión de precios, stock, pagos o checkout.
- Nuevos editores fuera de Víctor y Maxi.
- Cambios de hosting público o dominio.
