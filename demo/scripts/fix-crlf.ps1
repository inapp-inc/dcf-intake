# Convert demo deploy scripts to LF (run on Windows before packaging).
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Leaf
$demoRoot = if ($root -eq "demo") { Split-Path $PSScriptRoot -Parent } else { Join-Path (Split-Path $PSScriptRoot -Parent) "demo" }
if (-not (Test-Path $demoRoot)) { $demoRoot = Split-Path $PSScriptRoot -Parent }

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$fixed = 0
Get-ChildItem -Path $demoRoot -Recurse -File | Where-Object {
  $_.Extension -in '.sh', '.bash', '.cjs', '.env' -or
  $_.Name -in '.env', '.env.example' -or
  $_.Name -like '*.env.example'
} | ForEach-Object {
  $text = [System.IO.File]::ReadAllText($_.FullName)
  $normalized = $text -replace "`r`n", "`n" -replace "`r", "`n"
  if ($normalized -ne $text) {
    [System.IO.File]::WriteAllText($_.FullName, $normalized, $utf8NoBom)
    Write-Host "LF: $($_.FullName)"
    $fixed++
  }
}
Write-Host "Done. Fixed $fixed file(s). Re-run: ./scripts/package-pm2.sh"
