# Wine-list PDF generation

The PDF is generated from the same `data/wines.js` that powers the web app. It
does not scrape the browser or depend on the interactive UI, so it is suitable
for repeatable, print-ready customer copies.

The web app and generated PDF show the same deduplicated selection count.
Repeated listings are counted once by wine identity and vintage, while half
bottles and large formats count separately; glass and carafe service sizes do
not count as separate bottles. Both display the wine-data update date in
**Hong Kong time (UTC+8)**, not the visitor's time zone or the current date.
Generation saves the source file's modification timestamp as
`window.WINE_DATA_UPDATED_AT` at the top of `data/wines.js`, preserving the
file's original modification time. Repeating generation without editing the
data therefore keeps the same update date. The app reads this saved timestamp
without a network request, including when opened locally or on a static host
without a `Last-Modified` header. Older data files without this metadata still
use the server header when available.

The app's **PDF** button opens `TLH-Master-Wine-List.pdf` in the same tab.
The first PDF page includes an **APP** button linking back to the deployed app.
The generated PDF must be included in the published site. The default app link
is `https://tlhwineteam.github.io/TLH-Master-Wine-List/?from=pdf`. The
`from=pdf` parameter lets the app skip its welcome cover on PDF returns. Use
`--app-url` with both the generator and checker if the deployment URL changes.

## Setup

Use Python 3.9 or later and install the pinned PDF dependencies:

```sh
python3 -m pip install -r requirements.txt
```

## Generate

Run either command from the repository root after changing `data/wines.js`:

```sh
python3 tools/generate_wine_list_pdf.py
# or
make pdf
```

For a no-Copilot update, a colleague can use either of these two approaches:

1. Edit and save `data/wines.js`.
2. In Terminal, run `make pdf-update`. This generates and validates the PDF
   in one command.

On macOS, after the one-time setup, they can instead double-click
`scripts/generate-wine-list.command`. It generates, validates, and opens the
finished PDF automatically. If macOS blocks it the first time, Control-click
the file, select **Open**, then confirm. The generated customer file is always
`TLH-Master-Wine-List.pdf` in the repository root.

Publish the regenerated `data/wines.js` together with
`TLH-Master-Wine-List.pdf` after each wine-data update so the app and PDF share
the same saved date.

The default output is `TLH-Master-Wine-List.pdf`. It can be changed with
`--output`, and the source data can be changed with `--data`. Relative image
paths in a wine record are resolved from the repository root by default; set
`--asset-root` when generating from another project directory.

```sh
python3 tools/generate_wine_list_pdf.py \
  --data data/wines.js \
  --asset-root . \
  --app-url https://example.com/wine-list/ \
  --output dist/customer-wine-list.pdf
```

The generator validates the `window.WINE_DATA = [...]` assignment before
building the PDF and fails with a clear error when a category, section, or wine
record is malformed.

## Assets and fonts

The Wine of the Month page uses the image path specified by that wine's
`image` field. Relative image paths are resolved from `--asset-root`, so the
current `images/cos1982-magnum.png` is picked up
automatically. When an image is unavailable, the feature-page layout is
preserved with a blank image area rather than failing late in PDF rendering.
Available Wine of the Month images are shown within a thin gold frame.

English text uses ReportLab's bundled Vera fonts, which are embedded in the
document. Chinese text defaults to the PDF CJK font `STSong-Light`, keeping
the generator portable without committing a commercial font. For fully
embedded Chinese glyphs, provide a licensed TrueType CJK font:

```sh
python3 tools/generate_wine_list_pdf.py \
  --cjk-font /path/to/licensed-cjk-font.ttf
```

## Check the output

```sh
make pdf-check
```

The check verifies that the PDF exists, is A4, has pages, contains the wine-list
and wine-of-the-month text, and displays the current deduplicated selection
count and source update date. It is structural validation, not a substitute for
visually inspecting a customer-facing revision.

## Layout and pagination

The first page uses the same warm paper treatment as the catalogue, with a
burgundy wine-of-the-month masthead, centred bottle, bilingual title and
description, price stack, and legal footer. The remaining list is a compact, paginated
catalogue with aligned wine-and-price columns to accommodate the complete live
data set. Wine rows use the full printable width and larger type for
phone-friendly reading. Every page, including Wine of the Month, displays the
selection count and `Updated` date in its repeating header, and has a footer
page number. The National Day Selection follows the Wine of the Month, and a
live two-page page-number index is inserted before the regional catalogue. The
index lists top-level categories plus broad regional anchors (such as Tuscany,
Bordeaux, Burgundy, Germany, and Spain), alongside curated grape-style groups
for International Wines. It excludes smaller appellations, producer, and
estate highlights that are already visually distinct within the catalogue.
Index entries use aligned page numbers without dotted leaders. Categories
normally start on a new page, with Whiskies permitted to follow the final
Digestifs entries when that prevents a sparse continuation page.
Cocktails/Digestives and Whiskies use a denser row treatment to avoid nearly
empty continuation pages. The catalogue is black, except for
burgundy headings and dividers used to distinguish National Day Selection,
Wine by the Glass, Premium Collection, and Sommelier Selection, as well as the
Wine of the Month page.

Regional catalogues use three levels of navigation: category titles, larger
regional headings, and smaller local appellation or producer headings. Regional
and local headings use enlarged type, warm paper fills, and thin gold
picture-frame rules for clearer scanning on screen and in print. For example,
Burgundy is displayed above Chablis and other Burgundian appellations, while
Bordeaux, Loire Valley, and Rhone Valley use the larger regional style.

The default catalogue typography is tuned for reading full A4 pages on an
11–13 inch iPad: wine names, Chinese translations, prices, hierarchy headings,
index entries, feature-page copy, and footers all use an enlarged tablet scale.

Pricing is formatted from each wine's existing `price` string. Mixed service
formats such as `Glass $388 · Bottle $1,980` are rendered as separate stacked
lines. Wine by the Glass is recognized as a shared-format category and uses
one `Glass` / `Bottle` column header with aligned numeric values below it;
non-standard glass sizes remain shown beneath the applicable glass price.
Whiskies use the same shared Glass/Bottle column treatment. Half Bottles show
the same shared `Price` and `Format` columns as Large Formats, displaying
their 375 ml format beside the price.
The digestif Grappa and Brandy & Cognac sections likewise share one
Glass/Bottle heading. Long Latin cuvée names inside Chinese quotation marks
are kept together to prevent broken words in narrow rows; all Latin text
within Chinese translations uses the embedded Latin font so accented names
remain legible.

Cocktails and mocktails may supply optional `ingredients` and `ingredientsZh`
fields. When present, both ingredient lists are rendered directly beneath the
drink name in both the PDF and the smart wine list, without affecting regular
wine entries. Whiskies are
allowed to continue after the final digestif entries when that avoids a sparse
spirits page.

The three alcohol-removed wines appear only under Wine by the Glass; they are
intentionally excluded from Beers & Beverages to avoid duplicate listings.

The generated source data is aligned to the supplied **20 October 2026**
reference list, with only the explicitly requested alcohol-removed and Terra
Costantino entries excluded.

The exact reference display typeface and label artwork are not included in
this repository, so the generator uses licensed/runtime-safe font fallbacks
and the supplied bottle image.
