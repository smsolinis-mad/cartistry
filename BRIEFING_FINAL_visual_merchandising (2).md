# 📋 BRIEFING FINAL: App de Visual Merchandising (Multiusuario)
> Herramienta gratuita, self-service, para store managers sin conocimientos técnicos.
> Completa la Sección 2 (reglas base) y súbelo a Claude Code.
>
> ⚠️ = imprescindible | 💡 = opcional pero valioso
> ✅ = ya definido, no necesitas tocar

---

## ARQUITECTURA GENERAL ✅

**Tipo de app:** Web app, reglas puras (sin IA), multiusuario self-service.

**Frecuencia de actualización de datos por usuario:**
- Layout de tienda: 1 vez en la vida
- Catálogo de productos: 1 vez al año
- Ventas: 1 vez a la semana

---

## NIVEL PRODUCTO — Lo que tú defines como creador

---

## 1. MODELO DEL ESPACIO FÍSICO ✅

### Paso 0 — Características generales de la tienda
Se solicitan una sola vez al crear el espacio de venta:

| Campo | Obligatorio | Formato | Notas |
|-------|------------|---------|-------|
| Nombre de la tienda | ✅ | Texto | Nombre comercial del punto de venta |
| Dirección | ✅ | Texto | Dirección completa |
| Tipo de tienda | ✅ | Lista cerrada | Ver opciones — a definir |
| Metros cuadrados | ✅ | Cifra | Superficie total del espacio de venta |
| Fecha de apertura | ✅ | DD/MM/AAAA | Fecha de inauguración del punto de venta |

### Tipos de punto de venta ✅

El tipo determina qué flujo de configuración se ofrece al usuario. Cada tipo tiene su propia estructura física y sus propias preguntas.

| Tipo | Descripción | Estructura física |
|------|-------------|-----------------|
| Tienda completa | Espacio propio con paredes, entrada y mobiliario interior | 4 paredes + muebles de interior |
| Corner / Shop-in-shop | Espacio delimitado dentro de otra tienda | 1-3 paredes propias + acceso abierto |
| Isla / Stand | Estructura autoportante en medio de un espacio, sin paredes | N caras (normalmente 4) + superficie superior opcional |
| Lineal / Góndola | Un único mueble o conjunto en línea, solo 1 cara frontal | 1 cara |

---

### Representación visual del espacio ✅

El sistema genera automáticamente un **diagrama esquemático** a partir de los datos introducidos por el usuario. No se usan fotos.

- El diagrama se genera solo, sin esfuerzo adicional del usuario
- Siempre está sincronizado con la configuración actual
- Es la base sobre la que se muestra el planograma final con los productos asignados
- Las fotos de referencia quedan descartadas para el MVP

---

### Configuración por tipo — GÓNDOLA / LINEAL ✅

Formulario en dos capas:

**Capa 1 — Dimensiones físicas**

| Campo | Obligatorio | Formato |
|-------|------------|---------|
| Alto total | ✅ | Cifra (cm) |
| Ancho total | ✅ | Cifra (cm) |
| Profundo | ✅ | Cifra (cm) |

**Paso 1 — ¿Cuántas góndolas / lineales tiene el espacio?**
El cliente indica el número. Para cada una se repite el mismo flujo.
Botón **"Copiar estructura de góndola anterior"** disponible desde la segunda.

**Capa 2 — Distribución interior**

- Número de columnas en que se divide el ancho
- Para cada columna:
  - Número de baldas
  - Altura de cada balda desde el suelo (cm) → activa ZV-07 golden shelf automáticamente
  - Tipo de cada balda (balda normal / cajón / barra colgador)
  - ¿Restricción de categoría o sexo? (opcional)
- Botón **"Copiar estructura de columna anterior"** para agilizar cuando todas las columnas son iguales

**Diagrama generado automáticamente (ejemplo):**
```
[Col 1]  [Col 2]  [Col 3]
 ─────    ─────    ─────   ← Balda 4 (160cm)
 ─────    ─────    ─────   ← Balda 3 (130cm) ⭐ golden shelf
 ─────    ─────    ─────   ← Balda 2 (80cm)
 ─────    ─────    ─────   ← Balda 1 (30cm)
```

---

### Configuración por tipo — ISLA / STAND ✅

**Paso 1 — ¿Cuántas islas tiene el espacio?**
El cliente indica el número. Para cada isla se repite el mismo flujo.
Botón **"Copiar estructura de isla anterior"** disponible desde la segunda isla.

**Paso 2 — Tipo de isla**
- ○ Monolítica (bloque sólido, el cliente la rodea por fuera)
- ○ Perimetral (el cliente puede entrar dentro)

**Paso 3 — Caras expositivas laterales**
- ¿Cuántas caras expositivas tiene esta isla? [ número libre ]
- Para cada cara: misma estructura que góndola
  - Orientación (hacia entrada / fondo / izquierda / derecha)
  - Visibilidad sugerida automáticamente, ajustable
  - Número de columnas
  - Para cada columna: baldas, altura desde el suelo, tipo, restricciones
  - Botón "Copiar estructura de columna anterior"

