[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$ProjectRef = 'sgolmmhbufosmtigaakx'
$FunctionName = 'analytics-events'
$SecretsFile = Join-Path ([System.IO.Path]::GetTempPath()) "analytics-events-syncpay-$([guid]::NewGuid().ToString('N')).env"
$tokens = [ordered]@{}

$WebhookEvents = @(
    [pscustomobject]@{ EventType = 'transaction'; Label = 'Transacao criada e atualizada (PIX e cartao)' }
    [pscustomobject]@{ EventType = 'subscription-activated'; Label = 'Assinatura - ativada' }
    [pscustomobject]@{ EventType = 'subscription-overdue'; Label = 'Assinatura - em atraso' }
    [pscustomobject]@{ EventType = 'subscription-suspended'; Label = 'Assinatura - suspensa' }
)

function Read-SecretValue {
    param([Parameter(Mandatory)][string]$Prompt)
    $secure = Read-Host $Prompt -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
        $secure.Dispose()
    }
}

function Invoke-Supabase {
    param([Parameter(Mandatory)][string[]]$Arguments)
    & supabase @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Supabase CLI failed (code $LASTEXITCODE): supabase $($Arguments -join ' ')"
    }
}

try {
    Write-Host 'Cadastro dos tokens SyncPay no Supabase Analitics.'
    Write-Host 'Para cada evento criado, digite o token exibido pela SyncPay.'
    Write-Host 'A entrada fica oculta. Enter vazio ignora um evento ainda nao criado.'

    foreach ($webhook in $WebhookEvents) {
        $eventToken = Read-SecretValue "Token - $($webhook.Label)"
        if (-not [string]::IsNullOrWhiteSpace($eventToken)) {
            $tokens[$webhook.EventType] = $eventToken.Trim()
        }
        $eventToken = $null
    }

    if ($tokens.Count -eq 0) {
        throw 'Nenhum token informado. Nenhuma configuracao foi alterada.'
    }

    $tokenJson = ConvertTo-Json -InputObject $tokens -Compress -Depth 3
    $envLine = "SYNCPAY_WEBHOOK_TOKENS=$tokenJson"

    Write-Host 'Vinculando o CLI ao projeto Analitics...'
    Invoke-Supabase @('link', '--project-ref', $ProjectRef)

    [System.IO.File]::WriteAllText(
        $SecretsFile,
        $envLine,
        [System.Text.UTF8Encoding]::new($false)
    )
    Write-Host 'Salvando os tokens no Supabase sem exibi-los...'
    Invoke-Supabase @('secrets', 'set', '--project-ref', $ProjectRef, '--env-file', $SecretsFile)

    Write-Host 'Publicando somente a funcao analytics-events...'
    Invoke-Supabase @('functions', 'deploy', '--project-ref', $ProjectRef, $FunctionName)
    Write-Host ('Concluido. Tokens cadastrados: {0}.' -f $tokens.Count)
    Write-Host 'Endpoint: https://sgolmmhbufosmtigaakx.supabase.co/functions/v1/analytics-events'
}
finally {
    $eventToken = $null
    $tokenJson = $null
    $envLine = $null
    $tokens.Clear()
    if (Test-Path -LiteralPath $SecretsFile) {
        Remove-Item -LiteralPath $SecretsFile -Force
    }
}
