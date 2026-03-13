import { Router, type IRouter } from "express";

const router: IRouter = Router();

const BASE_URL = "https://hero-sms.com/stubs/handler_api.php";

const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Connection": "keep-alive",
  "Cache-Control": "no-cache",
  "Referer": "https://hero-sms.com/",
  "Origin": "https://hero-sms.com",
};

async function heroRequest(
  apiKey: string,
  params: Record<string, string>
): Promise<string> {
  const url = new URL(BASE_URL);
  url.searchParams.set("api_key", apiKey);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url.toString(), {
      headers: COMMON_HEADERS,
      signal: controller.signal,
    });

    const text = await res.text();

    if (
      text.includes("<!DOCTYPE html>") ||
      text.includes("Cloudflare") ||
      text.includes("<html")
    ) {
      throw new Error("CF_BLOCKED");
    }

    return text.trim();
  } finally {
    clearTimeout(timeout);
  }
}

function getApiKey(req: any): string | null {
  return (req.headers["x-api-key"] as string) || req.query.api_key || null;
}

router.get("/balance", async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey)
    return res.status(400).json({ success: false, error: "API key required" });
  try {
    const result = await heroRequest(apiKey, { action: "getBalance" });
    if (result.startsWith("ACCESS_BALANCE:")) {
      res.json({ success: true, balance: parseFloat(result.split(":")[1]) });
    } else {
      res.json({ success: false, error: result });
    }
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get("/prices", async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey)
    return res.status(400).json({ success: false, error: "API key required" });
  const { service = "wa", country } = req.query as Record<string, string>;
  try {
    const result = await heroRequest(apiKey, {
      action: "getPrices",
      service,
      country,
    });
    const parsed = JSON.parse(result);
    const serviceData = parsed?.[country]?.[service];
    res.json({
      success: true,
      cost: serviceData?.cost ?? null,
      count: serviceData?.count ?? 0,
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post("/buy", async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey)
    return res.status(400).json({ success: false, error: "API key required" });
  const country: string = req.body?.country ?? "54";
  const maxPrice: string | undefined = req.body?.maxPrice;
  const operator: string = req.body?.operator ?? "0";
  const service: string = req.body?.service ?? "wa";
  try {
    const params: Record<string, string> = {
      action: "getNumber",
      service,
      country,
      operator,
    };
    if (maxPrice) params.maxPrice = maxPrice;
    const result = await heroRequest(apiKey, params);
    if (result.startsWith("ACCESS_NUMBER:")) {
      const parts = result.split(":");
      res.json({ success: true, orderId: parts[1], phone: parts[2] });
    } else if (result === "NO_NUMBERS") {
      res.json({ success: false, error: "NO_NUMBERS" });
    } else if (result === "NO_MONEY") {
      res.json({ success: false, error: "NO_MONEY" });
    } else {
      res.json({ success: false, error: result });
    }
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get("/status/:id", async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey)
    return res.status(400).json({ success: false, error: "API key required" });
  try {
    const result = await heroRequest(apiKey, {
      action: "getStatus",
      id: req.params.id,
    });
    res.json({ success: true, status: result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post("/cancel/:id", async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey)
    return res.status(400).json({ success: false, error: "API key required" });
  try {
    const result = await heroRequest(apiKey, {
      action: "setStatus",
      id: req.params.id,
      status: "8",
    });
    res.json({ success: true, result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
