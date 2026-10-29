#!/usr/bin/env python3
"""Generate a customer-facing, print-ready A4 wine list from data/wines.js."""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from reportlab import rl_config
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    Image,
    KeepTogether,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents

rl_config.warnOnMissingFontGlyphs = 0

BURGUNDY = colors.HexColor("#6B1F2A")
GOLD = colors.HexColor("#B08D57")
INK = colors.HexColor("#171411")
MUTED = colors.HexColor("#625C55")
RULE = colors.HexColor("#D9D0C5")
PAPER = colors.HexColor("#FFF7EA")
HEADING_PAPER = colors.HexColor("#FCF5E9")
WINE_REGION_WORDS = frozenset(
    "france italy germany australia china england spain portugal argentina chile "
    "austria switzerland canada usa japan scotland zealand burgundy bordeaux "
    "champagne alsace languedoc loire rhone provence tuscany piedmont veneto sicily "
    "sardinia rioja ribera priorat douro napa sonoma california washington oregon "
    "victoria central otago ningxia yunnan pauillac pomerol margaux estephe pessac "
    "leognan cote chalonnaise beaune gevrey chambertin vosne romanee chablis "
    "meursault puligny montrachet chassagne julien emilion medoc barsac sauternes "
    "fronsac".split()
)
DEFAULT_APP_URL = "https://tlhwineteam.github.io/TLH-Master-Wine-List/"
A4_WIDTH, A4_HEIGHT = A4
PRIORITY_CATEGORY_IDS = frozenset({"c1", "c2", "c6", "c7"})
INDEX_REGIONAL_CATEGORY_IDS = frozenset(
    {"c12", "c13", "c14", "c15", "c19", "c20", "c21", "c22", "c27", "c28"}
)
INDEX_SUBCATEGORY_LABELS = {
    ("c12", "Sicilia"): "Sicily",
    ("c12", "Trentino Alto Adige"): "Trentino-Alto Adige",
    ("c12", "Friuli Venezia Giulia"): "Friuli-Venezia Giulia",
    ("c12", "Veneto"): "Veneto",
    ("c12", "Piemonte"): "Piedmont",
    ("c12", "Liguria"): "Liguria",
    ("c12", "Umbria"): "Central Italy",
    ("c12", "Campania"): "Campania",
    ("c13", "Mosel"): "Germany",
    ("c13", "Rías Baixas"): "Spain",
    ("c13", "Kamptal"): "Austria",
    ("c14", "Alsace"): "Alsace",
    ("c14", "Bordeaux"): "Bordeaux",
    ("c14", "Chablis"): "Burgundy",
    ("c14", "Loire Valley"): "Loire Valley",
    ("c14", "Rhone Valley"): "Rhone Valley",
    ("c15", "Chardonnay"): "Chardonnay, Riesling",
    ("c15", "Sauvignon Blanc"): "Sauvignon Blanc, Indigenous and Curiosities",
    ("c19", "Sicilia"): "Sicily",
    ("c19", "Trentino Alto Adige"): "Trentino-Alto Adige",
    ("c19", "Valle d'Aosta"): "Alpine Italy",
    ("c19", "Piemonte"): "Piedmont",
    ("c19", "Lombardia"): "Lombardy",
    ("c19", "Veneto"): "Veneto",
    ("c19", "Friuli Venezia Giulia"): "Friuli-Venezia Giulia",
    ("c19", "Super Toscana"): "Tuscany",
    ("c19", "Umbria"): "Central Italy",
    ("c19", "Campania"): "Campania",
    ("c19", "Basilicata"): "Basilicata",
    ("c19", "Sardegna"): "Sardinia",
    ("c20", "Graves"): "Bordeaux",
    ("c20", "Marsannay"): "Burgundy",
    ("c20", "Beaujolais"): "Beaujolais",
    ("c20", "Loire Valley"): "Loire Valley",
    ("c20", "Northern Rhone"): "Rhone Valley",
    ("c21", "Austria"): "Austria",
    ("c21", "Bulgaria"): "Bulgaria",
    ("c21", "Rioja"): "Spain",
    ("c22", "Cabernet Sauvignon"): "Cabernet Sauvignon",
    ("c22", "Shiraz"): "Shiraz",
    ("c22", "Indigenous & Curiosities"): "Indigenous & Curiosities",
    ("c27", "Chardonnay"): "Chardonnay",
    ("c27", "Sauvignon Blanc"): "Sauvignon Blanc",
    ("c27", "Indigenous & Curiosities"): "Indigenous & Curiosities",
    ("c28", "Cabernet Sauvignon"): "Cabernet Sauvignon",
    ("c28", "Indigenous & Curiosities"): "Indigenous & Curiosities",
}
REGIONAL_GROUP_STARTS = {
    "c12": {
        "Sicilia": None,
        "Trentino Alto Adige": None,
        "Friuli Venezia Giulia": None,
        "Veneto": None,
        "Piemonte": None,
        "Liguria": None,
        "Umbria": None,
        "Marche": None,
        "Campania": None,
    },
    "c13": {
        "Mosel": ("Germany", "德國"),
        "Rías Baixas": ("Spain", "西班牙"),
        "Kamptal": ("Austria", "奧地利"),
    },
    "c14": {
        "Alsace": None,
        "Bordeaux": None,
        "Chablis": ("Burgundy", "勃艮第"),
        "Loire Valley": None,
        "Rhone Valley": None,
    },
    "c19": {
        "Sicilia": None,
        "Trentino Alto Adige": None,
        "Valle d'Aosta": None,
        "Piemonte": None,
        "Lombardia": None,
        "Veneto": None,
        "Friuli Venezia Giulia": None,
        "Super Toscana": ("Tuscany", "托斯卡納"),
        "Umbria": None,
        "Marche": None,
        "Lazio": None,
        "Abruzzo": None,
        "Campania": None,
        "Basilicata": None,
        "Sardegna": None,
    },
    "c20": {
        "Graves": ("Bordeaux", "波爾多"),
        "Marsannay": ("Burgundy", "勃艮第"),
        "Beaujolais": None,
        "Loire Valley": None,
        "Northern Rhone": ("Rhone Valley", "隆河谷"),
    },
    "c21": {
        "Austria": None,
        "Bulgaria": None,
        "Rioja": ("Spain", "西班牙"),
    },
}
MANUAL_PAGE_BREAKS = frozenset(
    {
        ("c2", "Dessert"),
        ("c8", "Sicilia"),
        ("c11", "Blanc de Noirs"),
        ("c12", "Piemonte"),
        ("c13", "Rheinhessen"),
        ("c19", "Basilicata"),
        ("c6", "Red"),
        ("c20", "Marsannay"),
        ("c20", "Saint-Émilion"),
        ("c21", "Costers del Segre"),
        ("c23", "France"),
        ("c18", "Spain"),
    }
)
COMPACT_FRENCH_TAIL_SECTIONS = frozenset(
    {
        "Cote Chalonnaise",
        "Beaujolais",
        "Loire Valley",
        "Northern Rhone",
        "M. Chapoutier",
        "E. Guigal",
        "Southern Rhone",
        "Château de Beaucastel",
    }
)


