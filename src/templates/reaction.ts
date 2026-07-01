// 化学反应模板 - 多步反应过程的3D动画展示
import type { SceneTemplate, ReactionParams, Atom, Bond } from '../types/index.js';
import { pageShell, getColorScheme, CPK_COLORS, ATOM_RADII } from './_shared/boilerplate.js';

export const reactionTemplate: SceneTemplate = {
  id: 'reaction-3d',
  name: '化学反应3D',
  description: '展示化学反应过程，多步骤动画播放反应物到产物的变化',
  applicableKeywords: [
    '反应', '化学方程式', '燃烧', '化合', '分解', '置换', '复分解',
    '氧化', '还原', '反应过程', '反应物', '生成物', 'reaction', 'combustion',
  ],

  render: (params: ReactionParams): string => {
    const colors = getColorScheme(params.colorScheme);
    const stepsJson = JSON.stringify(params.steps.map(s => ({
      label: s.label,
      atoms: s.atoms.map(a => ({ element: a.element, position: a.position, label: a.label || a.element })),
      bonds: s.bonds,
    })));
    const colorsJson = JSON.stringify(Object.fromEntries(
      Object.entries(colors).map(([k, v]) => [k, '#' + v.toString(16).padStart(6, '0')])
    ));
    const radiiJson = JSON.stringify(ATOM_RADII);

    const bodyScript = `
const steps = ${stepsJson};
const colors = ${colorsJson};
const radii = ${radiiJson};
let currentStep = 0;
let scene, camera, renderer, controls;
let moleculeGroup;
let stepModels = [];

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

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5, 10, 7);
  scene.add(dir);

  const grid = new THREE.GridHelper(20, 20, 0xdddddd, 0xeeeeee);
  grid.position.y = -3;
  scene.add(grid);

  // 预构建所有步骤的模型
  steps.forEach((step) => {
    const group = new THREE.Group();
    step.atoms.forEach((atom) => {
      const radius = (radii[atom.element] || 0.6) * 0.5;
      const color = colors[atom.element] || '#888888';
      const geo = new THREE.SphereGeometry(radius, 32, 32);
      const mat = new THREE.MeshPhongMaterial({ color: color, shininess: 60 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(atom.position[0], atom.position[1], atom.position[2]);
      group.add(mesh);
      // 标签
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(0, 0, 128, 64);
      ctx.fillStyle = '#222';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(atom.label, 64, 32);
      const tex = new THREE.CanvasTexture(canvas);
      const sprMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
      const spr = new THREE.Sprite(sprMat);
      spr.position.set(atom.position[0], atom.position[1] + radius + 0.4, atom.position[2]);
      spr.scale.set(0.6, 0.3, 1);
      group.add(spr);
    });
    step.bonds.forEach((bond) => {
      const a = step.atoms[bond.from].position;
      const b = step.atoms[bond.to].position;
      const bc = colors[step.atoms[bond.from].element] || '#888888';
      const aV = new THREE.Vector3(a[0],a[1],a[2]);
      const bV = new THREE.Vector3(b[0],b[1],b[2]);
      const dir2 = new THREE.Vector3().subVectors(bV, aV);
      const len = dir2.length();
      const mid = new THREE.Vector3().addVectors(aV, bV).multiplyScalar(0.5);
      const offsets = bond.type === 'single' ? [[0,0,0]] : bond.type === 'double' ? [[0,0,0],[0.08,0,0]] : [[0,0,0],[0.08,0,0],[0,0.08,0]];
      offsets.forEach(([ox,oy,oz]) => {
        const geo = new THREE.CylinderGeometry(0.05, 0.05, len, 16);
        const mat = new THREE.MeshPhongMaterial({ color: bc });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(mid.x+ox, mid.y+oy, mid.z+oz);
        mesh.lookAt(bV);
        mesh.rotateX(Math.PI / 2);
        group.add(mesh);
      });
    });
    stepModels.push(group);
  });

  showStep(0);
  centerCamera();
  animate();
  document.getElementById('loading').classList.add('hidden');
}

function showStep(idx) {
  if (moleculeGroup) scene.remove(moleculeGroup);
  moleculeGroup = stepModels[idx];
  scene.add(moleculeGroup);
  currentStep = idx;
  const label = steps[idx].label;
  const panel = document.querySelector('#info-panel p');
  if (panel) panel.textContent = '步骤 ' + (idx + 1) + '/' + steps.length + '：' + label;
}

function centerCamera() {
  if (!moleculeGroup) return;
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

// 控制
const controlsDiv = document.getElementById('controls');
const btnPrev = document.createElement('button');
btnPrev.textContent = '上一步';
btnPrev.onclick = () => { if (currentStep > 0) showStep(currentStep - 1); };
controlsDiv.appendChild(btnPrev);

const btnPlay = document.createElement('button');
btnPlay.textContent = '播放动画';
let playing = false;
let playTimer = null;
btnPlay.onclick = () => {
  playing = !playing;
  btnPlay.classList.toggle('active');
  if (playing) {
    playTimer = setInterval(() => {
      let next = currentStep + 1;
      if (next >= steps.length) next = 0;
      showStep(next);
    }, 2000);
  } else {
    clearInterval(playTimer);
  }
};
controlsDiv.appendChild(btnPlay);

const btnNext = document.createElement('button');
btnNext.textContent = '下一步';
btnNext.onclick = () => { if (currentStep < steps.length - 1) showStep(currentStep + 1); };
controlsDiv.appendChild(btnNext);

const btnReset = document.createElement('button');
btnReset.textContent = '重置视角';
btnReset.onclick = () => centerCamera();
controlsDiv.appendChild(btnReset);
`;

    return pageShell(
      params.title,
      params.description || '展示化学反应过程，点击按钮查看各步骤。',
      bodyScript,
      params.language || 'zh'
    );
  },
};
