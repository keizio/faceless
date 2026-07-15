"use client";

import { useBrandKit, useUpdateBrandKit } from "@/hooks/useBrandKit";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useState, useEffect, useRef } from "react";
import { Palette, Upload, X } from "lucide-react";

const FONT_OPTIONS = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Montserrat",
  "Poppins",
  "Lato",
  "Playfair Display",
  "Merriweather",
  "Source Sans Pro",
  "Oswald",
];

interface BrandKitPanelProps {
  projectId: string;
}

export function BrandKitPanel({ projectId }: BrandKitPanelProps) {
  const { data: brandKit, isLoading } = useBrandKit(projectId);
  const updateBrandKit = useUpdateBrandKit(projectId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [brandName, setBrandName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1a1a2e");
  const [secondaryColor, setSecondaryColor] = useState("#e94560");
  const [accentColor, setAccentColor] = useState("#f39c12");
  const [textColor, setTextColor] = useState("#ffffff");
  const [bgColor, setBgColor] = useState("#0a0a0a");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [brandVoice, setBrandVoice] = useState("");
  const [defaultCta, setDefaultCta] = useState("");
  const [hashtagInput, setHashtagInput] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [logoUrl, setLogoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (brandKit) {
      setBrandName(brandKit.brandName ?? "");
      setPrimaryColor(brandKit.colors?.primary ?? "#1a1a2e");
      setSecondaryColor(brandKit.colors?.secondary ?? "#e94560");
      setAccentColor(brandKit.colors?.accent ?? "#f39c12");
      setTextColor(brandKit.colors?.text ?? "#ffffff");
      setBgColor(brandKit.colors?.background ?? "#0a0a0a");
      setFontFamily(brandKit.fontFamily ?? "Inter");
      setBrandVoice(brandKit.brandVoice ?? "");
      setDefaultCta(brandKit.defaultCta ?? "");
      setHashtags(brandKit.defaultHashtags ?? []);
      setLogoUrl(brandKit.logoUrl ?? "");
    }
  }, [brandKit]);

  const handleSave = () => {
    updateBrandKit.mutate(
      {
        brandName: brandName || undefined,
        colors: {
          primary: primaryColor,
          secondary: secondaryColor,
          accent: accentColor,
          text: textColor,
          background: bgColor,
        },
        fontFamily: fontFamily !== "Inter" ? fontFamily : undefined,
        brandVoice: brandVoice || undefined,
        defaultCta: defaultCta || undefined,
        defaultHashtags: hashtags.length > 0 ? hashtags : undefined,
        logoUrl: logoUrl || undefined,
      },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      },
    );
  };

  const handleAddHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, "");
    if (tag && !hashtags.includes(tag)) {
      setHashtags([...hashtags, tag]);
      setHashtagInput("");
    }
  };

  const handleRemoveHashtag = (tag: string) => {
    setHashtags(hashtags.filter((h) => h !== tag));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post("/api/upload/image", formData);
      setLogoUrl(data.url);
    } catch (err) {
      console.error("Failed to upload logo", err);
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-5">
          <div className="skeleton h-6 w-32 rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardContent className="p-5 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">Brand Kit</h3>
          </div>
          <Button onClick={handleSave} disabled={updateBrandKit.isPending} size="sm">
            {updateBrandKit.isPending ? "Saving..." : saved ? "Saved!" : "Save"}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Brand Name</label>
            <Input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g. Acme Inc."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Font Family</label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-medium text-muted-foreground">Brand Colors</label>
          <div className="grid grid-cols-5 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground/60">Primary</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded border border-input bg-transparent p-0.5"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-8 flex-1 font-mono text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground/60">Secondary</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded border border-input bg-transparent p-0.5"
                />
                <Input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="h-8 flex-1 font-mono text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground/60">Accent</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded border border-input bg-transparent p-0.5"
                />
                <Input
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-8 flex-1 font-mono text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground/60">Text</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded border border-input bg-transparent p-0.5"
                />
                <Input
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="h-8 flex-1 font-mono text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground/60">Background</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded border border-input bg-transparent p-0.5"
                />
                <Input
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-8 flex-1 font-mono text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Brand Logo</label>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              {uploading ? "Uploading..." : "Upload Logo"}
            </Button>
            {logoUrl && (
              <div className="relative flex items-center gap-2">
                <img
                  src={logoUrl}
                  alt="Brand logo"
                  className="h-8 w-8 rounded object-contain ring-1 ring-foreground/10"
                />
                <button
                  onClick={() => setLogoUrl("")}
                  className="rounded-full bg-muted p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Brand Voice / Tone</label>
          <Textarea
            value={brandVoice}
            onChange={(e) => setBrandVoice(e.target.value)}
            placeholder="e.g. Professional yet approachable. Use industry terminology but explain concepts clearly. Maintain a confident, authoritative tone."
            rows={3}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Default Call-to-Action</label>
          <Input
            value={defaultCta}
            onChange={(e) => setDefaultCta(e.target.value)}
            placeholder="e.g. Follow for more tips"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Default Hashtags</label>
          <div className="flex items-center gap-2">
            <Input
              value={hashtagInput}
              onChange={(e) => setHashtagInput(e.target.value)}
              placeholder="Add hashtag"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddHashtag())}
            />
            <Button variant="outline" size="sm" onClick={handleAddHashtag} disabled={!hashtagInput.trim()}>
              Add
            </Button>
          </div>
          {hashtags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {hashtags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                >
                  #{tag}
                  <button
                    onClick={() => handleRemoveHashtag(tag)}
                    className="text-primary/60 hover:text-primary"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}