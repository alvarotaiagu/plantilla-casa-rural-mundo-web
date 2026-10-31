# Créditos

> **Sitio de demostración.** «Casa da Corga» es un negocio ficticio. Las fotografías de las
> estancias son de archivo, se marcan en la web como «Foto de ejemplo» y no retratan ninguna
> casa real.

## El mundo 3D y el plan B

- **Relieve MDT05 y ortofoto PNOA** © [Instituto Geográfico Nacional](https://www.ign.es/),
  licencia [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.es). Descargados por
  WCS (`servicios.idee.es/wcs-inspire/mdt`, cobertura `Elevacion4258_5`) y WMS
  (`www.ign.es/wms-inspire/pnoa-ma`, capa `OI.OrthoimageCoverage`) con `scripts/terreno.py`.
  Se citan en el pie de la web. La casa, el patio pintado sobre la ortofoto, los muros, las
  cepas, los árboles y el camino son añadidos y **no existen** en ese lugar.
- **Distancias por carretera**: [OSRM](https://project-osrm.org/) sobre datos ©
  [colaboradores de OpenStreetMap](https://www.openstreetmap.org/copyright) (ODbL). Coordenadas
  de los lugares: OpenStreetMap (Overpass), 2026-10-31.
- **Sol y luna**: fórmulas de [SunCalc](https://github.com/mourner/suncalc) (V. Agafonkin,
  licencia BSD-2), reescritas en `js/mundo/sol.js`.
- **Three.js r160** (MIT), autoalojado en `js/mundo/vendor/`.

## Fotografías de las estancias (Pexels)

Todas bajo la [licencia de Pexels](https://www.pexels.com/es-es/license/): uso libre, también
comercial, sin atribución obligatoria (se acredita igualmente). Descargadas al repositorio a
2000 px, recortadas a 3:2 con una gradación común y servidas a 800 y 1600 px.

| Archivo | Estancia | Autoría | Página |
|---|---|---|---|
| `salon-*` | Salón de la lareira | Max Vakhtbovych | https://www.pexels.com/photo/7174392/ |
| `cocina-*` | Cocina | Anna McDonald | https://www.pexels.com/photo/21287221/ |
| `bacelo-*` | O Bacelo | hello aesthe | https://www.pexels.com/photo/15692775/ |
| `lousa-*` | A Lousa | Goodlot Dupwa | https://www.pexels.com/photo/9130978/ |
| `solaina-*` | A Solaina | Ahmed Aqeely | https://www.pexels.com/photo/14465274/ |
| `faiado-*` | O Faiado | Max Vakhtbovych | https://www.pexels.com/photo/7746578/ |
| `bano-*` | Baños | Max Vakhtbovych | https://www.pexels.com/photo/6957082/ |

Ninguna foto muestra personas.

## Lo que no es fotografía

Hecho para esta plantilla: el logotipo (tejado con chimenea sobre el río), los iconos de
servicios, la casa (generada pieza a pieza en `js/mundo/casa-modelo.js`), el horizonte del plan
B (calculado del MDT05 desde el patio) y la imagen `img/og.jpg` (ortofoto PNOA + rótulo).

## Tipografías

[Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif), [Geist](https://fonts.google.com/specimen/Geist)
y [Geist Mono](https://fonts.google.com/specimen/Geist+Mono), SIL Open Font License 1.1.
