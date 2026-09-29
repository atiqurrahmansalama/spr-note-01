# SPR Note DocLab — Authoritative 6-Mode Architecture Matrix

## Overview & Core Architectural Invariants

DocLab operates on a strictly partitioned **6-Mode Matrix**. Each mode has an authoritative lifecycle, dedicated rendering pipeline, isolated persistence model, and distinct pagination subsystem. **No mode ever bleeds or borrows pagination heuristics from another mode.**

---

## The 6-Mode Matrix Table

| Mode | Name | Editable? | Interactive? | Pagination Subsystem | Rendering Subsystem | Persistence Format | Viewport Virtualization |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- | :--- |
| **MODE A** | **Template Editing** | **YES** | **YES** | `PaginationEngine` (Live Reflow) | `PaginatedDocumentEditor` | `CanonicalDocument` AST | **Disabled** (Protects selection & host) |
| **MODE B** | **Read-Only Preview** | **NO** | **NO** | `PaginationEngine` | `LayoutDocumentRenderer` | `CanonicalDocument` AST | **Active** (60 FPS for 100+ pages) |
| **MODE C** | **Generated Single Document** | **NO** | **NO** | `PaginationEngine` (Downstream) | `LayoutDocumentRenderer` | `CanonicalDocument` AST | **Active** (Downstream from data merge) |
| **MODE D** | **Batch Generated Documents** | **NO** | **NO** | `PaginationEngine` (Per-Record) | `LayoutDocumentRenderer` | `BatchDocumentPackage` | **Active** (Independent record layouts) |
| **MODE E** | **Native Tabular Report** | **NO** | **YES** | `usePrintPagination` | `DocLabTableRenderer` | `TabularConfig` & rows | **Disabled** (Discrete row-height math) |
| **MODE F** | **External Custom JSX Sheet** | **NO** | **YES** | **None** (Self-contained) | `CustomJsxContainer` | Custom React JSX | **Disabled** (Isolated sandbox) |

---

## Detailed Specifications per Mode

### MODE A — Template Editing
- **Primary Component:** `PaginatedDocumentEditor.tsx`
- **Editing Host:** Exactly **ONE** single logical editing host (`contenteditable="true"` container).
- **Data Flow:**
  $$\text{User Types} \rightarrow \text{EditorTransaction} \rightarrow \text{CanonicalDocument AST} \rightarrow \text{PaginationEngine} \rightarrow \text{Visual Page Projection}$$
- **Virtualization Policy:** **Strictly Disabled**. Unmounting distant sheets would destroy the user's cursor position, text selection, and undo history.
- **Persistence:** Stores clean `CanonicalDocument` AST with semantic `ManualPageBreakNode` markers only (zero runtime DOM spacers).

### MODE B — Read-Only Preview
- **Primary Component:** `LayoutDocumentRenderer.tsx`
- **Data Flow:**
  $$\text{CanonicalDocument AST} \rightarrow \text{PaginationEngine} \rightarrow \text{LayoutDocument} \rightarrow \text{LayoutDocumentRenderer}$$
- **Virtualization Policy:** **Active** via `VirtualPageViewport`. Mounts only visible sheets + 2-page overscan buffers, maintaining fluid 60 FPS scrolling on 50–100+ page documents.
- **Printing Invariant:** Automatically suspends virtualization on `beforeprint` to render all pages to the print dialog and PDF compiler.

### MODE C — Generated Single Document
- **Primary Pipeline:** `TemplateMergeEngine.mergeDocument()`
- **Data Flow:**
  $$\text{Template AST} + \text{ERP Data} \rightarrow \text{Merged CanonicalDocument AST} \rightarrow \text{PaginationEngine} \rightarrow \text{LayoutDocument}$$
- **Decoupling Rule:** Data substitution happens **FIRST** at the AST level and **NEVER** generates page breaks or page HTML slices.

### MODE D — Batch Generated Documents
- **Primary Model:** `BatchDocumentPackage` (`BatchDocumentItem[]`)
- **Data Flow:**
  $$\text{Batch Data} \rightarrow \text{BatchDocumentPackage} \rightarrow \text{Independent Per-Record Pagination} \rightarrow \text{Discrete Layout Sheets}$$
- **No Page HTML Arrays:** Multi-record batch documents are represented as typed collections of continuous `CanonicalDocument` ASTs, eliminating legacy `pages.join('<!-- spr-page-break -->')`.

### MODE E — Native Tabular Report
- **Primary Components:** `usePrintPagination.ts`, `DocLabTableRenderer.tsx`, `DocLabDocumentWrapper.tsx`
- **Pagination Subsystem:** Strict row-count calculation based on table density, row heights, and summary metrics.
- **Isolation Invariant:** Tabular reporting remains an isolated ledger engine. It never invokes freeform HTML paragraph fragmentation.

### MODE F — External Custom JSX Sheet
- **Primary Target:** Institutional ID cards, custom multi-layer certificates, specialized barcode passes.
- **Subsystem:** Completely isolated from freeform layout engines. Renders children JSX within standard physical sheet wrappers.

---

## Subsystem Boundary Guarantees

1. **Zero Cross-Mode Bleeding:**
   - Freeform document modes (A, B, C, D) never use `usePrintPagination`.
   - Tabular mode (E) never uses `PaginationEngine` or DOM fragmenters.
   - Custom JSX mode (F) never touches AST serialization.
2. **Clean Storage Invariant:**
   - Saved templates and generated documents persist pure logical representations.
   - All visual page breaks on screen are runtime layout projections produced downstream by `PaginationEngine`.
