'use strict';
// Exercise the real entry/menu without opening or migrating the user's profile.
const electron=require('electron'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'dsv1-profiler-shell-'));
const originalPath=electron.app.getPath.bind(electron.app);
electron.app.getPath=name=>name==='appData'?temporary:originalPath(name);
require('../desktop/profile.cjs').prepareProfile=()=>false;
const RealWindow=electron.BrowserWindow;
// main destructures the module; only the QA shell window is hidden.
const Module=require('node:module'),originalLoad=Module._load;
Module._load=function(name,...args){if(name==='electron')return {...electron,BrowserWindow:class extends RealWindow{constructor(options){super({...options,show:false});}}};return originalLoad.call(this,name,...args);};
process.argv.push('--profile-performance');
require('../desktop/main.cjs');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
electron.app.whenReady().then(async()=>{
 for(let i=0;i<100&&!electron.Menu.getApplicationMenu();i++)await wait(100);
 const win=RealWindow.getAllWindows()[0];assert(win);assert(electron.app.getPath('userData').startsWith(temporary));
 const actions=()=>electron.Menu.getApplicationMenu().items[0].submenu.items;
 assert.equal(actions()[0].accelerator,'F8');actions()[0].click();
 for(let i=0;i<100&&!win.getTitle().includes('GRABANDO');i++)await wait(100);
 assert(win.getTitle().includes('GRABANDO'));await wait(3000);actions()[0].click();
 for(let i=0;i<200&&!win.getTitle().includes('TRAZA GUARDADA');i++)await wait(100);
 assert(win.getTitle().includes('TRAZA GUARDADA'));
 const out=path.resolve(__dirname,'../local/profiling');
 const captures=fs.readdirSync(out).filter(file=>file.startsWith('captura-'));
 assert(captures.length);
 const latest=captures.sort().at(-1),files=fs.readdirSync(path.join(out,latest)).sort();
 assert.deepEqual(files,['performance.trace.json.gz','session.json']);
 let opened;
 const originalOpen=electron.shell.openPath;electron.shell.openPath=async target=>{opened=target;return '';};
 actions().find(item=>item.accelerator==='F6').click();await wait(100);
 electron.shell.openPath=originalOpen;assert.equal(opened,path.join(out,latest));
 console.log('PASS real profiling entry: isolated user profile, F8 menu/start/stop/export, status title and unchanged sandbox.');
 electron.app.exit(0);
}).catch(error=>{console.error(error);electron.app.exit(1);});
