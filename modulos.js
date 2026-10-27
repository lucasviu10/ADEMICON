/* Abas: Painel, Prospecção, Finanças, Pessoal e Arquivos. */
'use strict';

/* ---------- Ajudantes de dados ---------- */

function diaProsp(d) {
  const x = dados.prosp[d] = dados.prosp[d] || {};
  x.a = x.a || 0; x.c = x.c || 0; x.r = x.r || 0; x.pomo = x.pomo || 0;
  x.blocos = x.blocos || {};
  return x;
}
function diaDiario(d) {
  const x = dados.diario[d] = dados.diario[d] || {};
  x.h = x.h || {};
  return x;
}

function statsMes(am) {
  const dias = Object.entries(dados.prosp).filter(([d]) => d.startsWith(am));
  const soma = k => dias.reduce((s, [, v]) => s + (v[k] || 0), 0);
  const cl = dados.clientes;
  const fechados = cl.filter(c => (dataFech(c) || '').startsWith(am));
  const reunioesCrm = cl.filter(c => (c.dataReuniao || '').startsWith(am)).length;
  return {
    a: soma('a'),
    c: soma('c'),
    r: Math.max(soma('r'), reunioesCrm),
    p: cl.filter(c => (c.dataProposta || '').startsWith(am)).length,
    f: fechados.length,
    vendido: fechados.reduce((s, c) => s + (c.credito || 0), 0),
    leads: cl.filter(c => (c.criadoEm || '').startsWith(am)).length,
  };
}

// Dias de trabalho (segunda a sábado) de hoje até o fim do mês, contando hoje.
function diasUteisRestantes() {
  const agora = new Date();
  const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).getDate();
  let n = 0;
  for (let d = agora.getDate(); d <= fim; d++) {
    if (new Date(agora.getFullYear(), agora.getMonth(), d).getDay() !== 0) n++;
  }
  return Math.max(n, 1);
}

function numero(n) { return Number(n || 0).toLocaleString('pt-BR'); }
function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }

/* ---------- Mini gráficos (uma cor, valor sempre em texto) ---------- */

function barrasH(itens) {
  const max = Math.max(1, ...itens.map(i => i.valor));
  return `<div class="barras">${itens.map(i => `
    <div class="barra" title="${esc(i.rotulo)}: ${esc(i.texto || numero(i.valor))}">
      <span class="rot">${esc(i.rotulo)}</span>
      <span class="trilho"><i style="width:${(i.valor / max) * 100}%"></i></span>
      <span class="val">${esc(i.texto || numero(i.valor))}${i.extra ? `<span class="pct">${esc(i.extra)}</span>` : ''}</span>
    </div>`).join('')}</div>`;
}

function colunas(itens, destaque) {
  const max = Math.max(1, ...itens.map(i => i.valor));
  return `<div class="colunas">${itens.map(i => `
    <div class="coluna ${i.chave === destaque ? 'hoje' : ''}" title="${esc(i.rotulo)}: ${numero(i.valor)}">
      <b>${i.valor ? numero(i.valor) : ''}</b>
      <i style="height:${(i.valor / max) * 100}%"></i>
      <span>${esc(i.rotulo)}</span>
    </div>`).join('')}</div>`;
}

function ultimosDias(n) {
  const h = hoje();
  return Array.from({ length: n }, (_, i) => somarDias(h, i - n + 1));
}
function rotuloDia(d) {
  return paraData(d).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
}

/* ---------- Painel ---------- */

