# Diseño: catálogo de correas Victor Lanza

## Objetivo

Publicar un catálogo estático de correas para reloj de cuero vacuno que permita reunir varios modelos en un carrito de consulta y abrir WhatsApp con el detalle seleccionado.

## Alcance de la primera versión

- Portada con la propuesta de valor: cuero vacuno auténtico, confección desde 1987 y envíos internacionales.
- Catálogo de todos los modelos identificados en el relevamiento inicial, con fotos representativas y una descripción breve.
- Filtros visuales por tipo de construcción: acolchadas, planas, texturadas, especiales y cierres.
- Carrito de consulta local: alta, baja y contador de modelos. No procesa pagos, stock ni precios.
- Botón de WhatsApp que genera un texto con cada modelo elegido y pide precio, color y medida.
- Sección de experiencia con destinos de envío y un testimonio, sin nombres ni teléfonos de clientes.

## Decisiones de contenido

- Neo, Neo Bombé y Bombé son modelos distintos.
- Las medidas, los colores y la vigencia se consultan por WhatsApp; no se prometen como disponibilidad web.
- La declaración de cuero vacuno se aplica a los modelos para los que el chat la declara; no se aplica a hebillas, cierres ni accesorios.
- Las fotografías fuente siguen fuera del repositorio hasta seleccionar y optimizar las fotos definitivas. Esta versión usa rutas de imagen preparadas para la futura selección.

## Arquitectura

El sitio usa HTML, CSS y JavaScript nativos para poder publicarse sin servidor. `js/catalog.js` concentra los datos y las funciones puras del carrito; `js/app.js` renderiza el catálogo y conecta los eventos del DOM. `css/styles.css` contiene el diseño responsive y accesible.

## Interacción principal

1. La persona explora o filtra los modelos.
2. Agrega uno o más modelos al carrito de consulta.
3. El botón abre `https://wa.me/` con un mensaje prellenado que enumera los modelos y solicita precio, color y medida.
4. Víctor confirma la disponibilidad por WhatsApp.

## Criterios de aceptación

- La página muestra todos los modelos del relevamiento como fichas separadas.
- El carrito no permite modelos duplicados y permite quitarlos.
- El texto de consulta contiene cada modelo seleccionado y la pregunta por precio, color y medida.
- Si el carrito está vacío, no se abre una consulta vacía.
- El diseño es usable en móvil y escritorio, y no depende de paquetes externos.
- No se realizan commits ni pushes automáticos.
