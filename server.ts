import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

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

  const chosenTheme =
    EVERYDAY_THEMES[Math.floor(Math.random() * EVERYDAY_THEMES.length)];
  const randomNonce = Math.floor(100000 + Math.random() * 900000);

  const avoidText =
    previousIdeas.length > 0
      ? `JANGAN mengulang atau membuat ide yang mirip dengan daftar ide sebelumnya ini:\n- ${previousIdeas.join('\n- ')}`
      : 'Buat ide yang segar dan belum pernah dipakai sebelumnya.';

  const systemInstruction = `Kamu adalah perancang tantangan aplikasi AI untuk acara GDG Bogor bertema Vibe Coding bagi peserta NON-CODING (tidak punya latar belakang pemrograman).

Tugasmu: Buat SATU ide aplikasi baru yang benar-benar dibutuhkan dalam KEHIDUPAN SEHARI-HARI masyarakat Indonesia.

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
      deviceId: { type: Type.STRING, enum: [...VALID_DEVICE_IDS] },
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
    deviceId: parsed.deviceId && VALID_DEVICE_IDS.includes(parsed.deviceId)
      ? parsed.deviceId
      : 'mobile',
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

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