TELAS.painel = function telaPainel() {
  const cfg = dados.config;
  const h = hoje();
  const am = mesAtual();
  const st = statsMes(am);
  const hojeP = diaProsp(h);
  const ativos = dados.clientes.filter(c => ATIVAS.includes(c.etapa));
  const paraHoje = ativos.filter(c => c.proximo && c.proximo <= h);
  const atrasados = paraHoje.filter(c => c.proximo < h).length;
  const pipeline = ativos.reduce((s, c) => s + (c.credito || 0), 0);

  // Número mágico: quantas abordagens por dia para bater a meta.
  const totalA = Object.values(dados.prosp).reduce((s, v) => s + (v.a || 0), 0);
  const totalF = dados.clientes.filter(c => c.etapa === 'fechado').length;
  const real = totalA >= 200 && totalF > 0 ? Math.round(totalA / totalF) : null;
  const apv = real || cfg.abordPorVenda;
  const vendasMeta = Math.ceil(cfg.metaMes / cfg.ticket);
  const faltaValor = Math.max(0, cfg.metaMes - st.vendido);
  const faltamVendas = Math.ceil(faltaValor / cfg.ticket);
  const diasRest = diasUteisRestantes();
  const faltamAbord = faltamVendas * apv;
  const porDia = Math.ceil(faltamAbord / diasRest);

  // Finanças do mês e vida pessoal.
  const fin = dados.fin.filter(f => f.d.startsWith(am));
  const entradas = fin.filter(f => f.tipo === 'e').reduce((s, f) => s + f.v, 0);
  const saidas = fin.filter(f => f.tipo === 's').reduce((s, f) => s + f.v, 0);
  const habHoje = diaDiario(h).h;
  const habFeitos = cfg.habitos.filter(x => habHoje[x]).length;
  const tarefasHoje = dados.tarefas.filter(t => !t.feito && t.d && t.d <= h).length;

  // Leads por origem (todos os tempos).
  const porOrigem = {};
  dados.clientes.forEach(c => {
    const o = c.origem || 'Sem origem';
    porOrigem[o] = porOrigem[o] || { n: 0, f: 0, v: 0 };
    porOrigem[o].n++;
    if (c.etapa === 'fechado') { porOrigem[o].f++; porOrigem[o].v += c.credito || 0; }
  });
  const origensOrd = Object.entries(porOrigem).sort((a, b) => b[1].n - a[1].n).slice(0, 8);

  const dias7 = ultimosDias(7);

  return `
    <div class="resumo">
      <div class="${st.vendido >= cfg.metaMes ? 'bom' : ''}"><b>${esc(moedaCurta(st.vendido))}</b><span>vendido em ${esc(nomeMes(am).split(' ')[0].toLowerCase())}</span>
        <div class="progresso" title="${pct(st.vendido, cfg.metaMes)}% da meta"><i style="width:${Math.min(100, pct(st.vendido, cfg.metaMes))}%"></i></div>
        <span>${pct(st.vendido, cfg.metaMes)}% de ${esc(moedaCurta(cfg.metaMes))}</span></div>
      <div class="${hojeP.a >= cfg.metaDia ? 'bom' : ''}" data-ir="prospeccao" style="cursor:pointer"><b>${numero(hojeP.a)}<small style="font-size:15px;color:var(--suave)"> / ${cfg.metaDia}</small></b><span>abordagens hoje</span>
        <div class="progresso"><i style="width:${Math.min(100, pct(hojeP.a, cfg.metaDia))}%"></i></div></div>
      <div class="${atrasados ? 'alerta' : ''}" data-ir="hoje" style="cursor:pointer"><b>${paraHoje.length}</b><span>follow-ups hoje${atrasados ? ` (${atrasados} atrasados)` : ''}</span></div>
      <div data-ir="leads" style="cursor:pointer"><b>${esc(moedaCurta(pipeline))}</b><span>em negociação (${ativos.length} leads)</span></div>
    </div>

    <div class="grade duas" style="margin-top:12px">
      <div class="card destaque">
        <h3>🎯 Seu número mágico</h3>
        <div style="font-size:15px">Meta de <b>${esc(moedaCurta(cfg.metaMes))}</b> ÷ ticket de <b>${esc(moedaCurta(cfg.ticket))}</b> = <b>${vendasMeta} vendas</b> no mês.</div>
        <div style="font-size:15px;margin-top:6px">${faltamVendas
          ? `Faltam <b>${faltamVendas} vendas</b> → <b>${numero(faltamAbord)} abordagens</b> em ${diasRest} dias de trabalho.`
          : '<b>Meta do mês batida! 🎉</b>'}</div>
        ${faltamVendas ? `<div style="font-size:30px;font-weight:800;margin-top:8px">${numero(porDia)} <span style="font-size:15px;font-weight:600">abordagens por dia</span></div>` : ''}
        <div class="dica">${real ? `Usando seu número real: 1 venda a cada ${apv} abordagens.` : `Usando a estimativa de 1 venda a cada ${apv} abordagens. Registre suas abordagens para o app calcular o seu número real.`}</div>
      </div>

      <div class="card">
        <h3>Funil do mês</h3>
        ${barrasH([
          { rotulo: 'Abordagens', valor: st.a },
          { rotulo: 'Conversas', valor: st.c, extra: st.a ? pct(st.c, st.a) + '%' : '' },
          { rotulo: 'Reuniões', valor: st.r, extra: st.c ? pct(st.r, st.c) + '%' : '' },
          { rotulo: 'Propostas', valor: st.p, extra: st.r ? pct(st.p, st.r) + '%' : '' },
          { rotulo: 'Fechamentos', valor: st.f, extra: st.p ? pct(st.f, st.p) + '%' : '' },
        ])}
        <div class="dica">A % mostra quanto passou da etapa anterior. Onde a % cai mais é onde treinar.</div>
      </div>

      <div class="card">
        <h3>Abordagens nos últimos 7 dias</h3>
        ${colunas(dias7.map(d => ({ chave: d, rotulo: rotuloDia(d), valor: (dados.prosp[d] || {}).a || 0 })), h)}
        <div class="dica">Meta diária: ${cfg.metaDia}. Média dos 7 dias: ${numero(Math.round(dias7.reduce((s, d) => s + ((dados.prosp[d] || {}).a || 0), 0) / 7))}.</div>
      </div>

      <div class="card">
        <h3>De onde vêm seus leads</h3>
        ${origensOrd.length
          ? barrasH(origensOrd.map(([o, v]) => ({ rotulo: o, valor: v.n, texto: `${v.n}`, extra: v.f ? `${v.f} fech.` : '' })))
          : '<div class="dica">Cadastre leads com a origem (Nestlé, Instagram...) para ver aqui.</div>'}
      </div>

      <div class="card" data-ir="financas" style="cursor:pointer">
        <h3>💰 Dinheiro em ${esc(nomeMes(am).split(' ')[0].toLowerCase())}</h3>
        <div class="detalhe" style="border:0;padding:0">
          <div><span>Entradas</span><b style="color:var(--verde)">${esc(moedaCentavos(entradas))}</b></div>
          <div><span>Saídas</span><b>${esc(moedaCentavos(saidas))}</b></div>
          <div><span>Sobrou</span><b style="color:${entradas - saidas < 0 ? 'var(--vermelho)' : 'var(--texto)'}">${esc(moedaCentavos(entradas - saidas))}</b></div>
        </div>
      </div>

      <div class="card" data-ir="pessoal" style="cursor:pointer">
        <h3>🌱 Você hoje</h3>
        <div style="font-size:15px">Hábitos: <b>${habFeitos} de ${cfg.habitos.length}</b></div>
        <div class="progresso"><i style="width:${pct(habFeitos, cfg.habitos.length)}%"></i></div>
        <div style="font-size:15px;margin-top:10px">Tarefas para hoje: <b>${tarefasHoje}</b></div>
        <div style="font-size:15px;margin-top:4px">Pomodoros hoje: <b>${hojeP.pomo}</b></div>
      </div>
    </div>

    <h2>Mês em números</h2>
    <div class="resumo">
      <div><b>${st.leads}</b><span>leads novos</span></div>
      <div><b>${st.p}</b><span>propostas enviadas</span></div>
      <div><b>${st.f}</b><span>vendas fechadas</span></div>
      <div><b>${st.f ? esc(moedaCurta(st.vendido / st.f)) : '—'}</b><span>ticket médio real</span></div>
    </div>
    ${avisoBackup()}`;
};

