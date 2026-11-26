import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  LogOut,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  CategoryPools,
  DEVICE_TARGETS,
  TaskBundle,
} from '../data/pools';

interface AdminDashboardViewProps {
  categories: CategoryPools;
  adminToken: string | null;
  adminUsername: string | null;
  onAuthSuccess: (token: string, username: string) => void;
  onLogout: () => void;
  onCategoriesChange: (next: CategoryPools) => void;
  onBackToCover: () => void;
  onNotify: (message: string, tone?: 'info' | 'warning' | 'success') => void;
}

interface AdminStatusResponse {
  configured: boolean;
  source: 'env' | 'claimed' | 'unclaimed';
  usernameHint: string;
}

type StepIndex = 0 | 1 | 2 | 3;

const STEPS: Array<{
  index: StepIndex;
  code: string;
  title: string;
  accent: string;
  softBg: string;
}> = [
  {
    index: 0,
    code: '01',
    title: 'The Problem',
    accent: '#EA4335',
    softBg: '#FEE2E2',
  },
  {
    index: 1,
    code: '02',
    title: 'The App',
    accent: '#1E8E3E',
    softBg: '#E6F4EA',
  },
  {
    index: 2,
    code: '03',
    title: 'The User',
    accent: '#1A73E8',
    softBg: '#E8F0FE',
  },
  {
    index: 3,
    code: '04',
    title: 'The Device',
    accent: '#D97706',
    softBg: '#FEF3C7',
  },
];

