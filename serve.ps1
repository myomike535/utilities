# MyoMT Utilities — Local Static Server (pure PowerShell, no dependencies)
# Serves the current folder over HTTP so file:// limitations disappear:
#   - Service Worker registration works
#   - PWA install prompt appears
#   - Mobile devices on same WiFi can reach it
#
# Usage:
#   Right-click serve.ps1 → "Run with PowerShell"
#   Or: powershell -ExecutionPolicy Bypass -File serve.ps1
#   Or: double-click serve.bat (calls this script)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

# Find a free port starting from 8000
function Find-FreePort([int]$start = 8000, [int]$max = 8100) {
    for ($p = $start; $p -le $max; $p++) {
        $inUse = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
        if (-not $inUse) { return $p }
    }
    throw "No free port in range $start-$max"
}

$port = Find-FreePort 8000 8100

# Get LAN IP so mobile devices on same WiFi can connect
function Get-LanIP {
    try {
        (Get-NetIPAddress -AddressFamily IPv4 -PrefixOrigin Dhcp -ErrorAction SilentlyContinue |
         Where-Object { $_.IPAddress -notlike '169.254.*' } |
         Select-Object -First 1).IPAddress
    } catch { $null }
}
$lanIP = Get-LanIP

$listener = [System.Net.HttpListener]::new()
# Only listen on localhost by default (safer). To expose to LAN, use "+" instead of "localhost".
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Prefixes.Add("http://127.0.0.1:$port/")
if ($lanIP) {
    try { $listener.Prefixes.Add("http://${lanIP}:$port/") } catch {}
}

try { $listener.Start() }
catch {
    Write-Host "" -ForegroundColor Red
    Write-Host "⚠  Failed to start listener on port $port" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "If you got 'access denied', try running PowerShell as Administrator once, then:" -ForegroundColor Yellow
    Write-Host "  netsh http add urlacl url=http://+:$port/ user=$env:USERDOMAIN\$env:USERNAME" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Press Enter to close"
    exit 1
}

$mime = @{
    '.html' = 'text/html; charset=utf-8'
    '.htm'  = 'text/html; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.svg'  = 'image/svg+xml'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.gif'  = 'image/gif'
    '.ico'  = 'image/x-icon'
    '.webp' = 'image/webp'
    '.wav'  = 'audio/wav'
    '.mp3'  = 'audio/mpeg'
    '.mp4'  = 'video/mp4'
    '.woff' = 'font/woff'
    '.woff2'= 'font/woff2'
    '.txt'  = 'text/plain; charset=utf-8'
    '.md'   = 'text/markdown; charset=utf-8'
}

Clear-Host
Write-Host ""
Write-Host "  🚀 MyoMT Utilities — Local Server" -ForegroundColor Magenta
Write-Host "  " + ("─" * 44) -ForegroundColor DarkGray
Write-Host ""
Write-Host "  On this PC:      " -NoNewline; Write-Host "http://localhost:$port" -ForegroundColor Cyan
if ($lanIP) {
    Write-Host "  On phone/tablet: " -NoNewline; Write-Host "http://${lanIP}:$port" -ForegroundColor Cyan
    Write-Host "                   (same WiFi as this PC)" -ForegroundColor DarkGray
}
Write-Host ""
Write-Host "  Serving folder:  " -NoNewline; Write-Host $root -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Press " -NoNewline; Write-Host "Ctrl+C" -ForegroundColor Yellow -NoNewline; Write-Host " to stop the server"
Write-Host ""

# Auto-open the browser to the dashboard
Start-Process "http://localhost:$port/index.html" -ErrorAction SilentlyContinue

# Request loop
while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # Resolve URL path -> local file
        $urlPath = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath)
        if ($urlPath -eq '/' -or $urlPath -eq '') { $urlPath = '/index.html' }
        $filePath = Join-Path $root ($urlPath.TrimStart('/'))
        # Prevent path traversal
        $fullRoot = (Resolve-Path $root).Path.TrimEnd('\')
        try { $resolved = (Resolve-Path $filePath -ErrorAction Stop).Path }
        catch { $resolved = $filePath }

        $ts = (Get-Date).ToString("HH:mm:ss")

        if (-not $resolved.StartsWith($fullRoot, [StringComparison]::OrdinalIgnoreCase)) {
            $response.StatusCode = 403
            Write-Host "  $ts  403  $urlPath" -ForegroundColor Red
        }
        elseif (Test-Path $resolved -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($resolved).ToLowerInvariant()
            $ct = $mime[$ext]
            if (-not $ct) { $ct = 'application/octet-stream' }
            $response.ContentType = $ct
            # No-cache for HTML/JS so edits are seen instantly
            if ($ext -in '.html','.js','.css','.json') {
                $response.Headers['Cache-Control'] = 'no-store'
            }
            $bytes = [System.IO.File]::ReadAllBytes($resolved)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            Write-Host "  $ts  200  $urlPath" -ForegroundColor DarkGray
        }
        else {
            $response.StatusCode = 404
            $body = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $urlPath")
            $response.OutputStream.Write($body, 0, $body.Length)
            Write-Host "  $ts  404  $urlPath" -ForegroundColor Yellow
        }
        $response.OutputStream.Close()
    }
    catch [System.Net.HttpListenerException] {
        if ($_.Exception.ErrorCode -eq 995) { break }   # cancelled
        Write-Host "  Listener error: $($_.Exception.Message)" -ForegroundColor Red
    }
    catch {
        Write-Host "  Handler error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

$listener.Stop()
$listener.Close()
Write-Host ""
Write-Host "  Server stopped." -ForegroundColor DarkGray
