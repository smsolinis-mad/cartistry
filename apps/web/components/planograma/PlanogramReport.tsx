'use client';

import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet, Svg, Circle, Rect, G } from '@react-pdf/renderer';

const palette = {
  ink: '#1A1714',
  paper: '#F4F0E9',
  paper2: '#EBE5DB',
  card: '#FFFFFF',
  gold: '#9A7B4F',
  goldSoft: '#C9B48D',
  goldBg: '#EFE7D8',
  line: '#DDD4C5',
  muted: '#8A8073',
  green: '#3F7D5A',
  greenBg: '#E6EFE8',
  amber: '#C9892F',
  amberBg: '#F7ECD6',
  red: '#B0413E',
  redBg: '#F6E3E1',
  catFashion: '#9A7B4F',
  catWork: '#5A6D7D',
  catParty: '#9C5A6E',
  catHome: '#7D8A5A',
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: palette.paper,
    padding: 22,
    paddingBottom: 32,
    color: palette.ink,
    fontFamily: 'Helvetica',
    fontSize: 9,
    position: 'relative',
  },
  brandbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1.5,
    borderBottomColor: palette.ink,
    paddingBottom: 6,
    marginBottom: 4,
  },
  brand: {
    fontSize: 12,
    fontFamily: 'Times-Bold',
    letterSpacing: 3,
    color: palette.ink,
  },
  brandDot: {
    color: palette.gold,
  },
  confid: {
    fontSize: 7,
    letterSpacing: 1.5,
    color: palette.muted,
  },
  kicker: {
    fontSize: 8,
    letterSpacing: 2.5,
    color: palette.gold,
    fontFamily: 'Helvetica-Bold',
    marginTop: 10,
    textTransform: 'uppercase',
  },
  h1: {
    fontFamily: 'Times-Bold',
    fontSize: 24,
    color: palette.ink,
    marginTop: 2,
    marginBottom: 1,
  },
  sub: {
    fontFamily: 'Times-Italic',
    color: palette.muted,
    fontSize: 11,
    marginBottom: 7,
  },
  coverMeta: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: palette.line,
    borderBottomColor: palette.line,
    paddingVertical: 6,
    marginTop: 2,
  },
  coverMetaItem: {
    flex: 1,
  },
  coverMetaBold: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: palette.ink,
    marginBottom: 2,
  },
  coverMetaText: {
    fontSize: 8,
    color: palette.muted,
  },
  headline: {
    backgroundColor: palette.ink,
    color: palette.paper,
    borderRadius: 3,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginVertical: 10,
  },
  headlineLab: {
    fontSize: 8,
    letterSpacing: 3,
    color: palette.goldSoft,
    textTransform: 'uppercase',
  },
  headlineBig: {
    fontFamily: 'Times-Bold',
    fontSize: 17,
    color: palette.paper,
    marginTop: 5,
    lineHeight: 1.2,
  },
  headlineEm: {
    color: palette.goldSoft,
  },
  headlineNote: {
    fontSize: 9,
    color: '#CFC6B6',
    marginTop: 8,
    lineHeight: 1.4,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    marginHorizontal: -5,
  },
  kpi: {
    width: '33.33%',
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  kpiInner: {
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 3,
    paddingVertical: 7,
    paddingHorizontal: 9,
    paddingLeft: 12,
    borderLeftWidth: 4,
    minHeight: 60,
    position: 'relative',
  },
  kpiLbl: {
    fontSize: 7,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: palette.muted,
    fontFamily: 'Helvetica-Bold',
  },
  kpiVal: {
    fontFamily: 'Times-Bold',
    fontSize: 19,
    color: palette.ink,
    marginTop: 3,
    marginBottom: 2,
  },
  kpiValSmall: {
    fontSize: 12,
    color: palette.muted,
  },
  kpiTag: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  kpiCtx: {
    fontSize: 7.5,
    color: palette.muted,
    marginTop: 5,
    lineHeight: 1.35,
  },
  stockHead: {
    fontSize: 8,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: palette.gold,
    fontFamily: 'Helvetica-Bold',
    marginTop: 10,
    marginBottom: 5,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    paddingTop: 7,
  },
  stockBlock: {
    flexDirection: 'row',
    gap: 12,
  },
  stockStats: {
    flex: 0.95,
  },
  sc: {
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    borderLeftWidth: 3,
    borderLeftColor: palette.gold,
    borderRadius: 3,
    paddingVertical: 6,
    paddingHorizontal: 9,
    marginBottom: 5,
  },
  scLbl: {
    fontSize: 7,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: palette.muted,
    fontFamily: 'Helvetica-Bold',
  },
  scVal: {
    fontFamily: 'Times-Bold',
    fontSize: 15,
    color: palette.ink,
    marginTop: 1,
    marginBottom: 1,
  },
  scCtx: {
    fontSize: 7,
    color: palette.muted,
  },
  stockCat: {
    flex: 1.4,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 3,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  sctHead: {
    flexDirection: 'row',
    fontSize: 7,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: palette.muted,
    fontFamily: 'Helvetica-Bold',
    borderBottomWidth: 1.5,
    borderBottomColor: palette.ink,
    paddingBottom: 5,
    marginBottom: 7,
  },
  legend: {
    flexDirection: 'row',
    gap: 14,
    fontSize: 7.5,
    color: palette.muted,
    marginTop: 8,
    paddingTop: 6,
  },
  foot: {
    position: 'absolute',
    bottom: 12,
    left: 22,
    right: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    letterSpacing: 1.5,
    color: palette.muted,
    textTransform: 'uppercase',
    borderTopWidth: 1,
    borderTopColor: palette.line,
    paddingTop: 5,
  },
  secH: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  secNum: {
    fontFamily: 'Times-Bold',
    fontSize: 11,
    color: palette.gold,
  },
  secH2: {
    fontFamily: 'Times-Bold',
    fontSize: 15,
    color: palette.ink,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 3,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  cardH3: {
    fontFamily: 'Times-Bold',
    fontSize: 11,
    color: palette.ink,
    marginBottom: 2,
  },
  cardSub: {
    fontSize: 8,
    color: palette.muted,
    marginBottom: 9,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 7,
  },
  barName: {
    width: 60,
    textAlign: 'right',
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: palette.ink,
  },
  barTrack: {
    flex: 1,
    height: 12,
    backgroundColor: '#EFE9DE',
    borderRadius: 2,
    position: 'relative',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  barVal: {
    width: 80,
    fontSize: 8,
    color: palette.muted,
  },
  barValBold: {
    color: palette.ink,
    fontFamily: 'Helvetica-Bold',
  },
  notePara: {
    fontSize: 8,
    color: palette.muted,
    marginTop: 7,
    lineHeight: 1.5,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    paddingTop: 6,
  },
  action: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    borderLeftWidth: 4,
    borderRadius: 3,
    paddingVertical: 8,
    paddingHorizontal: 11,
    marginBottom: 6,
  },
  actionN: {
    fontFamily: 'Times-Bold',
    fontSize: 18,
    color: palette.goldSoft,
    width: 22,
    flexShrink: 0,
  },
  actionH4: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: palette.ink,
    marginBottom: 2,
  },
  actionP: {
    fontSize: 8,
    color: '#5C544A',
    lineHeight: 1.4,
  },
  actionImpact: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: palette.green,
    marginTop: 4,
  },
  cta: {
    backgroundColor: palette.ink,
    borderRadius: 3,
    paddingVertical: 13,
    paddingHorizontal: 18,
    marginTop: 8,
  },
  ctaLab: {
    fontSize: 8,
    letterSpacing: 3,
    color: palette.goldSoft,
    textTransform: 'uppercase',
  },
  ctaH3: {
    fontFamily: 'Times-Bold',
    fontSize: 14,
    color: palette.paper,
    marginTop: 4,
    marginBottom: 4,
  },
  ctaP: {
    fontSize: 9,
    color: '#CFC6B6',
    lineHeight: 1.5,
  },
  ctaMetrics: {
    flexDirection: 'row',
    gap: 28,
    marginTop: 11,
  },
  ctaMetricBig: {
    fontFamily: 'Times-Bold',
    fontSize: 18,
    color: palette.goldSoft,
  },
  ctaMetricLbl: {
    fontSize: 7,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#A89E8D',
    marginTop: 2,
  },
  // heatmap grid (with images)
  heatGrid: {
    marginTop: 6,
  },
  heatRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  heatRowTag: {
    fontSize: 7,
    color: palette.muted,
    fontFamily: 'Times-Italic',
    textAlign: 'right',
    marginVertical: 1,
  },
  heatRowTagGold: {
    fontSize: 7,
    color: palette.green,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#CDBFA0',
    borderBottomWidth: 1,
    borderBottomColor: '#CDBFA0',
    paddingVertical: 2,
    marginVertical: 2,
  },
  hueco: {
    flex: 1,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 3,
    marginHorizontal: 2,
    padding: 3,
    minHeight: 64,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  huecoEmpty: {
    backgroundColor: '#FAF8F4',
    borderStyle: 'dashed',
    borderColor: '#C9BFA9',
  },
  prodBox: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 1,
  },
  heatLegend: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 8,
    fontSize: 7.5,
    color: palette.muted,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    paddingTop: 6,
  },
});

