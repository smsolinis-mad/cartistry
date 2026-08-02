'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getUserId } from '@/lib/auth';
import { StoreGridLayout } from '@/components/tienda/StoreGridLayout';
import { isValidPosition, parseRange, buildRangeString } from '@/lib/grid-pos';
import { Button, EmptyState, PageHeader } from '@/components/ui';

interface Store {
  id: string;
  nombre: string;
  direccion: string;
  provincia?: string | null;
  pais?: string | null;
  tipo: 'gondola' | 'corner';
  metros2?: number;
}

export default function TiendaPage() {
  const [step, setStep] = useState<'select' | 'details' | 'muebles' | 'edit'>('select');
  const [editStep, setEditStep] = useState<'datos' | 'muebles' | 'resumen'>('datos');
  const [storeType, setStoreType] = useState<'gondola' | 'corner'>('gondola');
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [provincia, setProvincia] = useState('');
  const [pais, setPais] = useState('');
  const [metros2, setMetros2] = useState('');
  const [fechaApertura, setFechaApertura] = useState('');
  const [categoriaVenta, setCategoriaVenta] = useState<'boutique' | 'supermercado' | 'fast_fashion'>('boutique');
  const [maxSkusPorHueco, setMaxSkusPorHueco] = useState<number>(4);
  const [error, setError] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [muebles, setMuebles] = useState<any[]>([]);
  const [editingMuebleIndex, setEditingMuebleIndex] = useState<number | null>(null);
  const [addingNewMueble, setAddingNewMueble] = useState(false);
  const [cuadriculaCols, setCuadriculaCols] = useState<number>(5);
  const [cuadriculaRows, setCuadriculaRows] = useState<number>(5);
  const [pendingPosicion, setPendingPosicion] = useState<string | null>(null);
  const [pasillos, setPasillos] = useState<Array<{ col: number; row: number }>>([]);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadStores();
  }, []);

  // Cuando entra/sale del modo edición de un mueble, sincroniza la posición
  // pendiente con la persistida para que el grid sepa qué celda destacar.
  useEffect(() => {
    if (editingMuebleIndex !== null) {
      setPendingPosicion(muebles[editingMuebleIndex]?.posicion_cuadricula || '');
    } else {
      setPendingPosicion(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingMuebleIndex]);

  const handleTogglePasillo = async (cell: { col: number; row: number }) => {
    const key = `${cell.col},${cell.row}`;
    const exists = pasillos.some((c) => `${c.col},${c.row}` === key);
    const next = exists
      ? pasillos.filter((c) => `${c.col},${c.row}` !== key)
      : [...pasillos, cell];
    setPasillos(next);
    if (selectedStore?.id) {
      try {
        await supabase
          .from('stores')
          .update({ pasillos: next })
          .eq('id', selectedStore.id);
      } catch (err) {
        console.warn('No se pudo persistir pasillos:', err);
      }
    }
  };

  const handleGridResize = async (cols: number, rows: number) => {
    setCuadriculaCols(cols);
    setCuadriculaRows(rows);
    if (selectedStore?.id) {
      try {
        await supabase
          .from('stores')
          .update({ cuadricula_cols: cols, cuadricula_rows: rows })
          .eq('id', selectedStore.id);
      } catch (err) {
        // Si las columnas aún no existen en BD, el cambio queda solo en memoria.
        console.warn('No se pudo persistir tamaño de cuadrícula:', err);
      }
    }
  };

  const loadStores = async () => {
    try {
      const userId = getUserId();
      if (!userId) {
        console.warn('No userId found');
        return;
      }

      const { data, error: queryError } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', userId);

      if (queryError) {
        console.error('Error en query:', queryError);
        return;
      }

      console.log('Tiendas cargadas:', data);
      if (data) {
        setStores(data);
      }
    } catch (err) {
      console.error('Error cargando tiendas:', err);
    }
  };

  const handleSelectStore = (store: Store) => {
    setSelectedStore(store);
    localStorage.setItem('current_store_id', store.id);
    setStoreType(store.tipo);
    router.push('/dashboard');
  };

  const handleEditStore = async (store: Store) => {
    setLoading(true);
    try {
      // Obtener datos completos de la tienda
      const { data: fullData, error: fetchError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', store.id)
        .single();

      if (fetchError || !fullData) {
        setError('Error cargando datos de la tienda');
        return;
      }

      // Obtener muebles de la tienda
      const { data: muesData, error: muesError } = await supabase
        .from('muebles')
        .select('*')
        .eq('store_id', store.id);

      if (muesError) {
        console.error('Error cargando muebles:', muesError);
      }

      setMuebles(muesData || []);
      setSelectedStore(store);
      setNombre(fullData.nombre);
      setDireccion(fullData.direccion);
      setProvincia(fullData.provincia || '');
      setPais(fullData.pais || '');
      setMetros2(fullData.metros2?.toString() || '');
      setFechaApertura(fullData.fecha_apertura || '');
      setCategoriaVenta(fullData.categoria_venta || 'boutique');
      setCuadriculaCols(Number(fullData.cuadricula_cols) || 5);
      setCuadriculaRows(Number(fullData.cuadricula_rows) || 5);
      setPasillos(
        Array.isArray(fullData.pasillos)
          ? fullData.pasillos.filter(
              (c: any) =>
                c &&
                Number.isFinite(Number(c.col)) &&
                Number.isFinite(Number(c.row))
            )
          : []
      );
      let maxSkusVal: number | null = null;
      if (fullData.max_skus_por_hueco != null) {
        maxSkusVal = Number(fullData.max_skus_por_hueco);
      } else {
        try {
          const cached = localStorage.getItem(`max_skus_${store.id}`);
          if (cached) maxSkusVal = Number(cached);
        } catch {}
      }
      setMaxSkusPorHueco(maxSkusVal && maxSkusVal > 0 ? maxSkusVal : 4);
      setStoreType(fullData.tipo);
      setIsEditing(true);
      setEditStep('datos');
      setStep('edit');
    } catch (err) {
      setError('Error cargando tienda');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStore = async () => {
    if (!selectedStore) return;

    setLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from('stores')
        .delete()
        .eq('id', selectedStore.id);

      if (deleteError) {
        setError('Error al borrar la tienda');
        return;
      }

      setShowDeleteConfirm(false);
      setSelectedStore(null);
      loadStores();
      setStep('select');
    } catch {
      setError('Error al borrar la tienda');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedStore(null);
    setNombre('');
    setDireccion('');
    setProvincia('');
    setPais('');
    setMetros2('');
    setFechaApertura('');
    setMaxSkusPorHueco(4);
    setIsEditing(false);
    setStep('details');
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nombre || !direccion) {
      setError('Nombre y dirección son obligatorios');
      return;
    }

    setLoading(true);

    // Helper: si la BD aún no tiene la columna max_skus_por_hueco, reintenta sin ella.
    const isMissingMaxSkusError = (msg: string) =>
      /max_skus_por_hueco/i.test(msg);

    try {
      if (isEditing && selectedStore) {
        // Actualizar tienda existente
        const basePayload = {
          nombre,
          direccion,
          provincia: provincia || null,
          pais: pais || null,
          tipo: storeType,
          ...(metros2 && { metros2: parseFloat(metros2) }),
          ...(fechaApertura && { fecha_apertura: fechaApertura }),
          categoria_venta: categoriaVenta,
        };

        let { error: updateError } = await supabase
          .from('stores')
          .update({ ...basePayload, max_skus_por_hueco: maxSkusPorHueco })
          .eq('id', selectedStore.id);

        if (updateError && isMissingMaxSkusError(updateError.message)) {
          ({ error: updateError } = await supabase
            .from('stores')
            .update(basePayload)
            .eq('id', selectedStore.id));
        }

        if (updateError) {
          setError(updateError.message);
          return;
        }

        // Backup local mientras la columna no exista en BD
        try {
          localStorage.setItem(
            `max_skus_${selectedStore.id}`,
            String(maxSkusPorHueco)
          );
        } catch {}

        loadStores();
        // En modo edición no navegamos a otra pestaña: el usuario sigue en
        // "Datos básicos" y se le da feedback con un flash de "Guardado".
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 2500);
      } else {
        // Crear nueva tienda
        if (!metros2 || !fechaApertura) {
          setError('Para nueva tienda, todos los campos son obligatorios');
          return;
        }

        const userId = getUserId();
        if (!userId) {
          setError('Usuario no autenticado');
          return;
        }

        const baseInsert = {
          user_id: userId,
          nombre,
          direccion,
          provincia: provincia || null,
          pais: pais || null,
          tipo: storeType,
          metros2: parseFloat(metros2),
          fecha_apertura: fechaApertura,
          entrada_orientacion: 'entrada',
          categoria_venta: categoriaVenta,
        };

        let { data, error: insertError } = await supabase
          .from('stores')
          .insert({ ...baseInsert, max_skus_por_hueco: maxSkusPorHueco })
          .select()
          .single();

        if (insertError && isMissingMaxSkusError(insertError.message)) {
          ({ data, error: insertError } = await supabase
            .from('stores')
            .insert(baseInsert)
            .select()
            .single());
        }

        if (insertError) {
          setError(insertError.message);
          return;
        }

        // Backup local mientras la columna no exista en BD
        if (data?.id) {
          try {
            localStorage.setItem(`max_skus_${data.id}`, String(maxSkusPorHueco));
          } catch {}
        }

        // Guardar store_id en localStorage para usarlo en siguiente paso
        localStorage.setItem('current_store_id', data.id);
        setStep('muebles');
      }
    } catch (err) {
      setError(isEditing ? 'Error al actualizar la tienda' : 'Error al crear la tienda');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="px-6 py-10 lg:px-10 lg:py-12">

      <div className="max-w-4xl mx-auto">
        <PageHeader
          label="Tienda"
          title="Espacio de venta"
          description="Dibuja góndolas, islas o corners con sus baldas y alturas. Es la base sobre la que se coloca el surtido."
        />

        {/* Step 0: Select Store */}
        {step === 'select' && (
          <div className="space-y-6">
            {stores.length === 0 ? (
              <EmptyState
                title="Todavía no has dibujado ningún espacio"
                description="Empieza por una góndola, una isla o una tienda completa. Solo tendrás que hacerlo una vez."
                action={
                  <Button onClick={handleCreateNew}>Dibujar mi primer espacio</Button>
                }
              />
            ) : (
              <div>
                <h2 className="text-lg font-display font-semibold text-ink">Mis tiendas</h2>
                <p className="text-sm text-ink-2 mt-1">
                  Elige la tienda sobre la que quieres trabajar.
                </p>
              </div>
            )}

            {stores.length > 0 && (
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {stores.map((store) => (
                  <div
                    key={store.id}
                    className="p-6 bg-cartistry-surface rounded border border-cartistry-border hover:border-cartistry-accent transition"
                  >
                    <h3 className="font-serif font-bold text-cartistry-text mb-2">
                      {store.nombre}
                    </h3>
                    <p className="text-sm text-cartistry-text-secondary mb-2">
                      {[store.direccion, store.provincia, store.pais]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                    <p className="text-xs text-cartistry-text-secondary mb-4">
                      {store.metros2
                        ? `${store.metros2} m²`
                        : 'Metros sin especificar'}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSelectStore(store)}
                        className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none flex-1"
                      >
                        Seleccionar
                      </button>
                      <button
                        onClick={() => handleEditStore(store)}
                        className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-sunk transition-colors disabled:opacity-40 disabled:pointer-events-none flex-1"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          setSelectedStore(store);
                          setShowDeleteConfirm(true);
                        }}
                        className="flex-1 px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 transition"
                      >
                        Borrar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {stores.length > 0 ? (
              <Button variant="secondary" onClick={handleCreateNew}>
                Añadir otra tienda
              </Button>
            ) : null}
          </div>
        )}

        {/* Modal de confirmación de borrado */}
        {showDeleteConfirm && selectedStore && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded p-6 max-w-sm">
              <h3 className="text-lg font-serif font-bold text-cartistry-text mb-4">
                Borrar tienda
              </h3>
              <p className="text-sm text-cartistry-text-secondary mb-6">
                ¿Estás seguro de que deseas borrar "{selectedStore.nombre}"? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-cartistry-border text-cartistry-text rounded font-medium hover:bg-cartistry-bg transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteStore}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700 transition disabled:opacity-50"
                >
                  {loading ? 'Borrando...' : 'Borrar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Store Details - EDIT MODE */}
        {step === 'edit' && isEditing && (
          <div className="max-w-2xl">
            <div className="mb-8">
              <h2 className="text-xl font-serif font-bold text-cartistry-text mb-4">
                Editar tienda: {nombre}
              </h2>

              {/* Navigation Tabs */}
              <div className="flex gap-2 border-b border-cartistry-border">
                <button
                  onClick={() => setEditStep('datos')}
                  className={`px-4 py-2 font-medium text-sm transition ${
                    editStep === 'datos'
                      ? 'text-cartistry-accent border-b-2 border-cartistry-accent'
                      : 'text-cartistry-text-secondary hover:text-cartistry-text'
                  }`}
                >
                  📋 Datos básicos
                </button>
                <button
                  onClick={() => setEditStep('muebles')}
                  className={`px-4 py-2 font-medium text-sm transition ${
                    editStep === 'muebles'
                      ? 'text-cartistry-accent border-b-2 border-cartistry-accent'
                      : 'text-cartistry-text-secondary hover:text-cartistry-text'
                  }`}
                >
                  🛋️ Muebles
                </button>
              </div>
            </div>

            {/* TAB 1: Datos básicos */}
            {editStep === 'datos' && (
              <form onSubmit={handleDetailsSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">
                  {error}
                </div>
              )}
              {savedFlash && (
                <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded text-sm">
                  ✓ Cambios guardados
                </div>
              )}

              <div>
                <label className="eyebrow block mb-1.5 text-ink-2">
                  Nombre de la tienda *
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                  placeholder="Mi tienda"
                />
              </div>

              <div>
                <label className="eyebrow block mb-1.5 text-ink-2">
                  Dirección *
                </label>
                <input
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                  placeholder="Calle, número, ciudad"
                />
              </div>

              <div>
                <label className="eyebrow block mb-1.5 text-ink-2">
                  Provincia
                </label>
                <input
                  type="text"
                  value={provincia}
                  onChange={(e) => setProvincia(e.target.value)}
                  className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                  placeholder="Madrid"
                />
              </div>

              <div>
                <label className="eyebrow block mb-1.5 text-ink-2">
                  País
                </label>
                <input
                  type="text"
                  value={pais}
                  onChange={(e) => setPais(e.target.value)}
                  className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                  placeholder="España"
                />
              </div>

              <div>
                <label className="eyebrow block mb-1.5 text-ink-2">
                  Metros cuadrados *
                </label>
                <input
                  type="number"
                  value={metros2}
                  onChange={(e) => setMetros2(e.target.value)}
                  className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                  placeholder="50"
                  step="0.1"
                />
              </div>

              <div>
                <label className="eyebrow block mb-1.5 text-ink-2">
                  Fecha de apertura *
                </label>
                <input
                  type="date"
                  value={fechaApertura}
                  onChange={(e) => setFechaApertura(e.target.value)}
                  className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                />
              </div>

              <div>
                <label className="eyebrow block mb-1.5 text-ink-2">
                  Categoría de venta *
                </label>
                <select
                  value={categoriaVenta}
                  onChange={(e) => setCategoriaVenta(e.target.value as 'boutique' | 'supermercado' | 'fast_fashion')}
                  className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                >
                  <option value="boutique">Boutique / Tienda de lujo</option>
                  <option value="supermercado">Supermercado / Bazar</option>
                  <option value="fast_fashion">Fast fashion</option>
                </select>
              </div>

              <div>
                <label className="eyebrow block mb-1.5 text-ink-2">
                  Máximo de SKUs por hueco *
                </label>
                <p className="text-xs text-cartistry-text-secondary mb-2">
                  Cuántas referencias distintas puede colocar el motor en un mismo hueco del lineal.
                </p>
                <select
                  value={maxSkusPorHueco}
                  onChange={(e) => setMaxSkusPorHueco(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                >
                  <option value={1}>1 SKU por hueco (boutique premium)</option>
                  <option value={2}>2 SKUs por hueco</option>
                  <option value={3}>3 SKUs por hueco</option>
                  <option value={4}>4 SKUs por hueco (estándar)</option>
                  <option value={6}>6 SKUs por hueco</option>
                  <option value={8}>8 SKUs por hueco (fast fashion)</option>
                  <option value={12}>12 SKUs por hueco (supermercado)</option>
                </select>
              </div>

                <div className="flex gap-4 pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('select');
                      setIsEditing(false);
                      setEditStep('datos');
                    }}
                    className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-sunk transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {loading ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: Muebles */}
            {editStep === 'muebles' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-serif font-bold text-cartistry-text mb-4">
                    Muebles configurados
                  </h3>
                  <p className="text-sm text-cartistry-text-secondary mb-4">
                    {storeType === 'gondola' ? 'Góndolas / Lineales' : 'Muebles del Corner'}
                  </p>
                </div>

                <StoreGridLayout
                  storeName={nombre || selectedStore?.nombre || 'Tienda'}
                  cols={cuadriculaCols}
                  rows={cuadriculaRows}
                  muebles={muebles}
                  pasillos={pasillos}
                  onTogglePasillo={handleTogglePasillo}
                  editingMuebleId={
                    editingMuebleIndex !== null
                      ? muebles[editingMuebleIndex]?.id || null
                      : null
                  }
                  pendingPosicion={pendingPosicion}
                  onCellClick={(pos, opts) => {
                    if (editingMuebleIndex === null) return;
                    if (opts.shift && pendingPosicion) {
                      // Extender rango desde el origen actual hasta la celda clicada.
                      const origin = pendingPosicion.split(':')[0];
                      const r = parseRange(`${origin}:${pos}`);
                      if (r) {
                        setPendingPosicion(buildRangeString(r.start, r.end));
                        return;
                      }
                    }
                    setPendingPosicion(pos);
                  }}
                  onSizeChange={(cols, rows) => handleGridResize(cols, rows)}
                />

                {muebles.length > 0 ? (
                  <div className="space-y-3">
                    {muebles.map((mueble, idx) => (
                      <div key={mueble.id} className="p-4 bg-cartistry-surface border border-cartistry-border rounded">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-cartistry-text">{mueble.nombre}</h4>
                            <p className="text-xs text-cartistry-text-secondary mt-1">
                              {mueble.alto}cm H × {mueble.ancho}cm W × {mueble.profundo}cm D
                            </p>
                            {mueble.sexo_target && (
                              <p className="text-xs text-cartistry-accent mt-1">
                                {mueble.sexo_target === 'femenino' ? '👩 Femenino' : mueble.sexo_target === 'masculino' ? '👨 Masculino' : mueble.sexo_target === 'unisex' ? '👥 Unisex' : '🔄 Indiferente'}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingMuebleIndex(idx)}
                              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none"
                            >
                              Editar
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`¿Borrar "${mueble.nombre}"?`)) {
                                  await supabase.from('muebles').delete().eq('id', mueble.id);
                                  setMuebles(muebles.filter((_, i) => i !== idx));
                                }
                              }}
                              className="px-3 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                            >
                              Borrar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 bg-cartistry-surface border border-cartistry-border rounded text-center">
                    <p className="text-sm text-cartistry-text-secondary mb-4">
                      No hay muebles configurados
                    </p>
                    <button
                      onClick={() => setAddingNewMueble(true)}
                      className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none"
                    >
                      + Agregar primer mueble
                    </button>
                  </div>
                )}

                {muebles.length > 0 && !addingNewMueble && (
                  <button
                    onClick={() => setAddingNewMueble(true)}
                    className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    + Agregar otro mueble
                  </button>
                )}

                {editingMuebleIndex !== null && (
                  <MuebleEditForm
                    mueble={muebles[editingMuebleIndex]}
                    posicionOverride={pendingPosicion ?? undefined}
                    onPosicionLocalChange={(p) => setPendingPosicion(p)}
                    onSave={async (updatedMueble) => {
                      const { error } = await supabase
                        .from('muebles')
                        .update(updatedMueble)
                        .eq('id', updatedMueble.id);
                      if (error) {
                        throw new Error(error.message || 'Error al actualizar el mueble');
                      }
                      const newMuebles = [...muebles];
                      newMuebles[editingMuebleIndex] = updatedMueble;
                      setMuebles(newMuebles);
                      setEditingMuebleIndex(null);
                    }}
                    onCancel={() => setEditingMuebleIndex(null)}
                  />
                )}

                {addingNewMueble && (
                  <MuebleNewForm
                    storeId={selectedStore?.id || ''}
                    onSave={async (newMueble) => {
                      const { data, error } = await supabase
                        .from('muebles')
                        .insert(newMueble)
                        .select()
                        .single();
                      if (error) {
                        throw new Error(error.message || 'Error al crear el mueble');
                      }
                      if (!data) {
                        throw new Error('No se pudo crear el mueble');
                      }
                      setMuebles([...muebles, data]);
                      setAddingNewMueble(false);
                    }}
                    onCancel={() => setAddingNewMueble(false)}
                  />
                )}

                <div className="flex gap-4 pt-6">
                  <button
                    type="button"
                    onClick={() => setEditStep('datos')}
                    className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-sunk transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    ← Anterior
                  </button>
                  <button
                    type="button"
                    onClick={handleDetailsSubmit}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {loading ? 'Guardando...' : '✓ Guardar cambios'}
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Step 1: Store Details - CREATE MODE */}
        {step === 'details' && !isEditing && (
          <div className="max-w-2xl">
            <h2 className="text-xl font-serif font-bold text-cartistry-text mb-6">
              Datos del lineal
            </h2>

            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="eyebrow block mb-1.5 text-ink-2">
                  Nombre de la tienda *
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                  placeholder="Mi tienda"
                />
              </div>

              <div>
                <label className="eyebrow block mb-1.5 text-ink-2">
                  Dirección *
                </label>
                <input
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                  placeholder="Calle, número, ciudad"
                />
              </div>

              <div>
                <label className="eyebrow block mb-1.5 text-ink-2">
                  Provincia
                </label>
                <input
                  type="text"
                  value={provincia}
                  onChange={(e) => setProvincia(e.target.value)}
                  className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                  placeholder="Madrid"
                />
              </div>

              <div>
                <label className="eyebrow block mb-1.5 text-ink-2">
                  País
                </label>
                <input
                  type="text"
                  value={pais}
                  onChange={(e) => setPais(e.target.value)}
                  className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                  placeholder="España"
                />
              </div>

              <div>
                <label className="eyebrow block mb-1.5 text-ink-2">
                  Metros cuadrados *
                </label>
                <input
                  type="number"
                  value={metros2}
                  onChange={(e) => setMetros2(e.target.value)}
                  className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                  placeholder="50"
                  step="0.1"
                />
              </div>

              <div>
                <label className="eyebrow block mb-1.5 text-ink-2">
                  Fecha de apertura *
                </label>
                <input
                  type="date"
                  value={fechaApertura}
                  onChange={(e) => setFechaApertura(e.target.value)}
                  className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                />
              </div>

              <div>
                <label className="eyebrow block mb-1.5 text-ink-2">
                  Categoría de venta *
                </label>
                <select
                  value={categoriaVenta}
                  onChange={(e) => setCategoriaVenta(e.target.value as 'boutique' | 'supermercado' | 'fast_fashion')}
                  className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                >
                  <option value="boutique">Boutique / Tienda de lujo</option>
                  <option value="supermercado">Supermercado / Bazar</option>
                  <option value="fast_fashion">Fast fashion</option>
                </select>
              </div>

              <div>
                <label className="eyebrow block mb-1.5 text-ink-2">
                  Máximo de SKUs por hueco *
                </label>
                <p className="text-xs text-cartistry-text-secondary mb-2">
                  Cuántas referencias distintas puede colocar el motor en un mismo hueco del lineal.
                </p>
                <select
                  value={maxSkusPorHueco}
                  onChange={(e) => setMaxSkusPorHueco(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                >
                  <option value={1}>1 SKU por hueco (boutique premium)</option>
                  <option value={2}>2 SKUs por hueco</option>
                  <option value={3}>3 SKUs por hueco</option>
                  <option value={4}>4 SKUs por hueco (estándar)</option>
                  <option value={6}>6 SKUs por hueco</option>
                  <option value={8}>8 SKUs por hueco (fast fashion)</option>
                  <option value={12}>12 SKUs por hueco (supermercado)</option>
                </select>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setStep('select')}
                  className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-sunk transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  {loading ? 'Guardando...' : 'Continuar'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 2: Configure Furniture */}
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

// ---------------------------------------------------------------------------
// Editor de caras del mueble con cuadrícula propia por cara.
//
// Cada cara del mueble (superior/frontal/trasera/izquierda/derecha) tiene su
// propia configuración de `cols`, `filas` y `filas_config[]` (altura por
// balda). La altura del mueble (`alto`) es única — cada cara debe sumar a
// esa altura cuando se rellena su `filas_config`.
// ---------------------------------------------------------------------------
type CaraKey = 'superior' | 'frontal' | 'trasera' | 'izquierda' | 'derecha';

type CaraGridDraft = {
  cols: string;
  filas: string;
  filas_config: { alto_cm: number }[];
};

const CARAS_META: { key: CaraKey; label: string }[] = [
  { key: 'superior',  label: 'Superior' },
  { key: 'frontal',   label: 'Frontal (cara A)' },
  { key: 'trasera',   label: 'Trasera (cara B)' },
  { key: 'izquierda', label: 'Lateral izquierdo (cara C)' },
  { key: 'derecha',   label: 'Lateral derecho (cara D)' },
];

function emptyGridDraft(): CaraGridDraft {
  return { cols: '1', filas: '1', filas_config: [] };
}

function emptyCarasGrid(): Record<CaraKey, CaraGridDraft> {
  return Object.fromEntries(
    CARAS_META.map((c) => [c.key, emptyGridDraft()])
  ) as Record<CaraKey, CaraGridDraft>;
}

/**
 * Construye el payload `caras_config` (la fuente de verdad nueva) a partir
 * del estado del editor. Solo incluye caras habilitadas. Devuelve también
 * un par num_columnas/num_filas agregado (max sobre las caras habilitadas)
 * por compatibilidad con código que aún lee los campos a nivel mueble.
 */
function buildCarasConfigPayload(
  enabled: Record<CaraKey, boolean>,
  grids: Record<CaraKey, CaraGridDraft>
): {
  caras_config: Record<string, { cols: number; filas: number; filas_config: { alto_cm: number }[] }>;
  agg: { num_columnas: number; num_filas: number };
} {
  const caras_config: Record<string, { cols: number; filas: number; filas_config: { alto_cm: number }[] }> = {};
  let aggCols = 0;
  let aggFilas = 0;
  for (const { key } of CARAS_META) {
    if (!enabled[key]) continue;
    const cols = Math.max(1, parseInt(grids[key].cols) || 1);
    const filas = Math.max(1, parseInt(grids[key].filas) || 1);
    const filas_config = grids[key].filas_config
      .slice(0, filas)
      .map((f) => ({ alto_cm: Number(f.alto_cm) || 0 }));
    caras_config[key] = { cols, filas, filas_config };
    aggCols = Math.max(aggCols, cols);
    aggFilas = Math.max(aggFilas, filas);
  }
  return {
    caras_config,
    agg: { num_columnas: aggCols || 1, num_filas: aggFilas || 1 },
  };
}

function CarasGridEditor({
  alto,
  caras,
  carasGrid,
  onCarasChange,
  onGridChange,
}: {
  alto: number;
  caras: Record<CaraKey, boolean>;
  carasGrid: Record<CaraKey, CaraGridDraft>;
  onCarasChange: (next: Record<CaraKey, boolean>) => void;
  onGridChange: (cara: CaraKey, next: CaraGridDraft) => void;
}) {
  const [openAltura, setOpenAltura] = useState<Record<CaraKey, boolean>>(
    () =>
      Object.fromEntries(CARAS_META.map((c) => [c.key, false])) as Record<
        CaraKey,
        boolean
      >
  );

  const updateFilas = (cara: CaraKey, value: string) => {
    const n = Math.max(1, parseInt(value) || 1);
    const uniform = alto > 0 ? alto / n : 0;
    const prev = carasGrid[cara];
    const nextFilasConfig: { alto_cm: number }[] = [];
    for (let i = 0; i < n; i++) {
      nextFilasConfig.push({
        alto_cm: prev.filas_config[i]?.alto_cm || uniform,
      });
    }
    onGridChange(cara, { ...prev, filas: value, filas_config: nextFilasConfig });
  };

  return (
    <div className="pt-2 border-t border-cartistry-border">
      <p className="text-xs font-medium text-cartistry-text mb-1">
        Caras del bloque con producto
      </p>
      <p className="text-[10px] text-cartistry-text-secondary mb-2">
        Marca en qué lados del mueble se coloca producto. Cada cara tiene su propia cuadrícula
        (cols × filas) y debe sumar la altura del mueble ({alto || '—'}cm).
      </p>

      <div className="space-y-2">
        {CARAS_META.map(({ key, label }) => {
          const enabled = caras[key];
          const grid = carasGrid[key];
          const isSuperior = key === 'superior';
          const sumFilas = grid.filas_config.reduce(
            (s, f) => s + (Number(f.alto_cm) || 0),
            0
          );
          const ok = alto === 0 || Math.abs(sumFilas - alto) < 0.5;
          return (
            <div
              key={key}
              className={`border rounded p-2 ${
                enabled ? 'border-cartistry-border bg-cartistry-bg' : 'border-cartistry-border opacity-70'
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <label className="flex items-center gap-1.5 cursor-pointer min-w-[170px]">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) =>
                      onCarasChange({ ...caras, [key]: e.target.checked })
                    }
                  />
                  <span className="text-xs text-cartistry-text">{label}</span>
                </label>
                <div
                  className={`flex items-center gap-1.5 text-[11px] ${
                    enabled ? '' : 'opacity-40 pointer-events-none'
                  }`}
                >
                  <span className="text-cartistry-text-secondary">Cols</span>
                  <input
                    type="number"
                    value={grid.cols}
                    onChange={(e) =>
                      onGridChange(key, { ...grid, cols: e.target.value })
                    }
                    min={1}
                    className="w-14 px-1.5 py-0.5 border border-cartistry-border rounded"
                  />
                  <span className="text-cartistry-text-secondary">Filas</span>
                  <input
                    type="number"
                    value={grid.filas}
                    onChange={(e) => updateFilas(key, e.target.value)}
                    min={1}
                    className="w-14 px-1.5 py-0.5 border border-cartistry-border rounded"
                  />
                  {isSuperior ? (
                    <span className="text-[10px] text-cartistry-text-secondary italic">
                      altura libre (sin tope, como una mesa)
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setOpenAltura((p) => ({ ...p, [key]: !p[key] }))
                      }
                      className="text-[11px] text-cartistry-accent hover:underline"
                    >
                      {openAltura[key] ? '▾' : '▸'} altura
                    </button>
                  )}
                </div>
              </div>

              {enabled && !isSuperior && openAltura[key] && (
                <div className="mt-2 space-y-1 pl-6">
                  <p className="text-[10px] text-cartistry-text-secondary">
                    Altura de cada balda de abajo arriba (debe sumar {alto || '—'}cm)
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {grid.filas_config.map((f, i) => (
                      <div key={i} className="flex items-center gap-1 text-[11px]">
                        <span className="w-16 text-cartistry-text-secondary">
                          Balda {i + 1}
                        </span>
                        <input
                          type="number"
                          value={f.alto_cm || ''}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value) || 0;
                            const next = [...grid.filas_config];
                            next[i] = { alto_cm: v };
                            onGridChange(key, { ...grid, filas_config: next });
                          }}
                          step="0.5"
                          min={0}
                          className="w-16 px-1 py-0.5 border border-cartistry-border rounded"
                        />
                        <span className="text-cartistry-text-secondary">cm</span>
                      </div>
                    ))}
                  </div>
                  <div
                    className={`text-[10px] ${
                      ok ? 'text-cartistry-text-secondary' : 'text-red-700'
                    }`}
                  >
                    Total: {sumFilas.toFixed(1)}cm / {alto}cm {ok ? 'cuadra' : 'no cuadra'}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MuebleNewForm({
  storeId,
  onSave,
  onCancel,
}: {
  storeId: string;
  onSave: (mueble: any) => Promise<void>;
  onCancel: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [tipoMueble, setTipoMueble] = useState<'mueble' | 'caja'>('mueble');
  const [alto, setAlto] = useState('');
  const [ancho, setAncho] = useState('');
  const [profundo, setProfundo] = useState('');
  const [esZonaCaja, setEsZonaCaja] = useState(false);
  const [esEscaparate, setEsEscaparate] = useState(false);
  const [posicionCuadricula, setPosicionCuadricula] = useState('');
  // Las 5 caras del bloque — qué lados tienen producto (sin prefijo `cara_`).
  const [carasEnabled, setCarasEnabled] = useState<Record<CaraKey, boolean>>({
    superior: false,
    frontal: true, // por defecto siempre hay producto delante
    trasera: false,
    izquierda: false,
    derecha: false,
  });
  // Grid de baldas por cara (cols/filas/altura).
  const [carasGrid, setCarasGrid] = useState<Record<CaraKey, CaraGridDraft>>(
    emptyCarasGrid()
  );
  const [sexoTarget, setSexoTarget] = useState<'femenino' | 'masculino' | 'unisex' | 'indiferente'>('unisex');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Al cambiar `alto`, propagar reparto uniforme inicial a las caras cuyo
  // filas_config aún esté vacío (no pisar lo que el usuario haya tocado).
  useEffect(() => {
    const altoNum = parseFloat(alto) || 0;
    if (altoNum <= 0) return;
    setCarasGrid((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const { key } of CARAS_META) {
        const g = prev[key];
        const filas = Math.max(1, parseInt(g.filas) || 1);
        if (g.filas_config.length === 0) {
          const uniform = altoNum / filas;
          next[key] = {
            ...g,
            filas_config: Array.from({ length: filas }, () => ({ alto_cm: uniform })),
          };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [alto]);

  // Tipo "caja" → zona de caja se activa automáticamente.
  const isCaja = tipoMueble === 'caja';
  const efectivoZonaCaja = isCaja ? true : esZonaCaja;

  const handleSave = async () => {
    setError('');

    if (!storeId) {
      setError('Error: ID de tienda no disponible');
      return;
    }

    if (!nombre || !alto || !ancho || !profundo) {
      setError('Completa todos los campos obligatorios');
      return;
    }

    if (isNaN(parseFloat(alto)) || isNaN(parseFloat(ancho)) || isNaN(parseFloat(profundo))) {
      setError('Las dimensiones deben ser números válidos');
      return;
    }

    const posTrim = posicionCuadricula.trim().toUpperCase();
    if (posTrim && !isValidPosition(posTrim)) {
      setError('Posición inválida. Usa A1, B3 o un rango como A1:C2.');
      return;
    }

    setLoading(true);
    try {
      const { caras_config, agg } = buildCarasConfigPayload(carasEnabled, carasGrid);
      await onSave({
        store_id: storeId,
        tipo: tipoMueble,
        nombre,
        alto: parseFloat(alto),
        ancho: parseFloat(ancho),
        profundo: parseFloat(profundo),
        // Agregados a nivel mueble por compatibilidad histórica (max sobre caras).
        num_columnas: agg.num_columnas,
        num_filas: agg.num_filas,
        es_zona_caja: efectivoZonaCaja,
        es_escaparate: esEscaparate,
        posicion_cuadricula: posTrim || null,
        // Flags por cara (boolean) → columnas planas.
        cara_superior:  carasEnabled.superior,
        cara_frontal:   carasEnabled.frontal,
        cara_trasera:   carasEnabled.trasera,
        cara_izquierda: carasEnabled.izquierda,
        cara_derecha:   carasEnabled.derecha,
        // Grid por cara (fuente de verdad nueva).
        caras_config,
        sexo_target: sexoTarget,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear mueble');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 p-6 bg-cartistry-surface border-2 border-cartistry-border rounded">
      <h4 className="font-semibold text-cartistry-text mb-4">Agregar nuevo mueble</h4>
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm mb-4">
          {error}
        </div>
      )}
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-cartistry-text">Nombre *</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full px-2 py-1 border border-cartistry-border rounded text-sm"
            placeholder="Ej: Góndola Principal"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-cartistry-text mb-1 block">
            Productos para *
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['femenino', 'masculino', 'unisex', 'indiferente'] as const).map(sexo => (
              <label
                key={sexo}
                className={`px-2 py-1 text-xs text-center border rounded cursor-pointer transition ${
                  sexoTarget === sexo
                    ? 'border-cartistry-accent bg-cartistry-bg text-cartistry-text font-bold'
                    : 'border-cartistry-border text-cartistry-text-secondary hover:border-cartistry-accent'
                }`}
              >
                <input
                  type="radio"
                  name="sexo_target"
                  value={sexo}
                  checked={sexoTarget === sexo}
                  onChange={(e) => setSexoTarget(e.target.value as 'femenino' | 'masculino' | 'unisex' | 'indiferente')}
                  className="hidden"
                />
                {sexo === 'femenino' ? 'Femenino' : sexo === 'masculino' ? 'Masculino' : sexo === 'unisex' ? 'Unisex' : 'Indiferente'}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-cartistry-text">Tipo de mueble *</label>
            <select
              value={tipoMueble}
              onChange={(e) => setTipoMueble(e.target.value as 'mueble' | 'caja')}
              className="w-full px-2 py-1 border border-cartistry-border rounded text-sm"
            >
              <option value="mueble">Mostrador</option>
              <option value="caja">Caja</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-cartistry-text">Posición en cuadrícula</label>
            <input
              type="text"
              value={posicionCuadricula}
              onChange={(e) => setPosicionCuadricula(e.target.value.toUpperCase())}
              className="w-full px-2 py-1 border border-cartistry-border rounded text-sm"
              placeholder="A1 o A1:C2 (rango)"
              maxLength={12}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs font-medium text-cartistry-text">Alto (cm) *</label>
            <input
              type="number"
              value={alto}
              onChange={(e) => setAlto(e.target.value)}
              className="w-full px-2 py-1 border border-cartistry-border rounded text-sm"
              placeholder="200"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-cartistry-text">Ancho (cm) *</label>
            <input
              type="number"
              value={ancho}
              onChange={(e) => setAncho(e.target.value)}
              className="w-full px-2 py-1 border border-cartistry-border rounded text-sm"
              placeholder="100"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-cartistry-text">Profundo (cm) *</label>
            <input
              type="number"
              value={profundo}
              onChange={(e) => setProfundo(e.target.value)}
              className="w-full px-2 py-1 border border-cartistry-border rounded text-sm"
              placeholder="50"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={esEscaparate}
              onChange={(e) => setEsEscaparate(e.target.checked)}
            />
            <span className="text-xs text-cartistry-text">Es escaparate (activa ZV-01)</span>
          </label>
          {!isCaja && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={esZonaCaja}
                onChange={(e) => setEsZonaCaja(e.target.checked)}
              />
              <span className="text-xs text-cartistry-text">
                Es zona de caja (activa ZV-03)
              </span>
            </label>
          )}
        </div>

        <CarasGridEditor
          alto={parseFloat(alto) || 0}
          caras={carasEnabled}
          carasGrid={carasGrid}
          onCarasChange={setCarasEnabled}
          onGridChange={(cara, next) =>
            setCarasGrid((prev) => ({ ...prev, [cara]: next }))
          }
        />

        <div className="flex gap-2 pt-3">
          <button
            onClick={onCancel}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-sunk transition-colors disabled:opacity-40 disabled:pointer-events-none flex-1"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none flex-1"
          >
            {loading ? 'Guardando...' : '✓ Crear mueble'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MuebleEditForm({
  mueble,
  posicionOverride,
  onPosicionLocalChange,
  onSave,
  onCancel,
}: {
  mueble: any;
  posicionOverride?: string;
  onPosicionLocalChange?: (pos: string) => void;
  onSave: (mueble: any) => Promise<void>;
  onCancel: () => void;
}) {
  const [nombre, setNombre] = useState(mueble.nombre);
  const [tipoMueble, setTipoMueble] = useState<'mueble' | 'caja'>(
    (mueble.tipo as 'mueble' | 'caja') || 'mueble'
  );
  const [alto, setAlto] = useState(mueble.alto?.toString() || '');
  const [ancho, setAncho] = useState(mueble.ancho?.toString() || '');
  const [profundo, setProfundo] = useState(mueble.profundo?.toString() || '');
  const [esZonaCaja, setEsZonaCaja] = useState(!!mueble.es_zona_caja);
  const [esEscaparate, setEsEscaparate] = useState(!!mueble.es_escaparate);
  const [posicionCuadricula, setPosicionCuadricula] = useState(
    mueble.posicion_cuadricula || ''
  );

  // Flags por cara (sin prefijo `cara_`).
  const [carasEnabled, setCarasEnabled] = useState<Record<CaraKey, boolean>>({
    superior: !!mueble.cara_superior,
    frontal:
      mueble.cara_frontal === undefined ? true : !!mueble.cara_frontal,
    trasera: !!mueble.cara_trasera,
    izquierda: !!mueble.cara_izquierda,
    derecha: !!mueble.cara_derecha,
  });

  // Grid por cara. Inicializa desde `caras_config` (nuevo) o, si no existe,
  // hereda del mueble los campos legacy (num_columnas/num_filas/filas_config)
  // para que muebles ya creados sigan funcionando.
  const initialCarasGrid: Record<CaraKey, CaraGridDraft> = (() => {
    const fromDb = (mueble.caras_config && typeof mueble.caras_config === 'object')
      ? mueble.caras_config
      : null;
    const legacyCols = parseInt(mueble.num_columnas?.toString() || '1') || 1;
    const legacyFilas = parseInt(mueble.num_filas?.toString() || '1') || 1;
    const legacyFC = Array.isArray(mueble.filas_config) ? mueble.filas_config : [];
    const legacyUniform = (mueble.alto || 200) / legacyFilas;
    return Object.fromEntries(
      CARAS_META.map(({ key }) => {
        const fc = fromDb?.[key];
        if (fc) {
          const filas = Number(fc.filas) || legacyFilas;
          const filas_config = Array.isArray(fc.filas_config)
            ? fc.filas_config.map((f: any) => ({ alto_cm: Number(f?.alto_cm) || 0 }))
            : Array.from({ length: filas }, () => ({ alto_cm: (mueble.alto || 200) / filas }));
          return [key, {
            cols: String(Number(fc.cols) || legacyCols),
            filas: String(filas),
            filas_config,
          } satisfies CaraGridDraft];
        }
        // Fallback al legacy mueble-level.
        const filas_config = legacyFC.length === legacyFilas
          ? legacyFC.map((f: any) => ({ alto_cm: Number(f?.alto_cm) || legacyUniform }))
          : Array.from({ length: legacyFilas }, () => ({ alto_cm: legacyUniform }));
        return [key, {
          cols: String(legacyCols),
          filas: String(legacyFilas),
          filas_config,
        } satisfies CaraGridDraft];
      })
    ) as Record<CaraKey, CaraGridDraft>;
  })();
  const [carasGrid, setCarasGrid] = useState(initialCarasGrid);

  useEffect(() => {
    if (posicionOverride !== undefined && posicionOverride !== posicionCuadricula) {
      setPosicionCuadricula(posicionOverride);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posicionOverride]);
  useEffect(() => {
    if (onPosicionLocalChange) onPosicionLocalChange(posicionCuadricula);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posicionCuadricula]);

  const [sexoTarget, setSexoTarget] = useState<'femenino' | 'masculino' | 'unisex' | 'indiferente'>(mueble.sexo_target || 'unisex');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isCaja = tipoMueble === 'caja';
  const efectivoZonaCaja = isCaja ? true : esZonaCaja;

  const handleSave = async () => {
    setError('');
    if (!nombre || !alto || !ancho || !profundo) {
      setError('Completa todos los campos obligatorios');
      return;
    }

    const posTrim = (posicionCuadricula || '').trim().toUpperCase();
    if (posTrim && !isValidPosition(posTrim)) {
      setError('Posición inválida. Usa A1, B3 o un rango como A1:C2.');
      return;
    }

    setLoading(true);
    try {
      const {
        caras_config: _prevCarasConfig,
        da_pasillo_principal,
        filas_config: _prevFilasConfig,
        ...rest
      } = mueble as any;
      void _prevCarasConfig;
      void da_pasillo_principal;
      void _prevFilasConfig;
      const { caras_config, agg } = buildCarasConfigPayload(carasEnabled, carasGrid);
      await onSave({
        ...rest,
        tipo: tipoMueble,
        nombre,
        alto: parseFloat(alto),
        ancho: parseFloat(ancho),
        profundo: parseFloat(profundo),
        num_columnas: agg.num_columnas,
        num_filas: agg.num_filas,
        es_zona_caja: efectivoZonaCaja,
        es_escaparate: esEscaparate,
        posicion_cuadricula: posTrim || null,
        cara_superior:  carasEnabled.superior,
        cara_frontal:   carasEnabled.frontal,
        cara_trasera:   carasEnabled.trasera,
        cara_izquierda: carasEnabled.izquierda,
        cara_derecha:   carasEnabled.derecha,
        caras_config,
        sexo_target: sexoTarget,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar mueble');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 p-6 bg-cartistry-surface border-2 border-cartistry-accent rounded">
      <h4 className="font-semibold text-cartistry-text mb-4">Editar: {nombre}</h4>
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm mb-4">
          {error}
        </div>
      )}
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-cartistry-text">Nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full px-2 py-1 border border-cartistry-border rounded text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-cartistry-text mb-1 block">
            Productos para *
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['femenino', 'masculino', 'unisex', 'indiferente'] as const).map(sexo => (
              <label
                key={sexo}
                className={`px-2 py-1 text-xs text-center border rounded cursor-pointer transition ${
                  sexoTarget === sexo
                    ? 'border-cartistry-accent bg-cartistry-bg text-cartistry-text font-bold'
                    : 'border-cartistry-border text-cartistry-text-secondary hover:border-cartistry-accent'
                }`}
              >
                <input
                  type="radio"
                  name="sexo_target_edit"
                  value={sexo}
                  checked={sexoTarget === sexo}
                  onChange={(e) => setSexoTarget(e.target.value as 'femenino' | 'masculino' | 'unisex' | 'indiferente')}
                  className="hidden"
                />
                {sexo === 'femenino' ? 'Femenino' : sexo === 'masculino' ? 'Masculino' : sexo === 'unisex' ? 'Unisex' : 'Indiferente'}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-cartistry-text">Tipo de mueble</label>
            <select
              value={tipoMueble}
              onChange={(e) => setTipoMueble(e.target.value as 'mueble' | 'caja')}
              className="w-full px-2 py-1 border border-cartistry-border rounded text-sm"
            >
              <option value="mueble">Mostrador</option>
              <option value="caja">Caja</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-cartistry-text">Posición en cuadrícula</label>
            <div className="flex gap-1">
              <input
                type="text"
                value={posicionCuadricula}
                onChange={(e) => setPosicionCuadricula(e.target.value.toUpperCase())}
                className="flex-1 px-2 py-1 border border-cartistry-border rounded text-sm"
                placeholder="A1 o A1:C2 (rango)"
                maxLength={12}
              />
              {posicionCuadricula && (
                <button
                  type="button"
                  onClick={() => setPosicionCuadricula('')}
                  className="px-2 py-1 text-xs border border-cartistry-border text-cartistry-text-secondary rounded hover:bg-cartistry-bg"
                  title="Limpiar posición"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs font-medium text-cartistry-text">Alto (cm)</label>
            <input
              type="number"
              value={alto}
              onChange={(e) => setAlto(e.target.value)}
              className="w-full px-2 py-1 border border-cartistry-border rounded text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-cartistry-text">Ancho (cm)</label>
            <input
              type="number"
              value={ancho}
              onChange={(e) => setAncho(e.target.value)}
              className="w-full px-2 py-1 border border-cartistry-border rounded text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-cartistry-text">Profundo (cm)</label>
            <input
              type="number"
              value={profundo}
              onChange={(e) => setProfundo(e.target.value)}
              className="w-full px-2 py-1 border border-cartistry-border rounded text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={esEscaparate}
              onChange={(e) => setEsEscaparate(e.target.checked)}
            />
            <span className="text-xs text-cartistry-text">Es escaparate (activa ZV-01)</span>
          </label>
          {!isCaja && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={esZonaCaja}
                onChange={(e) => setEsZonaCaja(e.target.checked)}
              />
              <span className="text-xs text-cartistry-text">
                Es zona de caja (activa ZV-03)
              </span>
            </label>
          )}
        </div>

        <CarasGridEditor
          alto={parseFloat(alto) || 0}
          caras={carasEnabled}
          carasGrid={carasGrid}
          onCarasChange={setCarasEnabled}
          onGridChange={(cara, next) =>
            setCarasGrid((prev) => ({ ...prev, [cara]: next }))
          }
        />

        <div className="flex gap-2 pt-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-sunk transition-colors disabled:opacity-40 disabled:pointer-events-none flex-1"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none flex-1"
          >
            {loading ? 'Guardando...' : '✓ Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function GondolaForm({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<'count' | 'details'>('count');
  const [numGondolas, setNumGondolas] = useState('1');
  const [currentGondolaIndex, setCurrentGondolaIndex] = useState(0);
  const [gondolas, setGondolas] = useState<Array<{
    nombre: string;
    alto: string;
    ancho: string;
    profundo: string;
    columnas: string;
    filas: string;
    cara_frontal: boolean;
    cara_trasera: boolean;
    es_zona_caja: boolean;
    es_escaparate: boolean;
    sexo_target: 'femenino' | 'masculino' | 'unisex' | 'indiferente';
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  const handleCountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(numGondolas);
    if (count < 1) {
      setError('Debe tener al menos 1 góndola');
      return;
    }
    setGondolas(Array(count).fill(null).map(() => ({
      nombre: '',
      alto: '',
      ancho: '',
      profundo: '',
      columnas: '',
      filas: '',
      cara_frontal: true,
      cara_trasera: false,
      es_zona_caja: false,
      es_escaparate: false,
      sexo_target: 'unisex' as const,
    })));
    setCurrentGondolaIndex(0);
    setStep('details');
    setError('');
  };

  const handleGondolaChange = (field: string, value: any) => {
    const newGondolas = [...gondolas];
    newGondolas[currentGondolaIndex] = {
      ...newGondolas[currentGondolaIndex],
      [field]: value,
    };
    setGondolas(newGondolas);
  };

  const handleNextGondola = () => {
    const current = gondolas[currentGondolaIndex];
    if (!current.nombre || !current.alto || !current.ancho || !current.profundo || !current.columnas || !current.filas) {
      setError('Todos los campos son obligatorios');
      return;
    }
    setError('');
    if (currentGondolaIndex < gondolas.length - 1) {
      setCurrentGondolaIndex(currentGondolaIndex + 1);
    }
  };

  const handlePrevGondola = () => {
    if (currentGondolaIndex > 0) {
      setCurrentGondolaIndex(currentGondolaIndex - 1);
      setError('');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const current = gondolas[currentGondolaIndex];
    if (!current.nombre || !current.alto || !current.ancho || !current.profundo || !current.columnas || !current.filas) {
      setError('Todos los campos son obligatorios');
      return;
    }

    setLoading(true);
    try {
      const storeId = localStorage.getItem('current_store_id');
      if (!storeId) {
        setError('Error: tienda no configurada');
        return;
      }

      for (let i = 0; i < gondolas.length; i++) {
        const gondola = gondolas[i];
        await supabase.from('muebles').insert({
          store_id: storeId,
          tipo: 'mueble',
          nombre: gondola.nombre,
          pared: 1,
          posicion_cuadricula: null,
          alto: parseFloat(gondola.alto),
          ancho: parseFloat(gondola.ancho),
          profundo: parseFloat(gondola.profundo),
          num_columnas: parseInt(gondola.columnas),
          num_filas: parseInt(gondola.filas),
          es_zona_caja: gondola.es_zona_caja,
          es_escaparate: gondola.es_escaparate,
          cara_frontal: gondola.cara_frontal,
          cara_trasera: gondola.cara_trasera,
          cara_superior: false,
          cara_izquierda: false,
          cara_derecha: false,
          sexo_target: gondola.sexo_target,
        });
      }

      onComplete();
    } catch (err) {
      setError('Error al guardar góndolas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      {step === 'count' ? (
        <>
          <h2 className="text-xl font-serif font-bold text-cartistry-text mb-6">
            Configurar góndola
          </h2>

          <form onSubmit={handleCountSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="eyebrow block mb-1.5 text-ink-2">
                ¿Cuántas góndolas tiene? *
              </label>
              <input
                type="number"
                value={numGondolas}
                onChange={(e) => setNumGondolas(e.target.value)}
                className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                min="1"
              />
            </div>

            <p className="text-sm text-cartistry-text-secondary">
              Configurarás las dimensiones de cada góndola en el siguiente paso.
            </p>

            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                Continuar
              </button>
            </div>
          </form>
        </>
      ) : (
        <>
          <h2 className="text-xl font-serif font-bold text-cartistry-text mb-6">
            Detalles de góndola {currentGondolaIndex + 1} de {gondolas.length}
          </h2>

          <form onSubmit={handleSave} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="eyebrow block mb-1.5 text-ink-2">
                Nombre de la góndola *
              </label>
              <input
                type="text"
                value={gondolas[currentGondolaIndex]?.nombre || ''}
                onChange={(e) => handleGondolaChange('nombre', e.target.value)}
                className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                placeholder="Ej: Góndola Entrada"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="eyebrow block mb-1.5 text-ink-2">
                  Alto (cm) *
                </label>
                <input
                  type="number"
                  value={gondolas[currentGondolaIndex]?.alto || ''}
                  onChange={(e) => handleGondolaChange('alto', e.target.value)}
                  className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                  placeholder="180"
                  step="0.1"
                />
              </div>
              <div>
                <label className="eyebrow block mb-1.5 text-ink-2">
                  Ancho (cm) *
                </label>
                <input
                  type="number"
                  value={gondolas[currentGondolaIndex]?.ancho || ''}
                  onChange={(e) => handleGondolaChange('ancho', e.target.value)}
                  className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                  placeholder="120"
                  step="0.1"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="eyebrow block mb-1.5 text-ink-2">
                  Profundo (cm) *
                </label>
                <input
                  type="number"
                  value={gondolas[currentGondolaIndex]?.profundo || ''}
                  onChange={(e) => handleGondolaChange('profundo', e.target.value)}
                  className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                  placeholder="40"
                  step="0.1"
                />
              </div>
              <div>
                <label className="eyebrow block mb-1.5 text-ink-2">
                  Número de columnas *
                </label>
                <input
                  type="number"
                  value={gondolas[currentGondolaIndex]?.columnas || ''}
                  onChange={(e) => handleGondolaChange('columnas', e.target.value)}
                  className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                  placeholder="3"
                  min="1"
                />
              </div>
              <div>
                <label className="eyebrow block mb-1.5 text-ink-2">
                  Número de filas/baldas *
                </label>
                <input
                  type="number"
                  value={gondolas[currentGondolaIndex]?.filas || ''}
                  onChange={(e) => handleGondolaChange('filas', e.target.value)}
                  className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                  placeholder="4"
                  min="1"
                />
              </div>
            </div>

            <div>
              <label className="eyebrow block mb-1.5 text-ink-2">
                Productos para *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(['femenino', 'masculino', 'unisex', 'indiferente'] as const).map(sexo => {
                  const isSelected = (gondolas[currentGondolaIndex]?.sexo_target || 'unisex') === sexo;
                  return (
                    <label
                      key={sexo}
                      className={`px-4 py-3 text-sm text-center border-2 rounded cursor-pointer transition ${
                        isSelected
                          ? 'border-cartistry-accent bg-cartistry-bg text-cartistry-text font-bold'
                          : 'border-cartistry-border text-cartistry-text-secondary hover:border-cartistry-accent'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`sexo_target_gondola_${currentGondolaIndex}`}
                        value={sexo}
                        checked={isSelected}
                        onChange={(e) => handleGondolaChange('sexo_target', e.target.value)}
                        className="hidden"
                      />
                      {sexo === 'femenino' ? 'Femenino' : sexo === 'masculino' ? 'Masculino' : sexo === 'unisex' ? 'Unisex' : 'Indiferente'}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={gondolas[currentGondolaIndex]?.es_escaparate || false}
                  onChange={(e) => handleGondolaChange('es_escaparate', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-cartistry-text">
                  Es escaparate (activa ZV-01)
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={gondolas[currentGondolaIndex]?.es_zona_caja || false}
                  onChange={(e) => handleGondolaChange('es_zona_caja', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-cartistry-text">
                  Es zona de caja (activa ZV-03)
                </span>
              </label>
              <div className="pt-2 border-t border-cartistry-border mt-2">
                <p className="text-xs font-medium text-cartistry-text mb-1.5">Caras con producto</p>
                <div className="grid grid-cols-2 gap-1.5 text-sm">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={gondolas[currentGondolaIndex]?.cara_frontal || false}
                      onChange={(e) => handleGondolaChange('cara_frontal', e.target.checked)}
                    />
                    <span className="text-cartistry-text">Frontal (cara A)</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={gondolas[currentGondolaIndex]?.cara_trasera || false}
                      onChange={(e) => handleGondolaChange('cara_trasera', e.target.checked)}
                    />
                    <span className="text-cartistry-text">Trasera (cara B)</span>
                  </label>
                </div>
                <p className="text-[10px] text-cartistry-text-secondary mt-1.5">
                  Las caras laterales y superior puedes activarlas después editando el mueble.
                </p>
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              {currentGondolaIndex > 0 && (
                <button
                  type="button"
                  onClick={handlePrevGondola}
                  className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-sunk transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  ← Anterior
                </button>
              )}

              {currentGondolaIndex < gondolas.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNextGondola}
                  className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  Siguiente →
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  {loading ? 'Guardando...' : 'Completar'}
                </button>
              )}
            </div>
          </form>
        </>
      )}
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
          <label className="eyebrow block mb-1.5 text-ink-2">
            ¿Cuántas paredes propias tiene? *
          </label>
          <input
            type="number"
            value={numParedes}
            onChange={(e) => setNumParedes(e.target.value)}
            className="w-full px-4 py-2 border border-cartistry-border rounded text-sm bg-white text-cartistry-text focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
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
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[2px] text-sm font-medium bg-ink text-surface hover:bg-[#282c33] transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            {loading ? 'Guardando...' : 'Completar'}
          </button>
        </div>
      </form>
    </div>
  );
}