**Paso 4 — Superficie superior**
- ¿Tiene superficie superior? Sí / No
- Si Sí:
  - **Monolítica:** ¿Es expositiva? Sí / No → si Sí, pedir capacidad y tamaños admitidos
  - **Perimetral:** ¿Es expositiva o transitable?
    - Expositiva → pedir capacidad y tamaños admitidos
    - Transitable → no se configura como posición expositiva

---

### Configuración por tipo — CORNER / SHOP-IN-SHOP ✅

Híbrido entre tienda completa e isla. Combina paredes propias con muebles exentos en el interior.

**Paso 1 — Paredes propias**
- ¿Cuántas paredes propias tiene el corner? [ número libre ]
- Para cada pared:
  - Orientación (hacia el pasillo / hacia otra sección / etc.)
  - Visibilidad sugerida automáticamente, ajustable
  - Muebles adosados a esa pared → misma lógica que góndola

**Paso 2 — Muebles exentos en el interior (opcional)**
- ¿Tiene muebles exentos dentro del corner? Sí / No
- Si Sí: ¿cuántos? → para cada uno, lógica de isla o del tipo de mueble correspondiente

> Los lados abiertos del corner (sin pared) no se configuran — son simplemente el límite del espacio.

---

### Pasillo principal — campo universal ✅

Aplica a todos los muebles y espacios, independientemente del tipo.

Al configurar cada mueble, el sistema pregunta siempre:
- **¿Alguna cara de este mueble da directamente al pasillo principal?** Sí / No
  - Si Sí: ¿cuál es esa cara? (el usuario la selecciona de entre las caras configuradas)
  - Esa cara recibe automáticamente **visibilidad máxima**, por encima de la visibilidad sugerida por orientación

> Esta pregunta aplica a todos los tipos de mueble con independencia del tipo de espacio (tienda, corner, isla, góndola...). En espacios con más de un pasillo relevante, el usuario puede marcar más de una cara como "cara a pasillo principal".

---

### Configuración por tipo — TIENDA COMPLETA ✅

La tienda completa se configura en 4 capas progresivas.

---

**CAPA 1 — Entrada y escaparate**

- ¿Dónde está la entrada? (pared frontal / lateral izquierda / lateral derecha)
- ¿Tiene escaparate? Sí / No
  - Si Sí:
    - ¿Está en la misma pared que la entrada? Sí / No
    - Dimensiones del escaparate: alto (cm) · ancho (cm) · profundo (cm)
    - Configuración interior: misma lógica de muebles (cubos, baldas, suelo...)
    - ⚙️ Activa automáticamente ZV-01 (escaparate = producto de mayor atracción)

---

**CAPA 2 — Paredes**

- ¿Cuántas paredes tiene la tienda? [ número libre · default 4 · puede ser más en plantas en L, U, etc. ]
- Para cada pared:
  - Nombre / referencia (ej. "pared entrada", "pared izquierda")
  - ¿Es la pared de la entrada? Sí / No
  - Muebles adosados → misma lógica que góndola / colgador de pared
  - ¿Hay pasillo principal paralelo a esta pared? Sí / No

---

**CAPA 3 — Zonas del interior**

En lugar de pedir la forma exacta de la planta, el interior se divide en zonas funcionales que el motor ya entiende:

| Zona | Descripción | Regla activada automáticamente |
|------|-------------|-------------------------------|
| Zona A — Primera zona de entrada | Los primeros metros desde la puerta | ZV-02 |
| Zona B — Zona intermedia | El espacio central de la tienda | — |
| Zona C — Fondo de tienda | El espacio más alejado de la entrada | ZV-04 |
| Zona D — Zona de caja | Espacio adyacente al punto de pago | ZV-03 |

Para cada zona: ¿qué muebles hay en ella? (selección del catálogo de muebles)

---

**CAPA 4 — Muebles de interior**

Para cada mueble añadido en las zonas anteriores:
- Tipo (del catálogo de muebles)
- Configuración específica según el tipo
- ¿Da al pasillo principal? Sí / No → Si Sí, cara de máxima visibilidad (regla universal)
- Botón "Copiar estructura de mueble anterior" del mismo tipo
- **Posición en la cuadrícula de planta** (ver abajo)

---

### Posicionamiento en planta — cuadrícula ✅

Para situar cada mueble en el espacio físico de forma simple y visual:

**Flujo:**
1. El cliente descarga una cuadrícula en blanco (PDF o imagen) — vista de planta desde arriba, como papel cuadriculado
2. La rellena a mano o digitalmente anotando qué mueble ocupa cada celda
3. Al configurar cada mueble en la app indica su posición en la cuadrícula con una referencia tipo Excel: columna (letra) + fila (número) → ej. "C3", "A1", "F5"

**Ejemplo:**
```
    A     B     C     D     E     F     G     H
1 ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐
  │     │     │     │     │     │     │     │     │
2 ├─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
  │     │     │  M  │     │     │     │     │     │  M = Mesa
3 ├─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
  │     │     │     │     │  G  │  G  │     │     │  G = Góndola
4 ├─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
  │     │     │     │     │     │     │     │     │
5 └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘
              ENTRADA
```

Con esta información el motor puede:
- Saber qué muebles están más cerca de la entrada
- Calcular el recorrido natural del cliente
- Determinar qué muebles son visibles desde la puerta
- Aplicar correctamente ZV-09 (imán de tráfico)
- Generar el diagrama de planta con los muebles en su posición real

