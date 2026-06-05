# 💊 Preço Justo — Comparador de Preços de Medicamentos

> Consulte o teto ANVISA e compare preços em tempo real nas principais farmácias do Brasil.

**Preço Justo** é uma plataforma web open-source que permite ao consumidor brasileiro consultar o **Preço Máximo ao Consumidor (PMC)** regulado pela ANVISA/CMED e comparar com os preços praticados ao vivo em farmácias como Drogasil, Pague Menos e Ultrafarma — tudo em uma única tela.

---

<!-- 📸 PRINT DA TELA INICIAL: Insira aqui um print ou GIF da página inicial com o Autocomplete ativo -->
<!-- Exemplo: ![Autocomplete Preço Justo](caminho/para/imagem.png) -->

## ✨ Funcionalidades

- 🔍 **Busca inteligente** por nome comercial ou princípio ativo (base CMED com 21k+ medicamentos)
- 💰 **Teto ANVISA** calculado por estado (ICMS variável por UF)
- 🏪 **Comparação ao vivo** de preços em Drogasil, Pague Menos e Ultrafarma via web scraping
- 🏥 **Detecção automática** de produtos hospitalares (não disponíveis em varejo)
- 🧪 **Validação de marca** para medicamentos de referência (evita comparar marcas diferentes)
- 💊 **Detecção de compostos** (ex: Dipirona+Cafeína+Orfenadrina) com busca correta por substância
- 🏛️ **Disponibilidade no SUS / Farmácia Popular** integrada
- 🌗 **Tema claro/escuro** com persistência no localStorage
- 📍 **Seletor de estado** para cálculo exato do ICMS regional

---

<!-- 📸 PRINT DOS RESULTADOS: Insira aqui um print da tabela de resultados exibindo o teto e os preços comparados -->
<!-- Exemplo: ![Resultados do Preço Justo](caminho/para/imagem.png) -->

## 🧠 Desafios e Dificuldades do Projeto

O desenvolvimento do **Preço Justo** envolveu superar diversos desafios de Engenharia de Dados e Infraestrutura Web:

1. **Tratamento de Dados Governamentais complexos (Planilhas CMED):**
   * A tabela da ANVISA possui dezenas de colunas, cabeçalhos dinâmicos que mudam de posição mensalmente e um preâmbulo textual antes das tabelas de dados.
   * **Solução:** Desenvolvemos scripts inteligentes em Python (Pandas) e Node.js que detectam dinamicamente a linha de cabeçalho verdadeira, pulam o preâmbulo administrativo e injetam os mais de 21 mil medicamentos de forma otimizada em lotes no Supabase.
   <!-- 📸 PRINT DO TERMINAL/SCRIPT: Insira aqui um print do terminal rodando o script de importação da planilha -->

2. **Web Scraping resiliente e Bypass de WAF/Bloqueios:**
   * Farmácias utilizam WAFs (Web Application Firewalls) agressivos que bloqueiam requisições de servidores.
   * **Solução:** Otimizamos o backend com um sistema de agentes/headers simulados, regras fuzzy para tratar dosagens (ex: mg, ml, caps) e retries programados em endpoints de busca.

3. **Autocomplemento veloz (Autocomplete):**
   * Buscar por texto puro em mais de 21 mil remédios no Supabase de forma rápida exigiu otimização.
   * **Solução:** Criamos índices invertidos GIN (`to_tsvector`) no PostgreSQL para garantir buscas instantâneas a cada caractere digitado pelo usuário.

---

## 🛠️ Stack

| Camada | Tecnologia | Detalhes |
|---|---|---|
| **Frontend & Backend** | [Next.js 16](https://nextjs.org) (App Router) | React 19, TypeScript e Server-Side API Routes para bypass de CORS |
| **Banco de Dados** | [Supabase](https://supabase.com) (PostgreSQL) | Índices GIN (`to_tsvector`) para busca textual ultrarrápida no autocomplete |
| **Web Scraping** | Cheerio + Fetch nativo | Robôs de scraping integrados em rotas de API para busca ao vivo em Drogasil, Pague Menos e Ultrafarma |
| **Interface & Estilo** | Tailwind CSS v4 + Framer Motion | Animações fluidas, variáveis CSS nativas (`@theme inline`), design responsivo otimizado para mobile e suporte a modo escuro/claro |
| **Engenharia de Dados (ETL)** | Python 3 + Pandas | Scripts robustos para extração, limpeza e importação de planilhas CMED complexas (`BeautifulSoup4`, `openpyxl`, `supabase-py`) |
| **Fonte de Dados** | [Tabela CMED/ANVISA](https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos) | Base oficial de Preço Máximo ao Consumidor (PMC) do governo federal |

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

Os preços das farmácias são extraídos em tempo real via **web scraping** de sites terceiros. Por conta da natureza dinâmica das páginas web (que podem sofrer alterações de layout, seletores ou bloqueios temporários), **podem ocorrer erros, atrasos ou divergências nos preços exibidos**. Os valores apresentados são os preços base, sem considerar descontos adicionais por CPF, convênios ou programas de fidelidade (PBM). O teto ANVISA é calculado a partir da base pública da CMED. Este é um projeto **estritamente educacional e informativo**, sem vínculo comercial com os estabelecimentos parceiros.

---

## 👩‍💻 Desenvolvido por

**Isabelle Victoria de Souza**  
*Desenvolvedora Full Stack em formação*

* GitHub: [@IsisVct](https://github.com/IsisVct)
* LinkedIn: [Isabelle Victoria](https://www.linkedin.com/in/isabelle-victoria/)

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.
