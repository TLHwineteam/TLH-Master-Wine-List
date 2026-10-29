#!/usr/bin/env python3
"""Perform deterministic structural checks on a generated wine-list PDF."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

from pypdf import PdfReader

from generate_wine_list_pdf import (
    DEFAULT_APP_URL,
    WineDataError,
    count_distinct_wines,
    load_wine_data,
    updated_date_for_file,
)


def fail(message: str) -> None:
    print(f"PDF validation failed: {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Check the structure and live metadata in a generated wine-list PDF."
    )
    parser.add_argument("pdf_path", type=Path)
    parser.add_argument(
        "--data",
        type=Path,
        default=Path("data/wines.js"),
        help="source JavaScript data file (default: data/wines.js)",
    )
    parser.add_argument(
        "--app-url",
        default=DEFAULT_APP_URL,
        help=f"expected target for the first-page APP button (default: {DEFAULT_APP_URL})",
    )
    args = parser.parse_args()

    path = args.pdf_path
    if not path.is_file() or path.stat().st_size == 0:
        fail(f"missing or empty output: {path}")

    try:
        wine_data = load_wine_data(args.data)
        expected_count = count_distinct_wines(wine_data)
        expected_date = updated_date_for_file(args.data)
    except WineDataError as error:
        fail(str(error))

    reader = PdfReader(str(path))
    if not reader.pages:
        fail("document has no pages")

    first_page = reader.pages[0]
    width = float(first_page.mediabox.width)
    height = float(first_page.mediabox.height)
    if abs(width - 595.28) > 1 or abs(height - 841.89) > 1:
        fail(f"first page is not A4 portrait ({width:.2f} x {height:.2f} pt)")
    first_page_text = first_page.extract_text() or ""
    if "APP" not in first_page_text:
        fail("first page is missing the APP button")
    app_link_found = False
    for annotation_reference in first_page.get("/Annots", []):
        annotation = annotation_reference.get_object()
        action = annotation.get("/A")
        if action and action.get("/URI") == args.app_url:
            app_link_found = True
            break
    if not app_link_found:
        fail(f"first page APP button does not link to {args.app_url}")

    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    for expected in (
        "Wine of The Month",
        "1982",
        "National Day Selection",
        "Index",
        "All prices are in HK$",
        "Sparkling Wine",
        "Lou Dumont",
        "Disgorged 2026",
        "$7,880",
    ):
        if expected not in text:
            fail(f"expected text not found: {expected!r}")
    for page_number, page in enumerate(reader.pages, start=1):
        page_text = page.extract_text() or ""
        for expected in (f"{expected_count} selections", f"Updated {expected_date}"):
            if expected not in page_text:
                fail(f"page {page_number} is missing metadata: {expected!r}")

    index_start = next(
        (
            page_number
            for page_number, page in enumerate(reader.pages)
            if "Index" in (page.extract_text() or "")
            and "目錄" in (page.extract_text() or "")
        ),
        None,
    )
    if index_start is None:
        fail("document must contain an index")
    index_pages = []
    for page in reader.pages[index_start:]:
        page_text = page.extract_text() or ""
        if re.search(r"(?m)^(?:NV|\d{4})\s+", page_text):
            break
        index_pages.append(page_text)
    index_lines = [
        line.strip()
        for line in "\n".join(index_pages).splitlines()
        if line.strip()
    ]
    index_order = (
        "Champagne - Connoisseur Collections",
        "Champagne",
        "Italian Sparkling",
        "Sparkling Wine",
        "White Wines - France",
        "White Wines - Italy",
        "White Wines - Europe",
        "White Wines - China",
        "White Wines - International",
        "Red Wines - France",
        "Red Wines - Italy",
        "Red Wines - Europe",
        "Red Wines - China",
        "Red Wines - International",
    )
    try:
        index_positions = [index_lines.index(title) for title in index_order]
    except ValueError as error:
        fail(f"index is missing a requested category: {error}")
    if index_positions != sorted(index_positions):
        fail("index categories are not in the requested order")
    if "Ritz Cuvée" in index_lines:
        fail("Ritz Cuvée must be nested under Champagne, not a separate category")

    if len(reader.pages) < 26:
        fail("document is missing page 26")
    sparkling_page = reader.pages[25].extract_text() or ""
    for wine in ("Sparkling Wine", "Clément Klur", "Lou Dumont", "Silver Heights"):
        if wine not in sparkling_page:
            fail(f"page 26 must contain the Sparkling Wine category and {wine}")

    champagne_pages = []
    for page in reader.pages:
        page_text = page.extract_text() or ""
        if "RITZ CUVÉE" in page_text and "NON-VINTAGE" in page_text:
            champagne_pages.append(page_text)
    if len(champagne_pages) != 1:
        fail("Champagne page must contain Ritz Cuvée and Non-Vintage sections")
    ritz_heading = champagne_pages[0].find("RITZ CUVÉE")
    non_vintage_heading = champagne_pages[0].find("NON-VINTAGE")
    if ritz_heading < 0 or ritz_heading >= non_vintage_heading:
        fail("Ritz Cuvée must appear above Non-Vintage in Champagne")

    magnums_pages = []
    for page in reader.pages:
        page_text = page.extract_text() or ""
        if "Large Formats" in page_text and "\n Price\n Format" in page_text:
            magnums_pages.append(page_text)
    if len(magnums_pages) != 1:
        fail("document must contain one Large Formats page")
    magnums_page = magnums_pages[0]
    red_heading = magnums_page.find("RED WINES")
    france_heading = magnums_page.find("FRANCE")
    if red_heading < 0 or france_heading < 0 or red_heading >= france_heading:
        fail("Large Formats page must show RED WINES above FRANCE")

    print(
        f"PDF validation passed: {path} "
        f"({len(reader.pages)} A4 pages, {path.stat().st_size:,} bytes)"
    )


if __name__ == "__main__":
    main()
