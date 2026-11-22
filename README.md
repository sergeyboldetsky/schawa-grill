# Schawa Grill aus Odessa — mobile website demo

Mobile-first static site (HTML/CSS/JS). No build step required.

## Deploy on GitHub Pages
1. Create a **public** GitHub repository (for example `schawa-grill`).
2. Upload `index.html` and the `assets` directory from this folder to the repository root.
3. In repository **Settings → Pages**, select **Deploy from a branch**, branch `main`, folder `/ (root)`, then Save.
4. Open the Pages URL shown by GitHub after deployment.

## Before taking real orders
- Set `CONFIG.whatsappNumber` in `assets/app.js` to your WhatsApp Business number, digits only with country code, e.g. `49...` (no plus sign).
- Confirm exact trading address; then replace placeholder route-button handlers with Google Maps / Waze links.
- Confirm product prices, ingredients, allergens, opening hours and legal information (Impressum, Datenschutz).
- This version uses a WhatsApp prefilled message, **not** an automated WhatsApp bot. The user must send the message, and the business must confirm the order.
- Prices and location are demonstration placeholders. Do not present this as an operating business before launch.

## Structure
- `index.html` — pages and forms
- `assets/style.css` — responsive styling
- `assets/app.js` — product catalog, basket, pickup time, WhatsApp message
- `assets/*.jpg` — local images from the previous Schawa Grill demo, including the supplied logo.

## Test locally
Open `index.html` in a browser or run `python3 -m http.server 8000` in this folder.
