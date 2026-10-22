import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import urlRelevo from "../assets/terreno/relevo.png";
import urlCor from "../assets/terreno/cor.jpg";
import urlNormal from "../assets/terreno/normal.jpg";
import urlBrilho from "../assets/terreno/brilho.png";
import infoTerreno from "../assets/terreno/info.json";
import urlEmblema from "../assets/emblema-titulo.png";
import { criarCeu } from "./mundo/ceu";
import { criarArvores } from "./mundo/arvores";
import { criarPortal } from "./mundo/portal";
import urlTerra from "../assets/classes/terra.png";
import urlFogo from "../assets/classes/fogo.png";
import urlAgua from "../assets/classes/agua.png";
import urlMente from "../assets/classes/mente.png";
import urlTodos from "../assets/classes/todos.png";

// ─────────────────────────────────────────────
// MUNDO 3D DA ABERTURA — o lugar onde o meteoro caiu
// O relevo é o real da Serra da Cangalha (TO), uma cratera de impacto de ~13 km,
// gerado por scripts/gerar_terreno.py a partir de dados abertos de elevação e
// fotos aéreas CC0, com árvores do cerrado e céu estrelado. No centro do impacto
// o Metrito brilha em azul, com os fragmentos subindo num feixe de luz. As
// escolas da Ordem são luzes na borda da cratera; clicar numa delas leva a câmera
// até lá e abre um portal com a imagem da classe.
// Rolar aproxima a câmera; arrastar gira; Esc ou "Voltar ao mapa" fecha o portal.
// ─────────────────────────────────────────────

const NOITE = "#0a0f14";
const OURO = "#e8c96a";
const AZUL = "#5cc3ff";
const LADO = infoTerreno.km; // 1 unidade = 1 km
const EXAGERO = 5; // o relevo real é baixo para o tamanho da cratera
const ALT_REF = infoTerreno.altitude_min + 120;
// Imagem dentro do portal de cada escola. Provisório: os ícones de classe da arte
// do emblema, até existir a arte dos personagens.
const IMAGEM_CLASSE = { terra: urlTerra, fogo: urlFogo, agua: urlAgua, mente: urlMente, todos: urlTodos };
const CLASSE_DA_ESCOLA = { primordiais: "terra", colossos: "fogo", mentalistas: "mente", eter: "todos" };

const CENTRO = new THREE.Vector3((infoTerreno.centro[0] - 0.5) * LADO, 0, (infoTerreno.centro[1] - 0.5) * LADO);

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

