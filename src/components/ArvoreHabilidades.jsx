import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../supabaseClient";

// Árvore de habilidades desenhada como uma árvore de verdade, feita de estrelas:
// raízes = habilidades inatas (H.I., vêm da linhagem e do Metrito no solo),
// tronco = aptidões, galhos = passivas, pontas dos galhos = ativas.

const LARGURA = 1000;
const ALTURA = 1000;
const CHAO = 690;
const TOPO_TRONCO = 400;
const ZOOM_MIN = 0.45;
const ZOOM_MAX = 4;

const OURO = "#e8d08a";
const CREME = "#efe6cf";
const AZUL = "#5cc3ff";
const ATIVA = "#fff4d6";
const CORES = [AZUL, OURO, ATIVA, CREME];
const SERIFA = "'Palatino Linotype', 'Book Antiqua', Palatino, serif";

const ehInata = (n) => n.id?.startsWith("hi_") || /^H\.?I\.?\s*:/i.test(n.nome || "");
const ehAptidao = (n) => /aptid/i.test(n.tipo || "");
const ehAtiva = (n) => /ativa/i.test(n.tipo || "") && !ehInata(n);
const nomeCurto = (n) => (n.nome || "").replace(/^H\.?I\.?\s*:\s*/i, "");

function categoria(n) {
  if (ehInata(n)) return { nome: "Inata (raiz)", cor: AZUL };
  if (ehAptidao(n)) return { nome: "Aptidão (tronco)", cor: OURO };
  if (ehAtiva(n)) return { nome: "Ativa (copa)", cor: ATIVA };
  return { nome: "Passiva (galho)", cor: CREME };
}

// ponto de uma curva quadrática de a até b com controle c
function naCurva(a, c, b, t) {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  };
}

const grau = (g) => (g * Math.PI) / 180;
const VISTA_INICIAL = { x: 0, y: 30, zoom: 1 };
// em tela em pé a árvore inteira fica pequena: começa mais perto, mostrando a copa e o tronco
const vistaPara = (el) => {
  const r = el?.getBoundingClientRect();
  return r && r.width / r.height < 0.8 ? { x: 190, y: 60, zoom: 1.6 } : VISTA_INICIAL;
};

