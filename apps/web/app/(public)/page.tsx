import Link from 'next/link';
import { ButtonLink } from '@/components/ui';
import { Wordmark } from '@/components/landing/Wordmark';
import {
  HeroPlanograma,
  PanelAnalitica,
  PanelFactura,
  PlanogramaDetalle,
} from '@/components/landing/LandingVisuals';

export const dynamic = 'force-dynamic';

/**
 * El eje de la página es la cadencia real de uso que describe el briefing:
 * el espacio se dibuja una vez, el catálogo se sube una vez al año y las
 * ventas una vez a la semana. Es lo que distingue a esta herramienta de una
 * hoja de cálculo, así que estructura la página.
 */
const CADENCIA = [
  {
    frecuencia: 'Una vez en la vida',
    titulo: 'Dibuja tu espacio',
    texto:
      'Góndolas, islas, corners o tienda completa. Indicas columnas, baldas y alturas, y el diagrama se genera solo. No hace falta subir fotos.',
  },
  {
    frecuencia: 'Una vez al año',
    titulo: 'Sube tu catálogo',
    texto:
      'Un CSV con EAN, precio, margen y stock. Cartistry lo valida línea a línea y te dice qué falta antes de guardar nada.',
  },
  {
    frecuencia: 'Una vez a la semana',
    titulo: 'Sube tus ventas',
    texto:
      'El planograma se recalcula con las ventas de la semana. Cada lunes sabes qué mover, qué reponer y qué liquidar.',
  },
];

