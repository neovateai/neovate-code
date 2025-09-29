function getTerminal() {
  if (process.env.CURSOR_TRACE_ID) return 'cursor';
  if (process.env.VSCODE_GIT_ASKPASS_MAIN?.includes('/.cursor-server/bin/'))
    return 'cursor';
  if (process.env.VSCODE_GIT_ASKPASS_MAIN?.includes('/.windsurf-server/bin/'))
    return 'windsurf';
  const A = process.env.__CFBundleIdentifier?.toLowerCase();
  if (A?.includes('vscodium')) return 'codium';
  if (A?.includes('windsurf')) return 'windsurf';
  if (A?.includes('pycharm')) return 'pycharm';
  if (A?.includes('intellij')) return 'intellij';
  if (A?.includes('webstorm')) return 'webstorm';
  if (A?.includes('phpstorm')) return 'phpstorm';
  if (A?.includes('rubymine')) return 'rubymine';
  if (A?.includes('clion')) return 'clion';
  if (A?.includes('goland')) return 'goland';
  if (A?.includes('rider')) return 'rider';
  if (A?.includes('datagrip')) return 'datagrip';
  if (A?.includes('appcode')) return 'appcode';
  if (A?.includes('dataspell')) return 'dataspell';
  if (A?.includes('aqua')) return 'aqua';
  if (A?.includes('gateway')) return 'gateway';
  if (A?.includes('fleet')) return 'fleet';
  if (A?.includes('com.google.android.studio')) return 'androidstudio';
  if (process.env.TERMINAL_EMULATOR === 'JetBrains-JediTerm') return 'pycharm';
  if (process.env.TERM === 'xterm-ghostty') return 'ghostty';
  if (process.env.TERM?.includes('kitty')) return 'kitty';
  if (process.env.TERM_PROGRAM) return process.env.TERM_PROGRAM;
  if (process.env.TMUX) return 'tmux';
  if (process.env.STY) return 'screen';
  if (process.env.KONSOLE_VERSION) return 'konsole';
  if (process.env.GNOME_TERMINAL_SERVICE) return 'gnome-terminal';
  if (process.env.XTERM_VERSION) return 'xterm';
  if (process.env.VTE_VERSION) return 'vte-based';
  if (process.env.TERMINATOR_UUID) return 'terminator';
  if (process.env.KITTY_WINDOW_ID) return 'kitty';
  if (process.env.ALACRITTY_LOG) return 'alacritty';
  if (process.env.TILIX_ID) return 'tilix';
  if (process.env.WT_SESSION) return 'windows-terminal';
  if (process.env.SESSIONNAME && process.env.TERM === 'cygwin') return 'cygwin';
  if (process.env.MSYSTEM) return process.env.MSYSTEM.toLowerCase();
  if (process.env.ConEmuTask) return 'conemu';
  if (process.env.WSL_DISTRO_NAME) return `wsl-${process.env.WSL_DISTRO_NAME}`;
  if (
    process.env.SSH_CONNECTION ||
    process.env.SSH_CLIENT ||
    process.env.SSH_TTY
  )
    return 'ssh-session';
  if (process.env.TERM) {
    const B = process.env.TERM;
    if (B.includes('alacritty')) return 'alacritty';
    if (B.includes('rxvt')) return 'rxvt';
    if (B.includes('termite')) return 'termite';
    return process.env.TERM;
  }
  if (!process.stdout.isTTY) return 'non-interactive';
  return null;
}

async function getHasInternetAccess() {
  try {
    const abort = new AbortController(),
      timer = setTimeout(() => abort.abort(), 1000);
    return (
      await fetch('http://1.1.1.1', {
        method: 'HEAD',
        signal: abort.signal,
      }),
      clearTimeout(timer),
      true
    );
  } catch {
    return false;
  }
}

export async function getEnv() {
  return {
    hasInternetAccess: await getHasInternetAccess(),
    platform:
      process.platform === 'win32'
        ? 'windows'
        : process.platform === 'darwin'
          ? 'macos'
          : 'linux',
    nodeVersion: process.version,
    terminal: getTerminal(),
  };
}
