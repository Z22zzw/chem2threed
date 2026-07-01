// Three.js 公共代码片段 - 生成页面用的 HTML/CSS/JS 基础框架
import type { Atom } from '../../types.js';

// CPK 配色 (Corey-Pauling-Koltun)
export const CPK_COLORS: Record<string, number> = {
  H: 0xffffff,
  C: 0x303030,
  N: 0x3050f8,
  O: 0xff0d0d,
  F: 0x90e050,
  Na: 0xab5cf2,
  Mg: 0x8aff00,
  P: 0xff8000,
  S: 0xffff30,
  Cl: 0x1ff01f,
  K: 0x8f40d4,
  Ca: 0x3dff00,
  Fe: 0xe06633,
  Cu: 0xc88033,
  Zn: 0x7d80b0,
  Br: 0xa62929,
  I: 0x940094,
};

// 软色调配色
export const SOFT_COLORS: Record<string, number> = {
  H: 0xf0f0f0,
  C: 0x555555,
  N: 0x4a6cf7,
  O: 0xff6b6b,
  Na: 0xb88cf7,
  P: 0xffa94d,
  S: 0xffd93d,
  Cl: 0x6bcb77,
};

// 高对比度配色
export const HIGH_CONTRAST_COLORS: Record<string, number> = {
  H: 0xffffff,
  C: 0x000000,
  N: 0x0000ff,
  O: 0xff0000,
  Na: 0xaa00ff,
  P: 0xff8800,
  S: 0xffff00,
  Cl: 0x00cc00,
};

export function getColorScheme(scheme: string): Record<string, number> {
  if (scheme === 'soft') return SOFT_COLORS;
  if (scheme === 'highContrast') return HIGH_CONTRAST_COLORS;
  return CPK_COLORS;
}

// 原子半径 (Angstrom, 显示用放大值)
export const ATOM_RADII: Record<string, number> = {
  H: 0.35,
  C: 0.7,
  N: 0.65,
  O: 0.6,
  F: 0.5,
  Na: 1.0,
  Mg: 1.1,
  P: 1.0,
  S: 1.0,
  Cl: 1.0,
  K: 1.4,
  Ca: 1.4,
  Fe: 1.2,
  Cu: 1.2,
  Zn: 1.2,
  Br: 1.15,
  I: 1.3,
};

// Three.js 页面 HTML 外壳模板
export function pageShell(title: string, description: string, bodyScript: string, language: 'zh' | 'en' = 'zh'): string {
  const titleLang = language === 'zh' ? '化学3D教学模型' : 'Chemistry 3D Model';
  const loadingLang = language === 'zh' ? '加载中...' : 'Loading...';
  const hintLang = language === 'zh' ? '鼠标拖动旋转 · 滚轮缩放 · 右键平移' : 'Drag to rotate · Scroll to zoom · Right-click to pan';

  return `<!DOCTYPE html>
<html lang="${language === 'zh' ? 'zh-CN' : 'en'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} - ${titleLang}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; }
  #canvas-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; }
  #info-panel { position: fixed; top: 16px; left: 16px; background: rgba(255,255,255,0.92); backdrop-filter: blur(8px); border-radius: 12px; padding: 16px 20px; max-width: 340px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); z-index: 10; }
  #info-panel h1 { font-size: 18px; font-weight: 600; color: #1a1a1a; margin-bottom: 6px; }
  #info-panel p { font-size: 13px; color: #555; line-height: 1.5; }
  #controls { position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; background: rgba(255,255,255,0.92); backdrop-filter: blur(8px); border-radius: 24px; padding: 8px 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); z-index: 10; }
  #controls button { border: none; background: #f0f0f0; color: #333; padding: 6px 14px; border-radius: 16px; font-size: 13px; cursor: pointer; transition: all 0.2s; }
  #controls button:hover { background: #e0e0e0; }
  #controls button.active { background: #2563eb; color: white; }
  #hint { position: fixed; bottom: 56px; left: 50%; transform: translateX(-50%); font-size: 12px; color: #888; z-index: 10; }
  #loading { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); font-size: 15px; color: #666; z-index: 20; }
  #loading.hidden { display: none; }
</style>
</head>
<body>
<div id="canvas-container"></div>
<div id="loading">${loadingLang}</div>
<div id="info-panel">
  <h1>${title}</h1>
  <p>${description}</p>
</div>
<div id="hint">${hintLang}</div>
<div id="controls"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
<script>
${bodyScript}
</script>
</body>
</html>`;
}