/* ---------- Prospecção ---------- */

const MSG_PROSP_PADRAO = [
  { titulo: 'Base própria (reaquecer)', texto: 'Oi {nome}, tudo bem? Aqui é o {meunome}! Lembrei de você hoje. Como estão as coisas por aí?' },
  { titulo: 'Contato da rota (mercado)', texto: 'Oi {nome}, tudo certo? É o {meunome}, a gente se conhece da rota do mercado. Além daquele trabalho, eu ajudo pessoas a planejar a compra de imóvel e carro pela Ademicon. Posso te fazer uma pergunta rápida sobre isso?' },
  { titulo: 'Instagram (interagiu no post)', texto: 'Oi {nome}! Vi que você curtiu meu post sobre planejamento pra casa própria. Isso é um plano seu pra agora ou mais pra frente?' },
  { titulo: 'Pedido de indicação', texto: 'Oi {nome}, tudo bem? Uma pergunta rápida: você conhece alguém que esteja pensando em comprar casa, terreno ou carro nos próximos meses? Se fizer sentido, posso ajudar essa pessoa a se planejar, sem compromisso.' },
];

function mensagensProsp() {
  if (!Array.isArray(dados.config.msgProsp) || !dados.config.msgProsp.length) {
    dados.config.msgProsp = MSG_PROSP_PADRAO.map(m => Object.assign({}, m));
  }
  return dados.config.msgProsp;
}

let prospNome = '';
let prospWhats = '';

function textoProsp(i) {
  const nome = primeiroNome(prospNome);
  let t = mensagensProsp()[i].texto;
  t = nome ? t.replace(/\{nome\}/gi, nome) : t.replace(/\s*\{nome\}/gi, '');
  return t.replace(/\{meunome\}/gi, dados.config.meunome);
}

