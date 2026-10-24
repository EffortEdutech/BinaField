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

Copy-Item -Recurse -Force $Repo $Work -Exclude '.git','node_modules'
# Normalise every shell script in the temp copy to LF (Git on Windows may have checked them out as CRLF).
Get-ChildItem $Work -Recurse -Filter *.sh | ForEach-Object {
  $t = [IO.File]::ReadAllText($_.FullName) -replace "`r`n","`n"
  [IO.File]::WriteAllText($_.FullName, $t, (New-Object Text.UTF8Encoding($false)))
}
# Delete the sealed schema copies from the temp copy so only a file produced by THIS run can be reported.
foreach ($f in 'schema.sql','schema.sha256') { $p = Join-Path $Work "artefacts\phase1\manifests\$f"; if (Test-Path $p) { Remove-Item -Force $p } }
& psql --version | Set-Content (Join-Path $Out 'client-version.txt')

$inner = @'
set -uo pipefail
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
  echo "== verify =="; bash scripts/db/verify.sh; rc=$?
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
if ($text) { ($text -replace [regex]::Escape($url), '<redacted>') | Set-Content $Log }
$ok = ($code -eq 0) -and ($text -match 'INNER EXIT: 0') -and ($text -match 'verify exit: 0')
if ($ok) { Write-Host "`nRESULT: PASS (bash exit 0, log confirms migrate + verify)   Evidence: $Out" -ForegroundColor Green }
else     { Write-Host "`nRESULT: FAIL or INCOMPLETE (bash exit $code). Do not treat as a pass.   Evidence: $Out" -ForegroundColor Red }