/** Calcula a posição de cada estrela e os traços (galhos, raízes) que as ligam. */
function montarArvore(nodes, requisitos) {
  const pos = {};
  const tracos = [];
  const filhos = {};
  const temPai = new Set();
  requisitos.forEach((r) => {
    if (!nodes.some((n) => n.id === r.node_id) || !nodes.some((n) => n.id === r.requisito_node_id)) return;
    (filhos[r.requisito_node_id] ||= []).push(r.node_id);
    temPai.add(r.node_id);
  });

  const inatas = nodes.filter(ehInata);
  const aptidoes = nodes.filter((n) => !ehInata(n) && ehAptidao(n));
  const copa = nodes.filter((n) => !ehInata(n) && !ehAptidao(n) && !temPai.has(n.id));

  // Tronco: as aptidões sobem por ele, alternando os lados
  aptidoes.forEach((n, i) => {
    const t = (i + 1) / (aptidoes.length + 1);
    const y = CHAO - (CHAO - TOPO_TRONCO) * t * 0.95;
    const lado = i % 2 ? 1 : -1;
    pos[n.id] = { x: 500 + lado * 38, y };
    tracos.push({ tipo: "galho", d: `M500 ${y + 10} Q${500 + lado * 22} ${y + 6} ${500 + lado * 38} ${y}` });
  });

  // Galhos: dois nós por galho, abrindo em leque a partir do alto do tronco
  const nGalhos = Math.max(1, Math.ceil(copa.length / 2));
  for (let j = 0; j < nGalhos; j++) {
    const f = nGalhos === 1 ? 0.5 : j / (nGalhos - 1);
    const ang = 188 + 164 * f; // 180 é a esquerda, 270 é para cima, 360 a direita
    const desvio = Math.abs(ang - 270) / 82; // 0 no meio, 1 nas pontas
    const inicio = { x: 500, y: TOPO_TRONCO + desvio * 90 };
    const comp = 250 + desvio * 120 + (j % 2) * 30;
    // os galhos de lado sobem em arco, como uma copa redonda
    const fim = { x: inicio.x + Math.cos(grau(ang)) * comp, y: inicio.y + Math.sin(grau(ang)) * comp * (1 - desvio * 0.35) - desvio * 120 };
    const ctrl = { x: inicio.x + Math.cos(grau(ang)) * comp * 0.5, y: inicio.y + Math.sin(grau(ang)) * comp * 0.2 - 30 };
    tracos.push({ tipo: "galho", d: `M${inicio.x} ${inicio.y} Q${ctrl.x} ${ctrl.y} ${fim.x} ${fim.y}` });
    // raminhos sem estrela, só para o desenho ficar orgânico
    [0.35, 0.78].forEach((tq, k) => {
      const base = naCurva(inicio, ctrl, fim, tq);
      const a2 = ang + (k ? 32 : -32) * (j % 2 ? 1 : -1);
      const ponta = { x: base.x + Math.cos(grau(a2)) * 55, y: base.y + Math.sin(grau(a2)) * 55 };
      tracos.push({ tipo: "raminho", d: `M${base.x} ${base.y} Q${(base.x + ponta.x) / 2} ${(base.y + ponta.y) / 2 - 10} ${ponta.x} ${ponta.y}` });
    });
    [copa[j * 2], copa[j * 2 + 1]].forEach((n, k) => {
      if (!n) return;
      const p = naCurva(inicio, ctrl, fim, k === 0 ? 0.55 : 1);
      pos[n.id] = { ...p, ang: ang - desvio * 25 * Math.sign(ang - 270) };
    });
  }

  // Requisitos: cada habilidade nasce depois da que ela exige, num raminho próprio
  const crescer = (id, ang, prof) => {
    (filhos[id] || []).forEach((filho, i, todos) => {
      if (pos[filho] || prof > 6) return;
      const a = ang + (i - (todos.length - 1) / 2) * 28;
      const pai = pos[id];
      const p = { x: pai.x + Math.cos(grau(a)) * 85, y: pai.y + Math.sin(grau(a)) * 85 };
      pos[filho] = { ...p, ang: a };
      const c = { x: (pai.x + p.x) / 2, y: (pai.y + p.y) / 2 - 18 };
      tracos.push({ tipo: "galho", d: `M${pai.x} ${pai.y} Q${c.x} ${c.y} ${p.x} ${p.y}` });
      crescer(filho, a, prof + 1);
    });
  };
  Object.keys(pos).forEach((id) => crescer(id, pos[id].ang ?? 270, 0));

  // Raízes: as habilidades inatas, abaixo do chão
  const nRaizes = Math.max(1, Math.ceil(inatas.length / 2));
  for (let j = 0; j < nRaizes; j++) {
    const f = nRaizes === 1 ? 0.5 : j / (nRaizes - 1);
    const ang = 160 - 140 * f;
    const desvio = Math.abs(ang - 90) / 70;
    const inicio = { x: 500 + Math.cos(grau(ang)) * 12, y: CHAO };
    const comp = 250 + desvio * 90;
    const fim = { x: inicio.x + Math.cos(grau(ang)) * comp, y: Math.min(ALTURA - 40, inicio.y + Math.sin(grau(ang)) * comp * 0.75) };
    const ctrl = { x: inicio.x + Math.cos(grau(ang)) * comp * 0.6, y: inicio.y + 30 };
    tracos.push({ tipo: "raiz", d: `M${inicio.x} ${inicio.y} Q${ctrl.x} ${ctrl.y} ${fim.x} ${fim.y}` });
    [inatas[j * 2], inatas[j * 2 + 1]].forEach((n, k) => {
      if (!n) return;
      pos[n.id] = naCurva(inicio, ctrl, fim, k === 0 ? 0.62 : 1);
    });
  }

  // Ligações de requisito que não viraram raminho (ex.: requisito entre partes diferentes da árvore)
  requisitos.forEach((r) => {
    const a = pos[r.requisito_node_id];
    const b = pos[r.node_id];
    if (a && b && !tracos.some((t) => t.d.startsWith(`M${a.x} ${a.y}`) && t.d.endsWith(`${b.x} ${b.y}`))) {
      tracos.push({ tipo: "requisito", d: `M${a.x} ${a.y} L${b.x} ${b.y}` });
    }
  });

  return { pos, tracos };
}

