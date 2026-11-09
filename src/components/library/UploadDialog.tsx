import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { Loader2, Upload } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { LIBRARY_CATEGORIES } from "@/lib/library/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UploadRecord } from "./UploadsPanel";
import { categoryText, type UploadCategory } from "./UploadsPanel";

const ACCEPTED = "image/jpeg,image/png,image/webp,image/avif,image/svg+xml";
const MAX_BYTES = 20 * 1024 * 1024;

function splitTags(value: string): string[] {
  return [...new Set(value.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 12);
}

const CATEGORY_OPTIONS = LIBRARY_CATEGORIES.map((category) => ({
  id: category.id as UploadCategory,
  label: category.label,
}));

export function UploadDialog({
  open,
  onOpenChange,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: (name: string) => void;
}) {
  const generateUploadUrl = useMutation(api.library.generateUploadUrl);
  const createItem = useMutation(api.library.create);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<UploadCategory>("shapes");
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setName("");
    setTags("");
    setDescription("");
    setError(null);
    setBusy(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && busy) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const pickFile = (next: File | null) => {
    if (!next) return;
    if (!ACCEPTED.split(",").includes(next.type)) {
      setError("Choose a JPEG, PNG, WebP, AVIF or SVG file.");
      return;
    }
    if (next.size > MAX_BYTES) {
      setError("That file is larger than 20 MB.");
      return;
    }
    setError(null);
    setFile(next);
    if (!name) setName(next.name.replace(/\.[^.]+$/, "").slice(0, 80));
  };

  const submit = async () => {
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give the upload a name.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const uploadUrl = await generateUploadUrl({});
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!response.ok) throw new Error(`The upload failed (${response.status}).`);
      const { storageId } = (await response.json()) as { storageId: string };
      await createItem({
        kind: "asset",
        name: trimmed,
        category,
        description: description.trim() || undefined,
        payload: { libraryCategory: category, tags: splitTags(tags), uploadedFilename: file.name },
        storageId: storageId as never,
      });
      onUploaded(trimmed);
      reset();
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The upload could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-display text-[1.2rem]">Upload artwork</DialogTitle>
          <DialogDescription className="text-[0.74rem] leading-5 text-[var(--ink-soft)]">
            Files stay in your account's existing library records, so they appear here and in
            Studio's library without being copied.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <span className="font-meta text-[0.52rem] uppercase tracking-[0.1em] text-[var(--ink-soft)]">
              File
            </span>
            <div className="mt-1 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                className="h-8 gap-1.5 rounded-[3px] px-2.5 font-meta text-[0.54rem] uppercase tracking-[0.08em]"
              >
                <Upload className="size-3.5" />
                Choose file
              </Button>
              <span className="min-w-0 truncate text-[0.72rem] text-[var(--ink-soft)]">
                {file ? `${file.name} · ${Math.round(file.size / 1024)} KB` : "No file chosen"}
              </span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED}
              aria-label="Upload file"
              className="sr-only"
              onChange={(event) => {
                pickFile(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
            />
          </div>

          <label className="grid gap-1">
            <span className="font-meta text-[0.52rem] uppercase tracking-[0.1em] text-[var(--ink-soft)]">
              Name
            </span>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-label="Upload name"
              className="h-8 rounded-[3px] text-[0.8rem]"
            />
          </label>

          <div className="grid gap-1">
            <span className="font-meta text-[0.52rem] uppercase tracking-[0.1em] text-[var(--ink-soft)]">
              Category
            </span>
            <Select value={category} onValueChange={(value) => setCategory(value as UploadCategory)}>
              <SelectTrigger
                aria-label="Upload category"
                className="h-8 rounded-[3px] text-[0.76rem]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="grid gap-1">
            <span className="font-meta text-[0.52rem] uppercase tracking-[0.1em] text-[var(--ink-soft)]">
              Tags <span className="normal-case tracking-normal">(comma separated)</span>
            </span>
            <Input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="monogram, gold, wedding"
              aria-label="Upload tags"
              className="h-8 rounded-[3px] text-[0.8rem]"
            />
          </label>

          <label className="grid gap-1">
            <span className="font-meta text-[0.52rem] uppercase tracking-[0.1em] text-[var(--ink-soft)]">
              Notes
            </span>
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              aria-label="Upload notes"
              className="h-8 rounded-[3px] text-[0.8rem]"
            />
          </label>

          {error ? (
            <p role="alert" className="text-[0.72rem] leading-5 text-[var(--red)]">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => handleOpenChange(false)}
            className="h-8 rounded-[3px] font-meta text-[0.54rem] uppercase tracking-[0.08em]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="h-8 gap-1.5 rounded-[3px] bg-[var(--red)] px-3 font-meta text-[0.54rem] uppercase tracking-[0.08em] text-white"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
            {busy ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditUploadDialog({
  upload,
  onClose,
  onSaved,
}: {
  upload: UploadRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const updateItem = useMutation(api.library.update);
  const initialPayload = upload?.payload as { tags?: unknown } | null;
  const [name, setName] = useState(upload?.name ?? "");
  const [category, setCategory] = useState<UploadCategory>(
    (upload?.category as UploadCategory) || "shapes",
  );
  const [tags, setTags] = useState(
    Array.isArray(initialPayload?.tags)
      ? initialPayload.tags
          .filter((tag): tag is string => typeof tag === "string")
          .join(", ")
      : "",
  );
  const [description, setDescription] = useState(upload?.description ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!upload) return;
    if (!name.trim()) {
      setError("Give the upload a name.");
      return;
    }
    setBusy(true);
    try {
      await updateItem({
        id: upload._id as never,
        name: name.trim(),
        category,
        description: description.trim(),
        payload: {
          ...(typeof upload.payload === "object" && upload.payload !== null ? upload.payload : {}),
          libraryCategory: category,
          tags: splitTags(tags),
        },
      });
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The upload could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={Boolean(upload)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="font-display text-[1.15rem]">Edit upload</DialogTitle>
          <DialogDescription className="text-[0.74rem] leading-5 text-[var(--ink-soft)]">
            Rename and file your upload. The stored file itself never changes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="grid gap-1">
            <span className="font-meta text-[0.52rem] uppercase tracking-[0.1em] text-[var(--ink-soft)]">
              Name
            </span>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-label="Upload name"
              className="h-8 rounded-[3px] text-[0.8rem]"
            />
          </label>
          <div className="grid gap-1">
            <span className="font-meta text-[0.52rem] uppercase tracking-[0.1em] text-[var(--ink-soft)]">
              Category
            </span>
            <Select value={category} onValueChange={(value) => setCategory(value as UploadCategory)}>
              <SelectTrigger aria-label="Upload category" className="h-8 rounded-[3px] text-[0.76rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="grid gap-1">
            <span className="font-meta text-[0.52rem] uppercase tracking-[0.1em] text-[var(--ink-soft)]">
              Tags <span className="normal-case tracking-normal">(comma separated)</span>
            </span>
            <Input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              aria-label="Upload tags"
              className="h-8 rounded-[3px] text-[0.8rem]"
            />
          </label>
          <label className="grid gap-1">
            <span className="font-meta text-[0.52rem] uppercase tracking-[0.1em] text-[var(--ink-soft)]">
              Notes
            </span>
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              aria-label="Upload notes"
              className="h-8 rounded-[3px] text-[0.8rem]"
            />
          </label>
          {error ? (
            <p role="alert" className="text-[0.72rem] leading-5 text-[var(--red)]">
              {error}
            </p>
          ) : null}
          <p className="font-meta text-[0.46rem] uppercase tracking-[0.08em] text-[var(--ink-soft)]">
            Filed under {categoryText(category)}
          </p>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={onClose}
            className="h-8 rounded-[3px] font-meta text-[0.54rem] uppercase tracking-[0.08em]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="h-8 gap-1.5 rounded-[3px] bg-[var(--red)] px-3 font-meta text-[0.54rem] uppercase tracking-[0.08em] text-white"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Save details
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
