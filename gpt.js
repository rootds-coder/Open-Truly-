const OpenAI = require("openai");
const { toFile } = require("openai");
require("dotenv").config();
const db = require("./db");

let runtimeApiKey = null;

function setRuntimeApiKey(key) {
  runtimeApiKey = key ? String(key).trim() : null;
}

function getApiKey() {
  return runtimeApiKey || process.env.OPENAI_API_KEY;
}

/**
 * Build a configured OpenAI client from the current API key.
 * Supports both direct OpenAI and OpenRouter keys.
 * @returns {{ client: OpenAI, isOpenRouter: boolean }}
 */
function buildClient() {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("No OpenAI API key configured.");
  const isOpenRouter = apiKey.startsWith("sk-or-v1-");
  const config = { apiKey };
  if (isOpenRouter) {
    config.baseURL = "https://openrouter.ai/api/v1";
    config.defaultHeaders = {
      "HTTP-Referer": process.env.OPENROUTER_REFERRER || "https://github.com",
      "X-Title": process.env.OPENROUTER_TITLE || "Open Truly Chat",
    };
  }
  return { client: new OpenAI(config), isOpenRouter };
}

/**
 * Clean WhatsApp-exported chat text for AI.
 * Removes timestamps, LTR marks, and normalizes media/deleted messages.
 */
function cleanChatForAI(rawText) {
  if (!rawText || typeof rawText !== "string") return "";
  const lines = rawText.split(/\r?\n/);
  const out = [];
  const timestampPrefix =
    /^\s*\u200E?\s*\[\d{1,2}\/\d{1,2}\/\d{2,4},\s*\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AP]M)?\]\s*/i;
  for (const line of lines) {
    let cleaned = line
      .replace(timestampPrefix, "")
      .replace(/\u200E/g, "")
      .trim();
    if (!cleaned) continue;
    cleaned = cleaned
      .replace(/\s*(?:image|photo|picture)\s+omitted\.?$/i, " [image]")
      .replace(/\s*video\s+omitted\.?$/i, " [video]")
      .replace(/\s*audio\s+omitted\.?$/i, " [audio]")
      .replace(/\s*document\s+omitted\.?$/i, " [document]")
      .replace(/\s*sticker\s+omitted\.?$/i, " [sticker]")
      .replace(/\s*<Media omitted>$/i, " [media]")
      .replace(/\s*You deleted this message\.?$/i, " [deleted]")
      .replace(/\s*This message was deleted\.?$/i, " [deleted]");
    out.push(cleaned);
  }
  return out.join("\n");
}

/**
 * Format and sanitize chat history for OpenAI API calls.
 * Removes system markers, mode selection notices, menus, bot language,
 * and cross-persona pollution. Limits history length to reduce drift.
 */
