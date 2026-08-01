# Motor de Reglas — Implementación

## ✅ Completado

### 1. Estructura de Reglas (rules.ts)
- **23 reglas definidas** exactamente como aparecen en el briefing
- **Prioridades mapeadas** por objetivo (5 objetivos × 23 reglas = 115 prioridades)
- **Sistema de priorización** que ordena reglas automáticamente según el objetivo activo
- **Parámetros configurables** para reglas que los requieren (ej: altura comprador, máx drops)

**Grupos implementados:**
- **ZV (Zona & Visibilidad):** ZV-01 → ZV-10 (10 reglas)
- **TV (Tendencia de Ventas):** TV-01 → TV-05 (5 reglas)
- **PR (Reglas Promocionales):** PR-01 → PR-09 (9 reglas)

### 2. Sistema de Scoring (scorer.ts)
- Calcula métricas de cada producto:
  - Margen unitario (PVP - precio_compra)
  - Total unidades vendidas (histórico completo)
  - Rotación reciente (período actual)
  - Tasa de conversión (rotación / stock)
  - Tendencia (creciendo/cayendo/estable/sin_ventas)
  - Períodos sin ventas (para TV-04)
  - Best-seller ranking

### 3. Motor de Orquestación (engine.ts)
- **Inicializa posiciones** disponibles en toda la tienda (muebles → caras → baldas)
- **Aplica reglas en cascada** en orden de prioridad según objetivo
- **Mapea asignaciones** de productos a posiciones
- **Genera planogramas** con información de cada asignación (EAN, balda, posición, razón)
- **Debug logging** completo para auditoría de decisiones

### 4. API Endpoint (api/planograma/route.ts)
- POST `/api/planograma`
- Input: `{ storeId, objective }`
- Output: planograma con posiciones asignadas + productos sin asignar
- Guarda automáticamente en BD (tabla `planograms`)
- Desarrollo: incluye logs de debug

### 5. Ejemplos de Aplicadores (rule-applicators.ts)
- Métodos de ejemplo para aplicar grupos de reglas:
  - `applyZVRules()` — ejemplo de escaparate (ZV-01)
  - `applyTVRules()` — best-seller fijo (TV-03) + retirada sin ventas (TV-04)
  - `applyPRRules()` — ordenación por precio (PR-04) y tamaño (PR-03)
  - `scoreProductByObjective()` — puntuación variable por objetivo

### 6. Integración en Fase 4
- Botón "Descarga tu informe" ahora llamará a `/api/planograma`
- PDF mostrará próximamente el planograma generado en lugar de solo resumen

---

## 📊 Estructura de Datos

### Input al Motor
```typescript
{
  store: Store,           // Tienda con muebles, caras, baldas
  products: Product[],    // Catálogo completo
  sales: Sale[],          // Histórico de ventas
  currentPeriod: SalesPeriod,  // Período actual (últimos 7 días por defecto)
  objective: Objective,   // Objetivo activo
  previousPeriods?: SalesPeriod[]  // Períodos anteriores (para TV-01, TV-02)
}
```

### Output del Motor
```typescript
{
  planogram: {
    id: string,
    positions: [
      {
        id: string,
        balda_id: string,
        product_id: string,
        ean: string,
        posicion_en_balda: number,
        razon: string  // "ZV-01: Escaparate máxima atracción"
      }
    ]
  },
  posiciones_sin_asignar: Product[],
  debug: string[]  // Logs de aplicación de reglas
}
```

---

## 🔄 Flujo de Aplicación de Reglas

```
1. ENTRADA
   ├─ Tienda con estructura física (muebles, caras, baldas)
   ├─ Productos con precios, dimensiones, stock
   └─ Ventas con histórico de transacciones

2. SCORING
   ├─ Calcular métricas de cada producto
   └─ Generar scores por objetivo

3. ORQUESTACIÓN
   ├─ Obtener reglas ordenadas por prioridad del objetivo
   ├─ Para cada regla:
   │  ├─ Calcular qué productos aplican
   │  ├─ Asignar a posiciones disponibles
   │  └─ Marcar posiciones como ocupadas
   └─ Repetir hasta agotar productos o posiciones

4. SALIDA
   ├─ Planograma con asignaciones
   ├─ Productos sin asignar (→ almacén)
   └─ Debug log (razón de cada asignación)
```