---

### Catálogo completo de muebles ✅

Cualquier tipo de espacio (tienda, corner, isla...) puede contener cualquiera de estos muebles.

**MUEBLES ADOSADOS A PARED**
- Góndola / Lineal ✅ (ver configuración arriba)

**MUEBLES EXENTOS**

---

**ISLA** ✅ (ver configuración arriba)

---

**MESA**
- Largo (cm)
- Ancho (cm)
- Alto (cm)
- ¿Tiene estante inferior? Sí / No → Si Sí: altura desde el suelo (cm)
- Superficie superior: capacidad (nº productos) + tamaños admitidos + restricción de categoría/sexo (opcional)

---

**PERCHERO**
- Alto total (cm)
- ¿Cuántas barras tiene? [ número libre ]
- Para cada barra: altura desde el suelo (cm) + longitud (cm) + capacidad (nº productos)
- ¿Tiene estante inferior? Sí / No → Si Sí: altura desde el suelo (cm) + tamaños admitidos
- Restricción de categoría/sexo (opcional)

---

**MOSTRADOR / CAJA**
- Largo (cm) · Ancho (cm) · Alto (cm)
- Superficie superior: capacidad (nº productos) + tamaños admitidos + restricción de categoría/sexo (opcional)
- ¿Tiene vitrina frontal? Sí / No → Si Sí: nº de baldas + altura de cada balda (cm) + tamaños admitidos
- ¿Tiene estantes traseros? Sí / No → Si Sí: nº de baldas + altura de cada balda (cm) + tamaños admitidos
- ⚙️ Activa automáticamente la regla ZV-03 (zona de caja = compra impulsiva) sin configuración adicional

---

**VITRINA**
- Alto total (cm) · Ancho total (cm) · Profundo (cm)
- Número de columnas
- Para cada columna: número de baldas + altura de cada balda desde el suelo (cm) + tamaños admitidos + restricción de categoría/sexo (opcional)
- Botón "Copiar estructura de columna anterior"
- Nota: mueble cerrado → visibilidad condicionada a que el cliente se acerque

---

**TORRE / COLUMNA EXPOSITIVA**
- Alto total (cm) · Ancho total (cm) · Profundo (cm)
- ¿Es giratoria? Sí / No
  - Si giratoria → se trata como isla monolítica (el cliente la rodea, visibilidad similar en todas las caras)
  - Si fija → misma lógica que góndola (1 cara frontal)
- Número de baldas / posiciones + altura de cada balda desde el suelo (cm)
- Tamaños admitidos + restricción de categoría/sexo (opcional)

---

**COLGADOR DE PARED**
- Altura desde el suelo (cm)
- Longitud (cm)
- Capacidad (nº de productos)
- ¿Tiene balda superior? Sí / No → Si Sí: altura desde el suelo (cm) + tamaños admitidos
- ¿Tiene balda inferior? Sí / No → Si Sí: altura desde el suelo (cm) + tamaños admitidos
- Restricción de categoría/sexo (opcional)

---

La tienda se configura en 3 pasos:

### Paso 1 — Entrada
El usuario indica dónde está la entrada (pared frontal / lateral izquierda / lateral derecha). Esto establece el sistema de orientaciones y la jerarquía de visibilidad automática.

### Paso 2 — Paredes (las 4)
Para cada pared el usuario añade los muebles pegados a ella. Cada mueble de pared tiene **1 sola cara**.

### Paso 3 — Muebles de interior
Muebles que no están pegados a ninguna pared (islas, torres, mostradores centrales...). Cada uno puede tener **N caras** (hasta 5: 4 laterales + superior).

### Modelo de datos del espacio ✅
```
Tienda
  └── Entrada (orientación)
  └── Paredes [frontal / trasera / izquierda / derecha]
      └── Muebles de pared
          └── 1 cara
              └── Posiciones (baldas / cajones / cubos / vitrina)
                  └── Tamaños admitidos
                  └── Restricción de categoría (opcional)
  └── Muebles de interior
      └── N caras
          └── Orientación de cada cara (hacia entrada / fondo / izq / dcha)
          └── Visibilidad (sugerida automáticamente, ajustable)
          └── Posiciones
              └── Tamaños admitidos
              └── Restricción de categoría (opcional)
```

### Visibilidad automática por orientación ✅
| Orientación de la cara | Visibilidad sugerida |
|------------------------|---------------------|
| Hacia la entrada | Alta |
| Hacia paredes laterales | Media |
| Hacia el fondo | Baja |
| Superior (a altura de ojos) | Alta |
| Superior (muy alta o muy baja) | Baja |

*El usuario puede ajustar manualmente la visibilidad de cualquier cara.*

### Tipos de posición y sus reglas de capacidad ⚠️
> Completa esta tabla con los tipos de posición que quieres soportar y cuántos productos caben según tamaño.

| Tipo posición | Tamaño XXG | Tamaño XG | Tamaño G | Tamaño M | Tamaño P | Tamaño Mini |
|---------------|-----------|-----------|---------|---------|---------|------------|
| Balda normal | 1 | 1 | ... | ... | ... | ... |
| Cubo escaparate | 1 | 1 | ✗ | ✗ | ✗ | ✗ |
| Cajón | ✗ | ✗ | ... | ... | ... | ... |
| Vitrina mostrador | ✗ | ✗ | ✗ | ... | ... | ... |
| [Añade los que necesites] | | | | | | |

