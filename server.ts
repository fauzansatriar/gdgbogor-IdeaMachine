import 'dotenv/config';
import crypto from 'crypto';
import express, { NextFunction, Request, Response } from 'express';
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
  'radio',
  'mic',
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
      id: 'food-waste',
      icon: 'utensils',
      title: 'Stok Makanan Sering Terbuang',
      domain: 'Kehidupan Sehari-hari',
      shortNoun: 'bahan makanan di kulkas yang sering lupa dimasak sampai basi',
      description:
        'Makanan di rumah atau usaha sering keburu basi karena lupa stoknya dan bingung mau diolah jadi apa.',
    },
    {
      id: 'queue-service',
      icon: 'hospital',
      title: 'Antrean Panjang & Bingung Syarat',
      domain: 'Layanan Umum',
      shortNoun: 'antrean layanan yang lama dan syarat dokumen yang membingungkan',
      description:
        'Banyak waktu terbuang di ruang tunggu karena tidak tahu perkiraan giliran dan berkas apa yang harus disiapkan.',
    },
    {
      id: 'waste-sorting',
      icon: 'recycle',
      title: 'Bingung Pilah Sampah & Daur Ulang',
      domain: 'Lingkungan Sekitar',
      shortNoun: 'cara memilah sampah yang benar dan mencari tempat setor daur ulang',
      description:
        'Orang sering ragu mana sampah yang bisa didaur ulang dan tidak tahu harus setor ke mana.',
    },
    {
      id: 'cashflow-stock',
      icon: 'wallet',
      title: 'Catatan Uang & Stok Berantakan',
      domain: 'Usaha & Harian',
      shortNoun: 'catatan pemasukan, pengeluaran, dan sisa barang yang tercecer',
      description:
        'Mencatat uang masuk-keluar di kertas atau chat bikin pusing saat mau cek untung dan sisa barang.',
    },
    {
      id: 'weather-mobility',
      icon: 'cloud-rain',
      title: 'Cuaca Mendadak & Macet di Jalan',
      domain: 'Perjalanan Harian',
      shortNoun: 'hujan deras, genangan, dan macet mendadak saat di perjalanan',
      description:
        'Perjalanan sering terganggu hujan atau rute macet tanpa tahu jalur alternatif yang lebih aman.',
    },
    {
      id: 'info-overload',
      icon: 'file-text',
      title: 'Bacaan & Catatan Terlalu Panjang',
      domain: 'Belajar & Kerja',
      shortNoun: 'dokumen tebal, catatan rapat, atau materi belajar yang panjang',
      description:
        'Teks dan catatan yang terlalu panjang bikin malas baca dan sulit tahu langkah apa yang harus dilakukan dulu.',
    },
  ],
  targetUsers: [
    {
      id: 'umkm-owner',
      icon: 'store',
      title: 'Pemilik Usaha Kecil & Pedagang',
      shortPersona: 'pemilik usaha kecil',
      context: 'Sibuk · Butuh Cepat & Simpel',
      description:
        'Pemilik warung atau toko yang mengurus semuanya sendiri dan butuh aplikasi praktis tanpa belajar hal rumit.',
    },
    {
      id: 'students',
      icon: 'graduation-cap',
      title: 'Pelajar & Mahasiswa',
      shortPersona: 'pelajar dan mahasiswa',
      context: 'Aktif · Hemat Waktu',
      description:
        'Anak sekolah atau kuliah yang butuh info cepat, ringkas, dan gampang dipakai di sela jadwal padat.',
    },
    {
      id: 'commuters',
      icon: 'train',
      title: 'Pekerja yang Sering di Jalan',
      shortPersona: 'pekerja yang aktif di jalan',
      context: 'Buru-buru · Pakai Sambil Jalan',
      description:
        'Orang yang sering mengambil keputusan cepat di perjalanan dan butuh panduan yang langsung jelas.',
    },
    {
      id: 'young-families',
      icon: 'home',
      title: 'Keluarga Muda & Ibu Rumah Tangga',
      shortPersona: 'keluarga muda di rumah',
      context: 'Kebutuhan Rumah · Praktis',
      description:
        'Pengurus rumah tangga yang mengatur belanja, jadwal keluarga, dan pengeluaran rutin tiap minggu.',
    },
    {
      id: 'community-volunteers',
      icon: 'users',
      title: 'Warga & Relawan Komunitas',
      shortPersona: 'warga dan relawan komunitas',
      context: 'Gotong Royong · Saling Bantu',
      description:
        'Warga atau relawan yang ingin mengumpulkan dan membagikan informasi penting ke banyak orang dengan cepat.',
    },
  ],
  solutions: [
    {
      id: 'vision-maps',
      icon: 'camera',
      title: 'Aplikasi Foto Cerdas & Peta Terdekat',
      techStack: 'Baca Foto AI · Peta Lokasi',
      howToBuild:
        'Pengguna cukup foto situasi di depannya, AI langsung baca fotonya dan kasih saran, lalu peta menunjukkan lokasi tujuan terdekat.',
      coreFeatures: [
        'Foto langsung pakai kamera HP atau upload gambar',
        'AI membaca foto lalu memberi saran langkah yang jelas',
        'Menampilkan titik lokasi terdekat di peta',
      ],
    },
    {
      id: 'search-cloudrun',
      icon: 'globe',
      title: 'Asisten Pencari Info & Peringatan Cepat',
      techStack: 'Cari Info Terbaru · Ringkasan AI',
      howToBuild:
        'Aplikasi mencari informasi terbaru secara otomatis, menyaring mana yang paling penting, lalu merangkumnya jadi panduan singkat.',
      coreFeatures: [
        'Cari kabar dan info terbaru secara otomatis',
        'Merangkum situasi penting agar langsung paham',
        'Checklist langkah cepat yang bisa dibagikan',
      ],
    },
    {
      id: 'firestore-triage',
      icon: 'radio',
      title: 'Papan Laporan Bareng & Pilah Otomatis',
      techStack: 'Update Langsung · Pilah Prioritas AI',
      howToBuild:
        'Siapa saja bisa kirim laporan singkat, AI otomatis mengelompokkan mana yang paling mendesak, lalu langsung tampil di papan bersama.',
      coreFeatures: [
        'Form kirim laporan cepat hanya dalam 10 detik',
        'AI otomatis menandai laporan mana yang paling penting',
        'Papan pantau bersama yang langsung terupdate',
      ],
    },
    {
      id: 'voice-handsfree',
      icon: 'mic',
      title: 'Asisten Suara (Ngomong Langsung)',
      techStack: 'Perintah Suara · Jawaban Suara AI',
      howToBuild:
        'Pengguna tinggal ngomong saat tangan lagi sibuk, AI mengerti maksudnya, membantu mencatat atau menghitung, lalu menjawab lewat suara.',
      coreFeatures: [
        'Tombol rekam suara besar yang gampang dipencet',
        'AI langsung mencatat, menghitung, atau menjawab pertanyaan',
        'Teks ringkas di layar untuk cek ulang hasil',
      ],
    },
    {
      id: 'structured-estimator',
      icon: 'calculator',
      title: 'Perapi Catatan & Penghitung Otomatis',
      techStack: 'Baca Catatan · Hitung Perkiraan',
      howToBuild:
        'Foto catatan berantakan, struk belanja, atau tempel teks panjang—aplikasi langsung merapikannya jadi tabel jelas plus hitungan biaya atau waktu.',
      coreFeatures: [
        'Upload foto catatan kertas atau tempel teks apa adanya',
        'Otomatis berubah jadi daftar & tabel yang rapi',
        'Menghitung perkiraan biaya, waktu, atau penghematan',
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
        'Didesain khusus untuk layar HP dengan tombol besar dan menu sederhana yang gampang dipencet pakai jempol.',
    },
    {
      id: 'desktop',
      icon: 'laptop',
      title: 'Layar Laptop',
      badgeLabel: 'Layar Lebar',
      layoutHint: 'Tampilan Lega · Banyak Info Sekaligus',
      description:
        'Memanfaatkan layar laptop yang lebar agar daftar, peta, dan ringkasan bisa dilihat berdampingan dengan nyaman.',
    },
    {
      id: 'tablet-kiosk',
      icon: 'tablet',
      title: 'Layar Tablet / Meja',
      badgeLabel: 'Layar Sentuh Bersama',
      layoutHint: 'Huruf Besar · Jelas Dibaca Bareng',
      description:
        'Tampilan bersih dengan tulisan dan tombol besar, cocok ditaruh di meja kasir, ruang tunggu, atau posko warga.',
    },
    {
      id: 'cross-platform',
      icon: 'monitor-smartphone',
      title: 'HP & Laptop',
      badgeLabel: 'Rapi di Semua Layar',
      layoutHint: 'Satu Link · Otomatis Menyesuaikan',
      description:
        'Enak dibuka dari HP saat sedang di luar, dan tetap rapi serta lega saat dibuka di laptop.',
    },
  ],
};

