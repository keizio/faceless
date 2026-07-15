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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import { Save, Globe, Bell, Key, Moon, User, Mail, CreditCard } from "lucide-react";
import { useState, useEffect } from "react";

export default function SettingsPage() {
  const { data: user, isLoading } = useUserProfile();
  const updateLanguage = useUpdateLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [notifyContentGenerated, setNotifyContentGenerated] = useState(true);
  const [notifyContentFailed, setNotifyContentFailed] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

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

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.className = next === "dark" ? "dark" : "";
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

          {/* Account */}
          <Card className="border-border/50">
            <CardContent className="p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wider">
                <User className="h-4 w-4 text-primary" />
                Account
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">Email</p>
                    <p className="text-xs text-muted-foreground">{user?.email ?? "—"}</p>
                  </div>
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-center justify-between py-2 border-t border-border/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">Plan</p>
                    <p className="text-xs text-muted-foreground capitalize">{user?.plan ?? "Free"}</p>
                  </div>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-center justify-between py-2 border-t border-border/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">Name</p>
                    <p className="text-xs text-muted-foreground">{user?.name ?? "Not set"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="border-border/50">
            <CardContent className="p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wider">
                <Bell className="h-4 w-4 text-primary" />
                Notifications
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="notify-generated" className="text-sm font-medium">Content Generated</Label>
                    <p className="text-xs text-muted-foreground">Notify when content generation completes</p>
                  </div>
                  <Switch
                    id="notify-generated"
                    checked={notifyContentGenerated}
                    onCheckedChange={setNotifyContentGenerated}
                  />
                </div>
                <div className="flex items-center justify-between border-t border-border/50 pt-4">
                  <div>
                    <Label htmlFor="notify-failed" className="text-sm font-medium">Content Failed</Label>
                    <p className="text-xs text-muted-foreground">Notify when content generation fails</p>
                  </div>
                  <Switch
                    id="notify-failed"
                    checked={notifyContentFailed}
                    onCheckedChange={setNotifyContentFailed}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Keys */}
          <Card className="border-border/50">
            <CardContent className="p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wider">
                <Key className="h-4 w-4 text-primary" />
                API Keys
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                API key management is in development. You will be able to generate and manage API keys for programmatic access to the Faceless API.
              </p>
              <Button variant="outline" size="sm" disabled>
                <Key className="mr-1.5 h-3.5 w-3.5" />
                Generate API Key
              </Button>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card className="border-border/50">
            <CardContent className="p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wider">
                <Moon className="h-4 w-4 text-primary" />
                Appearance
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="theme-toggle" className="text-sm font-medium">Dark Mode</Label>
                  <p className="text-xs text-muted-foreground">Toggle between dark and light theme</p>
                </div>
                <Switch
                  id="theme-toggle"
                  checked={theme === "dark"}
                  onCheckedChange={toggleTheme}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}