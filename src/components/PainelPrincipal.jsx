import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { motion, AnimatePresence } from "framer-motion";
import CriarFicha from "./CriarFicha";
import FichaDetalhes from "./FichaDetalhes";
import BandejaDados from "./BandejaDados";
import TelaMestre from "./TelaMestre";

const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const MAP_W = 800;
const MAP_H = 400;

const ESCOLAS = [
  {
    id: "primordiais",
    nome: "Bastião de Rocha",
    icone: "🜂",
    cor: "#c47a2b",
    lat: -15,
    lng: -48,
  },
  {
    id: "colossos",
    nome: "Forja de Titãs",
    icone: "⚔",
    cor: "#8b2020",
    lat: 48,
    lng: 12,
  },
  {
    id: "mentalistas",
    nome: "Cidadela do Pensamento",
    icone: "◈",
    cor: "#6b2fa0",
    lat: 32,
    lng: 108,
  },
  {
    id: "eter",
    nome: "Santuário do Éter",
    icone: "✦",
    cor: "#1a6b8a",
    lat: -25,
    lng: 133,
  },
];

const TIPO_COR = {
  POLÍTICA: "#8b6020",
  RESISTÊNCIA: "#6b2fa0",
  RELÍQUIA: "#1a6b8a",
  RECRUTAMENTO: "#2a7040",
  ALERTA: "#8b2020",
};