class WineDataError(ValueError):
    """Raised when the web application's wine data cannot produce a catalogue."""


@dataclass(frozen=True)
class Fonts:
    body: str
    body_bold: str
    cjk: str


class Rule(Flowable):
    def __init__(self, width: float, color: colors.Color = RULE, thickness: float = 0.5):
        super().__init__()
        self.width = width
        self.color = color
        self.thickness = thickness

    def wrap(self, available_width: float, available_height: float) -> tuple[float, float]:
        return min(self.width, available_width), self.thickness

    def draw(self) -> None:
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.thickness)
        self.canv.line(0, 0, self.width, 0)


class WineListDocument(BaseDocTemplate):
    """Add live category and section page numbers to the generated index."""

    def afterFlowable(self, flowable: Flowable) -> None:
        if not hasattr(flowable, "toc_level"):
            return
        self.notify(
            "TOCEntry",
            (flowable.toc_level, flowable.toc_text, self.page),
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate the Tin Lung Heen Master Wine List as an A4 PDF."
    )
    parser.add_argument(
        "--data",
        type=Path,
        default=Path("data/wines.js"),
        help="source JavaScript data file (default: data/wines.js)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("TLH-Master-Wine-List.pdf"),
        help="PDF output path (default: TLH-Master-Wine-List.pdf)",
    )
    parser.add_argument(
        "--asset-root",
        type=Path,
        default=Path("."),
        help="base directory for relative wine image paths (default: repository root)",
    )
    parser.add_argument(
        "--cjk-font",
        type=Path,
        help="optional licensed CJK TTF/OTF font to embed instead of STSong-Light",
    )
    parser.add_argument(
        "--app-url",
        default=DEFAULT_APP_URL,
        help=f"URL opened by the PDF's APP button (default: {DEFAULT_APP_URL})",
    )
    return parser.parse_args()


def load_wine_data(path: Path) -> list[dict[str, Any]]:
    try:
        source = path.read_text(encoding="utf-8")
    except OSError as error:
        raise WineDataError(f"could not read {path}: {error}") from error

    match = re.search(r"window\.WINE_DATA\s*=\s*(\[.*\])\s*;\s*$", source, re.DOTALL)
    if not match:
        raise WineDataError(
            f"{path} must contain a JSON array assigned to window.WINE_DATA"
        )

    try:
        data = json.loads(match.group(1))
    except json.JSONDecodeError as error:
        raise WineDataError(f"{path} contains invalid JSON: {error}") from error

    if not isinstance(data, list) or not data:
        raise WineDataError("wine data must be a non-empty category array")

    for category_index, category in enumerate(data, start=1):
        if not isinstance(category, dict) or not nonempty_text(category.get("title")):
            raise WineDataError(f"category {category_index} is missing a title")
        sections = category.get("sections")
        if not isinstance(sections, list):
            raise WineDataError(f"category {category['title']!r} has no sections array")
        for section_index, section in enumerate(sections, start=1):
            if not isinstance(section, dict) or not nonempty_text(section.get("name")):
                raise WineDataError(
                    f"section {section_index} in {category['title']!r} is missing a name"
                )
            items = section.get("items")
            if not isinstance(items, list):
                raise WineDataError(
                    f"section {section['name']!r} in {category['title']!r} has no items"
                )
            for item_index, item in enumerate(items, start=1):
                if not isinstance(item, dict) or not nonempty_text(item.get("name")):
                    raise WineDataError(
                        f"wine {item_index} in {section['name']!r} is missing a name"
                    )
                if not nonempty_text(item.get("price")):
                    raise WineDataError(
                        f"wine {item['name']!r} is missing a price"
                    )
    return data


