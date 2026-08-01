// Bloques 2 y 2b — Puntuación de posición y mapa de calor del espacio.
// Determinista, sin side-effects. Devuelve un SpaceMap que enriquece la
// asignación posterior pero NO la modifica todavía (cableado en paralelo).

import { Store, Mueble, FaceOrientation, Visibility } from '@cartistry/types';

export interface PositionScoreComponents {
  trafficZone: number;       // 0..30  — proviene del Bloque 2b
  visibility: number;        // 0..15  — visibilidad de la cara
  goldenShelf: number;       // 0..20  — altura comprador
  role: number;              // 0..25  — escaparate / caja / fondo
  entranceProximity: number; // 0..10  — proximidad a la entrada
}

export interface PositionScoreFlags {
  isEscaparate: boolean;
  isGoldenShelf: boolean;
  isZonaCaja: boolean;
  isPasilloPrincipal: boolean;
  isEntrada: boolean;
  isFondo: boolean;
  isRightOfEntrance: boolean;
}

export interface PositionScore {
  baldaId: string;
  zoneId: string;
  muebleId: string;
  muebleNombre: string;
  total: number; // 0..100
  components: PositionScoreComponents;
  flags: PositionScoreFlags;
  alturaSuelo: number;
}

export interface ZoneSignals {
  pasilloPrincipal: boolean;
  visibilityCara: Visibility;
  orientacion: FaceOrientation;
  facingEntrada: boolean;
  crossroads: boolean;     // Bloque 2b: cruce de pasillos
  permanencia: boolean;    // Bloque 2b: caja / mostrador
  rightOfEntrance: boolean; // Bloque 2b: patrón 90% gira a la derecha
}

export interface ZoneHeatmap {
  zoneId: string;
  muebleId: string;
  muebleNombre: string;
  caraId: string;
  trafficScore: number; // 0..100
  signals: ZoneSignals;
}

export interface SpaceMap {
  zones: ZoneHeatmap[];
  positions: PositionScore[];
  rankedPositions: string[];     // baldaIds ordenados de mayor a menor `total`
  topPositions: PositionScore[]; // top 5 para inspección rápida
  bottomPositions: PositionScore[]; // bottom 5
}

export interface PositionScorerParams {
  alturaCompradorCm?: number; // default 160
}

const RIGHT_OF_ENTRANCE_MULTIPLIER = 1.15;

export class PositionScorer {
  constructor(
    private store: Store,
    private params: PositionScorerParams = {}
  ) {}

  build(): SpaceMap {
    const zones = this.buildZones();
    const zoneById = new Map(zones.map((z) => [z.zoneId, z]));
    const positions = this.buildPositions(zoneById);
    const ranked = [...positions].sort((a, b) => b.total - a.total);
    return {
      zones,
      positions,
      rankedPositions: ranked.map((p) => p.baldaId),
      topPositions: ranked.slice(0, 5),
      bottomPositions: ranked.slice(-5).reverse(),
    };
  }

  // -------- BLOQUE 2b: MAPA DE CALOR DEL ESPACIO ----------
  private buildZones(): ZoneHeatmap[] {
    const out: ZoneHeatmap[] = [];
    const entranceSide = this.store.entrada_orientacion;

    for (const mueble of this.store.muebles) {
      // Crossroads: ≥2 caras del mueble que dan a pasillo principal
      const numPasilloCaras = mueble.caras.filter((c) => c.es_pasillo_principal).length;
      const crossroads = numPasilloCaras >= 2;
      const rightOfEntrance = this.isRightOfEntrance(mueble, entranceSide);
      const permanencia = !!mueble.es_zona_caja;

      for (const cara of mueble.caras) {
        const facingEntrada = cara.orientacion === entranceSide;
        const visibility = cara.visibilidad;

        // Suma base — todas las señales del documento.
        let traffic = 0;
        if (visibility === 'alta') traffic += 35;
        else if (visibility === 'media') traffic += 20;
        else traffic += 10;

        if (cara.es_pasillo_principal) traffic += 20;
        // "Mueble da al pasillo principal" = al menos una de sus caras lo tiene.
        const muebleDaPasillo = mueble.caras.some((c) => c.es_pasillo_principal);
        if (muebleDaPasillo) traffic += 10;
        if (facingEntrada) traffic += 20;
        if (crossroads) traffic += 10;
        if (permanencia) traffic += 5; // caja: paso, no permanencia larga

        if (rightOfEntrance) traffic = Math.round(traffic * RIGHT_OF_ENTRANCE_MULTIPLIER);

        traffic = Math.min(100, Math.max(0, Math.round(traffic)));

        out.push({
          zoneId: `${mueble.id}|${cara.id}`,
          muebleId: mueble.id,
          muebleNombre: mueble.nombre,
          caraId: cara.id,
          trafficScore: traffic,
          signals: {
            pasilloPrincipal: cara.es_pasillo_principal,
            visibilityCara: visibility,
            orientacion: cara.orientacion,
            facingEntrada,
            crossroads,
            permanencia,
            rightOfEntrance,
          },
        });
      }
    }
    return out;
  }

