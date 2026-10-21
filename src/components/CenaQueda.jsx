import { useEffect, useRef } from "react";
import * as THREE from "three";
import { geoEquirectangular, geoPath } from "d3-geo";

// ─────────────────────────────────────────────
// CENA 3D DO HERO — a queda do meteoro primordial
// O meteoro cai, a energia se espalha pelo solo e acende as escolas da Ordem.
// ─────────────────────────────────────────────

const OURO = "#c4a050";
const OURO_BRILHO = "#e8c96a";
const FUNDO = "#070906";

const RAIO = 1;
const IMPACTO = { lat: 15, lng: 45 };

// Linha do tempo da animação, em segundos
const QUEDA = 2.6; // meteoro até o impacto
const VEIAS = 3.2; // energia até as escolas
const DESPERTAR = 2.2; // continentes acendendo

function latLngParaVetor(lat, lng, r = RAIO) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

/** Pontos sobre os continentes, amostrados de um mapa desenhado num canvas. */
function pontosDosContinentes(paises) {
  const W = 1024;
  const H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const proj = geoEquirectangular()
    .scale(W / (2 * Math.PI))
    .translate([W / 2, H / 2]);
  const path = geoPath(proj, ctx);
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  paises.forEach((p) => path(p));
  ctx.fill();
  const img = ctx.getImageData(0, 0, W, H).data;

  const posicoes = [];
  const passo = 1.1;
  for (let lat = -80; lat <= 82; lat += passo) {
    const voltas = Math.max(1, Math.round((360 / passo) * Math.cos((lat * Math.PI) / 180)));
    for (let i = 0; i < voltas; i++) {
      const lng = -180 + (360 * i) / voltas;
      const x = Math.floor(((lng + 180) / 360) * (W - 1));
      const y = Math.floor(((90 - lat) / 180) * (H - 1));
      if (img[(y * W + x) * 4 + 3] > 128) {
        const v = latLngParaVetor(lat, lng, RAIO * 1.002);
        posicoes.push(v.x, v.y, v.z);
      }
    }
  }
  return new Float32Array(posicoes);
}

/** Arco pelo menor caminho entre dois pontos da esfera, levemente acima da superfície. */
function arco(a, b, segmentos = 96) {
  const pontos = [];
  for (let i = 0; i <= segmentos; i++) {
    const t = i / segmentos;
    const p = new THREE.Vector3().copy(a).lerp(b, t).normalize();
    p.multiplyScalar(RAIO * (1.006 + 0.16 * Math.sin(Math.PI * t)));
    pontos.push(p);
  }
  return pontos;
}

/** Textura de brilho radial, usada no meteoro, no clarão e nas escolas. */
function texturaBrilho() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const suave = (x) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

