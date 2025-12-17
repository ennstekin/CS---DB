"use client";

import { useState } from "react";
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
} from "lucide-react";

export default function SettingsPage() {
  const [showIkasToken, setShowIkasToken] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showMailPassword, setShowMailPassword] = useState(false);

  // Mock bağlantı durumları
  const [connections, setConnections] = useState({
    ikas: { connected: false, testing: false },
    openai: { connected: false, testing: false },
    mail: { connected: false, testing: false },
  });

  const testConnection = async (service: keyof typeof connections) => {
    setConnections(prev => ({
      ...prev,
      [service]: { ...prev[service], testing: true }
    }));

    // Mock API test
    await new Promise(resolve => setTimeout(resolve, 2000));

    setConnections(prev => ({
      ...prev,
      [service]: { connected: true, testing: false }
    }));
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
                      Sipariş ve müşteri verilerini senkronize edin
                    </CardDescription>
                  </div>
                  <Badge variant={connections.ikas.connected ? "default" : "secondary"} className={connections.ikas.connected ? "bg-green-500" : ""}>
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
                  <Label htmlFor="ikas-url">API URL</Label>
                  <Input
                    id="ikas-url"
                    placeholder="https://api.myikas.com/api/v1/admin/graphql"
                    defaultValue="https://api.myikas.com/api/v1/admin/graphql"
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ikas-token">Access Token</Label>
                  <div className="flex gap-2">
                    <Input
                      id="ikas-token"
                      type={showIkasToken ? "text" : "password"}
                      placeholder="ikas-access-token-here"
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
                    Ikas Developer Portal'dan access token alabilirsiniz.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => testConnection('ikas')}
                    disabled={connections.ikas.testing}
                  >
                    {connections.ikas.testing ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Test Ediliyor...</>
                    ) : (
                      'Bağlantıyı Test Et'
                    )}
                  </Button>
                  <Button variant="outline">Kaydet</Button>
                </div>
              </CardContent>
            </Card>

            {/* OpenAI Integration */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <div className="h-5 w-5 bg-black rounded flex items-center justify-center text-white text-xs font-bold">AI</div>
                      OpenAI API
                    </CardTitle>
                    <CardDescription>
                      Mail analizi ve otomatik yanıt oluşturma
                    </CardDescription>
                  </div>
                  <Badge variant={connections.openai.connected ? "default" : "secondary"} className={connections.openai.connected ? "bg-green-500" : ""}>
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
                  <Label htmlFor="openai-key">API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="openai-key"
                      type={showOpenAIKey ? "text" : "password"}
                      placeholder="sk-..."
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                    >
                      {showOpenAIKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    OpenAI Platform'dan API key alabilirsiniz.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="openai-model">Model</Label>
                  <Input
                    id="openai-model"
                    placeholder="gpt-4"
                    defaultValue="gpt-4"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => testConnection('openai')}
                    disabled={connections.openai.testing}
                  >
                    {connections.openai.testing ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Test Ediliyor...</>
                    ) : (
                      'Bağlantıyı Test Et'
                    )}
                  </Button>
                  <Button variant="outline">Kaydet</Button>
                </div>
              </CardContent>
            </Card>

            {/* Mail Integration */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      📧 Mail Sunucusu
                    </CardTitle>
                    <CardDescription>
                      IMAP/SMTP mail sunucu ayarları
                    </CardDescription>
                  </div>
                  <Badge variant={connections.mail.connected ? "default" : "secondary"} className={connections.mail.connected ? "bg-green-500" : ""}>
                    {connections.mail.connected ? (
                      <><CheckCircle className="h-3 w-3 mr-1" /> Bağlı</>
                    ) : (
                      <><XCircle className="h-3 w-3 mr-1" /> Bağlı Değil</>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="imap-host">IMAP Host</Label>
                    <Input id="imap-host" placeholder="imap.gmail.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="imap-port">IMAP Port</Label>
                    <Input id="imap-port" placeholder="993" defaultValue="993" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-host">SMTP Host</Label>
                    <Input id="smtp-host" placeholder="smtp.gmail.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-port">SMTP Port</Label>
                    <Input id="smtp-port" placeholder="587" defaultValue="587" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mail-email">E-posta Adresi</Label>
                  <Input id="mail-email" type="email" placeholder="support@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mail-password">Şifre</Label>
                  <div className="flex gap-2">
                    <Input
                      id="mail-password"
                      type={showMailPassword ? "text" : "password"}
                      placeholder="••••••••"
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
                <div className="flex gap-2">
                  <Button
                    onClick={() => testConnection('mail')}
                    disabled={connections.mail.testing}
                  >
                    {connections.mail.testing ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Test Ediliyor...</>
                    ) : (
                      'Bağlantıyı Test Et'
                    )}
                  </Button>
                  <Button variant="outline">Kaydet</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Genel Ayarlar Tab */}
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Genel Ayarlar</CardTitle>
                <CardDescription>
                  Uygulama genel ayarları (Yakında)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Bu bölüm yakında eklenecek...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