### Tamaño físico de producto ✅
El motor no necesita rangos predefinidos. Compara directamente las medidas del producto (alto × largo × profundo del CSV) con las dimensiones de cada posición del mueble para determinar si cabe. No se requiere configuración adicional.

---

## 2. REGLAS BASE DE VISUAL MERCHANDISING ✅

23 reglas organizadas en 3 grupos. Cada regla tiene un orden de prioridad distinto según el objetivo activo del usuario.

### Objetivos disponibles y su código
| Código | Objetivo |
|--------|---------|
| 🎯 Promoción | Ejecutar una campaña o acción promocional |
| 🗑️ Liquidación | Reducir stock y dar salida a producto parado |
| 📈 Aumentar Ventas | Maximizar unidades vendidas en el período |
| 💰 Aumentar Margen Neto | Maximizar el margen neto de la tienda |
| 🆕 Nueva Colección | Entrada de nueva colección al punto de venta |

### Orden de prioridad en caso de conflicto
- El número de prioridad de cada regla varía según el objetivo activo (1 = primera en aplicarse).
- Si dos reglas tienen el mismo número de prioridad, prevalece la de código numérico más bajo dentro de su grupo.
- Las reglas TV tienen menor peso cuando el objetivo es Nueva Colección (no existe histórico del producto nuevo).

---

### GRUPO 1 — ZONA Y VISIBILIDAD (ZV)

**ZV-01 — Escaparate = Producto de Mayor Atracción**
- Descripción: El escaparate se reserva para el producto con mayor poder de atracción visual: tamaño grande o muy grande, colores con alto contraste respecto al entorno, y combinación de alta rotación o alto margen.
- Prioridades: 🎯1 · 🗑️3 · 📈1 · 💰2 · 🆕2
- Parámetro configurable: —

**ZV-02 — Primera Zona de Entrada = Máxima Conversión**
- Descripción: Los primeros metros desde la puerta reciben los productos con mayor tasa de conversión reciente. Facilita la compra rápida sin fricción.
- Prioridades: 🎯2 · 🗑️1 · 📈2 · 💰3 · 🆕4
- Parámetro configurable: —

**ZV-03 — Zona de Caja = Compra Impulsiva y Cross-Sell**
- Descripción: El espacio adyacente al punto de pago se destina a producto de tamaño pequeño o mini, con alto margen unitario o alta frecuencia de compra impulsiva.
- Prioridades: 🎯3 · 🗑️4 · 📈3 · 💰1 · 🆕5
- Parámetro configurable: —

**ZV-04 — Fondo de Tienda = Descubrimiento y Fidelización**
- Descripción: El espacio más alejado de la entrada recibe producto de novedad, colección especial o referencias que premian al cliente que recorre toda la tienda.
- Prioridades: 🎯6 · 🗑️6 · 📈5 · 💰4 · 🆕3
- Parámetro configurable: —

**ZV-05 — Densidad Decreciente desde Entrada hacia Fondo**
- Descripción: Las zonas de alta visibilidad y tráfico se trabajan con menor densidad para maximizar el impacto visual individual. El fondo puede admitir mayor densidad expositiva.
- Prioridades: 🎯4 · 🗑️5 · 📈4 · 💰3 · 🆕6
- Parámetro configurable: —

**ZV-06 — Límite Máximo de Drops Simultáneos en Exposición**
- Descripción: En el espacio de venta no pueden coexistir más de N drops activos de forma simultánea. Cuando se lanza uno nuevo y se ha alcanzado el límite, uno debe retirarse antes.
- Prioridades: 🎯2 · 🗑️7 · 📈3 · 💰2 · 🆕1
- Parámetro configurable: ⚙️ Máximo de drops simultáneos (default: 2)

**ZV-07 — Golden Shelf Calibrado por Perfil de Comprador**
- Descripción: La balda de máxima atención visual se determina según la altura media del comprador objetivo. Los productos de mayor margen o rotación se colocan ahí.
- Prioridades: 🎯2 · 🗑️3 · 📈2 · 💰1 · 🆕3
- Parámetro configurable: ⚙️ Altura media del comprador (default: 160 cm) + altura exacta de cada balda del mobiliario

**ZV-08 — Segmentación del Espacio por Perfil de Comprador**
- Descripción: Se asignan zonas distintas del espacio a distintos perfiles de comprador identificados en el punto de venta.
- Prioridades: 🎯7 · 🗑️7 · 📈2 · 💰2 · 🆕7
- Parámetro configurable: ⚙️ Perfiles de comprador activos y zona asignada a cada uno

**ZV-09 — Imán de Tráfico / Product Journey Guiado**
- Descripción: Se diseña un recorrido interior intencionado mediante productos de alta atracción en puntos intermedios estratégicos entre entrada y fondo.
- Prioridades: 🎯3 · 🗑️4 · 📈1 · 💰3 · 🆕4
- Parámetro configurable: ⚙️ Posiciones concretas identificadas como puntos de atracción intermedios