---

## 🎯 Objetivos y Sus Prioridades

| Objetivo | Enfoque | Ejemplo |
|----------|---------|---------|
| 🎯 Promoción | Ejecutar acción promo | ZV-01 (escap), PR-01 (ojos), PR-05 (nueva) |
| 🗑️ Liquidación | Salida rápida | TV-04 (sin ventas), ZV-02 (entrada), TV-01 |
| 📈 Aumentar Ventas | Máx tráfico | ZV-09 (imán), TV-02 (aceleración), ZV-02 |
| 💰 Aumentar Margen | Máx margen unitario | ZV-03 (caja impulso), ZV-10 (premium), PR-07 |
| 🆕 Nueva Colección | Lanzamiento | ZV-06 (drops límite), PR-05 (nueva), PR-09 |

---

## 📋 Cómo Expandir la Implementación

### Paso 1: Implementar lógica de cada regla
En `engine.ts`, reemplazar el método `applyRule()` con lógica específica:

```typescript
private applyRule(ruleCode: string): void {
  switch (ruleCode) {
    case 'ZV-01':
      // Encontrar producto con mejor atracción visual
      // Asignar a balda de máxima visibilidad (escaparate)
      break;
    case 'ZV-02':
      // Encontrar productos con mayor tasa de conversión
      // Asignar a primera zona desde entrada
      break;
    // ... continuar con las 21 reglas restantes
  }
}
```

### Paso 2: Conectar store con Base de Datos
Actualmente, el motor espera `store.muebles` completo. Necesita:
- Tabla de **muebles** en Supabase
- Tabla de **caras** en Supabase
- Tabla de **baldas** en Supabase

Una vez existan, el API endpoint cargará automáticamente la estructura física.

### Paso 3: Visualizar planograma en PDF
La Fase 4 actualmente muestra resumen. Cambiar a:
- Diagrama SVG de la tienda (grid o planta)
- Posiciones ocupadas con nombre del producto
- Código de color por métrica (margen, rotación, etc.)

### Paso 4: Permitir selección de objetivo
Fase 4 ahora usa `aumentar_ventas` por defecto. Agregar selector:
- Dropdown de 5 objetivos
- Preview del planograma según objetivo elegido
- Comparación entre objetivos

---

## 🔗 Archivos Generados

```
packages/rules-engine/src/
├── rules.ts              # 23 reglas + prioridades
├── scorer.ts             # Cálculo de métricas
├── engine.ts             # Motor principal
├── rule-applicators.ts   # Ejemplos de aplicadores
└── index.ts              # Exporta todo

apps/web/app/api/
└── planograma/route.ts   # POST endpoint

apps/web/app/(dashboard)/dashboard/
└── planograma/page.tsx   # Integración en Fase 4
```

---

## ✨ Características Implementadas

- [x] **23 reglas** definidas con prioridades exactas
- [x] **5 objetivos** soportados
- [x] **Sistema de scoring** flexible
- [x] **Motor de orquestación** que aplica reglas en cascada
- [x] **API endpoint** para generar planogramas
- [x] **Persistencia** en Base de Datos
- [x] **Debug logging** para auditoría
- [ ] Lógica específica de cada regla (próximo)
- [ ] Visualización de planograma (próximo)
- [ ] Selector de objetivo en UI (próximo)
- [ ] Comparador de objetivos (próximo)

---

## 📖 Próximos Pasos

1. **Implementar lógica de reglas** — Expandir `applyRule()` con lógica de cada una
2. **Schema de muebles en BD** — Crear tablas para estructura física
3. **Visualización** — Diagrama SVG en PDF
4. **Selector de objetivo** — Dropdown en Fase 4
5. **Tests** — Unit tests para scorer y reglas

---

*Generado: mayo 2026*
