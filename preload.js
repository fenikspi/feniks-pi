// Jedini most između stranice i Electrona: otvaranje prozora aplikacije.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('feniks', { otvoriAplikaciju: () => ipcRenderer.send('otvori-aplikaciju') });