def nonempty_text(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def normalize_wine_text(value: Any) -> str:
    text = unicodedata.normalize("NFD", str(value or "")).lower()
    text = "".join(character for character in text if not "\u0300" <= character <= "\u036f")
    return re.sub(r"[^a-z0-9]+", " ", text.replace("&", " ")).strip()


def wine_identity(item: dict[str, Any]) -> str:
    name = str(item.get("name") or "")
    name = re.sub(r"\b\d+(?:\.\d+)?\s*(?:ml|l)\b", " ", name, flags=re.IGNORECASE)
    name = re.sub(
        r"\b(half\s+bottle|double\s+magnum|magnum|jeroboam|imperial|methuselah|"
        r"salmanazar|balthazar|nebuchadnezzar)\b",
        " ",
        name,
        flags=re.IGNORECASE,
    )
    parts = name.split(",")
    first = normalize_wine_text(parts.pop(0) if parts else "")
    first = re.sub(r"^chateau\s+", "", first)
    rest = [
        word
        for part in parts
        for word in normalize_wine_text(part).split()
        if word not in WINE_REGION_WORDS
    ]
    vintage = str(item.get("v") or "").strip().lower()
    return f"{vintage}|{' '.join([first, *rest]).strip()}"


def bottle_format(item: dict[str, Any], category: dict[str, Any]) -> str:
    name = str(item.get("name") or "").lower()
    price = str(item.get("price") or "").lower()
    category_title = str(category.get("title") or "").lower()
    text = f"{name} {price}"

    def format_size(value: float) -> str:
        return f"{value:g}ml"

    size_in_name = re.search(r"\b(\d+(?:\.\d+)?)\s*(ml|l)\b", name)
    if size_in_name:
        millilitres = float(size_in_name.group(1)) * (
            1000 if size_in_name.group(2) == "l" else 1
        )
        if millilitres >= 250:
            return format_size(millilitres)
    if re.search(r"\bhalf\s+bottle\b", name) or category_title == "half bottles":
        return "375ml"
    for size_in_price in re.finditer(r"\b(\d+(?:\.\d+)?)\s*(ml|l)\b", price):
        millilitres = float(size_in_price.group(1)) * (
            1000 if size_in_price.group(2) == "l" else 1
        )
        if millilitres >= 1000:
            return format_size(millilitres)
    if re.search(r"\b(double\s+magnum|jeroboam)\b", text):
        return "3000ml"
    if re.search(r"\bmagnum\b", text):
        return "1500ml"
    if re.search(r"\b(imperial|methuselah)\b", text):
        return "6000ml"
    if re.search(r"\bsalmanazar\b", text):
        return "9000ml"
    if re.search(r"\bbalthazar\b", text):
        return "12000ml"
    if re.search(r"\bnebuchadnezzar\b", text):
        return "15000ml"
    if category_title == "large formats":
        return "1500ml"
    return "750ml"


def count_distinct_wines(data: list[dict[str, Any]]) -> int:
    identities = {
        (wine_identity(item), bottle_format(item, category))
        for category in data
        for section in category["sections"]
        for item in section["items"]
    }
    return len(identities)


def updated_date_for_file(path: Path) -> str:
    try:
        modified_at = datetime.fromtimestamp(path.stat().st_mtime, timezone.utc)
    except OSError as error:
        raise WineDataError(f"could not read modification date for {path}: {error}") from error
    month = modified_at.strftime("%B")
    return f"{modified_at.day} {month} {modified_at.year}"


def register_fonts(cjk_font_path: Path | None) -> Fonts:
    reportlab_root = Path(__import__("reportlab").__file__).parent
    vera_path = reportlab_root / "fonts" / "Vera.ttf"
    vera_bold_path = reportlab_root / "fonts" / "VeraBd.ttf"
    if not vera_path.is_file() or not vera_bold_path.is_file():
        raise WineDataError("ReportLab bundled Vera fonts are unavailable")

    pdfmetrics.registerFont(TTFont("WineBody", str(vera_path)))
    pdfmetrics.registerFont(TTFont("WineBodyBold", str(vera_bold_path)))
    if cjk_font_path:
        if not cjk_font_path.is_file():
            raise WineDataError(f"CJK font does not exist: {cjk_font_path}")
        pdfmetrics.registerFont(TTFont("WineCJK", str(cjk_font_path)))
        cjk_font = "WineCJK"
    else:
        pdfmetrics.registerFont(UnicodeCIDFont("STSong-Light"))
        cjk_font = "STSong-Light"
    return Fonts(body="WineBody", body_bold="WineBodyBold", cjk=cjk_font)


def paragraph_styles(fonts: Fonts) -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()["Normal"]
    return {
        "cover_title": ParagraphStyle(
            "CoverTitle",
            parent=base,
            fontName="Times-Italic",
            fontSize=42,
            leading=46,
            textColor=BURGUNDY,
            alignment=TA_CENTER,
            spaceAfter=9,
        ),
        "cover_chinese": ParagraphStyle(
            "CoverChinese",
            parent=base,
            fontName=fonts.cjk,
            fontSize=35,
            leading=46,
            textColor=BURGUNDY,
            alignment=TA_CENTER,
            spaceAfter=16,
        ),
        "feature_name": ParagraphStyle(
            "FeatureName",
            parent=base,
            fontName=fonts.body_bold,
            fontSize=19,
            leading=24,
            textColor=BURGUNDY,
            alignment=TA_CENTER,
            spaceAfter=5,
        ),
        "feature_name_zh": ParagraphStyle(
            "FeatureNameZh",
            parent=base,
            fontName=fonts.cjk,
            fontSize=21,
            leading=28,
            textColor=BURGUNDY,
            alignment=TA_CENTER,
            spaceAfter=13,
        ),
        "feature_copy": ParagraphStyle(
            "FeatureCopy",
            parent=base,
            fontName=fonts.body,
            fontSize=10.5,
            leading=15,
            textColor=INK,
            alignment=TA_LEFT,
        ),
        "feature_copy_zh": ParagraphStyle(
            "FeatureCopyZh",
            parent=base,
            fontName=fonts.cjk,
            fontSize=10.7,
            leading=15.4,
            textColor=INK,
            alignment=TA_LEFT,
        ),
        "price": ParagraphStyle(
            "Price",
            parent=base,
            fontName=fonts.body_bold,
            fontSize=14.5,
            leading=20,
            textColor=BURGUNDY,
            alignment=TA_CENTER,
        ),
        "price_header": ParagraphStyle(
            "PriceHeader",
            parent=base,
            fontName=fonts.body_bold,
            fontSize=11.5,
            leading=14.5,
            textColor=BURGUNDY,
            alignment=TA_CENTER,
        ),
        "footer": ParagraphStyle(
            "Footer",
            parent=base,
            fontName=fonts.body,
            fontSize=8.6,
            leading=11.5,
            textColor=INK,
            alignment=TA_CENTER,
        ),
        "category_title": ParagraphStyle(
            "CategoryTitle",
            parent=base,
            fontName=fonts.body_bold,
            fontSize=25,
            leading=31,
            textColor=INK,
            alignment=TA_CENTER,
            spaceAfter=1,
        ),
        "category_title_zh": ParagraphStyle(
            "CategoryTitleZh",
            parent=base,
            fontName=fonts.cjk,
            fontSize=18,
            leading=24,
            textColor=INK,
            alignment=TA_CENTER,
            spaceAfter=13,
        ),
        "section": ParagraphStyle(
            "Section",
            parent=base,
            fontName=fonts.body_bold,
            fontSize=12.5,
            leading=16,
            textColor=INK,
            spaceBefore=9,
            spaceAfter=3,
            textTransform="uppercase",
        ),
        "section_zh": ParagraphStyle(
            "SectionZh",
            parent=base,
            fontName=fonts.cjk,
            fontSize=12.2,
            leading=16,
            textColor=INK,
            spaceBefore=9,
            spaceAfter=3,
        ),
        "regional_section": ParagraphStyle(
            "RegionalSection",
            parent=base,
            fontName=fonts.body_bold,
            fontSize=16,
            leading=20.5,
            textColor=INK,
            spaceBefore=15,
            spaceAfter=5,
            textTransform="uppercase",
        ),
        "regional_section_zh": ParagraphStyle(
            "RegionalSectionZh",
            parent=base,
            fontName=fonts.cjk,
            fontSize=14.5,
            leading=20.5,
            textColor=INK,
            spaceBefore=15,
            spaceAfter=5,
        ),
        "wine": ParagraphStyle(
            "Wine",
            parent=base,
            fontName=fonts.body,
            fontSize=10.8,
            leading=14.7,
            textColor=INK,
        ),
        "wine_bold": ParagraphStyle(
            "WineBold",
            parent=base,
            fontName=fonts.body_bold,
            fontSize=10.8,
            leading=14.7,
            textColor=INK,
        ),
        "wine_zh": ParagraphStyle(
            "WineZh",
            parent=base,
            fontName=fonts.cjk,
            fontSize=10.7,
            leading=14.5,
            textColor=MUTED,
        ),
        "ingredients": ParagraphStyle(
            "Ingredients",
            parent=base,
            fontName=fonts.body,
            fontSize=9,
            leading=11.5,
            textColor=MUTED,
        ),
        "ingredients_zh": ParagraphStyle(
            "IngredientsZh",
            parent=base,
            fontName=fonts.cjk,
            fontSize=9,
            leading=11.5,
            textColor=MUTED,
        ),
        "price_cell": ParagraphStyle(
            "PriceCell",
            parent=base,
            fontName=fonts.body_bold,
            fontSize=10.7,
            leading=14.7,
            textColor=INK,
            alignment=TA_CENTER,
        ),
        "index_title": ParagraphStyle(
            "IndexTitle",
            parent=base,
            fontName=fonts.body_bold,
            fontSize=23,
            leading=28,
            textColor=INK,
            alignment=TA_CENTER,
            spaceAfter=2,
        ),
        "index_title_zh": ParagraphStyle(
            "IndexTitleZh",
            parent=base,
            fontName=fonts.cjk,
            fontSize=16,
            leading=22,
            textColor=INK,
            alignment=TA_CENTER,
            spaceAfter=12,
        ),
        "priority_category_title": ParagraphStyle(
            "PriorityCategoryTitle",
            parent=base,
            fontName=fonts.body_bold,
            fontSize=25,
            leading=31,
            textColor=BURGUNDY,
            alignment=TA_CENTER,
            spaceAfter=1,
        ),
        "priority_category_title_zh": ParagraphStyle(
            "PriorityCategoryTitleZh",
            parent=base,
            fontName=fonts.cjk,
            fontSize=18,
            leading=24,
            textColor=BURGUNDY,
            alignment=TA_CENTER,
            spaceAfter=13,
        ),
        "priority_section": ParagraphStyle(
            "PrioritySection",
            parent=base,
            fontName=fonts.body_bold,
            fontSize=12.5,
            leading=16,
            textColor=BURGUNDY,
            spaceBefore=7,
            spaceAfter=2,
            textTransform="uppercase",
        ),
        "priority_section_zh": ParagraphStyle(
            "PrioritySectionZh",
            parent=base,
            fontName=fonts.cjk,
            fontSize=12.2,
            leading=16,
            textColor=BURGUNDY,
            spaceBefore=7,
            spaceAfter=2,
        ),
    }


def escape(value: Any) -> str:
    return (
        str(value or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def chinese_wine_name(value: Any) -> str:
    """Use the embedded Latin font for all Latin text in CJK translations."""

    def latin_markup(text: str, keep_together: bool) -> str:
        result: list[str] = []
        position = 0
        for match in re.finditer(
            r"[A-Za-zÀ-ÖØ-öø-ÿ0-9][A-Za-zÀ-ÖØ-öø-ÿ0-9 .,'’&…/–—-]*",
            text,
        ):
            result.append(escape(text[position : match.start()]))
            latin = escape(match.group(0))
            if keep_together:
                latin = latin.replace(" ", "&nbsp;")
            result.append(f"<font name='WineBody'>{latin}</font>")
            position = match.end()
        result.append(escape(text[position:]))
        return "".join(result)

    parts = re.split(r"(「[^」]*」)", str(value or ""))
    return "".join(
        (
            "「"
            + latin_markup(part[1:-1], keep_together=True)
            + "」"
            if part.startswith("「") and part.endswith("」")
            else latin_markup(part, keep_together=False)
        )
        for part in parts
    )


def paragraphs(value: str) -> list[str]:
    return [part.strip() for part in re.split(r"\n\s*\n", value) if part.strip()]


def first_feature(data: list[dict[str, Any]]) -> dict[str, Any]:
    for category in data:
        if category.get("id") == "c0":
            for section in category["sections"]:
                if section["items"]:
                    return section["items"][0]
    for category in data:
        for section in category["sections"]:
            if section["items"]:
                return section["items"][0]
    raise WineDataError("wine data contains no wine records")


def resolve_asset(asset_root: Path, asset: str | None) -> Path | None:
    if not asset:
        return None
    path = Path(asset)
    if not path.is_absolute():
        path = asset_root / path
    return path if path.is_file() else None


def feature_copy_paragraphs(item: dict[str, Any], language: str) -> list[str]:
    suffix = "Zh" if language == "zh" else ""
    note = str(item.get(f"note{suffix}") or item.get(f"name{suffix}") or item["name"])
    parts = paragraphs(note)[:2]
    return parts + [""] * (2 - len(parts))


def split_price(price: str) -> list[str]:
    fragments = [part.strip() for part in price.split("·") if part.strip()]
    return fragments or [price]


def price_components(price: str) -> dict[str, tuple[str, str]]:
    components: dict[str, tuple[str, str]] = {}
    for fragment in split_price(price):
        match = re.fullmatch(
            r"(Glass|Bottle)(?:\s*\(([^)]+)\))?\s+(\$[\d,]+)",
            fragment,
        )
        if match:
            label, size, amount = match.groups()
            components[label.lower()] = (amount, size or "")
    return components


def stacked_price(price: str) -> str:
    return "<br/>".join(escape(fragment) for fragment in split_price(price))


def add_feature_page(
    story: list[Any],
    item: dict[str, Any],
    asset_root: Path,
    styles: dict[str, ParagraphStyle],
) -> None:
    story.append(Spacer(1, 1.05 * cm))
    story.append(Paragraph("Wine of The Month", styles["cover_title"]))
    story.append(Paragraph("本月葡萄酒推介", styles["cover_chinese"]))

    image_path = resolve_asset(asset_root, item.get("image"))
    if image_path:
        image = Image(str(image_path))
        max_width, max_height = 5.25 * cm, 6.15 * cm
        scale = min(max_width / image.imageWidth, max_height / image.imageHeight)
        image.drawWidth = image.imageWidth * scale
        image.drawHeight = image.imageHeight * scale
        image.hAlign = "CENTER"
        image_frame = Table([[image]], hAlign="CENTER")
        image_frame.setStyle(
            TableStyle(
                [
                    ("BOX", (0, 0), (-1, -1), 1.4, GOLD),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            )
        )
        story.append(image_frame)
    else:
        story.append(Spacer(1, 5.8 * cm))

    story.append(Spacer(1, 0.32 * cm))
    english_name = f"{escape(item.get('v', ''))} {escape(item['name'])}".strip()
    story.append(Paragraph(english_name, styles["feature_name"]))
    chinese_name = item.get("nameZh")
    if chinese_name:
        story.append(Paragraph(chinese_wine_name(chinese_name), styles["feature_name_zh"]))

    english_copy = feature_copy_paragraphs(item, "en")
    chinese_copy = feature_copy_paragraphs(item, "zh")
    copy_table = Table(
        [
            [
                Paragraph(escape(english_copy[index]), styles["feature_copy"]),
                Paragraph(escape(chinese_copy[index]), styles["feature_copy_zh"]),
            ]
            for index in range(2)
        ],
        colWidths=[8.15 * cm, 8.15 * cm],
        hAlign="CENTER",
    )
    copy_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.extend([copy_table, Spacer(1, 0.7 * cm)])
    price_lines = "<br/>".join(escape(line) for line in split_price(item["price"]))
    story.append(Paragraph(price_lines, styles["price"]))


def wine_name_cell(item: dict[str, Any], styles: dict[str, ParagraphStyle]) -> list[Any]:
    vintage = escape(item.get("v", "NV"))
    name = escape(item["name"])
    chinese_name = item.get("nameZh")
    name_flowables: list[Any] = [
        Paragraph(f"<b>{vintage}</b>  {name}", styles["wine"])
    ]
    if chinese_name:
        name_flowables.append(Paragraph(chinese_wine_name(chinese_name), styles["wine_zh"]))
    if item.get("ingredients"):
        name_flowables.append(Paragraph(escape(item["ingredients"]), styles["ingredients"]))
    if item.get("ingredientsZh"):
        name_flowables.append(
            Paragraph(chinese_wine_name(item["ingredientsZh"]), styles["ingredients_zh"])
        )
    return name_flowables


def wine_row(
    item: dict[str, Any], styles: dict[str, ParagraphStyle], compact: bool = False
) -> Table:
    name_flowables = wine_name_cell(item, styles)
    row = Table(
        [[name_flowables, Paragraph(stacked_price(item["price"]), styles["price_cell"])]],
        colWidths=[13.55 * cm, 3.45 * cm],
        hAlign="LEFT",
    )
    row.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 2 if compact else 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2 if compact else 5),
                ("LINEBELOW", (0, 0), (-1, -1), 0.25, RULE),
            ]
        )
    )
    return row


