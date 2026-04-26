from __future__ import annotations

import ast
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

from lxml import etree, html


ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT / "en"
CACHE_PATH = Path(__file__).resolve().parent / "translation-cache-en.json"
BASE_URL = "https://www.liberpro.pl"

HTML_FILES = sorted(ROOT.glob("*.html"))
HTML_NAMES = {path.name for path in HTML_FILES}
NON_INDEXABLE = {"404.html", "widget-kalkulator-vat.html"}
NON_CANONICAL_SITEMAP = {"blog-odbior-faktur-ksef.html"}
SITEMAP_PRIORITY = {
    "index.html": "1.0",
    "o-nas.html": "0.8",
    "uslugi.html": "0.9",
    "ksiegowosc.html": "0.9",
    "kadry.html": "0.9",
    "zakladanie-dzialalnosci.html": "0.8",
    "zakladanie-spolki.html": "0.8",
    "narzedzia.html": "0.7",
    "kontakt.html": "0.7",
    "blog.html": "0.8",
    "polityka-prywatnosci.html": "0.3",
}

TRANSLATABLE_META_NAMES = {"description", "twitter:title", "twitter:description"}
TRANSLATABLE_META_PROPERTIES = {"og:title", "og:description", "og:site_name"}
TRANSLATABLE_ITEMPROPS = {"name", "description", "headline"}
TRANSLATABLE_JSON_KEYS = {
    "name",
    "description",
    "headline",
    "articleBody",
    "articleSection",
    "keywords",
    "about",
    "text",
    "caption",
    "serviceType",
    "alternateName",
    "availableLanguage",
    "contactType",
}
DO_NOT_TRANSLATE_EXACT = {
    "PL",
    "EN",
    "VAT",
    "PIT",
    "CIT",
    "JPK",
    "KSeF",
    "ZUS",
    "KPiR",
    "CEIDG",
    "NIP",
    "REGON",
    "PKD",
    "PFRON",
    "PPK",
    "NGO",
    "PDF",
    "S24",
    "SaaS",
    "B2B",
    "JDG",
    "CSP",
    "GA4",
    "OC",
}
TEXT_OVERRIDES = {
    "O nas": "About us",
    "Usługi": "Services",
    "Specjalizacje": "Industries",
    "Dlaczego my": "Why us",
    "Narzędzia": "Tools",
    "Blog": "Blog",
    "Kontakt": "Contact",
    "Strona główna": "Home",
    "Polityka prywatności": "Privacy policy",
    "Księgowość": "Accounting",
    "Kadry i Płace": "HR and Payroll",
    "Zakładanie działalności": "Business registration",
    "Zakładanie spółki": "Company registration",
    "Czytaj artykuł →": "Read article →",
    "Wyślij wiadomość →": "Send message →",
    "Rozmowa wstępna": "Initial consultation",
    "Zakładanie JDG": "Sole proprietorship setup",
    "Zakładanie spółek": "Company registration",
    "Piekary koło Krakowa": "Piekary near Krakow",
    "zł": "PLN",
    "Wybierz usługę": "Choose a service",
    "Inne": "Other",
    "Imię i nazwisko": "Full name",
    "Firma": "Company",
    "Telefon": "Phone",
    "E-mail": "Email",
    "Wiadomość": "Message",
    "Najczęściej wybierane": "Most often chosen",
    "Cała Polska": "All of Poland",
    "Obsługa stacjonarna i zdalna": "On-site and remote service",
    "Zdalnie i stacjonarnie": "Remote and on-site",
    "Pierwsza rozmowa wstępna bezpłatna": "The first consultation is free",
    "Pierwsza rozmowa wstępna jest bezpłatna.": "The first consultation is free.",
    "Pon.–Pt.: 8:00–16:00": "Mon–Fri: 8:00–16:00",
    "Pon.-Pt.: 8:00–16:00": "Mon–Fri: 8:00–16:00",
    "Wyślij": "Send",
    "Kopiuj": "Copy",
}
BLOG_FILTER_KEYS = {
    "Wszystkie": "all",
    "Najnowsze": "newest",
    "Podatki": "taxes",
    "Księgowość": "accounting",
    "KSeF": "ksef",
    "JPK": "jpk",
    "ZUS": "zus",
}
BLOG_CATEGORY_KEYS = {
    "Podatki": "taxes",
    "Księgowość": "accounting",
    "KSeF": "ksef",
    "JPK": "jpk",
    "ZUS": "zus",
}
PAGE_HTML_FIXUPS = {
    "index.html": [
        ("//section[contains(concat(' ', normalize-space(@class), ' '), ' hero ')]//h1[1]", "Your company's finances in good <em>hands</em>"),
        ("//*[contains(concat(' ', normalize-space(@class), ' '), ' hero-sub ')][1]", "We provide accounting, HR and payroll, and support with business registration. You get organised document flow, timely settlements and direct contact with one advisor."),
        ("//*[contains(concat(' ', normalize-space(@class), ' '), ' hero-tag ')][1]", "<div class=\"hero-dot\"></div>Accounting office &middot; all of Poland"),
    ],
    "uslugi.html": [
        ("//div[contains(concat(' ', normalize-space(@class), ' '), ' page-hero ')]//h1[1]", "Our <em>services</em>"),
        ("//*[contains(concat(' ', normalize-space(@class), ' '), ' page-hero-desc ')][1]", "We handle accounting, HR and payroll, as well as business and company registration. One structured service, one point of contact and a clearly defined scope."),
    ],
    "ksiegowosc.html": [
        ("//div[contains(concat(' ', normalize-space(@class), ' '), ' page-hero ')]//h1[1]", "Accounting services <em>tailored to your company</em>"),
        ("//*[contains(concat(' ', normalize-space(@class), ' '), ' page-hero-desc ')][1]", "We provide accounting for companies and sole proprietors with organised document flow, timely compliance and ongoing access to financial data."),
    ],
    "kadry.html": [
        ("//div[contains(concat(' ', normalize-space(@class), ' '), ' page-hero ')]//h1[1]", "HR and payroll tailored <em>to your business</em>"),
    ],
    "zakladanie-dzialalnosci.html": [
        ("//div[contains(concat(' ', normalize-space(@class), ' '), ' page-hero ')]//h1[1]", "Planning to start <em>a business</em>?"),
        ("//*[contains(concat(' ', normalize-space(@class), ' '), ' page-hero-desc ')][1]", "We handle the formalities for starting a business: CEIDG, NIP, REGON, ZUS, VAT and the setup needed for day-one accounting support."),
    ],
    "zakladanie-spolki.html": [
        ("//div[contains(concat(' ', normalize-space(@class), ' '), ' page-hero ')]//h1[1]", "Planning to start <em>a company</em>?"),
        ("//*[contains(concat(' ', normalize-space(@class), ' '), ' page-hero-desc ')][1]", "We handle company registration formalities &mdash; from preparing the documents, through National Court Register filing, to launching full accounting support."),
    ],
    "narzedzia.html": [
        ("//div[contains(concat(' ', normalize-space(@class), ' '), ' page-hero ')]//h1[1]", "Tools we <em>trust</em>"),
        ("//*[contains(concat(' ', normalize-space(@class), ' '), ' page-hero-desc ')][1]", "We work with reliable software. Every client gets access to a dedicated workspace for document sharing and KSeF workflows."),
    ],
    "blog.html": [
        ("//div[contains(concat(' ', normalize-space(@class), ' '), ' page-hero ')]//h1[1]", "Accounting <em>blog</em>"),
    ],
    "polityka-prywatnosci.html": [
        ("//div[contains(concat(' ', normalize-space(@class), ' '), ' page-hero ')]//h1[1]", "Privacy <em>policy</em>"),
        ("//*[contains(concat(' ', normalize-space(@class), ' '), ' page-hero-desc ')][1]", "Information on personal data processing and the use of cookies on liberpro.pl."),
    ],
    "kalkulator-zus.html": [
        ("//div[contains(concat(' ', normalize-space(@class), ' '), ' page-hero ')]//h1[1]", "2026 ZUS contribution <em>calculator</em>"),
    ],
    "kalkulator-kasa-fiskalna.html": [
        ("//div[contains(concat(' ', normalize-space(@class), ' '), ' page-hero ')]//h1[1]", "Cash register <em>calculator</em>"),
    ],
    "kalkulatory.html": [
        ("//div[contains(concat(' ', normalize-space(@class), ' '), ' page-hero ')]//h1[1]", "2026 tax <em>calculators</em>"),
    ],
}
PL_MONTHS = {
    "stycznia": 1,
    "lutego": 2,
    "marca": 3,
    "kwietnia": 4,
    "maja": 5,
    "czerwca": 6,
    "lipca": 7,
    "sierpnia": 8,
    "września": 9,
    "października": 10,
    "listopada": 11,
    "grudnia": 12,
}
SKIP_TRANSLATE_TAGS = {"script", "style", "svg", "path", "noscript"}
JS_HANDLER_ATTRIBUTES = {"onclick", "onchange", "oninput", "onkeyup", "onkeydown", "onload"}


