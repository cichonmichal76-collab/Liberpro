from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

STANDARD_PAGES = [
    "index.html",
    "o-nas.html",
    "uslugi.html",
    "ksiegowosc.html",
    "kadry.html",
    "zakladanie-dzialalnosci.html",
    "zakladanie-spolki.html",
    "narzedzia.html",
    "kontakt.html",
    "blog.html",
    "blog-bledy-jpk-vat.html",
    "blog-cit-minimalny.html",
    "blog-dane-ksiegowe-ksef-jpk.html",
    "blog-jpk-cit-przygotowanie.html",
    "blog-kpir-pelna-ksiegowosc-obowiazek.html",
    "blog-ksef-checklista-wdrozenia.html",
    "blog-ksef-obowiazek-2026.html",
    "blog-ksef-podatnik-panstwo-2026.html",
    "blog-odbior-faktur-ksef.html",
    "blog-odbiór-faktur-ksef.html",
    "blog-ryczalt-kpir-porownanie-2026.html",
    "blog-systemowa-kontrola-danych.html",
    "blog-ulga-na-start-zus.html",
    "blog-zmiana-formy-opodatkowania.html",
    "blog-zmiany-zapisy-ksiegowe-jpk.html",
    "kalkulator-zus.html",
    "kalkulator-kasa-fiskalna.html",
    "polityka-prywatnosci.html",
]

HEADER_TEMPLATE = """<div class="topbar">
  <div class="topbar-i">
    <span class="topbar-left">Księgowość firm, kadry i zakładanie działalności – obsługa z całej Polski</span>
    <div class="topbar-extras"><span class="topbar-extra">Zakładanie JDG</span><span class="topbar-extra">Zakładanie spółek</span></div>
    <div class="topbar-right">
      <a href="#" data-email><svg class="ti" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg><span class="email-text">kontakt(at)liberpro.pl</span></a>
      <a href="tel:+48517765128"><svg class="ti" viewBox="0 0 24 24"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>+48 517-765-128</a>
    </div>
  </div>
</div>

<nav id="nav">
  <div class="nav-i">
    <a href="/" class="logo"><img src="logo.png" alt="Liber Pro Księgowość" height="48" width="auto"></a>
    <ul class="nav-links">
      <li><a href="o-nas.html">O nas</a></li>
      <li class="has-sub">
        <a href="uslugi.html">Usługi</a>
        <div class="sub-menu"><div class="sub-menu-inner">
          <a href="ksiegowosc.html">Księgowość</a>
          <a href="kadry.html">Kadry i Płace</a>
          <a href="zakladanie-dzialalnosci.html">Zakładanie działalności</a>
          <a href="zakladanie-spolki.html">Zakładanie spółki</a>
        </div></div>
      </li>
      <li><a href="/#specjalizacje">Specjalizacje</a></li>
      <li><a href="narzedzia.html">Narzędzia</a></li>
      <li><a href="/#dlaczego-my">Dlaczego my</a></li>
      <li><a href="blog.html">Blog</a></li>
    </ul>
    <a href="kontakt.html" class="btn-cta">Kontakt</a>
    <button class="hamburger" onclick="openMenu()" aria-label="Otwórz menu" aria-expanded="false" type="button"><span></span><span></span><span></span></button>
  </div>
</nav>

<div class="mob-menu" id="mobMenu">
  <button class="mob-close" onclick="closeMenu()">✕</button>
  <a href="/" onclick="closeMenu()">Strona główna</a>
  <a href="o-nas.html" onclick="closeMenu()">O nas</a>
  <a href="uslugi.html" onclick="closeMenu()">Usługi</a>
  <a href="/#specjalizacje" onclick="closeMenu()">Specjalizacje</a>
  <a href="narzedzia.html" onclick="closeMenu()">Narzędzia</a>
  <a href="/#dlaczego-my" onclick="closeMenu()">Dlaczego my</a>
  <a href="blog.html" onclick="closeMenu()">Blog</a>
  <a href="kontakt.html" onclick="closeMenu()">Kontakt</a>
</div>
"""

