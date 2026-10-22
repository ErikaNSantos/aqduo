import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import urlAltura from "../assets/terreno/altura.png";
import urlCor from "../assets/terreno/cor.jpg";
import urlBrilho from "../assets/terreno/brilho.png";
import urlEmblema from "../assets/emblema.png";

// ─────────────────────────────────────────────
// MUNDO 3D DA ABERTURA — o Terreno Suspenso do emblema
// Uma ilha flutuante cujo relevo sai de src/assets/terreno/altura.png, gerado a
// partir do emblema dos Scrips (scripts/gerar_terreno.py). O emblema brilha como
// Metrito no meio de um lago, e as escolas da Ordem são luzes nas montanhas.
// Rolar move a câmera; arrastar gira a ilha; clicar numa luz abre a escola.
// ─────────────────────────────────────────────

const NOITE = "#0a0f14";
const OURO = "#e8c96a";
const RAIO_ILHA = 9;
const ANEIS = [
  { r: 2.7, altura: 0.75, largura: 0.6, aberturas: 3, fase: 0.4 },
  { r: 4.9, altura: 1.0, largura: 0.7, aberturas: 4, fase: 1.7 },
  { r: 7.1, altura: 1.25, largura: 0.8, aberturas: 5, fase: 2.9 },
];

// Ruído de valor 2D, determinístico (a ilha sai sempre igual)
function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function ruido(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y) {
  let s = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < 5; i++) {
    s += amp * (ruido(x * f, y * f) * 2 - 1);
    f *= 2.03;
    amp *= 0.5;
  }
  return s;
}
const suave = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Altura do terreno: anéis com aberturas, cratera no centro e borda que cai. */
function altura(x, z) {
  const r = Math.hypot(x, z);
  const ang = Math.atan2(z, x);
  let h = 0.15 + fbm(x * 0.32, z * 0.32) * 0.55;
  for (const a of ANEIS) {
    const crista = Math.exp(-((r - a.r) ** 2) / (2 * a.largura ** 2));
    const abre = 0.25 + 0.75 * suave(-0.35, 0.45, Math.sin(ang * a.aberturas + a.fase) + fbm(x * 0.6, z * 0.6) * 0.6);
    h += crista * a.altura * abre * (0.85 + 0.3 * ruido(x * 1.3, z * 1.3));
  }
  h -= 1.1 * Math.exp(-(r * r) / (2 * 1.1 ** 2)); // cratera do impacto
  const borda = suave(RAIO_ILHA, RAIO_ILHA - 1.4, r);
  return h * borda - (1 - borda) * 0.6;
}

const NIVEL_AGUA = 0.33; // altura da imagem (0 a 1) que vira o nível do lago
const ESCALA_ALTURA = 5.5;

/** Lê as imagens do terreno e devolve funções de altura e brilho em coordenadas do mundo. */
function carregarRelevo() {
  const ler = (url) =>
    new Promise((ok, erro) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const px = ctx.getImageData(0, 0, c.width, c.height).data;
        const v = new Float32Array(c.width * c.height);
        for (let i = 0; i < v.length; i++) v[i] = px[i * 4] / 255;
        ok({ v, w: c.width, h: c.height });
      };
      img.onerror = erro;
      img.src = url;
    });
  const amostra = ({ v, w, h }, x, z) => {
    const u = Math.min(w - 1.001, Math.max(0, ((x / RAIO_ILHA + 1) / 2) * (w - 1)));
    const t = Math.min(h - 1.001, Math.max(0, ((z / RAIO_ILHA + 1) / 2) * (h - 1)));
    const x0 = Math.floor(u);
    const y0 = Math.floor(t);
    const fx = u - x0;
    const fy = t - y0;
    const a = v[y0 * w + x0];
    const b = v[y0 * w + x0 + 1];
    const c = v[(y0 + 1) * w + x0];
    const d = v[(y0 + 1) * w + x0 + 1];
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
  };
  return Promise.all([ler(urlAltura), ler(urlBrilho)]).then(([alt, bri]) => ({
    altura: (x, z) => (amostra(alt, x, z) - NIVEL_AGUA) * ESCALA_ALTURA,
    brilho: (x, z) => amostra(bri, x, z),
    imagens: true,
  }));
}