class Translator:
    def __init__(self, cache_path: Path) -> None:
        self.cache_path = cache_path
        self.cache = {}
        if cache_path.exists():
            self.cache = json.loads(cache_path.read_text(encoding="utf-8"))

    def save(self) -> None:
        self.cache_path.write_text(
            json.dumps(self.cache, ensure_ascii=False, indent=2, sort_keys=True),
            encoding="utf-8",
        )

    def translate_many(self, texts: list[str]) -> None:
        batch = []
        for text in texts:
            if text and text not in self.cache:
                batch.append(text)
        if not batch:
            return

        chunk_size = 30
        for start in range(0, len(batch), chunk_size):
            chunk = batch[start:start + chunk_size]
            sentinel = "\n[[[[SEP]]]]\n"
            params = [
                ("client", "gtx"),
                ("sl", "pl"),
                ("tl", "en"),
                ("dt", "t"),
                ("q", sentinel.join(chunk)),
            ]
            url = "https://translate.googleapis.com/translate_a/single?" + urllib.parse.urlencode(params)
            with urllib.request.urlopen(url, timeout=20) as response:
                payload = json.loads(response.read().decode("utf-8"))
            translated_text = "".join(part[0] for part in payload[0]).strip()
            translated_items = translated_text.split(sentinel)
            if len(translated_items) != len(chunk):
                translated_items = []
                for item in chunk:
                    single_params = [
                        ("client", "gtx"),
                        ("sl", "pl"),
                        ("tl", "en"),
                        ("dt", "t"),
                        ("q", item),
                    ]
                    single_url = "https://translate.googleapis.com/translate_a/single?" + urllib.parse.urlencode(single_params)
                    with urllib.request.urlopen(single_url, timeout=20) as single_response:
                        single_payload = json.loads(single_response.read().decode("utf-8"))
                    translated_items.append("".join(part[0] for part in single_payload[0]).strip())
            for source, target in zip(chunk, translated_items):
                self.cache[source] = normalize_translation(source, target)

    def get(self, text: str) -> str:
        return self.cache.get(text, text)


