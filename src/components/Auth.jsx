import { useState } from "react";
import { supabase } from "../supabaseClient";
import { motion } from "framer-motion";

// ─────────────────────────────────────────────
// BOTÃO DOURADO — mesma lógica do TelaInicial
// TODO: extrair para src/components/ui/BotaoDourado.jsx
//       quando quiser compartilhar entre páginas
// ─────────────────────────────────────────────
function BotaoDourado({
  children,
  onClick,
  tipo = "button",
  disabled = false,
  carregando = false,
}) {
  return (
    <motion.button
      type={tipo}
      onClick={onClick}
      disabled={disabled}
      style={{
        position: "relative",
        width: "100%",
        padding: "14px",
        background: disabled
          ? "rgba(26,18,0,0.4)"
          : "linear-gradient(135deg, #1a1200 0%, #2a1e00 50%, #1a1200 100%)",
        color: disabled ? "#5a4820" : "#e8c96a",
        border: "1px solid",
        borderColor: disabled ? "rgba(196,160,80,0.2)" : "#c4a050",
        borderRadius: "6px",
        fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
        fontSize: "1em",
        fontWeight: 700,
        letterSpacing: "2px",
        cursor: disabled ? "not-allowed" : "pointer",
        textTransform: "uppercase",
        overflow: "hidden",
        marginTop: "8px",
      }}
      animate={
        disabled
          ? {}
          : {
              boxShadow: [
                "0 0  6px rgba(196,160,80,0.2), inset 0 0  0px rgba(196,160,80,0)",
                "0 0 20px rgba(196,160,80,0.65), inset 0 0  8px rgba(196,160,80,0.07)",
                "0 0  6px rgba(196,160,80,0.2), inset 0 0  0px rgba(196,160,80,0)",
              ],
              borderColor: [
                "rgba(196,160,80,0.5)",
                "rgba(232,200,106,1)",
                "rgba(196,160,80,0.5)",
              ],
            }
      }
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      whileHover={
        disabled
          ? {}
          : {
              scale: 1.02,
              boxShadow:
                "0 0 28px rgba(196,160,80,0.8), inset 0 0 10px rgba(196,160,80,0.1)",
              color: "#fff8e0",
              transition: { duration: 0.2 },
            }
      }
      whileTap={disabled ? {} : { scale: 0.98 }}
    >
      {/* Shimmer no hover */}
      {!disabled && (
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
            transition: { duration: 0.5, ease: "easeInOut" },
          }}
        />
      )}
      {carregando ? "Aguarde..." : children}
    </motion.button>
  );
}

