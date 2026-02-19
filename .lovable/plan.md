

## 🚀 Agente Prospector B2B - Dashboard de Captura de Leads

### Visão Geral
Um dashboard web profissional para buscar empresas no Google Maps por ramo/localização, capturar dados de contato e gerenciar leads para prospecção comercial.

---

### 1. Dashboard Principal
- Campo de busca com input para **ramo de atividade** (ex: "Academias") e **cidade/região** (ex: "Curitiba - PR")
- Botão "Capturar Leads" que dispara a busca
- **Cards de métricas** no topo: Total de empresas encontradas, Quantidade com WhatsApp, Média de avaliações
- **Tabela interativa** com resultados: Nome, Ramo, Endereço, Telefone, Link WhatsApp (clicável), Avaliação, Website
- **Botão de exportação CSV** para baixar a lista de leads

### 2. Backend - Edge Function com Serper.dev
- Edge Function no Supabase que recebe o termo de busca e chama a **API do Google Maps via Serper.dev**
- Tratamento dos dados: limpeza de telefone, geração automática do link `wa.me/55...`
- A chave da API Serper.dev será armazenada como secret seguro no Supabase

### 3. Banco de Dados (Supabase)
- Tabela de **leads capturados** com todos os campos (nome, endereço, telefone, WhatsApp, ramo, avaliação, website, cidade)
- Tabela de **histórico de buscas** para rastrear o que já foi pesquisado
- Possibilidade de consultar leads salvos anteriormente

### 4. Gestão de Leads
- Página de **leads salvos** com filtros por ramo, cidade e data de captura
- Indicador visual se o telefone parece ser celular (potencial WhatsApp)
- Opção de marcar leads como "contatado" ou "interessado"

### 5. Design e UX
- Interface limpa e moderna com tema escuro/claro
- Layout responsivo (funciona no celular e desktop)
- Feedback visual durante a busca (loading states)
- Notificações de sucesso/erro via toast