TELAS.prospeccao = function telaProsp() {
  const cfg = dados.config;
  const h = hoje();
  const dia = diaProsp(h);
  const blocoAtual = cfg.blocoAtual || '';
  const blocosHoje = Object.entries(dia.blocos).filter(([, n]) => n > 0);
  const semana = ultimosDias(7);

  return `
    <div class="grade duas">
      <div class="card contador">
        <div class="dica" style="margin:0 0 6px">Abordagens hoje</div>
        <div class="numero">${numero(dia.a)}<small> / ${cfg.metaDia}</small></div>
        <div class="progresso"><i style="width:${Math.min(100, pct(dia.a, cfg.metaDia))}%"></i></div>
        <div class="dica">${dia.a >= cfg.metaDia ? 'Meta do dia batida! 💪' : `Faltam ${cfg.metaDia - dia.a}.`}</div>
        <div class="botoes-mais">
          <button class="btn-contorno" data-acao="prosp-mais" data-campo="a" data-n="-1" aria-label="Tirar 1">−1</button>
          <button class="btn-verde" data-acao="prosp-mais" data-campo="a" data-n="1">+1</button>
          <button class="btn-verde" data-acao="prosp-mais" data-campo="a" data-n="5">+5</button>
          <button class="btn-verde" data-acao="prosp-mais" data-campo="a" data-n="10">+10</button>
        </div>
        <label for="bloco-atual" style="text-align:left">Trabalhando qual bloco da base?</label>
        <select id="bloco-atual"><option value="">Nenhum em especial</option>${opcoes(cfg.blocos, blocoAtual)}</select>
        ${blocosHoje.length ? `<div class="dica" style="text-align:left">Hoje: ${blocosHoje.map(([b, n]) => `${esc(b)} ${n}`).join(' · ')}</div>` : ''}
      </div>

      <div class="card pomodoro ${pomo.fase === 'pausa' ? 'pausa' : ''}" id="pomo-card">
        <div class="fase" id="pomo-fase">${pomo.fase === 'foco' ? '🍅 Foco' : '☕ Pausa'}</div>
        <div class="tempo" id="pomo-tempo">${relogio(pomo.restante)}</div>
        <div class="grade2">
          <button class="btn-verde" data-acao="pomo-play" id="pomo-play">${pomo.rodando ? '⏸ Pausar' : '▶ Começar'}</button>
          <button class="btn-contorno" data-acao="pomo-zerar">↺ Zerar</button>
        </div>
        <div class="dica">25 min de foco + 5 de pausa. Pomodoros hoje: <b>${dia.pomo}</b></div>
        <div class="dica">Rotina sugerida: 1º pomodoro follow-up, depois prospecção.</div>
      </div>
    </div>

    <h2>Depois da abordagem</h2>
    <div class="mini-cont">
      ${[['c', 'Conversas'], ['r', 'Reuniões marcadas'], ['pomo', 'Pomodoros']].map(([k, n]) => `
        <div><b>${numero(dia[k])}</b><span>${n}</span>
          <div class="linha">
            <button class="btn-contorno" data-acao="prosp-mais" data-campo="${k}" data-n="-1" aria-label="Tirar 1">−</button>
            <button class="btn-verde" data-acao="prosp-mais" data-campo="${k}" data-n="1" aria-label="Somar 1">+</button>
          </div></div>`).join('')}
    </div>

    <h2>Mensagens prontas de abordagem</h2>
    <div class="card">
      <div class="grade2">
        <div><label for="prosp-nome" style="margin-top:0">Nome (opcional)</label><input id="prosp-nome" value="${esc(prospNome)}" placeholder="Ex.: Carla"></div>
        <div><label for="prosp-whats" style="margin-top:0">WhatsApp (opcional)</label><input id="prosp-whats" inputmode="tel" value="${esc(prospWhats)}" placeholder="13 99123-4567"></div>
      </div>
      <div class="dica">Começa com quebra-gelo, sem falar de preço. "Enviar" abre o WhatsApp e já soma +1 abordagem.</div>
    </div>
    <div class="grade duas">
      ${mensagensProsp().map((m, i) => `
        <div class="card">
          <h3>${esc(m.titulo)}</h3>
          <div class="balao" id="prosp-prev-${i}">${esc(textoProsp(i))}</div>
          <div class="acoes">
            <button class="btn-contorno btn-peq" data-acao="prosp-copiar" data-i="${i}">📋 Copiar +1</button>
            <a class="btn btn-zap btn-peq" data-acao="prosp-enviar" data-i="${i}" href="#" target="_blank" rel="noopener">💬 Enviar +1</a>
          </div>
          <details style="margin-top:8px"><summary class="dica">Editar texto</summary>
            <textarea data-msg-prosp="${i}" style="margin-top:6px">${esc(m.texto)}</textarea>
            <div class="dica">Use {nome} e {meunome}. Salva sozinho.</div>
          </details>
        </div>`).join('')}
    </div>

    <h2>Últimos 7 dias</h2>
    <div class="card">
      <div class="detalhe" style="border:0;padding:0">
        <div><span>Dia</span><span>Abord. · Conv. · Reun. · 🍅</span></div>
        ${semana.slice().reverse().map(d => {
          const x = dados.prosp[d] || {};
          return `<div><span>${esc(rotuloDia(d))} ${esc(dataCurta(d).slice(0, 5))}</span><b>${numero(x.a)} · ${numero(x.c)} · ${numero(x.r)} · ${numero(x.pomo)}</b></div>`;
        }).join('')}
      </div>
    </div>`;
};

ACOES['prosp-mais'] = el => {
  const dia = diaProsp(hoje());
  const k = el.dataset.campo;
  const n = Number(el.dataset.n);
  const antes = dia[k];
  dia[k] = Math.max(0, dia[k] + n);
  const bloco = dados.config.blocoAtual;
  if (k === 'a' && bloco) dia.blocos[bloco] = Math.max(0, (dia.blocos[bloco] || 0) + (dia[k] - antes));
  salvar();
  desenhar();
  if (k === 'a' && antes < dados.config.metaDia && dia.a >= dados.config.metaDia) avisar('Meta de abordagens do dia batida! 💪');
};

function somarAbordagem() {
  const dia = diaProsp(hoje());
  dia.a += 1;
  const bloco = dados.config.blocoAtual;
  if (bloco) dia.blocos[bloco] = (dia.blocos[bloco] || 0) + 1;
  salvar();
}

ACOES['prosp-copiar'] = async el => {
  const t = textoProsp(Number(el.dataset.i));
  try { await navigator.clipboard.writeText(t); } catch (e) { return avisar('Não consegui copiar. Segure o texto e copie na mão.'); }
  somarAbordagem();
  desenhar();
  avisar('Copiado! +1 abordagem.');
};

ACOES['prosp-enviar'] = el => {
  const t = textoProsp(Number(el.dataset.i));
  el.href = `https://wa.me/${numeroZap(prospWhats)}?text=${encodeURIComponent(t)}`;
  somarAbordagem();
  // Deixa o link abrir antes de redesenhar a tela.
  setTimeout(() => { desenhar(); avisar('+1 abordagem.'); }, 300);
};

/* ---------- Pomodoro ---------- */

const FOCO = 25 * 60;
const PAUSA = 5 * 60;
const pomo = { fase: 'foco', restante: FOCO, fim: 0, rodando: false, t: null };

function relogio(seg) {
  return `${String(Math.floor(seg / 60)).padStart(2, '0')}:${String(seg % 60).padStart(2, '0')}`;
}

function atualizarPomo() {
  const tempo = $('#pomo-tempo');
  if (tempo) tempo.textContent = relogio(pomo.restante);
  const play = $('#pomo-play');
  if (play) play.textContent = pomo.rodando ? '⏸ Pausar' : '▶ Começar';
  const mini = $('#pomo-mini');
  mini.hidden = !pomo.rodando;
  mini.textContent = `${pomo.fase === 'foco' ? '🍅' : '☕'} ${relogio(pomo.restante)}`;
}

