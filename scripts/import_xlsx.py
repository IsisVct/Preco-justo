import os
import pandas as pd
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv('.env.local')

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Erro: Chaves do Supabase não encontradas no arquivo .env.local.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

EXCEL_FILE_PATH = 'tabela_cmed.xlsx'
BATCH_SIZE = 100

def run_import():
    if not os.path.exists(EXCEL_FILE_PATH):
        print(f"\n[!] Erro: Arquivo '{EXCEL_FILE_PATH}' não encontrado.")
        return

    print("Lendo a planilha tabela_cmed.xlsx (isso pode levar alguns segundos)...")
    
    try:
        df = pd.read_excel(EXCEL_FILE_PATH, skiprows=41)
    except Exception as e:
        print(f"Erro ao ler a planilha: {e}")
        return

    df.columns = [str(col).strip() for col in df.columns]

    pmc_col = None
    for col in df.columns:
        col_clean = col.replace(" ", "").upper()
        if 'PMC18%' in col_clean:
            pmc_col = col
            break

    if not pmc_col:
        for col in df.columns:
            if col.startswith('PMC'):
                pmc_col = col
                break

    if not pmc_col:
        print("Erro: Não foi possível localizar a coluna de preço 'PMC 18%' na planilha.")
        return

    print(f"Coluna de preço identificada: '{pmc_col}'")

    batch = []
    total_imported = 0

    print("Iniciando importação para o Supabase...")
    for idx, row in df.iterrows():
        try:
            val = row.get(pmc_col)
            if pd.isna(val):
                continue
                
            if isinstance(val, str):
                max_price = float(val.replace('.', '').replace(',', '.'))
            else:
                max_price = float(val)

            if max_price > 0:
                name = str(row.get('PRODUTO', 'Desconhecido')).strip()
                active_ingredient = str(row.get('SUBSTÂNCIA', 'Desconhecido')).strip()
                laboratory = str(row.get('LABORATÓRIO', 'Desconhecido')).strip()
                description = str(row.get('APRESENTAÇÃO', '')).strip()

                if name.lower() == 'nan': name = 'Desconhecido'
                if active_ingredient.lower() == 'nan': active_ingredient = 'Desconhecido'
                if laboratory.lower() == 'nan': laboratory = 'Desconhecido'
                if description.lower() == 'nan': description = ''

                medicine = {
                    "name": name,
                    "active_ingredient": active_ingredient,
                    "laboratory": laboratory,
                    "description": description,
                    "max_price": max_price
                }
                batch.append(medicine)

            if len(batch) >= BATCH_SIZE:
                supabase.table('medicines').upsert(batch, on_conflict='name,laboratory,description').execute()
                total_imported += len(batch)
                print(f"Sucesso: {total_imported} medicamentos inseridos...")
                batch = []

        except Exception as e:
            continue

    if len(batch) > 0:
        supabase.table('medicines').upsert(batch, on_conflict='name,laboratory,description').execute()
        total_imported += len(batch)

    print("\n=========================================")
    print("🎉 Importação do Excel concluída com sucesso!")
    print(f"📊 Total de registros inseridos: {total_imported}")
    print("=========================================\n")

if __name__ == "__main__":
    run_import()