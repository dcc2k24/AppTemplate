# Babylon augmented reality

Blazor **.NET 10** host plus a Razor Class Library that publishes **static AR assets** (`wwwroot/ar/ar-main.js`). The interactive **`ArExperience`** UI lives in the **App** project so Blazor Server interop and lifecycle behave predictably.

## Layout

| Project | Role |
|--------|------|
| `src/BabylonAugmentedReality.App` | Blazor Web App (Interactive Server), `ArExperience` component, routing |
| `src/BabylonAugmentedReality.Frontend` | Static web assets (Babylon + IFC JS) served under `_content/BabylonAugmentedReality.Frontend/` |
| `tests/BabylonAugmentedReality.PlaywrightTests` | Playwright smoke tests |

## Environment (run tests locally or in CI)

1. **.NET 10 SDK** — [Install](https://dotnet.microsoft.com/download) or run `bash scripts/install-dotnet-sdk.sh` and add `~/.dotnet` to `PATH`.
2. **PowerShell (`pwsh`)** — required to run `playwright.ps1` from the test build output (on Ubuntu: Microsoft package `powershell`).
3. **Playwright browsers** — after `dotnet build` on the test project:
   ```bash
   pwsh tests/BabylonAugmentedReality.PlaywrightTests/bin/Release/net10.0/playwright.ps1 install --with-deps chromium
   ```
   Or: `bash scripts/install-playwright-browsers.sh`
4. **End-to-end (app + tests)** — from `babylon-augmented-reality/`:
   ```bash
   bash scripts/run-e2e-tests.sh
   ```
   Uses `http://127.0.0.1:5275` by default; override with `BABYLON_AR_BASE_URL`.

**Dev Container:** open the repo in VS Code / Codespaces with `.devcontainer/devcontainer.json` (includes .NET 10 + PowerShell; run `install-playwright-browsers.sh` once).

## Running the site

```bash
cd src/BabylonAugmentedReality.App
dotnet run
```

Open `http://localhost:5275/?preview=1` for orbit preview (no headset).  
Add `&nullengine=1` if you need a CPU **NullEngine** (automation / no WebGL).  
Use **Enter AR (WebXR)** on a supported mobile browser over **HTTPS**.

## Placement model

1. **WebXR hit testing** tracks real-world surfaces from the device.
2. On **select** (tap), the **content root** (placeholder box and/or IFC meshes) is moved to the latest hit pose; scale is normalized to **1**.

## IFC

Users pick an **.ifc** file in the UI. The file is sent to JavaScript as base64, opened with **web-ifc**, and tessellated meshes are built as Babylon meshes under `ifc-root`. If the file yields no geometry (common for stub files), the **~6 ft × 3 ft × 1 ft** placeholder box stays visible.

## Testing

- **Default `dotnet test`** runs a **DOM smoke** test (shell + controls + canvas layout). It does not require Babylon to finish booting.
- **Explicit** Playwright tests (`[Explicit]`) cover viewer leaving “Initializing” and IFC upload; run with  
  `dotnet test --filter FullyQualifiedName~UiSmokeTests -- NUnit.Explicit=on`  
  (or your runner’s equivalent) when the app is up and the network can reach Babylon + web-ifc CDNs.

## SDK

Projects target **net10.0**. `global.json` uses `rollForward: latestMajor`.
