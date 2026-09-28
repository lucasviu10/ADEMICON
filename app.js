/* Follow-up do Lucas — tudo roda no celular, dados salvos no próprio navegador. */
'use strict';

const CHAVE = 'followup-lucas-v1';

const ETAPAS = {
  novo: 'Novo lead',
  proposta: 'Proposta enviada',
  fu1: 'Follow-up 1',
  fu2: 'Follow-up 2',
  fu3: 'Follow-up 3',
  fechado: 'Fechado',
  perdido: 'Perdido',
};
const ATIVAS = ['novo', 'proposta', 'fu1', 'fu2', 'fu3'];

const TIPOS = { veicular: 'Veicular', imobiliario: 'Imobiliário', outros: 'Outros' };
const TIPO_NA_FRASE = { veicular: 'veicular', imobiliario: 'imobiliário', outros: '' };

const ORIGENS = ['Indicação', 'Instagram', 'Facebook', 'WhatsApp', 'Google', 'Cliente da carteira', 'Evento / feira', 'Porta a porta'];

const NOMES_MODELO = {
  novo: 'Novo lead (primeiro contato)',
  proposta: 'Envio da proposta',
  fu1: 'Follow-up 1',
  fu2: 'Follow-up 2',
  fu3: 'Follow-up 3',
  final: 'Última tentativa',
  fechado: 'Pós-venda (fechado)',
};

const MODELOS_PADRAO = {
  novo: 'Oi {nome}, tudo bem? Aqui é o {meunome}, da Ademicon. Vi seu interesse em consórcio {tipo}. Posso te mandar uma simulação rápida pra você ver as parcelas?',
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

/* ---------- Dados ---------- */

let dados = carregar();

function carregar() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(CHAVE)); } catch (e) { /* sem dados */ }
  d = d || {};
  d.clientes = d.clientes || [];
  d.config = d.config || {};
  const c = d.config;
  c.meunome = c.meunome || 'Lucas';
  c.dias = Array.isArray(c.dias) && c.dias.length ? c.dias : [1, 3, 7, 15];
  c.motivos = Array.isArray(c.motivos) && c.motivos.length ? c.motivos : MOTIVOS_PADRAO.slice();
  c.modelos = Object.assign({}, MODELOS_PADRAO, c.modelos || {});
  c.ultimoBackup = c.ultimoBackup || null;
  return d;
}

function salvar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(dados));
  } catch (e) {
    alert('Não consegui salvar no celular. Faça um backup em Ajustes agora.');
  }
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

/* ---------- Régua de follow-up ---------- */

// Qual modelo usar no contato número k da régua (1, 2, 3...).
function modeloDoContato(k) {
  const dias = dados.config.dias;
  if (k >= dias.length && dias.length > 1) return 'final';
  return k <= 3 ? 'fu' + k : 'final';
}

