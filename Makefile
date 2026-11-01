.PHONY: pdf pdf-check pdf-update

pdf:
	python3 tools/generate_wine_list_pdf.py

pdf-check:
	python3 tools/check_wine_list_pdf.py TLH-Master-Wine-List.pdf

pdf-update: pdf pdf-check
