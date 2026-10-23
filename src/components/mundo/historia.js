import * as THREE from "three";

// Peças da história contada pelo scroll. Cada uma recebe `s`, a posição na
// história (0 = antes de tudo, 1 = Big Bang, 2 = meteoro, 3 = impacto...), e se
// atualiza a partir dela, então rolar para trás desfaz a cena sozinho.

export const suave = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Raio (km) da frente da onda de choque do impacto: sai do centro em s = 3 e passa da borda do terreno. */
export const frenteOnda = (s) => suave(3, 4.2, s) * 22;

/** Big Bang: um clarão num ponto e milhares de partículas se espalhando em cores quentes e frias. */
export function criarBigBang({ centro, texturaBrilho }) {
  const n = 7000;
  const dir = new Float32Array(n * 3);
  const vel = new Float32Array(n);
  const cor = new Float32Array(n * 3);
  const v = new THREE.Vector3();
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    v.randomDirection();
    v.y *= 0.55; // um disco um pouco achatado, como uma galeria se formando
    dir.set([v.x, v.y, v.z], i * 3);
    vel[i] = Math.pow(Math.random(), 0.6);
    c.setHSL(Math.random() < 0.6 ? 0.08 + Math.random() * 0.06 : 0.55 + Math.random() * 0.1, 0.8, 0.55 + Math.random() * 0.3);
    cor.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(dir, 3));
  geo.setAttribute("vel", new THREE.BufferAttribute(vel, 1));
  geo.setAttribute("cor", new THREE.BufferAttribute(cor, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { expansao: { value: 0 }, brilho: { value: 0 }, tempo: { value: 0 }, escala: { value: 1 } },
    vertexShader: `
      uniform float expansao; uniform float tempo; uniform float escala;
      attribute float vel; attribute vec3 cor; varying vec3 vCor;
      void main(){
        float r = expansao * vel * 46.0;
        float a = tempo * 0.05 * (1.0 - vel);
        vec3 p = position * r;
        p.xz = mat2(cos(a), -sin(a), sin(a), cos(a)) * p.xz;
        vCor = cor;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (1.5 + 2.5 * (1.0 - vel)) * escala * (1.0 + 2.0 * (1.0 - expansao));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float brilho; varying vec3 vCor;
      void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vCor * brilho, 1.0) * smoothstep(0.5, 0.0, d); }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const pontos = new THREE.Points(geo, mat);
  pontos.position.copy(centro);
  pontos.frustumCulled = false;

  const matClarao = new THREE.SpriteMaterial({ map: texturaBrilho, color: "#ffe2b8", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const clarao = new THREE.Sprite(matClarao);
  clarao.position.copy(centro);

  const grupo = new THREE.Group();
  grupo.add(pontos, clarao);

  return {
    grupo,
    atualizar(s, t, pixelRatio) {
      const e = suave(0.85, 1.9, s);
      mat.uniforms.expansao.value = e;
      mat.uniforms.tempo.value = t;
      mat.uniforms.escala.value = pixelRatio;
      mat.uniforms.brilho.value = suave(0.85, 0.95, s) * (1 - suave(1.8, 2.4, s)) * 1.4;
      const pico = suave(0.8, 1.0, s) * (1 - suave(1.0, 1.5, s));
      matClarao.opacity = pico;
      clarao.scale.setScalar(4 + pico * 26);
      grupo.visible = s > 0.75 && s < 2.5;
    },
    descartar() {
      geo.dispose();
      mat.dispose();
      matClarao.dispose();
    },
  };
}

/** Meteoro: cai do alto até o centro do impacto, com rastro e clarão. A onda de choque fica no terreno. */
export function criarMeteoro({ texturaBrilho, cor }) {
  const grupo = new THREE.Group();
  const matNucleo = new THREE.SpriteMaterial({ map: texturaBrilho, color: "#eaf6ff", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const nucleo = new THREE.Sprite(matNucleo);
  nucleo.scale.setScalar(1.6);
  const matHalo = new THREE.SpriteMaterial({ map: texturaBrilho, color: cor, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const halo = new THREE.Sprite(matHalo);
  halo.scale.setScalar(5);
  grupo.add(nucleo, halo);

  const N = 60;
  const posRastro = new Float32Array(N * 3);
  const corRastro = new Float32Array(N * 3);
  const c = new THREE.Color(cor);
  for (let i = 0; i < N; i++) {
    const k = Math.pow(1 - i / N, 1.8);
    corRastro.set([c.r * k + 0.3 * k, c.g * k + 0.3 * k, c.b * k + 0.3 * k], i * 3);
  }
  const geoRastro = new THREE.BufferGeometry();
  geoRastro.setAttribute("position", new THREE.BufferAttribute(posRastro, 3));
  geoRastro.setAttribute("color", new THREE.BufferAttribute(corRastro, 3));
  const matRastro = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const rastro = new THREE.Line(geoRastro, matRastro);
  rastro.frustumCulled = false;

  const matClarao = new THREE.SpriteMaterial({ map: texturaBrilho, color: "#dff3ff", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const clarao = new THREE.Sprite(matClarao);

  const raiz = new THREE.Group();
  raiz.add(grupo, rastro, clarao);
  const p = new THREE.Vector3();
  const atras = new THREE.Vector3();

  return {
    grupo: raiz,
    /** origem: de onde cai; destino: ponto do impacto no chão */
    atualizar(s, origem, destino) {
      const u = Math.min(1, Math.max(0, (s - 2.05) / 0.95));
      const voando = u > 0 && u < 1;
      grupo.visible = voando;
      rastro.visible = voando;
      const k = u * u; // acelera ao cair
      p.lerpVectors(origem, destino, k);
      grupo.position.copy(p);
      // rastro: para trás ao longo do caminho
      for (let i = 0; i < N; i++) {
        const kk = Math.max(0, k - (i / N) * 0.35 * Math.max(k, 0.15));
        atras.lerpVectors(origem, destino, kk);
        posRastro.set([atras.x, atras.y, atras.z], i * 3);
      }
      geoRastro.attributes.position.needsUpdate = true;

      const d = s - 3;
      clarao.position.copy(destino).y += 0.5;
      const pico = d >= -0.02 ? 1 - suave(0, 0.45, d) : 0;
      matClarao.opacity = pico * 0.85;
      clarao.scale.setScalar(2 + (1 - pico) * 9);
    },
    descartar() {
      [matNucleo, matHalo, geoRastro, matRastro, matClarao].forEach((x) => x.dispose());
    },
  };
}

/** A perseguição: tochas da Inquisição fechando o cerco em volta da cratera. */
export function criarTochas({ texturaBrilho, relevo, centro, quantidade = 70 }) {
  const grupo = new THREE.Group();
  const mat = new THREE.SpriteMaterial({ map: texturaBrilho, color: "#ff6a2a", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const tochas = [];
  for (let i = 0; i < quantidade; i++) {
    const t = new THREE.Sprite(mat);
    t.userData = { ang: (i / quantidade) * Math.PI * 2 + Math.random() * 0.15, desvio: Math.random() * 2.5, fase: Math.random() * 10 };
    t.scale.setScalar(0.5 + Math.random() * 0.35);
    tochas.push(t);
    grupo.add(t);
  }
  return {
    grupo,
    atualizar(s, t) {
      const f = suave(4.55, 4.95, s) * (1 - suave(5.65, 6.1, s));
      grupo.visible = f > 0.01;
      mat.opacity = f;
      const raio = 15 - suave(4.6, 5.8, s) * 6.5;
      tochas.forEach((tocha) => {
        const { ang, desvio, fase } = tocha.userData;
        const x = centro.x + Math.cos(ang) * (raio + desvio);
        const z = centro.z + Math.sin(ang) * (raio + desvio);
        tocha.position.set(x, relevo.altura(x, z) + 0.25 + Math.sin(t * 9 + fase) * 0.03, z);
      });
    },
    descartar() {
      mat.dispose();
    },
  };
}

/**
 * O emblema de A Ordem no céu: aparece quando a história chega na Ordem e de novo no fim.
 * Flutua devagar, a rachadura pulsa em azul (o Metrito) e o disco se inclina de leve
 * seguindo o ponteiro.
 */
export function criarEmblemaCeu({ textura, posicao, altura = 9, cor = "#5cc3ff" }) {
  const geo = new THREE.PlaneGeometry(1, 1);
  const mat = new THREE.ShaderMaterial({
    uniforms: { mapa: { value: textura }, opacidade: { value: 0 }, tempo: { value: 0 }, cor: { value: new THREE.Color(cor) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform sampler2D mapa; uniform float opacidade; uniform float tempo; uniform vec3 cor; varying vec2 vUv;
      void main(){
        vec4 t = texture2D(mapa, vUv);
        float lum = dot(t.rgb, vec3(0.3, 0.59, 0.11));
        // a rachadura corre na vertical, um pouco à direita do centro da arte
        float fenda = exp(-pow((vUv.x - 0.53) / 0.045, 2.0)) * smoothstep(0.18, 0.3, vUv.y);
        float onda = 0.5 + 0.5 * sin(tempo * 2.2 - vUv.y * 9.0);
        vec3 c = t.rgb + cor * fenda * lum * (0.25 + 0.6 * onda);
        gl_FragColor = vec4(c, t.a * opacidade);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    fog: false,
  });
  const malha = new THREE.Mesh(geo, mat);
  malha.position.copy(posicao);
  malha.renderOrder = 5;
  const base = posicao.clone();
  const inclina = new THREE.Euler();
  const q = new THREE.Quaternion();
  let largura = altura * 0.77;
  malha.scale.set(largura, altura, 1);
  return {
    malha,
    centro: base,
    ajustarProporcao() {
      const i = textura.image;
      if (i && i.width) {
        largura = (altura * i.width) / i.height;
        malha.scale.set(largura, altura, 1);
      }
    },
    /** ponteiro: posição do mouse de -1 a 1 (para a inclinação) */
    atualizar(s, t, camera, ponteiro) {
      const o = suave(6.55, 7.05, s) * (1 - suave(7.55, 7.95, s)) + suave(11.45, 11.95, s);
      mat.uniforms.opacidade.value = Math.min(1, o);
      mat.uniforms.tempo.value = t;
      malha.visible = o > 0.01;
      malha.position.copy(base).y += Math.sin(t * 0.6) * 0.18;
      const px = Math.max(-1, Math.min(1, ponteiro.x));
      const py = Math.max(-1, Math.min(1, ponteiro.y));
      inclina.set(-py * 0.12, px * 0.18, 0);
      q.setFromEuler(inclina);
      malha.quaternion.copy(camera.quaternion).multiply(q);
    },
    descartar() {
      geo.dispose();
      mat.dispose();
    },
  };
}
