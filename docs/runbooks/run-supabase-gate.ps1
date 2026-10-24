<#
 Applies the released migrations to a Supabase project and runs the six database test files.
 No Docker. Needs on PATH: psql + pg_dump (PostgreSQL client tools) and Git for Windows (bash, sha256sum, sed, awk).
 Use the Supabase SESSION POOLER connection string (Dashboard > Connect > Session pooler, port 5432).
 The string is read as a hidden prompt and exported only to this process. The repo is copied to %TEMP% first,
 so verify.sh can never overwrite the sealed evidence files. Shell scripts in the copy are normalised to LF.
 PASS is only reported when the log itself contains "INNER EXIT: 0"; the process exit code alone is not trusted.
#>
$ErrorActionPreference = 'Continue'
$Repo  = (Resolve-Path "$PSScriptRoot\..\..").Path
$Stamp = Get-Date -Format 'yyyyMMddTHHmmss'
$Start = Get-Date
$Out   = Join-Path $Repo "gate-evidence\supabase\live-$Stamp"
$Work  = Join-Path $env:TEMP "bf-supabase-$Stamp"
New-Item -ItemType Directory -Force -Path $Out | Out-Null
$Log   = Join-Path $Out 'console.log'

foreach ($t in 'psql','pg_dump') { if (-not (Get-Command $t -ErrorAction SilentlyContinue)) { Write-Host "MISSING: $t is not on PATH."; return } }
$gitBash = @("$env:ProgramFiles\Git\bin\bash.exe","${env:ProgramFiles(x86)}\Git\bin\bash.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $gitBash) { Write-Host 'MISSING: Git for Windows bash.exe not found.'; return }

$secure = Read-Host 'Paste the Supabase session-pooler connection string' -AsSecureString
$bstr   = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$url    = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
if ($url -notmatch 'sslmode=') { $url += $(if ($url -match '\?') { '&sslmode=require' } else { '?sslmode=require' }) }

# Show where we are about to connect (user and host only; the password is never printed).
if ($url -match '^postgres(?:ql)?://([^:/@]+):(.*)@([^@/?]+)([/?].*)?$') {
  $cUser = $Matches[1]; $cPass = $Matches[2]; $cHost = $Matches[3]
  Write-Host "Connecting as '$cUser' to '$cHost'" -ForegroundColor Cyan
  if ($cHost -match '^db\..*\.supabase\.co') { Write-Host 'NOTE: this is the DIRECT (IPv6) host. If it times out, use the Session pooler host (…pooler.supabase.com) with user postgres.<project-ref>.' -ForegroundColor Yellow }
  if ($cPass -match '\[|\]') { Write-Host 'WARNING: the password still contains [ or ]. Remove the brackets.' -ForegroundColor Yellow }
} else { Write-Host 'WARNING: could not parse the connection string; expected postgresql://user:password@host:port/db' -ForegroundColor Yellow; $cPass = '' }

Copy-Item -Recurse -Force $Repo $Work -Exclude '.git','node_modules'
# Normalise every shell script in the temp copy to LF (Git on Windows may have checked them out as CRLF).
Get-ChildItem $Work -Recurse -File | Where-Object { $_.Extension -in '.sh','.sql' } | ForEach-Object {
  $t = [IO.File]::ReadAllText($_.FullName) -replace "`r`n","`n"
  [IO.File]::WriteAllText($_.FullName, $t, (New-Object Text.UTF8Encoding($false)))
}
# Delete the sealed schema copies from the temp copy so only a file produced by THIS run can be reported.
foreach ($f in 'schema.sql','schema.sha256') { $p = Join-Path $Work "artefacts\phase1\manifests\$f"; if (Test-Path $p) { Remove-Item -Force $p } }
& psql --version | Set-Content (Join-Path $Out 'client-version.txt')

# Integrity gate: every database file in the temp copy must match the SEALED manifest hash, or we stop before touching any database.
$manifest = Get-Content (Join-Path $Work 'artefacts\phase1\manifests\batch06b-files.sha256.json') -Raw | ConvertFrom-Json
$entries = New-Object System.Collections.ArrayList
function Walk($o) { if ($null -eq $o) { return }; if ($o -is [System.Array]) { foreach ($i in $o) { Walk $i } } elseif ($o.PSObject -and $o.PSObject.Properties.Name -contains 'path' -and $o.PSObject.Properties.Name -contains 'sha256') { [void]$entries.Add($o) } elseif ($o.PSObject) { foreach ($p in $o.PSObject.Properties) { if ($p.Value -isnot [string] -and $p.Value -isnot [ValueType]) { Walk $p.Value } } } }
Walk $manifest
$checked = 0; $bad = @()
foreach ($e in $entries) {
  if ($e.path -match '^(packages/database/(migrations|tests)/.*\.sql|scripts/db/.*\.sh)$') {
    $f = Join-Path $Work ($e.path -replace '/','\')
    $h = (Get-FileHash -Algorithm SHA256 $f).Hash.ToLower(); $checked++
    if ($h -ne $e.sha256.ToLower()) { $bad += $e.path }
  }
}
"Sealed-manifest integrity: $checked database files checked, $($bad.Count) mismatched" | Tee-Object -FilePath (Join-Path $Out 'integrity-check.txt')
if ($checked -lt 20 -or $bad.Count -gt 0) { $bad | ForEach-Object { Write-Host "MISMATCH: $_" -ForegroundColor Red }; Write-Host 'STOPPED: database files differ from the sealed manifest (or the manifest could not be read). No database was touched.' -ForegroundColor Red; return }

$inner = @'
set -uo pipefail
exec 2>&1
cd "$BF_WORK"
rc=0
echo "== server =="; psql "$DATABASE_URL" -Atc "select version()" || rc=1
echo "== migrate =="
if [ "$rc" -eq 0 ]; then bash scripts/db/migrate.sh || rc=$?; fi
echo "migrate exit: $rc"
if [ "$rc" -eq 0 ]; then
  echo "== summary =="
  psql "$DATABASE_URL" -Atc "select count(*) as migrations from platform.schema_migrations"
  psql "$DATABASE_URL" -Atc "select count(*) filter (where c.relrowsecurity) as rls_enabled, count(*) filter (where c.relforcerowsecurity) as rls_forced, count(*) as tables from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p') and n.nspname in ('platform','iam','core','blueprint','ops','field','evidence','sync','processing','audit','intel')"
  echo "== environment prerequisite (Supabase: postgres is not superuser) =="
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "GRANT app_runtime, worker_runtime TO CURRENT_USER WITH SET TRUE, INHERIT FALSE" || rc=$?
  echo "== verify =="
  if [ "$rc" -eq 0 ]; then bash scripts/db/verify.sh; rc=$?; fi
  echo "verify exit: $rc"
fi
echo "INNER EXIT: $rc"
exit $rc
'@
$innerPath = Join-Path $Work 'bf-inner.sh'
[IO.File]::WriteAllText($innerPath, ($inner -replace "`r`n","`n"), (New-Object Text.UTF8Encoding($false)))

$env:DATABASE_URL = $url
$env:BF_WORK = ($Work -replace '\\','/')
& $gitBash ($innerPath -replace '\\','/') 2>&1 | Tee-Object -FilePath $Log
$code = $LASTEXITCODE
$env:DATABASE_URL = $null

foreach ($f in 'schema.sql','schema.sha256') {
  $p = Join-Path $Work "artefacts\phase1\manifests\$f"
  if ((Test-Path $p) -and ((Get-Item $p).LastWriteTime -gt $Start)) { Copy-Item -Force $p $Out }
}
$text = (Get-Content $Log -Raw)
if ($text) {
  $text = $text -replace [regex]::Escape($url), '<redacted>'
  if ($cPass) {
    $decoded = try { [uri]::UnescapeDataString($cPass) } catch { $cPass }
    foreach ($secret in @($cPass, $decoded) | Where-Object { $_ -and $_.Length -ge 4 } | Select-Object -Unique) { $text = $text -replace [regex]::Escape($secret), '<redacted>' }
    # also scrub any prefix of the password up to a bad percent-escape (psql echoes the offending token)
    $pre = ($cPass -split '%')[0]; if ($pre.Length -ge 4) { $text = $text -replace [regex]::Escape($pre), '<redacted>' }
  }
  $text | Set-Content $Log
}
$ok = ($code -eq 0) -and ($text -match 'INNER EXIT: 0') -and ($text -match 'verify exit: 0')
if ($ok) { Write-Host "`nRESULT: PASS (bash exit 0, log confirms migrate + verify)   Evidence: $Out" -ForegroundColor Green }
else     { Write-Host "`nRESULT: FAIL or INCOMPLETE (bash exit $code). Do not treat as a pass.   Evidence: $Out" -ForegroundColor Red }
