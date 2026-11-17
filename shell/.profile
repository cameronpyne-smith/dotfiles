# ~/.profile: executed by the command interpreter for login shells.
# This file is not read by bash(1), if ~/.bash_profile or ~/.bash_login
# exists.
# see /usr/share/doc/bash/examples/startup-files for examples.
# the files are located in the bash-doc package.

# the default umask is set in /etc/profile; for setting the umask
# for ssh logins, install and configure the libpam-umask package.
#umask 022

# if running bash
if [ -n "$BASH_VERSION" ]; then
    # include .bashrc if it exists
    if [ -f "$HOME/.bashrc" ]; then
	. "$HOME/.bashrc"
    fi
fi

# set PATH so it includes user's private bin if it exists
if [ -d "$HOME/bin" ] ; then
    PATH="$HOME/bin:$PATH"
fi

# set PATH so it includes user's private bin if it exists
if [ -d "$HOME/.local/bin" ] ; then
    PATH="$HOME/.local/bin:$PATH"
fi

export PATH=$PATH:/usr/local/go/bin

export HF_HOME="$HOME/models/hf"
export MODELSCOPE_CACHE="$HOME/models/modelscope"
export TORCH_HOME="$HOME/models/torch"
. "$HOME/.cargo/env"

if [ -z "${SSH_AUTH_SOCK:-}" ] && [ -n "${XDG_RUNTIME_DIR:-}" ] && command -v ssh-agent >/dev/null 2>&1; then
    export SSH_AUTH_SOCK="$XDG_RUNTIME_DIR/ssh-agent.socket"
    ssh-add -l >/dev/null 2>&1
    if [ $? -eq 2 ]; then
        rm -f "$SSH_AUTH_SOCK"
        ssh-agent -a "$SSH_AUTH_SOCK" >/dev/null
    fi
fi