export default function CenaQueda({ paises = [], escolas = [] }) {
  const caixaRef = useRef(null);
  const cenaRef = useRef(null);

  // Monta a cena uma vez
  useEffect(() => {
    const caixa = caixaRef.current;
    if (!caixa) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return; // sem WebGL: fica o fundo em gradiente da página
    }
    const reduzMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = "block";
    caixa.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    const alvoCamera = new THREE.Vector3(0, 0.62, 0);
    const descartaveis = [];
    const guarda = (...objs) => {
      descartaveis.push(...objs);
      return objs[0];
    };
    const brilho = guarda(texturaBrilho());

    // Estrelas
    const estrelas = new Float32Array(1800 * 3);
    for (let i = 0; i < 1800; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(30 + Math.random() * 40);
      estrelas.set([v.x, v.y, v.z], i * 3);
    }
    const geoEstrelas = guarda(new THREE.BufferGeometry());
    geoEstrelas.setAttribute("position", new THREE.BufferAttribute(estrelas, 3));
    scene.add(
      new THREE.Points(
        geoEstrelas,
        guarda(new THREE.PointsMaterial({ color: "#8a7a55", size: 0.09, transparent: true, opacity: 0.55, depthWrite: false })),
      ),
    );

    // Globo: inclinado no eixo, girando por dentro
    const eixo = new THREE.Group();
    eixo.rotation.x = 0.32;
    eixo.rotation.z = -0.12;
    scene.add(eixo);
    const globo = new THREE.Group();
    const rotacaoInicial = ((90 - (IMPACTO.lng + 180)) * Math.PI) / 180 - 0.22;
    globo.rotation.y = rotacaoInicial;
    eixo.add(globo);

    globo.add(
      new THREE.Mesh(
        guarda(new THREE.SphereGeometry(RAIO, 64, 64)),
        guarda(new THREE.MeshBasicMaterial({ color: "#0c0e0a" })),
      ),
    );

    // Atmosfera dourada (fresnel)
    const matAtmosfera = guarda(
      new THREE.ShaderMaterial({
        uniforms: { cor: { value: new THREE.Color(OURO) }, forca: { value: 0.55 } },
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          uniform vec3 cor;
          uniform float forca;
          varying vec3 vNormal;
          void main() {
            float f = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
            gl_FragColor = vec4(cor, 1.0) * f * forca;
          }`,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    );
    const atmosfera = new THREE.Mesh(guarda(new THREE.SphereGeometry(RAIO * 1.18, 64, 64)), matAtmosfera);
    eixo.add(atmosfera);

    // Continentes (preenchidos quando o mapa chega)
    const matTerra = guarda(
      new THREE.PointsMaterial({ color: OURO, size: 0.011, transparent: true, opacity: 0.22, depthWrite: false }),
    );
    const terra = new THREE.Points(guarda(new THREE.BufferGeometry()), matTerra);
    globo.add(terra);

    // Ponto de impacto, clarão e onda de choque
    const pImpacto = latLngParaVetor(IMPACTO.lat, IMPACTO.lng);
    const clarao = new THREE.Sprite(
      guarda(new THREE.SpriteMaterial({ map: brilho, color: OURO_BRILHO, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })),
    );
    clarao.position.copy(pImpacto).multiplyScalar(1.01);
    globo.add(clarao);

    const onda = new THREE.Mesh(
      guarda(new THREE.RingGeometry(0.92, 1, 64)),
      guarda(new THREE.MeshBasicMaterial({ color: OURO_BRILHO, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })),
    );
    onda.position.copy(pImpacto).multiplyScalar(1.004);
    onda.lookAt(pImpacto.clone().multiplyScalar(2));
    globo.add(onda);

    const cratera = new THREE.Sprite(
      guarda(new THREE.SpriteMaterial({ map: brilho, color: OURO, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })),
    );
    cratera.position.copy(pImpacto).multiplyScalar(1.01);
    cratera.scale.setScalar(0.16);
    globo.add(cratera);

    // Meteoro: núcleo, halo e rastro
    const meteoro = new THREE.Group();
    meteoro.add(
      new THREE.Mesh(guarda(new THREE.IcosahedronGeometry(0.035, 1)), guarda(new THREE.MeshBasicMaterial({ color: "#fff3cf" }))),
    );
    const halo = new THREE.Sprite(
      guarda(new THREE.SpriteMaterial({ map: brilho, color: OURO_BRILHO, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })),
    );
    halo.scale.setScalar(0.42);
    meteoro.add(halo);
    scene.add(meteoro);

    const TAM_RASTRO = 48;
    const geoRastro = guarda(new THREE.BufferGeometry());
    const posRastro = new Float32Array(TAM_RASTRO * 3);
    const corRastro = new Float32Array(TAM_RASTRO * 3);
    const corOuro = new THREE.Color(OURO_BRILHO);
    for (let i = 0; i < TAM_RASTRO; i++) {
      const k = Math.pow(1 - i / TAM_RASTRO, 1.6);
      corRastro.set([corOuro.r * k, corOuro.g * k, corOuro.b * k], i * 3);
    }
    geoRastro.setAttribute("position", new THREE.BufferAttribute(posRastro, 3));
    geoRastro.setAttribute("color", new THREE.BufferAttribute(corRastro, 3));
    const rastro = new THREE.Line(
      geoRastro,
      guarda(new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })),
    );
    scene.add(rastro);
    const origemMeteoro = new THREE.Vector3(5.5, 4.2, -2.5);
    const historico = [];

    // Veias de energia e escolas (montadas quando as escolas chegam)
    const grupoEscolas = new THREE.Group();
    globo.add(grupoEscolas);
    let veias = [];

    function montarEscolas(lista) {
      grupoEscolas.children.slice().forEach((o) => {
        grupoEscolas.remove(o);
        o.traverse((x) => {
          x.geometry?.dispose();
          x.material?.dispose();
        });
      });
      veias = lista
        .filter((e) => e.lat != null && e.lng != null)
        .map((e) => {
          const destino = latLngParaVetor(e.lat, e.lng);
          const pontos = arco(pImpacto, destino);
          const geo = new THREE.BufferGeometry().setFromPoints(pontos);
          geo.setDrawRange(0, 0);
          const linha = new THREE.Line(
            geo,
            new THREE.LineBasicMaterial({ color: e.cor || OURO, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
          );
          grupoEscolas.add(linha);

          const farol = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: brilho, color: e.cor || OURO, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
          );
          farol.position.copy(destino).multiplyScalar(1.015);
          grupoEscolas.add(farol);

          const coluna = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([destino.clone().multiplyScalar(1.003), destino.clone().multiplyScalar(1.13)]),
            new THREE.LineBasicMaterial({ color: e.cor || OURO, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
          );
          grupoEscolas.add(coluna);
          return { linha, farol, coluna, total: pontos.length, fase: Math.random() * Math.PI * 2 };
        });
    }

    // Estado compartilhado com os efeitos de dados
    const relogio = new THREE.Clock(false);
    let inicio = 0;
    const mouse = new THREE.Vector2();
    const mouseSuave = new THREE.Vector2();
    let visivel = true;
    let quadro = 0;

    function atualizar(t, dt) {
      // Rotação lenta do globo
      if (!reduzMovimento) globo.rotation.y += dt * 0.045;

      // Meteoro
      const alvo = globo.localToWorld(pImpacto.clone());
      const q = t / QUEDA;
      if (q < 1) {
        const k = q * q * q; // acelera ao cair
        meteoro.visible = true;
        meteoro.position.lerpVectors(origemMeteoro, alvo, k);
        halo.material.opacity = 0.6 + 0.4 * Math.sin(t * 30);
      } else {
        meteoro.visible = false;
      }
      historico.unshift(meteoro.visible ? meteoro.position.clone() : historico[0] || alvo);
      if (historico.length > TAM_RASTRO) historico.length = TAM_RASTRO;
      const apaga = q < 1 ? 1 : Math.max(0, 1 - (t - QUEDA) * 2.5);
      for (let i = 0; i < TAM_RASTRO; i++) {
        const p = historico[Math.min(i, historico.length - 1)];
        posRastro.set([p.x, p.y, p.z], i * 3);
      }
      geoRastro.attributes.position.needsUpdate = true;
      rastro.material.opacity = apaga;

      // Impacto
      const d = t - QUEDA;
      if (d >= 0) {
        const c = Math.max(0, 1 - d / 0.9);
        clarao.material.opacity = c;
        clarao.scale.setScalar(0.2 + 1.4 * suave(d / 0.5));
        const o = Math.min(1, d / 1.8);
        onda.scale.setScalar(0.02 + 0.55 * o);
        onda.material.opacity = 0.8 * (1 - o);
        cratera.material.opacity = 0.75 + 0.2 * Math.sin(t * 2.2);
      }

      // Continentes despertando
      matTerra.opacity = 0.22 + 0.6 * suave((t - QUEDA - 0.2) / DESPERTAR);
      matAtmosfera.uniforms.forca.value = 0.55 + 0.35 * Math.max(0, 1 - Math.abs(d) / 1.2);

      // Veias até as escolas
      veias.forEach((v, i) => {
        const p = suave((t - QUEDA - 0.3 - i * 0.25) / VEIAS);
        v.linha.geometry.setDrawRange(0, Math.floor(v.total * p));
        const chegou = suave((t - QUEDA - 0.3 - i * 0.25 - VEIAS) / 0.6);
        const pulso = 0.75 + 0.25 * Math.sin(t * 1.6 + v.fase);
        v.farol.material.opacity = chegou * pulso;
        v.farol.scale.setScalar(0.12 + 0.05 * pulso);
        v.coluna.material.opacity = chegou * 0.8;
        v.linha.material.opacity = 0.35 + 0.55 * (1 - chegou) + 0.15 * chegou * pulso;
      });

      // Paralaxe com o mouse
      mouseSuave.lerp(mouse, 0.04);
      eixo.rotation.y = mouseSuave.x * 0.18;
      eixo.rotation.x = 0.32 + mouseSuave.y * 0.1;
    }

    function enquadrar() {
      const w = caixa.clientWidth;
      const h = caixa.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = w + "px";
      renderer.domElement.style.height = h + "px";
      camera.aspect = w / h;
      // Em tela estreita, afasta a câmera para o globo caber na largura
      const dist = camera.aspect < 1 ? 4.6 / Math.max(camera.aspect, 0.55) : 4.6;
      camera.position.set(0, 0.25, dist);
      camera.lookAt(alvoCamera);
      camera.updateProjectionMatrix();
    }

    function desenhar() {
      quadro = 0;
      if (!visivel || document.hidden) return;
      const dt = Math.min(relogio.getDelta(), 0.05);
      atualizar(relogio.elapsedTime - inicio, dt);
      renderer.render(scene, camera);
      if (!reduzMovimento) quadro = requestAnimationFrame(desenhar);
    }
    const tocar = () => {
      if (!quadro && visivel && !document.hidden) {
        if (!relogio.running) relogio.start();
        quadro = requestAnimationFrame(desenhar);
      }
    };

    // Sem animação: mostra direto o estado final
    function estadoFinal() {
      inicio = -(QUEDA + VEIAS + DESPERTAR + 2);
      historico.length = 0;
      atualizar(QUEDA + VEIAS + DESPERTAR + 2, 0);
      renderer.render(scene, camera);
    }

    const aoMover = (ev) => {
      const r = caixa.getBoundingClientRect();
      mouse.set(((ev.clientX - r.left) / r.width) * 2 - 1, -(((ev.clientY - r.top) / r.height) * 2 - 1));
    };
    const aoClicar = () => {
      if (reduzMovimento) return;
      inicio = relogio.elapsedTime; // replay da queda
      historico.length = 0;
    };
    const aoVisibilidade = () => tocar();

    const ro = new ResizeObserver(() => {
      enquadrar();
      if (reduzMovimento) estadoFinal();
    });
    ro.observe(caixa);
    const io = new IntersectionObserver(([e]) => {
      visivel = e.isIntersecting;
      tocar();
    });
    io.observe(caixa);
    caixa.addEventListener("pointermove", aoMover);
    caixa.addEventListener("click", aoClicar);
    document.addEventListener("visibilitychange", aoVisibilidade);

    cenaRef.current = {
      terra,
      montarEscolas,
      redesenhar: () => (reduzMovimento ? estadoFinal() : null),
    };
    enquadrar();
    if (reduzMovimento) estadoFinal();
    else tocar();

    return () => {
      cancelAnimationFrame(quadro);
      ro.disconnect();
      io.disconnect();
      caixa.removeEventListener("pointermove", aoMover);
      caixa.removeEventListener("click", aoClicar);
      document.removeEventListener("visibilitychange", aoVisibilidade);
      montarEscolas([]);
      terra.geometry.dispose();
      descartaveis.forEach((o) => o.dispose?.());
      renderer.dispose();
      renderer.domElement.remove();
      cenaRef.current = null;
    };
  }, []);

  // Continentes, quando o mapa termina de carregar
  useEffect(() => {
    const cena = cenaRef.current;
    if (!cena || !paises.length) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pontosDosContinentes(paises), 3));
    cena.terra.geometry.dispose();
    cena.terra.geometry = geo;
    cena.redesenhar();
  }, [paises]);

  // Escolas (as coordenadas podem chegar depois, do Supabase)
  useEffect(() => {
    const cena = cenaRef.current;
    if (!cena) return;
    cena.montarEscolas(escolas);
    cena.redesenhar();
  }, [escolas]);

  return (
    <div
      ref={caixaRef}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, background: FUNDO, cursor: "pointer" }}
    />
  );
}
