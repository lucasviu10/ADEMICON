/* Assistente: entende o que você digita e guarda no lugar certo.
   Funciona por regras (sem internet, sem custo). Sempre mostra o que entendeu antes de salvar. */
'use strict';

const TIPOS_ITEM = {
  lead: '👤 Lead novo',
  nota: '📝 Anotação de cliente',
  saida: '💸 Gasto',
  entrada: '💰 Entrada de dinheiro',
  prosp: '🎯 Prospecção do dia',
  habito: '🌱 Hábito feito',
  tarefa: '✅ Tarefa / lembrete',
};

function semAcento(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/* ---------- Leitores de pedaços do texto ---------- */

const DIAS_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

function acharData(n) {
  const h = hoje();
  let m;
  if ((m = n.match(/depois de amanha/))) return { d: somarDias(h, 2), txt: m[0] };
  if ((m = n.match(/\bamanha\b/))) return { d: somarDias(h, 1), txt: m[0] };
  if ((m = n.match(/\b(?:em|daqui(?: a)?)\s+(\d{1,3})\s+dias?\b/))) return { d: somarDias(h, Number(m[1])), txt: m[0] };
  if ((m = n.match(/\b(?:semana que vem|proxima semana)\b/))) return { d: somarDias(h, 7), txt: m[0] };
  if ((m = n.match(/\b(?:mes que vem|proximo mes)\b/))) return { d: somarDias(h, 30), txt: m[0] };
  if ((m = n.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) {
    const dd = Number(m[1]), mm = Number(m[2]);
    if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
      const ano = m[3] ? (Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3])) : new Date().getFullYear();
      let d = paraTexto(new Date(ano, mm - 1, dd, 12));
      if (!m[3] && d < h) d = paraTexto(new Date(ano + 1, mm - 1, dd, 12));
      return { d, txt: m[0] };
    }
  }
  if ((m = n.match(/\bdia\s+(\d{1,2})\b/))) {
    const dd = Number(m[1]);
    if (dd >= 1 && dd <= 31) {
      const agora = new Date();
      let d = paraTexto(new Date(agora.getFullYear(), agora.getMonth(), dd, 12));
      if (d < h) d = paraTexto(new Date(agora.getFullYear(), agora.getMonth() + 1, dd, 12));
      return { d, txt: m[0] };
    }
  }
  if ((m = n.match(/\b(domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:[- ]feira)?\b/))) {
    const alvo = DIAS_SEMANA.indexOf(m[1]);
    const atual = paraData(h).getDay();
    let dif = (alvo - atual + 7) % 7;
    if (dif === 0) dif = 7;
    return { d: somarDias(h, dif), txt: m[0] };
  }
  if ((m = n.match(/\bhoje\b/))) return { d: h, txt: m[0] };
  return null;
}

function acharTelefone(original) {
  const m = original.match(/(?:\+?55[\s-]?)?\(?\b\d{2}\)?[\s-]?9?[\s.-]?\d{4}[\s.-]?\d{4}\b/);
  if (m) {
    const dig = m[0].replace(/\D/g, '');
    if (dig.length >= 10 && dig.length <= 13) return { tel: dig, txt: m[0] };
  }
  const m2 = original.match(/\b9\d{4}[-\s]?\d{4}\b/);
  if (m2) return { tel: dados.config.ddd + m2[0].replace(/\D/g, ''), txt: m2[0] };
  return null;
}

// Acha valores em reais: "300 mil", "R$ 250.000", "1,5 milhão", "80k", "45,90".
function acharValor(n) {
  const re = /(r\$\s*)?(\d+(?:[.,]\d+)*)\s*(milhoes|milhao|mi\b|mil\b|k\b)?/g;
  let melhor = null, m;
  while ((m = re.exec(n))) {
    const bruto = m[2];
    let v;
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(bruto)) v = parseFloat(bruto.replace(/\./g, '').replace(',', '.'));
    else v = parseFloat(bruto.replace(',', '.'));
    if (!isFinite(v)) continue;
    const suf = m[3] || '';
    if (suf === 'mil' || suf === 'k') v *= 1000;
    else if (suf.startsWith('mi')) v *= 1e6;
    const cand = { v: Math.round(v * 100) / 100, forte: Boolean(m[1] || suf), txt: m[0] };
    if (!melhor || (cand.forte && !melhor.forte)) melhor = cand;
  }
  return melhor;
}

