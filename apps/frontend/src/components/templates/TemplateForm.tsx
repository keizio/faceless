"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Loader2, Upload, Image as ImageIcon } from "lucide-react";
import type { ContentTemplate, TemplateInputField } from "@faceless/shared";
import { api } from "@/lib/api";

interface TemplateFormProps {
  template: ContentTemplate;
  inputs: Record<string, unknown>;
  onChange: (inputs: Record<string, unknown>) => void;
}

export function TemplateForm({ template, inputs, onChange }: TemplateFormProps) {
  const updateField = (fieldId: string, value: unknown) => {
    onChange({ ...inputs, [fieldId]: value });
  };

  return (
    <div className="space-y-3.5 pt-2 border-t border-border/50">
      {template.inputFields.map((field) => (
        <TemplateField
          key={field.id}
          field={field}
          value={inputs[field.id]}
          onChange={(value) => updateField(field.id, value)}
        />
      ))}
    </div>
  );
}

function TemplateField({
  field,
  value,
  onChange,
}: {
  field: TemplateInputField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  switch (field.type) {
    case "text":
      return (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            {field.label}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <Input
            type="text"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="h-8 text-sm"
          />
        </div>
      );

    case "textarea":
      return (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            {field.label}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <Textarea
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className="min-h-[72px] text-sm"
          />
        </div>
      );

    case "select":
      return (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            {field.label}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <Select
            value={(value as string) ?? (field.defaultValue as string) ?? ""}
            onValueChange={onChange}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case "number":
      return (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            {field.label}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <Input
            type="number"
            value={(value as number) ?? (field.defaultValue as number) ?? ""}
            onChange={(e) => onChange(Number(e.target.value))}
            min={field.min}
            max={field.max}
            className="h-8 text-sm"
          />
        </div>
      );

    case "array":
      return <ArrayField field={field} value={value as string[] | undefined} onChange={(v) => onChange(v)} />;

    case "file":
      return <FileUploadField field={field} value={value as string | undefined} onChange={(v) => onChange(v)} />;

    default:
      return null;
  }
}

function FileUploadField({
  field,
  value,
  onChange,
}: {
  field: TemplateInputField;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isImage = field.accept?.includes("image");
  const uploadEndpoint = isImage ? "/api/upload/image" : "/api/upload/audio";

  const validateFile = (file: File): string | null => {
    if (field.accept && field.accept !== "*/*") {
      const allowedPatterns = field.accept.split(",").map((p) => p.trim());
      const matches = allowedPatterns.some((pattern) => {
        if (pattern.endsWith("/*")) {
          const category = pattern.replace("/*", "");
          return file.type.startsWith(category + "/");
        }
        return file.type === pattern;
      });
      if (!matches) {
        return `Invalid file type. Accepted: ${field.accept}`;
      }
    }
    if (field.maxSize && file.size > field.maxSize) {
      const maxMB = Math.round(field.maxSize / (1024 * 1024));
      return `File too large. Maximum size is ${maxMB}MB.`;
    }
    return null;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      e.target.value = "";
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post(uploadEndpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChange(data.url);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemove = () => {
    onChange(undefined);
    setError(null);
  };

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {field.label}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {value ? (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50 text-xs">
          {isImage ? (
            <ImageIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <Upload className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className="flex-1 truncate text-muted-foreground">
            File uploaded
          </span>
          <button
            type="button"
            onClick={handleRemove}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Input
            type="file"
            accept={field.accept ?? "*/*"}
            onChange={handleFileSelect}
            disabled={uploading}
            className="h-8 text-sm"
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-md">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-1 text-[11px] text-red-500">{error}</p>
      )}

      {field.placeholder && !value && (
        <p className="mt-1 text-[11px] text-muted-foreground/70">
          {field.placeholder}
        </p>
      )}
    </div>
  );
}

function ArrayField({
  field,
  value,
  onChange,
}: {
  field: TemplateInputField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (field.itemSchema && field.itemSchema.length > 0) {
    return <StructuredArrayField field={field} items={value as Record<string, unknown>[] | undefined} onChange={(v) => onChange(v)} />;
  }
  return <FlatArrayField field={field} value={value as string[] | undefined} onChange={(v) => onChange(v)} />;
}

function FlatArrayField({
  field,
  value,
  onChange,
}: {
  field: TemplateInputField;
  value: string[] | undefined;
  onChange: (value: string[]) => void;
}) {
  const items = value ?? [];
  const [newItem, setNewItem] = useState("");

  const addItem = () => {
    if (newItem.trim()) {
      onChange([...items, newItem.trim()]);
      setNewItem("");
    }
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {field.label}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {items.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {items.map((item, i) => (
            <div
              key={`${item}-${i}`}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50 text-xs"
            >
              <span className="flex-1 truncate">{item}</span>
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={field.placeholder ?? "Add item..."}
          className="h-8 text-sm flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
        />
        <Button
          type="button"
          onClick={addItem}
          variant="outline"
          size="sm"
          className="h-8 px-3"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function StructuredArrayField({
  field,
  items,
  onChange,
}: {
  field: TemplateInputField;
  items: Record<string, unknown>[] | undefined;
  onChange: (value: Record<string, unknown>[]) => void;
}) {
  const list = items ?? [];

  const addItem = () => {
    const newItem: Record<string, unknown> = {};
    for (const sf of field.itemSchema!) {
      newItem[sf.id] = sf.defaultValue ?? "";
    }
    onChange([...list, newItem]);
  };

  const removeItem = (index: number) => {
    onChange(list.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, key: string, value: unknown) => {
    const updated = [...list];
    updated[index] = { ...updated[index], [key]: value };
    onChange(updated);
  };

  const selectFields = field.itemSchema!.filter((sf) => sf.type === "select");
  const inputFields = field.itemSchema!.filter((sf) => sf.type !== "select");

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {field.label}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {list.length > 0 && (
        <div className="space-y-2 mb-2">
          {list.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-2 px-2 py-1.5 rounded-md bg-muted/50 text-xs"
            >
              {selectFields.map((sf) => (
                <Select
                  key={sf.id}
                  value={(item[sf.id] as string) ?? (sf.defaultValue as string) ?? ""}
                  onValueChange={(v) => updateItem(i, sf.id, v)}
                >
                  <SelectTrigger className="w-20 shrink-0 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sf.options?.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
              {inputFields.map((sf) => (
                <Input
                  key={sf.id}
                  type={sf.type === "number" ? "number" : "text"}
                  value={(item[sf.id] as string) ?? (sf.defaultValue as string) ?? ""}
                  onChange={(e) => updateItem(i, sf.id, e.target.value)}
                  placeholder={sf.placeholder}
                  className="flex-1 h-7 text-xs"
                />
              ))}
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        onClick={addItem}
        variant="outline"
        size="sm"
        className="h-7 px-3 text-xs"
      >
        <Plus className="h-3 w-3 mr-1" />
        Add Message
      </Button>
    </div>
  );
}
