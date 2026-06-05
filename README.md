# 💊 Preço Justo — Comparador de Preços de Medicamentos

> Consulte o teto ANVISA e compare preços em tempo real nas principais farmácias do Brasil.

**Preço Justo** é uma plataforma web open-source que permite ao consumidor brasileiro consultar o **Preço Máximo ao Consumidor (PMC)** regulado pela ANVISA/CMED e comparar com os preços praticados ao vivo em farmácias como Drogasil, Pague Menos e Ultrafarma — tudo em uma única tela.

---

## ✨ Funcionalidades

- 🔍 **Busca inteligente** por nome comercial ou princípio ativo (base CMED com 21k+ medicamentos)
- 💰 **Teto ANVISA em tempo real** calculado por estado (ICMS variável por UF)
- 🏪 **Comparação ao vivo** de preços em Drogasil, Pague Menos e Ultrafarma via web scraping
- 🏥 **Detecção automática** de produtos hospitalares (não disponíveis em varejo)
- 🧪 **Validação de marca** para medicamentos de referência (evita comparar marcas diferentes)
- 💊 **Detecção de compostos** (ex: Dipirona+Cafeína+Orfenadrina) com busca correta por substância
- 🏛️ **Disponibilidade no SUS / Farmácia Popular** integrada
- 🌗 **Tema claro/escuro** com persistência no localStorage
- 📍 **Seletor de estado** para cálculo exato do ICMS regional

---

## 🛠️ Stack

| Camada | Tecnologia |
|---|---|
| Framework | [Next.js 15](https://nextjs.org) (App Router) |
| Banco de dados | [Supabase](https://supabase.com) (PostgreSQL) |
| Web scraping | Cheerio + fetch nativo |
| Animações | Framer Motion |
| Estilo | CSS customizado (sem Tailwind runtime) |
| Fonte de dados | [Tabela CMED/ANVISA](https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos) |

---

## 🚀 Como rodar localmente

### 1. Clone o repositório

```bash
git clone https://github.com/IsisVct/Preco-justo.git
cd Preco-justo
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env.local` na raiz:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
```

### 4. Importe a tabela CMED

Baixe a planilha CMED mais recente em [anvisa.gov.br](https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos) e salve como `tabela_cmed.xlsx` na raiz do projeto. Depois:

```bash
# Crie o ambiente virtual Python
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # Linux/Mac

pip install pandas openpyxl supabase python-dotenv
python scripts/import_xlsx.py
```

### 5. Rode o servidor de desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## 🗄️ Estrutura do banco de dados (Supabase)

```sql
create table medicines (
  id            bigserial primary key,
  name          text not null,
  active_ingredient text,
  laboratory    text,
  description   text,
  max_price     numeric,
  is_generic    boolean default false,
  sus_availability boolean default false,
  farmaciapopular_availability boolean default false,
  sus_note      text,
  created_at    timestamptz default now()
);

-- Índice para busca por texto
create index idx_medicines_name on medicines using gin(to_tsvector('portuguese', name));
create index idx_medicines_ai   on medicines using gin(to_tsvector('portuguese', active_ingredient));
```

---

## ⚠️ Aviso Legal

Os preços exibidos são extraídos automaticamente dos sites oficiais das farmácias e representam o **preço base** sem descontos dinâmicos (PBM, convênios, CPF do cliente). O teto ANVISA é calculado com base na tabela CMED pública. Este projeto é **educacional e informativo** — não possui nenhum vínculo comercial com as farmácias listadas.

---

## 📄 Licença

MIT © [Isabela](https://github.com/IsisVct)
