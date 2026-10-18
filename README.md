# LUAVANG — Vercel-ready source

A responsive Vietnamese catalogue UI re-created from the available HTML shell and branded as LUAVANG. This is a standalone static site with no backend or build dependencies.

## Included interactions

- Search by name, description, label, and tags.
- Filter by category and content type.
- Sort featured items, name, or update date.
- Save/unsave items in browser local storage.
- Light/dark mode preference in browser local storage.
- Product detail dialog, mobile navigation, and support/share dialog.
- Responsive layout, keyboard focus states, Escape-to-close for dialogs, and a reduced-motion preference.
- Validation script for required files and catalogue data.

## Deploy to Vercel

1. Extract this ZIP and place the contents of `LUAVANG-vercel-ready` at the repository root (so `index.html` is at the root, not one folder deeper).
2. Push the files to a Git repository.
3. In Vercel, import that repository. Select **Other** / static site when prompted. No framework preset, build command, or output directory is required; deploy the repository root as static files.
4. Deploy. The site loads its catalogue from `/data/catalog.json`.

## Run locally

The catalogue is loaded with `fetch()`, so open it through a local HTTP server rather than double-clicking `index.html` as a `file://` URL.

With Node.js installed:

```bash
npm run check
npx serve .
```

Or use Python:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Update the content

Edit `data/catalog.json`. Each entry has:

- `id`: unique stable ID
- `name`, `description`, `label`, `icon`
- `category`: one of `heart`, `love`, `couple`, `cards`, `birthday`, `tools`, `other`
- `type`: `web`, `website`, or `game`
- `tone`: illustration palette (`rose`, `lilac`, `sunshine`, `peach`, `mint`, `blue`, `slate`, or `violet`)
- `featured`: true/false
- `updatedAt`: `YYYY-MM-DD`
- `tags`: array of words to search
- `url`: full `https://...` destination when the real item is ready
- `demo`: true/false

The provided catalogue entries are clearly marked as illustrative examples. They do not represent real published LUAVANG tools and have no live destination URLs. Replace them with real content/URLs before public production use. Empty URLs intentionally show an “updating” state instead of pretending a product exists.

## Important scope notes

- The uploaded source file contained a minimal HTML shell pointing to `./assets/scripts.js`; that application file and supporting assets were not included. The received file also contained large injected browser-extension scripts. This project is an independent, clean rebuild rather than a byte-for-byte recovery of the missing original.
- This deliverable is a front-end static site. It does **not** implement login, user accounts, a content-management dashboard, a database, payments, donation processing, analytics, or server APIs. The share/support dialog only copies the current page URL; it does not accept money.
- Do not paste private API keys or secrets into static frontend files. Add a backend and server-side environment variables if the project later needs authentication, protected data, or payment integration.

## Validation

```bash
npm run check
```
