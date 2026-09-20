/* global process */
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "C:/Users/dovbe/Documents/Cinderblock FE Prototype";
const SKILL_DIR = "C:/Users/dovbe/.codex/plugins/cache/openai-primary-runtime/presentations/26.909.12148/skills/presentations";
const RUNTIME_PYTHON = "C:/Users/dovbe/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe";
const buildDir = path.join(workspaceDir, ".codex-presentations/contract-billing-handoff");
const stagingDir = path.join(buildDir, "finalizer");
const outputDir = path.join(workspaceDir, "output/presentations");
const FINAL_PPTX = path.join(outputDir, "cinderblock-contract-billing-dev-handoff-presentation-terminology-update-v2.pptx");

await fs.mkdir(stagingDir, { recursive: true });
await fs.mkdir(outputDir, { recursive: true });

const { finalizePresentation } = await import(pathToFileURL(
  path.join(SKILL_DIR, "container_tools/artifact_tool_utils.mjs"),
).href);

const deck = Presentation.create({ slideSize: { width: 1280, height: 720 } });
const FONT = "Segoe UI";
const C = {
  ink: "#142638",
  ink2: "#41566B",
  muted: "#6F7F8E",
  line: "#D8E0E7",
  paper: "#F7F6F2",
  white: "#FFFFFF",
  blue: "#2F6FED",
  blueSoft: "#E9F0FF",
  teal: "#168676",
  tealSoft: "#E6F4F1",
  orange: "#D4762C",
  orangeSoft: "#FCEEDF",
  red: "#BF4E4E",
  redSoft: "#FAEAEA",
  green: "#1F7A52",
  greenSoft: "#E8F4ED",
  gold: "#A16A12",
};

const sourceNotes = {
  core: "Sources: docs/contract-billing-business-rules.md; docs/contract-billing-financial-spec.md; docs/contract-lifecycle-prototype.md.",
  progress: "Sources: docs/progress-invoices-prototype.md; docs/contract-invoices-prototype.md; docs/contract-billing-business-rules.md.",
  co: "Sources: docs/change-orders-requirements.md; docs/contract-billing-business-rules.md.",
  retainage: "Sources: docs/retainage-prototype.md; docs/contract-billing-business-rules.md.",
  schedule: "Sources: docs/payment-schedule-prototype.md; docs/contract-billing-business-rules.md.",
  qbo: "Source: docs/quickbooks-online-sync-requirements.md.",
};

function addBox(slide, x, y, w, h, fill = "none", line = "none", radius = "roundRect") {
  return slide.shapes.add({
    geometry: radius,
    position: { left: x, top: y, width: w, height: h },
    fill: fill === "none" ? "none" : fill,
    line: line === "none" ? { fill: "none", width: 0 } : { fill: line, width: 1 },
  });
}

function addText(slide, text, x, y, w, h, opts = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.style = {
    typeface: FONT,
    fontSize: opts.size ?? 22,
    bold: opts.bold ?? false,
    color: opts.color ?? C.ink,
    alignment: opts.align ?? "left",
    verticalAlignment: opts.valign ?? "top",
    autoFit: opts.autoFit ?? "none",
  };
  return shape;
}

function addLine(slide, x, y, w, color = C.line, width = 1) {
  return slide.shapes.add({
    geometry: "line",
    position: { left: x, top: y, width: w, height: 0 },
    fill: "none",
    line: { fill: color, width },
  });
}

function addFooter(slide, n, dark = false) {
  addText(slide, "CINDERBLOCK  /  DEV HANDOFF", 64, 684, 420, 18, {
    size: 11, color: dark ? "#B7C5D4" : C.muted, bold: true,
  });
  addText(slide, String(n).padStart(2, "0"), 1160, 682, 56, 20, {
    size: 12, color: dark ? "#B7C5D4" : C.muted, bold: true, align: "right",
  });
}

function baseSlide(title, section, opts = {}) {
  const slide = deck.slides.add();
  slide.background.fill = opts.dark ? C.ink : C.paper;
  if (section) addText(slide, section.toUpperCase(), 64, 26, 400, 22, {
    size: 12, color: opts.dark ? "#91B1FF" : C.blue, bold: true,
  });
  addText(slide, title, 64, 54, 1140, 52, {
    size: opts.titleSize ?? 32, color: opts.dark ? C.white : C.ink, bold: true,
  });
  addLine(slide, 64, 120, 1152, opts.dark ? "#35516B" : C.line, 1);
  addFooter(slide, deck.slides.items.length, opts.dark);
  return slide;
}

function setNotes(slide, notes) {
  slide.speakerNotes.textFrame.setText(notes);
}

function addList(slide, items, x, y, w, opts = {}) {
  const gap = opts.gap ?? 50;
  const size = opts.size ?? 20;
  const color = opts.color ?? C.ink2;
  const accent = opts.accent ?? C.blue;
  items.forEach((item, i) => {
    const yy = y + i * gap;
    const dot = addBox(slide, x, yy + 6, 10, 10, accent, "none", "ellipse");
    dot.opacity = 1;
    addText(slide, item, x + 24, yy, w - 24, gap - 4, { size, color, bold: opts.bold ?? false });
  });
}

function addFlow(slide, labels, x, y, totalW, opts = {}) {
  const gap = opts.gap ?? 28;
  const h = opts.height ?? 84;
  const nodeW = (totalW - gap * (labels.length - 1)) / labels.length;
  const boxes = labels.map((label, i) => {
    const box = addBox(slide, x + i * (nodeW + gap), y, nodeW, h,
      i === (opts.highlight ?? -1) ? C.blue : C.white,
      i === (opts.highlight ?? -1) ? C.blue : C.line);
    addText(slide, label, x + i * (nodeW + gap) + 14, y + 12, nodeW - 28, h - 24, {
      size: opts.size ?? 17,
      bold: true,
      color: i === (opts.highlight ?? -1) ? C.white : C.ink,
      align: "center",
      valign: "middle",
    });
    return box;
  });
  for (let i = 0; i < boxes.length - 1; i++) {
    slide.shapes.connect(boxes[i], boxes[i + 1], {
      kind: "straight", fromSide: "right", toSide: "left",
      line: { fill: opts.lineColor ?? C.blue, width: 2 },
      tail: { type: "arrow", width: "sm", length: "sm" },
    });
  }
  return boxes;
}