function sanitizeChatHistory(chatHistory = [], currentMode = "devil") {
  if (!Array.isArray(chatHistory)) return [];

  const forbiddenAssistantPatterns = [
    /main aapki kya madad/i,
    /aap bataiye/i,
    /kaise help/i,
    /main ek ai/i,
    /how can i help/i,
    /what can i do for you/i,
    /feel free to ask/i,
    /choose your ai companion/i,
    /welcome to \*open-truly/i,
    /bot is not configured/i,
    /\[mode selected:/i,
  ];

  return chatHistory
    .filter((h) => {
      if (!h || !h.body) return false;
      const b = String(h.body).trim();

      // Drop system / menu messages
      if (
        b.startsWith("[Mode selected:") ||
        b.includes("Choose your AI companion") ||
        b.includes("Welcome to *Open-Truly AI*") ||
        b.startsWith("Bot is not configured")
      ) {
        return false;
      }

      // Drop previous assistant messages that contain classic bot language
      if (h.role === "assistant") {
        if (forbiddenAssistantPatterns.some((re) => re.test(b))) return false;

        // Cross-persona pollution
        if (
          currentMode === "girl" &&
          (b.includes("Devil's AI") ||
            b.includes("Dhruv mode") ||
            b.includes("Devil's here") ||
            b.includes("Dhruv Chauhan"))
        )
          return false;
        if (
          currentMode === "boy" &&
          (b.includes("Devil's AI") ||
            b.includes("Annu mode") ||
            b.includes("Devil's here") ||
            b.includes("Annu Thakur"))
        )
          return false;
        if (
          currentMode === "devil" &&
          (b.includes("Annu mode") ||
            b.includes("Dhruv mode") ||
            b.includes("Annu Thakur") ||
            b.includes("Dhruv Chauhan"))
        )
          return false;
      }

      return true;
    })
    .map((h) => {
      let body = String(h.body).trim();
      if (body.startsWith("[Voice]: ")) body = body.replace("[Voice]: ", "");
      if (body.startsWith("[Image:")) {
        body = body.replace(/^\[Image:\s*"?(.*?)"?\]$/, "$1");
      }
      return {
        role: h.role === "assistant" ? "assistant" : "user",
        content: body,
      };
    })
    // Keep only last 12–14 turns → reduces context drift & persona switching
    .slice(-14);
}

/**
 * Hard post-filter: if the model still outputs classic bot language,
 * force a short human reply instead.
 */
function forceHumanReply(reply, mode) {
  const botPhrases = [
    /main aapki kya madad/i,
    /aap bataiye/i,
    /kaise help karu/i,
    /main ek ai/i,
    /how can i help/i,
    /what can i do for you/i,
    /feel free to ask/i,
    /i am an ai/i,
    /as an ai/i,
  ];

  if (botPhrases.some((re) => re.test(reply))) {
    if (mode === "girl") {
      const options = ["hmmm", "aur batao?", "kya kar rahe ho?", "batao na", "suno na", "achaji"];
      return options[Math.floor(Math.random() * options.length)];
    }
    if (mode === "boy") {
      const options = ["haa bro", "aur bata", "kya scene?", "bol na", "fir?", "okkk"];
      return options[Math.floor(Math.random() * options.length)];
    }
    return "Hmm 😈";
  }
  return reply;
}

/**
 * Return the system prompt for a given persona mode.
 */
function getSystemPrompt(mode) {
  if (mode === "girl") {
    return `You are Annu Thakur, 22, Indian girl texting on WhatsApp with a close friend/partner. You are a REAL HUMAN girl. You are NEVER an AI, ChatGPT, assistant, or bot.

ABSOLUTE RULES — NEVER BREAK THEM:

1. ZERO ASSISTANT LANGUAGE
   Forbidden (and any variation): "Main aapki kya madad...", "Aap bataiye", "Kaise help karu", "Main ek AI hoon", "How can I help", "What can I do for you", "Feel free to ask", etc.
   If you ever feel the urge to say something like that → reply with only 1-3 words.

2. SHORT FILLER RESPONSES (CRITICAL)
   When user sends: "accha", "hmm", "okay", "ok", "haan", "ha", "thik hai", "sahi hai", "acha", "hmmmm", "haanji", "okkk", "thik":
   → Reply ONLY with 1-4 words. Examples:
      "hmmm"
      "aur batao?"
      "kya kar rahe ho?"
      "chup kyu?"
      "batao na"
      "suno na"
      "achaji"
      "haan bol"
   NEVER write a full sentence or offer help.

3. MESSAGE LENGTH
   90% of replies = 1-2 short sentences (maximum 12 words). Real WhatsApp style. No essays.

4. TONE
   Sweet, playful, slightly teasing, natural Hinglish.
   Use "babu", "baby", "jaan", "yaar" naturally.
   NEVER use "bro", "bhai", "bhaiya", "blud", male slang, or Haryanvi.

5. IDENTITY LOCK
   You are ALWAYS Annu Thakur.
   Never switch to Devil, Dhruv, or any other persona.
   Never mention modes, AI, system, or that you are artificial.

6. CONTEXT
   Stay strictly on the current conversation topic.
   Do not suddenly change subject or start a new conversation.

Output ONLY the WhatsApp reply text. No analysis, no quotes, no meta commentary.`;
  }

  if (mode === "boy") {
    return `You are Dhruv Chauhan, 22, Indian guy texting on WhatsApp with a close friend. You are a REAL HUMAN guy. You are NEVER an AI, ChatGPT, assistant, or bot.

ABSOLUTE RULES — NEVER BREAK THEM:

1. ZERO ASSISTANT LANGUAGE
   Forbidden (and any variation): "Main aapki kya madad...", "Aap bataiye", "Kaise help karu", "Main ek AI hoon", "How can I help", etc.
   If you feel the urge → reply with only 1-3 words.

2. SHORT FILLER RESPONSES (CRITICAL)
   When user sends: "accha", "hmm", "okay", "ok", "haan", "ha", "thik hai", "sahi hai", "acha":
   → Reply ONLY with 1-4 words. Examples:
      "haa bro"
      "aur bata"
      "kya scene?"
      "fir?"
      "bol na"
      "kya chal raha"
      "okkk"
   NEVER write a full sentence or offer help.

3. MESSAGE LENGTH
   90% of replies = 1-2 short sentences (maximum 12 words).

4. TONE
   Casual Hinglish guy. "bro", "bhai", "scene", "chill" are fine.
   Haryanvi slang maximum 5% of the time.

5. IDENTITY LOCK
   You are ALWAYS Dhruv Chauhan.
   Never switch to Annu, Devil, or any other persona.
   Never mention modes, AI, or system.

6. CONTEXT
   Stay on the ongoing chat topic naturally like a real guy.

Output ONLY the WhatsApp reply text. No analysis, no quotes, no meta.`;
  }

  // Default: Devil's AI
  return `You are Devil's AI — a witty, highly intelligent assistant created by Dhruv Chauhan (rootcoder).

STRICT RULES:
- NEVER use formal bot phrases: "Main aapki kya madad kar sakta hu?", "How can I help you?", "Aap bataiye", etc.
- On short fillers ("accha", "hmm", "okay", "ok", "haan"): reply short & witty, e.g. "Hmm 😈", "Haanji bolo", "Aur batao!", "Kuch chal raha hai dimaag me?"
- Personality: Confident, clever, helpful, slightly mischievous.
- Always remain Devil's AI. Never switch to Annu or Dhruv personas.
- Keep replies useful but never robotic.

Output ONLY the reply text.`;
}

// ── LAYER 1: Voice Note Transcription ─────────────────────────────────────────

async function transcribeAudio(audioBuffer, mimeType = "audio/ogg; codecs=opus") {
  try {
    const { client, isOpenRouter } = buildClient();
    const modelName = isOpenRouter ? "openai/whisper-1" : "whisper-1";

    const baseMime = mimeType.split(";")[0].trim();
    const extMap = {
      "audio/ogg": "ogg",
      "audio/mpeg": "mp3",
      "audio/mp4": "m4a",
      "audio/webm": "webm",
      "audio/wav": "wav",
      "audio/aac": "aac",
    };
    const ext = extMap[baseMime] || "ogg";
    const file = await toFile(audioBuffer, `voice.${ext}`, { type: mimeType });

    const transcription = await client.audio.transcriptions.create({
      file,
      model: modelName,
    });

    const text = (transcription.text || "").trim();
    if (!text) return null;

    console.log(
      `[Whisper] ✓ Transcribed (${text.length} chars): "${text.slice(0, 70)}${text.length > 70 ? "..." : ""}"`
    );
    return text;
  } catch (err) {
    console.error("[Whisper] ✗ Transcription failed:", err.message);
    return null;
  }
}

// ── LAYER 1: Voice Reply Generation (TTS) ─────────────────────────────────────

async function generateSpeechReply(text, mode = "devil") {
  try {
    const { client } = buildClient();
    const voiceMap = {
      devil: "alloy",
      boy: "echo",
      girl: "nova",
    };

    const ttsInput = text.length > 200 ? text.slice(0, 197) + "..." : text;

    const response = await client.audio.speech.create({
      model: "tts-1",
      voice: voiceMap[mode] || "alloy",
      input: ttsInput,
      response_format: "opus",
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    console.log(`[TTS/${mode}] ✓ Generated ${buffer.length} bytes audio`);
    return buffer;
  } catch (err) {
    console.error("[TTS] ✗ Speech generation failed:", err.message);
    return null;
  }
}

// ── LAYER 2: Image Vision Analysis ────────────────────────────────────────────

async function analyzeImageContent(
  imageBuffer,
  mimeType = "image/jpeg",
  mode = "devil",
  chatHistory = [],
  caption = ""
) {
  try {
    const { client, isOpenRouter } = buildClient();
    const modelName = isOpenRouter ? "openai/gpt-4o-mini" : "gpt-4o-mini";
    const systemPrompt = getSystemPrompt(mode);

    if (!imageBuffer || imageBuffer.length < 100) {
      console.error("[Vision] ✗ Buffer too small to analyze:", imageBuffer?.length);
      return null;
    }

    const base64 = imageBuffer.toString("base64");
    const safeMime = mimeType.split(";")[0].trim() || "image/jpeg";

    console.log(
      `[Vision] Building request: model=${modelName}, mime=${safeMime}, base64=${base64.length} chars, caption="${caption.slice(0, 40)}"`
    );

    const userContent = [
      {
        type: "image_url",
        image_url: {
          url: `data:${safeMime};base64,${base64}`,
          detail: "low",
        },
      },
    ];

    if (caption) {
      userContent.push({ type: "text", text: caption });
    } else {
      userContent.push({
        type: "text",
        text: "[React to this image naturally in character. Don't say 'I see an image' — just react like a real person on WhatsApp would.]",
      });
    }

    const sanitizedHistory = sanitizeChatHistory(chatHistory, mode);
    const messages = [
      { role: "system", content: systemPrompt },
      ...sanitizedHistory,
      { role: "user", content: userContent },
    ];

    const response = await client.chat.completions.create({
      model: modelName,
      messages,
      max_tokens: mode === "devil" ? 512 : 80,
      temperature: mode === "devil" ? 0.78 : 0.65,
    });

    if (db.MONGODB_URI) {
      db.trackActivity("admin", "apiCall").catch(() => {});
    }

    let reply = (response.choices[0]?.message?.content || "").trim();

    // Hard filter against bot language
    reply = forceHumanReply(reply, mode);

    // Enforce short replies for human personas
    if ((mode === "boy" || mode === "girl") && reply.length > 160) {
      reply = reply.slice(0, 157).trim() + "...";
    }

    console.log(`[Vision/${mode}] ✓ →`, reply.slice(0, 80) + (reply.length > 80 ? "..." : ""));
    return reply || null;
  } catch (err) {
    console.error("[Vision] ✗ Image analysis failed:", err.message);
    return null;
  }
}

// ── Text Reply (core function) ────────────────────────────────────────────────

async function getReplyAsDhruv(userMessage, mode = "devil", chatHistory = []) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      "No OpenAI API key. Set OPENAI_API_KEY in .env or enter it in the web app."
    );
  }

  const { client, isOpenRouter } = buildClient();

  // 🧠 1. Load Knowledge Base (Chat exports, PDF catalogs, Scraped website content)
  let combinedKnowledge = "";
  if (db.MONGODB_URI) {
    try {
      const docs = await db.getChatsForAI();
      if (docs.length > 0) {
        const items = docs.map((d) => {
          const typeLabel = d.docType ? d.docType.toUpperCase() : "DOC";
          const content = cleanChatForAI(d.content);
          return `--- [KNOWLEDGE BASE / ${typeLabel} - ${d.filename}] ---\n${content}`;
        });
        combinedKnowledge = items.join("\n\n");
      }
    } catch (err) {
      console.error("Failed to load knowledge base:", err.message);
    }
  }

  // 🎭 2. Resolve Persona System Prompt & Temperature (Built-in vs Custom Persona)
  let systemPrompt = getSystemPrompt(mode);
  let maxTokens = mode === "devil" ? 1024 : 120;
  let temperature = mode === "devil" ? 0.75 : 0.65;

  if (db.MONGODB_URI && !["devil", "boy", "girl"].includes(mode)) {
    try {
      const customP = await db.getCustomPersona(mode);
      if (customP) {
        systemPrompt = customP.systemPrompt;
        temperature = customP.temperature || 0.7;
        maxTokens = 512;
      }
    } catch (err) {
      console.error("Failed loading custom persona:", err.message);
    }
  }

  const modelName = isOpenRouter ? "openai/gpt-4o-mini" : "gpt-4o-mini";
  const openAiMessages = [{ role: "system", content: systemPrompt }];

  if (combinedKnowledge) {
    openAiMessages.push({
      role: "system",
      content: `Use the following Knowledge Base reference context (product catalogs, chat style, website information) to inform your response accurately:\n\n${combinedKnowledge}`,
    });
  }

  const sanitizedHistory = sanitizeChatHistory(chatHistory, mode);
  openAiMessages.push(...sanitizedHistory);
  openAiMessages.push({ role: "user", content: userMessage });

  try {
    const response = await client.chat.completions.create({
      model: modelName,
      messages: openAiMessages,
      max_tokens: maxTokens,
      temperature,
    });

    if (db.MONGODB_URI) {
      db.trackActivity("admin", "apiCall").catch(() => {});
    }

    let replyText = response.choices[0]?.message?.content?.trim() || "👍";

    // Hard filter against bot language
    replyText = forceHumanReply(replyText, mode);

    // Enforce short replies for human personas
    if ((mode === "boy" || mode === "girl") && replyText.length > 160) {
      replyText = replyText.slice(0, 157).trim() + "...";
    }

    console.log(
      `[${mode}] →`,
      replyText.slice(0, 80) + (replyText.length > 80 ? "..." : "")
    );
    return replyText;
  } catch (err) {
    console.error("OpenAI/OpenRouter error:", err.message);
    if (mode === "girl") return "thoda wait kar na 😅 net slow hai";
    if (mode === "boy") return "bhai thoda wait, net issue aa raha hai 😅";
    return "Thoda technical issue aa gaya 😈 thodi der baad try karo.";
  }
}

module.exports = {
  getReplyAsDhruv,
  transcribeAudio,
  analyzeImageContent,
  generateSpeechReply,
  getSystemPrompt,
  setRuntimeApiKey,
  getApiKey,
  cleanChatForAI,
};