def shared_price_style(
    styles: dict[str, ParagraphStyle], accent: colors.Color
) -> ParagraphStyle:
    return ParagraphStyle(
        "SharedPriceHeader",
        parent=styles["price_header"],
        textColor=accent,
    )


def wine_by_glass_header(
    styles: dict[str, ParagraphStyle], accent: colors.Color
) -> Table:
    header_style = shared_price_style(styles, accent)
    header = Table(
        [[
            "",
            Paragraph("Glass", header_style),
            Paragraph("Bottle", header_style),
        ]],
        colWidths=[11.2 * cm, 2.9 * cm, 2.9 * cm],
        hAlign="LEFT",
    )
    header.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LINEBELOW", (1, 0), (-1, -1), 0.6, accent),
            ]
        )
    )
    return header


def wine_by_glass_row(
    item: dict[str, Any], styles: dict[str, ParagraphStyle], compact: bool = False
) -> Table:
    components = price_components(item["price"])
    glass_amount, glass_size = components.get("glass", ("—", ""))
    bottle_amount, _ = components.get("bottle", ("—", ""))
    glass_markup = escape(glass_amount)
    if glass_size:
        glass_markup += f"<br/><font size='7.5'>({escape(glass_size)})</font>"
    row = Table(
        [[
            wine_name_cell(item, styles),
            Paragraph(glass_markup, styles["price_cell"]),
            Paragraph(escape(bottle_amount), styles["price_cell"]),
        ]],
        colWidths=[11.2 * cm, 2.9 * cm, 2.9 * cm],
        hAlign="LEFT",
    )
    row.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 2 if compact else 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2 if compact else 5),
                ("LINEBELOW", (0, 0), (-1, -1), 0.25, RULE),
            ]
        )
    )
    return row


