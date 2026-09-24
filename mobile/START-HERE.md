# Start MoeAI

The portable ZIP contains both the editable Expo source and a prebuilt website.
It does not depend on paths from the PC that created it.

## Windows — no Node.js or npm required

1. Extract the whole ZIP. Do not run it from inside the ZIP preview.
2. Double-click `Start MoeAI - Windows.cmd`.
3. Your browser opens at `http://127.0.0.1:8080`.
4. Keep the terminal window open while using MoeAI. Press `Ctrl+C` there to stop it.

The Windows launcher uses PowerShell, which is included with Windows, and serves
the prebuilt `web-build` folder locally. If port 8080 is busy, run this in a
terminal from the extracted folder:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\serve-portable-web.ps1 -Port 8090
```

## macOS or Linux

Open a terminal in the extracted folder and run:

```sh
chmod +x "Start MoeAI - macOS-Linux.sh"
./Start\ MoeAI\ -\ macOS-Linux.sh
```

The launcher uses Python 3 when available, then falls back to Node.js.

## Edit or develop the app

Install Node.js 22 LTS, then run:

```sh
npm install
npm run web
```

Rebuild the portable website after source changes with:

```sh
npm run build:web
```

The prebuilt `web-build` folder is not kept in the repository; the launchers
above serve it after `npm run build:web`. Lecture chat is answered by the EduMoe
server (`/api/moeai`); no AI credentials are bundled into the app.
