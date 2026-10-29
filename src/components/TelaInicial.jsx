import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import MundoOrdem from "./MundoOrdem";
import urlEmblema from "../assets/emblema.png";
import urlArtePrimordiais from "../assets/linhagens/primordiais-janela.webp";
import urlArteColossos from "../assets/linhagens/colossos-janela.webp";
import urlArteFeras from "../assets/linhagens/feras-janela.webp";
import urlArteEtereos from "../assets/linhagens/etereos-janela.webp";
import urlPortalPrimordiais from "../assets/linhagens/primordiais-portal.webp";
import urlPortalColossos from "../assets/linhagens/colossos-portal.webp";
import urlPortalFeras from "../assets/linhagens/feras-portal.webp";
import urlPortalEtereos from "../assets/linhagens/etereos-portal.webp";

// ─────────────────────────────────────────────
// BOTÃO DOURADO COM BORDA PULSANTE
// ─────────────────────────────────────────────
function BotaoDourado({ children, onClick, tamanho = "normal", className }) {
  const grande = tamanho === "grande";

  return (
    <motion.button
      onClick={onClick}
      className={className}
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
// A história contada pela Scripeds a quem acabou de despertar. Cada capítulo
// aparece num trecho do scroll da abertura em 3D (0 = o nada ... 7 = a lei).
const CAPITULOS = [
  `Se você chegou até aqui, provavelmente teve uma semana estranha. Coisas que quebraram sem você tocar, um calor nas mãos que não passava, um sonho que parecia lembrança. Calma. Não é loucura. Mas, para entender, a gente precisa voltar um pouco. Bem antes de você. Bem antes de tudo.`,
  `Até que o nada explodiu em luz, cortando o silêncio e fazendo o universo nascer. Cru, quente, ainda sem forma nenhuma. Mas já com força para tudo o que viria depois.`,
  `Bilhões de anos depois, um pedaço do que originou tudo ainda vagava pelo céu. Uma pedra que guardava o calor do primeiro dia e que, por coincidência ou não, caiu num planeta já habitado por eras de evolução.`,
  `A rocha esfriou depois do impacto, a terra se assentando ao seu redor. Por muito tempo, nada se mexeu. Mas a terra guardou. O azul desceu pelas rachaduras, dormiu nas pedras, subiu devagar pelas raízes.`,
  `Hoje chamamos esse azul de Metrito. Muito tempo depois, uma mãe Norcan pegou o filho no colo pela primeira vez e não entendeu por que os olhos dele brilhavam no escuro.`,
  `No começo, essas crianças eram bênção. A vizinha que fazia a planta crescer era chamada para benzer a roça. Mas bastou uma colheita ruim, uma doença sem explicação, e a bênção virou culpa. Os Norcans acenderam as tochas. Elas ficaram acesas por séculos.`,
  `Quem sobreviveu aprendeu a se esconder bem. A cauda debaixo do casaco, os olhos atrás das lentes, o fogo guardado no bolso. E aprendeu, principalmente, a não ficar sozinho. Foi assim que nasceu A Ordem.`,
  `A Ordem tem muitas regras, e você vai conhecer todas. Mas só uma não pode ser quebrada: nunca conte a um Norcan o que você é. A menos que queira descobrir onde estão todos que descumpriram essa regra.`,
];

// Fecho da abertura, logo acima do botão de entrar
const FECHO = `Nada disso responde todas as suas dúvidas. Tudo bem, ninguém chega sabendo tudo. Respira, ajeita a mochila e entra. Te explicamos tudo pelo caminho...`;

// Passagem entre a história e as luzes da cratera
const PASSAGEM = `E essa energia não se apresentou igual em ninguém. Em uns, mal dá pra notar. Em outros, não tem casaco que esconda. Com o tempo, a gente aprendeu a reconhecer quatro jeitos de ela aparecer.`;

// Os quatro grupos de linhagens, agrupadas pela forma como o Metrito apareceu no corpo.
// Não são escolas: todo Scrip estuda junto na Scripeds. Na dúvida, vale o traço mais visível.
// `arte` aparece grande na janela das linhagens; `artePortal` é uma versão mais simples e clara
// para o portal, que é pequeno (sem ela, o portal usa `arte`).
const GRUPOS_LINHAGENS = [
  {
    id: "primordiais",
    nome: "Primordiais",
    subtitulo: "Por fora, parece gente",
    arte: urlArtePrimordiais,
    artePortal: urlPortalPrimordiais,
    cor: "#d9b45a",
    corGlow: "rgba(217,180,90,0.5)",
    icone: "◯",
    resumo:
      "A orelha um pouco mais pontuda, a mão que nunca sente frio, o olhar que demora demais. Quase nada. E é esse quase que eles passam a vida escondendo.",
    lore: `São os que passariam despercebidos numa fila de banco. A orelha um pouco mais pontuda, a mão que nunca sente frio, o olhar que demora demais. Quase nada. E é esse quase que eles passam a vida escondendo.

Na Scripeds hoje: Humanos e Elfos.

Outras linhagens que A Ordem conhece: Anões, Hobbits, Ninfas, Semideuses.

"Ninguém repara. Até reparar."`,
  },
  {
    id: "colossos",
    nome: "Colossos",
    subtitulo: "O corpo passou da medida",
    arte: urlArteColossos,
    artePortal: urlPortalColossos,
    cor: "#7d6bb0",
    corGlow: "rgba(125,107,176,0.5)",
    icone: "⬢",
    resumo:
      "Ombros que não passam pela porta, passos que fazem o chão reclamar, pele que lembra pedra. Os que mais sofrem para se esconder e os primeiros a ficar na frente.",
    lore: `O Metrito pesou neles. Ombros que não passam pela porta, passos que fazem o chão reclamar, pele que lembra pedra.

São os que mais sofrem para se esconder entre os Norcans. E os primeiros a ficar na frente quando alguém precisa ser protegido.

Na Scripeds em breve: Gigantes.

Outras linhagens que A Ordem conhece: Ogros, Trolls, Ciclopes, Titãs, Golens.

"Não somos os maiores. Somos os que ficaram."`,
  },
  {
    id: "feras",
    nome: "Feras",
    subtitulo: "O corpo puxou para o animal",
    arte: urlArteFeras,
    artePortal: urlPortalFeras,
    cor: "#4f9a4a",
    corGlow: "rgba(79,154,74,0.5)",
    icone: "✶",
    resumo:
      "Pelo, escama, garra, um faro que sente a chuva antes dela cair. Os Norcans contaram histórias sobre eles por séculos. Erraram quase tudo.",
    lore: `Neles, a energia lembrou de tudo o que já rastejou, nadou e voou. Pelo, escama, garra, um faro que sente a chuva antes dela cair.

Os Norcans contaram histórias sobre eles por séculos. Erraram quase tudo.

Na Scripeds hoje: Bestiais.

Outras linhagens que A Ordem conhece: Lobisomens, Sereias, Centauros, Minotauros, Harpias, Draconianos.

"O instinto chegou antes do nome."`,
  },
  {
    id: "etereos",
    nome: "Etéreos",
    subtitulo: "Marcas de outro plano",
    arte: urlArteEtereos,
    artePortal: urlPortalEtereos,
    cor: "#2f8fc4",
    corGlow: "rgba(47,143,196,0.5)",
    icone: "✦",
    resumo:
      "Asas que não deveriam caber nas costas, chifres, presas, uma luz que não vem de lugar nenhum. Os Norcans chamaram uns de anjos e outros de demônios. Nenhum dos dois nomes estava certo.",
    lore: `Asas que não deveriam caber nas costas, chifres, presas, uma luz que não vem de lugar nenhum.

Os Norcans chamaram uns de anjos e outros de demônios. Nenhum dos dois nomes estava certo.

Na Scripeds hoje: Angelicais e Demons. Em breve: Vampiros.

Outras linhagens que A Ordem conhece: Espectros, Djinns.

"Não viemos de cima nem de baixo. Viemos daqui."`,
  },
];

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export default function TelaInicial({ onEntrar }) {
  const [escolaAtiva, setEscolaAtiva] = useState(null);
  const escolas = GRUPOS_LINHAGENS;
  const ativaData = escolas.find((e) => e.id === escolaAtiva);

  return (
    <div style={s.root}>
      <div style={s.fundo} />
      <div style={s.grain} />

      {/* ── NAVBAR — fade simples ao montar ── */}
      <motion.nav
        className="nav-ordem"
        style={s.navbar}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div style={s.navLogo}>
          <img src={urlEmblema} alt="" className="nav-logo" style={s.logoImg} />
          <div>
            <div className="nav-titulo" style={s.navTitulo}>A QUEDA DE UMA ORDEM</div>
            <div className="nav-sub" style={s.navSub}>O DESPERTAR DOS SCRIPS</div>
          </div>
        </div>
        <BotaoDourado onClick={onEntrar} className="nav-botao">ENTRAR NA ORDEM</BotaoDourado>
      </motion.nav>

      {/* ── ABERTURA — a história contada pelo scroll, em 3D ── */}
      <MundoOrdem escolas={escolas} historia={CAPITULOS} passagem={PASSAGEM} fecho={FECHO} onEscola={setEscolaAtiva} onEntrar={onEntrar} />

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
        {escola.arte && (
          <img
            src={escola.arte}
            alt=""
            style={{
              display: "block",
              width: "100%",
              maxWidth: 380,
              margin: "0 auto 22px",
              borderRadius: "50%",
              background: `radial-gradient(circle, ${escola.corGlow} 0%, transparent 70%)`,
            }}
          />
        )}
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
            onMouseOut={(e) => (e.currentTarget.style.color = "#7d8a92")}
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
            color: "#7d8a92",
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
    background: "#0a0f14",
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
    color: "#9aa7ae",
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
    color: "#d4b87a",
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
    color: "#b8ae96",
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
    color: "#7d8a92",
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
    color: "#9aa7ae",
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
    color: "#d4b87a",
    fontFamily: "inherit",
    fontSize: "0.75em",
    letterSpacing: "1px",
    cursor: "pointer",
    transition: "color 0.2s",
  },
  rodape: {
    margin: "12px 0 0",
    fontSize: "0.65em",
    color: "#7d8a92",
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
    background: "rgba(10,14,18,0.98)",
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
    color: "#7d8a92",
    fontSize: "1.15em",
    cursor: "pointer",
    padding: "4px 8px",
    transition: "color 0.2s",
    fontFamily: "inherit",
    flexShrink: 0,
  },
};