def normalize_translation(source: str, translated: str) -> str:
    cleaned = translated.strip()
    if not cleaned:
        return source
    exact = TEXT_OVERRIDES.get(source.strip())
    if exact:
        return exact
    replacements = {
        "Bookkeeping": "Accounting",
        "Accounting and Payroll": "HR and Payroll",
        "Personnel and Payroll": "HR and Payroll",
        "Start a business": "Business registration",
        "Start a company": "Company registration",
        "Accounting Office": "Accounting",
        "Accounting office": "Accounting",
        "tax card": "lump-sum tax card",
        "zloty": "PLN",
    }
    for old, new in replacements.items():
        cleaned = cleaned.replace(old, new)
    return cleaned


def strip_with_padding(text: str) -> tuple[str, str, str]:
    leading_match = re.match(r"^\s*", text)
    trailing_match = re.search(r"\s*$", text)
    leading = leading_match.group(0) if leading_match else ""
    trailing = trailing_match.group(0) if trailing_match else ""
    core = text[len(leading):len(text) - len(trailing) if trailing else len(text)]
    return leading, core, trailing


def looks_like_url(text: str) -> bool:
    return bool(re.match(r"^(https?:)?//", text)) or "@" in text and " " not in text and "." in text


def should_translate_text(text: str) -> bool:
    stripped = text.strip()
    if not stripped:
        return False
    if stripped in DO_NOT_TRANSLATE_EXACT:
        return False
    if stripped in TEXT_OVERRIDES:
        return True
    if looks_like_url(stripped):
        return False
    if re.fullmatch(r"[\d\s.,:+/()%#-]+", stripped):
        return False
    if re.fullmatch(r"[A-Z0-9+./-]{2,12}", stripped):
        return False
    if re.fullmatch(r"[a-z0-9_#./:-]{1,32}", stripped):
        return False
    return bool(re.search(r"[A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż]", stripped))


