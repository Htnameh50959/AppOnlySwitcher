# App-Only Alt+Tab

A GNOME Shell extension (GNOME 45–48). Alt+Tab shows every running app as a single
icon, with the number of open windows written under it. The window thumbnails that normally pop up under an app with several windows
are never shown, and the arrows under those apps are hidden. Releasing Alt opens
the selected app's most recent window.

Apps from all workspaces are listed as long as
`org.gnome.shell.app-switcher current-workspace-only` is `false` (the default).

## Install

    ./install.sh

Then log out and back in (Wayland). Turn it off with
`gnome-extensions disable app-only-switcher@hemanth`.
