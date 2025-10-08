#!/usr/bin/env bash
set -euo pipefail

# Remove CSV/XML and data/ from the Git index if they were previously committed.
git ls-files -z | grep -zE '\.(csv|xml)$' | xargs -0 git rm --cached --ignore-unmatch || true
git rm --cached -r --ignore-unmatch data/ || true
git rm --cached -r --ignore-unmatch tools/etl/*.csv || true
git rm --cached -r --ignore-unmatch tools/etl/**/inmovilla_*.csv || true
git rm --cached -r --ignore-unmatch tools/etl/**/columns_review.csv || true
git rm --cached -r --ignore-unmatch tools/etl/**/inmovilla_canonical.csv || true

echo "✅ Limpieza completada del índice. Revisa con 'git status'."
