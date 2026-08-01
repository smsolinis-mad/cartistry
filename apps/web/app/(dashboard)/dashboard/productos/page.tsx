'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getUserId } from '@/lib/auth';
import { downloadCSV, PLANTILLA_PRODUCTOS_CSV } from '@/lib/csv-download';
import { CSVUploader, type CSVData } from '@/components/csv/CSVUploader';
import { CSVPreview } from '@/components/csv/CSVPreview';
import { ExportButton } from '@/components/analitica/ExportButton';

interface Product {
  id: string;
  store_id: string;
  ean: string;
  codigo?: string;
  nombre: string;
  coleccion?: string;
  drop?: string;
  sexo?: string;
  division: string;
  tipo: string;
  subtipo?: string;
  color_principal?: string;
  color_principal_detalle?: string;
  subcolor?: string;
  medida_alto?: number | null;
  medida_largo?: number | null;
  medida_profundo?: number | null;
  precio_compra: number;
  pvp: number;
  unidades: number;
  'URL Imagen'?: string;
  imagen_url?: string;
  store_nombre?: string;
}

export default function ProductosPage() {
  const [step, setStep] = useState<'upload' | 'preview' | 'complete'>('upload');
  const [csvData, setCSVData] = useState<CSVData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [importedCount, setImportedCount] = useState(0);
  const [importStats, setImportStats] = useState({ inserted: 0, updated: 0 });
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const userId = getUserId();
      if (!userId) {
        console.log('No user ID found');
        setLoadingProducts(false);
        return;
      }

      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id, nombre')
        .eq('user_id', userId);

      if (storesError) {
        console.error('Error cargando tiendas:', storesError);
        setLoadingProducts(false);
        return;
      }

      if (!stores || stores.length === 0) {
        console.log('No stores found for user');
        setLoadingProducts(false);
        return;
      }

      const storeIds = stores.map((s: any) => s.id as string);
      const storeNameById = new Map(stores.map((s: any) => [s.id, s.nombre]));

      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .in('store_id', storeIds)
        .order('nombre', { ascending: true });

      console.log('Productos cargados:', data?.length || 0, 'de', storeIds.length, 'tiendas. Error:', fetchError);

      if (fetchError) {
        console.error('Error cargando productos:', fetchError);
      } else {
        const enriched = (data || []).map((p: any) => ({
          ...p,
          store_nombre: storeNameById.get(p.store_id) || '',
        }));
        setProducts(enriched);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

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

      // Intentar obtener store_id del localStorage primero
      let storeId = localStorage.getItem('current_store_id');

      if (!storeId) {
        // Si no está en localStorage, buscar por usuario
        const { data: stores } = await supabase
          .from('stores')
          .select('id')
          .eq('user_id', userId);

        if (!stores || stores.length === 0) {
          setError('Debes configurar tu tienda primero');
          return;
        }

        storeId = stores[0].id as string;
        localStorage.setItem('current_store_id', storeId);
      }

      if (!storeId) {
        setError('Error obteniendo tienda');
        return;
      }

      // Procesar y validar productos
      const productsData = csvData.rows.map((row) => ({
        store_id: storeId,
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
        'URL Imagen': row['URL Imagen'] || row['imagen_url'] || null,
      }));

      // Obtener EANs de productos que ya existen
      const eansToCheck = productsData.map(p => p.ean).filter(e => e);
      let existingProducts: any[] = [];

      if (eansToCheck.length > 0) {
        const { data: existing } = await supabase
          .from('products')
          .select('id, ean')
          .eq('store_id', storeId)
          .in('ean', eansToCheck);

        existingProducts = existing || [];
      }

      const existingEans = new Set(existingProducts.map(p => p.ean));

      // Separar en productos a insertar y actualizar
      const productsToInsert = productsData.filter(p => !existingEans.has(p.ean));
      const productsToUpdate = productsData.filter(p => existingEans.has(p.ean));

      let insertedCount = 0;
      let updatedCount = 0;

      // Insertar nuevos productos (en batches de 1000)
      for (let i = 0; i < productsToInsert.length; i += 1000) {
        const batch = productsToInsert.slice(i, i + 1000);
        const { error: insertError } = await supabase
          .from('products')
          .insert(batch);

        if (insertError) {
          throw new Error(`Error al insertar productos: ${insertError.message}`);
        }
        insertedCount += batch.length;
      }

      // Actualizar productos existentes (en batches de 1000)
      for (let i = 0; i < productsToUpdate.length; i += 1000) {
        const batch = productsToUpdate.slice(i, i + 1000);

        for (const product of batch) {
          const { error: updateError } = await supabase
            .from('products')
            .update(product)
            .eq('store_id', storeId)
            .eq('ean', product.ean);

          if (updateError) {
            throw new Error(`Error al actualizar producto ${product.ean}: ${updateError.message}`);
          }
          updatedCount += 1;
        }
      }

      setImportedCount(insertedCount + updatedCount);
      setImportStats({ inserted: insertedCount, updated: updatedCount });
      await loadProducts(); // Recargar productos después de guardar
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
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-end justify-between gap-4">
          <div>
            <Link href="/dashboard" className="text-cartistry-accent hover:underline text-sm">
              ← Volver
            </Link>
            <h1 className="text-2xl font-serif font-bold text-cartistry-text mt-2">
              Fase 2: Catálogo de productos
            </h1>
          </div>
          <ExportButton
            filenameBase="catalogo_productos"
            headers={[
              'Tienda',
              'Código EAN',
              'Código de producto',
              'Nombre de producto',
              'Colección',
              'Drop',
              'Sexo',
              'División de producto',
              'Tipo',
              'Subtipo',
              'Color principal',
              'Color principal detalle',
              'Subcolor',
              'Medida alto (cm)',
              'Medida largo (cm)',
              'Medida profundo (cm)',
              'Precio de compra (€)',
              'PVP (€)',
              'Margen unitario (€)',
              'Unidades en stock',
              'URL Imagen',
            ]}
            rows={products.map((p) => [
              p.store_nombre || '',
              p.ean || '',
              p.codigo || '',
              p.nombre || '',
              p.coleccion || '',
              p.drop || '',
              p.sexo || '',
              p.division || '',
              p.tipo || '',
              p.subtipo || '',
              p.color_principal || '',
              p.color_principal_detalle || '',
              p.subcolor || '',
              p.medida_alto ?? '',
              p.medida_largo ?? '',
              p.medida_profundo ?? '',
              p.precio_compra ?? 0,
              p.pvp ?? 0,
              (Number(p.pvp) || 0) - (Number(p.precio_compra) || 0),
              p.unidades ?? 0,
              p['URL Imagen'] || p.imagen_url || '',
            ])}
          />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {step === 'upload' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-serif font-bold text-cartistry-text mb-2">
                Sube tu catálogo de productos
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Botón de descarga */}
              <a
                href="/plantilla_productos.csv"
                download
                className="p-6 bg-cartistry-surface rounded border border-cartistry-border hover:border-cartistry-accent hover:bg-cartistry-bg transition cursor-pointer flex items-center justify-center min-h-24"
              >
                <p className="text-sm font-medium text-cartistry-text">
                  📥 Descargar plantilla CSV
                </p>
              </a>

              {/* Uploader */}
              <div className="p-6 bg-cartistry-surface rounded border border-cartistry-border">
                <p className="text-sm font-medium text-cartistry-text mb-4">
                  📤 Sube tu catálogo
                </p>
                <CSVUploader onDataLoaded={handleDataLoaded} />
              </div>
            </div>

            {/* Listado de productos existentes */}
            {!loadingProducts && (
              <div className="mt-8">
                {(() => {
                  const validProducts = products.filter(p => p.nombre && (p.ean || p.pvp > 0 || p.precio_compra > 0));

                  if (validProducts.length === 0) {
                    return <p className="text-cartistry-text-secondary text-sm">No hay productos dados de alta aún</p>;
                  }

                  return (
                    <>
                      <h3 className="text-lg font-serif font-bold text-cartistry-text mb-4">
                        Productos dados de alta ({validProducts.length})
                      </h3>
                      <div className="space-y-2">
                        {validProducts.sort((a, b) => a.nombre.localeCompare(b.nombre)).map((product) => (
                    <div key={product.id} className="bg-cartistry-surface rounded border border-cartistry-border p-4 hover:border-cartistry-accent transition">
                      <div className="flex gap-4">
                        {/* Imagen o Icono */}
                        <div className="flex-shrink-0 w-24 h-24 rounded border border-cartistry-border bg-cartistry-bg flex items-center justify-center overflow-hidden">
                          {product['URL Imagen'] ? (
                            <img
                              src={`/api/image-proxy?url=${encodeURIComponent(product['URL Imagen'])}`}
                              alt={product.nombre}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <svg className="w-8 h-8 text-cartistry-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>
                        {/* Datos */}
                        <div className="flex-1 grid grid-cols-9 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-cartistry-text-secondary font-medium mb-1">EAN</p>
                            <p className="text-cartistry-text-secondary text-xs font-mono">{product.ean}</p>
                          </div>
                          <div className="col-span-3">
                            <p className="text-xs text-cartistry-text-secondary font-medium mb-1">Nombre</p>
                            <p className="text-cartistry-text font-medium">{product.nombre}</p>
                          </div>
                          <div>
                            <p className="text-xs text-cartistry-text-secondary font-medium mb-1">Tienda</p>
                            <p className="text-cartistry-text-secondary text-sm">{product.store_nombre || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-cartistry-text-secondary font-medium mb-1">Drop</p>
                            <p className="text-cartistry-text-secondary text-sm">{product.drop || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-cartistry-text-secondary font-medium mb-1">División</p>
                            <p className="text-cartistry-text-secondary text-sm">{product.division || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-cartistry-text-secondary font-medium mb-1">PVP</p>
                            <p className="text-cartistry-text font-medium">€{product.pvp.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-cartistry-text-secondary font-medium mb-1">Unidades</p>
                            <p className="text-cartistry-text">{product.unidades ?? 0}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                        </div>
                      </>
                    );
                })()}
              </div>
            )}
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
              <div className="text-sm text-green-800 space-y-1">
                <p>
                  {importStats.inserted > 0 && (
                    <>
                      <strong>{importStats.inserted}</strong> nuevos productos añadidos
                      {importStats.updated > 0 && ', '}
                    </>
                  )}
                  {importStats.updated > 0 && (
                    <>
                      <strong>{importStats.updated}</strong> productos actualizados
                    </>
                  )}
                </p>
                <p className="text-xs text-green-700">
                  Total: {importedCount} productos procesados
                </p>
              </div>
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