const PARADA = new Set(('quer queria querendo querem interesse interessado interessada interessados procura procurando '
  + 'pensa pensando tem ta esta estava mora pediu pede falou disse vai vem veio pelo pela via no na nos nas com para pra pro '
  + 'sobre retorno retornar chamar ligar mandar proposta reuniao visita fechou fechei consorcio credito carta imovel casa apto '
  + 'apartamento terreno carro moto caminhao veiculo valor mil origem indicacao indicado indicada instagram insta facebook face '
  + 'nestle mercado base lead frio quente morno em daqui semana mes dia hoje amanha que mas porque e ou whats whatsapp zap tel '
  + 'telefone fone cel celular numero r$ ' + DIAS_SEMANA.join(' ')).split(' '));
const INTRO = new Set(['lead', 'novo', 'nova', 'cliente', 'contato', 'nome', 'prospect', 'cadastrar', 'cadastra', 'cadastre',
  'add', 'adicionar', 'anota', 'anotar', 'o', 'a', ':', '-']);
const LIGA = new Set(['de', 'da', 'do', 'dos', 'das']);

function capitalizar(p) {
  const n = semAcento(p);
  if (LIGA.has(n)) return n;
  return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
}

function acharNome(original) {
  const nome = [];
  for (const tok of original.trim().split(/\s+/)) {
    const limpo = tok.replace(/[,.;:!?)]+$/, '').replace(/^[(]+/, '');
    const n = semAcento(limpo);
    if (!nome.length && INTRO.has(n)) continue;
    if (!limpo || /\d/.test(limpo) || PARADA.has(n) || !/^[a-zà-ÿ'’]+$/i.test(limpo)) break;
    nome.push(limpo);
    if (/[,.;:!?]$/.test(tok) || nome.length >= 4) break;
  }
  while (nome.length && LIGA.has(semAcento(nome[nome.length - 1]))) nome.pop();
  return nome.map(capitalizar).join(' ');
}

function acharTipoBem(n) {
  if (/\b(imovel|imoveis|casa|apto|apartamento|terreno|sala comercial|kitnet|sobrado|construir|construcao|reforma|imobiliario)\b/.test(n)) return 'imobiliario';
  if (/\b(carro|veiculo|moto|caminhao|van|automovel|suv|pickup|picape|veicular)\b/.test(n)) return 'veicular';
  if (/\b(trator|maquina|maquinas|equipamento|energia solar|placa solar|bens moveis)\b/.test(n)) return 'moveis';
  if (/\b(servico|servicos|cirurgia|viagem|festa|casamento|estetica|intercambio|faculdade)\b/.test(n)) return 'servicos';
  return null;
}

function acharOrigem(n) {
  if (/\bnestle\b/.test(n)) return 'Nestlé';
  if (/\b(insta|instagram|direct)\b/.test(n)) return 'Instagram';
  if (/\b(face|facebook)\b/.test(n)) return 'Facebook';
  if (/\b(indicacao|indicou|indicado|indicada)\b/.test(n)) return 'Indicação';
  if (/\b(base propria|minha base|carteira)\b/.test(n)) return 'Base Própria';
  if (/\b(lead frio|lista fria|frio)\b/.test(n)) return 'Lead Frio';
  if (/\bmercado\b/.test(n)) return 'Mercado';
  return '';
}

function acharMotivoPerda(n) {
  const motivos = dados.config.motivos;
  const pega = (padrao, i) => (padrao.test(n) ? (motivos[i] || MOTIVOS_PADRAO[i]) : null);
  return pega(/parcela alta|caro|nao cabe/, 0)
    || pega(/outra administradora|outro consorcio|fechou com outr/, 1)
    || pega(/financiamento|financiar/, 2)
    || pega(/desistiu|nao vai mais|nao quer mais/, 3)
    || pega(/sem dinheiro|sem condicao|apertado/, 4)
    || pega(/sumiu|nao responde|parou de responder|vacuo/, 5)
    || null;
}

const CATEGORIAS_PALAVRAS = [
  ['Trabalho', /\b(anuncio|trafego|impressao|cartao de visita|brinde|material de venda)\b/],
  ['Alimentação', /\b(almoco|janta|jantar|lanche|ifood|restaurante|cafe|padaria|mercado|comida|pizza|acougue|feira|marmita)\b/],
  ['Transporte', /\b(gasolina|combustivel|etanol|alcool|uber|99|onibus|estacionamento|pedagio|oficina|pneu|mecanico|ipva|seguro do carro)\b/],
  ['Moradia', /\b(aluguel|condominio|iptu)\b/],
  ['Contas', /\b(luz|energia|agua|internet|celular|telefone|gas|netflix|spotify|assinatura|streaming)\b/],
  ['Saúde', /\b(farmacia|remedio|academia|medico|dentista|exame|consulta|suplemento|plano de saude)\b/],
  ['Educação', /\b(curso|livro|faculdade|escola|mentoria|treinamento)\b/],
  ['Lazer', /\b(cinema|bar|viagem|passeio|show|praia|presente|cerveja|role)\b/],
  ['Dívidas', /\b(fatura|cartao|emprestimo|parcela|divida|financiamento)\b/],
];
function acharCategoria(n, tipo) {
  if (tipo === 'entrada') {
    if (/\b(comissao|ademicon|premiacao|bonus|consorcio)\b/.test(n)) return 'Comissão Ademicon';
    if (/\b(salario|nestle|pagamento)\b/.test(n)) return 'Salário Nestlé';
    if (/\b(extra|bico|freela|venda)\b/.test(n)) return 'Extra';
    return 'Outros';
  }
  const achou = CATEGORIAS_PALAVRAS.find(([, re]) => re.test(n));
  return achou ? achou[0] : 'Outros';
}

// Palavras que indicam cada hábito padrão; hábitos criados por você são achados pelo começo do nome.
const SINONIMOS_HABITO = {
  treino: /\b(treinei|treino|treinar|academia|corri|corrida|caminhei|caminhada|musculacao|malhei|futebol|bike|pedalei)\b/,
  leitura: /\b(li|leitura|livro|paginas|lendo)\b/,
  agua: /\b(agua|bebi)\b/,
  dormir: /\b(dormi|sono|dormir)\b/,
  oracao: /\b(orei|oracao|meditei|meditacao|devocional|rezei)\b/,
};
function acharHabitos(n) {
  return dados.config.habitos.filter(hab => {
    const chave = semAcento(hab).split(/[^a-z]+/)[0];
    if (SINONIMOS_HABITO[chave] && SINONIMOS_HABITO[chave].test(n)) return true;
    return chave.length >= 4 && n.includes(chave.slice(0, Math.max(4, chave.length - 2)));
  });
}

function acharClienteNoTexto(n) {
  const fortes = [], fracos = [];
  dados.clientes.forEach(c => {
    const nome = semAcento(c.nome).trim();
    if (!nome) return;
    const primeiro = nome.split(/\s+/)[0];
    if (n === nome || n.startsWith(nome + ' ') || n.startsWith(nome + ',')) fortes.push(c);
    else if (primeiro.length >= 3 && (n.startsWith(primeiro + ' ') || n.startsWith(primeiro + ','))) fracos.push(c);
  });
  const lista = fortes.length ? fortes : fracos;
  // Prefere quem ainda está em atendimento.
  lista.sort((a, b) => Number(ATIVAS.includes(b.etapa)) - Number(ATIVAS.includes(a.etapa)));
  return lista[0] || null;
}

/* ---------- Montagem de cada tipo ---------- */

const EXTRAIR = {
  lead(original, n) {
    const tel = acharTelefone(original);
    let resto = n;
    if (tel) resto = resto.replace(semAcento(tel.txt), ' ');
    const data = acharData(resto);
    if (data) resto = resto.replace(data.txt, ' ');
    const valor = acharValor(resto);
    let etapa = 'novo';
    if (/proposta (enviada|mandada)|(mandei|enviei|passei) (a )?proposta/.test(n)) etapa = 'proposta';
    else if (/\b(reuniao|visita|agendei|agendado|agendada)\b/.test(n)) etapa = 'reuniao';
    else if (/\b(fechou|fechei|fechamos)\b/.test(n) && !acharMotivoPerda(n)) etapa = 'fechado';
    return {
      kind: 'lead',
      nome: acharNome(original),
      whats: tel ? tel.tel : '',
      tipo: acharTipoBem(n) || dados.config.tipoPadrao,
      credito: valor && (valor.forte || valor.v >= 5000) ? Math.round(valor.v) : 0,
      origem: acharOrigem(n),
      etapa,
      data: data ? data.d : hoje(),
      obs: original,
    };
  },

  nota(original, n, cliente) {
    const c = cliente || acharClienteNoTexto(n);
    const data = acharData(n);
    const motivo = acharMotivoPerda(n);
    let acao = '';
    if (motivo && /\b(perdi|perdido|desistiu|nao vai|nao quer|fechou com|sumiu|parou de responder|preferiu)\b/.test(n)) acao = 'perdido';
    else if (/\b(fechou|fechei|fechamos|assinou)\b/.test(n)) acao = 'fechado';
    else if (/proposta (enviada|mandada)|(mandei|enviei|passei) (a )?proposta/.test(n)) acao = 'proposta';
    else if (/\b(reuniao|visita|agendei|agendado|agendada)\b/.test(n) && data) acao = 'reuniao';
    else if (data) acao = 'adiar';
    return { kind: 'nota', clienteId: c ? c.id : '', acao, data: data ? data.d : '', motivo: motivo || dados.config.motivos[0], texto: original };
  },

  saida(original, n) { return EXTRAIR.dinheiro(original, n, 'saida'); },
  entrada(original, n) { return EXTRAIR.dinheiro(original, n, 'entrada'); },
  dinheiro(original, n, tipo) {
    const data = acharData(n);
    const valor = acharValor(data ? n.replace(data.txt, ' ') : n);
    let desc = original
      .replace(/^\s*[+-]\s*/, '')
      .replace(/\b(gastei|paguei|comprei|recebi|ganhei|entrou|caiu)\b/i, '')
      .replace(/(r\$\s*)?\d+(?:[.,]\d+)*\s*(reais|real|conto|mil|k)?\b/i, '')
      .replace(/\s{2,}/g, ' ').trim()
      .replace(/^(de|do|da|no|na|em|com|pro|pra|para)\s+/i, '');
    desc = desc.charAt(0).toUpperCase() + desc.slice(1);
    return { kind: tipo, v: valor ? valor.v : 0, cat: acharCategoria(n, tipo), d: data ? data.d : hoje(), desc };
  },

  prosp(original, n) {
    const num = re => { const m = n.match(re); return m ? Number(m[1]) : 0; };
    const a = num(/(\d+)\s*(?:abordage(?:m|ns)|abordad[oa]s|contatos? novos?|mensage(?:m|ns) de prospec)/) || num(/\babordei\s+(\d+)/);
    const c = num(/(\d+)\s*conversas?/) || num(/\bconversei com\s+(\d+)/);
    const r = num(/(\d+)\s*reunio(?:es|ao)/) || num(/\b(?:agendei|marquei)\s+(\d+)/);
    let pomo = num(/(\d+)\s*pomodoros?/);
    if (!pomo && /\bpomodoro\b/.test(n)) pomo = 1;
    const bloco = dados.config.blocos.find(b => n.includes(semAcento(b))) || '';
    return { kind: 'prosp', a, c, r, pomo, bloco };
  },

  habito(original, n) {
    return { kind: 'habito', habitos: acharHabitos(n) };
  },

  tarefa(original, n) {
    const data = acharData(n);
    const t = original.replace(/^\s*(tarefa|lembrete|lembrar( de)?|nao esquecer( de)?)\s*[:\-]?\s*/i, '').trim();
    return { kind: 'tarefa', t: t.charAt(0).toUpperCase() + t.slice(1), d: data ? data.d : '' };
  },
};

/* ---------- Decide o que é cada linha ---------- */

function interpretar(original) {
  const n = semAcento(original).trim();
  const temValor = Boolean(acharValor(n));
  const tel = acharTelefone(original);

  if (/^(novo lead|lead|novo cliente|cadastra|cadastrar|prospect)\b/.test(n)) return EXTRAIR.lead(original, n);

  const verboSaida = /\b(gastei|paguei|comprei|gasto|despesa|conta de|conta da|conta do|boleto|saiu)\b/.test(n) || /^\s*-\s*\d/.test(n);
  const verboEntrada = /\b(recebi|ganhei|entrou|caiu|receita|comissao|salario)\b/.test(n) || /^\s*\+\s*\d/.test(n);
  if (!tel && temValor && verboSaida) return EXTRAIR.saida(original, n);
  if (!tel && temValor && verboEntrada && !/\b(quer|interess)/.test(n)) return EXTRAIR.entrada(original, n);

  if (/\d+\s*(abordage|abordad|conversas?\b|reunio|pomodoro)|\b(abordei|conversei com|agendei|marquei)\s+\d+|^pomodoro/.test(n)) {
    return EXTRAIR.prosp(original, n);
  }

  if (tel) return EXTRAIR.lead(original, n);

  const cliente = acharClienteNoTexto(n);
  if (cliente) return EXTRAIR.nota(original, n, cliente);

  if (acharHabitos(n).length && n.split(/\s+/).length <= 8) return EXTRAIR.habito(original, n);

  if (acharTipoBem(n) && (temValor || /\b(quer|interess|procura|pensando)/.test(n))) return EXTRAIR.lead(original, n);

  return EXTRAIR.tarefa(original, n);
}

/* ---------- Janela "Entendi assim" ---------- */

let itensIA = [];

function camposDoItem(it, i) {
  const campo = (nome, rotulo, html, largo) =>
    `<div class="${largo ? 'largo' : ''}"><label for="ia-${i}-${nome}">${rotulo}</label>${html}</div>`;
  const inp = (nome, valor, extra = '') => `<input id="ia-${i}-${nome}" data-campo="${nome}" value="${esc(valor)}" ${extra}>`;

  switch (it.kind) {
    case 'lead': {
      const dup = it.whats && whatsDuplicado(it.whats);
      return (dup ? `<div class="card amarelo" style="margin:6px 0 0;padding:10px">⚠️ Esse WhatsApp já é de <b>${esc(dup.nome)}</b>. Troque o tipo para "Anotação de cliente" se for a mesma pessoa.</div>` : '')
        + '<div class="campos">'
        + campo('nome', 'Nome', inp('nome', it.nome, 'autocapitalize="words"'))
        + campo('whats', 'WhatsApp', inp('whats', it.whats ? telefoneBonito(it.whats) : '', 'inputmode="tel"'))
        + campo('tipo', 'Tipo', `<select id="ia-${i}-tipo" data-campo="tipo">${opcoes(Object.entries(TIPOS), it.tipo)}</select>`)
        + campo('credito', 'Crédito', inp('credito', it.credito ? moeda(it.credito) : '', 'inputmode="numeric"'))
        + campo('origem', 'Origem', `<input id="ia-${i}-origem" data-campo="origem" list="ia-origens" value="${esc(it.origem)}">`)
        + campo('etapa', 'Etapa', `<select id="ia-${i}-etapa" data-campo="etapa">${opcoes(['novo', 'reuniao', 'proposta', 'fechado'].map(k => [k, ETAPAS[k]]), it.etapa)}</select>`)
        + campo('data', it.etapa === 'reuniao' ? 'Data da reunião' : it.etapa === 'proposta' ? 'Data da proposta' : 'Quando chamar',
          `<input id="ia-${i}-data" data-campo="data" type="date" value="${esc(it.data)}">`)
        + '</div>';
    }
    case 'nota': {
      const acoes = [['', 'Só anotar'], ['adiar', 'Anotar e chamar na data'], ['reuniao', 'Marcar reunião na data'],
        ['proposta', 'Proposta enviada'], ['fechado', 'Fechou 🎉'], ['perdido', 'Perdido']];
      const clientes = dados.clientes.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map(c => [c.id, c.nome]);
      return '<div class="campos">'
        + campo('clienteId', 'Cliente', `<select id="ia-${i}-clienteId" data-campo="clienteId"><option value="">Escolha...</option>${opcoes(clientes, it.clienteId)}</select>`, true)
        + campo('acao', 'O que fazer', `<select id="ia-${i}-acao" data-campo="acao">${opcoes(acoes, it.acao)}</select>`)
        + campo('data', 'Data', `<input id="ia-${i}-data" data-campo="data" type="date" value="${esc(it.data)}">`)
        + (it.acao === 'perdido' ? campo('motivo', 'Motivo', `<select id="ia-${i}-motivo" data-campo="motivo">${opcoes(dados.config.motivos, it.motivo)}</select>`, true) : '')
        + campo('texto', 'Anotação', `<textarea id="ia-${i}-texto" data-campo="texto" style="min-height:60px">${esc(it.texto)}</textarea>`, true)
        + '</div>';
    }
    case 'saida':
    case 'entrada':
      return '<div class="campos">'
        + campo('v', 'Valor', inp('v', it.v ? moedaCentavos(it.v) : '', 'inputmode="decimal"'))
        + campo('cat', 'Categoria', `<select id="ia-${i}-cat" data-campo="cat">${opcoes(it.kind === 'entrada' ? CAT_ENTRADA : CAT_SAIDA, it.cat)}</select>`)
        + campo('d', 'Data', `<input id="ia-${i}-d" data-campo="d" type="date" value="${esc(it.d)}">`)
        + campo('desc', 'Descrição', inp('desc', it.desc))
        + '</div>';
    case 'prosp':
      return '<div class="campos">'
        + campo('a', 'Abordagens', inp('a', it.a, 'type="number" min="0"'))
        + campo('c', 'Conversas', inp('c', it.c, 'type="number" min="0"'))
        + campo('r', 'Reuniões marcadas', inp('r', it.r, 'type="number" min="0"'))
        + campo('pomo', 'Pomodoros', inp('pomo', it.pomo, 'type="number" min="0"'))
        + campo('bloco', 'Bloco da base', `<select id="ia-${i}-bloco" data-campo="bloco"><option value="">—</option>${opcoes(dados.config.blocos, it.bloco)}</select>`, true)
        + '</div><div class="dica">Soma no contador de hoje.</div>';
    case 'habito':
      return `<div class="habitos" style="margin-top:8px">${dados.config.habitos.map(h => `
        <label class="linha" style="margin:0;font-weight:500"><input type="checkbox" data-habito="${esc(h)}" ${it.habitos.includes(h) ? 'checked' : ''}> ${esc(h)}</label>`).join('')}</div>`;
    default:
      return '<div class="campos">'
        + campo('t', 'Tarefa', inp('t', it.t), true)
        + campo('d', 'Data (opcional)', `<input id="ia-${i}-d" data-campo="d" type="date" value="${esc(it.d)}">`)
        + '</div>';
  }
}

function mostrarItensIA() {
  abrirModal(`
    ${topoModal(itensIA.length > 1 ? `Entendi ${itensIA.length} coisas` : 'Entendi assim')}
    <div class="dica" style="margin-bottom:10px">Confira e corrija se precisar. Se eu errei o tipo, é só trocar.</div>
    <datalist id="ia-origens">${ORIGENS.map(o => `<option value="${esc(o)}">`).join('')}</datalist>
    ${itensIA.map((it, i) => `
      <div class="card item-ia ${it.kind === 'lead' && it.whats && whatsDuplicado(it.whats) ? 'aviso-dup' : ''}" data-i="${i}">
        <div class="origem-txt">“${esc(it.fonte)}”</div>
        <div class="linha">
          <select data-acao-tipo="${i}">${opcoes(Object.entries(TIPOS_ITEM), it.kind)}</select>
          ${itensIA.length > 1 ? `<button class="btn-contorno btn-peq" data-acao="ia-tirar" data-i="${i}" aria-label="Descartar">✕</button>` : ''}
        </div>
        ${camposDoItem(it, i)}
      </div>`).join('')}
    <button class="btn-verde btn-bloco" data-acao="ia-salvar">✓ Salvar ${itensIA.length > 1 ? 'tudo' : ''}</button>`);
}

// Lê o que está na tela (o usuário pode ter corrigido) antes de trocar tipo ou salvar.
function lerCamposIA() {
  document.querySelectorAll('.item-ia').forEach(div => {
    const it = itensIA[Number(div.dataset.i)];
    if (!it) return;
    div.querySelectorAll('[data-campo]').forEach(el => { it[el.dataset.campo] = el.value; });
    if (it.kind === 'habito') it.habitos = [...div.querySelectorAll('[data-habito]')].filter(x => x.checked).map(x => x.dataset.habito);
  });
}

function salvarItemIA(it) {
  switch (it.kind) {
    case 'lead': {
      const nome = String(it.nome || '').trim();
      if (!nome) return 'Falta o nome do lead.';
      if (it.whats && numeroZap(it.whats).length < 12) return `Confira o WhatsApp de ${nome}.`;
      const c = { id: novoId('c'), criadoEm: hoje(), historico: [], contatos: 0, nome, whats: String(it.whats || '').trim(),
        tipo: it.tipo, credito: lerValor(it.credito), origem: String(it.origem || '').trim(), obs: it.obs || '', etapa: 'novo' };
      registrar(c, 'Lead cadastrado pelo assistente');
      const data = it.data || hoje();
      if (it.etapa === 'reuniao') marcarReuniao(c, data);
      else if (it.etapa === 'proposta') marcarProposta(c, data > hoje() ? hoje() : data);
      else if (it.etapa === 'fechado') fechar(c);
      else c.proximo = data;
      dados.clientes.push(c);
      return '';
    }
    case 'nota': {
      const c = acharCliente(it.clienteId);
      if (!c) return 'Escolha de qual cliente é a anotação.';
      if (String(it.texto || '').trim()) registrar(c, '📝 ' + String(it.texto).trim());
      const data = it.data || '';
      if (it.acao === 'adiar' && data) adiar(c, data);
      if (it.acao === 'reuniao') marcarReuniao(c, data || hoje());
      if (it.acao === 'proposta') marcarProposta(c, hoje());
      if (it.acao === 'fechado') fechar(c);
      if (it.acao === 'perdido') perder(c, it.motivo || dados.config.motivos[0]);
      return '';
    }
    case 'saida':
    case 'entrada': {
      const v = typeof it.v === 'number' ? it.v : lerValorCentavos(it.v);
      if (!(v > 0)) return 'Falta o valor.';
      dados.fin.push({ id: novoId('f'), d: it.d || hoje(), tipo: it.kind === 'entrada' ? 'e' : 's', v, cat: it.cat || 'Outros', desc: String(it.desc || '').trim() });
      return '';
    }
    case 'prosp': {
      const dia = diaProsp(hoje());
      const a = Number(it.a) || 0;
      dia.a += a;
      dia.c += Number(it.c) || 0;
      dia.r += Number(it.r) || 0;
      dia.pomo += Number(it.pomo) || 0;
      if (it.bloco && a) dia.blocos[it.bloco] = (dia.blocos[it.bloco] || 0) + a;
      return '';
    }
    case 'habito': {
      if (!it.habitos.length) return 'Marque qual hábito você fez.';
      const dia = diaDiario(hoje());
      it.habitos.forEach(h => { dia.h[h] = true; });
      return '';
    }
    default: {
      const t = String(it.t || '').trim();
      if (!t) return 'A tarefa está vazia.';
      dados.tarefas.push({ id: novoId('t'), t, d: it.d || '', feito: false, criado: hoje() });
      return '';
    }
  }
}

ACOES['ia-tirar'] = el => {
  lerCamposIA();
  itensIA.splice(Number(el.dataset.i), 1);
  if (!itensIA.length) return fecharModal();
  mostrarItensIA();
};

ACOES['ia-salvar'] = () => {
  lerCamposIA();
  for (const it of itensIA) {
    const erro = salvarItemIA(it);
    if (erro) {
      // Os que já foram salvos saem da lista para não duplicar.
      itensIA = itensIA.filter(x => !x.salvo);
      salvar(); desenhar(); mostrarItensIA();
      return avisar(erro);
    }
    it.salvo = true;
  }
  const total = itensIA.length;
  salvar();
  fecharModal();
  itensIA = [];
  $('#ia-texto').value = '';
  ajustarAltura();
  desenhar();
  avisar(total > 1 ? `Pronto: ${total} itens organizados.` : 'Pronto, organizado.');
};

document.addEventListener('change', e => {
  const sel = e.target.closest('[data-acao-tipo]');
  if (sel) {
    lerCamposIA();
    const i = Number(sel.dataset.acaoTipo);
    const fonte = itensIA[i].fonte;
    itensIA[i] = Object.assign(EXTRAIR[sel.value](fonte, semAcento(fonte)), { fonte });
    mostrarItensIA();
    return;
  }
  // Ao mudar a etapa do lead ou a ação da anotação, redesenha os campos certos.
  if (e.target.closest('.item-ia') && ['etapa', 'acao'].includes(e.target.dataset.campo)) {
    lerCamposIA();
    mostrarItensIA();
  }
});

/* ---------- Caixa de texto ---------- */

const caixaIA = $('#ia-texto');

function ajustarAltura() {
  caixaIA.style.height = '';
  if (caixaIA.value) caixaIA.style.height = Math.min(caixaIA.scrollHeight, 180) + 'px';
}
caixaIA.addEventListener('input', ajustarAltura);

// Enter organiza; Shift+Enter pula linha (no computador).
caixaIA.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) {
    e.preventDefault();
    $('#form-ia').requestSubmit();
  }
});

