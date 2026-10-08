const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const builder=require('electron-builder');
async function run(){
  require('./check-delivery.cjs');
  const candidates=[path.join(root,'local/runtime/windows/electron.exe'),path.join(root,'node_modules/electron/dist/electron.exe')];
  const exe=candidates.find(file=>fs.existsSync(file));
  if(!exe)throw new Error('Falta Electron: ejecutá npm install.');
  const releases=path.join(root,'releases');fs.mkdirSync(releases,{recursive:true});
  const output=fs.mkdtempSync(path.join(releases,'DeadSingularity-V1-desktop-'));
  const signed=process.argv.includes('--signed');
  const artifacts=await builder.build({
    projectDir:root,
    targets:builder.Platform.WINDOWS.createTarget([process.argv.includes('--dir')?'dir':'nsis'],builder.Arch.x64),
    config:{electronDist:path.dirname(exe),electronVersion:'44.5.0',directories:{output},forceCodeSigning:signed,publish:null}
  });
  console.log('DESKTOP_OUTPUT='+output);
  for(const artifact of artifacts)console.log('ARTIFACT='+artifact);
  console.log(signed?'Firma obligatoria validada por el empaquetador.':'Firma comercial: sólo se aplica si hay credenciales configuradas.');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
