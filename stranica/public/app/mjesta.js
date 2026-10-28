/* Feniks π: mjesta za natalnu kartu i nebo: [geografska širina, dužina, vremenska zona IANA].
   Povijesno ljetno i zimsko vrijeme računa core.js iz zone. Ostala mjesta upisuju se koordinatama. */
var Mjesta = (function () {
  'use strict';
  var Z = 'Europe/Zagreb';
  var M = {
    'Zagreb': [45.815, 15.982, Z], 'Split': [43.508, 16.440, Z], 'Rijeka': [45.327, 14.442, Z], 'Osijek': [45.554, 18.696, Z], 'Zadar': [44.119, 15.231, Z],
    'Pula': [44.867, 13.850, Z], 'Slavonski Brod': [45.160, 18.016, Z], 'Karlovac': [45.487, 15.548, Z], 'Varaždin': [46.304, 16.338, Z], 'Šibenik': [43.735, 15.890, Z],
    'Sisak': [45.466, 16.378, Z], 'Dubrovnik': [42.650, 18.094, Z], 'Bjelovar': [45.898, 16.849, Z], 'Koprivnica': [46.163, 16.833, Z], 'Vinkovci': [45.288, 18.805, Z],
    'Vukovar': [45.351, 19.002, Z], 'Čakovec': [46.384, 16.434, Z], 'Požega': [45.340, 17.685, Z], 'Gospić': [44.546, 15.375, Z], 'Virovitica': [45.832, 17.384, Z],
    'Sarajevo': [43.856, 18.413, 'Europe/Sarajevo'], 'Mostar': [43.343, 17.808, 'Europe/Sarajevo'], 'Banja Luka': [44.772, 17.191, 'Europe/Sarajevo'],
    'Ljubljana': [46.056, 14.506, 'Europe/Ljubljana'], 'Maribor': [46.554, 15.646, 'Europe/Ljubljana'], 'Beograd': [44.787, 20.457, 'Europe/Belgrade'],
    'Novi Sad': [45.267, 19.833, 'Europe/Belgrade'], 'Niš': [43.320, 21.896, 'Europe/Belgrade'], 'Podgorica': [42.441, 19.263, 'Europe/Podgorica'],
    'Skopje': [41.998, 21.425, 'Europe/Skopje'], 'Beč / Wien': [48.208, 16.373, 'Europe/Vienna'], 'Graz': [47.070, 15.439, 'Europe/Vienna'],
    'München': [48.137, 11.575, 'Europe/Berlin'], 'Berlin': [52.520, 13.405, 'Europe/Berlin'], 'Frankfurt': [50.110, 8.682, 'Europe/Berlin'],
    'Stuttgart': [48.776, 9.183, 'Europe/Berlin'], 'Zürich': [47.377, 8.541, 'Europe/Zurich'], 'Budapest': [47.498, 19.040, 'Europe/Budapest'],
    'Roma': [41.903, 12.496, 'Europe/Rome'], 'Milano': [45.464, 9.190, 'Europe/Rome'], 'Trieste': [45.650, 13.777, 'Europe/Rome'],
    'Paris': [48.857, 2.352, 'Europe/Paris'], 'Madrid': [40.417, -3.704, 'Europe/Madrid'], 'Barcelona': [41.385, 2.173, 'Europe/Madrid'],
    'Lisboa': [38.722, -9.139, 'Europe/Lisbon'], 'London': [51.507, -0.128, 'Europe/London'], 'Dublin': [53.350, -6.260, 'Europe/Dublin'],
    'Amsterdam': [52.368, 4.904, 'Europe/Amsterdam'], 'Bruxelles': [50.850, 4.352, 'Europe/Brussels'], 'Praha': [50.076, 14.438, 'Europe/Prague'],
    'Warszawa': [52.230, 21.012, 'Europe/Warsaw'], 'Stockholm': [59.329, 18.069, 'Europe/Stockholm'], 'Oslo': [59.914, 10.752, 'Europe/Oslo'],
    'København': [55.676, 12.568, 'Europe/Copenhagen'], 'Helsinki': [60.170, 24.938, 'Europe/Helsinki'], 'Athína': [37.984, 23.728, 'Europe/Athens'],
    'Sofia': [42.698, 23.322, 'Europe/Sofia'], 'Bucureşti': [44.427, 26.103, 'Europe/Bucharest'], 'İstanbul': [41.008, 28.978, 'Europe/Istanbul'],
    'Kyiv / Київ': [50.450, 30.523, 'Europe/Kyiv'], 'Moskva / Москва': [55.756, 37.617, 'Europe/Moscow'], 'Sankt-Peterburg': [59.939, 30.316, 'Europe/Moscow'],
    'New York': [40.713, -74.006, 'America/New_York'], 'Chicago': [41.878, -87.630, 'America/Chicago'], 'Los Angeles': [34.052, -118.244, 'America/Los_Angeles'],
    'Toronto': [43.653, -79.383, 'America/Toronto'], 'Ciudad de México': [19.433, -99.133, 'America/Mexico_City'], 'Buenos Aires': [-34.604, -58.382, 'America/Argentina/Buenos_Aires'],
    'São Paulo': [-23.551, -46.633, 'America/Sao_Paulo'], 'Santiago de Chile': [-33.449, -70.669, 'America/Santiago'], 'Sydney': [-33.869, 151.209, 'Australia/Sydney'],
    'Melbourne': [-37.814, 144.963, 'Australia/Melbourne'], 'Auckland': [-36.849, 174.763, 'Pacific/Auckland'], 'Tokyo': [35.676, 139.650, 'Asia/Tokyo'],
    'Delhi': [28.614, 77.209, 'Asia/Kolkata'], 'Dubai': [25.204, 55.271, 'Asia/Dubai'], 'Cairo': [30.044, 31.236, 'Africa/Cairo'], 'Johannesburg': [-26.204, 28.047, 'Africa/Johannesburg']
  };
  function popis() { return Object.keys(M).sort(function (a, b) { return a.localeCompare(b); }); }
  function dohvati(ime) { var m = M[ime]; return m ? { ime: ime, lat: m[0], lon: m[1], zona: m[2] } : null; }
  // Zona za ručno upisane koordinate: popis svih IANA zona iz preglednika, ako ih zna.
  function zone() { try { return Intl.supportedValuesOf('timeZone'); } catch (e) { return [Z, 'UTC']; } }
  return { popis: popis, dohvati: dohvati, zone: zone };
})();
