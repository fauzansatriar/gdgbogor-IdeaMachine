import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const DATA_DIR = path.resolve(__dirname, 'data');
const CATEGORIES_FILE = path.resolve(DATA_DIR, 'idea-categories.json');
const ADMIN_AUTH_FILE = path.resolve(DATA_DIR, 'admin-auth.json');

if (!CATEGORIES_FILE.startsWith(DATA_DIR + path.sep) || !ADMIN_AUTH_FILE.startsWith(DATA_DIR + path.sep)) {
  throw new Error('Invalid server data file paths.');
}

const SESSION_SIGNING_SECRET =
  process.env.ADMIN_SESSION_SECRET?.trim() || crypto.randomBytes(32).toString('hex');
const SESSION_TTL_MS = 4 * 60 * 60 * 1000;

const VALID_PROBLEM_ICONS = [
  'utensils',
  'hospital',
  'recycle',
  'wallet',
  'cloud-rain',
  'file-text',
  'home',
  'car',
  'shopping-bag',
  'heart-pulse',
  'calendar',
  'book-open',
] as const;

const VALID_USER_ICONS = [
  'store',
  'graduation-cap',
  'train',
  'home',
  'users',
  'heart-pulse',
  'car',
  'shopping-bag',
] as const;

const VALID_SOLUTION_ICONS = [
  'camera',
  'globe',
  'calculator',
  'calendar',
  'bell',
  'book-open',
  'shopping-bag',
] as const;

const VALID_DEVICE_IDS = ['mobile', 'desktop', 'tablet-kiosk', 'cross-platform'] as const;

const ALL_VALID_ICONS = [
  ...VALID_PROBLEM_ICONS,
  ...VALID_USER_ICONS,
  ...VALID_SOLUTION_ICONS,
  'mic',
  'radio',
  'smartphone',
  'laptop',
  'tablet',
  'monitor-smartphone',
] as const;

type CategoryKey = 'problems' | 'solutions' | 'targetUsers' | 'deviceTargets';

interface StoredProblemItem {
  id: string;
  icon: string;
  title: string;
  domain: string;
  shortNoun: string;
  description: string;
}

interface StoredTargetUserItem {
  id: string;
  icon: string;
  title: string;
  shortPersona: string;
  context: string;
  description: string;
}

interface StoredSolutionItem {
  id: string;
  icon: string;
  title: string;
  techStack: string;
  howToBuild: string;
  coreFeatures: string[];
}

interface StoredDeviceTargetItem {
  id: string;
  icon: string;
  title: string;
  badgeLabel: string;
  layoutHint: string;
  description: string;
}

interface StoredTaskBundle {
  id: string;
  problem: StoredProblemItem;
  solution: StoredSolutionItem;
  targetUser: StoredTargetUserItem;
  deviceTarget: StoredDeviceTargetItem;
}

interface CategoryStore {
  tasks: StoredTaskBundle[];
  problems: StoredProblemItem[];
  solutions: StoredSolutionItem[];
  targetUsers: StoredTargetUserItem[];
  deviceTargets: StoredDeviceTargetItem[];
}

