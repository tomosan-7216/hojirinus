# Builds hojirinus.bundle.js -- a single classic script for file:// use.
#
# Why this exists:
#   Chrome refuses to load <script type="module"> from file:// (origin 'null')
#   because module scripts are fetched with CORS. Classic scripts are not, so a
#   bundled classic script loads fine when index.html is double-clicked.
#   index.html keeps the real ES modules and falls back to this bundle on error,
#   so GitHub Pages runs the actual source in src/ and nothing here is load-bearing there.
#
# Run:  powershell -ExecutionPolicy Bypass -File build.ps1
#
# NOTE: this file MUST keep its UTF-8 BOM. Windows PowerShell 5.1 reads .ps1 as ANSI
# without one, which mangles the Japanese string literals below into a parse error.
# All file I/O is forced to UTF-8 (no BOM) explicitly.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$utf8 = New-Object System.Text.UTF8Encoding($false)

# Dependency order. Basenames are unique across the tree, so they double as module keys.
$order = @(
  'src/config.js'
  'src/core/util.js'
  'src/data/boogers.js'
  'src/core/shape.js'
  'src/core/audio.js'
  'src/core/juice.js'
  'src/core/input.js'
  'src/state.js'
  'src/scenes/pick.js'
  'src/scenes/fly.js'
  'src/scenes/shop.js'
  'src/scenes/collection.js'
  'src/scenes/result.js'
  'src/main.js'
)

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("// ホジリヌス - file:// 用の結合版。build.ps1 が生成する。直接編集しない。")
[void]$sb.AppendLine("// 中身は src/ の各モジュールをそのまま順に並べ、import/export だけを差し替えたもの。")
[void]$sb.AppendLine("(function () {")
[void]$sb.AppendLine("  var __M = {};")
[void]$sb.AppendLine("  function __req(k) { return __M[k]; }")
[void]$sb.AppendLine("  function __def(k, f) { __M[k] = f(); }")

# Guard: every src/*.js must be listed in $order, or its edits silently never ship
# to the file:// bundle. (Regex catches the drift the moment a new file is added.)
$orderKeys = $order | ForEach-Object { [System.IO.Path]::GetFileNameWithoutExtension($_) }
Get-ChildItem -Path (Join-Path $root 'src') -Recurse -Filter *.js | ForEach-Object {
  $k = [System.IO.Path]::GetFileNameWithoutExtension($_.Name)
  if ($orderKeys -notcontains $k) { throw "src file not in `$order: $($_.FullName)" }
}

$defined = @()   # module keys emitted so far; deps must already be in here (eager eval)

foreach ($rel in $order) {
  $path = Join-Path $root ($rel -replace '/', '\')
  if (-not (Test-Path -LiteralPath $path)) { throw "missing module: $rel" }
  $src = [System.IO.File]::ReadAllText($path, $utf8)
  $key = [System.IO.Path]::GetFileNameWithoutExtension($rel)

  # import { a, b } from '../core/x.js';  ->  var { a, b } = __req('x');
  $deps = @()
  $src = [regex]::Replace($src, "(?s)import\s*\{([^}]*)\}\s*from\s*['""]([^'""]+)['""]\s*;?", {
    param($m)
    $names = $m.Groups[1].Value -replace '\s+', ' '
    $dep = [System.IO.Path]::GetFileNameWithoutExtension($m.Groups[2].Value)
    $script:deps += $dep
    "var {$names} = __req('$dep');"
  })

  # Bundle runs each factory eagerly in list order, so every dependency must be
  # defined before this module. If not, __req returns undefined at load time.
  # (ES modules tolerate this via live bindings + hoisting; a flat concat does not.)
  foreach ($d in ($deps | Sort-Object -Unique)) {
    if ($defined -notcontains $d) { throw "$rel imports '$d' before it is defined -- fix `$order" }
  }

  # Collect exported names, then drop the keyword.
  $names = @()
  foreach ($m in [regex]::Matches($src, "(?m)^export\s+(?:const|let|var|function|class)\s+(\w+)")) {
    $names += $m.Groups[1].Value
  }
  if ($names.Count -eq 0) { throw "no exports found in $rel (regex drift?)" }
  $src = [regex]::Replace($src, "(?m)^export\s+", "")

  $ret = ($names | Sort-Object -Unique) -join ', '
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine("  // ---------- $rel ----------")
  [void]$sb.AppendLine("  __def('$key', function () {")
  foreach ($line in $src -split "`r?`n") { [void]$sb.AppendLine("    $line") }
  [void]$sb.AppendLine("    return { $ret };")
  [void]$sb.AppendLine("  });")
  $defined += $key
  Write-Host ("  {0,-26} exports: {1}" -f $rel, $names.Count)
}

[void]$sb.AppendLine("})();")

$out = Join-Path $root 'hojirinus.bundle.js'
[System.IO.File]::WriteAllText($out, $sb.ToString(), $utf8)
Write-Host ""
Write-Host ("built {0} ({1:N0} bytes)" -f $out, (Get-Item $out).Length)
