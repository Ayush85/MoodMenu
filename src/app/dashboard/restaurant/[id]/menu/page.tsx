"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useToast } from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";
import { SkeletonLine, SkeletonBlock } from "@/components/Skeleton";
import { UtensilsCrossed, Search, ClipboardList, Pencil, ArrowLeftRight, Trash2, Plus, Sparkles } from "lucide-react";
import * as XLSX from "xlsx";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  isAvailable: boolean;
  isSpecial: boolean;
  tags: string[];
}

interface Category {
  id: string;
  name: string;
  order: number;
  items: MenuItem[];
}

interface Restaurant {
  id: string;
  name: string;
  city: string;
  slug: string;
  logo: string | null;
  categories: Category[];
}

// ─── CSV row (parsed client-side) ───────────────────────────────────────────
interface CsvRow {
  category: string;
  name: string;
  description: string;
  price: number;
  tags: string[];
  _key: string; // row index as string
}


const CSV_TEMPLATE_HEADER = "Category,Name,Description,Price,Tags";
const CSV_TEMPLATE_ROWS = [
  "Beverages,Mango Juice,Fresh mango juice,120,\"cold,fresh\"",
  "Beverages,Lemonade,Fresh lemonade with mint,80,cold",
  "Starters,Chicken Wings,Crispy wings with dipping sauce,350,\"hot,spicy\"",
  "Starters,Veg Spring Rolls,Golden crispy rolls,200,\"veg,crispy\"",
  "Mains,Butter Chicken,Rich tomato-cream curry,450,\"chicken,popular\"",
];
const CSV_TEMPLATE = [CSV_TEMPLATE_HEADER, ...CSV_TEMPLATE_ROWS].join("\n");

