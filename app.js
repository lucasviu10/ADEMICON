/* Central do Lucas — tudo roda no navegador, dados salvos no próprio aparelho. */
'use strict';

// Mantém a mesma chave do app de follow-up: quem já usava não perde nada.
const CHAVE = 'followup-lucas-v1';

const ETAPAS = {
  novo: 'Novo lead',
  reuniao: 'Reunião marcada',
  proposta: 'Proposta enviada',
  fu1: 'Follow-up 1',
  fu2: 'Follow-up 2',
  fu3: 'Follow-up 3',
  fechado: 'Fechado',
  perdido: 'Perdido',
};
const ATIVAS = ['novo', 'reuniao', 'proposta', 'fu1', 'fu2', 'fu3'];
const NA_REGUA = ['proposta', 'fu1', 'fu2', 'fu3'];

const TIPOS = { imobiliario: 'Imobiliário', veicular: 'Veicular', moveis: 'Bens móveis', servicos: 'Serviços', outros: 'Outros' };
const TIPO_NA_FRASE = { imobiliario: 'imobiliário', veicular: 'veicular', moveis: 'de bens móveis', servicos: 'de serviços', outros: '' };

const ORIGENS = ['Nestlé', 'Base Própria', 'Instagram', 'Facebook', 'Lead Frio', 'Indicação', 'Mercado', 'WhatsApp', 'Evento / feira'];

const NOMES_MODELO = {
  novo: 'Novo lead (primeiro contato)',
  reuniao: 'Confirmar reunião',
  proposta: 'Envio da proposta',
  fu1: 'Follow-up 1',
  fu2: 'Follow-up 2',
  fu3: 'Follow-up 3',
  final: 'Última tentativa',
  fechado: 'Pós-venda (fechado)',
};

const MODELOS_PADRAO = {
  novo: 'Oi {nome}, tudo bem? Aqui é o {meunome}, da Ademicon. Vi seu interesse em consórcio {tipo}. Posso te mandar uma simulação rápida pra você ver as parcelas?',
  reuniao: 'Oi {nome}, tudo certo? Passando pra confirmar nossa conversa sobre o seu planejamento. Continua de pé no horário combinado?',
  proposta: 'Oi {nome}! Como combinado, segue a proposta do consórcio {tipo} no valor de {credito}. Qualquer dúvida é só me chamar. Conseguiu abrir aí certinho?',
  fu1: 'Oi {nome}, tudo bem? Conseguiu dar uma olhada na proposta do consórcio {tipo}? Ficou alguma dúvida que eu possa esclarecer?',
  fu2: 'Oi {nome}! Passando pra saber o que achou da proposta de {credito}. Quer que eu ajuste o valor do crédito ou da parcela pra caber melhor no seu planejamento?',
  fu3: 'Oi {nome}, tudo certo? Sei que a rotina é corrida. Sobre o consórcio {tipo}: você prefere seguir agora, deixar mais pra frente ou que eu te chame em outro momento?',
  final: 'Oi {nome}! Não quero ser insistente, então essa é minha última mensagem sobre a proposta. Se ainda fizer sentido pra você, é só responder aqui. Posso encerrar seu atendimento por enquanto?',
  fechado: 'Oi {nome}, seja muito bem-vindo(a) à Ademicon! Obrigado pela confiança. Qualquer dúvida sobre boleto ou assembleia, pode contar comigo. Ficou tudo claro até aqui?',
};

const MOTIVOS_PADRAO = [
  'Achou a parcela alta',
  'Fechou com outra administradora',
  'Preferiu financiamento',
  'Desistiu da compra',
  'Sem condição financeira agora',
  'Parou de responder',
  'Outro',
];

const HABITOS_PADRAO = ['Treino', 'Leitura', 'Água 2L', 'Dormir 7h', 'Oração/Meditação'];
const BLOCOS_PADRAO = ['Ademi', 'Tok', 'Tok Final', 'Nestlé', 'Mercado'];
const CAT_SAIDA = ['Alimentação', 'Transporte', 'Moradia', 'Contas', 'Saúde', 'Educação', 'Lazer', 'Trabalho', 'Dívidas', 'Outros'];
const CAT_ENTRADA = ['Comissão Ademicon', 'Salário Nestlé', 'Extra', 'Outros'];

/* ---------- Dados ---------- */

let dados = carregar();

function carregar() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(CHAVE)); } catch (e) { /* sem dados */ }
  d = d || {};
  d.clientes = d.clientes || [];
  d.prosp = d.prosp || {};        // { 'AAAA-MM-DD': { a, c, r, pomo, blocos: { nome: n } } }
  d.fin = d.fin || [];            // [{ id, d, tipo: 'e'|'s', v, cat, desc }]
  d.diario = d.diario || {};      // { 'AAAA-MM-DD': { h: { habito: true } } }
  d.tarefas = d.tarefas || [];    // [{ id, t, d, feito }]
  d.notasPessoais = d.notasPessoais || '';
  d.config = d.config || {};
  const c = d.config;
  c.meunome = c.meunome || 'Lucas';
  c.dias = Array.isArray(c.dias) && c.dias.length ? c.dias : [1, 3, 7, 15];
  c.motivos = Array.isArray(c.motivos) && c.motivos.length ? c.motivos : MOTIVOS_PADRAO.slice();
  c.modelos = Object.assign({}, MODELOS_PADRAO, c.modelos || {});
  c.ultimoBackup = c.ultimoBackup || null;
  c.metaMes = c.metaMes || 1000000;
  c.ticket = c.ticket || 100000;
  c.abordPorVenda = c.abordPorVenda || 100;
  c.metaDia = c.metaDia || 100;
  c.ddd = c.ddd || '13';
  c.tipoPadrao = c.tipoPadrao || 'imobiliario';
  c.blocos = Array.isArray(c.blocos) && c.blocos.length ? c.blocos : BLOCOS_PADRAO.slice();
  c.habitos = Array.isArray(c.habitos) && c.habitos.length ? c.habitos : HABITOS_PADRAO.slice();
  c.tema = c.tema || 'auto';
  return d;
}

function salvar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(dados));
  } catch (e) {
    alert('Não consegui salvar no aparelho. Faça um backup em Ajustes agora.');
  }
}