export function AdminDashboardView({
  categories,
  adminToken,
  adminUsername,
  onAuthSuccess,
  onLogout,
  onCategoriesChange,
  onBackToCover,
  onNotify,
}: AdminDashboardViewProps) {
  const [statusLoading, setStatusLoading] = useState(!adminToken);
  const [authStatus, setAuthStatus] = useState<AdminStatusResponse>({
    configured: true,
    source: 'env',
    usernameHint: 'admin',
  });

  const [pinInput, setPinInput] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState<StepIndex>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMutating, setIsMutating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sequential 4-part fields for 1 cohesive task
  const [problemTitle, setProblemTitle] = useState('');
  const [problemDesc, setProblemDesc] = useState('');

  const [appTitle, setAppTitle] = useState('');
  const [appHowTo, setAppHowTo] = useState('');
  const [appFeatures, setAppFeatures] = useState('');

  const [userTitle, setUserTitle] = useState('');
  const [userDesc, setUserDesc] = useState('');

  const [devicePresetId, setDevicePresetId] = useState<string>(DEVICE_TARGETS[0].id);
  const [deviceTitle, setDeviceTitle] = useState<string>(DEVICE_TARGETS[0].title);
  const [deviceDesc, setDeviceDesc] = useState<string>(DEVICE_TARGETS[0].description);

  useEffect(() => {
    if (adminToken) {
      setStatusLoading(false);
      return;
    }
    let active = true;
    setStatusLoading(true);
    fetch('/api/admin/status')
      .then((res) => res.json())
      .then((data: AdminStatusResponse) => {
        if (!active) return;
        setAuthStatus(data);
      })
      .catch(() => {
        // Keep defaults
      })
      .finally(() => {
        if (active) setStatusLoading(false);
      });
    return () => {
      active = false;
    };
  }, [adminToken]);

  const submitPin = async (pinValue: string) => {
    if (authSubmitting) return;
    setAuthError(null);

    if (!/^\d{6}$/.test(pinValue)) {
      setAuthError('Masukkan 6 digit PIN angka.');
      return;
    }

    setAuthSubmitting(true);
    try {
      const endpoint =
        authStatus.source === 'unclaimed' ? '/api/admin/bootstrap' : '/api/admin/login';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinValue }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        token?: string;
        username?: string;
        error?: string;
      };

      if (!response.ok || !data.token) {
        setAuthError(data.error || 'PIN tidak sesuai.');
        return;
      }

      setPinInput('');
      onAuthSuccess(data.token, data.username || 'admin');
      onNotify(
        authStatus.source === 'unclaimed'
          ? 'PIN admin aktif. Selamat datang di Dashboard!'
          : 'Berhasil masuk ke Admin Dashboard.',
        'success'
      );
    } catch {
      setAuthError('Tidak dapat terhubung ke server. Coba lagi sebentar.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handlePinChange = (rawValue: string) => {
    const digitsOnly = rawValue.replace(/\D/g, '').slice(0, 6);
    setPinInput(digitsOnly);
    setAuthError(null);
    if (digitsOnly.length === 6) {
      void submitPin(digitsOnly);
    }
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitPin(pinInput);
  };

  const isStepComplete = (step: StepIndex): boolean => {
    if (step === 0) return Boolean(problemTitle.trim() && problemDesc.trim());
    if (step === 1) return Boolean(appTitle.trim() && appHowTo.trim());
    if (step === 2) return Boolean(userTitle.trim() && userDesc.trim());
    return Boolean(deviceTitle.trim() && deviceDesc.trim());
  };

  const handleNextStep = () => {
    if (!isStepComplete(currentStep)) {
      const labels = ['The Problem', 'The App', 'The User', 'The Device'];
      onNotify(`Lengkapi judul dan penjelasan pada langkah ${labels[currentStep]} dulu.`, 'warning');
      return;
    }
    if (currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as StepIndex);
    }
  };

  const handleJumpToStep = (target: StepIndex) => {
    if (target <= currentStep) {
      setCurrentStep(target);
      return;
    }
    for (let s = 0 as StepIndex; s < target; s = (s + 1) as StepIndex) {
      if (!isStepComplete(s)) {
        onNotify(`Isi berurutan mulai dari langkah ${STEPS[s].code} (${STEPS[s].title}).`, 'warning');
        setCurrentStep(s);
        return;
      }
    }
    setCurrentStep(target);
  };

  const handleSelectDevicePreset = (presetId: string) => {
    const preset = DEVICE_TARGETS.find((d) => d.id === presetId);
    if (!preset) return;
    setDevicePresetId(preset.id);
    setDeviceTitle(preset.title);
    setDeviceDesc(preset.description);
  };

  const resetWizardForm = () => {
    setCurrentStep(0);
    setProblemTitle('');
    setProblemDesc('');
    setAppTitle('');
    setAppHowTo('');
    setAppFeatures('');
    setUserTitle('');
    setUserDesc('');
    setDevicePresetId(DEVICE_TARGETS[0].id);
    setDeviceTitle(DEVICE_TARGETS[0].title);
    setDeviceDesc(DEVICE_TARGETS[0].description);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || isMutating) return;

    if (currentStep < 3) {
      handleNextStep();
      return;
    }

    if (!isStepComplete(0) || !isStepComplete(1) || !isStepComplete(2) || !isStepComplete(3)) {
      onNotify('Semua 4 bagian (Problem, App, User, Device) wajib diisi lengkap.', 'warning');
      return;
    }

    const coreFeatures = appFeatures
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 3);

    setIsMutating(true);
    try {
      const response = await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          problem: {
            title: problemTitle.trim(),
            description: problemDesc.trim(),
          },
          solution: {
            title: appTitle.trim(),
            howToBuild: appHowTo.trim(),
            coreFeatures,
          },
          targetUser: {
            title: userTitle.trim(),
            description: userDesc.trim(),
          },
          deviceTarget: {
            presetId: devicePresetId,
            title: deviceTitle.trim(),
            description: deviceDesc.trim(),
          },
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        categories?: CategoryPools;
        error?: string;
      };

      if (response.status === 401) {
        onLogout();
        onNotify('Sesi admin berakhir. Silakan masukkan PIN kembali.', 'warning');
        return;
      }

      if (!response.ok || !data.categories) {
        onNotify(data.error || 'Gagal menyimpan paket tugas.', 'warning');
        return;
      }

      onCategoriesChange(data.categories);
      const savedTitle = appTitle.trim();
      resetWizardForm();
      onNotify(`Paket tugas "${savedTitle}" berhasil ditambahkan.`, 'success');
    } catch {
      onNotify('Gagal terhubung ke server saat menyimpan paket tugas.', 'warning');
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteTask = async (task: TaskBundle) => {
    if (!adminToken || deletingId) return;
    setDeletingId(task.id);
    try {
      const response = await fetch(`/api/admin/tasks/${encodeURIComponent(task.id)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      const data = (await response.json().catch(() => ({}))) as {
        categories?: CategoryPools;
        error?: string;
      };

      if (response.status === 401) {
        onLogout();
        onNotify('Sesi admin berakhir. Silakan masukkan PIN kembali.', 'warning');
        return;
      }

      if (!response.ok || !data.categories) {
        onNotify(data.error || 'Gagal menghapus paket tugas.', 'warning');
        return;
      }

      onCategoriesChange(data.categories);
      onNotify(`Paket tugas "${task.problem.title}" dihapus.`, 'info');
    } catch {
      onNotify('Gagal terhubung ke server saat menghapus paket tugas.', 'warning');
    } finally {
      setDeletingId(null);
    }
  };

  const tasksList = categories.tasks ?? [];

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tasksList;
    return tasksList.filter((task) => {
      const haystack = [
        task.problem.title,
        task.problem.description,
        task.solution.title,
        task.solution.howToBuild,
        task.targetUser.title,
        task.targetUser.description,
        task.deviceTarget.title,
        task.deviceTarget.description,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [searchQuery, tasksList]);

  if (!adminToken) {
    return (
      <main className="flex-1 min-h-0 w-full bg-[#F8FAFC] px-4 sm:px-8 py-6 flex flex-col items-center justify-center overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md space-y-4"
        >
          <button
            type="button"
            onClick={onBackToCover}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#4B5563] hover:text-[#111827] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Kembali ke Onboarding</span>
          </button>

          <form
            onSubmit={handleAuthSubmit}
            className="w-full bg-white rounded-3xl p-6 sm:p-8 shadow-[0_16px_44px_rgba(15,23,42,0.08)] space-y-6"
          >
            <div>
              <h1 className="text-xl font-bold text-[#111827] leading-tight">
                {authStatus.source === 'unclaimed' ? 'Atur PIN Admin' : 'PIN Admin'}
              </h1>
              <p className="text-xs text-[#64748B] mt-1">
                {authStatus.source === 'unclaimed'
                  ? 'Masukkan PIN untuk mengaktifkan dashboard'
                  : 'Masukkan PIN untuk masuk dashboard'}
              </p>
            </div>

            {statusLoading ? (
              <div className="py-6 text-center text-sm text-[#64748B]">
                Memeriksa status akses admin...
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <label htmlFor="admin-pin-input" className="sr-only">
                    PIN Admin
                  </label>
                  <div className="relative">
                    <div
                      aria-hidden="true"
                      className="grid grid-cols-6 gap-2.5 sm:gap-3 pointer-events-none"
                    >
                      {[0, 1, 2, 3, 4, 5].map((idx) => {
                        const char = pinInput[idx] || '';
                        const isFocusedSlot = pinInput.length === idx;
                        return (
                          <div
                            key={idx}
                            className={`h-16 sm:h-[72px] rounded-2xl flex items-center justify-center text-3xl font-bold leading-none transition-all ${
                              char
                                ? 'bg-[#E8F0FE] text-[#1A73E8]'
                                : isFocusedSlot
                                  ? 'bg-white ring-2 ring-[#1A73E8] text-[#111827]'
                                  : 'bg-[#F1F5F9] text-[#94A3B8]'
                            }`}
                          >
                            {char ? '•' : ''}
                          </div>
                        );
                      })}
                    </div>

                    <input
                      id="admin-pin-input"
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="one-time-code"
                      autoFocus
                      maxLength={6}
                      value={pinInput}
                      onChange={(e) => handlePinChange(e.target.value)}
                      aria-label="Masukkan PIN admin"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-text"
                    />
                  </div>
                </div>

                {authError && (
                  <p className="text-xs font-semibold text-[#DC2626] bg-[#FEF2F2] px-3.5 py-2.5 rounded-xl">
                    {authError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={authSubmitting || pinInput.length < 6}
                  className="w-full min-h-[50px] px-6 py-3 rounded-2xl bg-[#1A73E8] hover:bg-[#1557B0] text-white text-sm font-bold inline-flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 shadow-[0_6px_20px_rgba(26,115,232,0.22)]"
                >
                  <span>{authSubmitting ? 'Memverifikasi...' : 'Masuk'}</span>
                </button>
              </div>
            )}
          </form>
        </motion.div>
      </main>
    );
  }

  const activeStepMeta = STEPS[currentStep];
  const totalTasks = tasksList.length;

  return (
    <main className="flex-1 min-h-0 w-full bg-[#F8FAFC] overflow-y-auto px-4 sm:px-8 py-5 sm:py-7">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Top Bar */}
        <header className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-3xl px-5 py-4 shadow-[0_8px_28px_rgba(15,23,42,0.05)]">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBackToCover}
              className="h-9 px-3 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#111827] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Kembali</span>
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-[#111827] truncate">
                Admin Dashboard · Paket Tugas Peserta
              </h1>
              <p className="text-xs text-[#64748B] truncate">
                Isi berurutan 1 paket tugas: Problem → App → User → Device
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="px-3 py-1.5 rounded-xl bg-[#E8F0FE] text-[#1A73E8] text-xs font-bold inline-flex items-center">
              <span>{adminUsername || 'admin'}</span>
            </span>
            <button
              type="button"
              onClick={onLogout}
              className="h-9 px-3.5 rounded-xl bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Keluar</span>
            </button>
          </div>
        </header>

        {/* Main Workspace: Sequential 4-Step Builder (Left) + Task Bundle List (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Sequential Builder Form */}
          <form
            onSubmit={handleCreateTask}
            className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-6 shadow-[0_10px_30px_rgba(15,23,42,0.05)] space-y-5"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-[#111827]">
                  Buat Paket Tugas Baru
                </h2>
                <span
                  className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold"
                  style={{
                    backgroundColor: activeStepMeta.softBg,
                    color: activeStepMeta.accent,
                  }}
                >
                  Langkah {currentStep + 1} / 4
                </span>
              </div>

              {/* 4-Step Sequential Progress Bar */}
              <div className="grid grid-cols-4 gap-1.5" role="tablist" aria-label="Urutan Pengisian Tugas">
                {STEPS.map((step) => {
                  const isCurrent = step.index === currentStep;
                  const done = isStepComplete(step.index);
                  return (
                    <button
                      key={step.code}
                      type="button"
                      role="tab"
                      aria-selected={isCurrent}
                      onClick={() => handleJumpToStep(step.index)}
                      className={`rounded-xl px-2 py-2 text-left transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-[#F8FAFC] ring-2 shadow-xs'
                          : done
                            ? 'bg-[#F8FAFC] hover:bg-[#F1F5F9]'
                            : 'bg-[#F1F5F9]/70 opacity-75 hover:opacity-100'
                      }`}
                      style={
                        isCurrent
                          ? { ['--tw-ring-color' as string]: step.accent }
                          : undefined
                      }
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className="text-[10px] font-bold tabular-nums"
                          style={{ color: step.accent }}
                        >
                          {step.code}
                        </span>
                        <span
                          className={`w-2 h-2 rounded-full transition-opacity ${
                            done || isCurrent ? 'opacity-100' : 'opacity-25'
                          }`}
                          style={{ backgroundColor: step.accent }}
                          aria-hidden="true"
                        />
                      </div>
                      <div className="text-[11px] font-bold text-[#111827] truncate mt-0.5">
                        {step.title}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Continuity Context Summary from Previous Steps */}
            {currentStep > 0 && (
              <div className="rounded-2xl bg-[#F8FAFC] p-3.5 space-y-1.5 text-xs">
                <div className="text-[11px] font-bold text-[#64748B]">
                  Kesinambungan Tugas
                </div>
                {problemTitle.trim() && (
                  <p className="text-[#111827] truncate">
                    <span className="font-bold text-[#EA4335]">Problem:</span>{' '}
                    {problemTitle.trim()}
                  </p>
                )}
                {currentStep > 1 && appTitle.trim() && (
                  <p className="text-[#111827] truncate">
                    <span className="font-bold text-[#1E8E3E]">App:</span>{' '}
                    {appTitle.trim()}
                  </p>
                )}
                {currentStep > 2 && userTitle.trim() && (
                  <p className="text-[#111827] truncate">
                    <span className="font-bold text-[#1A73E8]">User:</span>{' '}
                    {userTitle.trim()}
                  </p>
                )}
              </div>
            )}

            {/* Step 1: The Problem */}
            {currentStep === 0 && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1">
                    1. Judul Masalah (The Problem)
                  </label>
                  <input
                    type="text"
                    value={problemTitle}
                    onChange={(e) => setProblemTitle(e.target.value)}
                    maxLength={80}
                    placeholder="Contoh: Tagihan Listrik Rumah Sering Membengkak"
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#F1F5F9] focus:bg-white focus:ring-2 focus:ring-[#EA4335] focus:outline-none text-sm font-medium text-[#111827]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1">
                    Penjelasan Masalah
                  </label>
                  <textarea
                    rows={3}
                    value={problemDesc}
                    onChange={(e) => setProblemDesc(e.target.value)}
                    maxLength={240}
                    placeholder="Jelaskan kesulitan nyata yang dialami sehari-hari..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F1F5F9] focus:bg-white focus:ring-2 focus:ring-[#EA4335] focus:outline-none text-sm font-medium text-[#111827] resize-none"
                  />
                </div>
              </div>
            )}

            {/* Step 2: The App */}
            {currentStep === 1 && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1">
                    2. Nama / Konsep Aplikasi AI (The App)
                  </label>
                  <input
                    type="text"
                    value={appTitle}
                    onChange={(e) => setAppTitle(e.target.value)}
                    maxLength={80}
                    placeholder="Contoh: Foto Meteran & Pemantau Listrik Pintar"
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#F1F5F9] focus:bg-white focus:ring-2 focus:ring-[#1E8E3E] focus:outline-none text-sm font-medium text-[#111827]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1">
                    Cara Kerja Aplikasi (menjawab masalah di langkah 1)
                  </label>
                  <textarea
                    rows={3}
                    value={appHowTo}
                    onChange={(e) => setAppHowTo(e.target.value)}
                    maxLength={240}
                    placeholder="Contoh: Cukup foto meteran listrik, AI hitung perkiraan tagihan bulan ini dan kasih saran hemat..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F1F5F9] focus:bg-white focus:ring-2 focus:ring-[#1E8E3E] focus:outline-none text-sm font-medium text-[#111827] resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1">
                    Fitur Utama (opsional, 1 per baris, maks 3)
                  </label>
                  <textarea
                    rows={2}
                    value={appFeatures}
                    onChange={(e) => setAppFeatures(e.target.value)}
                    placeholder={'Foto meteran langsung dari HP\nPerkiraan tagihan akhir bulan'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F1F5F9] focus:bg-white focus:ring-2 focus:ring-[#1E8E3E] focus:outline-none text-sm font-medium text-[#111827] resize-none"
                  />
                </div>
              </div>
            )}

            {/* Step 3: The User */}
            {currentStep === 2 && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1">
                    3. Siapa Penggunanya (The User)
                  </label>
                  <input
                    type="text"
                    value={userTitle}
                    onChange={(e) => setUserTitle(e.target.value)}
                    maxLength={80}
                    placeholder="Contoh: Keluarga Muda & Penghuni Kos"
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#F1F5F9] focus:bg-white focus:ring-2 focus:ring-[#1A73E8] focus:outline-none text-sm font-medium text-[#111827]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1">
                    Konteks & Kebutuhan Pengguna
                  </label>
                  <textarea
                    rows={3}
                    value={userDesc}
                    onChange={(e) => setUserDesc(e.target.value)}
                    maxLength={240}
                    placeholder="Contoh: Ingin pantau pemakaian listrik tiap minggu tanpa ribet hitung manual..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F1F5F9] focus:bg-white focus:ring-2 focus:ring-[#1A73E8] focus:outline-none text-sm font-medium text-[#111827] resize-none"
                  />
                </div>
              </div>
            )}

            {/* Step 4: The Device */}
            {currentStep === 3 && (
              <div className="space-y-3">
                <div>
                  <span className="block text-xs font-semibold text-[#475569] mb-1.5">
                    4. Pilih Cepat Perangkat (The Device)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {DEVICE_TARGETS.map((preset) => {
                      const active = devicePresetId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectDevicePreset(preset.id)}
                          className={`px-3 py-2 rounded-xl text-left text-xs font-bold transition-all cursor-pointer ${
                            active
                              ? 'bg-[#FEF3C7] text-[#B45309] ring-2 ring-[#D97706]'
                              : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                          }`}
                        >
                          {preset.title}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1">
                    Nama Perangkat
                  </label>
                  <input
                    type="text"
                    value={deviceTitle}
                    onChange={(e) => {
                      setDevicePresetId('custom');
                      setDeviceTitle(e.target.value);
                    }}
                    maxLength={80}
                    placeholder="Contoh: Tampilan HP"
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#F1F5F9] focus:bg-white focus:ring-2 focus:ring-[#D97706] focus:outline-none text-sm font-medium text-[#111827]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1">
                    Alasan / Tampilan di Perangkat Ini
                  </label>
                  <textarea
                    rows={2}
                    value={deviceDesc}
                    onChange={(e) => setDeviceDesc(e.target.value)}
                    maxLength={240}
                    placeholder="Jelaskan kenapa aplikasi ini pas dipakai di perangkat tersebut..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F1F5F9] focus:bg-white focus:ring-2 focus:ring-[#D97706] focus:outline-none text-sm font-medium text-[#111827] resize-none"
                  />
                </div>
              </div>
            )}

            {/* Sequential Navigation Buttons */}
            <div className="flex items-center gap-2.5 pt-1">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => (prev - 1) as StepIndex)}
                  className="min-h-[46px] px-4 py-2.5 rounded-2xl bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#111827] text-sm font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  <span>Sebelumnya</span>
                </button>
              )}

              {currentStep < 3 ? (
                <button
                  key="next-step-btn"
                  type="button"
                  onClick={handleNextStep}
                  className="flex-1 min-h-[46px] px-5 py-2.5 rounded-2xl bg-[#1A73E8] hover:bg-[#1557B0] text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-[0_6px_18px_rgba(26,115,232,0.22)]"
                >
                  <span>Lanjut ke {STEPS[currentStep + 1].title}</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              ) : (
                <button
                  key="submit-task-btn"
                  type="submit"
                  disabled={isMutating}
                  className="flex-1 min-h-[46px] px-5 py-2.5 rounded-2xl bg-[#1A73E8] hover:bg-[#1557B0] text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60 shadow-[0_6px_18px_rgba(26,115,232,0.22)]"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>{isMutating ? 'Menyimpan...' : 'Simpan Paket Tugas'}</span>
                </button>
              )}
            </div>
          </form>

          {/* Unified Task Bundles List (Read & Delete) */}
          <section className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 shadow-[0_10px_30px_rgba(15,23,42,0.05)] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#111827]">
                  Daftar Paket Tugas ({totalTasks})
                </h2>
                <p className="text-xs text-[#64748B]">
                  Setiap tugas berisi 4 bagian berkesinambungan: Problem → App → User → Device
                </p>
              </div>

              <div className="relative w-full sm:w-56">
                <Search
                  className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari paket tugas..."
                  className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#F1F5F9] focus:bg-white focus:ring-2 focus:ring-[#1A73E8] focus:outline-none text-xs font-medium text-[#111827]"
                />
              </div>
            </div>

            {filteredTasks.length === 0 ? (
              <div className="py-10 text-center text-sm text-[#64748B]">
                Tidak ada paket tugas yang cocok dengan pencarian.
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {filteredTasks.map((task) => {
                  const isOnlyTask = totalTasks <= 1;
                  return (
                    <article
                      key={task.id}
                      className="rounded-2xl bg-[#F8FAFC] p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-[#FEE2E2] text-[#EA4335] text-[10px] font-bold">
                            01 · The Problem
                          </span>
                          <h3 className="text-sm font-bold text-[#111827] mt-1 leading-snug">
                            {task.problem.title}
                          </h3>
                          <p className="text-xs text-[#4B5563] mt-0.5 leading-relaxed">
                            {task.problem.description}
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={isOnlyTask || deletingId === task.id}
                          onClick={() => handleDeleteTask(task)}
                          title={
                            isOnlyTask
                              ? 'Minimal tersisa 1 paket tugas'
                              : `Hapus ${task.problem.title}`
                          }
                          aria-label={`Hapus ${task.problem.title}`}
                          className="w-9 h-9 rounded-xl bg-white hover:bg-[#FEF2F2] text-[#64748B] hover:text-[#DC2626] shadow-[0_2px_8px_rgba(15,23,42,0.05)] inline-flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                        <div className="rounded-xl bg-white p-3 space-y-1">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-[#E6F4EA] text-[#1E8E3E] text-[10px] font-bold">
                            02 · The App
                          </span>
                          <div className="text-xs font-bold text-[#111827] leading-snug">
                            {task.solution.title}
                          </div>
                          <p className="text-[11px] text-[#4B5563] leading-relaxed">
                            {task.solution.howToBuild}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white p-3 space-y-1">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-[#E8F0FE] text-[#1A73E8] text-[10px] font-bold">
                            03 · The User
                          </span>
                          <div className="text-xs font-bold text-[#111827] leading-snug">
                            {task.targetUser.title}
                          </div>
                          <p className="text-[11px] text-[#4B5563] leading-relaxed">
                            {task.targetUser.description}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white p-3 space-y-1">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-[#FEF3C7] text-[#B45309] text-[10px] font-bold">
                            04 · The Device
                          </span>
                          <div className="text-xs font-bold text-[#111827] leading-snug">
                            {task.deviceTarget.title}
                          </div>
                          <p className="text-[11px] text-[#4B5563] leading-relaxed">
                            {task.deviceTarget.description}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
