let electron = require( "electron" );
let url = require( "url" );
let path = require( "path" );

let { app, BrowserWindow, Menu } = electron;
let mainWindow;

app.on( "ready", () => {
    mainWindow = new BrowserWindow({
        width : 1000,
        height : 700,
        options : {
            fullscreen : true,
            refresh : true
        }
    });

    let main = url.format({
        pathname : path.join( __dirname, "/view/memo.html" ),
        protocol : "file",
        slashes : true
    });

    mainWindow.loadURL( main );
});

app.on( "activate", function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if ( mainWindow === null ) {
        createMainWindow();
    }
});

app.on( "window-all-closed" , function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if ( process.platform !== "darwin" ) {
        app.quit();
    }
});

const template = [
    {
        label : "MENU1",
        submenu : [
            {
                label : "Exit",
                click : function() {
                    app.quit();
                },
                accelerator : process.platform === 'darwin' ? 'Command+Q' : 'Ctrl+Shift+I'
            }
        ]
    }, {
        label : "MENU1",
        submenu : [
            {
                label : "Clear",
                click : function() {
                    mainWindow.webContents.executeJavaScript( "window.SIMPLE_MEMO.MEMO.clearMemo()" );
                },
                accelerator: process.platform === "darwin" ? "Alt+Command+Control+C" : "Ctrl+Shift+I"
            }, {
                label : "Sort",
                click : function() {
                    mainWindow.webContents.executeJavaScript( "window.SIMPLE_MEMO.MEMO.sortMemo()" );
                },
                accelerator : process.platform === "darwin" ? "Alt+Command+Control+S" : "Ctrl+Shift+I"
            }, {
                label : "Refresh",
                click : function() {
                    mainWindow.webContents.executeJavaScript( "location.reload()" );
                    // remote.getCurrentWindow().reload();
                },
                accelerator : process.platform === "darwin" ? "Command+R" : "Ctrl+Shift+I"
            }
        ]
    }
];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);