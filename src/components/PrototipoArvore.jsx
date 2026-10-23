import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { DONS, AFINIDADE, HI_DA_LINHAGEM, PARAMETRO_MIN, PARAMETRO_MAX } from "../dados/dons";

// PROTÓTIPO da árvore de um Scrip: raízes = linhagem, semente = o Dom despertado,
// centro da copa = as técnicas do Dom, galhos dos lados = o que se treina, tronco = aptidões.
// Nada aqui é salvo: as técnicas "aprendidas" são só uma simulação na tela.

const LARGURA = 1000;
const ALTURA = 1000;
const CX = 500;
const CHAO = 690;
const TOPO_TRONCO = 400;
const ZOOM_MIN = 0.45;
const ZOOM_MAX = 4;

const OURO = "#e8d08a";
const CREME = "#efe6cf";
const AZUL = "#5cc3ff";
const BRASA = "#ff9a5a";
const NEUTRO = "#9aa7ae";
const SERIFA = "'Palatino Linotype', 'Book Antiqua', Palatino, serif";

const grau = (g) => (g * Math.PI) / 180;
const ehAptidao = (n) => /aptid/i.test(n.tipo || "");

// ponto de uma curva quadrática de a até b com controle c
function naCurva(a, c, b, t) {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

// Poeira de estrelas no formato da copa (sempre igual, sem sorteio a cada render)
const FOLHAGEM = Array.from({ length: 140 }, (_, i) => {
  const a = i * 2.39996;
  const raio = Math.sqrt((i + 0.5) / 140);
  return { x: CX + Math.cos(a) * raio * 400, y: 210 + Math.sin(a) * raio * 200, r: 0.6 + (i % 5) * 0.25, o: 0.15 + (i % 7) * 0.05, dom: i % 3 === 0 };
});

/**
 * Desenho da árvore (o mesmo formato da árvore de habilidades):
 * as técnicas do Dom sobem pelos dois galhos do centro e se juntam na técnica final, no alto;
 * as habilidades treinadas ficam nos galhos dos lados e as aptidões no tronco.
 */
function montarArvore(dom, treinadas, requisitos) {
  const pos = {};
  const tracos = [];
  const raminho = (inicio, ctrl, fim, j) =>
    [0.35, 0.78].forEach((tq, k) => {
      const base = naCurva(inicio, ctrl, fim, tq);
      const dir = Math.atan2(fim.y - inicio.y, fim.x - inicio.x) + grau((k ? 32 : -32) * (j % 2 ? 1 : -1));
      const ponta = { x: base.x + Math.cos(dir) * 55, y: base.y + Math.sin(dir) * 55 };
      tracos.push({ tipo: "raminho", d: `M${base.x} ${base.y} Q${(base.x + ponta.x) / 2} ${(base.y + ponta.y) / 2 - 10} ${ponta.x} ${ponta.y}` });
    });

  // Dom: dois caminhos de técnicas, um em cada galho do centro, e a técnica final no topo
  const porNivel = {};
  dom.tecnicas.forEach((tc) => (porNivel[tc.parametro] ||= []).push(tc));
  const niveis = Object.keys(porNivel).map(Number).sort((a, b) => a - b);
  const ultimo = porNivel[niveis[niveis.length - 1]] || [];
  const final = ultimo.length === 1 ? ultimo[0] : null;
  const caminhos = [[], []];
  niveis.forEach((nv) => porNivel[nv].forEach((tc, i) => tc !== final && caminhos[i % 2].push(tc)));
  const pontas = [];
  [-1, 1].forEach((lado, k) => {
    const inicio = { x: CX, y: TOPO_TRONCO };
    const fim = { x: CX + lado * 105, y: 165 };
    const ctrl = { x: CX + lado * 130, y: 330 };
    tracos.push({ tipo: "dom", d: `M${inicio.x} ${inicio.y} Q${ctrl.x} ${ctrl.y} ${fim.x} ${fim.y}` });
    raminho(inicio, ctrl, fim, k);
    caminhos[k].forEach((tc, i) => (pos[tc.id] = naCurva(inicio, ctrl, fim, 0.38 + (0.62 * (i + 1)) / caminhos[k].length)));
    pontas.push(fim);
  });
  if (final) {
    pos[final.id] = { x: CX, y: 70 };
    pontas.forEach((p) => tracos.push({ tipo: "dom", d: `M${p.x} ${p.y} Q${p.x} ${80} ${CX} ${70}` }));
  }

  // Tronco: as aptidões sobem por ele, alternando os lados
  const aptidoes = treinadas.filter(ehAptidao);
  aptidoes.forEach((n, i) => {
    const y = CHAO - (CHAO - TOPO_TRONCO) * ((i + 1) / (aptidoes.length + 1)) * 0.95;
    const lado = i % 2 ? 1 : -1;
    pos[n.id] = { x: CX + lado * 38, y };
    tracos.push({ tipo: "galho", d: `M${CX} ${y + 10} Q${CX + lado * 22} ${y + 6} ${CX + lado * 38} ${y}` });
  });

  // Galhos dos lados: as habilidades treinadas, dois nós por galho
  const filhos = {};
  const temPai = new Set();
  requisitos.forEach((rq) => {
    if (!treinadas.some((n) => n.id === rq.node_id) || !treinadas.some((n) => n.id === rq.requisito_node_id)) return;
    (filhos[rq.requisito_node_id] ||= []).push(rq.node_id);
    temPai.add(rq.node_id);
  });
  const copa = treinadas.filter((n) => !ehAptidao(n) && !temPai.has(n.id));
  const nGalhos = Math.max(2, Math.ceil(copa.length / 2));
  const porLado = Math.ceil(nGalhos / 2);
  for (let j = 0; j < nGalhos; j++) {
    const esquerda = j < porLado;
    const k = esquerda ? j : j - porLado;
    const total = esquerda ? porLado : nGalhos - porLado;
    const f = total === 1 ? 0.5 : k / (total - 1);
    const ang = esquerda ? 186 + 40 * f : 314 + 40 * f;
    const desvio = Math.abs(ang - 270) / 82;
    const inicio = { x: CX, y: TOPO_TRONCO + desvio * 90 };
    const comp = 250 + desvio * 120 + (j % 2) * 30;
    const fim = { x: inicio.x + Math.cos(grau(ang)) * comp, y: inicio.y + Math.sin(grau(ang)) * comp * (1 - desvio * 0.35) - desvio * 120 };
    const ctrl = { x: inicio.x + Math.cos(grau(ang)) * comp * 0.5, y: inicio.y + Math.sin(grau(ang)) * comp * 0.2 - 30 };
    tracos.push({ tipo: "galho", d: `M${inicio.x} ${inicio.y} Q${ctrl.x} ${ctrl.y} ${fim.x} ${fim.y}` });
    raminho(inicio, ctrl, fim, j);
    [copa[j * 2], copa[j * 2 + 1]].forEach((n, q) => {
      if (n) pos[n.id] = { ...naCurva(inicio, ctrl, fim, q === 0 ? 0.55 : 1), ang: ang - desvio * 25 * Math.sign(ang - 270) };
    });
  }
  // requisitos entre treinadas: a habilidade nasce num raminho depois da que ela exige
  const crescer = (id, ang, prof) =>
    (filhos[id] || []).forEach((filho, i, todos) => {
      if (pos[filho] || prof > 6) return;
      const a = ang + (i - (todos.length - 1) / 2) * 28;
      const pai = pos[id];
      const p = { x: pai.x + Math.cos(grau(a)) * 85, y: pai.y + Math.sin(grau(a)) * 85, ang: a };
      pos[filho] = p;
      tracos.push({ tipo: "galho", d: `M${pai.x} ${pai.y} Q${(pai.x + p.x) / 2} ${(pai.y + p.y) / 2 - 18} ${p.x} ${p.y}` });
      crescer(filho, a, prof + 1);
    });
  Object.keys(filhos).forEach((id) => pos[id] && crescer(id, pos[id].ang ?? 270, 0));

  return { pos, tracos };
}

const ehInata = (n) => n.id?.startsWith("hi_");
const nomeCurto = (n) => (n.nome || "").replace(/^H\.?I\.?\s*:\s*/i, "");

function estrela4(x, y, r) {
  const p = [];
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i - Math.PI / 2;
    const raio = i % 2 ? r * 0.55 : r * 2;
    p.push(`${x + Math.cos(a) * raio},${y + Math.sin(a) * raio}`);
  }
  return `M${p.join(" L")} Z`;
}