const DEFAULT_CATEGORIES: Omit<CategoryStore, 'tasks'> = {
  problems: [
    {
      id: 'personal-expense',
      icon: 'wallet',
      title: 'Pengeluaran Harian Sering Lupa Dicatat',
      domain: 'Keuangan Pribadi',
      shortNoun: 'pengeluaran harian yang sering lupa dicatat',
      description:
        'Jajan kecil, ongkos, dan belanja harian sering lupa dicatat sehingga tiba-tiba uang bulanan menipis.',
    },
    {
      id: 'personal-todo',
      icon: 'calendar',
      title: 'Tugas & Rutinitas Harian Sering Terlewat',
      domain: 'Aktivitas Harian',
      shortNoun: 'daftar tugas dan rutinitas harian yang tercecer',
      description:
        'Daftar pekerjaan, belanjaan, dan jadwal harian tercecer di chat atau catatan terpisah sehingga sering ada yang terlewat.',
    },
    {
      id: 'personal-fridge',
      icon: 'utensils',
      title: 'Bingung Masak Apa dari Bahan di Kulkas',
      domain: 'Dapur Pribadi',
      shortNoun: 'bahan masakan di kulkas yang bingung mau diolah jadi apa',
      description:
        'Bahan makanan di kulkas sering tidak terpakai karena bingung mau dimasak jadi menu apa yang cepat dan mudah.',
    },
    {
      id: 'personal-study',
      icon: 'book-open',
      title: 'Catatan & Materi Bacaan Terlalu Panjang',
      domain: 'Belajar Pribadi',
      shortNoun: 'materi bacaan dan catatan belajar yang terlalu panjang',
      description:
        'Catatan kuliah atau artikel panjang susah dipelajari ulang dengan cepat saat butuh persiapan ujian atau rapat.',
    },
    {
      id: 'personal-reminder',
      icon: 'bell',
      title: 'Jadwal Vitamin & Tagihan Rutin Sering Lupa',
      domain: 'Pengingat Pribadi',
      shortNoun: 'jadwal minum vitamin dan tanggal bayar tagihan bulanan',
      description:
        'Jadwal minum vitamin harian dan tanggal jatuh tempo tagihan listrik, air, atau internet sering terlewat.',
    },
  ],
  targetUsers: [
    {
      id: 'young-workers',
      icon: 'users',
      title: 'Pekerja Muda & Anak Kos',
      shortPersona: 'pekerja muda dan anak kos',
      context: 'Mandiri · Praktis Sehari-hari',
      description:
        'Orang yang ingin memantau uang jajan dan kebutuhan bulanan pribadi agar lebih terkontrol dan hemat.',
    },
    {
      id: 'busy-individuals',
      icon: 'users',
      title: 'Pekerja & Pelajar Sibuk',
      shortPersona: 'pekerja dan pelajar sibuk',
      context: 'Rapi · Mudah Dicek Cepat',
      description:
        'Orang yang butuh daftar kerja harian yang rapi dan langsung terlihat mana yang harus diselesaikan lebih dulu.',
    },
    {
      id: 'home-cooks',
      icon: 'home',
      title: 'Penghuni Kos & Keluarga di Rumah',
      shortPersona: 'penghuni kos atau keluarga di rumah',
      context: 'Dapur Pribadi · Hemat Bahan',
      description:
        'Orang yang masak sendiri di rumah atau kos dan ingin ide menu harian sederhana dari bahan yang sudah ada.',
    },
    {
      id: 'students',
      icon: 'graduation-cap',
      title: 'Pelajar & Mahasiswa',
      shortPersona: 'pelajar dan mahasiswa',
      context: 'Belajar Mandiri · Ringkas',
      description:
        'Anak sekolah atau mahasiswa yang ingin belajar lebih cepat dari rangkuman catatan dan latihan kuis singkat.',
    },
    {
      id: 'self-care-users',
      icon: 'heart-pulse',
      title: 'Individu yang Mengatur Jadwal Rutin',
      shortPersona: 'orang yang mengatur jadwal rutin harian',
      context: 'Teratur · Bebas Lupa',
      description:
        'Orang yang ingin jadwal kesehatan dan tagihan rutin bulanan tercatat rapi di satu tempat dengan pengingat jelas.',
    },
  ],
  solutions: [
    {
      id: 'expense-tracker',
      icon: 'calculator',
      title: 'Pencatat Pengeluaran & Struk Harian',
      techStack: 'Input Cepat · Baca Struk · Rekap Saldo',
      howToBuild:
        'Aplikasi pencatat keuangan pribadi: ketik nominal pengeluaran atau foto struk belanja, lalu lihat total pengeluaran per kategori dan sisa anggaran bulan ini.',
      coreFeatures: [
        'Catat nominal pengeluaran cepat berdasarkan kategori',
        'Upload foto struk belanja untuk isi data otomatis',
        'Ringkasan total pengeluaran dan sisa anggaran bulanan',
      ],
    },
    {
      id: 'todo-checklist',
      icon: 'calendar',
      title: 'Checklist Tugas & Kebiasaan Harian',
      techStack: 'Daftar Tugas · Centang Selesai',
      howToBuild:
        'Aplikasi daftar tugas sederhana untuk mencatat hal yang harus dikerjakan hari ini, menandai selesai, dan melihat progres harian.',
      coreFeatures: [
        'Tambah tugas baru dan tandai selesai dengan satu klik',
        'Pisahkan daftar tugas hari ini dan mendatang',
        'Lihat ringkasan tugas yang sudah terselesaikan',
      ],
    },
    {
      id: 'fridge-recipes',
      icon: 'camera',
      title: 'Pencari Resep dari Bahan di Kulkas',
      techStack: 'Pilih Bahan · Ide Resep Praktis',
      howToBuild:
        'Pilih atau ketik bahan makanan yang tersedia di dapur, lalu aplikasi menampilkan ide menu masakan sederhana lengkap dengan langkah memasaknya.',
      coreFeatures: [
        'Pilih atau ketik daftar bahan yang ada di kulkas',
        'Tampilkan pilihan menu masakan sederhana di bawah 30 menit',
        'Checklist bahan tambahan jika masih ada yang kurang',
      ],
    },
    {
      id: 'study-flashcards',
      icon: 'book-open',
      title: 'Peringkas Catatan & Kartu Kuis Belajar',
      techStack: 'Ringkas Teks · Kartu Tanya Jawab',
      howToBuild:
        'Tempel catatan kuliah atau artikel panjang, aplikasi merangkumnya jadi poin penting dan membuat kartu kuis tanya-jawab (flashcard) untuk latihan.',
      coreFeatures: [
        'Tempel teks catatan panjang untuk diringkas jadi poin inti',
        'Buat kartu kuis tanya-jawab untuk latihan hafalan',
        'Simpan daftar rangkuman berdasarkan mata pelajaran',
      ],
    },
    {
      id: 'routine-bill-reminder',
      icon: 'bell',
      title: 'Pengingat Jadwal Vitamin & Tagihan Bulanan',
      techStack: 'Daftar Jadwal · Tandai Selesai',
      howToBuild:
        'Aplikasi pengingat pribadi untuk mencatat jadwal minum vitamin harian dan tanggal jatuh tempo tagihan bulanan, lengkap dengan status sudah dibayar.',
      coreFeatures: [
        'Daftar jadwal minum vitamin atau obat harian',
        'Daftar tanggal jatuh tempo tagihan rutin tiap bulan',
        'Tombol tandai selesai atau sudah dibayar',
      ],
    },
  ],
  deviceTargets: [
    {
      id: 'mobile',
      icon: 'smartphone',
      title: 'Tampilan HP',
      badgeLabel: 'Layar Vertikal',
      layoutHint: 'Nyaman Satu Tangan · Tombol Besar',
      description:
        'Didesain khusus untuk dipakai pribadi di HP dengan tombol besar dan menu sederhana yang nyaman pakai satu tangan.',
    },
    {
      id: 'desktop',
      icon: 'laptop',
      title: 'Layar Laptop',
      badgeLabel: 'Layar Lebar',
      layoutHint: 'Tampilan Lega · Fokus Belajar & Kerja',
      description:
        'Memanfaatkan layar laptop yang lebar agar catatan, ringkasan, dan daftar rencana pribadi tampil lega berdampingan.',
    },
    {
      id: 'tablet-kiosk',
      icon: 'tablet',
      title: 'Layar Tablet Pribadi',
      badgeLabel: 'Meja Belajar / Rumah',
      layoutHint: 'Huruf Jelas · Nyaman Dibaca Santai',
      description:
        'Tampilan bersih dan lega untuk ditaruh di meja belajar, dapur, atau samping tempat tidur untuk penggunaan pribadi.',
    },
    {
      id: 'cross-platform',
      icon: 'monitor-smartphone',
      title: 'HP & Laptop',
      badgeLabel: 'Rapi di Semua Layar',
      layoutHint: 'Sinkron · Praktis Di Mana Saja',
      description:
        'Enak dipakai cepat dari HP saat di luar rumah, dan tetap lega saat dicek ulang dari laptop pribadi.',
    },
  ],
};

