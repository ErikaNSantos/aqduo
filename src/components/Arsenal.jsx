import React, { useState } from "react";

// O catálogo completo com mais de 50 itens de adolescentes + Equipamentos da Ordem
const catalogoGeral = [
  // Tecnologia e Eletrônicos
  {
    id: 101,
    nome: "Smartphone (Tela trincada)",
    tipo: "utilitario",
    peso: 0.2,
  },
  { id: 102, nome: "Carregador de parede", tipo: "utilitario", peso: 0.1 },
  {
    id: 103,
    nome: "Carregador Portátil (Powerbank)",
    tipo: "utilitario",
    peso: 0.3,
  },
  { id: 104, nome: "Fones de Ouvido Bluetooth", tipo: "acessorio", peso: 0.1 },
  { id: 105, nome: "Fones de Ouvido com fio", tipo: "acessorio", peso: 0.1 },
  { id: 106, nome: "Cabo USB-C extra", tipo: "utilitario", peso: 0.1 },
  {
    id: 107,
    nome: "Smartwatch / Pulseira fitness",
    tipo: "acessorio",
    peso: 0.1,
  },
  { id: 108, nome: "Nintendo Switch", tipo: "utilitario", peso: 0.4 },
  { id: 109, nome: "Pen drive", tipo: "utilitario", peso: 0.05 },
  { id: 110, nome: "Capinha de celular extra", tipo: "utilitario", peso: 0.1 },

  // Escola e Estudos
  { id: 111, nome: "Mochila Escolar Surrada", tipo: "utilitario", peso: 1.0 },
  { id: 112, nome: "Cadernos universitários", tipo: "utilitario", peso: 2.5 },
  { id: 113, nome: "Estojo lotado", tipo: "utilitario", peso: 0.5 },
  { id: 114, nome: "Calculadora científica", tipo: "utilitario", peso: 0.2 },
  { id: 115, nome: "Livro didático grosso", tipo: "utilitario", peso: 1.5 },
  { id: 116, nome: "Marca-textos neon", tipo: "utilitario", peso: 0.1 },
  {
    id: 117,
    nome: "Régua de 30cm em acrílico",
    tipo: "arma",
    peso: 0.1,
    dano: "Bal-2 cort",
  },
  { id: 118, nome: "Carteirinha de estudante", tipo: "utilitario", peso: 0.05 },
  { id: 119, nome: "Bloco de Post-its", tipo: "utilitario", peso: 0.1 },
  { id: 120, nome: "Garrafa térmica (Cheia)", tipo: "utilitario", peso: 0.8 },

  // Esportes e Hobbies
  { id: 121, nome: "Skate", tipo: "utilitario", peso: 2.5 },
  { id: 122, nome: "Bola de Vôlei", tipo: "utilitario", peso: 0.3 },
  { id: 123, nome: "Bola de Basquete", tipo: "utilitario", peso: 0.6 },
  { id: 124, nome: "Isotônico (Gatorade)", tipo: "utilitario", peso: 0.5 },
  {
    id: 125,
    nome: "Joelheiras e Cotoveleiras",
    tipo: "acessorio",
    peso: 0.5,
    rd: 1,
  },
  { id: 126, nome: "Óculos de natação", tipo: "acessorio", peso: 0.1 },
  { id: 127, nome: "Corda de pular", tipo: "utilitario", peso: 0.3 },
  {
    id: 128,
    nome: "Sketchbook (caderno de desenho)",
    tipo: "utilitario",
    peso: 0.4,
  },
  {
    id: 129,
    nome: "Estojo de marcadores artísticos",
    tipo: "utilitario",
    peso: 0.4,
  },
  { id: 130, nome: "Palhetas de guitarra", tipo: "utilitario", peso: 0.05 },
  { id: 131, nome: "Livro de fantasia / Mangá", tipo: "utilitario", peso: 0.3 },

  // Sobrevivência Urbana e Guloseimas
  { id: 132, nome: "Pacote de chiclete", tipo: "utilitario", peso: 0.05 },
  { id: 133, nome: "Barra de proteína", tipo: "utilitario", peso: 0.1 },
  { id: 134, nome: "Salgadinho (Doritos)", tipo: "utilitario", peso: 0.1 },
  { id: 135, nome: "Energético (Monster)", tipo: "utilitario", peso: 0.5 },
  {
    id: 136,
    nome: "Chaves com chaveiro barulhento",
    tipo: "utilitario",
    peso: 0.2,
  },
  {
    id: 137,
    nome: "Cartão de transporte público",
    tipo: "utilitario",
    peso: 0.05,
  },
  { id: 138, nome: "Dinheiro e moedas soltas", tipo: "utilitario", peso: 0.2 },
  { id: 139, nome: "Carteira quase vazia", tipo: "utilitario", peso: 0.1 },
  { id: 140, nome: "Guarda-chuva dobrável", tipo: "utilitario", peso: 0.4 },
  { id: 141, nome: "Óculos de sol", tipo: "acessorio", peso: 0.1 },

  // Cuidados Pessoais e "Emergências"
  { id: 142, nome: "Desodorante aerossol", tipo: "utilitario", peso: 0.2 },
  { id: 143, nome: "Protetor labial", tipo: "utilitario", peso: 0.05 },
  { id: 144, nome: "Álcool em gel", tipo: "utilitario", peso: 0.1 },
  { id: 145, nome: "Elásticos de cabelo", tipo: "acessorio", peso: 0.05 },
  { id: 146, nome: "Escova de cabelo pequena", tipo: "utilitario", peso: 0.1 },
  { id: 147, nome: "Espelho de bolso", tipo: "utilitario", peso: 0.1 },
  {
    id: 148,
    nome: "Nécessaire básica (maquiagem)",
    tipo: "utilitario",
    peso: 0.3,
  },
  { id: 149, nome: "Perfume de bolso", tipo: "utilitario", peso: 0.2 },
  { id: 150, nome: "Cartela de analgésico", tipo: "utilitario", peso: 0.05 },
  { id: 151, nome: "Curativos (Band-aids)", tipo: "utilitario", peso: 0.05 },
  { id: 152, nome: "Isqueiro", tipo: "utilitario", peso: 0.05 },
  { id: 153, nome: "Fita isolante", tipo: "utilitario", peso: 0.1 },

  // Itens de Ação / Equipamentos da Ordem
  { id: 154, nome: "Jaqueta do Colégio", tipo: "tronco", peso: 0.8, rd: 1 },
  { id: 155, nome: "Colar de Cristal Metrino", tipo: "acessorio", peso: 0.1 },
  { id: 156, nome: "Luvas de Couro (Meio-Dedo)", tipo: "acessorio", peso: 0.2 },
  {
    id: 157,
    nome: "Ração Humana (Sobrevivência)",
    tipo: "utilitario",
    peso: 2.0,
  },
  {
    id: 158,
    nome: "Canivete Suíço",
    tipo: "arma",
    peso: 0.2,
    dano: "Bal-1 cort",
  },
  {
    id: 159,
    nome: "Taco de Beisebol de Alumínio",
    tipo: "arma",
    peso: 1.5,
    dano: "Bal+1 cont",
  },
  {
    id: 160,
    nome: "Manoplas de Metrito",
    tipo: "arma",
    peso: 4.5,
    dano: "Bal+2 cont",
  },
  {
    id: 161,
    nome: "Pistola 9mm Tática",
    tipo: "arma",
    peso: 1.5,
    dano: "2d6 perf",
  },
];

