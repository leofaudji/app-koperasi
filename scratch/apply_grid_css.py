import re

# 1. Update assets/css/app.css
css_path = r"assets/css/app.css"
with open(css_path, "r", encoding="utf-8") as f:
    css_content = f.read()

grid_css = """
/* ===== Table Accounting Grid Styles (Zebra, Bordered Grid, Minimal) ===== */

/* 1. Zebra Striping (Belang Selang-Seling Baris Akuntansi) */
body.table-grid-zebra .data-table tbody tr:nth-child(even),
body.table-grid-zebra table.data-table tbody tr:nth-child(even),
body.table-grid-zebra #bb-table tbody tr:nth-child(even),
body.table-grid-zebra #jrn-table tbody tr:nth-child(even),
body.table-grid-zebra #bs-table tbody tr:nth-child(even),
body.table-grid-zebra #kas-table tbody tr:nth-child(even),
body[data-table-grid="zebra"] .data-table tbody tr:nth-child(even),
body[data-table-grid="zebra"] table.data-table tbody tr:nth-child(even),
.preview-table-wrap.table-grid-zebra table tbody tr:nth-child(even) {
    background-color: #f8fafc !important;
}

body.table-grid-zebra .data-table tbody tr:nth-child(odd),
body.table-grid-zebra table.data-table tbody tr:nth-child(odd),
body[data-table-grid="zebra"] .data-table tbody tr:nth-child(odd),
.preview-table-wrap.table-grid-zebra table tbody tr:nth-child(odd) {
    background-color: #ffffff;
}

body.table-grid-zebra .data-table tbody tr:hover,
body.table-grid-zebra table.data-table tbody tr:hover,
body[data-table-grid="zebra"] .data-table tbody tr:hover,
.preview-table-wrap.table-grid-zebra table tbody tr:hover {
    background-color: rgba(16, 185, 129, 0.08) !important;
}

/* 2. Full Accounting Bordered Grid (Buku Kas & Excel Spreadsheet Style) */
body.table-grid-bordered .data-table,
body.table-grid-bordered table.data-table,
body.table-grid-bordered #bb-table,
body.table-grid-bordered #jrn-table,
body.table-grid-bordered #bs-table,
body.table-grid-bordered #kas-table,
body[data-table-grid="bordered"] .data-table,
.preview-table-wrap.table-grid-bordered table {
    border-collapse: collapse !important;
    border: 1px solid #cbd5e1 !important;
}

body.table-grid-bordered .data-table thead th,
body.table-grid-bordered table.data-table thead th,
body.table-grid-bordered #bb-table thead th,
body.table-grid-bordered #jrn-table thead th,
body.table-grid-bordered #bs-table thead th,
body.table-grid-bordered #kas-table thead th,
body[data-table-grid="bordered"] .data-table thead th,
.preview-table-wrap.table-grid-bordered table thead th {
    border: 1px solid #cbd5e1 !important;
    background-color: #f1f5f9 !important;
    color: #1e293b !important;
    font-weight: 700 !important;
}

body.table-grid-bordered .data-table tbody td,
body.table-grid-bordered table.data-table tbody td,
body.table-grid-bordered #bb-table tbody td,
body.table-grid-bordered #jrn-table tbody td,
body.table-grid-bordered #bs-table tbody td,
body.table-grid-bordered #kas-table tbody td,
body[data-table-grid="bordered"] .data-table tbody td,
.preview-table-wrap.table-grid-bordered table tbody td {
    border: 1px solid #e2e8f0 !important;
}

body.table-grid-bordered .data-table tbody tr:nth-child(even),
body[data-table-grid="bordered"] .data-table tbody tr:nth-child(even),
.preview-table-wrap.table-grid-bordered table tbody tr:nth-child(even) {
    background-color: #fcfdfe;
}

body.table-grid-bordered .data-table tbody tr:hover,
body[data-table-grid="bordered"] .data-table tbody tr:hover,
.preview-table-wrap.table-grid-bordered table tbody tr:hover {
    background-color: rgba(16, 185, 129, 0.08) !important;
}

/* 3. Minimal Clean Grid (Horizontal Hairline Only) */
body.table-grid-minimal .data-table thead th,
body[data-table-grid="minimal"] .data-table thead th,
.preview-table-wrap.table-grid-minimal table thead th {
    border: none !important;
    border-bottom: 2px solid #e2e8f0 !important;
    background-color: transparent !important;
}

body.table-grid-minimal .data-table tbody td,
body[data-table-grid="minimal"] .data-table tbody td,
.preview-table-wrap.table-grid-minimal table tbody td {
    border: none !important;
    border-bottom: 1px solid #f1f5f9 !important;
    background-color: transparent;
}

body.table-grid-minimal .data-table tbody tr:hover,
body[data-table-grid="minimal"] .data-table tbody tr:hover,
.preview-table-wrap.table-grid-minimal table tbody tr:hover {
    background-color: #f8fafc !important;
}
"""

if "/* ===== Table Accounting Grid Styles" not in css_content:
    css_content += "\n" + grid_css
    with open(css_path, "w", encoding="utf-8") as f:
        f.write(css_content)
    print("app.css updated with accounting grid styles.")
else:
    print("app.css already has grid styles.")

