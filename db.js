/**
 * MongoDB connection and data access with logging.
 * Uses MONGODB_URI from .env
 */
require("dotenv").config();
const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI;
let DB_NAME = "open_truly_chat";

if (MONGODB_URI) {
  try {
    const url = new URL(MONGODB_URI);
    const dbPath = url.pathname.replace(/^\//, "");
    if (dbPath) DB_NAME = dbPath;
  } catch {
    // Fallback for mongodb+srv and other non-standard URIs
    const parts = MONGODB_URI.split("/");
    const lastPart = parts[parts.length - 1];
    const dbPath = lastPart ? lastPart.split("?")[0] : null;
    if (dbPath) DB_NAME = dbPath;
  }
}

const CHATS_COLLECTION = "chats";
const CONTACTS_COLLECTION = "contacts";
const MESSAGE_HISTORY_COLLECTION = "message_history";
const SETTINGS_COLLECTION = "settings";
const USERS_COLLECTION = "users";
const ANALYTICS_COLLECTION = "analytics";
const BROADCASTS_COLLECTION = "broadcasts";
const CUSTOM_PERSONAS_COLLECTION = "custom_personas";
const MEDIA_ASSETS_COLLECTION = "media_assets";
const DRIP_RULES_COLLECTION = "drip_rules";

const LOG_PREFIX = "[Mongo]";

function log(op, collection, detail = "") {
  console.log(`${LOG_PREFIX} ${op} → ${collection}${detail ? ` ${detail}` : ""}`);
}

let client = null;
let db = null;
let indexesCreated = false;

/**
 * Get a connected MongoDB database instance (singleton)
 */
async function getDb() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI not set in .env");
  }

  if (db) return db;

  client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  });

  await client.connect();
  db = client.db(DB_NAME);
  log("connected", "db", DB_NAME);

  // Create indexes only once
  if (!indexesCreated) {
    await ensureIndexes();
    indexesCreated = true;
  }

  return db;
}

/**
 * Create useful indexes for performance
 */
async function ensureIndexes() {
  try {
    const d = db;

    // Chats: prioritize closest person + upload order
    await d.collection(CHATS_COLLECTION).createIndex(
      { isClosest: -1, uploadedAt: 1 },
      { name: "closest_upload" }
    );

    // Contacts: fast lookup by jid
    await d.collection(CONTACTS_COLLECTION).createIndex(
      { jid: 1 },
      { unique: true, name: "jid_unique" }
    );

    // Message history: fast per-contact history + cleanup
    await d.collection(MESSAGE_HISTORY_COLLECTION).createIndex(
      { jid: 1, timestamp: -1 },
      { name: "jid_timestamp" }
    );

    // Users: unique username index
    await d.collection(USERS_COLLECTION).createIndex(
      { username: 1 },
      { unique: true, name: "username_unique" }
    );

    // Analytics: date index
    await d.collection(ANALYTICS_COLLECTION).createIndex(
      { date: 1 },
      { unique: true, name: "date_unique" }
    );

    log("indexes", "created");
  } catch (err) {
    // Index already exists is fine
    if (!err.message?.includes("already exists")) {
      console.error(`${LOG_PREFIX} index creation warning:`, err.message);
    }
  }
}

// ── Chat reference helpers ───────────────────────────────────────────────────

async function listChats() {
  const d = await getDb();
  const docs = await d
    .collection(CHATS_COLLECTION)
    .find({})
    .sort({ isClosest: -1, uploadedAt: -1 })
    .toArray();

  log("find", CHATS_COLLECTION, `count=${docs.length}`);
  return docs.map((doc) => ({
    filename: doc.filename,
    isClosest: !!doc.isClosest,
    docType: doc.docType || (doc.filename?.endsWith(".pdf") ? "pdf" : doc.filename?.startsWith("http") ? "url" : "txt"),
    uploadedAt: doc.uploadedAt,
  }));
}

async function insertChat(filename, content, isClosest = false, docType = "txt") {
  if (!filename || !content) {
    throw new Error("filename and content are required");
  }

  const d = await getDb();
  const col = d.collection(CHATS_COLLECTION);

  if (isClosest) {
    await col.updateMany({ isClosest: true }, { $set: { isClosest: false } });
    log("updateMany", CHATS_COLLECTION, "cleared isClosest from others");
  }

  const doc = {
    filename,
    content,
    isClosest: !!isClosest,
    docType: docType || "txt",
    uploadedAt: new Date(),
  };

  await col.insertOne(doc);
  log("insertOne", CHATS_COLLECTION, `filename=${filename} type=${docType}`);
  return doc;
}