FOOTER_TEMPLATE = """<footer>
  <div class="footer-grid">
    <div>
      <img src="logo.png" alt="Liber Pro Księgowość" style="height:44px;width:auto;filter:brightness(0) invert(1);opacity:.85">
      <p class="f-tagline">Twoje finanse w dobrych rękach.<br>Razem budujemy Twój sukces.</p>
      <div class="footer-badges">
        <span>Zdalnie i stacjonarnie</span>
        <span>Obsługa z całej Polski</span>
      </div>
    </div>
    <div class="f-col">
      <h4>Na skróty</h4>
      <ul class="f-links">
        <li><a href="/">Strona główna</a></li>
        <li><a href="o-nas.html">O nas</a></li>
        <li><a href="uslugi.html">Usługi</a></li>
        <li><a href="/#specjalizacje">Specjalizacje</a></li>
        <li><a href="blog.html">Blog</a></li>
        <li><a href="kontakt.html">Kontakt</a></li>
      </ul>
    </div>
    <div class="f-col">
      <h4>Usługi</h4>
      <ul class="f-links">
        <li><a href="ksiegowosc.html">Księgowość</a></li>
        <li><a href="kadry.html">Kadry i Płace</a></li>
        <li><a href="zakladanie-dzialalnosci.html">Zakładanie działalności</a></li>
        <li><a href="zakladanie-spolki.html">Zakładanie spółki</a></li>
      </ul>
    </div>
    <div class="f-col">
      <h4>Kontakt</h4>
      <div class="f-ci"><svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg><span>Piekary koło Krakowa</span></div>
      <div class="f-ci"><svg viewBox="0 0 24 24"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg><a href="tel:+48517765128">+48 517-765-128</a></div>
      <div class="f-ci"><svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg><a href="#" data-email><span class="email-text">kontakt(at)liberpro.pl</span></a></div>
      <div class="f-ci"><svg viewBox="0 0 24 24"><path d="M12 4a8 8 0 1 0 8 8 8.009 8.009 0 0 0-8-8zm.75 8.43 3.61 2.08-.75 1.3L11.25 13.3V7h1.5z"/></svg><span>Pon.–Pt.: 8:00–16:00</span></div>
    </div>
  </div>
  <div class="footer-bottom">
    <span>© 2026 Liber Pro Księgowość. Wszelkie prawa zastrzeżone.</span>
    <span>liberpro.pl</span>
    <span><a href="polityka-prywatnosci.html" style="color:inherit;text-decoration:none;opacity:.7">Polityka prywatności</a></span>
  </div>
</footer>
"""


def replace_between(text: str, start_marker: str, end_marker: str, replacement: str) -> str:
    start = text.index(start_marker)
    end = text.index(end_marker, start)
    return text[:start] + replacement + text[end:]


def sync_page(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    original = text

    if '<div class="topbar">' in text and '<main id="content">' in text:
        text = replace_between(
            text,
            '<div class="topbar">',
            '<main id="content">',
            HEADER_TEMPLATE + "\n\n",
        )

    while text.count('<div class="mob-menu" id="mobMenu">') > 1:
        start = text.rindex('<div class="mob-menu" id="mobMenu">')
        end = text.index("</div>", start) + len("</div>")
        text = text[:start] + text[end:]

    if "<footer" in text and "</footer>" in text:
        footer_start = text.index("<footer")
        footer_end = text.index("</footer>", footer_start) + len("</footer>")
        text = text[:footer_start] + FOOTER_TEMPLATE + text[footer_end:]

    if text != original:
        path.write_text(text, encoding="utf-8", newline="\n")
        return True
    return False


def main() -> None:
    updated = []
    for rel_path in STANDARD_PAGES:
        path = ROOT / rel_path
        if sync_page(path):
            updated.append(rel_path)
    print(f"updated={len(updated)}")
    for name in updated:
        print(name)


if __name__ == "__main__":
    main()
