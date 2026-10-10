# Orbit Radio

A minimalist web radio explorer. Browse stations by country and genre, save stations or favorite categories, search the station list, and listen with the built-in player.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Run `npm run dev` and open the local URL printed by Vite.
4. Run `npm run build` to type-check and create the production build.

## Radio directory and playback

The app includes a small featured set of public station stream URLs and looks up additional stations from the public Radio Browser directory when a country is selected. Directory availability and stream URLs are not guaranteed; broadcasters may change endpoints or become unavailable. Favorites are saved in this browser's local storage.

The requested `http://195.234.148.51:8000/stream/` stream is included as a featured example. Because it uses plain HTTP, browsers may block it on an HTTPS-hosted deployment as mixed content. A broadcaster's server may also reject playback or be offline; use the on-screen player status and try another station. The app does not claim to enumerate every public stream on the internet.

## Stack

React, TypeScript, Vite, Three.js via React Three Fiber and Drei, and Lucide icons.
