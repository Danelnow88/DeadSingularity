# Limpieza acotada y verificable de esta entrega. Sin -Execute sólo inventaría.
param([switch]$Execute)
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$releaseRoot = (Resolve-Path -LiteralPath (Join-Path $projectRoot 'releases')).Path
$keepNames = @('NEON-VOID-0.10.0-alpha-windows-mh6vEs','NEON-VOID-0.10.0-alpha-web-38UTJD','NEON-VOID-0.10.0-alpha-windows-7a9PJk','NEON-VOID-0.10.0-alpha-web-vhwktw')
foreach ($name in $keepNames) { if (!(Test-Path -LiteralPath (Join-Path $releaseRoot $name))) { throw ('Falta entrega protegida: ' + $name) } }
$targets = @(Get-ChildItem -LiteralPath $releaseRoot -Directory | Where-Object { $_.Name -notin $keepNames })
$inventory = @()
foreach ($target in $targets) {
  $resolvedTarget = (Resolve-Path -LiteralPath $target.FullName).Path
  if ((Split-Path -Parent $resolvedTarget) -ne $releaseRoot -or $target.Name -notmatch '^NEON-VOID-0\.10\.0-alpha-(windows|web)-[A-Za-z0-9]{6}$') { throw ('Ruta no segura: ' + $resolvedTarget) }
  if ($target.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'No se limpia un enlace' }
  $allItems = @(Get-ChildItem -LiteralPath $resolvedTarget -Recurse -Force)
  if (@($allItems | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }).Count) { throw 'Enlace dentro de build' }
  $files = @($allItems | Where-Object { !$_.PSIsContainer })
  $manifestPath = Join-Path $resolvedTarget 'manifest.json'
  if (Test-Path -LiteralPath $manifestPath) {
    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    if ($manifest.version -ne '0.10.0-alpha' -or $manifest.platform -notin @('web','win32-x64')) { throw 'Manifest inesperado' }
    $expected = @('manifest.json') + @($manifest.files | ForEach-Object { $_.path })
    foreach ($file in $files) {
      $relative = $file.FullName.Substring($resolvedTarget.Length + 1).Replace('\','/')
      if ($relative -notin $expected) { throw ('Archivo extra: ' + $file.FullName) }
    }
    if ($files.Count -ne $expected.Count) { throw 'Cantidad de archivos no coincide con manifest' }
  } elseif ($target.Name -eq 'NEON-VOID-0.10.0-alpha-windows-OJszpY') {
    # Build antigua incompleta: sólo quedan seis archivos binarios de Electron.
    # Antes de quitarla, verificar contra el runtime instalado; no contiene juego.
    $partialNames = @('d3dcompiler_47.dll','dxcompiler.dll','dxil.dll','ffmpeg.dll','NEON VOID.exe','vk_swiftshader.dll')
    if ($allItems.Count -ne 6 -or $files.Count -ne 6) { throw 'Contenido inesperado en build incompleta' }
    foreach ($file in $files) {
      if ($file.Name -notin $partialNames) { throw 'Archivo desconocido en build incompleta' }
      $runtimeName = if ($file.Name -eq 'NEON VOID.exe') { 'electron.exe' } else { $file.Name }
      $runtimePath = Join-Path $projectRoot ('node_modules/electron/dist/' + $runtimeName)
      if ((Get-FileHash -LiteralPath $file.FullName).Hash -ne (Get-FileHash -LiteralPath $runtimePath).Hash) { throw ('Binario distinto: ' + $file.Name) }
    }
  } else { throw ('Falta manifest: ' + $target.Name) }
  $inventory += [PSCustomObject]@{path=$resolvedTarget;bytes=($files | Measure-Object Length -Sum).Sum;files=$files.Count}
}
# Primero validar TODOS los objetivos; recién después borrar hijos explícitos.
if ($Execute) { foreach ($item in $inventory) { Remove-Item -LiteralPath $item.path -Recurse -Force } }
[PSCustomObject]@{executed=[bool]$Execute;keep=$keepNames;targets=$inventory;bytesToRemove=($inventory | Measure-Object bytes -Sum).Sum} | ConvertTo-Json -Depth 5