export interface StoreData {
  id: string;
  nombre: string;
  direccion: string;
  tipo: string;
  metros2: number;
  categoria_venta?: string;
}

export interface ReportData {
  store: StoreData | null;
  productCount: number;
  salesCount: number;
  stockTotalUnidades?: number;
  stockTotalValorado?: number;
  coberturaStock?: string;
  metricasDuracion?: {
    numeroTickets?: number;
    unidadesMediasPorTicket: number;
    ticketMedioValorado: number;
    unidadesVendidasTotales: number;
    ventasTotales: number;
    inicio?: string;
    fin?: string;
  };
  infoGlobalVisual?: {
    numRefExpuestas: number;
    unidadesStockExpuesto: number;
    valorStockExpuesto: number;
    productoMasRentable: { nombre: string; margenUnitario: number } | null;
    productosEnfoqueVenta: Array<{ nombre: string; razon: string }>;
  };
  generatedAt: string;
  objetivo?: string;
  duracion?: string;
  periodoVentas?: {
    inicio: string;
    fin: string;
  };
  topRules?: Array<{
    rule: string;
    count: number;
    description: string;
  }>;
  assignments?: Array<{
    ean: string;
    productName: string;
    position: string;
    razon: string;
    isLiquidation?: boolean;
    imageUrl?: string;
  }>;
  alerts?: Array<{
    code: string;
    severity: 'info' | 'warn' | 'error';
    message: string;
  }>;
  estructura?: {
    num_columnas: number;
    num_filas: number;
  };
  muebles?: Array<{
    id: string;
    nombre: string;
    alto: number;
    ancho: number;
    profundo: number;
    num_filas: number;
    num_columnas: number;
    assignmentsDelMueble?: Array<{
      ean: string;
      productName: string;
      position: string;
      razon: string;
      isLiquidation?: boolean;
      imageUrl?: string;
    }>;
  }>;
  stockAnalysis?: {
    cobertura: string;
    margenBrutoProyectado: number;
    rotacionMedia: number;
    valorStockExpuesto: number;
    productoMasRentable: {
      nombre: string;
      margenUnitario: number;
    } | null;
    productosEnRiesgo: Array<{
      nombre: string;
      periodossinVenta: number;
    }>;
  };
  analisisProductos?: {
    top10Productos: Array<{
      nombre: string;
      unidadesVendidas: number;
      porcentajeMax: number;
    }>;
    top3Tendencias: Array<{
      nombre: string;
      tendencia: 'up' | 'down' | 'stable';
    }>;
    margenPorCategoria: Array<{
      categoria: string;
      margenTotal: number;
      porcentajeMax: number;
    }>;
  };
}

