const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Ruta de destino en la carpeta public del frontend
const publicDir = path.join(__dirname, 'public');
const targetFile = path.join(publicDir, 'plantilla_importacion.xlsx');

console.log('Directorio público objetivo:', publicDir);
console.log('Ruta del archivo objetivo:', targetFile);

// Definir los 11 encabezados correctos
const headers = [
  'Nombre',
  'SKU',
  'Codigo_Barras',
  'Categoria',
  'Precio_Venta',
  'Precio_Compra',
  'Margen_Ganancia',
  'Stock',
  'Minimo_Stock',
  'Unidad',
  'Es_Pesable'
];

// Datos de ejemplo para guiar al usuario
const sampleData = [
  {
    Nombre: 'ARROZ DIANA 1KG',
    SKU: 'ARR001',
    Codigo_Barras: '7702123456789',
    Categoria: 'ABARROTES',
    Precio_Venta: 4200,
    Precio_Compra: 3100,
    Margen_Ganancia: 26,
    Stock: 150,
    Minimo_Stock: 10,
    Unidad: 'unid',
    Es_Pesable: 'NO'
  },
  {
    Nombre: 'PAPA SABANERA KG',
    SKU: 'PAP002',
    Codigo_Barras: '7709876543210',
    Categoria: 'VERDURAS',
    Precio_Venta: 2500,
    Precio_Compra: 1700,
    Margen_Ganancia: 32,
    Stock: 80,
    Minimo_Stock: 15,
    Unidad: 'kg',
    Es_Pesable: 'SI'
  }
];

// Crear hoja de cálculo
const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla');

// Asegurar que el directorio de salida existe
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Escribir archivo excel binario
XLSX.writeFile(workbook, targetFile);

console.log('¡Plantilla Excel generada exitosamente en:', targetFile);
fs.unlinkSync(__filename); // Auto-eliminación del script temporal
console.log('Script temporal eliminado.');
