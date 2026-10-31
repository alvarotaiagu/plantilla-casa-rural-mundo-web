/* ------------------------------------------------------------------
   Casa da Corga · config.js
   TODOS los datos del negocio viven aquí. Son FICTICIOS: la plantilla
   los marca en la página con la etiqueta «ficticio». Para convertirla en
   la web de una casa real, se cambian estos valores, se pone
   `ficticio: false` y desaparecen las marcas (ver README).
   El HTML lleva los mismos valores como respaldo; mandan estos.
   ------------------------------------------------------------------ */
window.CORGA_CONFIG = {
  ficticio: true,

  nombre: 'Casa da Corga',
  nombreCorto: 'A Corga',
  lugar: 'Sober · Ribeira Sacra',
  provincia: 'Lugo',
  direccion: 'Lugar da Corga, 4 · 27460 Sober (Lugo)',
  telefono: '982 00 00 00',
  telefonoEnlace: '+34982000000',
  email: 'reservas@ejemplo.com',
  // Sin número de registro de turismo: una demo no se inventa una licencia.

  // La casa, en cifras (las usa la ficha de servicios y el simulador)
  plazas: 8,
  dormitorios: 4,
  camas: 5,
  banos: 3,
  superficie: 240,          // m² construidos
  anio: 1887,               // año de la casa (historia de ejemplo)

  // Horarios de la casa
  entrada: '17:00',
  salida: '12:00',

  // Precios de ejemplo (la casa entera, por noche) y lo que supone el simulador
  precio: { baja: 180, alta: 240 },
  minNoches: 2,
  // Temporada alta supuesta: Semana Santa, 1 jul – 15 sep, 22 dic – 6 ene (la calcula reserva.js)

  // Coordenadas del solar (para el sol y la luna reales). Las mismas que scripts/terreno.py
  lat: 42.38873,
  lon: -7.53132,
  zonaHoraria: 'Europe/Madrid',
};
