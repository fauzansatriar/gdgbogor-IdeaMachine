export type PoolIconName =
  | 'utensils'
  | 'hospital'
  | 'recycle'
  | 'wallet'
  | 'cloud-rain'
  | 'file-text'
  | 'store'
  | 'graduation-cap'
  | 'train'
  | 'home'
  | 'users'
  | 'camera'
  | 'globe'
  | 'radio'
  | 'mic'
  | 'calculator'
  | 'calendar'
  | 'shopping-bag'
  | 'heart-pulse'
  | 'car'
  | 'book-open'
  | 'bell'
  | 'smartphone'
  | 'laptop'
  | 'tablet'
  | 'monitor-smartphone';

export interface ProblemItem {
  id: string;
  icon: PoolIconName;
  title: string;
  domain: string;
  shortNoun: string;
  description: string;
}

export interface TargetUserItem {
  id: string;
  icon: PoolIconName;
  title: string;
  shortPersona: string;
  context: string;
  description: string;
}

export interface SolutionItem {
  id: string;
  icon: PoolIconName;
  title: string;
  techStack: string;
  howToBuild: string;
  coreFeatures: string[];
}

export interface DeviceTargetItem {
  id: string;
  icon: PoolIconName;
  title: string;
  badgeLabel: string;
  layoutHint: string;
  description: string;
}

export interface ContextualMission {
  problem: ProblemItem;
  targetUser: TargetUserItem & {
    contextualDescription: string;
  };
  solution: SolutionItem & {
    contextualHowToBuild: string;
    contextualFeatures: string[];
  };
  device: DeviceTargetItem;
}

export interface ChallengeCombination {
  problemId: string;
  userId: string;
  solutionId: string;
  deviceId: string;
  mission?: ContextualMission;
}

export interface ParticipantSlot {
  number: 1 | 2 | 3 | 4 | 5;
  name: string;
  challenge: ChallengeCombination | null;
  lockedAt: string | null;
}

export const PROBLEMS: ProblemItem[] = [
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
];

export const TARGET_USERS: TargetUserItem[] = [
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
];

export const SOLUTIONS: SolutionItem[] = [
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
];

export const DEVICE_TARGETS: DeviceTargetItem[] = [
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
];

/**
 * Generates contextual, continuous narrative bridging:
 * Problem (Reel 1) -> Target User (Reel 2) -> Detailed App Solution (Reel 3)
 */
export function buildContextualMission(
  problem: ProblemItem,
  user: TargetUserItem,
  solution: SolutionItem,
  device: DeviceTargetItem
) {
  const userDescription = `${user.description} Mereka sering menghadapi masalah ${problem.shortNoun}.`;

  let howToBuild = '';
  let coreFeatures: string[] = [];

  switch (solution.id) {
    case 'vision-maps':
      howToBuild = `Buat aplikasi untuk ${user.shortPersona} agar cukup memotret kondisi ${problem.shortNoun}. AI otomatis membaca foto dan memberi saran langkah, lalu peta menunjukkan lokasi tujuan terdekat.`;
      coreFeatures = [
        `Foto langsung situasi terkait ${problem.title.toLowerCase()}`,
        `Saran langkah praktis dari AI untuk ${user.shortPersona}`,
        'Peta lokasi & arah ke tempat terdekat',
      ];
      break;
    case 'search-cloudrun':
      howToBuild = `Buat aplikasi untuk ${user.shortPersona} yang otomatis mencari info terbaru soal ${problem.shortNoun}, menyaring hal penting, lalu merangkum langkah cepat yang mudah dipahami.`;
      coreFeatures = [
        `Pencarian info terbaru soal ${problem.title.toLowerCase()}`,
        `Ringkasan singkat yang gampang dibaca ${user.shortPersona}`,
        'Checklist tindakan yang mudah dibagikan',
      ];
      break;
    case 'firestore-triage':
      howToBuild = `Buat papan laporan bersama untuk ${user.shortPersona} seputar ${problem.shortNoun}. AI otomatis memilah laporan mana yang paling mendesak dan menampilkannya langsung di layar.`;
      coreFeatures = [
        `Kirim laporan cepat soal ${problem.title.toLowerCase()}`,
        'AI otomatis mengelompokkan & menandai yang penting',
        `Papan pantau bersama untuk ${user.shortPersona}`,
      ];
      break;
    case 'voice-handsfree':
      howToBuild = `Buat asisten suara agar ${user.shortPersona} cukup berbicara saat sibuk mengurus ${problem.shortNoun}. AI mengerti perintah suara, membantu mencatat atau menghitung, lalu menjawab lewat suara.`;
      coreFeatures = [
        `Bicara langsung tanpa mengetik untuk atasi ${problem.title.toLowerCase()}`,
        'Otomatis mencatat, menghitung, atau mencari info',
        `Jawaban suara ringkas plus teks untuk ${user.shortPersona}`,
      ];
      break;
    case 'structured-estimator':
    default:
      howToBuild = `Buat aplikasi untuk ${user.shortPersona} yang mengubah foto catatan atau teks acak soal ${problem.shortNoun} menjadi daftar & tabel rapi lengkap dengan hitungan biaya atau waktu.`;
      coreFeatures = [
        `Upload foto catatan atau tempel teks soal ${problem.title.toLowerCase()}`,
        'Otomatis dirapikan jadi daftar & hitungan jelas',
        `Saran hemat waktu atau biaya bagi ${user.shortPersona}`,
      ];
      break;
  }

  return {
    problem,
    targetUser: {
      ...user,
      contextualDescription: userDescription,
    },
    solution: {
      ...solution,
      contextualHowToBuild: howToBuild,
      contextualFeatures: coreFeatures,
    },
    device,
  };
}

export function getProblemById(id: string): ProblemItem {
  return PROBLEMS.find((p) => p.id === id) ?? PROBLEMS[0];
}

export function getTargetUserById(id: string): TargetUserItem {
  return TARGET_USERS.find((u) => u.id === id) ?? TARGET_USERS[0];
}

export function getSolutionById(id: string): SolutionItem {
  return SOLUTIONS.find((s) => s.id === id) ?? SOLUTIONS[0];
}

export function getDeviceById(id: string): DeviceTargetItem {
  return DEVICE_TARGETS.find((d) => d.id === id) ?? DEVICE_TARGETS[0];
}

export function resolveChallengeMission(
  challenge: ChallengeCombination
): ContextualMission {
  if (challenge.mission) {
    return challenge.mission;
  }
  return buildContextualMission(
    getProblemById(challenge.problemId),
    getTargetUserById(challenge.userId),
    getSolutionById(challenge.solutionId),
    getDeviceById(challenge.deviceId)
  );
}
