"""Entry point robusto para o sincronizador CGD.

Mantém o extrator existente e substitui somente a camada de autenticação.
O CGD atual expõe os campos por labels "E-mail" e "Senha"; em alguns
ambientes os atributos HTML podem variar. O adaptador tenta labels, tipos,
autocomplete, placeholders e, por último, frames.
"""

import os
import re
import time

from playwright.sync_api import sync_playwright

import sync_cgd_reposicoes as syncer


LOGIN_URL = os.getenv("CGD_LOGIN_URL", "https://app.cgd.com.br/login")


def _visible(locator):
    try:
        return locator.count() > 0 and locator.first.is_visible(timeout=1000)
    except Exception:
        return False


def _first_visible(page, selectors):
    for selector in selectors:
        try:
            loc = page.locator(selector).first
            if loc.is_visible(timeout=1000):
                return loc
        except Exception:
            continue
    return None


def _field_by_label(page, labels):
    for label in labels:
        try:
            loc = page.get_by_label(re.compile(label, re.I)).first
            if loc.is_visible(timeout=1500):
                return loc
        except Exception:
            continue
    return None


def _find_in_frames(page, labels, selectors):
    for frame in page.frames:
        if frame == page.main_frame:
            continue
        for label in labels:
            try:
                loc = frame.get_by_label(re.compile(label, re.I)).first
                if loc.is_visible(timeout=1000):
                    return loc
            except Exception:
                pass
        for selector in selectors:
            try:
                loc = frame.locator(selector).first
                if loc.is_visible(timeout=1000):
                    return loc
            except Exception:
                pass
    return None


def fazer_login_robusto(page, usuario, senha_valor):
    page.goto(LOGIN_URL, wait_until="domcontentloaded", timeout=60000)

    # O bundle React pode demorar para montar o formulário no runner.
    for _ in range(12):
        if _field_by_label(page, [r"e-mail", r"email"]):
            break
        if _first_visible(page, ['input[type="email"]', 'input[autocomplete="email"]']):
            break
        page.wait_for_timeout(1000)

    email = _field_by_label(page, [r"^e-mail$", r"^email$"])
    if not email:
        email = _first_visible(page, [
            'input[type="email"]',
            'input[name="email"]',
            'input[autocomplete="email"]',
            'input[placeholder*="e-mail" i]',
            'input[placeholder*="email" i]',
            'input[name*="user" i]',
            'input[name*="login" i]',
        ])
    if not email:
        email = _find_in_frames(
            page,
            [r"e-mail", r"email"],
            ['input[type="email"]', 'input[autocomplete="email"]'],
        )

    password = _field_by_label(page, [r"^senha$"])
    if not password:
        password = _first_visible(page, [
            'input[type="password"]',
            'input[name="password"]',
            'input[name="senha"]',
            'input[autocomplete="current-password"]',
            'input[placeholder*="senha" i]',
        ])
    if not password:
        password = _find_in_frames(
            page,
            [r"senha"],
            ['input[type="password"]', 'input[autocomplete="current-password"]'],
        )

    if not email or not password:
        body = " ".join(page.locator("body").inner_text(timeout=5000).split())[:500]
        inputs = page.locator("input").count()
        buttons = page.locator("button").count()
        raise RuntimeError(
            f"CGD: formulário de login não ficou disponível. URL={page.url} "
            f"inputs={inputs} buttons={buttons} body={body!r}"
        )

    email.fill(usuario)
    password.fill(senha_valor)

    button = _first_visible(page, [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Entrar")',
        'button:has-text("Acessar")',
        'button:has-text("Login")',
    ])
    if not button:
        try:
            button = page.get_by_role("button", name=re.compile(r"entrar|acessar|login", re.I)).first
            if not button.is_visible(timeout=1500):
                button = None
        except Exception:
            button = None
    if not button:
        raise RuntimeError(f"CGD: botão Entrar não encontrado em {page.url}.")

    button.click()
    try:
        page.wait_for_load_state("networkidle", timeout=60000)
    except Exception:
        pass
    page.wait_for_timeout(5000)

    body = " ".join(page.locator("body").inner_text(timeout=5000).split()).lower()
    if page.url.rstrip("/").endswith("/login") and any(
        phrase in body for phrase in ("senha incorreta", "usuário ou senha", "usuario ou senha", "acesso negado")
    ):
        raise RuntimeError("CGD: autenticação rejeitada.")


# O main() do módulo existente resolve fazer_login pelo nome global.
syncer.fazer_login = fazer_login_robusto

if __name__ == "__main__":
    syncer.main()
