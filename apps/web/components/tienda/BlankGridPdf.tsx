'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

interface BlankGridPdfProps {
  storeName: string;
  cols: number;
  rows: number;
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#F4F0E9',
    padding: 28,
    color: '#1A1714',
    fontFamily: 'Helvetica',
    fontSize: 9,
  },
  brandbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1.5,
    borderBottomColor: '#1A1714',
    paddingBottom: 6,
    marginBottom: 10,
  },
  brand: {
    fontSize: 12,
    fontFamily: 'Times-Bold',
    letterSpacing: 3,
  },
  brandDot: { color: '#9A7B4F' },
  kicker: {
    fontSize: 7,
    letterSpacing: 1.5,
    color: '#8A8073',
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'Times-Bold',
    fontSize: 18,
    marginTop: 6,
  },
  subtitle: {
    fontSize: 9,
    color: '#8A8073',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'column',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: '#1A1714',
  },
  rowFlex: { flexDirection: 'row' },
  cell: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#1A1714',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCell: {
    backgroundColor: '#1A1714',
    color: '#F4F0E9',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  bodyCell: {
    backgroundColor: '#FFFFFF',
  },
  cornerCell: {
    backgroundColor: '#1A1714',
  },
  footer: {
    position: 'absolute',
    bottom: 14,
    left: 28,
    right: 28,
    fontSize: 7,
    letterSpacing: 1.5,
    color: '#8A8073',
    textTransform: 'uppercase',
    borderTopWidth: 1,
    borderTopColor: '#DDD4C5',
    paddingTop: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

function columnLetter(i: number): string {
  // 0->A, 25->Z, 26->AA, etc.
  let n = i;
  let s = '';
  while (true) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
    if (n < 0) break;
  }
  return s;
}

export function BlankGridPdf({ storeName, cols, rows }: BlankGridPdfProps) {
  // A4 landscape interior ~770×525 pt menos padding ~770-56 / 525-56 ≈ 714 × 469
  const availableW = 770 - 56;
  const availableH = 525 - 56 - 60; // dejamos hueco para header + footer
  const totalCols = cols + 1; // +1 para la columna de números
  const totalRows = rows + 1; // +1 para la cabecera de letras
  const cellSize = Math.min(availableW / totalCols, availableH / totalRows, 60);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.brandbar}>
          <Text style={styles.brand}>
            CARTISTRY<Text style={styles.brandDot}>.</Text>
          </Text>
          <Text style={styles.kicker}>Plantilla de disposición · {cols} × {rows}</Text>
        </View>
        <Text style={styles.title}>{storeName || 'Tienda sin nombre'}</Text>
        <Text style={styles.subtitle}>
          Dibuja la posición de cada mueble en su celda. Después copia las referencias (A1, B3…) en la app.
        </Text>

        <View style={styles.grid}>
          {/* Cabecera: esquina + letras de columna */}
          <View style={styles.rowFlex}>
            <View
              style={[
                styles.cell,
                styles.cornerCell,
                { width: cellSize, height: cellSize },
              ]}
            />
            {Array.from({ length: cols }).map((_, i) => (
              <View
                key={`h-${i}`}
                style={[
                  styles.cell,
                  styles.headerCell,
                  { width: cellSize, height: cellSize },
                ]}
              >
                <Text>{columnLetter(i)}</Text>
              </View>
            ))}
          </View>

          {/* Filas: número + celdas en blanco */}
          {Array.from({ length: rows }).map((_, r) => (
            <View key={`r-${r}`} style={styles.rowFlex}>
              <View
                style={[
                  styles.cell,
                  styles.headerCell,
                  { width: cellSize, height: cellSize },
                ]}
              >
                <Text>{r + 1}</Text>
              </View>
              {Array.from({ length: cols }).map((_, c) => (
                <View
                  key={`c-${r}-${c}`}
                  style={[
                    styles.cell,
                    styles.bodyCell,
                    { width: cellSize, height: cellSize },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text>© Cartistry</Text>
          <Text>Plantilla {cols} × {rows}</Text>
          <Text>{storeName}</Text>
        </View>
      </Page>
    </Document>
  );
}
