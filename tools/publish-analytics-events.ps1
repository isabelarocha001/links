[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$ProjectRef = 'sgolmmhbufosmtigaakx'
$FunctionName = 'analytics-events'
$MigrationVersion = '20261022125006'
$MigrationPath = Join-Path $PSScriptRoot "..\supabase\migrations\${MigrationVersion}_analytics_webhook_events.sql"
$SecretsFile = Join-Path ([System.IO.Path]::GetTempPath()) "analytics-events-$([guid]::NewGuid().ToString('N')).env"

function Invoke-Supabase {
    param([Parameter(Mandatory)][string[]]$Arguments)
    & supabase @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Supabase CLI falhou (código $LASTEXITCODE): supabase $($Arguments -join ' ')"
    }
}

try {
    if (-not (Test-Path -LiteralPath $MigrationPath)) {
        throw "Migration não encontrada: $MigrationPath"
    }

    Write-Host 'Vinculando o CLI ao projeto Analitics...'
    Invoke-Supabase @('link', '--project-ref', $ProjectRef)

    Write-Host 'Aplicando somente a migration da caixa de eventos...'
    Invoke-Supabase @('db', 'query', '--linked', '--file', $MigrationPath)

    Write-Host 'Registrando a migration aplicada...'
    Invoke-Supabase @('migration', 'repair', '--linked', '--status', 'applied', $MigrationVersion)

    $randomBytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($randomBytes) } finally { $rng.Dispose() }
    $webhookSecret = ([BitConverter]::ToString($randomBytes) -replace '-', '').ToLowerInvariant()
    $secretLine = "ANALYTICS_EVENTS_WEBHOOK_SECRET=$webhookSecret"
    [System.IO.File]::WriteAllText($SecretsFile, $secretLine, [System.Text.UTF8Encoding]::new($false))

    Write-Host 'Salvando o segredo de autenticação no Supabase...'
    Invoke-Supabase @('secrets', 'set', '--project-ref', $ProjectRef, '--env-file', $SecretsFile)

    Write-Host 'Publicando somente a função analytics-events...'
    Invoke-Supabase @('functions', 'deploy', '--project-ref', $ProjectRef, $FunctionName)

    Write-Host ''
    Write-Host 'PUBLICADO'
    Write-Host "Endpoint: https://$ProjectRef.supabase.co/functions/v1/$FunctionName"
    Write-Host "Segredo do header x-webhook-secret: $webhookSecret"
    Write-Host 'Guarde esse segredo e configure-o no agente que enviará os eventos.'
}
finally {
    if (Test-Path -LiteralPath $SecretsFile) {
        Remove-Item -LiteralPath $SecretsFile -Force
    }
}
