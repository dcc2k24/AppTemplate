/**
 * Babylon.js scene: desktop preview (orbit) or WebXR AR with hit-test placement.
 * IFC: parses with web-ifc and tessellates streamed meshes into Babylon geometry.
 *
 * Uses the official Babylon UMD build (fast CDN) instead of jsdelivr +esm, which can take
 * minutes to respond in some networks and breaks Blazor/Playwright timeouts.
 */
const BABYLON_UMD = "https://cdn.babylonjs.com/babylon.js";
const WEB_IFC_VER = "0.0.68";
const WEB_IFC_WASM = `https://unpkg.com/web-ifc@${WEB_IFC_VER}/`;
const WEB_IFC_API = `https://esm.sh/web-ifc@${WEB_IFC_VER}/web-ifc-api.js?target=es2022`;

const FT = 0.3048;
const DEFAULT_BOX = {
  width: 3 * FT,
  height: 6 * FT,
  depth: 1 * FT,
};

/** @type {any} */
let engine = null;
/** @type {any} */
let scene = null;
/** @type {any} */
let placeholderMesh = null;
/** @type {any} */
let contentRoot = null;
/** @type {any} */
let ifcRoot = null;
/** @type {any} */
let xrExperience = null;
/** @type {any} */
let ifcApi = null;
/** @type {number | null} */
let ifcModelId = null;
/** @type {(() => void) | null} */
let resizeHandler = null;

/**
 * @param {string} src
 * @returns {Promise<void>}
 */
function loadScriptOnce(src) {
  const existing = Array.from(document.querySelectorAll("script[data-ar-script]")).find(
    (el) => el.getAttribute("data-ar-script") === src,
  );
  if (existing) {
    return existing.getAttribute("data-ar-loaded") === "1"
      ? Promise.resolve()
      : new Promise((resolve, reject) => {
          existing.addEventListener("load", () => resolve(), { once: true });
          existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), {
            once: true,
          });
        });
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.setAttribute("data-ar-script", src);
    s.onload = () => {
      s.setAttribute("data-ar-loaded", "1");
      resolve();
    };
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

/**
 * @returns {Promise<any>}
 */
async function getBabylon() {
  if (globalThis.BABYLON) {
    return globalThis.BABYLON;
  }
  await loadScriptOnce(BABYLON_UMD);
  if (!globalThis.BABYLON) {
    throw new Error("BABYLON global missing after loading UMD bundle.");
  }
  return globalThis.BABYLON;
}

function readNullEngineQueryFlag() {
  try {
    return new URLSearchParams(globalThis.location?.search ?? "").get("nullengine") === "1";
  } catch {
    return false;
  }
}

/**
 * @param {HTMLCanvasElement} canvasEl
 * @param {boolean} preview
 * @param {string} _baseUri
 */
export async function init(canvasEl, preview, _baseUri) {
  const BABYLON = await getBabylon();

  const webdriver = typeof navigator !== "undefined" && navigator.webdriver === true;
  const nullEngineFromUrl = readNullEngineQueryFlag();
  const headlessChromium = /HeadlessChrome/i.test(
    typeof navigator !== "undefined" ? navigator.userAgent || "" : "",
  );
  const useNullEngine =
    preview &&
    BABYLON.NullEngine &&
    (nullEngineFromUrl || webdriver || headlessChromium || !canvasEl.getContext("webgl"));
  if (useNullEngine) {
    engine = new BABYLON.NullEngine();
  } else {
    engine = new BABYLON.Engine(canvasEl, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });
  }
  scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.04, 0.05, 0.07, 1);

  contentRoot = new BABYLON.TransformNode("content-root", scene);
  ifcRoot = new BABYLON.TransformNode("ifc-root", scene);
  ifcRoot.parent = contentRoot;

  const mat = new BABYLON.StandardMaterial("placeholder-mat", scene);
  mat.diffuseColor = new BABYLON.Color3(0.35, 0.55, 0.95);
  mat.alpha = 0.92;

  placeholderMesh = BABYLON.MeshBuilder.CreateBox(
    "six-foot-placeholder",
    {
      width: DEFAULT_BOX.width,
      height: DEFAULT_BOX.height,
      depth: DEFAULT_BOX.depth,
    },
    scene,
  );
  placeholderMesh.material = mat;
  placeholderMesh.position.y = DEFAULT_BOX.height / 2;
  placeholderMesh.parent = contentRoot;

  const light = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0.2, 1, 0.1), scene);
  light.intensity = 0.95;

  if (preview) {
    const camera = new BABYLON.ArcRotateCamera(
      "preview-cam",
      -Math.PI / 2.2,
      Math.PI / 3.1,
      6,
      new BABYLON.Vector3(0, DEFAULT_BOX.height / 2, 0),
      scene,
    );
    if (!(engine instanceof BABYLON.NullEngine)) {
      camera.attachControl(canvasEl, true);
    }
    camera.lowerRadiusLimit = 2;
    camera.upperRadiusLimit = 40;
  } else {
    const camera = new BABYLON.FreeCamera("desktop-cam", new BABYLON.Vector3(0, 1.6, -4), scene);
    camera.setTarget(new BABYLON.Vector3(0, DEFAULT_BOX.height / 2, 0));
  }

  engine.runRenderLoop(() => {
    scene.render();
  });
  resizeHandler = () => engine?.resize();
  window.addEventListener("resize", resizeHandler);
}

/**
 * @returns {Promise<string>}
 */
