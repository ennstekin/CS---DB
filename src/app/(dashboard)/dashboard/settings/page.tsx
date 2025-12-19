"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  Link2,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Download,
  Brain,
  Truck,
  Tag,
  FileText,
  Store,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { toast } = useToast();
  const [showIkasToken, setShowIkasToken] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showMailPassword, setShowMailPassword] = useState(false);
  const [isFetchingMails, setIsFetchingMails] = useState(false);
  const [isSyncingReturns, setIsSyncingReturns] = useState(false);

  // Form states
  const [ikasSettings, setIkasSettings] = useState({
    ikas_store_name: "",
    ikas_client_id: "",
    ikas_client_secret: "",
  });

  const [openaiSettings, setOpenaiSettings] = useState({
    openai_api_key: "",
    openai_model: "gpt-4o-mini",
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

  const [portalSettings, setPortalSettings] = useState({
    portal_enabled: "true",
    portal_url: "",
  });

  const [aiKnowledgeBase, setAiKnowledgeBase] = useState({
    ai_kb_shipping: "",
    ai_kb_campaigns: "",
    ai_kb_return_policy: "",
    ai_kb_general: "",
    ai_kb_store_info: "",
  });

  const [isSavingKnowledge, setIsSavingKnowledge] = useState(false);

  const [connections, setConnections] = useState({
    ikas: { connected: false, testing: false, saving: false },
    openai: { connected: false, testing: false, saving: false },
    mail: { connected: false, testing: false, saving: false },
    portal: { connected: false, testing: false, saving: false },
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
          ikas_store_name: data.ikas_store_name || "",
          ikas_client_id: data.ikas_client_id || "",
          ikas_client_secret: data.ikas_client_secret || "",
        });

        setOpenaiSettings({
          openai_api_key: data.openai_api_key || "",
          openai_model: data.openai_model || "gpt-4o-mini",
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

        setPortalSettings({
          portal_enabled: data.portal_enabled || "true",
          portal_url: data.portal_url || `${window.location.origin}/portal`,
        });

        setAiKnowledgeBase({
          ai_kb_shipping: data.ai_kb_shipping || "",
          ai_kb_campaigns: data.ai_kb_campaigns || "",
          ai_kb_return_policy: data.ai_kb_return_policy || "",
          ai_kb_general: data.ai_kb_general || "",
          ai_kb_store_info: data.ai_kb_store_info || "",
        });

        // Check which connections are configured
        setConnections({
          ikas: {
            connected: !!(data.ikas_client_id && data.ikas_client_secret),
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
          portal: {
            connected: data.portal_enabled === "true",
            testing: false,
            saving: false
          },
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const saveSettings = async (service: "ikas" | "openai" | "mail" | "portal", settings: Record<string, string>) => {
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

  const syncIkasReturns = async () => {
    setIsSyncingReturns(true);

    try {
      const response = await fetch("/api/ikas/sync-returns", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Başarılı",
          description: data.message || `${data.newReturns} yeni iade çekildi`,
        });
      } else {
        throw new Error(data.error || "İade senkronizasyonu başarısız");
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSyncingReturns(false);
    }
  };

  const saveAiKnowledgeBase = async () => {
    setIsSavingKnowledge(true);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiKnowledgeBase),
      });

      if (response.ok) {
        toast({
          title: "Başarılı",
          description: "AI bilgi kaynağı kaydedildi",
        });
      } else {
        throw new Error("Kaydetme başarısız");
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: "Bilgi kaynağı kaydedilemedi",
        variant: "destructive",
      });
    } finally {
      setIsSavingKnowledge(false);
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
            <TabsTrigger value="ai-knowledge">
              <Brain className="h-4 w-4 mr-2" />
              AI Bilgi Kaynağı
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
                  <Label>Store Name</Label>
                  <Input
                    type="text"
                    placeholder="mystore (mystore.myikas.com)"
                    value={ikasSettings.ikas_store_name}
                    onChange={(e) => setIkasSettings({ ...ikasSettings, ikas_store_name: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Mağaza URL'inizden sadece isim kısmını girin (örn: "mystore" → mystore.myikas.com)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Client ID</Label>
                  <Input
                    type="text"
                    placeholder="your_client_id"
                    value={ikasSettings.ikas_client_id}
                    onChange={(e) => setIkasSettings({ ...ikasSettings, ikas_client_id: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Client Secret</Label>
                  <div className="flex gap-2">
                    <Input
                      type={showIkasToken ? "text" : "password"}
                      placeholder="••••••••••••••••"
                      value={ikasSettings.ikas_client_secret}
                      onChange={(e) => setIkasSettings({ ...ikasSettings, ikas_client_secret: e.target.value })}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowIkasToken(!showIkasToken)}
                    >
                      {showIkasToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    İkas admin panelinden API ayarlarından alın
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => saveSettings("ikas", ikasSettings)}
                    disabled={connections.ikas.saving}
                  >
                    {connections.ikas.saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Kaydet
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={syncIkasReturns}
                    disabled={isSyncingReturns || !connections.ikas.connected}
                  >
                    {isSyncingReturns ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    İade Siparişlerini Çek
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
                  <Select
                    value={openaiSettings.openai_model}
                    onValueChange={(value) => setOpenaiSettings({ ...openaiSettings, openai_model: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Model seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini (Önerilen - Ekonomik)</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o (Güçlü)</SelectItem>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (En Ekonomik)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    GPT-4o Mini önerilir: Yüksek kalite, düşük maliyet
                  </p>
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

          {/* AI Bilgi Kaynağı Tab */}
          <TabsContent value="ai-knowledge" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Mail Bilgi Kaynağı
                </CardTitle>
                <CardDescription>
                  AI'ın mail cevaplarında kullanacağı bilgileri buraya yazın. Bu bilgiler müşteri maillerine cevap oluştururken kullanılacaktır.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Mağaza Bilgileri */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    Mağaza Bilgileri
                  </Label>
                  <Textarea
                    placeholder="Mağaza adı, çalışma saatleri, iletişim bilgileri, genel tanıtım...

Örnek:
- Mağaza Adı: Paen Store
- Çalışma Saatleri: Hafta içi 09:00-18:00
- Telefon: 0850 XXX XX XX
- Adres: İstanbul, Türkiye"
                    value={aiKnowledgeBase.ai_kb_store_info}
                    onChange={(e) => setAiKnowledgeBase({ ...aiKnowledgeBase, ai_kb_store_info: e.target.value })}
                    rows={5}
                  />
                </div>

                {/* Kargo Bilgileri */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Kargo ve Teslimat Bilgileri
                  </Label>
                  <Textarea
                    placeholder="Kargo ücretleri, teslimat süreleri, kargo firmaları...

Örnek:
- 500 TL üzeri siparişlerde ücretsiz kargo
- Standart kargo: 49.90 TL
- Teslimat süresi: 2-4 iş günü
- Kargo firması: Yurtiçi Kargo, Aras Kargo"
                    value={aiKnowledgeBase.ai_kb_shipping}
                    onChange={(e) => setAiKnowledgeBase({ ...aiKnowledgeBase, ai_kb_shipping: e.target.value })}
                    rows={5}
                  />
                </div>

                {/* Kampanyalar */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Aktif Kampanyalar ve İndirimler
                  </Label>
                  <Textarea
                    placeholder="Mevcut kampanyalar, indirim kodları, özel fırsatlar...

Örnek:
- YAZ2024 kodu ile %20 indirim
- 2 al 1 öde kampanyası (seçili ürünlerde)
- İlk siparişe özel %15 indirim"
                    value={aiKnowledgeBase.ai_kb_campaigns}
                    onChange={(e) => setAiKnowledgeBase({ ...aiKnowledgeBase, ai_kb_campaigns: e.target.value })}
                    rows={5}
                  />
                </div>

                {/* İade Politikası */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    İade ve Değişim Politikası
                  </Label>
                  <Textarea
                    placeholder="İade koşulları, süreleri, prosedürler...

Örnek:
- 14 gün içinde ücretsiz iade
- Ürünler kullanılmamış ve etiketli olmalı
- İade kargo ücreti müşteriye aittir
- Para iadesi 3-5 iş günü içinde yapılır"
                    value={aiKnowledgeBase.ai_kb_return_policy}
                    onChange={(e) => setAiKnowledgeBase({ ...aiKnowledgeBase, ai_kb_return_policy: e.target.value })}
                    rows={5}
                  />
                </div>

                {/* Genel Bilgiler */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Diğer Bilgiler
                  </Label>
                  <Textarea
                    placeholder="Sık sorulan sorular, özel durumlar, ek bilgiler...

Örnek:
- Hediye paketi seçeneği mevcut (+25 TL)
- Fatura bilgisi siparişten sonra değiştirilemez
- Kapıda ödeme seçeneği aktif"
                    value={aiKnowledgeBase.ai_kb_general}
                    onChange={(e) => setAiKnowledgeBase({ ...aiKnowledgeBase, ai_kb_general: e.target.value })}
                    rows={5}
                  />
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Nasıl Çalışır?
                  </h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• AI, mail cevabı oluştururken bu bilgileri referans alır</li>
                    <li>• Ne kadar detaylı yazarsanız, cevaplar o kadar doğru olur</li>
                    <li>• Değişen bilgileri (kampanyalar vb.) güncel tutun</li>
                    <li>• Müşterilere vermek istemediğiniz bilgileri yazmayın</li>
                  </ul>
                </div>

                <Button
                  onClick={saveAiKnowledgeBase}
                  disabled={isSavingKnowledge}
                  className="w-full"
                >
                  {isSavingKnowledge && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Bilgi Kaynağını Kaydet
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Genel Tab */}
          <TabsContent value="general" className="space-y-4">
            {/* Portal Ayarları */}
            <Card>
              <CardHeader>
                <CardTitle>İade Portalı Ayarları</CardTitle>
                <CardDescription>
                  Müşteri self-service iade portalı ayarları
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Portal Durumu</Label>
                  <Select
                    value={portalSettings.portal_enabled}
                    onValueChange={(value) => setPortalSettings({ ...portalSettings, portal_enabled: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>Aktif</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="false">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span>Pasif</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Portal aktif olduğunda müşteriler kendi iadelerini oluşturabilir
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Portal URL</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={portalSettings.portal_url}
                      readOnly
                      className="bg-muted"
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(portalSettings.portal_url);
                        toast({
                          title: "Kopyalandı",
                          description: "Portal URL kopyalandı",
                        });
                      }}
                    >
                      Kopyala
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.open(portalSettings.portal_url, "_blank")}
                    >
                      Aç
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Bu URL'yi müşterilerinizle paylaşın
                  </p>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">Entegrasyon Örnekleri</h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-medium mb-1">E-posta İmzası:</p>
                      <code className="block p-2 bg-white rounded text-xs">
                        İade talebi için: {portalSettings.portal_url}
                      </code>
                    </div>
                    <div>
                      <p className="font-medium mb-1">Web Sitesi Link:</p>
                      <code className="block p-2 bg-white rounded text-xs overflow-x-auto">
                        {'<a href="' + portalSettings.portal_url + '">İade Talebi Oluştur</a>'}
                      </code>
                    </div>
                    <div>
                      <p className="font-medium mb-1">WhatsApp/SMS Mesaj:</p>
                      <code className="block p-2 bg-white rounded text-xs">
                        Siparişinizi iade etmek için: {portalSettings.portal_url}
                      </code>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => saveSettings("portal", portalSettings)}
                >
                  Kaydet
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