// ── Custom Persona Helpers ───────────────────────────────────────────────────

async function listCustomPersonas() {
  const d = await getDb();
  const docs = await d.collection(CUSTOM_PERSONAS_COLLECTION).find({}).sort({ createdAt: 1 }).toArray();
  log("listCustomPersonas", CUSTOM_PERSONAS_COLLECTION, `count=${docs.length}`);
  return docs;
}

async function getCustomPersona(key) {
  if (!key) return null;
  const d = await getDb();
  return await d.collection(CUSTOM_PERSONAS_COLLECTION).findOne({ key: String(key).toLowerCase() });
}

async function saveCustomPersona({ key, name, emoji, description, systemPrompt, temperature }) {
  if (!name || !systemPrompt) {
    throw new Error("Persona name and system prompt are required.");
  }
  const cleanKey = (key || name.toLowerCase().replace(/[^a-z0-9]/g, "_")).slice(0, 30);
  const d = await getDb();
  const doc = {
    key: cleanKey,
    name: name.trim(),
    emoji: emoji || "🤖",
    description: (description || "").trim(),
    systemPrompt: systemPrompt.trim(),
    temperature: typeof temperature === "number" ? Math.min(1.0, Math.max(0.1, temperature)) : 0.7,
    updatedAt: new Date(),
  };

  await d.collection(CUSTOM_PERSONAS_COLLECTION).updateOne(
    { key: cleanKey },
    { $set: doc, $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );

  log("saveCustomPersona", CUSTOM_PERSONAS_COLLECTION, `key=${cleanKey}`);
  return doc;
}

async function deleteCustomPersona(key) {
  if (!key) return;
  const d = await getDb();
  await d.collection(CUSTOM_PERSONAS_COLLECTION).deleteOne({ key: String(key).toLowerCase() });
  log("deleteCustomPersona", CUSTOM_PERSONAS_COLLECTION, `key=${key}`);
}

// ── CRM Pipeline & Lead Stage Helpers ─────────────────────────────────────────

async function updateContactLeadStage(jid, leadStage) {
  if (!jid) return;
  const d = await getDb();
  const validStages = ["inquiry", "hot_lead", "high_value", "deal_closed", "lost"];
  const stage = validStages.includes(leadStage) ? leadStage : "inquiry";
  await d.collection(CONTACTS_COLLECTION).updateOne(
    { jid },
    { $set: { leadStage: stage, updatedAt: new Date() } }
  );
  log("updateContactLeadStage", CONTACTS_COLLECTION, `jid=${jid} stage=${stage}`);
}

async function updateContactNotes(jid, notes) {
  if (!jid) return;
  const d = await getDb();
  await d.collection(CONTACTS_COLLECTION).updateOne(
    { jid },
    { $set: { notes: String(notes || "").trim(), updatedAt: new Date() } }
  );
}

// ── Media Assets & Auto-Trigger Helpers ───────────────────────────────────────

async function listMediaAssets() {
  const d = await getDb();
  const docs = await d.collection(MEDIA_ASSETS_COLLECTION).find({}).sort({ createdAt: -1 }).toArray();
  log("listMediaAssets", MEDIA_ASSETS_COLLECTION, `count=${docs.length}`);
  return docs;
}

async function saveMediaAsset({ title, mediaType, mimeType, fileUrl, filename, keywords, buffer }) {
  if (!title) {
    throw new Error("Title is required.");
  }
  const d = await getDb();
  const kwList = Array.isArray(keywords)
    ? keywords
    : String(keywords || "")
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);

  const base64Data = buffer ? buffer.toString("base64") : "";

  const doc = {
    title: title.trim(),
    mediaType: mediaType || "document",
    mimeType: mimeType || "application/pdf",
    fileUrl: fileUrl || "",
    filename: filename || "attachment",
    base64Data,
    keywords: kwList,
    createdAt: new Date(),
  };

  const res = await d.collection(MEDIA_ASSETS_COLLECTION).insertOne(doc);
  log("saveMediaAsset", MEDIA_ASSETS_COLLECTION, `id=${res.insertedId}`);
  return { id: res.insertedId, title: doc.title, mediaType: doc.mediaType, filename: doc.filename, keywords: doc.keywords };
}

