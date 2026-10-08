param([string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath $ProjectRoot).Path
$icon = Join-Path $root 'assets\brand\icon.ico'
if (-not (Test-Path -LiteralPath $icon -PathType Leaf)) { throw 'Falta assets/brand/icon.ico.' }
$entries = @(
    @{ Name='ABRIR V1.lnk'; Launcher='ABRIR_V1.cmd'; Description='DeadSingularity V1 - escritorio' },
    @{ Name='ABRIR V1 WEB.lnk'; Launcher='ABRIR_V1_WEB.cmd'; Description='DeadSingularity V1 - navegador' }
)
$shell = New-Object -ComObject WScript.Shell
try {
    # Revisar todos los destinos antes de crear nada. Nunca sobrescribir otro acceso.
    foreach ($entry in $entries) {
        $target = Join-Path $root $entry.Launcher
        $file = Join-Path $root $entry.Name
        if (-not (Test-Path -LiteralPath $target -PathType Leaf)) { throw "Falta $target" }
        if (Test-Path -LiteralPath $file) {
            $existing = $shell.CreateShortcut($file)
            if ($existing.TargetPath -ne $target -or $existing.IconLocation -ne "$icon,0" -or $existing.WorkingDirectory -ne $root) {
                throw "Acceso existente distinto: se conserva $file"
            }
        }
    }
    foreach ($entry in $entries) {
        $target = Join-Path $root $entry.Launcher
        $file = Join-Path $root $entry.Name
        $created = -not (Test-Path -LiteralPath $file)
        if ($created) {
            $shortcut = $shell.CreateShortcut($file)
            $shortcut.TargetPath = $target
            $shortcut.WorkingDirectory = $root
            $shortcut.IconLocation = "$icon,0"
            $shortcut.Description = $entry.Description
            $shortcut.WindowStyle = 7
            $shortcut.Save()
        }
        $verified = $shell.CreateShortcut($file)
        if ($verified.TargetPath -ne $target -or $verified.IconLocation -ne "$icon,0" -or $verified.WorkingDirectory -ne $root) { throw "Validacion fallida: $file" }
        [pscustomobject]@{Name=$entry.Name;Target=$verified.TargetPath;Icon=$verified.IconLocation;Created=$created;Verified=$true} | ConvertTo-Json -Compress
    }
} finally {
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($shell)
}

