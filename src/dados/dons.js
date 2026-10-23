// PROTÓTIPO: catálogo de Dons (poderes) e o caminho de técnicas de cada um.
// Os nomes, custos e Parâmetros são exemplos para a Lavi ajustar; nada disso está no banco ainda.
//
// Regras seguidas (do .cursorrules):
// - o Dom desperta bem básico e cresce em técnicas conforme o Parâmetro (controle) sobe;
// - o Dom é livre; a linhagem só dá afinidade (Demons +1 em Pirocinese, Vampiros +1 em Hemocinese);
// - o Parâmetro começa no 2 e sobe com Sagas, Eventos e treino.
//
// Em cada técnica, `exige` lista as técnicas anteriores; `parametro` é o mínimo para aprender.
// A ordem importa no desenho: dentro do mesmo Parâmetro, a primeira vai para a esquerda.

import urlTerra from "../assets/classes/terra.png";
import urlFogo from "../assets/classes/fogo.png";
import urlAgua from "../assets/classes/agua.png";
import urlMente from "../assets/classes/mente.png";

export const PARAMETRO_MIN = 2;
export const PARAMETRO_MAX = 20;

export const DONS = [
  {
    id: "pirocinese",
    nome: "Pirocinese",
    classe: "Fogo",
    cor: "#ef6a45",
    icone: urlFogo,
    despertar: { nome: "Calor nas Mãos", descricao: "O primeiro sinal: as mãos esquentam sem motivo e pequenos objetos aquecem ao toque." },
    tecnicas: [
      { id: "piro_acender", nome: "Acender", tipo: "Ativa", parametro: 4, ph: 2, custo: "1 de Vigor", exige: [], descricao: "Faz surgir uma chama pequena na palma da mão." },
      { id: "piro_resistir", nome: "Resistir ao Calor", tipo: "Passiva", parametro: 4, ph: 2, custo: null, exige: [], descricao: "O calor do ambiente deixa de cansar e queimaduras leves não pegam." },
      { id: "piro_brasa", nome: "Lançar Brasa", tipo: "Ativa", parametro: 7, ph: 3, custo: "2 de Mana", exige: ["piro_acender"], descricao: "Arremessa uma brasa que queima o alvo." },
      { id: "piro_caminhar", nome: "Caminhar no Fogo", tipo: "Ativa", parametro: 7, ph: 3, custo: "2 de Mana", exige: ["piro_resistir"], descricao: "Atravessa chamas sem se queimar por alguns turnos." },
      { id: "piro_fumaca", nome: "Cortina de Fumaça", tipo: "Ativa", parametro: 10, ph: 4, custo: "3 de Mana", exige: ["piro_brasa"], descricao: "Uma nuvem de fumaça densa cobre a fuga do grupo." },
      { id: "piro_muralha", nome: "Muralha de Fogo", tipo: "Ativa", parametro: 10, ph: 4, custo: "4 de Mana", exige: ["piro_caminhar"], descricao: "Ergue uma parede de chamas que bloqueia a passagem." },
      { id: "piro_combustao", nome: "Combustão", tipo: "Ativa", parametro: 14, ph: 5, custo: "6 de Mana", exige: ["piro_fumaca", "piro_muralha"], descricao: "Uma explosão de fogo em volta do próprio corpo." },
    ],
  },
  {
    id: "hidrocinese",
    nome: "Hidrocinese",
    classe: "Água",
    cor: "#3fc1d6",
    icone: urlAgua,
    despertar: { nome: "Sentir a Água", descricao: "Percebe água por perto, mesmo escondida, e consegue mover algumas gotas." },
    tecnicas: [
      { id: "hidro_moldar", nome: "Moldar a Água", tipo: "Ativa", parametro: 4, ph: 2, custo: "1 de Mana", exige: [], descricao: "Move a água de um copo, de uma poça, de um cano." },
      { id: "hidro_folego", nome: "Fôlego Longo", tipo: "Passiva", parametro: 4, ph: 2, custo: null, exige: [], descricao: "Segura a respiração debaixo d'água muito mais que o normal." },
      { id: "hidro_jato", nome: "Jato", tipo: "Ativa", parametro: 7, ph: 3, custo: "2 de Mana", exige: ["hidro_moldar"], descricao: "Dispara um jato forte o bastante para derrubar alguém." },
      { id: "hidro_cura", nome: "Cura na Água", tipo: "Passiva", parametro: 7, ph: 3, custo: null, exige: ["hidro_folego"], descricao: "Ferimentos fecham mais rápido enquanto está submerso." },
      { id: "hidro_onda", nome: "Onda", tipo: "Ativa", parametro: 10, ph: 4, custo: "4 de Mana", exige: ["hidro_jato"], descricao: "Levanta uma onda que varre o caminho." },
      { id: "hidro_respirar", nome: "Respirar na Água", tipo: "Passiva", parametro: 10, ph: 4, custo: null, exige: ["hidro_cura"], descricao: "Respira debaixo d'água como se estivesse no ar." },
      { id: "hidro_tempestade", nome: "Tempestade", tipo: "Ativa", parametro: 14, ph: 5, custo: "6 de Mana", exige: ["hidro_onda", "hidro_respirar"], descricao: "Chama chuva pesada e domina a água de toda a área." },
    ],
  },
  {
    id: "geocinese",
    nome: "Geocinese",
    classe: "Terra",
    cor: "#d1a35a",
    icone: urlTerra,
    despertar: { nome: "Ouvir a Terra", descricao: "Sente pelos pés quem se aproxima: passos, cascos, motores." },
    tecnicas: [
      { id: "geo_pedras", nome: "Mover Pedras", tipo: "Ativa", parametro: 4, ph: 2, custo: "1 de Vigor", exige: [], descricao: "Levanta e arremessa pedras do tamanho de um punho." },
      { id: "geo_pele", nome: "Pele de Pedra", tipo: "Ativa", parametro: 4, ph: 2, custo: "2 de Vigor", exige: [], descricao: "A pele endurece por um turno e segura uma pancada." },
      { id: "geo_muro", nome: "Muro de Terra", tipo: "Ativa", parametro: 7, ph: 3, custo: "2 de Mana", exige: ["geo_pedras"], descricao: "Ergue um muro baixo que serve de cobertura." },
      { id: "geo_armadura", nome: "Armadura de Rocha", tipo: "Ativa", parametro: 7, ph: 3, custo: "3 de Vigor", exige: ["geo_pele"], descricao: "Cobre o corpo de rocha por uma cena, mais lento e muito mais duro." },
      { id: "geo_tremor", nome: "Tremor", tipo: "Ativa", parametro: 10, ph: 4, custo: "4 de Mana", exige: ["geo_muro"], descricao: "Faz o chão tremer e derruba quem está de pé por perto." },
      { id: "geo_afundar", nome: "Afundar", tipo: "Ativa", parametro: 10, ph: 4, custo: "4 de Mana", exige: ["geo_armadura"], descricao: "Abre o chão sob um alvo e o prende até a cintura." },
      { id: "geo_terremoto", nome: "Terremoto", tipo: "Ativa", parametro: 14, ph: 5, custo: "6 de Mana", exige: ["geo_tremor", "geo_afundar"], descricao: "Racha o chão de toda a área." },
    ],
  },
  {
    id: "telepatia",
    nome: "Telepatia",
    classe: "Mente",
    cor: "#b58ae0",
    icone: urlMente,
    despertar: { nome: "Ecos", descricao: "Ouve pedaços de pensamentos fortes de quem está perto, sem querer." },
    tecnicas: [
      { id: "tele_ler", nome: "Ler a Superfície", tipo: "Ativa", parametro: 4, ph: 2, custo: "1 de Mana", exige: [], descricao: "Escuta o que alguém está pensando naquele instante." },
      { id: "tele_escudo", nome: "Escudo Mental", tipo: "Passiva", parametro: 4, ph: 2, custo: null, exige: [], descricao: "Fica mais difícil alguém entrar na sua cabeça." },
      { id: "tele_sussurro", nome: "Sussurro", tipo: "Ativa", parametro: 7, ph: 3, custo: "2 de Mana", exige: ["tele_ler"], descricao: "Fala direto na mente de alguém que esteja à vista." },
      { id: "tele_mentira", nome: "Sentir Mentiras", tipo: "Passiva", parametro: 7, ph: 3, custo: null, exige: ["tele_escudo"], descricao: "Percebe quando alguém mente para você." },
      { id: "tele_ilusao", nome: "Ilusão", tipo: "Ativa", parametro: 10, ph: 4, custo: "4 de Mana", exige: ["tele_sussurro"], descricao: "Faz uma pessoa ver algo que não está lá." },
      { id: "tele_fortaleza", nome: "Fortaleza Mental", tipo: "Passiva", parametro: 10, ph: 4, custo: null, exige: ["tele_mentira"], descricao: "Resiste até a controle mental forte." },
      { id: "tele_dominar", nome: "Dominar", tipo: "Ativa", parametro: 14, ph: 5, custo: "6 de Mana", exige: ["tele_ilusao", "tele_fortaleza"], descricao: "Controla as ações de alguém por um turno." },
    ],
  },
  {
    id: "hemocinese",
    nome: "Hemocinese",
    classe: "Sangue",
    cor: "#d9405a",
    icone: null,
    despertar: { nome: "Pulso", descricao: "Sente o próprio sangue correndo e consegue estancar cortes pequenos em si." },
    tecnicas: [
      { id: "hemo_estancar", nome: "Estancar", tipo: "Ativa", parametro: 4, ph: 2, custo: "1 de Mana", exige: [], descricao: "Para o sangramento de outra pessoa pelo toque." },
      { id: "hemo_acelerar", nome: "Acelerar o Sangue", tipo: "Ativa", parametro: 4, ph: 2, custo: "2 de Vigor", exige: [], descricao: "+1 em DX por um turno, depois cansa." },
      { id: "hemo_ferimentos", nome: "Sentir Ferimentos", tipo: "Passiva", parametro: 7, ph: 3, custo: null, exige: ["hemo_estancar"], descricao: "Sabe quem está ferido por perto e onde." },
      { id: "hemo_lamina", nome: "Lâmina de Sangue", tipo: "Ativa", parametro: 7, ph: 3, custo: "2 de Vigor", exige: ["hemo_acelerar"], descricao: "Endurece o próprio sangue numa lâmina curta." },
      { id: "hemo_coagular", nome: "Coagular Feridas", tipo: "Ativa", parametro: 10, ph: 4, custo: "4 de Mana", exige: ["hemo_ferimentos"], descricao: "Fecha ferimentos graves de um aliado." },
      { id: "hemo_marionete", nome: "Marionete", tipo: "Ativa", parametro: 10, ph: 4, custo: "4 de Mana", exige: ["hemo_lamina"], descricao: "Trava os movimentos de alguém pelo sangue por um turno." },
      { id: "hemo_rubra", nome: "Maré Rubra", tipo: "Ativa", parametro: 14, ph: 5, custo: "6 de Mana", exige: ["hemo_coagular", "hemo_marionete"], descricao: "Domina o sangue de todos em volta por um instante." },
    ],
  },
  {
    id: "aerocinese",
    nome: "Aerocinese",
    classe: "Ar",
    cor: "#cfe3ee",
    icone: null,
    despertar: { nome: "Brisa", descricao: "Muda a direção de um vento leve e sente o ar mudar antes de uma tempestade." },
    tecnicas: [
      { id: "aero_rajada", nome: "Rajada", tipo: "Ativa", parametro: 4, ph: 2, custo: "1 de Mana", exige: [], descricao: "Um sopro forte que empurra objetos leves e pessoas desequilibradas." },
      { id: "aero_leve", nome: "Passos Leves", tipo: "Passiva", parametro: 4, ph: 2, custo: null, exige: [], descricao: "Quedas ficam amortecidas e os passos quase não fazem som." },
      { id: "aero_voz", nome: "Carregar a Voz", tipo: "Ativa", parametro: 7, ph: 3, custo: "1 de Mana", exige: ["aero_rajada"], descricao: "O vento leva sua voz para longe, ou traz a voz de outros até você." },
      { id: "aero_planar", nome: "Planar", tipo: "Ativa", parametro: 7, ph: 3, custo: "2 de Vigor", exige: ["aero_leve"], descricao: "Desce de lugares altos planando. Demons e Angelicais mostram as asas aqui." },
      { id: "aero_ciclone", nome: "Ciclone", tipo: "Ativa", parametro: 10, ph: 4, custo: "4 de Mana", exige: ["aero_voz"], descricao: "Um redemoinho que tira o chão de quem está dentro." },
      { id: "aero_voo", nome: "Voo", tipo: "Ativa", parametro: 10, ph: 4, custo: "3 de Vigor", exige: ["aero_planar"], descricao: "Voa de verdade por uma cena." },
      { id: "aero_vendaval", nome: "Vendaval", tipo: "Ativa", parametro: 14, ph: 5, custo: "6 de Mana", exige: ["aero_ciclone", "aero_voo"], descricao: "Uma tempestade de vento na área inteira." },
    ],
  },
];

// Afinidades da linhagem com um Dom (do .cursorrules): +1 no Parâmetro se for o Dom despertado
export const AFINIDADE = {
  Demons: "pirocinese",
  Vampiros: "hemocinese",
};

// Habilidade Instintiva (H.I.) de cada linhagem. As 7 primeiras estão no .cursorrules;
// Pelágicos, Feéricos, Ofídios e Espectrais foram deduzidas pelo nome e precisam de confirmação.
export const HI_DA_LINHAGEM = {
  Humanos: "hi_gambiarra",
  Bestiais: "hi_fisiologia",
  Elfos: "hi_conexao",
  Demons: "hi_res_fogo",
  Angelicais: "hi_persuasao",
  Gigantes: "hi_bencao_golias",
  Vampiros: "hi_sanguessuga",
  Pelágicos: "hi_anfibia",
  Feéricos: "hi_ilusao_silvestre",
  Ofídios: "hi_sangue_frio",
  Espectrais: "hi_freq_fantasma",
};
