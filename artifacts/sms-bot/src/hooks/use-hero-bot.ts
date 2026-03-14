import { useState, useCallback, useRef, useEffect } from "react";
import { getBalance, getPrices, buyNumber, getStatus, cancelNumber } from "@workspace/api-client-react";

export type Mode = "mexico" | "philippines";

export type LogEntry = {
  id: string;
  timestamp: Date;
  type: "success" | "retry" | "error" | "stop" | "info" | "otp";
  message: string;
};

export type PurchasedNumber = {
  orderId: string;
  phone: string;
  mode: Mode;
  purchasedAt: Date;
  otp: string | null;
  status: "waiting" | "received" | "cancelled";
  cancelLoading: boolean;
};

const CANCEL_DELAY_MS = 2 * 60 * 1000;
const PH_COUNTRY = "4";
const MX_COUNTRY = "54";

function makeHeaders(apiKey: string): RequestInit {
  return { headers: { "x-api-key": apiKey } };
}

function makePostHeaders(apiKey: string): RequestInit {
  return { headers: { "x-api-key": apiKey, "Content-Type": "application/json" } };
}

export function useHeroBot(apiKey: string | null) {
  const [mode, setMode] = useState<Mode>("mexico");
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const [mxParallel, setMxParallel] = useState(3);
  const [mxDelay, setMxDelay] = useState(500);
  const [phQty, setPhQty] = useState(1);
  const [phDelay, setPhDelay] = useState(500);

  const [buyCount, setBuyCount] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  // Looping notification state
  const [notifPlaying, setNotifPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [purchased, setPurchased] = useState<PurchasedNumber[]>(() => {
    try {
      const raw = localStorage.getItem("hero_orders");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return parsed.map((n: any) => ({
        ...n,
        purchasedAt: new Date(n.purchasedAt),
        cancelLoading: false,
      }));
    } catch {
      return [];
    }
  });

  const stopRef = useRef(false);
  const purchasedRef = useRef(purchased);
  purchasedRef.current = purchased;

  useEffect(() => {
    localStorage.setItem(
      "hero_orders",
      JSON.stringify(
        purchased.map((n) => ({ ...n, purchasedAt: n.purchasedAt.toISOString() }))
      )
    );
  }, [purchased]);

  // Setup audio element once
  useEffect(() => {
    const audio = new Audio("/notif.mp3");
    audio.loop = true;
    audio.volume = 0.8;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  const playLoopingNotif = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
    setNotifPlaying(true);
  }, []);

  const stopNotif = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setNotifPlaying(false);
  }, []);

  const addLog = useCallback((type: LogEntry["type"], message: string) => {
    setLogs((prev) => {
      const next = [
        ...prev,
        { id: Math.random().toString(36).slice(2), timestamp: new Date(), type, message },
      ];
      return next.length > 300 ? next.slice(next.length - 300) : next;
    });
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  const handleStop = useCallback(() => {
    stopRef.current = true;
    setIsRunning(false);
    addLog("stop", "Bot dihentikan oleh user.");
  }, [addLog]);

  const deletePurchased = useCallback((orderId: string) => {
    setPurchased((prev) => prev.filter((n) => n.orderId !== orderId));
  }, []);

  const deleteAll = useCallback(() => {
    setPurchased([]);
  }, []);

  const runMexicoLoop = useCallback(async () => {
    if (!apiKey) return;
    stopRef.current = false;
    setIsRunning(true);
    setBuyCount(0);
    setRetryCount(0);

    addLog("info", `Bot Mexico dimulai — WA +52 maks $2.00 · ${mxParallel} paralel`);
    let localBuy = 0;
    let localRetry = 0;

    try {
      const initBal = await getBalance(makeHeaders(apiKey));
      if (!initBal.success || (initBal.balance ?? 0) <= 0) {
        addLog("error", "Saldo tidak cukup atau API Key invalid.");
        setIsRunning(false);
        return;
      }
      addLog("info", `Saldo: $${initBal.balance?.toFixed(2)}`);
    } catch {
      addLog("error", "Gagal cek saldo awal.");
      setIsRunning(false);
      return;
    }

    while (!stopRef.current) {
      const promises = Array.from({ length: mxParallel }).map(() =>
        buyNumber(
          { country: MX_COUNTRY, service: "wa", maxPrice: "2.00", operator: "0" },
          makePostHeaders(apiKey)
        )
      );

      try {
        const results = await Promise.all(promises);
        let hasNoMoney = false;

        results.forEach((res) => {
          if (res.success && res.orderId && res.phone) {
            localBuy++;
            setBuyCount(localBuy);
            addLog("success", `Berhasil: +${res.phone} (#${res.orderId})`);
            playLoopingNotif();
            setPurchased((prev) => [
              {
                orderId: res.orderId!,
                phone: res.phone!,
                mode: "mexico",
                purchasedAt: new Date(),
                otp: null,
                status: "waiting",
                cancelLoading: false,
              },
              ...prev,
            ]);
          } else if (res.error === "NO_MONEY") {
            hasNoMoney = true;
          } else {
            localRetry++;
            setRetryCount(localRetry);
            if (res.error === "NO_NUMBERS") {
              addLog("retry", "Stock kosong, mencoba lagi...");
            } else {
              addLog("error", `Error: ${res.error ?? "unknown"}`);
            }
          }
        });

        if (hasNoMoney) {
          addLog("stop", "Saldo habis. Bot berhenti otomatis.");
          break;
        }
      } catch {
        localRetry += mxParallel;
        setRetryCount(localRetry);
        addLog("error", "Network error saat mencoba beli.");
      }

      if (stopRef.current) break;
      await new Promise((r) => setTimeout(r, mxDelay));
    }

    setIsRunning(false);
  }, [apiKey, mxParallel, mxDelay, addLog, playLoopingNotif]);

  const runPhilippinesLoop = useCallback(async () => {
    if (!apiKey) return;
    stopRef.current = false;
    setIsRunning(true);
    setBuyCount(0);
    setRetryCount(0);

    addLog("info", `Bot Philippines dimulai — WA +63 target: ${phQty} nomor`);
    let localBuy = 0;
    let localRetry = 0;

    try {
      const p = await getPrices(
        { service: "wa", country: PH_COUNTRY },
        makeHeaders(apiKey)
      );
      if (!p.success || p.cost === null || p.cost === undefined) {
        addLog("info", "Gagal cek harga PH, lanjut saja...");
      } else {
        addLog("info", `Harga PH saat ini: $${p.cost} (${p.count} stock)`);
      }
    } catch {}

    for (let i = 0; i < phQty; i++) {
      if (stopRef.current) break;
      addLog("info", `Membeli nomor ke-${i + 1} dari ${phQty}...`);

      let success = false;
      while (!success && !stopRef.current) {
        try {
          const res = await buyNumber(
            { country: PH_COUNTRY, service: "wa", maxPrice: "0.17", operator: "0" },
            makePostHeaders(apiKey)
          );
          if (res.success && res.orderId && res.phone) {
            localBuy++;
            setBuyCount(localBuy);
            addLog("success", `Berhasil: +${res.phone} (#${res.orderId})`);
            playLoopingNotif();
            setPurchased((prev) => [
              {
                orderId: res.orderId!,
                phone: res.phone!,
                mode: "philippines",
                purchasedAt: new Date(),
                otp: null,
                status: "waiting",
                cancelLoading: false,
              },
              ...prev,
            ]);
            success = true;
          } else {
            localRetry++;
            setRetryCount(localRetry);
            if (res.error === "NO_MONEY") {
              addLog("stop", "Saldo habis. Bot berhenti.");
              stopRef.current = true;
              break;
            }
            addLog("retry", `Gagal (${res.error ?? "unknown"}), mencoba lagi...`);
            await new Promise((r) => setTimeout(r, phDelay));
          }
        } catch {
          localRetry++;
          setRetryCount(localRetry);
          addLog("error", "Network error, mencoba lagi...");
          await new Promise((r) => setTimeout(r, phDelay));
        }
      }

      if (!stopRef.current && i < phQty - 1) {
        await new Promise((r) => setTimeout(r, phDelay));
      }
    }

    addLog("stop", "Tugas selesai atau dihentikan.");
    setIsRunning(false);
  }, [apiKey, phQty, phDelay, addLog, playLoopingNotif]);

  const handleStart = useCallback(() => {
    if (mode === "mexico") runMexicoLoop();
    else runPhilippinesLoop();
  }, [mode, runMexicoLoop, runPhilippinesLoop]);

  const handleCancel = useCallback(
    async (orderId: string) => {
      if (!apiKey) return;
      setPurchased((prev) =>
        prev.map((n) => (n.orderId === orderId ? { ...n, cancelLoading: true } : n))
      );
      try {
        const res = await cancelNumber(orderId, makePostHeaders(apiKey));
        if (res.success) {
          setPurchased((prev) =>
            prev.map((n) =>
              n.orderId === orderId ? { ...n, status: "cancelled", cancelLoading: false } : n
            )
          );
          addLog("stop", `#${orderId} dibatalkan — saldo dikembalikan`);
        } else {
          setPurchased((prev) =>
            prev.map((n) => (n.orderId === orderId ? { ...n, cancelLoading: false } : n))
          );
          addLog("error", `Gagal cancel #${orderId}`);
        }
      } catch {
        setPurchased((prev) =>
          prev.map((n) => (n.orderId === orderId ? { ...n, cancelLoading: false } : n))
        );
      }
    },
    [apiKey, addLog]
  );

  useEffect(() => {
    if (!apiKey) return;
    const interval = setInterval(async () => {
      const pending = purchasedRef.current.filter((o) => o.status === "waiting");
      for (const order of pending) {
        try {
          const res = await getStatus(order.orderId, makeHeaders(apiKey));
          if (res.success && res.status) {
            if (res.status.startsWith("STATUS_OK:")) {
              const code = res.status.split(":")[1];
              addLog("otp", `OTP DITERIMA [${order.phone}]: ${code}`);
              setPurchased((prev) =>
                prev.map((n) =>
                  n.orderId === order.orderId
                    ? { ...n, status: "received", otp: code }
                    : n
                )
              );
            } else if (
              res.status === "STATUS_CANCEL" ||
              res.status === "STATUS_BANNED"
            ) {
              setPurchased((prev) =>
                prev.map((n) =>
                  n.orderId === order.orderId ? { ...n, status: "cancelled" } : n
                )
              );
            }
          }
        } catch {
          // ignore polling errors
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [apiKey, addLog]);

  return {
    mode,
    setMode,
    isRunning,
    handleStart,
    handleStop,
    logs,
    addLog,
    clearLogs,
    purchased,
    handleCancel,
    deletePurchased,
    deleteAll,
    buyCount,
    retryCount,
    notifPlaying,
    stopNotif,
    settings: {
      mxParallel,
      setMxParallel,
      mxDelay,
      setMxDelay,
      phQty,
      setPhQty,
      phDelay,
      setPhDelay,
    },
  };
}