/** Uma estrela da árvore. forma: "circulo" (passiva) ou "estrela" (ativa). */
function Estrela({ x, y, cor, forma, estado, rotulo, rotuloAcima, r = 5, selecionada, onClick }) {
  const aceso = estado === "aprendida";
  const apagado = estado === "bloqueada";
  return (
    <g style={{ cursor: "pointer" }} opacity={apagado ? 0.38 : 1} onPointerDown={(e) => e.stopPropagation()} onClick={onClick}>
      <circle cx={x} cy={y} r={20} fill="transparent" />
      {!apagado && <circle className="proto-halo" cx={x} cy={y} r={aceso ? r * 4 : r * 2.6} fill={cor} opacity={aceso ? 0.22 : 0.1} filter="url(#protoBorrao)" />}
      {forma === "estrela" ? (
        <path d={estrela4(x, y, r)} fill={aceso ? cor : "#0a0f14"} stroke={cor} strokeWidth="1.2" strokeDasharray={apagado ? "2 2" : undefined} />
      ) : (
        <circle cx={x} cy={y} r={r} fill={aceso ? cor : "#0a0f14"} stroke={cor} strokeWidth="1.3" strokeDasharray={apagado ? "2 2" : undefined} />
      )}
      {aceso && <circle cx={x} cy={y} r={r * 0.45} fill="#fff" opacity="0.9" />}
      {selecionada && <circle cx={x} cy={y} r={r * 2 + 8} fill="none" stroke={cor} strokeWidth="0.8" strokeDasharray="2 3" />}
      <text
        x={x}
        y={rotuloAcima ? y - r * 2 - 8 : y + r * 2 + 14}
        textAnchor="middle"
        fill={cor}
        fontSize="12.5"
        fontFamily={SERIFA}
        letterSpacing="0.5"
        style={{ paintOrder: "stroke", stroke: "#05080b", strokeWidth: 3.5, strokeLinejoin: "round" }}
      >
        {rotulo}
      </text>
    </g>
  );
}