const DEFAULT_TASKS: StoredTaskBundle[] = [
  {
    id: 'task-personal-expense',
    problem: DEFAULT_CATEGORIES.problems[0],
    solution: DEFAULT_CATEGORIES.solutions[0],
    targetUser: DEFAULT_CATEGORIES.targetUsers[0],
    deviceTarget: DEFAULT_CATEGORIES.deviceTargets[0],
  },
  {
    id: 'task-personal-todo',
    problem: DEFAULT_CATEGORIES.problems[1],
    solution: DEFAULT_CATEGORIES.solutions[1],
    targetUser: DEFAULT_CATEGORIES.targetUsers[1],
    deviceTarget: DEFAULT_CATEGORIES.deviceTargets[3],
  },
  {
    id: 'task-personal-recipe',
    problem: DEFAULT_CATEGORIES.problems[2],
    solution: DEFAULT_CATEGORIES.solutions[2],
    targetUser: DEFAULT_CATEGORIES.targetUsers[2],
    deviceTarget: DEFAULT_CATEGORIES.deviceTargets[0],
  },
  {
    id: 'task-personal-study-v2',
    problem: DEFAULT_CATEGORIES.problems[3],
    solution: DEFAULT_CATEGORIES.solutions[3],
    targetUser: DEFAULT_CATEGORIES.targetUsers[3],
    deviceTarget: DEFAULT_CATEGORIES.deviceTargets[1],
  },
  {
    id: 'task-personal-reminder',
    problem: DEFAULT_CATEGORIES.problems[4],
    solution: DEFAULT_CATEGORIES.solutions[4],
    targetUser: DEFAULT_CATEGORIES.targetUsers[4],
    deviceTarget: DEFAULT_CATEGORIES.deviceTargets[2],
  },
];

const LEGACY_SEED_TASK_IDS = new Set([
  'task-food-kitchen',
  'task-umkm-cashflow',
  'task-commuter-weather',
  'task-student-notes',
  'task-community-queue',
  'task-personal-fridge',
  'task-personal-budget',
  'task-personal-commute',
  'task-personal-study',
  'task-personal-health',
]);

