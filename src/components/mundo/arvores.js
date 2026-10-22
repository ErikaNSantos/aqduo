import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Árvores do cerrado espalhadas pelo relevo, em duas formas:
// cerrado aberto nos platôs (árvores baixas, tortas, de copa achatada) e
// mata de galeria nos fundos de vale (copas mais altas, escuras e juntas).
// A escala é exagerada como o relevo: de longe precisam aparecer como textura.

function pintar(geo, cor) {
  const c = new THREE.Color(cor);
  const n = geo.attributes.position.count;
  const cores = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) cores.set([c.r, c.g, c.b], i * 3);
  geo.setAttribute("color", new THREE.BufferAttribute(cores, 3));
  return geo;
}

function copa(raio, achatar, semente) {
  const geo = new THREE.IcosahedronGeometry(raio, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 0.8 + 0.4 * Math.abs(Math.sin(i * 12.9898 + semente * 78.233));
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * achatar, p.getZ(i) * k);
  }
  return geo;
}

function arvoreCerrado() {
  const tronco = new THREE.CylinderGeometry(0.06, 0.1, 1, 4, 1, true);
  tronco.translate(0, 0.5, 0);
  tronco.rotateZ(0.18); // tronco torto
  const c1 = copa(0.55, 0.45, 1);
  c1.translate(0.2, 1.05, 0);
  const c2 = copa(0.38, 0.5, 2);
  c2.translate(-0.15, 0.95, 0.2);
  const partes = [pintar(tronco.toNonIndexed(), "#4a3a2a"), pintar(c1.toNonIndexed(), "#73833d"), pintar(c2.toNonIndexed(), "#859044")];
  const geo = mergeGeometries(partes.map((g) => (g.deleteAttribute("uv"), g)));
  geo.computeVertexNormals();
  return geo;
}

function arvoreMata() {
  const tronco = new THREE.CylinderGeometry(0.05, 0.08, 1.2, 4, 1, true);
  tronco.translate(0, 0.6, 0);
  const c1 = copa(0.6, 0.9, 3);
  c1.translate(0, 1.5, 0);
  const partes = [pintar(tronco.toNonIndexed(), "#3b2f24"), pintar(c1.toNonIndexed(), "#3d5c34")];
  const geo = mergeGeometries(partes.map((g) => (g.deleteAttribute("uv"), g)));
  geo.computeVertexNormals();
  return geo;
}

/**
 * relevo: { altura(x, z), brilho(x, z) }, em km
 * area: lado do terreno; centro: Vector3 do impacto (sem árvores perto dele)
 */
export function criarArvores({ relevo, area, centro, quantidade }) {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true });
  const geoCerrado = arvoreCerrado();
  const geoMata = arvoreMata();
  const cerrado = new THREE.InstancedMesh(geoCerrado, material, quantidade);
  const mata = new THREE.InstancedMesh(geoMata, material, Math.round(quantidade * 0.8));
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const eixo = new THREE.Vector3(0, 1, 0);
  const tom = new THREE.Color();
  let nc = 0;
  let nm = 0;
  const metade = area / 2 - 0.3;
  const d = 0.08;

  for (let k = 0; k < quantidade * 12 && (nc < cerrado.count || nm < mata.count); k++) {
    const x = (Math.random() * 2 - 1) * metade;
    const z = (Math.random() * 2 - 1) * metade;
    if (Math.hypot(x - centro.x, z - centro.z) < 2.2 || relevo.brilho(x, z) > 0.05) continue;
    const h = relevo.altura(x, z);
    const inclin = Math.hypot(relevo.altura(x + d, z) - relevo.altura(x - d, z), relevo.altura(x, z + d) - relevo.altura(x, z - d)) / (2 * d);
    if (inclin > 0.9) continue; // paredão: sem árvore
    let media = 0;
    for (let a = 0; a < 6; a++) media += relevo.altura(x + Math.cos(a) * 0.5, z + Math.sin(a) * 0.5);
    const vale = h - media / 6 < -0.06;
    const alvo = vale ? mata : cerrado;
    if (vale ? nm >= mata.count : nc >= cerrado.count || Math.random() > 0.45 * (1 - inclin)) continue;
    const tam = vale ? 0.09 + Math.random() * 0.07 : 0.06 + Math.random() * 0.06;
    p.set(x, h - tam * 0.1, z);
    q.setFromAxisAngle(eixo, Math.random() * Math.PI * 2);
    s.set(tam, tam * (0.8 + Math.random() * 0.4), tam);
    m.compose(p, q, s);
    const i = vale ? nm++ : nc++;
    alvo.setMatrixAt(i, m);
    tom.setHSL(0.18 + Math.random() * 0.08, 0.25 + Math.random() * 0.2, 0.75 + Math.random() * 0.35);
    alvo.setColorAt(i, tom);
  }
  cerrado.count = nc;
  mata.count = nm;
  const grupo = new THREE.Group();
  grupo.add(cerrado, mata);
  return {
    grupo,
    descartar() {
      geoCerrado.dispose();
      geoMata.dispose();
      material.dispose();
      cerrado.dispose();
      mata.dispose();
    },
  };
}
