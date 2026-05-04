'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function TiendaPage() {
  const [step, setStep] = useState<'type' | 'details' | 'muebles'>('type');
  const [storeType, setStoreType] = useState<'gondola' | 'corner' | null>(null);
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [metros2, setMetros2] = useState('');
  const [fechaApertura, setFechaApertura] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleTypeSelect = (type: 'gondola' | 'corner') => {
    setStoreType(type);
    setStep('details');
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nombre || !direccion || !metros2 || !fechaApertura) {
      setError('Todos los campos son obligatorios');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Usuario no autenticado');
        return;
      }

      const { data, error: insertError } = await supabase
        .from('stores')
        .insert({
          user_id: user.id,
          nombre,
          direccion,
          tipo: storeType,
          metros2: parseFloat(metros2),
          fecha_apertura: fechaApertura,
          entrada_orientacion: 'entrada',
        })
        .select()
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      // Guardar store_id en sesión/localStorage para usarlo en siguiente paso
      localStorage.setItem('current_store_id', data.id);
      setStep('muebles');
    } catch (err) {
      setError('Error al crear la tienda');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-cartistry-bg">
      <header className="bg-cartistry-surface border-b border-cartistry-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link href="/dashboard" className="text-cartistry-accent hover:underline text-sm">
            ← Volver
          </Link>
          <h1 className="text-2xl font-serif font-bold text-cartistry-text mt-2">
            Fase 1: Configurar tienda
          </h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Step 1: Select Type */}
        {step === 'type' && (
          <div className="space-y-6">
            <p className="text-cartistry-text-secondary">
              Selecciona el tipo de espacio de venta
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  id: 'gondola',
                  title: 'Góndola / Lineal',
                  desc: 'Un único mueble o conjunto en línea',
                },
                {
                  id: 'corner',
                  title: 'Corner / Shop-in-shop',
                  desc: 'Espacio delimitado dentro de otra tienda',
                },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleTypeSelect(type.id as 'gondola' | 'corner')}
                  className="p-6 bg-cartistry-surface rounded border border-cartistry-border hover:border-cartistry-accent hover:bg-cartistry-bg transition text-left"
                >
                  <h3 className="font-serif font-bold text-cartistry-text mb-2">
                    {type.title}
                  </h3>
                  <p className="text-sm text-cartistry-text-secondary">{type.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Store Details */}
        {step === 'details' && (
          <div className="max-w-2xl">
            <h2 className="text-xl font-serif font-bold text-cartistry-text mb-6">
              Datos de la tienda
            </h2>

            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-cartistry-text mb-2">
                  Nombre de la tienda *
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                  placeholder="Mi tienda"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-cartistry-text mb-2">
                  Dirección *
                </label>
                <input
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                  placeholder="Calle, número, ciudad"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-cartistry-text mb-2">
                  Metros cuadrados *
                </label>
                <input
                  type="number"
                  value={metros2}
                  onChange={(e) => setMetros2(e.target.value)}
                  className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                  placeholder="50"
                  step="0.1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-cartistry-text mb-2">
                  Fecha de apertura *
                </label>
                <input
                  type="date"
                  value={fechaApertura}
                  onChange={(e) => setFechaApertura(e.target.value)}
                  className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
                />
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setStep('type')}
                  className="px-6 py-2 border border-cartistry-border text-cartistry-accent rounded font-medium hover:bg-cartistry-bg transition"
                >
                  ← Volver
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-cartistry-cta text-cartistry-cta-text rounded font-medium hover:opacity-90 transition disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Continuar'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Configure Furniture */}
        {step === 'muebles' && storeType === 'gondola' && (
          <GondolaForm onComplete={() => router.push('/dashboard')} />
        )}

        {step === 'muebles' && storeType === 'corner' && (
          <CornerForm onComplete={() => router.push('/dashboard')} />
        )}
      </div>
    </main>
  );
}

function GondolaForm({ onComplete }: { onComplete: () => void }) {
  const [numGondolas, setNumGondolas] = useState('1');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: Implementar guardado de góndolas
      console.log('Gondolas:', numGondolas);
      onComplete();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-serif font-bold text-cartistry-text mb-6">
        Configurar góndola
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-cartistry-text mb-2">
            ¿Cuántas góndolas tiene? *
          </label>
          <input
            type="number"
            value={numGondolas}
            onChange={(e) => setNumGondolas(e.target.value)}
            className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
            min="1"
          />
        </div>

        <p className="text-sm text-cartistry-text-secondary">
          Configurarás las dimensiones y estructura de cada góndola en el siguiente paso.
        </p>

        <div className="flex gap-4 pt-6">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-cartistry-cta text-cartistry-cta-text rounded font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Completar'}
          </button>
        </div>
      </form>
    </div>
  );
}

function CornerForm({ onComplete }: { onComplete: () => void }) {
  const [numParedes, setNumParedes] = useState('1');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: Implementar guardado de corner
      console.log('Paredes:', numParedes);
      onComplete();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-serif font-bold text-cartistry-text mb-6">
        Configurar corner
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-cartistry-text mb-2">
            ¿Cuántas paredes propias tiene? *
          </label>
          <input
            type="number"
            value={numParedes}
            onChange={(e) => setNumParedes(e.target.value)}
            className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:ring-2 focus:ring-cartistry-accent"
            min="1"
            max="3"
          />
        </div>

        <p className="text-sm text-cartistry-text-secondary">
          Configurarás cada pared y sus muebles en el siguiente paso.
        </p>

        <div className="flex gap-4 pt-6">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-cartistry-cta text-cartistry-cta-text rounded font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Completar'}
          </button>
        </div>
      </form>
    </div>
  );
}
