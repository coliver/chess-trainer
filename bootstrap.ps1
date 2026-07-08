$MAX = 15900

$short = "I have ADHD, keep answers short. Do one thing at a time. Windows 10. Dockerized. You will help me develop this project."
$urls = @(
  "https://github.com/coliver/chess-trainer/blob/main/AGENTS.MD",
  "https://github.com/coliver/chess-trainer/blob/main/backend/app/docs/ARCHITECTURE.md",
  "https://github.com/coliver/chess-trainer/blob/main/docker-compose.yml",
  "https://github.com/coliver/chess-trainer/blob/main/nginx/default.conf",
  "https://github.com/coliver/chess-trainer/blob/main/docker-compose.yml",
  "https://github.com/coliver/chess-trainer/blob/main/backend/app/app.py",
  "https://github.com/coliver/chess-trainer/blob/main/backend/app/routers/training.py",
  "https://github.com/coliver/chess-trainer/blob/main/backend/app/routers/auth.py",
  "https://github.com/coliver/chess-trainer/blob/main/backend/app/modules/training/service.py",
  "https://github.com/coliver/chess-trainer/blob/main/backend/app/modules/training/chess_rules.py",
  "https://github.com/coliver/chess-trainer/blob/main/backend/app/modules/training/models.py",
  "https://github.com/coliver/chess-trainer/blob/main/backend/app/modules/shared/db.py",
  "https://github.com/coliver/chess-trainer/blob/main/backend/app/migrations/",
  "https://github.com/coliver/chess-trainer/blob/main/Dockerfile",
  "https://github.com/coliver/chess-trainer/blob/main/nginx/default.conf",
  "https://github.com/coliver/chess-trainer/blob/main/frontend/src/main.tsx",
  "https://github.com/coliver/chess-trainer/blob/main/frontend/src/",
  "https://github.com/coliver/chess-trainer/blob/main/frontend/vite.config.*",
  "https://github.com/coliver/chess-trainer/blob/main/frontend/package.json",
  "https://github.com/coliver/chess-trainer/blob/main/frontend/tsconfig.*"
)

$out = New-Object System.Text.StringBuilder

[void]$out.AppendLine("")
[void]$out.AppendLine($short)
[void]$out.AppendLine("")

foreach ($u in $urls) {
  if ($out.Length -ge $MAX) { break }
  [void]$out.AppendLine($u)
}

[void]$out.AppendLine("")
[void]$out.AppendLine("dir structure:")
[void]$out.AppendLine("")

$treeText = (& .\clippyFiles.ps1 | Out-String)

# Cap so final never exceeds MAX
$remaining = $MAX - $out.Length
if ($remaining -gt 0) {
  if ($treeText.Length -gt $remaining) {
    $treeText = $treeText.Substring(0, $remaining)
  }
  [void]$out.Append($treeText)
}

$final = $out.ToString()
if ($final.Length -gt $MAX) {
  $final = $final.Substring(0, $MAX)
}

Write-Output $final
Set-Clipboard -Value $final