const DEFAULT_TASKS: StoredTaskBundle[] = [
  {
    id: 'task-food-kitchen',
    problem: DEFAULT_CATEGORIES.problems[0],
    solution: DEFAULT_CATEGORIES.solutions[0],
    targetUser: DEFAULT_CATEGORIES.targetUsers[3],
    deviceTarget: DEFAULT_CATEGORIES.deviceTargets[0],
  },
  {
    id: 'task-umkm-cashflow',
    problem: DEFAULT_CATEGORIES.problems[3],
    solution: DEFAULT_CATEGORIES.solutions[4],
    targetUser: DEFAULT_CATEGORIES.targetUsers[0],
    deviceTarget: DEFAULT_CATEGORIES.deviceTargets[3],
  },
  {
    id: 'task-commuter-weather',
    problem: DEFAULT_CATEGORIES.problems[4],
    solution: DEFAULT_CATEGORIES.solutions[1],
    targetUser: DEFAULT_CATEGORIES.targetUsers[2],
    deviceTarget: DEFAULT_CATEGORIES.deviceTargets[0],
  },
  {
    id: 'task-student-notes',
    problem: DEFAULT_CATEGORIES.problems[5],
    solution: DEFAULT_CATEGORIES.solutions[3],
    targetUser: DEFAULT_CATEGORIES.targetUsers[1],
    deviceTarget: DEFAULT_CATEGORIES.deviceTargets[1],
  },
  {
    id: 'task-community-queue',
    problem: DEFAULT_CATEGORIES.problems[1],
    solution: DEFAULT_CATEGORIES.solutions[2],
    targetUser: DEFAULT_CATEGORIES.targetUsers[4],
    deviceTarget: DEFAULT_CATEGORIES.deviceTargets[2],
  },
];

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
  'belanja harian, isi kulkas, dan rencana menu masak keluarga',
  'pengeluaran rumah tangga, patungan kos/arisan, dan pencatatan struk belanja',
  'jadwal minum obat keluarga, antrean puskesmas, dan catatan kesehatan lansia atau anak',
  'pendamping belajar anak sekolah, jadwal les, dan merapikan catatan pelajaran',
  'perawatan motor atau mobil harian, pajak kendaraan, dan rute aman saat hujan atau macet',
  'pilah sampah rumah tangga, jadwal iuran atau ronda warga, dan gotong royong komplek',
  'kelola pesanan katering rumahan, warung kelontong, atau laundry kiloan harian',
  'mencari tukang servis rumah terpercaya, garansi barang elektronik, dan checklist pindahan atau acara keluarga',
  'pengingat tagihan listrik/air, jadwal servis AC, dan pembagian tugas bersih-bersih rumah',
  'rencana bekal kerja atau sekolah, daftar titipan belanja pasar, dan pengingat tanggal kedaluwarsa di dapur',
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

  const systemInstruction = `Kamu adalah perancang tantangan aplikasi AI untuk acara GDG Bogor bertema Vibe Coding bagi peserta NON-CODING (tidak punya latar belakang pemrograman).

Tugasmu: Buat SATU ide aplikasi baru yang benar-benar dibutuhkan dalam KEHIDUPAN SEHARI-HARI masyarakat Indonesia.

Referensi paket tugas berkesinambungan (Problem -> App -> User -> Device) yang aktif di mesin ide:
${cohesiveTaskExamples}
- Pilihan deviceId yang tersedia: ${uniqueDeviceHint}

Aturan wajib:
1. Topik HARUS seputar kebutuhan sehari-hari yang nyata, membumi, dan langsung terbayang manfaatnya (rumah tangga, belanja pasar/warung, masak/kulkas, kesehatan keluarga, antar-jemput/perjalanan, belajar anak, iuran warga/kos, atau usaha kecil harian).
2. Bahasa Indonesia santai, ramah, dan MUDAH DIMENGERTI orang awam non-coding.
3. DILARANG KERAS memakai istilah teknis coding/engineering (seperti API, database, backend, frontend, cloud, SQL, JSON, OCR, NLP, RAG, LLM, deploy, server, framework, microservice, webhook, auth).
4. Ceritakan cara kerja AI dengan bahasa sehari-hari (contoh: "cukup foto struk belanja...", "tinggal ngomong lewat suara...", "tempel catatan chat yang berantakan...").
5. Pastikan Problem, Target User, dan Aplikasi saling terhubung erat membentuk satu cerita yang utuh dan masuk akal.
6. Jaga teks ringkas dan padat agar nyaman dibaca di layar proyektor dan muat di QR code:
   - problemTitle: maks 6 kata
   - problemDescription: 1-2 kalimat singkat (maks 130 karakter)
   - userTitle: maks 5 kata
   - userDescription: 1-2 kalimat yang langsung menyebut masalah tadi (maks 145 karakter)
   - solutionTitle: maks 6 kata
   - solutionHowTo: 1-2 kalimat jelas untuk vibe coder tentang aplikasi apa yang dibuat (maks 175 karakter)
   - solutionFeatures: tepat 3 poin fitur praktis, masing-masing maks 9 kata (maks 65 karakter per poin).`;

  const userPrompt = `Fokus tema kali ini (variasi #${randomNonce}): ${chosenTheme}.
${participantName ? `Peserta yang sedang mendapat tantangan: ${participantName}.` : ''}
${avoidText}

Hasilkan 1 tantangan aplikasi kebutuhan sehari-hari yang unik, kreatif, praktis, dan 100% bebas istilah coding.`;

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
