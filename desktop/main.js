/* Feniks π za računalo: samostalna inačica bez poslužitelja. Prikazuje web-aplikaciju (web/app) preko vlastitog
   protokola feniks://, pa radi bez interneta, a podaci (IndexedDB) ostaju na računalu. Vanjske poveznice otvara u pregledniku. */
const { app, BrowserWindow, protocol, net, shell, Menu } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const WEB = path.join(__dirname, 'web');
protocol.registerSchemesAsPrivileged([{ scheme: 'feniks', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);

if (!app.requestSingleInstanceLock()) app.quit();
let prozor = null;

function otvori() {
  prozor = new BrowserWindow({
    width: 1100, height: 860, minWidth: 380, title: 'Feniks π', backgroundColor: '#000000', autoHideMenuBar: true,
    icon: path.join(WEB, 'app', 'ikona-512.png'), webPreferences: { contextIsolation: true, sandbox: true }
  });
  prozor.loadURL('feniks://app/app/');
  prozor.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  prozor.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('feniks://')) { e.preventDefault(); if (/^https?:|^mailto:/.test(url)) shell.openExternal(url); } });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  protocol.handle('feniks', (zahtjev) => {
    let put = decodeURIComponent(new URL(zahtjev.url).pathname);
    if (put.endsWith('/')) put += 'index.html';
    const datoteka = path.normalize(path.join(WEB, put));
    if (!datoteka.startsWith(WEB + path.sep)) return new Response('', { status: 403 });
    return net.fetch(pathToFileURL(datoteka).toString());
  });
  otvori();
});
app.on('second-instance', () => { if (prozor) { if (prozor.isMinimized()) prozor.restore(); prozor.focus(); } });
app.on('window-all-closed', () => app.quit());