function addBand(slide, text, x, y, w, h, fill, color = C.ink) {
  addBox(slide, x, y, w, h, fill, "none");
  addText(slide, text, x + 20, y + 12, w - 40, h - 24, { size: 18, color, bold: true, valign: "middle" });
}

function addNativeTable(slide, { x, y, w, h, values, widths, headerFill = C.ink, fontSize = 15 }) {
  const table = slide.tables.add({
    rows: values.length,
    columns: values[0].length,
    left: x, top: y, width: w, height: h,
    columnWidths: widths,
    values,
  });
  table.borders.assign({ style: "solid", fill: C.line, width: 1 });
  table.cells.block({ row: 0, column: 0, rowCount: 1, columnCount: values[0].length }).assign({
    fill: headerFill,
    textStyle: { typeface: FONT, fontSize, bold: true, color: C.white },
    margins: { left: 12, right: 12, top: 8, bottom: 8 },
    anchor: "middle",
  });
  if (values.length > 1) {
    table.cells.block({ row: 1, column: 0, rowCount: values.length - 1, columnCount: values[0].length }).assign({
      fill: C.white,
      textStyle: { typeface: FONT, fontSize, color: C.ink2 },
      margins: { left: 12, right: 12, top: 7, bottom: 7 },
      anchor: "middle",
    });
  }
  return table;
}

// 1. Cover
{
  const slide = deck.slides.add();
  slide.background.fill = C.ink;
  addText(slide, "DEV HANDOFF REQUIREMENTS", 72, 58, 500, 26, { size: 13, color: "#91B1FF", bold: true });
  addText(slide, "Contract billing\nbusiness logic", 72, 140, 750, 170, { size: 54, color: C.white, bold: true });
  addText(slide, "Standard Invoice, Progress Invoice, Change Orders, Retainage, Payment Schedule, and QuickBooks Online", 76, 340, 800, 88, { size: 22, color: "#C8D4DF" });
  addLine(slide, 76, 484, 1120, "#35516B", 2);
  addText(slide, "Canonical handoff  /  September 2026", 76, 520, 600, 34, { size: 17, color: C.white, bold: true });
  addText(slide, "Business rules for product, design, engineering, QA, and AI review", 76, 562, 700, 34, { size: 17, color: "#9DB0C1" });
  addFooter(slide, 1, true);
  setNotes(slide, `${sourceNotes.core} ${sourceNotes.progress} ${sourceNotes.co} ${sourceNotes.retainage} ${sourceNotes.schedule} ${sourceNotes.qbo}`);
}

// 2. Executive summary
{
  const slide = baseSlide("System overview", "Executive summary");
  addText(slide, "One contract model supports tracked billing from Estimate acceptance onward.", 64, 160, 840, 46, { size: 25, bold: true });
  const left = [
    ["Standard Invoice", "Copies an Estimate into an independently editable Invoice."],
    ["Progress Invoice", "Bills accepted Contract scope and tracks completion."],
    ["Change Order", "Revises the current Contract while preserving history."],
  ];
  const right = [
    ["Retainage", "Withholds part of an Invoice and releases it later."],
    ["Payment Schedule", "Plans milestones without creating or reserving scope."],
    ["QuickBooks Online", "Receives accounting documents, not Contract logic."],
  ];
  [left, right].forEach((col, ci) => col.forEach((row, i) => {
    const x = 64 + ci * 584;
    const y = 238 + i * 116;
    addText(slide, row[0], x, y, 520, 28, { size: 18, bold: true, color: ci ? C.teal : C.blue });
    addText(slide, row[1], x, y + 34, 500, 54, { size: 18, color: C.ink2 });
    if (i < 2) addLine(slide, x, y + 96, 500);
  }));
  setNotes(slide, `${sourceNotes.core} ${sourceNotes.schedule} ${sourceNotes.qbo}`);
}

// 3. Canonical model
{
  const slide = baseSlide("Canonical Contract model", "Shared model");
  addText(slide, "An Accepted Estimate establishes the Contract. Accepted Change Orders revise the same Contract.", 64, 154, 1120, 44, { size: 24, bold: true });
  const estimate = addBox(slide, 84, 266, 260, 100, C.blueSoft, C.blue);
  addText(slide, "Accepted Estimate", 104, 292, 220, 46, { size: 22, bold: true, color: C.blue, align: "center" });
  const contract = addBox(slide, 510, 230, 300, 170, C.ink, C.ink);
  addText(slide, "CONTRACT", 535, 260, 250, 36, { size: 25, bold: true, color: C.white, align: "center" });
  addText(slide, "Accepted source scope\nBilling history\nContract-level pools", 545, 306, 230, 76, { size: 17, color: "#C8D4DF", align: "center" });
  const co = addBox(slide, 976, 266, 220, 100, C.orangeSoft, C.orange);
  addText(slide, "Accepted COs", 996, 292, 180, 46, { size: 22, bold: true, color: C.orange, align: "center" });
  slide.shapes.connect(estimate, contract, { kind: "straight", fromSide: "right", toSide: "left", line: { fill: C.blue, width: 3 }, tail: { type: "arrow", width: "med", length: "med" } });
  slide.shapes.connect(co, contract, { kind: "straight", fromSide: "left", toSide: "right", line: { fill: C.orange, width: 3 }, tail: { type: "arrow", width: "med", length: "med" } });
  addBand(slide, "Before any Accepted CO: Contract equals Accepted Estimate", 84, 458, 520, 64, C.blueSoft, C.blue);
  addBand(slide, "After acceptance: each CO revises the existing Contract", 676, 458, 520, 64, C.orangeSoft, C.orange);
  addText(slide, "No ledger reset. No history migration. No Estimate-to-CO item mapping.", 84, 566, 1112, 40, { size: 22, bold: true, color: C.ink, align: "center" });
  setNotes(slide, sourceNotes.core);
}

