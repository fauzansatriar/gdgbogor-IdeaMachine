import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  LogOut,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  CategoryKey,
  CategoryPools,
  DeviceTargetItem,
  ProblemItem,
  SolutionItem,
  TargetUserItem,
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

const CATEGORY_META: Record<
  CategoryKey,
  {
    label: string;
    subtitle: string;
    accent: string;
    softBg: string;
    defaultIcon: string;
  }
> = {
  problems: {
    label: 'The Problem',
    subtitle: 'Masalah nyata di sekitar',
    accent: '#EA4335',
    softBg: '#FEE2E2',
    defaultIcon: 'home',
  },
  solutions: {
    label: 'The App',
    subtitle: 'Ide aplikasi & fitur AI',
    accent: '#1E8E3E',
    softBg: '#E6F4EA',
    defaultIcon: 'camera',
  },
  targetUsers: {
    label: 'The User',
    subtitle: 'Target pengguna aplikasi',
    accent: '#1A73E8',
    softBg: '#E8F0FE',
    defaultIcon: 'users',
  },
  deviceTargets: {
    label: 'The Device',
    subtitle: 'Perangkat & ukuran layar',
    accent: '#D97706',
    softBg: '#FEF3C7',
    defaultIcon: 'smartphone',
  },
};

const CATEGORY_ORDER: CategoryKey[] = ['problems', 'solutions', 'targetUsers', 'deviceTargets'];

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

  const [activeCategory, setActiveCategory] = useState<CategoryKey>('problems');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMutating, setIsMutating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Create form fields
  const [titleInput, setTitleInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [featuresInput, setFeaturesInput] = useState('');

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

  const handleSelectCategory = (key: CategoryKey) => {
    setActiveCategory(key);
    setSearchQuery('');
    setTitleInput('');
    setDescriptionInput('');
    setFeaturesInput('');
  };

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

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || isMutating) return;

    const title = titleInput.trim();
    const description = descriptionInput.trim();
    if (!title || !description) {
      onNotify('Judul dan deskripsi item wajib diisi.', 'warning');
      return;
    }

    const payload: Record<string, unknown> = {
      title,
      description,
      icon: CATEGORY_META[activeCategory].defaultIcon,
    };

    if (activeCategory === 'solutions') {
      payload.coreFeatures = featuresInput
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 4);
    }

    setIsMutating(true);
    try {
      const response = await fetch(`/api/admin/categories/${activeCategory}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
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
        onNotify(data.error || 'Gagal menambah item.', 'warning');
        return;
      }

      onCategoriesChange(data.categories);
      setTitleInput('');
      setDescriptionInput('');
      setFeaturesInput('');
      onNotify(`Berhasil menambahkan "${title}" ke ${CATEGORY_META[activeCategory].label}.`, 'success');
    } catch {
      onNotify('Gagal terhubung ke server saat menyimpan item.', 'warning');
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteItem = async (itemId: string, itemTitle: string) => {
    if (!adminToken || deletingId) return;
    setDeletingId(itemId);
    try {
      const response = await fetch(
        `/api/admin/categories/${activeCategory}/${encodeURIComponent(itemId)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );
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
        onNotify(data.error || 'Gagal menghapus item.', 'warning');
        return;
      }

      onCategoriesChange(data.categories);
      onNotify(`"${itemTitle}" dihapus dari ${CATEGORY_META[activeCategory].label}.`, 'info');
    } catch {
      onNotify('Gagal terhubung ke server saat menghapus item.', 'warning');
    } finally {
      setDeletingId(null);
    }
  };

  const activeItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = categories[activeCategory];
    if (!q) return list;
    return list.filter((item) => {
      const detail =
        'howToBuild' in item ? item.howToBuild : item.description;
      const haystack = `${item.title} ${detail}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [activeCategory, categories, searchQuery]);

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
                {authStatus.source === 'unclaimed'
                  ? 'Atur PIN Admin'
                  : 'PIN Admin'}
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
                    {/* Large masked 6-slot PIN boxes */}
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

  const activeMeta = CATEGORY_META[activeCategory];
  const totalCount = categories[activeCategory].length;

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
                Admin Dashboard · 4 Kategori
              </h1>
              <p className="text-xs text-[#64748B] truncate">
                Kelola daftar isi mesin ide untuk setiap kategori
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

        {/* 4 Category Selector Cards */}
        <section
          aria-label="Pilih Kategori Idea Machine"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          {CATEGORY_ORDER.map((key) => {
            const meta = CATEGORY_META[key];
            const count = categories[key].length;
            const isSelected = activeCategory === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectCategory(key)}
                className={`text-left rounded-2xl p-4 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white shadow-[0_12px_30px_rgba(15,23,42,0.09)] ring-2'
                    : 'bg-white/80 hover:bg-white shadow-[0_4px_14px_rgba(15,23,42,0.04)]'
                }`}
                style={
                  isSelected
                    ? { ['--tw-ring-color' as string]: meta.accent }
                    : undefined
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold"
                    style={{ backgroundColor: meta.softBg, color: meta.accent }}
                  >
                    {meta.label}
                  </span>
                  <span className="text-lg font-bold tabular-nums text-[#111827]">
                    {count}
                  </span>
                </div>
                <p className="text-xs text-[#64748B] mt-2 truncate">{meta.subtitle}</p>
              </button>
            );
          })}
        </section>

        {/* Dashboard Workspace: Create (Left) + Read & Delete (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Create Form */}
          <form
            onSubmit={handleCreateItem}
            className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-6 shadow-[0_10px_30px_rgba(15,23,42,0.05)] space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-[#111827]">
                Tambah ke {activeMeta.label}
              </h2>
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: activeMeta.accent }}
                aria-hidden="true"
              />
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1">
                  Judul Item
                </label>
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  maxLength={80}
                  placeholder={
                    activeCategory === 'problems'
                      ? 'Contoh: Tagihan Listrik Membengkak'
                      : activeCategory === 'solutions'
                        ? 'Contoh: Pencatat Belanja Suara AI'
                        : activeCategory === 'targetUsers'
                          ? 'Contoh: Pemilik Kos & Kontrakan'
                          : 'Contoh: Smartwatch / Layar Mini'
                  }
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#F1F5F9] focus:bg-white focus:ring-2 focus:ring-[#1A73E8] focus:outline-none text-sm font-medium text-[#111827]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1">
                  {activeCategory === 'solutions' ? 'Cara Kerja Aplikasi' : 'Deskripsi'}
                </label>
                <textarea
                  rows={3}
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  maxLength={240}
                  placeholder="Tulis penjelasan singkat yang mudah dimengerti peserta..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F1F5F9] focus:bg-white focus:ring-2 focus:ring-[#1A73E8] focus:outline-none text-sm font-medium text-[#111827] resize-none"
                />
              </div>

              {activeCategory === 'solutions' && (
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1">
                    Fitur Utama (1 fitur per baris, maks 3)
                  </label>
                  <textarea
                    rows={3}
                    value={featuresInput}
                    onChange={(e) => setFeaturesInput(e.target.value)}
                    placeholder={'Foto struk pakai kamera\nAI langsung hitung total\nRingkasan rapi siap dibagikan'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F1F5F9] focus:bg-white focus:ring-2 focus:ring-[#1A73E8] focus:outline-none text-sm font-medium text-[#111827] resize-none"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isMutating}
              className="w-full min-h-[46px] px-5 py-2.5 rounded-2xl bg-[#1A73E8] hover:bg-[#1557B0] text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60 shadow-[0_6px_18px_rgba(26,115,232,0.22)]"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>{isMutating ? 'Menyimpan...' : `Tambah ke ${activeMeta.label}`}</span>
            </button>
          </form>

          {/* Read + Delete List */}
          <section className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 shadow-[0_10px_30px_rgba(15,23,42,0.05)] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#111827]">
                  Daftar {activeMeta.label} ({totalCount})
                </h2>
                <p className="text-xs text-[#64748B]">
                  Item aktif yang muncul saat mesin diputar
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
                  placeholder="Cari item..."
                  className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#F1F5F9] focus:bg-white focus:ring-2 focus:ring-[#1A73E8] focus:outline-none text-xs font-medium text-[#111827]"
                />
              </div>
            </div>

            {activeItems.length === 0 ? (
              <div className="py-10 text-center text-sm text-[#64748B]">
                Tidak ada item yang cocok dengan pencarian.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
                {activeItems.map((item) => {
                  const descText =
                    activeCategory === 'solutions'
                      ? (item as SolutionItem).howToBuild
                      : (item as ProblemItem | TargetUserItem | DeviceTargetItem).description;

                  const isOnlyItem = totalCount <= 1;

                  return (
                    <article
                      key={item.id}
                      className="rounded-2xl bg-[#F8FAFC] p-4 flex items-start justify-between gap-3.5"
                    >
                      <div className="min-w-0 space-y-1">
                        <h3 className="text-sm font-bold text-[#111827] leading-snug">
                          {item.title}
                        </h3>
                        <p className="text-xs text-[#4B5563] leading-relaxed">
                          {descText}
                        </p>
                        {activeCategory === 'solutions' &&
                          (item as SolutionItem).coreFeatures?.length > 0 && (
                            <ul className="pt-1 space-y-0.5">
                              {(item as SolutionItem).coreFeatures.map((feat, idx) => (
                                <li
                                  key={idx}
                                  className="text-[11px] text-[#475569] flex items-center gap-1.5"
                                >
                                  <span
                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                    style={{ backgroundColor: activeMeta.accent }}
                                  />
                                  <span>{feat}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                      </div>

                      <button
                        type="button"
                        disabled={isOnlyItem || deletingId === item.id}
                        onClick={() => handleDeleteItem(item.id, item.title)}
                        title={
                          isOnlyItem
                            ? 'Minimal tersisa 1 item'
                            : `Hapus ${item.title}`
                        }
                        aria-label={`Hapus ${item.title}`}
                        className="w-9 h-9 rounded-xl bg-white hover:bg-[#FEF2F2] text-[#64748B] hover:text-[#DC2626] shadow-[0_2px_8px_rgba(15,23,42,0.05)] inline-flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
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