**ZV-10 — Zona Premium = Colección de Precio Más Alto**
- Descripción: Los productos de precio más alto se agrupan en una zona exclusiva interior. Solo pasan al escaparate si las ventas crecen ≥ 200% respecto al período anterior.
- Prioridades: 🎯3 · 🗑️6 · 📈4 · 💰1 · 🆕3
- Parámetro configurable: ⚙️ Criterio de corte precio premium (top X% del catálogo o precio mínimo en €) · Umbral de incremento de ventas para activar escaparate (default: 200%)

---

### GRUPO 2 — TENDENCIA DE VENTAS (TV)

**TV-01 — Producto en Caída Sostenida → Retirar de Posición Premium**
- Descripción: Si un producto muestra descenso sostenido durante 2 o más períodos consecutivos, se retira de posiciones de alta visibilidad aunque mantenga margen elevado.
- Prioridades: 🎯4 · 🗑️1 · 📈4 · 💰5 · 🆕2
- Parámetro configurable: ⚙️ Duración de 1 período (default: 1 semana)

**TV-02 — Producto con Aceleración de Ventas → Ascender de Zona**
- Descripción: Si un producto acumula crecimiento durante 2 o más períodos consecutivos, asciende a una posición de mayor tráfico o visibilidad.
- Prioridades: 🎯5 · 🗑️4 · 📈2 · 💰3 · 🆕8
- Parámetro configurable: ⚙️ Duración de 1 período (default: 1 semana)

**TV-03 — Best-Seller Activo = Posición Fija**
- Descripción: El producto con mayor volumen de ventas en el período analizado no se reubica salvo conflicto de prioridad superior.
- Prioridades: 🎯7 · 🗑️5 · 📈1 · 💰2 · 🆕9
- Parámetro configurable: —

**TV-04 — Producto Sin Ventas en N Períodos → Salida de Exposición**
- Descripción: Si un producto acumula N períodos consecutivos sin ninguna venta, sale del espacio expositivo y pasa a almacén o zona de liquidación.
- Prioridades: 🎯6 · 🗑️1 · 📈6 · 💰7 · 🆕3
- Parámetro configurable: ⚙️ Nº de períodos sin venta para activar retirada (default: 1 semana)

**TV-05 — Rotación Programada por Tiempo de Exposición**
- Descripción: Ningún producto permanece en la misma posición más de 1 semana con independencia de sus resultados, para evitar el efecto de ceguera por familiaridad.
- Prioridades: 🎯5 · 🗑️6 · 📈3 · 💰4 · 🆕6
- Parámetro configurable: —

---

### GRUPO 3 — REGLAS PROMOCIONALES (PR)

**PR-01 — Producto en Promoción → Altura de Ojos y Señalización**
- Descripción: Todo producto con descuento o promoción activa ocupa baldas a altura de ojos y se acompaña de señalización que comunica la condición promocional.
- Prioridades: 🎯1 · 🗑️2 · 📈3 · 💰6 · 🆕7
- Parámetro configurable: —

**PR-02 — Coherencia de Colección en el Lineal**
- Descripción: Las referencias de una misma colección se agrupan en un mismo espacio continuo. No se intercalan colecciones distintas en la misma zona expositiva.
- Prioridades: 🎯3 · 🗑️5 · 📈4 · 💰4 · 🆕2
- Parámetro configurable: —

**PR-03 — Orden Visual por Tamaño: Mayor Arriba, Menor Abajo**
- Descripción: Dentro de cada módulo o columna, los productos de mayor tamaño se colocan en baldas superiores y los de menor tamaño en inferiores o cajones.
- Prioridades: 🎯4 · 🗑️6 · 📈5 · 💰5 · 🆕5
- Parámetro configurable: —

**PR-04 — Ordenación por Precio dentro de la Zona**
- Descripción: Dentro de una misma zona o balda, los productos se ordenan de menor a mayor precio de izquierda a derecha o de arriba a abajo según la orientación del mueble.
- Prioridades: 🎯5 · 🗑️3 · 📈4 · 💰2 · 🆕6
- Parámetro configurable: —

**PR-05 — Novedad = Señalización Diferenciada Obligatoria**
- Descripción: Todo producto de nueva incorporación lleva señalización propia (etiqueta, color o elemento visual diferenciador) independientemente de su posición.
- Prioridades: 🎯2 · 🗑️7 · 📈2 · 💰3 · 🆕1
- Parámetro configurable: ⚙️ Tipo de señalización física utilizada para marcar novedades

**PR-06 — Diversidad de Tipo de Producto dentro de Cada Drop**
- Descripción: Cada drop activo debe presentar al menos N tipos de producto distintos para activar la venta cruzada y elevar el ticket medio.
- Prioridades: 🎯1 · 🗑️7 · 📈2 · 💰1 · 🆕1
- Parámetro configurable: ⚙️ Mínimo de tipos de producto por drop (default: 2)

**PR-07 — Producto Ancla / Efecto Goldilocks**
- Descripción: Se coloca intencionalmente un producto de precio alto junto a uno de precio medio-alto para que este último resulte psicológicamente accesible por comparación.
- Prioridades: 🎯6 · 🗑️7 · 📈4 · 💰1 · 🆕4
- Parámetro configurable: ⚙️ Diferencial mínimo de precio entre ancla y objetivo (default: 30%)

