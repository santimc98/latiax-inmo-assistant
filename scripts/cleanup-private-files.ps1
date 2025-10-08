Set-StrictMode -Version Latest

# Unstage CSV/XML and data/ if they were added before .gitignore
Get-ChildItem -Recurse -Include *.csv,*.xml | ForEach-Object {
  git rm --cached --ignore-unmatch -- "$($_.FullName)"
}
if (Test-Path data) { git rm --cached -r --ignore-unmatch data }
if (Test-Path tools/etl) {
  git rm --cached -r --ignore-unmatch tools/etl/*.csv
}

Write-Host "✅ Limpieza completada del índice. Revisa con 'git status'."
