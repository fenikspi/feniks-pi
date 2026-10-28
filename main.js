// Feniks π: Electron ljuska. Pokreće lokalni poslužitelj, živu pozadinu (prozor razine radne površine)
// i prozor aplikacije. Sučelje i podaci dolaze s http://127.0.0.1:8765 (samo ovo računalo).
const { app, BrowserWindow, Tray, Menu, nativeImage, nativeTheme, ipcMain, screen, shell, powerMonitor } = require('electron');
const { execFile, spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const os = require('node:os');

const BAZA = 'http://127.0.0.1:8765';
const POKRENI = path.join(os.homedir(), 'Kosmogram', 'app', 'pokreni.sh');
let pozadina = null, aplikacija = null, tray = null;

if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => otvoriAplikaciju());

function radi() {
  return new Promise((res) => {
    http.get(BAZA + '/api/biblioteka', (r) => { r.resume(); res(r.statusCode === 200); }).on('error', () => res(false));
  });
}
async function pokreniPosluzitelj() {
  if (await radi()) return;
  await new Promise((res) => execFile(POKRENI, ['--bez-pozadine'], () => res()));
  for (let i = 0; i < 20 && !(await radi()); i++) await new Promise((r) => setTimeout(r, 500));
}

function sigurno(win) {
  // Samo lokalni poslužitelj unutar prozora; sve ostalo otvara se u pregledniku.
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(BAZA)) { e.preventDefault(); shell.openExternal(url); } });
}
const IKONA = path.join(__dirname, 'assets', 'ikone', 'ikona-256.png');
const webPrefs = { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true };

function stvoriPozadinu() {
  const { bounds } = screen.getPrimaryDisplay();
  pozadina = new BrowserWindow({
    ...bounds, type: process.platform === 'linux' ? 'desktop' : undefined, frame: false, skipTaskbar: true, icon: IKONA,
    resizable: false, movable: false, focusable: true, backgroundColor: '#04050c', show: false, webPreferences: webPrefs,
  });
  sigurno(pozadina);
  pozadina.loadURL(BAZA + '/feniks/ui/pozadina.html');
  pozadina.once('ready-to-show', () => pozadina.showInactive());
  pozadina.on('closed', () => { pozadina = null; });
}

function otvoriAplikaciju() {
  if (aplikacija) { aplikacija.show(); aplikacija.focus(); return; }
  aplikacija = new BrowserWindow({ width: 1280, height: 860, title: 'Feniks π', icon: IKONA, backgroundColor: '#0d1120', autoHideMenuBar: true, webPreferences: webPrefs });
  sigurno(aplikacija);
  aplikacija.loadURL(BAZA + '/feniks/ui/app.html');
  aplikacija.on('closed', () => { aplikacija = null; });
}

function izbornik() {
  const ikona = nativeImage.createFromPath(path.join(__dirname, 'assets', 'ikone', 'ikona-24.png'));
  tray = new Tray(ikona);
  tray.setToolTip('Feniks π');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Otvori Feniks π', click: otvoriAplikaciju },
    { label: 'Živa pozadina', type: 'checkbox', checked: true, click: (i) => { if (i.checked) stvoriPozadinu(); else if (pozadina) pozadina.close(); } },
    { label: 'Osvježi pozadinu', click: () => pozadina && pozadina.reload() },
    { type: 'separator' },
    { label: 'Izlaz', click: () => app.quit() },
  ]));
  tray.on('click', otvoriAplikaciju);
}

ipcMain.on('otvori-aplikaciju', otvoriAplikaciju);

/* ---------- agent čitač: jedna knjiga dnevno lokalnim modelom, više kad računalo miruje ---------- */
const AGENT = path.join(os.homedir(), 'Kosmogram', 'agent');
const PYTHON = path.join(os.homedir(), 'Kosmogram', 'app', '.venv', 'bin', 'python');
const OLLAMA = path.join(os.homedir(), '.local', 'opt', 'ollama', 'bin', 'ollama');
const STANJE = path.join(AGENT, 'dnevno.json');
let citaSe = false;
function stanje() { try { return JSON.parse(fs.readFileSync(STANJE, 'utf8')); } catch { return {}; } }
function ollamaRadi() {
  return new Promise((res) => { http.get('http://127.0.0.1:11434/api/version', (r) => { r.resume(); res(r.statusCode === 200); }).on('error', () => res(false)); });
}
async function pokreniOllamu() {
  if (await ollamaRadi()) return true;
  if (!fs.existsSync(OLLAMA)) return false;
  const p = spawn(OLLAMA, ['serve'], { detached: true, stdio: 'ignore', env: { ...process.env, OLLAMA_HOST: '127.0.0.1:11434', OLLAMA_MODELS: path.join(os.homedir(), '.local', 'opt', 'ollama', 'modeli') } });
  p.unref();
  for (let i = 0; i < 30 && !(await ollamaRadi()); i++) await new Promise((r) => setTimeout(r, 1000));
  return ollamaRadi();
}
async function mozdaCitaj() {
  if (citaSe) return;
  const danas = new Date().toISOString().slice(0, 10), s = stanje();
  const dnevnaGotova = s.datum === danas;
  const miruje = powerMonitor.getSystemIdleTime() > 15 * 60;
  if (dnevnaGotova && !miruje) return;                       // dnevna knjiga je pročitana, a računalo se koristi
  if (!(await pokreniOllamu())) return;                      // lokalni model još nije instaliran
  citaSe = true;
  const log = fs.openSync(path.join(AGENT, 'dnevno.log'), 'a');
  const p = spawn('nice', ['-n', '15', PYTHON, '-u', path.join(AGENT, 'citac.py'), '--pokreni', '--max', '1', '--pisac', 'lokalni'], { cwd: AGENT, stdio: ['ignore', log, log] });
  p.on('exit', (kod) => {
    citaSe = false;
    if (kod === 0) fs.writeFileSync(STANJE, JSON.stringify({ datum: danas, procitano: (s.datum === danas ? (s.procitano || 0) : 0) + 1 }));
  });
}

app.whenReady().then(async () => {
  nativeTheme.themeSource = 'dark'; // i natalna karta (Kosmogram) prati tamnu temu
  await pokreniPosluzitelj();
  izbornik();
  stvoriPozadinu();
  if (process.argv.includes('--aplikacija')) otvoriAplikaciju();
  setTimeout(mozdaCitaj, 5 * 60000);              // prvi pokušaj 5 minuta nakon pokretanja
  setInterval(mozdaCitaj, 20 * 60000);            // zatim svakih 20 minuta provjera
});
app.on('window-all-closed', (e) => e.preventDefault()); // ostaje u traci
