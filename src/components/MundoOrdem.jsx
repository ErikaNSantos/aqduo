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
import { criarBigBang, criarMeteoro, criarTochas, criarEmblemaCeu, suave } from "./mundo/historia";
import urlTerra from "../assets/classes/terra.png";
import urlFogo from "../assets/classes/fogo.png";
import urlAgua from "../assets/classes/agua.png";
import urlMente from "../assets/classes/mente.png";
import urlTodos from "../assets/classes/todos.png";

// ─────────────────────────────────────────────
// ABERTURA EM 3D — a história contada pelo scroll
// Rolar a página avança a história: o nada, o Big Bang, o meteoro cruzando o
// espaço, o impacto na Serra da Cangalha (relevo real, scripts/gerar_terreno.py),
// o Metrito azul se espalhando, a perseguição, A Ordem, o emblema e, por fim, as
// escolas, cada uma com seu portal. No fim dá para girar e clicar nas escolas.
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
    /** Estrondo grave: o Big Bang e o impacto do meteoro. */
    estrondo(forca = 1) {
      if (ctx.state === "suspended") return;
      const agora = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(70, agora);
      o.frequency.exponentialRampToValueAtTime(24, agora + 2.5);
      const go = ctx.createGain();
      go.gain.setValueAtTime(0.0001, agora);
      go.gain.exponentialRampToValueAtTime(0.9 * forca, agora + 0.05);
      go.gain.exponentialRampToValueAtTime(0.0001, agora + 3);
      o.connect(go).connect(mestre);
      o.start(agora);
      o.stop(agora + 3.1);
      const r = ctx.createBufferSource();
      r.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.setValueAtTime(1800, agora);
      f.frequency.exponentialRampToValueAtTime(120, agora + 2);
      const gr = ctx.createGain();
      gr.gain.setValueAtTime(0.5 * forca, agora);
      gr.gain.exponentialRampToValueAtTime(0.0001, agora + 2.2);
      r.connect(f).connect(gr).connect(mestre);
      r.start(agora);
      r.stop(agora + 2.3);
    },
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

// Capítulos da história, na ordem do scroll. `s` vai de 0 (o nada) a FINAL.
// 0 o nada · 1 Big Bang · 2 o meteoro · 3 o impacto · 4 a energia no solo (os Scrips)
// 5 a perseguição · 6 A Ordem · 7 o emblema · 8 a 11 as escolas · 12 o emblema e a entrada
const CAP_ESCOLAS = 8;
const FINAL = 12;

const ESPACO = CENTRO.clone().add(new THREE.Vector3(0, 70, 0)); // onde o universo nasce
const ORIGEM_METEORO = CENTRO.clone().add(new THREE.Vector3(-10, 20, -14));

/** Posição de câmera em órbita do centro do impacto. */
function orbita(dist, polar, azim, alturaAlvo = 0) {
  return {
    pos: new THREE.Vector3(
      CENTRO.x + Math.sin(polar) * Math.sin(azim) * dist,
      Math.cos(polar) * dist + 0.6,
      CENTRO.z + Math.sin(polar) * Math.cos(azim) * dist,
    ),
    alvo: new THREE.Vector3(CENTRO.x, alturaAlvo, CENTRO.z),
  };
}

const POSES_FIXAS = {
  0: { pos: ESPACO.clone().add(new THREE.Vector3(0, 0, 30)), alvo: ESPACO.clone() },
  1: { pos: ESPACO.clone().add(new THREE.Vector3(0, 2, 24)), alvo: ESPACO.clone() },
  2: { pos: CENTRO.clone().add(new THREE.Vector3(9, 26, 26)), alvo: CENTRO.clone().add(new THREE.Vector3(0, 9, 0)) },
  3: orbita(17, 0.78, 0.15, -0.6),
  4: orbita(12, 1.02, 0.9, 0),
  5: orbita(9, 1.3, 1.8, 0.6),
  6: orbita(18, 0.62, 2.5, -0.4),
  7: { pos: orbita(17, 1.42, 3.0).pos, alvo: CENTRO.clone().add(new THREE.Vector3(0, 7.2, 0)) },
};
POSES_FIXAS[FINAL] = { pos: orbita(19, 1.42, 3.4).pos, alvo: CENTRO.clone().add(new THREE.Vector3(0, 7.2, 0)) };

