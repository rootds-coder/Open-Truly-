require("dotenv").config();
const path = require("path");
const fs = require("fs");
const http = require("http");
const express = require("express");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const open = require("open").default;
const { Server } = require("socket.io");
const qrcode = require("qrcode");
// ── Baileys (replaces puppeteer + whatsapp-web.js) ─────────────────────────────
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, downloadMediaMessage } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const pino = require("pino");
// ───────────────────────────────────────────────────────────────────────────────
const { getReplyAsDhruv, transcribeAudio, analyzeImageContent, generateSpeechReply, setRuntimeApiKey, getApiKey } = require("./gpt");
const db = require("./db");

const API_KEY_COOKIE = "dhruv_api_key";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60 * 1000; // 1 year

// Security: Admin password from environment (required for API access)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-this-password-in-production";
const SESSION_SECRET = process.env.SESSION_SECRET || "change-this-secret-in-production-" + Math.random().toString(36);
const MONGODB_URI = process.env.MONGODB_URI || null;

const PORT = process.env.PORT || 3000;
const ENABLE_WHATSAPP = process.env.ENABLE_WHATSAPP !== "false";

// Keep-alive settings
const KEEP_ALIVE_ENABLED = process.env.KEEP_ALIVE_ENABLED !== "false";
const KEEP_ALIVE_INTERVAL = parseInt(process.env.KEEP_ALIVE_INTERVAL || "840000", 10); // 14 minutes
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

// Auth folder for Baileys session files
const AUTH_FOLDER = process.env.WA_AUTH_FOLDER || "./auth_info_baileys";

// Multer: memory storage (file content saved to MongoDB, not disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const name = (file.originalname || "").toLowerCase();
    const isAllowedExt = /\.(txt|pdf|jpg|jpeg|png|webp|gif|mp3|ogg|wav|m4a|aac|docx)$/i.test(name);
    const ok = file.mimetype.startsWith("image/") || file.mimetype.startsWith("audio/") || file.mimetype === "application/pdf" || file.mimetype === "text/plain" || isAllowedExt;
    cb(ok ? null : new Error("Supported formats: PDF, Images (JPG/PNG), Audio (MP3/OGG), and Text files."), ok);
  },
});

const app = express();

// Behind a reverse proxy, trust X-Forwarded-* headers
app.set("trust proxy", 1);
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGIN || "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// ── Live Log Streamer for Dashboard Terminal ──────────────────────────────────
const origLog = console.log;
const origError = console.error;
const origWarn = console.warn;

function formatLogMsg(type, args) {
  const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
  return { time: new Date().toLocaleTimeString(), type, text: msg };
}

console.log = (...args) => {
  origLog.apply(console, args);
  io.emit('syslog', formatLogMsg('info', args));
};

console.error = (...args) => {
  origError.apply(console, args);
  io.emit('syslog', formatLogMsg('error', args));
};

console.warn = (...args) => {
  origWarn.apply(console, args);
  io.emit('syslog', formatLogMsg('warn', args));
};

// Security: Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Security: Rate limiting for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many upload requests, please try again later.",
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many authentication attempts, please try again later.",
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Security: Session management (Mongo-backed in production)
const sessionConfig = {
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: "lax",
  },
  name: "sessionId",
};

if (MONGODB_URI) {
  try {
    const store = MongoStore.create({
      mongoUrl: MONGODB_URI,
      collectionName: "sessions",
      ttl: 24 * 60 * 60,
    });
    store.on("set", (sid) => console.log("[Mongo] session set → sessions", sid ? sid.slice(0, 12) + "..." : ""));
    store.on("destroy", (sid) => console.log("[Mongo] session destroy → sessions", sid ? sid.slice(0, 12) + "..." : ""));
    sessionConfig.store = store;
  } catch (err) {
    console.error("Failed to configure MongoDB session store, falling back to in-memory:", err.message);
  }
} else {
  console.warn("MONGODB_URI not set, using in-memory session store.");
}

app.use(session(sessionConfig));

// Security: Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.authenticated) {
    return next();
  }
  return res.status(401).json({ ok: false, error: "Authentication required" });
};

// Security: Input validation helper
const validateInput = (input, type = "string", maxLength = 1000) => {
  if (!input || typeof input !== type) return false;
  if (type === "string" && input.length > maxLength) return false;
  if (type === "string" && /[<>"'`]/.test(input)) return false; // XSS protection
  return true;
};

app.use((req, res, next) => {
  if (req.cookies && req.cookies[API_KEY_COOKIE] && !getApiKey()) {
    setRuntimeApiKey(req.cookies[API_KEY_COOKIE]);
  }
  next();
});

const clientDist = path.join(__dirname, "client", "dist");
const publicDir = path.join(__dirname, "public");
const staticDir = fs.existsSync(clientDist) ? clientDist : publicDir;
app.use(express.static(staticDir));

app.get("/", (req, res) => {
  const indexPath = fs.existsSync(clientDist)
    ? path.join(clientDist, "index.html")
    : path.join(publicDir, "index.html");
  res.sendFile(indexPath);
});

// Health check endpoint (public, no auth required) - for keep-alive pings
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: "Service is running"
  });
});

// Alternative health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: "Service is running"
  });
});

