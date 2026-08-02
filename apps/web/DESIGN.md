# Sistema de diseño — Cartistry

Dirección: **instrumento de retail**. Tinta sobre papel, cifras en mono, cantos
vivos. La interfaz se comporta como un aparato de medida: está callada hasta
que hay algo que atender.

## La regla que gobierna el color

**El color significa rendimiento.** La única gama cromática del producto es la
escala de calor del planograma. Si algo tiene color, es un dato; si es cromo
decorativo, sobra.

| Peldaño | Hex | Significado |
|---|---|---|
| `heat-0` | `#1F4E79` | Capital parado |
| `heat-1` | `#5B93B5` | Rotación baja |
| `heat-2` | `#D9D3BC` | Templado |
| `heat-3` | `#E0A03C` | Rotación alta |
| `heat-4` | `#C2402F` | Best seller |

Fuera de la escala solo existen dos señales, y se encienden únicamente cuando
hay que hacer algo: `signal` (`#E0A03C`, revisar) y `danger` (`#C2402F`,
actuar). `positive` (`#2F6F5E`) se reserva para variaciones al alza. El estado
correcto no lleva color: va en tinta.

## Papel y tinta

`paper #EDEDE8` · `surface #FFFFFF` · `sunk #E3E3DD` · `line #D6D6CF` ·
`line-strong #B4B4AB` · `ink #15171A` · `ink-2 #585C63` · `ink-3 #8B8F96`

Los alias `cartistry-*` siguen existiendo y apuntan a estos valores, así que el
código antiguo hereda el sistema sin tocarlo.

## Tipografía

| Rol | Familia | Uso |
|---|---|---|
| Display | Bricolage Grotesque | Titulares y cifras. Tracking negativo. |
| Texto | Instrument Sans | Párrafos, botones, etiquetas de formulario. |
| Dato | IBM Plex Mono | EAN, posiciones, importes, ejes, eyebrows. Cifras tabulares. |

`font-serif` está redirigido a la display: los titulares ya escritos heredan la
tipografía nueva.

## Piezas de CSS

- `.eyebrow` — etiqueta en mono, versalitas, `ink-3`. Es la voz del sistema.
- `.shelf-rule` — divisor con marca de canto a la izquierda. Sustituye a `<hr>`.
- `.facing` / `.facing-grid` — el motivo firma: una posición del lineal.
  `data-heat="0…4"` la colorea, `data-heat="empty"` la deja como hueco.
- `.grid-paper` — retícula tenue de planta, solo para zonas vacías.
- `.metric` — cifra grande: display, tracking cerrado, tabular.
- `.skeleton` — carga.

## Primitivos

`@/components/ui` — `Button` / `ButtonLink`, `Card` / `CardHeader`,
`PageHeader`, `Kpi` / `KpiRow`, `DataTable` / `Th` / `Td` / `Tr`, `Field` /
`Input` / `Select` / `Textarea`, `Badge`, `Alert`, `EmptyState` /
`LoadingBlock`, `FacingGrid` / `HeatLegend` / `Sparkbars` / `heatFrom`.

Toda página del dashboard abre con:

```tsx
<main className="px-6 py-10 lg:px-10 lg:py-12">
  <div className="max-w-6xl mx-auto space-y-6">
    <PageHeader label="Analítica" title="Margen" actions={…} />
    …
  </div>
</main>
```

## Escritura

Frase en mayúscula inicial, verbos activos, sin emoji. Un control dice lo que
pasa al pulsarlo y mantiene ese nombre en todo el flujo. Los errores explican
qué ha pasado y cómo salir; no se disculpan. Una pantalla vacía es una
invitación a actuar, no un aviso de ausencia.

## Suelo de calidad

Responsive hasta 390 px, foco visible en tinta (`:focus-visible`),
`prefers-reduced-motion` respetado, cifras tabulares en toda tabla.
