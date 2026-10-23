<#
 Applies the released migrations to the Supabase project and runs the six database test files.
 Needs Docker only (psql/pg_dump come from the postgres:17 image). Nothing is written to the repo copy.
 Use the Supabase SESSION POOLER connection string (Dashboard > Connect > Session pooler, port 5432);
 the direct db.<ref>.supabase.co host is IPv6-only and often unreachable from home networks.
 The string is read as a secure prompt and passed to the container as an environment variable only.
#>
$ErrorActionPreference = 'Continue'
$Repo   = (Resolve-Path "$PSScriptRoot\..\..").Path
$Stamp  = Get-Date -Format 'yyyyMMddTHHmmss'
$Out    = Join-Path $Repo "gate-evidence\supabase\live-$Stamp"
New-Item -ItemType Directory -Force -Path $Out | Out-Null

$secure = Read-Host 'Paste the Supabase session-pooler connection string' -AsSecureString
$bstr   = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$url    = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
if ($url -notmatch 'sslmode=') { $url += $(if ($url -match '\?') { '&sslmode=require' } else { '?sslmode=require' }) }

docker pull postgres:17 | Out-Null
docker image inspect postgres:17 --format '{{json .RepoDigests}}' | Set-Content (Join-Path $Out 'image-digest.txt')

$env:BF_DATABASE_URL = $url
docker run --rm -e DATABASE_URL=$env:BF_DATABASE_URL `
  -v "${Repo}:/src:ro" -v "${Out}:/out" -v "${PSScriptRoot}:/runbook:ro" `
  postgres:17 bash /runbook/supabase-inner.sh 2>&1 | Tee-Object -FilePath (Join-Path $Out 'console.log')
$code = $LASTEXITCODE
$env:BF_DATABASE_URL = $null
# Scrub the connection string from the log in case a tool echoed it.
(Get-Content (Join-Path $Out 'console.log')) -replace [regex]::Escape($url), '<redacted>' | Set-Content (Join-Path $Out 'console.log')
"`nDOCKER EXIT: $code   Evidence: $Out"