def digestif_header(styles: dict[str, ParagraphStyle]) -> Table:
    return wine_by_glass_header(styles, INK)


def half_bottle_header(styles: dict[str, ParagraphStyle]) -> Table:
    return large_format_header(styles)


def half_bottle_row(item: dict[str, Any], styles: dict[str, ParagraphStyle]) -> Table:
    return large_format_row(item, styles)


def large_format_header(styles: dict[str, ParagraphStyle]) -> Table:
    header_style = shared_price_style(styles, INK)
    header = Table(
        [[
            "",
            Paragraph("Price", header_style),
            Paragraph("Format", header_style),
        ]],
        colWidths=[11.2 * cm, 2.9 * cm, 2.9 * cm],
        hAlign="LEFT",
    )
    header.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LINEBELOW", (1, 0), (-1, -1), 0.6, INK),
            ]
        )
    )
    return header


def large_format_row(item: dict[str, Any], styles: dict[str, ParagraphStyle]) -> Table:
    amount, *format_parts = split_price(item["price"])
    format_label = " · ".join(format_parts) or "—"
    row = Table(
        [[
            wine_name_cell(item, styles),
            Paragraph(escape(amount), styles["price_cell"]),
            Paragraph(escape(format_label), styles["price_cell"]),
        ]],
        colWidths=[11.2 * cm, 2.9 * cm, 2.9 * cm],
        hAlign="LEFT",
    )
    row.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("LINEBELOW", (0, 0), (-1, -1), 0.25, RULE),
            ]
        )
    )
    return row


