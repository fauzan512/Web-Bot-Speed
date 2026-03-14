import { useState, useEffect } from "react";
import { PurchasedNumber } from "@/hooks/use-hero-bot";
import { stripCountryCode } from "@/lib/utils";
import { Copy, Check, Ban, Loader2, Clock, CheckCircle2, XCircle, X } from "lucide-react";
import { Badge, Button } from "@/components/ui/core";
import { motion, AnimatePresence } from "framer-motion";

const CANCEL_DELAY_MS = 2 * 60 * 1000;

export function NumberCard({
  entry,
  onCancel,
  onDelete,
}: {
  entry: PurchasedNumber;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [elapsed, setElapsed] = useState(() => Date.now() - entry.purchasedAt.getTime());
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);

  useEffect(() => {
    if (entry.status !== "waiting") return;
    const t = setInterval(() => setElapsed(Date.now() - entry.purchasedAt.getTime()), 1000);
    return () => clearInterval(t);
  }, [entry.purchasedAt, entry.status]);

  const canCancel = elapsed >= CANCEL_DELAY_MS && entry.status === "waiting" && !entry.cancelLoading;
  const secsLeft = Math.max(0, Math.ceil((CANCEL_DELAY_MS - elapsed) / 1000));
  const countryCode = entry.mode === "philippines" ? "63" : "52";
  const localNum = stripCountryCode(entry.phone, countryCode);

  const isDone = entry.status === "received" || entry.status === "cancelled";

  const copyPhone = () => {
    navigator.clipboard.writeText(localNum);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const copyOtp = () => {
    if (!entry.otp) return;
    navigator.clipboard.writeText(entry.otp);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`
        relative overflow-hidden rounded-xl border p-4 transition-colors
        ${entry.status === "received"
          ? "bg-primary/5 border-primary/20"
          : entry.status === "cancelled"
          ? "bg-destructive/5 border-destructive/20 opacity-75"
          : "bg-card border-white/5 shadow-sm"}
      `}
    >
      {/* Delete button — top right, only for finished orders */}
      {isDone && (
        <button
          onClick={() => onDelete(entry.orderId)}
          title="Hapus"
          className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/30 text-zinc-500 hover:text-red-400 transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-zinc-400 font-mono tracking-wider text-[10px]">
            #{entry.orderId}
          </Badge>
          <Badge
            variant={entry.mode === "mexico" ? "default" : "secondary"}
            className="uppercase text-[10px]"
          >
            {entry.mode === "mexico" ? "MX +52" : "PH +63"}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono pr-6">
          <Clock className="w-3 h-3" />
          {entry.status === "waiting" ? (
            <span className="text-zinc-300">
              {Math.floor(elapsed / 60000)}m {Math.floor((elapsed % 60000) / 1000)}s
            </span>
          ) : (
            <span>{entry.purchasedAt.toLocaleTimeString()}</span>
          )}
        </div>
      </div>

      <div
        className="flex items-center gap-2 mb-4 text-2xl font-mono font-bold tracking-tight text-white group cursor-pointer"
        onClick={copyPhone}
      >
        <span className="text-zinc-500 font-normal text-lg">+{countryCode}</span>
        {localNum}
        <button className="text-zinc-600 group-hover:text-white transition-colors ml-1">
          {copiedPhone ? (
            <Check className="w-4 h-4 text-primary" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>

      <div className="min-h-[40px] flex items-center justify-between border-t border-white/5 pt-3">
        <AnimatePresence mode="wait">
          {entry.status === "waiting" && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm text-zinc-400"
            >
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-soft-pulse" />
              Menunggu OTP...
            </motion.div>
          )}

          {entry.status === "received" && (
            <motion.div
              key="received"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
              <div
                className="text-xl font-mono font-bold text-primary flex items-center gap-2 cursor-pointer bg-primary/10 px-3 py-1 rounded-lg border border-primary/20 hover:bg-primary/20 transition-colors"
                onClick={copyOtp}
              >
                {entry.otp}
                {copiedOtp ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4 opacity-50" />
                )}
              </div>
            </motion.div>
          )}

          {entry.status === "cancelled" && (
            <motion.div
              key="cancelled"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-sm text-destructive"
            >
              <XCircle className="w-4 h-4" />
              Dibatalkan / Refund
            </motion.div>
          )}
        </AnimatePresence>

        {entry.status === "waiting" && (
          <Button
            variant="destructive"
            size="sm"
            className="h-8 px-3 text-xs"
            disabled={!canCancel || entry.cancelLoading}
            onClick={() => onCancel(entry.orderId)}
          >
            {entry.cancelLoading ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : (
              <Ban className="w-3 h-3 mr-1" />
            )}
            {canCancel ? "Cancel & Refund" : `Cancel in ${secsLeft}s`}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