function parseCsv(text: string): { rows: CsvRow[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const rows: CsvRow[] = [];
  const errors: string[] = [];

  // Skip header line if present
  const start = lines[0]?.toLowerCase().startsWith("category") ? 1 : 0;

  for (let i = start; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parse: handle quoted fields
    const fields: string[] = [];
    let current = "";
    let inQuote = false;
    for (let ci = 0; ci < line.length; ci++) {
      const ch = line[ci];
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());

    const [category, name, description, priceStr, tagsStr] = fields;

    if (!category) { errors.push(`Row ${i + 1}: Missing category`); continue; }
    if (!name) { errors.push(`Row ${i + 1}: Missing name`); continue; }
    const price = parseFloat(priceStr || "0");
    if (isNaN(price) || price < 0) { errors.push(`Row ${i + 1}: Invalid price "${priceStr}"`); continue; }

    const tags = tagsStr
      ? tagsStr.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    rows.push({ category, name, description: description || "", price, tags, _key: String(i) });
  }

  return { rows, errors };
}

export default function MenuManagePage() {
  const params = useParams();
  const { toast } = useToast();
  const id = params.id as string;
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // Category add
  const [newCategory, setNewCategory] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  // Category rename
  const [renamingCat, setRenamingCat] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameRef = useRef<HTMLInputElement>(null);

  // Item add
  const [addingItem, setAddingItem] = useState<string | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [itemForm, setItemForm] = useState({ name: "", description: "", price: "", tags: "", image: "" });
  const [generatingItemImage, setGeneratingItemImage] = useState(false);

  // Item edit
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", price: "", tags: "", image: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [generatingEditImage, setGeneratingEditImage] = useState(false);

  // Move item between categories
  const [movingItem, setMovingItem] = useState<{ item: MenuItem; fromCatId: string } | null>(null);

  // ─── Photo import state ───────────────────────────────────────────────────
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMode, setImportMode] = useState<"photo" | "csv">("csv");
  const [importFiles, setImportFiles] = useState<File[]>([]);
  const [importPreviews, setImportPreviews] = useState<string[]>([]);
  const [importParsed, setImportParsed] = useState<{
    categories: { name: string; items: { name: string; description: string | null; price: number; tags: string[] }[] }[];
  } | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [importFileErrors, setImportFileErrors] = useState<string[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSaving, setImportSaving] = useState(false);
  const [selectedImportItems, setSelectedImportItems] = useState<Set<string>>(new Set());

  // ─── Post-import bulk image generation ───────────────────────────────────
  const [postImportItems, setPostImportItems] = useState<{ id: string; name: string; description: string | null }[]>([]);
  const [bulkGenActive, setBulkGenActive] = useState(false);
  const [bulkGenProgress, setBulkGenProgress] = useState({ current: 0, total: 0 });
  const [bulkGenSource, setBulkGenSource] = useState<"stock" | "ai">("stock");
  const bulkGenStopRef = useRef(false);

  // ─── Whole-menu bulk image generation (existing items with no image) ─────
  const [wholeMenuGenActive, setWholeMenuGenActive] = useState(false);
  const [wholeMenuGenProgress, setWholeMenuGenProgress] = useState({ current: 0, total: 0, currentName: "" });
  const [wholeMenuGenSource, setWholeMenuGenSource] = useState<"stock" | "ai">("stock");
  const wholeMenuGenStopRef = useRef(false);

  // ─── CSV import state ─────────────────────────────────────────────────────
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvSelected, setCsvSelected] = useState<Set<string>>(new Set());
  const [csvSaving, setCsvSaving] = useState(false);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);

  // Menu search/filter
  const [menuSearch, setMenuSearch] = useState("");

  function fetchRestaurant() {
    fetch(`/api/restaurants/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setRestaurant(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchRestaurant();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Focus rename input when editing
  useEffect(() => {
    if (renamingCat && renameRef.current) renameRef.current.focus();
  }, [renamingCat]);

  // ─── Category CRUD ────────────────────────────────────────────────────────
  async function addCategory() {
    if (!newCategory.trim()) return;
    setSavingCategory(true);
    await fetch(`/api/restaurants/${id}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategory }),
    });
    setNewCategory("");
    setSavingCategory(false);
    toast("Category added");
    fetchRestaurant();
  }

  function startRename(cat: Category) {
    setRenamingCat(cat.id);
    setRenameValue(cat.name);
  }

  async function saveRename(catId: string) {
    if (!renameValue.trim()) { setRenamingCat(null); return; }
    await fetch(`/api/restaurants/${id}/categories`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: catId, name: renameValue }),
    });
    setRenamingCat(null);
    toast("Category renamed");
    fetchRestaurant();
  }

  function deleteCategory(categoryId: string) {
    setConfirmAction({
      title: "Delete Category",
      message: "This will delete the category and all its items. Are you sure?",
      onConfirm: async () => {
        await fetch(`/api/restaurants/${id}/categories`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryId }),
        });
        setConfirmAction(null);
        toast("Category deleted");
        fetchRestaurant();
      },
    });
  }

  // ─── Item CRUD ────────────────────────────────────────────────────────────
  async function addItem(categoryId: string) {
    if (!itemForm.name || !itemForm.price) return;
    setSavingItem(true);
    await fetch(`/api/restaurants/${id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...itemForm,
        tags: itemForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
        categoryId,
      }),
    });
    setItemForm({ name: "", description: "", price: "", tags: "", image: "" });
    setAddingItem(null);
    setSavingItem(false);
    toast("Item added");
    fetchRestaurant();
  }

  function deleteItem(itemId: string) {
    setConfirmAction({
      title: "Delete Item",
      message: "This item will be permanently removed from your menu.",
      onConfirm: async () => {
        await fetch(`/api/restaurants/${id}/items/${itemId}`, { method: "DELETE" });
        setConfirmAction(null);
        toast("Item deleted");
        fetchRestaurant();
      },
    });
  }

  async function toggleAvailability(item: MenuItem) {
    await fetch(`/api/restaurants/${id}/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !item.isAvailable }),
    });
    fetchRestaurant();
  }

  async function toggleSpecial(item: MenuItem) {
    await fetch(`/api/restaurants/${id}/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isSpecial: !item.isSpecial }),
    });
    fetchRestaurant();
  }

  function openEdit(item: MenuItem) {
    setEditingItem(item);
    setEditForm({
      name: item.name,
      description: item.description || "",
      price: String(item.price),
      tags: item.tags.join(", "),
      image: item.image || "",
    });
  }

  async function saveEdit() {
    if (!editingItem) return;
    setSavingEdit(true);
    await fetch(`/api/restaurants/${id}/items/${editingItem.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        description: editForm.description || null,
        price: editForm.price,
        tags: editForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
        image: editForm.image || null,
      }),
    });
    setSavingEdit(false);
    setEditingItem(null);
    toast("Item updated");
    fetchRestaurant();
  }

  async function moveItem(itemId: string, newCategoryId: string) {
    await fetch(`/api/restaurants/${id}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: newCategoryId }),
    });
    setMovingItem(null);
    toast("Item moved");
    fetchRestaurant();
  }

  // ─── Image uploads ────────────────────────────────────────────────────────
  async function uploadImage(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      return data.url || null;
    } catch {
      toast("Image upload failed", "error");
      return null;
    }
  }

  async function handleItemImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file);
    if (url) setItemForm((p) => ({ ...p, image: url }));
  }

  async function handleEditImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file);
    if (url) setEditForm((p) => ({ ...p, image: url }));
  }

  async function generateImage(name: string, description: string): Promise<string | null> {
    try {
      const res = await fetch(`/api/restaurants/${id}/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Image generation failed", "error");
        return null;
      }
      return data.url || null;
    } catch {
      toast("Image generation failed", "error");
      return null;
    }
  }

  async function handleGenerateItemImage() {
    if (!itemForm.name.trim()) return;
    setGeneratingItemImage(true);
    const url = await generateImage(itemForm.name, itemForm.description);
    if (url) setItemForm((p) => ({ ...p, image: url }));
    setGeneratingItemImage(false);
  }

  async function handleGenerateEditImage() {
    if (!editForm.name.trim() || !editingItem) return;
    setGeneratingEditImage(true);
    const url = await generateImage(editForm.name, editForm.description);
    if (url) {
      setEditForm((p) => ({ ...p, image: url }));
      await fetch(`/api/restaurants/${id}/items/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: url }),
      });
      toast("Image generated and saved");
      fetchRestaurant();
    }
    setGeneratingEditImage(false);
  }

  // ─── Photo import ─────────────────────────────────────────────────────────
  function handleImportFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setImportFiles(files);
    setImportParsed(null);
    setImportError(null);
    setImportFileErrors([]);
    setSelectedImportItems(new Set());
    setImportPreviews(files.map((f) => URL.createObjectURL(f)));
  }

  function removeImportFile(index: number) {
    setImportFiles((prev) => prev.filter((_, i) => i !== index));
    setImportPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  type ParsedMenu = { categories: { name: string; items: { name: string; description: string | null; price: number; tags: string[] }[] }[] };

  function mergeParsedMenus(results: ParsedMenu[]): ParsedMenu {
    const categoriesByKey = new Map<string, { name: string; items: { name: string; description: string | null; price: number; tags: string[] }[] }>();

    for (const result of results) {
      for (const cat of result.categories) {
        const catKey = cat.name.trim().toLowerCase();
        let merged = categoriesByKey.get(catKey);
        if (!merged) {
          merged = { name: cat.name, items: [] };
          categoriesByKey.set(catKey, merged);
        }

        const existingItemKeys = new Set(merged.items.map((i) => i.name.trim().toLowerCase()));
        for (const item of cat.items) {
          const itemKey = item.name.trim().toLowerCase();
          if (existingItemKeys.has(itemKey)) continue; // auto-merge exact name matches
          existingItemKeys.add(itemKey);
          merged.items.push(item);
        }
      }
    }

    return { categories: Array.from(categoriesByKey.values()) };
  }

  async function runPhotoImport() {
    if (importFiles.length === 0) return;
    setImportLoading(true);
    setImportError(null);
    setImportFileErrors([]);

    const results: ParsedMenu[] = [];
    const failures: string[] = [];

    for (let i = 0; i < importFiles.length; i++) {
      setImportProgress({ current: i + 1, total: importFiles.length });
      const file = importFiles[i];
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`/api/restaurants/${id}/import-from-photo`, { method: "POST", body: fd });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to parse menu");
        }
        const data = await res.json();
        results.push(data);
      } catch (err) {
        failures.push(`${file.name}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    setImportProgress(null);
    setImportFileErrors(failures);

    if (results.length === 0) {
      setImportError(failures[0] || "Failed to parse any of the selected photos");
      setImportLoading(false);
      return;
    }

    const merged = mergeParsedMenus(results);
    setImportParsed(merged);
    const allKeys = new Set<string>();
    merged.categories.forEach((cat, ci) => {
      cat.items.forEach((_, ii) => allKeys.add(`${ci}-${ii}`));
    });
    setSelectedImportItems(allKeys);
    setImportLoading(false);
  }

  async function savePhotoImportedItems() {
    if (!importParsed || !restaurant) return;
    setImportSaving(true);
    setImportError(null);
    try {
      // Build map of existing categories to avoid duplicates
      const catMap: Record<string, string> = {};
      for (const cat of restaurant.categories) {
        catMap[cat.name.toLowerCase()] = cat.id;
      }

      const created: { id: string; name: string; description: string | null }[] = [];
      for (const [ci, cat] of importParsed.categories.entries()) {
        const selectedItems = cat.items.filter((_, ii) => selectedImportItems.has(`${ci}-${ii}`));
        if (selectedItems.length === 0) continue;

        let categoryId = catMap[cat.name.toLowerCase()];
        if (!categoryId) {
          const catRes = await fetch(`/api/restaurants/${id}/categories`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: cat.name }),
          });
          if (!catRes.ok) throw new Error(`Failed to create category: ${cat.name}`);
          const catData = await catRes.json();
          categoryId = catData.id;
          catMap[cat.name.toLowerCase()] = categoryId;
        }

        for (const item of selectedItems) {
          const itemRes = await fetch(`/api/restaurants/${id}/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...item, categoryId }),
          });
          if (itemRes.ok) {
            const itemData = await itemRes.json();
            created.push({ id: itemData.id, name: itemData.name, description: itemData.description });
          }
        }
      }

      toast(`Imported ${created.length} item${created.length !== 1 ? "s" : ""} successfully`);
      fetchRestaurant();
      if (created.length > 0) {
        setPostImportItems(created);
      } else {
        resetImportModal();
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Failed to import menu");
    } finally {
      setImportSaving(false);
    }
  }

  function toggleImportItem(key: string) {
    setSelectedImportItems((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  // ─── Post-import bulk image generation ───────────────────────────────────
  async function runBulkImageGeneration() {
    setBulkGenActive(true);
    bulkGenStopRef.current = false;
    setBulkGenProgress({ current: 0, total: postImportItems.length });

    let generated = 0;
    for (let i = 0; i < postImportItems.length; i++) {
      if (bulkGenStopRef.current) break;
      const item = postImportItems[i];
      setBulkGenProgress({ current: i + 1, total: postImportItems.length });

      try {
        const res = await fetch(`/api/restaurants/${id}/generate-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: item.name, description: item.description, source: bulkGenSource }),
        });
        const data = await res.json();
        if (!res.ok) {
          // If the AI image provider isn't configured at all, no point retrying per item
          if (String(data.error || "").includes("AI_IMAGE_PROVIDER")) {
            toast(data.error, "error");
            break;
          }
          continue;
        }
        if (data.url) {
          await fetch(`/api/restaurants/${id}/items/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: data.url }),
          });
          generated++;
        }
      } catch {
        // Skip this item, continue with the rest
      }
    }

    setBulkGenActive(false);
    toast(`Generated ${generated} of ${postImportItems.length} image${postImportItems.length !== 1 ? "s" : ""}`);
    fetchRestaurant();
    resetImportModal();
  }

  function stopBulkImageGeneration() {
    bulkGenStopRef.current = true;
  }

  function skipBulkImageGeneration() {
    resetImportModal();
  }

  // ─── Whole-menu bulk image generation ────────────────────────────────────
  const missingImageItems = (restaurant?.categories ?? []).flatMap((cat) =>
    cat.items.filter((item) => !item.image)
  );

  async function runWholeMenuImageGeneration() {
    const targets = missingImageItems;
    if (targets.length === 0) return;

    setWholeMenuGenActive(true);
    wholeMenuGenStopRef.current = false;
    setWholeMenuGenProgress({ current: 0, total: targets.length, currentName: "" });

    let generated = 0;
    for (let i = 0; i < targets.length; i++) {
      if (wholeMenuGenStopRef.current) break;
      const item = targets[i];
      setWholeMenuGenProgress({ current: i + 1, total: targets.length, currentName: item.name });

      try {
        const res = await fetch(`/api/restaurants/${id}/generate-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: item.name, description: item.description, source: wholeMenuGenSource }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (String(data.error || "").includes("AI_IMAGE_PROVIDER")) {
            toast(data.error, "error");
            break;
          }
          continue;
        }
        if (data.url) {
          await fetch(`/api/restaurants/${id}/items/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: data.url }),
          });
          generated++;
          // Reflect the new image immediately so the grid updates live
          setRestaurant((prev) =>
            prev
              ? {
                  ...prev,
                  categories: prev.categories.map((cat) => ({
                    ...cat,
                    items: cat.items.map((i) => (i.id === item.id ? { ...i, image: data.url } : i)),
                  })),
                }
              : prev
          );
        }
      } catch {
        // Skip this item, continue with the rest
      }
    }

    setWholeMenuGenActive(false);
    toast(`Generated ${generated} of ${targets.length} image${targets.length !== 1 ? "s" : ""}`);
  }

  function stopWholeMenuImageGeneration() {
    wholeMenuGenStopRef.current = true;
  }

  // ─── CSV import ───────────────────────────────────────────────────────────
  function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    setCsvRows([]);
    setCsvErrors([]);
    setCsvSelected(new Set());

    const isExcel = /\.(xlsx|xls)$/i.test(file.name);
    const reader = new FileReader();

    if (isExcel) {
      reader.onload = (ev) => {
        const data = ev.target?.result;
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const csvText = XLSX.utils.sheet_to_csv(ws);
        const { rows, errors } = parseCsv(csvText);
        setCsvRows(rows);
        setCsvErrors(errors);
        setCsvSelected(new Set(rows.map((r) => r._key)));
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const { rows, errors } = parseCsv(text);
        setCsvRows(rows);
        setCsvErrors(errors);
        setCsvSelected(new Set(rows.map((r) => r._key)));
      };
      reader.readAsText(file);
    }
  }

  function handleCsvPaste(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    const { rows, errors } = parseCsv(text);
    setCsvRows(rows);
    setCsvErrors(errors);
    setCsvSelected(new Set(rows.map((r) => r._key)));
    if (rows.length > 0) setCsvFileName("pasted data");
  }

  function toggleCsvRow(key: string) {
    setCsvSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function selectAllCsvRows() {
    setCsvSelected(new Set(csvRows.map((r) => r._key)));
  }

  function deselectAllCsvRows() {
    setCsvSelected(new Set());
  }

  async function saveCsvImport() {
    const selected = csvRows.filter((r) => csvSelected.has(r._key));
    if (selected.length === 0) return;
    setCsvSaving(true);
    setImportError(null);
    try {
      const res = await fetch(`/api/restaurants/${id}/import-csv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: selected.map(({ category, name, description, price, tags }) => ({
            category,
            name,
            description,
            price,
            tags,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Import failed");
      }
      const result = await res.json();
      toast(`Imported ${result.itemsCreated} items${result.categoriesCreated > 0 ? ` in ${result.categoriesCreated} new categories` : ""}`);
      fetchRestaurant();
      const created: { id: string; name: string; description: string | null }[] = Array.isArray(result.items) ? result.items : [];
      if (created.length > 0) {
        setPostImportItems(created);
      } else {
        resetImportModal();
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setCsvSaving(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "menu-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetImportModal() {
    setShowImportModal(false);
    setImportFiles([]);
    setImportPreviews([]);
    setImportParsed(null);
    setImportError(null);
    setImportFileErrors([]);
    setImportProgress(null);
    setCsvRows([]);
    setCsvErrors([]);
    setCsvSelected(new Set());
    setCsvFileName(null);
    setPostImportItems([]);
    setBulkGenActive(false);
    setBulkGenProgress({ current: 0, total: 0 });
  }

  // ─── Filtered categories ──────────────────────────────────────────────────
  const filteredCategories = restaurant?.categories.map((cat) => {
    if (!menuSearch.trim()) return cat;
    const q = menuSearch.toLowerCase();
    return {
      ...cat,
      items: cat.items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q)) ||
          item.description?.toLowerCase().includes(q)
      ),
    };
  }).filter((cat) => !menuSearch.trim() || cat.items.length > 0);

  // ─── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="page-shell">
        <div className="mb-6"><SkeletonLine width="192px" height="32px" /></div>
        <div className="mb-6"><SkeletonBlock height="h-12" /></div>
        {[1, 2].map((i) => (
          <div key={i} className="surface-card p-6 mb-4">
            <div className="mb-4"><SkeletonLine width="112px" height="20px" /></div>
            <div className="space-y-3">
              <SkeletonBlock height="h-16" />
              <SkeletonBlock height="h-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!restaurant) return <div>Restaurant not found</div>;

  return (
    <div className="page-shell animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-center gap-4 mb-6">
        <label className="relative group cursor-pointer shrink-0">
          {restaurant.logo ? (
            <img src={restaurant.logo} alt={restaurant.name} className="w-14 h-14 rounded-2xl object-cover ring-1 ring-gray-200" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-100 to-rose-100 flex items-center justify-center">
              <UtensilsCrossed className="w-6 h-6 text-orange-400" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <input type="file" accept="image/*" className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const url = await uploadImage(file);
              if (url) {
                await fetch(`/api/restaurants/${id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ logo: url }),
                });
                fetchRestaurant();
              }
            }}
          />
        </label>
        <div>
          <h1 className="page-title">{restaurant.name}</h1>
          <p className="page-subtitle flex items-center gap-1 mt-0.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {restaurant.city}
          </p>
        </div>
      </div>

      {/* ── Toolbar: add category + search + import ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="New category name (e.g., Appetizers)"
          className="control-input flex-1 !py-3"
          onKeyDown={(e) => e.key === "Enter" && addCategory()}
        />
        <button onClick={addCategory} disabled={savingCategory}
          className="btn-soft !font-semibold w-full sm:w-auto disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {savingCategory
            ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          }
          {savingCategory ? "Adding..." : "Add Category"}
        </button>
        <button onClick={() => { setShowImportModal(true); setImportMode("csv"); }}
          className="flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 transition w-full sm:w-auto justify-center"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Bulk Import
        </button>
        {missingImageItems.length > 0 && !wholeMenuGenActive && (
          <div className="flex items-stretch rounded-xl border border-purple-200 overflow-hidden w-full sm:w-auto">
            <div className="flex items-center bg-purple-50">
              <button type="button" onClick={() => setWholeMenuGenSource("stock")}
                className={`px-2.5 py-3 text-xs font-semibold transition ${wholeMenuGenSource === "stock" ? "bg-purple-600 text-white" : "text-purple-700 hover:bg-purple-100"}`}
              >
                Stock
              </button>
              <button type="button" onClick={() => setWholeMenuGenSource("ai")}
                className={`px-2.5 py-3 text-xs font-semibold transition ${wholeMenuGenSource === "ai" ? "bg-purple-600 text-white" : "text-purple-700 hover:bg-purple-100"}`}
              >
                AI
              </button>
            </div>
            <button onClick={runWholeMenuImageGeneration}
              className="flex items-center gap-2 px-4 py-3 font-semibold text-sm bg-purple-50 text-purple-700 hover:bg-purple-100 transition flex-1 justify-center"
            >
              <Sparkles className="w-4 h-4" />
              Generate {missingImageItems.length} Missing Image{missingImageItems.length !== 1 ? "s" : ""}
            </button>
          </div>
        )}
      </div>

      {/* ── Whole-menu image generation progress ── */}
      {wholeMenuGenActive && (
        <div className="surface-card p-4 mb-5 border-2 border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              Generating image {wholeMenuGenProgress.current} of {wholeMenuGenProgress.total}
              {wholeMenuGenProgress.currentName && <span className="text-gray-400 font-normal truncate">— {wholeMenuGenProgress.currentName}</span>}
            </p>
            <button onClick={stopWholeMenuImageGeneration} className="text-xs text-red-500 hover:text-red-600 font-medium shrink-0">
              Stop
            </button>
          </div>
          <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-purple-500 transition-all"
              style={{ width: `${(wholeMenuGenProgress.current / Math.max(wholeMenuGenProgress.total, 1)) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Search bar ── */}
      {(restaurant.categories.length > 0) && (
        <div className="relative mb-5">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={menuSearch}
            onChange={(e) => setMenuSearch(e.target.value)}
            placeholder="Search items by name, tag or description…"
            className="control-input !pl-9 w-full"
          />
          {menuSearch && (
            <button onClick={() => setMenuSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* ── Stats bar ── */}
      {restaurant.categories.length > 0 && (
        <div className="flex gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
            <span className="font-bold text-gray-700">{restaurant.categories.length}</span> categories
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
            <span className="font-bold text-gray-700">{restaurant.categories.reduce((s, c) => s + c.items.length, 0)}</span> items total
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
            <span className="font-bold text-emerald-700">
              {restaurant.categories.reduce((s, c) => s + c.items.filter((i) => i.isAvailable).length, 0)}
            </span>
            <span className="text-emerald-600">available</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
            <span className="font-bold text-amber-700">
              {restaurant.categories.reduce((s, c) => s + c.items.filter((i) => i.isSpecial).length, 0)}
            </span>
            <span className="text-amber-600">specials</span>
          </div>
        </div>
      )}

      {/* ── Categories & items ── */}
      {filteredCategories?.length === 0 ? (
        <div className="surface-card p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-4">
            {menuSearch ? <Search className="w-7 h-7 text-orange-400" /> : <ClipboardList className="w-7 h-7 text-orange-400" />}
          </div>
          <p className="text-gray-500">
            {menuSearch ? `No items match "${menuSearch}"` : "Add a category to start building your menu"}
          </p>
          {menuSearch && (
            <button onClick={() => setMenuSearch("")} className="mt-3 text-sm text-orange-500 hover:text-orange-600 font-medium">
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {filteredCategories?.map((cat) => (
            <div key={cat.id} className="surface-card overflow-hidden">
              {/* Category header */}
              <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-1 h-6 rounded-full bg-gradient-to-b from-orange-500 to-rose-500 shrink-0" />
                  {renamingCat === cat.id ? (
                    <input
                      ref={renameRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => saveRename(cat.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveRename(cat.id);
                        if (e.key === "Escape") setRenamingCat(null);
                      }}
                      className="text-base font-bold text-gray-900 border-b-2 border-orange-400 outline-none bg-transparent min-w-0 flex-1"
                    />
                  ) : (
                    <h2
                      className="text-base font-bold text-gray-900 cursor-pointer hover:text-orange-600 transition truncate"
                      onClick={() => startRename(cat)}
                      title="Click to rename"
                    >
                      {cat.name}
                    </h2>
                  )}
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                    {cat.items.length}
                  </span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => startRename(cat)}
                    className="text-xs text-gray-400 hover:text-blue-500 transition p-1 rounded"
                    title="Rename category"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setAddingItem(addingItem === cat.id ? null : cat.id)}
                    className="text-sm font-semibold text-orange-500 hover:text-orange-600 transition flex items-center gap-1 w-7 h-7 sm:w-auto sm:h-auto justify-center"
                    aria-label="Add item"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add Item</span>
                  </button>
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    className="text-sm text-red-400 hover:text-red-500 transition w-7 h-7 sm:w-auto sm:h-auto flex items-center justify-center"
                    aria-label="Delete category"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:hidden" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                </div>
              </div>

              {/* Add Item Form */}
              {addingItem === cat.id && (
                <div className="px-5 sm:px-6 py-5 bg-orange-50/50 border-b border-orange-100 space-y-3 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input type="text" placeholder="Item name *" value={itemForm.name}
                      onChange={(e) => setItemForm((p) => ({ ...p, name: e.target.value }))}
                      className="control-input !bg-white"
                    />
                    <input type="number" placeholder="Price (NPR) *" value={itemForm.price}
                      onChange={(e) => setItemForm((p) => ({ ...p, price: e.target.value }))}
                      className="control-input !bg-white"
                    />
                  </div>
                  <input type="text" placeholder="Description (optional)" value={itemForm.description}
                    onChange={(e) => setItemForm((p) => ({ ...p, description: e.target.value }))}
                    className="control-input w-full !bg-white"
                  />
                  <input type="text" placeholder="Tags (comma separated: hot, spicy, vegan)" value={itemForm.tags}
                    onChange={(e) => setItemForm((p) => ({ ...p, tags: e.target.value }))}
                    className="control-input w-full !bg-white"
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <input type="file" accept="image/*" onChange={handleItemImageUpload}
                      className="text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100"
                    />
                    <button type="button" onClick={handleGenerateItemImage}
                      disabled={!itemForm.name.trim() || generatingItemImage}
                      className="text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-4 py-2 whitespace-nowrap"
                    >
                      {generatingItemImage ? "Generating..." : "Generate with AI"}
                    </button>
                    {itemForm.image && (
                      <span className="text-green-600 text-xs flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Image ready
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => addItem(cat.id)} disabled={savingItem || !itemForm.name || !itemForm.price}
                      className="btn-primary !text-sm disabled:opacity-50"
                    >
                      {savingItem ? "Saving..." : "Save Item"}
                    </button>
                    <button onClick={() => setAddingItem(null)} className="btn-soft !text-sm">Cancel</button>
                  </div>
                </div>
              )}

              {/* Items list */}
              <div className="divide-y divide-gray-100">
                {cat.items.length === 0 ? (
                  <div className="px-5 sm:px-6 py-6 text-gray-400 text-sm text-center">
                    No items yet — click &quot;Add Item&quot; to get started
                  </div>
                ) : (
                  cat.items.map((item) => (
                    <div key={item.id} className={`px-4 sm:px-6 py-4 hover:bg-gray-50/50 transition ${!item.isAvailable ? "opacity-60" : ""}`}>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3 sm:gap-4">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover shrink-0 ring-1 ring-gray-100" />
                          ) : (
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-orange-50 to-rose-50 flex items-center justify-center shrink-0">
                              <UtensilsCrossed className="w-5 h-5 text-orange-400" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className={`font-semibold text-sm ${item.isAvailable ? "text-gray-900" : "text-gray-400 line-through"}`}>
                                {item.name}
                                {item.isSpecial && <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">⭐ Special</span>}
                              </h3>
                              <span className="font-bold text-gray-900 text-sm shrink-0">Rs. {item.price}</span>
                            </div>
                            {item.description && (
                              <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{item.description}</p>
                            )}
                            {item.tags.length > 0 && (
                              <div className="flex gap-1 mt-1.5 flex-wrap">
                                {item.tags.map((tag) => (
                                  <span key={tag} className="text-[10px] font-medium bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 sm:justify-end">
                          <button onClick={() => toggleAvailability(item)}
                            className={`text-xs px-2.5 py-1.5 rounded-full font-medium transition ${
                              item.isAvailable ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                          >
                            {item.isAvailable ? "Available" : "Unavailable"}
                          </button>
                          <button onClick={() => toggleSpecial(item)}
                            className={`text-xs px-2.5 py-1.5 rounded-full font-medium transition ${
                              item.isSpecial ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                          >
                            {item.isSpecial ? "⭐ Special" : "Set Special"}
                          </button>
                          <div className="flex-1 sm:hidden" />
                          <button onClick={() => openEdit(item)}
                            className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 transition shrink-0"
                            aria-label="Edit item"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setMovingItem({ item, fromCatId: cat.id })}
                            className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 text-gray-500 hover:bg-gray-100 transition shrink-0"
                            aria-label="Move to another category"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteItem(item.id)}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-500 transition shrink-0"
                            aria-label="Delete item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          Edit Item Modal
      ══════════════════════════════════════════════ */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditingItem(null)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Edit Item</h3>
              <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                <input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} className="control-input" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Price (NPR)</label>
                <input type="number" value={editForm.price} onChange={(e) => setEditForm((p) => ({ ...p, price: e.target.value }))} className="control-input" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} rows={2} className="control-input" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tags (comma separated)</label>
                <input value={editForm.tags} onChange={(e) => setEditForm((p) => ({ ...p, tags: e.target.value }))} className="control-input" placeholder="hot, spicy, popular" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Image</label>
                {editForm.image && <img src={editForm.image} alt="Preview" className="w-20 h-20 rounded-xl object-cover mb-2" />}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <input type="file" accept="image/*" onChange={handleEditImageUpload}
                    className="text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100"
                  />
                  <button type="button" onClick={handleGenerateEditImage}
                    disabled={!editForm.name.trim() || generatingEditImage}
                    className="text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-4 py-2 whitespace-nowrap"
                  >
                    {generatingEditImage ? "Generating..." : "Generate with AI"}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingItem(null)} className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition">
                Cancel
              </button>
              <button onClick={saveEdit} disabled={savingEdit} className="flex-1 btn-primary !rounded-xl disabled:opacity-50">
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          Move Item Modal
      ══════════════════════════════════════════════ */}
      {movingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMovingItem(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Move Item</h3>
            <p className="text-sm text-gray-500 mb-4">
              Move <span className="font-semibold text-gray-800">{movingItem.item.name}</span> to:
            </p>
            <div className="space-y-2">
              {restaurant.categories
                .filter((c) => c.id !== movingItem.fromCatId)
                .map((cat) => (
                  <button key={cat.id}
                    onClick={() => moveItem(movingItem.item.id, cat.id)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition font-medium text-gray-800"
                  >
                    {cat.name}
                    <span className="ml-2 text-xs text-gray-400">({cat.items.length} items)</span>
                  </button>
                ))}
            </div>
            <button onClick={() => setMovingItem(null)} className="mt-4 w-full py-2.5 rounded-xl font-semibold text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          Bulk Import Modal
      ══════════════════════════════════════════════ */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { if (!importLoading && !importSaving && !csvSaving && !bulkGenActive) resetImportModal(); }} />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Bulk Import Menu</h3>
                <p className="text-xs text-gray-500 mt-0.5">Import via CSV spreadsheet or photo scan</p>
              </div>
              <button onClick={resetImportModal} disabled={bulkGenActive} className="text-gray-400 hover:text-gray-600 ml-4 disabled:opacity-30">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tab switcher */}
            {postImportItems.length === 0 && (
              <div className="flex gap-1 px-6 pt-4">
                <button
                  onClick={() => { setImportMode("csv"); setImportError(null); }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${
                    importMode === "csv" ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  CSV / Spreadsheet
                </button>
                <button
                  onClick={() => { setImportMode("photo"); setImportError(null); }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${
                    importMode === "photo" ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  AI Photo Scan
                </button>
              </div>
            )}

            <div className="p-6 space-y-5">
              {/* ── Post-import: bulk-generate images ── */}
              {postImportItems.length > 0 && (
                <div className="space-y-4">
                  {!bulkGenActive ? (
                    <>
                      <div className="text-center py-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-100 to-violet-100 flex items-center justify-center mx-auto mb-3">
                          <svg className="w-7 h-7 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                        <p className="text-sm font-semibold text-gray-800">
                          {postImportItems.length} item{postImportItems.length !== 1 ? "s" : ""} imported without a photo
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Generate photos automatically?</p>
                      </div>
                      <div className="flex gap-2 justify-center">
                        <button type="button" onClick={() => setBulkGenSource("stock")}
                          className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${bulkGenSource === "stock" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                        >
                          Stock Photos (cheaper)
                        </button>
                        <button type="button" onClick={() => setBulkGenSource("ai")}
                          className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${bulkGenSource === "ai" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                        >
                          AI Generated
                        </button>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={skipBulkImageGeneration} className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition">
                          Skip
                        </button>
                        <button onClick={runBulkImageGeneration} className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-purple-600 text-white hover:bg-purple-700 transition">
                          Generate Images
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="py-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-gray-800">
                          Generating image {bulkGenProgress.current} of {bulkGenProgress.total}…
                        </p>
                        <button onClick={stopBulkImageGeneration} className="text-xs text-red-500 hover:text-red-600 font-medium">
                          Stop
                        </button>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-purple-500 transition-all"
                          style={{ width: `${(bulkGenProgress.current / Math.max(bulkGenProgress.total, 1)) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-2 truncate">
                        {postImportItems[bulkGenProgress.current - 1]?.name}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── CSV mode ── */}
              {postImportItems.length === 0 && importMode === "csv" && (
                <div className="space-y-4">
                  {/* Template download */}
                  <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-violet-800">Download CSV Template</p>
                        <p className="text-xs text-violet-600 mt-0.5">
                          Columns: <span className="font-mono">Category, Name, Description, Price, Tags</span>
                        </p>
                        <p className="text-xs text-violet-500 mt-0.5">Also accepts Excel (.xlsx / .xls)</p>
                      </div>
                      <button onClick={downloadTemplate}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Template
                      </button>
                    </div>
                    <div className="mt-3 bg-white rounded-lg border border-violet-100 p-3 font-mono text-[11px] text-gray-600 overflow-x-auto whitespace-nowrap">
                      {CSV_TEMPLATE_HEADER}<br />
                      {CSV_TEMPLATE_ROWS[0]}<br />
                      {CSV_TEMPLATE_ROWS[2]}
                    </div>
                  </div>

                  {/* File upload */}
                  {csvRows.length === 0 ? (
                    <>
                      <label className="block w-full cursor-pointer">
                        <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition ${
                          csvFileName ? "border-violet-300 bg-violet-50" : "border-gray-200 hover:border-violet-300 hover:bg-violet-50/50"
                        }`}>
                          <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center mx-auto mb-3">
                            <svg className="w-6 h-6 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <p className="text-sm font-medium text-gray-700">{csvFileName || "Click to upload CSV file"}</p>
                          <p className="text-xs text-gray-400 mt-1">Supports .csv, .xlsx, .xls, .txt files</p>
                        </div>
                        <input type="file" accept=".csv,.txt,.xlsx,.xls" className="hidden" onChange={handleCsvFile} />
                      </label>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-xs text-gray-400 uppercase font-semibold">
                          <span className="bg-white px-3">or paste CSV text</span>
                        </div>
                      </div>

                      <textarea
                        onChange={handleCsvPaste}
                        rows={5}
                        placeholder={`${CSV_TEMPLATE_HEADER}\n${CSV_TEMPLATE_ROWS[0]}\n${CSV_TEMPLATE_ROWS[2]}`}
                        className="control-input font-mono text-xs w-full !py-3"
                      />
                    </>
                  ) : (
                    // Parsed preview
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-700">
                          {csvRows.length} rows parsed from{" "}
                          <span className="text-violet-600">{csvFileName}</span>
                        </p>
                        <div className="flex items-center gap-2">
                          <button onClick={selectAllCsvRows} className="text-xs text-violet-600 hover:text-violet-700 font-medium">All</button>
                          <span className="text-gray-300">|</span>
                          <button onClick={deselectAllCsvRows} className="text-xs text-gray-400 hover:text-gray-600 font-medium">None</button>
                          <span className="text-gray-300">|</span>
                          <button onClick={() => { setCsvRows([]); setCsvErrors([]); setCsvFileName(null); }} className="text-xs text-gray-400 hover:text-gray-600 font-medium">
                            Re-upload
                          </button>
                        </div>
                      </div>

                      {csvErrors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
                          {csvErrors.map((e, i) => (
                            <p key={i} className="text-xs text-red-600">{e}</p>
                          ))}
                        </div>
                      )}

                      {/* Category groups */}
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {Object.entries(
                          csvRows.reduce<Record<string, CsvRow[]>>((acc, row) => {
                            const k = row.category;
                            if (!acc[k]) acc[k] = [];
                            acc[k].push(row);
                            return acc;
                          }, {})
                        ).map(([catName, rows]) => (
                          <div key={catName} className="border border-gray-100 rounded-xl overflow-hidden">
                            <div className="px-4 py-2.5 bg-gray-50 flex items-center gap-2">
                              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-violet-500 to-purple-600" />
                              <span className="text-sm font-bold text-gray-800">{catName}</span>
                              <span className="text-xs text-gray-400 ml-auto">{rows.length} items</span>
                            </div>
                            <div className="divide-y divide-gray-50">
                              {rows.map((row) => (
                                <label key={row._key} className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition ${
                                  csvSelected.has(row._key) ? "bg-violet-50/50" : "hover:bg-gray-50"
                                }`}>
                                  <input type="checkbox" checked={csvSelected.has(row._key)}
                                    onChange={() => toggleCsvRow(row._key)} className="mt-0.5 accent-violet-600"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-sm font-medium text-gray-900">{row.name}</span>
                                      <span className="text-sm font-bold text-gray-700 shrink-0">Rs. {row.price}</span>
                                    </div>
                                    {row.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{row.description}</p>}
                                    {row.tags.length > 0 && (
                                      <div className="flex gap-1 mt-1 flex-wrap">
                                        {row.tags.map((t) => (
                                          <span key={t} className="text-[10px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full">{t}</span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {importError && (
                        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">
                          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {importError}
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button onClick={resetImportModal}
                          className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                        >
                          Cancel
                        </button>
                        <button onClick={saveCsvImport}
                          disabled={csvSaving || csvSelected.size === 0}
                          className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 transition flex items-center justify-center gap-2"
                        >
                          {csvSaving ? (
                            <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Importing…</>
                          ) : `Import ${csvSelected.size} item${csvSelected.size !== 1 ? "s" : ""}`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Photo mode ── */}
              {postImportItems.length === 0 && importMode === "photo" && (
                <div className="space-y-4">
                  {!importParsed && (
                    <>
                      {importPreviews.length === 0 ? (
                        <label className="block w-full cursor-pointer">
                          <div className="border-2 border-dashed rounded-2xl p-8 text-center transition border-gray-200 hover:border-violet-300 hover:bg-violet-50/50">
                            <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-3">
                              <svg className="w-7 h-7 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                            <p className="text-sm font-medium text-gray-700">Click to select photos</p>
                            <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP up to 10MB each — select multiple pages at once</p>
                          </div>
                          <input type="file" accept="image/*" multiple className="hidden" onChange={handleImportFileChange} />
                        </label>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {importPreviews.map((preview, i) => (
                              <div key={i} className="relative group">
                                <img src={preview} alt={`Menu photo ${i + 1}`} className="w-full aspect-square object-cover rounded-xl border border-gray-200" />
                                <button
                                  type="button"
                                  onClick={() => removeImportFile(i)}
                                  className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white shadow border border-gray-200 flex items-center justify-center text-gray-500 hover:text-red-500 hover:border-red-300 transition"
                                  aria-label="Remove photo"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                            <label className="w-full aspect-square rounded-xl border-2 border-dashed border-gray-200 hover:border-violet-300 hover:bg-violet-50/50 flex items-center justify-center cursor-pointer transition">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              <input type="file" accept="image/*" multiple className="hidden" onChange={handleImportFileChange} />
                            </label>
                          </div>
                          <p className="text-xs text-gray-500">
                            {importPreviews.length} photo{importPreviews.length !== 1 ? "s" : ""} selected
                          </p>
                        </div>
                      )}

                      {importFileErrors.length > 0 && (
                        <div className="text-amber-700 text-xs bg-amber-50 rounded-xl px-4 py-3 space-y-1">
                          <p className="font-semibold">Some photos couldn&apos;t be scanned:</p>
                          {importFileErrors.map((e, i) => <p key={i}>{e}</p>)}
                        </div>
                      )}

                      {importError && (
                        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">
                          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {importError}
                        </div>
                      )}

                      <button onClick={runPhotoImport} disabled={importFiles.length === 0 || importLoading}
                        className="w-full py-3 rounded-xl font-semibold text-sm bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 transition flex items-center justify-center gap-2"
                      >
                        {importLoading ? (
                          <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>{importProgress ? `Scanning photo ${importProgress.current} of ${importProgress.total}…` : "Scanning menu with AI..."}</>
                        ) : (
                          <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>Scan & Extract Menu Items</>
                        )}
                      </button>
                    </>
                  )}

                  {importParsed && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-700">
                          Found {importParsed.categories.reduce((s, c) => s + c.items.length, 0)} items in {importParsed.categories.length} categories
                        </p>
                        <button onClick={() => { setImportParsed(null); setImportFiles([]); setImportPreviews([]); setImportFileErrors([]); }}
                          className="text-xs text-violet-600 hover:text-violet-700 font-medium"
                        >
                          Try different photos
                        </button>
                      </div>

                      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                        {importParsed.categories.map((cat, ci) => (
                          <div key={ci} className="border border-gray-100 rounded-xl overflow-hidden">
                            <div className="px-4 py-2.5 bg-gray-50 flex items-center gap-2">
                              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-violet-500 to-purple-600" />
                              <span className="text-sm font-bold text-gray-800">{cat.name}</span>
                              <span className="text-xs text-gray-400 ml-auto">{cat.items.length} items</span>
                            </div>
                            <div className="divide-y divide-gray-50">
                              {cat.items.map((item, ii) => {
                                const key = `${ci}-${ii}`;
                                const selected = selectedImportItems.has(key);
                                return (
                                  <label key={ii} className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition ${selected ? "bg-violet-50/50" : "hover:bg-gray-50"}`}>
                                    <input type="checkbox" checked={selected} onChange={() => toggleImportItem(key)} className="mt-0.5 accent-violet-600" />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-medium text-gray-900">{item.name}</span>
                                        <span className="text-sm font-bold text-gray-700 shrink-0">Rs. {item.price}</span>
                                      </div>
                                      {item.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>}
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {importError && (
                        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">
                          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {importError}
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button onClick={resetImportModal}
                          className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                        >
                          Cancel
                        </button>
                        <button onClick={savePhotoImportedItems} disabled={importSaving || selectedImportItems.size === 0}
                          className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 transition flex items-center justify-center gap-2"
                        >
                          {importSaving ? (
                            <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Saving…</>
                          ) : `Add ${selectedImportItems.size} item${selectedImportItems.size !== 1 ? "s" : ""}`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          message={confirmAction.message}
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
