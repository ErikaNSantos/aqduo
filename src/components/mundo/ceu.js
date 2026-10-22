import * as THREE from "three";

// Céu noturno: degradê do horizonte ao zênite, estrelas que cintilam e a lua.
// Nada aqui sofre neblina, para o céu continuar nítido atrás do terreno.

export function criarCeu({ horizonte, direcaoLua, texturaBrilho }) {
  const grupo = new THREE.Group();
  const descartar = [];

  const geoCupula = new THREE.SphereGeometry(220, 48, 24);
  const matCupula = new THREE.ShaderMaterial({
    uniforms: {
      horizonte: { value: new THREE.Color(horizonte) },
      zenite: { value: new THREE.Color("#020409") },
      faixa: { value: new THREE.Color("#1b2a3d") },
      luz: { value: 1 },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform vec3 horizonte; uniform vec3 zenite; uniform vec3 faixa; uniform float luz; varying vec3 vDir;
      void main(){
        float h = clamp(vDir.y, 0.0, 1.0);
        vec3 c = mix(horizonte, zenite, pow(h, 0.45));
        // uma faixa leve de Via Láctea atravessando o céu
        float via = exp(-pow((vDir.x * 0.8 + vDir.z * 0.6 - vDir.y * 0.3) * 3.2, 2.0)) * smoothstep(0.0, 0.25, h);
        gl_FragColor = vec4((c + faixa * via * 0.6) * luz, 1.0);
      }`,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  grupo.add(new THREE.Mesh(geoCupula, matCupula));
  descartar.push(geoCupula, matCupula);

  const n = 3500;
  const pos = new Float32Array(n * 3);
  const brilho = new Float32Array(n);
  const fase = new Float32Array(n);
  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    do v.randomDirection();
    while (v.y < 0.02);
    v.multiplyScalar(200);
    pos.set([v.x, v.y, v.z], i * 3);
    brilho[i] = Math.pow(Math.random(), 3);
    fase[i] = Math.random() * 100;
  }
  const geoEstrelas = new THREE.BufferGeometry();
  geoEstrelas.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geoEstrelas.setAttribute("brilho", new THREE.BufferAttribute(brilho, 1));
  geoEstrelas.setAttribute("fase", new THREE.BufferAttribute(fase, 1));
  const matEstrelas = new THREE.ShaderMaterial({
    uniforms: { tempo: { value: 0 }, escala: { value: 1 }, luz: { value: 1 } },
    vertexShader: `
      uniform float tempo; uniform float escala; uniform float luz; attribute float brilho; attribute float fase; varying float vB;
      void main(){
        vB = (0.35 + brilho * 0.9) * (0.75 + 0.25 * sin(tempo * (1.0 + brilho * 3.0) + fase)) * luz;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = (1.6 + brilho * 3.2) * escala;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vB;
      void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vec3(0.85, 0.9, 1.0) * vB, 1.0) * smoothstep(0.5, 0.0, d); }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  grupo.add(new THREE.Points(geoEstrelas, matEstrelas));
  descartar.push(geoEstrelas, matEstrelas);

  const posLua = direcaoLua.clone().normalize().multiplyScalar(190);
  posLua.y = Math.max(posLua.y, 40);
  const matHalo = new THREE.SpriteMaterial({ map: texturaBrilho, color: "#9fb6d6", transparent: true, opacity: 0.35, depthWrite: false, fog: false });
  const halo = new THREE.Sprite(matHalo);
  halo.position.copy(posLua);
  halo.scale.setScalar(60);
  const matDisco = new THREE.SpriteMaterial({ map: texturaBrilho, color: "#f2f5fb", transparent: true, depthWrite: false, fog: false });
  const disco = new THREE.Sprite(matDisco);
  disco.position.copy(posLua);
  disco.scale.setScalar(12);
  grupo.add(halo, disco);
  descartar.push(matHalo, matDisco);

  return {
    grupo,
    /** luz: 0 apaga o céu (o nada antes do Big Bang), 1 é o céu normal; lua: mostra ou não a lua */
    atualizar(t, pixelRatio, luz = 1, lua = 1) {
      matEstrelas.uniforms.tempo.value = t;
      matEstrelas.uniforms.escala.value = pixelRatio;
      matEstrelas.uniforms.luz.value = luz;
      matCupula.uniforms.luz.value = luz;
      matHalo.opacity = 0.35 * lua;
      matDisco.opacity = lua;
    },
    descartar() {
      descartar.forEach((o) => o.dispose());
    },
  };
}