async function deleteMediaAsset(id) {
  if (!id) return;
  const { ObjectId } = require("mongodb");
  const d = await getDb();
  const query = typeof id === "string" && id.length === 24 ? { _id: new ObjectId(id) } : { _id: id };
  await d.collection(MEDIA_ASSETS_COLLECTION).deleteOne(query);
  log("deleteMediaAsset", MEDIA_ASSETS_COLLECTION, `id=${id}`);
}

async function findMatchingMediaAsset(userText) {
  if (!userText || typeof userText !== "string") return null;
  const text = userText.toLowerCase().trim();
  const assets = await listMediaAssets();
  for (const asset of assets) {
    if (Array.isArray(asset.keywords)) {
      for (const rawKw of asset.keywords) {
        const kw = String(rawKw || "").trim().toLowerCase();
        if (kw && (text === kw || text.includes(kw) || (kw.length >= 3 && text.includes(kw)))) {
          return asset;
        }
      }
    }
  }
  return null;
}

// ── Automated Drip & Follow-up Helpers ────────────────────────────────────────

async function listDripRules() {
  const d = await getDb();
  const docs = await d.collection(DRIP_RULES_COLLECTION).find({}).sort({ createdAt: -1 }).toArray();
  log("listDripRules", DRIP_RULES_COLLECTION, `count=${docs.length}`);
  return docs;
}

async function saveDripRule({ name, inactivityHours, targetStage, message, enabled }) {
  if (!name || !message) {
    throw new Error("Rule name and message are required.");
  }
  const d = await getDb();
  const doc = {
    name: name.trim(),
    inactivityHours: Number(inactivityHours || 24),
    targetStage: targetStage || "all",
    message: message.trim(),
    enabled: enabled !== false,
    updatedAt: new Date(),
  };

  await d.collection(DRIP_RULES_COLLECTION).insertOne(doc);
  log("saveDripRule", DRIP_RULES_COLLECTION, `name=${doc.name}`);
  return doc;
}

async function deleteDripRule(id) {
  if (!id) return;
  const { ObjectId } = require("mongodb");
  const d = await getDb();
  const query = typeof id === "string" && id.length === 24 ? { _id: new ObjectId(id) } : { _id: id };
  await d.collection(DRIP_RULES_COLLECTION).deleteOne(query);
}

async function getContactsDueForDrip(inactivityHours, targetStage = "all") {
  const d = await getDb();
  const cutoff = new Date(Date.now() - inactivityHours * 60 * 60 * 1000);
  const query = {
    lastActive: { $lt: cutoff },
    dripSent: { $ne: true },
    mode: { $ne: "off" },
  };
  if (targetStage !== "all") {
    query.leadStage = targetStage;
  }
  const contacts = await d.collection(CONTACTS_COLLECTION).find(query).toArray();
  return contacts;
}

async function markContactDripSent(jid) {
  if (!jid) return;
  const d = await getDb();
  await d.collection(CONTACTS_COLLECTION).updateOne(
    { jid },
    { $set: { dripSent: true, lastDripAt: new Date() } }
  );
}

async function getChatsForAI() {
  const d = await getDb();
  const docs = await d
    .collection(CHATS_COLLECTION)
    .find({})
    .sort({ isClosest: -1, uploadedAt: 1 })
    .toArray();

  log("find", CHATS_COLLECTION, `AI context count=${docs.length}`);
  return docs;
}

async function hasChats() {
  const d = await getDb();
  const count = await d.collection(CHATS_COLLECTION).countDocuments({});
  log("countDocuments", CHATS_COLLECTION, `hasChats=${count > 0}`);
  return count > 0;
}

async function hasClosestPerson() {
  const d = await getDb();
  const count = await d.collection(CHATS_COLLECTION).countDocuments({ isClosest: true });
  log("countDocuments", CHATS_COLLECTION, `hasClosestPerson=${count > 0}`);
  return count > 0;
}

// ── Contact settings helpers ─────────────────────────────────────────────────

async function getContact(jid) {
  if (!jid) throw new Error("jid is required");

  const d = await getDb();
  let contact = await d.collection(CONTACTS_COLLECTION).findOne({ jid });

  if (!contact) {
    // Default object for brand-new contacts
    contact = {
      jid,
      name: "",
      mode: "devil",
      lastActive: new Date(),
      greeted: false,
      pendingModeSelection: true,
      donAwayNoticeSent: false,
    };
  }

  return contact;
}

