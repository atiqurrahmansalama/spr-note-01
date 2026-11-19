# SPR Note DocLab — Authoritative Export Architecture & Fidelity Standard

## 1. Core Principle: Zero Secondary Pagination

In SPR Note DocLab, **no exporter may invent a second pagination algorithm or silently repaginate a document differently from the screen**.

All multi-page export formats (PDF, Print, Multi-page Images, Multi-page SVG, DOCX Page Adapters) consume the authoritative `LayoutDocument` produced by `PaginationEngine`.

```
                  ┌───────────────────────────────┐
                  │    CanonicalDocument (AST)    │
                  └───────────────┬───────────────┘
                                  │
                                  ▼
                  ┌───────────────────────────────┐
                  │       PaginationEngine        │
                  └───────────────┬───────────────┘
                                  │
                                  ▼
                  ┌───────────────────────────────┐
                  │        LayoutDocument         │
                  │   (Pages, Fragments, Chrome)  │
                  └───────────────┬───────────────┘
                                  │
        ┌─────────────┬───────────┼───────────┬─────────────┐
        │             │           │           │             │
        ▼             ▼           ▼           ▼             ▼
  ┌───────────┐ ┌───────────┐ ┌─────────┐ ┌────────┐ ┌──────────────┐
  │  Screen   │ │  Browser  │ │ Vector  │ │ Discrete││  Document    │
  │  Preview  │ │   Print   │ │   PDF   │ │ Images │ │   Adapters   │
  │(Renderer) │ │  (@page)  │ │ (jsPDF) │ │(300DPI)│ │  (DOCX/SVG)  │
  └───────────┘ └───────────┘ └─────────┘ └────────┘ └──────────────┘
```

---

## 2. Export Target Matrix & Honest Fidelity Contracts

| Export Target | Source Authority | Processing Subsystem | Fidelity Guarantee & Honest Contract |
| :--- | :--- | :--- | :--- |
| **Screen / Live Preview** | `LayoutDocument` | `LayoutDocumentRenderer` / `PaginatedDocumentEditor` | **Authoritative Ground Truth.** 1:1 visual canvas with responsive paper styling and viewport virtualization. |
| **Browser Print Dialog** | `LayoutDocument` | Browser `@page` Print CSS (`docLabExportUtils.ts`) | **Direct DOM Print.** Consumes `.paper-sheet` elements with CSS `page-break-after: always;` and exact `@page` size & margin rules. |
| **Vector PDF** | `LayoutDocument` | `compileLayoutDocumentToPDF` (`vectorPDFCompiler.ts`) | **Multi-Page Structured PDF.** Consumes `layoutDoc.pages` directly. Exactly 1 PDF page per `LayoutPage`. Exact header, footer, page number (`Page X of Y`), watermark, and signature block positioning. Zero repagination. |
| **OpenXML Word (.docx)** | `CanonicalDocument` & `LayoutDocument` | `vectorDocxCompiler.ts` | **Semantic Document & Page Adapter.** Translates AST nodes into OpenXML paragraphs, headings, tables, and runs. Inserts `<w:br w:type="page"/>` at layout page boundaries. *Note: Desktop Word renders text using local OS font metrics, but explicit page breaks preserve document segmentation.* |
| **High-Res Images (PNG/JPG)** | `LayoutDocument` | `exportLayoutDocumentToImages` (`docLabExportUtils.ts`) | **High-Density Rasterization (300+ DPI).** Renders each `.paper-sheet` element to a distinct lossless image file. Page count and layout fragments match screen 1:1. |
| **Vector SVG (.svg)** | `LayoutDocument` | `exportLayoutDocumentToSVG` (`docLabExportUtils.ts`) | **Best-Effort Vector Wrapper.** Generates standalone SVG documents wrapping layout page HTML via SVG `<foreignObject>` and embedded document stylesheets. |
| **Tabular Excel / CSV (.csv)** | Tabular Data Model | `exportToExcel` (`docLabExportUtils.ts`) | **Raw Data Ledger.** UTF-8 with BOM for Excel compatibility. Exports raw columns, filtered rows, and summary metrics (Mode E). |
| **Plain Text (.txt)** | Tabular Data Model | `exportToPlainText` (`docLabExportUtils.ts`) | **ASCII Tabular Grid.** Monospace aligned text table for lightweight summaries (Mode E). |

---

## 3. Invariants & Guarantees

1. **Deterministic Page Parity:**
   - If a document is paginated into 3 pages on screen, `compileLayoutDocumentToPDF` generates exactly 3 pages.
   - `exportLayoutDocumentToImages` outputs exactly 3 image files.
   - Browser Print prints exactly 3 physical sheets.

2. **No Divergent Pagination Code in Exporters:**
   - Exporters must not calculate line wraps or row breaks to invent new page splits.
   - All spatial decisions are resolved upstream by `PaginationEngine`.

3. **Page Chrome Alignment:**
   - Running headers and footers use real geometric space reserved in `PageGeometry`.
   - Running footers in PDF and Print dynamically reflect `Page ${page.pageNumber} of ${totalPages}` matching the computed `LayoutDocument`.