// 4. Shared measures
{
  const slide = baseSlide("Shared financial measures", "Shared concepts");
  addNativeTable(slide, {
    x: 64, y: 158, w: 1152, h: 430, widths: [235, 557, 360], fontSize: 14,
    values: [
      ["Measure", "Business meaning", "Includes / excludes"],
      ["Contract subtotal", "Aggregate accepted pre-discount source scope", "Estimate plus Accepted CO changes and Cost Plus"],
      ["Contract Value", "Current accepted economic value", "Contract subtotal less accepted Contract discount"],
      ["Previously invoiced", "Posted tracked billing before the current Invoice", "Draft reservations excluded"],
      ["Remaining subtotal", "Gross Contract scope still available in creation", "Posted allocations and active Draft reservations excluded"],
      ["Contract Progress", "Posted gross scope divided by current gross scope", "Discount, tax, retainage, and payments excluded"],
      ["Discount Pool", "Contract discount still available to apply", "Kept separate from Remaining subtotal"],
    ],
  });
  addText(slide, "Remaining subtotal answers how much underlying scope remains. The Discount Pool answers how much discount remains.", 64, 612, 1152, 36, { size: 19, bold: true, color: C.blue, align: "center" });
  setNotes(slide, sourceNotes.core);
}

// 5. Status model
{
  const slide = baseSlide("Contract billing and document lifecycle", "Shared concepts");
  addText(slide, "Billing status belongs to the current Contract.", 64, 158, 620, 38, { size: 24, bold: true });
  addFlow(slide, ["Accepted\nNo posted tracked billing", "Partially Billed\nPosted billing and scope remains", "Billed\nPosted billing and no scope remains"], 64, 230, 740, { height: 112, gap: 26, highlight: 1, size: 16 });
  addText(slide, "A positive Accepted CO can move a Billed Contract back to Partially Billed.", 64, 382, 740, 58, { size: 20, color: C.blue, bold: true });
  addBox(slide, 864, 158, 352, 432, C.white, C.line);
  addText(slide, "Change Order lifecycle", 892, 186, 296, 34, { size: 22, bold: true, color: C.orange });
  addList(slide, ["Draft", "Pending", "Accepted", "Declined", "Canceled"], 892, 246, 260, { gap: 51, size: 20, accent: C.orange });
  addText(slide, "Acceptance remains a fact even when a surface shows the Contract billing status.", 892, 516, 286, 62, { size: 16, color: C.ink2 });
  setNotes(slide, `${sourceNotes.core} ${sourceNotes.co}`);
}

// 6. Standard Invoice
{
  const slide = baseSlide("Standard Invoice", "Happy flows");
  addText(slide, "Simple copy and conversion flow", 64, 154, 1120, 40, { size: 24, bold: true, color: C.blue });
  addFlow(slide, ["Estimate", "Copy to Invoice", "Editable Standard Invoice", "Estimate Billed"], 64, 238, 1152, { height: 90, gap: 34, highlight: 2 });
  addText(slide, "Uses existing Standard Invoice rules", 64, 388, 520, 30, { size: 18, bold: true });
  addList(slide, ["Copied lines can change under existing rules", "Saving the Draft creates the conversion lock", "Deleting or canceling removes that lock when allowed"], 64, 438, 520, { gap: 56, size: 18, accent: C.green });
  addText(slide, "Separate from tracked Progress billing", 676, 388, 520, 30, { size: 18, bold: true });
  addList(slide, ["No Contract Progress allocation", "No source-line Progress ledger", "No milestone or Retainage Release behavior"], 676, 438, 520, { gap: 56, size: 18, accent: C.red });
  setNotes(slide, `${sourceNotes.progress} Source: docs/contract-billing-business-rules.md, Standard Invoice conversion.`);
}

// 7. Progress happy flow
{
  const slide = baseSlide("Progress Invoice happy flow", "Happy flows");
  addFlow(slide, ["Accepted Estimate", "Contract", "Progress Invoice Draft", "Open Invoice", "Contract state updated"], 64, 196, 1152, { height: 90, gap: 24, highlight: 2, size: 16 });
  addText(slide, "Draft", 64, 350, 200, 30, { size: 18, bold: true, color: C.orange });
  addList(slide, ["Reserves selected source scope", "Reserves selected discount", "Does not increase posted progress"], 64, 398, 480, { gap: 52, size: 18, accent: C.orange });
  addText(slide, "Open", 676, 350, 200, 30, { size: 18, bold: true, color: C.green });
  addList(slide, ["Consumes the reservation", "Updates Previously invoiced", "Updates Remaining subtotal and billing state"], 676, 398, 500, { gap: 52, size: 18, accent: C.green });
  addBand(slide, "Progress always belongs to the Contract, including the first Invoice before any CO exists.", 64, 588, 1152, 56, C.blueSoft, C.blue);
  setNotes(slide, sourceNotes.progress);
}

