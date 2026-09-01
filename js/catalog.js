(() => {
const products = [
  {
    id: 'acolchadas-doble-costura',
    name: 'Acolchadas doble costura',
    category: 'acolchadas',
    description: 'Con doble costura, confeccionadas en una misma pieza de cuero, sin empalmes ni sintéticos.',
    image: 'assets/products/acolchadas-doble-costura.jpg',
    gallery: ['00000043-PHOTO-2026-08-28-21-43-23.jpg', '00000044-PHOTO-2026-08-28-21-43-23.jpg', '00000045-PHOTO-2026-08-28-21-43-24.jpg', '00000069-PHOTO-2026-08-28-21-47-43.jpg'],
    video: '00000046-VIDEO-2026-08-28-21-43-24.mp4',
  },
  {
    id: 'costura-full',
    name: 'Costura Full',
    category: 'acolchadas',
    description: 'Modelo acolchado con costura full, en cuero vacuno auténtico.',
    image: 'assets/products/costura-full.jpg',
    gallery: ['00000047-PHOTO-2026-08-28-21-43-24.jpg', '00000048-PHOTO-2026-08-28-21-47-36.jpg', '00000084-PHOTO-2026-08-28-21-50-22.jpg'],
  },
  {
    id: 'neo-bombe',
    name: 'Neo Bombé',
    category: 'acolchadas',
    description: 'Modelo acolchado, confeccionado en una misma pieza de cuero vacuno auténtico.',
    image: 'assets/products/neo-bombe.jpg',
    gallery: ['00000050-PHOTO-2026-08-28-21-47-37.jpg', '00000051-PHOTO-2026-08-28-21-47-38.jpg', '00000090-PHOTO-2026-08-28-21-50-24.jpg', '00000113-PHOTO-2026-08-28-21-56-03.jpg'],
  },
  {
    id: 'aireada',
    name: 'Aireada',
    category: 'especiales',
    description: 'Modelo aireado en cuero vacuno auténtico, acolchado y flat.',
    image: 'assets/products/aireada.jpg',
    gallery: ['00000052-PHOTO-2026-08-28-21-47-38.jpg', '00000091-PHOTO-2026-08-28-21-50-24.jpg', '00000114-PHOTO-2026-08-28-21-56-04.jpg', '00000132-PHOTO-2026-08-28-21-56-12.jpg', '00000133-PHOTO-2026-08-28-21-56-12.jpg'],
  },
  {
    id: 'crocco-acolchada',
    name: 'Crocco acolchada',
    category: 'texturadas',
    description: 'Crocco acolchada en cuero vacuno genuino.',
    image: 'assets/products/crocco-acolchada.jpg',
    gallery: ['00000057-PHOTO-2026-08-28-21-47-39.jpg', '00000070-PHOTO-2026-08-28-21-47-43.jpg', '00000080-PHOTO-2026-08-28-21-50-21.jpg', '00000081-PHOTO-2026-08-28-21-50-21.jpg', '00000082-PHOTO-2026-08-28-21-50-21.jpg'],
  },
  {
    id: 'crocco-premium-flat',
    name: 'Crocco Premium Flat',
    category: 'texturadas',
    description: 'Cuero vacuno estampado crocco en terminación flat.',
    image: 'assets/products/crocco-premium-flat.jpg',
    gallery: ['00000054-PHOTO-2026-08-28-21-47-38.jpg', '00000095-PHOTO-2026-08-28-21-50-25.jpg', '00000177-PHOTO-2026-08-28-21-56-24.jpg', '00000178-PHOTO-2026-08-28-21-56-24.jpg', '00000226-PHOTO-2026-08-28-22-09-16.jpg'],
    video: '00000092-VIDEO-2026-08-28-21-50-24.mp4',
  },
  {
    id: 'clasicas-planas',
    name: 'Clásicas planas',
    category: 'planas',
    description: 'Clásicas planas confeccionadas en una misma pieza de cuero vacuno auténtico.',
    image: 'assets/products/clasicas-planas.jpg',
    gallery: ['00000064-PHOTO-2026-08-28-21-47-42.jpg', '00000066-PHOTO-2026-08-28-21-47-42.jpg', '00000074-PHOTO-2026-08-28-21-50-16.jpg', '00000087-PHOTO-2026-08-28-21-50-23.jpg', '00000096-PHOTO-2026-08-28-21-50-26.jpg', '00000111-PHOTO-2026-08-28-21-55-54.jpg', '00000147-PHOTO-2026-08-28-21-56-16.jpg'],
  },
  {
    id: 'mezo',
    name: 'Mezo',
    category: 'planas',
    description: 'Modelo Mezo en cuero vacuno auténtico.',
    image: 'assets/products/mezo.jpg',
    gallery: ['00000065-PHOTO-2026-08-28-21-47-42.jpg', '00000117-PHOTO-2026-08-28-21-56-08.jpg', '00000126-PHOTO-2026-08-28-21-56-10.jpg'],
  },
  {
    id: 'planas-extra-gruesas',
    name: 'Planas extra gruesas',
    category: 'especiales',
    description: 'Planas especiales extra gruesas para relojes grandes y pesados.',
    image: 'assets/products/planas-extra-gruesas.jpg',
    gallery: ['00000083-PHOTO-2026-08-28-21-50-22.jpg', '00000123-PHOTO-2026-08-28-21-56-10.jpg', '00000155-PHOTO-2026-08-28-21-56-18.jpg'],
  },
  {
    id: 'bisonte',
    name: 'Bisonte',
    category: 'texturadas',
    description: 'Línea Bisonte, flat y acolchada, en cuero vacuno auténtico.',
    image: 'assets/products/bisonte.jpg',
    gallery: ['00000097-PHOTO-2026-08-28-21-50-26.jpg', '00000104-PHOTO-2026-08-28-21-55-46.jpg', '00000258-PHOTO-2026-08-28-22-09-29.jpg'],
  },
  {
    id: 'bombe',
    name: 'Bombé',
    category: 'acolchadas',
    description: 'Modelo Bombé acolchado en cuero.',
    image: 'assets/products/bombe.jpg',
    gallery: ['00000202-PHOTO-2026-08-28-22-09-05.jpg', '00000150-PHOTO-2026-08-28-21-56-17.jpg', '00000151-PHOTO-2026-08-28-21-56-17.jpg', '00000152-PHOTO-2026-08-28-21-56-17.jpg'],
  },
  {
    id: 'neo',
    name: 'Neo',
    category: 'acolchadas',
    description: 'Modelo Neo, cuero vacuno 100% en frente y dorso.',
    image: 'assets/products/neo.jpg',
    gallery: ['00000193-PHOTO-2026-08-28-22-09-00.jpg', '00000194-PHOTO-2026-08-28-22-09-01.jpg', '00000195-PHOTO-2026-08-28-22-09-02.jpg', '00000197-PHOTO-2026-08-28-22-09-03.jpg', '00000214-PHOTO-2026-08-28-22-09-11.jpg'],
  },
  {
    id: 'pasante',
    name: 'Pasante',
    category: 'especiales',
    description: 'Modelo pasante: se coloca por debajo del reloj, en cuero vacuno 100%.',
    image: 'assets/products/pasante.jpg',
    gallery: ['00000203-PHOTO-2026-08-28-22-09-06.jpg', '00000200-PHOTO-2026-08-28-22-09-05.jpg', '00000201-PHOTO-2026-08-28-22-09-05.jpg'],
  },
  {
    id: 'artesano',
    name: 'Artesano',
    category: 'especiales',
    description: 'Modelo Artesano, cosido a mano.',
    image: 'assets/products/artesano.jpg',
    gallery: ['00000085-PHOTO-2026-08-28-21-50-22.jpg', '00000086-PHOTO-2026-08-28-21-50-23.jpg', '00000142-PHOTO-2026-08-28-21-56-15.jpg', '00000143-PHOTO-2026-08-28-21-56-15.jpg'],
  },
  {
    id: 'pespunte-combinado',
    name: 'Pespunte combinado',
    category: 'especiales',
    description: 'Pespunte combinado en cuero vacuno genuino.',
    image: 'assets/products/pespunte-combinado.jpg',
    gallery: ['00000209-PHOTO-2026-08-28-22-09-09.jpg', '00000208-PHOTO-2026-08-28-22-09-09.jpg', '00000244-PHOTO-2026-08-28-22-09-25.jpg', '00000245-PHOTO-2026-08-28-22-09-25.jpg'],
  },
  {
    id: 'carrera',
    name: 'Carrera',
    category: 'planas',
    description: 'Modelo Carrera, confeccionado en una misma pieza de cuero en frente y dorso.',
    image: 'assets/products/carrera.jpg',
    gallery: ['00000238-PHOTO-2026-08-28-22-09-20.jpg', '00000239-PHOTO-2026-08-28-22-09-21.jpg', '00000242-PHOTO-2026-08-28-22-09-22.jpg', '00000243-PHOTO-2026-08-28-22-09-23.jpg'],
  },
  {
    id: 'cierres-deployant-magnetic',
    name: 'Cierres Deployant y Magnetic',
    category: 'cierres',
    description: 'Modelos con cierre Deployant y Magnetic, disponibles en dorado, plateado y negro.',
    image: 'assets/products/cierres-deployant-magnetic.jpg',
    gallery: ['00000060-PHOTO-2026-08-28-21-47-40.jpg', '00000062-PHOTO-2026-08-28-21-47-41.jpg', '00000063-PHOTO-2026-08-28-21-47-41.jpg', '00000141-PHOTO-2026-08-28-21-56-14.jpg', '00000260-PHOTO-2026-08-28-22-09-29.jpg', '00000273-PHOTO-2026-08-28-22-09-33.jpg'],
  },
];

function addToCart(cart, product) {
  return cart.some((item) => item.id === product.id) ? cart : [...cart, product];
}

function removeFromCart(cart, productId) {
  return cart.filter((item) => item.id !== productId);
}

function toggleCart(cart, product) {
  return cart.some((item) => item.id === product.id)
    ? removeFromCart(cart, product.id)
    : addToCart(cart, product);
}

function buildWhatsAppUrl(cart, phoneNumber) {
  if (cart.length === 0) return null;

  const selectedModels = cart.map((product) => `- ${product.name}`).join('\n');
  const message = [
    'Hola, quisiera consultar por estos modelos:',
    '',
    selectedModels,
    '',
    '¿Me indicás precio, color y medida disponible para cada uno?',
  ].join('\n');
  return `https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}

globalThis.catalogStore = {
  products,
  addToCart,
  removeFromCart,
  toggleCart,
  buildWhatsAppUrl,
};
})();
