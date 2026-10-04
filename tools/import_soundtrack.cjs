// Importación mecánica del MP3 elegido. Asset JS permite abrir index por file://.
// No modifica el original; la cadena se descarga y decodifica sólo al activar audio.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const source=process.argv[2];
if(!source)throw Error('Uso: node tools/import_soundtrack.cjs RUTA_MP3');
const bytes=fs.readFileSync(source),hash=crypto.createHash('sha256').update(bytes).digest('hex');
const dest=path.resolve(__dirname,'../assets/audio');fs.mkdirSync(dest,{recursive:true});
fs.writeFileSync(path.join(dest,'main-theme-data.js'),
  '// MP3 proporcionado por el usuario. SHA256 '+hash+'\nwindow.NV.mainThemeEncoded="'+bytes.toString('base64')+'";\n');
console.log(JSON.stringify({source,bytes:bytes.length,sha256:hash,asset:'assets/audio/main-theme-data.js'}));