def collect_node_texts(doc: html.HtmlElement) -> list[str]:
    texts: list[str] = []
    for element in doc.iter():
        if isinstance(element.tag, str) and element.tag.lower() in SKIP_TRANSLATE_TAGS:
            continue
        if element.text:
            _, core, _ = strip_with_padding(element.text)
            if should_translate_text(core):
                texts.append(core)
        if element.tail and element.getparent() is not None:
            parent = element.getparent()
            if isinstance(parent.tag, str) and parent.tag.lower() not in SKIP_TRANSLATE_TAGS:
                _, core, _ = strip_with_padding(element.tail)
                if should_translate_text(core):
                    texts.append(core)
    return texts


def collect_attribute_texts(doc: html.HtmlElement) -> list[str]:
    texts: list[str] = []
    for element in doc.iter():
        if not isinstance(element.tag, str):
            continue
        for attr in ("placeholder", "title", "aria-label", "alt", "content", "value"):
            value = element.get(attr)
            if not value:
                continue
            if attr == "content":
                meta_name = (element.get("name") or "").lower()
                meta_property = (element.get("property") or "").lower()
                itemprop = (element.get("itemprop") or "").lower()
                if meta_name not in TRANSLATABLE_META_NAMES and meta_property not in TRANSLATABLE_META_PROPERTIES and itemprop not in TRANSLATABLE_ITEMPROPS:
                    continue
            if attr == "value" and (element.get("type") or "").lower() not in {"button", "submit"}:
                continue
            if should_translate_text(value):
                texts.append(value.strip())
        for attr_name, attr_value in element.attrib.items():
            if attr_name.lower() in JS_HANDLER_ATTRIBUTES:
                texts.extend(collect_js_texts(attr_value))
    return texts


def translate_padded_text(text: str, translator: Translator) -> str:
    leading, core, trailing = strip_with_padding(text)
    if not should_translate_text(core):
        return text
    translated = TEXT_OVERRIDES.get(core, translator.get(core))
    return leading + translated + trailing


def apply_node_translations(doc: html.HtmlElement, translator: Translator) -> None:
    for element in doc.iter():
        if isinstance(element.tag, str) and element.tag.lower() in SKIP_TRANSLATE_TAGS:
            continue
        if element.text:
            element.text = translate_padded_text(element.text, translator)
        if element.tail and element.getparent() is not None:
            parent = element.getparent()
            if isinstance(parent.tag, str) and parent.tag.lower() not in SKIP_TRANSLATE_TAGS:
                element.tail = translate_padded_text(element.tail, translator)


def apply_attribute_translations(doc: html.HtmlElement, translator: Translator) -> None:
    for element in doc.iter():
        if not isinstance(element.tag, str):
            continue
        for attr in ("placeholder", "title", "aria-label", "alt", "content", "value"):
            value = element.get(attr)
            if not value:
                continue
            if attr == "content":
                meta_name = (element.get("name") or "").lower()
                meta_property = (element.get("property") or "").lower()
                itemprop = (element.get("itemprop") or "").lower()
                if meta_name not in TRANSLATABLE_META_NAMES and meta_property not in TRANSLATABLE_META_PROPERTIES and itemprop not in TRANSLATABLE_ITEMPROPS:
                    continue
            if attr == "value" and (element.get("type") or "").lower() not in {"button", "submit"}:
                continue
            if should_translate_text(value):
                element.set(attr, TEXT_OVERRIDES.get(value.strip(), translator.get(value.strip())))
        for attr_name, attr_value in list(element.attrib.items()):
            if attr_name.lower() in JS_HANDLER_ATTRIBUTES:
                element.set(attr_name, translate_js_code(attr_value, translator))


