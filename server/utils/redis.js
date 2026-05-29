const Redis = require("ioredis");

let redis = null;
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, {
    retryStrategy(times) {
      return Math.min(times * 50, 2000);
    }
  });
  redis.on("error", (err) => console.warn("Redis Error:", err.message));
  redis.on("connect", () => console.log("🟢 Connected to Redis"));
}

// Memory fallbacks
const memCache = new Map();
const memQueues = new Map();

const Cache = {
  // ─── Chat History Cache ───────────────────────────────────────
  async getHist(key) {
    if (redis) {
      try {
        const data = await redis.get(`hist:${key}`);
        return data ? JSON.parse(data) : null;
      } catch (e) {
        console.debug("Redis getHist error:", e.message);
      }
    }
    return memCache.get(key) || null;
  },
  
  async setHist(key, msgs, ttl = 86400) {
    if (redis) {
      try {
        await redis.set(`hist:${key}`, JSON.stringify(msgs), "EX", ttl);
        return;
      } catch (e) {
        console.debug("Redis setHist error:", e.message);
      }
    }
    memCache.set(key, msgs);
  },

  // ─── Debounce Queue (Webhook Spam Protection) ─────────────────
  async enqueueMessage(userId, message, replyToken, delayMs, callback) {
    if (redis) {
      try {
        await redis.rpush(`queue:${userId}:msgs`, message);
        if (replyToken) await redis.set(`queue:${userId}:token`, replyToken);
        
        // Only the first message sets the lock and triggers the timeout
        const isNew = await redis.set(`queue:${userId}:lock`, "1", "NX", "PX", delayMs);
        if (isNew) {
          setTimeout(async () => {
            const msgs = await redis.lrange(`queue:${userId}:msgs`, 0, -1);
            const token = await redis.get(`queue:${userId}:token`);
            
            await redis.del(`queue:${userId}:msgs`, `queue:${userId}:token`, `queue:${userId}:lock`);
            
            if (msgs && msgs.length > 0) {
              callback(msgs.join("\n"), token);
            }
          }, delayMs);
        }
      } catch (e) {
        console.debug("Redis enqueue error:", e.message);
        this._fallbackEnqueue(userId, message, replyToken, delayMs, callback);
      }
    } else {
      this._fallbackEnqueue(userId, message, replyToken, delayMs, callback);
    }
  },

  _fallbackEnqueue(userId, message, replyToken, delayMs, callback) {
    if (!memQueues.has(userId)) {
      memQueues.set(userId, { messages: [], timer: null, latestReplyToken: null });
    }
    const q = memQueues.get(userId);
    q.messages.push(message);
    if (replyToken) q.latestReplyToken = replyToken;
    
    if (q.timer) clearTimeout(q.timer);
    
    q.timer = setTimeout(() => {
      const combinedText = q.messages.join("\n");
      const rToken = q.latestReplyToken;
      memQueues.delete(userId);
      callback(combinedText, rToken);
    }, delayMs);
  }
};

module.exports = { redis, Cache };