**PR-08 — Producto Sacrificio como Atractor de Tráfico Interior**
- Descripción: Se coloca en posición premium un producto de bajo margen con rebaja agresiva cuyo único objetivo es generar tráfico hacia el interior donde está el producto de mayor margen.
- Prioridades: 🎯2 · 🗑️1 · 📈5 · 💰7 · 🆕9
- Parámetro configurable: ⚙️ Descuento mínimo del producto sacrificio (default: 50%)

**PR-09 — Color de Tendencia → Escaparate y Zona de Máxima Conversión**
- Descripción: Aplica solo a producto nuevo sin histórico de ventas. Si el color coincide con los colores de tendencia de la temporada activa, se posiciona en escaparate o primera zona de entrada con prioridad máxima.
- Prioridades: 🎯5 · 🗑️8 · 📈1 · 💰2 · 🆕1
- Parámetro configurable: ⚙️ Tabla de colores de tendencia por temporada (actualizar cada temporada)
- Temporada activa: Primavera-Verano = febrero a julio · Otoño-Invierno = agosto a enero

---

### Tabla de Colores de Tendencia (hoja separada — actualizar cada temporada) ✅

La regla PR-09 cruza el color principal del producto con esta tabla para determinar si aplica posicionamiento prioritario.

| Año | Temporada | Nombre ES | Familia de Color |
|-----|-----------|-----------|-----------------|
| 2025 | Primavera-Verano | Teal Transformador | Azul-Verde |
| 2025 | Primavera-Verano | Azul Océano Profundo | Azul |
| 2025 | Primavera-Verano | Verde Agua Digital | Verde |
| 2025 | Primavera-Verano | Turquesa Futurista | Azul-Verde |
| 2025 | Primavera-Verano | Aqua Intenso | Azul-Verde |
| 2025 | Primavera-Verano | Fucsia Eléctrico | Rosa-Fucsia |
| 2025 | Primavera-Verano | Rosa Neón Chic | Rosa-Fucsia |
| 2025 | Primavera-Verano | Magenta Vibrante | Rosa-Fucsia |
| 2025 | Primavera-Verano | Rosa Rebelde | Rosa-Fucsia |
| 2025 | Primavera-Verano | Rosa Impacto | Rosa-Fucsia |
| 2025 | Primavera-Verano | Azul Aura | Azul |
| 2025 | Primavera-Verano | Azul Niebla | Azul |
| 2025 | Primavera-Verano | Bruma Azul | Azul |
| 2025 | Primavera-Verano | Azul Polvo Luminoso | Azul |
| 2025 | Primavera-Verano | Azul Hielo Suave | Azul |
| 2025 | Primavera-Verano | Ámbar Solar | Amarillo-Dorado |
| 2025 | Primavera-Verano | Amarillo Miel | Amarillo-Dorado |
| 2025 | Primavera-Verano | Bruma Dorada | Amarillo-Dorado |
| 2025 | Primavera-Verano | Amarillo Especia | Amarillo-Dorado |
| 2025 | Primavera-Verano | Brillo Miel | Amarillo-Dorado |
| 2025 | Primavera-Verano | Menta Jelly | Verde |
| 2025 | Primavera-Verano | Verde Fresh | Verde |
| 2025 | Primavera-Verano | Brillo Menta | Verde |
| 2025 | Primavera-Verano | Verde Pastel Líquido | Verde |
| 2025 | Primavera-Verano | Lima Suave | Verde |
| 2025 | Otoño-Invierno | Rojo Intenso | Rojo-Burdeos |
| 2025 | Otoño-Invierno | Rojo Vino | Rojo-Burdeos |
| 2025 | Otoño-Invierno | Rojo Granada | Rojo-Burdeos |
| 2025 | Otoño-Invierno | Burgundy Profundo | Rojo-Burdeos |
| 2025 | Otoño-Invierno | Cherry Lacado | Rojo-Burdeos |
| 2025 | Otoño-Invierno | Ciruela Oscura | Púrpura-Violeta |
| 2025 | Otoño-Invierno | Violeta Noche | Púrpura-Violeta |
| 2025 | Otoño-Invierno | Morado Profundo | Púrpura-Violeta |
| 2025 | Otoño-Invierno | Azul Tinta | Azul |
| 2025 | Otoño-Invierno | Azul Medianoche | Azul |
| 2025 | Otoño-Invierno | Azul Tormenta | Azul |
| 2025 | Otoño-Invierno | Azul Petróleo | Azul |
| 2025 | Otoño-Invierno | Verde Bosque | Verde |
| 2025 | Otoño-Invierno | Verde Musgo | Verde |
| 2025 | Otoño-Invierno | Verde Oliva Oscuro | Verde |
| 2025 | Otoño-Invierno | Verde Abeto | Verde |
| 2025 | Otoño-Invierno | Chocolate Oscuro | Marrón-Tierra |
| 2025 | Otoño-Invierno | Marrón Espresso | Marrón-Tierra |
| 2025 | Otoño-Invierno | Marrón Tierra | Marrón-Tierra |
| 2025 | Otoño-Invierno | Caramelo Tostado | Marrón-Tierra |
| 2025 | Otoño-Invierno | Arena Cálida | Neutros |
| 2025 | Otoño-Invierno | Beige Piedra | Neutros |
| 2025 | Otoño-Invierno | Gris Niebla | Neutros |
| 2025 | Otoño-Invierno | Gris Carbón | Neutros |
| 2025 | Otoño-Invierno | Negro Profundo | Neutros |
| 2025 | Otoño-Invierno | Negro Suave | Neutros |
| 2025 | Otoño-Invierno | Blanco Invierno | Neutros |
| 2025 | Otoño-Invierno | Marfil Cálido | Neutros |

