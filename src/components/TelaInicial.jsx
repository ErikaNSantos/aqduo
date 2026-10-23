import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import MundoOrdem from "./MundoOrdem";
import urlEmblema from "../assets/emblema.png";

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

// A história em capítulos para a abertura em 3D: cada um aparece num trecho do scroll
const [ANTES_DO_BIG_BANG, BIG_BANG] = HISTORIA[0].split(/(?=Então\.\.\.)/);
const [METEORO, IMPACTO] = HISTORIA[1].split(/(?=Quando colidiu)/);
const CAPITULOS = [ANTES_DO_BIG_BANG, BIG_BANG, METEORO, IMPACTO, ...HISTORIA.slice(2)].map((t) => t.trim());

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
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export default function TelaInicial({ onEntrar }) {
  const [escolaAtiva, setEscolaAtiva] = useState(null);
  const escolas = ESCOLAS_PADRAO;
  const ativaData = escolas.find((e) => e.id === escolaAtiva);

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

      {/* ── ABERTURA — a história contada pelo scroll, em 3D ── */}
      <MundoOrdem escolas={escolas} historia={CAPITULOS} onEscola={setEscolaAtiva} onEntrar={onEntrar} />

      {/* ── MODAL ── */}
      {escolaAtiva && ativaData && (
        <ModalEscola escola={ativaData} onFechar={() => setEscolaAtiva(null)} />
      )}
    </div>
  );
}

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
