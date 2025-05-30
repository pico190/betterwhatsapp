const { app, BrowserWindow, shell, ipcMain, Tray, Menu } = require("electron");
const { config } = require("./config");
const path = require("path");
const contextMenu = require("electron-context-menu");
const https = require("https");
const fs = require("fs");
const { nativeImage } = require("electron");

const appUrl = "https://web.whatsapp.com";

const version = '"v1.4.5"';
/**
 * @type {BrowserWindow}
 */
let window = null;
let tray = null;

function onNewWindow(details) {
	shell.openExternal(details.url);
	return { action: "deny" };
}

const iconPath = path.resolve(__dirname, "icons", "256x256.png");
const createWindow = () => {
	window = new BrowserWindow({
		icon: iconPath,
		autoHideMenuBar: true,
		title: "BetterWhatsapp",
		maximize: true,
		webPreferences: {
			webSecurity: false,
			plugins: true,
		},
		show: false,
	});
	window.setAutoHideMenuBar(true);
	window.setMenu(null);
	window.setIcon(iconPath);
	window.loadURL(appUrl, { userAgent: config.userAgent });

	window.webContents.on("before-input-event", (event, input) => {
		if (input.control && input.shift && input.key.toLowerCase() === "i") {
			window.webContents.openDevTools({ mode: "detach" });
			event.preventDefault();
		}
	});

	window.webContents.on("did-finish-load", () => {
		const themeLoaderURL =
			"https://raw.githubusercontent.com/pico190/betterwhatsapp-themes/refs/heads/main/themeloader.js?v=1";

		https
			.get(themeLoaderURL, (response) => {
				if (response.statusCode !== 200) {
					console.error("Error 3:", response.statusCode);
					return;
				}

				let jsData = "";
				response.on("data", (chunk) => (jsData += chunk));
				response.on("end", () => {
					console.log(jsData);
					const dontLoadTheme = true;
					eval(jsData.replaceAll("$__VERSION", version));
				});
			})
			.on("error", (err) => console.error("Error 2:", err));
	});

	window.webContents.setWindowOpenHandler(onNewWindow);

	window.on("close", (e) => {
		e.preventDefault();
		window.hide();
	});

	tray = new Tray(path.join(__dirname, "icons/256x256.png"));
	const contextMenuTray = Menu.buildFromTemplate([
		{ label: "Restore", click: () => window.show() },
		{ label: "Minimize", click: () => window.hide() },
		{
			label: "Quit",
			click: () => {
				tray.destroy();
				window.removeAllListeners("close");
				window.close();
				process.exit(0);
			},
		},
	]);
	tray.setToolTip("BetterWhatsapp");
	tray.setContextMenu(contextMenuTray);

	window.once("ready-to-show", () => {
		window.maximize();
		window.setIcon(iconPath);
		window.webContents.setZoomFactor(1.15);
		window.show();
	});
};

app.setLoginItemSettings({
	openAtLogin: true,
	openAsHidden: false,
});

contextMenu({
	showSaveImageAs: true,
});

const appLock = app.requestSingleInstanceLock();

const protocolClient = "whatsapp";
if (!app.isDefaultProtocolClient(protocolClient, process.execPath)) {
	app.setAsDefaultProtocolClient(protocolClient, process.execPath);
}

if (!appLock) {
	app.quit();
} else {
	app.on("second-instance", onAppSecondInstance);
	app.on("ready", onAppReady);
}

async function onAppReady() {
	app.setName("BetterWhatsapp");
	createWindow();
}

function processArgs(args) {
	var regHttps = /^https:\/\/web\.whatsapp\.com\/.*/g;
	var regWapp = /^whatsapp:\/.*/g;
	for (const arg of args) {
		if (regHttps.test(arg)) {
			return arg;
		}
		if (regWapp.test(arg)) {
			return appUrl + arg.substring(10, arg.length);
		}
	}
}

function onAppSecondInstance(event, args) {
	console.debug("second-instance started");
	if (window) {
		event.preventDefault();
		const url = processArgs(args);
		if (url) {
			allowFurtherRequests = false;
			setTimeout(() => {
				allowFurtherRequests = true;
			}, 5000);
			window.loadURL(url, { userAgent: config.chromeUserAgent });
		}

		window.focus();
	}
}
