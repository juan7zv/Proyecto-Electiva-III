$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$go = "go"
if (Test-Path "C:\Program Files\Go\bin\go.exe") {
  $go = "C:\Program Files\Go\bin\go.exe"
}

Push-Location $root

function Invoke-External {
  param(
    [string]$Command,
    [string[]]$CommandArgs
  )

  & $Command @CommandArgs
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

Push-Location "api-gateway"
Invoke-External "npm.cmd" @("test")
Pop-Location

Push-Location "SplitEasy-feature-auth-service/auth-service"
Invoke-External "npm.cmd" @("test")
Pop-Location

Push-Location "SplitEasy-feature-notification-service/notification-node-service"
Invoke-External "npm.cmd" @("test")
Pop-Location

function Invoke-GoTests {
  param(
    [string]$Path,
    [string[]]$GoArgs
  )

  Push-Location $Path
  $tmp = Join-Path (Get-Location) ".gotmp"
  New-Item -ItemType Directory -Force -Path $tmp | Out-Null
  $env:GOTMPDIR = $tmp

  try {
    & $go test -count=1 @GoArgs
    if ($LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }
  } finally {
    Remove-Item Env:\GOTMPDIR -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
    try {
      Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction Stop
    } catch {
      Write-Host "No se pudo limpiar $tmp inmediatamente; Windows lo liberara luego."
    }
    Pop-Location
  }
}

Invoke-GoTests "SplitEasy-feature-user-group-service/user-group-service" @("./...")
Invoke-GoTests "SplitEasy-feature-expensive-service/expense-service" @("./tests")

Push-Location "SplitEasy-feature-debt-calculator-service/debt-calculator-service"
Invoke-External "py" @("-3.11", "-m", "pytest", "tests", "-q")
Pop-Location

Push-Location "SplitEasy-feature-report-service/report-service"
Invoke-External "py" @("-3.11", "-m", "pytest", "tests", "-q")
Pop-Location

Push-Location "ai-agent-service"
Invoke-External "py" @("-3.11", "-m", "pytest", "tests", "-q")
Pop-Location

Push-Location "spliteasy-web"
Invoke-External "npm.cmd" @("run", "build")
Pop-Location

Pop-Location