async function upsertContact(jid, name = "") {
  if (!jid) return;

  const d = await getDb();
  const update = {
    $set: {
      lastActive: new Date(),
    },
    $setOnInsert: {
      mode: "devil",
      greeted: false,
      pendingModeSelection: true,   // Show persona picker to new users
    },
  };

  if (name) {
    update.$set.name = name;
  }

  await d.collection(CONTACTS_COLLECTION).updateOne(
    { jid },
    update,
    { upsert: true }
  );
}

async function bulkUpsertContacts(contacts = []) {
  if (!Array.isArray(contacts) || contacts.length === 0) return;

  const d = await getDb();
  const ops = contacts
    .filter((c) => c.jid)
    .map((c) => ({
      updateOne: {
        filter: { jid: c.jid },
        update: {
          $set: {
            name: c.name || "",
            lastActive: new Date(),
          },
          $setOnInsert: {
            mode: "devil",
            greeted: false,
            pendingModeSelection: true,
          },
        },
        upsert: true,
      },
    }));

  if (ops.length === 0) return;

  const result = await d.collection(CONTACTS_COLLECTION).bulkWrite(ops);
  log("bulkUpsertContacts", CONTACTS_COLLECTION, `upserted=${result.upsertedCount} modified=${result.modifiedCount}`);
}

async function saveContactMessage(jid, name) {
  // Keep old function working (calls upsert)
  await upsertContact(jid, name);
}

async function setContactMode(jid, mode) {
  if (!jid) throw new Error("jid is required");
  if (!["boy", "girl", "devil", "off"].includes(mode)) {
    throw new Error("Invalid contact mode: must be 'boy', 'girl', 'devil' or 'off'");
  }

  const d = await getDb();
  await d.collection(CONTACTS_COLLECTION).updateOne(
    { jid },
    {
      $set: {
        mode,
        lastActive: new Date(),
      },
    },
    { upsert: true }
  );

  log("setContactMode", CONTACTS_COLLECTION, `jid=${jid} mode=${mode}`);
}

async function markContactGreeted(jid) {
  if (!jid) return;
  const d = await getDb();
  await d.collection(CONTACTS_COLLECTION).updateOne(
    { jid },
    { $set: { greeted: true, lastActive: new Date() } },
    { upsert: true }
  );
  log("markContactGreeted", CONTACTS_COLLECTION, `jid=${jid}`);
}

/**
 * Confirm a user's persona selection: set their mode, clear the pending flag,
 * and mark them as greeted so they won't see the picker again.
 * @param {string} jid
 * @param {"devil"|"boy"|"girl"} mode
 */
async function markModeSelected(jid, mode) {
  if (!jid) return;
  const d = await getDb();
  await d.collection(CONTACTS_COLLECTION).updateOne(
    { jid },
    {
      $set: {
        mode,
        greeted: true,
        pendingModeSelection: false,
        lastActive: new Date(),
      },
    },
    { upsert: true }
  );
  log("markModeSelected", CONTACTS_COLLECTION, `jid=${jid} mode=${mode}`);
}

// ── Don Away Mode Settings ───────────────────────────────────────────────────

async function getDonAwayMode() {
  try {
    const d = await getDb();
    const doc = await d.collection(SETTINGS_COLLECTION).findOne({ key: "donAwayMode" });
    return doc ? !!doc.value : false;
  } catch (err) {
    console.error(`${LOG_PREFIX} getDonAwayMode error:`, err.message);
    return false;
  }
}

async function setDonAwayMode(enabled) {
  try {
    const d = await getDb();
    await d.collection(SETTINGS_COLLECTION).updateOne(
      { key: "donAwayMode" },
      { $set: { value: !!enabled, updatedAt: new Date() } },
      { upsert: true }
    );
    if (!enabled) {
      // When Don comes back online, reset all contact opt-ins so next time Don is away, they get prompted again
      await resetAllDonAwayOptIns();
    }
    log("setDonAwayMode", SETTINGS_COLLECTION, `enabled=${enabled}`);
    return true;
  } catch (err) {
    console.error(`${LOG_PREFIX} setDonAwayMode error:`, err.message);
    return false;
  }
}

