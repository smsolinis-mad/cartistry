'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getUserId } from '@/lib/auth';
import { CSVUploader, type CSVData } from '@/components/csv/CSVUploader';
import { CSVPreview } from '@/components/csv/CSVPreview';

export default function ProductosPage() {
  const [step, setStep] = useState<'upload' | 'preview' | 'complete'>('upload');
  const [csvData, setCSVData] = useState<CSVData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleDataLoaded = (data: CSVData) => {
    setCSVData(data);
    setStep('preview');
  };

  const handleConfirm = async () => {
    if (!csvData) return;

    setError('');
    setLoading(true);

    try {
      const userId = getUserId();
      if (!userId) {
        setError('Usuario no autenticado');
        return;
      }

      // Obtener store_id del usuario
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (storeError || !store) {
        setError('Debes configurar tu tienda primero');
        return;
      }

      // Procesar y validar productos
      const productsToInsert = csvData.rows.map((row) => ({
        store_id: store.id,
        ean: row['Código EAN'] || row['ean'] || '',
        codigo: row['Código de producto'] || row['codigo'] || '',
        nombre: row['Nombre de producto'] || row['nombre'] || '',
        coleccion: row['Colección'] || row['coleccion'] || '',
        drop: row['Drop'] || row['drop'] || '',
        sexo: row['Sexo'] || row['sexo'] || 'unisex',
        division: row['División de producto'] || row['division'] || '',
        tipo: row['Tipo'] || row['tipo'] || '',
        subtipo: row['Subtipo'] || row['subtipo'] || '',
        color_principal: row['Color principal'] || row['color_principal'] || '',
        color_principal_detalle: row['Color principal detalle'] || row['color_principal_detalle'] || '',
        subcolor: row['Subcolor'] || row['subcolor'] || '',
        medida_alto: row['Medida alto'] ? parseFloat(row['Medida alto']) : null,
        medida_largo: row['Medida largo'] ? parseFloat(row['Medida largo']) : null,
        medida_profundo: row['Medida profundo'] ? parseFloat(row['Medida profundo']) : null,
        precio_compra: parseFloat(row['Precio de compra']) || 0,
        pvp: parseFloat(row['PVP']) || 0,
        unidades: parseInt(row['Unidades']) || 0,
      }));

      // Insertar productos (en batches de 1000)
      for (let i = 0; i < productsToInsert.length; i += 1000) {
        const batch = productsToInsert.slice(i, i + 1000);
        const { error: insertError } = await supabase
          .from('products')
          .insert(batch);

        if (insertError) {
          throw new Error(`Error al insertar productos: ${insertError.message}`);
        }
      }

      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar productos');
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
            Fase 2: Catálogo de productos
          </h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {step === 'upload' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-serif font-bold text-cartistry-text mb-2">
                Sube tu catálogo de productos
              </h2>
              <p className="text-sm text-cartistry-text-secondary mb-6">
                Descarga la plantilla, complétala y sube el CSV. El archivo debe tener 3 filas de cabecera:
                nombre del campo, descripción, y tipo (obligatorio/opcional).
              </p>
            </div>

            <CSVUploader onDataLoaded={handleDataLoaded} />

            <div className="bg-cartistry-surface rounded border border-cartistry-border p-4">
              <p className="text-xs text-cartistry-text-secondary">
                <strong>Campos esperados:</strong> Código EAN, Código de producto, Nombre de producto,
                Colección, Drop, Sexo, División de producto, Tipo, Subtipo, Color principal, Medida alto,
                Medida largo, Medida profundo, Precio de compra, PVP, Unidades
              </p>
            </div>
          </div>
        )}

        {step === 'preview' && csvData && (
          <div className="space-y-6">
            <CSVPreview {...csvData} />

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => setStep('upload')}
                disabled={loading}
                className="px-6 py-2 border border-cartistry-border text-cartistry-accent rounded font-medium hover:bg-cartistry-bg transition disabled:opacity-50"
              >
                ← Volver
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="px-6 py-2 bg-cartistry-cta text-cartistry-cta-text rounded font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? `Guardando ${csvData.rows.length} productos...` : 'Confirmar y guardar'}
              </button>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-6 text-center">
            <div className="bg-green-50 border border-green-200 rounded p-8">
              <h2 className="text-lg font-serif font-bold text-green-900 mb-2">
                ✓ Catálogo guardado correctamente
              </h2>
              <p className="text-sm text-green-800">
                {csvData?.rows.length || 0} productos han sido importados a tu tienda.
              </p>
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2 bg-cartistry-cta text-cartistry-cta-text rounded font-medium hover:opacity-90 transition"
            >
              Continuar
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