// 8. Creation logic
{
  const slide = baseSlide("Progress Invoice creation", "Progress Invoice");
  addText(slide, "Supported paths use the same Contract availability rules.", 64, 154, 760, 38, { size: 23, bold: true });
  const paths = [
    ["Full remaining Contract", "Bills all eligible remaining source scope"],
    ["Percent or amount", "Allocates a portion within Contract limits"],
    ["Select source lines", "Bills selected eligible lines up to their remaining amount"],
    ["Payment milestone", "Uses planned context without bypassing availability"],
  ];
  paths.forEach((p, i) => {
    const y = 226 + i * 82;
    addText(slide, String(i + 1).padStart(2, "0"), 64, y, 48, 36, { size: 16, bold: true, color: C.blue });
    addText(slide, p[0], 126, y, 330, 30, { size: 19, bold: true });
    addText(slide, p[1], 470, y, 680, 46, { size: 18, color: C.ink2 });
    if (i < paths.length - 1) addLine(slide, 126, y + 58, 1030);
  });
  addBand(slide, "Remaining subtotal = gross Contract scope left after posted allocations and active Draft reservations", 64, 568, 1152, 60, C.tealSoft, C.teal);
  addText(slide, "The Discount Pool remains separate.", 64, 642, 1152, 26, { size: 17, color: C.ink2, align: "center" });
  setNotes(slide, sourceNotes.progress);
}

// 9. Source lineage
{
  const slide = baseSlide("Source-line lineage", "Progress Invoice");
  addText(slide, "The Contract aggregates scope without flattening its origin.", 64, 154, 800, 40, { size: 24, bold: true });
  addBox(slide, 64, 240, 330, 220, C.blueSoft, C.blue);
  addText(slide, "Estimate #1008", 88, 266, 280, 32, { size: 21, bold: true, color: C.blue });
  addText(slide, "Original source lines\nPosted allocations stay here\nRemaining amount stays traceable", 88, 320, 270, 108, { size: 18, color: C.ink2 });
  addText(slide, "+", 410, 316, 44, 54, { size: 34, bold: true, color: C.muted, align: "center" });
  addBox(slide, 470, 240, 330, 220, C.orangeSoft, C.orange);
  addText(slide, "CO #1008-CO1", 494, 266, 280, 32, { size: 21, bold: true, color: C.orange });
  addText(slide, "Added or removed scope\nIndependent source identity\nNo forced mapping to Estimate lines", 494, 320, 270, 108, { size: 18, color: C.ink2 });
  addText(slide, "=", 816, 316, 44, 54, { size: 34, bold: true, color: C.muted, align: "center" });
  addBox(slide, 876, 240, 340, 220, C.ink, C.ink);
  addText(slide, "Contract aggregate", 900, 266, 292, 32, { size: 21, bold: true, color: C.white });
  addText(slide, "Current accepted scope\nOverall availability\nContract Progress and pools", 900, 320, 286, 108, { size: 18, color: "#C8D4DF" });
  addText(slide, "Contract revisions never rewrite historical invoice allocation.", 64, 536, 1152, 42, { size: 22, bold: true, color: C.blue, align: "center" });
  setNotes(slide, sourceNotes.core);
}

// 10. Progress FE
{
  const slide = baseSlide("Progress Invoice frontend requirements", "Frontend");
  addText(slide, "Creation and editing", 64, 158, 520, 32, { size: 21, bold: true, color: C.blue });
  addList(slide, [
    "Use current Contract scope in the creation prompt",
    "Show Remaining subtotal before discount",
    "Keep Discount Pool selection separate",
    "Group Estimate and CO lines when COs exist",
    "Keep Cost Plus computed and locked",
  ], 64, 214, 520, { gap: 64, size: 18 });
  addText(slide, "State and controls", 676, 158, 520, 32, { size: 21, bold: true, color: C.teal });
  addList(slide, [
    "Expose Draft reservation and one-Draft limit",
    "Lock prior invoices under existing chronology rules",
    "Show Contract Progress and billing status",
    "Prevent billing beyond Contract and line availability",
    "Preserve linked history and explicit navigation",
  ], 676, 214, 520, { gap: 64, size: 18, accent: C.teal });
  addBand(slide, "Unsaved Invoice states do not show PDF preview or Customer web preview actions.", 64, 594, 1152, 58, C.orangeSoft, C.orange);
  setNotes(slide, sourceNotes.progress);
}

// 11. Progress customer
{
  const slide = baseSlide("Progress Invoice customer presentation", "Customer web link and PDF");
  addText(slide, "Web link and PDF carry the same business information.", 64, 154, 760, 38, { size: 23, bold: true });
  addText(slide, "Items table", 64, 226, 330, 30, { size: 20, bold: true, color: C.blue });
  addList(slide, ["Contract Amount", "Previously Billed", "This Invoice", "Balance to Finish", "Line completion when required"], 64, 278, 330, { gap: 52, size: 18 });
  addText(slide, "Presentation rules", 468, 226, 340, 30, { size: 20, bold: true, color: C.teal });
  addList(slide, ["Preserve item descriptions", "Emphasize billed rows", "Hide or soften unbilled rows", "Hide fractional quantities where required", "Exclude internal ledger mechanics"], 468, 278, 340, { gap: 52, size: 18, accent: C.teal });
  addText(slide, "Cost Plus and totals", 872, 226, 344, 30, { size: 20, bold: true, color: C.orange });
  addList(slide, ["One aggregate Cost plus fee line", "Description shows the percentage", "Place before subtotal", "Include fee in subtotal", "Do not duplicate it in totals"], 872, 278, 344, { gap: 52, size: 18, accent: C.orange });
  addBand(slide, "Tax, discount, Cost Plus, and retainage appear only when applicable. Zero-value placeholders stay absent.", 64, 594, 1152, 58, C.blueSoft, C.blue);
  setNotes(slide, sourceNotes.progress);
}

// 12. CO happy flow
{
  const slide = baseSlide("Change Order happy flow", "Happy flows");
  addFlow(slide, ["Current Contract", "CO Draft or Pending", "Accepted CO", "Contract revised", "Future Progress Invoice"], 64, 200, 1152, { height: 92, gap: 24, highlight: 2, size: 16 });
  addText(slide, "Acceptance updates", 64, 354, 480, 30, { size: 20, bold: true, color: C.orange });
  addList(slide, ["Accepted source scope", "Contract totals and applicable pools", "Payment Schedule projections", "Contract billing status when scope reopens"], 64, 408, 500, { gap: 54, size: 18, accent: C.orange });
  addText(slide, "Acceptance preserves", 676, 354, 480, 30, { size: 20, bold: true, color: C.blue });
  addList(slide, ["Posted Invoice history", "Original source allocation", "Prior Contract Progress history", "Separate CO approval history"], 676, 408, 500, { gap: 54, size: 18, accent: C.blue });
  setNotes(slide, sourceNotes.co);
}

