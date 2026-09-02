"""Acesso autorizado ao CGD sem PDF.

Estratégia de transporte, em ordem:
1) requests.Session: sessão HTTP persistente, cookies + CSRF;
2) Playwright usando Chrome instalado (navegador real) como fallback;
3) navegação conservadora: uma sessão por unidade, sem paralelismo, sem
   rotação de IP, sem alteração de fingerprint e sem tentativa de contornar
   desafios do Cloudflare.

O módulo nunca persiste credenciais. Cookies só permanecem em memória durante
uma execução, a menos que o chamador forneça explicitamente um storage_state.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from html.parser import HTMLParser
from typing import Dict, List, Optional, Tuple
from urllib.parse import urljoin, urlparse

import requests
from playwright.sync_api import Browser, BrowserContext, Page, sync_playwright

REPORT_URL = os.getenv(
    "CGD_REPORT_URL", "https://app.cgd.com.br/relatorios/alunos-professor"
)
LOGIN_URL = os.getenv("CGD_LOGIN_URL", "https://app.cgd.com.br/login")
TIMEOUT = int(os.getenv("CGD_HTTP_TIMEOUT", "45"))

USER_AGENT = os.getenv(
    "CGD_USER_AGENT",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
)


@dataclass
class AccessResult:
    ok: bool
    method: str
    url: str
    response_text: str = ""
    status_code: Optional[int] = None
    cloudflare: bool = False
    reason: str = ""
    session: Optional[requests.Session] = None


class FormParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.forms: List[dict] = []
        self.current: Optional[dict] = None

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, Optional[str]]]):
        a = {k.lower(): (v or "") for k, v in attrs}
        if tag.lower() == "form":
            self.current = {"attrs": a, "inputs": []}
            self.forms.append(self.current)
        elif tag.lower() == "input" and self.current is not None:
            self.current["inputs"].append(a)

    def handle_endtag(self, tag: str):
        if tag.lower() == "form":
            self.current = None


def is_cloudflare_block(text: str, status: Optional[int], headers: Optional[dict] = None) -> bool:
    sample = (text or "")[:20000].lower()
    hdr = " ".join(f"{k}:{v}" for k, v in (headers or {}).items()).lower()
    markers = (
        "attention required! | cloudflare",
        "sorry, you have been blocked",
        "you have been blocked",
        "cf-ray",
        "cloudflare",
        "ray id",
    )
    return status in (403, 429) or any(m in sample for m in markers) or (
        "cf-ray" in hdr and status in (401, 403, 429)
    )


def _input_score(inp: dict, kind: str) -> int:
    text = " ".join(inp.get(k, "") for k in ("name", "id", "placeholder", "autocomplete", "type")).lower()
    if kind == "user":
        score = 0
        if inp.get("type", "").lower() == "email": score += 10
        if any(x in text for x in ("email", "usuario", "usuário", "user", "login")): score += 5
        return score
    score = 0
    if inp.get("type", "").lower() == "password": score += 20
    if any(x in text for x in ("senha", "password", "pass")): score += 5
    return score


def _find_login_form(html: str) -> Optional[Tuple[str, str, dict]]:
    parser = FormParser()
    parser.feed(html)
    for form in parser.forms:
        inputs = form["inputs"]
        passwords = [x for x in inputs if _input_score(x, "pass") > 0]
        users = [x for x in inputs if _input_score(x, "user") > 0]
        if passwords and users:
            user = max(users, key=lambda x: _input_score(x, "user"))
            pwd = max(passwords, key=lambda x: _input_score(x, "pass"))
            action = form["attrs"].get("action") or LOGIN_URL
            return urljoin(LOGIN_URL, action), user.get("name") or user.get("id") or "email", {
                "user": user,
                "password": pwd,
                "inputs": inputs,
                "method": (form["attrs"].get("method") or "post").lower(),
            }
    return None


def _hidden_fields(inputs: List[dict]) -> Dict[str, str]:
    result: Dict[str, str] = {}
    for inp in inputs:
        name = inp.get("name") or inp.get("id")
        if not name:
            continue
        if inp.get("type", "").lower() in ("hidden", "submit"):
            result[name] = inp.get("value", "")
    return result


def requests_login(usuario: str, senha: str) -> AccessResult:
    session = requests.Session()
    session.headers.update({
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.7",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Upgrade-Insecure-Requests": "1",
    })

    # Primeiro acessamos a rota de relatório que já foi observada funcionando.
    # Isso permite que o CGD/Cloudflare entregue cookies de sessão antes do login.
    try:
        report = session.get(REPORT_URL, timeout=TIMEOUT, allow_redirects=True)
    except requests.RequestException as exc:
        return AccessResult(False, "requests", REPORT_URL, reason=f"falha HTTP: {exc}")

    if is_cloudflare_block(report.text, report.status_code, report.headers):
        return AccessResult(
            False, "requests", report.url, report.text, report.status_code,
            cloudflare=True, reason="Cloudflare bloqueou a sessão HTTP inicial.", session=session,
        )

    # Se já houver sessão válida, não precisamos fazer login novamente.
    if "/login" not in urlparse(report.url).path.lower() and not _find_login_form(report.text):
        return AccessResult(True, "requests", report.url, report.text, report.status_code, session=session)

    try:
        login_page = session.get(LOGIN_URL, timeout=TIMEOUT, allow_redirects=True)
    except requests.RequestException as exc:
        return AccessResult(False, "requests", LOGIN_URL, reason=f"falha HTTP no login: {exc}", session=session)

    if is_cloudflare_block(login_page.text, login_page.status_code, login_page.headers):
        return AccessResult(
            False, "requests", login_page.url, login_page.text, login_page.status_code,
            cloudflare=True, reason="Cloudflare bloqueou a página de login HTTP.", session=session,
        )

    parsed = _find_login_form(login_page.text)
    if not parsed:
        return AccessResult(False, "requests", login_page.url, login_page.text, login_page.status_code,
                            reason="formulário de login não identificado", session=session)

    action, user_name, form = parsed
    password_name = form["password"].get("name") or form["password"].get("id") or "password"
    payload = _hidden_fields(form["inputs"])
    payload[user_name] = usuario
    payload[password_name] = senha

    try:
        if form["method"] == "get":
            logged = session.get(action, params=payload, timeout=TIMEOUT, allow_redirects=True)
        else:
            logged = session.post(
                action, data=payload, timeout=TIMEOUT, allow_redirects=True,
                headers={"Referer": login_page.url, "Origin": f"{urlparse(login_page.url).scheme}://{urlparse(login_page.url).netloc}"},
            )
    except requests.RequestException as exc:
        return AccessResult(False, "requests", action, reason=f"falha no POST de autenticação: {exc}", session=session)

    if is_cloudflare_block(logged.text, logged.status_code, logged.headers):
        return AccessResult(False, "requests", logged.url, logged.text, logged.status_code,
                            cloudflare=True, reason="Cloudflare bloqueou após o login HTTP.", session=session)

    if "/login" in urlparse(logged.url).path.lower() and _find_login_form(logged.text):
        return AccessResult(False, "requests", logged.url, logged.text, logged.status_code,
                            reason="CGD não confirmou a sessão autenticada", session=session)

    return AccessResult(True, "requests", logged.url, logged.text, logged.status_code, session=session)


def transfer_cookies_to_context(context: BrowserContext, session: requests.Session) -> None:
    cookies = []
    for c in session.cookies:
        cookies.append({
            "name": c.name,
            "value": c.value,
            "domain": c.domain or ".cgd.com.br",
            "path": c.path or "/",
            "secure": bool(c.secure),
        })
    if cookies:
        context.add_cookies(cookies)


def playwright_login(usuario: str, senha: str, storage_state: Optional[str] = None):
    pw = sync_playwright().start()
    launch_kwargs = {"headless": True}
    # Chrome do runner/servidor é preferível ao Chromium empacotado quando disponível.
    try:
        browser = pw.chromium.launch(channel="chrome", **launch_kwargs)
    except Exception:
        browser = pw.chromium.launch(**launch_kwargs)

    context_kwargs = {"viewport": {"width": 1440, "height": 1000}}
    if storage_state and os.path.exists(storage_state):
        context_kwargs["storage_state"] = storage_state
    context = browser.new_context(**context_kwargs)
    page = context.new_page()

    # Rota de relatório primeiro; se houver sessão persistida, ela pode evitar novo login.
    page.goto(REPORT_URL, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(1500)
    body = page.locator("body").inner_text(timeout=5000).lower()
    if "you have been blocked" in body or "attention required" in body:
        context.close(); browser.close(); pw.stop()
        raise RuntimeError("Cloudflare bloqueou o Chrome na rota de relatório.")

    if "/login" in urlparse(page.url).path.lower() or page.locator('input[type="password"]').count() > 0:
        user = None
        for selector in (
            'input[type="email"]', 'input[name="email"]', 'input[autocomplete="email"]',
            'input[name*="user" i]', 'input[name*="login" i]', 'input[id*="user" i]',
            'input[id*="login" i]'
        ):
            loc = page.locator(selector).first
            try:
                if loc.is_visible(timeout=1000): user = loc; break
            except Exception: pass
        pwd = page.locator('input[type="password"]').first
        if not user or not pwd:
            context.close(); browser.close(); pw.stop()
            raise RuntimeError("Campos de login não encontrados no Chrome.")
        user.fill(usuario); pwd.fill(senha)
        submit = page.locator('button[type="submit"],input[type="submit"]').first
        if not submit:
            submit = page.get_by_role("button", name=re.compile("entrar|acessar|login", re.I)).first
        submit.click()
        try: page.wait_for_load_state("networkidle", timeout=45000)
        except Exception: pass
        page.wait_for_timeout(2500)

    body = page.locator("body").inner_text(timeout=5000).lower()
    if "you have been blocked" in body or "attention required" in body:
        context.close(); browser.close(); pw.stop()
        raise RuntimeError("Cloudflare bloqueou o Chrome após autenticação.")
    if "/login" in urlparse(page.url).path.lower():
        context.close(); browser.close(); pw.stop()
        raise RuntimeError("CGD não confirmou a autenticação pelo Chrome.")

    return pw, browser, context, page


def authenticate(usuario: str, senha: str, storage_state: Optional[str] = None) -> AccessResult:
    """Tenta HTTP primeiro e deixa o fallback Playwright disponível ao chamador."""
    result = requests_login(usuario, senha)
    if result.ok:
        return result
    return result
