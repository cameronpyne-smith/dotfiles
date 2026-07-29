if command -v claude.exe >/dev/null 2>&1 && ! command -v claude >/dev/null 2>&1; then
    alias claude='claude.exe'
fi

if command -v dotnet.exe >/dev/null 2>&1 && ! command -v dotnet >/dev/null 2>&1; then
    alias dotnet='dotnet.exe'
fi

if command -v go.exe >/dev/null 2>&1 && ! command -v go >/dev/null 2>&1; then
    alias go='go.exe'
fi


# nvim config lives in %LOCALAPPDATA%\nvim on the Windows side
if command -v nvim.exe >/dev/null 2>&1 && ! command -v nvim >/dev/null 2>&1; then
    alias nvim='nvim.exe'
fi

if command -v powershell.exe >/dev/null 2>&1; then
    bastion() { powershell.exe -Command "bastion $*"; }
fi

_dotfiles="${DOTFILES:-$(dirname "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")")}"
if [ -d "$_dotfiles/commands" ]; then
    for _f in "$_dotfiles"/commands/*.ts "$_dotfiles"/commands/*.sh; do
        [ -e "$_f" ] || continue
        case "$_f" in *.test.*) continue ;; esac
        _n="$(basename "$_f")"
        _n="${_n%.*}"
        case "$_f" in
            *.ts)
                _p="$_f"
                command -v wslpath >/dev/null 2>&1 && _p="$(wslpath -w "$_f")"
                eval "${_n}() { node.exe \"$_p\" \"\$@\"; }"
                ;;
            *.sh)
                eval "${_n}() { bash \"$_f\" \"\$@\"; }"
                ;;
        esac
    done

    if [ -f "$_dotfiles/commands/aliases.conf" ]; then
        while IFS='=' read -r _n _c; do
            case "$_n" in ''|\#*) continue ;; esac
            eval "${_n}() { $_c \"\$@\"; }"
        done < "$_dotfiles/commands/aliases.conf"
    fi
fi
unset _dotfiles _f _n _p _c

case ":$PATH:" in
    *":$HOME/.local/bin:"*) ;;
    *) [ -d "$HOME/.local/bin" ] && PATH="$HOME/.local/bin:$PATH" ;;
esac

if command -v starship >/dev/null 2>&1; then
    eval "$(starship init bash)"
fi
