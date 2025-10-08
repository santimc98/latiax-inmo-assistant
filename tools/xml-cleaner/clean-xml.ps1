# Clean and sanitize Inmovilla XML exports so that Excel can import them without errors.
# Usage examples:
#   pwsh ./tools/xml-cleaner/clean-xml.ps1 -Input "inmovilla.xml" -Output "inmovilla_clean.xml"
#   pwsh ./tools/xml-cleaner/clean-xml.ps1 -Input "inmovilla.xml" -Output "inmovilla_clean.xml" -ForceCP1252
#
# Steps performed:
# 1) Optionally reinterpret mojibake produced by Windows-1252 vs UTF-8 confusion.
# 2) Strip control characters that are invalid in XML 1.0.
# 3) Sanitize element and attribute names (remove diacritics, replace unsafe characters with underscores).
# 4) Ensure UTF-8 XML declaration and save without BOM.

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [Alias('Input')]
    [string]$InputPath,

    [Parameter(Mandatory = $true)]
    [Alias('Output')]
    [string]$OutputPath,

    [switch]$ForceCP1252
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Test-Mojibake {
    param (
        [string]$Text
    )

    if ([string]::IsNullOrWhiteSpace($Text)) {
        return $false
    }

    $chars = $Text.ToCharArray()
    $length = $chars.Length
    if ($length -lt 2) {
        return $false
    }

    $suspectCount = 0
    $replacementCount = 0
    $triggerChars = @([char]0x00C3, [char]0x00C2)

    for ($i = 0; $i -lt $length - 1; $i++) {
        $current = $chars[$i]
        if ($current -eq $triggerChars[0] -or $current -eq $triggerChars[1]) {
            $nextValue = [int][char]$chars[$i + 1]
            $isHighBit = ($nextValue -ge 0x00A0 -and $nextValue -le 0x00FF)
            $isTypographic = ($nextValue -ge 0x2018 -and $nextValue -le 0x2030)
            if ($isHighBit -or $isTypographic) {
                $suspectCount++
            }
        }
    }

    foreach ($ch in $chars) {
        if ([int][char]$ch -eq 0xFFFD) {
            $replacementCount++
        }
    }

    if ($suspectCount -ge 5) {
        return $true
    }

    if ($length -lt 1000 -and $suspectCount -ge 2) {
        return $true
    }

    if ($replacementCount -ge 5) {
        return $true
    }

    if ($length -lt 1000 -and $replacementCount -ge 2) {
        return $true
    }

    return $false
}

function Remove-Diacritics {
    param (
        [string]$Value
    )

    if ([string]::IsNullOrEmpty($Value)) {
        return $Value
    }

    $normalized = $Value.Normalize([System.Text.NormalizationForm]::FormD)
    $sb = [System.Text.StringBuilder]::new()

    foreach ($ch in $normalized.ToCharArray()) {
        $category = [Globalization.CharUnicodeInfo]::GetUnicodeCategory($ch)
        if ($category -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
            [void]$sb.Append($ch)
        }
    }

    return $sb.ToString().Normalize([System.Text.NormalizationForm]::FormC)
}

function Sanitize-Name {
    param (
        [string]$Name
    )

    if ([string]::IsNullOrWhiteSpace($Name)) {
        return '_'
    }

    $withoutDiacritics = Remove-Diacritics $Name
    $safe = [regex]::Replace($withoutDiacritics, '[^A-Za-z0-9_.:-]', '_')

    if ([string]::IsNullOrEmpty($safe)) {
        $safe = '_'
    }

    if ($safe[0] -notmatch '[A-Za-z_:]') {
        $safe = '_' + $safe
    }

    return $safe
}

function Ensure-Directory {
    param (
        [string]$Path
    )

    if (![string]::IsNullOrWhiteSpace($Path) -and -not (Test-Path -LiteralPath $Path)) {
        Write-Verbose "Creating output directory: $Path"
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

Write-Verbose "Input parameter: '$InputPath'"
Write-Verbose "Output parameter: '$OutputPath'"

if (-not (Test-Path -LiteralPath $InputPath)) {
    throw "Input file '$InputPath' not found."
}

$inputFullPath = (Resolve-Path -LiteralPath $InputPath).ProviderPath
if ([IO.Path]::IsPathRooted($OutputPath)) {
    $outputFullPath = [IO.Path]::GetFullPath($OutputPath)
} else {
    $currentPath = (Get-Location).Path
    $outputFullPath = [IO.Path]::GetFullPath((Join-Path $currentPath $OutputPath))
}

Ensure-Directory -Path ([IO.Path]::GetDirectoryName($outputFullPath))

[byte[]]$bytes = [IO.File]::ReadAllBytes($inputFullPath)
$utf8Text = [System.Text.Encoding]::UTF8.GetString($bytes)

$shouldConvert = $ForceCP1252.IsPresent -or (Test-Mojibake -Text $utf8Text)

if ($shouldConvert) {
    Write-Verbose "Reinterpreting input as Windows-1252 to fix mojibake."
    $decoded = [System.Text.Encoding]::GetEncoding(1252).GetString($bytes)
} else {
    $decoded = $utf8Text
}

Write-Verbose "Removing XML 1.0 invalid control characters."
$sanitized = [regex]::Replace($decoded, '[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]', '')

Write-Verbose "Sanitizing element names."
$tagRegex = '<(?<slash>/?)(?<name>[^!?/\s><]+)'
$sanitized = [regex]::Replace(
    $sanitized,
    $tagRegex,
    {
        param($match)
        $slash = $match.Groups['slash'].Value
        $name = $match.Groups['name'].Value
        $clean = Sanitize-Name $name
        return "<$slash$clean"
    },
    [System.Text.RegularExpressions.RegexOptions]::CultureInvariant
)

Write-Verbose "Sanitizing attribute names."
$attributeRegex = '(?<prefix>\s+)(?<name>[^\s=/>]+)(?<middle>\s*)='
$sanitized = [regex]::Replace(
    $sanitized,
    $attributeRegex,
    {
        param($match)
        $prefix = $match.Groups['prefix'].Value
        $name = $match.Groups['name'].Value
        $middle = $match.Groups['middle'].Value
        $clean = Sanitize-Name $name
        return "$prefix$clean$middle="
    },
    [System.Text.RegularExpressions.RegexOptions]::CultureInvariant
)

Write-Verbose "Normalizing XML declaration to UTF-8."
$sanitized = $sanitized.TrimStart([char]0xFEFF)
if ($sanitized -match '^\s*<\?xml') {
    $sanitized = [regex]::Replace($sanitized, '^\s*<\?xml[^>]*\?>', '<?xml version="1.0" encoding="UTF-8"?>', 1)
} else {
    $sanitized = '<?xml version="1.0" encoding="UTF-8"?>' + [Environment]::NewLine + $sanitized.TrimStart()
}

$encoding = [System.Text.UTF8Encoding]::new($false)
[IO.File]::WriteAllText($outputFullPath, $sanitized, $encoding)

Write-Verbose "Wrote sanitized XML to $outputFullPath"
Write-Output "Clean XML written to '$outputFullPath'."


