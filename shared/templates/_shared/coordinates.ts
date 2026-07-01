// 预置原子坐标库 - 常见分子
// 坐标单位为 Angstrom，经简化的理想几何坐标
import type { Atom, Bond } from '../../types.js';

interface MoleculeData {
  name: string;
  aliases: string[];
  atoms: Atom[];
  bonds: Bond[];
}

// 辅助：生成正四面体顶点
function tetrahedron(center: [number, number, number], r: number): [number, number, number][] {
  const [cx, cy, cz] = center;
  return [
    [cx, cy + r, cz],
    [cx + r * 0.943, cy - r * 0.333, cz + r * 0.471],
    [cx - r * 0.943, cy - r * 0.333, cz + r * 0.471],
    [cx, cy - r * 0.333, cz - r * 0.943],
  ];
}

// 甲烷 CH4 - 正四面体
const methane: MoleculeData = {
  name: '甲烷',
  aliases: ['methane', 'ch4'],
  atoms: (() => {
    const verts = tetrahedron([0, 0, 0], 1.09);
    return [
      { element: 'C', position: [0, 0, 0], label: 'C' },
      ...verts.map((v, i) => ({ element: 'H', position: v, label: `H${i+1}` })),
    ];
  })(),
  bonds: [0, 1, 2, 3].map(i => ({ from: 0, to: i + 1, type: 'single' as const })),
};

// 乙烷 C2H6
const ethane: MoleculeData = {
  name: '乙烷',
  aliases: ['ethane', 'c2h6'],
  atoms: [
    { element: 'C', position: [-0.77, 0, 0], label: 'C1' },
    { element: 'C', position: [0.77, 0, 0], label: 'C2' },
    { element: 'H', position: [-1.16, 0.89, 0.51], label: 'H1' },
    { element: 'H', position: [-1.16, -0.89, 0.51], label: 'H2' },
    { element: 'H', position: [-1.16, 0, -1.03], label: 'H3' },
    { element: 'H', position: [1.16, 0.89, -0.51], label: 'H4' },
    { element: 'H', position: [1.16, -0.89, -0.51], label: 'H5' },
    { element: 'H', position: [1.16, 0, 1.03], label: 'H6' },
  ],
  bonds: [
    { from: 0, to: 1, type: 'single' },
    { from: 0, to: 2, type: 'single' },
    { from: 0, to: 3, type: 'single' },
    { from: 0, to: 4, type: 'single' },
    { from: 1, to: 5, type: 'single' },
    { from: 1, to: 6, type: 'single' },
    { from: 1, to: 7, type: 'single' },
  ],
};

// 乙烯 C2H4 - 平面，双键
const ethylene: MoleculeData = {
  name: '乙烯',
  aliases: ['ethylene', 'ethene', 'c2h4'],
  atoms: [
    { element: 'C', position: [-0.67, 0, 0], label: 'C1' },
    { element: 'C', position: [0.67, 0, 0], label: 'C2' },
    { element: 'H', position: [-1.23, 0.94, 0], label: 'H1' },
    { element: 'H', position: [-1.23, -0.94, 0], label: 'H2' },
    { element: 'H', position: [1.23, 0.94, 0], label: 'H3' },
    { element: 'H', position: [1.23, -0.94, 0], label: 'H4' },
  ],
  bonds: [
    { from: 0, to: 1, type: 'double' },
    { from: 0, to: 2, type: 'single' },
    { from: 0, to: 3, type: 'single' },
    { from: 1, to: 4, type: 'single' },
    { from: 1, to: 5, type: 'single' },
  ],
};

// 乙炔 C2H2 - 直线，三键
const acetylene: MoleculeData = {
  name: '乙炔',
  aliases: ['acetylene', 'ethyne', 'c2h2'],
  atoms: [
    { element: 'C', position: [-0.6, 0, 0], label: 'C1' },
    { element: 'C', position: [0.6, 0, 0], label: 'C2' },
    { element: 'H', position: [-1.66, 0, 0], label: 'H1' },
    { element: 'H', position: [1.66, 0, 0], label: 'H2' },
  ],
  bonds: [
    { from: 0, to: 1, type: 'triple' },
    { from: 0, to: 2, type: 'single' },
    { from: 1, to: 3, type: 'single' },
  ],
};