async function setContactDonAwayOptIn(jid, optIn = true) {
  if (!jid) return;
  try {
    const d = await getDb();
    await d.collection(CONTACTS_COLLECTION).updateOne(
      { jid },
      { $set: { donAwayOptIn: !!optIn, lastActive: new Date() } },
      { upsert: true }
    );
    log("setContactDonAwayOptIn", CONTACTS_COLLECTION, `jid=${jid} optIn=${optIn}`);
  } catch (err) {
    console.error(`${LOG_PREFIX} setContactDonAwayOptIn error:`, err.message);
  }
}

async function setContactDonAwayNoticeSent(jid, sent = true) {
  if (!jid) return;
  try {
    const d = await getDb();
    await d.collection(CONTACTS_COLLECTION).updateOne(
      { jid },
      { $set: { donAwayNoticeSent: !!sent, lastActive: new Date() } },
      { upsert: true }
    );
    log("setContactDonAwayNoticeSent", CONTACTS_COLLECTION, `jid=${jid} sent=${sent}`);
  } catch (err) {
    console.error(`${LOG_PREFIX} setContactDonAwayNoticeSent error:`, err.message);
  }
}

async function resetAllDonAwayOptIns() {
  try {
    const d = await getDb();
    await d.collection(CONTACTS_COLLECTION).updateMany(
      {},
      { $set: { donAwayOptIn: false, donAwayNoticeSent: false } }
    );
    log("resetAllDonAwayOptIns", CONTACTS_COLLECTION, "all optIns and notices cleared");
  } catch (err) {
    console.error(`${LOG_PREFIX} resetAllDonAwayOptIns error:`, err.message);
  }
}

// ── Contact & Chat Deletion ──────────────────────────────────────────────────

async function deleteContact(jid) {
  if (!jid) return;
  const d = await getDb();
  await d.collection(CONTACTS_COLLECTION).deleteOne({ jid });
  await d.collection(MESSAGE_HISTORY_COLLECTION).deleteMany({ jid });
  log("deleteContact", CONTACTS_COLLECTION, `jid=${jid}`);
}

async function deleteAllContacts() {
  const d = await getDb();
  const res1 = await d.collection(CONTACTS_COLLECTION).deleteMany({});
  const res2 = await d.collection(MESSAGE_HISTORY_COLLECTION).deleteMany({});
  log("deleteAllContacts", CONTACTS_COLLECTION, `deleted=${res1.deletedCount} historyDeleted=${res2.deletedCount}`);
  return { contactsDeleted: res1.deletedCount, historyDeleted: res2.deletedCount };
}

async function deleteAllMessageHistory() {
  const d = await getDb();
  const res = await d.collection(MESSAGE_HISTORY_COLLECTION).deleteMany({});
  log("deleteAllMessageHistory", MESSAGE_HISTORY_COLLECTION, `deleted=${res.deletedCount}`);
  return { deletedCount: res.deletedCount };
}

async function resetInactiveContacts(minutes = 20) {
  try {
    const d = await getDb();
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    const res = await d.collection(CONTACTS_COLLECTION).updateMany(
      { lastActive: { $lt: cutoff } },
      {
        $set: {
          donAwayOptIn: false,
          donAwayNoticeSent: false,
          pendingModeSelection: true,
          mode: "devil",
        },
      }
    );
    if (res.modifiedCount > 0) {
      log("resetInactiveContacts", CONTACTS_COLLECTION, `reset ${res.modifiedCount} contacts inactive for >${minutes}m`);
    }
    return res.modifiedCount;
  } catch (err) {
    console.error(`${LOG_PREFIX} resetInactiveContacts error:`, err.message);
    return 0;
  }
}

// ── Broadcast Campaign Helpers ────────────────────────────────────────────────

async function saveBroadcastCampaign({ title, message, recipientsCount, delayMs }) {
  const d = await getDb();
  const doc = {
    title: title || "Broadcast Campaign",
    message,
    totalRecipients: recipientsCount || 0,
    sentCount: 0,
    status: "pending",
    delayMs: delayMs || 3000,
    createdAt: new Date(),
  };
  const res = await d.collection(BROADCASTS_COLLECTION).insertOne(doc);
  log("saveBroadcastCampaign", BROADCASTS_COLLECTION, `id=${res.insertedId}`);
  return { id: res.insertedId, ...doc };
}