/** Malha radial da ilha, com cor por altura e inclinação. */
function malhaIlha(aneisMalha, setores, altura) {
  const pos = [];
  const cor = [];
  const idx = [];
  const uv = [];
  const rocha = new THREE.Color("#2b3d47");
  const pedraAlta = new THREE.Color("#6a8796");
  const musgo = new THREE.Color("#2c5244");
  const vale = new THREE.Color("#18252d");
  const c = new THREE.Color();
  for (let i = 0; i <= aneisMalha; i++) {
    const r = RAIO_ILHA * Math.pow(i / aneisMalha, 0.85);
    for (let j = 0; j < setores; j++) {
      const a = (j / setores) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const y = altura(x, z);
      pos.push(x, y, z);
      uv.push((x / RAIO_ILHA + 1) / 2, 1 - (z / RAIO_ILHA + 1) / 2);
      const inclin = Math.abs(altura(x + 0.08, z) - y) + Math.abs(altura(x, z + 0.08) - y);
      c.copy(vale).lerp(rocha, suave(-0.4, 0.3, y)).lerp(pedraAlta, suave(0.7, 1.5, y));
      if (inclin < 0.035 && y > 0.2) c.lerp(musgo, 0.55);
      cor.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < aneisMalha; i++) {
    for (let j = 0; j < setores; j++) {
      const a = i * setores + j;
      const b = i * setores + ((j + 1) % setores);
      const d = (i + 1) * setores + j;
      const e = (i + 1) * setores + ((j + 1) % setores);
      idx.push(a, b, d, b, e, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(cor, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** Base de rocha pendurada sob a ilha (é o que faz ela flutuar). */
function malhaBase(raio, fundo, semente, topo = -0.55) {
  const perfil = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const r = raio * (1 - Math.pow(t, 0.7)) + 0.15;
    perfil.push(new THREE.Vector2(r, topo - t * fundo));
  }
  const geo = new THREE.LatheGeometry(perfil, 96);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = fbm(v.x * 0.45 + semente, v.z * 0.45 + v.y * 0.3) * 0.9;
    const k = 1 + n * 0.35;
    p.setXYZ(i, v.x * k, v.y + n * 0.6, v.z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

function texturaBrilho() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.2, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Pontos de luz que cintilam (poeira de Metrito nos vales e brasas das escolas)
const matCintilante = (tamanho) =>
  new THREE.ShaderMaterial({
    uniforms: { tempo: { value: 0 }, tamanho: { value: tamanho }, escala: { value: 1 } },
    vertexShader: `
      uniform float tempo; uniform float tamanho; uniform float escala;
      attribute float fase; attribute vec3 cor; attribute float sobe;
      varying vec3 vCor; varying float vBrilho;
      void main() {
        vec3 p = position;
        float ciclo = fract(tempo * 0.12 * sobe + fase);
        p.y += sobe * ciclo * 2.2;
        vBrilho = (0.45 + 0.55 * sin(tempo * 2.0 + fase * 40.0)) * (sobe > 0.0 ? (1.0 - ciclo) : 1.0);
        vCor = cor;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = tamanho * escala / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vCor; varying float vBrilho;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        gl_FragColor = vec4(vCor * vBrilho, 1.0) * smoothstep(0.5, 0.0, d);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

// Som ambiente gerado no navegador: drone grave, vento filtrado e um sino distante
function criarSom() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx();
  const mestre = ctx.createGain();
  mestre.gain.value = 0;
  mestre.connect(ctx.destination);

  const filtro = ctx.createBiquadFilter();
  filtro.type = "lowpass";
  filtro.frequency.value = 520;
  filtro.connect(mestre);
  [55, 82.4, 110.2].forEach((f, i) => {
    const o = ctx.createOscillator();
    o.type = i === 2 ? "triangle" : "sine";
    o.frequency.value = f;
    o.detune.value = i * 4;
    const g = ctx.createGain();
    g.gain.value = [0.35, 0.22, 0.08][i];
    o.connect(g).connect(filtro);
    o.start();
  });

  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const vento = ctx.createBufferSource();
  vento.buffer = buf;
  vento.loop = true;
  const banda = ctx.createBiquadFilter();
  banda.type = "bandpass";
  banda.frequency.value = 380;
  banda.Q.value = 0.7;
  const gVento = ctx.createGain();
  gVento.gain.value = 0.05;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const gLfo = ctx.createGain();
  gLfo.gain.value = 0.035;
  lfo.connect(gLfo).connect(gVento.gain);
  vento.connect(banda).connect(gVento).connect(mestre);
  vento.start();
  lfo.start();

  let sinoTimer = 0;
  const sino = () => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = [440, 392, 523.25, 349.23][Math.floor(Math.random() * 4)];
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 4);
    o.connect(g).connect(mestre);
    o.start();
    o.stop(ctx.currentTime + 4.2);
    sinoTimer = setTimeout(sino, 7000 + Math.random() * 9000);
  };
  sinoTimer = setTimeout(sino, 3000);

  return {
    ligar(on) {
      if (ctx.state === "suspended") ctx.resume();
      mestre.gain.cancelScheduledValues(ctx.currentTime);
      mestre.gain.linearRampToValueAtTime(on ? 0.5 : 0, ctx.currentTime + 1.5);
    },
    fechar() {
      clearTimeout(sinoTimer);
      ctx.close();
    },
  };
}

export default function MundoOrdem({ escolas = [], onEscola, children }) {
  const secaoRef = useRef(null);
  const palcoRef = useRef(null);
  const rotuloRef = useRef(null);
  const mundoRef = useRef(null);
  const somRef = useRef(null);
  const [entrou, setEntrou] = useState(false);
  const [somLigado, setSomLigado] = useState(false);
  const [telaEstreita] = useState(() => window.innerWidth < 600);
  const aoEscolaRef = useRef(onEscola);
  useEffect(() => {
    aoEscolaRef.current = onEscola;
  }, [onEscola]);

  useEffect(() => {
    const palco = palcoRef.current;
    const secao = secaoRef.current;
    if (!palco || !secao) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch {
      return;
    }
    const reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const estreito = window.innerWidth < 700;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, estreito ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.style.display = "block";
    palco.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(NOITE);
    scene.fog = new THREE.FogExp2(NOITE, 0.024);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 300);
    const lixo = [];
    const g = (o) => (lixo.push(o), o);
    const brilho = g(texturaBrilho());

    // Luz: lua fria, céu e o Metrito dourado na cratera
    scene.add(new THREE.HemisphereLight("#7d9cc0", "#0b0f12", 1.1));
    const lua = new THREE.DirectionalLight("#a9c3de", 2.2);
    lua.position.set(-8, 14, -6);
    scene.add(lua);
    const metrito = new THREE.PointLight("#ffd98a", 12, 7, 1.8);
    metrito.position.set(0, 0.2, 0);
    scene.add(metrito);

    // A ilha (montada quando as imagens do terreno chegam) e as ilhas menores ao longe
    const ilha = new THREE.Group();
    scene.add(ilha);
    const matRocha = g(new THREE.MeshStandardMaterial({ color: "#24343c", roughness: 0.92, metalness: 0.05 }));
    const matBase = g(new THREE.MeshStandardMaterial({ color: "#141d22", roughness: 1, flatShading: true }));

    const satelites = [
      [-17, -2.5, -9, 1.6],
      [15, 1.5, -14, 1.2],
      [19, -4, 6, 2],
      [-14, 2.5, 13, 1.1],
      [3, -5, -22, 1.8],
    ];
    satelites.forEach(([x, y, z, s], i) => {
      const grupo = new THREE.Group();
      const topo = new THREE.Mesh(g(new THREE.CylinderGeometry(1, 0.9, 0.3, 24)), matRocha.clone());
      topo.material.vertexColors = false;
      topo.material.color.set("#24343c");
      g(topo.material);
      grupo.add(topo);
      grupo.add(new THREE.Mesh(g(malhaBase(1, 2.4, i * 7.7)), matBase));
      grupo.position.set(x, y, z);
      grupo.scale.setScalar(s);
      grupo.userData.fase = i;
      scene.add(grupo);
    });

    // Mar de nuvens embaixo
    const matNuvem = g(new THREE.SpriteMaterial({ map: brilho, color: "#4c6378", transparent: true, opacity: 0.16, depthWrite: false }));
    for (let i = 0; i < 26; i++) {
      const n = new THREE.Sprite(matNuvem);
      const a = Math.random() * Math.PI * 2;
      const r = 6 + Math.random() * 26;
      n.position.set(Math.cos(a) * r, -7 - Math.random() * 5, Math.sin(a) * r);
      n.scale.setScalar(10 + Math.random() * 14);
      scene.add(n);
    }

    // Terreno, lago, poeira de Metrito sobre o emblema e o brilho da estrela
    const matPoeira = g(matCintilante(26));
    const nucleo = new THREE.Sprite(g(new THREE.SpriteMaterial({ map: brilho, color: OURO, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
    nucleo.scale.setScalar(2.4);
    let matTerreno = null;
    let relevo = null;

    function montarTerreno(r) {
      relevo = r;
      const carregador = new THREE.TextureLoader();
      const cor = r.imagens ? g(carregador.load(urlCor)) : null;
      const luzEmblema = r.imagens ? g(carregador.load(urlBrilho)) : null;
      if (cor) cor.colorSpace = THREE.SRGBColorSpace;
      matTerreno = g(
        new THREE.MeshStandardMaterial({
          map: cor,
          vertexColors: !cor,
          emissive: "#c9952f",
          emissiveMap: luzEmblema,
          emissiveIntensity: luzEmblema ? 0.8 : 0,
          roughness: 0.9,
          metalness: 0.05,
        }),
      );
      ilha.add(new THREE.Mesh(g(malhaIlha(estreito ? 110 : 180, estreito ? 180 : 300, r.altura)), matTerreno));
      const borda = r.altura(RAIO_ILHA, 0);
      ilha.add(new THREE.Mesh(g(malhaBase(RAIO_ILHA * 1.01, 7, 3.1, borda + 0.1)), matBase));

      if (r.imagens) {
        const lago = new THREE.Mesh(
          g(new THREE.CircleGeometry(RAIO_ILHA * 0.97, 128)),
          g(new THREE.MeshBasicMaterial({ color: "#071116", transparent: true, opacity: 0.86 })),
        );
        lago.rotation.x = -Math.PI / 2;
        lago.position.y = 0.02;
        ilha.add(lago);
      }

      const pos = [];
      const fases = [];
      const cores = [];
      const sobe = [];
      const ouro = new THREE.Color(OURO);
      for (let k = 0; k < 9000 && pos.length < 2400 * 3; k++) {
        const x = (Math.random() * 2 - 1) * RAIO_ILHA * 0.8;
        const z = (Math.random() * 2 - 1) * RAIO_ILHA * 0.8;
        const b = r.brilho(x, z);
        if (b < 0.35) continue;
        pos.push(x, Math.max(r.altura(x, z), 0) + 0.05, z);
        fases.push(Math.random());
        cores.push(ouro.r * b, ouro.g * b, ouro.b * b);
        sobe.push(Math.random() < 0.35 ? 0.4 : 0);
      }
      const geo = g(new THREE.BufferGeometry());
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute("fase", new THREE.Float32BufferAttribute(fases, 1));
      geo.setAttribute("cor", new THREE.Float32BufferAttribute(cores, 3));
      geo.setAttribute("sobe", new THREE.Float32BufferAttribute(sobe, 1));
      ilha.add(new THREE.Points(geo, matPoeira));

      // A estrela do emblema fica um pouco acima do centro da imagem
      const zEstrela = r.imagens ? -1.1 : 0;
      nucleo.position.set(0, Math.max(r.altura(0, zEstrela), 0) + 0.3, zEstrela);
      metrito.position.set(0, nucleo.position.y + 0.4, zEstrela);
      ilha.add(nucleo);
      montarEscolas(escolasPendentes);
    }

    // Escolas: colunas de luz nos anéis
    const grupoEscolas = new THREE.Group();
    ilha.add(grupoEscolas);
    const alvosClique = [];
    const matBrasa = g(matCintilante(34));
    let brasas = null;

    let escolasPendentes = [];
    function montarEscolas(lista) {
      escolasPendentes = lista;
      if (!relevo) return;
      grupoEscolas.clear();
      alvosClique.length = 0;
      if (brasas) {
        ilha.remove(brasas);
        brasas.geometry.dispose();
        brasas = null;
      }
      const raios = [7.3, 7.6];
      const pBrasa = [];
      const fBrasa = [];
      const cBrasa = [];
      const sBrasa = [];
      lista.forEach((e, i) => {
        const ang = (i / lista.length) * Math.PI * 2 + Math.PI / 4;
        const r = raios[i % 2];
        const x = Math.cos(ang) * r;
        const z = Math.sin(ang) * r;
        const y = Math.max(relevo.altura(x, z), 0.3);
        const cor = new THREE.Color(e.cor || OURO);

        const feixe = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.22, 3.2, 16, 1, true),
          new THREE.ShaderMaterial({
            uniforms: { cor: { value: cor }, tempo: { value: 0 } },
            vertexShader: `varying float vY; void main(){ vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
            fragmentShader: `uniform vec3 cor; uniform float tempo; varying float vY;
              void main(){ float a = pow(1.0 - vY, 1.6) * (0.75 + 0.25 * sin(tempo * 2.0)); gl_FragColor = vec4(cor * 1.6, 1.0) * a; }`,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
          }),
        );
        feixe.position.set(x, y + 1.6, z);
        grupoEscolas.add(feixe);

        const luz = new THREE.Sprite(new THREE.SpriteMaterial({ map: brilho, color: cor, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        luz.position.set(x, y + 0.15, z);
        luz.scale.setScalar(1.4);
        grupoEscolas.add(luz);

        const alvo = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
        alvo.position.set(x, y + 0.8, z);
        alvo.userData = { escola: e, luz, feixe, base: new THREE.Vector3(x, y + 0.3, z) };
        grupoEscolas.add(alvo);
        alvosClique.push(alvo);

        for (let k = 0; k < 40; k++) {
          pBrasa.push(x + (Math.random() - 0.5) * 0.5, y + Math.random() * 0.2, z + (Math.random() - 0.5) * 0.5);
          fBrasa.push(Math.random());
          cBrasa.push(cor.r, cor.g, cor.b);
          sBrasa.push(0.8 + Math.random() * 0.6);
        }
      });
      if (pBrasa.length) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(pBrasa, 3));
        geo.setAttribute("fase", new THREE.Float32BufferAttribute(fBrasa, 1));
        geo.setAttribute("cor", new THREE.Float32BufferAttribute(cBrasa, 3));
        geo.setAttribute("sobe", new THREE.Float32BufferAttribute(sBrasa, 1));
        brasas = new THREE.Points(geo, matBrasa);
        ilha.add(brasas);
      }
    }

    // Câmera: o scroll desce do alto até a beira da cratera; arrastar gira
    const relogio = new THREE.Clock();
    let progresso = 0;
    let progressoSuave = 0;
    let giro = 0;
    let giroAlvo = 0;
    let arrastando = null;
    let quadro = 0;
    let visivel = true;
    let foco = null;
    const ray = new THREE.Raycaster();
    const ponteiro = new THREE.Vector2(9, 9);
    const tela = new THREE.Vector3();

    function lerScroll() {
      const r = secao.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      progresso = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
    }

    function posicionarCamera(t) {
      const p = progressoSuave;
      const dist = THREE.MathUtils.lerp(estreito ? 30 : 24, estreito ? 17 : 13.5, p);
      const polar = THREE.MathUtils.lerp(0.55, 1.25, p);
      const azim = -0.15 + p * 0.9 + giro + (reduz ? 0 : t * 0.02);
      camera.position.set(Math.sin(polar) * Math.sin(azim) * dist, Math.cos(polar) * dist + 1, Math.sin(polar) * Math.cos(azim) * dist);
      camera.lookAt(0, THREE.MathUtils.lerp(-0.5, 0.6, p), 0);
    }

    function atualizarRotulo() {
      const el = rotuloRef.current;
      if (!el) return;
      if (!foco) {
        el.style.opacity = "0";
        return;
      }
      tela.copy(foco.userData.base);
      ilha.localToWorld(tela);
      tela.project(camera);
      const w = palco.clientWidth;
      const h = palco.clientHeight;
      el.style.transform = `translate(${(tela.x * 0.5 + 0.5) * w}px, ${(-tela.y * 0.5 + 0.5) * h}px) translate(-50%, -150%)`;
      el.style.opacity = "1";
      el.firstChild.textContent = foco.userData.escola.nome;
      el.lastChild.textContent = foco.userData.escola.subtitulo || "";
      el.style.borderColor = foco.userData.escola.cor || OURO;
    }

    function desenhar() {
      quadro = 0;
      if (!visivel || document.hidden) return;
      const t = relogio.getElapsedTime();
      progressoSuave += (progresso - progressoSuave) * (reduz ? 1 : 0.06);
      giro += (giroAlvo - giro) * 0.08;
      posicionarCamera(t);

      if (!reduz) {
        ilha.position.y = Math.sin(t * 0.4) * 0.12;
        scene.children.forEach((o) => {
          if (o.userData.fase != null) o.position.y += Math.sin(t * 0.3 + o.userData.fase) * 0.002;
        });
      }
      matPoeira.uniforms.tempo.value = t;
      matBrasa.uniforms.tempo.value = t;
      nucleo.material.opacity = 0.75 + 0.25 * Math.sin(t * 1.3);
      metrito.intensity = 11 + 3 * Math.sin(t * 1.3);
      if (matTerreno?.emissiveMap) matTerreno.emissiveIntensity = 0.75 + 0.25 * Math.sin(t * 1.3);
      grupoEscolas.children.forEach((o) => {
        if (o.material?.uniforms?.tempo) o.material.uniforms.tempo.value = t + o.position.x;
      });

      ray.setFromCamera(ponteiro, camera);
      const hit = ray.intersectObjects(alvosClique)[0]?.object || null;
      if (hit !== foco) {
        foco = hit;
        palco.style.cursor = hit ? "pointer" : arrastando ? "grabbing" : "grab";
      }
      alvosClique.forEach((a) => {
        const alvoEscala = a === foco ? 2.1 : 1.4;
        const s = a.userData.luz.scale.x;
        a.userData.luz.scale.setScalar(s + (alvoEscala - s) * 0.15);
      });
      atualizarRotulo();

      renderer.render(scene, camera);
      quadro = requestAnimationFrame(desenhar);
    }
    const tocar = () => {
      if (!quadro && visivel && !document.hidden) quadro = requestAnimationFrame(desenhar);
    };

    function enquadrar() {
      const w = palco.clientWidth;
      const h = palco.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = w + "px";
      renderer.domElement.style.height = h + "px";
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const escala = h * renderer.getPixelRatio() * 0.5;
      matPoeira.uniforms.escala.value = escala / 400;
      matBrasa.uniforms.escala.value = escala / 400;
    }

    const aoMover = (ev) => {
      const r = palco.getBoundingClientRect();
      ponteiro.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      if (arrastando) {
        giroAlvo = arrastando.giro - ((ev.clientX - arrastando.x) / r.width) * 3;
        if (Math.abs(ev.clientX - arrastando.x) > 4) arrastando.moveu = true;
      }
    };
    const aoApertar = (ev) => {
      arrastando = { x: ev.clientX, giro: giroAlvo, moveu: false };
      palco.style.cursor = foco ? "pointer" : "grabbing";
    };
    const aoSoltar = () => {
      if (arrastando && !arrastando.moveu && foco) aoEscolaRef.current?.(foco.userData.escola.id);
      arrastando = null;
      palco.style.cursor = foco ? "pointer" : "grab";
    };
    const aoSair = () => ponteiro.set(9, 9);

    const ro = new ResizeObserver(enquadrar);
    ro.observe(palco);
    const io = new IntersectionObserver(([e]) => {
      visivel = e.isIntersecting;
      tocar();
    });
    io.observe(palco);
    window.addEventListener("scroll", lerScroll, { passive: true });
    palco.addEventListener("pointermove", aoMover);
    palco.addEventListener("pointerdown", aoApertar);
    window.addEventListener("pointerup", aoSoltar);
    palco.addEventListener("pointerleave", aoSair);
    document.addEventListener("visibilitychange", tocar);

    mundoRef.current = { montarEscolas };
    let fechado = false;
    carregarRelevo()
      .catch(() => ({ altura, brilho: () => 0, imagens: false }))
      .then((r) => {
        if (!fechado) montarTerreno(r);
      });
    enquadrar();
    lerScroll();
    progressoSuave = progresso;
    palco.style.cursor = "grab";
    tocar();

    return () => {
      fechado = true;
      cancelAnimationFrame(quadro);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("scroll", lerScroll);
      palco.removeEventListener("pointermove", aoMover);
      palco.removeEventListener("pointerdown", aoApertar);
      window.removeEventListener("pointerup", aoSoltar);
      palco.removeEventListener("pointerleave", aoSair);
      document.removeEventListener("visibilitychange", tocar);
      scene.traverse((o) => {
        o.geometry?.dispose();
        if (o.material && !lixo.includes(o.material)) o.material.dispose?.();
      });
      lixo.forEach((o) => o.dispose?.());
      renderer.dispose();
      renderer.domElement.remove();
      mundoRef.current = null;
    };
  }, []);

  useEffect(() => {
    mundoRef.current?.montarEscolas(escolas);
  }, [escolas]);

  useEffect(() => () => somRef.current?.fechar(), []);

  function entrar(comSom) {
    if (comSom) {
      somRef.current = somRef.current || criarSom();
      somRef.current?.ligar(true);
    }
    setSomLigado(comSom && !!somRef.current);
    setEntrou(true);
  }

  function alternarSom() {
    somRef.current = somRef.current || criarSom();
    if (!somRef.current) return;
    somRef.current.ligar(!somLigado);
    setSomLigado(!somLigado);
  }

  return (
    <section ref={secaoRef} style={st.secao}>
      <div style={st.fixo}>
        <div ref={palcoRef} style={st.palco} />
        <div style={st.vinheta} />
        <div ref={rotuloRef} style={st.rotulo}>
          <strong style={st.rotuloNome} />
          <span style={st.rotuloSub} />
        </div>
        <div style={{ ...st.conteudo, opacity: entrou ? 1 : 0 }}>{children}</div>
        <p style={{ ...st.dica, bottom: telaEstreita ? 78 : 28, opacity: entrou ? 1 : 0 }}>
          Role ou arraste para explorar.
          <br />
          Clique nas luzes para conhecer as escolas.
        </p>
        <button
          type="button"
          onClick={alternarSom}
          style={{ ...st.som, opacity: entrou ? 1 : 0 }}
          aria-label={somLigado ? "Desligar o som" : "Ligar o som"}
        >
          SOM <span style={{ color: somLigado ? OURO : "#5d6a72" }}>{somLigado ? "LIGADO" : "DESLIGADO"}</span>
        </button>
        {!entrou && (
          <div style={st.portao}>
            <img src={urlEmblema} alt="Emblema dos Scrips" style={st.emblema} />
            <p style={st.portaoTitulo}>A QUEDA DE UMA ORDEM</p>
            <p style={st.portaoFrase}>Diferentes por natureza. Unidos pela mesma origem.</p>
            <div style={st.portaoBotoes}>
              <button type="button" style={st.portaoBotao} onClick={() => entrar(true)}>
                ENTRAR COM SOM
              </button>
              <button type="button" style={st.portaoBotaoSutil} onClick={() => entrar(false)}>
                ENTRAR SEM SOM
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

const st = {
  secao: { position: "relative", height: "260vh", zIndex: 2 },
  fixo: { position: "sticky", top: 0, height: "100vh", overflow: "hidden" },
  palco: { position: "absolute", inset: 0, touchAction: "pan-y" },
  vinheta: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background: "radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(4,6,8,0.75) 100%), linear-gradient(to bottom, transparent 75%, #070906 100%)",
  },
  rotulo: {
    position: "absolute",
    left: 0,
    top: 0,
    pointerEvents: "none",
    opacity: 0,
    transition: "opacity 0.25s",
    padding: "8px 14px",
    border: "1px solid #c4a050",
    borderRadius: 3,
    background: "rgba(6,9,12,0.78)",
    backdropFilter: "blur(6px)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    whiteSpace: "nowrap",
  },
  rotuloNome: { fontSize: "0.85em", letterSpacing: "2px", color: "#e8d08a", fontWeight: 700 },
  rotuloSub: { fontSize: "0.62em", letterSpacing: "3px", color: "#9aa7ae", textTransform: "uppercase", marginTop: 2 },
  conteudo: {
    position: "absolute",
    left: "clamp(20px, 9vw, 140px)",
    top: "clamp(110px, 22vh, 200px)",
    maxWidth: 460,
    transition: "opacity 1.2s 0.4s",
    pointerEvents: "none",
  },
  dica: {
    position: "absolute",
    right: "max(20px, env(safe-area-inset-right, 0px))",
    bottom: 28,
    margin: 0,
    textAlign: "right",
    fontSize: "0.7em",
    letterSpacing: "1px",
    color: "#6f7d85",
    lineHeight: 1.6,
    transition: "opacity 1.2s 0.8s",
    pointerEvents: "none",
  },
  som: {
    position: "absolute",
    left: "max(20px, env(safe-area-inset-left, 0px))",
    bottom: 28,
    background: "rgba(6,9,12,0.5)",
    border: "1px solid rgba(196,160,80,0.3)",
    borderRadius: 3,
    color: "#9aa7ae",
    fontSize: "0.62em",
    letterSpacing: "2.5px",
    padding: "9px 14px",
    cursor: "pointer",
    transition: "opacity 1.2s 0.8s",
    fontFamily: "inherit",
  },
  portao: {
    position: "absolute",
    inset: 0,
    zIndex: 5,
    background: "radial-gradient(ellipse at center, #0e141a 0%, #06080a 75%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    padding: "24px",
    textAlign: "center",
  },
  emblema: { height: "min(320px, 42vh)", width: "auto", marginBottom: 4 },
  portaoTitulo: { margin: 0, letterSpacing: "6px", fontSize: "0.9em", color: "#e8d08a" },
  portaoFrase: { margin: 0, maxWidth: 420, fontStyle: "italic", color: "#8a7a55", fontSize: "0.95em", lineHeight: 1.6 },
  portaoBotoes: { display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginTop: 18 },
  portaoBotao: {
    padding: "12px 26px",
    background: "transparent",
    border: "1px solid rgba(196,160,80,0.6)",
    borderRadius: 3,
    color: "#e8d08a",
    letterSpacing: "3px",
    fontSize: "0.7em",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  portaoBotaoSutil: {
    padding: "12px 26px",
    background: "transparent",
    border: "1px solid rgba(154,167,174,0.25)",
    borderRadius: 3,
    color: "#9aa7ae",
    letterSpacing: "3px",
    fontSize: "0.7em",
    cursor: "pointer",
    fontFamily: "inherit",
  },
};