// 苯 C6H6 - 正六边形
const benzene: MoleculeData = {
  name: '苯',
  aliases: ['benzene', 'c6h6'],
  atoms: (() => {
    const atoms: Atom[] = [];
    const r = 1.4;
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60 - 30) * Math.PI / 180;
      atoms.push({ element: 'C', position: [r * Math.cos(angle), r * Math.sin(angle), 0], label: `C${i+1}` });
    }
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60 - 30) * Math.PI / 180;
      atoms.push({ element: 'H', position: [2.49 * Math.cos(angle), 2.49 * Math.sin(angle), 0], label: `H${i+1}` });
    }
    return atoms;
  })(),
  bonds: (() => {
    const bonds: Bond[] = [];
    // 碳环交替单双键
    for (let i = 0; i < 6; i++) {
      bonds.push({ from: i, to: (i + 1) % 6, type: i % 2 === 0 ? 'double' : 'single' });
    }
    // C-H 键
    for (let i = 0; i < 6; i++) {
      bonds.push({ from: i, to: i + 6, type: 'single' });
    }
    return bonds;
  })(),
};

// 水 H2O
const water: MoleculeData = {
  name: '水',
  aliases: ['water', 'h2o', '氧化氢'],
  atoms: [
    { element: 'O', position: [0, 0, 0], label: 'O' },
    { element: 'H', position: [0.76, 0.59, 0], label: 'H1' },
    { element: 'H', position: [-0.76, 0.59, 0], label: 'H2' },
  ],
  bonds: [
    { from: 0, to: 1, type: 'single' },
    { from: 0, to: 2, type: 'single' },
  ],
};

// 二氧化碳 CO2 - 直线
const co2: MoleculeData = {
  name: '二氧化碳',
  aliases: ['carbon dioxide', 'co2', '二氧化碳'],
  atoms: [
    { element: 'C', position: [0, 0, 0], label: 'C' },
    { element: 'O', position: [1.16, 0, 0], label: 'O1' },
    { element: 'O', position: [-1.16, 0, 0], label: 'O2' },
  ],
  bonds: [
    { from: 0, to: 1, type: 'double' },
    { from: 0, to: 2, type: 'double' },
  ],
};

// 氨气 NH3 - 三角锥
const ammonia: MoleculeData = {
  name: '氨气',
  aliases: ['ammonia', 'nh3', '氨'],
  atoms: [
    { element: 'N', position: [0, 0.21, 0], label: 'N' },
    { element: 'H', position: [0.94, -0.37, 0.54], label: 'H1' },
    { element: 'H', position: [-0.94, -0.37, 0.54], label: 'H2' },
    { element: 'H', position: [0, -0.37, -1.08], label: 'H3' },
  ],
  bonds: [
    { from: 0, to: 1, type: 'single' },
    { from: 0, to: 2, type: 'single' },
    { from: 0, to: 3, type: 'single' },
  ],
};

// 乙醇 C2H5OH
const ethanol: MoleculeData = {
  name: '乙醇',
  aliases: ['ethanol', '酒精', 'c2h5oh', 'alcohol'],
  atoms: [
    { element: 'C', position: [-1.25, -0.16, 0], label: 'C1' },
    { element: 'C', position: [0, 0.67, 0], label: 'C2' },
    { element: 'O', position: [1.13, -0.21, 0], label: 'O' },
    { element: 'H', position: [1.93, 0.38, 0], label: 'H' },
    { element: 'H', position: [-1.4, -0.8, 0.89], label: 'H1' },
    { element: 'H', position: [-1.4, -0.8, -0.89], label: 'H2' },
    { element: 'H', position: [-2.1, 0.52, 0], label: 'H3' },
    { element: 'H', position: [0.05, 1.31, 0.89], label: 'H4' },
    { element: 'H', position: [0.05, 1.31, -0.89], label: 'H5' },
  ],
  bonds: [
    { from: 0, to: 1, type: 'single' },
    { from: 1, to: 2, type: 'single' },
    { from: 2, to: 3, type: 'single' },
    { from: 0, to: 4, type: 'single' },
    { from: 0, to: 5, type: 'single' },
    { from: 0, to: 6, type: 'single' },
    { from: 1, to: 7, type: 'single' },
    { from: 1, to: 8, type: 'single' },
  ],
};

