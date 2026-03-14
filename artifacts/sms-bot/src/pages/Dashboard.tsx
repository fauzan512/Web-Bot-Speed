import { useEffect, useRef } from "react";
import { useHeroBot } from "@/hooks/use-hero-bot";
import { getBalance, getPrices } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Badge } from "@/components/ui/core";
import {
  LogOut, Play, Square, RefreshCcw, Terminal, Phone,
  Activity, Settings2, ShieldAlert, Trash2, BellOff, Bell
} from "lucide-react";
import { format } from "date-fns";
import { NumberCard } from "@/components/NumberCard";
import { motion, AnimatePresence } from "framer-motion";

export default function Dashboard({ apiKey, onLogout }: { apiKey: string; onLogout: () => void }) {
  const bot = useHeroBot(apiKey);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const { data: balData, refetch: refetchBal, isFetching: isBalLoading } = useQuery({
    queryKey: ["balance", apiKey],
    queryFn: () => getBalance({ headers: { "x-api-key": apiKey } }),
    refetchInterval: bot.isRunning ? 4000 : 20000,
  });

  const { data: phData } = useQuery({
    queryKey: ["prices", apiKey, "philippines"],
    queryFn: () => getPrices({ country: "4", service: "wa" }, { headers: { "x-api-key": apiKey } }),
    refetchInterval: bot.mode === "philippines" ? 30000 : false,
    enabled: bot.mode === "philippines",
  });

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [bot.logs]);

  const doneCount = bot.purchased.filter(n => n.status !== "waiting").length;

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* NOTIFICATION BANNER */}
      <AnimatePresence>
        {bot.notifPlaying && (
          <motion.div
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -60 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between gap-4 px-6 py-3 bg-emerald-500 text-black shadow-2xl shadow-emerald-900/50"
          >
            <div className="flex items-center gap-3 font-bold text-sm animate-pulse">
              <Bell className="w-5 h-5" />
              Nomor berhasil didapatkan! Silakan cek nomor di bawah.
            </div>
            <button
              onClick={bot.stopNotif}
              className="flex items-center gap-2 bg-black/20 hover:bg-black/30 active:scale-95 transition-all px-4 py-1.5 rounded-full font-semibold text-sm"
            >
              <BellOff className="w-4 h-4" />
              Stop Notif
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <header className={`sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-md transition-all ${bot.notifPlaying ? "mt-[52px]" : ""}`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-primary" />
            </div>
            <h1 className="font-bold text-lg hidden sm:block tracking-tight">
              HERO<span className="text-primary">BOT</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-full px-4 py-1.5 shadow-inner">
              <span className="text-xs text-zinc-400 font-medium">BALANCE</span>
              <span className="text-sm font-mono font-bold text-emerald-400">
                ${balData?.balance?.toFixed(2) || "0.00"}
              </span>
              <button
                onClick={() => refetchBal()}
                disabled={isBalLoading}
                className="ml-2 text-zinc-500 hover:text-white transition-colors disabled:opacity-50"
              >
                <RefreshCcw className={`w-3.5 h-3.5 ${isBalLoading ? "animate-spin text-primary" : ""}`} />
              </button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              className="rounded-full text-zinc-400 hover:text-white hover:bg-white/5"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN */}
        <div className="lg:col-span-4 space-y-6 flex flex-col h-[calc(100vh-8rem)]">

          <Card className="shrink-0">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings2 className="w-4 h-4 text-primary" /> Configuration
                </CardTitle>
                <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
                  <button
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${bot.mode === "mexico" ? "bg-primary text-primary-foreground shadow-md" : "text-zinc-400 hover:text-white"}`}
                    onClick={() => !bot.isRunning && bot.setMode("mexico")}
                    disabled={bot.isRunning}
                  >
                    MEXICO
                  </button>
                  <button
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${bot.mode === "philippines" ? "bg-primary text-primary-foreground shadow-md" : "text-zinc-400 hover:text-white"}`}
                    onClick={() => !bot.isRunning && bot.setMode("philippines")}
                    disabled={bot.isRunning}
                  >
                    PHILIPPINES
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {bot.mode === "mexico" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Parallel Threads</label>
                    <Input
                      type="number" min={1} max={10}
                      value={bot.settings.mxParallel}
                      onChange={e => bot.settings.setMxParallel(Number(e.target.value))}
                      disabled={bot.isRunning}
                      className="font-mono text-center"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Delay (ms)</label>
                    <Input
                      type="number" min={100} step={100}
                      value={bot.settings.mxDelay}
                      onChange={e => bot.settings.setMxDelay(Number(e.target.value))}
                      disabled={bot.isRunning}
                      className="font-mono text-center"
                    />
                  </div>
                  <div className="col-span-2 bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-start gap-3">
                    <ShieldAlert className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-primary/80 leading-relaxed">
                      Mexico mode runs continuously until balance runs out or stopped. It spam-buys numbers in parallel.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Quantity</label>
                    <Input
                      type="number" min={1}
                      value={bot.settings.phQty}
                      onChange={e => bot.settings.setPhQty(Number(e.target.value))}
                      disabled={bot.isRunning}
                      className="font-mono text-center"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Delay (ms)</label>
                    <Input
                      type="number" min={100} step={100}
                      value={bot.settings.phDelay}
                      onChange={e => bot.settings.setPhDelay(Number(e.target.value))}
                      disabled={bot.isRunning}
                      className="font-mono text-center"
                    />
                  </div>
                  <div className="col-span-2 flex justify-between items-center bg-black/40 border border-white/5 rounded-lg p-3">
                    <span className="text-xs text-zinc-400">Current Price (PH)</span>
                    <span className="text-sm font-mono font-bold text-white">
                      {phData?.cost ? `$${phData.cost}` : "--"}
                      <span className="text-xs text-zinc-500 ml-1 font-normal">
                        ({phData?.count || 0} stock)
                      </span>
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-2">
                {!bot.isRunning ? (
                  <Button onClick={bot.handleStart} className="w-full h-12 text-base font-bold group">
                    <Play className="w-4 h-4 mr-2 fill-current group-hover:scale-125 transition-transform" />
                    START BOT
                  </Button>
                ) : (
                  <Button onClick={bot.handleStop} variant="destructive" className="w-full h-12 text-base font-bold group animate-pulse">
                    <Square className="w-4 h-4 mr-2 fill-current group-hover:scale-110 transition-transform" />
                    STOP BOT
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* LOGS */}
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="py-3 px-4 border-b border-white/5 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" /> System Logs
              </CardTitle>
              <button onClick={bot.clearLogs} className="text-xs text-zinc-500 hover:text-white transition-colors">
                Clear
              </button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0 bg-black/50 font-mono text-[11px] leading-relaxed">
              <div className="p-4 space-y-1.5 min-h-full">
                {bot.logs.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-zinc-600 italic">
                    Waiting for events...
                  </div>
                ) : (
                  bot.logs.map((log) => {
                    const colors: Record<string, string> = {
                      success: "text-emerald-400",
                      error: "text-red-400",
                      info: "text-blue-400",
                      retry: "text-amber-400",
                      stop: "text-zinc-500",
                      otp: "text-emerald-300 font-bold",
                    };
                    return (
                      <div
                        key={log.id}
                        className="flex gap-3 hover:bg-white/5 px-1 -mx-1 rounded transition-colors break-words"
                      >
                        <span className="text-zinc-600 shrink-0">
                          {format(log.timestamp, "HH:mm:ss")}
                        </span>
                        <span className={colors[log.type]}>{log.message}</span>
                      </div>
                    );
                  })
                )}
                <div ref={logsEndRef} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
              <Phone className="w-5 h-5 text-primary" />
              Purchased Numbers
            </h2>
            <div className="flex items-center gap-3">
              {/* Stats */}
              <div className="flex gap-4 text-sm bg-black/40 border border-white/5 rounded-full px-4 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">Bought:</span>
                  <span className="font-mono font-bold text-emerald-400">{bot.buyCount}</span>
                </div>
                <div className="w-px h-4 bg-white/10" />
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">Retries:</span>
                  <span className="font-mono font-bold text-amber-400">{bot.retryCount}</span>
                </div>
              </div>

              {/* Delete all button — only shown when there are done orders */}
              {doneCount > 0 && (
                <button
                  onClick={bot.deleteAll}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-red-400 bg-black/40 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 rounded-full px-3 py-1.5 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus Selesai ({doneCount})
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence>
              {bot.purchased.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-2xl bg-black/20"
                >
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <Phone className="w-8 h-8 text-zinc-600" />
                  </div>
                  <h3 className="text-zinc-400 font-medium">No numbers purchased yet</h3>
                  <p className="text-sm text-zinc-600 mt-1">Start the bot to acquire virtual numbers</p>
                </motion.div>
              ) : (
                bot.purchased.map((entry) => (
                  <NumberCard
                    key={entry.orderId}
                    entry={entry}
                    onCancel={bot.handleCancel}
                    onDelete={bot.deletePurchased}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