def parse_json_ld(script_element: html.HtmlElement):
    try:
        return json.loads(script_element.text or "")
    except json.JSONDecodeError:
        return None


def collect_json_strings(value) -> list[str]:
    texts: list[str] = []
    if isinstance(value, dict):
        for key, nested in value.items():
            if key in TRANSLATABLE_JSON_KEYS:
                texts.extend(collect_json_strings(nested))
            else:
                texts.extend(collect_json_strings(nested))
    elif isinstance(value, list):
        for item in value:
            texts.extend(collect_json_strings(item))
    elif isinstance(value, str) and should_translate_text(value):
        texts.append(value.strip())
    return texts


def translate_json_ld(value, translator: Translator):
    if isinstance(value, dict):
        translated = {}
        for key, nested in value.items():
            if key == "availableLanguage":
                translated[key] = "English"
                continue
            if key in TRANSLATABLE_JSON_KEYS:
                translated[key] = translate_json_ld(nested, translator)
            else:
                translated[key] = translate_json_ld(nested, translator)
        return translated
    if isinstance(value, list):
        return [translate_json_ld(item, translator) for item in value]
    if isinstance(value, str) and should_translate_text(value):
        return TEXT_OVERRIDES.get(value.strip(), translator.get(value.strip()))
    return value


def iter_js_literals(code: str):
    index = 0
    length = len(code)
    while index < length:
        quote = code[index]
        if quote not in {"'", '"'}:
            index += 1
            continue
        start = index
        index += 1
        escaped = False
        chunk = []
        while index < length:
            char = code[index]
            if escaped:
                chunk.append("\\" + char)
                escaped = False
                index += 1
                continue
            if char == "\\":
                escaped = True
                index += 1
                continue
            if char == quote:
                raw = "".join(chunk)
                end = index + 1
                yield start, end, quote, raw
                index = end
                break
            chunk.append(char)
            index += 1
        else:
            break


def decode_js_literal(quote: str, raw: str) -> str:
    try:
        return ast.literal_eval(quote + raw + quote)
    except Exception:
        return raw


def encode_js_literal(quote: str, value: str) -> str:
    dumped = json.dumps(value, ensure_ascii=False)
    content = dumped[1:-1]
    if quote == "'":
        content = content.replace("'", "\\'")
        content = content.replace('\\"', '"')
        return "'" + content + "'"
    return '"' + content + '"'


def split_htmlish_segments(text: str) -> list[str]:
    return re.split(r"(<[^>]+>)", text)


def collect_js_texts(code: str) -> list[str]:
    texts: list[str] = []
    for _, _, quote, raw in iter_js_literals(code):
        decoded = decode_js_literal(quote, raw)
        if decoded == "pl-PL":
            continue
        for segment in split_htmlish_segments(decoded):
            if segment.startswith("<") and segment.endswith(">"):
                continue
            _, core, _ = strip_with_padding(segment)
            if should_translate_text(core):
                texts.append(core)
    return texts


def translate_js_code(code: str, translator: Translator) -> str:
    output = []
    cursor = 0
    for start, end, quote, raw in iter_js_literals(code):
        output.append(code[cursor:start])
        decoded = decode_js_literal(quote, raw)
        if decoded == "pl-PL":
            output.append(encode_js_literal(quote, "en-GB"))
            cursor = end
            continue
        if decoded == "pl_PL":
            output.append(encode_js_literal(quote, "en_GB"))
            cursor = end
            continue
        rebuilt = []
        changed = False
        for segment in split_htmlish_segments(decoded):
            if segment.startswith("<") and segment.endswith(">"):
                rebuilt.append(segment)
                continue
            translated_segment = translate_padded_text(segment, translator)
            if translated_segment != segment:
                changed = True
            rebuilt.append(translated_segment)
        new_value = "".join(rebuilt)
        output.append(encode_js_literal(quote, new_value) if changed else code[start:end])
        cursor = end
    output.append(code[cursor:])
    return "".join(output)