$('#form-ia').addEventListener('submit', e => {
  e.preventDefault();
  const linhas = caixaIA.value.split('\n').map(l => l.trim()).filter(Boolean);
  if (!linhas.length) { caixaIA.focus(); return avisar('Digite algo primeiro. Ex.: "gastei 40 de gasolina".'); }
  itensIA = linhas.map(l => Object.assign(interpretar(l), { fonte: l }));
  mostrarItensIA();
});

// Falar em vez de digitar (Chrome no Android e no computador).
const Reconhecedor = window.SpeechRecognition || window.webkitSpeechRecognition;
if (Reconhecedor) {
  const mic = $('#ia-mic');
  mic.hidden = false;
  let rec = null;
  mic.addEventListener('click', () => {
    if (rec) { rec.stop(); return; }
    rec = new Reconhecedor();
    rec.lang = 'pt-BR';
    rec.interimResults = false;
    rec.onresult = ev => {
      const t = [...ev.results].map(r => r[0].transcript).join(' ').trim();
      caixaIA.value = (caixaIA.value ? caixaIA.value.trim() + '\n' : '') + t;
      ajustarAltura();
    };
    rec.onend = () => { rec = null; mic.classList.remove('gravando'); };
    rec.onerror = () => avisar('Não consegui ouvir. Tente de novo ou digite.');
    mic.classList.add('gravando');
    rec.start();
  });
}
