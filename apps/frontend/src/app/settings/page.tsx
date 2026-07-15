"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
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

import { Save, Globe, Bell, Key, Moon, User } from "lucide-react";
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

  const handleSaveLanguage = () => {
    if (selectedLanguage && selectedLanguage !== user?.language) {
      updateLanguage.mutate(selectedLanguage);
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="animate-fade-in space-y-8">
          <PageHeader
            title="Settings"
            subtitle="Manage your preferences"
          />

          {/* Language Preference */}
          <Card className="border-border/50">
            <CardContent className="p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wider">
                <Globe className="h-4 w-4 text-primary" />
                Language
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
                      {LANGUAGES.map((lang: { code: string; label: string }) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleSaveLanguage}
                  disabled={selectedLanguage === user?.language || updateLanguage.isPending}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {updateLanguage.isPending ? "Saving..." : "Save"}
                </Button>

                {updateLanguage.isSuccess && (
                  <p className="text-xs text-green-600">Language preference updated.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Account (placeholder) */}
          <Card className="border-border/50 opacity-60">
            <CardContent className="p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wider">
                <User className="h-4 w-4 text-primary" />
                Account
              </h3>
              <p className="text-sm text-muted-foreground">Account settings coming soon — profile management, email preferences, and account deletion.</p>
            </CardContent>
          </Card>

          {/* Notifications (placeholder) */}
          <Card className="border-border/50 opacity-60">
            <CardContent className="p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wider">
                <Bell className="h-4 w-4 text-primary" />
                Notifications
              </h3>
              <p className="text-sm text-muted-foreground">Notification preferences coming soon — choose which events trigger alerts.</p>
            </CardContent>
          </Card>

          {/* API Keys (placeholder) */}
          <Card className="border-border/50 opacity-60">
            <CardContent className="p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wider">
                <Key className="h-4 w-4 text-primary" />
                API Keys
              </h3>
              <p className="text-sm text-muted-foreground">API key management coming soon — generate and manage API keys for programmatic access.</p>
            </CardContent>
          </Card>

          {/* Appearance (placeholder) */}
          <Card className="border-border/50 opacity-60">
            <CardContent className="p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wider">
                <Moon className="h-4 w-4 text-primary" />
                Appearance
              </h3>
              <p className="text-sm text-muted-foreground">Theme and display settings coming soon — toggle between dark and light mode.</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}