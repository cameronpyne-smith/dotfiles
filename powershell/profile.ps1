function cc { claude --dangerously-skip-permissions @args }

if ($PSStyle) {
    $PSStyle.FileInfo.Directory = "`e[1;36m"
}

if (Get-Command starship -ErrorAction SilentlyContinue) {
    Invoke-Expression (&starship init powershell)
}
