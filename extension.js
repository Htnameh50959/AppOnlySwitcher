import {Extension, InjectionManager} from 'resource:///org/gnome/shell/extensions/extension.js';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as AltTab from 'resource:///org/gnome/shell/ui/altTab.js';

const Popup = AltTab.AppSwitcherPopup.prototype;

// A line under each app: how many of its windows are open.
function addWindowCounts(icons) {
    for (const icon of icons) {
        const n = icon.cachedWindows?.length ?? 0;
        icon.add_child(new St.Label({
            text: n === 1 ? '1 window' : `${n} windows`,
            style_class: 'app-only-switcher-count',
            x_align: Clutter.ActorAlign.CENTER,
        }));
    }
}

function hideArrows(list) {
    for (const arrow of list._arrows ?? [])
        arrow.hide();
}

export default class AppOnlySwitcherExtension extends Extension {
    enable() {
        this._injections = new InjectionManager();

        // The keyboard only ever selects apps: Tab, arrows and Alt+` never open an
        // app's windows, and releasing Alt activates the app's most recent window
        // (AppSwitcherPopup._finish with _currentWindow -1). Window previews are
        // opened only by hovering an app with the mouse; while _aosMouse is set the
        // original window-level behaviour is allowed through.
        const byMouse = (popup, fn) => {
            popup._aosMouse = true;
            try {
                return fn();
            } finally {
                popup._aosMouse = false;
            }
        };

        this._injections.overrideMethod(Popup, '_select', original => function (app, window, forceAppFocus) {
            if (this._aosMouse)
                return original.call(this, app, window, forceAppFocus);
            return original.call(this, app, undefined, true);
        });
        this._injections.overrideMethod(Popup, '_createThumbnails', original => function () {
            if (this._aosMouse)
                original.call(this);
        });
        this._injections.overrideMethod(Popup, '_timeoutPopupThumbnails', () => function () {
            this._thumbnailTimeoutId = 0;
            return false;
        });

        // Hovering an app selects it and shows a preview of each of its windows.
        this._injections.overrideMethod(Popup, '_itemEnteredHandler', original => function (n) {
            if (n === this._selectedIndex && this._thumbnails)
                return;
            original.call(this, n);
            byMouse(this, () => this._createThumbnails());
        });
        // Hovering, clicking or closing a preview picks that window.
        for (const name of ['_windowEntered', '_windowRemoved']) {
            this._injections.overrideMethod(Popup, name, original => function (...args) {
                return byMouse(this, () => original.call(this, ...args));
            });
        }

        // Show each app's window count and hide the small arrows under apps
        // with several windows.
        this._injections.overrideMethod(Popup, '_init', original => function (...args) {
            original.call(this, ...args);
            const popup = this;
            const list = this._switcherList;
            addWindowCounts(this._items);
            hideArrows(list);
            const highlight = list.highlight;
            list.highlight = function (...hArgs) {
                highlight.call(this, ...hArgs);
                hideArrows(this);
            };
            // GNOME ignores the mouse over the app that is already selected, so
            // hovering the first selected app would never show its previews.
            const onItemMotion = list._onItemMotion;
            list._onItemMotion = function (item) {
                const index = this._items.indexOf(item);
                if (popup.mouseActive && index === popup._selectedIndex && !popup._thumbnails) {
                    popup._itemEnteredHandler(index);
                    return Clutter.EVENT_PROPAGATE;
                }
                return onItemMotion.call(this, item);
            };
        });
    }

    disable() {
        this._injections.clear();
        this._injections = null;
    }
}