function bip() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.35, 0.7].forEach(t => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.value = 0.2;
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.2);
    });
  } catch (e) { /* sem som */ }
  if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
}

function pomoTick() {
  if (!pomo.rodando) return;
  pomo.restante = Math.max(0, Math.round((pomo.fim - Date.now()) / 1000));
  atualizarPomo();
  if (pomo.restante <= 0) pomoTerminou();
}

function pomoTerminou() {
  pomo.rodando = false;
  clearInterval(pomo.t);
  bip();
  if (pomo.fase === 'foco') {
    diaProsp(hoje()).pomo += 1;
    salvar();
    pomo.fase = 'pausa';
    pomo.restante = PAUSA;
    avisar('Pomodoro feito! Pausa de 5 minutos.');
  } else {
    pomo.fase = 'foco';
    pomo.restante = FOCO;
    avisar('Pausa acabou. Bora pro próximo bloco!');
  }
  if (['prospeccao', 'painel'].includes(abaAtual) && !modal.open) desenhar();
  atualizarPomo();
}

ACOES['pomo-play'] = () => {
  if (pomo.rodando) {
    pomo.rodando = false;
    clearInterval(pomo.t);
  } else {
    pomo.rodando = true;
    pomo.fim = Date.now() + pomo.restante * 1000;
    pomo.t = setInterval(pomoTick, 1000);
  }
  atualizarPomo();
};

ACOES['pomo-zerar'] = () => {
  pomo.rodando = false;
  clearInterval(pomo.t);
  pomo.fase = 'foco';
  pomo.restante = FOCO;
  desenhar();
};

DEPOIS_DE_DESENHAR.push(atualizarPomo);

/* ---------- Finanças ---------- */

let mesFin = mesAtual();
let tipoFin = 's';

TELAS.financas = function telaFinancas() {
  const lanc = dados.fin.filter(f => f.d.startsWith(mesFin)).sort((a, b) => b.d.localeCompare(a.d));
  const entradas = lanc.filter(f => f.tipo === 'e').reduce((s, f) => s + f.v, 0);
  const saidas = lanc.filter(f => f.tipo === 's').reduce((s, f) => s + f.v, 0);
  const porCat = {};
  lanc.filter(f => f.tipo === 's').forEach(f => { porCat[f.cat] = (porCat[f.cat] || 0) + f.v; });
  const cats = Object.entries(porCat).sort((a, b) => b[1] - a[1]);
  const sobra = entradas - saidas;

  return `
    <div class="entre" style="margin:6px 0 10px">
      <button class="btn-contorno btn-peq" data-acao="fin-mes" data-n="-1" aria-label="Mês anterior">‹</button>
      <b>${esc(nomeMes(mesFin))}</b>
      <button class="btn-contorno btn-peq" data-acao="fin-mes" data-n="1" aria-label="Próximo mês">›</button>
    </div>
    <div class="resumo">
      <div class="bom"><b>${esc(moedaCentavos(entradas))}</b><span>entrou</span></div>
      <div><b>${esc(moedaCentavos(saidas))}</b><span>saiu</span></div>
      <div class="${sobra < 0 ? 'alerta' : 'bom'}"><b>${esc(moedaCentavos(sobra))}</b><span>sobrou</span></div>
    </div>

    <div class="grade duas" style="margin-top:12px">
      <div class="card">
        <h3>Lançar</h3>
        <div class="tipo-toggle">
          <button class="btn-peq ${tipoFin === 's' ? 'ativo saida' : ''}" data-acao="fin-tipo" data-tipo="s">💸 Saída</button>
          <button class="btn-peq ${tipoFin === 'e' ? 'ativo' : ''}" data-acao="fin-tipo" data-tipo="e">💰 Entrada</button>
        </div>
        <div class="grade2">
          <div><label for="fin-v">Valor</label><input id="fin-v" inputmode="decimal" placeholder="R$ 0,00"></div>
          <div><label for="fin-d">Data</label><input id="fin-d" type="date" value="${hoje()}"></div>
        </div>
        <label for="fin-cat">Categoria</label>
        <select id="fin-cat">${opcoes(tipoFin === 'e' ? CAT_ENTRADA : CAT_SAIDA)}</select>
        <label for="fin-desc">Descrição</label>
        <input id="fin-desc" placeholder="${tipoFin === 'e' ? 'Ex.: comissão venda Maria' : 'Ex.: gasolina'}">
        <button class="btn-verde btn-bloco" data-acao="fin-add">Salvar</button>
        <div class="dica">Mais rápido: digite lá em cima "gastei 45 de almoço" ou "recebi 3.200 de comissão".</div>
      </div>

      <div class="card">
        <h3>Para onde foi o dinheiro</h3>
        ${cats.length
          ? barrasH(cats.map(([c, v]) => ({ rotulo: c, valor: v, texto: moedaCentavos(v), extra: saidas ? ` ${pct(v, saidas)}%` : '' })))
          : '<div class="dica">Sem gastos neste mês.</div>'}
      </div>
    </div>

    <h2>Lançamentos</h2>
    <div class="card">
      ${lanc.length ? lanc.map(f => `
        <div class="lanc">
          <div class="desc">
            <div><b>${esc(f.desc || f.cat)}</b></div>
            <div class="card-info">${esc(dataCurta(f.d).slice(0, 5))} · ${esc(f.cat)}</div>
          </div>
          <span class="v ${f.tipo === 'e' ? 'entrada' : ''}">${f.tipo === 'e' ? '+' : '−'} ${esc(moedaCentavos(f.v))}</span>
          <button data-acao="fin-del" data-fid="${f.id}" aria-label="Apagar lançamento">🗑️</button>
        </div>`).join('') : '<div class="dica">Nada lançado neste mês.</div>'}
    </div>`;
};

