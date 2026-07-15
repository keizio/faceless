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
import { Plus, X, GripVertical } from "lucide-react";
import type { ContentTemplate, TemplateInputField } from "@faceless/shared";

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
      return <ArrayField field={field} value={value as string[] | undefined} onChange={onChange} />;

    case "file":
      return (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            {field.label}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <Input
            type="file"
            accept="audio/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onChange({ name: file.name, size: file.size, type: file.type });
              }
            }}
            className="h-8 text-sm"
          />
          {field.placeholder && (
            <p className="mt-1 text-[11px] text-muted-foreground/70">
              {field.placeholder}
            </p>
          )}
        </div>
      );

    default:
      return null;
  }
}

function ArrayField({
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
              key={i}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50 text-xs"
            >
              <GripVertical className="h-3 w-3 text-muted-foreground/50 shrink-0" />
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
