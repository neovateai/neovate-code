import crypto from 'crypto';
import fs from 'fs';
import path from 'pathe';

/**
 * Plan Slug Generator
 * Format: {adjective}-{verb}-{noun}
 * Example: peaceful-dancing-firefly
 */

export interface PlanSlugGenerator {
  generate(): string;
  getOrCreate(sessionId: string): string;
  set(sessionId: string, slug: string): void;
  clear(sessionId: string): void;
  getAllCached(): Map<string, string>;
}

// Vocabulary
const ADJECTIVES = [
  'peaceful',
  'gentle',
  'bright',
  'swift',
  'quiet',
  'brave',
  'clever',
  'eager',
  'happy',
  'keen',
  'lively',
  'nimble',
  'proud',
  'sharp',
  'vivid',
  'witty',
  'zealous',
  'agile',
  'bold',
  'calm',
  'daring',
  'elegant',
  'fierce',
  'graceful',
  'async',
  'atomic',
  'cached',
  'compiled',
  'encoded',
  'hashed',
  'indexed',
  'linked',
  'mapped',
  'nested',
  'parsed',
  'queued',
];

const VERBS = [
  'dancing',
  'flying',
  'running',
  'singing',
  'jumping',
  'gliding',
  'soaring',
  'racing',
  'flowing',
  'shining',
  'blooming',
  'drifting',
  'spinning',
  'twirling',
  'rising',
  'falling',
  'growing',
  'fading',
  'compiling',
  'parsing',
  'rendering',
  'loading',
  'caching',
  'syncing',
  'fetching',
  'merging',
  'splitting',
  'mapping',
  'reducing',
  'filtering',
];

const NOUNS = [
  'firefly',
  'butterfly',
  'eagle',
  'falcon',
  'hawk',
  'sparrow',
  'robin',
  'phoenix',
  'dragon',
  'tiger',
  'wolf',
  'fox',
  'river',
  'mountain',
  'ocean',
  'forest',
  'meadow',
  'valley',
  'sunset',
  'sunrise',
  'rainbow',
  'starlight',
  'moonbeam',
  'nebula',
  'compiler',
  'parser',
  'renderer',
  'loader',
  'bundler',
  'optimizer',
  'transformer',
  'validator',
  'iterator',
  'generator',
  'resolver',
  'handler',
];

// Slug cache: sessionId -> slug
const slugCache = new Map<string, string>();

function generateSlug(): string {
  const adjective = ADJECTIVES[randomInt(ADJECTIVES.length)];
  const verb = VERBS[randomInt(VERBS.length)];
  const noun = NOUNS[randomInt(NOUNS.length)];

  return `${adjective}-${verb}-${noun}`;
}

function randomInt(max: number): number {
  const bytes = crypto.randomBytes(4);
  const value = bytes.readUInt32BE(0);
  return value % max;
}

function getOrCreateSlug(
  sessionId: string,
  checkExists: (slug: string) => boolean,
): string {
  // 1. Get from cache
  const cached = slugCache.get(sessionId);
  if (cached) {
    return cached;
  }

  // 2. Generate new slug, avoid conflicts
  let slug = generateSlug();
  let attempts = 0;
  const MAX_ATTEMPTS = 10;

  while (checkExists(slug) && attempts < MAX_ATTEMPTS) {
    slug = generateSlug();
    attempts++;
  }

  if (attempts >= MAX_ATTEMPTS) {
    // Fallback: append timestamp
    slug = `${slug}-${Date.now()}`;
  }

  // 3. Store in cache
  slugCache.set(sessionId, slug);

  return slug;
}

export function createPlanSlugGenerator(opts: {
  plansDir: string;
}): PlanSlugGenerator {
  const { plansDir } = opts;

  const checkExists = (slug: string): boolean => {
    const filePath = path.join(plansDir, `${slug}.md`);
    return fs.existsSync(filePath);
  };

  return {
    generate: generateSlug,

    getOrCreate: (sessionId: string) => {
      return getOrCreateSlug(sessionId, checkExists);
    },

    set: (sessionId: string, slug: string) => {
      slugCache.set(sessionId, slug);
    },

    clear: (sessionId: string) => {
      slugCache.delete(sessionId);
    },

    getAllCached: () => {
      return new Map(slugCache);
    },
  };
}