function novoId(prefixo) {
  return prefixo + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* ---------- Datas (sempre no formato AAAA-MM-DD, horário local) ---------- */

function paraTexto(dt) {
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${m}-${d}`;
}
function paraData(txt) {
  const [a, m, d] = txt.split('-').map(Number);
  return new Date(a, m - 1, d, 12);
}
function hoje() { return paraTexto(new Date()); }
function somarDias(txt, n) {
  const dt = paraData(txt);
  dt.setDate(dt.getDate() + n);
  return paraTexto(dt);
}
function diasEntre(de, ate) {
  return Math.round((paraData(ate) - paraData(de)) / 86400000);
}
function dataCurta(txt) {
  if (!txt) return '—';
  const [a, m, d] = txt.split('-');
  return `${d}/${m}/${a}`;
}
function quando(txt) {
  const n = diasEntre(hoje(), txt);
  if (n === 0) return 'hoje';
  if (n === 1) return 'amanhã';
  if (n === -1) return 'ontem';
  if (n < 0) return `há ${-n} dias`;
  return `em ${n} dias (${dataCurta(txt).slice(0, 5)})`;
}
function mesAtual() { return hoje().slice(0, 7); }
function nomeMes(am) {
  const [a, m] = am.split('-').map(Number);
  const t = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/* ---------- Régua de follow-up ---------- */

// Qual modelo usar no contato número k da régua (1, 2, 3...).
function modeloDoContato(k) {
  const dias = dados.config.dias;
  if (k >= dias.length && dias.length > 1) return 'final';
  return k <= 3 ? 'fu' + k : 'final';
}

// Recalcula a data do próximo contato do cliente.
function agendar(c) {
  if (c.etapa === 'novo' || c.etapa === 'reuniao') {
    c.proximo = c.proximo || hoje();
    return;
  }
  if (!NA_REGUA.includes(c.etapa)) {
    c.proximo = null;
    return;
  }
  const dias = dados.config.dias;
  const k = (c.contatos || 0) + 1;
  if (!c.dataProposta || k > dias.length) {
    c.proximo = null;
    return;
  }
  let data = somarDias(c.dataProposta, dias[k - 1]);
  // Nunca marcar dois contatos no mesmo dia.
  if (c.ultimoContato && data <= c.ultimoContato) data = somarDias(c.ultimoContato, 1);
  c.proximo = data;
}

function modeloSugerido(c) {
  if (c.etapa === 'novo') return 'novo';
  if (c.etapa === 'reuniao') return 'reuniao';
  if (c.etapa === 'fechado') return 'fechado';
  if (c.etapa === 'perdido') return 'final';
  if (!c.proximo) return 'final';
  return modeloDoContato((c.contatos || 0) + 1);
}

function registrar(c, texto) {
  c.historico = c.historico || [];
  c.historico.unshift({ d: hoje(), t: texto });
}

/* ---------- Ações sobre o cliente ---------- */

function marcarProposta(c, data) {
  c.etapa = 'proposta';
  c.dataProposta = data || hoje();
  c.contatos = 0;
  c.ultimoContato = null;
  c.proximo = null;
  registrar(c, `Proposta enviada (${dataCurta(c.dataProposta)})`);
  agendar(c);
}

function marcarReuniao(c, data) {
  c.etapa = 'reuniao';
  c.dataReuniao = data || hoje();
  c.proximo = c.dataReuniao;
  registrar(c, `Reunião marcada para ${dataCurta(c.dataReuniao)}`);
}

function marcarFeito(c) {
  if (c.etapa === 'novo') {
    registrar(c, 'Contato feito (novo lead)');
    c.proximo = somarDias(hoje(), 2);
    return `Anotado. Próximo contato ${quando(c.proximo)}.`;
  }
  if (c.etapa === 'reuniao') {
    registrar(c, 'Confirmação de reunião enviada');
    c.proximo = somarDias(hoje(), 1);
    return 'Anotado. Depois da reunião, marque "Proposta enviada".';
  }
  if (!NA_REGUA.includes(c.etapa)) return '';
  const nome = NOMES_MODELO[modeloSugerido(c)];
  c.contatos = (c.contatos || 0) + 1;
  c.ultimoContato = hoje();
  c.etapa = 'fu' + Math.min(c.contatos, 3);
  registrar(c, `${nome} enviado`);
  agendar(c);
  return c.proximo
    ? `Feito! Próximo contato ${quando(c.proximo)}.`
    : 'Feito! A régua acabou: decida se é Fechado ou Perdido.';
}

function adiar(c, data) {
  c.proximo = data;
  registrar(c, `Contato adiado para ${dataCurta(data)}`);
}

function fechar(c) {
  c.etapa = 'fechado';
  c.proximo = null;
  c.dataFechamento = hoje();
  registrar(c, 'Venda fechada 🎉');
}

function perder(c, motivo) {
  c.etapa = 'perdido';
  c.motivoPerda = motivo;
  c.proximo = null;
  registrar(c, `Perdido: ${motivo}`);
}

function reabrir(c) {
  c.etapa = c.dataProposta ? 'proposta' : 'novo';
  c.contatos = 0;
  c.ultimoContato = null;
  c.motivoPerda = '';
  c.dataFechamento = null;
  c.proximo = hoje();
  if (c.etapa === 'proposta') {
    // Retoma a régua a partir de hoje.
    c.dataProposta = hoje();
    c.proximo = null;
    agendar(c);
  }
  registrar(c, 'Atendimento reaberto');
}

// Data em que a venda fechou (clientes antigos não tinham esse campo).
function dataFech(c) {
  if (c.etapa !== 'fechado') return null;
  if (c.dataFechamento) return c.dataFechamento;
  const h = (c.historico || []).find(x => x.t.startsWith('Venda fechada'));
  return h ? h.d : c.dataProposta || c.criadoEm || null;
}

/* ---------- Mensagem e WhatsApp ---------- */

function moeda(v) {
  if (!v) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
}
function moedaCentavos(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
function moedaCurta(v) {
  if (v >= 1e6) return 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi';
  if (v >= 1e3) return 'R$ ' + (v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' mil';
  return moeda(v) || 'R$ 0';
}
function lerValor(txt) {
  if (!txt) return 0;
  let s = String(txt).replace(/[^\d,]/g, '');
  s = s.split(',')[0];
  return parseInt(s, 10) || 0;
}
function lerValorCentavos(txt) {
  let s = String(txt || '').replace(/[^\d,.]/g, '');
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d+\.\d{1,2}$/.test(s)) { /* já está com ponto decimal */ }
  else s = s.replace(/[.,]/g, '');
  return Math.round((parseFloat(s) || 0) * 100) / 100;
}
function primeiroNome(nome) {
  return (nome || '').trim().split(/\s+/)[0] || '';
}

function montarMensagem(chave, c) {
  let t = dados.config.modelos[chave] || '';
  const credito = moeda(c.credito);
  if (!credito) t = t.replace(/\s*(no valor de|de)\s*\{credito\}/gi, '');
  t = t
    .replace(/\{nome\}/gi, primeiroNome(c.nome))
    .replace(/\{tipo\}/gi, TIPO_NA_FRASE[c.tipo] || '')
    .replace(/\{credito\}/gi, credito)
    .replace(/\{meunome\}/gi, dados.config.meunome);
  return t.replace(/ {2,}/g, ' ').replace(/ ([,.?!:])/g, '$1').trim();
}

function numeroZap(txt) {
  let n = String(txt || '').replace(/\D/g, '').replace(/^0+/, '');
  if (n.length === 8 || n.length === 9) n = dados.config.ddd + n;
  if (n.length === 10 || n.length === 11) n = '55' + n;
  return n;
}
// Sem número salvo, o WhatsApp abre e deixa escolher o contato.
function linkZap(c, msg) {
  return `https://wa.me/${numeroZap(c.whats)}?text=${encodeURIComponent(msg)}`;
}
function telefoneBonito(txt) {
  const n = String(txt || '').replace(/\D/g, '');
  const m = n.match(/^(?:55)?(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : txt;
}

/* ---------- Utilidades de tela ---------- */

const $ = (sel, raiz = document) => raiz.querySelector(sel);
const conteudo = $('#conteudo');
const modal = $('#modal');
const modalCorpo = $('#modal-corpo');
let abaAtual = 'painel';
let filtroEtapa = 'ativos';
let filtroOrigem = '';
let modoLeads = 'lista';
let textoBusca = '';
let aguardandoConfirmacao = null;

// Os outros arquivos (assistente.js, modulos.js) registram telas e ações aqui.
const TELAS = {};
const ACOES = {};
const DEPOIS_DE_DESENHAR = [];
const TITULOS = {
  painel: 'Painel', hoje: 'Hoje', leads: 'Leads e clientes', prospeccao: 'Prospecção',
  financas: 'Finanças', pessoal: 'Pessoal', arquivos: 'Arquivos', ajustes: 'Ajustes',
};

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function avisar(texto) {
  const el = $('#aviso');
  el.textContent = texto;
  el.hidden = false;
  clearTimeout(avisar.t);
  avisar.t = setTimeout(() => { el.hidden = true; }, 3200);
}

function acharCliente(id) { return dados.clientes.find(c => c.id === id); }

function abrirModal(html) {
  modalCorpo.innerHTML = html;
  if (!modal.open) modal.showModal();
  modal.scrollTop = 0;
}
function fecharModal() { if (modal.open) modal.close(); }
modal.addEventListener('click', e => { if (e.target === modal) fecharModal(); });

function topoModal(titulo) {
  return `<div class="modal-topo"><h3>${esc(titulo)}</h3><button class="fechar" data-acao="fechar-modal" aria-label="Fechar">✕</button></div>`;
}

function seloEtapa(c) {
  const cls = c.etapa === 'fechado' ? '' : c.etapa === 'perdido' ? 'preto' : c.etapa === 'reuniao' ? 'amarelo' : 'cinza';
  return `<span class="selo ${cls}">${esc(ETAPAS[c.etapa] || c.etapa)}</span>`;
}

function linhaInfo(c) {
  const partes = [TIPOS[c.tipo] || '', moeda(c.credito), c.origem].filter(Boolean);
  return partes.join(' · ');
}

function opcoes(lista, atual) {
  return lista.map(o => {
    const [v, n] = Array.isArray(o) ? o : [o, o];
    return `<option value="${esc(v)}" ${v === atual ? 'selected' : ''}>${esc(n)}</option>`;
  }).join('');
}

/* ---------- Tela: Hoje ---------- */

TELAS.hoje = function telaHoje() {
  const h = hoje();
  const ativos = dados.clientes.filter(c => ATIVAS.includes(c.etapa));
  const paraHoje = ativos
    .filter(c => c.proximo && c.proximo <= h)
    .sort((a, b) => a.proximo.localeCompare(b.proximo) || a.nome.localeCompare(b.nome));
  const atrasados = paraHoje.filter(c => c.proximo < h).length;
  const semPasso = ativos.filter(c => !c.proximo);
  const semana = ativos
    .filter(c => c.proximo && c.proximo > h && c.proximo <= somarDias(h, 7))
    .sort((a, b) => a.proximo.localeCompare(b.proximo));

  let html = `
    <div class="resumo">
      <div><b>${paraHoje.length}</b><span>para chamar</span></div>
      <div class="${atrasados ? 'alerta' : ''}"><b>${atrasados}</b><span>atrasados</span></div>
      <div><b>${ativos.length}</b><span>em aberto</span></div>
    </div>`;

  html += avisoBackup();

  html += '<h2>Chamar hoje</h2>';
  if (!paraHoje.length) {
    html += dados.clientes.length
      ? '<div class="vazio"><b>Tudo em dia ✅</b>Ninguém para chamar hoje. Hora de prospectar.</div>'
      : '<div class="vazio"><b>Comece por aqui</b>Digite um lead na caixa lá em cima, do seu jeito.</div>';
  } else {
    html += '<div class="grade duas">' + paraHoje.map(cardContato).join('') + '</div>';
  }

  if (semPasso.length) {
    html += '<h2>Régua terminou: decida</h2><div class="grade duas">';
    html += semPasso.map(c => `
      <div class="card" data-abrir="${c.id}">
        <div class="card-topo">
          <div><div class="card-nome">${esc(c.nome)}</div><div class="card-info">${esc(linhaInfo(c))}</div></div>
          ${seloEtapa(c)}
        </div>
        <div class="acoes">
          <button class="btn-verde" data-acao="fechar" data-id="${c.id}">Fechou 🎉</button>
          <button class="btn-contorno" data-acao="perder" data-id="${c.id}">Perdido</button>
        </div>
      </div>`).join('');
    html += '</div>';
  }

  html += blocoTarefasHoje();

  if (semana.length) {
    html += '<h2>Próximos 7 dias</h2><div class="grade duas">';
    html += semana.map(c => `
      <div class="card" data-abrir="${c.id}">
        <div class="card-topo">
          <div><div class="card-nome">${esc(c.nome)}</div><div class="card-info">${esc(NOMES_MODELO[modeloSugerido(c)])} · ${esc(quando(c.proximo))}</div></div>
          ${seloEtapa(c)}
        </div>
      </div>`).join('');
    html += '</div>';
  }
  return html;
};

function cardContato(c) {
  const atraso = diasEntre(c.proximo, hoje());
  const selo = atraso > 0
    ? `<span class="selo vermelho">${atraso} ${atraso === 1 ? 'dia' : 'dias'} de atraso</span>`
    : c.etapa === 'reuniao' ? '<span class="selo amarelo">Reunião</span>' : '<span class="selo">Hoje</span>';
  const chave = modeloSugerido(c);
  const extra = c.etapa === 'reuniao'
    ? `<button class="btn-verde btn-bloco btn-peq" data-acao="proposta" data-id="${c.id}">📄 Reunião feita: proposta enviada</button>`
    : '';
  return `
    <div class="card ${atraso > 0 ? 'atrasado' : 'hoje'}" data-abrir="${c.id}">
      <div class="card-topo">
        <div>
          <div class="card-nome">${esc(c.nome)}</div>
          <div class="card-info">${esc(linhaInfo(c))}</div>
          <div class="card-info">Mandar: <b>${esc(NOMES_MODELO[chave])}</b></div>
        </div>
        ${selo}
      </div>
      <div class="acoes">
        <a class="btn btn-zap" href="${esc(linkZap(c, montarMensagem(chave, c)))}" target="_blank" rel="noopener" data-zap="${c.id}">💬 Chamar</a>
        <button class="btn-contorno" data-acao="feito" data-id="${c.id}" style="flex:0 0 38%">✓ Feito</button>
      </div>
      ${extra}
    </div>`;
}

function avisoBackup() {
  if (!dados.clientes.length && !dados.fin.length) return '';
  const ult = dados.config.ultimoBackup;
  if (ult && diasEntre(ult, hoje()) < 7) return '';
  return `<div class="card amarelo" style="margin-top:10px">
    <b>Faça um backup</b><div class="card-info">Seus dados ficam salvos só neste aparelho. ${ult ? 'Último backup: ' + dataCurta(ult) + '.' : 'Você ainda não fez nenhum.'}</div>
    <button class="btn-contorno btn-bloco btn-peq" data-acao="backup">Fazer backup agora</button>
  </div>`;
}

/* ---------- Tela: Leads ---------- */

TELAS.leads = function telaClientes() {
  const filtros = [['ativos', 'Em aberto'], ['todos', 'Todos'], ...Object.entries(ETAPAS)];
  const origens = [...new Set(dados.clientes.map(c => c.origem).filter(Boolean))].sort();
  let base = dados.clientes.slice();
  if (filtroOrigem) base = base.filter(c => c.origem === filtroOrigem);
  const b = textoBusca.trim().toLowerCase();
  if (b) {
    const dig = b.replace(/\D/g, '');
    base = base.filter(c => c.nome.toLowerCase().includes(b) || (c.obs || '').toLowerCase().includes(b)
      || (dig && String(c.whats).replace(/\D/g, '').includes(dig)));
  }

  let html = `
    <div class="busca">
      <input type="search" id="busca" placeholder="Buscar por nome, telefone ou anotação" value="${esc(textoBusca)}">
      <button class="btn-verde" data-acao="novo-cliente" style="flex:0 0 auto">+ Lead</button>
    </div>
    <div class="linha" style="margin-bottom:8px">
      <select id="filtro-origem"><option value="">Todas as origens</option>${opcoes(origens, filtroOrigem)}</select>
      <div class="tipo-toggle" style="flex:0 0 170px">
        <button class="btn-peq ${modoLeads === 'lista' ? 'ativo' : ''}" data-acao="modo-leads" data-modo="lista">Lista</button>
        <button class="btn-peq ${modoLeads === 'funil' ? 'ativo' : ''}" data-acao="modo-leads" data-modo="funil">Funil</button>
      </div>
    </div>`;

  if (modoLeads === 'funil') {
    const cols = ATIVAS.concat(['fechado']);
    html += '<div class="funil">' + cols.map(et => {
      const lista = base.filter(c => c.etapa === et).sort((x, y) => (x.proximo || '9').localeCompare(y.proximo || '9'));
      const soma = lista.reduce((s, c) => s + (c.credito || 0), 0);
      return `<div class="funil-col">
        <h3><span>${esc(ETAPAS[et])}</span><span>${lista.length}</span></h3>
        <div class="dica" style="margin:-4px 0 8px">${soma ? esc(moedaCurta(soma)) : '&nbsp;'}</div>
        ${lista.map(c => `<div class="card" data-abrir="${c.id}">
          <div class="card-nome">${esc(c.nome)}</div>
          <div class="card-info">${esc([moeda(c.credito), c.origem].filter(Boolean).join(' · '))}</div>
          ${c.proximo ? `<div class="card-info">Próximo: ${esc(quando(c.proximo))}</div>` : ''}
        </div>`).join('') || '<div class="dica">Ninguém aqui.</div>'}
      </div>`;
    }).join('') + '</div>';
    return html;
  }

  let lista = base;
  if (filtroEtapa === 'ativos') lista = lista.filter(c => ATIVAS.includes(c.etapa));
  else if (filtroEtapa !== 'todos') lista = lista.filter(c => c.etapa === filtroEtapa);
  lista.sort((x, y) => x.nome.localeCompare(y.nome));

  html += `<div class="filtros">${filtros.map(([k, n]) => {
    const qtd = k === 'todos' ? base.length
      : k === 'ativos' ? base.filter(c => ATIVAS.includes(c.etapa)).length
      : base.filter(c => c.etapa === k).length;
    return `<button data-filtro="${k}" class="${filtroEtapa === k ? 'ativo' : ''}">${esc(n)} (${qtd})</button>`;
  }).join('')}</div>`;

  if (!lista.length) return html + '<div class="vazio">Nenhum lead aqui.</div>';

  html += '<div class="grade duas">' + lista.map(c => {
    const prox = c.proximo ? `Próximo contato ${quando(c.proximo)}` : c.etapa === 'perdido' ? (c.motivoPerda || '') : '';
    return `
      <div class="card ${c.proximo && c.proximo < hoje() && ATIVAS.includes(c.etapa) ? 'atrasado' : ''}" data-abrir="${c.id}">
        <div class="card-topo">
          <div>
            <div class="card-nome">${esc(c.nome)}</div>
            <div class="card-info">${esc(linhaInfo(c))}</div>
            ${prox ? `<div class="card-info">${esc(prox)}</div>` : ''}
          </div>
          ${seloEtapa(c)}
        </div>
      </div>`;
  }).join('') + '</div>';
  return html;
};

/* ---------- Tela: Ajustes ---------- */

TELAS.ajustes = function telaConfig() {
  const cfg = dados.config;
  const fechados = dados.clientes.filter(c => c.etapa === 'fechado').length;
  const perdidos = dados.clientes.filter(c => c.etapa === 'perdido');
  const porMotivo = {};
  perdidos.forEach(c => { porMotivo[c.motivoPerda || 'Sem motivo'] = (porMotivo[c.motivoPerda || 'Sem motivo'] || 0) + 1; });
  const motivosOrd = Object.entries(porMotivo).sort((a, b) => b[1] - a[1]);

  const listaEditavel = (nome, itens) => `
    <div id="lista-${nome}">${itens.map((m, i) => `
      <div class="item-lista">
        <input value="${esc(m)}" data-${nome}="${i}">
        <button class="btn-contorno" data-acao="lista-tirar" data-lista="${nome}" data-i="${i}" aria-label="Remover">✕</button>
      </div>`).join('')}</div>
    <div class="grade2">
      <button class="btn-contorno" data-acao="lista-mais" data-lista="${nome}">+ Adicionar</button>
      <button class="btn-verde" data-acao="lista-salvar" data-lista="${nome}">Salvar</button>
    </div>`;

  return `
    <div class="grade duas">
    <div>
    <h2>Metas e números</h2>
    <div class="card">
      <div class="grade2">
        <div><label for="cfg-metaMes" style="margin-top:0">Meta de vendas no mês</label><input id="cfg-metaMes" inputmode="numeric" value="${esc(moeda(cfg.metaMes))}"></div>
        <div><label for="cfg-ticket" style="margin-top:0">Ticket médio</label><input id="cfg-ticket" inputmode="numeric" value="${esc(moeda(cfg.ticket))}"></div>
        <div><label for="cfg-abordPorVenda">Abordagens por venda</label><input id="cfg-abordPorVenda" type="number" min="1" value="${cfg.abordPorVenda}"></div>
        <div><label for="cfg-metaDia">Meta de abordagens/dia</label><input id="cfg-metaDia" type="number" min="1" value="${cfg.metaDia}"></div>
        <div><label for="cfg-ddd">DDD padrão</label><input id="cfg-ddd" inputmode="numeric" maxlength="2" value="${esc(cfg.ddd)}"></div>
        <div><label for="cfg-tipoPadrao">Tipo padrão do lead</label><select id="cfg-tipoPadrao">${opcoes(Object.entries(TIPOS), cfg.tipoPadrao)}</select></div>
      </div>
      <div class="dica">"Abordagens por venda" é a sua estimativa até ter dados suficientes. Depois de 200 abordagens registradas, o Painel passa a usar o seu número real.</div>
      <button class="btn-verde btn-bloco" data-acao="salvar-metas">Salvar metas</button>
    </div>

    <h2>Aparência</h2>
    <div class="card">
      <div class="tipo-toggle" style="grid-template-columns:repeat(3,1fr)">
        ${[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Escuro']].map(([k, n]) =>
          `<button class="btn-peq ${cfg.tema === k ? 'ativo' : ''}" data-acao="tema" data-tema="${k}">${n}</button>`).join('')}
      </div>
      <div class="dica">Automático segue o modo do seu celular ou computador.</div>
    </div>

    <h2>Seu nome nas mensagens</h2>
    <div class="card">
      <input id="cfg-nome" value="${esc(cfg.meunome)}">
      <div class="dica">Entra no lugar de {meunome} nos modelos.</div>
    </div>

    <h2>Blocos da sua base</h2>
    <div class="card">
      <div class="dica" style="margin:0 0 10px">Aparecem na Prospecção para você marcar de qual bloco são as abordagens.</div>
      ${listaEditavel('blocos', cfg.blocos)}
    </div>

    <h2>Hábitos</h2>
    <div class="card">
      <div class="dica" style="margin:0 0 10px">Os hábitos que você marca todo dia na aba Pessoal.</div>
      ${listaEditavel('habitos', cfg.habitos)}
    </div>

    <h2>Motivos de perda</h2>
    <div class="card">
      ${motivosOrd.length ? `<div class="detalhe" style="margin-bottom:10px">${motivosOrd.map(([m, n]) => `<div><span>${esc(m)}</span><b>${n}</b></div>`).join('')}</div>` : ''}
      ${listaEditavel('motivos', cfg.motivos)}
    </div>
    </div>

    <div>
    <h2>Régua de follow-up</h2>
    <div class="card">
      <div class="dica" style="margin:0 0 10px">Quantos dias depois da proposta enviada eu devo chamar o cliente de novo.</div>
      <div id="lista-dias">${cfg.dias.map((d, i) => `
        <div class="item-lista">
          <span style="white-space:nowrap;font-weight:600">${i + 1}º contato:</span>
          <input type="number" inputmode="numeric" min="1" max="365" value="${d}" data-dia="${i}">
          <span style="white-space:nowrap">dias</span>
          <button class="btn-contorno" data-acao="tirar-dia" data-i="${i}" aria-label="Remover">✕</button>
        </div>`).join('')}</div>
      <div class="grade2">
        <button class="btn-contorno" data-acao="mais-dia">+ Contato</button>
        <button class="btn-verde" data-acao="salvar-dias">Salvar régua</button>
      </div>
      <div class="dica">Contatos 1, 2 e 3 usam os modelos Follow-up 1, 2 e 3. O último usa "Última tentativa".</div>
    </div>

    <h2>Modelos de mensagem</h2>
    <div class="card">
      <div class="dica" style="margin:0">Campos automáticos: <b>{nome}</b> (primeiro nome), <b>{tipo}</b>, <b>{credito}</b>, <b>{meunome}</b>.</div>
      ${Object.keys(NOMES_MODELO).map(k => `
        <label for="mod-${k}">${esc(NOMES_MODELO[k])}</label>
        <textarea id="mod-${k}" data-modelo="${k}">${esc(cfg.modelos[k])}</textarea>`).join('')}
      <button class="btn-verde btn-bloco" data-acao="salvar-modelos">Salvar modelos</button>
      <button class="btn-contorno btn-bloco btn-peq" data-acao="restaurar-modelos">Voltar aos modelos originais</button>
    </div>

    <h2>Backup</h2>
    <div class="card">
      <div class="dica" style="margin:0 0 6px">Tudo fica só neste aparelho: leads, finanças, hábitos e arquivos. Faça backup toda semana e guarde o arquivo no Google Drive ou mande pra você mesmo no WhatsApp. O mesmo arquivo serve para passar tudo do celular para o computador.</div>
      <div class="dica" style="margin:0 0 6px">Último backup: <b>${cfg.ultimoBackup ? dataCurta(cfg.ultimoBackup) : 'nunca'}</b> · ${dados.clientes.length} leads · ${fechados} fechados</div>
      <button class="btn-verde btn-bloco" data-acao="backup">⬇️ Baixar backup</button>
      <button class="btn-contorno btn-bloco" data-acao="restaurar">⬆️ Restaurar de um backup</button>
      <input type="file" id="arquivo-backup" accept=".json,application/json" hidden>
    </div>
    </div>
    </div>
    <p class="dica" style="text-align:center;margin-top:18px">Central do Lucas · versão 2</p>`;
};

/* ---------- Detalhe do cliente ---------- */

function abrirDetalhe(id) {
  const c = acharCliente(id);
  if (!c) return;
  const sugerido = modeloSugerido(c);
  const msg = montarMensagem(sugerido, c);
  const ativo = ATIVAS.includes(c.etapa);
  const emRegua = NA_REGUA.includes(c.etapa);

  let botoes = '';
  if (ativo) {
    botoes += `<div class="grade2" style="margin-top:10px">
      <button class="btn-contorno" data-acao="feito" data-id="${c.id}">✓ Mensagem enviada</button>
      <button class="btn-contorno" data-acao="adiar" data-id="${c.id}">⏰ Adiar</button>
    </div>`;
    if (c.etapa === 'novo') {
      botoes += `<div class="grade2" style="margin-top:10px">
        <button class="btn-contorno" data-acao="reuniao" data-id="${c.id}">📅 Marcar reunião</button>
        <button class="btn-verde" data-acao="proposta" data-id="${c.id}">📄 Proposta enviada</button>
      </div>`;
    } else if (c.etapa === 'reuniao') {
      botoes += `<button class="btn-verde btn-bloco" data-acao="proposta" data-id="${c.id}">📄 Marcar proposta enviada</button>`;
    }
    botoes += `<div class="grade2" style="margin-top:10px">
      <button class="btn-verde" data-acao="fechar" data-id="${c.id}">Fechou 🎉</button>
      <button class="btn-vermelho" data-acao="perder" data-id="${c.id}">Perdido</button>
    </div>`;
  } else {
    botoes += `<button class="btn-contorno btn-bloco" data-acao="reabrir" data-id="${c.id}">↩️ Reabrir atendimento</button>`;
  }

  abrirModal(`
    ${topoModal(c.nome)}
    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:10px">
      ${seloEtapa(c)}
      ${c.proximo ? `<span class="card-info">Próximo contato: <b>${esc(quando(c.proximo))}</b></span>` : ''}
      ${c.etapa === 'perdido' && c.motivoPerda ? `<span class="card-info">Motivo: ${esc(c.motivoPerda)}</span>` : ''}
    </div>

    <div class="card">
      <label for="det-modelo" style="margin-top:0">Mensagem</label>
      <select id="det-modelo" data-id="${c.id}">
        ${Object.keys(NOMES_MODELO).map(k => `<option value="${k}" ${k === sugerido ? 'selected' : ''}>${esc(NOMES_MODELO[k])}${k === sugerido ? ' (sugerida)' : ''}</option>`).join('')}
      </select>
      <textarea id="det-msg" style="margin-top:8px;background:var(--balao);min-height:140px">${esc(msg)}</textarea>
      <div class="dica">Pode ajustar o texto aqui antes de abrir o WhatsApp.</div>
      <a id="det-zap" class="btn btn-zap btn-bloco" href="${esc(linkZap(c, msg))}" target="_blank" rel="noopener" data-zap="${c.id}">💬 Chamar no WhatsApp</a>
      ${botoes}
    </div>

    <h2>Dados</h2>
    <div class="detalhe">
      <div><span>WhatsApp</span><b>${esc(telefoneBonito(c.whats) || '—')}</b></div>
      <div><span>Tipo</span><b>${esc(TIPOS[c.tipo] || '—')}</b></div>
      <div><span>Crédito</span><b>${esc(moeda(c.credito) || '—')}</b></div>
      <div><span>Origem</span><b>${esc(c.origem || '—')}</b></div>
      <div><span>Cadastro</span><b>${esc(dataCurta(c.criadoEm))}</b></div>
      ${c.dataReuniao ? `<div><span>Reunião</span><b>${esc(dataCurta(c.dataReuniao))}</b></div>` : ''}
      <div><span>Proposta enviada</span><b>${esc(dataCurta(c.dataProposta))}</b></div>
      ${c.etapa === 'fechado' ? `<div><span>Fechou em</span><b>${esc(dataCurta(dataFech(c)))}</b></div>` : ''}
      ${emRegua ? `<div><span>Contatos feitos</span><b>${c.contatos || 0} de ${dados.config.dias.length}</b></div>` : ''}
      ${c.obs ? `<div style="display:block"><span>Observação</span><p style="margin:4px 0 0;white-space:pre-wrap">${esc(c.obs)}</p></div>` : ''}
    </div>

    <h2>Arquivos</h2>
    ${blocoArquivosCliente(c.id)}

    <h2>Anotações e histórico</h2>
    <div class="item-lista">
      <input id="det-nota" placeholder="Ex.: pediu pra chamar depois do dia 10">
      <button class="btn-verde" data-acao="nota" data-id="${c.id}" aria-label="Salvar anotação">+</button>
    </div>
    <ul class="historico">${(c.historico || []).map(h => `<li><time>${esc(dataCurta(h.d).slice(0, 5))}</time>${esc(h.t)}</li>`).join('') || '<li class="dica">Nada ainda.</li>'}</ul>

    <div class="grade2" style="margin-top:16px">
      <button class="btn-contorno" data-acao="editar" data-id="${c.id}">✏️ Editar</button>
      <button class="btn-contorno" data-acao="excluir" data-id="${c.id}" style="color:var(--vermelho)">🗑️ Excluir</button>
    </div>`);
}

/* ---------- Formulário de cadastro/edição ---------- */

// `previo` permite abrir o formulário já preenchido (vem do assistente).
function abrirFormulario(id, previo) {
  const c = id ? acharCliente(id) : null;
  const v = c || Object.assign({ tipo: dados.config.tipoPadrao, etapa: 'novo', dataProposta: '' }, previo || {});
  const dataAcao = v.etapa === 'reuniao' ? (v.dataReuniao || v.proximo) : v.proximo;
  abrirModal(`
    ${topoModal(c ? 'Editar lead' : 'Novo lead')}
    <form id="form-cliente" data-id="${c ? c.id : ''}" autocomplete="off">
      <label for="f-nome">Nome *</label>
      <input id="f-nome" name="nome" required value="${esc(v.nome)}" autocapitalize="words">

      <label for="f-whats">WhatsApp (com DDD)</label>
      <input id="f-whats" name="whats" inputmode="tel" placeholder="(13) 99123-4567" value="${esc(v.whats)}">

      <div class="grade2">
        <div><label>Tipo</label><select name="tipo">${opcoes(Object.entries(TIPOS), v.tipo)}</select></div>
        <div><label for="f-credito">Crédito de interesse</label>
        <input id="f-credito" name="credito" inputmode="numeric" placeholder="Ex.: 300000" value="${v.credito ? esc(moeda(v.credito)) : ''}"></div>
      </div>

      <label for="f-origem">Origem do lead</label>
      <input id="f-origem" name="origem" list="origens" value="${esc(v.origem)}" placeholder="Toque para escolher ou digite">
      <datalist id="origens">${ORIGENS.map(o => `<option value="${esc(o)}">`).join('')}</datalist>

      <label>Etapa</label>
      <select name="etapa" id="f-etapa">${opcoes(Object.entries(ETAPAS), v.etapa)}</select>

      <div id="bloco-acao">
        <label for="f-acao" id="rot-acao">Quando chamar</label>
        <input id="f-acao" name="dataAcao" type="date" value="${esc(dataAcao || hoje())}">
      </div>

      <div id="bloco-data">
        <label for="f-data">Data em que a proposta foi enviada</label>
        <input id="f-data" name="dataProposta" type="date" value="${esc(v.dataProposta || hoje())}">
        <div class="dica">A régua de follow-up conta a partir desta data.</div>
      </div>

      <div id="bloco-motivo">
        <label>Motivo da perda</label>
        <select name="motivoPerda">${opcoes(dados.config.motivos, v.motivoPerda)}</select>
      </div>

      <label for="f-obs">Observação</label>
      <textarea id="f-obs" name="obs" placeholder="Ex.: quer casa até R$ 300 mil, prefere parcela até R$ 1.500">${esc(v.obs)}</textarea>

      <button type="submit" class="btn-verde btn-bloco">Salvar</button>
    </form>`);
  ajustarCamposForm();
  $('#f-etapa').addEventListener('change', ajustarCamposForm);
  if (!c && !previo) setTimeout(() => $('#f-nome').focus(), 50);
}

function ajustarCamposForm() {
  const etapa = $('#f-etapa').value;
  $('#bloco-acao').hidden = !['novo', 'reuniao'].includes(etapa);
  $('#rot-acao').textContent = etapa === 'reuniao' ? 'Data da reunião' : 'Quando chamar';
  $('#bloco-data').hidden = ['novo', 'reuniao'].includes(etapa);
  $('#bloco-motivo').hidden = etapa !== 'perdido';
}

function whatsDuplicado(whats, ignorarId) {
  const n = numeroZap(whats);
  if (n.length < 12) return null;
  return dados.clientes.find(x => x.id !== ignorarId && numeroZap(x.whats) === n) || null;
}

function salvarFormulario(form) {
  const f = new FormData(form);
  const nome = String(f.get('nome') || '').trim();
  const whats = String(f.get('whats') || '').trim();
  if (!nome) return avisar('Coloque o nome do lead.');
  if (whats && numeroZap(whats).length < 12) return avisar('Confira o WhatsApp: precisa ter DDD + número.');

  const id = form.dataset.id;
  const novo = !id;
  const dup = whatsDuplicado(whats, id);
  if (dup && !confirm(`${dup.nome} já está cadastrado com esse WhatsApp. Salvar mesmo assim?`)) return;

  const c = novo ? { id: novoId('c'), criadoEm: hoje(), historico: [], contatos: 0 } : acharCliente(id);
  const etapaAntes = c.etapa;
  const dataAntes = c.dataProposta;

  c.nome = nome;
  c.whats = whats;
  c.tipo = f.get('tipo');
  c.credito = lerValor(f.get('credito'));
  c.origem = String(f.get('origem') || '').trim();
  c.obs = String(f.get('obs') || '').trim();
  const etapa = f.get('etapa');
  const data = f.get('dataProposta') || hoje();
  const dataAcao = f.get('dataAcao') || hoje();

  if (novo) registrar(c, 'Lead cadastrado');

  if (etapa === 'novo') {
    if (etapaAntes !== 'novo') {
      c.dataProposta = ''; c.contatos = 0; c.ultimoContato = null;
      if (!novo) registrar(c, 'Voltou para Novo lead');
    }
    c.etapa = 'novo';
    c.proximo = dataAcao;
  } else if (etapa === 'reuniao') {
    if (etapaAntes !== 'reuniao' || c.dataReuniao !== dataAcao) marcarReuniao(c, dataAcao);
  } else if (etapa !== etapaAntes || data !== dataAntes) {
    if (etapa === 'fechado') {
      c.dataProposta = data; fechar(c);
    } else if (etapa === 'perdido') {
      c.dataProposta = data; perder(c, f.get('motivoPerda'));
    } else {
      // Proposta enviada ou algum follow-up: monta a régua a partir da data da proposta.
      c.etapa = etapa;
      c.dataProposta = data;
      c.contatos = etapa === 'proposta' ? 0 : Number(etapa.slice(2));
      c.ultimoContato = null;
      c.proximo = null;
      registrar(c, `Etapa: ${ETAPAS[etapa]} (proposta de ${dataCurta(data)})`);
      agendar(c);
    }
  } else if (etapa === 'perdido') {
    c.motivoPerda = f.get('motivoPerda');
  }

  if (novo) dados.clientes.push(c);
  salvar();
  fecharModal();
  avisar(novo ? `Lead salvo: ${primeiroNome(nome)}.` : 'Alterações salvas.');
  desenhar();
  if (!novo) abrirDetalhe(c.id);
}

/* ---------- Janelinhas de ação ---------- */

function escolherAdiamento(id) {
  const c = acharCliente(id);
  abrirModal(`
    ${topoModal('Adiar ' + primeiroNome(c.nome))}
    <div class="grade2" style="margin-top:12px">
      <button class="btn-contorno" data-acao="adiar-dias" data-id="${id}" data-n="1">Amanhã</button>
      <button class="btn-contorno" data-acao="adiar-dias" data-id="${id}" data-n="3">Em 3 dias</button>
      <button class="btn-contorno" data-acao="adiar-dias" data-id="${id}" data-n="7">Em 1 semana</button>
      <button class="btn-contorno" data-acao="adiar-dias" data-id="${id}" data-n="30">Em 1 mês</button>
    </div>
    <label for="adiar-data">Ou escolha a data</label>
    <input type="date" id="adiar-data" min="${somarDias(hoje(), 1)}" value="${somarDias(hoje(), 1)}">
    <button class="btn-verde btn-bloco" data-acao="adiar-data" data-id="${id}">Adiar para esta data</button>`);
}

function escolherMotivo(id) {
  const c = acharCliente(id);
  abrirModal(`
    ${topoModal(`Por que ${primeiroNome(c.nome)} não fechou?`)}
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
      ${dados.config.motivos.map((m, i) => `<button class="btn-contorno" data-acao="motivo" data-id="${id}" data-i="${i}">${esc(m)}</button>`).join('')}
    </div>
    <div class="dica" style="margin-top:10px">Dá pra editar essa lista em Ajustes.</div>`);
}

function escolherDataProposta(id) {
  abrirModal(`
    ${topoModal('Proposta enviada')}
    <label for="data-prop">Quando você enviou a proposta?</label>
    <input type="date" id="data-prop" value="${hoje()}" max="${hoje()}">
    <div class="dica">O app agenda os contatos: ${dados.config.dias.map(d => d + (d === 1 ? ' dia' : ' dias')).join(', ')} depois dessa data.</div>
    <button class="btn-verde btn-bloco" data-acao="confirmar-proposta" data-id="${id}">Confirmar</button>`);
}

function escolherDataReuniao(id) {
  abrirModal(`
    ${topoModal('Marcar reunião')}
    <label for="data-reu">Quando é a reunião?</label>
    <input type="date" id="data-reu" value="${somarDias(hoje(), 1)}" min="${hoje()}">
    <div class="dica">No dia, o lead aparece em Hoje com a mensagem de confirmação pronta.</div>
    <button class="btn-verde btn-bloco" data-acao="confirmar-reuniao" data-id="${id}">Confirmar</button>`);
}

function perguntarSeEnviou(id) {
  const c = acharCliente(id);
  if (!c || !ATIVAS.includes(c.etapa)) return;
  abrirModal(`
    ${topoModal('Mandou a mensagem?')}
    <p style="margin:6px 0 14px">Se você enviou para <b>${esc(c.nome)}</b>, eu registro e já agendo o próximo contato.</p>
    <button class="btn-verde btn-bloco" data-acao="feito" data-id="${id}">✓ Sim, enviei</button>
    <button class="btn-contorno btn-bloco" data-acao="fechar-modal">Ainda não</button>`);
}

/* ---------- Backup (inclui os arquivos anexados) ---------- */

function blobParaDataUrl(blob) {
  return new Promise((ok, erro) => {
    const r = new FileReader();
    r.onload = () => ok(r.result);
    r.onerror = erro;
    r.readAsDataURL(blob);
  });
}

async function baixarBackup() {
  dados.config.ultimoBackup = hoje();
  salvar();
  avisar('Preparando backup...');
  const copia = JSON.parse(JSON.stringify(dados));
  try {
    const arqs = await arquivosTodos();
    copia.arquivos = await Promise.all(arqs.map(async a => {
      const { blob, ...resto } = a;
      return Object.assign(resto, { conteudo: await blobParaDataUrl(blob) });
    }));
  } catch (e) {
    copia.arquivos = [];
  }
  const blob = new Blob([JSON.stringify(copia)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `central-lucas-backup-${hoje()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  avisar('Backup baixado. Guarde o arquivo num lugar seguro.');
  desenhar();
}

function restaurarBackup(arquivo) {
  const leitor = new FileReader();
  leitor.onload = async () => {
    try {
      const novo = JSON.parse(leitor.result);
      if (!novo || !Array.isArray(novo.clientes)) throw new Error('formato');
      const qtdArq = Array.isArray(novo.arquivos) ? novo.arquivos.length : 0;
      if (!confirm(`Esse backup tem ${novo.clientes.length} leads${qtdArq ? ` e ${qtdArq} arquivos` : ''}. Ele vai SUBSTITUIR o que está no app agora. Continuar?`)) return;
      const arquivos = novo.arquivos || [];
      delete novo.arquivos;
      localStorage.setItem(CHAVE, JSON.stringify(novo));
      dados = carregar();
      salvar();
      if (arquivos.length) {
        await arquivosLimpar();
        for (const a of arquivos) {
          const { conteudo: dataUrl, ...resto } = a;
          const blob = await (await fetch(dataUrl)).blob();
          await arquivoSalvar(Object.assign(resto, { blob }));
        }
        await recarregarArquivos();
      }
      aplicarTema();
      avisar('Backup restaurado.');
      desenhar();
    } catch (e) {
      alert('Esse arquivo não parece ser um backup da Central.');
    }
  };
  leitor.readAsText(arquivo);
}

/* ---------- Tema ---------- */

function aplicarTema() {
  const t = dados.config.tema;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}

/* ---------- Desenho e navegação ---------- */

function desenhar() {
  $('#data-hoje').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  $('#titulo').textContent = TITULOS[abaAtual];
  document.querySelectorAll('#menu button').forEach(b => b.classList.toggle('ativa', b.dataset.aba === abaAtual));

  conteudo.innerHTML = (TELAS[abaAtual] || TELAS.painel)();

  const busca = $('#busca');
  if (busca) {
    busca.addEventListener('input', () => {
      textoBusca = busca.value;
      const pos = busca.selectionStart;
      desenhar();
      const nova = $('#busca');
      nova.focus();
      nova.setSelectionRange(pos, pos);
    });
  }
  DEPOIS_DE_DESENHAR.forEach(fn => fn());
}

function irPara(aba) {
  abaAtual = TELAS[aba] ? aba : 'painel';
  try { localStorage.setItem(CHAVE + '-aba', abaAtual); } catch (e) { /* sem problema */ }
  window.scrollTo(0, 0);
  desenhar();
}

$('#menu').addEventListener('click', e => {
  const b = e.target.closest('[data-aba]');
  if (b) irPara(b.dataset.aba);
});

document.addEventListener('submit', e => {
  if (e.target.id === 'form-cliente') {
    e.preventDefault();
    salvarFormulario(e.target);
  }
});

document.addEventListener('change', e => {
  if (e.target.id === 'det-modelo') {
    const c = acharCliente(e.target.dataset.id);
    $('#det-msg').value = montarMensagem(e.target.value, c);
    $('#det-zap').href = linkZap(c, $('#det-msg').value);
  }
  if (e.target.id === 'arquivo-backup' && e.target.files[0]) {
    restaurarBackup(e.target.files[0]);
    e.target.value = '';
  }
  if (e.target.id === 'filtro-origem') {
    filtroOrigem = e.target.value;
    desenhar();
  }
});

document.addEventListener('input', e => {
  if (e.target.id === 'det-msg') {
    const c = acharCliente($('#det-modelo').dataset.id);
    $('#det-zap').href = linkZap(c, e.target.value);
  }
});

document.addEventListener('click', e => {
  // Toque no link do WhatsApp: deixa abrir e, na volta, pergunta se enviou.
  const zap = e.target.closest('[data-zap]');
  if (zap) {
    aguardandoConfirmacao = zap.dataset.zap;
    return;
  }

  const ir = e.target.closest('[data-ir]');
  if (ir) { irPara(ir.dataset.ir); return; }

  const filtro = e.target.closest('[data-filtro]');
  if (filtro) { filtroEtapa = filtro.dataset.filtro; desenhar(); return; }

  const el = e.target.closest('[data-acao]');
  if (el) { executar(el.dataset.acao, el); return; }

  const card = e.target.closest('[data-abrir]');
  if (card) abrirDetalhe(card.dataset.abrir);
});

function executar(acao, el) {
  const c = el.dataset.id ? acharCliente(el.dataset.id) : null;
  const cfg = dados.config;

  if (ACOES[acao]) { ACOES[acao](el, c); return; }

  switch (acao) {
    case 'fechar-modal': fecharModal(); break;
    case 'novo-cliente': abrirFormulario(null); break;
    case 'modo-leads': modoLeads = el.dataset.modo; desenhar(); break;

    case 'feito': {
      const msg = marcarFeito(c);
      salvar(); fecharModal(); desenhar();
      if (msg) avisar(msg);
      break;
    }
    case 'adiar': escolherAdiamento(c.id); break;
    case 'adiar-dias':
      adiar(c, somarDias(hoje(), Number(el.dataset.n)));
      salvar(); fecharModal(); desenhar(); avisar(`Adiado para ${dataCurta(c.proximo)}.`);
      break;
    case 'adiar-data': {
      const d = $('#adiar-data').value;
      if (!d || d <= hoje()) return avisar('Escolha uma data a partir de amanhã.');
      adiar(c, d);
      salvar(); fecharModal(); desenhar(); avisar(`Adiado para ${dataCurta(d)}.`);
      break;
    }
    case 'proposta': escolherDataProposta(c.id); break;
    case 'confirmar-proposta': {
      const d = $('#data-prop').value || hoje();
      marcarProposta(c, d);
      salvar(); desenhar(); abrirDetalhe(c.id);
      avisar(c.proximo ? `Régua criada. Primeiro contato ${quando(c.proximo)}.` : 'Proposta registrada.');
      break;
    }
    case 'reuniao': escolherDataReuniao(c.id); break;
    case 'confirmar-reuniao': {
      const d = $('#data-reu').value || hoje();
      marcarReuniao(c, d);
      salvar(); desenhar(); abrirDetalhe(c.id);
      avisar(`Reunião marcada para ${dataCurta(d)}.`);
      break;
    }
    case 'fechar':
      fechar(c); salvar(); fecharModal(); desenhar(); avisar(`Parabéns! ${primeiroNome(c.nome)} fechou 🎉`);
      break;
    case 'perder': escolherMotivo(c.id); break;
    case 'motivo':
      perder(c, cfg.motivos[Number(el.dataset.i)]);
      salvar(); fecharModal(); desenhar(); avisar('Registrado como perdido.');
      break;
    case 'reabrir':
      reabrir(c); salvar(); desenhar(); abrirDetalhe(c.id); avisar('Atendimento reaberto.');
      break;
    case 'nota': {
      const t = $('#det-nota').value.trim();
      if (!t) return;
      registrar(c, '📝 ' + t);
      salvar(); abrirDetalhe(c.id);
      break;
    }
    case 'editar': abrirFormulario(c.id); break;
    case 'excluir':
      if (confirm(`Excluir ${c.nome} de vez? Isso não tem volta.`)) {
        dados.clientes = dados.clientes.filter(x => x.id !== c.id);
        salvar(); fecharModal(); desenhar(); avisar('Lead excluído.');
      }
      break;

    case 'backup': baixarBackup(); break;
    case 'restaurar': $('#arquivo-backup').click(); break;

    case 'tema':
      cfg.tema = el.dataset.tema;
      aplicarTema(); salvar(); desenhar();
      break;

    case 'salvar-metas': {
      const metaMes = lerValor($('#cfg-metaMes').value);
      const ticket = lerValor($('#cfg-ticket').value);
      const apv = parseInt($('#cfg-abordPorVenda').value, 10);
      const metaDia = parseInt($('#cfg-metaDia').value, 10);
      const ddd = $('#cfg-ddd').value.replace(/\D/g, '');
      if (!metaMes || !ticket || !(apv > 0) || !(metaDia > 0)) return avisar('Preencha todos os números.');
      if (ddd.length !== 2) return avisar('O DDD tem 2 números.');
      Object.assign(cfg, { metaMes, ticket, abordPorVenda: apv, metaDia, ddd, tipoPadrao: $('#cfg-tipoPadrao').value });
      salvar(); desenhar(); avisar('Metas salvas.');
      break;
    }

    case 'mais-dia':
    case 'tirar-dia':
    case 'salvar-dias': {
      let dias = [...document.querySelectorAll('[data-dia]')].map(i => parseInt(i.value, 10)).filter(n => n > 0);
      if (acao === 'mais-dia') dias.push((dias[dias.length - 1] || 0) + 7);
      if (acao === 'tirar-dia') dias.splice(Number(el.dataset.i), 1);
      if (acao !== 'salvar-dias') { cfg.dias = dias.length ? dias : cfg.dias; desenhar(); break; }
      if (!dias.length) return avisar('A régua precisa de pelo menos 1 contato.');
      cfg.dias = [...new Set(dias)].sort((a, b) => a - b);
      dados.clientes.forEach(x => { if (NA_REGUA.includes(x.etapa)) agendar(x); });
      salvar(); desenhar(); avisar('Régua salva e datas recalculadas.');
      break;
    }

    case 'salvar-modelos':
      document.querySelectorAll('[data-modelo]').forEach(t => { cfg.modelos[t.dataset.modelo] = t.value.trim(); });
      salvar(); avisar('Modelos salvos.');
      break;
    case 'restaurar-modelos':
      if (confirm('Voltar todos os modelos para o texto original?')) {
        cfg.modelos = Object.assign({}, MODELOS_PADRAO);
        salvar(); desenhar(); avisar('Modelos originais restaurados.');
      }
      break;

    // Listas simples editáveis em Ajustes: blocos, hábitos e motivos.
    case 'lista-mais':
    case 'lista-tirar':
    case 'lista-salvar': {
      const nome = el.dataset.lista;
      const itens = [...document.querySelectorAll(`[data-${nome}]`)].map(i => i.value.trim());
      if (acao === 'lista-mais') itens.push('');
      if (acao === 'lista-tirar') itens.splice(Number(el.dataset.i), 1);
      if (acao !== 'lista-salvar') { cfg[nome] = itens; desenhar(); break; }
      const limpos = [...new Set(itens.filter(Boolean))];
      if (!limpos.length) return avisar('Deixe pelo menos um item.');
      cfg[nome] = limpos;
      salvar(); desenhar(); avisar('Lista salva.');
      break;
    }
  }
}

// Quando volta do WhatsApp para o app, pergunta se a mensagem foi enviada.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (!modal.open) desenhar(); // atualiza "hoje" se o dia virou
  if (aguardandoConfirmacao) {
    const id = aguardandoConfirmacao;
    aguardandoConfirmacao = null;
    setTimeout(() => perguntarSeEnviou(id), 250);
  }
});

// Salvar nome ao sair do campo.
document.addEventListener('focusout', e => {
  if (e.target.id === 'cfg-nome') {
    dados.config.meunome = e.target.value.trim() || 'Lucas';
    salvar();
  }
});

/* ---------- Início (depois que assistente.js e modulos.js carregam) ---------- */

window.addEventListener('DOMContentLoaded', async () => {
  aplicarTema();
  try { abaAtual = localStorage.getItem(CHAVE + '-aba') || 'painel'; } catch (e) { /* sem problema */ }
  if (!TELAS[abaAtual]) abaAtual = 'painel';
  desenhar();
  await recarregarArquivos();
  if (abaAtual === 'arquivos') desenhar();
});

if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