def rewrite_href_for_en(value: str) -> str:
    if not value:
        return value
    if value.startswith(("http://", "https://", "//", "#", "mailto:", "tel:", "javascript:", "data:")):
        return value
    if value.startswith("/#"):
        return "./#" + value[2:]
    if value.startswith("index.html#"):
        return "." + value[len("index.html"):]
    if value.startswith("/en/index.html#"):
        return "." + value[len("/en/index.html"):]
    if value in {"/", "/index.html", "index.html"}:
        return "./"
    if value.startswith("/en/"):
        return value[4:]
    if value.startswith("/"):
        stripped = value[1:]
        if stripped in HTML_NAMES:
            return stripped
        return value
    if value.endswith(".html") or ".html#" in value:
        return value
    return "../" + value


def update_structured_data_urls(value, page_name: str, locale: str):
    if isinstance(value, dict):
        updated = {}
        for key, nested in value.items():
            if key in {"url", "@id", "mainEntityOfPage"} and isinstance(nested, str):
                pl_url = absolute_page_url(page_name, "pl")
                en_url = absolute_page_url(page_name, "en")
                if nested in {pl_url, en_url}:
                    updated[key] = absolute_page_url(page_name, locale)
                    continue
            updated[key] = update_structured_data_urls(nested, page_name, locale)
        return updated
    if isinstance(value, list):
        return [update_structured_data_urls(item, page_name, locale) for item in value]
    return value


def update_head_links(doc: html.HtmlElement, page_name: str, locale: str) -> None:
    head = doc.find(".//head")
    if head is None:
        return

    doc.attrib["lang"] = locale

    page_url = absolute_page_url(page_name, locale)
    pl_url = absolute_page_url(page_name, "pl")
    en_url = absolute_page_url(page_name, "en")

    canonical = head.xpath('./link[@rel="canonical"]')
    if canonical:
        canonical[0].set("href", page_url)

    for rel in head.xpath('./link[@rel="alternate"]'):
        parent = rel.getparent()
        if parent is not None:
            parent.remove(rel)

    canonical_ref = canonical[0] if canonical else None
    insert_index = head.index(canonical_ref) + 1 if canonical_ref is not None else len(head)
    alternates = [
        make_link_element("alternate", pl_url, "pl"),
        make_link_element("alternate", en_url, "en"),
        make_link_element("alternate", pl_url, "x-default"),
    ]
    for link in alternates:
        head.insert(insert_index, link)
        insert_index += 1

    for meta in head.xpath("./meta[@property='og:url']"):
        meta.set("content", page_url)
    for meta in head.xpath("./meta[@property='og:locale']"):
        meta.set("content", "en_GB" if locale == "en" else "pl_PL")


def make_link_element(rel: str, href: str, hreflang: str) -> etree.Element:
    element = etree.Element("link")
    element.set("rel", rel)
    element.set("href", href)
    element.set("hreflang", hreflang)
    return element


def absolute_page_url(page_name: str, locale: str) -> str:
    if locale == "en":
        if page_name == "index.html":
            return BASE_URL + "/en/"
        return BASE_URL + "/en/" + page_name
    if page_name == "index.html":
        return BASE_URL + "/"
    return BASE_URL + "/" + page_name


def adjust_internal_urls(doc: html.HtmlElement, locale: str) -> None:
    if locale != "en":
        return
    for element in doc.iter():
        if not isinstance(element.tag, str):
            continue
        for attr in ("href", "src"):
            value = element.get(attr)
            if value:
                element.set(attr, rewrite_href_for_en(value))


def parse_polish_date(text: str) -> str:
    parts = text.strip().split()
    if len(parts) < 3:
        return ""
    day = parts[0]
    month = PL_MONTHS.get(parts[1].lower())
    year = parts[2]
    if not month:
        return ""
    return f"{year}-{month:02d}-{int(day):02d}"