/** Opacidade do texto do capítulo c na posição s da história. */
function opacidadeCapitulo(c, s) {
  const entra = c === 0 ? 1 : Math.min(1, Math.max(0, (s - (c - 0.3)) / 0.25));
  const sai = c === FINAL ? 0 : Math.min(1, Math.max(0, (s - (c + 0.5)) / 0.15));
  return entra * (1 - sai);
}

export default function MundoOrdem({ escolas = [], historia = [], onEscola, onEntrar }) {
  const secaoRef = useRef(null);
  const palcoRef = useRef(null);
  const rotuloRef = useRef(null);
  const mundoRef = useRef(null);
  const somRef = useRef(null);
  const dicaRef = useRef(null);
  const [entrou, setEntrou] = useState(false);
  const [somLigado, setSomLigado] = useState(false);
  const [selecionada, setSelecionada] = useState(null);
  const fixoRef = useRef(null);
  const escolasRef = useRef(escolas);
  useEffect(() => {
    escolasRef.current = escolas;
  }, [escolas]);

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
  const aoSelecionarRef = useRef(setSelecionada);

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
    scene.background = new THREE.Color("#000000");
    const neblina = new THREE.Fog(NOITE, 14, 34);
    scene.fog = neblina;
    const camera = new THREE.PerspectiveCamera(estreito ? 52 : 42, 1, 0.1, 400);
    const lixo = [];
    const g = (o) => (lixo.push(o), o);
    const brilho = g(texturaBrilho());

    // Luz: lua baixa e fria (realça o relevo) e o Metrito azul no centro do impacto
    scene.add(new THREE.HemisphereLight("#8aa6c8", "#0b0f12", 0.9));
    const lua = new THREE.DirectionalLight("#b4c8e0", 2.6);
    lua.position.set(-12, 7, -8);
    scene.add(lua);
    const metrito = new THREE.PointLight(AZUL, 0, 9, 1.6);
    scene.add(metrito);

    const mundo = new THREE.Group();
    scene.add(mundo);
    const ceu = criarCeu({ horizonte: NOITE, direcaoLua: lua.position, texturaBrilho: brilho });
    scene.add(ceu.grupo);
    let arvores = null;
    let tochas = null;

    const bigBang = criarBigBang({ centro: ESPACO, texturaBrilho: brilho });
    scene.add(bigBang.grupo);
    const meteoro = criarMeteoro({ texturaBrilho: brilho, cor: AZUL });
    scene.add(meteoro.grupo);
    const texturaEmblema = g(new THREE.TextureLoader().load(urlEmblema, () => emblema.ajustarProporcao()));
    texturaEmblema.colorSpace = THREE.SRGBColorSpace;
    const emblema = criarEmblemaCeu({ textura: texturaEmblema, posicao: CENTRO.clone().add(new THREE.Vector3(0, 7.6, 0)), altura: estreito ? 6.5 : 8 });
    scene.add(emblema.malha);

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
      f.visible = false;
      fragmentos.push(f);
      mundo.add(f);
    }

    // O feixe de luz que atravessa o centro do impacto
    const matFeixeQueda = g(new THREE.MeshBasicMaterial({ color: AZUL, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    const feixeQueda = new THREE.Mesh(g(new THREE.CylinderGeometry(0.02, 0.02, 40, 8, 1, true)), matFeixeQueda);
    mundo.add(feixeQueda);

    const matPoeira = g(matCintilante(24));
    const nucleo = new THREE.Sprite(g(new THREE.SpriteMaterial({ map: brilho, color: AZUL, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })));
    nucleo.scale.setScalar(2.6);
    let poeira = null;
    let matTerreno = null;
    let relevo = null;
    let chaoCentro = 0;
    // O brilho do Metrito se espalha do centro para fora (raio em km)
    const uMetrito = { raio: { value: 0 }, centro: { value: new THREE.Vector2(CENTRO.x, CENTRO.z) } };

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
          emissiveIntensity: 0,
          roughness: 0.95,
          metalness: 0,
        }),
      );
      matTerreno.onBeforeCompile = (shader) => {
        shader.uniforms.raioMetrito = uMetrito.raio;
        shader.uniforms.centroMetrito = uMetrito.centro;
        shader.vertexShader = shader.vertexShader
          .replace("#include <common>", "#include <common>\nvarying vec3 vPosMundo;")
          .replace("#include <project_vertex>", "#include <project_vertex>\nvPosMundo = (modelMatrix * vec4(transformed, 1.0)).xyz;");
        shader.fragmentShader = shader.fragmentShader
          .replace("#include <common>", "#include <common>\nvarying vec3 vPosMundo;\nuniform float raioMetrito;\nuniform vec2 centroMetrito;")
          .replace(
            "#include <emissivemap_fragment>",
            "#include <emissivemap_fragment>\ntotalEmissiveRadiance *= smoothstep(raioMetrito, raioMetrito - 1.2, distance(vPosMundo.xz, centroMetrito));",
          );
      };
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
      poeira = new THREE.Points(geoPoeira, matPoeira);
      mundo.add(poeira);

      chaoCentro = r.altura(CENTRO.x, CENTRO.z);
      nucleo.position.set(CENTRO.x, chaoCentro + 0.35, CENTRO.z);
      metrito.position.set(CENTRO.x, chaoCentro + 0.9, CENTRO.z);
      feixeQueda.position.set(CENTRO.x, chaoCentro + 20, CENTRO.z);
      mundo.add(nucleo);
      arvores = criarArvores({ relevo: r, area: LADO, centro: CENTRO, quantidade: estreito ? 1500 : 3500 });
      mundo.add(arvores.grupo);
      tochas = criarTochas({ texturaBrilho: brilho, relevo: r, centro: CENTRO });
      mundo.add(tochas.grupo);
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
            uniforms: { cor: { value: cor }, tempo: { value: 0 }, forca: { value: 1 } },
            vertexShader: `varying float vY; void main(){ vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
            fragmentShader: `uniform vec3 cor; uniform float tempo; uniform float forca; varying float vY;
              void main(){ float a = pow(1.0 - vY, 1.6) * (0.75 + 0.25 * sin(tempo * 2.0)) * forca; gl_FragColor = vec4(cor * 1.6, 1.0) * a; }`,
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
        alvo.userData = { escola: e, indice: i, luz, feixe, onda, fase: i * 0.7, base: new THREE.Vector3(x, y + 0.25, z), chao: new THREE.Vector3(x, y, z) };
        grupoEscolas.add(alvo);
        alvosClique.push(alvo);
      });
    }

    // Portal: aberto pelo roteiro (capítulos das escolas) ou por clique no fim da história
    let escolaAberta = null; // aberta por clique
    let escolaRoteiro = null; // aberta pelo roteiro
    let mistura = 0;
    const camFoco = new THREE.Vector3();
    const alvoFoco = new THREE.Vector3();
    const direcao = new THREE.Vector3();

    function abrirPortal(alvo) {
      const e = alvo.userData.escola;
      const classe = CLASSE_DA_ESCOLA[e.id] || "todos";
      portal.abrir(alvo.userData.chao.clone().add(new THREE.Vector3(0, 2.7, 0)), texturaDaClasse(classe), e.cor || OURO, 3.6);
    }
    function abrirEscola(alvo) {
      escolaAberta = alvo;
      abrirPortal(alvo);
      aoSelecionarRef.current?.(alvo.userData.escola);
    }
    function fecharEscola() {
      escolaAberta = null;
      portal.fechar();
      aoSelecionarRef.current?.(null);
    }

    /** Pose da câmera de foco numa escola: de fora da cratera, olhando o portal com o impacto ao fundo. */
    function poseEscola(alvo) {
      const chao = alvo.userData.chao;
      direcao.set(chao.x - CENTRO.x, 0, chao.z - CENTRO.z).normalize();
      return { pos: chao.clone().addScaledVector(direcao, 7.5).setY(chao.y + 2.4), alvo: chao.clone().setY(chao.y + 2.3) };
    }
    function pose(c) {
      if (POSES_FIXAS[c]) return POSES_FIXAS[c];
      const alvo = alvosClique[c - CAP_ESCOLAS];
      return alvo ? poseEscola(alvo) : POSES_FIXAS[6];
    }

    // Câmera e roteiro
    const relogio = new THREE.Clock();
    let tAnterior = 0;
    let progresso = 0;
    let s = 0; // posição suavizada na história
    let sAnterior = 0;
    let giro = 0;
    let giroAlvo = 0;
    let arrastando = null;
    let quadro = 0;
    let visivel = true;
    let foco = null;
    const ray = new THREE.Raycaster();
    const ponteiro = new THREE.Vector2(9, 9);
    const tela = new THREE.Vector3();
    const posCam = new THREE.Vector3();
    const alvoCamera = new THREE.Vector3();
    const eixoY = new THREE.Vector3(0, 1, 0);

    function lerScroll() {
      const r = secao.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      progresso = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
    }

    function posicionarCamera(dt) {
      const c = Math.min(FINAL - 1, Math.floor(s));
      const k = suave(0.45, 1, s - c);
      const a = pose(c);
      const b = pose(c + 1);
      posCam.lerpVectors(a.pos, b.pos, k);
      alvoCamera.lerpVectors(a.alvo, b.alvo, k);

      // no fim da história dá para girar arrastando e abrir as escolas com clique
      const livre = suave(FINAL - 0.4, FINAL, s);
      const ang = giro * livre;
      posCam.sub(CENTRO).applyAxisAngle(eixoY, ang).add(CENTRO);
      mistura += ((escolaAberta ? 1 : 0) - mistura) * (reduz ? 1 : 1 - Math.exp(-dt * 1.8));
      if (escolaAberta) {
        const p = poseEscola(escolaAberta);
        camFoco.copy(p.pos);
        alvoFoco.copy(p.alvo);
      }
      const m = mistura * mistura * (3 - 2 * mistura);
      camera.position.lerpVectors(posCam, camFoco, m);
      alvoCamera.lerp(alvoFoco, m);
      camera.lookAt(alvoCamera);

      // o terreno só aparece quando o meteoro se aproxima; antes disso é o espaço
      const terra = suave(2.2, 2.9, s);
      const d = camera.position.distanceTo(CENTRO);
      neblina.near = THREE.MathUtils.lerp(0.1, d * 0.75, terra);
      neblina.far = THREE.MathUtils.lerp(0.2, d + 15, terra);
      scene.background.set(NOITE).multiplyScalar(terra);
      neblina.color.copy(scene.background);
      mundo.visible = terra > 0.01;
    }

    function atualizarHistoria(t) {
      const luzCeu = suave(0.9, 1.7, s);
      ceu.atualizar(t, renderer.getPixelRatio(), luzCeu, suave(2.4, 3, s));
      bigBang.atualizar(s, t, renderer.getPixelRatio());
      meteoro.atualizar(s, ORIGEM_METEORO, CENTRO.clone().setY(chaoCentro + 0.3));
      emblema.atualizar(s, camera);

      const metritoAceso = suave(3, 3.4, s);
      const pulso = 0.75 + 0.25 * Math.sin(t * 1.3);
      nucleo.material.opacity = pulso * metritoAceso;
      metrito.intensity = (13 + 4 * Math.sin(t * 1.3)) * metritoAceso;
      matFeixeQueda.opacity = 0.4 * metritoAceso;
      if (poeira) poeira.visible = metritoAceso > 0.01;
      uMetrito.raio.value = THREE.MathUtils.lerp(0.4, 1.6, metritoAceso) + suave(3.6, 4.8, s) * 18;
      if (matTerreno) matTerreno.emissiveIntensity = (0.9 + 0.3 * Math.sin(t * 1.3)) * metritoAceso;

      const subida = suave(3, 4, s);
      fragmentos.forEach((f) => {
        f.visible = subida > 0.01;
        f.position.set(CENTRO.x + f.userData.base.x, chaoCentro + f.userData.base.y * subida, CENTRO.z + f.userData.base.z);
        if (!reduz) {
          f.position.y += Math.sin(t * 0.3 + f.userData.fase) * 0.08;
          f.rotation.x += f.userData.gira;
          f.rotation.y += f.userData.gira * 0.7;
        }
      });
      if (arvores) arvores.grupo.visible = s > 2.2;
      tochas?.atualizar(s, t);

      // som: o Big Bang e o impacto, só quando a história passa por eles indo para a frente
      if (sAnterior < 1 && s >= 1) somRef.current?.estrondo(0.6);
      if (sAnterior < 3 && s >= 3) somRef.current?.estrondo(1);
      sAnterior = s;

      // escolas aparecem com A Ordem
      const escolasVisiveis = suave(5.6, 6.2, s);
      grupoEscolas.visible = escolasVisiveis > 0.01;
      alvosClique.forEach((a) => {
        a.userData.luz.material.opacity = escolasVisiveis;
        a.userData.feixe.material.uniforms.forca.value = escolasVisiveis;
      });

      // capítulos das escolas: o portal abre sozinho
      const c = Math.round(s);
      const atual = c >= CAP_ESCOLAS && c < FINAL && Math.abs(s - c) < 0.5 ? alvosClique[c - CAP_ESCOLAS] : null;
      if (!escolaAberta && atual !== escolaRoteiro) {
        escolaRoteiro = atual;
        if (atual) abrirPortal(atual);
        else portal.fechar();
      }
      if (escolaAberta && s < FINAL - 0.5) fecharEscola();

      // textos
      secao.querySelectorAll("[data-capitulo]").forEach((el) => {
        const o = opacidadeCapitulo(Number(el.dataset.capitulo), s) * (escolaAberta ? 0 : 1);
        el.style.opacity = o.toFixed(3);
        el.style.visibility = o > 0.01 ? "visible" : "hidden";
        el.style.transform = `translateY(${((1 - o) * 14).toFixed(1)}px)`;
      });
      if (dicaRef.current) dicaRef.current.style.opacity = (1 - suave(0.05, 0.4, s)).toFixed(3);
    }

    function atualizarRotulo() {
      const el = rotuloRef.current;
      if (!el) return;
      if (!foco || escolaAberta || s < FINAL - 0.4) {
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
      const alvoS = progresso * FINAL;
      s += (alvoS - s) * (reduz ? 1 : 1 - Math.exp(-dt * 3.5));
      if (Math.abs(alvoS - s) < 0.0005) s = alvoS;
      giro += (giroAlvo - giro) * 0.08;
      posicionarCamera(dt);
      atualizarHistoria(t);

      matPoeira.uniforms.tempo.value = t;
      const livre = s > FINAL - 0.4;
      ray.setFromCamera(ponteiro, camera);
      const hit = livre ? ray.intersectObjects(alvosClique)[0]?.object || null : null;
      if (hit !== foco) {
        foco = hit;
        palco.style.cursor = hit ? "pointer" : livre ? "grab" : "default";
      }
      alvosClique.forEach((a) => {
        const { luz, feixe, onda, fase } = a.userData;
        const alvoEscala = a === foco || a === escolaAberta || a === escolaRoteiro ? 1.7 : 1;
        luz.scale.setScalar(luz.scale.x + (alvoEscala - luz.scale.x) * 0.15);
        feixe.material.uniforms.tempo.value = t + fase;
        const ciclo = ((reduz ? 0.5 : t * 0.35) + fase) % 1;
        onda.scale.setScalar(0.2 + ciclo * 0.9);
        onda.material.opacity = (1 - ciclo) * 0.6 * suave(5.6, 6.2, s);
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
      if (arrastando && !escolaAberta && s > FINAL - 0.4) {
        giroAlvo = arrastando.giro - ((ev.clientX - arrastando.x) / r.width) * 3;
        if (Math.abs(ev.clientX - arrastando.x) > 4) arrastando.moveu = true;
      }
    };
    const aoApertar = (ev) => {
      arrastando = { x: ev.clientX, giro: giroAlvo, moveu: false };
    };
    const aoSoltar = (ev) => {
      if (arrastando && !arrastando.moveu && s > FINAL - 0.4) {
        // raio na hora do clique, sem depender do último quadro desenhado
        aoMover(ev);
        ray.setFromCamera(ponteiro, camera);
        const clicado = ray.intersectObjects(alvosClique)[0]?.object || null;
        if (clicado && clicado !== escolaAberta) abrirEscola(clicado);
        else if (!clicado && escolaAberta) fecharEscola();
      }
      arrastando = null;
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
    s = progresso * FINAL;
    sAnterior = s;
    tocar();

    return () => {
      fechado = true;
      cancelAnimationFrame(quadro);
      limparEscolas();
      ceu.descartar();
      arvores?.descartar();
      tochas?.descartar();
      bigBang.descartar();
      meteoro.descartar();
      emblema.descartar();
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
    <section ref={secaoRef} style={{ ...st.secao, height: `${(FINAL + 1) * 100}vh` }}>
      <div ref={fixoRef} style={st.fixo}>
        <div ref={palcoRef} style={st.palco} />
        <div style={st.vinheta} />
        <div ref={rotuloRef} style={st.rotulo}>
          <strong style={st.rotuloNome} />
          <span style={st.rotuloSub} />
        </div>

        {/* Capítulos 0 a 7: a história */}
        {historia.map((texto, i) => (
          <p key={i} data-capitulo={i} style={{ ...st.capitulo, ...(i === 1 || i === 3 ? st.capituloCentro : null) }}>
            {texto}
          </p>
        ))}

        {/* Capítulos 8 a 11: as escolas */}
        {escolas.slice(0, FINAL - CAP_ESCOLAS).map((e, i) => (
          <div key={e.id} data-capitulo={CAP_ESCOLAS + i} style={st.escola}>
            <p style={{ ...st.painelSub, color: e.cor || OURO }}>{e.subtitulo}</p>
            <h2 style={st.painelNome}>{e.nome}</h2>
            <p style={st.escolaResumo}>{e.resumo}</p>
            <button type="button" style={st.painelBotao} onClick={() => onEscola?.(e.id)}>
              CONHECER A ESCOLA
            </button>
          </div>
        ))}

        {/* Capítulo 12: a entrada */}
        <div data-capitulo={FINAL} style={st.final}>
          <button type="button" style={st.painelBotao} onClick={() => onEntrar?.()}>
            ENTRAR NA ORDEM
          </button>
          <p style={st.finalDica}>Arraste para girar · clique nas luzes para rever as escolas</p>
        </div>

        <p ref={dicaRef} style={{ ...st.rolar, visibility: entrou ? "visible" : "hidden" }}>
          ROLE PARA DESCOBRIR
          <br />↓
        </p>

        {selecionada && (
          <>
            <button type="button" style={st.voltar} onClick={() => mundoRef.current?.fecharEscola()}>
              ← VOLTAR
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
            <p style={st.portaoTitulo}>A QUEDA DE UMA ORDEM</p>
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

const SERIFA = "'Palatino Linotype', 'Book Antiqua', Palatino, serif";

const st = {
  capitulo: {
    position: "absolute",
    left: "clamp(20px, 8vw, 120px)",
    top: "clamp(70px, 16vh, 150px)",
    maxWidth: "min(88vw, 36ch)",
    margin: 0,
    fontFamily: SERIFA,
    fontSize: "clamp(1.05em, 2vw, 1.4em)",
    lineHeight: 1.55,
    color: "#efe6cf",
    textShadow: "0 2px 18px rgba(0,0,0,0.9)",
    opacity: 0,
    visibility: "hidden",
    pointerEvents: "none",
    willChange: "opacity, transform",
  },
  capituloCentro: { left: "50%", translate: "-50% 0", textAlign: "center", top: "auto", bottom: "clamp(70px, 14vh, 130px)" },
  escola: {
    position: "absolute",
    right: "clamp(20px, 7vw, 110px)",
    bottom: "clamp(28px, 9vh, 90px)",
    maxWidth: "min(88vw, 380px)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    alignItems: "flex-start",
    opacity: 0,
    visibility: "hidden",
    padding: "18px 20px",
    background: "linear-gradient(to bottom, rgba(6,9,12,0.15), rgba(6,9,12,0.7))",
    borderLeft: "1px solid rgba(232,208,138,0.35)",
  },
  escolaResumo: { margin: 0, color: "#cfc6b0", lineHeight: 1.6, fontSize: "0.95em" },
  final: {
    position: "absolute",
    left: "50%",
    bottom: "clamp(84px, 12vh, 110px)",
    translate: "-50% 0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    opacity: 0,
    visibility: "hidden",
    width: "min(90vw, 520px)",
    textAlign: "center",
  },
  finalDica: { margin: 0, fontSize: "0.7em", letterSpacing: "1px", color: "#7d8a92" },
  rolar: {
    position: "absolute",
    left: "50%",
    bottom: 84,
    transform: "translateX(-50%)",
    margin: 0,
    textAlign: "center",
    fontSize: "0.66em",
    letterSpacing: "4px",
    color: "#8a95a0",
    lineHeight: 2,
    pointerEvents: "none",
  },
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
    fontFamily: SERIFA,
    fontSize: "clamp(1.8em, 5vw, 2.8em)",
    fontWeight: 400,
    color: "#efe6cf",
    textShadow: "0 2px 24px rgba(0,0,0,0.8)",
  },
  painelBotao: {
    marginTop: 6,
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
  secao: { position: "relative", zIndex: 2 },
  fixo: { position: "sticky", top: 0, height: "100vh", overflow: "hidden" },
  palco: { position: "absolute", inset: 0, touchAction: "pan-y" },
  vinheta: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background: "radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(4,6,8,0.75) 100%), linear-gradient(to bottom, transparent 80%, #070906 100%)",
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
    background: "radial-gradient(ellipse at center, #0b0e12 0%, #000 75%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    padding: "24px",
    textAlign: "center",
  },
  portaoTitulo: { margin: 0, letterSpacing: "8px", fontSize: "0.95em", color: "#e8d08a" },
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
