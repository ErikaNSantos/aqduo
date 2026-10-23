import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import TelaInicial from "./components/TelaInicial";
import Auth from "./components/Auth";
//import Dashboard from "./components/Dashboard";
import PainelPrincipal from "./components/PainelPrincipal";

function App() {
  const [session, setSession] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setCarregando(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((evento, session) => {
      setSession(session);
      // só redireciona quando a pessoa entra ou sai; ao abrir a página, cada rota decide
      if (evento === "SIGNED_IN" && window.location.pathname.endsWith("/entrar")) navigate("/app", { replace: true });
      if (evento === "SIGNED_OUT") navigate("/", { replace: true });
    });

    return () => subscription.unsubscribe();
  }, []);

  if (carregando) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#070906",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#c4a050",
          fontFamily: "'Palatino Linotype', serif",
          letterSpacing: "4px",
          fontSize: "0.75em",
        }}
      >
        CARREGANDO A ORDEM...
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={<TelaInicial onEntrar={() => navigate("/entrar")} />}
      />
      <Route
        path="/entrar"
        element={session ? <Navigate to="/app" replace /> : <Auth />}
      />
      <Route
        path="/app/*"
        element={
          session ? (
            //<Dashboard session={session} />
            <PainelPrincipal session={session} onSair={() => supabase.auth.signOut()} />
          ) : (
            <Navigate to="/entrar" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
