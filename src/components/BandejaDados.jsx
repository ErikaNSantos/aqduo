import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";

// ─────────────────────────────────────────────
// DADOS DISPONÍVEIS
// ─────────────────────────────────────────────
const DADOS = [
  { tipo: "d2", lados: 2, cor: "#cfffdc" },
  { tipo: "d4", lados: 4, cor: "#4a8c5c" },
  { tipo: "d6", lados: 6, cor: "#c4a050" },
  { tipo: "d8", lados: 8, cor: "#b8ae96" },
  { tipo: "d10", lados: 10, cor: "#8b2020" },
  { tipo: "d12", lados: 12, cor: "#6b2fa0" },
  { tipo: "d20", lados: 20, cor: "#1a6b8a" },
  { tipo: "d100", lados: 100, cor: "#c47a2b" },
];

// ─────────────────────────────────────────────
// ROLAR UM DADO
// ─────────────────────────────────────────────
function rolarDado(lados) {
  return Math.floor(Math.random() * lados) + 1;
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export default function BandejaDados({ fichaId }) {
  const [aberta, setAberta] = useState(false);
  const [bandeja, setBandeja] = useState([]); // [{tipo, lados, cor}, ...]
  const [resultados, setResultados] = useState(null); // {dados: [{tipo, lados, valor}], total}
  const [animando, setAnimando] = useState(false);
  const [historico, setHistorico] = useState([]);
  const timeoutRef = useRef(null);

  // Limpa timeout ao desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Adicionar dado à bandeja
  function adicionarDado(dado) {
    if (animando) return;
    setResultados(null);
    setBandeja((prev) => [...prev, { ...dado }]);
  }

  // Remover último dado do tipo
  function removerDado(tipo) {
    if (animando) return;
    setResultados(null);
    setBandeja((prev) => {
      const idx = prev.findLastIndex((d) => d.tipo === tipo);
      if (idx === -1) return prev;
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
  }

  // Limpar bandeja
  function limpar() {
    if (animando) return;
    setBandeja([]);
    setResultados(null);
  }

  // Contar dados por tipo
  function contagem() {
    const map = {};
    bandeja.forEach((d) => {
      map[d.tipo] = (map[d.tipo] || 0) + 1;
    });
    return map;
  }

  // Texto da bandeja (ex: "3d6 + 1d8")
  function textoBandeja() {
    const c = contagem();
    return Object.entries(c)
      .map(([tipo, qtd]) => `${qtd}${tipo}`)
      .join(" + ");
  }

  // ROLAR
  async function rolar() {
    if (bandeja.length === 0 || animando) return;
    setAnimando(true);
    setResultados(null);

    // Animação: mostrar números aleatórios rapidamente
    const dadosFinais = bandeja.map((d) => ({
      tipo: d.tipo,
      lados: d.lados,
      cor: d.cor,
      valor: rolarDado(d.lados),
    }));

    // Delay pra animação
    await new Promise((r) => setTimeout(r, 600));

    const total = dadosFinais.reduce((acc, d) => acc + d.valor, 0);
    const resultado = { dados: dadosFinais, total, formula: textoBandeja() };

    setResultados(resultado);
    setAnimando(false);

    // Adicionar ao histórico local
    setHistorico((prev) => [resultado, ...prev].slice(0, 10));

    // Salvar no banco se tiver ficha selecionada
    if (fichaId) {
      try {
        await supabase.from("logs_rolagens").insert({
          ficha_id: fichaId,
          acao: resultado.formula,
          resultado_dado: total,
          foi_sucesso: true, // rolagem livre, sem teste contra NH
          origem: "site",
          comando_bruto: resultado.formula,
          plataforma_metadata: {
            dados: dadosFinais.map((d) => ({ tipo: d.tipo, valor: d.valor })),
          },
        });
      } catch (err) {
        console.error("Erro ao salvar rolagem:", err);
      }
    }
  }

  const c = contagem();

  return (
    <>
      {/* ═══ BOTÃO FLUTUANTE ═══ */}
      <motion.button
        onClick={() => setAberta(!aberta)}
        style={s.fab}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        animate={{
          boxShadow: aberta
            ? "0 0 0 rgba(196,160,80,0)"
            : [
                "0 4px 20px rgba(196,160,80,0.15)",
                "0 4px 30px rgba(196,160,80,0.25)",
                "0 4px 20px rgba(196,160,80,0.15)",
              ],
        }}
        transition={
          aberta
            ? { duration: 0.2 }
            : { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
        }
      >
        <span style={s.fabIcone}>{aberta ? "✕" : "⚄"}</span>
      </motion.button>

      {/* ═══ OVERLAY ═══ */}
      <AnimatePresence>
        {aberta && (
          <motion.div
            style={s.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAberta(false)}
          />
        )}
      </AnimatePresence>

      {/* ═══ BANDEJA (BOTTOM SHEET) ═══ */}
      <AnimatePresence>
        {aberta && (
          <motion.div
            style={s.sheet}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
          >
            {/* HANDLE */}
            <div style={s.handle}>
              <div style={s.handleBar} />
            </div>

            {/* TÍTULO */}
            <div style={s.sheetHeader}>
              <h3 style={s.sheetTitulo}>ROLAR DADOS</h3>
              <span style={s.sheetSub}>
                Toque nos dados para montar sua rolagem
              </span>
            </div>

            {/* GRADE DE DADOS */}
            <div style={s.dadosGrid}>
              {DADOS.map((dado) => {
                const qtd = c[dado.tipo] || 0;
                return (
                  <div key={dado.tipo} style={s.dadoWrap}>
                    <motion.button
                      style={{
                        ...s.dadoBtn,
                        borderColor:
                          qtd > 0 ? dado.cor : "rgba(196,160,80,0.15)",
                        background:
                          qtd > 0 ? `${dado.cor}15` : "rgba(12,17,22,0.6)",
                      }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => adicionarDado(dado)}
                    >
                      <span
                        style={{
                          ...s.dadoLabel,
                          color: qtd > 0 ? dado.cor : "#7d8a92",
                        }}
                      >
                        {dado.tipo.toUpperCase()}
                      </span>
                      {qtd > 0 && (
                        <span style={{ ...s.dadoBadge, background: dado.cor }}>
                          {qtd}
                        </span>
                      )}
                    </motion.button>
                    {qtd > 0 && (
                      <button
                        style={s.dadoRemover}
                        onClick={() => removerDado(dado.tipo)}
                      >
                        −
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* BANDEJA ATUAL */}
            {bandeja.length > 0 && (
              <div style={s.bandejaRow}>
                <span style={s.bandejaTexto}>{textoBandeja()}</span>
                <button style={s.bandejaLimpar} onClick={limpar}>
                  Limpar
                </button>
              </div>
            )}

            {/* BOTÃO ROLAR */}
            <motion.button
              style={{
                ...s.btnRolar,
                opacity: bandeja.length > 0 && !animando ? 1 : 0.3,
                cursor:
                  bandeja.length > 0 && !animando ? "pointer" : "not-allowed",
              }}
              whileTap={bandeja.length > 0 ? { scale: 0.96 } : {}}
              onClick={rolar}
              disabled={bandeja.length === 0 || animando}
            >
              {animando ? "ROLANDO..." : "ROLAR ⚄"}
            </motion.button>

            {/* RESULTADO */}
            <AnimatePresence>
              {resultados && (
                <motion.div
                  style={s.resultadoWrap}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", damping: 20 }}
                >
                  {/* DADOS INDIVIDUAIS */}
                  <div style={s.resultadoDados}>
                    {resultados.dados.map((d, i) => (
                      <motion.div
                        key={i}
                        style={{
                          ...s.resultadoDado,
                          borderColor: d.cor,
                          color: d.cor,
                        }}
                        initial={{ opacity: 0, y: -10, rotateZ: -15 }}
                        animate={{ opacity: 1, y: 0, rotateZ: 0 }}
                        transition={{ delay: i * 0.08 }}
                      >
                        <span style={s.resultadoDadoValor}>{d.valor}</span>
                        <span style={s.resultadoDadoTipo}>{d.tipo}</span>
                      </motion.div>
                    ))}
                  </div>

                  {/* TOTAL */}
                  <div style={s.resultadoTotal}>
                    <span style={s.resultadoTotalLabel}>TOTAL</span>
                    <motion.span
                      style={s.resultadoTotalValor}
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 10, delay: 0.2 }}
                    >
                      {resultados.total}
                    </motion.span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* HISTÓRICO */}
            {historico.length > 0 && (
              <div style={s.historicoWrap}>
                <span style={s.historicoTitulo}>ÚLTIMAS ROLAGENS</span>
                <div style={s.historicoList}>
                  {historico.map((h, i) => (
                    <div key={i} style={s.historicoItem}>
                      <span style={s.historicoFormula}>{h.formula}</span>
                      <span style={s.historicoResultado}>{h.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────
const s = {
  // FAB
  fab: {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: 900,
    width: "52px",
    height: "52px",
    borderRadius: "50%",
    background:
      "linear-gradient(135deg, #1a1200 0%, #2a1e00 50%, #1a1200 100%)",
    border: "1px solid rgba(196,160,80,0.4)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  },
  fabIcone: {
    fontSize: "1.4em",
    color: "#c4a050",
    lineHeight: 1,
  },

  // OVERLAY
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    zIndex: 950,
  },

  // SHEET
  sheet: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    maxHeight: "75vh",
    overflowY: "auto",
    background: "linear-gradient(180deg, #0e0c08 0%, #0a0906 100%)",
    borderTop: "1px solid rgba(196,160,80,0.2)",
    borderRadius: "16px 16px 0 0",
    padding: "0 20px 30px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    scrollbarWidth: "thin",
    scrollbarColor: "rgba(196,160,80,0.15) transparent",
  },

  // HANDLE
  handle: {
    display: "flex",
    justifyContent: "center",
    padding: "10px 0 4px",
  },
  handleBar: {
    width: "36px",
    height: "4px",
    borderRadius: "2px",
    background: "rgba(196,160,80,0.2)",
  },

  // HEADER
  sheetHeader: {
    textAlign: "center",
  },
  sheetTitulo: {
    margin: 0,
    fontSize: "0.74em",
    fontWeight: 700,
    letterSpacing: "3px",
    color: "#9aa7ae",
    textTransform: "uppercase",
    fontFamily: "'Palatino Linotype', serif",
  },
  sheetSub: {
    fontSize: "0.74em",
    color: "#7d8a92",
    letterSpacing: "0.5px",
    fontFamily: "'Palatino Linotype', serif",
  },

  // DADOS GRID
  dadosGrid: {
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  dadoWrap: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
  },
  dadoBtn: {
    width: "56px",
    height: "56px",
    borderRadius: "8px",
    border: "1px solid",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "2px",
    position: "relative",
    fontFamily: "'Palatino Linotype', serif",
    transition: "all 0.15s",
    padding: 0,
  },
  dadoLabel: {
    fontSize: "0.72em",
    fontWeight: 700,
    letterSpacing: "0.5px",
  },
  dadoBadge: {
    position: "absolute",
    top: "-6px",
    right: "-6px",
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.68em",
    fontWeight: 900,
    color: "#000",
  },
  dadoRemover: {
    background: "transparent",
    border: "none",
    color: "#d07060",
    cursor: "pointer",
    fontSize: "0.8em",
    fontWeight: 700,
    padding: "0 4px",
    fontFamily: "'Palatino Linotype', serif",
  },

  // BANDEJA
  bandejaRow: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "12px",
  },
  bandejaTexto: {
    fontSize: "0.85em",
    fontWeight: 700,
    color: "#c4a050",
    letterSpacing: "1px",
    fontFamily: "'EB Garamond', 'Palatino Linotype', serif",
  },
  bandejaLimpar: {
    background: "transparent",
    border: "1px solid rgba(139,50,50,0.2)",
    color: "#d07060",
    cursor: "pointer",
    fontSize: "0.68em",
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: "3px",
    letterSpacing: "1px",
    fontFamily: "'Palatino Linotype', serif",
    transition: "all 0.2s",
  },

  // BOTÃO ROLAR
  btnRolar: {
    width: "100%",
    padding: "14px",
    background:
      "linear-gradient(135deg, #1a1200 0%, #2a1e00 50%, #1a1200 100%)",
    border: "1px solid rgba(196,160,80,0.35)",
    borderRadius: "6px",
    color: "#e8c96a",
    fontFamily: "'EB Garamond', 'Palatino Linotype', serif",
    fontSize: "0.85em",
    fontWeight: 700,
    letterSpacing: "2.5px",
    textTransform: "uppercase",
    cursor: "pointer",
    transition: "all 0.2s",
  },

  // RESULTADO
  resultadoWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    padding: "16px",
    background: "rgba(196,160,80,0.04)",
    border: "1px solid rgba(196,160,80,0.12)",
    borderRadius: "8px",
  },
  resultadoDados: {
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  resultadoDado: {
    width: "44px",
    height: "52px",
    borderRadius: "6px",
    border: "1.5px solid",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "1px",
    background: "rgba(0,0,0,0.3)",
  },
  resultadoDadoValor: {
    fontSize: "1.2em",
    fontWeight: 700,
    fontFamily: "'EB Garamond', serif",
    lineHeight: 1,
  },
  resultadoDadoTipo: {
    fontSize: "0.68em",
    fontWeight: 700,
    letterSpacing: "0.5px",
    opacity: 0.6,
  },
  resultadoTotal: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
  },
  resultadoTotalLabel: {
    fontSize: "0.68em",
    fontWeight: 700,
    letterSpacing: "2px",
    color: "#9aa7ae",
  },
  resultadoTotalValor: {
    fontSize: "2.2em",
    fontWeight: 700,
    color: "#e8d08a",
    fontFamily: "'EB Garamond', serif",
    lineHeight: 1,
  },

  // HISTÓRICO
  historicoWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    borderTop: "1px solid rgba(196,160,80,0.08)",
    paddingTop: "12px",
  },
  historicoTitulo: {
    fontSize: "0.68em",
    fontWeight: 700,
    letterSpacing: "2px",
    color: "#7d8a92",
    fontFamily: "'Palatino Linotype', serif",
  },
  historicoList: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  historicoItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "4px 8px",
    borderRadius: "3px",
    background: "rgba(196,160,80,0.03)",
  },
  historicoFormula: {
    fontSize: "0.74em",
    color: "#9aa7ae",
    fontFamily: "'Palatino Linotype', serif",
  },
  historicoResultado: {
    fontSize: "0.75em",
    fontWeight: 700,
    color: "#c4a050",
    fontFamily: "'EB Garamond', serif",
  },
};
