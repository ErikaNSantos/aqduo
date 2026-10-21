import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient"; // Garante que o import do cliente está correto
import ArvoreHabilidades from "./ArvoreHabilidades";
import {
  bonusPHSequela,
  calcularEstatisticasSecundariasGURPS,
  calcularPHDisponiveisEtapa2,
} from "../utils/gurps";

export default function CriarFicha({
  userId,
  fichaExistente,
  onVoltar,
  onFichaCriada,
}) {
  // --- ESTADOS NECESSÁRIOS PARA O FUNCIONAMENTO ---
  const [etapa, setEtapa] = useState(1);
  const [linhagens, setLinhagens] = useState([]);
  const [linhagemSelecionada, setLinhagemSelecionada] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [fichaIdCriada, setFichaIdCriada] = useState(
    fichaExistente?.id || null,
  );

  // Estados da Ficha — inicializa com dados existentes se retomando
  const [nome, setNome] = useState(fichaExistente?.nome_personagem || "");
  const [pronomes, setPronomes] = useState(fichaExistente?.pronomes || "");
  const [historia, setHistoria] = useState(fichaExistente?.historia || "");
  const [aparenciaTexto, setAparenciaTexto] = useState(
    fichaExistente?.aparencia || "",
  );
  const [detalhes, setDetalhes] = useState(fichaExistente?.detalhes || "");
  const [aparenciaGuardiao, setAparenciaGuardiao] = useState(
    fichaExistente?.aparencia_guardiao || "",
  );
  const [abaAtiva, setAbaAtiva] = useState("historia");
  // Novos estados para o Card de Identidade
  const [fotoPersonagem, setFotoPersonagem] = useState(null);
  const [interprete, setInterprete] = useState(
    fichaExistente?.interprete || null,
  );

  // Estados da Etapa 4: Guardião
  const [especieGuardiao, setEspecieGuardiao] = useState(
    fichaExistente?.especie_guardiao || "",
  );
  const [camuflagemGuardiao, setCamuflagemGuardiao] = useState(
    fichaExistente?.camuflagem_guardiao || "",
  );
  const [salvandoGuardiao, setSalvandoGuardiao] = useState(false);

  // Função para ler a imagem selecionada
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPersonagem(reader.result); // Salva a imagem em base64 no estado para o preview
      };
      reader.readAsDataURL(file);
    }
  };

  const COR_FUNDO_PADRAO = "#0a0a0f"; // Mesma cor do seu index.css

  // Estado dos Atributos (GURPS) — inicializa com dados existentes se retomando
  const [atributos, setAtributos] = useState({
    ST: { valor: fichaExistente?.st_forca ?? 10, nome: "Força (ST)" },
    DX: { valor: fichaExistente?.dx_destreza ?? 10, nome: "Destreza (DX)" },
    IQ: {
      valor: fichaExistente?.iq_inteligencia ?? 10,
      nome: "Inteligência (IQ)",
    },
    HT: { valor: fichaExistente?.ht_resistencia ?? 10, nome: "Vigor (HT)" },
  });

  // Lógica de Mutações e Sequelas (Base de Dados Unificada)
  const [sequelasSelecionadas, setSequelasSelecionadas] = useState([]);
  const [listaSequelasDisponiveis, setListaSequelasDisponiveis] = useState([]);
  const [aptidaoSelecionada, setAptidaoSelecionada] = useState(null);
  const [listaAptidoesDisponiveis, setListaAptidoesDisponiveis] = useState([]);
  const [skillNodesCarregados, setSkillNodesCarregados] = useState(false);

  // Busca as sequelas no banco, com plano B (Mock) para testes
  useEffect(() => {
    async function carregarSequelas() {
      setSkillNodesCarregados(false);
      try {
        const { data: dataApt, error: errorApt } = await supabase
          .from("skill_nodes")
          .select("*")
          .ilike("tipo", "%Aptid%");

        if (errorApt) {
          console.error(
            "[CriarFicha] Erro ao carregar aptidões (skill_nodes):",
            errorApt.message || errorApt,
          );
          setListaAptidoesDisponiveis([]);
        } else if (dataApt && dataApt.length > 0) {
          setListaAptidoesDisponiveis(dataApt);
        } else {
          setListaAptidoesDisponiveis([]);
        }

        // Procura na tabela skill_nodes qualquer linha que seja do tipo "Sequela"
        const { data, error } = await supabase
          .from("skill_nodes")
          .select("*")
          .ilike("tipo", "%equela%");

        if (!error && data && data.length > 0) {
          setListaSequelasDisponiveis(data);
        } else {
          // FALLBACK: Como Lavi ainda não preencheu, injetamos mocks aqui!
          setListaSequelasDisponiveis([
            {
              id: "mock-1",
              nome: "Metabolismo Acelerado",
              custo_em_ph: -5,
              descricao: "Precisa comer o dobro.",
            },
            {
              id: "mock-2",
              nome: "Fotofobia",
              custo_em_ph: -2,
              descricao: "Penalidade severa na luz solar.",
            },
            {
              id: "mock-3",
              nome: "Pele Marcada",
              custo_em_ph: -1,
              descricao: "Aparência inumana.",
            },
            {
              id: "mock-4",
              nome: "Amnésia",
              custo_em_ph: -3,
              descricao: "Sem memórias da vida antes do colapso.",
            },
          ]);
        }
      } finally {
        setSkillNodesCarregados(true);
      }

      // Se retomando ficha existente, carrega sequelas e aptidão já salvas
      if (fichaExistente?.id) {
        try {
          const { data: skillsSalvas } = await supabase
            .from("ficha_skills")
            .select("node_id, skill_nodes(*)")
            .eq("ficha_id", fichaExistente.id);

          if (skillsSalvas && skillsSalvas.length > 0) {
            const sequelasJaSalvas = skillsSalvas
              .filter((s) =>
                s.skill_nodes?.tipo?.toLowerCase().includes("equela"),
              )
              .map((s) => s.skill_nodes);
            const aptidaoJaSalva = skillsSalvas.find((s) =>
              s.skill_nodes?.tipo?.toLowerCase().includes("aptid"),
            );

            if (sequelasJaSalvas.length > 0)
              setSequelasSelecionadas(sequelasJaSalvas);
            if (aptidaoJaSalva)
              setAptidaoSelecionada(aptidaoJaSalva.skill_nodes);
          }
        } catch (err) {
          console.error("[CriarFicha] Erro ao carregar skills salvas:", err);
        }
      }
    }
    carregarSequelas();
  }, []);

  const toggleSequela = (sequela) => {
    if (sequelasSelecionadas.find((s) => s.id === sequela.id)) {
      setSequelasSelecionadas(
        sequelasSelecionadas.filter((s) => s.id !== sequela.id),
      );
    } else {
      setSequelasSelecionadas([...sequelasSelecionadas, sequela]);
    }
  };

  // --- LÓGICA ÚNICA DE PONTOS GURPS ---
  const {
    phDisponiveis: pontosRestantes,
    pontosBonusSequelas: pontosExtras,
    custoAptidaoPH,
  } = calcularPHDisponiveisEtapa2(
    atributos.ST.valor,
    atributos.DX.valor,
    atributos.IQ.valor,
    atributos.HT.valor,
    sequelasSelecionadas,
    aptidaoSelecionada,
  );

  // Função que altera os atributos (já usando o novo pontosRestantes calculado acima)
  const alterarAtributo = (sigla, delta) => {
    const valorAtual = atributos[sigla].valor;
    if (delta > 0 && pontosRestantes <= 0) return;
    if (delta < 0 && valorAtual <= 8) return;
    setAtributos({
      ...atributos,
      [sigla]: { ...atributos[sigla], valor: valorAtual + delta },
    });
  };

  const coresCards = [
    "#673AB7",
    "#FF9800",
    "#E91E63",
    "#FFEB3B",
    "#00BCD4",
    "#9C27B0",
    "#4CAF50",
    "#F44336",
    "#2196F3",
    "#8BC34A",
    "#FF5722",
  ];

  useEffect(() => {
    async function carregarLinhagens() {
      setCarregando(true);
      const { data, error } = await supabase
        .from("linhagens_mutantes")
        .select(
          "id, nome_tribo, mito_referencia, ambiente_origem, descricao, imagem_url, ambiente_url",
        )
        .order("nome_tribo", { ascending: true });

      if (!error && data) {
        setLinhagens(data);

        // Se retomando ficha existente, popula linhagem e determina etapa
        if (fichaExistente?.raca_id) {
          const linhagemEncontrada = data.find(
            (l) => l.id === fichaExistente.raca_id,
          );
          if (linhagemEncontrada) {
            setLinhagemSelecionada(linhagemEncontrada);
          }

          // Determinar etapa: tem atributos salvos? → Etapa 3, senão → Etapa 2
          if (fichaExistente.st_forca != null) {
            setEtapa(3);
          } else {
            setEtapa(2);
          }
        }
      }
      setCarregando(false);
    }
    carregarLinhagens();
  }, []);

  const handleAvancarParaArvore = async () => {
    setSalvando(true);
    try {
      // Objeto com os dados da ficha
      const dadosFicha = {
        user_id: userId,
        nome_personagem: nome,
        pronomes: pronomes || "",
        interprete: interprete || "",
        historia: historia || "",
        aparencia: aparenciaTexto || "",
        detalhes: detalhes || "",
        aparencia_guardiao: aparenciaGuardiao || "",
        raca_id: linhagemSelecionada?.id,
        patente_ranking_id: 6,
        nivel: 1,
        pontos_habilidade_ph: pontosRestantes,
        st_forca: atributos.ST.valor,
        dx_destreza: atributos.DX.valor,
        iq_inteligencia: atributos.IQ.valor,
        ht_resistencia: atributos.HT.valor,
      };

      let fichaData, fichaError;

      if (fichaIdCriada) {
        // SE JÁ EXISTE ID, APENAS ATUALIZA (UPDATE) — não sobrescreve patente_ranking_id
        const { patente_ranking_id: _pr, ...dadosFichaUpdate } = dadosFicha;
        console.log("Atualizando ficha existente...");
        const { data, error } = await supabase
          .from("fichas")
          .update(dadosFichaUpdate)
          .eq("id", fichaIdCriada)
          .select()
          .single();
        fichaData = data;
        fichaError = error;
      } else {
        // SE NÃO EXISTE ID, CRIA UMA NOVA (INSERT)
        console.log("Criando nova ficha...");
        const { data, error } = await supabase
          .from("fichas")
          .insert([
            {
              ...dadosFicha,
              xp: 0,
              cash_rs: 200,
              pontos_raca_pr: 0,
              vigor_atual: atributos.HT.valor,
              mana_atual: atributos.HT.valor,
              cristal_metamorfico_equipado: false,
            },
          ])
          .select()
          .single();
        fichaData = data;
        fichaError = error;
      }

      if (fichaError) throw fichaError;

      if (fichaData) {
        setFichaIdCriada(fichaData.id);

        // ATUALIZAÇÃO DAS SEQUELAS (Limpamos as antigas e inserimos as novas para não duplicar)
        if (sequelasSelecionadas.length > 0) {
          // 1. Deleta as relações antigas dessa ficha
          await supabase
            .from("ficha_skills")
            .delete()
            .eq("ficha_id", fichaData.id);

          // 2. Insere as atuais
          const skillsToInsert = sequelasSelecionadas.map((seq) => ({
            ficha_id: fichaData.id,
            node_id: seq.id,
          }));
          await supabase.from("ficha_skills").insert(skillsToInsert);
        }

        if (aptidaoSelecionada) {
          await supabase.from("ficha_skills").insert([
            {
              ficha_id: fichaData.id,
              node_id: aptidaoSelecionada.id,
            },
          ]);
        }

        setEtapa(3);
      }
    } catch (error) {
      console.error("Erro:", error);
      alert(error.message);
    } finally {
      setSalvando(false);
    }
  };

  // ==========================================
  // RENDERIZAÇÃO DA ETAPA 1: QUEM É VOCÊ?
  // ==========================================
  if (etapa === 1) {
    return (
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          textAlign: "center",
          padding: "20px",
        }}
      >
        {/* Título com Skew (Seu Layout Original) */}
        <div
          style={{
            display: "inline-block",
            background: "#ff0000",
            padding: "10px 30px",
            transform: "skew(-5deg)",
            marginBottom: "40px",
            boxShadow: "0 4px 15px rgba(255,0,0,0.3)",
          }}
        >
          <h1
            style={{
              margin: 0,
              color: "#fff",
              fontSize: "2.2em",
              textTransform: "uppercase",
              transform: "skew(5deg)",
              letterSpacing: "2px",
            }}
          >
            Quem é você?
          </h1>
        </div>

        {carregando ? (
          <p style={{ color: "#4CAF50" }}>Consultando registros da Ordem...</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "25px",
              paddingBottom: "40px",
            }}
          >
            {linhagens.map((l, index) => (
              <div
                key={l.id}
                onClick={() => {
                  setLinhagemSelecionada(l);
                  setEtapa(2);
                }}
                style={{
                  height: "450px",
                  borderRadius: "16px",
                  border: `2px solid ${coresCards[index % coresCards.length]}`,
                  background: l.imagem_url
                    ? `linear-gradient(to top, rgba(0,0,0,0.95) 20%, rgba(0,0,0,0.2) 100%), url(${l.imagem_url})`
                    : "#000",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  textAlign: "left",
                  overflow: "hidden",
                  position: "relative",
                  transition: "all 0.3s ease",
                  boxShadow: "0 10px 20px rgba(0,0,0,0.5)",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-10px)";
                  e.currentTarget.style.boxShadow = `0 15px 30px ${coresCards[index % coresCards.length]}44`;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 10px 20px rgba(0,0,0,0.5)";
                }}
              >
                {/* Informações da Lore dinâmicas do Banco */}
                <div style={{ padding: "20px" }}>
                  <span
                    style={{
                      color: coresCards[index % coresCards.length],
                      fontSize: "0.75em",
                      textTransform: "uppercase",
                      fontWeight: "bold",
                      letterSpacing: "1px",
                    }}
                  >
                    Mito: {l.mito_referencia}
                  </span>

                  <h3
                    style={{
                      color: "#fff",
                      margin: "5px 0",
                      fontSize: "1.8em",
                      textTransform: "uppercase",
                      textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                    }}
                  >
                    {l.nome_tribo}
                  </h3>

                  <p
                    style={{
                      color: "#4CAF50",
                      fontSize: "0.85em",
                      marginBottom: "12px",
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    📍 {l.ambiente_origem}
                  </p>

                  <p
                    style={{
                      color: "#ccc",
                      fontSize: "0.85em",
                      lineHeight: "1.4",
                      margin: 0,
                      display: "-webkit-box",
                      WebkitLineClamp: "var(--line-clamp, 3)",
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      transition: "all 0.3s ease",
                      maxHeight: "var(--max-h, 3.8em)", // 3 linhas x 1.4 de line-height aprox.
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.setProperty("--line-clamp", "none");
                      e.currentTarget.style.setProperty("--max-h", "1000px");
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.setProperty("--line-clamp", "3");
                      e.currentTarget.style.setProperty("--max-h", "3.8em");
                    }}
                  >
                    {l.descricao}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  // ===============================================
  // RENDERIZAÇÃO DA ETAPA 2: FICHA DO PERSONAGEM
  // ===============================================
  if (etapa === 2) {
    const corLinhagem =
      coresCards[linhagens.indexOf(linhagemSelecionada) % coresCards.length];

    const { pv, pfMax, vontade, percepcao, velocidadeBasica, esquiva } =
      calcularEstatisticasSecundariasGURPS({
        st: atributos.ST.valor,
        dx: atributos.DX.valor,
        iq: atributos.IQ.valor,
        ht: atributos.HT.valor,
      });

    return (
      <div
        style={{
          width: "100%",
          minHeight: "100vh",
          padding: "60px 20px",
          display: "flex",
          justifyContent: "center",
          position: "relative", // Importante para organizar as camadas
        }}
      >
        {/* CAMADA DE FUNDO FIXA (Ignora bordas e ocupa a tela toda) */}
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundImage: `linear-gradient(to bottom, rgba(10,10,15,0.4), rgba(10,10,15,0.9)), url('${linhagemSelecionada.ambiente_url}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            zIndex: 0, // <-- Zero garante que não suma atrás do fundo do site
            pointerEvents: "none", // <-- Evita que essa camada bloqueie seus cliques
          }}
        />
        {/* CONTAINER DA FICHA (EFEITO VIDRO) */}
        <div
          style={{
            position: "relative", // <-- Garante que a ficha flutue
            zIndex: 1, // <-- Fica por cima da imagem de fundo
            maxWidth: "1200px",
            width: "100%",
            background: "rgba(15, 15, 20, 0.55)",
            backdropFilter: "blur(30px)",
            borderRadius: "24px",
            border: `1px solid ${corLinhagem}44`,
            boxShadow: `0 0 80px rgba(0,0,0,1)`,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* HEADER DA FICHA */}
          <div
            style={{
              padding: "30px 40px",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <span
                style={{
                  color: corLinhagem,
                  fontWeight: "800",
                  fontSize: "0.7em",
                  textTransform: "uppercase",
                  letterSpacing: "3px",
                }}
              >
                Dossiê Scrip: Nível 01
              </span>
              <h2
                style={{
                  color: "#fff",
                  fontSize: "2.5em",
                  margin: "5px 0",
                  textTransform: "uppercase",
                }}
              >
                {linhagemSelecionada.nome_tribo}
              </h2>
              <p
                style={{
                  color: "#4CAF50",
                  fontSize: "0.85em",
                  fontWeight: "bold",
                }}
              >
                📍 {linhagemSelecionada.ambiente_origem}
              </p>
            </div>
            <div
              style={{
                textAlign: "center",
                background: "rgba(0,0,0,0.4)",
                padding: "15px 25px",
                borderRadius: "15px",
                border: `1px solid ${corLinhagem}aa`,
              }}
            >
              <span
                style={{
                  fontSize: "2.5em",
                  fontWeight: "900",
                  color: pontosRestantes >= 0 ? "#4CAF50" : "#f44336",
                }}
              >
                {pontosRestantes}
              </span>
              <span
                style={{
                  display: "block",
                  fontSize: "0.65em",
                  color: "#888",
                  textTransform: "uppercase",
                }}
              >
                PH Disponíveis
              </span>
              {custoAptidaoPH > 0 && (
                <span
                  style={{
                    display: "block",
                    fontSize: "0.6em",
                    color: "#aaa",
                    marginTop: "6px",
                  }}
                >
                  (inclui −{custoAptidaoPH} PH da aptidão inicial)
                </span>
              )}
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1.8fr",
              gap: "40px",
              padding: "40px",
            }}
          >
            {/* COLUNA 1: IDENTIDADE E HISTÓRIA */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "25px",
              }}
            >
              {/* FOTO E DADOS BÁSICOS (CORRIGIDO PARA COMBINAR COM O RESTO) */}
              <div
                style={{
                  display: "flex",
                  gap: "20px",
                  alignItems: "center",
                  background: "rgba(0,0,0,0.3)", // <-- Cinza escuro transparente para combinar!
                  padding: "20px",
                  borderRadius: "15px", // <-- Borda mais suave
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <label style={{ cursor: "pointer", position: "relative" }}>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleImageUpload}
                  />
                  <div
                    style={{
                      width: "100px",
                      height: "100px",
                      borderRadius: "50%",
                      background: fotoPersonagem
                        ? `url(${fotoPersonagem}) center/cover`
                        : "#111",
                      border: fotoPersonagem
                        ? "none"
                        : `2px dashed ${corLinhagem}`,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      overflow: "hidden",
                      transition: "all 0.3s",
                    }}
                  >
                    {!fotoPersonagem && (
                      <span
                        style={{
                          color: "#fff",
                          fontSize: "0.6em",
                          opacity: 0.5,
                        }}
                      >
                        SEM FOTO
                      </span>
                    )}
                  </div>
                </label>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: "15px",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <label
                      style={{
                        color: "#888",
                        fontSize: "0.7em",
                        marginBottom: "5px",
                        textTransform: "uppercase",
                      }}
                    >
                      Codinome
                    </label>
                    <input
                      type="text"
                      value={nome || ""}
                      onChange={(e) => setNome(e.target.value)}
                      style={{
                        width: "100%",
                        background: "rgba(255,255,255,0.05)",
                        border: "none",
                        borderBottom: `2px solid ${corLinhagem}55`,
                        padding: "10px",
                        borderRadius: "4px",
                        color: "#fff",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "15px" }}>
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <label
                        style={{
                          color: "#888",
                          fontSize: "0.7em",
                          marginBottom: "5px",
                          textTransform: "uppercase",
                        }}
                      >
                        Pronomes
                      </label>
                      <input
                        type="text"
                        value={pronomes || ""}
                        onChange={(e) => setPronomes(e.target.value)}
                        style={{
                          width: "100%",
                          background: "rgba(255,255,255,0.05)",
                          border: "none",
                          borderBottom: `2px solid ${corLinhagem}33`,
                          padding: "10px",
                          borderRadius: "4px",
                          color: "#ccc",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <label
                        style={{
                          color: "#888",
                          fontSize: "0.7em",
                          marginBottom: "5px",
                          textTransform: "uppercase",
                        }}
                      >
                        Intérprete
                      </label>
                      <input
                        type="text"
                        value={interprete || ""}
                        onChange={(e) => setInterprete(e.target.value)}
                        style={{
                          width: "100%",
                          background: "rgba(255,255,255,0.05)",
                          border: "none",
                          borderBottom: `2px solid ${corLinhagem}33`,
                          padding: "10px",
                          borderRadius: "4px",
                          color: "#ccc",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ABAS DE TEXTO */}
              <div
                style={{
                  background: "rgba(0,0,0,0.4)",
                  borderRadius: "15px",
                  border: "1px solid #222",
                  overflow: "hidden",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  {["historia", "aparencia", "detalhes"].map((aba) => (
                    <button
                      key={aba}
                      onClick={() => setAbaAtiva(aba)}
                      style={{
                        flex: 1,
                        padding: "12px",
                        background:
                          abaAtiva === aba
                            ? "rgba(255,255,255,0.05)"
                            : "transparent",
                        color: abaAtiva === aba ? corLinhagem : "#666",
                        border: "none",
                        borderBottom:
                          abaAtiva === aba
                            ? `2px solid ${corLinhagem}`
                            : "none",
                        cursor: "pointer",
                        textTransform: "uppercase",
                        fontSize: "0.75em",
                        fontWeight: "bold",
                      }}
                    >
                      {aba}
                    </button>
                  ))}
                </div>
                <textarea
                  value={
                    abaAtiva === "historia"
                      ? historia || ""
                      : abaAtiva === "aparencia"
                        ? aparenciaTexto || ""
                        : detalhes || ""
                  }
                  onChange={(e) => {
                    if (abaAtiva === "historia") setHistoria(e.target.value);
                    else if (abaAtiva === "aparencia")
                      setAparenciaTexto(e.target.value);
                    else setDetalhes(e.target.value);
                  }}
                  placeholder={
                    abaAtiva === "historia"
                      ? "Escreva aqui a biografia, a origem e o passado do seu personagem..."
                      : abaAtiva === "aparencia"
                        ? "Descreva os traços físicos, roupas, marcas e o estilo geral do personagem..."
                        : "Descreva tiques, manias, medos, motivações, laços ou itens de valor sentimental... aqui é onde você anota, por exemplo, que seu personagem tem o costume de fumar um cachimbo específico após as refeições, que carrega um anel antigo herdado de um tio misterioso, ou que sente um desconforto irracional ao passar muito tempo no escuro de cavernas profundas. É puramente interpretativo."
                  }
                  style={{
                    width: "100%",
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    padding: "20px",
                    color: "#ccc",
                    resize: "none",
                    outline: "none",
                    lineHeight: "1.6",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                <label
                  style={{
                    color: "#888",
                    fontSize: "0.7em",
                    marginBottom: "5px",
                    textTransform: "uppercase",
                  }}
                >
                  Aparência do Guardião
                </label>
                <textarea
                  rows={2}
                  value={aparenciaGuardiao || ""}
                  onChange={(e) => setAparenciaGuardiao(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.05)",
                    border: "none",
                    borderBottom: `2px solid ${corLinhagem}55`,
                    padding: "10px",
                    borderRadius: "4px",
                    color: "#fff",
                    resize: "none",
                    outline: "none",
                    lineHeight: "1.5",
                  }}
                />
              </div>
            </div>
            {/* COLUNA 2: MECÂNICA GURPS */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "25px",
              }}
            >
              {/* ATRIBUTOS SECUNDÁRIOS */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "15px",
                }}
              >
                {[
                  { label: "Vida (PV)", val: pv, color: "#f44336" },
                  { label: "Fadiga (PF)", val: pfMax, color: "#2196f3" },
                  { label: "Esquiva", val: esquiva, color: "#ff9800" },
                  { label: "Vontade", val: vontade, color: "#9c27b0" },
                  { label: "Percepção", val: percepcao, color: "#ffeb3b" },
                  {
                    label: "Velocidade",
                    val: velocidadeBasica.toFixed(2),
                    color: "#4caf50",
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      padding: "12px",
                      borderRadius: "10px",
                      borderLeft: `4px solid ${stat.color}`,
                      textAlign: "center",
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        fontSize: "0.6em",
                        color: "#888",
                        textTransform: "uppercase",
                      }}
                    >
                      {stat.label}
                    </span>
                    <span
                      style={{
                        fontSize: "1.3em",
                        fontWeight: "bold",
                        color: "#fff",
                      }}
                    >
                      {stat.val}
                    </span>
                  </div>
                ))}
              </div>

              {/* ATRIBUTOS PRINCIPAIS */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "15px",
                }}
              >
                {Object.keys(atributos).map((sigla) => (
                  <div
                    key={sigla}
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      padding: "15px",
                      borderRadius: "12px",
                      border: "1px solid #333",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ color: "#fff", fontWeight: "bold" }}>
                      {sigla}
                    </span>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <button
                        onClick={() => alterarAtributo(sigla, -1)}
                        style={{
                          background: "#222",
                          color: "#fff",
                          border: "1px solid #444",
                          padding: "5px 12px",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        -
                      </button>
                      <span
                        style={{
                          minWidth: "20px",
                          textAlign: "center",
                          color: corLinhagem,
                          fontWeight: "bold",
                          fontSize: "1.2em",
                        }}
                      >
                        {atributos[sigla].valor}
                      </span>
                      <button
                        onClick={() => alterarAtributo(sigla, 1)}
                        style={{
                          background: corLinhagem,
                          color: "#000",
                          border: "none",
                          padding: "5px 12px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontWeight: "bold",
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* APTIDÃO INICIAL */}
              <div
                style={{
                  background: "rgba(0,0,0,0.4)",
                  borderRadius: "15px",
                  border: "1px solid #222",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    marginBottom: "15px",
                    borderBottom: "1px solid #333",
                    paddingBottom: "10px",
                  }}
                >
                  <h3
                    style={{
                      color: "#888",
                      fontSize: "0.75em",
                      textTransform: "uppercase",
                      margin: 0,
                    }}
                  >
                    Aptidão Inicial
                  </h3>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: "8px",
                    overflowY: "auto",
                    maxHeight: "180px",
                    paddingRight: "5px",
                  }}
                >
                  {listaAptidoesDisponiveis.map((apt) => {
                    const isSelecionada = aptidaoSelecionada?.id === apt.id;
                    const custoPh = apt.custo_em_ph;

                    return (
                      <div
                        key={apt.id}
                        onClick={() =>
                          setAptidaoSelecionada(isSelecionada ? null : apt)
                        }
                        style={{
                          background: isSelecionada
                            ? `${corLinhagem}33`
                            : "rgba(255,255,255,0.02)",
                          border: `1px solid ${isSelecionada ? corLinhagem : "#333"}`,
                          padding: "10px 15px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          transition: "all 0.2s",
                        }}
                      >
                        <div
                          style={{ display: "flex", flexDirection: "column" }}
                        >
                          <span
                            style={{
                              color: isSelecionada ? "#fff" : "#ccc",
                              fontWeight: "bold",
                              fontSize: "0.85em",
                            }}
                          >
                            {apt.nome}
                          </span>
                          <span style={{ color: "#666", fontSize: "0.7em" }}>
                            {apt.descricao}
                          </span>
                        </div>
                        {custoPh != null && Number(custoPh) > 0 && (
                          <div
                            style={{
                              background: isSelecionada ? corLinhagem : "#222",
                              color: isSelecionada ? "#000" : "#888",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "0.8em",
                              fontWeight: "bold",
                              flexShrink: 0,
                              marginLeft: "8px",
                            }}
                          >
                            −{custoPh} PH
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {skillNodesCarregados &&
                  listaAptidoesDisponiveis.length === 0 && (
                    <p
                      style={{
                        color: "#888",
                        fontSize: "0.8em",
                        margin: "10px 0 0 0",
                        textAlign: "center",
                      }}
                    >
                      Nenhuma aptidão listada. Confira permissões (RLS) em
                      skill_nodes ou o campo tipo no Supabase.
                    </p>
                  )}
              </div>

              {/* VANTAGENS E DESVANTAGENS */}
              <div
                style={{
                  background: "rgba(0,0,0,0.4)",
                  borderRadius: "15px",
                  border: "1px solid #222",
                  padding: "20px",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "15px",
                    borderBottom: "1px solid #333",
                    paddingBottom: "10px",
                  }}
                >
                  <h3
                    style={{
                      color: "#888",
                      fontSize: "0.75em",
                      textTransform: "uppercase",
                      margin: 0,
                    }}
                  >
                    Sequelas Adicionais (+PH)
                  </h3>
                  <span
                    style={{
                      fontSize: "0.8em",
                      color: corLinhagem,
                      fontWeight: "bold",
                    }}
                  >
                    +{pontosExtras} PH Bônus
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    overflowY: "auto",
                    maxHeight: "180px",
                    paddingRight: "5px",
                  }}
                >
                  {listaSequelasDisponiveis.map((sequela) => {
                    const isSelecionada = sequelasSelecionadas.some(
                      (s) => s.id === sequela.id,
                    );
                    const bonusValor = bonusPHSequela(sequela.custo_em_ph);

                    return (
                      <div
                        key={sequela.id}
                        onClick={() => toggleSequela(sequela)}
                        style={{
                          background: isSelecionada
                            ? `${corLinhagem}33`
                            : "rgba(255,255,255,0.02)",
                          border: `1px solid ${isSelecionada ? corLinhagem : "#333"}`,
                          padding: "10px 15px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          transition: "all 0.2s",
                        }}
                      >
                        <div
                          style={{ display: "flex", flexDirection: "column" }}
                        >
                          <span
                            style={{
                              color: isSelecionada ? "#fff" : "#ccc",
                              fontWeight: "bold",
                              fontSize: "0.85em",
                            }}
                          >
                            {sequela.nome}
                          </span>
                          <span style={{ color: "#666", fontSize: "0.7em" }}>
                            {sequela.descricao}
                          </span>
                        </div>
                        <div
                          style={{
                            background: isSelecionada ? corLinhagem : "#222",
                            color: isSelecionada ? "#000" : "#888",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "0.8em",
                            fontWeight: "bold",
                          }}
                        >
                          +{bonusValor}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div
                style={{
                  marginTop: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <button
                  onClick={handleAvancarParaArvore}
                  disabled={
                    salvando ||
                    !nome ||
                    pontosRestantes < 0 ||
                    !aptidaoSelecionada
                  }
                  style={{
                    padding: "25px",
                    background: corLinhagem,
                    color: "#000",
                    border: "none",
                    borderRadius: "12px",
                    fontWeight: "900",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    boxShadow: `0 10px 30px ${corLinhagem}44`,
                  }}
                >
                  {salvando ? "PROCESSANDO..." : "AVANÇAR PARA HABILIDADES ➔"}
                </button>
                <button
                  onClick={() => setEtapa(1)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#888",
                    cursor: "pointer",
                    fontSize: "0.8em",
                    textTransform: "uppercase",
                    textDecoration: "underline",
                  }}
                >
                  Escolher outra mutação
                </button>
              </div>
            </div>{" "}
            {/* FECHA COLUNA 2 */}
          </div>{" "}
          {/* FECHA GRID PRINCIPAL */}
        </div>{" "}
        {/* FECHA CONTAINER VIDRO */}
      </div> // FECHA DIV DE FUNDO
    ); // FECHA O RETURN DA ETAPA 2
  } // FECHA O IF (ETAPA === 2)

  // ===============================================
  // ETAPA 3: ÁRVORE DE HABILIDADES
  // ===============================================
  if (etapa === 3) {
    return (
      <ArvoreHabilidades
        fichaId={fichaIdCriada}
        pontosIniciais={pontosRestantes}
        onVoltar={() => setEtapa(2)}
        onFinalizar={() => setEtapa(4)}
      />
    );
  }

  // ===============================================
  // ETAPA 4: VÍNCULO COM O GUARDIÃO
  // ===============================================
  if (etapa === 4) {
    const corLinhagem =
      coresCards[linhagens.indexOf(linhagemSelecionada) % coresCards.length] ||
      "#c4a050";

    const podeFinalizarGuardiao =
      especieGuardiao.trim().length > 0 &&
      aparenciaGuardiao.trim().length > 0 &&
      camuflagemGuardiao.trim().length > 0;

    const handleFinalizarScrip = async () => {
      setSalvandoGuardiao(true);
      try {
        const { error } = await supabase
          .from("fichas")
          .update({
            especie_guardiao: especieGuardiao.trim(),
            aparencia_guardiao: aparenciaGuardiao.trim(),
            camuflagem_guardiao: camuflagemGuardiao.trim(),
            status: "completa",
          })
          .eq("id", fichaIdCriada);

        if (error) throw error;
        onFichaCriada();
      } catch (err) {
        console.error("Erro ao finalizar:", err);
        alert("Erro ao salvar Guardião: " + err.message);
      } finally {
        setSalvandoGuardiao(false);
      }
    };

    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(180deg, #05050a 0%, #0a0812 40%, #050508 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
        }}
      >
        <div
          style={{
            maxWidth: "640px",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "28px",
          }}
        >
          {/* TÍTULO RITUALÍSTICO */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "2.8em",
                color: corLinhagem,
                marginBottom: "8px",
                filter: `drop-shadow(0 0 12px ${corLinhagem}66)`,
              }}
            >
              ◈
            </div>
            <h1
              style={{
                margin: 0,
                fontFamily: "'EB Garamond', 'Palatino Linotype', serif",
                fontSize: "1.6em",
                fontWeight: 700,
                color: "#e8e4dc",
                letterSpacing: "3px",
                textTransform: "uppercase",
              }}
            >
              O Vínculo
            </h1>
            <p
              style={{
                margin: "8px 0 0",
                fontFamily: "'Crimson Pro', 'Palatino Linotype', serif",
                fontSize: "0.85em",
                color: "#5a5040",
                lineHeight: 1.6,
                maxWidth: "460px",
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              Todo Scrip carrega consigo um espírito ancestral — seu Guardião.
              Descreva a criatura que caminhou até você através dos séculos.
            </p>
          </div>

          {/* CARD PRINCIPAL */}
          <div
            style={{
              background: "rgba(10,12,6,0.88)",
              border: `1px solid ${corLinhagem}25`,
              borderRadius: "9px",
              padding: "32px 28px",
              boxShadow: `0 20px 50px rgba(0,0,0,0.6), 0 0 40px ${corLinhagem}08`,
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            {/* CAMPO 1: ESPÉCIE */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.6em",
                  fontWeight: 700,
                  letterSpacing: "2.5px",
                  textTransform: "uppercase",
                  color: corLinhagem,
                  marginBottom: "8px",
                  fontFamily: "'Palatino Linotype', serif",
                }}
              >
                Espécie do Guardião
              </label>
              <input
                type="text"
                value={especieGuardiao}
                onChange={(e) => setEspecieGuardiao(e.target.value)}
                placeholder="Ex: Lobo, Coruja, Serpente, Raposa..."
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  background: "rgba(0,0,0,0.3)",
                  border: `1px solid ${corLinhagem}30`,
                  borderRadius: "5px",
                  color: "#e8e4dc",
                  fontFamily: "'Crimson Pro', 'Palatino Linotype', serif",
                  fontSize: "0.95em",
                  outline: "none",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = `${corLinhagem}88`)
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = `${corLinhagem}30`)
                }
              />
            </div>

            {/* CAMPO 2: APARÊNCIA */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.6em",
                  fontWeight: 700,
                  letterSpacing: "2.5px",
                  textTransform: "uppercase",
                  color: corLinhagem,
                  marginBottom: "8px",
                  fontFamily: "'Palatino Linotype', serif",
                }}
              >
                Aparência do Guardião
              </label>
              <textarea
                value={aparenciaGuardiao}
                onChange={(e) => setAparenciaGuardiao(e.target.value)}
                placeholder="Descreva a aparência: cor da pelagem/penas/escamas, tamanho, marcas especiais, olhos..."
                rows={4}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  background: "rgba(0,0,0,0.3)",
                  border: `1px solid ${corLinhagem}30`,
                  borderRadius: "5px",
                  color: "#e8e4dc",
                  fontFamily: "'Crimson Pro', 'Palatino Linotype', serif",
                  fontSize: "0.95em",
                  outline: "none",
                  resize: "vertical",
                  minHeight: "90px",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = `${corLinhagem}88`)
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = `${corLinhagem}30`)
                }
              />
            </div>

            {/* CAMPO 3: CAMUFLAGEM */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.6em",
                  fontWeight: 700,
                  letterSpacing: "2.5px",
                  textTransform: "uppercase",
                  color: corLinhagem,
                  marginBottom: "8px",
                  fontFamily: "'Palatino Linotype', serif",
                }}
              >
                Forma de Camuflagem
              </label>
              <input
                type="text"
                value={camuflagemGuardiao}
                onChange={(e) => setCamuflagemGuardiao(e.target.value)}
                placeholder="Ex: Um anel de prata, uma tatuagem no pulso, um par de óculos..."
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  background: "rgba(0,0,0,0.3)",
                  border: `1px solid ${corLinhagem}30`,
                  borderRadius: "5px",
                  color: "#e8e4dc",
                  fontFamily: "'Crimson Pro', 'Palatino Linotype', serif",
                  fontSize: "0.95em",
                  outline: "none",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = `${corLinhagem}88`)
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = `${corLinhagem}30`)
                }
              />
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: "0.65em",
                  color: "#4a4030",
                  fontStyle: "italic",
                }}
              >
                A camuflagem transforma o Guardião em um objeto cotidiano para
                uso em território Norcan. Esta forma é gratuita.
              </p>
            </div>
          </div>

          {/* BOTÕES */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <button
              onClick={handleFinalizarScrip}
              disabled={!podeFinalizarGuardiao || salvandoGuardiao}
              style={{
                width: "100%",
                padding: "18px",
                background: podeFinalizarGuardiao
                  ? `linear-gradient(135deg, ${corLinhagem}20 0%, ${corLinhagem}40 100%)`
                  : "rgba(40,40,40,0.5)",
                color: podeFinalizarGuardiao ? "#e8e4dc" : "#555",
                border: podeFinalizarGuardiao
                  ? `1px solid ${corLinhagem}66`
                  : "1px solid rgba(80,80,80,0.3)",
                borderRadius: "5px",
                fontFamily: "'EB Garamond', 'Palatino Linotype', serif",
                fontSize: "0.9em",
                fontWeight: 700,
                letterSpacing: "2.5px",
                textTransform: "uppercase",
                cursor: podeFinalizarGuardiao ? "pointer" : "not-allowed",
                transition: "all 0.3s",
                boxShadow: podeFinalizarGuardiao
                  ? `0 0 20px ${corLinhagem}15`
                  : "none",
              }}
            >
              {salvandoGuardiao ? "SELANDO O VÍNCULO..." : "FINALIZAR SCRIP ◈"}
            </button>
            <button
              onClick={() => setEtapa(3)}
              style={{
                background: "transparent",
                border: "none",
                color: "#555",
                cursor: "pointer",
                fontSize: "0.75em",
                fontFamily: "'Palatino Linotype', serif",
                textDecoration: "underline",
                letterSpacing: "1px",
              }}
            >
              ← Voltar à Árvore
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Failsafe (caso a etapa seja diferente de 1, 2, 3 ou 4)
  return null;
}
