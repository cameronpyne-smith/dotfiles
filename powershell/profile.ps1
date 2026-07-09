function cc { claude --dangerously-skip-permissions @args }

if (Get-Command starship -ErrorAction SilentlyContinue) {
    Invoke-Expression (&starship init powershell)
}