def toc_paragraph(
    text: str,
    style: ParagraphStyle,
    level: int | None = None,
    toc_text: str | None = None,
) -> Paragraph:
    paragraph = Paragraph(text, style)
    if level is not None:
        paragraph.toc_level = level
        paragraph.toc_text = toc_text or re.sub(r"<[^>]+>", "", text)
    return paragraph


def framed_toc_heading(
    text: str,
    style: ParagraphStyle,
    accent: colors.Color,
    level: int | None = None,
    toc_text: str | None = None,
    regional: bool = False,
) -> Table:
    """Draw an in-page hierarchy marker while retaining its live TOC entry."""
    heading_style = ParagraphStyle(
        f"{style.name}Framed",
        parent=style,
        spaceBefore=0,
        spaceAfter=0,
    )
    heading = Table(
        [[Paragraph(text, heading_style)]],
        colWidths=[17.0 * cm],
        hAlign="LEFT",
    )
    vertical_padding = 6 if regional else 4
    heading.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), HEADING_PAPER),
                ("BOX", (0, 0), (-1, -1), 0.8 if regional else 0.6, accent),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), vertical_padding),
                ("BOTTOMPADDING", (0, 0), (-1, -1), vertical_padding),
            ]
        )
    )
    if level is not None:
        heading.toc_level = level
        heading.toc_text = toc_text or re.sub(r"<[^>]+>", "", text)
    return heading


def index_subcategory_label(category_id: str, section_name: str) -> str | None:
    if category_id not in INDEX_REGIONAL_CATEGORY_IDS:
        return None
    return INDEX_SUBCATEGORY_LABELS.get((category_id, section_name))


def regional_group(
    category_id: str, section: dict[str, Any]
) -> tuple[str, str, bool] | None:
    group = REGIONAL_GROUP_STARTS.get(category_id, {}).get(section["name"], ...)
    if group is ...:
        return None
    if group is None:
        return section["name"], section.get("nameZh", ""), False
    return group[0], group[1], True