// 13. CO states
{
  const slide = baseSlide("Change Order state and Contract effect", "Change Order");
  const states = [
    ["Draft", "Proposed", "Editable under existing locks"],
    ["Pending", "Proposed", "Awaiting acceptance"],
    ["Accepted", "Included", "Financially immutable"],
    ["Declined", "None", "Historical"],
    ["Canceled", "None", "Historical"],
  ];
  states.forEach((s, i) => {
    const y = 170 + i * 78;
    addText(slide, s[0], 64, y, 190, 28, { size: 19, bold: true, color: i === 2 ? C.orange : C.ink });
    addText(slide, s[1], 300, y, 200, 28, { size: 18, color: C.ink2 });
    addText(slide, s[2], 536, y, 540, 28, { size: 18, color: C.ink2 });
    if (i < 4) addLine(slide, 64, y + 52, 1012);
  });
  addBox(slide, 1088, 170, 128, 364, C.orangeSoft, "none");
  addText(slide, "CO\napproval\nstate", 1102, 264, 100, 110, { size: 18, bold: true, color: C.orange, align: "center" });
  addBand(slide, "Contract billing status can change after CO acceptance. CO lifecycle history remains intact.", 64, 584, 1152, 60, C.blueSoft, C.blue);
  setNotes(slide, sourceNotes.co);
}

// 14. CO FE/customer
{
  const slide = baseSlide("Change Order document requirements", "Frontend and customer");
  addText(slide, "Internal document", 64, 158, 520, 32, { size: 21, bold: true, color: C.orange });
  addList(slide, [
    "Estimate-style editor with Change Order title",
    "Sequential number such as #1008-CO1",
    "Original Estimate and Contract reference",
    "Signed Contract change and shared summary",
    "Line-scoped conflicts; unrelated COs may coexist",
  ], 64, 216, 520, { gap: 64, size: 18, accent: C.orange });
  addText(slide, "Customer web link and PDF", 676, 158, 520, 32, { size: 21, bold: true, color: C.blue });
  addList(slide, [
    "Reuse the Estimate customer document system",
    "Title the document Change Order",
    "Show Linked to Estimate #...",
    "Explain added, removed, or revised scope",
    "Use CO items, totals, notes, attachments, and terms",
  ], 676, 216, 520, { gap: 64, size: 18, accent: C.blue });
  addBand(slide, "Internal pools and allocation mechanics never appear on the customer document.", 64, 594, 1152, 58, C.tealSoft, C.teal);
  setNotes(slide, sourceNotes.co);
}

// 15. Retainage happy flow
{
  const slide = baseSlide("Retainage happy flow", "Happy flows");
  addFlow(slide, ["Progress Invoice", "Retainage withheld", "Retainage Balance", "Release Invoice"], 64, 206, 1152, { height: 96, gap: 36, highlight: 1, size: 17 });
  addText(slide, "Withholding", 64, 368, 480, 30, { size: 20, bold: true, color: C.orange });
  addList(slide, ["Reduces the Invoice amount due", "Leaves completed Contract scope unchanged", "Creates held Retainage Balance"], 64, 420, 500, { gap: 58, size: 18, accent: C.orange });
  addText(slide, "Release", 676, 368, 480, 30, { size: 20, bold: true, color: C.teal });
  addList(slide, ["Bills previously withheld money", "Supports partial or full release", "Creates no new Contract scope"], 676, 420, 500, { gap: 58, size: 18, accent: C.teal });
  addBand(slide, "Contract Progress and milestone completion use the full gross work billed.", 64, 598, 1152, 56, C.blueSoft, C.blue);
  setNotes(slide, sourceNotes.retainage);
}

// 16. Retainage requirements
{
  const slide = baseSlide("Retainage frontend and customer requirements", "Retainage");
  addText(slide, "Internal controls", 64, 158, 520, 32, { size: 21, bold: true, color: C.orange });
  addList(slide, [
    "Show withholding only in enabled scenarios",
    "Display tracking only after retainage exists",
    "Track retained, released, held, and available amounts",
    "Block release above available balance",
    "Keep one active release Draft under existing rules",
  ], 64, 216, 520, { gap: 64, size: 18, accent: C.orange });
  addText(slide, "Customer presentation", 676, 158, 520, 32, { size: 21, bold: true, color: C.teal });
  addList(slide, [
    "Original Invoice shows Retainage as a deduction",
    "Release Invoice identifies previously withheld funds",
    "Single line: Retainage release",
    "Qty 1 and the released amount",
    "No suggestion that release represents new work",
  ], 676, 216, 520, { gap: 64, size: 18, accent: C.teal });
  addBand(slide, "A Retainage release calculates no second tax and does not increase Total Invoiced.", 64, 594, 1152, 58, C.blueSoft, C.blue);
  setNotes(slide, sourceNotes.retainage);
}

// 17. Payment Schedule
{
  const slide = baseSlide("Payment Schedule model", "Payment Schedule");
  addText(slide, "A schedule plans billing milestones on the Contract. Actual Progress Invoices remain authoritative.", 64, 154, 1120, 46, { size: 23, bold: true });
  addFlow(slide, ["Contract and schedule", "Milestone selected", "Progress Invoice", "Contract scope consumed", "Schedule updated"], 64, 236, 1152, { height: 92, gap: 24, highlight: 2, size: 16 });
  addText(slide, "A milestone can guide amount and naming.", 64, 388, 530, 34, { size: 20, bold: true, color: C.blue });
  addText(slide, "It cannot bypass source-line availability, Draft reservations, or overbilling protection.", 64, 438, 530, 82, { size: 18, color: C.ink2 });
  addText(slide, "Schedule state follows the linked Invoice.", 676, 388, 530, 34, { size: 20, bold: true, color: C.teal });
  addText(slide, "Planned becomes Draft invoice, then Invoiced when the Invoice opens. Cancellation returns the milestone to Planned.", 676, 438, 530, 82, { size: 18, color: C.ink2 });
  addBand(slide, "Schedule allocation can exceed 100%. The warning does not create scope or authorize billing.", 64, 586, 1152, 58, C.orangeSoft, C.orange);
  setNotes(slide, sourceNotes.schedule);
}

