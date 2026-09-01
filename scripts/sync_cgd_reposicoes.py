import hashlib
import os
import re
from datetime import datetime
from urllib.parse import urljoin

from playwright.sync_api import sync_playwright
from supabase import create_client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
# O CGD usa a tela de autenticação /login. Mantemos override por ambiente.
CGD_LOGIN_URL = os.getenv("CGD_LOGIN_URL", "https://app.cgd.com.br/login")


def env_first(*names):
    for name in names:
        value = os.getenv(name)
        if value:
            return value
    return None


UNIDADES = [
    {
        "nome": "MATRIZ",
        "usuario": env_first("CGD_USER_MATRIZ", "CGD_MATRIZ_USERNAME", "CGD_USERNAME"),
        "senha": env_first("CGD_PASS_MATRIZ", "CGD_MATRIZ_PASSWORD", "CGD_PASSWORD"),
        "url": env_first("CGD_REPOSICOES_URL_MATRIZ", "CGD_MATRIZ_URL", "CGD_BASE_URL"),
    },
    {
        "nome": "FILIAL",
        "usuario": env_first("CGD_USER_FILIAL", "CGD_FILIAL_USERNAME", "CGD_USERNAME"),
        "senha": env_first("CGD_PASS_FILIAL", "CGD_FILIAL_PASSWORD", "CGD_PASSWORD"),
        "url": env_first("CGD_REPOSICOES_URL_FILIAL", "CGD_FILIAL_URL", "CGD_BASE_URL"),
    },
]


def texto(locator):
    try:
        return " ".join(locator.inner_text().split()).strip()
    except Exception:
        return ""


def encontrar_campo(page, candidatos):
    for seletor in candidatos:
        try:
            loc = page.locator(seletor).first
            if loc.is_visible(timeout=2000):
                return loc
        except Exception:
            pass
    return None


def fazer_login(page, usuario, senha_valor):
    page.goto(CGD_LOGIN_URL, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(2500)

    # A página pública do CGD apresenta explicitamente E-mail, Senha e Entrar.
    login = encontrar_campo(
        page,
        [
            'input[type="email"]',
            'input[name="email"]',
            'input[autocomplete="email"]',
            'input[placeholder*="e-mail" i]',
            'input[placeholder*="email" i]',
            'input[name*="user" i]',
            'input[name*="login" i]',
            'input[id*="user" i]',
            'input[id*="login" i]',
        ],
    )
    campo_senha = encontrar_campo(
        page,
        [
            'input[type="password"]',
            'input[name="password"]',
            'input[name="senha"]',
            'input[autocomplete="current-password"]',
            'input[placeholder*="senha" i]',
        ],
    )

    if not login or not campo_senha:
        raise RuntimeError(
            f"Campos de login do CGD não encontrados em {page.url}. "
            f"inputs={page.locator('input').count()} buttons={page.locator('button').count()}"
        )

    login.fill(usuario)
    campo_senha.fill(senha_valor)

    botao = encontrar_campo(
        page,
        [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("Entrar")',
            'button:has-text("Acessar")',
            'button:has-text("Login")',
        ],
    )
    if not botao:
        raise RuntimeError(f"Botão de login do CGD não encontrado em {page.url}.")

    botao.click()
    try:
        page.wait_for_load_state("networkidle", timeout=60000)
    except Exception:
        pass
    page.wait_for_timeout(4000)

    # Se o CGD rejeitar a autenticação, falha explicitamente em vez de tentar
    # extrair dados da própria tela de login.
    if page.locator('input[type="password"]').count() > 0 and page.url.rstrip("/").endswith("/login"):
        body = texto(page.locator("body")).lower()
        if any(k in body for k in ("senha incorreta", "usuário ou senha", "usuario ou senha", "acesso negado")):
            raise RuntimeError("Autenticação no CGD rejeitada.")


def descobrir_pagina_reposicoes(page):
    palavras = (
        "reposição", "reposicao", "agendamento", "agendamentos",
        "recuperação", "recuperacao",
    )

    elementos = page.locator("a,button,[role='menuitem'],[role='button']")
    for i in range(min(elementos.count(), 2000)):
        try:
            el = elementos.nth(i)
            if not el.is_visible(timeout=500):
                continue
            txt = texto(el).lower()
            href = (el.get_attribute("href") or "").strip()
            alvo = f"{txt} {href.lower()}"
            if not any(palavra in alvo for palavra in palavras):
                continue
            if href and not href.startswith("#") and not href.lower().startswith("javascript:"):
                return urljoin(page.url, href)
            try:
                el.click()
                page.wait_for_timeout(2500)
                return page.url
            except Exception:
                pass
        except Exception:
            pass

    # Não inventa uma rota como se fosse confirmada. Se não encontrou o menu,
    # retorna a página autenticada e o extrator trabalha com ela.
    return page.url


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
            celulas = [texto(row.locator("[role='gridcell'],[role='cell'],td").nth(i)) for i in range(row.locator("[role='gridcell'],[role='cell'],td").count())]
            celulas = [c for c in celulas if c]
            if celulas:
                linhas.append((celulas, []))
    return linhas


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
                if (
                    len(c.split()) >= 2
                    and not re.search(r"\d{1,2}/\d{1,2}/\d{2,4}|\d{4}-\d{2}-\d{2}", c)
                    and not re.search(r"\b(?:[01]?\d|2[0-3]):[0-5]\d\b", c)
                    and not any(k in c.lower() for k in ("agendada", "realizada", "cancelada", "reposição", "reposicao"))
                ):
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
            "id": rid,
            "aluno_id": None,
            "aluno_nome": nome,
            "contrato": contrato or None,
            "unidade": unidade,
            "data": data,
            "horario_inicio": inicio,
            "horario_fim": fim,
            "duracao_horas": 2,
            "disciplina": disciplina,
            "professor": "Ronaldo Vasconcelos",
            "status": status.lower(),
            "tipo": "laboratorio",
            "observacao": f"Sincronizado do CGD em {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}",
            "updated_at": datetime.now().isoformat(),
        })
    return registros


def main():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    total = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for unidade in UNIDADES:
            if not unidade["usuario"] or not unidade["senha"]:
                print(f"[{unidade['nome']}] credenciais ausentes; ignorada")
                continue
            context = browser.new_context(viewport={"width": 1440, "height": 1000})
            page = context.new_page()
            try:
                fazer_login(page, unidade["usuario"], unidade["senha"])
                alvo = unidade["url"] or descobrir_pagina_reposicoes(page)
                if alvo and alvo != page.url:
                    page.goto(alvo, wait_until="domcontentloaded", timeout=60000)
                try:
                    page.wait_for_load_state("networkidle", timeout=30000)
                except Exception:
                    pass
                page.wait_for_timeout(4000)
                for _ in range(4):
                    if pagina_tem_dados(page):
                        break
                    page.wait_for_timeout(2500)

                reposicoes = extrair_reposicoes(page, unidade["nome"])
                if reposicoes:
                    supabase.table("reposicoes_agendadas").upsert(reposicoes, on_conflict="id").execute()
                total += len(reposicoes)
                print(f"[{unidade['nome']}] {len(reposicoes)} reposições sincronizadas | URL: {page.url}")
            except Exception as exc:
                print(f"[{unidade['nome']}] ERRO: {exc}")
            finally:
                context.close()
        browser.close()
    print(f"TOTAL SINCRONIZADO: {total}")


if __name__ == "__main__":
    main()
