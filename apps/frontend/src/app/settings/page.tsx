"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useUserProfile, useUpdateLanguage } from "@/hooks/useUserProfile";
import { LANGUAGES } from "@faceless/shared";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Settings, Save } from "lucide-react";
import { useState, useEffect } from "react";

export default function SettingsPage() {
  const { data: user, isLoading } = useUserProfile();
  const updateLanguage = useUpdateLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.language && selectedLanguage === null) {
      setSelectedLanguage(user.language);
    }
  }, [user?.language, selectedLanguage]);

  const currentLanguage = selectedLanguage ?? user?.language ?? "en";

  const handleSave = () => {
    if (selectedLanguage && selectedLanguage !== user?.language) {
      updateLanguage.mutate(selectedLanguage);
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="animate-fade-in space-y-8 overflow-safe-mobile">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-foreground">Settings</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage your preferences
              </p>
            </div>
          </div>

          <Card className="border-border/50">
            <CardContent className="p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wider">
                <Settings className="h-4 w-4 text-primary" />
                Language Preference
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Default Content Language
                  </label>
                  <p className="mb-3 text-xs text-muted-foreground/70">
                    This language will be pre-selected when creating new content.
                  </p>
                  <Select
                    value={currentLanguage}
                    onValueChange={setSelectedLanguage}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-full sm:w-72">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleSave}
                  disabled={
                    selectedLanguage === user?.language ||
                    updateLanguage.isPending
                  }
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {updateLanguage.isPending ? "Saving..." : "Save"}
                </Button>

                {updateLanguage.isSuccess && (
                  <p className="text-xs text-green-600">
                    Language preference updated.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}