// 18. Payment interactions
{
  const slide = baseSlide("Payment Schedule interactions", "Payment Schedule");
  const rows = [
    ["Standard Invoice", "Separate conversion path", "Successful save removes the applicable schedule path under existing rules"],
    ["Progress Invoice", "Milestone guides the draw", "Actual allocation consumes Contract scope"],
    ["Accepted CO", "Contract Value changes", "Future percentage milestones recalculate; historical actuals stay fixed"],
    ["Retainage", "Withholding stays separate", "Release does not create milestone work"],
  ];
  rows.forEach((r, i) => {
    const y = 168 + i * 105;
    addText(slide, r[0], 64, y, 230, 28, { size: 19, bold: true, color: i === 2 ? C.orange : C.blue });
    addText(slide, r[1], 330, y, 330, 28, { size: 18, bold: true });
    addText(slide, r[2], 694, y, 500, 58, { size: 18, color: C.ink2 });
    if (i < 3) addLine(slide, 64, y + 78, 1130);
  });
  addText(slide, "Historical milestone amounts never rebalance automatically after actual invoice variance.", 64, 604, 1152, 36, { size: 20, color: C.teal, bold: true, align: "center" });
  setNotes(slide, sourceNotes.schedule);
}

// 19. Progress and CO edge cases
{
  const slide = baseSlide("Progress Invoice and Change Order edge cases", "Non-happy flows");
  const left = [
    ["Active Draft exists", "Block another tracked Draft; keep reserved scope unavailable."],
    ["Attempted overbilling", "Prevent creation beyond Contract and source-line availability."],
    ["Final scope with unused discount", "Warn about unused Discount Pool and resulting over-invoiced amount."],
    ["Posted Invoice edit", "Only the latest eligible unpaid Open Invoice can change financially."],
  ];
  const right = [
    ["CO accepted with Draft", "Cancel the Draft, release reservations, and require a fresh draw."],
    ["Positive CO after billing", "Return the Contract to Partially Billed."],
    ["Deductive CO", "Keep history fixed; show over-invoiced state when posted billing exceeds revised scope."],
    ["Accepted CO correction", "Create another CO. Do not edit accepted financial scope."],
  ];
  [left, right].forEach((col, ci) => col.forEach((r, i) => {
    const x = 64 + ci * 584;
    const y = 164 + i * 112;
    addText(slide, r[0], x, y, 500, 28, { size: 18, bold: true, color: ci ? C.orange : C.blue });
    addText(slide, r[1], x, y + 36, 500, 58, { size: 17, color: C.ink2 });
    if (i < 3) addLine(slide, x, y + 96, 500);
  }));
  addBand(slide, "Tax Credit remains separate from principal when a deductive CO removes previously taxed scope.", 64, 620, 1152, 40, C.redSoft, C.red);
  setNotes(slide, `${sourceNotes.progress} ${sourceNotes.co}`);
}

// 20. Retainage and schedule edge cases
{
  const slide = baseSlide("Retainage and Payment Schedule edge cases", "Non-happy flows");
  addText(slide, "Retainage", 64, 158, 520, 32, { size: 21, bold: true, color: C.orange });
  addList(slide, [
    "No retainage means no tracking UI or totals row",
    "Partial release leaves the remainder held",
    "Over-release stays blocked",
    "Full Contract completion can coexist with held retainage",
    "Invoice cancellation reverses recognized withholding under existing rules",
  ], 64, 216, 520, { gap: 68, size: 18, accent: C.orange });
  addText(slide, "Payment Schedule", 676, 158, 520, 32, { size: 21, bold: true, color: C.teal });
  addList(slide, [
    "More than 100% remains advisory over-allocation",
    "Draft-linked milestone is not fulfilled",
    "Invoiced milestone cannot create another Invoice",
    "Accepted CO recalculates future projections",
    "Canceled Invoice restores the live milestone to Planned",
  ], 676, 216, 520, { gap: 68, size: 18, accent: C.teal });
  setNotes(slide, `${sourceNotes.retainage} ${sourceNotes.schedule}`);
}

// 21. QBO boundary
{
  const slide = baseSlide("QuickBooks Online ownership boundary", "QBO synchronization", { dark: true });
  addText(slide, "Cinderblock owns Contract billing state", 64, 164, 520, 40, { size: 24, bold: true, color: C.white });
  addList(slide, ["Contract Progress", "Source-line allocations", "Discount and Cost Plus state", "Retainage Balance", "Payment Schedule and CO relationships"], 64, 232, 500, { gap: 60, size: 18, accent: "#91B1FF", color: "#C8D4DF" });
  addText(slide, "QBO receives accounting documents", 676, 164, 520, 40, { size: 24, bold: true, color: C.white });
  addList(slide, ["QBO Estimates", "Ordinary QBO Invoices", "Actual quantities and amounts", "Represented discounts and fees", "Tax facts compatible with QBO configuration"], 676, 232, 500, { gap: 60, size: 18, accent: "#5BC6B4", color: "#C8D4DF" });
  addBand(slide, "Cinderblock does not use QBO Progress Invoicing or QBO Estimate-to-Invoice progress relationships.", 64, 586, 1152, 60, "#203A52", C.white);
  setNotes(slide, sourceNotes.qbo);
}

