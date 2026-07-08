$root = Get-Location
$targets = @(
  "docker-compose.yml",
  # "backend/app/app.py",
  # "backend/app/routers/training.py",
  # "backend/app/routers/auth.py",
  # "backend/app/modules/training/service.py",
  # "backend/app/modules/training/chess_rules.py",
  # "backend/app/modules/training/models.py",
  # "backend/app/modules/shared/db.py",
  # "backend/app/migrations/",
  "Dockerfile",
  "nginx/default.conf",
  "frontend/src/main.tsx",
  "frontend/src/App.tsx",
  "frontend/src (API calls + training UI components)",
  "frontend/vite.config.*",
  "frontend/package.json",
  "frontend/tsconfig.*",
  "frontend/src/Training.tsx")

$existing = $targets | Where-Object { Test-Path (Join-Path $root $_) }

$textExt = @(".json",".yml",".yaml",".conf",".py",".js",".ts",".tsx",".jsx",".html",".css",".scss",".md",".txt",".ini",".svg",".map",".mjs",".cjs")
$existing = $existing | Where-Object { $textExt -contains ([IO.Path]::GetExtension((Join-Path $root $_)).ToLower()) }

$limit = 15000
$out = New-Object System.Text.StringBuilder

foreach ($rel in ($existing | Sort-Object)) {
  if ($out.Length -ge $limit) { break }

  $path = Join-Path $root $rel
  $null = $out.AppendLine("===== FILE: $rel =====")

  $content = Get-Content -Path $path -Raw -ErrorAction SilentlyContinue
  if ([string]::IsNullOrEmpty($content)) { $content = "" }

  $remaining = $limit - $out.Length
  if ($content.Length -gt $remaining) {
    $null = $out.Append($content.Substring(0, [Math]::Max(0, $remaining)))
    break
  } else {
    $null = $out.AppendLine($content)
  }

  $null = $out.AppendLine("===== END FILE =====`r`n")
}

$text = $out.ToString()

# Set-Clipboard -Value $out.ToString()
# "Copied up to $limit chars to clipboard."

$text
