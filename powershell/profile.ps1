$dotfiles = $env:DOTFILES
if (-not $dotfiles) {
    $self = Get-Item -LiteralPath $PSCommandPath -ErrorAction SilentlyContinue
    if ($self) {
        $linked = if ($self.LinkType -eq 'SymbolicLink') { @($self.Target)[0] } else { $self.FullName }
        if ($linked) { $dotfiles = Split-Path (Split-Path $linked) }
    }
}

$commandsDir = if ($dotfiles) { Join-Path $dotfiles 'commands' } else { $null }
if ($commandsDir -and (Test-Path $commandsDir)) {
    $gitBash = Join-Path $env:ProgramFiles 'Git\bin\bash.exe'

    foreach ($f in Get-ChildItem -File -Path (Join-Path $commandsDir '*') -Include *.ts, *.sh) {
        if ($f.Name -like '*.test.*') { continue }
        $name = [IO.Path]::GetFileNameWithoutExtension($f.Name)
        $exec = if ($f.Extension -eq '.ts') { 'node' } else { $gitBash }
        Set-Item "function:global:$name" ([scriptblock]::Create("& `"$exec`" `"$($f.FullName)`" @args"))
    }

    $aliasFile = Join-Path $commandsDir 'aliases.conf'
    if (Test-Path $aliasFile) {
        foreach ($line in Get-Content $aliasFile) {
            if ($line -match '^\s*(#|$)') { continue }
            $parts = $line -split '=', 2
            if ($parts.Count -ne 2) { continue }
            Set-Item "function:global:$($parts[0].Trim())" ([scriptblock]::Create("$($parts[1].Trim()) @args"))
        }
    }
}

if ($PSStyle) {
    $PSStyle.FileInfo.Directory = "`e[1;36m"
}

if (Get-Command starship -ErrorAction SilentlyContinue) {
    Invoke-Expression (&starship init powershell)
}