def category_flowables(
    category: dict[str, Any],
    styles: dict[str, ParagraphStyle],
    include_index_entries: bool,
) -> list[Any]:
    category_id = category.get("id")
    priority = category_id in PRIORITY_CATEGORY_IDS
    category_style = styles[
        "priority_category_title" if priority else "category_title"
    ]
    category_zh_style = styles[
        "priority_category_title_zh" if priority else "category_title_zh"
    ]
    section_style = styles["priority_section" if priority else "section"]
    section_zh_style = styles["priority_section_zh" if priority else "section_zh"]
    accent = BURGUNDY if priority else INK
    result: list[Any] = [
        toc_paragraph(
            escape(category["title"]),
            category_style,
            0 if include_index_entries else None,
        )
    ]
    if category.get("titleZh"):
        result.append(Paragraph(escape(category["titleZh"]), category_zh_style))
    result.append(Rule(17.0 * cm, accent, 0.8))
    result.append(Spacer(1, 0.08 * cm))
    price_layout = category.get("id")
    if price_layout == "c2":
        result.append(wine_by_glass_header(styles, BURGUNDY))
    elif price_layout == "c4":
        result.append(wine_by_glass_header(styles, INK))
    elif price_layout == "c17":
        result.append(half_bottle_header(styles))
    elif price_layout == "c18":
        result.append(large_format_header(styles))
    digestif_columns_active = False
    pending_headings: list[dict[str, Any]] = []
    for section_index, section in enumerate(category["sections"]):
        if not section["items"]:
            if section.get("headingOnly"):
                pending_headings.append(section)
            continue
        if (price_layout, section["name"]) in MANUAL_PAGE_BREAKS:
            result.append(PageBreak())
        if price_layout == "c2" and section_index:
            result.append(Spacer(1, 0.22 * cm))
        if price_layout == "c3" and section["name"] == "Digestives - Grappa":
            result.extend([Spacer(1, 0.16 * cm), digestif_header(styles)])
            digestif_columns_active = True
        group = regional_group(price_layout, section)
        heading = (
            escape(section["name"])
            if (not group or group[2]) and not section.get("hideHeading")
            else ""
        )
        section_name_zh = section.get("nameZh")
        if price_layout == "c4" and section["name"] == "THE RITZ-CARLTON HK SIGNATURE WHISKEY":
            if section_name_zh:
                heading += (
                    f"<br/><font name='{section_zh_style.fontName}'>"
                    f"{escape(section_name_zh)}</font>"
                )
        elif heading and section_name_zh:
            heading += f" <font name='{section_zh_style.fontName}'>{escape(section_name_zh)}</font>"
        section_heading = (
            framed_toc_heading(
                heading,
                section_style,
                GOLD,
                (
                    1
                    if include_index_entries
                    and not group
                    and index_subcategory_label(category.get("id", ""), section["name"])
                    else None
                ),
                index_subcategory_label(category.get("id", ""), section["name"])
                or section["name"],
            )
            if heading
            else None
        )
        regional_heading = None
        if group:
            group_name, group_name_zh, _ = group
            group_text = escape(group_name)
            if group_name_zh:
                group_text += (
                    f" <font name='{styles['regional_section_zh'].fontName}'>"
                    f"{escape(group_name_zh)}</font>"
                )
            index_label = index_subcategory_label(
                category.get("id", ""), section["name"]
            )
            regional_heading = framed_toc_heading(
                group_text,
                styles["regional_section"],
                GOLD,
                1 if include_index_entries and index_label else None,
                index_label or group_name,
                regional=True,
            )
        row_builder = {
            "c2": wine_by_glass_row,
            "c3": lambda item, row_styles: wine_row(item, row_styles, compact=True),
            "c4": lambda item, row_styles: wine_by_glass_row(
                item, row_styles, compact=True
            ),
            "c17": half_bottle_row,
            "c18": large_format_row,
        }.get(price_layout, wine_row)
        if (
            price_layout == "c20"
            and section["name"] in COMPACT_FRENCH_TAIL_SECTIONS
        ):
            row_builder = lambda item, row_styles: wine_row(
                item, row_styles, compact=True
            )
        if digestif_columns_active:
            row_builder = lambda item, row_styles: wine_by_glass_row(
                item, row_styles, compact=True
            )
        items: list[Any] = []
        for item in section["items"]:
            row = row_builder(item, styles)
            if (
                price_layout == "c2"
                and section["name"] == "White"
                and "Weingut Robert Weil" in item["name"]
            ):
                continuation_heading = framed_toc_heading(
                    heading, section_style, GOLD
                )
                items.append(KeepTogether([continuation_heading, row]))
            else:
                items.append(row)
        first_items = []
        for pending_heading in pending_headings:
            pending_text = escape(pending_heading["name"])
            if pending_heading.get("nameZh"):
                pending_text += (
                    f" <font name='{section_zh_style.fontName}'>"
                    f"{escape(pending_heading['nameZh'])}</font>"
                )
            first_items.append(
                framed_toc_heading(pending_text, section_style, GOLD)
            )
            first_items.append(Spacer(1, 0.12 * cm))
        pending_headings.clear()
        if regional_heading:
            first_items.append(regional_heading)
        if regional_heading and section_heading:
            first_items.append(Spacer(1, 0.12 * cm))
        if section_heading:
            first_items.append(section_heading)
        first_items.append(items[0])
        if regional_heading or section_heading:
            result.append(KeepTogether(first_items))
        else:
            result.append(items[0])
        result.extend(items[1:])
    if pending_headings:
        names = ", ".join(section["name"] for section in pending_headings)
        raise WineDataError(
            f"heading-only section(s) have no following wines in "
            f"{category.get('title', 'category')!r}: {names}"
        )
    return result


def create_index(styles: dict[str, ParagraphStyle]) -> list[Any]:
    contents = TableOfContents()
    contents.levelStyles = [
        ParagraphStyle(
            "IndexCategory",
            parent=styles["wine_bold"],
            fontSize=10.2,
            leading=14.5,
            leftIndent=0,
            firstLineIndent=0,
            textColor=INK,
        ),
        ParagraphStyle(
            "IndexSection",
            parent=styles["wine"],
            fontSize=9,
            leading=12,
            leftIndent=0.45 * cm,
            firstLineIndent=0,
            textColor=INK,
        ),
    ]
    contents.dotsMinLevel = -1
    return [
        Paragraph("Index", styles["index_title"]),
        Paragraph("目錄", styles["index_title_zh"]),
        Rule(17.0 * cm, INK, 0.8),
        Spacer(1, 0.18 * cm),
        contents,
    ]


def add_catalogue_pages(
    story: list[Any],
    data: list[dict[str, Any]],
    styles: dict[str, ParagraphStyle],
) -> None:
    catalogue = [category for category in data if category.get("id") != "c0"]
    story.extend([NextPageTemplate("catalogue"), PageBreak()])
    regional_catalogue_started = False
    for index, category in enumerate(catalogue):
        if category.get("id") == "c10":
            story.extend([NextPageTemplate("index"), PageBreak()])
            story.extend(create_index(styles))
            story.extend([NextPageTemplate("catalogue"), PageBreak()])
            regional_catalogue_started = True
        elif index:
            if category.get("id") == "c26":
                story.append(Spacer(1, 1.0 * cm))
            elif category.get("id") == "c4":
                story.append(Spacer(1, 0.38 * cm))
            else:
                story.append(PageBreak())
        flowables = category_flowables(
            category,
            styles,
            include_index_entries=regional_catalogue_started,
        )
        story.append(KeepTogether(flowables[:6]))
        story.extend(flowables[6:])


