# Modo de edición visual para Victor Lanza

## Objetivo

Reemplazar el panel administrativo separado por un modo privado que conserve la misma apariencia, orden, contenido y comportamiento del catálogo público. Victor debe poder reconocer la página al abrirla y editarla mediante controles visuales simples, sin ver términos técnicos, estructura de datos ni una lista administrativa abstracta.

## Alcance

- `admin.html` mantiene únicamente el ingreso privado y comprueba que la cuenta tenga permiso de edición.
- Una sesión autorizada abre `index.html?modo=editar`.
- El modo edición usa el mismo HTML, CSS, catálogo, filtros, galería y diseño responsive que el público.
- El parámetro `modo=editar` no muestra herramientas por sí solo: el controlador valida una sesión de editor antes de revelar controles.
- La URL pública normal sigue sin cambios y no contiene controles de edición.

## Interfaz de edición

### Barra de trabajo

Una barra fija, visible tanto en escritorio como móvil, contiene:

- `Guardar borrador`: persiste cambios sin modificar lo visible al público.
- `Vista previa`: permite comprobar cambios pendientes en el mismo diseño, claramente marcada como no publicada.
- `Publicar cambios`: confirma y aplica los cambios pendientes al contenido público.
- `Cerrar edición`: vuelve a la página pública sin controles.

La barra informa el estado actual: sin cambios, borrador guardado o cambios publicados.

### Controles sobre contenido

Cada control aparece al pasar el mouse sobre el bloque en escritorio o tocarlo en móvil. Es un botón con lápiz y una etiqueta accesible que nombra la acción.

- Los textos de portada, promesas, catálogo, experiencia, mapa, historias de envío, teléfono y pie abren una ficha lateral o diálogo con español primero y traducciones opcionales plegadas.
- Las fotos y videos de experiencia/historias presentan opciones para reemplazar, agregar o quitar con confirmación explícita.
- Cada tarjeta de modelo muestra `Editar modelo`, desde donde se cambia nombre, descripción, categoría, fotos, videos, portada y orden de la galería.
- El catálogo termina con una tarjeta visual `+ Agregar modelo`, con la misma huella de una tarjeta de producto; abre el formulario de un modelo nuevo.
- Quitar un modelo o un archivo solicita confirmar el nombre exacto antes de modificar el borrador.

## Datos y publicación

El modo edición usa las funciones de borrador/publicación existentes de Supabase. Los datos conservan su separación entre borrador y versión publicada.

- Un cambio en español deja inglés y portugués como pendientes de revisar; nunca bloquea publicar.
- Si una traducción falta o está pendiente, la página pública muestra español.
- Los controles no exponen rutas de almacenamiento, IDs, JSON, claves ni términos de base de datos.
- Las fotos y videos siguen validando imágenes o MP4 de hasta 45 MB antes de subirlos.

## Flujo de sesión

1. Maxi o Victor abre `admin.html` e inicia sesión.
2. El sitio consulta `editor_profiles`; si `can_edit` es verdadero, redirige al modo edición.
3. El modo edición verifica de nuevo la sesión y el permiso antes de habilitar cualquier control.
4. Cerrar sesión elimina la sesión local y vuelve a la pantalla de acceso.

## Responsive y accesibilidad

- En pantallas grandes, los botones se superponen discretamente en la esquina del bloque editable.
- En móvil, los controles mantienen un tamaño táctil mínimo y no cubren el contenido; se muestran al tocar la zona correspondiente.
- Todo control posee texto accesible, foco visible y navegación por teclado.
- La barra de trabajo no tapa el botón flotante de consulta ni el contenido inferior.

## Verificación

- Las pruebas confirman que la URL pública no activa el modo de edición.
- Las pruebas confirman que `modo=editar` requiere una sesión con permiso.
- Las pruebas cubren que la tarjeta de agregar modelo y los controles de lápiz se generen sólo en modo edición.
- Prueba manual en escritorio y 390 px: editar un texto, crear un modelo, agregar medios, guardar borrador, previsualizar, publicar y cerrar sesión.

## Fuera de alcance

- Traducción automática.
- Gestión de contraseñas desde la web: el primer acceso se administra actualmente desde Supabase.
- Cambios a la estética pública fuera de los controles temporales de edición.
