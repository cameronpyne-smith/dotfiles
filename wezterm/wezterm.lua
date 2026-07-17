local wezterm = require("wezterm")
local config = wezterm.config_builder()

-- STYLING
config.color_scheme = "rose-pine"
config.window_background_opacity = 0.8
config.hide_tab_bar_if_only_one_tab = true
config.window_decorations = "RESIZE"
config.font = wezterm.font("JetBrainsMono Nerd Font")

-- TERMINAL
if wezterm.target_triple:find("windows") then
	config.win32_system_backdrop = "Acrylic"
	config.default_cwd = "C:\\code"
	config.default_prog = { "pwsh.exe", "-NoLogo" }
end

return config
