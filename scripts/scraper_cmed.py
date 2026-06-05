import os
import requests
from bs4 import BeautifulSoup
import pandas as pd
from supabase import create_client, Client
from dotenv import load_dotenv
import io

load_dotenv('.env.local')
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Erro: Chaves do Supabase não encontradas no .env.local.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

CMED_URL = "https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos"

def run_automation():
    print("\n🤖 Iniciando Robô de Engenharia de Dados...")
    
    print(f"🌐 Acessando o portal da CMED: {CMED_URL}")
    response = requests.get(CMED_URL)
    soup = BeautifulSoup(response.content, 'html.parser')
    
    links = soup.find_all('a', href=True)
    excel_url = None
    
    for link in links:
        href = link['href']
        if '.xls' in href or '.xlsx' in href:
            if 'preco' in href.lower() or 'conformidade' in href.lower() or 'pmc' in href.lower():
                excel_url = href
                break
    
    if not excel_url:
        print("❌ Erro: Não foi possível encontrar a planilha de preços mais recente no site da ANVISA.")
        return
        
    print(f"✅ Encontrada a última versão da tabela CMED: {excel_url}")
    
    print("⬇️ Fazendo o download do Excel (isto pode demorar, o arquivo é pesado)...")
    excel_data = requests.get(excel_url).content
    
    print("🧹 Limpando dados e procurando o cabeçalho dinamicamente...")
    
    df_raw = pd.read_excel(io.BytesIO(excel_data), header=None)
    
    header_row_index = -1
    for index, row in df_raw.iterrows():
        valid_cells = [str(val).strip().upper() for val in row.values if pd.notna(val) and str(val).strip() not in ('', 'NAN', 'NONE')]
        
        if len(valid_cells) > 15:
            if any('SUBST' in val for val in valid_cells) and any('PRODUTO' in val for val in valid_cells):
                header_row_index = index
                break
            
    if header_row_index == -1:
        print("❌ Erro: Não foi possível encontrar a linha de cabeçalho no Excel da CMED.")
        return

    print(f"✅ Cabeçalho real encontrado na linha {header_row_index + 1}!")

    df_raw.columns = df_raw.iloc[header_row_index]
    
    df = df_raw.iloc[header_row_index + 1:].reset_index(drop=True)
    
    df = df.loc[:, df.columns.notna()]
    
    col_substancia = next((c for c in df.columns if 'SUBST' in str(c).upper()), None)
    col_produto = next((c for c in df.columns if 'PRODUTO' in str(c).upper()), None)
    col_lab = next((c for c in df.columns if 'LABORAT' in str(c).upper()), None)
    col_apres = next((c for c in df.columns if 'APRESENTA' in str(c).upper()), None)
    
    col_pmc = next((c for c in df.columns if 'PMC' in str(c).upper() and '18' in str(c)), None)
    
    if not all([col_substancia, col_produto, col_pmc]):
        print("❌ Erro: O formato do Excel do Governo mudou e não foi possível mapear as colunas essenciais.")
        print(f"Colunas disponíveis na linha {header_row_index + 1}: {df.columns.tolist()}")
        return
        
    print("🚀 Iniciando envio assíncrono para o Supabase em Lotes...")
    
    batch = []
    total_imported = 0
    BATCH_SIZE = 100
    
    for index, row in df.iterrows():
        try:
            val_str = str(row[col_pmc]).strip()
            
            if val_str == 'nan' or val_str == '' or val_str == 'None':
                continue
                
            pmc_val = val_str.replace('.', '').replace(',', '.')
            max_price = float(pmc_val)
            
            if max_price > 0:
                medicine = {
                    "name": str(row[col_produto]),
                    "active_ingredient": str(row[col_substancia]),
                    "laboratory": str(row[col_lab]) if col_lab else 'Desconhecido',
                    "description": str(row[col_apres]) if col_apres else '',
                    "max_price": max_price
                }
                batch.append(medicine)
                
            if len(batch) >= BATCH_SIZE:
                supabase.table('medicines').insert(batch).execute()
                total_imported += len(batch)
                batch = []
                print(f"   -> {total_imported} registos sincronizados...")
                
        except Exception as e:
            continue
            
    if len(batch) > 0:
        supabase.table('medicines').insert(batch).execute()
        total_imported += len(batch)
        
    print("\n=========================================")
    print("🎉 Automação 100% Concluída!")
    print(f"📊 {total_imported} medicamentos extraídos direto da ANVISA para a sua base de dados.")
    print("=========================================\n")

if __name__ == "__main__":
    run_automation()