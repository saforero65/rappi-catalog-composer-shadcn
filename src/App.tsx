import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import Papa from "papaparse";
import React, { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

const LAYOUT = {
  canvas: { w: 500, h: 500 },
  photoSlot: { x: 150, y: 100, w: 200, h: 280 }, // foto centrada en el canvas
  titleBox: { x: 27, y: 393, w: 447, lineH: 29, size: 12 }, // texto abajo con precio incluido
  brandPos: { x: 27, y: 40, size: 15 }, // marca superior izquierda
};

type Row = {
  sku: string;
  action: string;
  title: string;
  price: string | number;
  filename: string;
  // Campos adicionales de Rappi (opcionales)
  category?: string;
  brand?: string;
  ean?: string;
  description?: string;
  unit?: string;
  quantity?: number | string;
  pesable?: string;
  preempaquetado?: string;
};

type RappiRow = {
  sku: string;
  action: string;
  title: string;
  price: string | number;
  filename: string;
  category?: string;
  brand?: string;
  ean?: string;
  description?: string;
  unit?: string;
  quantity?: number | string;
  pesable?: string;
  preempaquetado?: string;
};
type Prepared = Row & {
  src?: string;
  status?: string;
  outBlob?: Blob | null;
  outName?: string;
  approved?: boolean;
  // Configuraciones editables
  settings?: {
    photoY: number;
    photoH: number;
    textX: number;
    textY: number;
    fontSize: number;
    lineHeight: number;
    maxTextAdjustment?: number; // Nuevo: máximo ajuste automático del texto
  };
};

export default function App() {
  const [rows, setRows] = useState<Prepared[]>([]);
  const [templateUrl, setTemplateUrl] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [dark, setDark] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState<Set<number>>(
    new Set()
  );
  const filesRef = useRef<FileList | null>(null);
  const [customFiles, setCustomFiles] = useState<Map<string, File>>(new Map());

  const mapFiles = useMemo(() => {
    const m = new Map<string, File>();
    // Agregar archivos originales
    if (filesRef.current) {
      Array.from(filesRef.current).forEach((f) => m.set(f.name, f));
    }
    // Agregar archivos personalizados
    customFiles.forEach((file, name) => m.set(name, file));
    return m;
  }, [filesRef.current, customFiles]);

  // Función para crear Excel de Rappi con valores por defecto
  function createRappiExcel(rows: Prepared[]): Blob {
    // Encabezados para el Excel de Rappi
    const headers = [
      "Categoría",
      "Nombre",
      "SKU",
      "Marca (opcional)",
      "EAN (opcional)",
      "Descripción",
      "¿Es pesable?",
      "¿Es preempaquetado?",
      "Cantidad",
      "Unidad de medida",
    ];

    // Valores por defecto
    const defaults = {
      categoria:
        "Papelería y oficina > Útiles escolares > Otros Útiles escolares",
      marca: "", // Opcional - dejamos vacío
      ean: "", // Opcional - dejamos vacío
      pesable: "NO",
      preempaquetado: "NO",
      cantidad: 1,
      unidad: "Und (unidades)",
    };

    // Preparar datos
    const data = [headers];

    for (const r of rows) {
      const nombre = String(r.title || "").trim();
      const descripcion = String(r.description || r.title || "").trim();

      data.push([
        defaults.categoria, // Categoría
        nombre, // Nombre
        r.sku, // SKU
        defaults.marca, // Marca (opcional) - vacío
        defaults.ean, // EAN (opcional) - vacío
        descripcion, // Descripción
        defaults.pesable, // ¿Es pesable?
        defaults.preempaquetado, // ¿Es preempaquetado?
        defaults.cantidad.toString(), // Cantidad
        defaults.unidad, // Unidad de medida
      ]);
    }

    // Crear workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 50 }, // Categoría
      { wch: 30 }, // Nombre
      { wch: 15 }, // SKU
      { wch: 20 }, // Marca
      { wch: 15 }, // EAN
      { wch: 40 }, // Descripción
      { wch: 15 }, // Es pesable
      { wch: 20 }, // Es preempaquetado
      { wch: 10 }, // Cantidad
      { wch: 20 }, // Unidad de medida
    ];
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Productos");

    // Exportar como blob
    const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    return new Blob([wbOut], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  }

  const onFileLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setTemplateUrl(URL.createObjectURL(f));
  };
  const loadCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    Papa.parse<Row>(f, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const data = (res.data || []).map((r) => ({
          ...r,
          title: r.title?.trim() ?? "",
          price: String(r.price ?? "").trim(),
          approved: true,
          settings: {
            photoY: LAYOUT.photoSlot.y,
            photoH: LAYOUT.photoSlot.h,
            textX: LAYOUT.canvas.w / 2,
            textY: LAYOUT.canvas.h - 67,
            fontSize: 24,
            lineHeight: 30,
            maxTextAdjustment: 50, // Valor por defecto
          },
        }));
        setRows(data);
      },
    });
  };

  function fmtCOP(v: string | number) {
    const n =
      typeof v === "number" ? v : Number(String(v).replace(/[^\d]/g, ""));
    if (!Number.isFinite(n)) return "";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(n);
  }
  function loadImage(url: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.crossOrigin = "anonymous";
      img.src = url;
    });
  }
  function fitCover(sw: number, sh: number, dw: number, dh: number) {
    const scale = Math.max(dw / sw, dh / sh);
    const w = sw * scale,
      h = sh * scale;
    const x = -(w - dw) / 2,
      y = -(h - dh) / 2;
    return { w, h, x, y };
  }
  async function drawWrappedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxW: number,
    lh: number
  ) {
    const words = text.split(/\s+/);
    let line = "";
    let yy = y;
    for (const w of words) {
      const test = (line + " " + w).trim();
      const width = ctx.measureText(test).width;
      if (width <= maxW || !line) line = test;
      else {
        ctx.fillText(line, x, yy);
        yy += lh;
        line = w;
      }
    }
    if (line) ctx.fillText(line, x, yy);
  }

  // Función para dibujar texto con wrap y rectángulo solo en la palabra más larga
  async function drawTextWithBackground(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    startY: number,
    lineHeight: number,
    canvasWidth: number,
    canvasHeight: number,
    maxTextAdjustment: number = 50
  ) {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = "";

    // Calcular líneas necesarias
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width <= maxWidth || !currentLine) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    // Ajustar posición Y dinámicamente si hay muchas líneas
    const totalTextHeight = lines.length * lineHeight + 14;
    const minBottomMargin = 20; // Margen mínimo desde el borde inferior

    // Ajuste automático dinámico basado en número de líneas
    let dynamicMaxAdjustment;
    if (lines.length <= 1) {
      dynamicMaxAdjustment = 0; // Una línea: sin ajuste
    } else if (lines.length === 2) {
      dynamicMaxAdjustment = 10; // Dos líneas: máximo 10px
    } else if (lines.length === 3) {
      dynamicMaxAdjustment = 25; // Tres líneas: máximo 25px
    } else {
      dynamicMaxAdjustment = maxTextAdjustment; // Más de 3 líneas: usar configuración manual
    }

    let adjustedStartY = startY;

    // Si el texto se sale del canvas, moverlo hacia arriba pero con límite
    if (startY + totalTextHeight > canvasHeight - minBottomMargin) {
      const neededAdjustment =
        startY + totalTextHeight - (canvasHeight - minBottomMargin);
      const actualAdjustment = Math.min(neededAdjustment, dynamicMaxAdjustment);
      adjustedStartY = startY - actualAdjustment;
    }

    // Encontrar la palabra más larga en el texto completo
    let longestWord = "";
    let longestWordWidth = 0;
    words.forEach((word) => {
      const wordWidth = ctx.measureText(word).width;
      if (wordWidth > longestWordWidth) {
        longestWordWidth = wordWidth;
        longestWord = word;
      }
    });

    // Configurar texto
    ctx.fillStyle = "#1F478D";
    ctx.strokeStyle = "#1F478D";
    ctx.lineWidth = 1;
    ctx.textAlign = "center";

    // Dibujar todas las líneas de texto
    lines.forEach((line, index) => {
      const textX = canvasWidth / 2;
      const textY = adjustedStartY + index * lineHeight + 7;

      // Si esta línea contiene la palabra más larga, dibujar palabra por palabra
      if (line.includes(longestWord)) {
        const wordsInLine = line.split(/\s+/);
        let currentX = textX - ctx.measureText(line).width / 2; // Empezar desde la izquierda de la línea

        wordsInLine.forEach((word, wordIndex) => {
          const wordWidth = ctx.measureText(word).width;
          const spaceWidth = ctx.measureText(" ").width;

          // Si es la palabra más larga, dibujar el rectángulo primero
          if (word === longestWord) {
            const rectWidth = wordWidth + 10;
            const rectHeight = lineHeight;
            const rectX = currentX - 5;
            const rectY = textY - lineHeight * 0.8;

            // Dibujar rectángulo de fondo
            ctx.fillStyle = "#F3AB1D";
            ctx.strokeStyle = "#1F478D";
            ctx.lineWidth = 1;
            ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
            ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);

            // Restaurar color del texto
            ctx.fillStyle = "#1F478D";
          }

          // Dibujar la palabra
          ctx.textAlign = "left";
          ctx.fillText(word, currentX, textY);
          ctx.strokeText(word, currentX, textY);

          // Mover la posición X para la siguiente palabra
          currentX += wordWidth + spaceWidth;
        });

        // Restaurar textAlign para las otras líneas
        ctx.textAlign = "center";
      } else {
        // Dibujar líneas normales centradas
        ctx.fillText(line, textX, textY);
        ctx.strokeText(line, textX, textY);
      }
    });

    return lines.length * lineHeight + 14;
  }

  async function composeOne(
    tpl: HTMLImageElement,
    row: Prepared
  ): Promise<Prepared> {
    const { canvas, brandPos } = LAYOUT;
    const settings = row.settings || {
      photoY: LAYOUT.photoSlot.y,
      photoH: LAYOUT.photoSlot.h,
      textX: canvas.w / 2,
      textY: canvas.h - 67,
      fontSize: 24,
      lineHeight: 30,
      maxTextAdjustment: 10,
    };

    const cv = document.createElement("canvas");
    cv.width = canvas.w;
    cv.height = canvas.h;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.w, canvas.h);
    ctx.drawImage(tpl, 0, 0, canvas.w, canvas.h);

    const file = mapFiles.get(row.filename);
    if (file) {
      const src = URL.createObjectURL(file);
      row.src = src;
      const img = await loadImage(src);

      // Calcular ancho automáticamente basado en aspect ratio y alto deseado
      const aspectRatio = img.width / img.height;
      const calculatedWidth = settings.photoH * aspectRatio;

      // Centrar automáticamente la imagen horizontalmente
      const centeredX = (canvas.w - calculatedWidth) / 2;

      const { w, h, x, y } = fitCover(
        img.width,
        img.height,
        calculatedWidth,
        settings.photoH
      );
      ctx.drawImage(img, x + centeredX, y + settings.photoY, w, h);
    }

    // Configurar estilo del texto
    ctx.font = `900 ${settings.fontSize}px Montserrat, sans-serif`;

    // Asegurar que la fuente esté cargada
    await document.fonts.load(`900 ${settings.fontSize}px Montserrat`);
    await document.fonts.ready;

    const maxTextWidth = canvas.w - 54;

    // Concatenar título y precio en un solo texto y convertir a mayúsculas
    const titleWithPrice = `${row.title} ${fmtCOP(row.price)}`.toUpperCase();

    // Dibujar título con precio concatenado en un solo rectángulo
    await drawTextWithBackground(
      ctx,
      titleWithPrice,
      maxTextWidth,
      settings.textY,
      settings.lineHeight,
      canvas.w,
      canvas.h,
      settings.maxTextAdjustment || 50
    );

    // SKU en la esquina superior izquierda
    ctx.fillStyle = "#666";
    ctx.strokeStyle = "#666";
    ctx.textAlign = "left";
    ctx.font = `600 ${brandPos.size}px system-ui,Segoe UI,Roboto,sans-serif`;
    // ctx.fillText(row.sku, brandPos.x, brandPos.y);

    const blob: Blob = await new Promise((res) =>
      cv.toBlob((b) => res(b!), "image/jpeg", 0.9)
    );
    return { ...row, outBlob: blob, outName: `${row.sku}.jpg`, status: "ok" };
  }

  async function updateSingleImage(index: number) {
    if (!templateUrl || !rows[index] || busy) return;

    // Verificar que no esté ya procesando esta imagen
    const currentRow = rows[index];
    if (currentRow.status === "processing") return;

    // Marcar como procesando
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, status: "processing" } : r))
    );

    try {
      setBusy(true);
      const tpl = await loadImage(templateUrl);
      const updated = await composeOne(tpl, rows[index]);
      setRows((prev) => prev.map((r, i) => (i === index ? updated : r)));
    } catch (e: any) {
      setRows((prev) =>
        prev.map((r, i) =>
          i === index
            ? { ...r, status: "error: " + e?.message, outBlob: null }
            : r
        )
      );
    } finally {
      setBusy(false);
    }
  }

  const updateRowSettings = (
    index: number,
    settings: Partial<Prepared["settings"]>,
    autoUpdate: boolean = false
  ) => {
    // Actualizar configuraciones
    setRows((prev) =>
      prev.map((r, i) =>
        i === index ? { ...r, settings: { ...r.settings, ...settings } } : r
      )
    );

    // Si autoUpdate está habilitado, actualizar imagen automáticamente
    if (autoUpdate) {
      setTimeout(() => updateSingleImage(index), 100);
    }
  };

  const updateRowImage = (index: number, newFilename: string) => {
    // Actualizar el filename de la imagen
    setRows((prev) =>
      prev.map((r, i) =>
        i === index
          ? { ...r, filename: newFilename, outBlob: null, status: "pendiente" }
          : r
      )
    );
  };

  const uploadNewImageForRow = (index: number, file: File) => {
    // Agregar la nueva imagen al mapa de archivos personalizados
    setCustomFiles((prev) => new Map(prev).set(file.name, file));

    // Actualizar el row con el nuevo filename
    setRows((prev) =>
      prev.map((r, i) =>
        i === index
          ? { ...r, filename: file.name, outBlob: null, status: "pendiente" }
          : r
      )
    );
  };

  async function handleCompose() {
    if (!templateUrl || rows.length === 0) return;
    setBusy(true);
    const tpl = await loadImage(templateUrl);
    const out: Prepared[] = [];
    for (const r of rows) {
      try {
        out.push(await composeOne(tpl, r));
      } catch (e: any) {
        out.push({
          ...r,
          status: "error: " + e?.message,
          outBlob: null,
          outName: `${r.sku}.jpg`,
        });
      }
    }
    setRows(out);
    setBusy(false);
  }

  async function downloadZip() {
    const zip = new JSZip();
    const report: any[] = [];
    for (const r of rows.filter((x) => x.approved)) {
      if (r.outBlob) zip.file(r.outName!, r.outBlob);
      report.push({
        sku: r.sku,
        action: r.action,
        title: r.title,
        price: r.price,
        filename: r.filename,
        output: r.outName || "",
        status: r.status || "",
      });
    }
    const csv = Papa.unparse(report);
    zip.file("results.csv", csv);
    const blob = await zip.generateAsync({ type: "blob" });
    (window as any).saveAs
      ? (window as any).saveAs(blob, "catalog_images.zip")
      : saveAs(blob, "catalog_images.zip");
  }

  async function downloadZipWithRappiExcel() {
    setBusy(true);
    try {
      const zip = new JSZip();
      const rowsAprobadas = rows.filter((x) => x.approved);

      // Imágenes
      for (const r of rowsAprobadas) {
        if (r.outBlob) zip.file(r.outName!, r.outBlob);
      }

      // CSV de resultados
      const report: any[] = [];
      for (const r of rowsAprobadas) {
        report.push({
          sku: r.sku,
          action: r.action,
          title: r.title,
          price: r.price,
          filename: r.filename,
          output: r.outName || "",
          status: r.status || "",
        });
      }
      const csv = Papa.unparse(report);
      zip.file("results.csv", csv);

      // Crear Excel de Rappi con valores por defecto
      const rappiExcelBlob = createRappiExcel(rowsAprobadas);
      zip.file("rappi_productos.xlsx", rappiExcelBlob);

      // Genera y descarga
      const finalZip = await zip.generateAsync({ type: "blob" });
      saveAs(finalZip, "catalogo_rappi.zip");
    } catch (error: any) {
      console.error("Error generando ZIP con Excel Rappi:", error);
      alert("Error generando el archivo: " + error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("min-h-screen p-6", dark && "dark")}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Catalog Composer · shadcn</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm">Dark</span>
            <Switch checked={dark} onCheckedChange={setDark} />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Entrada</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>1) Plantilla (PNG/JPG)</Label>
                <Input type="file" accept="image/*" onChange={onFileLoad} />
              </div>
              <div className="space-y-1.5">
                <Label>2) CSV (sku,action,title,price,filename)</Label>
                <Input type="file" accept=".csv" onChange={loadCSV} />
              </div>
              <div className="space-y-1.5">
                <Label>3) Fotos (múltiples)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    filesRef.current = e.target.files;
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button disabled={busy} onClick={handleCompose}>
                  {busy ? "Procesando..." : "Componer imágenes"}
                </Button>
                <Button variant="secondary" onClick={downloadZip}>
                  Descargar ZIP + CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={downloadZipWithRappiExcel}
                  disabled={busy}
                >
                  {busy ? "Generando..." : "Descargar ZIP + Excel Rappi"}
                </Button>
              </div>
            </div>
            <div className="border rounded-2xl p-2">
              <p className="text-sm opacity-70">Vista previa de plantilla</p>
              {templateUrl ? (
                <img
                  src={templateUrl}
                  className="max-w-full border rounded-xl"
                />
              ) : (
                <div className="h-64 grid place-items-center text-sm text-gray-500">
                  Sin plantilla
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {rows.map((r, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="truncate">
                    {r.sku || "Sin SKU"}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setEditingIndex(editingIndex === i ? null : i)
                      }
                    >
                      ✏️
                    </Button>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={!!r.approved}
                        onCheckedChange={(v) =>
                          setRows((prev) =>
                            prev.map((x, j) =>
                              j === i ? { ...x, approved: !!v } : x
                            )
                          )
                        }
                      />{" "}
                      ✓
                    </label>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {r.action} · {r.filename}
                  {customFiles.has(r.filename) && (
                    <span className="text-blue-600 ml-1">📤</span>
                  )}
                  {r.status === "pendiente" && (
                    <span className="text-orange-600 ml-1">⚠️</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {r.outBlob ? (
                  <img
                    src={URL.createObjectURL(r.outBlob)}
                    className="w-full aspect-square object-cover rounded-xl border"
                  />
                ) : (
                  <div className="w-full aspect-square grid place-items-center text-xs bg-secondary rounded-xl border">
                    Sin procesar
                  </div>
                )}
                <div className="mt-2 text-xs line-clamp-3">{r.title}</div>
                <div className="text-xs font-semibold">{String(r.price)}</div>
                {r.status && (
                  <div className="mt-1 text-[11px] text-gray-500">
                    {r.status}
                  </div>
                )}

                {/* Editor individual */}
                {editingIndex === i && r.settings && (
                  <div className="mt-3 p-3 border rounded-lg bg-secondary/50 space-y-2">
                    <div className="text-xs font-semibold">Editor</div>
                    <div className="space-y-1">
                      <div className="text-[10px] text-gray-600 bg-blue-50 p-2 rounded">
                        💡 El ancho se calcula automáticamente manteniendo las
                        proporciones originales de la imagen. Solo ajusta la
                        posición Y y el alto.
                      </div>
                      <div className="text-[10px] text-gray-600 bg-green-50 p-2 rounded">
                        📏 Ajuste automático inteligente: 1 línea (0px), 2
                        líneas (10px), 3 líneas (25px), 4+ líneas (configuración
                        manual)
                      </div>
                    </div>

                    {/* Selector de imagen */}
                    <div className="space-y-1">
                      <Label className="text-[10px]">Cambiar Imagen</Label>

                      {/* Selector de imágenes existentes */}
                      <select
                        className="w-full h-6 text-xs border border-gray-300 rounded px-2 bg-white"
                        value={r.filename}
                        onChange={(e) => {
                          updateRowImage(i, e.target.value);
                        }}
                      >
                        <option value={r.filename}>
                          {r.filename} (actual)
                        </option>
                        {Array.from(mapFiles.keys())
                          .filter((filename) => filename !== r.filename)
                          .map((filename) => (
                            <option key={filename} value={filename}>
                              {filename}
                            </option>
                          ))}
                      </select>

                      {/* Input para subir nueva imagen */}
                      <div className="flex items-center gap-1">
                        <input
                          type="file"
                          accept="image/*"
                          id={`image-upload-${i}`}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              uploadNewImageForRow(i, file);
                            }
                          }}
                        />
                        <label
                          htmlFor={`image-upload-${i}`}
                          className="flex-1 h-6 text-xs bg-green-100 hover:bg-green-200 border border-green-300 rounded px-2 cursor-pointer flex items-center justify-center text-green-700 font-medium"
                        >
                          📤 Subir nueva imagen
                        </label>
                      </div>

                      {/* Miniatura de la imagen actual */}
                      {mapFiles.get(r.filename) && (
                        <div className="flex items-center gap-2 mt-1">
                          <img
                            src={URL.createObjectURL(mapFiles.get(r.filename)!)}
                            className="w-12 h-12 object-cover border rounded"
                            alt="Vista previa"
                          />
                          <div className="flex-1">
                            <span className="text-[9px] text-gray-500 block">
                              {r.filename}
                              {customFiles.has(r.filename) && (
                                <span className="text-blue-600 ml-1">
                                  📤 Nueva
                                </span>
                              )}
                            </span>
                            {r.status === "pendiente" && (
                              <span className="text-[8px] text-orange-600 font-medium">
                                ⚠️ Imagen cambiada - Aplicar cambios
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Controles de imagen */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <Label className="text-[10px]">Pos Y Imagen</Label>
                        <Input
                          type="number"
                          defaultValue={r.settings.photoY}
                          onBlur={(e) =>
                            updateRowSettings(
                              i,
                              {
                                photoY: Number(e.target.value),
                              },
                              autoUpdateEnabled.has(i)
                            )
                          }
                          className="h-6 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Alto Imagen</Label>
                        <Input
                          type="number"
                          defaultValue={r.settings.photoH}
                          onBlur={(e) =>
                            updateRowSettings(
                              i,
                              {
                                photoH: Number(e.target.value),
                              },
                              autoUpdateEnabled.has(i)
                            )
                          }
                          className="h-6 text-xs"
                        />
                      </div>
                    </div>

                    {/* Controles de texto */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <Label className="text-[10px]">Pos Y Texto</Label>
                        <Input
                          type="number"
                          defaultValue={r.settings.textY}
                          onBlur={(e) =>
                            updateRowSettings(
                              i,
                              {
                                textY: Number(e.target.value),
                              },
                              autoUpdateEnabled.has(i)
                            )
                          }
                          className="h-6 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Tamaño Fuente</Label>
                        <Input
                          type="number"
                          defaultValue={r.settings.fontSize}
                          onBlur={(e) =>
                            updateRowSettings(
                              i,
                              {
                                fontSize: Number(e.target.value),
                              },
                              autoUpdateEnabled.has(i)
                            )
                          }
                          className="h-6 text-xs"
                        />
                      </div>
                    </div>

                    {/* Control para ajuste automático del texto */}
                    <div className="space-y-1">
                      <Label className="text-[10px]">
                        Máximo Ajuste Auto (px)
                      </Label>
                      <Input
                        type="number"
                        defaultValue={r.settings.maxTextAdjustment || 50}
                        onBlur={(e) =>
                          updateRowSettings(
                            i,
                            {
                              maxTextAdjustment: Number(e.target.value),
                            },
                            autoUpdateEnabled.has(i)
                          )
                        }
                        className="h-6 text-xs"
                        placeholder="50"
                      />
                      <div className="text-[9px] text-gray-500">
                        🔧 Ajuste automático: 1 línea=0px, 2 líneas=10px, 3
                        líneas=25px, 4+ líneas=este valor
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={() => updateSingleImage(i)}
                        disabled={busy || r.status === "processing"}
                        className="flex-1 h-6 text-xs"
                      >
                        {r.status === "processing" ? "⏳" : busy ? "🔄" : "▶️"}
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          autoUpdateEnabled.has(i) ? "default" : "outline"
                        }
                        onClick={() => {
                          const newSet = new Set(autoUpdateEnabled);
                          if (autoUpdateEnabled.has(i)) {
                            newSet.delete(i);
                          } else {
                            newSet.add(i);
                          }
                          setAutoUpdateEnabled(newSet);
                        }}
                        disabled={busy || r.status === "processing"}
                        className="flex-1 h-6 text-xs"
                      >
                        {autoUpdateEnabled.has(i) ? "� Auto" : "⚪ Auto"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
