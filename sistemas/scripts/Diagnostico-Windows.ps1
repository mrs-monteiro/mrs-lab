<#
.SYNOPSIS
  MRS LAB — Diagnóstico Windows local, apenas de consulta.
.DESCRIPTION
  Recolhe informações básicas sobre SO, volumes e serviços selecionados.
  Não altera serviços, firewall, registo, GPO nem configurações.
.PARAMETER Destino
  Caminho opcional para exportar um ficheiro JSON. Se omitido, não cria ficheiros.
.EXAMPLE
  .\Diagnostico-Windows.ps1
.EXAMPLE
  .\Diagnostico-Windows.ps1 -Destino C:\Temp\mrs-diagnostico.json
.NOTES
  Rever antes de executar; utilizar apenas com autorização.
#>
[CmdletBinding()]
param([string]$Destino)
$ErrorActionPreference = 'Stop'
try {
    $so = Get-CimInstance -ClassName Win32_OperatingSystem -ErrorAction Stop
    $discos = @(Get-Volume -ErrorAction Stop | Where-Object DriveLetter | ForEach-Object {
        [pscustomobject]@{
            Unidade = "$($_.DriveLetter):"
            SistemaFicheiros = $_.FileSystem
            TamanhoGB = [math]::Round($_.Size / 1GB, 2)
            LivreGB = [math]::Round($_.SizeRemaining / 1GB, 2)
        }
    })
    $servicos = @('EventLog','Spooler','W32Time') | ForEach-Object {
        $s = Get-Service -Name $_ -ErrorAction SilentlyContinue
        if($null -ne $s) {
            [pscustomobject]@{ Nome=$s.Name; Estado=$s.Status.ToString() }
        }
    }
    $relatorio = [pscustomobject]@{
        Aviso = 'Recolha local de consulta; rever informação antes de partilhar.'
        DataUTC = [DateTime]::UtcNow.ToString('o')
        Computador = $env:COMPUTERNAME
        SistemaOperativo = $so.Caption
        Versao = $so.Version
        MemoriaTotalGiB = [math]::Round($so.TotalVisibleMemorySize / 1MB, 2)
        MemoriaLivreGiB = [math]::Round($so.FreePhysicalMemory / 1MB, 2)
        Volumes = $discos
        Servicos = @($servicos)
    }
    $json = $relatorio | ConvertTo-Json -Depth 5
    if ($Destino) {
        $diretorio = Split-Path -Parent $Destino
        if (-not $diretorio -or -not (Test-Path -LiteralPath $diretorio -PathType Container)) {
            throw 'A pasta de destino tem de existir antes da exportação.'
        }
        $json | Set-Content -LiteralPath $Destino -Encoding UTF8
        Write-Host "Relatório exportado para: $Destino"
    } else {
        $json
    }
} catch {
    Write-Error "Falha na recolha local: $($_.Exception.Message)"
    exit 1
}
