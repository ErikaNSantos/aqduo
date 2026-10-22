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
    float faixa = smoothstep(R + 0.38 * abertura, R, r) * smoothstep(R - 0.06, R + 0.02, r);
    float energia = faixa * (0.35 + n * 1.1 + fios * 0.8) * abertura;

    // dentro: a imagem, com uma leve torção perto da borda
    float dentro = smoothstep(R, R - 0.04, r) * step(0.001, abertura);
    float tor = pow(clamp(r / max(R, 0.001), 0.0, 1.0), 3.0) * 0.35 * sin(tempo * 0.7);
    vec2 q = mat2(cos(tor), -sin(tor), sin(tor), cos(tor)) * p;
    vec2 uvImg = q / max(R, 0.001) * 0.58 + 0.5;
    vec4 img = texture2D(imagem, uvImg);
    vec3 fundo = mix(mix(cor, vec3(1.0), 0.2) * 0.45, vec3(0.03, 0.04, 0.06), smoothstep(0.0, R, r)) + cor * 0.2 * fbm(q * 3.0 + tempo * 0.2);
    vec3 interior = mix(fundo, img.rgb * 1.3, img.a);

    vec3 viva = mix(cor, vec3(1.0), 0.35);
    vec3 c = interior * dentro + mix(viva, vec3(1.0), clamp(n * 0.6 + fios * 0.4, 0.0, 1.0)) * energia * 2.2;
    float a = clamp(dentro * 0.96 + energia, 0.0, 1.0);
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
