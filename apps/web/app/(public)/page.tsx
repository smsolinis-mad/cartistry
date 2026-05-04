import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-cartistry-surface border-b border-cartistry-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-serif font-bold text-cartistry-text">Cartistry</h1>
          </div>
          <Link
            href="/login"
            className="px-6 py-2 bg-cartistry-cta text-cartistry-cta-text rounded font-medium hover:opacity-90 transition"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-6 py-20 text-center">
        <div className="max-w-2xl space-y-6">
          <h2 className="text-5xl font-serif font-bold text-cartistry-text">
            El arte de exponer, convertido en ciencia
          </h2>
          <p className="text-lg text-cartistry-text-secondary leading-relaxed">
            Optimiza el visual merchandising de tu tienda con decisiones basadas en datos.
            Sin instalaciones, sin formación técnica, accesible para cualquier tipo de espacio.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Link
              href="/login"
              className="px-8 py-3 bg-cartistry-cta text-cartistry-cta-text rounded font-medium hover:opacity-90 transition"
            >
              Comienza aquí
            </Link>
            <button className="px-8 py-3 border border-cartistry-accent text-cartistry-accent rounded font-medium hover:bg-cartistry-surface transition">
              Saber más
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-cartistry-surface border-t border-cartistry-border py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-serif font-bold text-center text-cartistry-text mb-12">
            Por qué Cartistry
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: 'Fácil de usar', desc: 'Sin instalaciones, sin formación técnica' },
              { title: 'Accesible', desc: 'Sin grandes inversiones de capital' },
              { title: 'Basado en datos', desc: 'Decisiones verificables, no intuición' },
            ].map((feature, i) => (
              <div key={i} className="space-y-2">
                <h4 className="text-lg font-serif font-bold text-cartistry-accent">
                  {feature.title}
                </h4>
                <p className="text-cartistry-text-secondary">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-cartistry-surface border-t border-cartistry-border text-center py-6 text-sm text-cartistry-text-secondary">
        <p>Cartistry MVP — Mayo 2026</p>
      </footer>
    </main>
  );
}
