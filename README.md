# Central do Lucas

Um app só para o dia a dia de vendas e da vida: leads, follow-up, prospecção, finanças, hábitos, tarefas e arquivos.
Você **digita do seu jeito** numa caixa e o app organiza no lugar certo.

- Funciona no navegador do celular e do computador, e pode ser instalado na tela inicial.
- Sem servidor, sem mensalidade, sem senha de API. Funciona sem internet.
- Os dados ficam **só no aparelho**. Faça backup toda semana (Ajustes → Baixar backup). O mesmo arquivo passa tudo do celular para o computador.
- Quem já usava o "Follow-up do Lucas" não perde nada: os clientes continuam lá.

## A caixa "Digite aqui"

Escreva como se mandasse um áudio para você mesmo. O app mostra o que entendeu, você corrige se precisar e salva.

| Você digita | Vira |
|---|---|
| `Maria 13 99123-4567 quer casa 300 mil, veio da Nestlé, chamar sexta` | Lead novo, imobiliário, R$ 300 mil, origem Nestlé, contato na sexta |
| `Maria disse que vai ver com o marido, chamar dia 5` | Anotação na ficha da Maria e próximo contato no dia 5 |
| `Roberto 13 99777-6655 mandei proposta 250 mil terreno` | Lead já na etapa "Proposta enviada", com a régua de follow-up criada |
| `gastei 45,90 de almoço` · `recebi 3.500 de comissão` | Lançamento em Finanças com categoria |
| `fiz 30 abordagens no bloco tok e 5 conversas` | Soma no contador de prospecção de hoje |
| `treinei e li 20 páginas` | Marca os hábitos do dia |
| `lembrar de mandar material pro Zé amanhã` | Tarefa com data |

Pode colar vários de uma vez, um por linha. No Chrome dá para tocar no 🎤 e falar.
Não é uma IA paga: são regras que rodam no aparelho. Por isso sempre aparece a tela "Entendi assim" antes de salvar.

## Abas

- **Painel**: vendido no mês x meta, abordagens de hoje, seu **número mágico** (abordagens por dia para bater a meta), funil do mês com % de conversão por etapa, origem dos leads, dinheiro do mês e hábitos.
- **Hoje**: quem chamar hoje (atrasados primeiro), com a mensagem pronta no WhatsApp. Reuniões do dia e tarefas.
- **Leads**: lista ou funil (colunas por etapa), busca, filtro por origem (Nestlé, Base Própria, Instagram, Facebook, Lead Frio...). Ficha com histórico e arquivos do cliente.
- **Prospecção**: contador de abordagens (+1, +5, +10) por bloco da base, conversas e reuniões, pomodoro 25/5 e mensagens prontas de abordagem que já somam +1.
- **Finanças**: entradas, saídas e sobra do mês, gastos por categoria.
- **Pessoal**: hábitos com sequência de dias 🔥, tarefas e metas pessoais.
- **Arquivos**: propostas, simulações, materiais, separados por tipo e por cliente. Abrir e compartilhar direto do app.
- **Ajustes**: meta do mês, ticket médio, abordagens por venda, meta diária, blocos da base, hábitos, régua de follow-up, modelos de mensagem, tema claro/escuro e backup.

## Como usar no dia a dia

1. **Manhã/rota**: anote leads e gastos na caixa, do jeito que vier.
2. **18h, escritório**: aba **Hoje** → Chamar → enviar → "Sim, enviei". O app agenda o próximo contato sozinho.
3. **Depois**: aba **Prospecção** → pomodoro → mensagens prontas. Cada envio conta +1.
4. **Fim do dia**: olhe o **Painel**. O número mágico diz quantas abordagens por dia faltam para a meta.

## Publicar no GitHub Pages (grátis)

1. No GitHub, abra o repositório → **Settings** → **Pages**.
2. Em "Source", escolha **Deploy from a branch**.
3. Em "Branch", escolha `main` e a pasta `/ (root)` → **Save**.
4. Em 1 a 2 minutos o endereço aparece no topo dessa tela.

## Instalar na tela inicial

- **Android (Chrome):** abra o endereço → menu ⋮ → **Instalar app**.
- **iPhone (Safari):** abra o endereço → botão compartilhar → **Adicionar à Tela de Início**.
- **Computador (Chrome/Edge):** ícone de instalar na barra de endereço.

## Arquivos do projeto

| Arquivo | Para que serve |
|---|---|
| `index.html` | A página |
| `app.js` | Dados, follow-up, leads, ajustes, backup |
| `assistente.js` | A caixa "Digite aqui": entende o texto e organiza |
| `modulos.js` | Painel, Prospecção, Finanças, Pessoal e Arquivos |
| `style.css` | Visual (cores suaves, modo escuro automático) |
| `manifest.webmanifest`, `icon*` | Instalação na tela inicial |
| `sw.js` | Faz o app abrir mesmo sem internet |
