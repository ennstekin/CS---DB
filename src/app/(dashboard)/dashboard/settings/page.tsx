"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Link2,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { toast } = useToast();
  const [showIkasToken, setShowIkasToken] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showMailPassword, setShowMailPassword] = useState(false);
  const [isFetchingMails, setIsFetchingMails] = useState(false);

  // Form states
  const [ikasSettings, setIkasSettings] = useState({
    ikas_api_url: "",
    ikas_access_token: "",
  });

  const [openaiSettings, setOpenaiSettings] = useState({
    openai_api_key: "",
    openai_model: "gpt-4",
  });

  const [mailSettings, setMailSettings] = useState({
    mail_imap_host: "",
    mail_imap_port: "993",
    mail_imap_user: "",
    mail_imap_password: "",
    mail_imap_tls: "true",
    mail_smtp_host: "",
    mail_smtp_port: "587",
    mail_smtp_user: "",
    mail_smtp_password: "",
    mail_smtp_secure: "false",
  });

  const [connections, setConnections] = useState({
    ikas: { connected: false, testing: false, saving: false },
    openai: { connected: false, testing: false, saving: false },
    mail: { connected: false, testing: false, saving: false },
  });

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();

        setIkasSettings({
          ikas_api_url: data.ikas_api_url || "",
          ikas_access_token: data.ikas_access_token || "",
        });

        setOpenaiSettings({
          openai_api_key: data.openai_api_key || "",
          openai_model: data.openai_model || "gpt-4",
        });

        setMailSettings({
          mail_imap_host: data.mail_imap_host || "",
          mail_imap_port: data.mail_imap_port || "993",
          mail_imap_user: data.mail_imap_user || "",
          mail_imap_password: data.mail_imap_password || "",
          mail_imap_tls: data.mail_imap_tls || "true",
          mail_smtp_host: data.mail_smtp_host || "",
          mail_smtp_port: data.mail_smtp_port || "587",
          mail_smtp_user: data.mail_smtp_user || "",
          mail_smtp_password: data.mail_smtp_password || "",
          mail_smtp_secure: data.mail_smtp_secure || "false",
        });

        // Check which connections are configured
        setConnections({
          ikas: {
            connected: !!(data.ikas_api_url && data.ikas_access_token),
            testing: false,
            saving: false
          },
          openai: {
            connected: !!data.openai_api_key,
            testing: false,
            saving: false
          },
          mail: {
            connected: !!(data.mail_imap_host && data.mail_imap_user && data.mail_imap_password),
            testing: false,
            saving: false
          },
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const saveSettings = async (service: "ikas" | "openai" | "mail", settings: Record<string, string>) => {
    setConnections(prev => ({
      ...prev,
      [service]: { ...prev[service], saving: true }
    }));

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast({
          title: "Başarılı",
          description: "Ayarlar kaydedildi",
        });

        setConnections(prev => ({
          ...prev,
          [service]: { ...prev[service], connected: true, saving: false }
        }));
      } else {
        throw new Error("Kaydetme başarısız");
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: "Ayarlar kaydedilemedi",
        variant: "destructive",
      });

      setConnections(prev => ({
        ...prev,
        [service]: { ...prev[service], saving: false }
      }));
    }
  };

  const fetchMails = async () => {
    setIsFetchingMails(true);

    try {
      const response = await fetch("/api/mails/fetch", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Başarılı",
          description: data.message || `${data.count} mail çekildi`,
        });
      } else {
        throw new Error(data.error || "Mail çekme başarısız");
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsFetchingMails(false);
    }
  };

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Ayarlar</h2>
            <p className="text-muted-foreground">
              Uygulama ayarlarını ve entegrasyonları yönetin
            </p>
          </div>
        </div>

        <Tabs defaultValue="integrations" className="space-y-4">
          <TabsList>
            <TabsTrigger value="integrations">
              <Link2 className="h-4 w-4 mr-2" />
              Bağlantılar
            </TabsTrigger>
            <TabsTrigger value="general">
              <Settings className="h-4 w-4 mr-2" />
              Genel
            </TabsTrigger>
          </TabsList>

          {/* Bağlantılar Tab */}
          <TabsContent value="integrations" className="space-y-4">
            {/* Ikas Integration */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <img src="https://www.ikas.com/favicon.ico" alt="Ikas" className="h-5 w-5" />
                      Ikas E-ticaret
                    </CardTitle>
                    <CardDescription>
                      Sipariş ve müşteri verilerinizi Ikas'tan çekin
                    </CardDescription>
                  </div>
                  <Badge variant={connections.ikas.connected ? "default" : "secondary"}>
                    {connections.ikas.connected ? (
                      <><CheckCircle className="h-3 w-3 mr-1" /> Bağlı</>
                    ) : (
                      <><XCircle className="h-3 w-3 mr-1" /> Bağlı Değil</>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>API URL</Label>
                  <Input
                    type="text"
                    placeholder="https://api.myikas.com/api/v1/admin/graphql"
                    value={ikasSettings.ikas_api_url}
                    onChange={(e) => setIkasSettings({ ...ikasSettings, ikas_api_url: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Access Token</Label>
                  <div className="flex gap-2">
                    <Input
                      type={showIkasToken ? "text" : "password"}
                      placeholder="••••••••••••••••"
                      value={ikasSettings.ikas_access_token}
                      onChange={(e) => setIkasSettings({ ...ikasSettings, ikas_access_token: e.target.value })}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowIkasToken(!showIkasToken)}
                    >
                      {showIkasToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => saveSettings("ikas", ikasSettings)}
                    disabled={connections.ikas.saving}
                  >
                    {connections.ikas.saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Kaydet
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* OpenAI Integration */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>OpenAI</CardTitle>
                    <CardDescription>
                      AI özellikleri için OpenAI API anahtarı
                    </CardDescription>
                  </div>
                  <Badge variant={connections.openai.connected ? "default" : "secondary"}>
                    {connections.openai.connected ? (
                      <><CheckCircle className="h-3 w-3 mr-1" /> Bağlı</>
                    ) : (
                      <><XCircle className="h-3 w-3 mr-1" /> Bağlı Değil</>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      type={showOpenAIKey ? "text" : "password"}
                      placeholder="sk-••••••••••••••••"
                      value={openaiSettings.openai_api_key}
                      onChange={(e) => setOpenaiSettings({ ...openaiSettings, openai_api_key: e.target.value })}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                    >
                      {showOpenAIKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Input
                    type="text"
                    placeholder="gpt-4"
                    value={openaiSettings.openai_model}
                    onChange={(e) => setOpenaiSettings({ ...openaiSettings, openai_model: e.target.value })}
                  />
                </div>
                <Button
                  onClick={() => saveSettings("openai", openaiSettings)}
                  disabled={connections.openai.saving}
                >
                  {connections.openai.saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Kaydet
                </Button>
              </CardContent>
            </Card>

            {/* Mail Server Integration */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Mail Server</CardTitle>
                    <CardDescription>
                      IMAP ve SMTP ayarları
                    </CardDescription>
                  </div>
                  <Badge variant={connections.mail.connected ? "default" : "secondary"}>
                    {connections.mail.connected ? (
                      <><CheckCircle className="h-3 w-3 mr-1" /> Bağlı</>
                    ) : (
                      <><XCircle className="h-3 w-3 mr-1" /> Bağlı Değil</>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* IMAP Settings */}
                <div className="space-y-4">
                  <h4 className="font-semibold">IMAP (Mail Alma)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Host</Label>
                      <Input
                        type="text"
                        placeholder="imap.gmail.com"
                        value={mailSettings.mail_imap_host}
                        onChange={(e) => setMailSettings({ ...mailSettings, mail_imap_host: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Port</Label>
                      <Input
                        type="text"
                        placeholder="993"
                        value={mailSettings.mail_imap_port}
                        onChange={(e) => setMailSettings({ ...mailSettings, mail_imap_port: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="your-email@gmail.com"
                      value={mailSettings.mail_imap_user}
                      onChange={(e) => setMailSettings({ ...mailSettings, mail_imap_user: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Şifre</Label>
                    <div className="flex gap-2">
                      <Input
                        type={showMailPassword ? "text" : "password"}
                        placeholder="••••••••••••••••"
                        value={mailSettings.mail_imap_password}
                        onChange={(e) => setMailSettings({ ...mailSettings, mail_imap_password: e.target.value })}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowMailPassword(!showMailPassword)}
                      >
                        {showMailPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* SMTP Settings */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-semibold">SMTP (Mail Gönderme)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Host</Label>
                      <Input
                        type="text"
                        placeholder="smtp.gmail.com"
                        value={mailSettings.mail_smtp_host}
                        onChange={(e) => setMailSettings({ ...mailSettings, mail_smtp_host: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Port</Label>
                      <Input
                        type="text"
                        placeholder="587"
                        value={mailSettings.mail_smtp_port}
                        onChange={(e) => setMailSettings({ ...mailSettings, mail_smtp_port: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="your-email@gmail.com"
                      value={mailSettings.mail_smtp_user}
                      onChange={(e) => setMailSettings({ ...mailSettings, mail_smtp_user: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Şifre</Label>
                    <Input
                      type={showMailPassword ? "text" : "password"}
                      placeholder="••••••••••••••••"
                      value={mailSettings.mail_smtp_password}
                      onChange={(e) => setMailSettings({ ...mailSettings, mail_smtp_password: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => saveSettings("mail", mailSettings)}
                    disabled={connections.mail.saving}
                  >
                    {connections.mail.saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Kaydet
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={fetchMails}
                    disabled={isFetchingMails || !connections.mail.connected}
                  >
                    {isFetchingMails ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Mail Çek
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Genel Tab */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Genel Ayarlar</CardTitle>
                <CardDescription>
                  Uygulama genel ayarları
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Yakında eklenecek...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