const PLANES = [
  {
    nombre: 'Visual',
    precio: '39',
    resumen: 'Coloca el producto donde vende.',
    incluye: [
      'Planogramas por espacio',
      'Mapa de calor por posición',
      '26 reglas de visual merchandising',
      'Exportación a PDF con EAN y posición',
    ],
    cta: 'Empezar',
    href: '/registro',
    destacado: false,
  },
  {
    nombre: 'Visual + Analítica',
    precio: '89',
    resumen: 'Decide con tus ventas, no con tu intuición.',
    incluye: [
      'Todo lo de Visual',
      'Sell-through, rotación y margen real',
      'Análisis ABC y forecast de temporada',
      'Comparativa entre tiendas',
    ],
    cta: 'Probar 14 días',
    href: '/registro',
    destacado: true,
  },
  {
    nombre: 'Suite',
    precio: '179',
    resumen: 'Del lineal a la caja, sin cambiar de herramienta.',
    incluye: [
      'Todo lo de Analítica',
      'Facturación conforme a normativa española',
      'Caja, apertura y cierre',
      'Trazabilidad de venta a posición',
    ],
    cta: 'Hablar con ventas',
    href: '/registro',
    destacado: false,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* ---------------------------------------------------------------- */}
      <header className="sticky top-0 z-50 bg-paper/90 backdrop-blur border-b border-line">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
          <Link href="/" className="shrink-0">
            <Wordmark />
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#como" className="eyebrow hover:text-ink transition-colors">
              Cómo funciona
            </a>
            <a href="#mide" className="eyebrow hover:text-ink transition-colors">
              Qué mide
            </a>
            <a href="#precios" className="eyebrow hover:text-ink transition-colors">
              Precios
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden sm:inline-flex h-8 items-center px-3 text-[13px] text-ink-2 hover:text-ink transition-colors"
            >
              Iniciar sesión
            </Link>
            <ButtonLink href="/registro" size="sm">
              Crear cuenta
            </ButtonLink>
          </div>
        </div>
      </header>

      {/* --- Tesis ------------------------------------------------------- */}
      <section className="px-6 pt-14 pb-16 md:pt-20 md:pb-24">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-12 lg:gap-16 items-center">
          <div className="animate-rise-in">
            <p className="eyebrow">Visual merchandising · medido</p>
            <h1 className="font-display font-extrabold text-[clamp(2.5rem,6vw,4.25rem)] leading-[0.94] tracking-tightest mt-5">
              El lineal es un
              <br />
              instrumento
              <br />
              de medida.
            </h1>
            <p className="text-[15px] leading-relaxed text-ink-2 mt-6 max-w-md text-pretty">
              Sube tu surtido y tus ventas. Cartistry aplica 26 reglas de visual
              merchandising y devuelve un planograma con cada producto en su
              posición, coloreado por lo que vende.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <ButtonLink href="/registro" size="lg">
                Cargar mi surtido
              </ButtonLink>
              <ButtonLink href="#mide" variant="secondary" size="lg">
                Ver un planograma
              </ButtonLink>
            </div>
            <p className="font-mono text-[11px] text-ink-3 mt-5">
              Primer planograma en menos de 10 minutos.
            </p>
          </div>

          <div className="animate-rise-in [animation-delay:120ms]">
            <HeroPlanograma />
          </div>
        </div>
      </section>

      {/* --- Cadencia ---------------------------------------------------- */}
      <section id="como" className="px-6 py-16 border-t border-line bg-surface">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display font-bold text-[clamp(1.75rem,3.5vw,2.5rem)] leading-tight tracking-tighter max-w-lg">
            Tres cargas de datos. El resto lo calcula la herramienta.
          </h2>
          <p className="text-sm text-ink-2 mt-3 max-w-md">
            Cada dato tiene su ritmo. Cartistry solo te pide lo que ha cambiado.
          </p>

          <div className="grid md:grid-cols-3 gap-px bg-line mt-10">
            {CADENCIA.map((paso) => (
              <div
                key={paso.titulo}
                className="bg-surface pt-6 pb-8 md:px-6 md:pt-8 md:first:pl-0 md:last:pr-0"
              >
                <div className="shelf-rule mb-5" />
                <p className="eyebrow text-ink">{paso.frecuencia}</p>
                <h3 className="font-display font-semibold text-xl mt-3">{paso.titulo}</h3>
                <p className="text-sm text-ink-2 leading-relaxed mt-2 text-pretty">
                  {paso.texto}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Qué mide: planograma ---------------------------------------- */}
      <section id="mide" className="px-6 py-16 md:py-20 border-t border-line">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 md:gap-14 items-center">
          <div>
            <p className="eyebrow">Colocación</p>
            <h2 className="font-display font-bold text-[clamp(1.75rem,3.5vw,2.5rem)] leading-tight tracking-tighter mt-4">
              Cada posición tiene un color y una razón.
            </h2>
            <p className="text-[15px] text-ink-2 leading-relaxed mt-4 text-pretty">
              El azul es capital parado; el rojo, lo que se vende solo. La regla
              que ha decidido cada colocación queda escrita en la ficha, así que
              puedes discutirla o cambiarla. El PDF que llevas a tienda lleva EAN,
              posición y número de facings.
            </p>
          </div>
          <PlanogramaDetalle />
        </div>
      </section>

      {/* --- Qué mide: analítica ----------------------------------------- */}
      <section className="px-6 py-16 md:py-20 border-t border-line bg-surface">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 md:gap-14 items-center">
          <PanelAnalitica />
          <div className="md:order-first">
            <p className="eyebrow">Lectura</p>
            <h2 className="font-display font-bold text-[clamp(1.75rem,3.5vw,2.5rem)] leading-tight tracking-tighter mt-4">
              Sabes cuánto capital tienes parado en la balda de abajo.
            </h2>
            <p className="text-[15px] text-ink-2 leading-relaxed mt-4 text-pretty">
              Sell-through, rotación, margen real y análisis ABC por producto,
              categoría, color y temporada. Las mismas cifras que alimentan el
              planograma, sin exportar nada a otra hoja.
            </p>
          </div>
        </div>
      </section>

      {/* --- Qué mide: suite --------------------------------------------- */}
      <section className="px-6 py-16 md:py-20 border-t border-line">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 md:gap-14 items-center">
          <div>
            <p className="eyebrow">Cierre</p>
            <h2 className="font-display font-bold text-[clamp(1.75rem,3.5vw,2.5rem)] leading-tight tracking-tighter mt-4">
              La venta vuelve a la posición de la que salió.
            </h2>
            <p className="text-[15px] text-ink-2 leading-relaxed mt-4 text-pretty">
              Emite facturas conforme a la normativa española y gestiona la caja
              desde la misma plataforma. Cada línea de factura queda unida a su
              producto y a la posición del lineal donde estaba.
            </p>
          </div>
          <PanelFactura />
        </div>
      </section>

      {/* --- Banda de cifras --------------------------------------------- */}
      <section className="bg-ink text-surface px-6 py-14">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-10 sm:gap-6">
          <Cifra valor="26" etiqueta="Reglas de VM aplicadas" />
          <Cifra valor="10 min" etiqueta="Del CSV al primer planograma" />
          <Cifra valor="1" etiqueta="Herramienta para todo el ciclo" />
        </div>
      </section>

      {/* --- Precios ------------------------------------------------------ */}
      <section id="precios" className="px-6 py-16 md:py-20 border-b border-line">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-lg">
            <p className="eyebrow">Precios</p>
            <h2 className="font-display font-bold text-[clamp(1.75rem,3.5vw,2.5rem)] leading-tight tracking-tighter mt-4">
              Por tienda y al mes. Sin permanencia.
            </h2>
            <p className="text-sm text-ink-2 mt-3">
              Descuento por volumen y por pago anual.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-line mt-10">
            {PLANES.map((plan) => (
              <div
                key={plan.nombre}
                className={
                  plan.destacado
                    ? 'bg-surface p-6 relative flex flex-col shadow-[inset_0_0_0_2px_var(--ink)]'
                    : 'bg-surface p-6 relative flex flex-col'
                }
              >
                {plan.destacado ? (
                  <span className="absolute -top-px left-6 bg-ink text-surface font-mono text-[10px] uppercase tracking-[0.12em] px-2 py-1">
                    El más elegido
                  </span>
                ) : null}
                <p className="eyebrow mt-3">{plan.nombre}</p>
                <p className="metric text-[38px] mt-3">
                  {plan.precio}
                  <span className="font-mono text-[13px] font-normal text-ink-3 ml-1 tracking-normal">
                    € / mes
                  </span>
                </p>
                <p className="text-sm text-ink-2 mt-3">{plan.resumen}</p>
                <div className="shelf-rule my-5" />
                <ul className="space-y-2 flex-1">
                  {plan.incluye.map((linea) => (
                    <li key={linea} className="flex gap-2.5 text-[13px] text-ink-2">
                      <span className="font-mono text-ink-3 mt-px" aria-hidden>
                        ·
                      </span>
                      <span>{linea}</span>
                    </li>
                  ))}
                </ul>
                <ButtonLink
                  href={plan.href}
                  variant={plan.destacado ? 'primary' : 'secondary'}
                  className="w-full mt-6"
                >
                  {plan.cta}
                </ButtonLink>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Cierre -------------------------------------------------------- */}
      <section className="px-6 py-20 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="font-display font-bold text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.05] tracking-tighter">
            Tu próxima temporada ya está en los datos de esta.
          </h2>
          <p className="text-sm text-ink-2 mt-4">
            Carga tu surtido y obtén el primer planograma hoy.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mt-7">
            <ButtonLink href="/registro" size="lg">
              Crear cuenta
            </ButtonLink>
            <ButtonLink href="/login" variant="secondary" size="lg">
              Iniciar sesión
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* --- Pie ----------------------------------------------------------- */}
      <footer className="border-t border-line px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <Wordmark />
          <p className="font-mono text-[11px] text-ink-3">Cartistry · 2026</p>
        </div>
      </footer>
    </div>
  );
}

function Cifra({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div>
      <p className="metric text-[44px] text-surface">{valor}</p>
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/55 mt-2">
        {etiqueta}
      </p>
    </div>
  );
}
