#!/bin/bash
set -e

cd "$(dirname "$0")/.."

python3 tools/generate_wine_list_pdf.py
python3 tools/check_wine_list_pdf.py TLH-Master-Wine-List.pdf
open TLH-Master-Wine-List.pdf

printf '\nWine list updated and opened successfully.\n'
read -r -p 'Press Return to close this window...'
