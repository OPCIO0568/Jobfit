param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("frontend", "backend")]
    [string]$Target
)

$Root = Split-Path -Parent $PSScriptRoot
$EnvPath = Join-Path $Root ".env"

# .env에 적은 포트/API 주소를 현재 터미널 프로세스에 올림
if (Test-Path $EnvPath) {
    Get-Content $EnvPath | ForEach-Object {
        $Line = $_.Trim()
        if (-not $Line -or $Line.StartsWith("#") -or -not $Line.Contains("=")) {
            return
        }

        $Name, $Value = $Line -split "=", 2
        [Environment]::SetEnvironmentVariable($Name.Trim(), $Value.Trim(), "Process")
    }
}

if (-not $env:FRONTEND_PORT) { $env:FRONTEND_PORT = "3001" }
if (-not $env:BACKEND_HOST) { $env:BACKEND_HOST = "127.0.0.1" }
if (-not $env:BACKEND_PORT) { $env:BACKEND_PORT = "8001" }

if ($Target -eq "backend") {
    Push-Location (Join-Path $Root "backend")
    python -m uvicorn main:app --reload --host $env:BACKEND_HOST --port $env:BACKEND_PORT
    Pop-Location
    exit
}

Push-Location $Root
npm run dev -- -p $env:FRONTEND_PORT
Pop-Location
