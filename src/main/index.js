'use strict';
/* eslint-disable */

import {app, ipcMain, Notification, screen, shell} from 'electron';
import updateApp from './updater';
app.disableHardwareAcceleration();

import {
  showDevTools,
  isOldWindows,
  isDevelopment,
  icon,
  closeApp,
  changeIsQuiting,
  createBrowserWindow,
  createBrowserOtherWindow,
  getUrl
} from './utils';

const Tray = require('./Tray').default;
const DataStore = require('./DataStore').default;
const Store = new DataStore()

let mainWindow, childWindow, modalWindow, base1cWindow, tray = null;

app.on('before-quit', function () {
  changeIsQuiting(true)
});

ipcMain.on('notify-on', (event, args) => {
  const Notify = new Notification({
    title: 'ИТС Госсектор24',
    body: 'У вас новое уведомление на сайте gos24.kz',
    icon: icon
  });
  Notify.on('click', ()=> {
    shell.openExternal('https://gos24.kz/notification');
  });
  Notify.show();
});

ipcMain.on('close-app', (event, args) => {
  app.quit()
});

// Когда закрываем другие окна то сообщаем главному окну что, что то изменилось
ipcMain.on('close-window', (e, args) => {
  mainWindow.close();
  mainWindow.webContents.send('close-window')
})

// TODO [FIX ME] В разных окнах электорна создается новый экземпляр Vue и между ними нет связи...
ipcMain.on('update-client', (e, prefix, data) => {
  [mainWindow, modalWindow, childWindow].forEach(wind => {
    if (wind) {
      wind.webContents.send('update-client:'+prefix, data)
    }
  })
})

ipcMain.on('page-base1c', (event, args) => {
    base1cWindow = createBrowserOtherWindow({
        focusable: true,
    });

    if (isDevelopment) {
        showDevTools(base1cWindow)
    }

    // Показываем страницу Авторизации
    base1cWindow.loadURL(getUrl('/#/base1c', '#base1c'));

    // Унижтожаем окно полностью
    base1cWindow.on('close',  () => {
        base1cWindow = null;
    });

    base1cWindow.once('ready-to-show',()=>{
        base1cWindow.show()
    });
});

// Показываем страницу авторизации
// с его настройками
ipcMain.on('page-auth', (event, args) => {
  childWindow = createBrowserOtherWindow({
    focusable: true,
  });

  if (isDevelopment) {
    showDevTools(childWindow)
  }

  // Показываем страницу Авторизации
  childWindow.loadURL(getUrl('/#/login', '#login'));

  // Унижтожаем окно полностью
  childWindow.on('close',  () => {
    childWindow = null;
  });

  childWindow.once('ready-to-show',()=>{
    childWindow.show()
  });
});

// Закрываем всех других окон
ipcMain.on('close-child-window', () => {
  if (childWindow) {
    childWindow.close();
  }
  if (base1cWindow) {
      base1cWindow.close();
  }
});

// TODO FIX ME
// Пока не понял в какой момент этот метод вызывается,
// надо проверить вызывается ли этот события,
// если не вызывается то надо убрать...
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
});

// это для установщика
// подробнее потом напишу
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
});

// У `tray` контекстное меню не реактивная
// по этому с клиента сообщаю что пользователь авторизован или нет
// если авторизован то в контексте `tray` показываем кнопку `Cменить аккаунт`
ipcMain.on('show-logout-btn', async (event, args) => {
    await tray.changeContextMenu(1, {
            field: 'visible',
            value: args
        })
    await tray.setContextMenu()
});

//  Открываем/закрываем модалку
ipcMain.on('toogle-modal', (e, args) => {
  modalWindow.webContents.send('modal-show', args)
  if (args) {
    modalWindow.show()
  } else {
    modalWindow.hide();
  }
});