def transform_blog_page(doc: html.HtmlElement, locale: str) -> None:
    if locale != "en":
        return
    for card in doc.xpath("//*[contains(concat(' ', normalize-space(@class), ' '), ' blog-card ')]"):
        category = card.xpath(".//*[contains(concat(' ', normalize-space(@class), ' '), ' blog-cat ')]")
        date = card.xpath(".//*[contains(concat(' ', normalize-space(@class), ' '), ' blog-date ')]")
        if category and not card.get("data-filter-key"):
            key = BLOG_CATEGORY_KEYS.get(category[0].text_content().strip(), "all")
            card.set("data-filter-key", key)
        if date and not card.get("data-sort-date"):
            card.set("data-sort-date", parse_polish_date(date[0].text_content()))
    for button in doc.xpath("//*[contains(concat(' ', normalize-space(@class), ' '), ' blog-filter ')]"):
        label = button.text_content().strip()
        key = BLOG_FILTER_KEYS.get(label)
        if key:
            button.set("data-filter-key", key)
        if "onclick" in button.attrib:
            del button.attrib["onclick"]
    scripts = doc.xpath("//script[not(@src) and not(@type='application/ld+json')]")
    if scripts:
        scripts[-1].text = """
function sortBlogByNewest() {
  var grid = document.getElementById('blogGrid');
  var cards = Array.from(grid.querySelectorAll('.blog-card'));
  cards.sort(function(a, b) {
    var da = a.getAttribute('data-sort-date') || '';
    var db = b.getAttribute('data-sort-date') || '';
    return db.localeCompare(da);
  });
  cards.forEach(function(card) {
    card.style.display = '';
    grid.appendChild(card);
  });
}

function filterBlogByKey(key, event) {
  document.querySelectorAll('.blog-filter').forEach(function(button) {
    button.classList.remove('active');
  });
  if (event && event.currentTarget) {
    event.currentTarget.classList.add('active');
  }
  var cards = Array.from(document.querySelectorAll('#blogGrid .blog-card'));
  if (key === 'newest') {
    sortBlogByNewest();
    return;
  }
  cards.forEach(function(card) {
    var cardKey = card.getAttribute('data-filter-key') || '';
    card.style.display = key === 'all' || cardKey === key ? '' : 'none';
  });
}

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.blog-filter').forEach(function(button) {
    button.addEventListener('click', function(event) {
      filterBlogByKey(button.getAttribute('data-filter-key') || 'all', event);
    });
  });
  sortBlogByNewest();
});
""".strip()


def prepare_blog_metadata(doc: html.HtmlElement) -> None:
    for card in doc.xpath("//*[contains(concat(' ', normalize-space(@class), ' '), ' blog-card ')]"):
        category = card.xpath(".//*[contains(concat(' ', normalize-space(@class), ' '), ' blog-cat ')]")
        date = card.xpath(".//*[contains(concat(' ', normalize-space(@class), ' '), ' blog-date ')]")
        if category:
            key = BLOG_CATEGORY_KEYS.get(category[0].text_content().strip(), "all")
            card.set("data-filter-key", key)
        if date:
            card.set("data-sort-date", parse_polish_date(date[0].text_content()))
    for button in doc.xpath("//*[contains(concat(' ', normalize-space(@class), ' '), ' blog-filter ')]"):
        label = button.text_content().strip()
        key = BLOG_FILTER_KEYS.get(label)
        if key:
            button.set("data-filter-key", key)
        if "onclick" in button.attrib:
            del button.attrib["onclick"]


def update_breadcrumb_json(doc: html.HtmlElement, locale: str) -> None:
    for script in doc.xpath("//script[@type='application/ld+json']"):
        data = parse_json_ld(script)
        if not data:
            continue
        if data.get("@type") == "BreadcrumbList":
            items = data.get("itemListElement", [])
            for item in items:
                if isinstance(item, dict) and "item" in item and isinstance(item["item"], str):
                    page_name = Path(item["item"]).name or "index.html"
                    if item["item"].endswith("/"):
                        page_name = "index.html"
                    item["item"] = absolute_page_url(page_name, locale)
            script.text = json.dumps(data, ensure_ascii=False, indent=2)


