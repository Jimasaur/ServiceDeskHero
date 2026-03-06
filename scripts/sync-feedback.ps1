$ErrorActionPreference = 'Stop'

$profile = 'default'
$region = 'us-east-1'
$table = 'servicedeskhero-feedback'
$repoRoot = Split-Path -Parent $PSScriptRoot
$outFile = Join-Path $repoRoot 'feedback-backlog.md'

$json = aws dynamodb scan --table-name $table --region $region --profile $profile --output json
if ($LASTEXITCODE -ne 0) { throw 'Failed to scan feedback table' }

$data = $json | ConvertFrom-Json
$items = @($data.Items)

$rows = @(
  foreach ($item in $items) {
    [pscustomobject]@{
      createdAt = $item.createdAt.S
      type      = $item.type.S
      status    = $item.status.S
      version   = if ($item.version.S) { $item.version.S } else { '' }
      page      = if ($item.page.S) { $item.page.S } else { '' }
      email     = if ($item.email.S) { $item.email.S } else { '' }
      message   = $item.message.S
      id        = $item.id.S
    }
  }
) | Sort-Object createdAt -Descending

$typeGroups = $rows | Group-Object type | Sort-Object Name
$statusGroups = $rows | Group-Object status | Sort-Object Name

$md = @()
$md += '# ServiceDeskHero Feedback Backlog'
$md += ''
$md += "Auto-generated from DynamoDB on $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')."
$md += ''
$md += '## Summary'
$md += "- Total items: $(@($rows).Count)"
if ($typeGroups) {
  $md += ('- By type: ' + (($typeGroups | ForEach-Object { "$($_.Name)=$($_.Count)" }) -join ', '))
}
if ($statusGroups) {
  $md += ('- By status: ' + (($statusGroups | ForEach-Object { "$($_.Name)=$($_.Count)" }) -join ', '))
}
$md += ''
$md += '## Latest Feedback'
$md += ''

if (-not $rows -or $rows.Count -eq 0) {
  $md += '- None yet'
} else {
  foreach ($row in $rows | Select-Object -First 50) {
    $msg = ($row.message -replace "`r?`n", ' ').Trim()
    $md += "### [$($row.type.ToUpper())] $($row.createdAt)"
    $md += "- Status: $($row.status)"
    if ($row.version) { $md += "- Version: $($row.version)" }
    if ($row.page) { $md += "- Page: $($row.page)" }
    if ($row.email) { $md += "- Contact: $($row.email)" }
    $md += "- ID: $($row.id)"
    $md += "- Message: $msg"
    $md += ''
  }
}

Set-Content -Path $outFile -Value ($md -join "`r`n") -Encoding UTF8
Write-Output "WROTE $outFile with $($rows.Count) feedback item(s)."
