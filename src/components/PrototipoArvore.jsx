import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { DONS, AFINIDADE, HI_DA_LINHAGEM, PARAMETRO_MIN, PARAMETRO_MAX } from "../dados/dons";

// PROTÓTIPO da árvore de um Scrip: raízes = linhagem, semente e tronco = o Dom despertado
// (o tronco cresce com o Parâmetro), copa = as técnicas do Dom, galhos baixos = o que se treina.
// Nada aqui é salvo: as técnicas "aprendidas" são só uma simulação na tela.

const LARGURA = 1400;
const ALTURA = 1000;
const CX = 700;
const CHAO = 700;
const ZOOM_MIN = 0.45;
const ZOOM_MAX = 4;

const OURO = "#e8d08a";
const CREME = "#efe6cf";
const AZUL = "#5cc3ff";
const BRASA = "#ff9a5a";
const NEUTRO = "#9aa7ae";
const SERIFA = "'Palatino Linotype', 'Book Antiqua', Palatino, serif";

// altura do tronco para cada Parâmetro
const yParametro = (p) => CHAO - 40 - p * 20;
// onde fica cada nível de técnica na copa: [distância do centro, altura]
const NIVEIS = { 4: [190, 470], 7: [340, 375], 10: [300, 265], 14: [0, 165] };

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
  const [vista, setVista] = useState({ x: 0, y: 90, zoom: 1 });
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

  // posições das técnicas na copa
  const posTecnica = useMemo(() => {
    const pos = {};
    const porNivel = {};
    dom.tecnicas.forEach((t) => (porNivel[t.parametro] ||= []).push(t));
    Object.entries(porNivel).forEach(([nivel, lista]) => {
      const [dx, y] = NIVEIS[nivel] || [250, yParametro(nivel) - 60];
      lista.forEach((t, i) => {
        const lado = lista.length === 1 ? 0 : i === 0 ? -1 : 1;
        pos[t.id] = { x: CX + lado * dx, y };
      });
    });
    return pos;
  }, [dom]);

  // habilidades treinadas nos galhos baixos, metade de cada lado
  const treinadas = skills.filter((n) => !ehInata(n));
  const posTreinada = useMemo(() => {
    const pos = {};
    const metade = Math.ceil(treinadas.length / 2);
    treinadas.forEach((n, i) => {
      const lado = i < metade ? -1 : 1;
      const k = i < metade ? i : i - metade;
      const total = i < metade ? metade : treinadas.length - metade;
      const t = 0.18 + (0.82 * (k + 0.5)) / total;
      const x = CX + lado * (90 + t * 560);
      const yBase = CHAO - 45 - Math.sin(t * Math.PI) * 35;
      pos[n.id] = { x, y: yBase + (k % 2 ? 34 : -34), acima: k % 2 === 0, base: { x, y: yBase } };
    });
    return pos;
  }, [treinadas]);

  const hiId = HI_DA_LINHAGEM[linhagem];
  const hi = skills.find((n) => n.id === hiId);
  const descricaoLinhagem = linhagens.find((l) => l.nome_tribo === linhagem)?.descricao;
  const topoTronco = yParametro(parametroEfetivo);

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
    if (el.getBoundingClientRect().width / el.getBoundingClientRect().height < 0.8) setVista({ x: 262, y: 110, zoom: 1.6 });
    return () => el.removeEventListener("wheel", aoRolar);
  }, []);
  function zoomEm(fator, fx = 0.5, fy = 0.5) {
    setVista((v) => {
      const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.zoom * fator));
      const [w0, h0, w1, h1] = [LARGURA / v.zoom, (ALTURA - 140) / v.zoom, LARGURA / zoom, (ALTURA - 140) / zoom];
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
    const escala = Math.max(LARGURA / vista.zoom / r.width, (ALTURA - 140) / vista.zoom / r.height);
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

  const vb = `${vista.x} ${vista.y} ${LARGURA / vista.zoom} ${(ALTURA - 140) / vista.zoom}`;
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
          <span style={st.legendaItem}><i style={{ ...st.ponto, background: dom.cor }} /> Copa · técnicas do Dom</span>
          <span style={st.legendaItem}><i style={{ ...st.ponto, background: CREME }} /> Galhos baixos · treinadas</span>
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
          <rect x={-3000} y={CHAO} width={7400} height={3000} fill="url(#protoSolo)" />
          <line x1={-3000} y1={CHAO} x2={4400} y2={CHAO} stroke="rgba(232,208,138,0.25)" />

          {/* raízes: a linhagem */}
          {[-0.9, -0.55, -0.25, 0, 0.25, 0.55, 0.9].map((f, i) => {
            const fim = { x: CX + f * 330, y: CHAO + 150 - Math.abs(f) * 40 + (i % 2) * 20 };
            return <path key={i} d={`M${CX} ${CHAO} Q${CX + f * 120} ${CHAO + 40} ${fim.x} ${fim.y}`} fill="none" stroke={AZUL} strokeOpacity={f === 0 ? 0.7 : 0.3} strokeWidth="1.1" />;
          })}
          <text x={CX} y={CHAO + 225} textAnchor="middle" fill={AZUL} fillOpacity="0.8" fontSize="11" letterSpacing="4" fontFamily={SERIFA}>
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

          {/* galhos baixos: o que se treina */}
          {[-1, 1].map((lado) => (
            <path key={lado} d={`M${CX} ${CHAO - 25} Q${CX + lado * 330} ${CHAO - 100} ${CX + lado * 660} ${CHAO - 42}`} fill="none" stroke={NEUTRO} strokeOpacity="0.35" strokeWidth="1.2" />
          ))}
          {treinadas.map((n) => {
            const p = posTreinada[n.id];
            return <line key={`g${n.id}`} x1={p.base.x} y1={p.base.y} x2={p.x} y2={p.y} stroke={NEUTRO} strokeOpacity="0.25" />;
          })}
          {requisitos.map((r) => {
            const a = posTreinada[r.requisito_node_id];
            const b = posTreinada[r.node_id];
            return a && b ? <line key={`r${r.id}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={BRASA} strokeOpacity="0.4" strokeDasharray="3 4" /> : null;
          })}
          {treinadas.map((n) => {
            const p = posTreinada[n.id];
            const ativa = /ativa/i.test(n.tipo || "");
            return (
              <Estrela
                key={n.id}
                x={p.x}
                y={p.y}
                r={ativa ? 4.5 : 3.8}
                cor={ativa ? BRASA : CREME}
                forma={ativa ? "estrela" : "circulo"}
                estado={estadoSkill(n)}
                rotulo={nomeCurto(n)}
                rotuloAcima={p.acima}
                selecionada={escolhida?.id === n.id}
                onClick={() => setEscolhida({ tipo: "skill", id: n.id })}
              />
            );
          })}
          {!skills.length && (
            <text x={CX + 330} y={CHAO - 140} textAnchor="middle" fill={NEUTRO} fontSize="13" fontFamily={SERIFA} fontStyle="italic">
              Entre no site para ver as habilidades treinadas
            </text>
          )}

          {/* tronco: o Dom, crescendo com o Parâmetro */}
          <path d={`M${CX} ${topoTronco} L${CX} ${NIVEIS[14][1] + 20}`} stroke={dom.cor} strokeOpacity="0.25" strokeDasharray="3 6" strokeWidth="1.2" />
          {[-9, 0, 9].map((dx, i) => (
            <path
              key={i}
              d={`M${CX + dx} ${CHAO} C${CX + dx * 0.8 - 5} ${CHAO - 80} ${CX + dx * 0.4 + 5} ${topoTronco + 60} ${CX + dx * 0.15} ${topoTronco}`}
              fill="none"
              stroke={dom.cor}
              strokeOpacity={i === 1 ? 0.9 : 0.4}
              strokeWidth={i === 1 ? 2 : 1}
            />
          ))}
          {/* anéis: os Parâmetros que abrem cada nível de técnica */}
          {Object.keys(NIVEIS).map((nivel) => {
            const y = yParametro(+nivel);
            const alcancou = parametroEfetivo >= +nivel;
            return (
              <g key={nivel} opacity={alcancou ? 0.9 : 0.35}>
                <line x1={CX - 16} y1={y} x2={CX + 16} y2={y} stroke={dom.cor} strokeWidth="1" />
                <text x={CX + 22} y={y + 4} fill={dom.cor} fontSize="10.5" fontFamily={SERIFA} letterSpacing="1">P{nivel}</text>
              </g>
            );
          })}

          {/* copa: as técnicas */}
          {dom.tecnicas.map((t) => {
            const b = posTecnica[t.id];
            const origens = t.exige.length ? t.exige.map((e) => posTecnica[e]) : [{ x: CX, y: yParametro(t.parametro) }];
            return origens.map((a, i) => (
              <path
                key={`${t.id}${i}`}
                d={`M${a.x} ${a.y} Q${(a.x + b.x) / 2 + (b.x - CX) * 0.15} ${Math.min(a.y, b.y) - 25} ${b.x} ${b.y}`}
                fill="none"
                stroke={dom.cor}
                strokeOpacity={estadoTecnica(t) === "bloqueada" ? 0.2 : 0.65}
                strokeDasharray={estadoTecnica(t) === "bloqueada" ? "3 5" : undefined}
                strokeWidth="1.2"
              />
            ));
          })}
          {dom.tecnicas.map((t) => {
            const p = posTecnica[t.id];
            return (
              <Estrela
                key={t.id}
                x={p.x}
                y={p.y}
                r={t.parametro >= 14 ? 7 : 5.5}
                cor={dom.cor}
                forma={t.tipo === "Ativa" ? "estrela" : "circulo"}
                estado={estadoTecnica(t)}
                rotulo={t.nome}
                rotuloAcima={t.parametro >= 10}
                selecionada={escolhida?.id === t.id}
                onClick={() => setEscolhida({ tipo: "tecnica", id: t.id })}
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