async function updateBroadcastProgress(id, { sentCount, status, error }) {
  if (!id) return;
  const d = await getDb();
  const { ObjectId } = require("mongodb");
  const update = { $set: { updatedAt: new Date() } };
  if (sentCount !== undefined) update.$set.sentCount = sentCount;
  if (status) update.$set.status = status;
  if (error) update.$set.error = error;
  if (status === "completed" || status === "failed") update.$set.completedAt = new Date();

  const query = typeof id === "string" ? { _id: new ObjectId(id) } : { _id: id };
  await d.collection(BROADCASTS_COLLECTION).updateOne(query, update);
}

async function listBroadcasts(limit = 20) {
  const d = await getDb();
  const docs = await d
    .collection(BROADCASTS_COLLECTION)
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  log("listBroadcasts", BROADCASTS_COLLECTION, `count=${docs.length}`);
  return docs;
}

async function deleteChatFile(filename) {
  if (!filename) return;
  const d = await getDb();
  await d.collection(CHATS_COLLECTION).deleteOne({ filename });
  log("deleteChatFile", CHATS_COLLECTION, `filename=${filename}`);
}

// ── Users Collection & Multi-Tenant Helpers ─────────────────────────────────

async function createUser({ username, passwordHash, role = "user", apiKey = "" }) {
  if (!username || !passwordHash) throw new Error("Username and passwordHash required");
  const d = await getDb();
  const existing = await d.collection(USERS_COLLECTION).findOne({ username });
  if (existing) throw new Error("Username already taken");

  const newUser = {
    username,
    passwordHash,
    role,
    userApiKey: apiKey,
    donAwayMode: false,
    disabled: false,
    createdAt: new Date(),
    lastActive: new Date(),
    messagesToday: 0,
    apiCallsToday: 0,
  };

  await d.collection(USERS_COLLECTION).insertOne(newUser);
  log("createUser", USERS_COLLECTION, `username=${username} role=${role}`);
  return newUser;
}

async function getUserByUsername(username) {
  if (!username) return null;
  const d = await getDb();
  return await d.collection(USERS_COLLECTION).findOne({ username });
}

async function updateUserApiKey(username, apiKey) {
  if (!username) return;
  const d = await getDb();
  await d.collection(USERS_COLLECTION).updateOne(
    { username },
    { $set: { userApiKey: apiKey, lastActive: new Date() } }
  );
  log("updateUserApiKey", USERS_COLLECTION, `username=${username}`);
}

async function listAllUsers() {
  const d = await getDb();
  return await d
    .collection(USERS_COLLECTION)
    .find({}, { projection: { passwordHash: 0 } })
    .sort({ createdAt: -1 })
    .toArray();
}

async function deleteUser(username) {
  if (!username) return;
  const d = await getDb();
  await d.collection(USERS_COLLECTION).deleteOne({ username });
  log("deleteUser", USERS_COLLECTION, `username=${username}`);
}

async function toggleUserDisabled(username, disabled) {
  if (!username) return;
  const d = await getDb();
  await d.collection(USERS_COLLECTION).updateOne(
    { username },
    { $set: { disabled: !!disabled } }
  );
  log("toggleUserDisabled", USERS_COLLECTION, `username=${username} disabled=${disabled}`);
}

// ── Analytics & Traffic Counters ──────────────────────────────────────────────

async function trackActivity(username = "admin", type = "message") {
  try {
    const d = await getDb();
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const field = type === "apiCall" ? "apiCalls" : "messages";

    // Global daily aggregate
    await d.collection(ANALYTICS_COLLECTION).updateOne(
      { date: todayStr },
      { $inc: { [field]: 1 }, $set: { updatedAt: new Date() } },
      { upsert: true }
    );

    // User-level counter
    if (username) {
      const userField = type === "apiCall" ? "apiCallsToday" : "messagesToday";
      await d.collection(USERS_COLLECTION).updateOne(
        { username },
        { $inc: { [userField]: 1 }, $set: { lastActive: new Date() } }
      );
    }
  } catch (err) {
    console.error(`${LOG_PREFIX} trackActivity error:`, err.message);
  }
}

