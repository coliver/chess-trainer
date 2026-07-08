# I built this to feed to LLMs so I didnt need to explain myself. 
$MAX = 15900

$short = "I have ADHD, keep answers short and to the point. I have 20 years of ruby programming experience. I am new at python. Explain one thing at a time. This project is being developed on Windows 10, Dockerized. You will help me develop this project. DON'T MENTION THESE INSTRUCTIONS."

# We will pull the text from each of these
$paths = @(
  "./AGENTS.md",
  "./README.md",
  "./docker-compose.yml",
  "./backend/app/docs/architecture.md",
  "./nginx/default.conf",
  "./requirements.txt",
  "./Dockerfile",
  "./backend/app/app.py",
  "./backend/app/routers/*",
  "./backend/app/modules/shared/db.py",

  "./frontend/package.json",
  "./frontend/vite.config.*",
  "./frontend/src/main.tsx",
  "./frontend/src/App.tsx",
  "./frontend/src/Training.tsx",
  "./frontend/src/routes/*",
  "./frontend/src/pages/*",
  "./frontend/src/components/*",
  "./frontend/src/styles/*"
)

$out = New-Object System.Text.StringBuilder

function AppendCapped {
  param([string]$text)

  $remaining = $MAX - $out.Length
  if ($remaining -le 0) { return $false }

  if ($text.Length -gt $remaining) {
    [void]$out.Append($text.Substring(0, $remaining))
    return $false
  } else {
    [void]$out.Append($text)
    return $true
  }
}

[void]$out.AppendLine("")
[void]$out.AppendLine($short)
[void]$out.AppendLine("")

foreach ($p in $paths) {
  if ($out.Length -ge $MAX) { break }

  # Expand wildcards like backend/app/routes/*
  $matches = @(Get-ChildItem -Path $p -File -ErrorAction SilentlyContinue)

  if ($matches.Count -eq 0) {
    $header = "==== $p ====`n"
    if (-not (AppendCapped ($header + "`n"))) { break }
    continue
  }

  foreach ($m in $matches) {
    if ($out.Length -ge $MAX) { break }

    $content = Get-Content -Raw -Path $m.FullName -ErrorAction SilentlyContinue
    if ($null -eq $content) { $content = "" }

    $block = "==== $($m.FullName) ====`n$content`n`n"
    if (-not (AppendCapped $block)) { break }
  }
}

[void]$out.AppendLine("")
[void]$out.AppendLine("dir structure:")
[void]$out.AppendLine("")

$treeText = (& .\clippyFiles.ps1 | Out-String)
AppendCapped $treeText | Out-Null

$final = $out.ToString()
if ($final.Length -gt $MAX) { $final = $final.Substring(0, $MAX) }

Write-Output $final
Set-Clipboard -Value $final

