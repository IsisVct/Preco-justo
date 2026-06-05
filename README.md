<div align="center">

# 💊 Preço Justo 
**Comparador Inteligente de Preços de Medicamentos**

> *Consulte o teto regulatório da ANVISA e compare preços em tempo real nas principais farmácias do Brasil, garantindo uma compra justa e transparente.*

<br>

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)

<br>

### 🌗 Tema Light & Dark
<p align="center">
  <img width="800" alt="tela_preco-justo-light" src="https://github.com/user-attachments/assets/77a06a5d-49ae-430a-8146-497e30a5e626" />
  <img width="800" alt="tela_preco-justo" src="https://github.com/user-attachments/assets/f1321e0b-eca2-42b3-91df-0da9a0c6b422" />
</p>

</div>

---

## ✨ Funcionalidades

- 🔍 **Busca Inteligente:** Consulta ultrarrápida por nome comercial ou princípio ativo em uma base de mais de 21 mil medicamentos.
- 💰 **Teto ANVISA Dinâmico:** Cálculo do Preço Máximo ao Consumidor (PMC) ajustado automaticamente pelo ICMS do estado selecionado.
- 🏪 **Comparação ao Vivo:** Web scraping integrado que busca preços simultâneos na Drogasil, Pague Menos e Ultrafarma.
- 🏥 **Filtro de Uso Restrito:** Detecção automática de produtos hospitalares (não disponíveis em varejo).
- 🧪 **Validação de Referência e Compostos:** Motor de busca que respeita marcas de referência e entende composições complexas (ex: *Dipirona + Cafeína + Orfenadrina*).
- 🏛️ **Integração SUS / Farmácia Popular:** Tags visuais indicando a disponibilidade de retirada gratuita na rede pública.
- 🌗 **UI Responsiva e Adaptável:** Tema claro/escuro nativo com persistência no `localStorage`.

<div align="center">
  <img width="800" alt="tela_preco-justo-light-resultado" src="https://github.com/user-attachments/assets/827ca80f-011d-4fd1-a1c3-2ea3cc5bc603" />
</div>

---

## 🧠 Desafios e Arquitetura

O desenvolvimento do **Preço Justo** exigiu a superação de desafios complexos de Engenharia de Dados e Infraestrutura Web:

1. **Tratamento de Dados Governamentais (ETL):**
   * **O Problema:** A tabela da CMED/ANVISA possui formatação instável, com cabeçalhos dinâmicos que mudam de posição mensalmente e preâmbulos textuais irregulares.
   * **A Solução:** Desenvolvimento de scripts analíticos em Python (Pandas) que detectam dinamicamente a linha de cabeçalho verdadeira, higienizam os dados e injetam os milhares de registros de forma otimizada (em lotes) no Supabase.

2. **Web Scraping Resiliente:**
   * **O Problema:** Redes de farmácias utilizam WAFs (Web Application Firewalls) agressivos que bloqueiam requisições automatizadas.
   * **A Solução:** Backend Next.js configurado com sistema de rotação de *headers*, regras *fuzzy* para padronização de dosagens (mg, ml, caps) e estratégia de *retries* programados para garantir a coleta dos dados.

3. **Performance no Autocomplete:**
   * **O Problema:** Buscar correspondências parciais em mais de 21.000 registros de texto puro de forma síncrona geraria gargalos de performance.
   * **A Solução:** Implementação de índices invertidos **GIN (`to_tsvector`)** nativos do PostgreSQL, garantindo tempo de resposta na casa dos milissegundos a cada caractere digitado.

---

## 🛠️ Stack Tecnológico

| Camada | Tecnologia | Detalhes |
|---|---|---|
| **Frontend & Backend** | Next.js 16 (App Router) | React 19, TypeScript e Server-Side API Routes para bypass de CORS. |
| **Banco de Dados** | Supabase (PostgreSQL) | Estruturado com índices GIN para busca textual de altíssima performance. |
| **Web Scraping** | Cheerio + Fetch nativo | Robôs integrados em rotas de API para busca concorrente nos e-commerces. |
| **Interface & Estilo** | Tailwind CSS v4 + Framer Motion | Animações fluidas e design responsivo, com variáveis CSS nativas (`@theme inline`). |
| **Engenharia de Dados** | Python 3 + Pandas | Scripts robustos para extração e limpeza de dados governamentais (`BeautifulSoup4`, `openpyxl`). |
| **Fonte de Dados Base** | [Tabela CMED/ANVISA](https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos) | Dados oficiais de teto regulatório (PMC). |

---

## 🚀 Como rodar localmente

### 1. Clonar e instalar dependências

```bash
git clone https://github.com/IsisVct/Preco-justo.git
cd Preco-justo
npm install
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto com as suas credenciais do Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
```

### 3. Pipeline de Dados (Carga Inicial)

Baixe a planilha CMED mais recente neste link oficial, salve como `tabela_cmed.xlsx` na raiz do projeto e execute a automação:

```bash
# Crie e ative o ambiente virtual Python
python -m venv venv
venv\Scripts\activate   # No Windows
# source venv/bin/activate  # No Linux/Mac

# Instale as dependências de engenharia de dados
pip install pandas openpyxl supabase python-dotenv

# Execute a injeção no banco de dados
python scripts/import_xlsx.py
```

### 4. Iniciar a aplicação

```bash
npm run dev
```

Acesse `http://localhost:3000` no seu navegador.

---

## 🗄️ Estrutura do Banco de Dados

A arquitetura DDL base configurada no Supabase:

```sql
create table medicines (
  id             bigserial primary key,
  name           text not null,
  active_ingredient text,
  laboratory     text,
  description    text,
  max_price      numeric,
  is_generic     boolean default false,
  sus_availability boolean default false,
  farmaciapopular_availability boolean default false,
  sus_note       text,
  created_at     timestamptz default now()
);

-- Índices essenciais para o motor de busca
create index idx_medicines_name on medicines using gin(to_tsvector('portuguese', name));
create index idx_medicines_ai   on medicines using gin(to_tsvector('portuguese', active_ingredient));
```

---

## ⚠️ Aviso Legal

Os preços das farmácias são extraídos em tempo real via **web scraping** de sites terceiros e cacheados por até 2 horas para otimização de performance e prevenção de bloqueios de IP. Por conta da natureza dinâmica das páginas web (que podem sofrer alterações de layout ou implementar bloqueios temporários), **podem ocorrer divergências ou falhas pontuais na captura dos valores**. O teto ANVISA exibido é calculado puramente a partir da base pública da CMED. Este é um projeto **estritamente educacional**, sem nenhum vínculo comercial com as marcas, laboratórios ou estabelecimentos citados.

---

## 👩‍💻 Desenvolvido por

**Isabelle Victoria de Souza**  
Estudante de Análise e Desenvolvimento de Sistemas (ADS) & Desenvolvedora Full Stack em formação.

* [GitHub](https://github.com/IsisVct)
* [LinkedIn](https://www.linkedin.com/in/isabelle-victoria/)

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.