// ─────────────────────────────────────────────
// HOOK DO MAPA
// ─────────────────────────────────────────────
function useMundoGeo() {
  const [paises, setPaises] = useState([]);
  const [projecao, setProjecao] = useState(null);
  const [pathGen, setPathGen] = useState(null);

  useEffect(() => {
    fetch(GEO_URL)
      .then((r) => r.json())
      .then((topo) => {
        const geo = feature(topo, topo.objects.countries);
        const proj = geoMercator()
          .scale(120)
          .center([10, 15])
          .translate([MAP_W / 2, MAP_H / 2]);
        setPaises(geo.features);
        setProjecao(() => proj);
        setPathGen(() => geoPath().projection(proj));
      })
      .catch(() => {});
  }, []);

  return { paises, projecao, pathGen };
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export default function PainelPrincipal({ session, onSair }) {
  const [abaAtiva, setAbaAtiva] = useState("inicio");
  const [fichas, setFichas] = useState([]);
  const [personagemSelecionado, setPersonagemSelecionado] = useState(null);
  const [criandoFicha, setCriandoFicha] = useState(false);
  const [fichaParaContinuar, setFichaParaContinuar] = useState(null);
  const [fichaVerDetalhes, setFichaVerDetalhes] = useState(null);
  const [escolaHover, setEscolaHover] = useState(null);
  const [linhagensMap, setLinhagensMap] = useState({});
  const [userRole, setUserRole] = useState("jogador");

  const nomeUsuario = session?.user?.email?.split("@")[0] ?? "Scrip";

  // Carrega role do usuário
  useEffect(() => {
    async function carregarRole() {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();
      if (data) setUserRole(data.role);
    }
    if (session?.user?.id) carregarRole();
  }, [session]);

  // Carrega linhagens uma vez para resolver nomes sem join
  useEffect(() => {
    async function carregarLinhagens() {
      const { data } = await supabase
        .from("linhagens_mutantes")
        .select("id, nome_tribo");
      if (data) {
        const mapa = {};
        data.forEach((l) => (mapa[l.id] = l.nome_tribo));
        setLinhagensMap(mapa);
      }
    }
    carregarLinhagens();
  }, []);

  // Helper: resolve nome da linhagem pelo raca_id
  function nomeLinhagem(ficha) {
    return linhagensMap[ficha?.raca_id] || "Linhagem desconhecida";
  }

  // Continuar criação de ficha rascunho
  function continuarFicha(ficha) {
    setFichaParaContinuar(ficha);
    setCriandoFicha(true);
    setAbaAtiva("personagens");
  }

  // Descartar ficha rascunho (CASCADE deleta ficha_skills automaticamente)
  async function descartarFicha(ficha) {
    if (
      !window.confirm(
        `Descartar "${ficha.nome_personagem || "Ficha sem nome"}"? Essa ação não pode ser desfeita.`,
      )
    )
      return;
    const { error } = await supabase.from("fichas").delete().eq("id", ficha.id);
    if (error) {
      alert("Erro ao descartar: " + error.message);
      return;
    }
    if (personagemSelecionado?.id === ficha.id) setPersonagemSelecionado(null);
    carregarFichas(session.user.id);
  }

  useEffect(() => {
    if (session?.user?.id) carregarFichas(session.user.id);
  }, [session]);

  async function carregarFichas(userId) {
    const { data } = await supabase
      .from("fichas")
      .select("*")
      .order("created_at", { ascending: true });
    if (data) {
      setFichas(data);
      if (personagemSelecionado) {
        const atualizado = data.find((f) => f.id === personagemSelecionado.id);
        if (atualizado) setPersonagemSelecionado(atualizado);
      }
    }
  }

  function selecionarPersonagem(ficha) {
    setPersonagemSelecionado((prev) => (prev?.id === ficha.id ? null : ficha));
  }

  const ABAS = [
    { id: "inicio", label: "INÍCIO" },
    { id: "personagens", label: "PERSONAGENS" },
    { id: "instituto", label: "INSTITUTO" },
    { id: "mapa", label: "MAPA DE SCRIP" },
    { id: "inventario", label: "INVENTÁRIO" },
    { id: "comunidade", label: "COMUNIDADE" },
    ...(userRole === "mestre" || userRole === "adm"
      ? [{ id: "mestre", label: "⚔ MESTRE" }]
      : []),
  ];

  function renderConteudo() {
    if (abaAtiva === "inicio") {
      return (
        <ViewInicio
          escolaHover={escolaHover}
          setEscolaHover={setEscolaHover}
          personagemSelecionado={personagemSelecionado}
          nomeLinhagem={nomeLinhagem}
        />
      );
    }
    if (abaAtiva === "personagens") {
      if (fichaVerDetalhes) {
        return (
          <FichaDetalhes
            fichaId={fichaVerDetalhes.id}
            nomeLinhagem={nomeLinhagem(fichaVerDetalhes)}
            onVoltar={() => {
              setFichaVerDetalhes(null);
              carregarFichas(session.user.id);
            }}
          />
        );
      }
      if (criandoFicha) {
        return (
          <div style={{ padding: "20px" }}>
            <CriarFicha
              userId={session.user.id}
              fichaExistente={fichaParaContinuar}
              onVoltar={() => {
                setCriandoFicha(false);
                setFichaParaContinuar(null);
              }}
              onFichaCriada={() => {
                setCriandoFicha(false);
                setFichaParaContinuar(null);
                carregarFichas(session.user.id);
              }}
            />
          </div>
        );
      }
      return (
        <ViewPersonagens
          fichas={fichas}
          personagemSelecionado={personagemSelecionado}
          onSelecionarPersonagem={selecionarPersonagem}
          onCriarFicha={() => {
            setFichaParaContinuar(null);
            setCriandoFicha(true);
          }}
          onContinuarFicha={continuarFicha}
          onDescartarFicha={descartarFicha}
          onVerFicha={(ficha) => setFichaVerDetalhes(ficha)}
          nomeLinhagem={nomeLinhagem}
        />
      );
    }
    if (abaAtiva === "instituto") {
      return (
        <ViewInstituto
          fichas={fichas}
          personagemSelecionado={personagemSelecionado}
          nomeLinhagem={nomeLinhagem}
          onSelecionarPersonagem={(ficha) => {
            setPersonagemSelecionado(ficha);
          }}
        />
      );
    }
    if (
      abaAtiva === "mestre" &&
      (userRole === "mestre" || userRole === "adm")
    ) {
      return <TelaMestre session={session} nomeLinhagem={nomeLinhagem} />;
    }
    return (
      <ViewEmConstrucao aba={ABAS.find((a) => a.id === abaAtiva)?.label} />
    );
  }

  return (
    <div style={s.root}>
      <div style={s.fundo} />
      <div style={s.grain} />

      {/* HEADER */}
      <header style={s.header}>
        <div style={s.headerLogo}>
          <div style={s.logoIcone}>⚔</div>
          <div>
            <div style={s.logoTitulo}>A QUEDA DE UMA ORDEM</div>
            <div style={s.logoSub}>O DESPERTAR DOS SCRIPS</div>
          </div>
        </div>

        <nav style={s.nav}>
          {ABAS.map((aba) => (
            <button
              key={aba.id}
              style={{
                ...s.navBtn,
                color: abaAtiva === aba.id ? "#e8d08a" : "#4a3820",
                borderBottom:
                  abaAtiva === aba.id
                    ? "2px solid #c4a050"
                    : "2px solid transparent",
                background:
                  abaAtiva === aba.id ? "rgba(196,160,80,0.05)" : "transparent",
              }}
              onClick={() => {
                setAbaAtiva(aba.id);
                setCriandoFicha(false);
                setFichaVerDetalhes(null);
              }}
            >
              {aba.label}
            </button>
          ))}
        </nav>

        <div style={s.headerPerfil}>
          {/* Personagem ativo no header — clique para deselecionar */}
          {personagemSelecionado && (
            <motion.button
              style={s.personagemAtivoTag}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => setPersonagemSelecionado(null)}
              title="Clique para desselecionar"
            >
              <span style={s.personagemAtivoIcone}>◈</span>
              <span style={s.personagemAtivoNome}>
                {personagemSelecionado.nome_personagem}
              </span>
              <span style={s.personagemAtivoX}>×</span>
            </motion.button>
          )}
          <div style={s.perfilIcone}>✦</div>
          <div>
            <div style={s.perfilNome}>{nomeUsuario.toUpperCase()}</div>
            <button
              style={s.btnSair}
              onClick={onSair}
              onMouseOver={(e) => (e.currentTarget.style.color = "#c4a050")}
              onMouseOut={(e) => (e.currentTarget.style.color = "#3a2e10")}
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO */}
      <main style={s.main}>
        <AnimatePresence mode="wait">
          <motion.div
            key={abaAtiva + (criandoFicha ? "-criando" : "")}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            style={{ width: "100%" }}
          >
            {renderConteudo()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* BOTÃO FLUTUANTE DE DADOS */}
      <BandejaDados fichaId={personagemSelecionado?.id} />
    </div>
  );
}

