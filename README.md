# Ethixweb Client Map

A world map of Ethixweb's clients on real satellite imagery. Each client gets a red pin on their exact address, and their city boundary is highlighted.

## Run it

```bash
cd EthixwebMap
python3 -m http.server 5173
```

Then open http://localhost:5173. You need an internet connection for the imagery and place search.

## Using it

- **Add client** (top right): enter the company name, then search a street address, city or area, or click **Or click the spot on the map**. The city boundary is looked up automatically.
- **Click a pin or a client card** to zoom in and see the address, website, phone and notes, with Edit and Remove.
- **Search** (press `/`) filters the list and the map by company, industry, contact or place.
- **Map controls** (bottom right): zoom, globe or flat map, place names and roads on or off, reset rotation, zoom to all clients, and whole world.
- **Ethixweb office**: switch this on for one entry to show it as a black pin with dashed lines to every client.
- **Sound and haptics**: buttons, pins and actions give a soft click and, on phones, a light vibration. The speaker button in the map controls turns both off, and the choice is remembered. Sounds are generated in the browser, so there are no audio files. Haptics use the vibration API on Android and the native switch tap on iPhone (iOS 18 and later).
- **Backup** (bottom of the list): Export downloads a JSON file and Import loads one back, either added to the map or replacing it.

## Files

| File | What it is |
|---|---|
| `index.html` | Page layout |
| `styles.css` | Design: brand red, white, cream and black, with glass and clay surfaces |
| `app.js` | Map, pins, search, add, edit and remove |
| `data/clients.js` | The client list that ships with the map |
| `assets/ethixweb-logo.png` | Web-sized copy of `ethixweb-wordmark-red-print.png` |

Changes made in the app are saved in that browser. A new entry added to `data/clients.js` shows up for everyone the next time they open the map.

## Data sources

- Satellite imagery, place names and roads: Esri World Imagery and reference layers (attribution shown on the map)
- Address search and city boundaries: © OpenStreetMap contributors, via Nominatim (about 1 request per second)
- Renderer: MapLibre GL JS 5.24
