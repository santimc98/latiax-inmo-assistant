# latiax-inmo-assistant

Monorepo for the Latiax real-estate assistant.

## Projects
- inmo-assistant-api/ – NestJS backend powering WhatsApp automations.

See inmo-assistant-api/README.md for setup, webhook verification, and deployment notes.

## Data tooling

### XML cleaner
- `pwsh ./tools/xml-cleaner/clean-xml.ps1 -Input "inmovilla.xml" -Output "inmovilla_clean.xml"`
- `pwsh ./tools/xml-cleaner/verify-xml.ps1 -Input "inmovilla_clean.xml"`

### CSV scoring & canonical export
1. Install tooling dependencies once: `npm install --prefix tools/etl`
2. Analyse any sanitized CSV export:
   - `node tools/etl/columns-review.mjs --input ./inmovilla_clean.csv`
   - Outputs (alongside the input):
     - `columns_review.csv` – per-column score (A/B/C/X), reasoning, and suggested canonical mapping.
     - `inmovilla_canonical.csv` – dataset restricted to canonical A/B fields, normalized (price/area/booleans) and with `price_per_m2` derived.
3. Canonical schema definition lives at `tools/etl/schema.json`.

## Protección de datos privados (Inmovilla)

- Los archivos `.csv`/`.xml` y la carpeta `data/` están ignorados por Git.
- Existe un _pre-commit_ (Husky) que bloquea cualquier commit que incluya `.csv`/`.xml`.
- Scripts para limpiar el índice si se coló algún fichero sensible:
  - Bash: `bash scripts/cleanup-private-files.sh`
  - PowerShell: `powershell -ExecutionPolicy Bypass -File scripts/cleanup-private-files.ps1`

**Primer uso**
```bash
npm i
npm run prepare   # inicializa Husky
# Luego, limpia el índice (si alguna vez subiste CSV/XML):
bash scripts/cleanup-private-files.sh
git add .
git commit -m "chore: guard rails to protect private data"
```
