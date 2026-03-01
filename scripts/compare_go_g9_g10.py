import pdfplumber

def get_text(path):
    pages = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            pages.append(page.extract_text() or "")
    return pages

g9_pages = get_text('D:/CronoINTERNATO/cronoped/go_g9.pdf')
g10_pages = get_text('D:/CronoINTERNATO/cronoped/go_g10.pdf')

print("G9 pages:", len(g9_pages))
for i, p in enumerate(g9_pages):
    print(f"=== G9 PAGE {i+1} ===")
    print(p)

print()
print("G10 pages:", len(g10_pages))
for i, p in enumerate(g10_pages):
    print(f"=== G10 PAGE {i+1} ===")
    print(p)