  /**
   * Decisión 3(a): el patrón "90% gira a la derecha" se traduce a la cuadrícula
   * en función de la entrada. La columna ancla del mueble (esquina superior-
   * izquierda cuando el mueble es un rango, p.ej. `A1:C2` → ancla A1) define
   * la mitad. Cuando no hay cuadrícula informada, el multiplicador no se aplica.
   */
  private isRightOfEntrance(mueble: Mueble, entranceSide: FaceOrientation): boolean {
    const pos = mueble.posicion_cuadricula;
    if (!pos) return false;
    // Si es un rango (`A1:C2`), nos quedamos con la esquina origen como ancla.
    const origin = pos.split(':')[0].trim().toUpperCase();
    const m = origin.match(/^([A-Z]+)(\d+)$/);
    if (!m) return false;
    // Solo usamos la primera letra para clasificar mitad izquierda/derecha
    // (con columnas multi-letra `AA` esto se mantiene coherente porque la
    // letra inicial domina el orden alfabético).
    const col = m[1].charAt(0);
    const row = parseInt(m[2], 10) || 0;

    if (entranceSide === 'derecha') return ['A', 'B'].includes(col);
    if (entranceSide === 'izquierda') return ['D', 'E', 'F'].includes(col);
    if (entranceSide === 'fondo') return row <= 2;
    // 'entrada' (frontal) o 'superior' por defecto
    return ['D', 'E', 'F'].includes(col);
  }

  // -------- BLOQUE 2: PUNTUACIÓN DE POSICIÓN ----------
  private buildPositions(zoneById: Map<string, ZoneHeatmap>): PositionScore[] {
    const alturaComprador = this.params.alturaCompradorCm || 160;
    // Zona dorada operativa: ojos del comprador ≈ altura - 10cm; ventana ±20cm.
    const goldenMin = alturaComprador - 30;
    const goldenMax = alturaComprador + 10;

    const out: PositionScore[] = [];

    for (const mueble of this.store.muebles) {
      const isEntradaMueble = mueble.caras.some((c) => c.es_pasillo_principal);
      const isZonaCaja = !!mueble.es_zona_caja;
      const muebleEsEscaparate = !!mueble.es_escaparate;

      for (const cara of mueble.caras) {
        const zone = zoneById.get(`${mueble.id}|${cara.id}`)!;
        const isEscaparate = !!cara.es_escaparate || muebleEsEscaparate;
        const isEntrada = cara.orientacion === this.store.entrada_orientacion;
        const isFondo = cara.orientacion === 'fondo' && !isEntrada;

        for (const balda of cara.baldas) {
          const altura = balda.altura_suelo || 0;
          const isGolden = altura >= goldenMin && altura <= goldenMax;

          // 1) trafficZone (0..30) ← Bloque 2b normalizado
          const trafficZone = Math.round((zone.trafficScore / 100) * 30);

          // 2) visibility (0..15)
          const visibility =
            cara.visibilidad === 'alta' ? 15 : cara.visibilidad === 'media' ? 10 : 5;

          // 3) goldenShelf (0..20): 20 dentro de la ventana, decae 0.5pt por cm
          let goldenShelf: number;
          if (isGolden) {
            goldenShelf = 20;
          } else {
            const dist = Math.min(
              Math.abs(altura - goldenMin),
              Math.abs(altura - goldenMax)
            );
            goldenShelf = Math.max(0, Math.round(20 - dist * 0.5));
          }

          // 4) role (0..25): escaparate prioridad máxima, después caja, después fondo
          let role = 0;
          if (isEscaparate) role = 25;
          else if (isZonaCaja) role = 15;
          else if (isFondo) role = 8;

          // 5) entranceProximity (0..10)
          const entranceProximity = isEntrada
            ? 10
            : cara.es_pasillo_principal
              ? 5
              : isEntradaMueble
                ? 3
                : 0;

          const total = Math.min(
            100,
            trafficZone + visibility + goldenShelf + role + entranceProximity
          );

          out.push({
            baldaId: balda.id,
            zoneId: zone.zoneId,
            muebleId: mueble.id,
            muebleNombre: mueble.nombre,
            total,
            components: {
              trafficZone,
              visibility,
              goldenShelf,
              role,
              entranceProximity,
            },
            flags: {
              isEscaparate,
              isGoldenShelf: isGolden,
              isZonaCaja,
              isPasilloPrincipal: cara.es_pasillo_principal,
              isEntrada,
              isFondo,
              isRightOfEntrance: zone.signals.rightOfEntrance,
            },
            alturaSuelo: altura,
          });
        }
      }
    }
    return out;
  }
}