// 22. QBO mapping
{
  const slide = baseSlide("QBO document mapping", "QBO synchronization");
  addNativeTable(slide, {
    x: 64, y: 160, w: 1152, h: 420, widths: [320, 320, 512], fontSize: 15,
    values: [
      ["Cinderblock", "QuickBooks Online", "Business rule"],
      ["Estimate", "Standard QBO Estimate", "No QBO Progress Invoicing"],
      ["Change Order", "Separate QBO Estimate", "Preserve CO identity; do not modify original Estimate"],
      ["Standard Invoice", "Ordinary QBO Invoice", "Use existing Invoice sync behavior"],
      ["Progress / Contract Invoice", "Ordinary QBO Invoice", "No QBO Estimate linkage or Contract lineage"],
      ["Retainage Release Invoice", "Ordinary QBO Invoice", "One positive Retainage release line"],
    ],
  });
  addText(slide, "Status mapping: Partially Billed → QBO Converted; Billed → QBO Converted. Cinderblock preserves the local distinction.", 64, 608, 1152, 46, { size: 18, color: C.blue, bold: true, align: "center" });
  setNotes(slide, sourceNotes.qbo);
}

// 23. QBO lines
{
  const slide = baseSlide("QBO line representation", "QBO synchronization");
  addText(slide, "Progress quantity", 64, 158, 330, 30, { size: 20, bold: true, color: C.blue });
  addText(slide, "Contract line\nQty 10 × $100\n\n25% billed\nQty 2.5 × $100 = $250", 64, 212, 330, 190, { size: 20, color: C.ink2 });
  addText(slide, "QBO receives the actual fractional quantity even if the customer view hides it.", 64, 432, 330, 94, { size: 18, bold: true, color: C.blue });
  addText(slide, "Retainage withheld", 468, 158, 340, 30, { size: 20, bold: true, color: C.orange });
  addBox(slide, 468, 222, 340, 86, C.orangeSoft, "none");
  addText(slide, "Retainage   Qty 1   -$1,000", 486, 246, 304, 32, { size: 20, bold: true, color: C.orange, align: "center" });
  addText(slide, "One negative line. No allocation across work lines.", 468, 344, 340, 74, { size: 18, color: C.ink2 });
  addText(slide, "Retainage release", 872, 158, 344, 30, { size: 20, bold: true, color: C.teal });
  addBox(slide, 872, 222, 344, 86, C.tealSoft, "none");
  addText(slide, "Retainage release   Qty 1   $1,000", 888, 246, 312, 32, { size: 18, bold: true, color: C.teal, align: "center" });
  addText(slide, "One positive line. No original work lines are resent.", 872, 344, 344, 74, { size: 18, color: C.ink2 });
  addBand(slide, "Discount and Cost Plus sync only when the Cinderblock document represents them.", 64, 578, 1152, 58, C.blueSoft, C.blue);
  setNotes(slide, sourceNotes.qbo);
}

// 24. QBO safety
{
  const slide = baseSlide("QBO accounting safeguards", "QBO synchronization");
  addText(slide, "A diverged QBO transaction requires an explicit conflict state.", 64, 154, 900, 40, { size: 24, bold: true });
  addFlow(slide, ["Last successful sync", "QBO changes", "Conflict surfaced", "User resolves safely"], 64, 226, 1152, { height: 88, gap: 34, highlight: 2, size: 17, lineColor: C.red });
  addText(slide, "Protected situations", 64, 374, 500, 30, { size: 20, bold: true, color: C.red });
  addList(slide, ["QBO edit, deletion, or void", "Payment or credit recorded in QBO", "Cinderblock edit, cancellation, or invalidation", "Failed or uncertain synchronization"], 64, 426, 500, { gap: 52, size: 18, accent: C.red });
  addText(slide, "Required outcome", 676, 374, 500, 30, { size: 20, bold: true, color: C.blue });
  addList(slide, ["Preserve Cinderblock Contract state", "Do not silently overwrite or recreate QBO", "Block duplicate Accounts Receivable risk", "Require intentional accounting resolution"], 676, 426, 500, { gap: 52, size: 18, accent: C.blue });
  addBand(slide, "QBO payment activity can change settlement state. It never changes Contract Progress or Contract scope.", 64, 612, 1152, 44, C.orangeSoft, C.orange);
  setNotes(slide, sourceNotes.qbo);
}

// 25. FE summary
{
  const slide = baseSlide("Frontend requirement summary", "Handoff summary");
  const cols = [
    ["Progress Invoice", C.blue, ["Contract-level creation", "Gross Remaining subtotal", "Source grouping and availability", "Draft reservation and locks", "Contract Progress and status", "Saved-document previews"]],
    ["Change Order", C.orange, ["Estimate-style editor", "CO number and Estimate link", "Approval lifecycle", "Contract billing status", "Net Contract change", "PDF and Customer Link"]],
    ["Retainage", C.teal, ["Withholding control", "Conditional tracking block", "Available release limit", "Partial and full release", "No empty state when absent", "Customer release document"]],
  ];
  cols.forEach((col, i) => {
    const x = 64 + i * 384;
    addText(slide, col[0], x, 164, 330, 32, { size: 21, bold: true, color: col[1] });
    addLine(slide, x, 210, 330, col[1], 3);
    addList(slide, col[2], x, 242, 340, { gap: 58, size: 17, accent: col[1] });
  });
  addBand(slide, "Standard Invoice keeps its existing independent copy and conversion behavior.", 64, 612, 1152, 44, C.blueSoft, C.blue);
  setNotes(slide, `${sourceNotes.progress} ${sourceNotes.co} ${sourceNotes.retainage}`);
}