// ─────────────────────────────────────────────
// INPUT DOURADO
// ─────────────────────────────────────────────
function InputDourado({ type, placeholder, value, onChange, required }) {
  const [focus, setFocus] = useState(false);
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        padding: "13px 16px",
        borderRadius: "6px",
        border: `1px solid ${focus ? "rgba(196,160,80,0.7)" : "rgba(196,160,80,0.15)"}`,
        backgroundColor: focus ? "rgba(26,18,0,0.5)" : "rgba(10,8,2,0.6)",
        color: "#d4b87a",
        fontSize: "0.9em",
        outline: "none",
        fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
        letterSpacing: "0.5px",
        width: "100%",
        boxSizing: "border-box",
        transition: "border 0.3s, background 0.3s",
        boxShadow: focus ? "0 0 12px rgba(196,160,80,0.15)" : "none",
      }}
    />
  );
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [modo, setModo] = useState("login"); // 'login' | 'cadastro'
  const [mensagem, setMensagem] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensagem(null);

    if (modo === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setMensagem({ tipo: "erro", texto: error.message });
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMensagem({ tipo: "erro", texto: error.message });
      else
        setMensagem({
          tipo: "ok",
          texto: "Registro criado. Verifique seu e-mail para confirmar.",
        });
    }

    setLoading(false);
  };

  return (
    <div style={s.root}>
      {/* Grain e gradiente — mesma camada da TelaInicial */}
      <div style={s.fundo} />
      <div style={s.grain} />

      <div style={s.centrado}>
        <motion.div
          style={s.card}
          initial={{ opacity: 0, y: 28, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Bordas decorativas do card */}
          <div style={s.cardBordaTop} />
          <div style={s.cardBordaBottom} />

          {/* Logo */}
          <motion.div
            style={s.logoWrap}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {/* Troque por <img src="logo.png"> quando disponível */}
            <div style={s.logoIcone}>⚔</div>
          </motion.div>

          {/* Títulos */}
          <motion.div
            style={{ textAlign: "center", marginBottom: "32px" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <h2 style={s.titulo}>A Queda de Uma Ordem</h2>
            <p style={s.subtitulo}>O DESPERTAR DOS SCRIPS</p>
            <div style={s.divisor} />
            <p style={s.modoTexto}>
              {modo === "login"
                ? "Acesse os registros da Ordem"
                : "Crie seu registro na Ordem"}
            </p>
          </motion.div>

          {/* Formulário */}
          <motion.form
            onSubmit={handleSubmit}
            style={s.form}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <InputDourado
              type="email"
              placeholder="E-mail de acesso"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <InputDourado
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {/* Mensagem de erro ou sucesso */}
            {mensagem && (
              <motion.p
                style={{
                  ...s.mensagem,
                  color: mensagem.tipo === "erro" ? "#c44040" : "#6ba060",
                  borderColor:
                    mensagem.tipo === "erro"
                      ? "rgba(196,64,64,0.3)"
                      : "rgba(107,160,96,0.3)",
                }}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {mensagem.texto}
              </motion.p>
            )}

            <BotaoDourado tipo="submit" disabled={loading} carregando={loading}>
              {modo === "login" ? "Entrar na Ordem" : "Criar Registro"}
            </BotaoDourado>
          </motion.form>

          {/* Separador */}
          <div style={s.separador}>
            <div style={s.separadorLinha} />
            <span style={s.separadorTexto}>ou</span>
            <div style={s.separadorLinha} />
          </div>

          {/* Trocar modo */}
          <motion.button
            style={s.btnSecundario}
            onClick={() => {
              setModo(modo === "login" ? "cadastro" : "login");
              setMensagem(null);
            }}
            whileHover={{ color: "#c4a050" }}
            transition={{ duration: 0.2 }}
          >
            {modo === "login"
              ? "Ainda não tem um registro? Criar agora"
              : "← Já tenho um registro. Entrar"}
          </motion.button>

          {/* Aviso da lei da Ordem */}
          <p style={s.aviso}>
            "Nunca, em hipótese alguma, revele sua identidade Scrip a um
            Norcan."
          </p>
        </motion.div>
      </div>
    </div>
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
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  fundo: {
    position: "fixed",
    inset: 0,
    background: `
      radial-gradient(ellipse at 50% 0%,   rgba(110,65,12,0.14) 0%, transparent 55%),
      radial-gradient(ellipse at 20% 80%,  rgba(90,50,10,0.08)  0%, transparent 45%),
      radial-gradient(ellipse at 80% 30%,  rgba(60,10,10,0.08)  0%, transparent 45%)
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
  centrado: {
    position: "relative",
    zIndex: 2,
    width: "100%",
    maxWidth: "420px",
    padding: "20px",
  },
  card: {
    position: "relative",
    padding: "44px 36px 36px",
    background: "rgba(10,12,6,0.88)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: "12px",
    border: "1px solid rgba(196,160,80,0.2)",
    boxShadow:
      "0 24px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(196,160,80,0.08)",
  },
  // Linhas decorativas horizontais no topo e base do card
  cardBordaTop: {
    position: "absolute",
    top: 0,
    left: "15%",
    right: "15%",
    height: "1px",
    background:
      "linear-gradient(to right, transparent, rgba(196,160,80,0.5), transparent)",
  },
  cardBordaBottom: {
    position: "absolute",
    bottom: 0,
    left: "15%",
    right: "15%",
    height: "1px",
    background:
      "linear-gradient(to right, transparent, rgba(196,160,80,0.25), transparent)",
  },
  logoWrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "20px",
  },
  logoIcone: {
    width: "52px",
    height: "52px",
    borderRadius: "50%",
    border: "1px solid rgba(196,160,80,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.4em",
    color: "#c4a050",
    background: "rgba(196,160,80,0.05)",
    boxShadow: "0 0 20px rgba(196,160,80,0.1)",
  },
  titulo: {
    margin: "0 0 4px",
    color: "#e8d08a",
    fontSize: "1.4em",
    fontWeight: 700,
    letterSpacing: "1.5px",
  },
  subtitulo: {
    margin: 0,
    color: "#52421e",
    fontSize: "0.6em",
    letterSpacing: "4px",
  },
  divisor: {
    height: "1px",
    background:
      "linear-gradient(to right, transparent, rgba(196,160,80,0.2), transparent)",
    margin: "18px 0 14px",
  },
  modoTexto: {
    margin: 0,
    color: "#6b5530",
    fontSize: "0.75em",
    letterSpacing: "1px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  mensagem: {
    margin: 0,
    padding: "10px 14px",
    borderRadius: "4px",
    border: "1px solid",
    fontSize: "0.78em",
    lineHeight: 1.5,
    letterSpacing: "0.3px",
    background: "rgba(0,0,0,0.3)",
  },
  separador: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    margin: "22px 0 16px",
  },
  separadorLinha: {
    flex: 1,
    height: "1px",
    background: "rgba(196,160,80,0.1)",
  },
  separadorTexto: {
    fontSize: "0.7em",
    color: "#3a2e10",
    letterSpacing: "2px",
    textTransform: "uppercase",
  },
  btnSecundario: {
    background: "none",
    border: "none",
    color: "#4a3a18",
    fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
    fontSize: "0.75em",
    letterSpacing: "0.5px",
    cursor: "pointer",
    width: "100%",
    textAlign: "center",
    lineHeight: 1.5,
    padding: "4px 0",
    transition: "color 0.2s",
  },
  aviso: {
    margin: "24px 0 0",
    textAlign: "center",
    fontSize: "0.62em",
    color: "#2a2010",
    fontStyle: "italic",
    lineHeight: 1.6,
    letterSpacing: "0.3px",
  },
};
