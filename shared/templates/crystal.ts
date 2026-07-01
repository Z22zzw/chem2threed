// 晶体结构模板 - 展示晶体晶胞结构
import type { SceneTemplate } from '../types.js';
import { pageShell, CPK_COLORS, ATOM_RADII } from './_shared/boilerplate.js';

interface CrystalParams {
  title: string;
  description?: string;
  crystalType: 'nacl' | 'diamond' | 'simple-cubic' | 'bcc' | 'fcc';
  interactions: string[];
  language: 'zh' | 'en';
}

export const crystalTemplate: SceneTemplate = {
  id: 'crystal-3d',
  name: '晶体结构3D',
  description: '展示晶体晶胞结构，支持旋转、缩放、原子标注',
  applicableKeywords: [
    '晶体', '晶胞', '氯化钠晶体', '金刚石', '立方晶系', '晶格', '离子晶体',
    '原子晶体', '金属晶体', 'crystal', 'lattice', 'unit cell',
  ],

  render: (params: CrystalParams): string => {
    const a = 2.0; // 晶格常数

    let atoms: Array<{ element: string; position: [number, number, number]; label: string }> = [];
    let bonds: Array<{ from: number; to: number; type: 'single' }> = [];

    switch (params.crystalType) {
      case 'nacl':
        // NaCl 面心立方，8个角+6个面心交替
        for (let i = 0; i < 2; i++) {
          for (let j = 0; j < 2; j++) {
            for (let k = 0; k < 2; k++) {
              atoms.push({ element: i + j + k % 2 === 0 ? 'Na' : 'Cl', position: [i * a, j * a, k * a], label: i + j + k % 2 === 0 ? 'Na+' : 'Cl-' });
            }
          }
        }
        break;
      case 'diamond':
        // 金刚石 - 4个原子四面体排列
        atoms = [
          { element: 'C', position: [0, 0, 0], label: 'C' },
          { element: 'C', position: [a/2, a/2, 0], label: 'C' },
          { element: 'C', position: [a/2, 0, a/2], label: 'C' },
          { element: 'C', position: [0, a/2, a/2], label: 'C' },
          { element: 'C', position: [a/4, a/4, a/4], label: 'C' },
        ];
        bonds = [
          { from: 0, to: 4, type: 'single' },
          { from: 1, to: 4, type: 'single' },
          { from: 2, to: 4, type: 'single' },
          { from: 3, to: 4, type: 'single' },
        ];
        break;
      case 'simple-cubic':
        for (let i = 0; i < 2; i++)
          for (let j = 0; j < 2; j++)
            for (let k = 0; k < 2; k++)
              atoms.push({ element: 'Na', position: [i * a, j * a, k * a], label: 'M' });
        break;
      case 'bcc':
        atoms.push({ element: 'Na', position: [0, 0, 0], label: 'M' });
        atoms.push({ element: 'Na', position: [a, a, a], label: 'M' });
        atoms.push({ element: 'Na', position: [a, 0, 0], label: 'M' });
        atoms.push({ element: 'Na', position: [0, a, a], label: 'M' });
        break;
      case 'fcc':
        atoms.push({ element: 'Na', position: [0, 0, 0], label: 'M' });
        atoms.push({ element: 'Na', position: [a/2, a/2, 0], label: 'M' });
        atoms.push({ element: 'Na', position: [a/2, 0, a/2], label: 'M' });
        atoms.push({ element: 'Na', position: [0, a/2, a/2], label: 'M' });
        break;
    }

    const atomsJson = JSON.stringify(atoms);
    const bondsJson = JSON.stringify(bonds);
    const colorsJson = JSON.stringify(Object.fromEntries(
      Object.entries(CPK_COLORS).map(([k, v]) => [k, '#' + v.toString(16).padStart(6, '0')])
    ));

    const bodyScript = `
const atoms = ${atomsJson};
const bonds = ${bondsJson};
const colors = ${colorsJson};
const radii = ${JSON.stringify(ATOM_RADII)};
const a = ${a};

let scene, camera, renderer, controls;
let crystalGroup;

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

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5, 10, 7);
  scene.add(dir);

  buildCrystal();
  // 画晶胞边框
  const geo = new THREE.BoxGeometry(a, a, a);
  const edges = new THREE.EdgesGeometry(geo);
  const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x999999, linewidth: 1 }));
  line.position.set(a/2, a/2, a/2);
  scene.add(line);

  centerCamera();
  animate();
  document.getElementById('loading').classList.add('hidden');
}

function buildCrystal() {
  crystalGroup = new THREE.Group();
  atoms.forEach((atom) => {
    const radius = (radii[atom.element] || 0.6) * 0.4;
    const color = colors[atom.element] || '#888';
    const geo = new THREE.SphereGeometry(radius, 32, 32);
    const mat = new THREE.MeshPhongMaterial({ color: color, shininess: 60 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...atom.position);
    crystalGroup.add(mesh);
    // 标签
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(0,0,128,64);
    ctx.fillStyle = '#222';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(atom.label, 64, 32);
    const tex = new THREE.CanvasTexture(canvas);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    spr.position.set(atom.position[0], atom.position[1] + radius + 0.3, atom.position[2]);
    spr.scale.set(0.5, 0.25, 1);
    crystalGroup.add(spr);
  });
  bonds.forEach((bond) => {
    const aV = new THREE.Vector3(...atoms[bond.from].position);
    const bV = new THREE.Vector3(...atoms[bond.to].position);
    const len = aV.distanceTo(bV);
    const mid = new THREE.Vector3().addVectors(aV, bV).multiplyScalar(0.5);
    const geo = new THREE.CylinderGeometry(0.05, 0.05, len, 16);
    const mat = new THREE.MeshPhongMaterial({ color: '#555' });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(mid);
    mesh.lookAt(bV);
    mesh.rotateX(Math.PI / 2);
    crystalGroup.add(mesh);
  });
  scene.add(crystalGroup);
}

function centerCamera() {
  const box = new THREE.Box3().setFromObject(crystalGroup);
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

const controlsDiv = document.getElementById('controls');
const btnRotate = document.createElement('button');
btnRotate.textContent = '自动旋转';
btnRotate.onclick = () => { controls.autoRotate = !controls.autoRotate; controls.autoRotateSpeed = 2; btnRotate.classList.toggle('active'); };
controlsDiv.appendChild(btnRotate);
const btnReset = document.createElement('button');
btnReset.textContent = '重置视角';
btnReset.onclick = () => centerCamera();
controlsDiv.appendChild(btnReset);
`;

    return pageShell(
      params.title,
      params.description || '晶体晶胞结构模型，灰色线框为晶胞边界。',
      bodyScript,
      params.language || 'zh'
    );
  },
};
