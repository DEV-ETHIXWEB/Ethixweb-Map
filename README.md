# Ethixweb Client Map

A map of businesses on real satellite imagery. Each business gets a pin on its exact address, and its city boundary is highlighted. The same code runs two editions:

| Edition | Address | What it shows |
|---|---|---|
| **Ethixweb** | `/` | Ethixweb's clients, in Ethixweb red, cream and black |
| **Spartan Management Group** | `/spartan/` | Spartan Management Group's 13 businesses and its headquarters, in Spartan blue and helmet red, grouped as on [spartanmg.net/locations](https://www.spartanmg.net/locations) |

## Run it

```bash
cd EthixwebMap
python3 -m http.server 5173
```

Then open http://localhost:5173 (Ethixweb) or http://localhost:5173/spartan/ (Spartan). You need an internet connection for the imagery and place search.

## Using it

- **Add** (top right): enter the company name, then search a street address, city or area, or click **Or click the spot on the map**. The city boundary is looked up automatically.
- **Click a pin or a card** to zoom in and see the logo, address, website, phone and notes, with Edit and Remove.
- **Search** (press `/`) filters the list and the map by company, service, contact or place.
- **Map controls** (bottom right): zoom, globe or flat map, place names and roads on or off, reset rotation, sound on or off, zoom to everything, and whole world. The logo in the top bar returns to the home view.
- **Office / headquarters**: switch this on for one entry to give it its own pin colour and dashed lines to every other location.
- **Sound and haptics**: buttons, pins and actions give a soft click and, on phones, a light vibration. The speaker button turns both off, and the choice is remembered. Sounds are generated in the browser, so there are no audio files. Haptics use the vibration API on Android and the native switch tap on iPhone (iOS 18 and later).
- **Backup** (bottom of the list): Export downloads a JSON file and Import loads one back, either added to the map or replacing it.

Each edition saves its changes separately in the browser, so editing one never affects the other.

## Files

| File | What it is |
|---|---|
| `index.html` | Ethixweb edition page |
| `styles.css` | Shared design (glass and clay surfaces). Colours are theme variables at the top |
| `app.js` | Shared map, pins, search, add, edit and remove. Edition settings come from `window.MAP_CONFIG` |
| `data/clients.js` | Ethixweb's client list |
| `assets/` | Ethixweb logo, favicons and share image |
| `site.webmanifest` | Ethixweb "Add to Home Screen" details |
| `spartan/index.html` | Spartan edition page, including its settings (wording, sections, colours) |
| `spartan/theme.css` | Spartan colours and Poppins font |
| `spartan/data/businesses.js` | Spartan businesses: names and descriptions from spartanmg.net; addresses and phones from each business's own website; coordinates from Esri, US Census and OpenStreetMap address matches |
| `spartan/assets/` | Spartan logo, business logos, favicons and share image |

A new entry added to a data file shows up for everyone the next time they open that edition. When you change the page layout, update both `index.html` and `spartan/index.html`; the two bodies match apart from wording and logo.

## Data sources

- Satellite imagery, place names and roads: Esri World Imagery and reference layers (attribution shown on the map)
- Address search and city boundaries: © OpenStreetMap contributors, via Nominatim (about 1 request per second)
- Renderer: MapLibre GL JS 5.24