/** Lê o relevo (16 bits em R e G) e o brilho, e devolve funções em coordenadas do mundo. */
function carregarRelevo() {
  const ler = (url, dezesseis) =>
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
        for (let i = 0; i < v.length; i++) v[i] = dezesseis ? (px[i * 4] * 256 + px[i * 4 + 1]) / 65535 : px[i * 4] / 255;
        ok({ v, w: c.width, h: c.height });
      };
      img.onerror = erro;
      img.src = url;
    });
  const amostra = ({ v, w, h }, x, z) => {
    const u = Math.min(w - 1.001, Math.max(0, (x / LADO + 0.5) * (w - 1)));
    const t = Math.min(h - 1.001, Math.max(0, (z / LADO + 0.5) * (h - 1)));
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
  const faixa = infoTerreno.altitude_max - infoTerreno.altitude_min;
  return Promise.all([ler(urlRelevo, true), ler(urlBrilho, false)]).then(([rel, bri]) => ({
    altura: (x, z) => ((infoTerreno.altitude_min + amostra(rel, x, z) * faixa - ALT_REF) / 1000) * EXAGERO,
    brilho: (x, z) => amostra(bri, x, z),
  }));
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

// Pontos de luz que cintilam (poeira de Metrito subindo do impacto)
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
  const [selecionada, setSelecionada] = useState(null);
  const fixoRef = useRef(null);

  // A cena fica presa logo abaixo do menu fixo do topo, para nada ficar escondido atrás dele
  useLayoutEffect(() => {
    const ajustar = () => {
      const menu = document.querySelector("nav")?.offsetHeight || 0;
      if (!fixoRef.current) return;
      fixoRef.current.style.top = `${menu}px`;
      fixoRef.current.style.height = `calc(100vh - ${menu}px)`;
    };
    ajustar();
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
  }, []);
  const aoEscolaRef = useRef(onEscola);
  const aoSelecionarRef = useRef(setSelecionada);
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
    renderer.toneMappingExposure = 1.25;
    renderer.domElement.style.display = "block";
    palco.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(NOITE);
    const neblina = new THREE.Fog(NOITE, 14, 34);
    scene.fog = neblina;
    const camera = new THREE.PerspectiveCamera(estreito ? 52 : 42, 1, 0.1, 300);
    const lixo = [];
    const g = (o) => (lixo.push(o), o);
    const brilho = g(texturaBrilho());

    // Luz: lua baixa e fria (realça o relevo) e o Metrito azul no centro do impacto
    scene.add(new THREE.HemisphereLight("#8aa6c8", "#0b0f12", 0.9));
    const lua = new THREE.DirectionalLight("#b4c8e0", 2.6);
    lua.position.set(-12, 7, -8);
    scene.add(lua);
    const metrito = new THREE.PointLight(AZUL, 14, 9, 1.6);
    scene.add(metrito);

    const mundo = new THREE.Group();
    scene.add(mundo);
    const ceu = criarCeu({ horizonte: NOITE, direcaoLua: lua.position, texturaBrilho: brilho });
    scene.add(ceu.grupo);
    let arvores = null;

    // Fragmentos arrancados pela queda, subindo em coluna sobre o centro do impacto
    const geoFragmento = g(new THREE.IcosahedronGeometry(1, 1));
    {
      const p = geoFragmento.attributes.position;
      const v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        v.multiplyScalar(0.75 + 0.5 * ruido(v.x * 2 + 5, v.y * 2 + v.z * 3));
        p.setXYZ(i, v.x, v.y * 0.7, v.z);
      }
      geoFragmento.computeVertexNormals();
    }
    const matFragmento = g(new THREE.MeshStandardMaterial({ color: "#7d776a", roughness: 0.95, flatShading: true }));
    const fragmentos = [];
    for (let i = 0; i < 16; i++) {
      const f = new THREE.Mesh(geoFragmento, matFragmento);
      const subida = i / 15;
      f.userData.base = new THREE.Vector3((Math.random() - 0.5) * (0.8 + subida * 1.6), 2.4 + subida * 11 + Math.random() * 0.6, (Math.random() - 0.5) * 1.6);
      f.scale.setScalar(0.1 + Math.random() * 0.3 * (1 - subida * 0.6));
      f.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      f.userData.fase = i;
      f.userData.gira = (Math.random() - 0.5) * 0.004;
      fragmentos.push(f);
      mundo.add(f);
    }

    // O feixe de luz que atravessa o centro do impacto
    const feixeQueda = new THREE.Mesh(
      g(new THREE.CylinderGeometry(0.02, 0.02, 40, 8, 1, true)),
      g(new THREE.MeshBasicMaterial({ color: AZUL, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false })),
    );
    mundo.add(feixeQueda);

    const matPoeira = g(matCintilante(24));
    const nucleo = new THREE.Sprite(g(new THREE.SpriteMaterial({ map: brilho, color: AZUL, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
    nucleo.scale.setScalar(2.6);
    let matTerreno = null;
    let relevo = null;

    function montarTerreno(r) {
      relevo = r;
      const carregador = new THREE.TextureLoader();
      const cor = g(carregador.load(urlCor));
      cor.colorSpace = THREE.SRGBColorSpace;
      cor.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const normal = g(carregador.load(urlNormal));
      const luzMetrito = g(carregador.load(urlBrilho));
      matTerreno = g(
        new THREE.MeshStandardMaterial({
          map: cor,
          normalMap: normal,
          normalScale: new THREE.Vector2(1.4, 1.4),
          emissive: AZUL,
          emissiveMap: luzMetrito,
          emissiveIntensity: 1,
          roughness: 0.95,
          metalness: 0,
        }),
      );
      const divisoes = estreito ? 170 : 256;
      const geo = g(new THREE.PlaneGeometry(LADO, LADO, divisoes, divisoes));
      geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setY(i, r.altura(pos.getX(i), pos.getZ(i)));
      geo.computeVertexNormals();
      mundo.add(new THREE.Mesh(geo, matTerreno));

      // Poeira de Metrito subindo da bacia do impacto
      const pts = [];
      const fases = [];
      const cores = [];
      const sobe = [];
      const azul = new THREE.Color(AZUL);
      for (let k = 0; k < 12000 && pts.length < 1800 * 3; k++) {
        const x = CENTRO.x + (Math.random() * 2 - 1) * 4;
        const z = CENTRO.z + (Math.random() * 2 - 1) * 4;
        const b = r.brilho(x, z);
        if (b < 0.3) continue;
        pts.push(x, r.altura(x, z) + 0.04, z);
        fases.push(Math.random());
        cores.push(azul.r * b, azul.g * b, azul.b * b);
        sobe.push(Math.random() < 0.4 ? 0.5 : 0);
      }
      const geoPoeira = g(new THREE.BufferGeometry());
      geoPoeira.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      geoPoeira.setAttribute("fase", new THREE.Float32BufferAttribute(fases, 1));
      geoPoeira.setAttribute("cor", new THREE.Float32BufferAttribute(cores, 3));
      geoPoeira.setAttribute("sobe", new THREE.Float32BufferAttribute(sobe, 1));
      mundo.add(new THREE.Points(geoPoeira, matPoeira));

      const chao = r.altura(CENTRO.x, CENTRO.z);
      nucleo.position.set(CENTRO.x, chao + 0.35, CENTRO.z);
      metrito.position.set(CENTRO.x, chao + 0.9, CENTRO.z);
      feixeQueda.position.set(CENTRO.x, chao + 20, CENTRO.z);
      fragmentos.forEach((f) => f.position.copy(f.userData.base).add(CENTRO).setY(chao + f.userData.base.y));
      mundo.add(nucleo);
      arvores = criarArvores({ relevo: r, area: LADO, centro: CENTRO, quantidade: estreito ? 1500 : 3500 });
      mundo.add(arvores.grupo);
      montarEscolas(escolasPendentes);
    }

    // Escolas: luzes na borda da cratera, com uma onda no chão
    const grupoEscolas = new THREE.Group();
    mundo.add(grupoEscolas);
    const alvosClique = [];
    let escolasPendentes = [];
    const carregadorClasses = new THREE.TextureLoader();
    const texturasClasse = {};
    const texturaDaClasse = (classe) => {
      if (!texturasClasse[classe]) {
        texturasClasse[classe] = carregadorClasses.load(IMAGEM_CLASSE[classe]);
        texturasClasse[classe].colorSpace = THREE.SRGBColorSpace;
      }
      return texturasClasse[classe];
    };
    const portal = criarPortal();
    scene.add(portal.malha);

    function limparEscolas() {
      grupoEscolas.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose?.();
      });
      grupoEscolas.clear();
      alvosClique.length = 0;
    }

    function montarEscolas(lista) {
      escolasPendentes = lista;
      if (!relevo) return;
      limparEscolas();
      lista.forEach((e, i) => {
        const ang = (i / lista.length) * Math.PI * 2 + Math.PI / 4;
        const x = CENTRO.x + Math.cos(ang) * 5.6;
        const z = CENTRO.z + Math.sin(ang) * 5.6;
        const y = relevo.altura(x, z);
        const cor = new THREE.Color(e.cor || OURO);

        const feixe = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.12, 1.8, 16, 1, true),
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
        feixe.position.set(x, y + 0.9, z);
        grupoEscolas.add(feixe);

        const luz = new THREE.Sprite(new THREE.SpriteMaterial({ map: brilho, color: cor, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        luz.position.set(x, y + 0.1, z);
        luz.scale.setScalar(1);
        grupoEscolas.add(luz);

        const onda = new THREE.Mesh(
          new THREE.RingGeometry(0.9, 1, 48),
          new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
        );
        onda.rotation.x = -Math.PI / 2;
        onda.position.set(x, y + 0.03, z);
        grupoEscolas.add(onda);

        const alvo = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
        alvo.position.set(x, y + 0.5, z);
        alvo.userData = { escola: e, luz, feixe, onda, fase: i * 0.7, base: new THREE.Vector3(x, y + 0.25, z), chao: new THREE.Vector3(x, y, z) };
        grupoEscolas.add(alvo);
        alvosClique.push(alvo);
      });
    }

    // Foco numa escola: a câmera vai até a luz e o portal abre em cima dela
    let escolaAberta = null;
    let mistura = 0;
    const camVisao = new THREE.Vector3();
    const alvoVisao = new THREE.Vector3();
    const camFoco = new THREE.Vector3();
    const alvoFoco = new THREE.Vector3();
    const direcao = new THREE.Vector3();

    function abrirEscola(alvo) {
      const e = alvo.userData.escola;
      escolaAberta = alvo;
      const classe = CLASSE_DA_ESCOLA[e.id] || "todos";
      portal.abrir(alvo.userData.chao.clone().add(new THREE.Vector3(0, 2.7, 0)), texturaDaClasse(classe), e.cor || OURO, 3.6);
      aoSelecionarRef.current?.(e);
    }
    function fecharEscola() {
      escolaAberta = null;
      portal.fechar();
      aoSelecionarRef.current?.(null);
    }

    // Câmera: gira em volta do centro do impacto; o scroll desce do alto até perto do chão
    const relogio = new THREE.Clock();
    let tAnterior = 0;
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
    const alvoCamera = new THREE.Vector3();

    function lerScroll() {
      const r = secao.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      progresso = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
    }

    function posicionarCamera(t, dt) {
      const p = progressoSuave;
      const dist = THREE.MathUtils.lerp(17, 8.5, p);
      const polar = THREE.MathUtils.lerp(0.78, 1.42, p);
      const azim = 0.15 + p * 1.0 + giro + (reduz ? 0 : t * 0.015);
      camVisao.set(
        CENTRO.x + Math.sin(polar) * Math.sin(azim) * dist,
        Math.cos(polar) * dist + 0.6,
        CENTRO.z + Math.sin(polar) * Math.cos(azim) * dist,
      );
      alvoVisao.set(CENTRO.x, THREE.MathUtils.lerp(-0.6, 2.2, p), CENTRO.z);

      mistura += ((escolaAberta ? 1 : 0) - mistura) * (reduz ? 1 : 1 - Math.exp(-dt * 1.8));
      if (escolaAberta) {
        const chao = escolaAberta.userData.chao;
        direcao.set(camVisao.x - chao.x, 0, camVisao.z - chao.z).normalize();
        camFoco.copy(chao).addScaledVector(direcao, 7.5);
        camFoco.y = chao.y + 2.4;
        alvoFoco.copy(chao).setY(chao.y + 2.3);
      }
      const k = mistura * mistura * (3 - 2 * mistura);
      camera.position.lerpVectors(camVisao, camFoco, k);
      alvoCamera.lerpVectors(alvoVisao, alvoFoco, k);
      camera.lookAt(alvoCamera);
      const d = THREE.MathUtils.lerp(dist, 7.5, k);
      neblina.near = d * 0.75;
      neblina.far = d + 15;
    }

    function atualizarRotulo() {
      const el = rotuloRef.current;
      if (!el) return;
      if (!foco || escolaAberta) {
        el.style.opacity = "0";
        return;
      }
      tela.copy(foco.userData.base).project(camera);
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
      const dt = Math.min(t - tAnterior, 0.1);
      tAnterior = t;
      progressoSuave += (progresso - progressoSuave) * (reduz ? 1 : 0.06);
      giro += (giroAlvo - giro) * 0.08;
      posicionarCamera(t, dt);

      if (!reduz) {
        fragmentos.forEach((f) => {
          f.position.y += Math.sin(t * 0.3 + f.userData.fase) * 0.002;
          f.rotation.x += f.userData.gira;
          f.rotation.y += f.userData.gira * 0.7;
        });
      }
      matPoeira.uniforms.tempo.value = t;
      ceu.atualizar(t, renderer.getPixelRatio());
      nucleo.material.opacity = 0.75 + 0.25 * Math.sin(t * 1.3);
      metrito.intensity = 13 + 4 * Math.sin(t * 1.3);
      if (matTerreno) matTerreno.emissiveIntensity = 0.9 + 0.3 * Math.sin(t * 1.3);
      ray.setFromCamera(ponteiro, camera);
      const hit = ray.intersectObjects(alvosClique)[0]?.object || null;
      if (hit !== foco) {
        foco = hit;
        palco.style.cursor = hit ? "pointer" : arrastando ? "grabbing" : "grab";
      }
      alvosClique.forEach((a) => {
        const { luz, feixe, onda, fase } = a.userData;
        const alvoEscala = a === foco || a === escolaAberta ? 1.7 : 1;
        luz.scale.setScalar(luz.scale.x + (alvoEscala - luz.scale.x) * 0.15);
        feixe.material.uniforms.tempo.value = t + fase;
        const ciclo = ((reduz ? 0.5 : t * 0.35) + fase) % 1;
        onda.scale.setScalar(0.2 + ciclo * 0.9);
        onda.material.opacity = (1 - ciclo) * 0.6;
      });
      portal.atualizar(t, dt, camera);
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
    }

    const aoMover = (ev) => {
      const r = palco.getBoundingClientRect();
      ponteiro.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      if (arrastando && !escolaAberta) {
        giroAlvo = arrastando.giro - ((ev.clientX - arrastando.x) / r.width) * 3;
        if (Math.abs(ev.clientX - arrastando.x) > 4) arrastando.moveu = true;
      }
    };
    const aoApertar = (ev) => {
      arrastando = { x: ev.clientX, giro: giroAlvo, moveu: false };
      palco.style.cursor = foco ? "pointer" : "grabbing";
    };
    const aoSoltar = (ev) => {
      if (arrastando && !arrastando.moveu) {
        // raio na hora do clique, sem depender do último quadro desenhado
        aoMover(ev);
        ray.setFromCamera(ponteiro, camera);
        const clicado = ray.intersectObjects(alvosClique)[0]?.object || null;
        if (clicado && clicado !== escolaAberta) abrirEscola(clicado);
        else if (!clicado && escolaAberta) fecharEscola();
      }
      arrastando = null;
      palco.style.cursor = foco ? "pointer" : "grab";
    };
    const aoSair = () => ponteiro.set(9, 9);
    const aoTecla = (ev) => {
      if (ev.key === "Escape" && escolaAberta) fecharEscola();
    };

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
    window.addEventListener("keydown", aoTecla);

    mundoRef.current = { montarEscolas, fecharEscola };
    let fechado = false;
    carregarRelevo()
      .catch(() => ({ altura: () => 0, brilho: () => 0 }))
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
      limparEscolas();
      ceu.descartar();
      arvores?.descartar();
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("scroll", lerScroll);
      palco.removeEventListener("pointermove", aoMover);
      palco.removeEventListener("pointerdown", aoApertar);
      window.removeEventListener("pointerup", aoSoltar);
      palco.removeEventListener("pointerleave", aoSair);
      document.removeEventListener("visibilitychange", tocar);
      window.removeEventListener("keydown", aoTecla);
      portal.descartar();
      Object.values(texturasClasse).forEach((t) => t.dispose());
      scene.traverse((o) => {
        if (!lixo.includes(o.geometry)) o.geometry?.dispose();
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
      <div ref={fixoRef} style={st.fixo}>
        <div ref={palcoRef} style={st.palco} />
        <div style={st.vinheta} />
        <div ref={rotuloRef} style={st.rotulo}>
          <strong style={st.rotuloNome} />
          <span style={st.rotuloSub} />
        </div>
        <div style={{ ...st.conteudo, opacity: entrou && !selecionada ? 1 : 0 }}>{children}</div>
        <p style={{ ...st.dica, bottom: telaEstreita ? 78 : 28, opacity: entrou && !selecionada ? 1 : 0 }}>
          Role ou arraste para explorar.
          <br />
          Clique nas luzes para conhecer as escolas.
        </p>
        {selecionada && (
          <>
            <button type="button" style={st.voltar} onClick={() => mundoRef.current?.fecharEscola()}>
              ← VOLTAR AO MAPA
            </button>
            <div style={st.painel}>
              <p style={{ ...st.painelSub, color: selecionada.cor || OURO }}>{selecionada.subtitulo}</p>
              <h2 style={st.painelNome}>{selecionada.nome}</h2>
              <button type="button" style={st.painelBotao} onClick={() => onEscola?.(selecionada.id)}>
                CONHECER A ESCOLA
              </button>
            </div>
          </>
        )}
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
            <p style={st.portaoFrase}>“Esqueça tudo o que acredita saber. O que vou te revelar... muda tudo.”</p>
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
  voltar: {
    position: "absolute",
    top: 24,
    left: "max(20px, env(safe-area-inset-left, 0px))",
    background: "rgba(6,9,12,0.5)",
    border: "1px solid rgba(196,160,80,0.35)",
    borderRadius: 3,
    color: "#d4b87a",
    letterSpacing: "2.5px",
    fontSize: "0.66em",
    padding: "10px 16px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  painel: {
    position: "absolute",
    left: "50%",
    bottom: "clamp(28px, 7vh, 64px)",
    transform: "translateX(-50%)",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    width: "min(90vw, 520px)",
  },
  painelSub: { margin: 0, fontSize: "0.72em", letterSpacing: "4px", textTransform: "uppercase" },
  painelNome: {
    margin: 0,
    fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
    fontSize: "clamp(1.8em, 5vw, 2.8em)",
    fontWeight: 400,
    color: "#efe6cf",
    textShadow: "0 2px 24px rgba(0,0,0,0.8)",
  },
  painelBotao: {
    marginTop: 12,
    padding: "12px 26px",
    background: "rgba(6,9,12,0.55)",
    border: "1px solid rgba(232,208,138,0.5)",
    borderRadius: 3,
    color: "#e8d08a",
    letterSpacing: "3px",
    fontSize: "0.7em",
    cursor: "pointer",
    fontFamily: "inherit",
  },
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
  emblema: { height: "min(400px, 50vh)", width: "auto", marginBottom: 4 },
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
