/* eslint-disable */
const path = require('path');
export const isDevelopment = process.env.NODE_ENV !== 'production';

if (!isDevelopment) {
    global.__static = path.join(__dirname, '/static').replace(/\\/g, '\\\\')
}

import {app, BrowserWindow, screen} from 'electron';
let isQuiting = false;
const windowSize = {
    width: 250,
    height: 500,
    x: 400,
    y: 600
};

export const currentVersion = app.getVersion();

export const icon = path.join(__static, 'icons/icon.png');

export const trayIcon = path.join(__static, 'icons/icon16x16.png');

export function changeIsQuiting (val) {
    isQuiting = val
}

export function getUrl (url, hashUrl) {
    return isDevelopment ? `http://localhost:9080${url}` : `file://${__dirname}/index.html${hashUrl}`;
}

export function showDevTools (win) {
    win.webContents.on('did-frame-finish-load', () => {
        win.webContents.once('devtools-opened', () => {
            win.focus();
        });
        win.webContents.openDevTools();
    });
}
export function createBrowserWindow (options = {} ) {
    const display = screen.getPrimaryDisplay();
    const width = display.bounds.width;
    const height = display.bounds.height;

    return new BrowserWindow({
        width: windowSize.width,
        height: windowSize.height,
        // x: width - windowSize.x,
        // y: height - windowSize.y,
        // backgroundColor: 'rgba(255,255,255,0)',
        transparent: true,
        focusable: false,
        resizable: false,
        alwaysOnTop: !isDevelopment,
        frame: false,
        skipTaskbar: !isDevelopment,
        icon: icon,
        show: false,
        webPreferences: {
            enableRemoteModule: true,
            nodeIntegration: true,
            defaultEncoding: 'UTF-8'
        },
        ...options
    })
}
export function createBrowserChildWindow (options = {}) {
    return new BrowserWindow({
        width: 400,
        height: 680,
        backgroundColor: '#e8e8e8',
        resizable: isDevelopment, // изменение ширины
        maximizable: false,
        fullscreenable: false,
        fullscreen: false, // полноэкран
        minimizable: false,
        icon: icon,
        show: false,
        webPreferences: {
            webSecurity: false
        },
        ...options
    })
}

export function createContextMenu (win) {
    return [
        {
            label: 'Показать приложение',
            click: () => {
                win.show();
            }
        },
        {
            label: 'Сменить аккаунт',
            visible: false,
            click: () => {
                win.show();
                win.webContents.send('logout')
            }
        },
        {
            label: 'Выйти из приложения',
            click: function () {
                changeIsQuiting(true);
                app.quit();
            }
        }
    ];
}

export function closeApp (win, event) {
    if (!isQuiting) {
        event.preventDefault();
        win.hide();
        event.returnValue = false;
    }
}
