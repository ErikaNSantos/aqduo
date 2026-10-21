/** PH inicial na criação de ficha (Etapa 2), antes da árvore. */
export const PH_BASE_ETAPA2 = 4;

/**
 * Soma o custo em pontos de habilidade acima do atributo base 10 (GURPS).
 * @param {number} st
 * @param {number} dx
 * @param {number} iq
 * @param {number} ht
 * @returns {number}
 */
export function calcularCustoAtributos(st, dx, iq, ht) {
  return st - 10 + (dx - 10) + (iq - 10) + (ht - 10);
}

/**
 * Soma o bônus de PH das sequelas (custo_em_ph negativo no banco → valor absoluto).
 * @param {{ custo_em_ph?: number | null }[]} sequelas
 * @returns {number}
 */
export function somaBonusPHSequelas(sequelas) {
  return sequelas.reduce((acc, seq) => acc + Math.abs(seq.custo_em_ph || 0), 0);
}

/**
 * Custo em PH da aptidão inicial (valor positivo em `custo_em_ph` no banco = desconta do pool).
 * @param {{ custo_em_ph?: number | null } | null | undefined} aptidao
 * @returns {number}
 */
export function custoPHAptidao(aptidao) {
  if (!aptidao || aptidao.custo_em_ph == null) return 0;
  const ph = Number(aptidao.custo_em_ph);
  return ph > 0 ? ph : 0;
}

/**
 * PH disponíveis após gastar em atributos, somar bônus de sequelas e custo da aptidão inicial.
 * @param {number} custoAtributos
 * @param {number} pontosBonusSequelas
 * @param {number} [phBaseInicial=PH_BASE_ETAPA2]
 * @param {number} [custoAptidaoPH=0]
 * @returns {number}
 */
export function calcularPHDisponiveis(
  custoAtributos,
  pontosBonusSequelas,
  phBaseInicial = PH_BASE_ETAPA2,
  custoAptidaoPH = 0,
) {
  return phBaseInicial - custoAtributos + pontosBonusSequelas - custoAptidaoPH;
}

/**
 * Ponto único de entrada para PH da Etapa 2 (valor persistido em `pontos_habilidade_ph` / árvore).
 * @param {number} st
 * @param {number} dx
 * @param {number} iq
 * @param {number} ht
 * @param {{ custo_em_ph?: number | null }[]} sequelas
 * @param {{ custo_em_ph?: number | null } | null | undefined} [aptidao]
 * @param {number} [phBaseInicial=PH_BASE_ETAPA2]
 * @returns {{
 *   phDisponiveis: number,
 *   custoAtributos: number,
 *   pontosBonusSequelas: number,
 *   custoAptidaoPH: number,
 * }}
 */
export function calcularPHDisponiveisEtapa2(
  st,
  dx,
  iq,
  ht,
  sequelas,
  aptidao,
  phBaseInicial = PH_BASE_ETAPA2,
) {
  const custoAtributos = calcularCustoAtributos(st, dx, iq, ht);
  const pontosBonusSequelas = somaBonusPHSequelas(sequelas);
  const custoAptidaoPH = custoPHAptidao(aptidao);
  const phDisponiveis = calcularPHDisponiveis(
    custoAtributos,
    pontosBonusSequelas,
    phBaseInicial,
    custoAptidaoPH,
  );
  return {
    phDisponiveis,
    custoAtributos,
    pontosBonusSequelas,
    custoAptidaoPH,
  };
}

/**
 * @param {number | null | undefined} custoEmPh
 * @returns {number}
 */
export function bonusPHSequela(custoEmPh) {
  return Math.abs(custoEmPh ?? 0);
}

/**
 * @param {number} dx
 * @param {number} ht
 * @returns {number}
 */
export function calcularVelocidadeBasica(dx, ht) {
  return (dx + ht) / 4;
}

/**
 * Esquiva padrão (GURPS Lite): piso de Velocidade Básica + 3.
 * @param {number} velocidadeBasica
 * @returns {number}
 */
export function calcularEsquiva(velocidadeBasica) {
  return Math.floor(velocidadeBasica + 3);
}

/**
 * Estatísticas derivadas dos quatro atributos (GURPS Lite / projeto).
 * @param {{ st: number, dx: number, iq: number, ht: number }} attrs
 * @returns {{
 *   pv: number,
 *   pfMax: number,
 *   vontade: number,
 *   percepcao: number,
 *   velocidadeBasica: number,
 *   esquiva: number,
 * }}
 */
export function calcularEstatisticasSecundariasGURPS({ st, dx, iq, ht }) {
  const velocidadeBasica = calcularVelocidadeBasica(dx, ht);
  return {
    pv: st,
    pfMax: ht,
    vontade: iq,
    percepcao: iq,
    velocidadeBasica,
    esquiva: calcularEsquiva(velocidadeBasica),
  };
}
