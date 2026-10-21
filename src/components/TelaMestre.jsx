import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────
// TIPOS DE EVENTO (cores do feed)
// ─────────────────────────────────────────────
const TIPOS_EVENTO = [
  { valor: "POLÍTICA", cor: "#8b6020" },
  { valor: "RESISTÊNCIA", cor: "#6b2fa0" },
  { valor: "RELÍQUIA", cor: "#1a6b8a" },
  { valor: "RECRUTAMENTO", cor: "#2a7040" },
  { valor: "ALERTA", cor: "#8b2020" },
  { valor: "RUMOR", cor: "#5a4820" },
];

const TIPO_COR = {};
TIPOS_EVENTO.forEach((t) => (TIPO_COR[t.valor] = t.cor));

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export default function TelaMestre({ session, nomeLinhagem }) {
  const [todasFichas, setTodasFichas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Editor de notícias
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novoTipo, setNovoTipo] = useState("ALERTA");
  const [publicando, setPublicando] = useState(false);
  const [eventosAtivos, setEventosAtivos] = useState([]);

  // Carrega todas as fichas de todos os jogadores
  useEffect(() => {
    carregarTudo();
  }, []);

  async function carregarTudo() {
    setCarregando(true);

    // Fichas de todos os jogadores (mestre tem policy especial ou RLS permite)
    const { data: fichasData } = await supabase
      .from("fichas")
      .select("*")
      .eq("status", "completa")
      .order("nome_personagem", { ascending: true });

    // Eventos ativos
    const { data: eventosData } = await supabase
      .from("eventos_feed")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (fichasData) setTodasFichas(fichasData);
    if (eventosData) setEventosAtivos(eventosData);
    setCarregando(false);
  }

  // Quick-edit: alterar valor numérico de uma ficha
  async function quickEdit(fichaId, coluna, delta) {
    const ficha = todasFichas.find((f) => f.id === fichaId);
    if (!ficha) return;
    const valorAtual = ficha[coluna] ?? 0;
    const novoValor = Math.max(0, valorAtual + delta);

    const updateObj = { [coluna]: novoValor };
    let msgFeedback = `${coluna.replace("_", " ")} atualizado`;

    // Auto-level via XP: sobe nível, zera XP, dá +4 PH
    if (coluna === "xp") {
      const nivelAtual = ficha.nivel ?? 1;
      const xpParaSubir = nivelAtual * 200;
      if (novoValor >= xpParaSubir) {
        updateObj.nivel = nivelAtual + 1;
        updateObj.xp = novoValor - xpParaSubir;
        updateObj.pontos_habilidade_ph = (ficha.pontos_habilidade_ph ?? 0) + 4;
        msgFeedback = `LEVEL UP! Nível ${updateObj.nivel} (+4 PH)`;
      }
    }

    // Ajuste manual de nível NÃO dá PH (é override do mestre)
    if (coluna === "nivel" && delta < 0) {
      updateObj.nivel = Math.max(1, novoValor);
    }

    setTodasFichas((prev) =>
      prev.map((f) => (f.id === fichaId ? { ...f, ...updateObj } : f)),
    );

    const { error } = await supabase
      .from("fichas")
      .update(updateObj)
      .eq("id", fichaId);

    if (error) {
      setTodasFichas((prev) =>
        prev.map((f) =>
          f.id === fichaId ? { ...f, [coluna]: valorAtual } : f,
        ),
      );
      mostrarFeedback("Erro: " + error.message, true);
    } else {
      mostrarFeedback(msgFeedback);
    }
  }

  // Publicar evento
  async function publicarEvento() {
    if (!novoTitulo.trim()) return;
    setPublicando(true);

    const { data, error } = await supabase
      .from("eventos_feed")
      .insert({
        tipo: novoTipo,
        titulo: novoTitulo.trim(),
        descricao: novaDescricao.trim() || null,
        ativo: true,
      })
      .select()
      .single();

    if (error) {
      mostrarFeedback("Erro ao publicar: " + error.message, true);
    } else {
      mostrarFeedback("Evento publicado!");
      setNovoTitulo("");
      setNovaDescricao("");
      setNovoTipo("ALERTA");
      if (data) setEventosAtivos((prev) => [data, ...prev]);
    }
    setPublicando(false);
  }

  // Desativar evento
  async function toggleEvento(id, ativo) {
    const { error } = await supabase
      .from("eventos_feed")
      .update({ ativo: !ativo })
      .eq("id", id);

    if (!error) {
      setEventosAtivos((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ativo: !ativo } : e)),
      );
    }
  }

  // Deletar evento
  async function deletarEvento(id) {
    if (!window.confirm("Deletar este evento permanentemente?")) return;
    const { error } = await supabase.from("eventos_feed").delete().eq("id", id);

    if (!error) {
      setEventosAtivos((prev) => prev.filter((e) => e.id !== id));
      mostrarFeedback("Evento removido");
    }
  }

  function mostrarFeedback(msg, erro = false) {
    setFeedbackMsg({ msg, erro });
    setTimeout(() => setFeedbackMsg(null), 2500);
  }

  if (carregando) {
    return (
      <div style={s.loading}>
        <span style={s.loadingIcone}>⚔</span>
        <span style={s.loadingTexto}>CARREGANDO PAINEL DO MESTRE...</span>
      </div>
    );
  }

  return (
    <div style={s.root}>
      {/* FEEDBACK TOAST */}
      <AnimatePresence>
        {feedbackMsg && (
          <motion.div
            style={{
              ...s.toast,
              borderColor: feedbackMsg.erro
                ? "rgba(139,32,32,0.4)"
                : "rgba(76,175,80,0.4)",
              color: feedbackMsg.erro ? "#a04040" : "#4CAF50",
            }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {feedbackMsg.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* TÍTULO */}
      <div style={s.titleRow}>
        <div style={s.secaoLinha} />
        <h2 style={s.titulo}>PAINEL DO MESTRE</h2>
        <div style={s.secaoLinha} />
      </div>

      {/* GRID PRINCIPAL */}
      <div style={s.grid}>
        {/* ═══ COLUNA ESQUERDA: MONITORAMENTO ═══ */}
        <div style={s.coluna}>
          <h3 style={s.secaoTitulo}>MONITORAMENTO DE SCRIPS</h3>
          <div style={s.secaoLinhaFina} />

          {todasFichas.length === 0 ? (
            <p style={s.vazio}>Nenhuma ficha completa encontrada.</p>
          ) : (
            <div style={s.fichasLista}>
              {todasFichas.map((ficha) => (
                <div key={ficha.id} style={s.fichaCard}>
                  {/* HEADER DO CARD */}
                  <div style={s.fichaHeader}>
                    <div>
                      <span style={s.fichaNome}>{ficha.nome_personagem}</span>
                      <span style={s.fichaLinhagem}>
                        {nomeLinhagem ? nomeLinhagem(ficha) : "—"}
                      </span>
                    </div>
                    <span style={s.fichaNivel}>LV {ficha.nivel || 1}</span>
                  </div>

                  {/* ATRIBUTOS COMPACTOS */}
                  <div style={s.atribRow}>
                    {[
                      ["ST", ficha.st_forca],
                      ["DX", ficha.dx_destreza],
                      ["IQ", ficha.iq_inteligencia],
                      ["HT", ficha.ht_resistencia],
                    ].map(([sig, val]) => (
                      <div key={sig} style={s.atribMini}>
                        <span style={s.atribMiniLabel}>{sig}</span>
                        <span style={s.atribMiniValor}>{val ?? 10}</span>
                      </div>
                    ))}
                  </div>

                  {/* QUICK-EDIT: XP */}
                  <QuickEditRow
                    label="XP"
                    valor={ficha.xp ?? 0}
                    onMenos={() => quickEdit(ficha.id, "xp", -10)}
                    onMais={() => quickEdit(ficha.id, "xp", 10)}
                    cor="#c4a050"
                  />

                  {/* QUICK-EDIT: CASH */}
                  <QuickEditRow
                    label="CASH"
                    valor={`R$ ${ficha.cash_rs ?? 0}`}
                    onMenos={() => quickEdit(ficha.id, "cash_rs", -10)}
                    onMais={() => quickEdit(ficha.id, "cash_rs", 10)}
                    cor="#4a8c5c"
                  />

                  {/* QUICK-EDIT: NÍVEL */}
                  <QuickEditRow
                    label="NÍVEL"
                    valor={ficha.nivel ?? 1}
                    onMenos={() => quickEdit(ficha.id, "nivel", -1)}
                    onMais={() => quickEdit(ficha.id, "nivel", 1)}
                    cor="#6b2fa0"
                  />

                  {/* QUICK-EDIT: PH */}
                  <QuickEditRow
                    label="PH"
                    valor={ficha.pontos_habilidade_ph ?? 0}
                    onMenos={() =>
                      quickEdit(ficha.id, "pontos_habilidade_ph", -1)
                    }
                    onMais={() =>
                      quickEdit(ficha.id, "pontos_habilidade_ph", 1)
                    }
                    cor="#1a6b8a"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══ COLUNA DIREITA: TERMINAL DE TRANSMISSÃO ═══ */}
        <div style={s.coluna}>
          <h3 style={s.secaoTitulo}>TERMINAL DE TRANSMISSÃO</h3>
          <div style={s.secaoLinhaFina} />

          {/* EDITOR */}
          <div style={s.editorCard}>
            {/* SELETOR DE TIPO */}
            <div style={s.tiposRow}>
              {TIPOS_EVENTO.map((t) => (
                <button
                  key={t.valor}
                  onClick={() => setNovoTipo(t.valor)}
                  style={{
                    ...s.tipoBtn,
                    borderColor:
                      novoTipo === t.valor ? t.cor : "rgba(196,160,80,0.1)",
                    color: novoTipo === t.valor ? t.cor : "#3a2e10",
                    background:
                      novoTipo === t.valor ? `${t.cor}12` : "transparent",
                  }}
                >
                  {t.valor}
                </button>
              ))}
            </div>

            {/* TÍTULO */}
            <input
              type="text"
              value={novoTitulo}
              onChange={(e) => setNovoTitulo(e.target.value)}
              placeholder="Título do evento..."
              style={s.inputTitulo}
            />

            {/* DESCRIÇÃO */}
            <textarea
              value={novaDescricao}
              onChange={(e) => setNovaDescricao(e.target.value)}
              placeholder="Descrição (opcional)..."
              rows={3}
              style={s.inputDescricao}
            />

            {/* PREVIEW */}
            {novoTitulo.trim() && (
              <div style={s.previewWrap}>
                <span style={s.previewLabel}>PREVIEW</span>
                <div style={s.previewCard}>
                  <span
                    style={{
                      ...s.previewTipo,
                      color: TIPO_COR[novoTipo],
                      borderColor: TIPO_COR[novoTipo],
                    }}
                  >
                    [{novoTipo}]
                  </span>
                  <p style={s.previewTitulo}>{novoTitulo}</p>
                  {novaDescricao && (
                    <p style={s.previewDesc}>{novaDescricao}</p>
                  )}
                </div>
              </div>
            )}

            {/* BOTÃO PUBLICAR */}
            <button
              onClick={publicarEvento}
              disabled={!novoTitulo.trim() || publicando}
              style={{
                ...s.btnPublicar,
                opacity: novoTitulo.trim() && !publicando ? 1 : 0.4,
                cursor:
                  novoTitulo.trim() && !publicando ? "pointer" : "not-allowed",
              }}
            >
              {publicando ? "PUBLICANDO..." : "PUBLICAR TRANSMISSÃO"}
            </button>
          </div>

          {/* EVENTOS EXISTENTES */}
          <div style={{ marginTop: "16px" }}>
            <h3 style={s.secaoTitulo}>TRANSMISSÕES ANTERIORES</h3>
            <div style={s.secaoLinhaFina} />
            <div style={s.eventosLista}>
              {eventosAtivos.length === 0 ? (
                <p style={s.vazio}>Nenhuma transmissão registrada.</p>
              ) : (
                eventosAtivos.map((ev) => (
                  <div
                    key={ev.id}
                    style={{
                      ...s.eventoItem,
                      opacity: ev.ativo ? 1 : 0.4,
                    }}
                  >
                    <div style={s.eventoInfo}>
                      <span
                        style={{
                          ...s.eventoTipo,
                          color: TIPO_COR[ev.tipo] || "#5a4820",
                        }}
                      >
                        [{ev.tipo}]
                      </span>
                      <span style={s.eventoTitulo}>{ev.titulo}</span>
                    </div>
                    <div style={s.eventoBtns}>
                      <button
                        style={{
                          ...s.eventoBtn,
                          color: ev.ativo ? "#4a8c5c" : "#8b6020",
                        }}
                        onClick={() => toggleEvento(ev.id, ev.ativo)}
                        title={ev.ativo ? "Desativar" : "Reativar"}
                      >
                        {ev.ativo ? "●" : "○"}
                      </button>
                      <button
                        style={{ ...s.eventoBtn, color: "#5a2020" }}
                        onClick={() => deletarEvento(ev.id)}
                        title="Deletar"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// QUICK-EDIT ROW
// ─────────────────────────────────────────────
function QuickEditRow({ label, valor, onMenos, onMais, cor }) {
  return (
    <div style={s.qeRow}>
      <span style={s.qeLabel}>{label}</span>
      <div style={s.qeControls}>
        <button
          style={{
            ...s.qeBtn,
            color: "#8b3030",
            borderColor: "rgba(139,48,48,0.2)",
          }}
          onClick={onMenos}
        >
          −
        </button>
        <span style={{ ...s.qeValor, color: cor }}>{valor}</span>
        <button
          style={{
            ...s.qeBtn,
            color: "#4a8c5c",
            borderColor: "rgba(74,140,92,0.2)",
          }}
          onClick={onMais}
        >
          +
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────
const s = {
  root: {
    width: "100%",
    maxWidth: "1100px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    position: "relative",
  },
  loading: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "50vh",
    gap: "12px",
  },
  loadingIcone: { fontSize: "2em", color: "rgba(196,160,80,0.3)" },
  loadingTexto: {
    fontSize: "0.7em",
    color: "#4a3820",
    letterSpacing: "3px",
    fontFamily: "'Palatino Linotype', serif",
  },

  // TOAST
  toast: {
    position: "fixed",
    top: "70px",
    right: "20px",
    zIndex: 999,
    padding: "8px 18px",
    background: "rgba(10,12,6,0.95)",
    border: "1px solid",
    borderRadius: "5px",
    fontSize: "0.68em",
    fontWeight: 700,
    letterSpacing: "1px",
    fontFamily: "'Palatino Linotype', serif",
  },

  // TÍTULO
  titleRow: { display: "flex", alignItems: "center", gap: "14px" },
  titulo: {
    margin: 0,
    fontSize: "0.62em",
    fontWeight: 700,
    letterSpacing: "4px",
    color: "#52421e",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    fontFamily: "'Palatino Linotype', serif",
  },
  secaoLinha: {
    flex: 1,
    height: 1,
    background: "linear-gradient(to right, rgba(196,160,80,0.16), transparent)",
  },

  // GRID
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
    alignItems: "start",
  },
  coluna: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  // SEÇÕES
  secaoTitulo: {
    margin: 0,
    fontSize: "0.52em",
    fontWeight: 700,
    letterSpacing: "3px",
    color: "#4a3820",
    textTransform: "uppercase",
    fontFamily: "'Palatino Linotype', serif",
  },
  secaoLinhaFina: {
    height: 1,
    background: "linear-gradient(to right, rgba(196,160,80,0.12), transparent)",
    marginBottom: "6px",
  },
  vazio: {
    fontSize: "0.72em",
    color: "#3a2e10",
    fontStyle: "italic",
    fontFamily: "'Palatino Linotype', serif",
  },

  // FICHAS DO MESTRE
  fichasLista: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  fichaCard: {
    padding: "14px 16px",
    background: "rgba(10,12,6,0.8)",
    border: "1px solid rgba(196,160,80,0.1)",
    borderRadius: "7px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  fichaHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  fichaNome: {
    display: "block",
    fontSize: "0.9em",
    fontWeight: 700,
    color: "#e8d08a",
    fontFamily: "'EB Garamond', serif",
  },
  fichaLinhagem: {
    display: "block",
    fontSize: "0.6em",
    color: "#5a4820",
    letterSpacing: "0.5px",
  },
  fichaNivel: {
    fontSize: "0.55em",
    fontWeight: 700,
    background: "rgba(196,160,80,0.1)",
    border: "1px solid rgba(196,160,80,0.2)",
    color: "#c4a050",
    padding: "2px 8px",
    borderRadius: "3px",
    letterSpacing: "1px",
    fontFamily: "'Palatino Linotype', serif",
  },

  // ATRIBUTOS MINI
  atribRow: {
    display: "flex",
    gap: "6px",
  },
  atribMini: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "4px 0",
    background: "rgba(196,160,80,0.04)",
    borderRadius: "3px",
    border: "1px solid rgba(196,160,80,0.06)",
  },
  atribMiniLabel: {
    fontSize: "0.45em",
    color: "#4a3820",
    fontWeight: 700,
    letterSpacing: "1px",
  },
  atribMiniValor: {
    fontSize: "0.8em",
    color: "#c4a050",
    fontWeight: 700,
    fontFamily: "'EB Garamond', serif",
  },

  // QUICK-EDIT
  qeRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "2px 0",
  },
  qeLabel: {
    fontSize: "0.5em",
    fontWeight: 700,
    letterSpacing: "1.5px",
    color: "#4a3820",
    fontFamily: "'Palatino Linotype', serif",
  },
  qeControls: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  qeBtn: {
    width: "22px",
    height: "22px",
    borderRadius: "3px",
    border: "1px solid",
    background: "transparent",
    cursor: "pointer",
    fontSize: "0.8em",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Palatino Linotype', serif",
    transition: "all 0.15s",
    padding: 0,
  },
  qeValor: {
    fontSize: "0.75em",
    fontWeight: 700,
    minWidth: "50px",
    textAlign: "center",
    fontFamily: "'EB Garamond', serif",
  },

  // EDITOR DE NOTÍCIAS
  editorCard: {
    padding: "16px",
    background: "rgba(10,12,6,0.8)",
    border: "1px solid rgba(196,160,80,0.1)",
    borderRadius: "7px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  tiposRow: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },
  tipoBtn: {
    padding: "3px 10px",
    borderRadius: "3px",
    border: "1px solid",
    background: "transparent",
    cursor: "pointer",
    fontSize: "0.5em",
    fontWeight: 700,
    letterSpacing: "1px",
    fontFamily: "'Palatino Linotype', serif",
    transition: "all 0.15s",
    textTransform: "uppercase",
  },
  inputTitulo: {
    width: "100%",
    padding: "10px 12px",
    background: "rgba(0,0,0,0.3)",
    border: "1px solid rgba(196,160,80,0.2)",
    borderRadius: "4px",
    color: "#e8e4dc",
    fontFamily: "'Crimson Pro', 'Palatino Linotype', serif",
    fontSize: "0.88em",
    fontWeight: 700,
    outline: "none",
    boxSizing: "border-box",
  },
  inputDescricao: {
    width: "100%",
    padding: "10px 12px",
    background: "rgba(0,0,0,0.3)",
    border: "1px solid rgba(196,160,80,0.15)",
    borderRadius: "4px",
    color: "#b8a87a",
    fontFamily: "'Crimson Pro', 'Palatino Linotype', serif",
    fontSize: "0.8em",
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box",
  },

  // PREVIEW
  previewWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  previewLabel: {
    fontSize: "0.45em",
    fontWeight: 700,
    letterSpacing: "2px",
    color: "#3a2e10",
    fontFamily: "'Palatino Linotype', serif",
  },
  previewCard: {
    padding: "10px 12px",
    background: "rgba(10,12,6,0.85)",
    border: "1px solid rgba(196,160,80,0.09)",
    borderRadius: "5px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  previewTipo: {
    fontSize: "0.5em",
    fontWeight: 700,
    letterSpacing: "1px",
    border: "1px solid",
    borderRadius: "2px",
    padding: "1px 5px",
    alignSelf: "flex-start",
  },
  previewTitulo: {
    margin: 0,
    fontSize: "0.72em",
    fontWeight: 700,
    color: "#c4a050",
    lineHeight: 1.4,
  },
  previewDesc: {
    margin: 0,
    fontSize: "0.62em",
    color: "#4a3820",
    lineHeight: 1.5,
  },

  // BOTÃO PUBLICAR
  btnPublicar: {
    width: "100%",
    padding: "12px",
    background:
      "linear-gradient(135deg, #1a1200 0%, #2a1e00 50%, #1a1200 100%)",
    border: "1px solid rgba(196,160,80,0.35)",
    borderRadius: "5px",
    color: "#e8c96a",
    fontFamily: "'EB Garamond', 'Palatino Linotype', serif",
    fontSize: "0.78em",
    fontWeight: 700,
    letterSpacing: "2px",
    textTransform: "uppercase",
    cursor: "pointer",
    transition: "all 0.2s",
  },

  // EVENTOS LISTA
  eventosLista: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    maxHeight: "300px",
    overflowY: "auto",
    scrollbarWidth: "thin",
    scrollbarColor: "rgba(196,160,80,0.15) transparent",
  },
  eventoItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 10px",
    background: "rgba(10,12,6,0.6)",
    border: "1px solid rgba(196,160,80,0.06)",
    borderRadius: "4px",
    transition: "opacity 0.2s",
  },
  eventoInfo: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flex: 1,
    minWidth: 0,
  },
  eventoTipo: {
    fontSize: "0.48em",
    fontWeight: 700,
    letterSpacing: "0.5px",
    flexShrink: 0,
    fontFamily: "'Palatino Linotype', serif",
  },
  eventoTitulo: {
    fontSize: "0.68em",
    color: "#8a7a50",
    fontWeight: 700,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  eventoBtns: {
    display: "flex",
    gap: "4px",
    flexShrink: 0,
  },
  eventoBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: "0.75em",
    padding: "2px 6px",
    fontFamily: "'Palatino Linotype', serif",
    transition: "opacity 0.15s",
  },
};
