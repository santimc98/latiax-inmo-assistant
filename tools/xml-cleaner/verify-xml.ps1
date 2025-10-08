# Quick validator for sanitized XML files produced by clean-xml.ps1.
# Usage:
#   pwsh ./tools/xml-cleaner/verify-xml.ps1 -Input "inmovilla_clean.xml"

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [Alias('Input')]
    [string]$InputPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $InputPath)) {
    throw "Input file '$InputPath' not found."
}

$fullPath = (Resolve-Path -LiteralPath $InputPath).ProviderPath

$settings = [System.Xml.XmlReaderSettings]::new()
$settings.CloseInput = $true
$settings.DtdProcessing = [System.Xml.DtdProcessing]::Prohibit
$settings.IgnoreComments = $true
$settings.IgnoreWhitespace = $true
$settings.XmlResolver = $null

try {
    $stream = $null
    $reader = $null
    $stream = [System.IO.File]::OpenRead($fullPath)
    try {
        $reader = [System.Xml.XmlReader]::Create($stream, $settings)
        while ($reader.Read()) { }
        Write-Output "OK: '$fullPath' is well-formed XML."
    } finally {
        if ($reader) { $reader.Dispose() }
        if ($stream) { $stream.Dispose() }
    }
} catch [System.Xml.XmlException] {
    $ex = $_.Exception
    $line = $ex.LineNumber
    $column = $ex.LinePosition

    $context = $null
    try {
        $context = Get-Content -Path $fullPath -TotalCount $line | Select-Object -Last 1
    } catch {
        # ignore context errors
    }

    Write-Error ("XML validation failed at line {0}, column {1}: {2}" -f $line, $column, $ex.Message)
    if ($context -ne $null) {
        $marker = ' ' * ([Math]::Max($column - 1, 0)) + '^'
        Write-Host "Context:"
        Write-Host $context
        Write-Host $marker
    }
    exit 1
}