// Recalcula a data do próximo contato do cliente.
function agendar(c) {
  if (c.etapa === 'novo') {
    c.proximo = c.proximo || hoje();
    return;
  }
  if (!['proposta', 'fu1', 'fu2', 'fu3'].includes(c.etapa)) {
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

function marcarFeito(c) {
  if (c.etapa === 'novo') {
    registrar(c, 'Contato feito (novo lead)');
    c.proximo = somarDias(hoje(), 2);
    return `Anotado. Próximo contato ${quando(c.proximo)}.`;
  }
  if (!['proposta', 'fu1', 'fu2', 'fu3'].includes(c.etapa)) return '';
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
  c.proximo = hoje();
  if (c.etapa === 'proposta') {
    // Retoma a régua a partir de hoje.
    c.dataProposta = hoje();
    c.proximo = null;
    agendar(c);
  }
  registrar(c, 'Atendimento reaberto');
}

/* ---------- Mensagem e WhatsApp ---------- */

function moeda(v) {
  if (!v) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
}
function lerValor(txt) {
  if (!txt) return 0;
  let s = String(txt).replace(/[^\d,]/g, '');
  s = s.split(',')[0];
  return parseInt(s, 10) || 0;
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
  if (n.length === 10 || n.length === 11) n = '55' + n;
  return n;
}
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
let abaAtual = 'hoje';
let filtroEtapa = 'ativos';
let textoBusca = '';
let aguardandoConfirmacao = null;

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
  modalCorpo.scrollTop = 0;
}
function fecharModal() { if (modal.open) modal.close(); }
modal.addEventListener('click', e => { if (e.target === modal) fecharModal(); });

function seloEtapa(c) {
  const cls = c.etapa === 'fechado' ? '' : c.etapa === 'perdido' ? 'preto' : 'cinza';
  return `<span class="selo ${cls}">${esc(ETAPAS[c.etapa])}</span>`;
}

function linhaInfo(c) {
  const partes = [TIPOS[c.tipo] || '', moeda(c.credito)].filter(Boolean);
  return partes.join(' · ');
}

/* ---------- Tela: Hoje ---------- */

function telaHoje() {
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
      ? '<div class="vazio"><b>Tudo em dia ✅</b>Ninguém para chamar hoje.</div>'
      : '<div class="vazio"><b>Comece por aqui</b>Toque no botão <b style="display:inline">+</b> para cadastrar seu primeiro cliente.</div>';
  } else {
    html += paraHoje.map(cardContato).join('');
  }

  if (semPasso.length) {
    html += '<h2>Régua terminou: decida</h2>';
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
  }

  if (semana.length) {
    html += '<h2>Próximos 7 dias</h2>';
    html += semana.map(c => `
      <div class="card" data-abrir="${c.id}">
        <div class="card-topo">
          <div><div class="card-nome">${esc(c.nome)}</div><div class="card-info">${esc(NOMES_MODELO[modeloSugerido(c)])} · ${esc(quando(c.proximo))}</div></div>
          ${seloEtapa(c)}
        </div>
      </div>`).join('');
  }
  return html;
}