async function getAnalyticsOverview() {
  try {
    const d = await getDb();
    const todayStr = new Date().toISOString().split("T")[0];

    const todayDoc = await d.collection(ANALYTICS_COLLECTION).findOne({ date: todayStr });
    const totalContacts = await d.collection(CONTACTS_COLLECTION).countDocuments({});
    const totalUsers = await d.collection(USERS_COLLECTION).countDocuments({});
    const usersList = await d
      .collection(USERS_COLLECTION)
      .find({}, { projection: { passwordHash: 0 } })
      .sort({ lastActive: -1 })
      .toArray();

    return {
      messagesToday: todayDoc ? todayDoc.messages || 0 : 0,
      apiCallsToday: todayDoc ? todayDoc.apiCalls || 0 : 0,
      totalContacts,
      totalUsers,
      users: usersList,
    };
  } catch (err) {
    console.error(`${LOG_PREFIX} getAnalyticsOverview error:`, err.message);
    return { messagesToday: 0, apiCallsToday: 0, totalContacts: 0, totalUsers: 0, users: [] };
  }
}

async function listContacts() {
  const d = await getDb();
  const docs = await d
    .collection(CONTACTS_COLLECTION)
    .find({})
    .sort({ lastActive: -1 })
    .toArray();

  log("listContacts", CONTACTS_COLLECTION, `count=${docs.length}`);
  return docs;
}

// ── Message history helpers ──────────────────────────────────────────────────

async function saveChatMessage(jid, role, body) {
  if (!jid || !body || !role) return;
  if (role !== "user" && role !== "assistant") {
    throw new Error('role must be "user" or "assistant"');
  }

  const d = await getDb();
  await d.collection(MESSAGE_HISTORY_COLLECTION).insertOne({
    jid,
    role,
    body: String(body).trim(),
    timestamp: new Date(),
  });

  log("saveChatMessage", MESSAGE_HISTORY_COLLECTION, `jid=${jid} role=${role}`);
}

/**
 * Get recent chat history for a contact (oldest → newest)
 * @param {string} jid
 * @param {number} limit - how many messages to return (default 12)
 */
async function getChatHistory(jid, limit = 12) {
  if (!jid) return [];

  const d = await getDb();
  const docs = await d
    .collection(MESSAGE_HISTORY_COLLECTION)
    .find({ jid })
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();

  // Return in chronological order (oldest first)
  const history = docs.reverse();
  log("getChatHistory", MESSAGE_HISTORY_COLLECTION, `jid=${jid} count=${history.length}`);
  return history;
}

/**
 * Optional: keep only the last N messages per contact
 * Call this occasionally if you want to prevent DB growth
 */
async function trimChatHistory(jid, keepLast = 50) {
  if (!jid) return;

  const d = await getDb();
  const col = d.collection(MESSAGE_HISTORY_COLLECTION);

  const docs = await col
    .find({ jid })
    .sort({ timestamp: -1 })
    .skip(keepLast)
    .project({ _id: 1 })
    .toArray();

  if (docs.length === 0) return;

  const ids = docs.map((doc) => doc._id);
  const result = await col.deleteMany({ _id: { $in: ids } });
  log("trimChatHistory", MESSAGE_HISTORY_COLLECTION, `jid=${jid} deleted=${result.deletedCount}`);
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

async function close() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    indexesCreated = false;
    log("closed", "db");
  }
}

module.exports = {
  getDb,
  listChats,
  insertChat,
  getChatsForAI,
  hasChats,
  hasClosestPerson,
  close,
  getContact,
  upsertContact,
  bulkUpsertContacts,
  saveContactMessage,
  setContactMode,
  markContactGreeted,
  markModeSelected,
  getDonAwayMode,
  setDonAwayMode,
  setContactDonAwayOptIn,
  setContactDonAwayNoticeSent,
  resetAllDonAwayOptIns,
  deleteContact,
  deleteAllContacts,
  deleteAllMessageHistory,
  resetInactiveContacts,
  deleteChatFile,
  createUser,
  getUserByUsername,
  updateUserApiKey,
  listAllUsers,
  deleteUser,
  toggleUserDisabled,
  trackActivity,
  getAnalyticsOverview,
  listContacts,
  saveChatMessage,
  getChatHistory,
  trimChatHistory,
  saveBroadcastCampaign,
  updateBroadcastProgress,
  listBroadcasts,
  listCustomPersonas,
  getCustomPersona,
  saveCustomPersona,
  deleteCustomPersona,
  updateContactLeadStage,
  updateContactNotes,
  listMediaAssets,
  saveMediaAsset,
  deleteMediaAsset,
  findMatchingMediaAsset,
  listDripRules,
  saveDripRule,
  deleteDripRule,
  getContactsDueForDrip,
  markContactDripSent,
  MONGODB_URI,
};
