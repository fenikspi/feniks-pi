// Izvoz stranice u PNG kad je stvarno gotova (naslov stranice dobije „·”).
// Pokretanje: npx electron alati/izvoz.js <adresa> <izlaz.png> [veličina=2000]
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const [adresa, izlaz, vel = '2000'] = process.argv.slice(-3);
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const n = parseInt(vel, 10);
  const w = new BrowserWindow({ show: false, width: n, height: n, useContentSize: true, enableLargerThanScreen: true, transparent: /prozirno=1/.test(adresa), backgroundColor: /prozirno=1/.test(adresa) ? '#00000000' : '#000000', webPreferences: { offscreen: true } });
  w.setContentSize(n, n);
  await w.loadURL(adresa);
  for (let i = 0; i < 120; i++) { if ((await w.webContents.executeJavaScript('document.title')).endsWith('·')) break; await new Promise((r) => setTimeout(r, 250)); }
  await new Promise((r) => setTimeout(r, 400));
  const slika = await w.webContents.capturePage();
  fs.writeFileSync(izlaz, slika.toPNG());
  console.log('spremljeno', izlaz, slika.getSize());
  app.quit();
});
