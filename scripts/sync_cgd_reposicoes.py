import hashlib
import os
import re
from datetime import datetime
from urllib.parse import urljoin

from supabase import create_client

from cgd_access import REPORT_URL, playwright_login, requests_login, transfer_cookies_to_context

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
CGD_LOGIN_URL = os.getenv("CGD_LOGIN_URL", "https://app.cgd.com.br/login")


def env_first(*names):
    for name in names:
        value = os.getenv(name)
        if value:
            return value
    return None


UNIDADES = [
    {"nome": "MATRIZ", "usuario": env_first("CGD_USER_MATRIZ", "CGD_MATRIZ_USERNAME", "CGD_USERNAME"), "senha": env_first("CGD_PASS_MATRIZ", "CGD_MATRIZ_PASSWORD", "CGD_PASSWORD"), "url": env_first("CGD_REPOSICOES_URL_MATRIZ", "CGD_MATRIZ_URL", "CGD_BASE_URL")},
    {"nome": "FILIAL", "usuario": env_first("CGD_USER_FILIAL", "CGD_FILIAL_USERNAME", "CGD_USERNAME"), "senha": env_first("CGD_PASS_FILIAL", "CGD_FILIAL_PASSWORD", "CGD_PASSWORD"), "url": env_first("CGD_REPOSICOES_URL_FILIAL", "CGD_FILIAL_URL", "CGD_BASE_URL")},
]


def texto(locator):
    try:
        return " ".join(locator.inner_text().split()).strip()
    except Exception:
        return ""


def pagina_tem_dados(page):
    try:
        return page.locator("table tbody tr, table tr, [role='row'], .table-responsive tr, .MuiDataGrid-row").count() > 0
    except Exception:
        return False


def extrair_linhas(page):
    linhas = []
    tabelas = page.locator("table")
    for ti in range(tabelas.count()):
        tabela = tabelas.nth(ti)
        cabecalhos = [texto(tabela.locator("thead th").nth(i)) for i in range(tabela.locator("thead th").count())]
        rows = tabela.locator("tbody tr")
        if rows.count() == 0:
            rows = tabela.locator("tr")
        for ri in range(rows.count()):
            row = rows.nth(ri)
            celulas = [texto(row.locator("th,td").nth(i)) for i in range(row.locator("th,td").count())]
            celulas = [c for c in celulas if c]
            if celulas:
                linhas.append((celulas, cabecalhos))
    if not linhas:
        rows = page.locator("[role='row'], .MuiDataGrid-row, .ant-table-row")
        for ri in range(rows.count()):
            row = rows.nth(ri)
            cells = row.locator("[role='gridcell'],[role='cell'],td")
            celulas = [texto(cells.nth(i)) for i in range(cells.count())]
            celulas = [c for c in celulas if c]
            if celulas:
                linhas.append((celulas, []))
    return linhas


def normalizar_data(valor):
    m = re.search(r"(\d{1,2}/\d{1,2}/\d{2,4})", valor.strip())
    if m:
        bruto = m.group(1)
        for fmt in ("%d/%m/%Y", "%d/%m/%y"):
            try:
                return datetime.strptime(bruto, fmt).strftime("%d/%m/%Y")
            except ValueError:
                pass
    m = re.search(r"(\d{4}-\d{2}-\d{2})", valor)
    if m:
        return datetime.strptime(m.group(1), "%Y-%m-%d").strftime("%d/%m/%Y")
    return valor.strip()


def normalizar_horario(valor, padrao="16:00"):
    m = re.search(r"\b([01]?\d|2[0-3]):([0-5]\d)\b", valor)
    return f"{int(m.group(1)):02d}:{m.group(2)}" if m else padrao


def extrair_reposicoes(page, unidade):
    registros = []
    for celulas, cabecalhos in extrair_linhas(page):
        bruto = " | ".join(celulas)
        if len(celulas) < 2 or not re.search(r"\d{1,2}/\d{1,2}/\d{2,4}|\d{4}-\d{2}-\d{2}", bruto):
            continue
        mapa = {}
        if cabecalhos and len(cabecalhos) == len(celulas):
            for cab, valor in zip(cabecalhos, celulas):
                mapa[re.sub(r"\s+", " ", cab).strip().lower()] = valor
        data = normalizar_data(bruto)
        horarios = re.findall(r"\b(?:[01]?\d|2[0-3]):[0-5]\d\b", bruto)
        inicio = horarios[0] if horarios else normalizar_horario(bruto)
        fim = horarios[1] if len(horarios) > 1 else "18:00"
        def por_nome(chaves):
            for chave, valor in mapa.items():
                if any(k in chave for k in chaves):
                    return valor
            return ""
        contrato = por_nome(("contrato", "matrícula", "matricula"))
        nome = por_nome(("aluno", "nome"))
        disciplina = por_nome(("disciplina", "módulo", "modulo", "curso"))
        status = por_nome(("status", "situação", "situacao")) or "agendada"
        if not contrato:
            for c in celulas:
                limpo = re.sub(r"[.\-\s]", "", c)
                if re.fullmatch(r"\d{4,}", limpo):
                    contrato = c
                    break
        if not nome:
            for c in celulas:
                if (len(c.split()) >= 2 and not re.search(r"\d{1,2}/\d{1,2}/\d{2,4}|\d{4}-\d{2}-\d{2}", c)
                    and not re.search(r"\b(?:[01]?\d|2[0-3]):[0-5]\d\b", c)
                    and not any(k in c.lower() for k in ("agendada", "realizada", "cancelada", "reposição", "reposicao"))):
                    nome = c
                    break
        if not nome:
            nome = celulas[0]
        if not disciplina:
            for c in celulas:
                if any(k in c.lower() for k in ("informática", "informatica", "módulo", "modulo", "disciplina")):
                    disciplina = c
                    break
        if not disciplina:
            disciplina = "Módulo Geral"
        chave = f"{unidade}|{contrato}|{nome}|{data}|{inicio}|{disciplina}".lower()
        rid = "cgd_rep_" + hashlib.sha256(chave.encode("utf-8")).hexdigest()[:32]
        registros.append({
            "id": rid, "aluno_id": None, "aluno_nome": nome, "contrato": contrato or None,
            "unidade": unidade, "data": data, "horario_inicio": inicio, "horario_fim": fim,
            "duracao_horas": 2, "disciplina": disciplina, "professor": "Ronaldo Vasconcelos",
            "status": status.lower(), "tipo": "laboratorio",
            "observacao": f"Sincronizado do CGD em {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}",
            "updated_at": datetime.now().isoformat(),
        })
    return registros