ACOES['fin-mes'] = el => {
  const [a, m] = mesFin.split('-').map(Number);
  mesFin = paraTexto(new Date(a, m - 1 + Number(el.dataset.n), 1, 12)).slice(0, 7);
  desenhar();
};
ACOES['fin-tipo'] = el => { tipoFin = el.dataset.tipo; desenhar(); };
ACOES['fin-add'] = () => {
  const v = lerValorCentavos($('#fin-v').value);
  if (!(v > 0)) return avisar('Coloque o valor.');
  const d = $('#fin-d').value || hoje();
  dados.fin.push({ id: novoId('f'), d, tipo: tipoFin, v, cat: $('#fin-cat').value, desc: $('#fin-desc').value.trim() });
  mesFin = d.slice(0, 7);
  salvar(); desenhar(); avisar('Lançado.');
};
ACOES['fin-del'] = el => {
  if (!confirm('Apagar esse lançamento?')) return;
  dados.fin = dados.fin.filter(f => f.id !== el.dataset.fid);
  salvar(); desenhar();
};

/* ---------- Pessoal ---------- */

function sequencia(habito) {
  let d = hoje();
  if (!(dados.diario[d] && dados.diario[d].h && dados.diario[d].h[habito])) d = somarDias(d, -1);
  let n = 0;
  while (dados.diario[d] && dados.diario[d].h && dados.diario[d].h[habito]) {
    n++;
    d = somarDias(d, -1);
  }
  return n;
}

function linhaTarefa(t) {
  const atrasada = !t.feito && t.d && t.d < hoje();
  return `
    <div class="tarefa ${t.feito ? 'feita' : ''}">
      <input type="checkbox" data-tarefa="${t.id}" ${t.feito ? 'checked' : ''} aria-label="Concluir">
      <div class="txt">${esc(t.t)}${t.d ? `<div class="quando ${atrasada ? 'atrasada' : ''}">${esc(quando(t.d))}</div>` : ''}</div>
      <button data-acao="tarefa-del" data-tid="${t.id}" aria-label="Apagar tarefa">✕</button>
    </div>`;
}

function blocoTarefasHoje() {
  const lista = dados.tarefas.filter(t => !t.feito && t.d && t.d <= hoje());
  if (!lista.length) return '';
  return `<h2>Tarefas de hoje</h2><div class="card">${lista.map(linhaTarefa).join('')}</div>`;
}

TELAS.pessoal = function telaPessoal() {
  const h = hoje();
  const dia = diaDiario(h);
  const habitos = dados.config.habitos;
  const semana = ultimosDias(7);
  const pend = dados.tarefas.filter(t => !t.feito).sort((a, b) => (a.d || '9999').localeCompare(b.d || '9999'));
  const feitas = dados.tarefas.filter(t => t.feito).slice(-15).reverse();

  return `
    <div class="grade duas">
      <div>
        <h2>Hábitos de hoje</h2>
        <div class="habitos">
          ${habitos.map(x => {
            const seq = sequencia(x);
            return `<button class="habito ${dia.h[x] ? 'feito' : ''}" data-acao="hab" data-h="${esc(x)}">
              <span>${dia.h[x] ? '✅' : '⬜'} ${esc(x)}</span><small>${seq ? `🔥 ${seq} ${seq === 1 ? 'dia' : 'dias'}` : ''}</small></button>`;
          }).join('')}
        </div>
        <div class="card" style="margin-top:12px">
          <div class="semana-hab">
            <span></span>${semana.map(d => `<span class="cab">${esc(rotuloDia(d).slice(0, 3))}</span>`).join('')}
            ${habitos.map(x => `<span>${esc(x)}</span>${semana.map(d => `<span class="bola ${dados.diario[d] && dados.diario[d].h && dados.diario[d].h[x] ? 'sim' : ''}" title="${esc(x)} ${esc(dataCurta(d))}"></span>`).join('')}`).join('')}
          </div>
        </div>
      </div>

      <div>
        <h2>Tarefas</h2>
        <div class="card">
          <div class="linha">
            <input id="tarefa-txt" placeholder="Nova tarefa">
            <input id="tarefa-d" type="date" style="flex:0 0 150px" aria-label="Data">
            <button class="btn-verde" data-acao="tarefa-add" style="flex:0 0 auto" aria-label="Adicionar">+</button>
          </div>
          ${pend.length ? pend.map(linhaTarefa).join('') : '<div class="dica" style="margin-top:10px">Nenhuma tarefa pendente.</div>'}
          ${feitas.length ? `<details style="margin-top:8px"><summary class="dica">Feitas recentemente (${feitas.length})</summary>${feitas.map(linhaTarefa).join('')}</details>` : ''}
        </div>

        <h2>Metas e anotações pessoais</h2>
        <div class="card">
          <textarea id="notas-pessoais" style="min-height:160px" placeholder="Ex.: guardar R$ 1.000 por mês · treinar 4x por semana · ler 1 livro por mês">${esc(dados.notasPessoais)}</textarea>
          <div class="dica">Salva sozinho.</div>
        </div>
      </div>
    </div>`;
};

