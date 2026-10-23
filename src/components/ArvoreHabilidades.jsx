import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../supabaseClient";

const VB_W = 1000;
const VB_H = 800;
const VB_MIN_W = 120;
const VB_MAX_W = 4500;

export default function ArvoreHabilidades({ fichaId, onVoltar, onFinalizar }) {
  const [nodes, setNodes] = useState([]);
  const [requisitos, setRequisitos] = useState([]);
  const [pontosDisponiveis, setPontosDisponiveis] = useState(0);
  const [carregando, setCarregando] = useState(true);

  const svgRef = useRef(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: VB_W, h: VB_H });
  const [panning, setPanning] = useState(false);
  const panLastRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    async function carregarTudo() {
      try {
        setCarregando(true);

        // 1. Busca os dados da Ficha para saber os PH
        if (fichaId) {
          const { data: ficha, error: fErr } = await supabase
            .from("fichas")
            .select("pontos_habilidade_ph")
            .eq("id", fichaId)
            .single();
          if (ficha) setPontosDisponiveis(ficha.pontos_habilidade_ph);
        }

        // 2. Busca os Nodes e Requisitos
        const { data: nData } = await supabase.from("skill_nodes").select("*");
        const { data: rData } = await supabase
          .from("skill_requisitos")
          .select("*");

        // 3. LOGICA DE SEGURANÇA: Se o banco vier vazio, usamos os dados do seu CSV como Mock
        if (nData && nData.length > 0) {
          setNodes(nData);
          setRequisitos(rData || []);
        } else {
          // Mock baseado no seu CSV (skill_nodes_rows.csv)
          setNodes([
            {
              id: "apt_carisma",
              nome: "Carisma",
              tipo: "Aptidão",
              custo_em_ph: 1,
            },
            {
              id: "apt_medicina",
              nome: "Medicina Básica",
              tipo: "Aptidão",
              custo_em_ph: 1,
            },
            {
              id: "pas_domacao",
              nome: "Domação",
              tipo: "Passiva",
              custo_em_ph: 1,
            },
            {
              id: "pas_furtividade",
              nome: "Furtividade",
              tipo: "Passiva",
              custo_em_ph: 1,
            },
            {
              id: "ati_rastreamento",
              nome: "Rastreamento",
              tipo: "Ativa",
              custo_em_ph: 3,
            },
          ]);
        }
      } catch (err) {
        console.error("Erro ao carregar Matrix:", err);
      } finally {
        setCarregando(false);
      }
    }
    carregarTudo();
  }, [fichaId]);

  // Lógica de posição em grade (Grid) - Mais segura para depurar agora
  const getPosicao = (node, index) => {
    // Aumentamos o divisor para espalhar mais as bolinhas
    const angle = index * (360 / (nodes.length || 1)) * (Math.PI / 180);

    let radius = 300; // Raio para Passivas (Intermediário)

    if (node.tipo === "Aptidão") radius = 170; // Círculo interno
    if (node.tipo === "Ativa") radius = 430; // Círculo externo
    if (node.tipo === "Passiva") radius = 300; // Garante que elas fiquem no meio

    return {
      x: 500 + radius * Math.cos(angle),
      y: 400 + radius * Math.sin(angle),
    };
  };

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const el = svgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width;
    const my = (e.clientY - rect.top) / rect.height;
    const zoomOut = e.deltaY > 0;
    const factor = zoomOut ? 1.09 : 1 / 1.09;

    setViewBox((prev) => {
      let newW = prev.w * factor;
      let newH = prev.h * factor;
      if (newW < VB_MIN_W) {
        newW = VB_MIN_W;
        newH = (VB_MIN_W * VB_H) / VB_W;
      }
      if (newW > VB_MAX_W) {
        newW = VB_MAX_W;
        newH = (VB_MAX_W * VB_H) / VB_W;
      }
      const svgX = prev.x + mx * prev.w;
      const svgY = prev.y + my * prev.h;
      return {
        x: svgX - mx * newW,
        y: svgY - my * newH,
        w: newW,
        h: newH,
      };
    });
  }, []);

  const handlePanRectDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setPanning(true);
    panLastRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    if (!panning) return;
    const onMove = (e) => {
      const el = svgRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const last = panLastRef.current;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      panLastRef.current = { x: e.clientX, y: e.clientY };
      setViewBox((v) => ({
        ...v,
        x: v.x - (dx * v.w) / rect.width,
        y: v.y - (dy * v.h) / rect.height,
      }));
    };
    const onUp = () => setPanning(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [panning]);

  useEffect(() => {
    if (carregando) return;
    const el = svgRef.current;
    if (!el) return;
    const onWheelNative = (e) => {
      e.preventDefault();
      handleWheel(e);
    };
    el.addEventListener("wheel", onWheelNative, { passive: false });
    return () => el.removeEventListener("wheel", onWheelNative);
  }, [carregando, handleWheel]);

  if (carregando)
    return (
      <div style={{ color: "#9aa7ae", padding: "50px" }}>
        CONECTANDO À MATRIZ...
      </div>
    );

  const estrelaCamada = [
    "radial-gradient(1.2px 1.2px at 8% 12%, rgba(255,255,255,0.55), transparent)",
    "radial-gradient(1px 1px at 22% 78%, rgba(200,220,255,0.45), transparent)",
    "radial-gradient(1.5px 1.5px at 41% 23%, rgba(255,255,255,0.5), transparent)",
    "radial-gradient(1px 1px at 55% 61%, rgba(255,200,180,0.35), transparent)",
    "radial-gradient(1.2px 1.2px at 73% 14%, rgba(255,255,255,0.4), transparent)",
    "radial-gradient(1px 1px at 88% 42%, rgba(180,210,255,0.4), transparent)",
    "radial-gradient(1.3px 1.3px at 15% 55%, rgba(255,255,255,0.35), transparent)",
    "radial-gradient(1px 1px at 67% 88%, rgba(255,255,255,0.3), transparent)",
    "radial-gradient(1.8px 1.8px at 92% 72%, rgba(255,240,200,0.45), transparent)",
    "radial-gradient(1px 1px at 33% 91%, rgba(200,220,255,0.35), transparent)",
  ].join(", ");

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#05050a",
      }}
    >
      {/* Fundo PoE-like: nebulosa suave + campo estelar */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          background: `
            radial-gradient(ellipse 120% 80% at 50% -10%, rgba(35, 45, 95, 0.45) 0%, transparent 55%),
            radial-gradient(ellipse 90% 60% at 100% 100%, rgba(60, 25, 70, 0.22) 0%, transparent 50%),
            radial-gradient(ellipse 70% 50% at 0% 100%, rgba(20, 50, 65, 0.2) 0%, transparent 45%),
            linear-gradient(180deg, #06060c 0%, #0a0812 40%, #050508 100%)
          `,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          opacity: 0.85,
          backgroundImage: estrelaCamada,
          backgroundSize: "100% 100%",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          opacity: 0.12,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cpath d='M80 0 L82 78 L160 80 L82 82 L80 160 L78 82 L0 80 L78 78 Z' fill='%23ffffff'/%3E%3C/svg%3E")`,
          backgroundSize: "240px 240px",
        }}
      />

      {/* 2. HUD SUPERIOR (O Card de Pontos no cantinho) */}
      <div
        style={{
          position: "absolute",
          top: "30px",
          left: "30px",
          zIndex: 10,
          background: "rgba(20, 20, 25, 0.8)",
          padding: "20px",
          borderRadius: "16px",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 15px 35px rgba(0,0,0,0.6)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "220px",
        }}
      >
        {/* Título Skew */}
        <div
          style={{
            background: "#a8443a",
            padding: "8px 15px",
            transform: "skew(-8deg)",
            marginBottom: "15px",
            width: "100%",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              margin: 0,
              color: "#efe6cf",
              fontSize: "0.85em",
              textTransform: "uppercase",
              transform: "skew(8deg)",
              letterSpacing: "1px",
              fontWeight: "900",
            }}
          >
            Matriz de Evolução
          </h2>
        </div>

        {/* Caixa de PH (Simétrica) */}
        <div
          style={{
            width: "100%",
            background: "rgba(0,0,0,0.4)",
            padding: "12px 0",
            borderRadius: "10px",
            border: "1px solid #4CAF5088",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <span
            style={{
              color: "#e8d08a",
              fontWeight: "900",
              fontSize: "1.8em",
              lineHeight: "1",
            }}
          >
            {pontosDisponiveis}
          </span>
          <span
            style={{
              color: "#9aa7ae",
              fontSize: "0.68em",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginTop: "4px",
            }}
          >
            PH Disponíveis
          </span>
        </div>

        <button
          onClick={onVoltar}
          style={{
            background: "none",
            border: "none",
            color: "#9aa7ae",
            cursor: "pointer",
            fontSize: "0.7em",
            textDecoration: "underline",
            marginTop: "12px",
          }}
        >
          ← Voltar ao Dossiê
        </button>
      </div>

      {/* 3. SVG DA ÁRVORE (zoom roda, arrastar no fundo) */}
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Árvore de habilidades: arraste no fundo para mover, roda do mouse para zoom"
        style={{
          position: "relative",
          zIndex: 1,
          touchAction: "none",
          userSelect: "none",
        }}
      >
        <defs>
          <filter id="poeGlowApt" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="poeGlowPas" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="poeGlowAti" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.8" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="poeFillApt" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#8eff9a" stopOpacity="1" />
            <stop offset="55%" stopColor="#2e7d32" stopOpacity="1" />
            <stop offset="100%" stopColor="#0d1f12" stopOpacity="1" />
          </radialGradient>
          <radialGradient id="poeFillPas" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#82cfff" stopOpacity="1" />
            <stop offset="55%" stopColor="#1565c0" stopOpacity="1" />
            <stop offset="100%" stopColor="#0a1520" stopOpacity="1" />
          </radialGradient>
          <radialGradient id="poeFillAti" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffe082" stopOpacity="1" />
            <stop offset="55%" stopColor="#f9a825" stopOpacity="1" />
            <stop offset="100%" stopColor="#1f1508" stopOpacity="1" />
          </radialGradient>
          <filter
            id="poeLineGlow"
            x="-120%"
            y="-120%"
            width="340%"
            height="340%"
          >
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g>
          <rect
            x="0"
            y="0"
            width={VB_W}
            height={VB_H}
            fill="transparent"
            style={{ cursor: panning ? "grabbing" : "grab" }}
            onMouseDown={handlePanRectDown}
          />

          {/* LINHAS — núcleo luminoso + halo */}
          {requisitos &&
            requisitos.map((req, i) => {
              const de = nodes.find((n) => n.id === req.requisito_node_id);
              const para = nodes.find((n) => n.id === req.node_id);
              if (!de || !para) return null;
              const p1 = getPosicao(de, nodes.indexOf(de));
              const p2 = getPosicao(para, nodes.indexOf(para));
              return (
                <g key={`edge-${i}`}>
                  <line
                    pointerEvents="none"
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke="rgba(60, 180, 100, 0.45)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    filter="url(#poeLineGlow)"
                  />
                  <line
                    pointerEvents="none"
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke="rgba(200, 255, 215, 0.95)"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </g>
              );
            })}

          {/* NODES — estética jewel PoE (glow + núcleo) */}
          {nodes.map((node, i) => {
            const { x, y } = getPosicao(node, i);
            const isAtiva = node.tipo === "Ativa";
            const rOuter = isAtiva ? 24 : 16;
            const rInner = isAtiva ? 14 : 9;
            const corBorda =
              node.tipo === "Aptidão"
                ? "#6bff7e"
                : node.tipo === "Passiva"
                  ? "#64b5f6"
                  : "#ffd54f";
            const fillId =
              node.tipo === "Aptidão"
                ? "poeFillApt"
                : node.tipo === "Passiva"
                  ? "poeFillPas"
                  : "poeFillAti";
            const filt =
              node.tipo === "Aptidão"
                ? "poeGlowApt"
                : node.tipo === "Passiva"
                  ? "poeGlowPas"
                  : "poeGlowAti";
            return (
              <g
                key={node.id}
                style={{ cursor: "pointer" }}
                onClick={() => alert(`${node.nome}: ${node.descricao}`)}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={rOuter}
                  fill="none"
                  stroke={corBorda}
                  strokeWidth="1.5"
                  opacity={0.45}
                  filter={`url(#${filt})`}
                />
                <circle
                  cx={x}
                  cy={y}
                  r={rOuter - 2}
                  fill="none"
                  stroke={corBorda}
                  strokeWidth="0.6"
                  opacity={0.25}
                />
                <circle
                  cx={x}
                  cy={y}
                  r={rInner}
                  fill={`url(#${fillId})`}
                  stroke={corBorda}
                  strokeWidth={isAtiva ? 1.8 : 1.4}
                  filter={`url(#${filt})`}
                />
                <circle
                  cx={x - rInner * 0.25}
                  cy={y - rInner * 0.25}
                  r={Math.max(2, rInner * 0.22)}
                  fill="rgba(255,255,255,0.35)"
                  pointerEvents="none"
                />
                <text
                  x={x}
                  y={y + (isAtiva ? 38 : 32)}
                  fill="#e8e4dc"
                  fontSize={isAtiva ? "9" : "8"}
                  textAnchor="middle"
                  style={{
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    fontFamily: "monospace",
                    filter: "drop-shadow(0 0 4px rgba(0,0,0,0.9))",
                  }}
                >
                  {node.nome}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* BOTÃO FINALIZAR */}
      <button
        onClick={onFinalizar}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          bottom: "30px",
          right: "30px",
          zIndex: 10,
          padding: "15px 40px",
          background: "#c4a050",
          color: "#000",
          border: "none",
          borderRadius: "8px",
          fontWeight: "900",
          cursor: "pointer",
          boxShadow: "0 0 20px rgba(76, 175, 80, 0.3)",
        }}
      >
        FINALIZAR SCRIP ➔
      </button>
    </div>
  );
}
