import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, Input, Button } from "@/components/ui/core";
import { KeyRound, ShieldCheck, Terminal } from "lucide-react";
import { getBalance } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function Login({ setApiKey }: { setApiKey: (k: string) => void }) {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    
    setLoading(true);
    try {
      const res = await getBalance({ headers: { "x-api-key": key } });
      if (res.success) {
        localStorage.setItem("hero_api_key", key);
        setApiKey(key);
        toast({
          title: "Access Granted",
          description: `Logged in successfully. Balance: $${res.balance?.toFixed(2)}`,
        });
        setLocation("/");
      } else {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "Invalid API Key or connection error.",
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Network Error",
        description: "Could not connect to Hero SMS API.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        <Card className="border-white/10 shadow-2xl shadow-primary/5">
          <CardHeader className="text-center pb-8 pt-10">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-primary/20">
              <Terminal className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              Hero SMS Bot
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Enter your hero-sms.com API key to continue
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="paste your api key here..."
                    className="pl-10 h-12 bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-primary focus-visible:border-primary"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    autoComplete="off"
                    spellCheck="false"
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold group" 
                isLoading={loading}
                disabled={!key.trim() || loading}
              >
                {!loading && (
                  <>
                    Initialize Connection
                    <ShieldCheck className="w-4 h-4 ml-2 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
