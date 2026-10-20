# Follow-up do Lucas

App de celular que mostra, todo dia, quem chamar depois da proposta e abre o WhatsApp com a mensagem pronta.

- Funciona no navegador do celular e pode ser instalado na tela inicial.
- Sem servidor, sem mensalidade, sem senha de API.
- Os dados ficam **só no seu celular**. Faça backup toda semana (Ajustes → Baixar backup).

## Como usar no dia a dia

1. **+** (botão verde redondo) → cadastra o cliente.
2. Mandou a proposta? Abra o cliente → **Marcar proposta enviada**. O app agenda sozinho os contatos (padrão: 1, 3, 7 e 15 dias depois).
3. Toda manhã abra a tela **Hoje**: atrasados aparecem primeiro, em vermelho.
4. Toque **Chamar** → o WhatsApp abre com a mensagem escrita → você aperta enviar.
5. Ao voltar para o app, ele pergunta se você mandou. Toque **Sim, enviei** e o próximo contato é agendado.
6. Cliente respondeu e quer mais prazo? **Adiar**. Fechou? **Fechou 🎉**. Não vai fechar? **Perdido** e escolha o motivo.

## Publicar no GitHub Pages (grátis)

1. No GitHub, abra o repositório → **Settings** → **Pages**.
2. Em "Source", escolha **Deploy from a branch**.
3. Em "Branch", escolha `main` e a pasta `/ (root)` → **Save**.
4. Em 1 a 2 minutos o endereço aparece no topo dessa tela.

## Instalar na tela inicial

- **Android (Chrome):** abra o endereço → menu ⋮ → **Instalar app** (ou "Adicionar à tela inicial").
- **iPhone (Safari):** abra o endereço → botão compartilhar → **Adicionar à Tela de Início**.

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `index.html` | A página |
| `app.js` | Toda a lógica (régua, mensagens, telas) |
| `style.css` | Visual |
| `manifest.webmanifest`, `icon*` | Instalação na tela inicial |
| `sw.js` | Faz o app abrir mesmo sem internet |

## Agente Prospector (prospecção de lead frio)

Na pasta `agente-prospeccao/` estão as instruções prontas para montar um agente de IA no Claude (ou ChatGPT) focado em prospecção de lead frio: mensagens, roteiros de ligação, perfis-alvo, canais, indicadores e meta reversa. Comece por `agente-prospeccao/0-COMO-USAR.md`.
