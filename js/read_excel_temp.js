const XLSX = require('xlsx');
const path = require('path');

function readExcel(filePath) {
  console.log('\n' + '='.repeat(80));
  console.log('FILE: ' + filePath);
  console.log('='.repeat(80));
  
  const wb = XLSX.readFile(filePath);
  console.log('SHEETS:', wb.SheetNames.join(', '));
  
  for (const sheetName of wb.SheetNames) {
    console.log('\n--- SHEET: ' + sheetName + ' ---');
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    for (const row of data) {
      if (row.some(c => c !== '')) {
        console.log(row.join('\t'));
      }
    }
  }
}

readExcel('C:/Users/nicol/Downloads/Valores on-boarding (1).xlsx');
readExcel('C:/Users/nicol/Downloads/Lista de itens obrigatórios - WECARE Hosting (1).xlsx');