> El usuario puede añadir nuevas temporadas desde la app. La regla PR-09 se aplica automáticamente sobre los datos de esta tabla.

---

## 3. MODELO DE DATOS DE PRODUCTO ✅

El usuario descarga un CSV plantilla con 3 filas de cabecera:
- Fila 1: nombre del campo
- Fila 2: descripción del campo
- Fila 3: obligatorio / opcional

Los datos empiezan en la fila 4.

### Campos del CSV de productos

| Campo | Obligatorio | Formato | Uso en el motor |
|-------|------------|---------|----------------|
| Código EAN | ✅ | 13 dígitos numéricos | Clave principal |
| Código de producto | Opcional | Alfanumérico, máx 20 car. | Clave alternativa |
| Nombre de producto | ✅ | Alfanumérico, máx 100 car. | Se muestra en el planograma |
| Colección | Opcional | Alfanumérico, máx 100 car. | Agrupación visual |
| Drop | Opcional | Alfanumérico, máx 100 car. | Agrupación temporal |
| Sexo | ✅ | Lista cerrada: Mujer / Hombre / Unisex | Agrupación y restricciones de zona |
| División de producto | Opcional | Alfanumérico, máx 100 car. | Para restricciones de zona |
| Tipo | Opcional | Alfanumérico, máx 100 car. | Para restricciones de zona |
| Subtipo | Opcional | Alfanumérico, máx 100 car. | Para restricciones de zona |
| Color principal | Opcional | Alfanumérico, máx 100 car. | Agrupación visual |
| Color principal detalle | Opcional | Alfanumérico, máx 100 car. | — |
| Subcolor | Opcional | Alfanumérico, máx 100 car. | — |
| Medida alto | Opcional | Cifra (cm) | Calcular tamaño físico automáticamente |
| Medida largo | Opcional | Cifra (cm) | Calcular tamaño físico automáticamente |
| Medida profundo | Opcional | Cifra (cm) | Calcular tamaño físico automáticamente |
| Precio de compra | ✅ | Cifra | Para calcular margen |
| PVP | ✅ | Cifra | Para reglas de prioridad |
| Unidades | ✅ | Entero sin decimales | Stock disponible |

> 💡 Si el usuario rellena las 3 medidas (alto, largo, profundo), el motor calcula el tamaño físico automáticamente aplicando la escala de la Sección 1. Si no las rellena, se le pedirá que asigne el tamaño manualmente al subir el CSV.

---

## 4. MODELO DE DATOS DE VENTAS ✅

El usuario descarga un CSV plantilla con 3 filas de cabecera:
- Fila 1: nombre del campo
- Fila 2: descripción del campo
- Fila 3: obligatorio / opcional

Los datos empiezan en la fila 4.

### Campos del CSV de ventas

| Campo | Obligatorio | Formato | Uso en el motor |
|-------|------------|---------|----------------|
| Fecha | ✅ | DD/MM/AAAA | Determinar el período analizado |
| Hora | ✅ | HH:MM | Análisis de franjas horarias (futuro) |
| Número de ticket | ✅ | Alfanumérico, puede incluir símbolos | Agrupar líneas de una misma venta |
| EAN | ✅ | 13 dígitos numéricos | Relacionar con el catálogo de productos |
| Unidades vendidas | ✅ | Entero sin decimales | Calcular rotación por producto |
| PVP | ✅ | Cifra | Verificación y cálculo de ingresos |

> 💡 El CSV de ventas tiene una fila por línea de ticket (un producto = una fila). Si un ticket tiene 3 productos distintos, son 3 filas con el mismo número de ticket.
> El sistema cruza el EAN con el catálogo para obtener el nombre, colección, tipo y demás atributos del producto.

---

## 5. PÁGINAS DEL MVP ✅

```
PÁGINA 1 — Home (pública)
  → Explicación del proyecto
  → Botón "Iniciar sesión" en esquina superior derecha

PÁGINA 2 — Login
  → Formulario: usuario + contraseña
  → Acceso a registro de cuenta nueva

PÁGINA 3 — Dashboard (privado, tras login)
  → Acceso a las 4 fases:
      a) Introducir características de la tienda
      b) Introducir base de datos de productos
      c) Introducir ventas
      d) Fijar objetivo y generar informe de visual merchandising
```

---

## 6. FLUJO DE USUARIO ✅

```
PRIMERA VEZ (configuración — una sola vez)
  1. Registro (email + contraseña + nombre tienda)
  2. Configurar layout:
       a. Indicar dónde está la entrada
       b. Añadir muebles pared a pared (con sus caras y posiciones)
       c. Añadir muebles de interior (con sus caras y posiciones)
  3. Subir catálogo de productos (CSV descargado de la app)
  4. Subir ventas de la primera semana (CSV)
  5. Elegir objetivo
  6. Generar planograma

CADA SEMANA (uso recurrente)
  1. Subir nuevo CSV de ventas
  2. (Opcional) Cambiar objetivo
  3. Generar planograma

CADA AÑO (actualización de catálogo)
  1. Subir nuevo CSV de catálogo
```