// 26. Customer summary
{
  const slide = baseSlide("Customer-facing requirement summary", "Handoff summary");
  addNativeTable(slide, {
    x: 64, y: 160, w: 1152, h: 416, widths: [250, 450, 452], fontSize: 15,
    values: [
      ["Document", "Customer sees", "Customer does not see"],
      ["Progress Invoice", "Contract amount, prior billing, current billing, balance, applicable adjustments", "Internal pools, reservations, or allocation mechanics"],
      ["Change Order", "CO identity, linked Estimate, revised scope, Contract change, totals", "Internal Contract ledger or source-allocation rules"],
      ["Retainage Release", "One Retainage release line and clear amount", "Original work repeated as new scope"],
    ],
  });
  addText(slide, "Web link and PDF present the same core business information. Conditional totals remain conditional.", 64, 612, 1152, 36, { size: 20, color: C.blue, bold: true, align: "center" });
  setNotes(slide, `${sourceNotes.progress} ${sourceNotes.co} ${sourceNotes.retainage}`);
}

// 27. Technical details
{
  const slide = baseSlide("Technical details", "Appendix");
  addText(slide, "Only implementation constraints that preserve the business model", 64, 154, 900, 40, { size: 23, bold: true });
  const items = [
    ["Stable lineage", "Persist source identity so revisions never redistribute historical billing."],
    ["Deterministic money", "Use fixed decimal calculations and reconcile displayed components to totals."],
    ["Document identity", "Preserve Estimate, CO, Invoice, and external accounting identifiers."],
    ["Existing systems", "Reuse current tax, payment, permission, and QBO sync behavior unless these requirements override it."],
  ];
  items.forEach((r, i) => {
    const y = 230 + i * 88;
    addText(slide, r[0], 64, y, 250, 30, { size: 19, bold: true, color: C.blue });
    addText(slide, r[1], 340, y, 830, 52, { size: 18, color: C.ink2 });
    if (i < items.length - 1) addLine(slide, 64, y + 66, 1106);
  });
  addBand(slide, "API design, schemas, polling, webhooks, and service boundaries remain outside this business handoff.", 64, 602, 1152, 52, C.orangeSoft, C.orange);
  setNotes(slide, `${sourceNotes.core} ${sourceNotes.qbo}`);
}

// 28. Open decisions
{
  const slide = baseSlide("Open production decisions", "Appendix");
  addText(slide, "The core Contract model is complete. Production QBO rollout still needs product and accounting decisions.", 64, 154, 1120, 50, { size: 23, bold: true });
  const items = [
    ["Accounting mappings", "Confirm Product/Service and account treatment for Retainage, Retainage release, discounts, and Cost Plus."],
    ["Tax alignment", "Confirm compatible calculation order and rounding across discounts, Cost Plus, Retainage, negative lines, and supported QBO tax modes."],
    ["Conflict resolution", "Define safe outcomes for Keep QuickBooks version, overwrite, void, relink, and detach without importing QBO edits into Contract ledgers."],
    ["Accounting restrictions", "Define permissions and behavior for payments, credits, deposits, closed periods, reconciled transactions, and material versus metadata edits."],
  ];
  items.forEach((r, i) => {
    const y = 230 + i * 90;
    addText(slide, r[0], 64, y, 260, 30, { size: 19, bold: true, color: i < 2 ? C.orange : C.red });
    addText(slide, r[1], 350, y, 830, 58, { size: 18, color: C.ink2 });
    if (i < 3) addLine(slide, 64, y + 68, 1116);
  });
  addBand(slide, "Safe default: preserve both systems, block the risky QBO write, and require intentional resolution.", 64, 606, 1152, 48, C.redSoft, C.red);
  setNotes(slide, sourceNotes.qbo);
}

// 29. Audit
{
  const slide = baseSlide("Business logic audit", "Self-audit");
  addNativeTable(slide, {
    x: 96, y: 164, w: 1088, h: 376, widths: [420, 190, 478], fontSize: 16,
    values: [
      ["Area", "Result", "Audit finding"],
      ["Standard Invoice", "PASS", "Independent copy and conversion flow"],
      ["Progress Invoice", "PASS", "Contract-based from Estimate acceptance"],
      ["Change Order", "PASS", "Revises Contract without rewriting history"],
      ["Retainage", "PASS", "Withholding and release remain outside scope completion"],
      ["Payment Schedule", "PASS", "Planning layer; actual tracked billing remains authoritative"],
      ["QBO sync", "PASS", "Accounting destination with conflict safeguards"],
    ],
  });
  addBand(slide, "Core flows are internally consistent. Open QBO production decisions are listed in the preceding appendix.", 96, 584, 1088, 64, C.greenSoft, C.green);
  setNotes(slide, `${sourceNotes.core} ${sourceNotes.progress} ${sourceNotes.co} ${sourceNotes.retainage} ${sourceNotes.schedule} ${sourceNotes.qbo}`);
}

const candidatePath = path.join(stagingDir, "candidate.pptx");
await (await PresentationFile.exportPptx(deck)).save(candidatePath);

const requirements = {
  explicitTotalSlideCount: 29,
  requiredNativeTableOwnerSlides: [4, 22, 26, 29],
  requiredNativeChartOwnerSlides: [],
};
const fontPolicy = { basis: "design", families: [FONT] };
const result = await finalizePresentation({
  ...requirements,
  workspaceDir,
  candidatePath,
  finalPath: FINAL_PPTX,
  pythonExecutable: RUNTIME_PYTHON,
  integrityValidatorPath: path.join(SKILL_DIR, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(SKILL_DIR, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: [
    "--expected-slide-size-emu", "12192000,6858000",
    "--validate-bullet-geometry",
    "--validate-heading-fit",
    "--require-native-table-slide", "4",
    "--require-native-table-slide", "22",
    "--require-native-table-slide", "26",
    "--require-native-table-slide", "29",
  ],
  requiredNativeTableOwnerSlides: requirements.requiredNativeTableOwnerSlides,
  fontPolicy,
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, "cinderblock-contract-billing-dev-handoff-presentation-terminology-update-v2.validation.json"),
});

process.stdout.write(`${JSON.stringify({ finalPath: FINAL_PPTX, slideCount: deck.slides.items.length, result }, null, 2)}\n`);
