import hashlib
import os
import re
from datetime import datetime
from urllib.parse import urljoin

from playwright.sync_api import sync_playwright
from supabase import create_client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
CGD_LOGIN_URL = os.getenv("CGD_LOGIN_URL", "https://app.cgd.com.br")

UNIDADES = [
    {
        "nome": "MATRIZ",
        "usuario": os.getenv("CGD_USER_MATRIZ"),
        "senha": os.getenv("CGD_PASS_MATRIZ"),
        "url": os.getenv("CGD_REPOSICOES_URL_MATRIZ") or os.getenv("CGD_MATRIZ_URL"),
    },
    {
        "nome": "FILIAL",
        "usuario": os.getenv("CGD_USER_FILIAL"),
        "senha": os.getenv("CGD_PASS_FILIAL"),
        "url": os.getenv("CGD_REPOSICOES_URL_FILIAL") or os.getenv("CGD_FILIAL_URL"),
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
            if loc.is_visible(timeout=1500):
                return loc
        except Exception:
            pass
    return None


def fazer_login(page, usuario, senha_valor):
    page.goto(CGD_LOGIN_URL, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(2500)

    login = encontrar_campo(
        page,
        [
            'input[type="email"]',
            'input[name*="user" i]',
            'input[name*="login" i]',
            'input[id*="user" i]',
            'input[id*="login" i]',
            'input[placeholder*="usu" i]',
            'input[placeholder*="login" i]',
        ],
    )
    campo_senha = encontrar_campo(
        page,
        [
            'input[type="password"]',
            'input[name*="senha" i]',
            'input[name*="pass" i]',
            'input[id*="senha" i]',
            'input[id*="pass" i]',
        ],
    )
    if not login or not campo_senha:
        raise RuntimeError("Campos de login do CGD não encontrados.")

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
        raise RuntimeError("Botão de login do CGD não encontrado.")

    botao.click()
    try:
        page.wait_for_load_state("networkidle", timeout=60000)
    except Exception:
        pass
    page.wait_for_timeout(3000)


def descobrir_pagina_reposicoes(page):
    """Localiza a tela de reposições usando texto, href e rotas já existentes no CGD."""
    palavras = (
        "reposição",
        "reposicao",
        "agendamento",
        "agendamentos",
        "recuperação",
        "recuperacao",
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

    # Fallback: alguns menus não expõem o href até a interação.
    rotas = (
        "/reposicoes",
        "/reposicao",
        "/agendamentos",
        "/agendamento",
        "/contratos/reposicoes",
        "/contratos/agendamentos",
    )
    for rota in rotas:
        try:
            candidato = urljoin(CGD_LOGIN_URL.rstrip("/") + "/", rota.lstrip("/"))
            response = page.request.get(candidato, timeout=10000)
            if response.ok:
                return candidato
        except Exception:
            pass

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
        return page.locator(
            "table tbody tr, table tr, [role='row'], .table-responsive tr, .MuiDataGrid-row"
        ).count() > 0
    except Exception:
        return False


def extrair_linhas(page):
    """Extrai linhas tanto de tabelas HTML quanto de grids comuns, sem depender de tbody."""
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

    # Fallback para grids que não usam <table>.
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
    linhas = extrair_linhas(page)

    for celulas, cabecalhos in linhas:
        bruto = " | ".join(celulas)
        if len(celulas) < 2:
            continue

        # Ignora cabeçalhos e linhas sem data. A data é o melhor marcador
        # porque continua presente mesmo quando o CGD muda a ordem das colunas.
        if not re.search(r"\d{1,2}/\d{1,2}/\d{2,4}|\d{4}-\d{2}-\d{2}", bruto):
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

        # Fallback posicional/semântico para páginas sem cabeçalhos acessíveis.
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

        registros.append(
            {
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
            }
        )

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
                if not alvo:
                    raise RuntimeError("Não foi possível determinar a página de reposições do CGD.")

                page.goto(alvo, wait_until="domcontentloaded", timeout=60000)
                try:
                    page.wait_for_load_state("networkidle", timeout=30000)
                except Exception:
                    pass
                page.wait_for_timeout(3000)

                # Algumas versões do CGD carregam a grade depois da navegação.
                for _ in range(3):
                    if pagina_tem_dados(page):
                        break
                    page.wait_for_timeout(2500)

                reposicoes = extrair_reposicoes(page, unidade["nome"])
                if reposicoes:
                    supabase.table("reposicoes_agendadas").upsert(
                        reposicoes, on_conflict="id"
                    ).execute()

                total += len(reposicoes)
                print(
                    f"[{unidade['nome']}] {len(reposicoes)} reposições sincronizadas | URL: {page.url}"
                )

            except Exception as exc:
                print(f"[{unidade['nome']}] ERRO: {exc}")
            finally:
                context.close()

        browser.close()

    print(f"TOTAL SINCRONIZADO: {total}")


if __name__ == "__main__":
    main()