export async function enterAr() {
  if (!engine || !scene || !contentRoot) {
    return "Scene not ready.";
  }

  const BABYLON = await getBabylon();
  const WebXRHitTest = BABYLON.WebXRHitTest;

  const supported = await BABYLON.WebXRSessionManager.IsSessionSupportedAsync("immersive-ar");
  if (!supported) {
    return "immersive-ar is not supported in this browser. Append ?preview=1 to use desktop preview.";
  }

  try {
    xrExperience = await scene.createDefaultXRExperienceAsync({
      uiOptions: { sessionMode: "immersive-ar" },
      optionalFeatures: true,
    });
  } catch (e) {
    return `Could not start AR session: ${e?.message ?? e}`;
  }

  const fm = xrExperience.baseExperience.featuresManager;
  const sessionManager = xrExperience.baseExperience.sessionManager;
  const lastHit = BABYLON.Matrix.Identity();

  sessionManager.onXRSessionInitObservable.addOnce(() => {
    const session = sessionManager.session;
    if (!session) {
      return;
    }

    /** @type {any} */
    let hitTest = null;
    try {
      hitTest = fm.enableFeature(WebXRHitTest.Name, "latest", {
        xrSession: session,
      });
    } catch (e) {
      console.warn("Hit test unavailable", e);
    }

    if (hitTest?.onHitTestResultObservable) {
      hitTest.onHitTestResultObservable.add((results) => {
        if (results.length) {
          lastHit.copyFrom(results[0].transformationMatrix);
        }
      });
    }

    session.addEventListener("select", () => {
      const pos = new BABYLON.Vector3();
      const rot = new BABYLON.Quaternion();
      const scl = new BABYLON.Vector3();
      lastHit.decompose(scl, rot, pos);

      contentRoot.position.copyFrom(pos);
      contentRoot.rotationQuaternion = rot.clone();
      contentRoot.scaling = BABYLON.Vector3.One();
    });
  });

  return "AR running: slowly pan the device until surfaces are found, then tap to place the model.";
}

function clearIfcNodes() {
  if (!ifcRoot) {
    return;
  }
  const toDispose = ifcRoot.getChildren().slice();
  for (const node of toDispose) {
    node.dispose();
  }
}

/**
 * @param {string} base64
 * @returns {Promise<string>}
 */
export async function loadIfcBase64(base64) {
  if (!scene || !ifcRoot || !placeholderMesh) {
    return "Scene not ready.";
  }

  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const mod = await import(WEB_IFC_API);
  const IfcAPI = mod.IfcAPI ?? mod.default?.IfcAPI;
  if (!IfcAPI) {
    return "IFC runtime failed to load (IfcAPI missing).";
  }

  if (!ifcApi) {
    ifcApi = new IfcAPI();
    ifcApi.SetWasmPath(WEB_IFC_WASM);
    await ifcApi.Init();
  }

  if (ifcModelId !== null) {
    try {
      ifcApi.CloseModel(ifcModelId);
    } catch {
      // ignore
    }
    ifcModelId = null;
  }

  clearIfcNodes();

  const modelID = ifcApi.OpenModel(bytes, { COORDINATE_TO_ORIGIN: true });
  ifcModelId = modelID;

  const BABYLON = await getBabylon();
  let meshCount = 0;

  ifcApi.StreamAllMeshes(modelID, (flatMesh) => {
    flatMesh.geometries.forEach((geom) => {
      const verts = ifcApi.GetVertexArray(modelID, geom.geometryExpressID, false);
      const indices = ifcApi.GetIndexArray(modelID, geom.geometryExpressID, false);
      if (!verts?.length || !indices?.length) {
        return;
      }

      const customMesh = new BABYLON.Mesh(`ifc-${flatMesh.expressID}-${geom.geometryExpressID}`, scene);
      const vertexData = new BABYLON.VertexData();
      vertexData.positions = Array.from(verts);
      vertexData.indices = Array.from(indices);
      vertexData.normals = [];
      BABYLON.VertexData.ComputeNormals(vertexData.positions, vertexData.indices, vertexData.normals);
      vertexData.applyToMesh(customMesh);

      const c = geom.color ?? { x: 0.75, y: 0.75, z: 0.75, w: 1 };
      const mat = new BABYLON.StandardMaterial(`ifc-mat-${geom.geometryExpressID}`, scene);
      mat.diffuseColor = new BABYLON.Color3(c.x, c.y, c.z);
      mat.alpha = c.w ?? 1;
      customMesh.material = mat;

      const node = new BABYLON.TransformNode(`ifc-node-${geom.geometryExpressID}`, scene);
      const m = BABYLON.Matrix.FromArray(geom.flatTransformation);
      const scl = new BABYLON.Vector3();
      const rot = new BABYLON.Quaternion();
      const pos = new BABYLON.Vector3();
      m.decompose(scl, rot, pos);
      node.scaling.copyFrom(scl);
      node.rotationQuaternion = rot.clone();
      node.position.copyFrom(pos);
      customMesh.parent = node;
      node.parent = ifcRoot;
      meshCount++;
    });
  });

  placeholderMesh.setEnabled(meshCount === 0);
  return meshCount === 0
    ? "IFC opened but no tessellated geometry was returned; showing the 6 ft placeholder."
    : `IFC loaded: ${meshCount} mesh(es). The placeholder box is hidden.`;
}

export function dispose() {
  if (resizeHandler) {
    window.removeEventListener("resize", resizeHandler);
    resizeHandler = null;
  }
  if (xrExperience) {
    try {
      xrExperience.dispose();
    } catch {
      // ignore
    }
    xrExperience = null;
  }
  if (ifcModelId !== null && ifcApi) {
    try {
      ifcApi.CloseModel(ifcModelId);
    } catch {
      // ignore
    }
    ifcModelId = null;
  }
  scene?.dispose();
  engine?.dispose();
  scene = null;
  engine = null;
  placeholderMesh = null;
  contentRoot = null;
  ifcRoot = null;
  ifcApi = null;
}