// 生成原子球体和键的 Three.js 代码
export function buildMoleculeScript(atoms: Atom[], bonds: any[], colorScheme: Record<string, number>, options: { showLabels: boolean; showBondLength: boolean }): string {
  const atomsJson = JSON.stringify(atoms.map(a => ({ element: a.element, position: a.position, label: a.label || a.element })));
  const bondsJson = JSON.stringify(bonds);
  const colorsJson = JSON.stringify(Object.fromEntries(
    Object.entries(colorScheme).map(([k, v]) => [k, '#' + v.toString(16).padStart(6, '0')])
  ));
  const radiiJson = JSON.stringify(ATOM_RADII);

  return `
const atoms = ${atomsJson};
const bonds = ${bondsJson};
const colors = ${colorsJson};
const radii = ${radiiJson};
const showLabels = ${options.showLabels};
const showBondLength = ${options.showBondLength};

let scene, camera, renderer, controls;
let moleculeGroup;
let labelSprites = [];

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f5f7);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.getElementById('canvas-container').appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  // 灯光
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);
  const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
  dirLight2.position.set(-5, -3, -5);
  scene.add(dirLight2);

  // 网格
  const grid = new THREE.GridHelper(20, 20, 0xdddddd, 0xeeeeee);
  grid.position.y = -3;
  scene.add(grid);

  buildMolecule();
  centerCamera();
  animate();

  document.getElementById('loading').classList.add('hidden');
}

function buildMolecule() {
  moleculeGroup = new THREE.Group();

  atoms.forEach((atom) => {
    const radius = (radii[atom.element] || 0.6) * 0.5;
    const color = colors[atom.element] || '#888888';
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshPhongMaterial({ color: color, shininess: 60 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(atom.position[0], atom.position[1], atom.position[2]);
    moleculeGroup.add(mesh);

    if (showLabels && atom.label) {
      const sprite = makeLabel(atom.label, atom.position, radius);
      labelSprites.push(sprite);
      moleculeGroup.add(sprite);
    }
  });

  bonds.forEach((bond) => {
    const a = atoms[bond.from].position;
    const b = atoms[bond.to].position;
    const bondColor = colors[atoms[bond.from].element] || '#888888';
    drawBond(a, b, bond.type, bondColor);
    if (showBondLength) {
      const mid = [(a[0]+b[0])/2, (a[1]+b[1])/2, (a[2]+b[2])/2];
      const dist = Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2);
      const sprite = makeLabel(dist.toFixed(2) + ' Å', mid, 0);
      moleculeGroup.add(sprite);
    }
  });

  scene.add(moleculeGroup);
}

function drawBond(a, b, type, color) {
  const aVec = new THREE.Vector3(a[0], a[1], a[2]);
  const bVec = new THREE.Vector3(b[0], b[1], b[2]);
  const dir = new THREE.Vector3().subVectors(bVec, aVec);
  const length = dir.length();
  const mid = new THREE.Vector3().addVectors(aVec, bVec).multiplyScalar(0.5);

  const offsets = type === 'single' ? [[0,0,0]]
    : type === 'double' ? [[0,0,0],[0.08,0,0]]
    : [[0,0,0],[0.08,0,0],[0,0.08,0]];

  offsets.forEach(([ox, oy, oz]) => {
    const geometry = new THREE.CylinderGeometry(0.05, 0.05, length, 16);
    const material = new THREE.MeshPhongMaterial({ color: color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(mid.x + ox, mid.y + oy, mid.z + oz);
    mesh.lookAt(bVec);
    mesh.rotateX(Math.PI / 2);
    moleculeGroup.add(mesh);
  });
}

function makeLabel(text, position, offset) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(0, 0, 128, 64);
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 128, 64);
  ctx.fillStyle = '#222';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.position.set(position[0], position[1] + offset + 0.4, position[2]);
  sprite.scale.set(0.6, 0.3, 1);
  return sprite;
}

function centerCamera() {
  const box = new THREE.Box3().setFromObject(moleculeGroup);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  let distance = maxDim / 2 / Math.tan(fov / 2);
  distance = Math.max(distance, 4) * 1.6;

  camera.position.set(center.x + distance * 0.5, center.y + distance * 0.4, center.z + distance);
  camera.lookAt(center);
  controls.target.copy(center);
  controls.update();
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

init();
`;
}
