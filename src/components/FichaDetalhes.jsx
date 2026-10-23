import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

// ─────────────────────────────────────────────
// CÁLCULOS GURPS DERIVADOS
// ─────────────────────────────────────────────
function calcDeriv(ficha) {
  const st = ficha.st_forca ?? 10;
  const dx = ficha.dx_destreza ?? 10;
  const iq = ficha.iq_inteligencia ?? 10;
  const ht = ficha.ht_resistencia ?? 10;
  const velBase = (dx + ht) / 4;
  return {
    pv: st,
    pf: ht,
    vontade: iq,
    percepcao: iq,
    velocidadeBasica: velBase,
    esquiva: Math.floor(velBase) + 3,
    cargaBasica: Math.round((st * st) / 10),
  };
}

// ─────────────────────────────────────────────
// CAMPO EDITÁVEL (lápis → input/textarea → salvar)
// ─────────────────────────────────────────────
function CampoEditavel({ valor, coluna, fichaId, tipo = "textarea", onSalvo }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(valor || "");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => setTexto(valor || ""), [valor]);

  const salvar = async () => {
    setSalvando(true);
    const { error } = await supabase
      .from("fichas")
      .update({ [coluna]: texto.trim() })
      .eq("id", fichaId);
    setSalvando(false);
    if (error) {
      alert("Erro ao salvar: " + error.message);
      return;
    }
    setEditando(false);
    if (onSalvo) onSalvo(coluna, texto.trim());
  };

  if (!editando) {
    return (
      <div style={{ position: "relative", group: "editavel" }}>
        <div
          style={{
            color: texto ? "#b8a87a" : "#3a3020",
            fontFamily: "'Crimson Pro', 'Palatino Linotype', serif",
            fontSize: "0.88em",
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            fontStyle: texto ? "normal" : "italic",
            minHeight: "24px",
          }}
        >
          {texto || "Nenhuma informação registrada."}
        </div>
        <button
          onClick={() => setEditando(true)}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            background: "rgba(196,160,80,0.08)",
            border: "1px solid rgba(196,160,80,0.15)",
            borderRadius: "3px",
            color: "#b8ae96",
            cursor: "pointer",
            padding: "3px 8px",
            fontSize: "0.74em",
            letterSpacing: "1px",
            fontFamily: "'Palatino Linotype', serif",
            transition: "all 0.2s",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = "#c4a050";
            e.currentTarget.style.borderColor = "rgba(196,160,80,0.4)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = "#b8ae96";
            e.currentTarget.style.borderColor = "rgba(196,160,80,0.15)";
          }}
        >
          ✎
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {tipo === "textarea" ? (
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          autoFocus
          rows={5}
          style={{
            width: "100%",
            padding: "10px 12px",
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(196,160,80,0.3)",
            borderRadius: "4px",
            color: "#e8e4dc",
            fontFamily: "'Crimson Pro', 'Palatino Linotype', serif",
            fontSize: "0.88em",
            lineHeight: 1.7,
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      ) : (
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          autoFocus
          style={{
            width: "100%",
            padding: "8px 12px",
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(196,160,80,0.3)",
            borderRadius: "4px",
            color: "#e8e4dc",
            fontFamily: "'Crimson Pro', 'Palatino Linotype', serif",
            fontSize: "0.88em",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      )}
      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={salvar} disabled={salvando} style={s.btnSalvar}>
          {salvando ? "..." : "Salvar"}
        </button>
        <button
          onClick={() => {
            setTexto(valor || "");
            setEditando(false);
          }}
          style={s.btnCancelar}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export default function FichaDetalhes({ fichaId, nomeLinhagem, onVoltar }) {
  const [ficha, setFicha] = useState(null);
  const [skills, setSkills] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [abaTexto, setAbaTexto] = useState("historia");

  useEffect(() => {
    async function carregar() {
      setCarregando(true);

      // Ficha
      const { data: fichaData } = await supabase
        .from("fichas")
        .select("*")
        .eq("id", fichaId)
        .single();

      // Skills (sequelas + aptidões)
      const { data: skillsData } = await supabase
        .from("ficha_skills")
        .select("node_id, skill_nodes(*)")
        .eq("ficha_id", fichaId);

      if (fichaData) setFicha(fichaData);
      if (skillsData)
        setSkills(skillsData.map((s) => s.skill_nodes).filter(Boolean));
      setCarregando(false);
    }
    carregar();
  }, [fichaId]);

  // Atualiza estado local quando campo é salvo
  const handleSalvo = (coluna, novoValor) => {
    setFicha((prev) => ({ ...prev, [coluna]: novoValor }));
  };

  if (carregando) {
    return (
      <div style={s.loading}>
        <span style={s.loadingIcone}>◈</span>
        <span style={s.loadingTexto}>ACESSANDO REGISTROS...</span>
      </div>
    );
  }

  if (!ficha) {
    return (
      <div style={s.loading}>
        <span style={s.loadingTexto}>Ficha não encontrada.</span>
        <button onClick={onVoltar} style={s.btnVoltar}>
          ← Voltar
        </button>
      </div>
    );
  }

  const deriv = calcDeriv(ficha);
  const sequelas = skills.filter((sk) =>
    sk.tipo?.toLowerCase().includes("equela"),
  );
  const aptidoes = skills.filter((sk) =>
    sk.tipo?.toLowerCase().includes("aptid"),
  );

  const ABAS_TEXTO = [
    { id: "historia", label: "História", coluna: "historia" },
    { id: "aparencia", label: "Aparência", coluna: "aparencia" },
    { id: "detalhes", label: "Detalhes", coluna: "detalhes" },
  ];

  return (
    <div style={s.root}>
      {/* BOTÃO VOLTAR */}
      <button onClick={onVoltar} style={s.btnVoltar}>
        ← Voltar aos Personagens
      </button>

      {/* ═══ CABEÇALHO ═══ */}
      <header style={s.cabecalho}>
        <div style={s.cabecalhoInfo}>
          <h1 style={s.nome}>{ficha.nome_personagem}</h1>
          <div style={s.metaRow}>
            <span style={s.metaTag}>{nomeLinhagem || "—"}</span>
            <span style={s.metaDot}>·</span>
            <span style={s.metaTag}>Nível {ficha.nivel || 1}</span>
            <span style={s.metaDot}>·</span>
            <span style={s.metaTag}>
              {ficha.xp ?? 0} / {(ficha.nivel || 1) * 200} XP
            </span>
          </div>
          {ficha.pronomes && <span style={s.pronomes}>{ficha.pronomes}</span>}
          {ficha.interprete && (
            <span style={s.interprete}>Intérprete: {ficha.interprete}</span>
          )}
        </div>
        <div style={s.cabecalhoDireita}>
          <div style={s.cashBox}>
            <span style={s.cashLabel}>CASH</span>
            <span style={s.cashValor}>R$ {ficha.cash_rs ?? 200}</span>
          </div>
        </div>
      </header>

      {/* ═══ GRID PRINCIPAL ═══ */}
      <div className="duas-colunas" style={s.gridPrincipal}>
        {/* COLUNA ESQUERDA: Atributos + Derivados */}
        <div style={s.colunaEsq}>
          {/* ATRIBUTOS PRIMÁRIOS */}
          <Secao titulo="ATRIBUTOS">
            <div style={s.atributosGrid}>
              {[
                ["ST", ficha.st_forca, "Força"],
                ["DX", ficha.dx_destreza, "Destreza"],
                ["IQ", ficha.iq_inteligencia, "Inteligência"],
                ["HT", ficha.ht_resistencia, "Resistência"],
              ].map(([sigla, val, label]) => (
                <div key={sigla} style={s.atributoBox}>
                  <span style={s.atributoSigla}>{sigla}</span>
                  <span style={s.atributoValor}>{val ?? 10}</span>
                  <span style={s.atributoLabel}>{label}</span>
                </div>
              ))}
            </div>
          </Secao>

          {/* DERIVADOS */}
          <Secao titulo="ESTATÍSTICAS SECUNDÁRIAS">
            <div style={s.derivGrid}>
              {[
                ["PV", deriv.pv, "Pontos de Vida"],
                ["PF", deriv.pf, "Pontos de Fadiga"],
                ["Vontade", deriv.vontade, null],
                ["Percepção", deriv.percepcao, null],
                ["Vel. Básica", deriv.velocidadeBasica.toFixed(2), null],
                ["Esquiva", deriv.esquiva, null],
                ["Carga (kg)", deriv.cargaBasica, null],
              ].map(([label, val, sub]) => (
                <div key={label} style={s.derivItem}>
                  <span style={s.derivLabel}>{label}</span>
                  <span style={s.derivValor}>{val}</span>
                  {sub && <span style={s.derivSub}>{sub}</span>}
                </div>
              ))}
            </div>
          </Secao>

          {/* POOLS ATUAIS */}
          <Secao titulo="POOLS ATUAIS">
            <div style={s.poolsRow}>
              <PoolBar
                label="VIGOR"
                atual={ficha.vigor_atual ?? deriv.pf}
                max={deriv.pf}
                cor="#4a8c5c"
              />
              <PoolBar
                label="MANA"
                atual={ficha.mana_atual ?? deriv.pf}
                max={deriv.pf}
                cor="#4a5c8c"
              />
            </div>
          </Secao>

          {/* SEQUELAS */}
          {sequelas.length > 0 && (
            <Secao titulo="SEQUELAS">
              <div style={s.tagsList}>
                {sequelas.map((seq) => (
                  <div key={seq.id} style={s.sequelaTag}>
                    <span style={s.sequelaIcon}>⚠</span>
                    <div>
                      <span style={s.sequelaNome}>{seq.nome}</span>
                      {seq.descricao && (
                        <span style={s.sequelaDesc}>{seq.descricao}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Secao>
          )}

          {/* APTIDÕES */}
          {aptidoes.length > 0 && (
            <Secao titulo="APTIDÃO">
              <div style={s.tagsList}>
                {aptidoes.map((apt) => (
                  <div key={apt.id} style={s.aptidaoTag}>
                    <span style={s.aptidaoIcon}>◆</span>
                    <div>
                      <span style={s.aptidaoNome}>{apt.nome}</span>
                      {apt.descricao && (
                        <span style={s.aptidaoDesc}>{apt.descricao}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Secao>
          )}

          {/* PONTOS DISPONÍVEIS */}
          <Secao titulo="PONTOS">
            <div style={s.pontosRow}>
              <div style={s.pontoBox}>
                <span style={s.pontoValor}>
                  {ficha.pontos_habilidade_ph ?? 0}
                </span>
                <span style={s.pontoLabel}>PH Disponíveis</span>
              </div>
              <div style={s.pontoBox}>
                <span style={s.pontoValor}>{ficha.pontos_raca_pr ?? 0}</span>
                <span style={s.pontoLabel}>Pontos de Raça</span>
              </div>
            </div>
          </Secao>
        </div>

        {/* COLUNA DIREITA: Texto narrativo + Guardião */}
        <div style={s.colunaDir}>
          {/* ABAS DE TEXTO EDITÁVEIS */}
          <Secao titulo="">
            <div style={s.abasRow}>
              {ABAS_TEXTO.map((aba) => (
                <button
                  key={aba.id}
                  onClick={() => setAbaTexto(aba.id)}
                  style={{
                    ...s.abaBtn,
                    color: abaTexto === aba.id ? "#c4a050" : "#9aa7ae",
                    borderBottom:
                      abaTexto === aba.id
                        ? "1px solid #c4a050"
                        : "1px solid transparent",
                  }}
                >
                  {aba.label}
                </button>
              ))}
            </div>
            <div style={{ marginTop: "14px" }}>
              {ABAS_TEXTO.map(
                (aba) =>
                  abaTexto === aba.id && (
                    <CampoEditavel
                      key={aba.id}
                      valor={ficha[aba.coluna]}
                      coluna={aba.coluna}
                      fichaId={ficha.id}
                      onSalvo={handleSalvo}
                    />
                  ),
              )}
            </div>
          </Secao>

          {/* GUARDIÃO */}
          <Secao titulo="GUARDIÃO">
            <div style={s.guardiaoGrid}>
              <div style={s.guardiaoItem}>
                <span style={s.guardiaoLabel}>ESPÉCIE</span>
                <CampoEditavel
                  valor={ficha.especie_guardiao}
                  coluna="especie_guardiao"
                  fichaId={ficha.id}
                  tipo="input"
                  onSalvo={handleSalvo}
                />
              </div>
              <div style={s.guardiaoItem}>
                <span style={s.guardiaoLabel}>APARÊNCIA</span>
                <CampoEditavel
                  valor={ficha.aparencia_guardiao}
                  coluna="aparencia_guardiao"
                  fichaId={ficha.id}
                  onSalvo={handleSalvo}
                />
              </div>
              <div style={s.guardiaoItem}>
                <span style={s.guardiaoLabel}>CAMUFLAGEM</span>
                <CampoEditavel
                  valor={ficha.camuflagem_guardiao}
                  coluna="camuflagem_guardiao"
                  fichaId={ficha.id}
                  tipo="input"
                  onSalvo={handleSalvo}
                />
              </div>
            </div>
          </Secao>

          {/* CRISTAL METAMÓRFICO */}
          <Secao titulo="CRISTAL METAMÓRFICO">
            <div style={s.cristalRow}>
              <div
                style={{
                  ...s.cristalIndicador,
                  background: ficha.cristal_metamorfico_equipado
                    ? "rgba(76,175,80,0.15)"
                    : "rgba(139,32,32,0.1)",
                  borderColor: ficha.cristal_metamorfico_equipado
                    ? "rgba(76,175,80,0.3)"
                    : "rgba(139,32,32,0.2)",
                }}
              >
                <span
                  style={{
                    color: ficha.cristal_metamorfico_equipado
                      ? "#4CAF50"
                      : "#d07060",
                    fontSize: "0.75em",
                    fontWeight: 700,
                    letterSpacing: "1.5px",
                  }}
                >
                  {ficha.cristal_metamorfico_equipado
                    ? "◈ EQUIPADO"
                    : "○ NÃO EQUIPADO"}
                </span>
              </div>
              <span style={s.cristalDesc}>
                Camufla aparência não-humana em território Norcan.
              </span>
            </div>
          </Secao>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENTES AUXILIARES
// ─────────────────────────────────────────────
function Secao({ titulo, children }) {
  return (
    <div style={s.secao}>
      {titulo && (
        <>
          <h3 style={s.secaoTitulo}>{titulo}</h3>
          <div style={s.secaoLinha} />
        </>
      )}
      {children}
    </div>
  );
}

function PoolBar({ label, atual, max, cor }) {
  const pct = max > 0 ? Math.min((atual / max) * 100, 100) : 0;
  return (
    <div style={s.poolItem}>
      <div style={s.poolHeader}>
        <span style={s.poolLabel}>{label}</span>
        <span style={s.poolNumeros}>
          {atual} / {max}
        </span>
      </div>
      <div style={s.poolTrack}>
        <div
          style={{
            ...s.poolFill,
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${cor} 0%, ${cor}88 100%)`,
            boxShadow: `0 0 8px ${cor}44`,
          }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────
const s = {
  root: {
    maxWidth: "960px",
    margin: "0 auto",
    padding: "12px 20px 60px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
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
    color: "#9aa7ae",
    letterSpacing: "3px",
    fontFamily: "'Palatino Linotype', serif",
  },
  btnVoltar: {
    alignSelf: "flex-start",
    background: "transparent",
    border: "none",
    color: "#9aa7ae",
    cursor: "pointer",
    fontSize: "0.72em",
    fontFamily: "'Palatino Linotype', serif",
    letterSpacing: "1px",
    padding: "6px 0",
    transition: "color 0.2s",
  },

  // CABEÇALHO
  cabecalho: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    paddingBottom: "16px",
    borderBottom: "1px solid rgba(196,160,80,0.1)",
  },
  cabecalhoInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  nome: {
    margin: 0,
    fontFamily: "'EB Garamond', 'Palatino Linotype', serif",
    fontSize: "1.8em",
    fontWeight: 700,
    color: "#e8d08a",
    letterSpacing: "1px",
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  metaTag: {
    fontSize: "0.72em",
    color: "#b8ae96",
    letterSpacing: "0.5px",
    fontFamily: "'Palatino Linotype', serif",
  },
  metaDot: { color: "#7d8a92", fontSize: "0.74em" },
  pronomes: {
    fontSize: "0.68em",
    color: "#9aa7ae",
    fontStyle: "italic",
    marginTop: "2px",
  },
  interprete: {
    fontSize: "0.74em",
    color: "#7d8a92",
    letterSpacing: "0.5px",
    marginTop: "2px",
  },
  cabecalhoDireita: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "8px",
    flexShrink: 0,
  },
  cashBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "10px 18px",
    background: "rgba(196,160,80,0.05)",
    border: "1px solid rgba(196,160,80,0.12)",
    borderRadius: "5px",
  },
  cashLabel: {
    fontSize: "0.68em",
    fontWeight: 700,
    letterSpacing: "2px",
    color: "#9aa7ae",
  },
  cashValor: {
    fontSize: "1.1em",
    fontWeight: 700,
    color: "#c4a050",
    fontFamily: "'EB Garamond', serif",
  },

  // GRID
  gridPrincipal: {
    display: "grid",
    gridTemplateColumns: "320px 1fr",
    gap: "24px",
    alignItems: "start",
  },
  colunaEsq: { display: "flex", flexDirection: "column", gap: "16px" },
  colunaDir: { display: "flex", flexDirection: "column", gap: "16px" },

  // SEÇÕES
  secao: {
    background: "rgba(12,17,22,0.7)",
    border: "1px solid rgba(196,160,80,0.08)",
    borderRadius: "7px",
    padding: "16px 18px",
  },
  secaoTitulo: {
    margin: 0,
    fontSize: "0.68em",
    fontWeight: 700,
    letterSpacing: "3px",
    color: "#9aa7ae",
    textTransform: "uppercase",
    fontFamily: "'Palatino Linotype', serif",
  },
  secaoLinha: {
    height: 1,
    background: "linear-gradient(to right, rgba(196,160,80,0.15), transparent)",
    margin: "8px 0 12px",
  },

  // ATRIBUTOS
  atributosGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "8px",
  },
  atributoBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
    padding: "10px 0",
    background: "rgba(196,160,80,0.04)",
    borderRadius: "5px",
    border: "1px solid rgba(196,160,80,0.07)",
  },
  atributoSigla: {
    fontSize: "0.68em",
    color: "#9aa7ae",
    fontWeight: 700,
    letterSpacing: "1.5px",
  },
  atributoValor: {
    fontSize: "1.5em",
    color: "#c4a050",
    fontWeight: 700,
    fontFamily: "'EB Garamond', serif",
    lineHeight: 1,
  },
  atributoLabel: {
    fontSize: "0.68em",
    color: "#7d8a92",
    letterSpacing: "0.5px",
  },

  // DERIVADOS
  derivGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "6px",
  },
  derivItem: {
    display: "flex",
    flexDirection: "column",
    padding: "6px 10px",
    background: "rgba(196,160,80,0.03)",
    borderRadius: "4px",
  },
  derivLabel: {
    fontSize: "0.68em",
    color: "#9aa7ae",
    letterSpacing: "0.5px",
    fontWeight: 700,
  },
  derivValor: {
    fontSize: "0.95em",
    color: "#b8a060",
    fontWeight: 700,
    fontFamily: "'EB Garamond', serif",
  },
  derivSub: { fontSize: "0.68em", color: "#7d8a92" },

  // POOLS
  poolsRow: { display: "flex", flexDirection: "column", gap: "10px" },
  poolItem: { display: "flex", flexDirection: "column", gap: "4px" },
  poolHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  poolLabel: {
    fontSize: "0.68em",
    fontWeight: 700,
    color: "#9aa7ae",
    letterSpacing: "1.5px",
  },
  poolNumeros: {
    fontSize: "0.74em",
    color: "#b8ae96",
    fontFamily: "'EB Garamond', serif",
  },
  poolTrack: {
    height: "6px",
    background: "rgba(0,0,0,0.3)",
    borderRadius: "3px",
    overflow: "hidden",
  },
  poolFill: {
    height: "100%",
    borderRadius: "3px",
    transition: "width 0.4s ease",
  },

  // SEQUELAS & APTIDÕES
  tagsList: { display: "flex", flexDirection: "column", gap: "8px" },
  sequelaTag: {
    display: "flex",
    gap: "8px",
    padding: "8px 10px",
    background: "rgba(139,50,50,0.06)",
    border: "1px solid rgba(139,50,50,0.12)",
    borderRadius: "5px",
  },
  sequelaIcon: {
    fontSize: "0.8em",
    color: "#d07060",
    flexShrink: 0,
    marginTop: "1px",
  },
  sequelaNome: {
    fontSize: "0.75em",
    fontWeight: 700,
    color: "#a06040",
    display: "block",
  },
  sequelaDesc: {
    fontSize: "0.74em",
    color: "#d07060",
    lineHeight: 1.5,
    display: "block",
    marginTop: "2px",
  },
  aptidaoTag: {
    display: "flex",
    gap: "8px",
    padding: "8px 10px",
    background: "rgba(76,175,80,0.05)",
    border: "1px solid rgba(76,175,80,0.12)",
    borderRadius: "5px",
  },
  aptidaoIcon: {
    fontSize: "0.7em",
    color: "#4CAF50",
    flexShrink: 0,
    marginTop: "2px",
  },
  aptidaoNome: {
    fontSize: "0.75em",
    fontWeight: 700,
    color: "#6a9a50",
    display: "block",
  },
  aptidaoDesc: {
    fontSize: "0.74em",
    color: "#7fb069",
    lineHeight: 1.5,
    display: "block",
    marginTop: "2px",
  },

  // PONTOS
  pontosRow: { display: "flex", gap: "10px" },
  pontoBox: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "10px",
    background: "rgba(196,160,80,0.04)",
    borderRadius: "5px",
    border: "1px solid rgba(196,160,80,0.08)",
  },
  pontoValor: {
    fontSize: "1.3em",
    fontWeight: 700,
    color: "#c4a050",
    fontFamily: "'EB Garamond', serif",
  },
  pontoLabel: {
    fontSize: "0.68em",
    color: "#9aa7ae",
    letterSpacing: "1px",
    fontWeight: 700,
    textAlign: "center",
  },

  // ABAS DE TEXTO
  abasRow: {
    display: "flex",
    gap: "4px",
    borderBottom: "1px solid rgba(196,160,80,0.08)",
    paddingBottom: "0",
  },
  abaBtn: {
    background: "transparent",
    border: "none",
    padding: "6px 14px",
    cursor: "pointer",
    fontSize: "0.74em",
    fontWeight: 700,
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    fontFamily: "'Palatino Linotype', serif",
    transition: "all 0.2s",
  },

  // GUARDIÃO
  guardiaoGrid: { display: "flex", flexDirection: "column", gap: "16px" },
  guardiaoItem: { display: "flex", flexDirection: "column", gap: "6px" },
  guardiaoLabel: {
    fontSize: "0.68em",
    fontWeight: 700,
    letterSpacing: "2px",
    color: "#9aa7ae",
    fontFamily: "'Palatino Linotype', serif",
  },

  // CRISTAL
  cristalRow: { display: "flex", flexDirection: "column", gap: "8px" },
  cristalIndicador: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 12px",
    borderRadius: "4px",
    border: "1px solid",
    alignSelf: "flex-start",
  },
  cristalDesc: {
    fontSize: "0.74em",
    color: "#7d8a92",
    fontStyle: "italic",
  },

  // BOTÕES DE EDIÇÃO
  btnSalvar: {
    padding: "5px 16px",
    background: "rgba(196,160,80,0.12)",
    border: "1px solid rgba(196,160,80,0.25)",
    borderRadius: "3px",
    color: "#c4a050",
    cursor: "pointer",
    fontSize: "0.68em",
    fontWeight: 700,
    letterSpacing: "1px",
    fontFamily: "'Palatino Linotype', serif",
  },
  btnCancelar: {
    padding: "5px 16px",
    background: "transparent",
    border: "1px solid rgba(196,160,80,0.1)",
    borderRadius: "3px",
    color: "#9aa7ae",
    cursor: "pointer",
    fontSize: "0.68em",
    letterSpacing: "1px",
    fontFamily: "'Palatino Linotype', serif",
  },
};