def _print_http_diagnostic(unidade, result):
    print(f"[{unidade}] TRANSPORTE HTTP: {'OK' if result.ok else 'FALHOU'}")
    print(f"[{unidade}] HTTP status: {result.status_code}")
    print(f"[{unidade}] URL final: {result.url}")
    if result.cloudflare:
        print(f"[{unidade}] Cloudflare detectado no transporte HTTP: {result.reason}")
    elif not result.ok:
        print(f"[{unidade}] Motivo HTTP: {result.reason}")


def processar_unidade(supabase, unidade):
    usuario, senha = unidade["usuario"], unidade["senha"]
    if not usuario or not senha:
        print(f"[{unidade['nome']}] credenciais ausentes; ignorada")
        return 0

    print(f"\n[{unidade['nome']}] === 1. SESSÃO HTTP PERSISTENTE ===")
    http_result = requests_login(usuario, senha)
    _print_http_diagnostic(unidade["nome"], http_result)

    if http_result.ok:
        print(f"[{unidade['nome']}] Sessão HTTP autenticada. Cookies mantidos em memória.")
        target = unidade["url"] or REPORT_URL
        try:
            response = http_result.session.get(target, timeout=45, allow_redirects=True)
            print(f"[{unidade['nome']}] GET alvo: {response.status_code} | {response.url}")
            if not response.ok:
                print(f"[{unidade['nome']}] GET alvo não retornou sucesso; usando navegador real com a sessão.")
            else:
                print(f"[{unidade['nome']}] Dados HTML recebidos via requests; iniciando navegador apenas para DOM dinâmico.")
        except Exception as exc:
            print(f"[{unidade['nome']}] Falha no GET HTTP do alvo: {exc}")

    print(f"[{unidade['nome']}] === 2. PLAYWRIGHT + CHROME REAL ===")
    pw = browser = context = page = None
    try:
        pw, browser, context, page = playwright_login(usuario, senha)
        if http_result.ok and http_result.session:
            try:
                transfer_cookies_to_context(context, http_result.session)
                page.goto(REPORT_URL, wait_until="domcontentloaded", timeout=60000)
            except Exception as exc:
                print(f"[{unidade['nome']}] Não foi possível reaproveitar a sessão HTTP no Chrome: {exc}")
        alvo = unidade["url"] or REPORT_URL
        if alvo and page.url != alvo:
            page.goto(alvo, wait_until="domcontentloaded", timeout=60000)
        try:
            page.wait_for_load_state("networkidle", timeout=30000)
        except Exception:
            pass
        page.wait_for_timeout(3000)
        for _ in range(4):
            if pagina_tem_dados(page):
                break
            page.wait_for_timeout(2000)
        reposicoes = extrair_reposicoes(page, unidade["nome"])
        if reposicoes:
            supabase.table("reposicoes_agendadas").upsert(reposicoes, on_conflict="id").execute()
        print(f"[{unidade['nome']}] {len(reposicoes)} reposições sincronizadas | URL: {page.url}")
        return len(reposicoes)
    except Exception as exc:
        print(f"[{unidade['nome']}] ERRO navegador real: {exc}")
        return 0
    finally:
        for obj in (context, browser):
            try:
                if obj: obj.close()
            except Exception:
                pass
        try:
            if pw: pw.stop()
        except Exception:
            pass


def main():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("=" * 80)
    print("INTEGRAÇÃO CGD — SESSÃO HTTP + CHROME REAL")
    print("PDF: DESATIVADO")
    print("Extensão: NÃO NECESSÁRIA")
    print(f"Rota de bootstrap: {REPORT_URL}")
    print("=" * 80)
    total = 0
    for unidade in UNIDADES:
        total += processar_unidade(supabase, unidade)
    print(f"\nTOTAL SINCRONIZADO: {total}")


if __name__ == "__main__":
    main()
