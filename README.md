# CraveWheel

Spin. Discover. Eat.

## Requirements
- Node.js 22 LTS recommended
- npm

## Run locally
```bash
npm install
npm start
```
Open http://localhost:4200.

## Production build and tests
```bash
npm run build
npm test
```

## Deploy to Vercel (free Hobby for personal/non-commercial use)
1. Push the `frontend` folder contents to a GitHub repository.
2. Sign in at https://vercel.com with GitHub.
3. Select **Add New → Project** and import the repository.
4. Set Framework Preset to **Angular** (or Other if auto-detection fails).
5. Set Build Command to `npm run build`.
6. Set Output Directory to `dist/frontend/browser`.
7. Click **Deploy**.

Vercel will provide a public `*.vercel.app` URL. Open that URL on your phone or computer; share it with anyone. For a later update, push commits to the connected GitHub branch and Vercel redeploys automatically. A custom domain is optional and usually costs money to register.

## PWA installation
After deployment, open the HTTPS site on a supported mobile browser. On Android/Chrome, use **Install app** or **Add to Home screen**. On iPhone/iPad Safari, use **Share → Add to Home Screen**.

## Data and service notes
- Food catalogue: static `public/data/foods.json`.
- Nearby places: OpenStreetMap Nominatim + Overpass public services. These are community services with usage policies and no uptime guarantee; use reasonable request frequency.
- Favourites are stored in browser local storage on the current device/browser and do not sync across devices.
- Restaurant category matching is approximate and is not confirmation of a restaurant's menu.
- Location permission is optional; manual city/area search is available.