// Security: Authentication endpoint
app.post("/api/auth/login", authLimiter, (req, res) => {
  const password = req.body && req.body.password;
  if (!password || typeof password !== "string") {
    return res.status(400).json({ ok: false, error: "Password is required" });
  }

  const trimmedPassword = password.trim();
  const trimmedAdminPassword = String(ADMIN_PASSWORD || "").trim();

  if (process.env.NODE_ENV !== "production") {
    console.log("Login attempt - Password length:", trimmedPassword.length, "Admin password length:", trimmedAdminPassword.length);
  }

  if (trimmedPassword === trimmedAdminPassword && trimmedAdminPassword.length > 0) {
    req.session.authenticated = true;
    console.log("[Mongo] login success → session will be saved to MongoDB");
    return res.json({ ok: true, message: "Authentication successful" });
  } else {
    if (process.env.NODE_ENV !== "production") {
      console.log("Login attempt failed - password mismatch");
    }
    return res.status(401).json({ ok: false, error: "Invalid password" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy();
  res.json({ ok: true, message: "Logged out successfully" });
});

app.get("/api/auth/status", (req, res) => {
  res.json({ authenticated: !!(req.session && req.session.authenticated) });
});

// Protected API endpoints
app.get("/api/config", apiLimiter, async (req, res) => {
  let hasChats = false;
  let hasClosestPerson = false;
  try {
    if (db.MONGODB_URI) {
      hasChats = await db.hasChats();
      hasClosestPerson = await db.hasClosestPerson();
    }
  } catch (err) {
    console.error("Config Mongo error:", err.message);
  }
  res.json({ hasApiKey: !!getApiKey(), hasChats, hasClosestPerson });
});

app.post("/api/clear-key", requireAuth, apiLimiter, (req, res) => {
  setRuntimeApiKey(null);
  res.clearCookie(API_KEY_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.json({ ok: true });
});

app.post("/api/set-key", requireAuth, apiLimiter, (req, res) => {
  const key = req.body && req.body.apiKey;
  if (!validateInput(key, "string", 200)) {
    return res.status(400).json({ ok: false, error: "Valid API key is required" });
  }
  const trimmed = key.trim();
  if (trimmed.length < 10) {
    return res.status(400).json({ ok: false, error: "API key seems invalid" });
  }
  setRuntimeApiKey(trimmed);
  res.cookie(API_KEY_COOKIE, trimmed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax",
  });
  res.json({ ok: true });
});

app.get("/api/chats", apiLimiter, async (req, res) => {
  try {
    if (!db.MONGODB_URI) {
      return res.json({ files: [] });
    }
    const files = await db.listChats();
    res.json({ files });
  } catch (err) {
    console.error("Error reading chats:", err);
    res.status(500).json({ ok: false, error: "Failed to read chat files" });
  }
});

app.get("/api/contacts", requireAuth, apiLimiter, async (req, res) => {
  try {
    if (!db.MONGODB_URI) {
      return res.json([]);
    }
    const contacts = await db.listContacts();
    res.json(contacts);
  } catch (err) {
    console.error("Error reading contacts:", err);
    res.status(500).json({ ok: false, error: "Failed to read contacts" });
  }
});

app.post("/api/contacts/mode", requireAuth, apiLimiter, async (req, res) => {
  const { jid, mode } = req.body;
  if (!jid || !mode) {
    return res.status(400).json({ ok: false, error: "JID and mode are required" });
  }
  try {
    if (!db.MONGODB_URI) {
      return res.status(503).json({ ok: false, error: "MongoDB not configured" });
    }
    await db.setContactMode(jid, mode);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error updating contact mode:", err);
    res.status(500).json({ ok: false, error: err.message || "Failed to update contact mode" });
  }
});

app.get("/api/don-away", requireAuth, apiLimiter, async (req, res) => {
  try {
    const enabled = db.MONGODB_URI ? await db.getDonAwayMode() : false;
    res.json({ enabled });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/don-away", requireAuth, apiLimiter, async (req, res) => {
  try {
    const enabled = !!(req.body && req.body.enabled);
    if (!db.MONGODB_URI) {
      return res.status(503).json({ ok: false, error: "MongoDB not configured" });
    }
    await db.setDonAwayMode(enabled);
    io.emit("donAwayStatus", { enabled });
    res.json({ ok: true, enabled });
  } catch (err) {
    console.error("Error setting Don Away Mode:", err);
    res.status(500).json({ ok: false, error: err.message || "Failed to update Don Away Mode" });
  }
});

// ── Delete Single Contact ────────────────────────────────────────────────────
app.delete("/api/contacts/:jid", requireAuth, apiLimiter, async (req, res) => {
  const jid = req.params.jid;
  if (!jid) return res.status(400).json({ ok: false, error: "JID required" });
  try {
    if (!db.MONGODB_URI) return res.status(503).json({ ok: false, error: "MongoDB not configured" });
    await db.deleteContact(jid);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Delete ALL Contacts & History ───────────────────────────────────────────
app.delete("/api/contacts", requireAuth, apiLimiter, async (req, res) => {
  try {
    if (!db.MONGODB_URI) return res.status(503).json({ ok: false, error: "MongoDB not configured" });
    const result = await db.deleteAllContacts();
    res.json({ ok: true, message: `Deleted ${result.contactsDeleted} contacts and ${result.historyDeleted} chat history entries.`, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Delete ALL Chat History Only ─────────────────────────────────────────────
app.delete("/api/history", requireAuth, apiLimiter, async (req, res) => {
  try {
    if (!db.MONGODB_URI) return res.status(503).json({ ok: false, error: "MongoDB not configured" });
    const result = await db.deleteAllMessageHistory();
    res.json({ ok: true, message: `Cleared ${result.deletedCount} chat messages.`, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Broadcast Campaign Endpoints ──────────────────────────────────────────────
app.get("/api/broadcasts", requireAuth, apiLimiter, async (req, res) => {
  try {
    if (!db.MONGODB_URI) return res.json({ campaigns: [] });
    const campaigns = await db.listBroadcasts();
    res.json({ ok: true, campaigns });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/broadcasts/send", requireAuth, apiLimiter, async (req, res) => {
  const { title, message, target, jids, delayMs } = req.body || {};
  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ ok: false, error: "Broadcast message is required" });
  }
  if (!isReady || !waSocket) {
    return res.status(503).json({ ok: false, error: "WhatsApp is not connected. Link device first." });
  }
  if (!db.MONGODB_URI) {
    return res.status(503).json({ ok: false, error: "MongoDB not configured." });
  }

  try {
    let recipientJids = [];
    if (target === "selected" && Array.isArray(jids) && jids.length > 0) {
      recipientJids = jids;
    } else {
      const allContacts = await db.listContacts();
      recipientJids = allContacts.map((c) => c.jid).filter(Boolean);
    }

    if (recipientJids.length === 0) {
      return res.status(400).json({ ok: false, error: "No recipients found for this broadcast campaign." });
    }

    const delay = Math.max(2000, parseInt(delayMs || "3000", 10));
    const campaign = await db.saveBroadcastCampaign({
      title: title || "WhatsApp Campaign",
      message: message.trim(),
      recipientsCount: recipientJids.length,
      delayMs: delay,
    });

    res.json({
      ok: true,
      message: `Broadcast campaign started for ${recipientJids.length} contacts.`,
      campaignId: campaign.id,
      recipientsCount: recipientJids.length,
    });

    // Run broadcast sending loop asynchronously in background
    (async () => {
      let sent = 0;
      await db.updateBroadcastProgress(campaign.id, { status: "sending" });

      for (const jid of recipientJids) {
        try {
          await simulateTyping(waSocket, jid, message.length);
          await waSocket.sendMessage(jid, { text: message.trim() });
          await db.saveChatMessage(jid, "assistant", `[Broadcast Campaign]: ${message.trim()}`);
          sent++;
          await db.updateBroadcastProgress(campaign.id, { sentCount: sent });
          io.emit("broadcastProgress", {
            campaignId: campaign.id,
            sent,
            total: recipientJids.length,
            currentJid: jid,
            status: "sending",
          });
        } catch (err) {
          console.error(`[Broadcast] Failed sending to ${jid}:`, err.message);
        }
        // Anti-ban safety delay with random jitter (+0-1000ms)
        await new Promise((r) => setTimeout(r, delay + Math.random() * 1000));
      }

      await db.updateBroadcastProgress(campaign.id, { sentCount: sent, status: "completed" });
      io.emit("broadcastProgress", {
        campaignId: campaign.id,
        sent,
        total: recipientJids.length,
        status: "completed",
      });
      console.log(`[Broadcast] Campaign "${campaign.title}" completed. Sent: ${sent}/${recipientJids.length}`);
    })().catch((err) => {
      console.error("[Broadcast] Campaign worker error:", err.message);
      db.updateBroadcastProgress(campaign.id, { status: "failed", error: err.message }).catch(() => {});
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Delete Reference Chat File ───────────────────────────────────────────────
app.delete("/api/chats/:filename", requireAuth, apiLimiter, async (req, res) => {
  const filename = req.params.filename;
  if (!filename) return res.status(400).json({ ok: false, error: "Filename required" });
  try {
    if (!db.MONGODB_URI) return res.status(503).json({ ok: false, error: "MongoDB not configured" });
    await db.deleteChatFile(filename);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Multi-User Registration ──────────────────────────────────────────────────
app.post("/api/auth/register", apiLimiter, async (req, res) => {
  const { username, password, apiKey } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ ok: false, error: "Username and password are required" });
  }
  if (username.trim().length < 3) {
    return res.status(400).json({ ok: false, error: "Username must be at least 3 characters" });
  }
  try {
    if (!db.MONGODB_URI) return res.status(503).json({ ok: false, error: "MongoDB not configured" });
    const crypto = require("crypto");
    const passwordHash = crypto.createHash("sha256").update(password.trim()).digest("hex");
    const user = await db.createUser({
      username: username.trim().toLowerCase(),
      passwordHash,
      role: "user",
      apiKey: apiKey ? apiKey.trim() : "",
    });
    req.session.authenticated = true;
    req.session.username = user.username;
    res.json({ ok: true, user: { username: user.username, role: user.role, hasKey: !!user.userApiKey } });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// ── Admin Analytics & Master Control ─────────────────────────────────────────
app.get("/api/admin/analytics", requireAuth, apiLimiter, async (req, res) => {
  try {
    if (!db.MONGODB_URI) return res.status(503).json({ ok: false, error: "MongoDB not configured" });
    const stats = await db.getAnalyticsOverview();
    res.json({ ok: true, ...stats });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/admin/users/disable", requireAuth, apiLimiter, async (req, res) => {
  const { username, disabled } = req.body || {};
  if (!username) return res.status(400).json({ ok: false, error: "Username required" });
  try {
    if (!db.MONGODB_URI) return res.status(503).json({ ok: false, error: "MongoDB not configured" });
    await db.toggleUserDisabled(username, disabled);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete("/api/admin/users/:username", requireAuth, apiLimiter, async (req, res) => {
  const username = req.params.username;
  if (!username) return res.status(400).json({ ok: false, error: "Username required" });
  try {
    if (!db.MONGODB_URI) return res.status(503).json({ ok: false, error: "MongoDB not configured" });
    await db.deleteUser(username);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/upload-chat", uploadLimiter, upload.single("chat"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ ok: false, error: "No file uploaded. Choose a .txt or .pdf file." });
  }
  if (!db.MONGODB_URI) {
    return res.status(503).json({ ok: false, error: "MongoDB not configured. Set MONGODB_URI." });
  }
  const isPdf = req.file.mimetype === "application/pdf" || (req.file.originalname && req.file.originalname.toLowerCase().endsWith(".pdf"));
  const isTxt = req.file.mimetype === "text/plain" || (req.file.originalname && req.file.originalname.toLowerCase().endsWith(".txt"));

  if (!isPdf && !isTxt) {
    return res.status(400).json({ ok: false, error: "Only .txt and .pdf files are allowed" });
  }
  if (req.file.size > 15 * 1024 * 1024) {
    return res.status(400).json({ ok: false, error: "File too large (max 15MB)" });
  }

  let filename = (req.file.originalname || `doc-${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, "_");
  const docType = isPdf ? "pdf" : "txt";
  const asClosest = req.body && (req.body.asClosest === "true" || req.body.asClosest === true);
  if (asClosest) filename = "closest-person.txt";

  let content = "";
  if (isPdf) {
    // Extract printable text from PDF buffer
    const raw = (req.file.buffer || Buffer.from("")).toString("binary");
    const extracted = raw.replace(/[^\x20-\x7E\n\r]/g, " ").replace(/\s+/g, " ").trim();
    content = extracted || "PDF Content";
  } else {
    content = (req.file.buffer || Buffer.from("")).toString("utf8");
  }

  try {
    await db.insertChat(filename, content, asClosest, docType);
  } catch (err) {
    console.error("Upload Knowledge Base Mongo error:", err);
    return res.status(500).json({ ok: false, error: "Failed to save Knowledge Base doc to database." });
  }

  res.json({
    ok: true,
    filename,
    docType,
    asClosest: !!asClosest,
    message: `Knowledge Base document "${filename}" saved successfully!`,
  });
});

function fetchUrlNative(targetUrl) {
  return new Promise((resolve, reject) => {
    const httpLib = targetUrl.startsWith("https") ? require("https") : require("http");
    const req = httpLib.get(
      targetUrl,
      { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchUrlNative(res.headers.location).then(resolve).catch(reject);
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`Website returned status ${res.statusCode}`));
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      }
    );
    req.on("error", (err) => reject(err));
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error("Website connection timed out"));
    });
  });
}

// ── Web Scraping Endpoint (RAG) ──────────────────────────────────────────────
app.post("/api/scrape-url", requireAuth, apiLimiter, async (req, res) => {
  const { url } = req.body || {};
  if (!url || typeof url !== "string" || !url.trim().startsWith("http")) {
    return res.status(400).json({ ok: false, error: "Valid website URL starting with http:// or https:// is required." });
  }
  if (!db.MONGODB_URI) {
    return res.status(503).json({ ok: false, error: "MongoDB not configured." });
  }

  try {
    let html = "";
    if (typeof globalThis.fetch === "function") {
      const response = await globalThis.fetch(url.trim(), {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      });
      if (!response.ok) {
        return res.status(400).json({ ok: false, error: `Website returned status ${response.status}` });
      }
      html = await response.text();
    } else {
      html = await fetchUrlNative(url.trim());
    }

    // Strip script, style tags and HTML markup to get clean text
    const cleanText = html
      .replace(/<script\b[^<]*>([\s\S]*?)<\/script>/gi, "")
      .replace(/<style\b[^<]*>([\s\S]*?)<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (cleanText.length < 50) {
      return res.status(400).json({ ok: false, error: "Could not extract sufficient text content from this website." });
    }

    const filename = url.replace(/^https?:\/\//i, "").replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 45) + ".url";
    await db.insertChat(filename, cleanText.slice(0, 15000), false, "url");

    res.json({
      ok: true,
      filename,
      extractedLength: cleanText.length,
      message: `Scraped website content (${cleanText.length} chars) into AI Knowledge Base!`,
    });
  } catch (err) {
    console.error("Web scrape error:", err.message);
    res.status(500).json({ ok: false, error: `Failed to scrape website: ${err.message}` });
  }
});

// ── Custom Persona Studio Endpoints ──────────────────────────────────────────
app.get("/api/personas", requireAuth, apiLimiter, async (req, res) => {
  try {
    if (!db.MONGODB_URI) return res.json({ personas: [] });
    const customPersonas = await db.listCustomPersonas();
    res.json({ ok: true, personas: customPersonas });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/personas", requireAuth, apiLimiter, async (req, res) => {
  const { key, name, emoji, description, systemPrompt, temperature } = req.body || {};
  if (!name || !systemPrompt) {
    return res.status(400).json({ ok: false, error: "Persona name and system prompt are required." });
  }
  try {
    if (!db.MONGODB_URI) return res.status(503).json({ ok: false, error: "MongoDB not configured." });
    const doc = await db.saveCustomPersona({ key, name, emoji, description, systemPrompt, temperature: Number(temperature || 0.7) });
    res.json({ ok: true, persona: doc, message: `Persona "${doc.name}" saved successfully!` });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete("/api/personas/:key", requireAuth, apiLimiter, async (req, res) => {
  const key = req.params.key;
  if (!key) return res.status(400).json({ ok: false, error: "Persona key required" });
  try {
    if (!db.MONGODB_URI) return res.status(503).json({ ok: false, error: "MongoDB not configured" });
    await db.deleteCustomPersona(key);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── CRM Lead Stage & Notes Endpoints ──────────────────────────────────────────
app.post("/api/contacts/stage", requireAuth, apiLimiter, async (req, res) => {
  const { jid, leadStage } = req.body || {};
  if (!jid || !leadStage) return res.status(400).json({ ok: false, error: "JID and leadStage required" });
  try {
    if (!db.MONGODB_URI) return res.status(503).json({ ok: false, error: "MongoDB not configured" });
    await db.updateContactLeadStage(jid, leadStage);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/contacts/notes", requireAuth, apiLimiter, async (req, res) => {
  const { jid, notes } = req.body || {};
  if (!jid) return res.status(400).json({ ok: false, error: "JID required" });
  try {
    if (!db.MONGODB_URI) return res.status(503).json({ ok: false, error: "MongoDB not configured" });
    await db.updateContactNotes(jid, notes);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Media Assets Endpoints ────────────────────────────────────────────────────
app.get("/api/media", requireAuth, apiLimiter, async (req, res) => {
  try {
    if (!db.MONGODB_URI) return res.json({ assets: [] });
    const assets = await db.listMediaAssets();
    res.json({ ok: true, assets });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/media", requireAuth, apiLimiter, upload.single("file"), async (req, res) => {
  const { title, mediaType, keywords, fileUrl } = req.body || {};
  if (!title) return res.status(400).json({ ok: false, error: "Title is required" });
  try {
    if (!db.MONGODB_URI) return res.status(503).json({ ok: false, error: "MongoDB not configured" });

    let url = fileUrl || "";
    let filename = "attachment";
    let mimeType = "application/pdf";
    let buffer = null;

    if (req.file) {
      filename = req.file.originalname || "file";
      mimeType = req.file.mimetype || "application/octet-stream";
      buffer = req.file.buffer || null;
    }

    const asset = await db.saveMediaAsset({
      title,
      mediaType: mediaType || "document",
      mimeType,
      fileUrl: url,
      filename,
      keywords,
      buffer,
    });

    res.json({ ok: true, asset, message: `Media asset "${asset.title}" saved successfully!` });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete("/api/media/:id", requireAuth, apiLimiter, async (req, res) => {
  try {
    if (!db.MONGODB_URI) return res.status(503).json({ ok: false, error: "MongoDB not configured" });
    await db.deleteMediaAsset(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Drip Sequence Endpoints & Engine ──────────────────────────────────────────
app.get("/api/drips", requireAuth, apiLimiter, async (req, res) => {
  try {
    if (!db.MONGODB_URI) return res.json({ rules: [] });
    const rules = await db.listDripRules();
    res.json({ ok: true, rules });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/drips", requireAuth, apiLimiter, async (req, res) => {
  const { name, inactivityHours, targetStage, message, enabled } = req.body || {};
  if (!name || !message) return res.status(400).json({ ok: false, error: "Name and message required" });
  try {
    if (!db.MONGODB_URI) return res.status(503).json({ ok: false, error: "MongoDB not configured" });
    const rule = await db.saveDripRule({ name, inactivityHours, targetStage, message, enabled });
    res.json({ ok: true, rule, message: `Drip rule "${rule.name}" saved!` });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete("/api/drips/:id", requireAuth, apiLimiter, async (req, res) => {
  try {
    if (!db.MONGODB_URI) return res.status(503).json({ ok: false, error: "MongoDB not configured" });
    await db.deleteDripRule(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── WhatsApp state ────────────────────────────────────────────────────────────
let waSocket = null;
let isReady = false;

io.on("connection", (socket) => {
  if (isReady) socket.emit("ready");
});

// ── Layer 3: Typing Presence Simulation ─────────────────────────────────────
/**
 * Show WhatsApp "typing..." indicator before sending a reply.
 * Delay is proportional to reply length (mimics human typing speed ~40 cpm).
 * Min 1.5s, Max 7s, with ±500ms random jitter.
 *
 * @param {Object} sock       Baileys socket instance
 * @param {string} jid        Recipient JID
 * @param {number} textLength Length of the reply text (for delay calculation)
 */
async function simulateTyping(sock, jid, textLength = 50) {
  try {
    await sock.sendPresenceUpdate("composing", jid);
    const baseDelay = Math.min(7000, Math.max(1500, (textLength / 40) * 1000));
    const jitter = Math.floor((Math.random() - 0.5) * 1000);
    await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
    await sock.sendPresenceUpdate("paused", jid);
  } catch (_) {
    // Presence updates are non-critical — silently ignore errors
  }
}

// ── Persona Picker Helpers ───────────────────────────────────────────────────

/**
 * Send the AI companion selection menu to a new user.
 * Uses WhatsApp markdown (*bold*, _italic_) for visual appeal.
 */
async function sendModeSelectionMessage(sock, jid, name = "") {
  const hi = name ? `Hey *${name.split(" ")[0]}*! 👋` : "Hey! 👋";
  const menu =
    `${hi} Welcome to *Open-Truly AI* 🤖\n\n` +
    `Choose your AI companion — reply with a number:\n\n` +
    `1️⃣  *😈 Devil's AI* _\(Default\)_\n` +
    `    Smart assistant, solves anything\n\n` +
    `2️⃣  *👦 Dhruv Mode*\n` +
    `    Casual guy, Hinglish vibes\n\n` +
    `3️⃣  *👧 Annu Mode*\n` +
    `    Sweet girlfriend persona\n\n` +
    `_Reply with *1*, *2*, or *3* to activate (or send *STOP* to turn off AI)_ ✨`;

  await simulateTyping(sock, jid, menu.length);
  await sock.sendMessage(jid, { text: menu });
  console.log(`[Picker] Sent mode selection menu to ${jid}`);
}

/**
 * Parse a user's reply to detect which persona they chose.
 * Accepts: numbers (1/2/3), English names, Hindi equivalents, emojis.
 * @param {string} text
 * @returns {"devil"|"boy"|"girl"|null}
 */
function parsePersonaChoice(text) {
  const t = (text || "").toLowerCase().trim();
  if (/^(1|one|devil|😈|smart|default|ai)/.test(t))   return "devil";
  if (/^(2|two|boy|dhruv|👦|bro|dude|male)/.test(t))    return "boy";
  if (/^(3|three|girl|annu|👧|female|gf|ladki)/.test(t)) return "girl";
  return null;
}

/**
 * Send a persona-specific confirmation + first message after mode selection.
 */
async function sendPersonaWelcome(sock, jid, mode) {
  const welcomes = {
    devil:
      "*😈 Devil's AI activated!*\n\n" +
      "Hey! Devil's here 😈\n\n" +
      "How can I help you today?\n\n" +
      "— Devil's AI v1.0",
    boy:
      "*👦 Dhruv mode activated!*\n\n" +
      "Haha theek hai bhai! Bol kya scene hai? 😄",
    girl:
      "*👧 Annu mode activated!*\n\n" +
      "Yay! Hii! Kaise ho aap? 🥰",
  };
  const msg = welcomes[mode] || welcomes.devil;
  await simulateTyping(sock, jid, msg.length);
  await sock.sendMessage(jid, { text: msg });
}

// ── Don Away Mode Helpers ────────────────────────────────────────────────────

function isDonAwayOptInReply(text) {
  const t = (text || "").toLowerCase().trim();
  return /^(yes|okay|ok|1|one|hmm|hmmm|ha|haan|sahi|thik|sure|yep|yup|haanji|okkk)/.test(t);
}

async function sendDonAwayNotice(sock, jid) {
  const textReply =
    "Don abhi kaam pe hai 😈\n" +
    "Abhi reply nahi de sakta.\n" +
    "Samay aane pe milega.";

  await simulateTyping(sock, jid, textReply.length);
  await sock.sendMessage(jid, { text: textReply });

  // Send Opus voice note default.opus (auto-convert default.mp3 via ffmpeg if missing)
  try {
    const opusPath = path.join(__dirname, "default.opus");
    const mp3Path = path.join(__dirname, "default.mp3");

    if (!fs.existsSync(opusPath) && fs.existsSync(mp3Path)) {
      try {
        const { execSync } = require("child_process");
        execSync(`ffmpeg -y -i "${mp3Path}" -c:a libopus -b:a 32k -vbr on "${opusPath}"`);
      } catch (_) {}
    }

    const audioFile = fs.existsSync(opusPath) ? opusPath : (fs.existsSync(mp3Path) ? mp3Path : null);
    if (audioFile) {
      const audioBuffer = fs.readFileSync(audioFile);
      const isOpus = audioFile.endsWith(".opus");
      await sock.sendMessage(jid, {
        audio: audioBuffer,
        mimetype: isOpus ? "audio/ogg; codecs=opus" : "audio/mpeg",
        ptt: isOpus,
      });
      console.log(`[DonAway] Sent voice note (${audioFile}, isOpus=${isOpus}) to ${jid}`);
    } else {
      console.warn("[DonAway] No audio file found on disk");
    }
  } catch (audioErr) {
    console.error("[DonAway] Audio send error:", audioErr.message);
  }

  // Option prompt to activate AI
  const optPrompt =
    "Would you like to switch to AI companion mode until Don is back? 🤖\n\n" +
    "Reply *Yes*, *Okay*, *1*, or *Hmm* to activate!";

  await simulateTyping(sock, jid, optPrompt.length);
  await sock.sendMessage(jid, { text: optPrompt });
  console.log(`[DonAway] Sent away notice + opt-in prompt to ${jid}`);
}

// ── Baileys WhatsApp client (no browser, pure WebSocket) ─────────────────────
async function startWhatsApp() {
  // Ensure auth folder exists
  if (!fs.existsSync(AUTH_FOLDER)) {
    fs.mkdirSync(AUTH_FOLDER, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
  const { version } = await fetchLatestBaileysVersion();

  console.log(`[Baileys] Using WA v${version.join(".")}`);

  const logger = pino({ level: "silent" }); // suppress verbose logs

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false, // we handle QR ourselves via socket.io
    browser: ["Open Truly Chat", "Chrome", "1.0.0"],
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
    retryRequestDelayMs: 2000,
  });

  waSocket = sock;

  // Save credentials whenever they are updated
  sock.ev.on("creds.update", saveCreds);

  // Handle connection state changes
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Send QR code to all connected browser clients
    if (qr) {
      try {
        const dataUrl = await qrcode.toDataURL(qr, { margin: 2, width: 280 });
        console.log("[Baileys] QR code generated — scan with WhatsApp");
        io.emit("qr", { dataUrl });
      } catch (err) {
        console.error("[Baileys] QR generation error:", err.message);
      }
    }

    if (connection === "open") {
      isReady = true;
      console.log("[Baileys] WhatsApp connected ✓");
      io.emit("ready");

      // 🔥 Hybrid: Sync contacts after successful login
      try {
        await syncWhatsAppContacts(sock);
      } catch (err) {
        console.error("[Baileys] Contact sync failed:", err.message);
      }
    }

    if (connection === "close") {
      isReady = false;
      const statusCode =
        lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output?.statusCode
          : null;

      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`[Baileys] Connection closed (code: ${statusCode}), reconnecting: ${shouldReconnect}`);
      io.emit("disconnected");

      if (shouldReconnect) {
        setTimeout(startWhatsApp, 3000);
      } else {
        console.log("[Baileys] Logged out. Clearing auth files.");
        try {
          fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
        } catch (_) {}
      }
    }
  });

  // ── Live contact updates ─────────────────────────────────
  sock.ev.on("contacts.upsert", async (contacts) => {
    try {
      const mapped = contacts.map((c) => ({
        jid: c.id,
        name: c.name || c.notify || c.verifiedName || "",
      }));
      if (db.MONGODB_URI) {
        await db.bulkUpsertContacts(mapped);
        console.log(`[Baileys] contacts.upsert → ${mapped.length} contacts`);
      }
    } catch (err) {
      console.error("[Baileys] contacts.upsert error:", err.message);
    }
  });

  sock.ev.on("contacts.update", async (updates) => {
    try {
      const mapped = updates
        .filter((u) => u.id)
        .map((u) => ({
          jid: u.id,
          name: u.name || u.notify || "",
        }));
      if (mapped.length && db.MONGODB_URI) {
        await db.bulkUpsertContacts(mapped);
      }
    } catch (err) {
      console.error("[Baileys] contacts.update error:", err.message);
    }
  });

  // ── Incoming messages (Multimodal: Text + Voice + Image) ────
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (msg.key.fromMe) continue;

      const jid = msg.key.remoteJid || "";

      // Track incoming message traffic activity
      if (db.MONGODB_URI) {
        await db.trackActivity("admin", "message");
      }
      const isGroup = jid.endsWith("@g.us");
      const isStatus = jid === "status@broadcast";
      if (isGroup || isStatus) continue;

      // ── Extract all possible content types ──────────────────
      const textMsg = (
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        ""
      ).trim();

      const audioMsg = msg.message?.audioMessage || null;
      const imageMsg = msg.message?.imageMessage || null;

      const hasAnyContent = textMsg || audioMsg || imageMsg;

      // Emit to dashboard (show media type labels)
      const payload = {
        id: msg.key.id || `${jid}-${Date.now()}`,
        from: jid,
        fromName: msg.pushName || jid,
        body: textMsg || (audioMsg ? "🎙️ Voice Note" : imageMsg ? "📸 Image" : ""),
        timestamp: msg.messageTimestamp,
        hasMedia: !!(audioMsg || imageMsg),
      };
      io.emit("message", payload);

      if (!hasAnyContent) continue;
      if (!getApiKey()) {
        await sock.sendMessage(jid, {
          text: "Bot is not configured: add your OpenAI API key in the web app first.",
        });
        continue;
      }

      // ── Load contact info (shared across all paths) ──────────
      let contactMode = "devil";
      let chatHistory = [];
      let alreadyGreeted = false;
      let contact = null;  // declared here so it's accessible outside the try block

      try {
        if (db.MONGODB_URI) {
          contact = await db.getContact(jid);
          // ⏰ 20-Minute Inactivity Reset: If inactive for >20 mins, reset Don Away notice, opt-in & persona selection
          if (contact && contact.lastActive) {
            const inactiveMinutes = (Date.now() - new Date(contact.lastActive).getTime()) / (60 * 1000);
            if (inactiveMinutes >= 20) {
              console.log(`[Inactivity] Contact ${jid} was inactive for ${Math.round(inactiveMinutes)}m. Resetting Don Away notice & opt-in.`);
              await db.setContactDonAwayOptIn(jid, false);
              await db.setContactDonAwayNoticeSent(jid, false);
              await db.setContactMode(jid, "devil");
              const d = await db.getDb();
              await d.collection("contacts").updateOne({ jid }, { $set: { pendingModeSelection: true, donAwayOptIn: false, donAwayNoticeSent: false } });
            }
          }
          await db.upsertContact(jid, msg.pushName || "");
          contact = await db.getContact(jid);  // assign (not const) so scope is shared
          contactMode = contact.mode || "devil";
          alreadyGreeted = !!contact.greeted;
          chatHistory = await db.getChatHistory(jid, 12);
        }
      } catch (err) {
        console.error("[Mongo] Error loading contact:", err.message);
      }

      // ══════════════════════════════════════════════════════════
      // LAYER 1 — 🎙️ VOICE NOTE: Transcribe → Persona → TTS Reply
      // ══════════════════════════════════════════════════════════
      if (audioMsg) {
        try {
          console.log(`[Voice] 🎙️ Voice note received from ${jid}`);
          await sock.sendPresenceUpdate("composing", jid);

          // Download & decrypt voice note (reuploadRequest handles expired URLs)
          let audioBuffer = null;
          try {
            audioBuffer = await downloadMediaMessage(
              msg, "buffer", {},
              { logger, reuploadRequest: sock.updateMediaMessage }
            );
          } catch (dlErr) {
            console.warn("[Voice] Download failed:", dlErr.message);
          }

          if (!audioBuffer || audioBuffer.length < 100) {
            const noAudio = {
              girl:  "arre sun nahi payi 😅 type karke bhejo na!",
              boy:   "bhai voice nahi hua, type kar yaar 😅",
              devil: "Couldn't download that voice note 😈 please type!",
            }[contactMode] || "Please type your message!";
            await simulateTyping(sock, jid, noAudio.length);
            await sock.sendMessage(jid, { text: noAudio });
            continue;
          }

          console.log(`[Voice] Downloaded ${audioBuffer.length} bytes`);

          // Transcribe with Whisper
          const transcribed = await transcribeAudio(
            audioBuffer,
            audioMsg.mimetype || "audio/ogg; codecs=opus"
          );

          if (!transcribed) {
            // Graceful fallback if Whisper fails
            const fallback = {
              girl: "arre sun nahi payi 😅 type karke bhejo na!",
              boy:  "bhai voice nahi hua, type kar yaar 😅",
              devil: "Voice note transcription failed 😈 Please type your message!",
            }[contactMode] || "Please type your message!";

            await simulateTyping(sock, jid, fallback.length);
            await sock.sendMessage(jid, { text: fallback });
            continue;
          }

          // Save transcribed text to history
          if (db.MONGODB_URI) {
            await db.saveChatMessage(jid, "user", `[Voice]: ${transcribed}`);
            chatHistory = await db.getChatHistory(jid, 12);
          }

          // Get AI text reply for the transcribed voice content
          const textReply = await getReplyAsDhruv(transcribed, contactMode, chatHistory);

          // Try to generate a voice reply with TTS
          const voiceBuffer = await generateSpeechReply(textReply, contactMode);

          if (voiceBuffer) {
            // ✅ Reply with a voice note (matches persona voice)
            await simulateTyping(sock, jid, 3);
            await sock.sendMessage(jid, {
              audio: voiceBuffer,
              mimetype: "audio/ogg; codecs=opus",
              ptt: true,  // ptt = push-to-talk = voice note
            });
            console.log(`[Voice] ✓ Sent voice note reply to ${jid}`);
          } else {
            // Fallback: send text reply if TTS fails
            await simulateTyping(sock, jid, textReply.length);
            await sock.sendMessage(jid, { text: textReply });
            console.log(`[Voice] ↩ TTS failed, sent text reply to ${jid}`);
          }

          if (db.MONGODB_URI) {
            await db.saveChatMessage(jid, "assistant", textReply);
          }
        } catch (err) {
          console.error("[Voice] ✗ Processing error:", err.message);
          await sock.sendMessage(jid, { text: "Something went wrong with that voice note 😈" });
        }
        continue;
      }

      // ══════════════════════════════════════════════════════════
      // LAYER 2 — 👁️ IMAGE: Download → Vision API → Persona Reply
      // ══════════════════════════════════════════════════════════
      if (imageMsg) {
        try {
          console.log(`[Vision] 📸 Image received from ${jid}`);
          await sock.sendPresenceUpdate("composing", jid);

          // ── Step 1: Try full image download (with decryption) ──
          let imageBuffer = null;
          let usingThumbnail = false;

          try {
            imageBuffer = await downloadMediaMessage(
              msg, "buffer", {},
              { logger, reuploadRequest: sock.updateMediaMessage }
            );
            if (imageBuffer && imageBuffer.length > 200) {
              console.log(`[Vision] ✓ Full image downloaded (${imageBuffer.length} bytes)`);
            } else {
              imageBuffer = null; // treat as failed
            }
          } catch (dlErr) {
            console.warn(`[Vision] Full download failed: ${dlErr.message}`);
          }

          // ── Step 2: Fallback to embedded jpegThumbnail ─────────
          // WhatsApp always embeds a small thumbnail in the message itself.
          // It's lower resolution but enough for Vision to understand the image.
          if (!imageBuffer) {
            const thumb = imageMsg.jpegThumbnail;
            if (thumb && thumb.length > 100) {
              imageBuffer = Buffer.isBuffer(thumb) ? thumb : Buffer.from(thumb);
              usingThumbnail = true;
              console.log(`[Vision] ⚡ Using embedded thumbnail fallback (${imageBuffer.length} bytes)`);
            }
          }

          // ── Step 3: If we have no image data at all, bail ──────
          if (!imageBuffer || imageBuffer.length < 100) {
            const noImg = {
              girl:  "arre image load nahi hua 😅",
              boy:   "bhai image nahi aai yaar 😅",
              devil: "Couldn't load that image 😈 try again!",
            }[contactMode] || "Image load failed, please resend!";
            await simulateTyping(sock, jid, noImg.length);
            await sock.sendMessage(jid, { text: noImg });
            continue;
          }

          const caption = (imageMsg.caption || "").trim();
          const mimeType = usingThumbnail ? "image/jpeg" : (imageMsg.mimetype || "image/jpeg");

          // Log image event in conversation history
          if (db.MONGODB_URI) {
            const histEntry = caption
              ? `[Image: "${caption}"]`
              : "[Image sent]";
            await db.saveChatMessage(jid, "user", histEntry);
            chatHistory = await db.getChatHistory(jid, 12);
          }

          // Analyze with GPT-4o Vision in the active persona
          console.log(`[Vision] Sending to Vision API: ${imageBuffer.length} bytes, mime=${mimeType}, thumbnail=${usingThumbnail}`);
          const imageReply = await analyzeImageContent(
            imageBuffer,
            mimeType,
            contactMode,
            chatHistory,
            caption
          );

          // Persona-specific fallbacks if vision fails
          const finalReply = imageReply || ({
            girl:  "arre ye kya bheja 😅",
            boy:   "bhai ye kya bheja tu 😂",
            devil: "Interesting image! 😈",
          }[contactMode] || "👀");

          await simulateTyping(sock, jid, finalReply.length);
          await sock.sendMessage(jid, { text: finalReply });

          if (db.MONGODB_URI) {
            await db.saveChatMessage(jid, "assistant", finalReply);
          }
          console.log(`[Vision] ✓ Sent image reply to ${jid}`);
        } catch (err) {
          console.error("[Vision] ✗ Processing error:", err.message);
          await sock.sendMessage(jid, { text: "Something went wrong with that image 😈" });
        }
        continue;
      }

      // ══════════════════════════════════════════════════════════
      // LAYER 3 — 💬 TEXT: Persona Reply with Typing Simulation
      // ══════════════════════════════════════════════════════════
      if (!textMsg) continue;

      try {
        if (db.MONGODB_URI) {
          await db.saveChatMessage(jid, "user", textMsg);
        }

        // ══════════════════════════════════════════════════════════
        // DON AWAY MODE — "Don abhi kaam pe hai 😈"
        // ══════════════════════════════════════════════════════════
        const isDonAway = db.MONGODB_URI ? await db.getDonAwayMode() : false;
        if (isDonAway) {
          const hasOptedIn = contact && contact.donAwayOptIn === true;
          if (!hasOptedIn) {
            const userOptedIn = isDonAwayOptInReply(textMsg);
            if (userOptedIn) {
              if (db.MONGODB_URI) {
                await db.setContactDonAwayOptIn(jid, true);
                await db.setContactDonAwayNoticeSent(jid, false);
                await db.saveChatMessage(jid, "assistant", "[Don Away AI Opt-in confirmed]");
              }
              const confirmMsg = "*AI Companion activated! 🤖*\nTalk to me until Don is back online.";
              await simulateTyping(sock, jid, confirmMsg.length);
              await sock.sendMessage(jid, { text: confirmMsg });
              console.log(`[DonAway] ${jid} opted into AI mode while Don is away`);
              if (contact) {
                contact.donAwayOptIn = true;
                contact.donAwayNoticeSent = false;
              }
            } else {
              // Send Don Away text + voice note + prompt ONLY 1 TIME per 20-min session
              const noticeAlreadySent = contact && contact.donAwayNoticeSent === true;
              if (!noticeAlreadySent) {
                await sendDonAwayNotice(sock, jid);
                if (db.MONGODB_URI) {
                  await db.setContactDonAwayNoticeSent(jid, true);
                  await db.saveChatMessage(jid, "assistant", "[Don Away Notice Sent]");
                }
                if (contact) contact.donAwayNoticeSent = true;
              } else {
                console.log(`[DonAway] Don Away notice already sent to ${jid} once in this active session, skipping repeat notice.`);
              }
              continue; // Stop further AI processing until they opt in
            }
          }
        }

        // ══════════════════════════════════════════════════════════
        // STOP / OPT-OUT KEYWORD INTERCEPTOR ("STOP", "PAUSE", "OFF", "UNSUBSCRIBE")
        // ══════════════════════════════════════════════════════════
        const cleanLower = textMsg.trim().toLowerCase();
        const isStopCommand = ["stop", "stop ai", "pause", "pause ai", "off", "unsubscribe", "optout", "cancel"].includes(cleanLower);
        const isStartCommand = ["start", "start ai", "resume", "resume ai", "on", "menu"].includes(cleanLower);

        if (isStopCommand) {
          if (db.MONGODB_URI) {
            await db.setContactMode(jid, "off");
            const d = await db.getDb();
            await d.collection("contacts").updateOne({ jid }, { $set: { pendingModeSelection: false } });
            await db.saveChatMessage(jid, "user", textMsg);
            await db.saveChatMessage(jid, "assistant", "[AI Auto-Reply Paused via STOP command]");
          }
          const stopReply = "⏸️ *AI Auto-Reply Paused*\nDevil AI has been turned OFF for your chat.\n\n💡 _Type *START* or *MENU* anytime to re-enable AI!_";
          await simulateTyping(sock, jid, stopReply.length);
          await sock.sendMessage(jid, { text: stopReply });
          console.log(`[OptOut] ⏸️ ${jid} sent STOP command. AI mode set to OFF.`);
          continue;
        }

        if (isStartCommand) {
          if (db.MONGODB_URI) {
            await db.setContactMode(jid, "devil");
            const d = await db.getDb();
            await d.collection("contacts").updateOne({ jid }, { $set: { pendingModeSelection: true } });
            await db.saveChatMessage(jid, "user", textMsg);
          }
          const startReply = "▶️ *AI Auto-Reply Re-Enabled!*";
          await simulateTyping(sock, jid, startReply.length);
          await sock.sendMessage(jid, { text: startReply });
          await sendModeSelectionMessage(sock, jid, msg.pushName || "");
          console.log(`[OptOut] ▶️ ${jid} sent START command. Re-sent persona menu.`);
          continue;
        }

        // If contact is set to "off" (paused), skip AI reply completely!
        if (contactMode === "off") {
          console.log(`[AI Skipped] ${jid} AI mode is OFF (paused).`);
          continue;
        }

        // ══════════════════════════════════════════════════════════
        // PERSONA PICKER — intercept before normal AI pipeline
        // New users (pendingModeSelection === true) see a numbered menu.
        // They reply 1/2/3 (or a keyword) to choose their companion.
        // ══════════════════════════════════════════════════════════
        if (contact.pendingModeSelection) {
          const chosen = parsePersonaChoice(textMsg);

          if (chosen) {
            // ✅ Valid choice — lock in mode and send persona welcome
            if (db.MONGODB_URI) {
              await db.markModeSelected(jid, chosen);
              await db.saveChatMessage(jid, "assistant", `[Mode selected: ${chosen}]`);
            }
            contactMode = chosen;
            await sendPersonaWelcome(sock, jid, chosen);
            console.log(`[Picker] ✓ ${jid} chose: ${chosen}`);
          } else {
            // ❌ Invalid reply — re-send the selection menu
            await sendModeSelectionMessage(sock, jid, msg.pushName || "");
            console.log(`[Picker] Invalid reply "${textMsg.slice(0,20)}", re-sent menu to ${jid}`);
          }
          continue; // Skip normal AI pipeline until mode is set
        }

        // ── Normal AI pipeline (mode already selected) ─────────────────
        const reply = await getReplyAsDhruv(textMsg, contactMode, chatHistory);

        // Layer 3 core: show typing indicator before every reply
        await simulateTyping(sock, jid, reply.length);
        await sock.sendMessage(jid, { text: reply || "👍" });

        // 🖼️ Media Auto-Attachment Trigger Check (PDF / Photo / Audio)
        try {
          const mediaMatch = await db.findMatchingMediaAsset(textMsg);
          if (mediaMatch) {
            const mediaType = (mediaMatch.mediaType || "document").toLowerCase();
            let source = null;
            if (mediaMatch.base64Data) {
              source = Buffer.from(mediaMatch.base64Data, "base64");
            } else if (mediaMatch.buffer) {
              source = mediaMatch.buffer;
            } else if (mediaMatch.fileUrl && mediaMatch.fileUrl.startsWith("http")) {
              source = { url: mediaMatch.fileUrl };
            }

            if (source) {
              let mediaPayload = {};
              if (mediaType === "image" || mediaType === "photo" || mediaType === "picture") {
                mediaPayload = { image: source, caption: `📎 ${mediaMatch.title}` };
              } else if (mediaType === "audio" || mediaType === "voice") {
                mediaPayload = { audio: source, mimetype: mediaMatch.mimeType || "audio/mp4", ptt: true };
              } else {
                mediaPayload = {
                  document: source,
                  mimetype: mediaMatch.mimeType || "application/pdf",
                  fileName: mediaMatch.filename || "attachment.pdf",
                  caption: `📎 ${mediaMatch.title}`,
                };
              }

              await sock.sendMessage(jid, mediaPayload);
              console.log(`[Media Auto-Trigger] ✓ Successfully sent ${mediaType} attachment "${mediaMatch.title}" to ${jid}`);
            } else {
              console.log(`[Media Auto-Trigger] ⚠️ Asset "${mediaMatch.title}" matched keyword but contains no file data.`);
            }
          }
        } catch (mErr) {
          console.error("[Media Auto-Trigger] Error sending media:", mErr.message);
        }

        if (db.MONGODB_URI) {
          await db.saveChatMessage(jid, "assistant", reply || "👍");
        }
      } catch (err) {
        console.error("[Baileys] Reply error:", err.message);
        await sock.sendMessage(jid, {
          text: "Something went wrong, try again in a bit. 😈",
        });
      }
    }
  });
}

// ── Helper: Sync contacts after login ──────────────────────
async function syncWhatsAppContacts(sock) {
  if (!db.MONGODB_URI) return;

  console.log("[Baileys] Syncing contacts...");

  try {
    const storeContacts = sock.store?.contacts || {};
    const list = Object.values(storeContacts)
      .filter((c) => c.id && !c.id.endsWith("@g.us") && c.id !== "status@broadcast")
      .map((c) => ({
        jid: c.id,
        name: c.name || c.notify || c.verifiedName || "",
      }));

    if (list.length > 0) {
      await db.bulkUpsertContacts(list);
      console.log(`[Baileys] Synced ${list.length} contacts from store`);
    } else {
      console.log("[Baileys] No contacts in store yet (will sync via events)");
    }
  } catch (err) {
    console.log("[Baileys] Store contacts not available, relying on events");
  }
}
// ─────────────────────────────────────────────────────────────────────────────

async function start() {
  server.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`Web app: ${url}`);
    open(url).catch(() => { });

    if (ENABLE_WHATSAPP) {
      startWhatsApp().catch((err) => {
        console.error("[Baileys] Failed to start WhatsApp:", err.message);
      });

      // ⏰ Background task: Check for contacts inactive > 20 mins every 2 minutes
      setInterval(() => {
        if (db.MONGODB_URI) {
          db.resetInactiveContacts(20).catch(() => {});
        }
      }, 2 * 60 * 1000);
    } else {
      console.log("WhatsApp client disabled (ENABLE_WHATSAPP=false)");
    }

    // Keep-alive mechanism (prevents serv00/Render from sleeping)
    if (KEEP_ALIVE_ENABLED) {
      console.log(`Keep-alive enabled: Pinging every ${KEEP_ALIVE_INTERVAL / 1000 / 60} minutes`);

      const pingHealth = () => {
        try {
          const pingUrl = new URL("/health", APP_URL);
          const options = {
            hostname: pingUrl.hostname,
            port: pingUrl.port || (pingUrl.protocol === "https:" ? 443 : 80),
            path: pingUrl.pathname,
            method: "GET",
            headers: { "User-Agent": "Keep-Alive-Agent" },
          };

          const protocol = pingUrl.protocol === "https:" ? require("https") : http;

          const req = protocol.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => { data += chunk; });
            res.on("end", () => {
              if (res.statusCode === 200) {
                try {
                  const jsonData = JSON.parse(data);
                  console.log(`[Keep-Alive] Ping successful at ${jsonData.timestamp || new Date().toISOString()}`);
                } catch {
                  console.log(`[Keep-Alive] Ping successful (status: ${res.statusCode})`);
                }
              } else {
                console.log(`[Keep-Alive] Ping failed: ${res.statusCode}`);
              }
            });
          });

          req.on("error", (error) => { console.error(`[Keep-Alive] Error: ${error.message}`); });
          req.setTimeout(10000, () => { req.destroy(); console.error("[Keep-Alive] Request timeout"); });
          req.end();
        } catch (error) {
          console.error(`[Keep-Alive] Error: ${error.message}`);
        }
      };

      pingHealth();
      setInterval(pingHealth, KEEP_ALIVE_INTERVAL);
      console.log(`[Keep-Alive] Will ping ${APP_URL}/health every ${KEEP_ALIVE_INTERVAL / 1000 / 60} minutes`);
    } else {
      console.log("[Keep-Alive] Disabled");
    }
  });
}

// ── Automated Drip Sequence Engine (Runs every 10 minutes) ───────────────────
setInterval(async () => {
  if (!isReady || !waSocket || !db.MONGODB_URI) return;
  try {
    const rules = await db.listDripRules();
    const activeRules = rules.filter((r) => r.enabled !== false);
    for (const rule of activeRules) {
      const dueContacts = await db.getContactsDueForDrip(rule.inactivityHours, rule.targetStage);
      for (const contact of dueContacts) {
        try {
          await simulateTyping(waSocket, contact.jid, rule.message.length);
          await waSocket.sendMessage(contact.jid, { text: rule.message });
          await db.saveChatMessage(contact.jid, "assistant", `[Drip Sequence]: ${rule.message}`);
          await db.markContactDripSent(contact.jid);
          console.log(`[Drip Engine] ✓ Sent follow-up "${rule.name}" to ${contact.jid}`);
        } catch (err) {
          console.error(`[Drip Engine] Failed to send to ${contact.jid}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error("[Drip Engine] Error:", err.message);
  }
}, 10 * 60 * 1000);

start().catch((err) => {
  console.error("Startup error:", err);
  process.exit(1);
});