export default function PrototipoArvore() {
  const [linhagens, setLinhagens] = useState([]);
  const [skills, setSkills] = useState([]);
  const [requisitos, setRequisitos] = useState([]);
  const [linhagem, setLinhagem] = useState("Demons");
  const [domId, setDomId] = useState("pirocinese");
  const [parametro, setParametro] = useState(5);
  const [aprendidas, setAprendidas] = useState(new Set());
  const [escolhida, setEscolhida] = useState(null);
  const [vista, setVista] = useState({ x: 0, y: 30, zoom: 1 });
  const [ajustesAbertos, setAjustesAbertos] = useState(() => typeof window === "undefined" || window.innerWidth > 700);
  const svgRef = useRef(null);
  const toques = useRef(new Map());
  const pinca = useRef(null);

  useEffect(() => {
    async function carregar() {
      const [{ data: l }, { data: s }, { data: r }] = await Promise.all([
        supabase.from("linhagens_mutantes").select("nome_tribo, descricao"),
        supabase.from("skill_nodes").select("*"),
        supabase.from("skill_requisitos").select("*"),
      ]);
      if (l?.length) setLinhagens(l);
      setSkills((s || []).filter((n) => !/equela/i.test(n.tipo || "")));
      setRequisitos(r || []);
    }
    carregar();
  }, []);

  const dom = DONS.find((d) => d.id === domId);
  const afinidade = AFINIDADE[linhagem] === domId;
  const parametroEfetivo = Math.min(PARAMETRO_MAX, parametro + (afinidade ? 1 : 0));

  // trocar de Dom ou de linhagem recomeça a simulação
  function trocarDom(id) {
    setDomId(id);
    setAprendidas(new Set());
    setEscolhida(null);
  }

  const estadoTecnica = (t) => {
    if (aprendidas.has(t.id)) return "aprendida";
    const ok = parametroEfetivo >= t.parametro && t.exige.every((e) => aprendidas.has(e));
    return ok ? "disponivel" : "bloqueada";
  };
  const estadoSkill = (n) => {
    if (aprendidas.has(n.id)) return "aprendida";
    const exige = requisitos.filter((r) => r.node_id === n.id).map((r) => r.requisito_node_id);
    return exige.every((e) => aprendidas.has(e)) ? "disponivel" : "bloqueada";
  };

  const treinadas = useMemo(() => skills.filter((n) => !ehInata(n)), [skills]);
  const { pos, tracos } = useMemo(() => montarArvore(dom, treinadas, requisitos), [dom, treinadas, requisitos]);

  const hiId = HI_DA_LINHAGEM[linhagem];
  const hi = skills.find((n) => n.id === hiId);
  const descricaoLinhagem = linhagens.find((l) => l.nome_tribo === linhagem)?.descricao;

  // pan e zoom
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const aoRolar = (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomEm(e.deltaY > 0 ? 1 / 1.1 : 1.1, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    };
    el.addEventListener("wheel", aoRolar, { passive: false });
    if (el.getBoundingClientRect().width / el.getBoundingClientRect().height < 0.8) setVista({ x: 190, y: 40, zoom: 1.6 });
    return () => el.removeEventListener("wheel", aoRolar);
  }, []);
  function zoomEm(fator, fx = 0.5, fy = 0.5) {
    setVista((v) => {
      const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.zoom * fator));
      const [w0, h0, w1, h1] = [LARGURA / v.zoom, (ALTURA - 60) / v.zoom, LARGURA / zoom, (ALTURA - 60) / zoom];
      return { zoom, x: v.x + (w0 - w1) * fx, y: v.y + (h0 - h1) * fy };
    });
  }
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
    const escala = Math.max(LARGURA / vista.zoom / r.width, (ALTURA - 60) / vista.zoom / r.height);
    setVista((v) => ({ ...v, x: v.x - (e.clientX - antes.x) * escala, y: v.y - (e.clientY - antes.y) * escala }));
  }
  function aoSoltar(e) {
    toques.current.delete(e.pointerId);
    if (toques.current.size < 2) pinca.current = null;
  }

  function alternar(id) {
    setAprendidas((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const vb = `${vista.x} ${vista.y} ${LARGURA / vista.zoom} ${(ALTURA - 60) / vista.zoom}`;
  const nomesLinhagens = linhagens.length ? linhagens.map((l) => l.nome_tribo) : Object.keys(HI_DA_LINHAGEM);

  // dados do painel de detalhe
  let detalhe = null;
  if (escolhida?.tipo === "despertar") {
    detalhe = { cor: dom.cor, sub: `Despertar · ${dom.nome}`, nome: dom.despertar.nome, texto: dom.despertar.descricao, linhas: [`Parâmetro inicial: ${PARAMETRO_MIN}`, "Todo Scrip com este Dom começa aqui"] };
  } else if (escolhida?.tipo === "tecnica") {
    const t = dom.tecnicas.find((x) => x.id === escolhida.id);
    const est = estadoTecnica(t);
    detalhe = {
      cor: dom.cor,
      sub: `Técnica de ${dom.nome} · ${t.tipo}`,
      nome: t.nome,
      texto: t.descricao,
      linhas: [
        `Parâmetro mínimo: ${t.parametro}`,
        `${t.ph} PH${t.custo ? ` · ${t.custo} por uso` : ""}`,
        t.exige.length ? `Exige: ${t.exige.map((e) => dom.tecnicas.find((x) => x.id === e)?.nome).join(" e ")}` : "Nasce direto do despertar",
      ],
      estado: est,
      id: t.id,
    };
  } else if (escolhida?.tipo === "skill" || escolhida?.tipo === "raiz") {
    const n = skills.find((x) => x.id === escolhida.id);
    if (n) {
      const exige = requisitos.filter((r) => r.node_id === n.id).map((r) => nomeCurto(skills.find((x) => x.id === r.requisito_node_id) || {}));
      detalhe = {
        cor: escolhida.tipo === "raiz" ? AZUL : /ativa/i.test(n.tipo) ? BRASA : CREME,
        sub: escolhida.tipo === "raiz" ? `Habilidade instintiva · ${linhagem}` : `Treinada · ${n.tipo}`,
        nome: nomeCurto(n),
        texto: n.descricao,
        linhas: [n.custo_em_ph ? `${n.custo_em_ph} PH` : "Sem custo de PH", ...(exige.length ? [`Exige: ${exige.join(", ")}`] : [])],
        estado: escolhida.tipo === "raiz" ? "aprendida" : estadoSkill(n),
        id: escolhida.tipo === "raiz" ? null : n.id,
      };
    }
  }

  return (
    <div style={st.pagina}>
      <style>{`
        @keyframes protoBrilho { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
        .proto-halo { animation: protoBrilho 3.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .proto-halo { animation: none; } }
        @media (max-width: 700px) { .proto-legenda { display: none !important; } .proto-controles { width: calc(100% - 28px) !important; } }
      `}</style>
      <header style={st.topo}>
        <Link to="/" style={st.voltar}>← A Queda de uma Ordem</Link>
        <span style={st.selo}>PROTÓTIPO · não salva</span>
      </header>

      <div style={st.palco}>
        <div style={st.ceu} />

        {!ajustesAbertos && (
          <button type="button" style={st.abrirAjustes} onClick={() => setAjustesAbertos(true)}>
            {linhagem} · {dom.nome} · P{parametroEfetivo} ▾
          </button>
        )}
        {ajustesAbertos && (
        <div className="proto-controles" style={st.controles}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={st.controlesTitulo}>ÁRVORE DE UM SCRIP</p>
            <button type="button" style={st.recolher} onClick={() => setAjustesAbertos(false)} aria-label="Recolher ajustes">▴</button>
          </div>
          <label style={st.campo}>
            Linhagem
            <select style={st.select} value={linhagem} onChange={(e) => { setLinhagem(e.target.value); setEscolhida(null); }}>
              {nomesLinhagens.map((n) => <option key={n}>{n}</option>)}
            </select>
          </label>
          <label style={st.campo}>
            Dom despertado
            <select style={st.select} value={domId} onChange={(e) => trocarDom(e.target.value)}>
              {DONS.map((d) => <option key={d.id} value={d.id}>{d.nome} ({d.classe})</option>)}
            </select>
          </label>
          <label style={st.campo}>
            Parâmetro (controle): <strong style={{ color: dom.cor }}>{parametroEfetivo}</strong>
            {afinidade && <span style={st.afinidade}> +1 da linhagem</span>}
            <input type="range" min={PARAMETRO_MIN} max={PARAMETRO_MAX} value={parametro} onChange={(e) => setParametro(+e.target.value)} style={{ accentColor: dom.cor }} />
          </label>
          <p style={st.dica}>Toque numa estrela para ver o detalhe e simular que foi aprendida.</p>
        </div>
        )}

        <div className="proto-legenda" style={st.legenda}>
          <span style={st.legendaItem}><i style={{ ...st.ponto, background: dom.cor }} /> Centro da copa · técnicas do Dom</span>
          <span style={st.legendaItem}><i style={{ ...st.ponto, background: CREME }} /> Galhos dos lados · treinadas</span>
          <span style={st.legendaItem}><i style={{ ...st.ponto, background: OURO }} /> Tronco · aptidões</span>
          <span style={st.legendaItem}><svg width="12" height="12" viewBox="-6 -6 12 12"><path d={estrela4(0, 0, 2.6)} fill={BRASA} /></svg> Estrela de 4 pontas · ativa</span>
          <span style={st.legendaItem}><i style={{ ...st.ponto, background: AZUL }} /> Raiz · linhagem</span>
          <span style={st.legendaItem}><i style={{ ...st.ponto, border: `1px dashed ${NEUTRO}`, background: "transparent" }} /> Tracejada · ainda bloqueada</span>
        </div>

        <svg
          ref={svgRef}
          viewBox={vb}
          preserveAspectRatio="xMidYMid meet"
          style={st.svg}
          onPointerDown={aoApertar}
          onPointerMove={aoMover}
          onPointerUp={aoSoltar}
          onPointerCancel={aoSoltar}
          role="img"
          aria-label={`Árvore de um Scrip ${linhagem} com o Dom ${dom.nome}`}
        >
          <defs>
            <filter id="protoBorrao" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
            <linearGradient id="protoSolo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0c1820" />
              <stop offset="100%" stopColor="#04070a" />
            </linearGradient>
          </defs>

          {/* solo */}
          <rect x={-3000} y={CHAO} width={7000} height={3000} fill="url(#protoSolo)" />
          <line x1={-3000} y1={CHAO} x2={4000} y2={CHAO} stroke="rgba(232,208,138,0.25)" />
          <ellipse cx={CX} cy={CHAO} rx={260} ry={14} fill={dom.cor} opacity="0.12" filter="url(#protoBorrao)" />

          {/* raízes: a linhagem */}
          {[160, 132, 104, 76, 48, 20].map((ang, i) => {
            const inicio = { x: CX + Math.cos(grau(ang)) * 12, y: CHAO };
            const comp = 250 + (Math.abs(ang - 90) / 70) * 90;
            const fim = { x: inicio.x + Math.cos(grau(ang)) * comp, y: Math.min(ALTURA - 40, inicio.y + Math.sin(grau(ang)) * comp * 0.75) };
            const ctrl = { x: inicio.x + Math.cos(grau(ang)) * comp * 0.6, y: inicio.y + 30 };
            return <path key={i} d={`M${inicio.x} ${inicio.y} Q${ctrl.x} ${ctrl.y} ${fim.x} ${fim.y}`} fill="none" stroke={AZUL} strokeOpacity="0.4" strokeWidth="1.1" />;
          })}
          <path d={`M${CX} ${CHAO} Q${CX + 6} ${CHAO + 80} ${CX} ${CHAO + 150}`} fill="none" stroke={AZUL} strokeOpacity="0.75" strokeWidth="1.3" />
          <text x={CX} y={CHAO + 230} textAnchor="middle" fill={AZUL} fillOpacity="0.8" fontSize="11" letterSpacing="4" fontFamily={SERIFA}>
            LINHAGEM · {linhagem.toUpperCase()}
          </text>
          {hiId && (
            <Estrela
              x={CX}
              y={CHAO + 150}
              cor={AZUL}
              forma={/ativa/i.test(hi?.tipo || "") ? "estrela" : "circulo"}
              estado="aprendida"
              rotulo={hi ? nomeCurto(hi) : "Habilidade instintiva"}
              selecionada={escolhida?.id === hiId}
              onClick={() => hi && setEscolhida({ tipo: "raiz", id: hiId })}
            />
          )}

          {/* folhagem */}
          {FOLHAGEM.map((f, i) => (
            <circle key={`f${i}`} cx={f.x} cy={f.y} r={f.r} fill={f.dom ? dom.cor : OURO} opacity={f.o} />
          ))}

          {/* tronco: três fios de luz na cor do Dom */}
          {[-12, 0, 12].map((dx, i) => (
            <path
              key={i}
              d={`M${CX + dx} ${CHAO} C${CX + dx * 0.8 - 6} ${CHAO - 110} ${CX + dx * 0.4 + 6} ${TOPO_TRONCO + 120} ${CX + dx * 0.2} ${TOPO_TRONCO}`}
              fill="none"
              stroke={dom.cor}
              strokeOpacity={i === 1 ? 0.85 : 0.35}
              strokeWidth={i === 1 ? 1.6 : 1}
            />
          ))}

          {/* galhos */}
          {tracos.map((tr, i) => {
            const cor = tr.tipo === "dom" ? dom.cor : OURO;
            return (
              <g key={i}>
                {tr.tipo !== "raminho" && <path d={tr.d} fill="none" stroke={cor} strokeOpacity="0.16" strokeWidth="5" filter="url(#protoBorrao)" />}
                <path d={tr.d} fill="none" stroke={cor} strokeOpacity={tr.tipo === "raminho" ? 0.4 : 0.7} strokeWidth={tr.tipo === "dom" ? 1.4 : 1.1} strokeLinecap="round" />
              </g>
            );
          })}

          {/* habilidades treinadas */}
          {treinadas.map((n) => {
            const p = pos[n.id];
            if (!p) return null;
            const ativa = /ativa/i.test(n.tipo || "");
            const apt = ehAptidao(n);
            return (
              <Estrela
                key={n.id}
                x={p.x}
                y={p.y}
                r={ativa ? 5 : apt ? 5 : 4.2}
                cor={ativa ? BRASA : apt ? OURO : CREME}
                forma={ativa ? "estrela" : "circulo"}
                estado={estadoSkill(n)}
                rotulo={nomeCurto(n)}
                selecionada={escolhida?.id === n.id}
                onClick={() => setEscolhida({ tipo: "skill", id: n.id })}
              />
            );
          })}
          {!skills.length && (
            <text x={CX} y={TOPO_TRONCO + 40} textAnchor="middle" fill={NEUTRO} fontSize="13" fontFamily={SERIFA} fontStyle="italic">
              Entre no site para ver as habilidades treinadas
            </text>
          )}

          {/* técnicas do Dom */}
          {dom.tecnicas.map((tc) => {
            const p = pos[tc.id];
            if (!p) return null;
            return (
              <Estrela
                key={tc.id}
                x={p.x}
                y={p.y}
                r={tc.parametro >= 14 ? 7 : 5.5}
                cor={dom.cor}
                forma={tc.tipo === "Ativa" ? "estrela" : "circulo"}
                estado={estadoTecnica(tc)}
                rotulo={`${tc.nome} · P${tc.parametro}`}
                rotuloAcima={tc.parametro >= 14}
                selecionada={escolhida?.id === tc.id}
                onClick={() => setEscolhida({ tipo: "tecnica", id: tc.id })}
              />
            );
          })}

          {/* semente: o despertar */}
          <Estrela
            x={CX}
            y={CHAO}
            r={8}
            cor={dom.cor}
            forma="circulo"
            estado="aprendida"
            rotulo={`${dom.despertar.nome} · despertar`}
            rotuloAcima={false}
            selecionada={escolhida?.tipo === "despertar"}
            onClick={() => setEscolhida({ tipo: "despertar" })}
          />
        </svg>

        <div style={st.zoom}>
          <button type="button" style={st.zoomBotao} onClick={() => zoomEm(1.25)} aria-label="Aproximar">+</button>
          <button type="button" style={st.zoomBotao} onClick={() => zoomEm(1 / 1.25)} aria-label="Afastar">−</button>
        </div>

        {detalhe && (
          <div style={st.painel}>
            <button type="button" style={st.fechar} onClick={() => setEscolhida(null)} aria-label="Fechar">×</button>
            <p style={{ ...st.painelSub, color: detalhe.cor }}>{detalhe.sub}</p>
            <h3 style={st.painelNome}>{detalhe.nome}</h3>
            {detalhe.texto && <p style={st.painelTexto}>{detalhe.texto}</p>}
            {detalhe.linhas.map((l) => <p key={l} style={st.painelLinha}>{l}</p>)}
            {escolhida?.tipo === "raiz" && descricaoLinhagem && <p style={{ ...st.painelTexto, fontStyle: "italic" }}>{descricaoLinhagem}</p>}
            {detalhe.id && detalhe.estado !== "bloqueada" && (
              <button type="button" style={{ ...st.painelBotao, borderColor: detalhe.cor, color: detalhe.cor }} onClick={() => alternar(detalhe.id)}>
                {detalhe.estado === "aprendida" ? "Desfazer (simulação)" : "Aprender (simulação)"}
              </button>
            )}
            {detalhe.estado === "bloqueada" && <p style={st.painelBloqueio}>Ainda bloqueada: falta Parâmetro ou uma técnica anterior.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

const st = {
  pagina: { minHeight: "100svh", background: "#06090d", color: CREME, fontFamily: SERIFA, display: "flex", flexDirection: "column" },
  topo: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid rgba(232,208,138,0.14)", background: "rgba(6,9,12,0.95)" },
  voltar: { color: OURO, textDecoration: "none", fontSize: "0.8em", letterSpacing: "2px" },
  selo: { fontSize: "0.68em", letterSpacing: "2px", color: BRASA, border: `1px solid ${BRASA}66`, padding: "4px 8px", borderRadius: 3 },
  palco: { position: "relative", flex: 1, minHeight: "calc(100svh - 52px)", overflow: "hidden" },
  ceu: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background:
      "radial-gradient(ellipse 90% 60% at 50% 0%, rgba(92,195,255,0.08) 0%, transparent 60%), radial-gradient(1px 1px at 12% 18%, #fff8, transparent), radial-gradient(1px 1px at 28% 9%, #fff6, transparent), radial-gradient(1.4px 1.4px at 46% 22%, #fff9, transparent), radial-gradient(1px 1px at 63% 12%, #fff6, transparent), radial-gradient(1.2px 1.2px at 81% 26%, #fff7, transparent), radial-gradient(1px 1px at 91% 8%, #fff5, transparent)",
  },
  svg: { position: "absolute", inset: 0, width: "100%", height: "100%", touchAction: "none", userSelect: "none", cursor: "grab" },
  controles: {
    position: "absolute",
    top: 14,
    left: 14,
    zIndex: 2,
    width: 270,
    padding: "14px 16px",
    background: "rgba(6,9,12,0.85)",
    border: "1px solid rgba(232,208,138,0.2)",
    borderRadius: 6,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  abrirAjustes: {
    position: "absolute",
    top: 12,
    left: 12,
    zIndex: 2,
    background: "rgba(6,9,12,0.88)",
    border: "1px solid rgba(232,208,138,0.35)",
    borderRadius: 4,
    color: OURO,
    padding: "8px 12px",
    fontFamily: "inherit",
    fontSize: "0.78em",
    letterSpacing: "1px",
    cursor: "pointer",
  },
  recolher: { background: "none", border: "none", color: NEUTRO, cursor: "pointer", fontSize: "1em", padding: 0 },
  controlesTitulo: { margin: 0, fontSize: "0.68em", letterSpacing: "3px", color: OURO },
  campo: { display: "flex", flexDirection: "column", gap: 5, fontSize: "0.78em", color: "#cfc6b0" },
  select: { background: "#0e151b", color: CREME, border: "1px solid rgba(232,208,138,0.3)", borderRadius: 4, padding: "6px 8px", fontFamily: "inherit", fontSize: "1em" },
  afinidade: { color: OURO, fontSize: "0.9em" },
  dica: { margin: 0, fontSize: "0.7em", color: NEUTRO, fontStyle: "italic", lineHeight: 1.5 },
  legenda: {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 2,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: "10px 12px",
    background: "rgba(6,9,12,0.75)",
    borderRadius: 6,
    fontSize: "0.7em",
    color: "#b8ae96",
    letterSpacing: "0.5px",
  },
  legendaItem: { display: "flex", alignItems: "center", gap: 8 },
  ponto: { width: 8, height: 8, borderRadius: "50%", display: "inline-block" },
  zoom: { position: "absolute", left: 14, bottom: 14, zIndex: 2, display: "flex", gap: 6 },
  zoomBotao: { width: 34, height: 34, background: "rgba(6,9,12,0.8)", border: "1px solid rgba(232,208,138,0.3)", borderRadius: 4, color: OURO, fontSize: "1em", cursor: "pointer", fontFamily: "inherit" },
  painel: {
    position: "absolute",
    right: 14,
    bottom: 14,
    zIndex: 3,
    width: "min(340px, calc(100% - 28px))",
    maxHeight: "48%",
    overflowY: "auto",
    padding: "16px 18px",
    background: "rgba(8,12,16,0.95)",
    border: "1px solid rgba(232,208,138,0.3)",
    borderRadius: 8,
    boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
  },
  fechar: { position: "absolute", top: 6, right: 10, background: "none", border: "none", color: NEUTRO, fontSize: "1.3em", cursor: "pointer" },
  painelSub: { margin: 0, fontSize: "0.68em", letterSpacing: "2.5px", textTransform: "uppercase" },
  painelNome: { margin: "6px 0 8px", fontSize: "1.4em", fontWeight: 400, color: CREME },
  painelTexto: { margin: "0 0 10px", fontSize: "0.85em", lineHeight: 1.55, color: "#cfc6b0" },
  painelLinha: { margin: "0 0 4px", fontSize: "0.76em", color: OURO, letterSpacing: "0.5px" },
  painelBotao: { marginTop: 10, background: "transparent", border: "1px solid", borderRadius: 4, padding: "8px 14px", fontFamily: "inherit", fontSize: "0.75em", letterSpacing: "1.5px", cursor: "pointer" },
  painelBloqueio: { margin: "10px 0 0", fontSize: "0.74em", color: NEUTRO, fontStyle: "italic" },
};
