import * as THREE from "three";

// Portal que se abre sobre o marcador clicado: um disco com a imagem da classe
// dentro e um redemoinho de energia na cor da escola em volta. Sempre de frente
// para a câmera. Abre e fecha com uma animação curta.

const vertex = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const fragment = `
  uniform sampler2D imagem; uniform vec3 cor; uniform float tempo; uniform float abertura;
  varying vec2 vUv;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float ruido(vec2 p){
    vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p){ float s = 0.0; float a = 0.5; for (int i = 0; i < 5; i++){ s += a * ruido(p); p *= 2.03; a *= 0.5; } return s; }

  void main(){
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float ang = atan(p.y, p.x);
    float R = 0.6 * abertura;

    // redemoinho: ruído em coordenadas polares, girando e puxado para dentro
    float giro = ang + tempo * 0.9 + (1.0 - r) * 2.5;
    float n = fbm(vec2(cos(giro), sin(giro)) * 2.2 + vec2(r * 5.0 - tempo * 1.4, tempo * 0.3));
    float fios = pow(abs(sin(giro * 3.0 + n * 6.0)), 6.0);
    // a faixa de energia entra um pouco no disco, para borda e centro parecerem uma coisa só
    float faixa = smoothstep(R + 0.38 * abertura, R, r) * smoothstep(R - 0.2, R + 0.03, r);
    float energia = faixa * (0.45 + n * 0.9 + fios * 0.5) * abertura;

    // dentro: a imagem, com uma leve torção perto da borda
    float dentro = smoothstep(R + 0.02, R - 0.16, r) * step(0.001, abertura);
    float tor = pow(clamp(r / max(R, 0.001), 0.0, 1.0), 3.0) * 0.35 * sin(tempo * 0.7);
    vec2 q = mat2(cos(tor), -sin(tor), sin(tor), cos(tor)) * p;
    vec2 uvImg = q / max(R, 0.001) * 0.58 + 0.5;
    vec4 img = texture2D(imagem, uvImg);
    // fundo do disco na cor da escola, mais claro no meio, com o mesmo redemoinho da borda
    float rodamoinho = fbm(vec2(cos(giro), sin(giro)) * 1.6 + vec2(r * 3.0 - tempo * 0.6, tempo * 0.2));
    vec3 fundo = cor * mix(0.95, 0.6, smoothstep(0.0, R, r)) + cor * 0.35 * (rodamoinho - 0.5);
    vec3 traco = mix(img.rgb, vec3(1.0), 0.5) * 1.25; // o desenho da classe, claro sobre o fundo
    vec3 interior = mix(fundo, traco, img.a);

    vec3 anel = cor * (0.85 + n * 0.6) + vec3(1.0) * fios * 0.22;
    vec3 c = interior * dentro + anel * energia * 1.3;
    float a = clamp(dentro * 0.97 + energia, 0.0, 1.0);

    // granulado de filme, como no Overworld: ruído por pixel que muda a cada quadro
    float grao = hash(floor(gl_FragCoord.xy * 0.7) + floor(tempo * 24.0) * vec2(17.0, 31.0)) - 0.5;
    c += grao * (0.16 * dentro + 0.22 * energia);
    c *= 1.0 - 0.1 * dentro * smoothstep(0.0, R, r); // vinheta suave dentro do disco
    if (a < 0.01) discard;
    gl_FragColor = vec4(c, a);
  }`;

export function criarPortal() {
  const geo = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      imagem: { value: null },
      cor: { value: new THREE.Color("#ffffff") },
      tempo: { value: 0 },
      abertura: { value: 0 },
    },
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });
  const malha = new THREE.Mesh(geo, material);
  malha.renderOrder = 10;
  malha.visible = false;
  let alvo = 0;

  return {
    malha,
    /** Abre sobre `posicao` (topo do marcador) com a textura e a cor da escola. */
    abrir(posicao, textura, cor, tamanho = 4) {
      material.uniforms.imagem.value = textura;
      material.uniforms.cor.value.set(cor);
      malha.position.copy(posicao);
      malha.scale.setScalar(tamanho);
      malha.visible = true;
      alvo = 1;
    },
    fechar() {
      alvo = 0;
    },
    atualizar(t, dt, camera) {
      material.uniforms.tempo.value = t;
      const a = material.uniforms.abertura;
      a.value += (alvo - a.value) * (1 - Math.exp(-dt * (alvo ? 2.2 : 6)));
      if (!alvo && a.value < 0.01) {
        a.value = 0;
        malha.visible = false;
      }
      malha.quaternion.copy(camera.quaternion);
    },
    descartar() {
      geo.dispose();
      material.dispose();
    },
  };
}