ACOES['hab'] = el => {
  const dia = diaDiario(hoje());
  const x = el.dataset.h;
  dia.h[x] = !dia.h[x];
  salvar(); desenhar();
};
ACOES['tarefa-add'] = () => {
  const t = $('#tarefa-txt').value.trim();
  if (!t) return avisar('Escreva a tarefa.');
  dados.tarefas.push({ id: novoId('t'), t, d: $('#tarefa-d').value || '', feito: false, criado: hoje() });
  salvar(); desenhar();
  $('#tarefa-txt').focus();
};
ACOES['tarefa-del'] = el => {
  dados.tarefas = dados.tarefas.filter(t => t.id !== el.dataset.tid);
  salvar(); desenhar();
};

/* ---------- Arquivos (guardados no aparelho, IndexedDB) ---------- */

const CAT_ARQ = ['Proposta', 'Simulação', 'Contrato', 'Material de venda', 'Conteúdo Instagram', 'Pessoal', 'Outros'];
let arquivosCache = [];
let filtroArq = '';
let bancoArq = null;

function abrirBanco() {
  if (bancoArq) return Promise.resolve(bancoArq);
  return new Promise((ok, erro) => {
    const r = indexedDB.open('central-lucas', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('arquivos', { keyPath: 'id' });
    r.onsuccess = () => { bancoArq = r.result; ok(bancoArq); };
    r.onerror = () => erro(r.error);
  });
}
async function operacaoArq(modo, fn) {
  const db = await abrirBanco();
  return new Promise((ok, erro) => {
    const tx = db.transaction('arquivos', modo);
    const req = fn(tx.objectStore('arquivos'));
    tx.oncomplete = () => ok(req ? req.result : undefined);
    tx.onerror = () => erro(tx.error);
  });
}
function arquivosTodos() { return operacaoArq('readonly', st => st.getAll()); }
function arquivoSalvar(a) { return operacaoArq('readwrite', st => st.put(a)); }
function arquivoApagar(id) { return operacaoArq('readwrite', st => st.delete(id)); }
function arquivosLimpar() { return operacaoArq('readwrite', st => st.clear()); }
async function recarregarArquivos() {
  try { arquivosCache = (await arquivosTodos()) || []; } catch (e) { arquivosCache = []; }
  arquivosCache.sort((a, b) => b.d.localeCompare(a.d) || a.nome.localeCompare(b.nome));
}

function iconeArq(a) {
  if ((a.mime || '').includes('pdf')) return '📄';
  if ((a.mime || '').startsWith('image/')) return '🖼️';
  if ((a.mime || '').startsWith('video/')) return '🎬';
  if (/sheet|excel|csv/.test(a.mime || '')) return '📊';
  return '📁';
}
function tamanho(b) {
  if (b >= 1048576) return (b / 1048576).toFixed(1).replace('.', ',') + ' MB';
  return Math.max(1, Math.round(b / 1024)) + ' KB';
}

function linhaArquivo(a, mostrarCliente) {
  const c = a.clienteId ? acharCliente(a.clienteId) : null;
  const info = [a.cat, mostrarCliente && c ? c.nome : '', dataCurta(a.d).slice(0, 5), tamanho(a.tam || 0)].filter(Boolean).join(' · ');
  return `
    <div class="arquivo">
      <span class="ic">${iconeArq(a)}</span>
      <div class="desc"><b>${esc(a.nome)}</b><span class="card-info">${esc(info)}</span></div>
      <button class="btn-contorno" data-acao="arq-abrir" data-aid="${a.id}">Abrir</button>
      ${navigator.canShare ? `<button class="btn-contorno" data-acao="arq-enviar" data-aid="${a.id}" aria-label="Compartilhar">↗</button>` : ''}
      <button class="btn-contorno" data-acao="arq-del" data-aid="${a.id}" aria-label="Apagar">🗑️</button>
    </div>`;
}

function blocoArquivosCliente(id) {
  const lista = arquivosCache.filter(a => a.clienteId === id);
  return `<div class="card">
    ${lista.map(a => linhaArquivo(a, false)).join('') || '<div class="dica" style="margin:0">Nenhum arquivo deste cliente.</div>'}
    <div class="linha" style="margin-top:10px">
      <select id="arq-cat-cli">${opcoes(CAT_ARQ, 'Proposta')}</select>
      <button class="btn-contorno" data-acao="arq-escolher" data-cliente="${id}" style="flex:0 0 auto">📎 Anexar</button>
    </div>
    <input type="file" multiple hidden data-upload data-cliente="${id}">
  </div>`;
}

TELAS.arquivos = function telaArquivos() {
  const lista = filtroArq ? arquivosCache.filter(a => a.cat === filtroArq) : arquivosCache;
  const clientes = dados.clientes.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map(c => [c.id, c.nome]);
  const total = arquivosCache.reduce((s, a) => s + (a.tam || 0), 0);
  return `
    <div class="card">
      <h3>Guardar arquivo</h3>
      <div class="grade2">
        <div><label for="arq-cat" style="margin-top:0">Tipo</label><select id="arq-cat">${opcoes(CAT_ARQ, 'Material de venda')}</select></div>
        <div><label for="arq-cli" style="margin-top:0">Cliente (opcional)</label><select id="arq-cli"><option value="">Nenhum</option>${opcoes(clientes)}</select></div>
      </div>
      <button class="btn-verde btn-bloco" data-acao="arq-escolher">📎 Escolher arquivos</button>
      <input type="file" multiple hidden data-upload>
      <div class="dica">Os arquivos ficam neste aparelho e entram no backup. ${arquivosCache.length} arquivos · ${tamanho(total)}.</div>
      <div class="dica">LGPD: guarde só o necessário. Documentos pessoais de cliente (RG, CPF) ficam no sistema oficial da Ademicon, não aqui.</div>
    </div>

    <div class="filtros">
      <button data-acao="arq-filtro" data-cat="" class="${!filtroArq ? 'ativo' : ''}">Todos (${arquivosCache.length})</button>
      ${CAT_ARQ.map(c => {
        const n = arquivosCache.filter(a => a.cat === c).length;
        return n ? `<button data-acao="arq-filtro" data-cat="${esc(c)}" class="${filtroArq === c ? 'ativo' : ''}">${esc(c)} (${n})</button>` : '';
      }).join('')}
    </div>
    <div class="card">${lista.map(a => linhaArquivo(a, true)).join('') || '<div class="dica" style="margin:0">Nenhum arquivo ainda.</div>'}</div>`;
};

ACOES['arq-filtro'] = el => { filtroArq = el.dataset.cat; desenhar(); };
ACOES['arq-escolher'] = el => {
  const inp = el.closest('.card').querySelector('[data-upload]');
  if (inp) inp.click();
};

function acharArq(id) { return arquivosCache.find(a => a.id === id); }

ACOES['arq-abrir'] = el => {
  const a = acharArq(el.dataset.aid);
  if (!a) return;
  const url = URL.createObjectURL(a.blob);
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener';
  // Arquivos que o navegador não mostra (Word, Excel...) são baixados com o nome certo.
  if (!/pdf|image|video|text/.test(a.mime || '')) link.download = a.nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};

ACOES['arq-enviar'] = async el => {
  const a = acharArq(el.dataset.aid);
  if (!a) return;
  const file = new File([a.blob], a.nome, { type: a.mime || 'application/octet-stream' });
  if (!navigator.canShare({ files: [file] })) return avisar('Este aparelho não permite compartilhar esse arquivo.');
  try { await navigator.share({ files: [file], title: a.nome }); } catch (e) { /* cancelou */ }
};

ACOES['arq-del'] = async el => {
  const a = acharArq(el.dataset.aid);
  if (!a || !confirm(`Apagar "${a.nome}"?`)) return;
  await arquivoApagar(a.id);
  await recarregarArquivos();
  redesenharComModal(a.clienteId);
  avisar('Arquivo apagado.');
};

// Se o arquivo era de um cliente aberto, reabre a ficha dele já atualizada.
function redesenharComModal(clienteId) {
  desenhar();
  if (modal.open && clienteId && acharCliente(clienteId)) abrirDetalhe(clienteId);
}

document.addEventListener('change', async e => {
  if (e.target.matches('[data-upload]') && e.target.files.length) {
    const inp = e.target;
    const clienteId = inp.dataset.cliente || ($('#arq-cli') ? $('#arq-cli').value : '');
    const cat = inp.dataset.cliente ? $('#arq-cat-cli').value : $('#arq-cat').value;
    const arquivos = [...inp.files];
    inp.value = '';
    try {
      for (const f of arquivos) {
        if (f.size > 25 * 1048576 && !confirm(`"${f.name}" tem ${tamanho(f.size)}. Arquivos grandes deixam o backup pesado. Guardar mesmo assim?`)) continue;
        await arquivoSalvar({ id: novoId('a'), nome: f.name, mime: f.type, tam: f.size, d: hoje(), cat, clienteId, blob: f });
      }
    } catch (err) {
      return avisar('Não consegui guardar. O aparelho pode estar sem espaço.');
    }
    await recarregarArquivos();
    redesenharComModal(inp.dataset.cliente);
    avisar(arquivos.length > 1 ? `${arquivos.length} arquivos guardados.` : 'Arquivo guardado.');
    return;
  }
  if (e.target.matches('[data-tarefa]')) {
    const t = dados.tarefas.find(x => x.id === e.target.dataset.tarefa);
    if (t) { t.feito = e.target.checked; t.feitoEm = t.feito ? hoje() : null; salvar(); setTimeout(desenhar, 200); }
    return;
  }
  if (e.target.id === 'bloco-atual') {
    dados.config.blocoAtual = e.target.value;
    salvar();
  }
});

/* ---------- Campos que salvam enquanto digita ---------- */

document.addEventListener('input', e => {
  const el = e.target;
  if (el.id === 'notas-pessoais') {
    dados.notasPessoais = el.value;
    clearTimeout(el._t);
    el._t = setTimeout(salvar, 400);
  }
  if (el.id === 'prosp-nome' || el.id === 'prosp-whats') {
    if (el.id === 'prosp-nome') prospNome = el.value; else prospWhats = el.value;
    mensagensProsp().forEach((m, i) => { const p = $('#prosp-prev-' + i); if (p) p.textContent = textoProsp(i); });
  }
  if (el.dataset.msgProsp != null) {
    const i = Number(el.dataset.msgProsp);
    mensagensProsp()[i].texto = el.value;
    const p = $('#prosp-prev-' + i);
    if (p) p.textContent = textoProsp(i);
    clearTimeout(el._t);
    el._t = setTimeout(salvar, 400);
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'tarefa-txt') { e.preventDefault(); ACOES['tarefa-add'](); }
});
