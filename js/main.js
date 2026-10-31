/* ------------------------------------------------------------------
   Casa da Corga · main.js
   La página: datos de config.js, scroll (Lenis + GSAP si cargan), la
   parada en la que estás (s = 0 … 6, la escucha el mundo), cortina,
   menú, cookies, cursor, titulares, estancias, estaciones, mapa bajo
   clic, exploración libre y el mando de maqueta.
   Sin GSAP o con movimiento reducido la página se lee entera igual:
   `gsapReady` sincroniza contenido; `motion` solo anima.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  const raiz = document.documentElement;
  const C = window.CORGA_CONFIG || {};
  const CORGA = (window.CORGA = window.CORGA || {});
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gsapReady = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const motion = gsapReady && !reducido;
  if (motion) raiz.classList.add('con-movimiento');
  if (!gsapReady) raiz.classList.add('sin-gsap');
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } };
  const leer = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };

  /* ---------- 1. los datos (config.js manda) ---------- */
  if (C.ficticio) raiz.classList.add('ficticio');
  $$('[data-dato]').forEach(el => { const v = C[el.dataset.dato]; if (v != null) el.textContent = v; });
  $$('[data-dato-href]').forEach(el => { const v = C[el.dataset.datoHref]; if (v != null) el.href = (el.dataset.prefijo || '') + v; });

  /* ---------- 2. medidas de la vista (la barra del móvil no rehace nada) ---------- */
  let anchoVista = innerWidth, altoVista = innerHeight;

  /* ---------- 3. scroll suave ---------- */
  let lenis = null;
  if (motion && typeof window.Lenis !== 'undefined') {
    lenis = new window.Lenis({ lerp: .1, smoothWheel: true, wheelMultiplier: 1 });
    lenis.on('scroll', window.ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    CORGA.lenis = lenis;
  }
  if (gsapReady) gsap.registerPlugin(ScrollTrigger);

  /* ---------- 4. el recorrido: en qué parada estás ---------- */
  let puntos = [], sActual = -1;
  CORGA.estado = CORGA.estado || { s: 0, estacion: null, sobria: raiz.classList.contains('sobria') };
  function medirPuntos() {
    const vh = altoVista;
    puntos = $$('[data-parada]').map(el => {
      let y;
      if (el.dataset.en != null) {
        const sec = el.closest('.parada');
        y = sec.getBoundingClientRect().top + scrollY + (+el.dataset.en) * (sec.offsetHeight - vh);
      } else y = el.getBoundingClientRect().top + scrollY - vh / 2;
      return { k: +el.dataset.parada, y: Math.max(0, y), el };
    }).sort((a, b) => a.y - b.y);
    recorrido(true);
  }
  function sDe(y) {
    if (!puntos.length) return 0;
    if (y <= puntos[0].y) return puntos[0].k;
    for (let i = 0; i < puntos.length - 1; i++) {
      const a = puntos[i], b = puntos[i + 1];
      if (y <= b.y) return a.k + (b.k - a.k) * ((y - a.y) / Math.max(1, b.y - a.y));
    }
    return puntos[puntos.length - 1].k;
  }
  const hojaEst = $('#estancias .hoja-dentro');
  function recorrido(forzar) {
    const s = sDe(scrollY);
    if (forzar || Math.abs(s - sActual) > 1e-4) {
      sActual = s; CORGA.estado.s = s;
      dispatchEvent(new CustomEvent('corga:recorrido', { detail: { s } }));
    }
    // ¿una hoja tapa la vista? (no se explora ni se ve la hora)
    const r = hojaEst.getBoundingClientRect();
    raiz.dataset.zona = r.top < altoVista * .35 && r.bottom > altoVista * .65 ? 'hoja' : 'mundo';
    $('#cabecera').classList.toggle('fija', scrollY > 40);
  }
  let pendiente = false;
  addEventListener('scroll', () => { if (!pendiente) { pendiente = true; requestAnimationFrame(() => { pendiente = false; recorrido(false); }); } }, { passive: true });
  /** ir a una parada: al scroll en que su punto está en el centro */
  function irA(id) {
    const sec = document.getElementById(id);
    if (!sec) return;
    const p = puntos.find(q => sec.contains(q.el));
    const y = p ? p.y : sec.getBoundingClientRect().top + scrollY;
    if (lenis) lenis.scrollTo(y, { duration: 2.2, easing: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) });
    else scrollTo({ top: y, behavior: reducido ? 'auto' : 'smooth' });
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href').slice(1);
    if (!id || !document.getElementById(id) || a.closest('.estancias-indice') || id === 'contenido') return;
    e.preventDefault();
    cerrarMenu();
    irA(id);
  }));

  /* ---------- 5. menú móvil ---------- */
  const menu = $('#menu'), botonMenu = $('#menu-boton');
  function cerrarMenu() { menu.classList.remove('abierto'); botonMenu.setAttribute('aria-expanded', 'false'); lenis?.start(); }
  botonMenu.addEventListener('click', () => {
    const abrir = !menu.classList.contains('abierto');
    menu.classList.toggle('abierto', abrir);
    botonMenu.setAttribute('aria-expanded', String(abrir));
    if (abrir) lenis?.stop(); else lenis?.start();
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('abierto')) { cerrarMenu(); lenis?.start(); botonMenu.focus(); } });

  /* ---------- 6. titulares partidos ---------- */
  let n = 0;
  $$('[data-partir]').forEach(h => {
    const texto = h.textContent.replace(/\s+/g, ' ').trim();
    h.setAttribute('aria-label', texto);
    const andar = nodo => {
      [...nodo.childNodes].forEach(c => {
        if (c.nodeType === 3) {
          const frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(t => {
            if (!t) return;
            if (/^\s+$/.test(t)) { frag.append(' '); return; }
            const pal = document.createElement('span'); pal.className = 'pal'; pal.setAttribute('aria-hidden', 'true');
            for (const l of t) { const s = document.createElement('span'); s.className = 'let'; s.textContent = l; s.style.setProperty('--i', n++); pal.append(s); }
            frag.append(pal);
          });
          c.replaceWith(frag);
        } else if (c.nodeType === 1) andar(c);
      });
    };
    n = 0; andar(h);
  });
  const verTitulo = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    $$('[data-partir]', e.target).forEach(h => { if (raiz.classList.contains('abierta-cortina') || !h.closest('.llegada-entrada')) h.classList.add('visto'); });
    verTitulo.unobserve(e.target);
  }), { rootMargin: '0px 0px -12% 0px' });
  $$('[data-partir]').forEach(h => verTitulo.observe(h.parentElement));

  /* ---------- 7. fotos que se abren e índice de estancias ---------- */
  const verFotos = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { $$('.foto', e.target).forEach(f => f.classList.add('abierta')); verFotos.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
  $$('.fotos').forEach(f => verFotos.observe(f));
  const enlacesE = $$('[data-estancia]');
  const verEst = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    enlacesE.forEach(a => { const si = a.dataset.estancia === e.target.id; a.classList.toggle('es-actual', si); if (si) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    const activo = enlacesE.find(a => a.dataset.estancia === e.target.id);
    const ind = $('.estancias-indice');
    if (activo && ind.scrollWidth > ind.clientWidth) ind.scrollTo({ left: activo.offsetLeft - 16, behavior: reducido ? 'auto' : 'smooth' });
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('.estancia').forEach(a => verEst.observe(a));
  enlacesE.forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    const t = document.getElementById(a.dataset.estancia);
    const y = t.getBoundingClientRect().top + scrollY - (innerWidth < 760 ? 120 : 90);
    if (lenis) lenis.scrollTo(y, { duration: 1.2 }); else scrollTo({ top: y, behavior: reducido ? 'auto' : 'smooth' });
  }));

  /* ---------- 8. estaciones ---------- */
  const hoy = new Date(), md = (hoy.getMonth() + 1) * 100 + hoy.getDate();
  const estHoy = md >= 321 && md < 621 ? 'primavera' : md >= 621 && md < 923 ? 'verano' : md >= 923 && md < 1221 ? 'otono' : 'invierno';
  function ponerEstacion(est, avisar) {
    $$('[data-estacion]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.estacion === est)));
    $$('[data-texto]').forEach(p => { p.hidden = p.dataset.texto !== est; });
    CORGA.estado.estacion = est;
    if (avisar) dispatchEvent(new CustomEvent('corga:estacion', { detail: { estacion: est } }));
  }
  ponerEstacion(estHoy, false);
  $$('[data-estacion]').forEach(b => b.addEventListener('click', () => ponerEstacion(b.dataset.estacion, true)));

  /* ---------- 9. mapa solo bajo clic ---------- */
  $('#mapa-boton')?.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = `https://www.google.com/maps?q=${C.lat},${C.lon}&z=14&output=embed`;
    f.title = 'Mapa de la ubicación de ejemplo'; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade';
    $('#mapa').replaceChildren(f);
  });

  /* ---------- 10. cookies ---------- */
  const avisoC = $('#cookies');
  if (!leer('corga-cookies-vistas')) { avisoC.hidden = false; raiz.classList.add('cookies-abiertas'); }
  $('#cookies-ok').addEventListener('click', () => { avisoC.hidden = true; raiz.classList.remove('cookies-abiertas'); guardar('corga-cookies-vistas', '1'); });

  /* ---------- 11. MANDO DE MAQUETA (no viaja al cliente) ---------- */
  if (raiz.classList.contains('revision')) {
    const mando = $('#mando'); mando.hidden = false;
    const marcar = () => {
      $$('[data-densidad]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.densidad === 'sobria') === raiz.classList.contains('sobria'))));
      const pal = ['castano', 'sil'].find(p => raiz.classList.contains('paleta-' + p)) || 'mencia';
      $$('[data-paleta]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.paleta === pal)));
    };
    $$('[data-densidad]').forEach(b => b.addEventListener('click', () => {
      const sobria = b.dataset.densidad === 'sobria';
      raiz.classList.toggle('sobria', sobria); guardar('corga-densidad', b.dataset.densidad);
      CORGA.estado.sobria = sobria;
      dispatchEvent(new CustomEvent('corga:densidad', { detail: { sobria } }));
      marcar();
    }));
    $$('[data-paleta]').forEach(b => b.addEventListener('click', () => {
      raiz.classList.remove('paleta-castano', 'paleta-sil');
      if (b.dataset.paleta !== 'mencia') raiz.classList.add('paleta-' + b.dataset.paleta);
      guardar('corga-paleta', b.dataset.paleta); marcar();
    }));
    marcar();
  }
  /* /MANDO DE MAQUETA */

  /* ---------- 12. exploración libre (solo con 3D, tras el botón) ---------- */
  const explorar = $('#explorar'), abrirE = $('#explorar-abrir'), barraE = $('#explorar-barra'), cerrarE = $('#explorar-cerrar');
  addEventListener('corga:3d', () => { explorar.hidden = false; });
  function exploracion(activo) {
    const api = CORGA.mundo && CORGA.mundo.api;
    if (!api) return;
    api.explorar(activo);
    raiz.classList.toggle('explorando', activo);
    barraE.hidden = !activo;
    if (activo) { lenis?.stop(); cerrarE.focus(); } else { lenis?.start(); abrirE.focus(); }
  }
  // si el 3D se pierde o falla mientras se explora, se deshace la exploración (scroll de nuevo activo)
  addEventListener('corga:sin-3d', () => {
    if (!raiz.classList.contains('explorando')) return;
    raiz.classList.remove('explorando'); barraE.hidden = true; lenis?.start();
  });
  abrirE.addEventListener('click', () => exploracion(true));
  cerrarE.addEventListener('click', () => exploracion(false));
  addEventListener('keydown', e => { if (e.key === 'Escape' && raiz.classList.contains('explorando')) exploracion(false); });

  /* ---------- 13. cursor propio (solo ratón) ---------- */
  if (matchMedia('(pointer: fine)').matches) {
    const cur = $('.cursor'), punto = $('.cursor-punto'), aro = $('.cursor-aro');
    let x = -100, y = -100, ax = -100, ay = -100, vivo = false;
    const paso = () => {
      ax += (x - ax) * .2; ay += (y - ay) * .2;
      aro.style.transform = `translate3d(${ax}px, ${ay}px, 0)`;
      if (Math.abs(x - ax) + Math.abs(y - ay) > .3) requestAnimationFrame(paso); else vivo = false;
    };
    addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      raiz.classList.add('con-cursor');
      cur.classList.remove('fuera');
      x = e.clientX; y = e.clientY;
      punto.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (!vivo) { vivo = true; requestAnimationFrame(paso); }
      cur.classList.toggle('activo', !!e.target.closest('a, button, select, label, [role="button"], .cal-dia'));
    }, { passive: true });
    document.addEventListener('mouseleave', () => cur.classList.add('fuera'));
  }

  /* ---------- 14. la cortina ---------- */
  const cortina = $('#cortina');
  let abierta = false;
  function alAbrirse() {
    if (abierta) return; abierta = true;
    raiz.classList.add('abierta-cortina');
    $$('.llegada-entrada [data-partir]').forEach(h => h.classList.add('visto'));
  }
  function retirar() {
    clearTimeout(window.__cortinaRed);
    alAbrirse();
    cortina.hidden = true;
    raiz.classList.add('cortina-fuera');
    try { sessionStorage.setItem('corga-cortina', '1'); } catch (e) { /* nada */ }
    if (gsapReady) { gsap.ticker.lagSmoothing(0); ScrollTrigger.refresh(); }
    if (scrollY > 0 && !location.hash) { if (lenis) lenis.scrollTo(0, { immediate: true }); else scrollTo(0, 0); }
    medirPuntos();
  }
  if (!motion || raiz.classList.contains('sin-cortina')) retirar();
  else {
    const rio = $('.cortina-rio'), casa = $('.cortina-casa path'), nombre = $$('.cortina-nombre span'), pie = $('.cortina-pie');
    gsap.set(rio, { strokeDashoffset: 1 }); gsap.set(casa, { strokeDashoffset: 1 });
    gsap.set(nombre, { y: 0, yPercent: 115 }); gsap.set(pie, { opacity: 0, letterSpacing: '.7em' });
    const tl = gsap.timeline({ delay: .15, onComplete: retirar });
    tl.to(rio, { strokeDashoffset: 0, duration: 1.15, ease: 'power2.inOut', autoRound: false })
      .to(casa, { strokeDashoffset: 0, duration: .55, ease: 'power2.out', autoRound: false }, 1.0)
      .to(nombre, { yPercent: 0, duration: .8, ease: 'expo.out', stagger: .08 }, .8)
      .to(pie, { opacity: 1, letterSpacing: '.32em', duration: .9, ease: 'power3.out' }, 1.05)
      .add(alAbrirse, 1.85)
      .to(cortina, { yPercent: -100, duration: 1.05, ease: 'expo.inOut' }, 1.85)
      .to('.cortina-dentro', { yPercent: 16, duration: 1.05, ease: 'expo.inOut' }, 1.85)
      .fromTo('.cortina-borde', { scaleY: 1 }, { scaleY: 0, transformOrigin: '50% 0%', duration: 1.05, ease: 'expo.inOut', immediateRender: false }, 1.85);
    const deprisa = () => tl.timeScale(3.2);
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(ev => addEventListener(ev, deprisa, { once: true, passive: true }));
    setTimeout(() => { if (!raiz.classList.contains('cortina-fuera')) { tl.kill(); retirar(); } }, 6500);
  }

  /* ---------- 15. medir y re-medir ---------- */
  medirPuntos();
  document.fonts?.ready.then(medirPuntos);
  addEventListener('load', medirPuntos);
  new ResizeObserver(() => medirPuntos()).observe($('main'));
  addEventListener('resize', () => {
    // la barra del móvil (solo cambia el alto, poco): no se rehace nada
    if (innerWidth === anchoVista && Math.abs(innerHeight - altoVista) < 160) return;
    anchoVista = innerWidth; altoVista = innerHeight;
    medirPuntos();
    if (gsapReady) ScrollTrigger.refresh();
  });
})();
