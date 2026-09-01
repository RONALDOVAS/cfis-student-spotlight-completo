import hashlib
import os
import re
from datetime import datetime

from playwright.sync_api import sync_playwright
from supabase import create_client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
CGD_LOGIN_URL = os.getenv("CGD_LOGIN_URL", "https://app.cgd.com.br")

UNIDADES = [
    {"nome": "MATRIZ", "usuario": os.getenv("CGD_USER_MATRIZ"), "senha": os.getenv("CGD_PASS_MATRIZ"), "url": os.getenv("CGD_REPOSICOES_URL_MATRIZ") or os.getenv("CGD_MATRIZ_URL")},
    {"nome": "FILIAL", "usuario": os.getenv("CGD_USER_FILIAL"), "senha": os.getenv("CGD_PASS_FILIAL"), "url": os.getenv("CGD_REPOSICOES_URL_FILIAL") or os.getenv("CGD_FILIAL_URL")},
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
    page.wait_for_timeout(3000)
    login = encontrar_campo(page, ['input[type="email"]', 'input[name*="user" i]', 'input[name*="login" i]', 'input[id*="user" i]', 'input[id*="login" i]', 'input[placeholder*="usu" i]', 'input[placeholder*="login" i]'])
    campo_senha = encontrar_campo(page, ['input[type="password"]', 'input[name*="senha" i]', 'input[name*="pass" i]', 'input[id*="senha" i]', 'input[id*="pass" i]'])
    if not login or not campo_senha:
        raise RuntimeError("Campos de login do CGD não encontrados.")
    login.fill(usuario)
    campo_senha.fill(senha_valor)
    botao = encontrar_campo(page, ['button[type="submit"]', 'input[type="submit"]', 'button:has-text("Entrar")', 'button:has-text("Acessar")', 'button:has-text("Login")'])
    if not botao:
        raise RuntimeError("Botão de login do CGD não encontrado.")
    botao.click()
    try:
        page.wait_for_load_state("networkidle", timeout=60000)
    except Exception:
        pass
    page.wait_for_timeout(3000)


def descobrir_pagina_reposicoes(page):
    candidatos = page.locator("a,button,[role='menuitem'],[role='button']")
    for i in range(min(candidatos.count(), 1500)):
        try:
            el = candidatos.nth(i)
            if not el.is_visible(timeout=500):
                continue
            txt = texto(el).lower()
            href = (el.get_attribute("href") or "").lower()
            alvo = f"{txt} {href}"
            if any(k in alvo for k in ["reposição", "reposicao", "agendamento", "recuperação", "recuperacao"]):
                if href.startswith("http"):
                    return href
                if href.startswith("/"):
                    return CGD_LOGIN_URL.rstrip("/") + href
                try:
                    el.click(); page.wait_for_timeout(2500); return page.url
                except Exception:
                    pass
        except Exception:
            pass
    return page.url


def normalizar_data(valor):
    m = re.search(r"(\d{1,2}/\d{1,2}/\d{2,4})", valor.strip())
    if m:
        bruto = m.group(1)
        for fmt in ("%d/%m/%Y", "%d/%m/%y"):
            try: return datetime.strptime(bruto, fmt).strftime("%d/%m/%Y")
            except ValueError: pass
    m = re.search(r"(\d{4}-\d{2}-\d{2})", valor)
    if m: return datetime.strptime(m.group(1), "%Y-%m-%d").strftime("%d/%m/%Y")
    return valor.strip()


def normalizar_horario(valor, padrao="16:00"):
    m = re.search(r"\b([01]?\d|2[0-3]):([0-5]\d)\b", valor)
    return f"{int(m.group(1)):02d}:{m.group(2)}" if m else padrao


def extrair_reposicoes(page, unidade):
    registros = []
    tabelas = page.locator("table")
    for ti in range(tabelas.count()):
        tabela = tabelas.nth(ti); linhas = tabela.locator("tbody tr")
        for ri in range(linhas.count()):
            row = linhas.nth(ri); td = row.locator("td")
            celulas = [texto(td.nth(ci)) for ci in range(td.count())]
            bruto = " | ".join(celulas)
            if len(celulas) < 2 or not re.search(r"\d{1,2}/\d{1,2}/\d{2,4}|\d{4}-\d{2}-\d{2}", bruto): continue
            data = normalizar_data(bruto); horarios = re.findall(r"\b(?:[01]?\d|2[0-3]):[0-5]\d\b", bruto)
            inicio = horarios[0] if horarios else normalizar_horario(bruto); fim = horarios[1] if len(horarios) > 1 else "18:00"
            contrato = ""; nome = ""
            for c in celulas:
                limpo = c.replace(".", "").replace("-", "")
                if not contrato and re.fullmatch(r"\d{4,}", limpo): contrato = c
                if not nome and len(c.split()) >= 2 and not re.search(r"\d{1,2}/\d{1,2}/\d{2,4}", c) and not any(k in c.lower() for k in ["agendada", "realizada", "cancelada", "reposição", "reposicao"]): nome = c
            if not nome: nome = celulas[0]
            disciplina = "Módulo Geral"
            for c in celulas:
                if any(k in c.lower() for k in ["informática", "informatica", "módulo", "modulo", "disciplina"]): disciplina = c; break
            chave = f"{unidade}|{contrato}|{nome}|{data}|{inicio}|{disciplina}".lower()
            rid = "cgd_rep_" + hashlib.sha256(chave.encode("utf-8")).hexdigest()[:32]
            registros.append({"id": rid, "aluno_id": None, "aluno_nome": nome, "contrato": contrato or None, "unidade": unidade, "data": data, "horario_inicio": inicio, "horario_fim": fim, "duracao_horas": 2, "disciplina": disciplina, "professor": "Ronaldo Vasconcelos", "status": "agendada", "tipo": "laboratorio", "observacao": f"Sincronizado do CGD em {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}", "updated_at": datetime.now().isoformat()})
    return registros


def main():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY); total = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for unidade in UNIDADES:
            if not unidade["usuario"] or not unidade["senha"]: print(f"[{unidade['nome']}] credenciais ausentes; ignorada"); continue
            context = browser.new_context(viewport={"width": 1440, "height": 1000}); page = context.new_page()
            try:
                fazer_login(page, unidade["usuario"], unidade["senha"])
                alvo = unidade["url"] or descobrir_pagina_reposicoes(page)
                if alvo: page.goto(alvo, wait_until="domcontentloaded", timeout=60000); page.wait_for_timeout(3000)
                reposicoes = extrair_reposicoes(page, unidade["nome"])
                if reposicoes: supabase.table("reposicoes_agendadas").upsert(reposicoes, on_conflict="id").execute()
                total += len(reposicoes); print(f"[{unidade['nome']}] {len(reposicoes)} reposições sincronizadas")
            except Exception as exc: print(f"[{unidade['nome']}] ERRO: {exc}")
            finally: context.close()
        browser.close()
    print(f"TOTAL SINCRONIZADO: {total}")


if __name__ == "__main__": main()