// 氯化钠 NaCl (离子晶体示意，单胞)
const nacl: MoleculeData = {
  name: '氯化钠',
  aliases: ['氯化钠', 'nacl', 'salt', '食盐'],
  atoms: [
    { element: 'Na', position: [0, 0, 0], label: 'Na+' },
    { element: 'Cl', position: [1.41, 0, 0], label: 'Cl-' },
    { element: 'Na', position: [2.82, 0, 0], label: 'Na+' },
    { element: 'Cl', position: [0, 1.41, 0], label: 'Cl-' },
    { element: 'Na', position: [1.41, 1.41, 0], label: 'Na+' },
    { element: 'Cl', position: [2.82, 1.41, 0], label: 'Cl-' },
    { element: 'Na', position: [0, 2.82, 0], label: 'Na+' },
    { element: 'Cl', position: [1.41, 2.82, 0], label: 'Cl-' },
    { element: 'Na', position: [2.82, 2.82, 0], label: 'Na+' },
  ],
  bonds: [],
};

// 葡萄糖 C6H12O6 (简化开链)
const glucose: MoleculeData = {
  name: '葡萄糖',
  aliases: ['glucose', '葡萄糖', '糖'],
  atoms: [
    { element: 'C', position: [-3.0, 0, 0], label: 'C1' },
    { element: 'C', position: [-1.8, 0.7, 0], label: 'C2' },
    { element: 'C', position: [-0.6, 0, 0], label: 'C3' },
    { element: 'C', position: [0.6, 0.7, 0], label: 'C4' },
    { element: 'C', position: [1.8, 0, 0], label: 'C5' },
    { element: 'C', position: [3.0, 0.7, 0], label: 'C6' },
    { element: 'O', position: [-4.2, 0.7, 0], label: 'O1' },
    { element: 'O', position: [-1.8, 2.1, 0], label: 'O2' },
    { element: 'O', position: [-0.6, -1.4, 0], label: 'O3' },
    { element: 'O', position: [0.6, 2.1, 0], label: 'O4' },
    { element: 'O', position: [1.8, -1.4, 0], label: 'O5' },
    { element: 'O', position: [4.2, 0, 0], label: 'O6' },
  ],
  bonds: [
    { from: 0, to: 1, type: 'single' },
    { from: 1, to: 2, type: 'single' },
    { from: 2, to: 3, type: 'single' },
    { from: 3, to: 4, type: 'single' },
    { from: 4, to: 5, type: 'single' },
    { from: 0, to: 6, type: 'double' },
    { from: 1, to: 7, type: 'single' },
    { from: 2, to: 8, type: 'single' },
    { from: 3, to: 9, type: 'single' },
    { from: 4, to: 10, type: 'single' },
    { from: 5, to: 11, type: 'single' },
  ],
};

export const moleculeDatabase: MoleculeData[] = [
  methane, ethane, ethylene, acetylene, benzene,
  water, co2, ammonia, ethanol, nacl, glucose,
];

export function findMolecule(query: string): MoleculeData | null {
  const q = query.toLowerCase().trim();
  for (const mol of moleculeDatabase) {
    if (mol.name === query) return mol;
    if (mol.aliases.some(a => a.toLowerCase() === q)) return mol;
    if (mol.aliases.some(a => q.includes(a.toLowerCase()))) return mol;
  }
  return null;
}

export function listMoleculeNames(): string[] {
  return moleculeDatabase.map(m => m.name);
}
