// 分子结构模板 - 单个分子的3D展示
import type { SceneTemplate, MoleculeParams } from '../types.js';
import { findMolecule } from './_shared/coordinates.js';
import { pageShell, buildMoleculeScript, getColorScheme } from './_shared/boilerplate.js';

export const moleculeTemplate: SceneTemplate = {
  id: 'molecule-3d',
  name: '分子结构3D',
  description: '展示单个分子的三维结构，支持旋转、缩放、原子标注、键长显示',
  applicableKeywords: [
    '分子', '结构', '甲烷', '乙烷', '乙烯', '乙炔', '苯', '水', '二氧化碳',
    '氨', '乙醇', '葡萄糖', '氯化钠', 'sp3', 'sp2', '杂化', '键角', '键长',
    'molecule', 'methane', 'ethane', 'ethene', 'benzene', 'water', 'ammonia',
  ],

  render: (params: MoleculeParams): string => {
    const colors = getColorScheme(params.colorScheme);

    let atoms = params.atoms || [];
    let bonds = params.bonds || [];

    // 如果传入的原子为空，尝试从预置库查找
    if (atoms.length === 0 && params.title) {
      const mol = findMolecule(params.title);
      if (mol) {
        atoms = mol.atoms;
        bonds = mol.bonds;
      }
    }

    const bodyScript = buildMoleculeScript(atoms, bonds, colors, {
      showLabels: params.showLabels ?? true,
      showBondLength: params.showBondLength ?? false,
    });

    // 添加控制按钮
    const controlsScript = `
${bodyScript}

// 控制按钮
const controlsDiv = document.getElementById('controls');
const btnRotate = document.createElement('button');
btnRotate.textContent = '自动旋转';
btnRotate.onclick = () => {
  controls.autoRotate = !controls.autoRotate;
  controls.autoRotateSpeed = 2;
  btnRotate.classList.toggle('active');
};
controlsDiv.appendChild(btnRotate);

const btnLabels = document.createElement('button');
btnLabels.textContent = '标签';
btnLabels.classList.add('active');
btnLabels.onclick = () => {
  labelSprites.forEach(s => s.visible = !s.visible);
  btnLabels.classList.toggle('active');
};
controlsDiv.appendChild(btnLabels);

const btnReset = document.createElement('button');
btnReset.textContent = '重置视角';
btnReset.onclick = () => centerCamera();
controlsDiv.appendChild(btnReset);
`;

    return pageShell(
      params.title,
      params.description || '可交互的3D分子结构模型，拖动旋转查看立体构型。',
      controlsScript,
      params.language || 'zh'
    );
  },
};