function cardContato(c) {
  const atraso = diasEntre(c.proximo, hoje());
  const selo = atraso > 0
    ? `<span class="selo vermelho">${atraso} ${atraso === 1 ? 'dia' : 'dias'} de atraso</span>`
    : '<span class="selo">Hoje</span>';
  const chave = modeloSugerido(c);
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
    </div>`;
}

function avisoBackup() {
  if (!dados.clientes.length) return '';
  const ult = dados.config.ultimoBackup;
  if (ult && diasEntre(ult, hoje()) < 7) return '';
  return `<div class="card" style="background:var(--amarelo-claro);margin-top:10px">
    <b>Faça um backup</b><div class="card-info">Seus clientes ficam salvos só neste celular. ${ult ? 'Último backup: ' + dataCurta(ult) + '.' : 'Você ainda não fez nenhum.'}</div>
    <button class="btn-contorno btn-bloco btn-peq" data-acao="backup">Fazer backup agora</button>
  </div>`;
}

/* ---------- Tela: Clientes ---------- */

function telaClientes() {
  const filtros = [['ativos', 'Em aberto'], ['todos', 'Todos'], ...Object.entries(ETAPAS)];
  let lista = dados.clientes.slice();
  if (filtroEtapa === 'ativos') lista = lista.filter(c => ATIVAS.includes(c.etapa));
  else if (filtroEtapa !== 'todos') lista = lista.filter(c => c.etapa === filtroEtapa);
  const b = textoBusca.trim().toLowerCase();
  if (b) {
    const dig = b.replace(/\D/g, '');
    lista = lista.filter(c => c.nome.toLowerCase().includes(b) || (dig && String(c.whats).replace(/\D/g, '').includes(dig)));
  }
  lista.sort((x, y) => x.nome.localeCompare(y.nome));

  let html = `
    <div class="busca"><input type="search" id="busca" placeholder="Buscar por nome ou telefone" value="${esc(textoBusca)}"></div>
    <div class="filtros">${filtros.map(([k, n]) => {
      const qtd = k === 'todos' ? dados.clientes.length
        : k === 'ativos' ? dados.clientes.filter(c => ATIVAS.includes(c.etapa)).length
        : dados.clientes.filter(c => c.etapa === k).length;
      return `<button data-filtro="${k}" class="${filtroEtapa === k ? 'ativo' : ''}">${esc(n)} (${qtd})</button>`;
    }).join('')}</div>`;

  if (!lista.length) return html + '<div class="vazio">Nenhum cliente aqui.</div>';

  html += lista.map(c => {
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
  }).join('');
  return html;
}

/* ---------- Tela: Ajustes ---------- */

function telaConfig() {
  const cfg = dados.config;
  const fechados = dados.clientes.filter(c => c.etapa === 'fechado').length;
  const perdidos = dados.clientes.filter(c => c.etapa === 'perdido');
  const porMotivo = {};
  perdidos.forEach(c => { porMotivo[c.motivoPerda || 'Sem motivo'] = (porMotivo[c.motivoPerda || 'Sem motivo'] || 0) + 1; });
  const motivosOrd = Object.entries(porMotivo).sort((a, b) => b[1] - a[1]);

  return `
    <h2>Meus números</h2>
    <div class="resumo">
      <div><b>${dados.clientes.filter(c => ATIVAS.includes(c.etapa)).length}</b><span>em aberto</span></div>
      <div><b>${fechados}</b><span>fechados</span></div>
      <div><b>${perdidos.length}</b><span>perdidos</span></div>
    </div>
    ${motivosOrd.length ? `<div class="detalhe" style="margin-top:8px">${motivosOrd.map(([m, n]) => `<div><span>${esc(m)}</span><b>${n}</b></div>`).join('')}</div>` : ''}

    <h2>Seu nome nas mensagens</h2>
    <div class="card">
      <input id="cfg-nome" value="${esc(cfg.meunome)}">
      <div class="dica">Entra no lugar de {meunome} nos modelos.</div>
    </div>

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

    <h2>Motivos de perda</h2>
    <div class="card">
      <div id="lista-motivos">${cfg.motivos.map((m, i) => `
        <div class="item-lista">
          <input value="${esc(m)}" data-motivo="${i}">
          <button class="btn-contorno" data-acao="tirar-motivo" data-i="${i}" aria-label="Remover">✕</button>
        </div>`).join('')}</div>
      <div class="grade2">
        <button class="btn-contorno" data-acao="mais-motivo">+ Motivo</button>
        <button class="btn-verde" data-acao="salvar-motivos">Salvar motivos</button>
      </div>
    </div>

    <h2>Backup</h2>
    <div class="card">
      <div class="dica" style="margin:0 0 6px">Os dados ficam só neste celular. Faça backup toda semana e guarde o arquivo no Google Drive ou mande pra você mesmo no WhatsApp.</div>
      <div class="dica" style="margin:0 0 6px">Último backup: <b>${cfg.ultimoBackup ? dataCurta(cfg.ultimoBackup) : 'nunca'}</b></div>
      <button class="btn-verde btn-bloco" data-acao="backup">⬇️ Baixar backup</button>
      <button class="btn-contorno btn-bloco" data-acao="restaurar">⬆️ Restaurar de um backup</button>
      <input type="file" id="arquivo-backup" accept=".json,application/json" hidden>
    </div>
    <p class="dica" style="text-align:center;margin-top:18px">Follow-up do Lucas · versão 1</p>`;
}

/* ---------- Detalhe do cliente ---------- */

function abrirDetalhe(id) {
  const c = acharCliente(id);
  if (!c) return;
  const sugerido = modeloSugerido(c);
  const msg = montarMensagem(sugerido, c);
  const ativo = ATIVAS.includes(c.etapa);
  const emRegua = ['proposta', 'fu1', 'fu2', 'fu3'].includes(c.etapa);

  let botoes = '';
  if (ativo) {
    botoes += `<div class="grade2" style="margin-top:10px">
      <button class="btn-contorno" data-acao="feito" data-id="${c.id}">✓ Mensagem enviada</button>
      <button class="btn-contorno" data-acao="adiar" data-id="${c.id}">⏰ Adiar</button>
    </div>`;
    if (c.etapa === 'novo') {
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
    <div class="modal-topo"><h3>${esc(c.nome)}</h3><button class="fechar" data-acao="fechar-modal" aria-label="Fechar">✕</button></div>
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
      <textarea id="det-msg" style="margin-top:8px;background:#dcf8c6;min-height:150px">${esc(msg)}</textarea>
      <div class="dica">Pode ajustar o texto aqui antes de abrir o WhatsApp.</div>
      <a id="det-zap" class="btn btn-zap btn-bloco" href="${esc(linkZap(c, msg))}" target="_blank" rel="noopener" data-zap="${c.id}">💬 Chamar no WhatsApp</a>
      ${botoes}
    </div>

    <h2>Dados</h2>
    <div class="detalhe">
      <div><span>WhatsApp</span><b>${esc(telefoneBonito(c.whats))}</b></div>
      <div><span>Tipo</span><b>${esc(TIPOS[c.tipo] || '—')}</b></div>
      <div><span>Crédito</span><b>${esc(moeda(c.credito) || '—')}</b></div>
      <div><span>Origem</span><b>${esc(c.origem || '—')}</b></div>
      <div><span>Proposta enviada</span><b>${esc(dataCurta(c.dataProposta))}</b></div>
      ${emRegua ? `<div><span>Contatos feitos</span><b>${c.contatos || 0} de ${dados.config.dias.length}</b></div>` : ''}
      ${c.obs ? `<div style="display:block"><span>Observação</span><p style="margin:4px 0 0;white-space:pre-wrap">${esc(c.obs)}</p></div>` : ''}
    </div>

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

function abrirFormulario(id) {
  const c = id ? acharCliente(id) : null;
  const v = c || { tipo: 'veicular', etapa: 'novo', dataProposta: '' };
  abrirModal(`
    <div class="modal-topo"><h3>${c ? 'Editar cliente' : 'Novo cliente'}</h3><button class="fechar" data-acao="fechar-modal" aria-label="Fechar">✕</button></div>
    <form id="form-cliente" data-id="${c ? c.id : ''}" autocomplete="off">
      <label for="f-nome">Nome *</label>
      <input id="f-nome" name="nome" required value="${esc(v.nome)}" autocapitalize="words">

      <label for="f-whats">WhatsApp (com DDD) *</label>
      <input id="f-whats" name="whats" required inputmode="tel" placeholder="(11) 91234-5678" value="${esc(v.whats)}">

      <label>Tipo</label>
      <select name="tipo">${Object.entries(TIPOS).map(([k, n]) => `<option value="${k}" ${v.tipo === k ? 'selected' : ''}>${n}</option>`).join('')}</select>

      <label for="f-credito">Valor de crédito de interesse</label>
      <input id="f-credito" name="credito" inputmode="numeric" placeholder="Ex.: 80000" value="${v.credito ? esc(moeda(v.credito)) : ''}">

      <label for="f-origem">Origem do lead</label>
      <input id="f-origem" name="origem" list="origens" value="${esc(v.origem)}" placeholder="Toque para escolher ou digite">
      <datalist id="origens">${ORIGENS.map(o => `<option value="${esc(o)}">`).join('')}</datalist>

      <label>Etapa</label>
      <select name="etapa" id="f-etapa">${Object.entries(ETAPAS).map(([k, n]) => `<option value="${k}" ${v.etapa === k ? 'selected' : ''}>${n}</option>`).join('')}</select>

      <div id="bloco-data">
        <label for="f-data">Data em que a proposta foi enviada</label>
        <input id="f-data" name="dataProposta" type="date" value="${esc(v.dataProposta || hoje())}">
        <div class="dica">A régua de follow-up conta a partir desta data.</div>
      </div>

      <div id="bloco-motivo">
        <label>Motivo da perda</label>
        <select name="motivoPerda">${dados.config.motivos.map(m => `<option ${v.motivoPerda === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select>
      </div>

      <label for="f-obs">Observação</label>
      <textarea id="f-obs" name="obs" placeholder="Ex.: quer carro até R$ 90 mil, prefere parcela até R$ 1.500">${esc(v.obs)}</textarea>

      <button type="submit" class="btn-verde btn-bloco">Salvar</button>
    </form>`);
  ajustarCamposForm();
  $('#f-etapa').addEventListener('change', ajustarCamposForm);
  if (!c) setTimeout(() => $('#f-nome').focus(), 50);
}

function ajustarCamposForm() {
  const etapa = $('#f-etapa').value;
  $('#bloco-data').hidden = etapa === 'novo';
  $('#bloco-motivo').hidden = etapa !== 'perdido';
}

function salvarFormulario(form) {
  const f = new FormData(form);
  const nome = String(f.get('nome') || '').trim();
  const whats = String(f.get('whats') || '').trim();
  if (!nome) return avisar('Coloque o nome do cliente.');
  if (numeroZap(whats).length < 12) return avisar('Confira o WhatsApp: precisa ter DDD + número.');

  const id = form.dataset.id;
  const novo = !id;
  const c = novo ? { id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), criadoEm: hoje(), historico: [], contatos: 0 } : acharCliente(id);
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

  if (novo) registrar(c, 'Cliente cadastrado');

  if (etapa !== etapaAntes || (etapa !== 'novo' && data !== dataAntes)) {
    if (etapa === 'novo') {
      c.etapa = 'novo'; c.dataProposta = ''; c.contatos = 0; c.ultimoContato = null; c.proximo = hoje();
      if (!novo) registrar(c, 'Voltou para Novo lead');
    } else if (etapa === 'fechado') {
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
  avisar(novo ? `Cliente salvo: ${primeiroNome(nome)}.` : 'Alterações salvas.');
  desenhar();
  if (!novo) abrirDetalhe(c.id);
}

/* ---------- Janelinhas de ação ---------- */

function escolherAdiamento(id) {
  const c = acharCliente(id);
  abrirModal(`
    <div class="modal-topo"><h3>Adiar ${esc(primeiroNome(c.nome))}</h3><button class="fechar" data-acao="fechar-modal" aria-label="Fechar">✕</button></div>
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
    <div class="modal-topo"><h3>Por que ${esc(primeiroNome(c.nome))} não fechou?</h3><button class="fechar" data-acao="fechar-modal" aria-label="Fechar">✕</button></div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
      ${dados.config.motivos.map((m, i) => `<button class="btn-contorno" data-acao="motivo" data-id="${id}" data-i="${i}">${esc(m)}</button>`).join('')}
    </div>
    <div class="dica" style="margin-top:10px">Dá pra editar essa lista em Ajustes.</div>`);
}

function escolherDataProposta(id) {
  abrirModal(`
    <div class="modal-topo"><h3>Proposta enviada</h3><button class="fechar" data-acao="fechar-modal" aria-label="Fechar">✕</button></div>
    <label for="data-prop">Quando você enviou a proposta?</label>
    <input type="date" id="data-prop" value="${hoje()}" max="${hoje()}">
    <div class="dica">O app agenda os contatos: ${dados.config.dias.map(d => d + (d === 1 ? ' dia' : ' dias')).join(', ')} depois dessa data.</div>
    <button class="btn-verde btn-bloco" data-acao="confirmar-proposta" data-id="${id}">Confirmar</button>`);
}

function perguntarSeEnviou(id) {
  const c = acharCliente(id);
  if (!c || !ATIVAS.includes(c.etapa)) return;
  abrirModal(`
    <div class="modal-topo"><h3>Mandou a mensagem?</h3><button class="fechar" data-acao="fechar-modal" aria-label="Fechar">✕</button></div>
    <p style="margin:6px 0 14px">Se você enviou para <b>${esc(c.nome)}</b>, eu registro e já agendo o próximo contato.</p>
    <button class="btn-verde btn-bloco" data-acao="feito" data-id="${id}">✓ Sim, enviei</button>
    <button class="btn-contorno btn-bloco" data-acao="fechar-modal">Ainda não</button>`);
}

/* ---------- Backup ---------- */

function baixarBackup() {
  dados.config.ultimoBackup = hoje();
  salvar();
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `followup-backup-${hoje()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  avisar('Backup baixado. Guarde o arquivo num lugar seguro.');
  desenhar();
}

function restaurarBackup(arquivo) {
  const leitor = new FileReader();
  leitor.onload = () => {
    try {
      const novo = JSON.parse(leitor.result);
      if (!novo || !Array.isArray(novo.clientes)) throw new Error('formato');
      if (!confirm(`Esse backup tem ${novo.clientes.length} clientes. Ele vai SUBSTITUIR o que está no app agora. Continuar?`)) return;
      localStorage.setItem(CHAVE, JSON.stringify(novo));
      dados = carregar();
      salvar();
      avisar('Backup restaurado.');
      desenhar();
    } catch (e) {
      alert('Esse arquivo não parece ser um backup do Follow-up.');
    }
  };
  leitor.readAsText(arquivo);
}

/* ---------- Desenho e navegação ---------- */

function desenhar() {
  $('#data-hoje').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
  const titulos = { hoje: 'Hoje', clientes: 'Clientes', config: 'Ajustes' };
  $('#titulo').textContent = titulos[abaAtual];
  document.querySelectorAll('.abas button').forEach(b => b.classList.toggle('ativa', b.dataset.aba === abaAtual));
  $('#btn-novo').hidden = abaAtual === 'config';

  if (abaAtual === 'hoje') conteudo.innerHTML = telaHoje();
  else if (abaAtual === 'clientes') conteudo.innerHTML = telaClientes();
  else conteudo.innerHTML = telaConfig();

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
}

document.querySelector('.abas').addEventListener('click', e => {
  const b = e.target.closest('[data-aba]');
  if (!b) return;
  abaAtual = b.dataset.aba;
  window.scrollTo(0, 0);
  desenhar();
});

$('#btn-novo').addEventListener('click', () => abrirFormulario(null));

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

  switch (acao) {
    case 'fechar-modal': fecharModal(); break;

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
        salvar(); fecharModal(); desenhar(); avisar('Cliente excluído.');
      }
      break;

    case 'backup': baixarBackup(); break;
    case 'restaurar': $('#arquivo-backup').click(); break;

    case 'mais-dia':
    case 'tirar-dia':
    case 'salvar-dias': {
      let dias = [...document.querySelectorAll('[data-dia]')].map(i => parseInt(i.value, 10)).filter(n => n > 0);
      if (acao === 'mais-dia') dias.push((dias[dias.length - 1] || 0) + 7);
      if (acao === 'tirar-dia') dias.splice(Number(el.dataset.i), 1);
      if (acao !== 'salvar-dias') { cfg.dias = dias.length ? dias : cfg.dias; desenhar(); break; }
      if (!dias.length) return avisar('A régua precisa de pelo menos 1 contato.');
      cfg.dias = [...new Set(dias)].sort((a, b) => a - b);
      dados.clientes.forEach(x => { if (['proposta', 'fu1', 'fu2', 'fu3'].includes(x.etapa)) agendar(x); });
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

    case 'mais-motivo':
    case 'tirar-motivo':
    case 'salvar-motivos': {
      const motivos = [...document.querySelectorAll('[data-motivo]')].map(i => i.value.trim());
      if (acao === 'mais-motivo') motivos.push('');
      if (acao === 'tirar-motivo') motivos.splice(Number(el.dataset.i), 1);
      if (acao !== 'salvar-motivos') { cfg.motivos = motivos; desenhar(); break; }
      const limpos = motivos.filter(Boolean);
      if (!limpos.length) return avisar('Deixe pelo menos um motivo.');
      cfg.motivos = limpos;
      salvar(); desenhar(); avisar('Motivos salvos.');
      break;
    }
  }
}

// Quando volta do WhatsApp para o app, pergunta se a mensagem foi enviada.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  desenhar(); // atualiza "hoje" se o dia virou
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

/* ---------- Início ---------- */

desenhar();

if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
