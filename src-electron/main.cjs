const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: false, // Borderless mode
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false // Needed for some FS operations if not fully isolated, but we use IPC
        }
    });

    mainWindow.loadFile('web/homepage.html');

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        require('electron').shell.openExternal(url);
        return { action: 'deny' };
    });

    // Handle window controls
    ipcMain.on('window-minimize', () => mainWindow.minimize());
    ipcMain.on('window-maximize', () => {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    });

    let forceClose = false;
    ipcMain.on('window-close', () => {
        // If we are in the viewer, we should ask the renderer if it's okay to close
        const url = mainWindow.webContents.getURL();
        if (url.includes('viewer.html') && !forceClose) {
            mainWindow.webContents.send('request-close');
        } else {
            mainWindow.close();
        }
    });

    ipcMain.on('window-close-final', () => {
        forceClose = true;
        mainWindow.close();
    });

    mainWindow.on('close', (e) => {
        if (forceClose) return;

        const url = mainWindow.webContents.getURL();
        if (url.includes('viewer.html')) {
            e.preventDefault();
            mainWindow.webContents.send('request-close');
        }
    });

    // Handle blocking of unload (e.g. from beforeunload)
    mainWindow.webContents.on('will-prevent-unload', (event) => {
        if (global.forceNavigation) {
            console.log('FireDocs: Force navigation is active. Bypass unload prevention.');
            event.preventDefault();
        }
    });

    // Reset forceNavigation on successful navigation
    mainWindow.webContents.on('did-navigate', () => {
        global.forceNavigation = false;
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// --- IPC Handlers ---

ipcMain.handle('select_pdf', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });
    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }
    return result.filePaths[0];
});

ipcMain.handle('get_file_metadata', async (event, ...args) => {
    console.log('Metadata request args:', args);
    try {
        let filePath;
        const arg = args[0];

        if (typeof arg === 'string') {
            filePath = arg;
        } else if (arg && typeof arg === 'object') {
            filePath = arg.path || (arg.filePaths ? arg.filePaths[0] : null);
        }

        if (!filePath || typeof filePath !== 'string') {
            console.error('Could not resolve filePath from args:', args);
            throw new Error(`Invalid path: ${JSON.stringify(filePath)}`);
        }

        console.log('Final resolved path:', filePath);
        const stats = await fs.promises.stat(filePath);
        return {
            name: path.basename(filePath),
            size: stats.size
        };
    } catch (error) {
        console.error('Metadata error:', error);
        throw error.message || error;
    }
});

ipcMain.handle('read_file_chunk', async (event, ...args) => {
    try {
        const arg = args[0] || {};
        const filePath = arg.path;
        const offset = arg.offset;
        const length = arg.length;

        if (!filePath || typeof offset !== 'number' || typeof length !== 'number') {
            throw new Error('Invalid chunk request parameters');
        }

        // Safety cap: Limit chunk size to 5MB
        const safeLength = Math.min(length, 5 * 1024 * 1024);
        const buffer = Buffer.alloc(safeLength);
        const fd = await fs.promises.open(filePath, 'r');

        try {
            const { bytesRead } = await fd.read(buffer, 0, safeLength, offset);
            const data = buffer.subarray(0, bytesRead);
            return data.toString('base64');
        } finally {
            await fd.close();
        }
    } catch (error) {
        console.error('Chunk read error:', error);
        throw error.message || error;
    }
});

ipcMain.handle('save_pdf', async (event, ...args) => {
    console.log('Save PDF request received');
    try {
        const { filename, data } = args[0] || {};
        console.log('Filename:', filename);
        console.log('Data type:', typeof data, 'Length:', data ? (data.length || data.byteLength) : 'N/A');

        if (!filename || !data) {
            console.error('Missing filename or data');
            throw new Error('Missing filename or data for saving PDF');
        }

        console.log('Opening save dialog...');
        const result = await dialog.showSaveDialog({
            defaultPath: filename,
            filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
        });

        if (result.canceled || !result.filePath) {
            console.log('Save dialog cancelled by user');
            throw new Error('Cancelled');
        }

        console.log('Writing file to:', result.filePath);
        const buffer = (typeof data === 'string') ? Buffer.from(data, 'base64') : Buffer.from(data);
        await fs.promises.writeFile(result.filePath, buffer);
        console.log('File written successfully');
        return result.filePath;
    } catch (error) {
        console.error('Save error in main process:', error);
        throw error.message || error;
    }
});

ipcMain.handle('navigate_to_home', async () => {
    global.forceNavigation = true;
    const homePath = path.join(__dirname, '../web/homepage.html');
    console.log('FireDocs: navigate_to_home triggered with global force. Loading:', homePath);
    try {
        await mainWindow.loadFile(homePath);
        console.log('FireDocs: Homepage loaded successfully.');
        global.forceNavigation = false;
    } catch (e) {
        console.error('FireDocs: Failed to load homepage:', e);
        global.forceNavigation = false;
    }
});

ipcMain.handle('confirm_discard', async (event, { title, message }) => {
    console.log('FireDocs: confirm_discard dialog showing...');
    const result = await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: title || 'Unsaved Changes',
        message: message || 'You have modified this PDF. Do you want to save your changes?',
        buttons: ['Save', 'Discard', 'Cancel'],
        defaultId: 0,
        cancelId: 2
    });

    console.log('FireDocs: confirm_discard dialog response index:', result.response);
    if (result.response === 0) return 'save';
    if (result.response === 1) {
        // Signal that we are about to discard, so subsequent navigations are allowed
        global.forceNavigation = true;
        return 'discard';
    }
    return 'cancel';
});
ipcMain.handle('set_titlebar_visible', (event, visible) => {
    if (visible) {
        mainWindow.setMenuBarVisibility(true);
    } else {
        mainWindow.setMenuBarVisibility(false);
    }
});
