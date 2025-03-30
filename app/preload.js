const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  sendData: (data) => ipcRenderer.invoke("handle-data", data),
});