function buildProxyUrl(url: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/api/image-proxy?url=${encodeURIComponent(url)}`;
}

const fmtEur = (n: number) =>
  '€' + Math.round(n).toLocaleString('es-ES');
const fmtPct = (n: number) => `${Math.round(n)}%`;
const fmtNum = (n: number) => Math.round(n).toLocaleString('es-ES');

function flagColor(kind: 'g' | 'a' | 'r' | 'n'): string {
  if (kind === 'g') return palette.green;
  if (kind === 'a') return palette.amber;
  if (kind === 'r') return palette.red;
  return palette.gold;
}

function tagColors(kind: 'g' | 'a' | 'r' | 'n') {
  if (kind === 'g') return { bg: palette.greenBg, fg: palette.green };
  if (kind === 'a') return { bg: palette.amberBg, fg: palette.amber };
  if (kind === 'r') return { bg: palette.redBg, fg: palette.red };
  return { bg: palette.goldBg, fg: palette.gold };
}

function Brandbar() {
  return (
    <View style={styles.brandbar}>
      <Text style={styles.brand}>
        CARTISTRY<Text style={styles.brandDot}>.</Text>
      </Text>
      <Text style={styles.confid}>Informe Confidencial · Visual Merchandising</Text>
    </View>
  );
}

function Foot({ storeName, periodo }: { storeName: string; periodo?: string }) {
  return (
    <View style={styles.foot} fixed>
      <Text>© Cartistry 2026</Text>
      <Text>
        {storeName}
        {periodo ? ` · ${periodo}` : ''}
      </Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `${String(pageNumber).padStart(2, '0')} / ${String(totalPages).padStart(2, '0')}`
        }
      />
    </View>
  );
}

function KPI({
  kind,
  label,
  value,
  unit,
  tag,
  ctx,
}: {
  kind: 'g' | 'a' | 'r' | 'n';
  label: string;
  value: string;
  unit?: string;
  tag?: string;
  ctx?: string;
}) {
  const tg = tagColors(kind);
  return (
    <View style={styles.kpi}>
      <View style={[styles.kpiInner, { borderLeftColor: flagColor(kind) }]}>
        <Text style={styles.kpiLbl}>{label}</Text>
        <Text style={styles.kpiVal}>
          {value}
          {unit ? <Text style={styles.kpiValSmall}>{unit}</Text> : null}
        </Text>
        {tag && (
          <View style={{ flexDirection: 'row' }}>
            <Text style={[styles.kpiTag, { backgroundColor: tg.bg, color: tg.fg }]}>
              {tag}
            </Text>
          </View>
        )}
        {ctx && <Text style={styles.kpiCtx}>{ctx}</Text>}
      </View>
    </View>
  );
}

function SecHeader({ num, title }: { num: string; title: string }) {
  return (
    <View style={styles.secH}>
      <Text style={styles.secNum}>{num}</Text>
      <Text style={styles.secH2}>{title}</Text>
    </View>
  );
}

function deriveMetrics(data: ReportData) {
  const stockUnidades = data.stockTotalUnidades || 0;
  const stockValor = data.stockTotalValorado || 0;
  const ventas = data.metricasDuracion?.ventasTotales || 0;
  const unidadesVendidas = data.metricasDuracion?.unidadesVendidasTotales || 0;
  const tickets = data.metricasDuracion?.numeroTickets || 0;
  const ticketMedio = data.metricasDuracion?.ticketMedioValorado || 0;
  const udsPorTicket = data.metricasDuracion?.unidadesMediasPorTicket || 0;
  const margenBruto = data.stockAnalysis?.margenBrutoProyectado || 0;
  const rotacion = data.stockAnalysis?.rotacionMedia || 0;
  const refsExpuestas = data.infoGlobalVisual?.numRefExpuestas ?? data.productCount;

  const sellThroughPct =
    stockUnidades > 0 ? (unidadesVendidas / stockUnidades) * 100 : 0;

  // cobertura: ya viene "X.X semanas" desde stockAnalysis.cobertura; intentamos parsear
  const coberturaStr = data.coberturaStock || data.stockAnalysis?.cobertura || '';
  const coberturaMatch = coberturaStr.match(/([\d.,]+)/);
  const coberturaSemanas = coberturaMatch
    ? parseFloat(coberturaMatch[1].replace(',', '.'))
    : 0;

  const m2 = Number(data.store?.metros2 || 0);
  const ventaPorM2 = m2 > 0 ? ventas / m2 : 0;
  const ventaPorM2Anual = ventaPorM2 * 26; // proyección 26 quincenas

  const pvpMedio = unidadesVendidas > 0 ? ventas / unidadesVendidas : 0;

  // Liberación de capital: lo que excede 4 semanas de cobertura
  const ventaPorSemanaUds =
    coberturaSemanas > 0 ? stockUnidades / coberturaSemanas : 0;
  const stockObjetivoUds = ventaPorSemanaUds * 4;
  const stockObjetivoValor =
    stockUnidades > 0 ? (stockValor * stockObjetivoUds) / stockUnidades : 0;
  const liberable = Math.max(0, stockValor - stockObjetivoValor);
  const stockUtilPct =
    stockValor > 0 ? Math.min(100, (stockObjetivoValor / stockValor) * 100) : 0;

  return {
    stockUnidades,
    stockValor,
    ventas,
    unidadesVendidas,
    tickets,
    ticketMedio,
    udsPorTicket,
    margenBruto,
    rotacion,
    refsExpuestas,
    sellThroughPct,
    coberturaSemanas,
    ventaPorM2,
    ventaPorM2Anual,
    pvpMedio,
    stockObjetivoValor,
    liberable,
    stockUtilPct,
  };
}

export function PlanogramReport({ data }: { data: ReportData }) {
  const m = deriveMetrics(data);
  const storeName = data.store?.nombre || 'CARTISTRY';
  const periodoLabel = (() => {
    const ini = data.metricasDuracion?.inicio || data.periodoVentas?.inicio;
    const fin = data.metricasDuracion?.fin || data.periodoVentas?.fin;
    if (!ini || !fin) return '';
    return `${ini} – ${fin}`;
  })();
  const numMuebles = data.muebles?.length || 0;

  // Clasificación por rendimiento para colorear los productos del heatmap visual.
  type Tier = 'estrella' | 'margen' | 'gancho' | 'media' | 'baja';
  const topProductos = data.analisisProductos?.top10Productos || [];
  const top3Names = new Set(topProductos.slice(0, 3).map((p) => p.nombre));
  const top4to10Names = new Set(topProductos.slice(3, 10).map((p) => p.nombre));
  const top10NamesAll = new Set(topProductos.map((p) => p.nombre));
  const masRentableNombre = data.stockAnalysis?.productoMasRentable?.nombre || '';
  const namesWithoutSales = new Set(
    topProductos.filter((p) => (p.unidadesVendidas || 0) === 0).map((p) => p.nombre)
  );
  const tierFor = (producto: {
    productName: string;
    isLiquidation?: boolean;
    razon?: string;
  }): Tier => {
    const razon = (producto.razon || '').toLowerCase();
    if (producto.isLiquidation || razon.includes('liquid')) return 'baja';
    if (namesWithoutSales.has(producto.productName)) return 'baja';
    if (top3Names.has(producto.productName)) return 'estrella';
    if (masRentableNombre && producto.productName === masRentableNombre) return 'margen';
    if (top4to10Names.has(producto.productName)) return 'gancho';
    if (top10NamesAll.has(producto.productName)) return 'media';
    return 'media';
  };
  const tierColors: Record<Tier, string> = {
    estrella: palette.green,
    margen: palette.gold,
    gancho: palette.amber,
    media: palette.goldSoft,
    baja: palette.red,
  };

  // métricas para "headline" — calculadas con datos disponibles
  const sellThroughKind: 'g' | 'a' | 'r' =
    m.sellThroughPct >= 30 ? 'g' : m.sellThroughPct >= 15 ? 'a' : 'r';
  const coberturaKind: 'g' | 'a' | 'r' =
    m.coberturaSemanas <= 4 ? 'g' : m.coberturaSemanas <= 8 ? 'a' : 'r';
  const rotacionKind: 'g' | 'a' | 'r' =
    m.rotacion >= 0.5 ? 'g' : m.rotacion >= 0.2 ? 'a' : 'r';

  const margenPorCategoria = data.analisisProductos?.margenPorCategoria || [];
  const categoryColor = (idx: number) => {
    const list = [palette.catFashion, palette.catWork, palette.catParty, palette.catHome, palette.gold, palette.green];
    return list[idx % list.length];
  };

  return (
    <Document>
      {/* ---------- PÁGINA 1 — DASHBOARD EJECUTIVO ---------- */}
      <Page size="A4" style={styles.page}>
        <Brandbar />
        <Text style={styles.kicker}>
          Diagnóstico de lineal · {data.store?.categoria_venta || 'Boutique'}
        </Text>
        <Text style={styles.h1}>{storeName.toUpperCase()}</Text>
        <Text style={styles.sub}>Análisis de rendimiento y oportunidad de surtido</Text>

        <View style={styles.coverMeta}>
          <View style={styles.coverMetaItem}>
            <Text style={styles.coverMetaBold}>{data.store?.direccion || '—'}</Text>
            <Text style={styles.coverMetaText}>
              {data.store?.metros2 || '—'} m² · {data.store?.categoria_venta || 'Boutique'}
            </Text>
          </View>
          <View style={styles.coverMetaItem}>
            <Text style={styles.coverMetaBold}>{data.productCount} referencias</Text>
            <Text style={styles.coverMetaText}>{numMuebles} mueble{numMuebles !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.coverMetaItem}>
            <Text style={styles.coverMetaBold}>{periodoLabel || '—'}</Text>
            <Text style={styles.coverMetaText}>Periodo · {data.duracion || ''}</Text>
          </View>
          <View style={styles.coverMetaItem}>
            <Text style={styles.coverMetaBold}>{fmtEur(m.stockValor)}</Text>
            <Text style={styles.coverMetaText}>Stock valorado</Text>
          </View>
        </View>

        <View style={styles.headline}>
          <Text style={styles.headlineLab}>Hallazgo principal</Text>
          <Text style={styles.headlineBig}>
            Hay <Text style={styles.headlineEm}>{fmtEur(m.liberable)}</Text> de capital inmovilizado
            {'\n'}y un sell-through del{' '}
            <Text style={styles.headlineEm}>{fmtPct(m.sellThroughPct)}</Text>.
          </Text>
          <Text style={styles.headlineNote}>
            Con la rotación actual, el stock expuesto cubre{' '}
            {m.coberturaSemanas ? m.coberturaSemanas.toFixed(1) : '—'} semanas de venta en un planograma de{' '}
            {data.duracion || '2 semanas'}. Reequilibrar el surtido libera caja sin perder ventas.
          </Text>
        </View>

        <View style={styles.kpiGrid}>
          <KPI
            kind={sellThroughKind}
            label="Sell-through"
            value={fmtPct(m.sellThroughPct)}
            tag={sellThroughKind === 'g' ? 'Bueno · >30%' : sellThroughKind === 'a' ? 'Mejorable' : 'Bajo · obj >30%'}
            ctx={`${fmtNum(m.unidadesVendidas)} de ${fmtNum(m.stockUnidades)} uds vendidas.`}
          />
          <KPI
            kind={coberturaKind}
            label="Cobertura de stock"
            value={m.coberturaSemanas ? m.coberturaSemanas.toFixed(1) : '—'}
            unit=" sem"
            tag={coberturaKind === 'g' ? 'Saludable' : coberturaKind === 'a' ? 'A vigilar' : 'Sobre-stock'}
            ctx={`Planograma activo: ${data.duracion || '—'}.`}
          />
          <KPI
            kind={rotacionKind}
            label="Rotación"
            value={m.rotacion ? m.rotacion.toFixed(2) : '—'}
            unit="×"
            tag={rotacionKind === 'g' ? 'Buena' : rotacionKind === 'a' ? 'Mejorable' : 'Baja'}
            ctx={`Se vende un ${fmtPct(m.rotacion * 100)} del valor expuesto en el periodo.`}
          />
          <KPI
            kind="g"
            label="Venta total periodo"
            value={fmtEur(m.ventas)}
            tag={`${fmtNum(m.tickets)} tickets`}
            ctx={`Ticket medio ${fmtEur(m.ticketMedio)} · ${m.udsPorTicket.toFixed(2)} uds/ticket.`}
          />
          <KPI
            kind="g"
            label="PVP medio / unidad"
            value={m.pvpMedio ? fmtEur(m.pvpMedio) : '—'}
            tag={data.store?.categoria_venta || 'Coherente'}
            ctx={`Stock valorado ${fmtEur(m.stockValor)}.`}
          />
          <KPI
            kind="n"
            label="Margen bruto periodo"
            value={fmtEur(m.margenBruto)}
            tag={`${margenPorCategoria.length} categorías`}
            ctx={
              margenPorCategoria[0]
                ? `${margenPorCategoria[0].categoria} concentra el ${fmtPct(
                    (margenPorCategoria[0].margenTotal /
                      (margenPorCategoria.reduce((s, c) => s + c.margenTotal, 0) || 1)) *
                      100
                  )} del margen.`
                : '—'
            }
          />
        </View>

        <Text style={styles.stockHead}>
          Inventario {periodoLabel ? `· ${periodoLabel.split('–')[1]?.trim() || ''}` : ''} · cierre de periodo
        </Text>

        <View style={styles.stockBlock}>
          <View style={styles.stockStats}>
            <View style={styles.sc}>
              <Text style={styles.scLbl}>Unidades en stock</Text>
              <Text style={styles.scVal}>{fmtNum(m.stockUnidades)}</Text>
              <Text style={styles.scCtx}>
                {fmtNum(m.refsExpuestas)} referencias expuestas
              </Text>
            </View>
            <View style={styles.sc}>
              <Text style={styles.scLbl}>Valor de la mercancía</Text>
              <Text style={styles.scVal}>{fmtEur(m.stockValor)}</Text>
              <Text style={styles.scCtx}>A PVP · {data.productCount} referencias en ficha</Text>
            </View>
            <View style={styles.sc}>
              <Text style={styles.scLbl}>% stock expuesto</Text>
              <Text style={styles.scVal}>
                {fmtPct(
                  data.productCount > 0
                    ? (m.refsExpuestas / data.productCount) * 100
                    : 0
                )}
              </Text>
              <Text style={styles.scCtx}>
                Diferencia entre catálogo y exposición real.
              </Text>
            </View>
          </View>

          <View style={styles.stockCat}>
            <View style={styles.sctHead}>
              <Text style={{ width: 88 }}>Categoría</Text>
              <Text style={{ flex: 1 }}>Margen</Text>
              <Text style={{ flex: 1 }}>% del total</Text>
            </View>
            {margenPorCategoria.slice(0, 5).map((c, idx) => {
              const total = margenPorCategoria.reduce((s, x) => s + x.margenTotal, 0) || 1;
              const pct = (c.margenTotal / total) * 100;
              const col = categoryColor(idx);
              return (
                <View
                  key={c.categoria}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 7,
                  }}
                >
                  <View style={{ width: 88, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 1,
                        backgroundColor: col,
                      }}
                    />
                    <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold' }}>
                      {c.categoria.toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View
                      style={{
                        flex: 1,
                        height: 10,
                        backgroundColor: '#EFE9DE',
                        borderRadius: 2,
                      }}
                    >
                      <View
                        style={{
                          width: `${c.porcentajeMax || 0}%`,
                          height: '100%',
                          backgroundColor: col,
                          borderRadius: 2,
                        }}
                      />
                    </View>
                  </View>
                  <View style={{ flex: 1, paddingLeft: 8 }}>
                    <Text style={{ fontSize: 8, color: palette.muted }}>
                      <Text style={{ fontFamily: 'Helvetica-Bold', color: palette.ink }}>
                        {fmtEur(c.margenTotal)}
                      </Text>
                      {' · '}
                      {fmtPct(pct)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.legend}>
          <Text>
            <Text style={{ color: palette.green }}>● </Text>Saludable
          </Text>
          <Text>
            <Text style={{ color: palette.amber }}>● </Text>A vigilar
          </Text>
          <Text>
            <Text style={{ color: palette.red }}>● </Text>Acción requerida
          </Text>
          <Text>
            <Text style={{ color: palette.gold }}>● </Text>Informativo
          </Text>
        </View>

        <Foot storeName={storeName} periodo={periodoLabel} />
      </Page>

      {/* ---------- PÁGINA DE ALERTAS — Bloque 5/5b/6 ---------- */}
      {data.alerts && data.alerts.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Brandbar />
          <SecHeader num="!" title="Avisos del motor — revisa antes de implantar" />
          <View style={[styles.card, { marginTop: 6 }]}>
            <Text style={styles.cardH3}>
              {data.alerts.filter((a) => a.severity === 'warn' || a.severity === 'error').length}{' '}
              avisos relevantes · {data.alerts.filter((a) => a.severity === 'info').length}{' '}
              sugerencias
            </Text>
            <Text style={styles.cardSub}>
              Esta pasada del motor detectó situaciones que conviene revisar. Los avisos en rojo
              afectan al resultado del planograma; los informativos son oportunidades de mejora.
            </Text>
          </View>
          <View style={{ marginTop: 10, gap: 6 }}>
            {data.alerts
              .slice()
              .sort((a, b) => {
                const r = { error: 0, warn: 1, info: 2 } as const;
                return r[a.severity] - r[b.severity];
              })
              .map((a, idx) => {
                const color =
                  a.severity === 'error'
                    ? '#B00020'
                    : a.severity === 'warn'
                      ? '#A35200'
                      : '#5A5A5A';
                return (
                  <View
                    key={idx}
                    style={{
                      borderLeftWidth: 3,
                      borderLeftColor: color,
                      paddingLeft: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ fontSize: 9, color, fontFamily: 'Helvetica-Bold' }}>
                      [{a.code}] {a.severity.toUpperCase()}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#333', marginTop: 2 }}>
                      {a.message}
                    </Text>
                  </View>
                );
              })}
          </View>
          <Foot storeName={storeName} periodo={periodoLabel} />
        </Page>
      )}

      {/* ---------- PÁGINA 2 — SALUD DE STOCK + MATRIZ ---------- */}
      <Page size="A4" style={styles.page}>
        <Brandbar />
        <SecHeader num="01" title="Margen, rotación y dónde está el dinero" />

        <View style={styles.row}>
          <View style={[styles.card, { flex: 1 }]}>
            <Text style={styles.cardH3}>Margen bruto por categoría</Text>
            <Text style={styles.cardSub}>Contribución al margen · periodo {data.duracion || ''}</Text>
            {margenPorCategoria.slice(0, 6).map((c, idx) => {
              const total = margenPorCategoria.reduce((s, x) => s + x.margenTotal, 0) || 1;
              const pct = (c.margenTotal / total) * 100;
              const col = categoryColor(idx);
              return (
                <View key={c.categoria} style={styles.barRow}>
                  <Text style={styles.barName}>{c.categoria.toUpperCase()}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${c.porcentajeMax || 0}%`, backgroundColor: col },
                      ]}
                    />
                  </View>
                  <Text style={styles.barVal}>
                    <Text style={styles.barValBold}>{fmtEur(c.margenTotal)}</Text>
                    {' · '}
                    {fmtPct(pct)}
                  </Text>
                </View>
              );
            })}
            {margenPorCategoria.length > 0 && (
              <Text style={styles.notePara}>
                <Text style={{ fontFamily: 'Helvetica-Bold', color: palette.ink }}>Lectura: </Text>
                {margenPorCategoria[0].categoria} y{' '}
                {margenPorCategoria[1]?.categoria || '—'} generan el grueso del margen.
              </Text>
            )}
          </View>

          <View style={[styles.card, { flex: 1 }]}>
            <Text style={styles.cardH3}>Liberación de capital</Text>
            <Text style={styles.cardSub}>
              Stock actual vs. stock objetivo (4 sem. cobertura)
            </Text>
            <Svg viewBox="0 0 220 150" style={{ width: '100%', height: 110 }}>
              <G transform="translate(72,75)">
                <Circle cx={0} cy={0} r={52} fill="none" stroke="#efe9de" strokeWidth={20} />
                {/*
                  El arco coloreado solo se dibuja cuando hay stock útil > 0.
                  pdfkit rechaza `dash([0, N])` (los segmentos del dash array
                  tienen que ser > 0), así que con stockUtilPct=0 saltamos
                  el render del arco activo y solo queda el aro de fondo.
                */}
                {(() => {
                  const pct = Number.isFinite(m.stockUtilPct) ? m.stockUtilPct : 0;
                  if (pct <= 0) return null;
                  const dash = Math.max(0.1, (pct / 100) * 326);
                  return (
                    <G transform="rotate(-90)">
                      <Circle
                        cx={0}
                        cy={0}
                        r={52}
                        fill="none"
                        stroke={palette.green}
                        strokeWidth={20}
                        strokeDasharray={`${dash} 327`}
                      />
                    </G>
                  );
                })()}
                <Text x={0} y={-3} style={{ fontSize: 16, fontFamily: 'Times-Bold' }} fill={palette.ink} textAnchor="middle">
                  {fmtPct(m.stockUtilPct)}
                </Text>
                <Text x={0} y={10} style={{ fontSize: 7 }} fill={palette.muted} textAnchor="middle">
                  stock útil
                </Text>
              </G>
              <Rect x={150} y={42} width={10} height={10} rx={2} fill={palette.green} />
              <Text x={166} y={50} style={{ fontSize: 9, fontFamily: 'Helvetica-Bold' }} fill={palette.ink}>
                {fmtEur(m.stockObjetivoValor)}
              </Text>
              <Text x={166} y={61} style={{ fontSize: 7 }} fill={palette.muted}>
                Objetivo (4 sem)
              </Text>
              <Rect x={150} y={80} width={10} height={10} rx={2} fill="#efe9de" stroke="#ddd4c5" />
              <Text x={166} y={88} style={{ fontSize: 9, fontFamily: 'Helvetica-Bold' }} fill={palette.ink}>
                {fmtEur(m.liberable)}
              </Text>
              <Text x={166} y={99} style={{ fontSize: 7 }} fill={palette.muted}>
                Liberable
              </Text>
            </Svg>
            <Text style={styles.notePara}>
              <Text style={{ color: palette.red, fontFamily: 'Helvetica-Bold' }}>
                {fmtEur(m.liberable)}
              </Text>{' '}
              de los {fmtEur(m.stockValor)} en stock superan la cobertura razonable.
              Reduciendo profundidad por referencia se libera caja reinvertible.
            </Text>
          </View>
        </View>

        <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.cardH3}>Top 10 productos · unidades vendidas en el periodo</Text>
          <Text style={styles.cardSub}>
            Los más vendidos arrastran el sell-through del lineal.
          </Text>
          {(data.analisisProductos?.top10Productos || []).slice(0, 8).map((p, idx) => (
            <View key={idx} style={styles.barRow}>
              <Text style={[styles.barName, { width: 120 }]}>
                {p.nombre}
              </Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${p.porcentajeMax || 0}%`,
                      backgroundColor: palette.gold,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barVal}>
                <Text style={styles.barValBold}>{fmtNum(p.unidadesVendidas)}</Text> uds
              </Text>
            </View>
          ))}
          {(data.analisisProductos?.top10Productos || []).length === 0 && (
            <Text style={{ fontSize: 9, color: palette.muted, fontStyle: 'italic' }}>
              Sin datos de venta suficientes en el periodo.
            </Text>
          )}
        </View>

        <Foot storeName={storeName} periodo={periodoLabel} />
      </Page>

      {/* ---------- PÁGINAS HEATMAP (una por mueble) ---------- */}
      {data.muebles && data.muebles.length > 0 &&
        data.muebles.map((mueble, muebleIdx) => {
          const muebleAssignments = mueble.assignmentsDelMueble || [];
          const goldenRow = Math.floor(mueble.num_filas / 2);
          // refs sin exponer = catálogo - asignadas
          const refsAsignadas = muebleAssignments.length;

          const rowTag = (fila: number, isGolden: boolean) =>
            isGolden
              ? 'ZONA DORADA (eye-level) · top-sellers bien colocados'
              : fila > goldenRow
                ? 'Fila superior · visibilidad media'
                : fila === 0
                  ? 'Fila inferior · zona fría'
                  : 'Fila media-baja · alcance fácil';

          const cellProductos = (fila: number, colIdx: number) =>
            muebleAssignments.filter((p) => {
              const parts = p.position?.split('_') || [];
              const lastPart = parts[parts.length - 1];
              const secondLastPart = parts[parts.length - 2];
              return lastPart === String(fila) && secondLastPart === String(colIdx);
            });

          return (
          <React.Fragment key={muebleIdx}>
            {/* Página de referencias (nombre + EAN) — precede al heatmap visual */}
            <Page size="A4" style={styles.page}>
              <Brandbar />
              <SecHeader num="02" title={`Referencias por hueco · ${mueble.nombre}`} />

              <View style={[styles.card, { marginTop: 2 }]}>
                <Text style={styles.cardH3}>Distribución de productos en el lineal</Text>
                <Text style={styles.cardSub}>
                  Cada hueco muestra el nombre del producto y su código EAN. {muebleAssignments.length} referencias asignadas · {mueble.num_columnas} columnas × {mueble.num_filas} filas.
                </Text>

                <View style={styles.heatGrid}>
                  {Array.from({ length: mueble.num_filas }).map((_, filaIdx) => {
                    const fila = mueble.num_filas - 1 - filaIdx;
                    const isGolden = fila === goldenRow;
                    return (
                      <React.Fragment key={filaIdx}>
                        <Text style={isGolden ? styles.heatRowTagGold : styles.heatRowTag}>
                          {rowTag(fila, isGolden)}
                        </Text>
                        <View style={styles.heatRow}>
                          {Array.from({ length: mueble.num_columnas }).map((_, colIdx) => {
                            const productos = cellProductos(fila, colIdx);
                            const empty = productos.length === 0;
                            return (
                              <View
                                key={colIdx}
                                style={
                                  empty
                                    ? [styles.hueco, styles.huecoEmpty, { minHeight: 56, padding: 5 }]
                                    : [styles.hueco, { minHeight: 56, padding: 5, flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start' }]
                                }
                              >
                                {empty ? (
                                  <Text style={{ fontSize: 10, color: '#C9BFA9' }}>—</Text>
                                ) : (
                                  productos.map((producto, idx) => (
                                    <View
                                      key={idx}
                                      style={{
                                        marginBottom: idx < productos.length - 1 ? 3 : 0,
                                        paddingBottom: idx < productos.length - 1 ? 3 : 0,
                                        borderBottomWidth: idx < productos.length - 1 ? 1 : 0,
                                        borderBottomColor: palette.line,
                                      }}
                                    >
                                      <Text
                                        style={{
                                          fontSize: 6.5,
                                          fontFamily: 'Helvetica-Bold',
                                          color: palette.ink,
                                          lineHeight: 1.15,
                                        }}
                                      >
                                        {producto.productName}
                                        {producto.isLiquidation ? ' (L)' : ''}
                                      </Text>
                                      <Text
                                        style={{
                                          fontSize: 5.5,
                                          fontFamily: 'Courier',
                                          color: palette.muted,
                                          marginTop: 1,
                                        }}
                                      >
                                        {producto.ean}
                                      </Text>
                                    </View>
                                  ))
                                )}
                              </View>
                            );
                          })}
                        </View>
                      </React.Fragment>
                    );
                  })}
                </View>

                {data.objetivo?.includes('Liquidación') && (
                  <Text style={{ fontSize: 7.5, color: palette.muted, marginTop: 8, fontStyle: 'italic' }}>
                    (L) Marca los productos que entran en liquidación según el objetivo seleccionado.
                  </Text>
                )}
              </View>

              <View style={[styles.row, { marginTop: 10 }]}>
                <View style={[styles.card, { flex: 1 }]}>
                  <Text style={styles.cardH3}>Hallazgo visual</Text>
                  <Text style={styles.cardSub}>Mezcla de rendimientos</Text>
                  <Text style={{ fontSize: 8.5, lineHeight: 1.5, color: '#5C544A' }}>
                    Conviene revisar huecos donde productos de alta rotación conviven con producto parado.
                    Cada marco con baja rotación dentro de la zona dorada es espacio premium diluido.
                  </Text>
                </View>
                <View style={[styles.card, { flex: 1 }]}>
                  <Text style={styles.cardH3}>Acción inmediata</Text>
                  <Text style={styles.cardSub}>Limpiar huecos</Text>
                  <Text style={{ fontSize: 8.5, lineHeight: 1.5, color: '#5C544A' }}>
                    Concentrar best-sellers en huecos limpios de la zona dorada y bajar el producto parado.
                    {Math.max(0, data.productCount - refsAsignadas)} referencias de ficha no están en el lineal: o se exponen o salen del surtido.
                  </Text>
                </View>
              </View>

              <View style={[styles.card, { marginTop: 10, borderLeftWidth: 4, borderLeftColor: palette.gold }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardH3}>Por qué estos productos van en la zona dorada</Text>
                    <Text style={styles.cardSub}>Criterio de colocación · eye-level (fila central)</Text>
                  </View>
                  <View style={{ alignSelf: 'flex-start' }}>
                    <Text
                      style={{
                        fontSize: 7.5,
                        fontFamily: 'Helvetica-Bold',
                        letterSpacing: 0.5,
                        textTransform: 'uppercase',
                        backgroundColor: palette.goldBg,
                        color: palette.gold,
                        paddingVertical: 3,
                        paddingHorizontal: 9,
                        borderRadius: 12,
                      }}
                    >
                      Objetivo: {data.objetivo || ''}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 8.5, lineHeight: 1.5, color: '#5C544A', marginTop: 6 }}>
                  La zona dorada se reserva a los productos que más rotan y de mayor ticket. Cada cara expuesta a la altura de los ojos convierte más. La colocación responde a estas reglas:
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 8 }}>
                  {[
                    { c: palette.green, b: 'Best-sellers a eye-level', s: 'Productos de mayor rotación en la fila central: máxima visibilidad = más unidades.' },
                    { c: palette.gold, b: 'Margen alto a la vista', s: 'Referencias de mayor margen unitario se mantienen visibles para elevar el ticket medio.' },
                    { c: palette.amber, b: 'Ganchos de tráfico', s: 'Productos best-seller actúan de atractor para guiar visitas a la góndola.' },
                    { c: palette.red, b: 'Baja conversión, fuera', s: 'Producto parado baja a fila fría: no compite por el espacio que vende.' },
                  ].map((r, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', gap: 6, width: '48%', marginBottom: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: r.c, marginTop: 3 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: palette.ink }}>
                          {r.b}
                        </Text>
                        <Text style={{ fontSize: 8, color: '#6B6256', lineHeight: 1.4 }}>{r.s}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              <Foot storeName={storeName} periodo={periodoLabel} />
            </Page>

            <Page size="A4" style={styles.page}>
              <Brandbar />
              <SecHeader num="02" title="Productividad del espacio y mapa de calor" />

              <View style={styles.kpiGrid}>
                <View style={{ width: '25%', paddingHorizontal: 5, paddingVertical: 5 }}>
                  <View style={[styles.kpiInner, { borderLeftColor: palette.gold, minHeight: 64 }]}>
                    <Text style={styles.kpiLbl}>Venta / m²</Text>
                    <Text style={[styles.kpiVal, { fontSize: 19 }]}>{fmtEur(m.ventaPorM2)}</Text>
                    <Text style={styles.kpiCtx}>{data.duracion || ''} · {data.store?.metros2 || '—'} m²</Text>
                  </View>
                </View>
                <View style={{ width: '25%', paddingHorizontal: 5, paddingVertical: 5 }}>
                  <View style={[styles.kpiInner, { borderLeftColor: palette.gold, minHeight: 64 }]}>
                    <Text style={styles.kpiLbl}>Venta / m² anual.</Text>
                    <Text style={[styles.kpiVal, { fontSize: 19 }]}>{fmtEur(m.ventaPorM2Anual)}</Text>
                    <Text style={styles.kpiCtx}>Proyección 52 sem.</Text>
                  </View>
                </View>
                <View style={{ width: '25%', paddingHorizontal: 5, paddingVertical: 5 }}>
                  <View style={[styles.kpiInner, { borderLeftColor: palette.amber, minHeight: 64 }]}>
                    <Text style={styles.kpiLbl}>Refs / hueco</Text>
                    <Text style={[styles.kpiVal, { fontSize: 19 }]}>
                      {(refsAsignadas / Math.max(1, mueble.num_filas * mueble.num_columnas)).toFixed(1)}
                    </Text>
                    <Text style={styles.kpiCtx}>Densidad expositiva</Text>
                  </View>
                </View>
                <View style={{ width: '25%', paddingHorizontal: 5, paddingVertical: 5 }}>
                  <View style={[styles.kpiInner, { borderLeftColor: palette.amber, minHeight: 64 }]}>
                    <Text style={styles.kpiLbl}>Refs sin exponer</Text>
                    <Text style={[styles.kpiVal, { fontSize: 19 }]}>
                      {Math.max(0, data.productCount - refsAsignadas)}
                    </Text>
                    <Text style={styles.kpiCtx}>
                      {data.productCount} en ficha · {refsAsignadas} expuestas
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.card, { marginTop: 8 }]}>
                <Text style={styles.cardH3}>Mapa de calor del lineal · {mueble.nombre}</Text>
                <Text style={styles.cardSub}>
                  Cada marco es un hueco real de la balda. Los productos en la fila central ocupan la zona dorada.
                </Text>

                <View style={styles.heatGrid}>
                  {Array.from({ length: mueble.num_filas }).map((_, filaIdx) => {
                    const fila = mueble.num_filas - 1 - filaIdx;
                    const isGolden = fila === goldenRow;
                    const tagText = isGolden
                      ? 'ZONA DORADA (eye-level) · top-sellers bien colocados'
                      : fila > goldenRow
                        ? 'Fila superior · visibilidad media'
                        : fila === 0
                          ? 'Fila inferior · zona fría'
                          : 'Fila media-baja · alcance fácil';

                    return (
                      <React.Fragment key={filaIdx}>
                        <Text style={isGolden ? styles.heatRowTagGold : styles.heatRowTag}>
                          {tagText}
                        </Text>
                        <View style={styles.heatRow}>
                          {Array.from({ length: mueble.num_columnas }).map((_, colIdx) => {
                            const productos = muebleAssignments.filter((p) => {
                              const parts = p.position?.split('_') || [];
                              const lastPart = parts[parts.length - 1];
                              const secondLastPart = parts[parts.length - 2];
                              return (
                                lastPart === String(fila) &&
                                secondLastPart === String(colIdx)
                              );
                            });
                            const empty = productos.length === 0;
                            return (
                              <View
                                key={colIdx}
                                style={empty ? [styles.hueco, styles.huecoEmpty] : styles.hueco}
                              >
                                {empty ? (
                                  <Text style={{ fontSize: 10, color: '#C9BFA9' }}>—</Text>
                                ) : (
                                  productos.map((producto, idx) => {
                                    const tier = tierFor(producto);
                                    const tierColor = tierColors[tier];
                                    const dim = productos.length > 1 ? 28 : 46;
                                    return (
                                      <View key={idx} style={styles.prodBox}>
                                        <View
                                          style={{
                                            borderWidth: 1.5,
                                            borderColor: tierColor,
                                            borderRadius: 2,
                                            padding: 1,
                                            marginBottom: 2,
                                          }}
                                        >
                                          {producto.imageUrl ? (
                                            <Image
                                              src={buildProxyUrl(producto.imageUrl)}
                                              style={{
                                                width: dim,
                                                height: dim,
                                                objectFit: 'contain',
                                              }}
                                            />
                                          ) : (
                                            <View
                                              style={{
                                                width: dim,
                                                height: dim,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                              }}
                                            >
                                              <Text
                                                style={{
                                                  fontSize: 6,
                                                  fontFamily: 'Helvetica-Bold',
                                                  color: palette.ink,
                                                  textAlign: 'center',
                                                }}
                                              >
                                                {producto.productName}
                                              </Text>
                                            </View>
                                          )}
                                        </View>
                                        {producto.isLiquidation && (
                                          <Text
                                            style={{
                                              fontSize: 5,
                                              color: palette.red,
                                              fontFamily: 'Helvetica-Bold',
                                            }}
                                          >
                                            LIQ
                                          </Text>
                                        )}
                                      </View>
                                    );
                                  })
                                )}
                              </View>
                            );
                          })}
                        </View>
                      </React.Fragment>
                    );
                  })}
                </View>

                <View style={styles.heatLegend}>
                  <Text>
                    <Text style={{ color: palette.green }}>■ </Text>Estrella
                  </Text>
                  <Text>
                    <Text style={{ color: palette.gold }}>■ </Text>Margen alto
                  </Text>
                  <Text>
                    <Text style={{ color: palette.amber }}>■ </Text>Gancho
                  </Text>
                  <Text>
                    <Text style={{ color: palette.goldSoft }}>■ </Text>Media
                  </Text>
                  <Text>
                    <Text style={{ color: palette.red }}>■ </Text>Baja rotación
                  </Text>
                </View>
              </View>

              <Foot storeName={storeName} periodo={periodoLabel} />
            </Page>
          </React.Fragment>
          );
        })}

      {/* ---------- PÁGINA FINAL — PLAN DE ACCIÓN + CTA ---------- */}
      <Page size="A4" style={styles.page}>
        <Brandbar />
        <SecHeader num="03" title={`Plan de acción · próximas ${data.duracion || '2 semanas'}`} />

        <View style={[styles.action, { borderLeftColor: palette.red }]}>
          <Text style={[styles.actionN, { color: palette.red }]}>1</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionH4}>Liberar capital del sobre-stock</Text>
            <Text style={styles.actionP}>
              Reducir profundidad en referencias de baja rotación. Pasar de{' '}
              {m.coberturaSemanas ? m.coberturaSemanas.toFixed(1) : '—'} a ~4 semanas de cobertura sin tocar las estrellas.
            </Text>
            <Text style={styles.actionImpact}>
              → Impacto: hasta {fmtEur(m.liberable)} de caja reinvertible
            </Text>
          </View>
        </View>

        <View style={[styles.action, { borderLeftColor: palette.amber }]}>
          <Text style={[styles.actionN, { color: palette.amber }]}>2</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionH4}>Reasignar la fila inferior</Text>
            <Text style={styles.actionP}>
              Bajar a fila fría el producto de baja conversión y subir a la altura de mano los productos de margen alto y rotación media.
            </Text>
            <Text style={styles.actionImpact}>→ Impacto: +conversión sin coste de stock</Text>
          </View>
        </View>

        <View style={styles.action}>
          <Text style={styles.actionN}>3</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionH4}>Reforzar las estrellas en eye-level</Text>
            <Text style={styles.actionP}>
              Ampliar facing de los productos top-seller en la zona dorada. Son el motor de venta: más cara visible = más unidades.
            </Text>
            <Text style={styles.actionImpact}>
              → Impacto: subir sell-through del {fmtPct(m.sellThroughPct)} hacia el 25-30%
            </Text>
          </View>
        </View>

        <View style={styles.action}>
          <Text style={styles.actionN}>4</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionH4}>Exponer o retirar las referencias ocultas</Text>
            <Text style={styles.actionP}>
              Las referencias en ficha que no están en el lineal: o se exponen con criterio, o se retiran del surtido para no inflar inventario muerto.
            </Text>
            <Text style={styles.actionImpact}>→ Impacto: surtido limpio y medible</Text>
          </View>
        </View>

        <View style={styles.cta}>
          <Text style={styles.ctaLab}>Cartistry · Visual Merchandising basado en datos</Text>
          <Text style={styles.ctaH3}>De un planograma bonito a un lineal que vende.</Text>
          <Text style={styles.ctaP}>
            Este informe combina datos de venta, stock y márgenes con 26 reglas de visual merchandising para convertir cada balda en una decisión. Implantamos el plan, medimos el resultado y volvemos a optimizar.
          </Text>
          <View style={styles.ctaMetrics}>
            <View>
              <Text style={styles.ctaMetricBig}>
                {fmtPct(m.sellThroughPct)} → 30%
              </Text>
              <Text style={styles.ctaMetricLbl}>Sell-through objetivo</Text>
            </View>
            <View>
              <Text style={styles.ctaMetricBig}>{fmtEur(m.liberable)}</Text>
              <Text style={styles.ctaMetricLbl}>Capital a liberar</Text>
            </View>
            <View>
              <Text style={styles.ctaMetricBig}>26</Text>
              <Text style={styles.ctaMetricLbl}>Reglas aplicadas</Text>
            </View>
          </View>
        </View>

        <Foot storeName={storeName} periodo={periodoLabel} />
      </Page>
    </Document>
  );
}
