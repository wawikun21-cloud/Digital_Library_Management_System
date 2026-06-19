// ─────────────────────────────────────────────────────────
//  services/cacheService.js
//  Centralized caching service using node-cache
//  Supports Redis (ioredis) fallback when available
// ─────────────────────────────────────────────────────────

const NodeCache = require("node-cache");

const DEFAULT_TTL = 300; // 5 minutes default TTL

const cache = new NodeCache({
  stdTTL: DEFAULT_TTL,
  checkperiod: 60,
  useClones: false,
});

let useRedis = false;
let redisClient = null;

async function initRedis() {
  try {
    const Redis = require("ioredis");
    const redisHost = process.env.REDIS_HOST || "localhost";
    const redisPort = process.env.REDIS_PORT || 6379;
    
    redisClient = new Redis({
      host: redisHost,
      port: redisPort,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 100, 3000);
      },
    });

    await redisClient.connect();
    useRedis = true;
    console.log("✅ Redis cache initialized");
    return true;
  } catch (err) {
    console.log("⚠️ Redis not available, using in-memory cache");
    return false;
  }
}

function getCacheKey(prefix, filters = {}) {
  const filterStr = Object.keys(filters)
    .sort()
    .map((k) => `${k}:${filters[k]}`)
    .join("|");
  return filterStr ? `${prefix}:${filterStr}` : prefix;
}

async function get(key) {
  if (useRedis && redisClient) {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }
  return cache.get(key);
}

async function set(key, value, ttl = DEFAULT_TTL) {
  if (useRedis && redisClient) {
    try {
      await redisClient.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch {
      return cache.set(key, value, ttl);
    }
  }
  return cache.set(key, value, ttl);
}

async function del(key) {
  if (useRedis && redisClient) {
    try {
      await redisClient.del(key);
      return true;
    } catch {
      return cache.del(key);
    }
  }
  return cache.del(key);
}

async function clearPattern(pattern) {
  if (useRedis && redisClient) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

function invalidateAttendanceCache() {
  clearPattern("attendance:*");
  clearPattern("dashboard:*");
}

module.exports = {
  initRedis,
  get,
  set,
  del,
  getCacheKey,
  invalidateAttendanceCache,
  DEFAULT_TTL,
};