def set_element_html(element: html.HtmlElement, fragment_html: str) -> None:
    for child in list(element):
        element.remove(child)
    element.text = None
    fragments = html.fragments_fromstring(fragment_html)
    previous = None
    for fragment in fragments:
        if isinstance(fragment, str):
            if previous is None:
                element.text = (element.text or "") + fragment
            else:
                previous.tail = (previous.tail or "") + fragment
            continue
        element.append(fragment)
        previous = fragment


def apply_page_fixups(doc: html.HtmlElement, page_name: str) -> None:
    for xpath, fragment_html in PAGE_HTML_FIXUPS.get(page_name, []):
        matches = doc.xpath(xpath)
        if matches:
            set_element_html(matches[0], fragment_html)


def process_html_file(path: Path, translator: Translator) -> None:
    source = path.read_text(encoding="utf-8")

    pl_doc = html.fromstring(source)
    update_head_links(pl_doc, path.name, "pl")
    adjust_internal_urls(pl_doc, "pl")
    update_breadcrumb_json(pl_doc, "pl")
    path.write_text(html.tostring(pl_doc, encoding="unicode", doctype="<!DOCTYPE html>", pretty_print=False), encoding="utf-8")

    doc = html.fromstring(source)
    if path.name == "blog.html":
        prepare_blog_metadata(doc)
    texts = []
    texts.extend(collect_node_texts(doc))
    texts.extend(collect_attribute_texts(doc))
    for script in doc.xpath("//script[@type='application/ld+json']"):
        data = parse_json_ld(script)
        if data:
            texts.extend(collect_json_strings(data))
    for script in doc.xpath("//script[not(@src) and not(@type='application/ld+json')]"):
        texts.extend(collect_js_texts(script.text or ""))
    translator.translate_many(sorted(set(texts)))

    apply_node_translations(doc, translator)
    apply_attribute_translations(doc, translator)
    for script in doc.xpath("//script[@type='application/ld+json']"):
        data = parse_json_ld(script)
        if data:
            translated_data = translate_json_ld(data, translator)
            translated_data = update_structured_data_urls(translated_data, path.name, "en")
            script.text = json.dumps(translated_data, ensure_ascii=False, indent=2)
    for script in doc.xpath("//script[not(@src) and not(@type='application/ld+json')]"):
        script.text = translate_js_code(script.text or "", translator)

    transform_blog_page(doc, "en")
    apply_page_fixups(doc, path.name)
    adjust_internal_urls(doc, "en")
    update_head_links(doc, path.name, "en")
    update_breadcrumb_json(doc, "en")

    OUTPUT_DIR.mkdir(exist_ok=True)
    target = OUTPUT_DIR / path.name
    rendered = html.tostring(doc, encoding="unicode", doctype="<!DOCTYPE html>", pretty_print=False)
    target.write_text(rendered, encoding="utf-8")


def build_sitemap() -> None:
    urlset = etree.Element("urlset", nsmap={None: "http://www.sitemaps.org/schemas/sitemap/0.9"})
    lastmod = "2026-04-26"
    indexable = [name for name in sorted(HTML_NAMES) if name not in NON_INDEXABLE and name not in NON_CANONICAL_SITEMAP]

    for locale in ("pl", "en"):
        for name in indexable:
            url = etree.SubElement(urlset, "url")
            loc = etree.SubElement(url, "loc")
            loc.text = absolute_page_url(name, locale)
            priority = etree.SubElement(url, "priority")
            priority.text = SITEMAP_PRIORITY.get(name, "0.7")
            changefreq = etree.SubElement(url, "changefreq")
            changefreq.text = "weekly" if name == "blog.html" else "monthly"
            lastmod_el = etree.SubElement(url, "lastmod")
            lastmod_el.text = lastmod

    xml = etree.tostring(urlset, encoding="utf-8", xml_declaration=True)
    (ROOT / "sitemap.xml").write_bytes(xml)


def main() -> None:
    translator = Translator(CACHE_PATH)
    OUTPUT_DIR.mkdir(exist_ok=True)
    for path in HTML_FILES:
        process_html_file(path, translator)
    build_sitemap()
    translator.save()
    print(f"Built English pages in: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