// ─────────────────────────────────────────────
// VIEW: INÍCIO
// ─────────────────────────────────────────────
function ViewInicio({
  escolaHover,
  setEscolaHover,
  personagemSelecionado,
  nomeLinhagem,
}) {
  const { paises, projecao, pathGen } = useMundoGeo();
  const temPersonagem = !!personagemSelecionado;
  const [eventos, setEventos] = useState([]);

  useEffect(() => {
    async function carregarEventos() {
      const { data } = await supabase
        .from("eventos_feed")
        .select("*")
        .eq("ativo", true)
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) setEventos(data);
    }
    carregarEventos();
  }, []);

  return (
    <div
      style={{
        ...s.inicioLayout,
        gridTemplateColumns: temPersonagem ? "1fr 190px" : "1fr",
      }}
    >
      {/* COLUNA CENTRAL */}
      <div style={s.inicioCenter}>
        {/* MAPA PERGAMINHO */}
        <div style={s.mapaWrap}>
          <svg width={0} height={0} style={{ position: "absolute" }}>
            <defs>
              <filter id="pergaminho">
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.65"
                  numOctaves="3"
                  result="noise"
                />
                <feColorMatrix
                  type="saturate"
                  values="0"
                  in="noise"
                  result="gray"
                />
                <feBlend
                  in="SourceGraphic"
                  in2="gray"
                  mode="multiply"
                  result="blend"
                />
                <feComponentTransfer in="blend">
                  <feFuncR type="linear" slope="0.85" intercept="0.1" />
                  <feFuncG type="linear" slope="0.72" intercept="0.08" />
                  <feFuncB type="linear" slope="0.45" intercept="0.04" />
                </feComponentTransfer>
              </filter>
            </defs>
          </svg>

          <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={s.mapaSvg}>
            <rect width={MAP_W} height={MAP_H} fill="#3d2e1a" />
            <rect
              width={MAP_W}
              height={MAP_H}
              fill="#b8935a"
              opacity="0.15"
              filter="url(#pergaminho)"
            />

            {projecao &&
              [-60, -30, 0, 30, 60].map((lat) => {
                const [, y] = projecao([0, lat]) ?? [];
                return y != null ? (
                  <line
                    key={"lat" + lat}
                    x1={0}
                    y1={y}
                    x2={MAP_W}
                    y2={y}
                    stroke="rgba(100,70,30,0.2)"
                    strokeWidth="0.5"
                    strokeDasharray="3 6"
                  />
                ) : null;
              })}
            {projecao &&
              [-120, -60, 0, 60, 120].map((lng) => {
                const [x] = projecao([lng, 0]) ?? [];
                return x != null ? (
                  <line
                    key={"lng" + lng}
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={MAP_H}
                    stroke="rgba(100,70,30,0.2)"
                    strokeWidth="0.5"
                    strokeDasharray="3 6"
                  />
                ) : null;
              })}

            {pathGen &&
              paises.map((p, i) => (
                <path
                  key={i}
                  d={pathGen(p)}
                  fill="#c4956a"
                  stroke="#7a5030"
                  strokeWidth="0.6"
                  strokeLinejoin="round"
                  filter="url(#pergaminho)"
                />
              ))}

            <rect
              x={4}
              y={4}
              width={MAP_W - 8}
              height={MAP_H - 8}
              fill="none"
              stroke="rgba(160,110,50,0.4)"
              strokeWidth="1.5"
            />
            <rect
              x={8}
              y={8}
              width={MAP_W - 16}
              height={MAP_H - 16}
              fill="none"
              stroke="rgba(160,110,50,0.2)"
              strokeWidth="0.5"
            />

            {projecao &&
              ESCOLAS.map((escola, idx) => {
                const coords = projecao([escola.lng, escola.lat]);
                if (!coords) return null;
                const [cx, cy] = coords;
                const hover = escolaHover === escola.id;

                return (
                  <g
                    key={escola.id}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setEscolaHover(escola.id)}
                    onMouseLeave={() => setEscolaHover(null)}
                  >
                    <motion.circle
                      cx={cx}
                      cy={cy}
                      r={hover ? 20 : 14}
                      fill={escola.cor}
                      opacity={0.07}
                      animate={{ r: [12, 18, 12], opacity: [0.05, 0.12, 0.05] }}
                      transition={{
                        duration: 2.6,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: idx * 0.65,
                      }}
                    />
                    <motion.circle
                      cx={cx}
                      cy={cy}
                      r={hover ? 12 : 8}
                      fill="none"
                      stroke={escola.cor}
                      strokeWidth="1"
                      animate={{ opacity: [0.28, 0.6, 0.28] }}
                      transition={{
                        duration: 2.6,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: idx * 0.65,
                      }}
                      style={{ transition: "r 0.3s" }}
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={hover ? 5 : 3.5}
                      fill={escola.cor}
                      stroke="#2a1a08"
                      strokeWidth="0.8"
                      style={{ transition: "r 0.2s" }}
                    />
                    <text
                      x={cx}
                      y={cy - 14}
                      textAnchor="middle"
                      fontSize={hover ? "13" : "11"}
                      style={{
                        userSelect: "none",
                        transition: "font-size 0.2s",
                      }}
                    >
                      {escola.icone}
                    </text>
                    {hover && (
                      <g>
                        <rect
                          x={cx - 62}
                          y={cy + 8}
                          width={124}
                          height={20}
                          rx={3}
                          fill="rgba(18,10,2,0.92)"
                          stroke={escola.cor}
                          strokeWidth="0.7"
                        />
                        <text
                          x={cx}
                          y={cy + 21}
                          textAnchor="middle"
                          fill={escola.cor}
                          fontSize="8.5"
                          fontFamily="'Palatino Linotype', serif"
                          fontWeight="bold"
                          letterSpacing="0.7"
                          style={{ userSelect: "none" }}
                        >
                          {escola.nome}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

            {/* Rosa dos ventos */}
            <g
              transform={`translate(${MAP_W - 44}, ${MAP_H - 44})`}
              opacity="0.3"
            >
              <line
                x1="0"
                y1="-16"
                x2="0"
                y2="16"
                stroke="#7a5030"
                strokeWidth="0.7"
              />
              <line
                x1="-16"
                y1="0"
                x2="16"
                y2="0"
                stroke="#7a5030"
                strokeWidth="0.7"
              />
              <polygon points="0,-16 2.5,-7 0,-10 -2.5,-7" fill="#7a5030" />
              <text
                x="0"
                y="-18"
                textAnchor="middle"
                fontSize="6.5"
                fill="#7a5030"
                fontFamily="'Palatino Linotype', serif"
              >
                N
              </text>
            </g>
          </svg>

          <div
            style={{
              ...s.mapaLabel,
              color: escolaHover
                ? ESCOLAS.find((e) => e.id === escolaHover)?.cor
                : "transparent",
            }}
          >
            {escolaHover
              ? ESCOLAS.find((e) => e.id === escolaHover)?.nome
              : "·"}
          </div>
        </div>

        {/* FEED DE EVENTOS */}
        <div style={s.feedWrap}>
          <div style={s.feedTitulo}>
            <div style={s.feedLinha} />
            <span style={s.feedTituloTexto}>
              EVENTOS ATUAIS E POLÍTICA DE SCRIP
            </span>
            <div style={s.feedLinha} />
          </div>
          <div style={s.feedScroll}>
            {eventos.map((ev, i) => (
              <motion.div
                key={ev.id}
                style={s.feedCard}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ y: -3, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}
              >
                <span
                  style={{
                    ...s.feedTipo,
                    color: TIPO_COR[ev.tipo],
                    borderColor: TIPO_COR[ev.tipo],
                  }}
                >
                  [{ev.tipo}]
                </span>
                <p style={s.feedCardTitulo}>{ev.titulo}</p>
                <p style={s.feedCardDesc}>{ev.descricao}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* SIDEBAR — só renderiza se há personagem selecionado */}
      <AnimatePresence>
        {temPersonagem && (
          <motion.aside
            key="sidebar"
            style={s.sidebar}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            {/* NOME DO PERSONAGEM ATIVO */}
            <div style={s.sidebarPersonagemHeader}>
              <span style={s.sidebarPersonagemNome}>
                {personagemSelecionado.nome_personagem}
              </span>
              <span style={s.sidebarPersonagemLinhagem}>
                {nomeLinhagem(personagemSelecionado)}
              </span>
            </div>

            {/* OBJETIVOS */}
            <div style={s.sidebarCard}>
              <h3 style={s.sidebarTitulo}>SEUS OBJETIVOS</h3>
              <div style={s.sidebarDiv} />
              {/* TODO: buscar de tabela `objetivos` quando existir */}
              <ol style={s.objetivosList}>
                {[
                  "Contatar a Cidadela",
                  "Sobreviver",
                  "Encontrar o fragmento",
                ].map((obj, i) => (
                  <li key={i} style={s.objetivoItem}>
                    <span style={s.objetivoNum}>{i + 1}.</span>
                    <span style={s.objetivoTexto}>{obj}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* REPUTAÇÃO */}
            <div style={s.sidebarCard}>
              <h3 style={s.sidebarTitulo}>REPUTAÇÃO</h3>
              <div style={s.sidebarDiv} />
              <RadarReputacao />
            </div>

            {/* PATENTE */}
            <div style={{ ...s.sidebarCard, textAlign: "center" }}>
              <h3 style={s.sidebarTitulo}>PATENTE</h3>
              <div style={s.sidebarDiv} />
              <div style={s.patenteBadge}>
                <span style={{ fontSize: "1.6em" }}>🥉</span>
                <span style={s.patenteNome}>BRONZE</span>
                <span style={s.patenteNivel}>
                  Nível {personagemSelecionado.nivel || 1}
                </span>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────
// RADAR DE REPUTAÇÃO (SVG puro, 5 eixos)
// TODO: buscar valores de fichas.reputacao_json quando existir
// ─────────────────────────────────────────────
function RadarReputacao() {
  const eixos = [
    { label: "Herói", valor: 0.72 },
    { label: "Ameaça", valor: 0.3 },
    { label: "Aliado", valor: 0.55 },
    { label: "Temido", valor: 0.2 },
    { label: "Sábio", valor: 0.45 },
  ];
  const n = eixos.length;
  const R = 48;
  const cx = 65;
  const cy = 65;
  const ang = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pontos = eixos.map((e, i) => {
    const a = ang(i);
    const r = e.valor * R;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
  const fundo = eixos.map((_, i) => {
    const a = ang(i);
    return [cx + R * Math.cos(a), cy + R * Math.sin(a)];
  });

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <svg width={130} height={130} viewBox="0 0 130 130">
        {[0.25, 0.5, 0.75, 1].map((pct, ri) => (
          <polygon
            key={ri}
            points={eixos
              .map((_, i) => {
                const a = ang(i);
                const r = pct * R;
                return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
              })
              .join(" ")}
            fill="none"
            stroke="rgba(196,160,80,0.1)"
            strokeWidth="0.7"
          />
        ))}
        {fundo.map(([x, y], i) => (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="rgba(196,160,80,0.13)"
            strokeWidth="0.7"
          />
        ))}
        <polygon
          points={pontos.map((p) => p.join(",")).join(" ")}
          fill="rgba(196,160,80,0.15)"
          stroke="#c4a050"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {pontos.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={2.5} fill="#c4a050" opacity="0.8" />
        ))}
        {eixos.map((e, i) => {
          const a = ang(i);
          const r = R + 15;
          return (
            <text
              key={i}
              x={cx + r * Math.cos(a)}
              y={cy + r * Math.sin(a)}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#5a4820"
              fontSize="7.5"
              fontFamily="'Palatino Linotype', serif"
              fontWeight="bold"
            >
              {e.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────
// VIEW: PERSONAGENS
// ─────────────────────────────────────────────
function ViewPersonagens({
  fichas,
  personagemSelecionado,
  onSelecionarPersonagem,
  onCriarFicha,
  onContinuarFicha,
  onDescartarFicha,
  onVerFicha,
  nomeLinhagem,
}) {
  const fichasCompletas = fichas.filter((f) => f.status === "completa");
  const fichasRascunho = fichas.filter((f) => f.status !== "completa");
  // Slots livres = 3 - total de fichas (completas + rascunho)
  const podecriar = fichas.length < 3;

  return (
    <div style={s.viewPersonagens}>
      <div style={s.viewHeader}>
        <div style={s.secaoLinha} />
        <h2 style={s.viewTitulo}>OS SEUS SCRIPS</h2>
        <div style={s.secaoLinha} />
      </div>
      <p style={s.viewSub}>
        Selecione um personagem para ativá-lo no painel. Máximo de 3 registros
        ativos.
      </p>

      <div style={s.fichasGrid}>
        {[0, 1, 2].map((i) => {
          // Prioridade: fichas completas primeiro, depois rascunhos, depois slots vazios
          const todasOrdenadas = [...fichasCompletas, ...fichasRascunho];
          const ficha = todasOrdenadas[i];
          const ehRascunho = ficha && ficha.status !== "completa";
          const selecionado =
            !ehRascunho && personagemSelecionado?.id === ficha?.id;

          if (ficha && !ehRascunho) {
            // ─── CARD DE FICHA COMPLETA (existente, sem mudanças) ───
            return (
              <motion.div
                key={ficha.id}
                style={{
                  ...s.fichaCard,
                  borderColor: selecionado
                    ? "#c4a050"
                    : "rgba(196,160,80,0.15)",
                  boxShadow: selecionado
                    ? "0 0 28px rgba(196,160,80,0.2), inset 0 0 20px rgba(196,160,80,0.04)"
                    : "0 4px 16px rgba(0,0,0,0.5)",
                }}
                whileHover={{ y: -4 }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                {/* Badge "ativo" */}
                {selecionado && <div style={s.fichaAtivoTag}>◈ ATIVO</div>}

                <div style={s.fichaCardHeader}>
                  <h3
                    style={{
                      ...s.fichaNome,
                      color: selecionado ? "#e8d08a" : "#c4a050",
                    }}
                  >
                    {ficha.nome_personagem}
                  </h3>
                  <span style={s.fichaNivel}>Nível {ficha.nivel || 1}</span>
                </div>

                <p style={s.fichaLinhagem}>{nomeLinhagem(ficha)}</p>

                <div style={s.fichaStats}>
                  {[
                    ["ST", ficha.st_forca],
                    ["DX", ficha.dx_destreza],
                    ["IQ", ficha.iq_inteligencia],
                    ["HT", ficha.ht_resistencia],
                  ].map(([l, v]) => (
                    <div key={l} style={s.stat}>
                      <span style={s.statLabel}>{l}</span>
                      <span style={s.statValor}>{v ?? "—"}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                  <button
                    style={s.btnSelecionar}
                    onClick={() => onSelecionarPersonagem(ficha)}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background =
                        "rgba(196,160,80,0.15)";
                      e.currentTarget.style.color = "#c4a050";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#6b5530";
                    }}
                  >
                    {selecionado ? "✓ Selecionado" : "Selecionar"}
                  </button>
                  <button
                    style={s.btnAcederFicha}
                    onClick={() => onVerFicha(ficha)}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background =
                        "rgba(196,160,80,0.08)";
                      e.currentTarget.style.color = "#c4a050";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#4a3820";
                    }}
                  >
                    Ver Ficha →
                  </button>
                  <button
                    style={{
                      ...s.btnAcederFicha,
                      borderColor: "rgba(139,50,50,0.2)",
                      color: "#5a2020",
                      flex: "none",
                      padding: "7px 10px",
                    }}
                    onClick={() => onDescartarFicha(ficha)}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = "rgba(139,50,50,0.1)";
                      e.currentTarget.style.color = "#8b2020";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#5a2020";
                    }}
                  >
                    ✕
                  </button>
                </div>
              </motion.div>
            );
          }

          if (ficha && ehRascunho) {
            // ─── CARD DE FICHA RASCUNHO ───
            return (
              <motion.div
                key={ficha.id}
                style={{
                  ...s.fichaCard,
                  borderColor: "rgba(196,160,80,0.2)",
                  borderStyle: "dashed",
                  opacity: 0.75,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                }}
                whileHover={{ y: -4, opacity: 1 }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 0.75, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                {/* Badge "rascunho" */}
                <div
                  style={{
                    ...s.fichaAtivoTag,
                    color: "#8b6020",
                    background: "rgba(139,96,32,0.12)",
                    border: "1px solid rgba(139,96,32,0.3)",
                  }}
                >
                  ✎ RASCUNHO
                </div>

                <div style={s.fichaCardHeader}>
                  <h3 style={{ ...s.fichaNome, color: "#8b6020" }}>
                    {ficha.nome_personagem || "Sem nome"}
                  </h3>
                </div>

                <p style={s.fichaLinhagem}>{nomeLinhagem(ficha)}</p>

                <div style={s.fichaStats}>
                  {[
                    ["ST", ficha.st_forca],
                    ["DX", ficha.dx_destreza],
                    ["IQ", ficha.iq_inteligencia],
                    ["HT", ficha.ht_resistencia],
                  ].map(([l, v]) => (
                    <div key={l} style={s.stat}>
                      <span style={s.statLabel}>{l}</span>
                      <span style={{ ...s.statValor, color: "#8b6020" }}>
                        {v ?? "—"}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                  <button
                    style={{
                      ...s.btnSelecionar,
                      borderColor: "rgba(196,160,80,0.3)",
                      color: "#c4a050",
                    }}
                    onClick={() => onContinuarFicha(ficha)}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background =
                        "rgba(196,160,80,0.15)";
                      e.currentTarget.style.color = "#e8d08a";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#c4a050";
                    }}
                  >
                    Continuar criação →
                  </button>
                  <button
                    style={{
                      ...s.btnAcederFicha,
                      borderColor: "rgba(139,50,50,0.2)",
                      color: "#6b3030",
                    }}
                    onClick={() => onDescartarFicha(ficha.id)}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = "rgba(139,50,50,0.1)";
                      e.currentTarget.style.color = "#a04040";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#6b3030";
                    }}
                  >
                    Descartar
                  </button>
                </div>
              </motion.div>
            );
          }

          // ─── SLOT VAZIO ───
          return (
            <motion.div
              key={`vazio-${i}`}
              style={{
                ...s.fichaCardVazio,
                cursor: podecriar ? "pointer" : "not-allowed",
                opacity: podecriar ? 1 : 0.4,
              }}
              whileHover={
                podecriar ? { borderColor: "rgba(196,160,80,0.4)", y: -4 } : {}
              }
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: podecriar ? 1 : 0.4, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => podecriar && onCriarFicha()}
            >
              <span style={s.fichaVazioIcone}>+</span>
              <span style={s.fichaVazioTexto}>
                {podecriar ? "Criar Novo Registro" : "Limite atingido"}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// VIEW: INSTITUTO
// ─────────────────────────────────────────────
function ViewInstituto({
  fichas,
  personagemSelecionado,
  onSelecionarPersonagem,
  nomeLinhagem,
}) {
  // Se não há personagem selecionado, pede para selecionar
  if (!personagemSelecionado) {
    return (
      <div style={s.institutoSelecao}>
        <motion.div
          style={s.institutoSelecaoCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <span style={s.institutoSelecaoIcone}>◈</span>
          <h2 style={s.institutoSelecaoTitulo}>
            Qual Scrip está acessando o Instituto?
          </h2>
          <p style={s.institutoSelecaoSub}>
            Selecione um personagem para ver as expedições, missões e registros
            do seu Instituto.
          </p>

          {/* Mini-cards dos personagens disponíveis */}
          <div style={s.institutoSlots}>
            {fichas.length === 0 ? (
              <p
                style={{
                  color: "#3a2e10",
                  fontSize: "0.8em",
                  letterSpacing: "1px",
                }}
              >
                Nenhum personagem criado ainda.
              </p>
            ) : (
              fichas.map((ficha, i) => (
                <motion.button
                  key={ficha.id}
                  style={s.institutoSlotBtn}
                  whileHover={{
                    borderColor: "rgba(196,160,80,0.5)",
                    background: "rgba(196,160,80,0.08)",
                    y: -3,
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => onSelecionarPersonagem(ficha)}
                >
                  <span style={s.institutoSlotIcone}>
                    {["🜂", "⚔", "◈", "✦"][i % 4]}
                  </span>
                  <div>
                    <div style={s.institutoSlotNome}>
                      {ficha.nome_personagem}
                    </div>
                    <div style={s.institutoSlotLinhagem}>
                      {nomeLinhagem(ficha)} · Nível {ficha.nivel || 1}
                    </div>
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // Com personagem selecionado — placeholder do conteúdo futuro
  return (
    <ViewEmConstrucao
      aba={`INSTITUTO — ${personagemSelecionado.nome_personagem}`}
    />
  );
}

// ─────────────────────────────────────────────
// VIEW: EM CONSTRUÇÃO
// ─────────────────────────────────────────────
function ViewEmConstrucao({ aba }) {
  return (
    <motion.div
      style={s.emConstrucao}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <span style={s.emConstrucaoIcone}>⚙</span>
      <h2 style={s.emConstrucaoTitulo}>{aba}</h2>
      <p style={s.emConstrucaoTexto}>
        Esta seção está sendo forjada. Em breve disponível.
      </p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────
const s = {
  root: {
    minHeight: "100vh",
    width: "100%",
    background: "#070906",
    position: "relative",
    overflow: "hidden",
    fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
    color: "#c4a050",
    display: "flex",
    flexDirection: "column",
  },
  fundo: {
    position: "fixed",
    inset: 0,
    background:
      "radial-gradient(ellipse at 30% 20%, rgba(90,50,10,0.1) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(60,10,10,0.08) 0%, transparent 45%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  grain: {
    position: "fixed",
    inset: 0,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E")`,
    backgroundRepeat: "repeat",
    backgroundSize: "200px",
    pointerEvents: "none",
    zIndex: 1,
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
    height: "56px",
    background: "rgba(5,4,2,0.96)",
    borderBottom: "1px solid rgba(196,160,80,0.13)",
    backdropFilter: "blur(14px)",
    gap: "12px",
  },
  headerLogo: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    flexShrink: 0,
  },
  logoIcone: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: "1px solid rgba(196,160,80,0.32)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1em",
    color: "#c4a050",
    flexShrink: 0,
  },
  logoTitulo: {
    fontSize: "0.68em",
    fontWeight: 700,
    letterSpacing: "1.5px",
    color: "#b89040",
    whiteSpace: "nowrap",
  },
  logoSub: { fontSize: "0.43em", letterSpacing: "2.5px", color: "#3a2e10" },
  nav: {
    display: "flex",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  navBtn: {
    padding: "0 12px",
    height: "56px",
    border: "none",
    cursor: "pointer",
    transition: "all 0.18s",
    fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
    fontSize: "0.58em",
    fontWeight: 700,
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  headerPerfil: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexShrink: 0,
  },
  personagemAtivoTag: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    padding: "4px 10px",
    borderRadius: "4px",
    background: "rgba(196,160,80,0.1)",
    border: "1px solid rgba(196,160,80,0.25)",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  personagemAtivoIcone: { fontSize: "0.65em", color: "#c4a050" },
  personagemAtivoNome: {
    fontSize: "0.65em",
    fontWeight: 700,
    color: "#c4a050",
    letterSpacing: "0.5px",
  },
  personagemAtivoX: { fontSize: "0.7em", color: "#5a4820", marginLeft: "2px" },
  perfilIcone: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    border: "1px solid rgba(196,160,80,0.28)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.85em",
    color: "#c4a050",
    background: "rgba(196,160,80,0.04)",
  },
  perfilNome: {
    fontSize: "0.65em",
    fontWeight: 700,
    letterSpacing: "1px",
    color: "#9a7a30",
  },
  btnSair: {
    background: "none",
    border: "none",
    color: "#3a2e10",
    fontFamily: "inherit",
    fontSize: "0.58em",
    cursor: "pointer",
    letterSpacing: "1px",
    padding: 0,
    transition: "color 0.2s",
  },
  main: {
    position: "relative",
    zIndex: 2,
    flex: 1,
    display: "flex",
    padding: "16px 18px 24px",
  },

  // INÍCIO
  inicioLayout: {
    display: "grid",
    gap: "16px",
    width: "100%",
    alignItems: "flex-start",
    transition: "grid-template-columns 0.35s ease",
  },
  inicioCenter: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    minWidth: 0,
  },

  // Mapa
  mapaWrap: {
    borderRadius: "7px",
    overflow: "hidden",
    border: "1px solid rgba(160,110,50,0.32)",
    boxShadow: "0 12px 40px rgba(0,0,0,0.7), inset 0 0 50px rgba(30,15,0,0.4)",
    background: "#3d2e1a",
  },
  mapaSvg: { width: "100%", display: "block" },
  mapaLabel: {
    textAlign: "center",
    fontSize: "0.62em",
    fontWeight: 700,
    letterSpacing: "2px",
    textTransform: "uppercase",
    padding: "5px 0",
    height: 22,
    transition: "color 0.25s",
    background: "rgba(18,10,2,0.8)",
  },

  // Feed
  feedWrap: { display: "flex", flexDirection: "column", gap: "9px" },
  feedTitulo: { display: "flex", alignItems: "center", gap: "10px" },
  feedTituloTexto: {
    fontSize: "0.52em",
    fontWeight: 700,
    letterSpacing: "3px",
    color: "#4a3820",
    whiteSpace: "nowrap",
    textTransform: "uppercase",
  },
  feedLinha: {
    flex: 1,
    height: 1,
    background: "linear-gradient(to right, rgba(196,160,80,0.14), transparent)",
  },
  feedScroll: {
    display: "flex",
    gap: "10px",
    overflowX: "auto",
    paddingBottom: "4px",
    scrollbarWidth: "thin",
    scrollbarColor: "rgba(196,160,80,0.15) transparent",
  },
  feedCard: {
    flexShrink: 0,
    width: "195px",
    padding: "12px",
    background: "rgba(10,12,6,0.85)",
    border: "1px solid rgba(196,160,80,0.09)",
    borderRadius: "5px",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    cursor: "default",
    transition: "box-shadow 0.25s",
  },
  feedTipo: {
    fontSize: "0.55em",
    fontWeight: 700,
    letterSpacing: "1px",
    border: "1px solid",
    borderRadius: "2px",
    padding: "1px 5px",
    alignSelf: "flex-start",
  },
  feedCardTitulo: {
    margin: 0,
    fontSize: "0.72em",
    fontWeight: 700,
    color: "#c4a050",
    lineHeight: 1.4,
  },
  feedCardDesc: {
    margin: 0,
    fontSize: "0.62em",
    color: "#4a3820",
    lineHeight: 1.5,
  },

  // Sidebar
  sidebar: {
    width: "190px",
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  sidebarPersonagemHeader: {
    padding: "12px 14px",
    background: "rgba(196,160,80,0.06)",
    border: "1px solid rgba(196,160,80,0.18)",
    borderRadius: "7px",
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  sidebarPersonagemNome: {
    fontSize: "0.82em",
    fontWeight: 700,
    color: "#e8d08a",
    letterSpacing: "0.5px",
  },
  sidebarPersonagemLinhagem: {
    fontSize: "0.6em",
    color: "#5a4820",
    letterSpacing: "0.5px",
  },
  sidebarCard: {
    padding: "14px",
    background: "rgba(10,12,6,0.85)",
    border: "1px solid rgba(196,160,80,0.09)",
    borderRadius: "7px",
  },
  sidebarTitulo: {
    margin: "0 0 7px",
    fontSize: "0.55em",
    fontWeight: 700,
    letterSpacing: "3px",
    color: "#4a3820",
    textTransform: "uppercase",
  },
  sidebarDiv: {
    height: 1,
    background: "linear-gradient(to right, rgba(196,160,80,0.18), transparent)",
    margin: "0 0 10px",
  },
  objetivosList: {
    margin: 0,
    padding: 0,
    listStyle: "none",
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },
  objetivoItem: { display: "flex", gap: "7px", alignItems: "flex-start" },
  objetivoNum: {
    fontSize: "0.62em",
    color: "#c4a050",
    fontWeight: 700,
    flexShrink: 0,
  },
  objetivoTexto: { fontSize: "0.68em", color: "#6b5530", lineHeight: 1.4 },
  patenteBadge: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "3px",
    padding: "6px 0",
  },
  patenteNome: {
    fontSize: "0.65em",
    fontWeight: 700,
    letterSpacing: "2px",
    color: "#c4a050",
  },
  patenteNivel: { fontSize: "0.58em", color: "#4a3820", letterSpacing: "1px" },

  // PERSONAGENS view
  viewPersonagens: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    maxWidth: "900px",
    margin: "0 auto",
    width: "100%",
  },
  viewHeader: { display: "flex", alignItems: "center", gap: "14px" },
  viewTitulo: {
    margin: 0,
    fontSize: "0.62em",
    fontWeight: 700,
    letterSpacing: "4px",
    color: "#52421e",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  viewSub: {
    margin: 0,
    fontSize: "0.75em",
    color: "#4a3820",
    textAlign: "center",
  },
  secaoLinha: {
    flex: 1,
    height: 1,
    background: "linear-gradient(to right, rgba(196,160,80,0.16), transparent)",
  },
  fichasGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "18px",
  },
  fichaCard: {
    padding: "22px",
    position: "relative",
    background: "rgba(10,12,6,0.88)",
    border: "1px solid",
    borderRadius: "9px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    transition: "border-color 0.3s, box-shadow 0.3s",
  },
  fichaAtivoTag: {
    position: "absolute",
    top: "10px",
    right: "10px",
    fontSize: "0.52em",
    fontWeight: 700,
    letterSpacing: "2px",
    color: "#c4a050",
    background: "rgba(196,160,80,0.1)",
    border: "1px solid rgba(196,160,80,0.25)",
    padding: "2px 7px",
    borderRadius: "3px",
  },
  fichaCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  fichaNome: {
    margin: 0,
    fontSize: "1.05em",
    fontWeight: 700,
    transition: "color 0.3s",
  },
  fichaNivel: {
    fontSize: "0.6em",
    fontWeight: 700,
    background: "rgba(196,160,80,0.1)",
    border: "1px solid rgba(196,160,80,0.25)",
    color: "#c4a050",
    padding: "2px 7px",
    borderRadius: "3px",
    letterSpacing: "1px",
  },
  fichaLinhagem: {
    margin: 0,
    fontSize: "0.7em",
    color: "#6b5530",
    letterSpacing: "0.5px",
  },
  fichaStats: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "6px",
  },
  stat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
    padding: "5px 0",
    background: "rgba(196,160,80,0.04)",
    borderRadius: "4px",
    border: "1px solid rgba(196,160,80,0.07)",
  },
  statLabel: {
    fontSize: "0.52em",
    color: "#4a3820",
    letterSpacing: "1px",
    fontWeight: 700,
  },
  statValor: { fontSize: "0.88em", color: "#c4a050", fontWeight: 700 },
  btnSelecionar: {
    flex: 1,
    background: "transparent",
    border: "1px solid rgba(196,160,80,0.2)",
    color: "#6b5530",
    fontFamily: "inherit",
    padding: "7px 0",
    borderRadius: "4px",
    fontSize: "0.68em",
    letterSpacing: "1px",
    cursor: "pointer",
    transition: "all 0.2s",
    textTransform: "uppercase",
    fontWeight: 700,
  },
  btnAcederFicha: {
    flex: 1,
    background: "transparent",
    border: "1px solid rgba(196,160,80,0.1)",
    color: "#4a3820",
    fontFamily: "inherit",
    padding: "7px 0",
    borderRadius: "4px",
    fontSize: "0.68em",
    letterSpacing: "1px",
    cursor: "pointer",
    transition: "all 0.2s",
    textTransform: "uppercase",
    fontWeight: 700,
  },
  fichaCardVazio: {
    padding: "22px",
    background: "rgba(8,10,5,0.5)",
    border: "1px dashed rgba(196,160,80,0.12)",
    borderRadius: "9px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "9px",
    minHeight: "160px",
    transition: "all 0.3s",
  },
  fichaVazioIcone: { fontSize: "1.8em", color: "rgba(196,160,80,0.18)" },
  fichaVazioTexto: {
    fontSize: "0.7em",
    color: "#3a2e10",
    letterSpacing: "1px",
  },

  // INSTITUTO — tela de seleção
  institutoSelecao: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    padding: "20px",
  },
  institutoSelecaoCard: {
    maxWidth: "480px",
    width: "100%",
    textAlign: "center",
    padding: "44px 36px",
    background: "rgba(10,12,6,0.88)",
    border: "1px solid rgba(196,160,80,0.14)",
    borderRadius: "12px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
  },
  institutoSelecaoIcone: {
    fontSize: "2.2em",
    color: "rgba(196,160,80,0.25)",
  },
  institutoSelecaoTitulo: {
    margin: 0,
    fontSize: "1em",
    fontWeight: 700,
    color: "#c4a050",
    letterSpacing: "1px",
    lineHeight: 1.4,
  },
  institutoSelecaoSub: {
    margin: 0,
    fontSize: "0.78em",
    color: "#5a4820",
    lineHeight: 1.7,
    maxWidth: "360px",
  },
  institutoSlots: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    width: "100%",
    marginTop: "8px",
  },
  institutoSlotBtn: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "14px 18px",
    width: "100%",
    textAlign: "left",
    background: "rgba(196,160,80,0.04)",
    border: "1px solid rgba(196,160,80,0.12)",
    borderRadius: "7px",
    cursor: "pointer",
    fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
    transition: "all 0.2s",
  },
  institutoSlotIcone: { fontSize: "1.4em", flexShrink: 0 },
  institutoSlotNome: {
    fontSize: "0.82em",
    fontWeight: 700,
    color: "#c4a050",
    letterSpacing: "0.5px",
  },
  institutoSlotLinhagem: {
    fontSize: "0.65em",
    color: "#5a4820",
    marginTop: "2px",
    letterSpacing: "0.3px",
  },

  // EM CONSTRUÇÃO
  emConstrucao: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "55vh",
    gap: "14px",
    textAlign: "center",
  },
  emConstrucaoIcone: { fontSize: "2.2em", opacity: 0.25 },
  emConstrucaoTitulo: {
    margin: 0,
    fontSize: "0.88em",
    fontWeight: 700,
    letterSpacing: "3px",
    color: "#52421e",
    textTransform: "uppercase",
  },
  emConstrucaoTexto: {
    margin: 0,
    fontSize: "0.75em",
    color: "#3a2e10",
    letterSpacing: "0.5px",
  },
};
