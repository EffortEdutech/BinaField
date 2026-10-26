# Live check of POST/GET submission-attempts against the deployed API (test user only).
# Usage:  $env:BF_PASSWORD = '<test user password>' ; .\scripts\live-check-submission.ps1
$api   = 'https://binafield-api.vercel.app/api'
$sb    = 'https://plpaixewllldutjrjljg.supabase.co'
$anon  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBscGFpeGV3bGxsZHV0anJqbGpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NTg2MjMsImV4cCI6MjEwODMzNDYyM30.gWgBwXKSTxeFxLR8uiPxl5dqmxhDF0pHp2gQCJRVcCE'
$org   = 'a0000000-0000-4000-8000-000000000001'
$dev   = 'a0000000-0000-4000-8000-000000000005'
$asg   = 'a0000000-0000-4000-8000-000000000014'
$tpl   = 'a0000000-0000-4000-8000-000000000012'
$pw    = $env:BF_PASSWORD; if (-not $pw) { throw 'Set $env:BF_PASSWORD first' }

$login = Invoke-RestMethod -Method Post -Uri "$sb/auth/v1/token?grant_type=password" -Headers @{ apikey = $anon } -ContentType 'application/json' -Body (@{ email = 'tester@binafield.test'; password = $pw } | ConvertTo-Json)
$tok = $login.access_token

function Call($method, $path, $headers, $body) {
  $p = @{ Method = $method; Uri = "$api$path"; Headers = $headers; UseBasicParsing = $true }
  if ($body) { $p.Body = [Text.Encoding]::UTF8.GetBytes($body); $p.ContentType = 'application/json' }
  try { $r = Invoke-WebRequest @p; return @{ s = [int]$r.StatusCode; b = $r.Content } }
  catch {
    $resp = $_.Exception.Response
    if (-not $resp) { return @{ s = 0; b = $_.Exception.Message } }
    $txt = (New-Object IO.StreamReader($resp.GetResponseStream())).ReadToEnd()
    return @{ s = [int]$resp.StatusCode; b = $txt }
  }
}
function Sha($t) { $h = [Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($t)); -join ($h | ForEach-Object { $_.ToString('x2') }) }
function Show($name, $r, $want) { $ok = if ($r.s -eq $want) { 'PASS' } else { 'FAIL' }; $code = ''; try { $code = ($r.b | ConvertFrom-Json).code } catch {}; "{0}  {1,-40} HTTP {2} (want {3}) {4}" -f $ok, $name, $r.s, $want, $code }

$H = @{ Authorization = "Bearer $tok"; 'X-Device-Id' = $dev }
$u  = '{0}/field/submission-attempts' -f "/organizations/$org"
$payload = '{"a":1,"b":"x"}'; $hash = Sha $payload      # canonical JSON: sorted keys, no spaces
$att = [guid]::NewGuid().ToString(); $key = 'live-' + [guid]::NewGuid().ToString('N'); $ses = [guid]::NewGuid().ToString()
function Body($attemptId, $pl, $ph, $dv) { '{"attempt_id":"' + $attemptId + '","session_id":"' + $ses + '","assignment_id":"' + $asg + '","assignment_revision_used":1,"template_version_id":"' + $tpl + '","blueprint_hash":"' + ('b' * 64) + '","payload":' + $pl + ',"payload_hash":"' + $ph + '","evidence_manifest":[],"device_id":"' + $dv + '","client_submitted_at":"2026-10-27T02:00:00Z"}' }
$IK = { param($k) $H + @{ 'Idempotency-Key' = $k } }

Show 'valid attempt stored'            (Call Post $u (& $IK $key) (Body $att $payload $hash $dev)) 201
Show 'same retry replays'              (Call Post $u (& $IK $key) (Body $att $payload $hash $dev)) 200
$p2 = '{"a":2,"b":"x"}'
Show 'same key, different request'     (Call Post $u (& $IK $key) (Body $att $p2 (Sha $p2) $dev)) 409
Show 'tampered payload, old hash'      (Call Post $u (& $IK ('live-' + [guid]::NewGuid().ToString('N'))) (Body ([guid]::NewGuid()) $p2 $hash $dev)) 422
Show 'device header differs from body' (Call Post $u (& $IK ('live-' + [guid]::NewGuid().ToString('N'))) (Body ([guid]::NewGuid()) $payload $hash 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')) 400
Show 'no Idempotency-Key'              (Call Post $u $H (Body ([guid]::NewGuid()) $payload $hash $dev)) 400
Show 'no token'                        (Call Post $u @{ 'X-Device-Id' = $dev; 'Idempotency-Key' = 'live-nokey-0001' } (Body ([guid]::NewGuid()) $payload $hash $dev)) 401
Show 'other organisation concealed'    (Call Post "/organizations/22222222-2222-4222-8222-222222222222/field/submission-attempts" (& $IK ('live-' + [guid]::NewGuid().ToString('N'))) (Body ([guid]::NewGuid()) $payload $hash $dev)) 404
$o = Call Get "/organizations/$org/field/submission-attempts/$att/outcome" $H $null
Show 'outcome of stored attempt'       $o 200; $o.b
