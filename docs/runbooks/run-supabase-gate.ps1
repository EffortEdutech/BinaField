<#
 Applies the released migrations to the Supabase project and runs the six database test files.
 No Docker. Needs on PATH: psql + pg_dump (PostgreSQL 17 client tools) and Git for Windows (provides bash, sha256sum, sed, awk).
 Use the Supabase SESSION POOLER connection string (Dashboard > Connect > Session pooler, port 5432);
 the direct db.<ref>.supabase.co host is IPv6-only and often unreachable from home networks.
 The string is read as a hidden prompt and exported only to this process. The repo is copied to %TEMP% first,
 so verify.sh can never overwrite the sealed evidence files.
#>
$ErrorActionPreference = 'Continue'
$Repo  = (Resolve-Path "$PSScriptRoot\..\..").Path
$Stamp = Get-Date -Format 'yyyyMMddTHHmmss'
$Out   = Join-Path $Repo "gate-evidence\supabase\live-$Stamp"
$Work  = Join-Path $env:TEMP "bf-supabase-$Stamp"
New-Item -ItemType Directory -Force -Path $Out | Out-Null

foreach ($t in 'psql','pg_dump') { if (-not (Get-Command $t -ErrorAction SilentlyContinue)) { Write-Host "MISSING: $t is not on PATH. Install the PostgreSQL 17 command-line tools and reopen PowerShell."; return } }
$gitBash = @("$env:ProgramFiles\Git\bin\bash.exe","${env:ProgramFiles(x86)}\Git\bin\bash.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $gitBash) { Write-Host 'MISSING: Git for Windows bash.exe not found.'; return }

$secure = Read-Host 'Paste the Supabase session-pooler connection string' -AsSecureString
$bstr   = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$url    = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
if ($url -notmatch 'sslmode=') { $url += $(if ($url -match '\?') { '&sslmode=require' } else { '?sslmode=require' }) }

Copy-Item -Recurse -Force $Repo $Work -Exclude '.git','node_modules'
& psql --version | Set-Content (Join-Path $Out 'client-version.txt')

$env:DATABASE_URL = $url
$inner = @'
set -uo pipefail
cd "$BF_WORK"
rc=0
echo "== server =="; psql "$DATABASE_URL" -Atc "select version()"
echo "== migrate =="; bash scripts/db/migrate.sh || rc=$?
echo "migrate exit: $rc"
if [ "$rc" -eq 0 ]; then
  echo "== summary =="
  psql "$DATABASE_URL" -Atc "select count(*) as migrations from platform.schema_migrations"
  psql "$DATABASE_URL" -Atc "select count(*) filter (where c.relrowsecurity) as rls_enabled, count(*) filter (where c.relforcerowsecurity) as rls_forced, count(*) as tables from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p') and n.nspname in ('platform','iam','core','blueprint','ops','field','evidence','sync','processing','audit','intel')"
  echo "== verify =="; bash scripts/db/verify.sh; vrc=$?
  echo "verify exit: $vrc"; rc=$vrc
fi
echo "INNER EXIT: $rc"
exit $rc
'@
$env:BF_WORK = ($Work -replace '\\','/')
& $gitBash -c $inner 2>&1 | Tee-Object -FilePath (Join-Path $Out 'console.log')
$code = $LASTEXITCODE
Copy-Item -Force (Join-Path $Work 'artefacts\phase1\manifests\schema.sql'),(Join-Path $Work 'artefacts\phase1\manifests\schema.sha256') $Out -ErrorAction SilentlyContinue
$env:DATABASE_URL = $null
(Get-Content (Join-Path $Out 'console.log')) -replace [regex]::Escape($url), '<redacted>' | Set-Content (Join-Path $Out 'console.log')
"`nEXIT: $code   Evidence: $Out"
