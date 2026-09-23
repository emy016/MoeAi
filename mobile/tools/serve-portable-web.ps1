param(
  [ValidateRange(1024, 65535)]
  [int]$Port = 8080,
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$WebRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\web-build'))
$IndexFile = Join-Path $WebRoot 'index.html'
if (-not (Test-Path -LiteralPath $IndexFile -PathType Leaf)) {
  throw 'The web-build folder is missing. Run npm run build:web first.'
}

$MimeTypes = @{
  '.css' = 'text/css; charset=utf-8'
  '.html' = 'text/html; charset=utf-8'
  '.ico' = 'image/x-icon'
  '.jpeg' = 'image/jpeg'
  '.jpg' = 'image/jpeg'
  '.js' = 'text/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.map' = 'application/json; charset=utf-8'
  '.png' = 'image/png'
  '.svg' = 'image/svg+xml'
  '.ttf' = 'font/ttf'
  '.wasm' = 'application/wasm'
  '.webp' = 'image/webp'
  '.woff' = 'font/woff'
  '.woff2' = 'font/woff2'
}

$Listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
$Listener.Start()
$Url = "http://127.0.0.1:$Port"
Write-Host "MoeAI is ready: $Url"
Write-Host 'Press Ctrl+C to stop.'
if (-not $NoBrowser) { Start-Process $Url }

try {
  while ($true) {
    $Client = $Listener.AcceptTcpClient()
    try {
      $Stream = $Client.GetStream()
      $Reader = [System.IO.StreamReader]::new($Stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
      $RequestLine = $Reader.ReadLine()
      if ([string]::IsNullOrWhiteSpace($RequestLine)) { continue }
      while ($true) {
        $HeaderLine = $Reader.ReadLine()
        if ([string]::IsNullOrEmpty($HeaderLine)) { break }
      }

      $Parts = $RequestLine.Split(' ')
      $Method = $Parts[0]
      $Target = if ($Parts.Length -gt 1) { $Parts[1] } else { '/' }
      $PathOnly = $Target.Split('?')[0]
      $Decoded = [System.Uri]::UnescapeDataString($PathOnly).TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
      if ([string]::IsNullOrWhiteSpace($Decoded)) { $Decoded = 'index.html' }
      $Candidate = [System.IO.Path]::GetFullPath((Join-Path $WebRoot $Decoded))
      $WithinRoot = $Candidate.StartsWith($WebRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)

      $Status = '200 OK'
      if (-not $WithinRoot) {
        $Status = '403 Forbidden'
        $Body = [System.Text.Encoding]::UTF8.GetBytes('Forbidden')
        $ContentType = 'text/plain; charset=utf-8'
      } else {
        if (-not (Test-Path -LiteralPath $Candidate -PathType Leaf)) { $Candidate = $IndexFile }
        $Body = [System.IO.File]::ReadAllBytes($Candidate)
        $Extension = [System.IO.Path]::GetExtension($Candidate).ToLowerInvariant()
        $ContentType = if ($MimeTypes.ContainsKey($Extension)) { $MimeTypes[$Extension] } else { 'application/octet-stream' }
      }

      $CacheControl = if ($ContentType.StartsWith('text/html')) { 'no-cache' } else { 'public, max-age=31536000, immutable' }
      $Header = "HTTP/1.1 $Status`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nCache-Control: $CacheControl`r`nX-Content-Type-Options: nosniff`r`nConnection: close`r`n`r`n"
      $HeaderBytes = [System.Text.Encoding]::ASCII.GetBytes($Header)
      $Stream.Write($HeaderBytes, 0, $HeaderBytes.Length)
      if ($Method -ne 'HEAD') { $Stream.Write($Body, 0, $Body.Length) }
      $Stream.Flush()
    } catch {
      Write-Warning $_.Exception.Message
    } finally {
      $Client.Close()
    }
  }
} finally {
  $Listener.Stop()
}