function deriveStoreFromTasks(tasks: StoredTaskBundle[]): CategoryStore {
  const safeTasks = tasks.length > 0 ? tasks : structuredClone(DEFAULT_TASKS);
  return {
    tasks: safeTasks,
    problems: safeTasks.map((t) => t.problem),
    solutions: safeTasks.map((t) => t.solution),
    targetUsers: safeTasks.map((t) => t.targetUser),
    deviceTargets: safeTasks.map((t) => t.deviceTarget),
  };
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadCategories(): CategoryStore {
  try {
    ensureDataDir();
    if (!fs.existsSync(CATEGORIES_FILE)) {
      const initialStore = deriveStoreFromTasks(structuredClone(DEFAULT_TASKS));
      fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(initialStore, null, 2), 'utf8');
      return initialStore;
    }
    const raw = fs.readFileSync(CATEGORIES_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<CategoryStore>;
    if (Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
      const customTasks = parsed.tasks.filter((t) => !LEGACY_SEED_TASK_IDS.has(t.id));
      const hasLegacySeeds = customTasks.length !== parsed.tasks.length;
      if (hasLegacySeeds) {
        const upgraded = deriveStoreFromTasks([...customTasks, ...structuredClone(DEFAULT_TASKS)]);
        saveCategories(upgraded);
        return upgraded;
      }
      return deriveStoreFromTasks(parsed.tasks);
    }
    const migratedStore = deriveStoreFromTasks(structuredClone(DEFAULT_TASKS));
    saveCategories(migratedStore);
    return migratedStore;
  } catch (err) {
    console.error('[loadCategories error]:', err);
    return deriveStoreFromTasks(structuredClone(DEFAULT_TASKS));
  }
}

function saveCategories(store: CategoryStore): void {
  ensureDataDir();
  const normalized = deriveStoreFromTasks(store.tasks);
  const tmpFile = `${CATEGORIES_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(normalized, null, 2), 'utf8');
  fs.renameSync(tmpFile, CATEGORIES_FILE);
}

interface StoredAdminCredential {
  username: string;
  salt: string;
  hash: string;
  claimedAt: string;
}

function loadClaimedAdmin(): StoredAdminCredential | null {
  try {
    if (!fs.existsSync(ADMIN_AUTH_FILE)) return null;
    const raw = fs.readFileSync(ADMIN_AUTH_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<StoredAdminCredential>;
    if (
      typeof parsed.username === 'string' &&
      typeof parsed.salt === 'string' &&
      typeof parsed.hash === 'string' &&
      parsed.username.trim() &&
      parsed.salt &&
      parsed.hash
    ) {
      return {
        username: parsed.username.trim(),
        salt: parsed.salt,
        hash: parsed.hash,
        claimedAt: parsed.claimedAt || new Date().toISOString(),
      };
    }
  } catch {
    // Ignore malformed auth file
  }
  return null;
}

function getAdminStatus(): {
  configured: boolean;
  source: 'env' | 'claimed' | 'unclaimed';
  usernameHint: string;
} {
  const envPin = process.env.ADMIN_PIN?.trim() || process.env.ADMIN_PASSWORD?.trim();
  if (envPin) {
    return { configured: true, source: 'env', usernameHint: 'admin' };
  }
  const claimed = loadClaimedAdmin();
  if (claimed) {
    return { configured: true, source: 'claimed', usernameHint: claimed.username };
  }
  return { configured: false, source: 'unclaimed', usernameHint: 'admin' };
}

function signAdminToken(username: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: username,
      iat: Date.now(),
      exp: Date.now() + SESSION_TTL_MS,
    })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SIGNING_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifyAdminToken(token: string): { username: string } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  if (!payload || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SIGNING_SECRET)
    .update(payload)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub?: string;
      exp?: number;
    };
    if (
      typeof decoded.sub === 'string' &&
      decoded.sub.trim() &&
      typeof decoded.exp === 'number' &&
      decoded.exp > Date.now()
    ) {
      return { username: decoded.sub.trim() };
    }
  } catch {
    return null;
  }
  return null;
}

interface AuthenticatedRequest extends Request {
  adminUser?: string;
}

function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Sesi admin tidak valid atau sudah berakhir. Silakan login kembali.' });
    return;
  }
  const token = authHeader.slice(7).trim();
  const verified = verifyAdminToken(token);
  if (!verified) {
    res.status(401).json({ error: 'Sesi admin tidak valid atau sudah berakhir. Silakan login kembali.' });
    return;
  }
  req.adminUser = verified.username;
  next();
}

const loginFailures = new Map<string, { count: number; resetAt: number }>();

function checkLoginRateLimit(ipKey: string): boolean {
  const now = Date.now();
  const entry = loginFailures.get(ipKey);
  if (!entry || entry.resetAt <= now) {
    return true;
  }
  return entry.count < 10;
}

function recordLoginFailure(ipKey: string): void {
  const now = Date.now();
  const entry = loginFailures.get(ipKey);
  if (!entry || entry.resetAt <= now) {
    loginFailures.set(ipKey, { count: 1, resetAt: now + 5 * 60 * 1000 });
  } else {
    entry.count += 1;
  }
}

function clearLoginFailures(ipKey: string): void {
  loginFailures.delete(ipKey);
}

function cleanText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLen);
}

function slugifyId(text: string, prefix: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 28);
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${prefix}-${base || 'item'}-${suffix}`;
}

function isValidCategoryKey(value: string): value is CategoryKey {
  return (
    value === 'problems' ||
    value === 'solutions' ||
    value === 'targetUsers' ||
    value === 'deviceTargets'
  );
}

const EVERYDAY_THEMES = [
  'pencatat pengeluaran harian pribadi dan batas anggaran bulanan',
  'daftar tugas harian (to-do list) dan checklist kebiasaan sehari-hari',
  'pencari ide resep masakan sederhana dari bahan yang ada di kulkas',
  'peringkas catatan pelajaran atau artikel panjang menjadi poin dan kartu kuis',
  'pengingat jadwal minum vitamin rutin dan tanggal bayar tagihan bulanan',
  'daftar belanja mingguan pribadi agar tidak ada barang yang lupa dibeli',
  'pelacak target tabungan pribadi dan progres pengumpulan dana barang impian',
  'pencatat daftar buku yang sedang dibaca atau film yang ingin ditonton',
  'pengatur jadwal perawatan dan servis berkala kendaraan pribadi',
  'checklist barang bawaan sebelum bepergian atau liburan singkat',
] as const;

function sanitizeStringArray(input: unknown, maxItems = 25, maxLen = 100): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw Object.assign(
      new Error(
        'GEMINI_API_KEY belum tersedia di server. Periksa panel Settings > Secrets untuk mengatur API key.'
      ),
      { statusCode: 500 }
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractErrorStatus(error: unknown): number {
  const errObj = error as { status?: number; statusCode?: number; message?: string };
  if (typeof errObj?.statusCode === 'number') return errObj.statusCode;
  if (typeof errObj?.status === 'number') return errObj.status;
  const msg = errObj?.message || '';
  const match = msg.match(/"code"\s*:\s*(\d{3})/);
  if (match) return Number(match[1]);
  return 500;
}

function isTransientError(status: number, message: string): boolean {
  const upper = message.toUpperCase();
  return (
    status === 408 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    upper.includes('UNAVAILABLE') ||
    upper.includes('HIGH DEMAND') ||
    upper.includes('RESOURCE_EXHAUSTED') ||
    upper.includes('DEADLINE_EXCEEDED') ||
    upper.includes('INTERNAL') ||
    upper.includes('TIMEOUT') ||
    upper.includes('TIMED OUT') ||
    upper.includes('ECONNRESET') ||
    upper.includes('ETIMEDOUT') ||
    upper.includes('FETCH FAILED') ||
    upper.includes('SYNTAXERROR')
  );
}

function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(Object.assign(new Error(`${label} timed out after ${timeoutMs}ms`), { statusCode: 504 }));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function parseMissionJson(rawText: string) {
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  const jsonCandidate =
    firstBrace >= 0 && lastBrace > firstBrace
      ? cleaned.slice(firstBrace, lastBrace + 1)
      : cleaned;

  const parsed = JSON.parse(jsonCandidate) as {
    problemTitle?: string;
    problemDomain?: string;
    problemDescription?: string;
    problemIcon?: (typeof VALID_PROBLEM_ICONS)[number];
    userTitle?: string;
    userContext?: string;
    userDescription?: string;
    userIcon?: (typeof VALID_USER_ICONS)[number];
    solutionTitle?: string;
    solutionTag?: string;
    solutionHowTo?: string;
    solutionFeatures?: string[];
    solutionIcon?: (typeof VALID_SOLUTION_ICONS)[number];
    deviceId?: (typeof VALID_DEVICE_IDS)[number];
  };

  if (
    !parsed ||
    !String(parsed.problemTitle || '').trim() ||
    !String(parsed.userTitle || '').trim() ||
    !String(parsed.solutionTitle || '').trim() ||
    !String(parsed.solutionHowTo || '').trim()
  ) {
    throw new Error('Gemini returned incomplete mission fields.');
  }

  return parsed;
}

async function generateEverydayMission(
  previousIdeas: string[],
  participantName?: string
) {
  const ai = getAiClient();
  const categories = loadCategories();
  const liveDeviceIds = Array.from(
    new Set(
      categories.deviceTargets.length > 0
        ? categories.deviceTargets.map((d) => d.id)
        : [...VALID_DEVICE_IDS]
    )
  );

  const chosenTheme =
    EVERYDAY_THEMES[Math.floor(Math.random() * EVERYDAY_THEMES.length)];
  const randomNonce = Math.floor(100000 + Math.random() * 900000);

  const cohesiveTaskExamples = categories.tasks
    .slice(0, 8)
    .map(
      (task, idx) =>
        `  ${idx + 1}. Problem: "${task.problem.title}" -> App: "${task.solution.title}" -> User: "${task.targetUser.title}" -> Device: ${task.deviceTarget.id} (${task.deviceTarget.title})`
    )
    .join('\n');

  const uniqueDeviceHint = Array.from(
    new Map(categories.deviceTargets.map((d) => [d.id, `${d.id} (${d.title})`])).values()
  ).join(', ');

  const avoidText =
    previousIdeas.length > 0
      ? `JANGAN mengulang atau membuat ide yang mirip dengan daftar ide sebelumnya ini:\n- ${previousIdeas.join('\n- ')}`
      : 'Buat ide yang segar dan belum pernah dipakai sebelumnya.';

  const systemInstruction = `Kamu adalah perancang ide tantangan aplikasi sederhana untuk acara GDG Bogor bertema Vibe Coding bagi peserta NON-CODING (pemula tanpa latar belakang pemrograman).

Tugasmu: Buat SATU ide aplikasi pribadi yang SEDERHANA, KONKRET, dan pola penggunaannya (User Experience) SUDAH UMUM ADA dan terbukti dipakai orang sehari-hari.

Referensi paket tugas berkesinambungan (Problem -> App -> User -> Device) yang aktif di mesin ide:
${cohesiveTaskExamples}
- Pilihan deviceId yang tersedia: ${uniqueDeviceHint}

Aturan wajib:
1. SEDERHANA & SATU FUNGSI UTAMA: Pilih satu aplikasi pribadi yang jelas dan sederhana (misalnya: pencatat pengeluaran, to-do checklist, daftar belanja, pencari resep dari bahan kulkas, peringkas catatan & kartu kuis, pelacak tabungan, pengingat tagihan/vitamin, jadwal servis motor, atau daftar buku/film).
2. USER EXPERIENCE HARUS NYATA & LAZIM: Gunakan interaksi standar yang memang ada di aplikasi sungguhan — seperti mengetik input form singkat, mencentang checklist/daftar, memilih kategori atau filter, menempel teks untuk diringkas, mengunggah foto struk/bahan, atau melihat kalender/pengingat tanggal.
3. DILARANG KERAS MENGARANG UX ANEH: Jangan pernah membuat cara pakai yang tidak lazim, gimmicky, atau tidak pernah ada di dunia nyata (seperti merekam suara saat minum vitamin atau olahraga, aplikasi yang memuji-muji pengguna secara verbal setiap aktivitas, atau cara interaksi ajaib yang tidak masuk akal).
4. FOKUS PEMAKAIAN PRIBADI: Untuk dipakai sendiri sehari-hari. HINDARI aplikasi kasir/toko/UMKM, portal layanan publik, atau sistem perusahaan.
5. BAHASA AWAM & BEBAS ISTILAH TEKNIS: Gunakan bahasa Indonesia santai dan jelas. DILARANG memakai istilah coding/engineering (seperti API, database, backend, frontend, cloud, SQL, JSON, OCR, NLP, RAG, LLM, deploy, server, framework, microservice, webhook, auth).
6. Pastikan Problem, Target User, dan Aplikasi nyambung logis dan ringkas agar pas di layar proyektor:
   - problemTitle: maks 6 kata
   - problemDescription: 1-2 kalimat singkat (maks 130 karakter)
   - userTitle: maks 5 kata (contoh: "Pekerja Muda & Anak Kos", "Pelajar & Mahasiswa")
   - userDescription: 1-2 kalimat yang langsung menyebut masalah tadi (maks 145 karakter)
   - solutionTitle: maks 6 kata (nama aplikasi yang sederhana dan familiar)
   - solutionHowTo: 1-2 kalimat lugas tentang cara pakai aplikasi yang wajar dan sederhana (maks 175 karakter)
   - solutionFeatures: tepat 3 poin fitur nyata yang memang lazim ada di aplikasi tersebut, masing-masing maks 9 kata (maks 65 karakter per poin).`;

  const userPrompt = `Fokus tema aplikasi pribadi kali ini (variasi #${randomNonce}): ${chosenTheme}.
${participantName ? `Peserta yang sedang mendapat tantangan: ${participantName}.` : ''}
${avoidText}

Hasilkan 1 ide aplikasi pribadi yang sangat sederhana, cara pakainya lazim seperti aplikasi yang sudah ada di dunia nyata, dan bebas istilah coding.`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      problemTitle: { type: Type.STRING },
      problemDomain: { type: Type.STRING },
      problemDescription: { type: Type.STRING },
      problemIcon: { type: Type.STRING, enum: [...VALID_PROBLEM_ICONS] },
      userTitle: { type: Type.STRING },
      userContext: { type: Type.STRING },
      userDescription: { type: Type.STRING },
      userIcon: { type: Type.STRING, enum: [...VALID_USER_ICONS] },
      solutionTitle: { type: Type.STRING },
      solutionTag: { type: Type.STRING },
      solutionHowTo: { type: Type.STRING },
      solutionFeatures: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      solutionIcon: { type: Type.STRING, enum: [...VALID_SOLUTION_ICONS] },
      deviceId: { type: Type.STRING, enum: liveDeviceIds },
    },
    required: [
      'problemTitle',
      'problemDomain',
      'problemDescription',
      'problemIcon',
      'userTitle',
      'userContext',
      'userDescription',
      'userIcon',
      'solutionTitle',
      'solutionTag',
      'solutionHowTo',
      'solutionFeatures',
      'solutionIcon',
      'deviceId',
    ],
  };

  const modelAttempts: Array<{
    model: 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';
    thinkingLevel: ThinkingLevel;
    timeoutMs: number;
    backoffMs: number;
  }> = [
    { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW, timeoutMs: 10000, backoffMs: 200 },
    { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL, timeoutMs: 9000, backoffMs: 350 },
    { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW, timeoutMs: 11000, backoffMs: 500 },
    { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL, timeoutMs: 10000, backoffMs: 0 },
  ];

  let parsed: ReturnType<typeof parseMissionJson> | null = null;
  let lastError: unknown = null;

  for (const attempt of modelAttempts) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: attempt.model,
          contents: userPrompt,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: attempt.thinkingLevel },
            responseMimeType: 'application/json',
            responseSchema: schema,
          },
        }),
        attempt.timeoutMs,
        attempt.model
      );

      const rawText = response.text ?? '';
      if (!rawText.trim()) {
        throw Object.assign(new Error('Gemini returned empty response.'), { statusCode: 503 });
      }

      parsed = parseMissionJson(rawText);
      break;
    } catch (err: unknown) {
      lastError = err;
      const errStatus = extractErrorStatus(err);
      const errMsg = err instanceof Error ? err.message : String(err);
      const isAuthOrConfigErr =
        errStatus === 400 ||
        errStatus === 401 ||
        errStatus === 403 ||
        errMsg.includes('API_KEY');

      if (isAuthOrConfigErr || attempt.backoffMs === 0) {
        if (!isTransientError(errStatus, errMsg) && attempt.backoffMs === 0) {
          throw err;
        }
        if (isAuthOrConfigErr) {
          throw err;
        }
      }
      if (attempt.backoffMs > 0) {
        await delayMs(attempt.backoffMs);
      }
    }
  }

  if (!parsed) {
    throw lastError ?? new Error('Gemini tidak mengembalikan data misi. Silakan coba spin ulang.');
  }

  const features = Array.isArray(parsed.solutionFeatures)
    ? parsed.solutionFeatures.map((f) => String(f).trim()).filter(Boolean).slice(0, 3)
    : [];

  while (features.length < 3) {
    features.push('Tampilan sederhana yang langsung bisa dipakai');
  }

  const stamp = Date.now().toString(36);

  const categoriesForDevice = loadCategories().deviceTargets;
  const fallbackDeviceId = categoriesForDevice[0]?.id || 'mobile';
  const matchedDeviceId =
    parsed.deviceId && categoriesForDevice.some((d) => d.id === parsed.deviceId)
      ? parsed.deviceId
      : fallbackDeviceId;

  return {
    problem: {
      id: `ai-prob-${stamp}`,
      icon: parsed.problemIcon && VALID_PROBLEM_ICONS.includes(parsed.problemIcon)
        ? parsed.problemIcon
        : 'home',
      title: String(parsed.problemTitle || '').trim(),
      domain: String(parsed.problemDomain || 'Kebutuhan Sehari-hari').trim(),
      shortNoun: String(parsed.problemTitle || '').trim().toLowerCase(),
      description: String(parsed.problemDescription || '').trim(),
    },
    targetUser: {
      id: `ai-user-${stamp}`,
      icon: parsed.userIcon && VALID_USER_ICONS.includes(parsed.userIcon)
        ? parsed.userIcon
        : 'users',
      title: String(parsed.userTitle || '').trim(),
      shortPersona: String(parsed.userTitle || '').trim().toLowerCase(),
      context: String(parsed.userContext || 'Kebutuhan Harian · Praktis').trim(),
      description: String(parsed.userDescription || '').trim(),
      contextualDescription: String(parsed.userDescription || '').trim(),
    },
    solution: {
      id: `ai-sol-${stamp}`,
      icon: parsed.solutionIcon && VALID_SOLUTION_ICONS.includes(parsed.solutionIcon)
        ? parsed.solutionIcon
        : 'camera',
      title: String(parsed.solutionTitle || '').trim(),
      techStack: String(parsed.solutionTag || 'Praktis · Bantuan AI').trim(),
      howToBuild: String(parsed.solutionHowTo || '').trim(),
      coreFeatures: features,
      contextualHowToBuild: String(parsed.solutionHowTo || '').trim(),
      contextualFeatures: features,
    },
    deviceId: matchedDeviceId,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.get('/api/categories', (_req: Request, res: Response) => {
    const categories = loadCategories();
    res.json({ categories });
  });

  app.get('/api/admin/status', (_req: Request, res: Response) => {
    res.json(getAdminStatus());
  });

  app.post('/api/admin/bootstrap', (req: Request, res: Response) => {
    const status = getAdminStatus();
    if (status.source !== 'unclaimed') {
      res.status(409).json({
        error: 'PIN admin sudah aktif. Silakan masukkan PIN untuk masuk.',
      });
      return;
    }

    const body = (req.body ?? {}) as { pin?: unknown; password?: unknown };
    const pin = String(body.pin ?? body.password ?? '').trim();

    if (!/^\d{6}$/.test(pin)) {
      res.status(400).json({
        error: 'PIN admin harus terdiri dari 6 digit angka.',
      });
      return;
    }

    try {
      ensureDataDir();
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.scryptSync(pin, salt, 64).toString('hex');
      const payload: StoredAdminCredential = {
        username: 'admin',
        salt,
        hash,
        claimedAt: new Date().toISOString(),
      };
      fs.writeFileSync(ADMIN_AUTH_FILE, JSON.stringify(payload, null, 2), {
        encoding: 'utf8',
        flag: 'wx',
      });
      const token = signAdminToken('admin');
      res.status(201).json({ token, username: 'admin' });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'EEXIST') {
        res.status(409).json({ error: 'PIN admin sudah aktif sebelumnya.' });
        return;
      }
      console.error('[/api/admin/bootstrap error]:', err);
      res.status(500).json({ error: 'Gagal menyimpan PIN admin.' });
    }
  });

  app.post('/api/admin/login', (req: Request, res: Response) => {
    const ipKey = req.ip || 'unknown';
    if (!checkLoginRateLimit(ipKey)) {
      res.status(429).json({
        error: 'Terlalu banyak percobaan PIN salah. Coba lagi dalam beberapa menit.',
      });
      return;
    }

    const status = getAdminStatus();
    if (status.source === 'unclaimed') {
      res.status(412).json({
        error: 'PIN admin belum diatur. Silakan buat PIN 6 digit terlebih dahulu.',
      });
      return;
    }

    const body = (req.body ?? {}) as { pin?: unknown; password?: unknown };
    const pinInput = String(body.pin ?? body.password ?? '').trim();

    if (!/^\d{4,12}$/.test(pinInput)) {
      res.status(400).json({ error: 'Masukkan PIN angka yang valid.' });
      return;
    }

    let valid = false;

    if (status.source === 'env') {
      const expectedPin =
        process.env.ADMIN_PIN?.trim() || process.env.ADMIN_PASSWORD?.trim() || '';
      const inputDigest = crypto.createHash('sha256').update(pinInput).digest();
      const expectedDigest = crypto.createHash('sha256').update(expectedPin).digest();
      valid = crypto.timingSafeEqual(inputDigest, expectedDigest);
    } else {
      const claimed = loadClaimedAdmin();
      if (claimed) {
        const derivedBuf = crypto.scryptSync(pinInput, claimed.salt, 64);
        const storedBuf = Buffer.from(claimed.hash, 'hex');
        valid =
          derivedBuf.length === storedBuf.length &&
          crypto.timingSafeEqual(derivedBuf, storedBuf);
      }
    }

    if (!valid) {
      recordLoginFailure(ipKey);
      res.status(401).json({ error: 'PIN admin tidak sesuai.' });
      return;
    }

    clearLoginFailures(ipKey);
    const token = signAdminToken('admin');
    res.json({ token, username: 'admin' });
  });

  app.get('/api/admin/me', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({ authenticated: true, username: req.adminUser });
  });

  app.post('/api/admin/logout', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.post(
    '/api/admin/tasks',
    requireAdminAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const body = (req.body ?? {}) as {
        problem?: Record<string, unknown>;
        solution?: Record<string, unknown>;
        targetUser?: Record<string, unknown>;
        deviceTarget?: Record<string, unknown>;
      };

      const probTitle = cleanText(body.problem?.title, 80);
      const probDesc = cleanText(body.problem?.description, 240);
      const solTitle = cleanText(body.solution?.title, 80);
      const solHowTo = cleanText(body.solution?.howToBuild ?? body.solution?.description, 240);
      const userTitle = cleanText(body.targetUser?.title, 80);
      const userDesc = cleanText(body.targetUser?.description, 240);
      const devTitle = cleanText(body.deviceTarget?.title, 80);
      const devDesc = cleanText(body.deviceTarget?.description, 240);
      const devPresetId = cleanText(body.deviceTarget?.presetId, 40);

      if (
        !probTitle ||
        !probDesc ||
        !solTitle ||
        !solHowTo ||
        !userTitle ||
        !userDesc ||
        !devTitle ||
        !devDesc
      ) {
        res.status(400).json({
          error: 'Semua 4 langkah (Problem, App, User, Device) wajib diisi lengkap secara berurutan.',
        });
        return;
      }

      const rawFeatures = Array.isArray(body.solution?.coreFeatures)
        ? body.solution?.coreFeatures
        : typeof body.solution?.coreFeatures === 'string'
          ? body.solution.coreFeatures.split(/\r?\n|,/)
          : [];
      const coreFeatures = rawFeatures
        .map((f) => cleanText(f, 90))
        .filter(Boolean)
        .slice(0, 4);
      if (coreFeatures.length === 0) {
        coreFeatures.push('Langkah praktis berbasis AI yang langsung mudah dipakai');
      }

      const matchedPresetDevice = DEFAULT_CATEGORIES.deviceTargets.find(
        (d) => d.id === devPresetId
      );

      const newTask: StoredTaskBundle = {
        id: slugifyId(probTitle, 'task'),
        problem: {
          id: slugifyId(probTitle, 'prob'),
          icon: 'home',
          title: probTitle,
          domain: 'Kehidupan Sehari-hari',
          shortNoun: probTitle.toLowerCase(),
          description: probDesc,
        },
        solution: {
          id: slugifyId(solTitle, 'sol'),
          icon: 'camera',
          title: solTitle,
          techStack: 'Praktis · Bantuan AI',
          howToBuild: solHowTo,
          coreFeatures,
        },
        targetUser: {
          id: slugifyId(userTitle, 'user'),
          icon: 'users',
          title: userTitle,
          shortPersona: userTitle.toLowerCase(),
          context: 'Kebutuhan Harian · Praktis',
          description: userDesc,
        },
        deviceTarget: matchedPresetDevice
          ? {
              ...matchedPresetDevice,
              title: devTitle,
              description: devDesc,
            }
          : {
              id: slugifyId(devTitle, 'dev'),
              icon: 'smartphone',
              title: devTitle,
              badgeLabel: 'Layar Fleksibel',
              layoutHint: 'Tampilan Bersih · Mudah Dipakai',
              description: devDesc,
            },
      };

      const store = loadCategories();
      const updatedStore = deriveStoreFromTasks([newTask, ...store.tasks]);
      saveCategories(updatedStore);
      res.status(201).json({ task: newTask, categories: updatedStore });
    }
  );

  app.delete(
    '/api/admin/tasks/:id',
    requireAdminAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const taskId = cleanText(req.params.id, 80);
      if (!taskId) {
        res.status(400).json({ error: 'ID paket tugas tidak valid.' });
        return;
      }

      const store = loadCategories();
      if (store.tasks.length <= 1) {
        res.status(400).json({
          error: 'Minimal harus tersisa 1 paket tugas agar mesin ide tetap berjalan.',
        });
        return;
      }

      const nextTasks = store.tasks.filter((t) => t.id !== taskId);
      if (nextTasks.length === store.tasks.length) {
        res.status(404).json({ error: 'Paket tugas tidak ditemukan.' });
        return;
      }

      const updatedStore = deriveStoreFromTasks(nextTasks);
      saveCategories(updatedStore);
      res.json({ categories: updatedStore });
    }
  );

  app.post(
    '/api/admin/categories/:category',
    requireAdminAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const { category } = req.params;
      if (!isValidCategoryKey(category)) {
        res.status(400).json({ error: 'Kategori tidak valid.' });
        return;
      }
      res.status(400).json({
        error: 'Gunakan endpoint paket tugas (/api/admin/tasks) agar Problem, App, User, dan Device tetap berkesinambungan.',
      });
    }
  );

  app.post('/api/generate-mission', async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as {
        previousIdeas?: unknown;
        participantName?: unknown;
      };
      const previousIdeas = sanitizeStringArray(body.previousIdeas, 25, 100);
      const participantName =
        typeof body.participantName === 'string'
          ? body.participantName.trim().slice(0, 60)
          : undefined;

      const mission = await generateEverydayMission(previousIdeas, participantName);
      res.json({ mission });
    } catch (error: unknown) {
      const status = extractErrorStatus(error);
      const rawMessage =
        error instanceof Error ? error.message : 'Gagal menghasilkan ide dari Gemini.';

      let clientMessage = 'Gagal membuat ide baru dari Gemini. Silakan coba Spin lagi.';
      if (status === 400 || status === 401 || status === 403 || rawMessage.includes('API_KEY')) {
        clientMessage =
          'Kunci API Gemini belum aktif atau tidak valid. Periksa pengaturannya di panel Settings > Secrets.';
      } else if (status === 429 || rawMessage.includes('RESOURCE_EXHAUSTED')) {
        clientMessage =
          'Batas permintaan Gemini sedang penuh sementara. Tunggu beberapa detik lalu coba Spin lagi.';
      } else if (status === 503 || rawMessage.includes('UNAVAILABLE') || rawMessage.includes('high demand')) {
        clientMessage =
          'Server Gemini sedang sibuk sementara. Silakan tekan Spin lagi dalam beberapa detik.';
      } else if (status === 404) {
        clientMessage = 'Layanan model Gemini tidak ditemukan. Silakan coba lagi sebentar lagi.';
      }

      console.error('[/api/generate-mission error]:', rawMessage);
      res.status(status >= 400 && status < 600 ? status : 500).json({
        error: clientMessage,
      });
    }
  });

  if (!IS_PRODUCTION) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Idea Machine server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
