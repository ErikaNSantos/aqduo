// Som da abertura, gerado no navegador (sem arquivos de áudio):
// trilha em camadas que acompanha os capítulos da história e efeitos para o
// Big Bang, a queda do meteoro e o impacto. Tudo passa por um reverb de
// espaço grande, feito com um impulso de ruído que decai.
//
// Capítulos (s): 0 o nada · 1 Big Bang · 2 meteoro · 3 impacto · 4 Scrips
// 5 perseguição · 6 A Ordem · 7 emblema · 8–11 escolas · 12 final

const suave = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Ré menor: o tom da Ordem
const ACORDES = [
  [146.83, 174.61, 220.0, 293.66], // Rém
  [116.54, 146.83, 174.61, 233.08], // Si♭
  [87.31, 130.81, 174.61, 220.0], // Fá
  [130.81, 164.81, 196.0, 261.63], // Dó
];
const TEMA = [587.33, 698.46, 880.0, 783.99, 698.46, 659.26, 587.33]; // ré fá lá sol fá mi ré
const DURACAO_TEMA = [0.55, 0.55, 1.1, 0.55, 0.55, 0.55, 1.6];

export function criarTrilha() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx();

  const mestre = ctx.createGain();
  mestre.gain.value = 0;
  const limitador = ctx.createDynamicsCompressor();
  limitador.threshold.value = -10;
  limitador.ratio.value = 6;
  mestre.connect(limitador).connect(ctx.destination);

  // Reverb: impulso estéreo de ruído com decaimento de ~5 s
  const reverb = ctx.createConvolver();
  {
    const dur = 5;
    const imp = ctx.createBuffer(2, ctx.sampleRate * dur, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = imp.getChannelData(c);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3.2);
    }
    reverb.buffer = imp;
  }
  const voltaReverb = ctx.createGain();
  voltaReverb.gain.value = 0.55;
  reverb.connect(voltaReverb).connect(mestre);

  // Uma saída "seca" e um envio para o reverb, por camada
  function camada(envio = 0.5) {
    const g = ctx.createGain();
    g.gain.value = 0;
    g.connect(mestre);
    const e = ctx.createGain();
    e.gain.value = envio;
    g.connect(e).connect(reverb);
    return g;
  }

  const ruido = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
  {
    const d = ruido.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const fonteRuido = (loop = false) => {
    const r = ctx.createBufferSource();
    r.buffer = ruido;
    r.loop = loop;
    return r;
  };

  // ── Camadas contínuas ───────────────────────────────
  // Drone grave em ré, presente em quase tudo
  const drone = camada(0.3);
  [36.71, 73.42, 110.0].forEach((f, i) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    o.detune.value = i * 3;
    const g = ctx.createGain();
    g.gain.value = [0.5, 0.25, 0.06][i];
    o.connect(g).connect(drone);
    o.start();
  });

  // Vento distante
  const vento = camada(0.2);
  {
    const r = fonteRuido(true);
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 400;
    f.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.value = 0.12;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const gl = ctx.createGain();
    gl.gain.value = 0.08;
    lfo.connect(gl).connect(g.gain);
    r.connect(f).connect(g).connect(vento);
    r.start();
    lfo.start();
  }

  // Brilho cósmico: notas agudas com tremolo lento (o universo recém-nascido)
  const cosmos = camada(0.9);
  [880.0, 1174.66, 1318.51, 1760.0].forEach((f, i) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.value = 0;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.13 + i * 0.07;
    const gl = ctx.createGain();
    gl.gain.value = 0.05;
    lfo.connect(gl).connect(g.gain);
    o.connect(g).connect(cosmos);
    o.start();
    lfo.start();
  });

  // Tensão da queda: grave pulsando
  const tensao = camada(0.3);
  {
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = 55;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 260;
    const g = ctx.createGain();
    g.gain.value = 0.15;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 2.2;
    const gl = ctx.createGain();
    gl.gain.value = 0.12;
    lfo.connect(gl).connect(g.gain);
    o.connect(f).connect(g).connect(tensao);
    o.start();
    lfo.start();
  }

  // Dissonância da perseguição: trítono grave
  const dissonante = camada(0.4);
  [73.42, 103.83].forEach((f) => {
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.value = 0.12;
    o.connect(g).connect(dissonante);
    o.start();
  });

  // Camadas com notas agendadas
  const pad = camada(0.7);
  const tambores = camada(0.35);
  const sinos = camada(0.9);

  const camadas = { drone, vento, cosmos, tensao, dissonante, pad, tambores, sinos };

  // ── Instrumentos ─────────────────────────────────────
  function acordePad(notas, quando, dur) {
    const filtro = ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.frequency.value = 900;
    filtro.Q.value = 0.4;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, quando);
    env.gain.linearRampToValueAtTime(0.07, quando + 2.5);
    env.gain.setValueAtTime(0.07, quando + dur - 2.5);
    env.gain.linearRampToValueAtTime(0, quando + dur + 0.5);
    filtro.connect(env).connect(pad);
    notas.forEach((f) => {
      [-7, 7].forEach((det) => {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = f;
        o.detune.value = det;
        o.connect(filtro);
        o.start(quando);
        o.stop(quando + dur + 0.6);
      });
    });
  }

  function tambor(quando, forca = 1) {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(110, quando);
    o.frequency.exponentialRampToValueAtTime(42, quando + 0.35);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, quando);
    g.gain.exponentialRampToValueAtTime(0.9 * forca, quando + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, quando + 0.7);
    o.connect(g).connect(tambores);
    o.start(quando);
    o.stop(quando + 0.75);
    const r = fonteRuido();
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 700;
    const gr = ctx.createGain();
    gr.gain.setValueAtTime(0.35 * forca, quando);
    gr.gain.exponentialRampToValueAtTime(0.0001, quando + 0.18);
    r.connect(f).connect(gr).connect(tambores);
    r.start(quando, Math.random() * 2);
    r.stop(quando + 0.2);
  }

  function sino(freq, quando, forca = 1) {
    [
      [1, 0.25, 3.5],
      [2.76, 0.08, 1.6],
      [5.4, 0.04, 0.8],
    ].forEach(([mult, vol, dur]) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = freq * mult;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, quando);
      g.gain.exponentialRampToValueAtTime(vol * forca, quando + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, quando + dur);
      o.connect(g).connect(sinos);
      o.start(quando);
      o.stop(quando + dur + 0.05);
    });
  }

  // ── Efeitos ──────────────────────────────────────────
  const efeitos = camada(0.8);
  efeitos.gain.value = 1;

  /** O Big Bang: o universo "inspira" e explode num estrondo longo. */
  function bigBang() {
    const t = ctx.currentTime;
    // inspiração: ruído subindo e ficando agudo
    const r = fonteRuido();
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(200, t);
    f.frequency.exponentialRampToValueAtTime(3200, t + 0.9);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.85);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
    r.connect(f).connect(g).connect(efeitos);
    r.start(t);
    r.stop(t + 1);
    estrondo(t + 0.9, 1.1, 7);
  }

  /** Estrondo: boom grave que afunda e ronco de ruído grave, longos. */
  function estrondo(t, forca, dur) {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(62, t);
    o.frequency.exponentialRampToValueAtTime(22, t + dur * 0.6);
    const go = ctx.createGain();
    go.gain.setValueAtTime(0.0001, t);
    go.gain.exponentialRampToValueAtTime(0.9 * forca, t + 0.04);
    go.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.7);
    o.connect(go).connect(efeitos);
    o.start(t);
    o.stop(t + dur);
    const r = fonteRuido(true);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(2400, t);
    f.frequency.exponentialRampToValueAtTime(90, t + dur * 0.8);
    const gr = ctx.createGain();
    gr.gain.setValueAtTime(0.0001, t);
    gr.gain.exponentialRampToValueAtTime(0.6 * forca, t + 0.03);
    gr.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    r.connect(f).connect(gr).connect(efeitos);
    r.start(t);
    r.stop(t + dur + 0.1);
  }

  let assobio = null;
  /** O meteoro caindo: um assobio de ar rasgado, cada vez mais agudo e alto. */
  function queda() {
    pararQueda();
    const t = ctx.currentTime;
    const r = fonteRuido(true);
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 3;
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(2600, t + 3);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 3);
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(70, t);
    o.frequency.exponentialRampToValueAtTime(140, t + 3);
    const lf = ctx.createBiquadFilter();
    lf.type = "lowpass";
    lf.frequency.value = 300;
    const go = ctx.createGain();
    go.gain.setValueAtTime(0.0001, t);
    go.gain.exponentialRampToValueAtTime(0.25, t + 3);
    r.connect(f).connect(g).connect(efeitos);
    o.connect(lf).connect(go).connect(efeitos);
    r.start(t);
    o.start(t);
    assobio = { r, o, g, go };
  }
  function pararQueda(rapido = false) {
    if (!assobio) return;
    const t = ctx.currentTime;
    const { r, o, g, go } = assobio;
    [g, go].forEach((x) => {
      x.gain.cancelScheduledValues(t);
      x.gain.setValueAtTime(Math.max(x.gain.value, 0.0001), t);
      x.gain.exponentialRampToValueAtTime(0.0001, t + (rapido ? 0.05 : 0.6));
    });
    r.stop(t + 0.7);
    o.stop(t + 0.7);
    assobio = null;
  }

  /** O impacto: estalo seco, boom grave e o ronco da onda de choque rolando. */
  function impacto() {
    pararQueda(true);
    const t = ctx.currentTime;
    const r = fonteRuido();
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    r.connect(f).connect(g).connect(efeitos);
    r.start(t);
    r.stop(t + 0.3);
    estrondo(t, 1.2, 4.5);
    // a onda de choque: ronco grave que vai e volta enquanto se afasta
    const ronco = fonteRuido(true);
    const fr = ctx.createBiquadFilter();
    fr.type = "lowpass";
    fr.frequency.value = 160;
    const gr = ctx.createGain();
    gr.gain.setValueAtTime(0.0001, t + 0.3);
    gr.gain.exponentialRampToValueAtTime(0.5, t + 1.2);
    gr.gain.exponentialRampToValueAtTime(0.0001, t + 6);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5;
    const gl = ctx.createGain();
    gl.gain.value = 0.15;
    lfo.connect(gl).connect(gr.gain);
    ronco.connect(fr).connect(gr).connect(efeitos);
    ronco.start(t + 0.3);
    ronco.stop(t + 6.2);
    lfo.start(t);
    lfo.stop(t + 6.2);
  }

  // ── Agendador: acordes, tambores e o tema ─────────────
  let alvos = {};
  let proximoAcorde = 0;
  let indiceAcorde = 0;
  let proximoTambor = 0;
  let proximoTema = 0;
  let sAnterior = null;

  const agendador = setInterval(() => {
    if (ctx.state !== "running") return;
    const agora = ctx.currentTime;
    if ((alvos.pad || 0) > 0.01 && agora + 1 > proximoAcorde) {
      const quando = Math.max(agora + 0.05, proximoAcorde);
      acordePad(ACORDES[indiceAcorde % ACORDES.length], quando, 8);
      indiceAcorde++;
      proximoAcorde = quando + 7.5;
    }
    if ((alvos.tambores || 0) > 0.01 && agora + 0.5 > proximoTambor) {
      const inicio = Math.max(agora + 0.05, proximoTambor);
      const batida = 0.75; // 80 bpm
      [
        [0, 1],
        [0.75, 0.6],
        [1.5, 1],
        [2.25, 0.5],
        [2.625, 0.5],
      ].forEach(([b, forca]) => tambor(inicio + b * batida, forca));
      proximoTambor = inicio + 4 * batida;
    }
    if ((alvos.sinos || 0) > 0.01 && agora + 0.5 > proximoTema) {
      let t = Math.max(agora + 0.05, proximoTema);
      TEMA.forEach((f, i) => {
        sino(f, t, i === 2 || i === TEMA.length - 1 ? 1 : 0.75);
        t += DURACAO_TEMA[i];
      });
      proximoTema = t + 6;
    }
  }, 120);

  return {
    ligar(on) {
      if (ctx.state === "suspended") ctx.resume();
      mestre.gain.cancelScheduledValues(ctx.currentTime);
      mestre.gain.linearRampToValueAtTime(on ? 0.6 : 0, ctx.currentTime + 1.5);
    },
    /** Ajusta as camadas para o capítulo s e dispara os efeitos ao passar pelos momentos. */
    atualizar(s) {
      alvos = {
        drone: 0.55 - 0.25 * suave(3.2, 4, s) + 0.2 * suave(4.6, 5, s) * (1 - suave(5.8, 6.2, s)),
        vento: 0.3 * suave(2.6, 3.2, s),
        cosmos: suave(0.95, 1.4, s) * (1 - suave(2.2, 2.8, s)),
        tensao: 0.8 * suave(1.9, 2.3, s) * (1 - suave(2.95, 3.1, s)),
        dissonante: suave(4.6, 4.9, s) * (1 - suave(5.8, 6.2, s)),
        pad: suave(3.3, 4, s) * (1 - suave(4.6, 4.9, s)) + suave(5.9, 6.5, s),
        tambores: suave(4.6, 4.9, s) * (1 - suave(5.8, 6.1, s)),
        sinos: suave(6.5, 7, s) * 0.9,
      };
      const t = ctx.currentTime;
      Object.entries(camadas).forEach(([nome, g]) => g.gain.setTargetAtTime(alvos[nome] || 0, t, 0.6));

      // efeitos: só quando a história passa pelo momento indo para a frente
      if (sAnterior !== null && ctx.state === "running") {
        if (sAnterior < 0.82 && s >= 0.82) bigBang();
        if (sAnterior < 2.1 && s >= 2.1 && s < 3) queda();
        if (sAnterior < 3 && s >= 3) impacto();
        if (s < 2 && assobio) pararQueda();
      }
      sAnterior = s;
    },
    fechar() {
      clearInterval(agendador);
      ctx.close();
    },
  };
}
