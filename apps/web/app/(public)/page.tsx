import Link from 'next/link';
import {
  PlanogramHeatmap,
  PlanogramSection,
  AnaliticaSection,
  FacturacionSection,
} from '@/components/landing/LandingVisuals';

export default function Home() {
  return (
    <main className="min-h-screen bg-cartistry-bg text-cartistry-text">
      {/* Header */}
      <header className="bg-cartistry-surface border-b border-cartistry-border sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-serif font-bold text-cartistry-text">
            <span style={{ color: '#9a7b4f' }}>●</span> CARTISTRY
          </h1>
          <div className="flex gap-4 items-center">
            <nav className="hidden md:flex gap-5 text-xs text-cartistry-text-secondary">
              <a href="#productos" className="hover:text-cartistry-text transition">Productos</a>
              <a href="#como" className="hover:text-cartistry-text transition">Cómo funciona</a>
              <a href="#precios" className="hover:text-cartistry-text transition">Precios</a>
              <a href="#resultados" className="hover:text-cartistry-text transition">Resultados</a>
            </nav>
            <div className="flex gap-2">
              <Link
                href="/login"
                className="px-3 py-1.5 text-xs border border-cartistry-border text-cartistry-text rounded hover:bg-cartistry-surface transition"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/registro"
                className="px-3 py-1.5 text-xs bg-cartistry-text text-cartistry-bg rounded font-medium hover:opacity-90 transition"
              >
                Registrarse
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-[1fr_1.05fr] gap-10 items-center">
          <div>
            <div className="inline-block">
              <span className="text-[10px] font-bold uppercase tracking-widest border border-cartistry-border rounded-full px-3 py-1.5 mb-4 inline-block" style={{ color: '#9a7b4f' }}>
                ◆ Del lineal a la caja, guiado por datos
              </span>
            </div>
            <h2 className="font-serif font-bold leading-tight text-5xl mt-2">
              El arte de comprar,
              <br />
              <span className="italic" style={{ color: '#9a7b4f' }}>convertido en ciencia.</span>
            </h2>
            <p className="text-cartistry-text-secondary text-sm leading-relaxed mt-5 max-w-md">
              Coloca, entiende y cobra desde una sola plataforma. Cartistry cruza tus ventas
              con 26 reglas de visual merchandising y colorea cada producto según lo que vende.
            </p>
            <div className="flex gap-3 mt-6">
              <Link
                href="/registro"
                className="px-5 py-2.5 bg-cartistry-text text-cartistry-bg rounded-md font-medium text-sm hover:opacity-90 transition"
              >
                Probar con mis datos →
              </Link>
              <button className="px-5 py-2.5 border border-cartistry-border text-cartistry-text rounded-md font-medium text-sm hover:bg-cartistry-surface transition">
                Ver demo
              </button>
            </div>
          </div>
          <PlanogramHeatmap />
        </div>
      </section>

      {/* Una plataforma, tres niveles */}
      <section id="productos" className="bg-white border-y border-cartistry-border py-10 px-6">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-center font-serif text-3xl mb-1">
            Una plataforma, <span className="italic" style={{ color: '#9a7b4f' }}>tres niveles.</span>
          </h3>
          <p className="text-center text-xs text-cartistry-text-secondary mb-6">
            Empieza colocando. Crece entendiendo. Termina cobrando.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="border border-cartistry-border rounded-lg p-4" style={{ background: '#faf8f4' }}>
              <p className="text-[10px] tracking-wider mb-1" style={{ color: '#9a7b4f' }}>01 · COLOCA</p>
              <p className="font-serif font-bold text-base mb-1">Visual</p>
              <p className="text-xs text-cartistry-text-secondary leading-relaxed">
                Planogramas y mapa de calor para que cada lineal venda más.
              </p>
            </div>
            <div
              className="rounded-lg p-4 relative bg-white"
              style={{ border: '2px solid #9a7b4f' }}
            >
              <span
                className="absolute -top-2.5 left-4 text-[8px] tracking-wider px-2 py-0.5 rounded-full text-white"
                style={{ background: '#9a7b4f' }}
              >
                ★ EL MÁS ELEGIDO
              </span>
              <p className="text-[10px] tracking-wider mb-1" style={{ color: '#9a7b4f' }}>02 · ENTIENDE</p>
              <p className="font-serif font-bold text-base mb-1">Visual + Analítica</p>
              <p className="text-xs text-cartistry-text-secondary leading-relaxed">
                Tus ventas, márgenes y rotación guían cada decisión.
              </p>
            </div>
            <div className="border border-cartistry-border rounded-lg p-4" style={{ background: '#faf8f4' }}>
              <p className="text-[10px] tracking-wider mb-1" style={{ color: '#9a7b4f' }}>03 · COBRA</p>
              <p className="font-serif font-bold text-base mb-1">Suite</p>
              <p className="text-xs text-cartistry-text-secondary leading-relaxed">
                Factura y cobra sin salir de la plataforma.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sección 01 · Visual */}
      <section id="como" className="py-12 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-[10px] tracking-widest font-bold mb-2" style={{ color: '#9a7b4f' }}>
              01 · VISUAL
            </p>
            <h3 className="font-serif text-3xl leading-tight mb-3">
              Coloca el producto <span className="italic" style={{ color: '#9a7b4f' }}>donde vende.</span>
            </h3>
            <p className="text-sm text-cartistry-text-secondary leading-relaxed">
              Sube tu surtido y obtén un planograma accionable con las 26 reglas de visual
              merchandising. El mapa de calor te muestra qué posición convierte y cuál
              desaprovecha espacio premium. Exporta a PDF con EAN y posición, listo para tienda.
            </p>
          </div>
          <PlanogramSection />
        </div>
      </section>

      {/* Sección 02 · Visual + Analítica */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <AnaliticaSection />
          <div>
            <p className="text-[10px] tracking-widest font-bold mb-2" style={{ color: '#9a7b4f' }}>
              02 · VISUAL + ANALÍTICA
            </p>
            <h3 className="font-serif text-3xl leading-tight mb-3">
              Decisiones con datos, <span className="italic" style={{ color: '#9a7b4f' }}>no corazonadas.</span>
            </h3>
            <p className="text-sm text-cartistry-text-secondary leading-relaxed">
              Ventas por producto, categoría y periodo. Sell-through, rotación, márgenes reales
              y forecast de objetivos. El planograma se construye sobre tus datos, no sobre
              estimaciones. Sabes qué reforzar, qué liquidar y cuánto capital tienes parado.
            </p>
          </div>
        </div>
      </section>

      {/* Sección 03 · Suite */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-[10px] tracking-widest font-bold mb-2" style={{ color: '#9a7b4f' }}>
              03 · SUITE
            </p>
            <h3 className="font-serif text-3xl leading-tight mb-3">
              Del lineal <span className="italic" style={{ color: '#9a7b4f' }}>a la caja.</span>
            </h3>
            <p className="text-sm text-cartistry-text-secondary leading-relaxed">
              Emite facturas y gestiona cobros desde la misma plataforma, conforme a la normativa
              española. Cada venta conecta con su producto, su posición en el lineal y su factura.
              Una sola herramienta para todo el ciclo.
            </p>
          </div>
          <FacturacionSection />
        </div>
      </section>

      {/* Stats bar */}
      <section className="text-cartistry-bg py-8 px-6" style={{ background: '#1a1714' }}>
        <div className="max-w-6xl mx-auto grid grid-cols-3 gap-6 text-center">
          <div>
            <div className="font-serif font-bold text-3xl" style={{ color: '#c9b48d' }}>+220%</div>
            <div className="text-[10px] tracking-widest mt-1" style={{ color: '#a89e8d' }}>
              MEJORA DE INGRESOS
            </div>
          </div>
          <div>
            <div className="font-serif font-bold text-3xl" style={{ color: '#c9b48d' }}>26</div>
            <div className="text-[10px] tracking-widest mt-1" style={{ color: '#a89e8d' }}>
              REGLAS DE VM APLICADAS
            </div>
          </div>
          <div>
            <div className="font-serif font-bold text-3xl" style={{ color: '#c9b48d' }}>1</div>
            <div className="text-[10px] tracking-widest mt-1" style={{ color: '#a89e8d' }}>
              HERRAMIENTA, TODO EL CICLO
            </div>
          </div>
        </div>
      </section>

      {/* Brands */}
      <section id="resultados" className="py-6 px-6 border-b border-cartistry-border">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-[10px] tracking-widest text-cartistry-text-secondary mb-3">
            EQUIPOS DE RETAIL QUE YA OPERAN CON DATOS
          </p>
          <div className="flex justify-between font-serif text-sm text-cartistry-text-secondary">
            <span>Maison Alba</span>
            <span>NORDÉ</span>
            <span>Ferrer &amp; Co.</span>
            <span>Jeroconeca</span>
            <span>CASA 17</span>
          </div>
        </div>
      </section>

      {/* Precios */}
      <section id="precios" className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-center font-serif text-3xl mb-1">
            Precios <span className="italic" style={{ color: '#9a7b4f' }}>que crecen contigo.</span>
          </h3>
          <p className="text-center text-xs text-cartistry-text-secondary mb-8">
            Mensual por tienda. Sin permanencia. Descuento por volumen y anual.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {/* Visual */}
            <div className="border border-cartistry-border rounded-lg p-5 bg-white">
              <p className="font-serif font-bold text-base">Visual</p>
              <div className="my-2">
                <span className="font-serif font-bold text-3xl">39€</span>
                <span className="text-[10px] text-cartistry-text-secondary"> /mes · tienda</span>
              </div>
              <ul className="text-xs text-cartistry-text-secondary leading-relaxed space-y-1">
                <li>✓ Planogramas</li>
                <li>✓ Mapa de calor</li>
                <li>✓ Exportación PDF + EAN</li>
                <li>✓ 26 reglas de VM</li>
              </ul>
              <Link
                href="/registro"
                className="block text-center mt-4 border border-cartistry-border rounded-md py-2 text-xs hover:bg-cartistry-bg transition"
              >
                Empezar
              </Link>
            </div>

            {/* Visual + Analítica */}
            <div
              className="rounded-lg p-5 bg-white relative"
              style={{ border: '2px solid #9a7b4f' }}
            >
              <span
                className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[8px] tracking-wider px-2 py-0.5 rounded-full text-white whitespace-nowrap"
                style={{ background: '#9a7b4f' }}
              >
                ★ EL MÁS ELEGIDO
              </span>
              <p className="font-serif font-bold text-base">Visual + Analítica</p>
              <div className="my-2">
                <span className="font-serif font-bold text-3xl">89€</span>
                <span className="text-[10px] text-cartistry-text-secondary"> /mes · tienda</span>
              </div>
              <ul className="text-xs text-cartistry-text-secondary leading-relaxed space-y-1">
                <li>✓ Todo lo de Visual</li>
                <li>✓ Dashboard de analítica</li>
                <li>✓ Sell-through y márgenes</li>
                <li>✓ Forecast y temporadas</li>
              </ul>
              <Link
                href="/registro"
                className="block text-center mt-4 rounded-md py-2 text-xs font-medium hover:opacity-90 transition text-cartistry-bg"
                style={{ background: '#1a1714' }}
              >
                Probar 14 días
              </Link>
            </div>

            {/* Suite */}
            <div className="border border-cartistry-border rounded-lg p-5 bg-white">
              <p className="font-serif font-bold text-base">Suite</p>
              <div className="my-2">
                <span className="font-serif font-bold text-3xl">179€</span>
                <span className="text-[10px] text-cartistry-text-secondary"> /mes · tienda</span>
              </div>
              <ul className="text-xs text-cartistry-text-secondary leading-relaxed space-y-1">
                <li>✓ Todo lo de Analítica</li>
                <li>✓ Facturación integrada</li>
                <li>✓ Gestión de cobros</li>
                <li>✓ Ciclo completo trazable</li>
              </ul>
              <Link
                href="/registro"
                className="block text-center mt-4 border border-cartistry-border rounded-md py-2 text-xs hover:bg-cartistry-bg transition"
              >
                Hablar con ventas
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="text-cartistry-bg py-12 px-6 text-center" style={{ background: '#1a1714' }}>
        <h3 className="font-serif text-3xl">Tu siguiente temporada</h3>
        <h3 className="font-serif text-3xl italic mb-3" style={{ color: '#c9b48d' }}>
          ya está en tus datos.
        </h3>
        <p className="text-xs max-w-md mx-auto mb-5" style={{ color: '#cfc6b6' }}>
          Carga tu surtido y obtén tu primer planograma en menos de 10 minutos.
          Sin tarifas, sin compromiso.
        </p>
        <button
          className="px-6 py-2.5 rounded-md text-sm font-medium hover:opacity-90 transition"
          style={{ background: '#f4f0e9', color: '#1a1714' }}
        >
          Agenda tu demo
        </button>
      </section>

      {/* Footer */}
      <footer className="bg-cartistry-surface border-t border-cartistry-border py-6 text-center text-xs text-cartistry-text-secondary">
        Cartistry MVP — 2026
      </footer>
    </main>
  );
}