def draw_legal_footer(canvas: Any, document: BaseDocTemplate, include_page_number: bool) -> None:
    canvas.setFillColor(INK)
    canvas.setFont("WineBody", 7)
    canvas.drawCentredString(
        A4_WIDTH / 2,
        0.82 * cm,
        "All prices are in HK$ and subject to 10% service charge.",
    )
    canvas.drawCentredString(
        A4_WIDTH / 2,
        0.56 * cm,
        'All wines are inspected for quality. Wines priced over HK$10,000 are sold "AS-IS";',
    )
    canvas.drawCentredString(
        A4_WIDTH / 2,
        0.30 * cm,
        "no return or refund after the wine is opened.",
    )
    if include_page_number:
        canvas.drawRightString(A4_WIDTH - 1.7 * cm, 0.30 * cm, f"{document.page}")


def draw_page_header(
    canvas: Any, document: BaseDocTemplate, include_app_button: bool = False
) -> None:
    header_y = A4_HEIGHT - 1.17 * cm
    title = "TIN LUNG HEEN  |  MASTER WINE LIST"
    canvas.setFillColor(INK)
    canvas.setFont("WineBody", 7)
    canvas.drawString(1.7 * cm, header_y, f"{document.wine_count} selections")
    canvas.drawRightString(
        A4_WIDTH - 1.7 * cm,
        header_y,
        f"Updated {document.updated_date}",
    )
    canvas.setFont("WineBodyBold", 8.5)
    canvas.drawCentredString(A4_WIDTH / 2, header_y, title)
    if include_app_button:
        button_width, button_height = 0.95 * cm, 0.40 * cm
        button_x = (
            A4_WIDTH / 2
            + pdfmetrics.stringWidth(title, "WineBodyBold", 8.5) / 2
            + 0.12 * cm
        )
        button_y = header_y - 0.14 * cm
        canvas.setFillColor(GOLD)
        canvas.roundRect(
            button_x,
            button_y,
            button_width,
            button_height,
            2,
            fill=1,
            stroke=0,
        )
        canvas.setFillColor(INK)
        canvas.setFont("WineBodyBold", 6.5)
        canvas.drawCentredString(
            button_x + button_width / 2,
            button_y + 3.1,
            "APP",
        )
        canvas.linkURL(
            document.app_url,
            (button_x, button_y, button_x + button_width, button_y + button_height),
            thickness=0,
        )


def feature_footer(canvas: Any, document: BaseDocTemplate) -> None:
    canvas.saveState()
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, A4_WIDTH, A4_HEIGHT, fill=1, stroke=0)
    canvas.setStrokeColor(INK)
    canvas.setLineWidth(0.75)
    canvas.line(1.7 * cm, A4_HEIGHT - 1.45 * cm, A4_WIDTH - 1.7 * cm, A4_HEIGHT - 1.45 * cm)
    draw_page_header(canvas, document, include_app_button=True)
    draw_legal_footer(canvas, document, include_page_number=True)
    canvas.restoreState()


def catalogue_header(canvas: Any, document: BaseDocTemplate) -> None:
    canvas.saveState()
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, A4_WIDTH, A4_HEIGHT, fill=1, stroke=0)
    canvas.setStrokeColor(INK)
    canvas.setLineWidth(0.75)
    canvas.line(1.7 * cm, A4_HEIGHT - 1.45 * cm, A4_WIDTH - 1.7 * cm, A4_HEIGHT - 1.45 * cm)
    draw_page_header(canvas, document)
    draw_legal_footer(canvas, document, include_page_number=True)
    canvas.restoreState()


def build_pdf(
    data: list[dict[str, Any]],
    asset_root: Path,
    output_path: Path,
    fonts: Fonts,
    wine_count: int,
    updated_date: str,
    app_url: str,
) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    styles = paragraph_styles(fonts)
    feature_frame = Frame(
        1.7 * cm, 1.1 * cm, A4_WIDTH - 3.4 * cm, A4_HEIGHT - 2.2 * cm, id="feature"
    )
    catalogue_frame = Frame(
        1.7 * cm, 1.35 * cm, A4_WIDTH - 3.4 * cm, A4_HEIGHT - 3.0 * cm, id="catalogue"
    )
    document = WineListDocument(
        str(output_path),
        pagesize=A4,
        pageTemplates=[
            PageTemplate(id="feature", frames=[feature_frame], onPage=feature_footer),
            PageTemplate(id="catalogue", frames=[catalogue_frame], onPage=catalogue_header),
            PageTemplate(id="index", frames=[catalogue_frame], onPage=catalogue_header),
        ],
        title="Tin Lung Heen Master Wine List",
        author="Tin Lung Heen",
        subject="Customer wine list",
    )
    document.wine_count = wine_count
    document.updated_date = updated_date
    document.app_url = app_url
    story: list[Any] = []
    add_feature_page(story, first_feature(data), asset_root, styles)
    add_catalogue_pages(story, data, styles)
    document.multiBuild(story)


def main() -> None:
    args = parse_args()
    try:
        data = load_wine_data(args.data)
        fonts = register_fonts(args.cjk_font)
        wine_count = count_distinct_wines(data)
        updated_date = updated_date_for_file(args.data)
        build_pdf(
            data,
            args.asset_root,
            args.output,
            fonts,
            wine_count,
            updated_date,
            args.app_url,
        )
    except WineDataError as error:
        print(f"PDF generation failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error

    print(
        f"Generated {args.output} from {args.data} "
        f"({wine_count} selections, updated {updated_date})."
    )


if __name__ == "__main__":
    main()