// Перезаписываем перемещение программы
ipcMain.on('windowMoving', (e, {mouseX, mouseY}) => {
    // Размеры Экрана
    const { size: { width: displayWidth, height: displayHeight } } = screen.getPrimaryDisplay()

    // Текущая позиция Курсора
    const { x, y } = screen.getCursorScreenPoint();

    // Отступ
    const margin = 40;
    const width = displayWidth - margin;
    const height = displayHeight - margin;

    // x < width  - x больше width || правая сторона экрана
    // y < height - y больше height || нижная сторона экрана
    // x > margin - x больше margin || левая сторона экрана
    // y > margin - y больше margin || верхная сторона экрана
    if (x < width && y < height && x > margin && y > margin)  {
        mainWindow.setPosition(x - mouseX, y - mouseY)
    }


    // Получить новую позициую приложение
    const [mainX, mainY] = mainWindow.getPosition(),

        // Оступы от экрана
        limitation = 400,

        // Ограниченные размеры
        windwoSize = {
            x,
            y,
            width: displayWidth - limitation,
            height: displayHeight - limitation
        },

        // Узнаем позицию приложение
        position = {
            left: windwoSize.x < limitation,
            right: windwoSize.x > windwoSize.width,
            top: windwoSize.y < limitation,
            bottom: windwoSize.y > windwoSize.height,
            default: !(windwoSize.x < limitation || windwoSize.x > windwoSize.width || windwoSize.y < limitation || windwoSize.y > windwoSize.height)
        };
    // Дальше указываем новую позицию относительно
    // от ограниченных размеров
    let positionNEW = {
        x: 0,
        y: 0,
    }

    positionNEW.x = mainX - 500 + 70
    positionNEW.y = mainY - 490

    if (position.top) {
        positionNEW.y = mainY + 80
    }
    if (position.left) {
        positionNEW.x = mainX
    }

    // Установливаем новую позицию бля Модального
    modalWindow.setPosition(positionNEW.x, positionNEW.y);

    // Сообщаем нужным окнам что было перемещение окон
    [mainWindow, modalWindow].forEach(winItem => winItem.webContents.send('windowMoved', position))

});

// После перемещение указываем позицую
ipcMain.on('windowMoved', (e, data) => {

    // Сохраняем позицию
    const [mainX, mainY] = mainWindow.getPosition()
    Store.changePosition({
        x: mainX,
        y: mainY
    })
});

// Авто-запуск приложение при старте windows
if (!isDevelopment) {
  app.setLoginItemSettings({
    openAtLogin: true,
  });
}

// Создаем модалку
function MainModal () {
  const display = screen.getPrimaryDisplay();
  const width = display.bounds.width;
  const height = display.bounds.height;

  modalWindow = createBrowserWindow({
    width: 500,
    minWidth: 500,
    maxWidth: 500,
    height: 600,
    minHeight: 600,
    maxHeight: 600,
    x: width - 335,
    y: height - 610,
  });

  // Ссылка на Модал
  modalWindow.loadURL(getUrl('/#/home-modal', '#home-modal'));

  if (isDevelopment) {
    // Дев тулс показываем только в режиме разработки
    showDevTools(modalWindow)
  }
}

// создаем главное окно
function createWindow () {
  // Проверяем в каком ось запущен приложение
  if (isOldWindows()) {
    mainWindow = createBrowserOtherWindow({
      width: 180,
      height: 600,
      focusable: true,
    });

    // Показываем страницу для Старый версии винда
    mainWindow.loadURL(getUrl('/#/home-for-old', '#home-for-old'));
  } else {
    mainWindow = createBrowserWindow();

    // Ссылка Главную страницу
    mainWindow.loadURL(getUrl('', ''));

    // Modal
    MainModal()
  }

  // Скрываем дефолтное меню `File | ... | Help`
  mainWindow.setMenu(null);

  // Унижтожаем окно полностью
  mainWindow.on('closed', () => {
    mainWindow = null
    modalWindow = null
  });

  // Модель надо установить обязательно
  // в нашем случае пока показываем уведомление
  app.setAppUserModelId('kz.gos24');

  // Закрываем не польностью а сворачиваем в `Tray`
  mainWindow.on('close', (event) => {
    closeApp(mainWindow, event)
  });

  // Тут все понятно
  mainWindow.once('ready-to-show',()=>{
    mainWindow.show()
  });

  // создаем новый `Tray`
  // *** переменную `tray` объявил глобально, потому что
  // *** винде запускается мусорщик, в определенную интервал времени и обновляет `Tray`
  // *** и во время обновление он должен удалить текущую и создать новое
  // *** крч как то так :D если что почитайте  в инете
  tray = new Tray(mainWindow, modalWindow)
  tray.init()

  if (isDevelopment) {
    // Дев тулс показываем только в режиме разработки
    showDevTools(mainWindow)
  } else {
    // автообновление приложение
    // *** запускается фоновом режиме
    updateApp(mainWindow)
  }
}

app.on('ready', createWindow);
