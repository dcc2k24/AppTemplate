# Babylon augmented reality

Blazor **.NET 10** host plus a Razor Class Library that runs **Babylon.js** in the browser for **WebXR AR** (hit-test placement) and a **desktop preview** mode for automation.

## Layout

| Project | Role |
|--------|------|
| `src/BabylonAugmentedReality.App` | Blazor Web App (Interactive Server), routing, shell |
| `src/BabylonAugmentedReality.Frontend` | AR viewer component, static `ar-main.js`, scoped CSS |
| `tests/BabylonAugmentedReality.PlaywrightTests` | UI smoke tests (preview + IFC upload) |

## Running the site

```bash
cd src/BabylonAugmentedReality.App
dotnet run
```

Open `http://localhost:5275/?preview=1` for orbit preview (no headset).  
Use **Enter AR (WebXR)** on a supported mobile browser over **HTTPS** (required for camera / XR).

## Placement model

1. **WebXR hit testing** tracks real-world surfaces from the device.
2. On **select** (tap), the **content root** (placeholder box and/or IFC meshes) is moved to the latest hit pose; scale is normalized to keep authoring units stable.

## IFC

Users pick an **.ifc** file in the UI. The file is sent to JavaScript as base64, opened with **web-ifc**, and tessellated meshes are built as Babylon meshes under `ifc-root`. If the file yields no geometry (common for stub files), the **~6 ft × 3 ft × 1 ft** placeholder box stays visible.

## Testing augmented reality

**Headless browsers do not implement WebXR.** This repo uses two complementary strategies:

1. **Automated (Playwright)** — `?preview=1` exercises Babylon on a 2D canvas, DOM controls, and the IFC upload pipeline. Assertions avoid XR APIs.
2. **Manual / device** — On a phone or AR-capable headset, verify immersive AR, surface discovery, and tap-to-place.

### Playwright

1. Start the app (`dotnet run` in the App project).
2. Install browsers once: `pwsh` / `bash` — `dotnet build` then `playwright install chromium` from the test project directory (or rely on the `Microsoft.Playwright` tool; see [Playwright .NET](https://playwright.dev/dotnet/docs/intro)).
3. Run tests (optional base URL override):

```bash
cd tests/BabylonAugmentedReality.PlaywrightTests
dotnet test
# or:
BABYLON_AR_BASE_URL=http://localhost:5275 dotnet test
```

## SDK

Projects target **net10.0**. Install the matching .NET 10 SDK preview, or add a `global.json` in this folder with `rollForward` if your machine only has a newer SDK.
