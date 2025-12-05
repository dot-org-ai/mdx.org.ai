import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { parse, toAst } from 'mdxld'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
  })

  // Load the renderer
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// IPC handlers for MDX operations
ipcMain.handle('mdx:parse', async (_event, content: string) => {
  try {
    const doc = parse(content)
    return { success: true, data: doc }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('mdx:toAst', async (_event, content: string) => {
  try {
    const doc = parse(content)
    const ast = toAst(doc)
    return { success: true, data: ast }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