export default function Arsenal({ onVoltar }) {
  const forcaPersonagem = 10;
  const cargaBasica = (forcaPersonagem * forcaPersonagem) / 10;

  // Inicia com apenas as roupas do corpo, celular e a mochila vazia
  const [inventario, setInventario] = useState([
    {
      ...catalogoGeral.find((i) => i.id === 101),
      idInstance: Date.now() + 1,
      equipado: false,
    },
    {
      ...catalogoGeral.find((i) => i.id === 111),
      idInstance: Date.now() + 2,
      equipado: false,
    },
    {
      ...catalogoGeral.find((i) => i.id === 154),
      idInstance: Date.now() + 3,
      equipado: true,
    },
  ]);

  const [abaDireita, setAbaDireita] = useState("mochila");
  const [filtroCatalogo, setFiltroCatalogo] = useState("todos"); // Para organizar as compras

  const adicionarAoInventario = (itemCatalogo) => {
    const novoItem = {
      ...itemCatalogo,
      idInstance: Date.now() + Math.random(),
      equipado: false,
    };
    setInventario([...inventario, novoItem]);
  };

  const removerDoInventario = (idInstance) => {
    setInventario(inventario.filter((item) => item.idInstance !== idInstance));
  };

  const alternarEquipamento = (idInstance) => {
    setInventario(
      inventario.map((item) => {
        if (item.idInstance === idInstance)
          return { ...item, equipado: !item.equipado };
        return item;
      }),
    );
  };

  const pesoTotal = inventario
    .reduce((acc, item) => acc + item.peso, 0)
    .toFixed(1);

  let estorvo = "Nenhuma (Sem penalidades)";
  let corBarra = "#4CAF50";
  let porcentagemPeso = (pesoTotal / (cargaBasica * 10)) * 100;

  if (pesoTotal > cargaBasica && pesoTotal <= cargaBasica * 2) {
    estorvo = "Leve (-1 Esquiva)";
    corBarra = "#8BC34A";
  } else if (pesoTotal > cargaBasica * 2 && pesoTotal <= cargaBasica * 3) {
    estorvo = "Média (-2 Esquiva)";
    corBarra = "#FFEB3B";
  } else if (pesoTotal > cargaBasica * 3 && pesoTotal <= cargaBasica * 6) {
    estorvo = "Pesada (-3 Esquiva)";
    corBarra = "#FF9800";
  } else if (pesoTotal > cargaBasica * 6) {
    estorvo = "Muito Pesada (-4 Esquiva)";
    corBarra = "#F44336";
  }

  const equipados = inventario.filter((i) => i.equipado);
  const armasEquipadas = equipados.filter((i) => i.tipo === "arma");
  const armaduraEquipada = equipados.filter((i) => i.tipo === "tronco");
  const acessoriosEquipados = equipados.filter((i) => i.tipo === "acessorio");

  // Filtro de exibição no catálogo
  const catalogoFiltrado =
    filtroCatalogo === "todos"
      ? catalogoGeral
      : catalogoGeral.filter((i) => i.tipo === filtroCatalogo);

  return (
    <div
      style={{
        background: "rgba(15, 15, 20, 0.95)",
        padding: "40px",
        borderRadius: "24px",
        border: "1px solid #333",
        maxWidth: "1200px",
        margin: "0 auto",
        color: "#fff",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #333",
          paddingBottom: "20px",
          marginBottom: "30px",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "2px",
              color: "#00FFFF",
            }}
          >
            Arsenal & Estorvo
          </h2>
          <span style={{ fontSize: "0.85em", color: "#888" }}>
            Gerencie o peso da sua vida dupla
          </span>
        </div>
        <button
          onClick={onVoltar}
          style={{
            padding: "10px 20px",
            background: "#222",
            border: "1px solid #555",
            color: "#ccc",
            borderRadius: "6px",
            cursor: "pointer",
            transition: "0.2s",
          }}
        >
          Voltar à Ficha
        </button>
      </div>

      {/* BARRA DE CARGA */}
      <div
        style={{
          background: "rgba(0,0,0,0.4)",
          padding: "20px",
          borderRadius: "12px",
          marginBottom: "30px",
          border: "1px solid #222",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "10px",
          }}
        >
          <span
            style={{
              textTransform: "uppercase",
              fontSize: "0.85em",
              color: "#aaa",
            }}
          >
            Carga Atual:{" "}
            <strong style={{ color: "#fff" }}>{pesoTotal} kg</strong>
          </span>
          <span
            style={{
              textTransform: "uppercase",
              fontSize: "0.85em",
              color: corBarra,
            }}
          >
            Estorvo: <strong>{estorvo}</strong>
          </span>
        </div>
        <div
          style={{
            width: "100%",
            height: "12px",
            background: "#111",
            borderRadius: "6px",
            overflow: "hidden",
            border: "1px solid #333",
          }}
        >
          <div
            style={{
              width: `${Math.min(porcentagemPeso, 100)}%`,
              height: "100%",
              background: corBarra,
              transition: "width 0.3s ease, background 0.3s ease",
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.5fr",
          gap: "40px",
        }}
      >
        {/* LADO ESQUERDO: CORPO E EQUIPAMENTOS */}
        <div
          style={{
            background: "rgba(0,0,0,0.3)",
            padding: "25px",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <h3
            style={{
              margin: "0 0 10px 0",
              fontSize: "1em",
              color: "#888",
              textTransform: "uppercase",
              textAlign: "center",
              letterSpacing: "1px",
            }}
          >
            Em Uso (Equipado)
          </h3>

          <div
            style={{
              border: "1px dashed #444",
              borderRadius: "8px",
              padding: "15px",
              minHeight: "60px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              background:
                armaduraEquipada.length > 0
                  ? "rgba(76, 175, 80, 0.05)"
                  : "transparent",
            }}
          >
            <span
              style={{
                fontSize: "0.7em",
                color: "#666",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              Vestimenta / Proteção
            </span>
            {armaduraEquipada.length > 0 ? (
              armaduraEquipada.map((item) => (
                <div
                  key={item.idInstance}
                  style={{
                    color: "#4CAF50",
                    fontWeight: "bold",
                    fontSize: "0.9em",
                  }}
                >
                  {item.nome} (RD {item.rd})
                </div>
              ))
            ) : (
              <span style={{ color: "#444", fontSize: "0.9em" }}>
                Roupas civis
              </span>
            )}
          </div>

          <div
            style={{
              border: "1px dashed #444",
              borderRadius: "8px",
              padding: "15px",
              minHeight: "60px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              background:
                acessoriosEquipados.length > 0
                  ? "rgba(0, 255, 255, 0.05)"
                  : "transparent",
            }}
          >
            <span
              style={{
                fontSize: "0.7em",
                color: "#666",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              Acessórios
            </span>
            {acessoriosEquipados.length > 0 ? (
              acessoriosEquipados.map((item) => (
                <div
                  key={item.idInstance}
                  style={{
                    color: "#00FFFF",
                    fontWeight: "bold",
                    fontSize: "0.85em",
                    marginBottom: "4px",
                  }}
                >
                  {item.nome}
                </div>
              ))
            ) : (
              <span style={{ color: "#444", fontSize: "0.9em" }}>
                Sem adornos
              </span>
            )}
          </div>

          <div
            style={{
              border: "1px dashed #444",
              borderRadius: "8px",
              padding: "15px",
              minHeight: "100px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              background:
                armasEquipadas.length > 0
                  ? "rgba(229, 57, 53, 0.05)"
                  : "transparent",
            }}
          >
            <span
              style={{
                fontSize: "0.7em",
                color: "#666",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              Armamento (Mãos)
            </span>
            {armasEquipadas.length > 0 ? (
              armasEquipadas.map((item) => (
                <div
                  key={item.idInstance}
                  style={{
                    color: "#e53935",
                    fontWeight: "bold",
                    fontSize: "0.9em",
                    textAlign: "center",
                    marginBottom: "5px",
                  }}
                >
                  {item.nome} <br />
                  <span
                    style={{
                      fontSize: "0.8em",
                      color: "#aaa",
                      fontWeight: "normal",
                    }}
                  >
                    Dano: {item.dano}
                  </span>
                </div>
              ))
            ) : (
              <span style={{ color: "#444", fontSize: "0.9em" }}>
                Mãos vazias
              </span>
            )}
          </div>
        </div>

        {/* LADO DIREITO: ABAS */}
        <div
          style={{
            background: "rgba(0,0,0,0.3)",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              background: "rgba(0,0,0,0.5)",
              borderBottom: "1px solid #333",
            }}
          >
            <button
              onClick={() => setAbaDireita("mochila")}
              style={{
                flex: 1,
                padding: "15px",
                background:
                  abaDireita === "mochila"
                    ? "rgba(255,255,255,0.05)"
                    : "transparent",
                color: abaDireita === "mochila" ? "#fff" : "#666",
                border: "none",
                borderBottom:
                  abaDireita === "mochila"
                    ? "2px solid #00FFFF"
                    : "2px solid transparent",
                cursor: "pointer",
                textTransform: "uppercase",
                fontWeight: "bold",
              }}
            >
              Minha Mochila ({inventario.length})
            </button>
            <button
              onClick={() => setAbaDireita("catalogo")}
              style={{
                flex: 1,
                padding: "15px",
                background:
                  abaDireita === "catalogo"
                    ? "rgba(255,255,255,0.05)"
                    : "transparent",
                color: abaDireita === "catalogo" ? "#fff" : "#666",
                border: "none",
                borderBottom:
                  abaDireita === "catalogo"
                    ? "2px solid #4CAF50"
                    : "2px solid transparent",
                cursor: "pointer",
                textTransform: "uppercase",
                fontWeight: "bold",
              }}
            >
              Adicionar Itens +
            </button>
          </div>

          <div
            style={{
              padding: "20px",
              flex: 1,
              overflowY: "auto",
              maxHeight: "450px",
            }}
          >
            {/* MINHA MOCHILA */}
            {abaDireita === "mochila" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {inventario.map((item) => (
                  <div
                    key={item.idInstance}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 15px",
                      background: item.equipado
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(255,255,255,0.02)",
                      borderRadius: "8px",
                      border: item.equipado
                        ? "1px solid #555"
                        : "1px solid transparent",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <span
                        style={{
                          color: item.equipado ? "#fff" : "#ccc",
                          fontWeight: item.equipado ? "bold" : "normal",
                          fontSize: "0.95em",
                        }}
                      >
                        {item.nome}
                      </span>
                      <span style={{ fontSize: "0.75em", color: "#888" }}>
                        Peso: {item.peso} kg{" "}
                        {item.dano && `| Dano: ${item.dano}`}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "10px" }}>
                      {item.tipo !== "utilitario" && (
                        <button
                          onClick={() => alternarEquipamento(item.idInstance)}
                          style={{
                            padding: "6px 12px",
                            background: item.equipado ? "#333" : "#00FFFF",
                            color: item.equipado ? "#fff" : "#000",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "0.8em",
                            fontWeight: "bold",
                          }}
                        >
                          {item.equipado ? "Desequipar" : "Equipar"}
                        </button>
                      )}
                      <button
                        onClick={() => removerDoInventario(item.idInstance)}
                        style={{
                          padding: "6px 12px",
                          background: "transparent",
                          color: "#ff4d4d",
                          border: "1px solid #ff4d4d",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "0.8em",
                          fontWeight: "bold",
                        }}
                      >
                        Largar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* CATÁLOGO DE ITENS */}
            {abaDireita === "catalogo" && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {/* Botões de Filtro */}
                <div
                  style={{
                    display: "flex",
                    gap: "5px",
                    marginBottom: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  {["todos", "utilitario", "acessorio", "arma"].map(
                    (filtro) => (
                      <button
                        key={filtro}
                        onClick={() => setFiltroCatalogo(filtro)}
                        style={{
                          padding: "4px 10px",
                          background:
                            filtroCatalogo === filtro ? "#4CAF50" : "#222",
                          color: "#fff",
                          border: "none",
                          borderRadius: "15px",
                          cursor: "pointer",
                          fontSize: "0.7em",
                          textTransform: "uppercase",
                        }}
                      >
                        {filtro}
                      </button>
                    ),
                  )}
                </div>

                {catalogoFiltrado.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 15px",
                      background: "rgba(0,0,0,0.4)",
                      borderRadius: "8px",
                      border: "1px solid #222",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ color: "#ddd", fontSize: "0.9em" }}>
                        {item.nome}
                      </span>
                      <span style={{ fontSize: "0.75em", color: "#666" }}>
                        {item.tipo.toUpperCase()} • {item.peso} kg
                      </span>
                    </div>
                    <button
                      onClick={() => adicionarAoInventario(item)}
                      style={{
                        padding: "6px 15px",
                        background: "#4CAF50",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "0.8em",
                        fontWeight: "bold",
                      }}
                    >
                      Pegar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
