if command -v claude.exe >/dev/null 2>&1 && ! command -v claude >/dev/null 2>&1; then
    alias claude='claude.exe'
fi

if command -v dotnet.exe >/dev/null 2>&1 && ! command -v dotnet >/dev/null 2>&1; then
    alias dotnet='dotnet.exe'
fi

if command -v powershell.exe >/dev/null 2>&1; then
    bastion() { powershell.exe -Command "bastion $*"; }
fi

alias cc='claude --dangerously-skip-permissions'