// Poeira de estrelas no formato da copa (sempre igual, sem sorteio a cada render)
const FOLHAGEM = Array.from({ length: 140 }, (_, i) => {
  const a = i * 2.39996; // ângulo de ouro, espalha sem repetir
  const raio = Math.sqrt((i + 0.5) / 140);
  return { x: 500 + Math.cos(a) * raio * 400, y: 210 + Math.sin(a) * raio * 200, r: 0.6 + (i % 5) * 0.25, o: 0.15 + (i % 7) * 0.05 };
});

export default function ArvoreHabilidades({ fichaId, onVoltar, onFinalizar }) {
  const [nodes, setNodes] = useState([]);
  const [requisitos, setRequisitos] = useState([]);
  const [aprendidas, setAprendidas] = useState(new Set());
  const [pontosDisponiveis, setPontosDisponiveis] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [escolhida, setEscolhida] = useState(null);
  const [vista, setVista] = useState(VISTA_INICIAL);

  const svgRef = useRef(null);
  const toques = useRef(new Map());
  const pinca = useRef(null);

  useEffect(() => {
    async function carregarTudo() {
      try {
        setCarregando(true);
        if (fichaId) {
          const [{ data: ficha }, { data: minhas }] = await Promise.all([
            supabase.from("fichas").select("pontos_habilidade_ph").eq("id", fichaId).single(),
            supabase.from("ficha_skills").select("node_id").eq("ficha_id", fichaId),
          ]);
          if (ficha) setPontosDisponiveis(ficha.pontos_habilidade_ph);
          if (minhas) setAprendidas(new Set(minhas.map((m) => m.node_id)));
        }
        const [{ data: nData }, { data: rData }] = await Promise.all([
          supabase.from("skill_nodes").select("*"),
          supabase.from("skill_requisitos").select("*"),
        ]);
        setNodes((nData || []).filter((n) => !/equela/i.test(n.tipo || "")));
        setRequisitos(rData || []);
      } catch (err) {
        console.error("Erro ao carregar a árvore:", err);
      } finally {
        setCarregando(false);
      }
    }
    carregarTudo();
  }, [fichaId]);

  const { pos, tracos } = useMemo(() => montarArvore(nodes, requisitos), [nodes, requisitos]);

  // Zoom pela roda do mouse, centrado no ponteiro
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const aoRolar = (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomEm(e.deltaY > 0 ? 1 / 1.1 : 1.1, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    };
    setVista(vistaPara(el));
    el.addEventListener("wheel", aoRolar, { passive: false });
    return () => el.removeEventListener("wheel", aoRolar);
  }, [carregando]);

  function zoomEm(fator, fx = 0.5, fy = 0.5) {
    setVista((v) => {
      const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.zoom * fator));
      const w0 = LARGURA / v.zoom;
      const h0 = (ALTURA - 60) / v.zoom;
      const w1 = LARGURA / zoom;
      const h1 = (ALTURA - 60) / zoom;
      return { zoom, x: v.x + (w0 - w1) * fx, y: v.y + (h0 - h1) * fy };
    });
  }

  // Arrastar (mouse ou dedo) move a árvore; dois dedos dão zoom
  function aoApertar(e) {
    svgRef.current?.setPointerCapture(e.pointerId);
    toques.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (toques.current.size === 2) {
      const [a, b] = [...toques.current.values()];
      pinca.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }
  function aoMover(e) {
    const antes = toques.current.get(e.pointerId);
    if (!antes) return;
    const r = svgRef.current.getBoundingClientRect();
    toques.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (toques.current.size === 2 && pinca.current) {
      const [a, b] = [...toques.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      zoomEm(d / pinca.current, ((a.x + b.x) / 2 - r.left) / r.width, ((a.y + b.y) / 2 - r.top) / r.height);
      pinca.current = d;
      return;
    }
    // escala da tela para a árvore, respeitando o "meet" do SVG
    const escala = Math.max(LARGURA / vista.zoom / r.width, (ALTURA - 60) / vista.zoom / r.height);
    setVista((v) => ({ ...v, x: v.x - (e.clientX - antes.x) * escala, y: v.y - (e.clientY - antes.y) * escala }));
  }
  function aoSoltar(e) {
    toques.current.delete(e.pointerId);
    if (toques.current.size < 2) pinca.current = null;
  }

  if (carregando) {
    return <div style={{ color: "#9aa7ae", padding: "50px", fontFamily: SERIFA, letterSpacing: "3px" }}>LENDO AS ESTRELAS...</div>;
  }

  const porId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const vb = `${vista.x} ${vista.y} ${LARGURA / vista.zoom} ${(ALTURA - 60) / vista.zoom}`;
  const exige = escolhida ? requisitos.filter((r) => r.node_id === escolhida.id).map((r) => porId[r.requisito_node_id]).filter(Boolean) : [];
  const libera = escolhida ? requisitos.filter((r) => r.requisito_node_id === escolhida.id).map((r) => porId[r.node_id]).filter(Boolean) : [];
  const efeitos = escolhida?.efeitos_json ? Object.entries(escolhida.efeitos_json) : [];

  return (
    <div style={st.palco}>
      <style>{`
        @keyframes arvoreBrilho { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
        @keyframes arvoreCresce { from { stroke-dashoffset: 1 } to { stroke-dashoffset: 0 } }
        .arvore-traco { stroke-dasharray: 1; stroke-dashoffset: 0; animation: arvoreCresce 2.4s ease-out both; }
        .arvore-halo { animation: arvoreBrilho 3.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .arvore-traco, .arvore-halo { animation: none; } }
        @media (max-width: 600px) { .arvore-legenda { display: none !important; } }
      `}</style>
      <div style={st.ceu} />

      {/* Cabeçalho */}
      <div style={st.hud}>
        <p style={st.hudTitulo}>ÁRVORE DE HABILIDADES</p>
        <div style={st.hudPontos}>
          <strong style={st.hudNumero}>{pontosDisponiveis}</strong>
          <span style={st.hudRotulo}>PH disponíveis</span>
        </div>
        {onVoltar && (
          <button type="button" style={st.link} onClick={onVoltar}>
            ← Voltar ao dossiê
          </button>
        )}
      </div>

      {/* Legenda */}
      <div className="arvore-legenda" style={st.legenda}>
        {[
          ["Copa", "ativas", ATIVA],
          ["Galhos", "passivas", CREME],
          ["Tronco", "aptidões", OURO],
          ["Raízes", "inatas", AZUL],
        ].map(([parte, tipo, cor]) => (
          <span key={parte} style={st.legendaItem}>
            <i style={{ ...st.legendaPonto, background: cor, boxShadow: `0 0 8px ${cor}` }} />
            {parte} · {tipo}
          </span>
        ))}
      </div>

      <svg
        ref={svgRef}
        viewBox={vb}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Árvore de habilidades. Arraste para mover, use a roda do mouse ou dois dedos para aproximar."
        style={st.svg}
        onPointerDown={aoApertar}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
      >
        <defs>
          <radialGradient id="arvoreEstrela">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="35%" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          {CORES.map((c, i) => (
            <radialGradient key={c} id={`arvoreHalo${i}`}>
              <stop offset="0%" stopColor={c} stopOpacity="0.55" />
              <stop offset="100%" stopColor={c} stopOpacity="0" />
            </radialGradient>
          ))}
          <linearGradient id="arvoreSolo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0c1820" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#05080b" stopOpacity="1" />
          </linearGradient>
          <filter id="arvoreBorrao" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* chão: a linha do horizonte e o solo onde o Metrito corre */}
        <rect x={-3000} y={CHAO} width={7000} height={3000} fill="url(#arvoreSolo)" />
        <line x1={-3000} y1={CHAO} x2={4000} y2={CHAO} stroke="rgba(232,208,138,0.25)" strokeWidth="1" />
        <ellipse cx={500} cy={CHAO} rx={260} ry={14} fill={AZUL} opacity="0.12" filter="url(#arvoreBorrao)" />

        {/* tronco: três fios de luz que afinam para cima */}
        {[-12, 0, 12].map((dx, i) => (
          <path
            key={i}
            className="arvore-traco"
            pathLength="1"
            d={`M${500 + dx} ${CHAO} C${500 + dx * 0.8 - 6} ${CHAO - 110} ${500 + dx * 0.4 + 6} ${TOPO_TRONCO + 120} ${500 + dx * 0.2} ${TOPO_TRONCO}`}
            fill="none"
            stroke={OURO}
            strokeOpacity={i === 1 ? 0.8 : 0.35}
            strokeWidth={i === 1 ? 1.6 : 1}
          />
        ))}

        {FOLHAGEM.map((f, i) => (
          <circle key={`f${i}`} cx={f.x} cy={f.y} r={f.r} fill={OURO} opacity={f.o} />
        ))}

        {tracos.map((t, i) => (
          <g key={i}>
            <path d={t.d} fill="none" stroke={t.tipo === "raiz" ? AZUL : OURO} strokeOpacity="0.18" strokeWidth="5" filter="url(#arvoreBorrao)" />
            <path
              className="arvore-traco"
              pathLength="1"
              style={{ animationDelay: `${0.4 + (i % 12) * 0.08}s` }}
              d={t.d}
              fill="none"
              stroke={t.tipo === "raiz" ? AZUL : OURO}
              strokeOpacity={t.tipo === "requisito" ? 0.35 : t.tipo === "raminho" ? 0.4 : 0.7}
              strokeDasharray={t.tipo === "requisito" ? "3 5" : undefined}
              strokeWidth="1.1"
              strokeLinecap="round"
            />
          </g>
        ))}

        {/* estrelas */}
        {nodes.map((n, i) => {
          const p = pos[n.id];
          if (!p) return null;
          const { cor } = categoria(n);
          const tem = aprendidas.has(n.id);
          const ativa = ehAtiva(n);
          const r = ativa ? 7 : ehAptidao(n) ? 5.5 : 4.5;
          const sel = escolhida?.id === n.id;
          const rotuloAbaixo = !ehInata(n) || p.y < CHAO + 40;
          return (
            <g
              key={n.id}
              style={{ cursor: "pointer" }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setEscolhida(sel ? null : n)}
            >
              <circle cx={p.x} cy={p.y} r={22} fill="transparent" />
              <circle
                className="arvore-halo"
                style={{ animationDelay: `${(i % 7) * 0.45}s` }}
                cx={p.x}
                cy={p.y}
                r={tem || sel ? r * 4.2 : r * 2.6}
                fill={`url(#arvoreHalo${CORES.indexOf(cor)})`}
              />
              {ativa && (
                <path
                  d={`M${p.x - r * 2.6} ${p.y} L${p.x + r * 2.6} ${p.y} M${p.x} ${p.y - r * 2.6} L${p.x} ${p.y + r * 2.6}`}
                  stroke={cor}
                  strokeOpacity="0.7"
                  strokeWidth="0.8"
                />
              )}
              <circle cx={p.x} cy={p.y} r={r} fill={tem ? "url(#arvoreEstrela)" : "#0a0f14"} stroke={cor} strokeWidth={tem ? 0 : 1.3} />
              {sel && <circle cx={p.x} cy={p.y} r={r + 6} fill="none" stroke={cor} strokeWidth="0.8" strokeDasharray="2 3" />}
              <text
                x={p.x}
                y={rotuloAbaixo ? p.y + r + 15 : p.y - r - 9}
                textAnchor="middle"
                fill={cor}
                fillOpacity={tem || sel ? 1 : 0.78}
                fontSize="12.5"
                fontFamily={SERIFA}
                letterSpacing="0.6"
                style={{ paintOrder: "stroke", stroke: "#05080b", strokeWidth: 3.5, strokeLinejoin: "round" }}
              >
                {nomeCurto(n)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Zoom */}
      <div style={st.zoom}>
        <button type="button" style={st.zoomBotao} onClick={() => zoomEm(1.25)} aria-label="Aproximar">+</button>
        <button type="button" style={st.zoomBotao} onClick={() => zoomEm(1 / 1.25)} aria-label="Afastar">−</button>
        <button type="button" style={st.zoomBotao} onClick={() => setVista(vistaPara(svgRef.current))} aria-label="Ver a árvore inteira">◎</button>
      </div>

      {/* Detalhe da habilidade escolhida */}
      {escolhida && (
        <div style={st.painel}>
          <button type="button" style={st.fechar} onClick={() => setEscolhida(null)} aria-label="Fechar">×</button>
          <p style={{ ...st.painelTipo, color: categoria(escolhida).cor }}>{categoria(escolhida).nome}</p>
          <h3 style={st.painelNome}>{nomeCurto(escolhida)}</h3>
          <p style={st.painelStatus}>{aprendidas.has(escolhida.id) ? "✦ Já faz parte deste Scrip" : "Ainda não aprendida"}</p>
          {escolhida.descricao && <p style={st.painelTexto}>{escolhida.descricao}</p>}
          <div style={st.custos}>
            <span>{escolhida.custo_em_ph ? `${escolhida.custo_em_ph} PH` : "Sem custo de PH"}</span>
            {escolhida.custo_em_mana > 0 && <span>{escolhida.custo_em_mana} de mana</span>}
            {escolhida.custo_em_vigor > 0 && <span>{escolhida.custo_em_vigor} de vigor</span>}
          </div>
          {efeitos.length > 0 && (
            <ul style={st.lista}>
              {efeitos.map(([k, v]) => (
                <li key={k}>
                  {k.replace(/_/g, " ")}: {typeof v === "boolean" ? (v ? "sim" : "não") : String(v)}
                </li>
              ))}
            </ul>
          )}
          {exige.length > 0 && <p style={st.painelTexto}>Exige: {exige.map(nomeCurto).join(", ")}</p>}
          {libera.length > 0 && <p style={st.painelTexto}>Abre caminho para: {libera.map(nomeCurto).join(", ")}</p>}
        </div>
      )}

      {onFinalizar && (
        <button type="button" style={st.finalizar} onClick={onFinalizar}>
          FINALIZAR SCRIP ➔
        </button>
      )}
    </div>
  );
}

const st = {
  palco: {
    position: "relative",
    width: "100%",
    height: "calc(100svh - 120px)",
    minHeight: 480,
    overflow: "hidden",
    borderRadius: 10,
    border: "1px solid rgba(232,208,138,0.15)",
    background: "#06090d",
    fontFamily: SERIFA,
  },
  ceu: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background:
      "radial-gradient(ellipse 90% 60% at 50% 0%, rgba(92,195,255,0.08) 0%, transparent 60%), radial-gradient(1px 1px at 12% 18%, #fff8, transparent), radial-gradient(1px 1px at 28% 9%, #fff6, transparent), radial-gradient(1.4px 1.4px at 46% 22%, #fff9, transparent), radial-gradient(1px 1px at 63% 12%, #fff6, transparent), radial-gradient(1.2px 1.2px at 81% 26%, #fff7, transparent), radial-gradient(1px 1px at 91% 8%, #fff5, transparent), radial-gradient(1px 1px at 7% 40%, #fff4, transparent), radial-gradient(1px 1px at 95% 44%, #fff4, transparent)",
  },
  svg: { position: "absolute", inset: 0, width: "100%", height: "100%", touchAction: "none", userSelect: "none", cursor: "grab" },
  hud: {
    position: "absolute",
    top: 14,
    left: 14,
    zIndex: 2,
    padding: "12px 16px",
    background: "rgba(6,9,12,0.8)",
    border: "1px solid rgba(232,208,138,0.2)",
    borderRadius: 6,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  hudTitulo: { margin: 0, fontSize: "0.68em", letterSpacing: "3px", color: OURO },
  hudPontos: { display: "flex", alignItems: "baseline", gap: 8 },
  hudNumero: { fontSize: "1.6em", color: CREME, fontWeight: 400 },
  hudRotulo: { fontSize: "0.72em", color: "#9aa7ae", letterSpacing: "1px" },
  link: { background: "none", border: "none", padding: 0, color: "#9aa7ae", cursor: "pointer", fontSize: "0.72em", textAlign: "left", fontFamily: "inherit" },
  legenda: {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 2,
    display: "flex",
    flexDirection: "column",
    gap: 5,
    padding: "10px 12px",
    background: "rgba(6,9,12,0.7)",
    borderRadius: 6,
    fontSize: "0.68em",
    color: "#b8ae96",
    letterSpacing: "1px",
  },
  legendaItem: { display: "flex", alignItems: "center", gap: 8 },
  legendaPonto: { width: 6, height: 6, borderRadius: "50%", display: "inline-block" },
  zoom: { position: "absolute", left: 14, bottom: 14, zIndex: 2, display: "flex", gap: 6 },
  zoomBotao: {
    width: 34,
    height: 34,
    background: "rgba(6,9,12,0.8)",
    border: "1px solid rgba(232,208,138,0.3)",
    borderRadius: 4,
    color: OURO,
    fontSize: "1em",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  painel: {
    position: "absolute",
    right: 14,
    bottom: 70,
    zIndex: 3,
    width: "min(340px, calc(100% - 28px))",
    maxHeight: "60%",
    overflowY: "auto",
    padding: "16px 18px",
    background: "rgba(8,12,16,0.94)",
    border: "1px solid rgba(232,208,138,0.3)",
    borderRadius: 8,
    boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
  },
  fechar: { position: "absolute", top: 6, right: 10, background: "none", border: "none", color: "#9aa7ae", fontSize: "1.3em", cursor: "pointer" },
  painelTipo: { margin: 0, fontSize: "0.68em", letterSpacing: "3px", textTransform: "uppercase" },
  painelNome: { margin: "6px 0 4px", fontSize: "1.4em", fontWeight: 400, color: CREME },
  painelStatus: { margin: "0 0 10px", fontSize: "0.74em", color: "#9aa7ae", fontStyle: "italic" },
  painelTexto: { margin: "0 0 10px", fontSize: "0.85em", lineHeight: 1.55, color: "#cfc6b0" },
  custos: { display: "flex", flexWrap: "wrap", gap: 8, fontSize: "0.74em", color: OURO, letterSpacing: "1px", marginBottom: 10 },
  lista: { margin: "0 0 10px", paddingLeft: 18, fontSize: "0.8em", color: "#cfc6b0", lineHeight: 1.6 },
  finalizar: {
    position: "absolute",
    right: 14,
    bottom: 14,
    zIndex: 2,
    padding: "12px 24px",
    background: "rgba(6,9,12,0.85)",
    border: "1px solid rgba(232,208,138,0.6)",
    borderRadius: 4,
    color: OURO,
    letterSpacing: "2.5px",
    fontSize: "0.74em",
    cursor: "pointer",
    fontFamily: "inherit",
  },
};
