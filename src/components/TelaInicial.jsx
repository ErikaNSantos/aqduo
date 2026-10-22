import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import MundoOrdem from "./MundoOrdem";
import urlEmblema from "../assets/emblema.png";

const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const MAP_W = 960;
const MAP_H = 480;

// ─────────────────────────────────────────────
// BOTÃO DOURADO COM BORDA PULSANTE
// ─────────────────────────────────────────────
function BotaoDourado({ children, onClick, tamanho = "normal" }) {
  const grande = tamanho === "grande";

  return (
    <motion.button
      onClick={onClick}
      style={{
        position: "relative",
        padding: grande ? "13px 40px" : "9px 22px",
        background:
          "linear-gradient(135deg, #1a1200 0%, #2a1e00 50%, #1a1200 100%)",
        color: "#e8c96a",
        border: "1px solid #c4a050",
        borderRadius: 3,
        fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
        fontSize: grande ? "0.85em" : "0.78em",
        fontWeight: 700,
        letterSpacing: grande ? "2.5px" : "1.5px",
        cursor: "pointer",
        textTransform: "uppercase",
        overflow: "hidden",
      }}
      // Pulso contínuo no box-shadow (borda brilhando)
      animate={{
        boxShadow: [
          "0 0  6px rgba(196,160,80,0.3), 0 0 0px rgba(196,160,80,0), inset 0 0  0px rgba(196,160,80,0)",
          "0 0 18px rgba(196,160,80,0.7), 0 0 8px rgba(196,160,80,0.3), inset 0 0  6px rgba(196,160,80,0.08)",
          "0 0  6px rgba(196,160,80,0.3), 0 0 0px rgba(196,160,80,0), inset 0 0  0px rgba(196,160,80,0)",
        ],
        borderColor: [
          "rgba(196,160,80,0.5)",
          "rgba(232,200,106,1)",
          "rgba(196,160,80,0.5)",
        ],
      }}
      transition={{
        duration: 2.4,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      // Hover: escala + brilho instantâneo
      whileHover={{
        scale: 1.04,
        boxShadow:
          "0 0 28px rgba(196,160,80,0.85), 0 0 12px rgba(196,160,80,0.5), inset 0 0 10px rgba(196,160,80,0.12)",
        borderColor: "rgba(232,200,106,1)",
        color: "#fff8e0",
        transition: { duration: 0.2 },
      }}
      whileTap={{ scale: 0.97 }}
    >
      {/* Shimmer interno ao hover */}
      <motion.span
        style={{
          position: "absolute",
          top: 0,
          left: "-100%",
          width: "60%",
          height: "100%",
          background:
            "linear-gradient(90deg, transparent, rgba(255,220,100,0.08), transparent)",
          pointerEvents: "none",
        }}
        whileHover={{
          left: "150%",
          transition: { duration: 0.55, ease: "easeInOut" },
        }}
      />
      {children}
    </motion.button>
  );
}

// ─────────────────────────────────────────────
// VARIANTES DE ANIMAÇÃO
// ─────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0 },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const staggerCards = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

// ─────────────────────────────────────────────
// HOOK: anima quando entra na viewport
// ─────────────────────────────────────────────
function useAnimateOnView(options = {}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px", ...options });
  return { ref, inView };
}

// ─────────────────────────────────────────────
// LORE
// ─────────────────────────────────────────────
const HISTORIA = [
  `No princípio, não havia som. Nem luz. Nem tempo. Apenas o silêncio absoluto de um nada que ainda não sabia que existia. Então... algo rompeu. Um estalo sem som, um clarão onde não havia olhos para ver. O universo nasceu.`,
  `Milênios depois, um meteoro atravessou o céu carregando algo mais do que rocha — carregava energia ancestral, memória condensada do próprio nascimento do cosmos. Quando colidiu com a Terra, não trouxe apenas destruição. Trouxe uma herança.`,
  `Essa energia infiltrou-se no solo, na água, nas raízes. E com o tempo, crianças começaram a nascer diferentes. Alguns com dons ligados à terra e ao fogo. Outros com força além do natural. Outros ainda, capazes de tocar a mente alheia como se fosse a própria. Eles se chamaram de Scrips.`,
  `Os Norcans — os humanos sem mutação aparente — primeiro os reverenciaram. Depois os temeram. E o medo, diante da ganância, não sobrevive por muito tempo. A perseguição veio. As chamas da inquisição. O silêncio forçado de gerações inteiras.`,
  `Os Scrips que sobreviveram criaram A Ordem — não como uma instituição de poder, mas como um pacto de sobrevivência. Uma lei única, gravada em cada membro desde o nascimento: nunca, em hipótese alguma, revele sua identidade a um Norcan. Ou pagará com a vida.`,
  `A Ordem resistiu. Durante séculos, resistiu. Mas toda ordem tem seu fim. E o fim desta... pode estar mais próximo do que qualquer um imagina.`,
];

const ESCOLAS_PADRAO = [
  {
    id: "primordiais",
    nome: "Bastião de Rocha",
    subtitulo: "Primordiais",
    cor: "#c47a2b",
    corGlow: "rgba(196,122,43,0.5)",
    icone: "🜂",
    lat: -15,
    lng: -48,
    resumo:
      "Nascidos da terra. Canais das forças elementais que moldaram o mundo antes de qualquer nome.",
    lore: `Nos primeiros dias após o impacto do meteoro, quando a energia ainda queimava as raízes do mundo, os primeiros Scrips nasceram da própria terra.

Os Primordiais carregam no sangue a memória do solo — pedra, fogo, raiz e água bruta. Dizem os mais velhos que ao nascer, um Primordial faz a terra tremer sob seus pés, como se o mundo reconhecesse um de seus filhos.

O Bastião de Rocha foi fundado nas montanhas do sul, onde os primeiros enclaves Scrip sobreviveram à Inquisição dos Sábios escondidos nas cavernas magnéticas.

"A pedra não cede. A pedra espera."`,
  },
  {
    id: "colossos",
    nome: "Forja de Titãs",
    subtitulo: "Colossos",
    cor: "#8b2020",
    corGlow: "rgba(139,32,32,0.5)",
    icone: "⚔",
    lat: 48,
    lng: 12,
    resumo:
      "Os que ficaram quando todos fugiram. Corpos forjados no impacto, espíritos forjados na escolha.",
    lore: `Quando os Norcans começaram a caçar os Scrips, nem todos fugiram. Alguns ficaram. Não por orgulho — por necessidade. Alguém precisava proteger os que corriam.

Os Colossos nasceram dessa escolha. Com o tempo, seus corpos aprenderam a linguagem da força — uma presença que faz o ar ao redor ficar mais denso.

A Forja de Titãs não é um lugar para os fracos de espírito. Não porque sejam cruéis — mas porque o peso que carregam exige uma âncora interior que poucos conseguem desenvolver.

"Não somos os maiores. Somos os que ficaram."`,
  },
  {
    id: "mentalistas",
    nome: "Cidadela do Pensamento",
    subtitulo: "Mentalistas",
    cor: "#6b2fa0",
    corGlow: "rgba(107,47,160,0.5)",
    icone: "◈",
    lat: 32,
    lng: 108,
    resumo:
      "Guardiões da memória coletiva. O que a Inquisição queimou, eles carregam vivo dentro de si.",
    lore: `A Inquisição dos Sábios não queimou apenas corpos. Queimou registros, memórias, nomes. Queimou séculos de conhecimento Scrip que jamais será recuperado.

Os Mentalistas decidiram que isso nunca mais aconteceria. Seus dons não se manifestam na pele — se manifestam nos intervalos entre os pensamentos.

A Cidadela do Pensamento não tem endereço fixo. Move-se. Vive nas mentes dos seus membros.

"O que foi queimado não se perdeu. Está aqui. Sempre esteve."`,
  },
  {
    id: "eter",
    nome: "Santuário do Éter",
    subtitulo: "Éter",
    cor: "#1a6b8a",
    corGlow: "rgba(26,107,138,0.5)",
    icone: "✦",
    lat: -25,
    lng: 133,
    resumo:
      "Os inclassificáveis. Entre todas as categorias e nenhuma delas. O refúgio dos que o mundo não soube nomear.",
    lore: `Existem Scrips cujos dons não se encaixam em nenhuma das categorias que a Ordem criou. Não são da terra, não são da força, não são da mente.

O Santuário do Éter foi criado não como escola, mas como refúgio. Um lugar onde a pergunta "o que você é?" não precisa de resposta imediata.

São os mais difíceis de encontrar. E os mais difíceis de perder, quando encontrados.

"Não pertencemos a um lugar. Pertencemos ao intervalo."`,
  },
];

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
          .scale(140)
          .center([10, 15])
          .translate([MAP_W / 2, MAP_H / 2]);
        const pg = geoPath().projection(proj);
        setPaises(geo.features);
        setProjecao(() => proj);
        setPathGen(() => pg);
      })
      .catch(() => {});
  }, []);

  return { paises, projecao, pathGen };
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export default function TelaInicial({ onEntrar }) {
  const [escolaAtiva, setEscolaAtiva] = useState(null);
  const [escolaHover, setEscolaHover] = useState(null);
  const [escolas, setEscolas] = useState(ESCOLAS_PADRAO);
  const { paises, projecao, pathGen } = useMundoGeo();

  // Refs para animações por seção
  const heroRef = useRef(null);
  const historiaRef = useRef(null);
  const escolasRef = useRef(null);
  const ctaRef = useRef(null);

  const heroInView = useInView(heroRef, { once: true });
  const historiaInView = useInView(historiaRef, {
    once: true,
    margin: "-80px",
  });
  const escolasInView = useInView(escolasRef, { once: true, margin: "-80px" });
  const ctaInView = useInView(ctaRef, { once: true, margin: "-80px" });

  useEffect(() => {
    carregarCoordenadas();
  }, []);

  async function carregarCoordenadas() {
    try {
      const { data } = await supabase
        .from("linhagens_mutantes")
        .select("id, nome_tribo, latitude, longitude");
      if (!data) return;
      setEscolas((prev) =>
        prev.map((escola) => {
          const match = data.find((l) =>
            escola.nome
              .toLowerCase()
              .includes((l.nome_tribo || "").toLowerCase().split(" ")[0]),
          );
          if (match?.latitude != null && match?.longitude != null) {
            return { ...escola, lat: match.latitude, lng: match.longitude };
          }
          return escola;
        }),
      );
    } catch {
      /* usa padrões */
    }
  }

  const ativaData = escolas.find((e) => e.id === escolaAtiva);
  const hoverData = escolas.find((e) => e.id === escolaHover);
  const labelMapa = hoverData || ativaData;

  return (
    <div style={s.root}>
      <div style={s.fundo} />
      <div style={s.grain} />

      {/* ── NAVBAR — fade simples ao montar ── */}
      <motion.nav
        style={s.navbar}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div style={s.navLogo}>
          <img src={urlEmblema} alt="" style={s.logoImg} />
          <div>
            <div style={s.navTitulo}>A QUEDA DE UMA ORDEM</div>
            <div style={s.navSub}>O DESPERTAR DOS SCRIPS</div>
          </div>
        </div>
        <BotaoDourado onClick={onEntrar}>ENTRAR NA ORDEM</BotaoDourado>
      </motion.nav>

      {/* ── HERO — o Terreno Suspenso em 3D, com o título por cima ── */}
      <MundoOrdem escolas={escolas} onEscola={setEscolaAtiva}>
        <motion.div
          ref={heroRef}
          style={s.hero}
          initial="hidden"
          animate={heroInView ? "visible" : "hidden"}
          variants={fadeUp}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
        >
          <p style={s.heroEyebrow}>O DESPERTAR DOS SCRIPS</p>
          <h1 style={s.heroTitulo}>A ORDEM CAIU.</h1>
          <p style={s.heroSub}>Seu despertar começa aqui.</p>
          <button
            type="button"
            style={s.heroBotao}
            onClick={() => escolasRef.current?.scrollIntoView({ behavior: "smooth" })}
          >
            CONHECER AS ESCOLAS
          </button>
        </motion.div>
      </MundoOrdem>

      <div style={s.pagina}>

        {/* ── SEÇÃO HISTÓRIA — parágrafos em stagger ── */}
        <section style={s.secao}>
          <motion.div
            style={s.secaoHeader}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeIn}
            transition={{ duration: 0.6 }}
          >
            <div style={s.secaoLinha} />
            <h2 style={s.secaoTitulo}>HISTÓRIA</h2>
            <div style={s.secaoLinha} />
          </motion.div>

          <motion.div
            ref={historiaRef}
            style={s.historiaTexto}
            initial="hidden"
            animate={historiaInView ? "visible" : "hidden"}
            variants={staggerContainer}
          >
            {HISTORIA.map((p, i) => (
              <motion.p
                key={i}
                style={{
                  ...s.paragrafo,
                  fontSize: i === 0 ? "1.05em" : "0.92em",
                  color: i === 0 ? "#d4b050" : "#9a8040",
                }}
                variants={fadeUp}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                {p}
              </motion.p>
            ))}
          </motion.div>

          <motion.div
            style={s.divisorOrnamental}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div style={s.divisorLinha} />
            <span style={s.divisorIcone}>✦</span>
            <div style={s.divisorLinha} />
          </motion.div>
        </section>

        {/* ── SEÇÃO ESCOLAS ── */}
        <section ref={escolasRef} style={s.secao}>
          <motion.div
            style={s.secaoHeader}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeIn}
            transition={{ duration: 0.6 }}
          >
            <div style={s.secaoLinha} />
            <h2 style={s.secaoTitulo}>AS ESCOLAS DA ORDEM</h2>
            <div style={s.secaoLinha} />
          </motion.div>

          <motion.p
            style={s.escolasIntro}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={fadeUp}
            transition={{ duration: 0.6 }}
          >
            Quatro correntes de poder. Quatro formas de resistir. Escolha onde
            sua história começa.
          </motion.p>

          {/* Mapa — fade-in ao entrar na viewport */}
          <motion.div
            style={s.mapaWrap}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeIn}
            transition={{ duration: 0.9, ease: "easeOut" }}
          >
            <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={s.mapaSvg}>
              <rect width={MAP_W} height={MAP_H} fill="#05070e" />
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
                      stroke="rgba(196,160,80,0.05)"
                      strokeWidth="0.6"
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
                      stroke="rgba(196,160,80,0.05)"
                      strokeWidth="0.6"
                    />
                  ) : null;
                })}
              {projecao &&
                (() => {
                  const [, y] = projecao([0, 0]) ?? [];
                  return y != null ? (
                    <line
                      x1={0}
                      y1={y}
                      x2={MAP_W}
                      y2={y}
                      stroke="rgba(196,160,80,0.1)"
                      strokeWidth="0.8"
                      strokeDasharray="5 7"
                    />
                  ) : null;
                })()}
              {pathGen &&
                paises.map((pais, i) => (
                  <path
                    key={i}
                    d={pathGen(pais)}
                    fill="#141c0c"
                    stroke="rgba(196,160,80,0.28)"
                    strokeWidth="0.5"
                    strokeLinejoin="round"
                  />
                ))}
              {projecao &&
                escolas.map((escola) => {
                  const coords = projecao([escola.lng, escola.lat]);
                  if (!coords) return null;
                  const [cx, cy] = coords;
                  const d =
                    escolaHover === escola.id || escolaAtiva === escola.id;
                  return (
                    <g
                      key={escola.id}
                      style={{ cursor: "pointer" }}
                      onMouseEnter={() => setEscolaHover(escola.id)}
                      onMouseLeave={() => setEscolaHover(null)}
                      onClick={() =>
                        setEscolaAtiva(
                          escolaAtiva === escola.id ? null : escola.id,
                        )
                      }
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r={d ? 20 : 11}
                        fill="none"
                        stroke={escola.cor}
                        strokeWidth="0.8"
                        opacity={d ? 0.4 : 0.15}
                        style={{ transition: "all 0.3s" }}
                      />
                      <circle
                        cx={cx}
                        cy={cy}
                        r={d ? 11 : 6}
                        fill="none"
                        stroke={escola.cor}
                        strokeWidth="1.3"
                        opacity={d ? 0.75 : 0.3}
                        style={{ transition: "all 0.3s" }}
                      />
                      <circle
                        cx={cx}
                        cy={cy}
                        r={d ? 5 : 3}
                        fill={escola.cor}
                        opacity={d ? 1 : 0.8}
                        style={{ transition: "all 0.3s" }}
                      />
                      {d && (
                        <g>
                          <rect
                            x={cx - 62}
                            y={cy - 36}
                            width={124}
                            height={23}
                            rx={9}
                            fill="rgba(5,7,3,0.95)"
                            stroke={escola.cor}
                            strokeWidth="0.6"
                          />
                          <text
                            x={cx}
                            y={cy - 20}
                            textAnchor="middle"
                            fill={escola.cor}
                            fontSize="8.5"
                            fontFamily="'Palatino Linotype', serif"
                            fontWeight="bold"
                            letterSpacing="0.6"
                            style={{ userSelect: "none" }}
                          >
                            {escola.nome}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
            </svg>
            <div
              style={{ ...s.mapaLabel, color: labelMapa?.cor || "transparent" }}
            >
              {labelMapa?.nome || "·"}
            </div>
          </motion.div>

          {/* Cards das escolas — stagger ao entrar na viewport */}
          <motion.div
            style={s.escolasGrid}
            initial="hidden"
            animate={escolasInView ? "visible" : "hidden"}
            variants={staggerCards}
          >
            {escolas.map((escola) => (
              <EscolaCard
                key={escola.id}
                escola={escola}
                hover={escolaHover === escola.id}
                ativa={escolaAtiva === escola.id}
                onEnter={() => setEscolaHover(escola.id)}
                onLeave={() => setEscolaHover(null)}
                onClick={() =>
                  setEscolaAtiva(escolaAtiva === escola.id ? null : escola.id)
                }
              />
            ))}
          </motion.div>
        </section>

        {/* ── CTA ── */}
        <motion.section
          ref={ctaRef}
          style={s.ctaSecao}
          initial="hidden"
          animate={ctaInView ? "visible" : "hidden"}
          variants={staggerContainer}
        >
          <motion.div
            style={s.divisorOrnamental}
            variants={fadeIn}
            transition={{ duration: 0.8 }}
          >
            <div style={s.divisorLinha} />
            <span style={s.divisorIcone}>⚔</span>
            <div style={s.divisorLinha} />
          </motion.div>

          <motion.p
            style={s.ctaTitulo}
            variants={fadeUp}
            transition={{ duration: 0.6 }}
          >
            O MUNDO DE SCRIP PRECISA DE HERÓIS.
          </motion.p>

          <motion.p
            style={s.ctaSub}
            variants={fadeUp}
            transition={{ duration: 0.6 }}
          >
            Escolha sua escola, desperte seu Dom, e junte-se à resistência.
            <br />A Queda é inevitável? O futuro está em suas mãos.
          </motion.p>

          <motion.div
            style={s.ctaBotoes}
            variants={fadeUp}
            transition={{ duration: 0.6 }}
          >
            <BotaoDourado onClick={onEntrar} tamanho="grande">
              CADASTRAR-SE AGORA
            </BotaoDourado>
            <button
              style={s.btnJaTemConta}
              onClick={onEntrar}
              onMouseOver={(e) => (e.currentTarget.style.color = "#c4a050")}
              onMouseOut={(e) => (e.currentTarget.style.color = "#52421e")}
            >
              já tenho uma conta →
            </button>
          </motion.div>

          <motion.p
            style={s.rodape}
            variants={fadeIn}
            transition={{ duration: 1, delay: 0.4 }}
          >
            A Ordem existe nas sombras. Você também deverá aprender a existir.
          </motion.p>
        </motion.section>
      </div>

      {/* ── MODAL ── */}
      {escolaAtiva && ativaData && (
        <ModalEscola escola={ativaData} onFechar={() => setEscolaAtiva(null)} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// CARD — motion com variante fadeUp individual
// ─────────────────────────────────────────────
function EscolaCard({ escola, hover, ativa, onEnter, onLeave, onClick }) {
  const d = hover || ativa;
  return (
    <motion.div
      variants={fadeUp}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{
        ...s.card,
        borderColor: d ? escola.cor : "rgba(196,160,80,0.12)",
        boxShadow: d
          ? `0 0 30px ${escola.corGlow}, inset 0 0 40px rgba(0,0,0,0.4)`
          : "0 4px 20px rgba(0,0,0,0.5)",
      }}
      whileHover={{ y: -7, transition: { duration: 0.25, ease: "easeOut" } }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      <div
        style={{
          ...s.cardTopo,
          background: `linear-gradient(135deg, #0a0d06 0%, ${escola.cor}20 100%)`,
          borderBottom: `1px solid ${d ? escola.cor + "44" : "rgba(196,160,80,0.06)"}`,
        }}
      >
        <span
          style={{
            fontSize: "2.2em",
            opacity: d ? 0.9 : 0.25,
            transition: "opacity 0.3s",
            filter: d ? `drop-shadow(0 0 8px ${escola.cor})` : "none",
          }}
        >
          {escola.icone}
        </span>
      </div>

      <div style={s.cardCorpo}>
        <span
          style={{
            ...s.cardSubtitulo,
            color: d ? escola.cor + "aa" : "#302510",
          }}
        >
          {escola.subtitulo}
        </span>
        <h3 style={{ ...s.cardNome, color: d ? escola.cor : "#b89040" }}>
          {escola.nome}
        </h3>
        <p style={s.cardResumo}>{escola.resumo}</p>
        <motion.span
          style={s.cardDica}
          animate={{ opacity: hover ? 1 : 0, y: hover ? 0 : 4 }}
          transition={{ duration: 0.2 }}
        >
          ler mais →
        </motion.span>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// MODAL — slide-up + fade
// ─────────────────────────────────────────────
function ModalEscola({ escola, onFechar }) {
  useEffect(() => {
    const fn = (e) => {
      if (e.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onFechar]);

  const ps = escola.lore.split("\n\n");

  return (
    <motion.div
      style={s.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onFechar}
    >
      <motion.div
        style={{
          ...s.modal,
          borderColor: escola.cor,
          boxShadow: `0 0 80px ${escola.corGlow}, 0 0 160px rgba(0,0,0,0.95)`,
        }}
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ ...s.modalHead, borderBottomColor: escola.cor + "28" }}>
          <div>
            <span
              style={{
                fontSize: "2em",
                color: escola.cor,
                display: "block",
                marginBottom: 8,
              }}
            >
              {escola.icone}
            </span>
            <p
              style={{
                margin: "0 0 3px",
                fontSize: "0.7em",
                color: escola.cor + "88",
                letterSpacing: "2px",
                textTransform: "uppercase",
              }}
            >
              {escola.subtitulo}
            </p>
            <h2
              style={{
                margin: 0,
                fontSize: "1.4em",
                fontWeight: 700,
                letterSpacing: "2px",
                color: escola.cor,
              }}
            >
              {escola.nome}
            </h2>
          </div>
          <button
            style={s.modalX}
            onClick={onFechar}
            onMouseOver={(e) => (e.currentTarget.style.color = "#fff")}
            onMouseOut={(e) => (e.currentTarget.style.color = "#444")}
          >
            ✕
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {ps.map((p, i) => {
            const ultimo = i === ps.length - 1;
            return (
              <p
                key={i}
                style={{
                  margin: 0,
                  lineHeight: 1.9,
                  fontSize: "0.88em",
                  color: ultimo ? escola.cor : "#c0982e",
                  fontStyle: ultimo ? "italic" : "normal",
                  borderLeft: ultimo ? `2px solid ${escola.cor}44` : "none",
                  paddingLeft: ultimo ? 16 : 0,
                }}
              >
                {p}
              </p>
            );
          })}
        </div>

        <div
          style={{
            height: 1,
            width: 50,
            background: escola.cor,
            opacity: 0.3,
            margin: "24px auto 8px",
          }}
        />
        <p
          style={{
            textAlign: "center",
            color: "#333",
            fontSize: "0.7em",
            margin: 0,
          }}
        >
          ESC ou clique fora para fechar
        </p>
      </motion.div>
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
    overflow: "clip",
    fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
    color: "#c4a050",
  },
  fundo: {
    position: "fixed",
    inset: 0,
    background: `
      radial-gradient(ellipse at 50% 0%, rgba(110,65,12,0.12) 0%, transparent 55%),
      radial-gradient(ellipse at 15% 60%, rgba(90,50,10,0.07) 0%, transparent 45%),
      radial-gradient(ellipse at 85% 40%, rgba(60,10,10,0.07) 0%, transparent 45%)
    `,
    pointerEvents: "none",
    zIndex: 0,
  },
  grain: {
    position: "fixed",
    inset: 0,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
    backgroundRepeat: "repeat",
    backgroundSize: "200px",
    pointerEvents: "none",
    zIndex: 1,
  },
  navbar: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 48px",
    background: "rgba(4,5,2,0.95)",
    borderBottom: "1px solid rgba(196,160,80,0.14)",
    backdropFilter: "blur(12px)",
  },
  navLogo: { display: "flex", alignItems: "center", gap: 12 },
  logoImg: { height: 44, width: "auto", display: "block" },
  logo: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    border: "1px solid rgba(196,160,80,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.2em",
    color: "#c4a050",
  },
  navTitulo: {
    fontSize: "0.88em",
    fontWeight: 700,
    letterSpacing: "2px",
    color: "#d4b87a",
  },
  navSub: {
    fontSize: "0.54em",
    letterSpacing: "3px",
    color: "#5a4415",
    marginTop: 2,
  },
  btnEntrar: {
    padding: "9px 22px",
    background: "#4CAF50",
    color: "#000",
    border: "none",
    borderRadius: 4,
    fontWeight: 900,
    fontSize: "0.78em",
    letterSpacing: "1.5px",
    cursor: "pointer",
    transition: "background 0.2s",
    fontFamily: "inherit",
  },
  pagina: {
    position: "relative",
    zIndex: 2,
    maxWidth: 860,
    margin: "0 auto",
    padding: "24px 24px 100px",
    display: "flex",
    flexDirection: "column",
    gap: 72,
  },
  hero: {
    textAlign: "left",
  },
  heroBotao: {
    marginTop: 28,
    pointerEvents: "auto",
    padding: "11px 22px",
    background: "rgba(6,9,12,0.45)",
    border: "1px solid rgba(196,160,80,0.45)",
    borderRadius: 3,
    color: "#e8d08a",
    letterSpacing: "3px",
    fontSize: "0.68em",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  heroEyebrow: {
    margin: "0 0 12px",
    fontSize: "0.6em",
    letterSpacing: "5px",
    color: "#8a7040",
    textTransform: "uppercase",
  },
  heroTitulo: {
    margin: "0 0 10px",
    fontSize: "clamp(2.2em, 6vw, 3.6em)",
    fontWeight: 700,
    color: "#e8d08a",
    lineHeight: 1.1,
    textShadow: "0 0 60px rgba(196,160,80,0.2)",
    letterSpacing: "4px",
  },
  heroSub: {
    margin: 0,
    fontSize: "1em",
    color: "#a08850",
    letterSpacing: "2px",
  },
  secao: { display: "flex", flexDirection: "column", gap: 28 },
  secaoHeader: { display: "flex", alignItems: "center", gap: 16 },
  secaoTitulo: {
    margin: 0,
    fontSize: "0.62em",
    fontWeight: 700,
    letterSpacing: "4px",
    color: "#52421e",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  secaoLinha: {
    flex: 1,
    height: 1,
    background: "linear-gradient(to right, rgba(196,160,80,0.18), transparent)",
  },
  historiaTexto: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
    maxWidth: 680,
    margin: "0 auto",
    width: "100%",
  },
  paragrafo: { margin: 0, lineHeight: 1.95 },
  divisorOrnamental: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    margin: "4px 0",
  },
  divisorLinha: {
    flex: 1,
    height: 1,
    background: "linear-gradient(to right, transparent, rgba(196,160,80,0.18))",
  },
  divisorIcone: { fontSize: "0.7em", color: "rgba(196,160,80,0.25)" },
  escolasIntro: {
    margin: "0 auto",
    textAlign: "center",
    fontSize: "0.86em",
    color: "#6b5530",
    lineHeight: 1.7,
    maxWidth: 480,
  },
  mapaWrap: {
    borderRadius: 8,
    overflow: "hidden",
    border: "1px solid rgba(196,160,80,0.12)",
    background: "#05070d",
    boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
  },
  mapaSvg: { width: "100%", display: "block" },
  mapaLabel: {
    textAlign: "center",
    fontSize: "0.68em",
    fontWeight: 700,
    letterSpacing: "2px",
    textTransform: "uppercase",
    padding: "6px 0 7px",
    height: 28,
    transition: "color 0.25s",
    background: "rgba(4,6,2,0.8)",
  },
  escolasGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 14,
  },
  card: {
    borderRadius: 8,
    border: "1px solid",
    overflow: "hidden",
    cursor: "pointer",
    background: "rgba(5,6,3,0.9)",
    display: "flex",
    flexDirection: "column",
  },
  cardTopo: {
    height: 120,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.4s",
  },
  cardCorpo: {
    padding: "14px 12px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 5,
    flex: 1,
  },
  cardSubtitulo: {
    fontSize: "0.55em",
    fontWeight: 700,
    letterSpacing: "2px",
    textTransform: "uppercase",
    transition: "color 0.3s",
  },
  cardNome: {
    margin: 0,
    fontSize: "0.8em",
    fontWeight: 700,
    letterSpacing: "0.5px",
    lineHeight: 1.3,
    transition: "color 0.3s",
  },
  cardResumo: {
    margin: 0,
    fontSize: "0.64em",
    color: "#4a3a1a",
    lineHeight: 1.6,
    flex: 1,
  },
  cardDica: {
    fontSize: "0.58em",
    color: "#c4a050",
    letterSpacing: "1px",
    marginTop: 4,
  },
  ctaSecao: {
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 14,
  },
  ctaTitulo: {
    margin: 0,
    fontSize: "1.1em",
    fontWeight: 700,
    letterSpacing: "2px",
    color: "#e8d08a",
    textShadow: "0 0 30px rgba(196,160,80,0.2)",
  },
  ctaSub: {
    margin: 0,
    fontSize: "0.82em",
    color: "#5a4820",
    lineHeight: 1.8,
    maxWidth: 420,
  },
  ctaBotoes: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  btnCadastro: {
    padding: "12px 36px",
    background: "transparent",
    border: "1px solid rgba(196,160,80,0.45)",
    color: "#c4a050",
    fontFamily: "inherit",
    fontSize: "0.85em",
    fontWeight: 700,
    letterSpacing: "2px",
    cursor: "pointer",
    transition: "all 0.25s",
    borderRadius: 3,
  },
  btnJaTemConta: {
    background: "none",
    border: "none",
    color: "#52421e",
    fontFamily: "inherit",
    fontSize: "0.75em",
    letterSpacing: "1px",
    cursor: "pointer",
    transition: "color 0.2s",
  },
  rodape: {
    margin: "12px 0 0",
    fontSize: "0.65em",
    color: "#2a2010",
    letterSpacing: "1px",
    fontStyle: "italic",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.9)",
    backdropFilter: "blur(8px)",
    zIndex: 200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    background: "rgba(8,10,5,0.98)",
    border: "1px solid",
    borderRadius: 8,
    padding: 36,
    maxWidth: 540,
    width: "100%",
    maxHeight: "80vh",
    overflowY: "auto",
  },
  modalHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 18,
    borderBottom: "1px solid",
    marginBottom: 22,
  },
  modalX: {
    background: "none",
    border: "none",
    color: "#444",
    fontSize: "1.15em",
    cursor: "pointer",
    padding: "4px 8px",
    transition: "color 0.2s",
    fontFamily: "inherit",
    flexShrink: 0,
  },
};