---

## 7. OUTPUT — EL PLANOGRAMA ✅

### Formato del resultado
Diagrama visual generado automáticamente — vista de planta con los muebles en su posición real (basada en la cuadrícula) y los productos asignados a cada posición.

### Información mostrada por producto
El nombre del producto es el único dato que aparece sobre cada posición en el diagrama. Sin EAN, sin precio, sin datos adicionales — el diagrama debe ser limpio y legible de un vistazo.

### Exportación
PDF imprimible. El store manager puede imprimirlo y llevarlo físicamente a la tienda para ejecutar el cambio.

### Productos sin posición asignada
Se quedan en almacén. La app no genera ninguna alerta ni listado — simplemente no aparecen en el planograma.

### Ajuste manual
No disponible en el MVP. A definir en versiones posteriores.

### Histórico de planogramas ✅
Se guarda el histórico completo de planogramas anteriores por dos motivos:
1. **Aplicar TV-05** (rotación programada) — el motor compara con el planograma anterior y evita dejar un producto en la misma posición dos semanas consecutivas
2. **Referencia histórica** — el usuario puede consultar planogramas pasados para comparar o recuperar una distribución anterior

---

## 8. IDENTIDAD VISUAL ✅

**Nombre de la app:** Cartistry

**Estilo:** Sofisticado, limpio, minimalista. Sin ornamentos innecesarios. Sensación de herramienta profesional de alto nivel.

### Paleta de colores
Tonos neutros sofisticados — arena, hueso, taupe, marrón oscuro. Sin colores vivos.

| Rol | Color | Hex sugerido |
|-----|-------|-------------|
| Fondo principal | Hueso / Off-white | #F5F0EB |
| Fondo secundario | Arena cálida | #E8DDD3 |
| Superficie de tarjetas | Blanco roto | #FAF7F4 |
| Acento principal | Taupe oscuro | #7C6B5E |
| Acento secundario | Marrón medio | #A08872 |
| Texto principal | Marrón muy oscuro | #2C1F14 |
| Texto secundario | Marrón medio-claro | #6B5744 |
| Bordes / separadores | Arena suave | #D4C4B5 |
| CTA / botón principal | Marrón oscuro | #3D2B1F |
| CTA texto | Hueso | #F5F0EB |

### Tipografía
Limpia, geométrica o con serif elegante. Sin fuentes decorativas.

| Rol | Fuente sugerida | Estilo |
|-----|----------------|--------|
| Títulos | Cormorant Garamond | Serif elegante, sofisticado |
| Cuerpo y UI | Inter | Sans-serif limpio y legible |
| Datos / tablas | Inter | Mismo, para consistencia |

> Ambas fuentes son gratuitas y están disponibles en Google Fonts.

### Principios de diseño
- Mucho espacio en blanco — el layout respira
- Bordes finos, sin sombras agresivas
- Iconografía simple y lineal
- Sin gradientes — colores planos
- El diagrama del planograma usa la misma paleta, no colores de semáforo

---

## 9. DETALLES FINALES ✅

### Idioma
La app es íntegramente en **español**. Todos los textos de la interfaz, mensajes de error, etiquetas y exportaciones en español.

### Registro de usuarios
**Solo por invitación.** El usuario no puede registrarse libremente. El acceso requiere un código o enlace de invitación generado por el administrador (Santiago). Esto implica un panel mínimo de administración para generar y gestionar invitaciones.

### Textos de la home
**Tagline / propuesta de valor:**
> *"El arte de exponer, convertido en ciencia."*

**Mensajes clave a transmitir:**
- Fácil de usar — sin instalaciones, sin formación técnica
- Sin grandes inversiones — herramienta accesible
- Para cualquier tipo de espacio de venta
- Decisiones basadas en datos, no en intuición

> El copywriting definitivo de la home se desarrollará en Claude Code a partir de estos pilares.

---

## 10. NOTAS ADICIONALES

```
[Cualquier cosa que quieras añadir: referencias visuales, funcionalidades futuras, restricciones, ideas...]
```

---

## ✅ CHECKLIST ANTES DE SUBIR A CLAUDE CODE

- [x] Sección 1: Tipos de espacio y configuración de todos los muebles
- [x] Sección 1: Sistema de cuadrícula para posicionamiento en planta
- [x] Sección 1: Pasillo principal como campo universal
- [x] Sección 2: 23 reglas base con prioridades por objetivo y parámetros configurables
- [x] Sección 2: Tabla de colores de tendencia (PR-09)
- [x] Sección 3: CSV de productos con todos los campos y validaciones
- [x] Sección 4: CSV de ventas con todos los campos y validaciones
- [x] Sección 5: Páginas del MVP (home, login, dashboard con 4 fases)
- [x] Sección 6: Flujo de usuario completo
- [x] Sección 7: Output del planograma definido
**El briefing está completo. Abre Claude Code y di:**
> *"Quiero construir una app web de visual merchandising multiusuario.
> Aquí está el briefing completo. Empieza por proponerme la arquitectura y el stack."*

---
*Briefing Final — Mayo 2026*
