import { jsPDF } from 'jspdf';
import {
  ParticipantSlot,
  resolveChallengeMission,
} from '../data/pools';
import { buildMissionBriefUrl, generateQrDataUrl } from './briefCodec';

const GOOGLE_BLUE = [66, 133, 244] as const;
const GOOGLE_RED = [234, 67, 53] as const;
const GOOGLE_YELLOW = [251, 188, 4] as const;
const GOOGLE_GREEN = [52, 168, 83] as const;
const INK_DARK = [32, 33, 36] as const;
const INK_MUTED = [95, 99, 104] as const;
const SURFACE_SOFT = [248, 249, 250] as const;
const BORDER_LIGHT = [226, 232, 240] as const;

function drawSpectrumBar(doc: jsPDF, y: number, pageWidth: number) {
  const segW = pageWidth / 4;
  doc.setFillColor(...GOOGLE_BLUE);
  doc.rect(0, y, segW, 2, 'F');
  doc.setFillColor(...GOOGLE_RED);
  doc.rect(segW, y, segW, 2, 'F');
  doc.setFillColor(...GOOGLE_YELLOW);
  doc.rect(segW * 2, y, segW, 2, 'F');
  doc.setFillColor(...GOOGLE_GREEN);
  doc.rect(segW * 3, y, segW, 2, 'F');
}

export async function downloadParticipantPdf(slot: ParticipantSlot): Promise<void> {
  if (!slot.challenge) return;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  const mission = resolveChallengeMission(slot.challenge);
  const briefUrl = buildMissionBriefUrl(slot.number, slot.challenge, slot.name);
  const qrDataUrl = await generateQrDataUrl(briefUrl, 360);
  const participantLabel = slot.name.trim()
    ? `Peserta #${slot.number} — ${slot.name.trim()}`
    : `Peserta #${slot.number}`;

  drawSpectrumBar(doc, 0, pageWidth);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...GOOGLE_BLUE);
  doc.text('GDG BOGOR · IDEA MACHINE', margin, 18);

  doc.setFontSize(22);
  doc.setTextColor(...INK_DARK);
  doc.text(`Mission Card — ${participantLabel}`, margin, 29);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...INK_MUTED);
  doc.text(
    'Kartu misi pembuatan aplikasi untuk vibe coder. Buka ai.studio/build dan ceritakan ide ini ke AI.',
    margin,
    36
  );

  let y = 44;

  const sections = [
    {
      num: '01',
      label: 'APLIKASI YANG HARUS DIBUAT',
      accent: GOOGLE_GREEN,
      title: mission.solution.title,
      subtitle: mission.solution.techStack,
      body: `${mission.solution.contextualHowToBuild}\nFitur Utama: ${mission.solution.contextualFeatures.join(' · ')}`,
    },
    {
      num: '02',
      label: 'MASALAH YANG DIATASI',
      accent: GOOGLE_BLUE,
      title: mission.problem.title,
      subtitle: mission.problem.domain,
      body: mission.problem.description,
    },
    {
      num: '03',
      label: 'SIAPA PENGGUNANYA',
      accent: GOOGLE_RED,
      title: mission.targetUser.title,
      subtitle: mission.targetUser.context,
      body: mission.targetUser.contextualDescription,
    },
    {
      num: '04',
      label: 'INFO PERANGKAT',
      accent: GOOGLE_YELLOW,
      title: `${mission.device.title} (${mission.device.badgeLabel})`,
      subtitle: mission.device.layoutHint,
      body: mission.device.description,
    },
  ];

  sections.forEach((sec) => {
    const bodyLines = doc.splitTextToSize(sec.body, contentWidth - 14);
    const boxHeight = 21 + bodyLines.length * 4.8;

    doc.setFillColor(...SURFACE_SOFT);
    doc.setDrawColor(...BORDER_LIGHT);
    doc.roundedRect(margin, y, contentWidth, boxHeight, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(sec.accent[0], sec.accent[1], sec.accent[2]);
    doc.text(`${sec.num} · ${sec.label}`, margin + 6, y + 7);

    doc.setFontSize(13);
    doc.setTextColor(...INK_DARK);
    doc.text(sec.title, margin + 6, y + 13.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...INK_MUTED);
    doc.text(sec.subtitle, margin + 6, y + 18.5);

    doc.setFontSize(9.5);
    doc.setTextColor(...INK_DARK);
    doc.text(bodyLines, margin + 6, y + 24);

    y += boxHeight + 5;
  });

  const qrBoxY = Math.max(y + 2, pageHeight - 66);
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BORDER_LIGHT);
  doc.roundedRect(margin, qrBoxY, contentWidth, 48, 3, 3, 'FD');

  doc.addImage(qrDataUrl, 'PNG', margin + 5, qrBoxY + 4, 40, 40);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...INK_DARK);
  doc.text('Scan QR Code untuk Membuka Kartu Misi', margin + 50, qrBoxY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...INK_MUTED);
  const qrNote = doc.splitTextToSize(
    'Scan pakai kamera HP untuk melihat ringkasan ide aplikasi dan langsung mulai membangun di ai.studio/build.',
    contentWidth - 56
  );
  doc.text(qrNote, margin + 50, qrBoxY + 21);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...GOOGLE_BLUE);
  doc.text('Mulai Buat di: https://ai.studio/build', margin + 50, qrBoxY + 38);

  drawSpectrumBar(doc, pageHeight - 2, pageWidth);
  doc.save(`Mission_Peserta_${slot.number}.pdf`);
}

export function downloadAllSummaryPdf(slots: ParticipantSlot[]): void {
  const lockedSlots = slots.filter((s) => s.challenge !== null);
  if (lockedSlots.length === 0) return;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  drawSpectrumBar(doc, 0, pageWidth);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...GOOGLE_BLUE);
  doc.text('GDG BOGOR · IDEA MACHINE', margin, 16);

  doc.setFontSize(20);
  doc.setTextColor(...INK_DARK);
  doc.text('Rekap Ide Aplikasi Peserta (#1 – #5)', margin, 25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...INK_MUTED);
  doc.text(
    `Total terkunci: ${lockedSlots.length} dari 5 peserta · ${new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })}`,
    margin,
    31
  );

  let y = 38;

  slots.forEach((slot) => {
    if (y > pageHeight - 52) {
      drawSpectrumBar(doc, pageHeight - 2, pageWidth);
      doc.addPage();
      drawSpectrumBar(doc, 0, pageWidth);
      y = 18;
    }

    const emptyLabel = slot.name.trim()
      ? `Peserta #${slot.number} (${slot.name.trim()})`
      : `Peserta #${slot.number}`;

    if (!slot.challenge) {
      doc.setFillColor(...SURFACE_SOFT);
      doc.setDrawColor(...BORDER_LIGHT);
      doc.roundedRect(margin, y, contentWidth, 16, 2.5, 2.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(...INK_MUTED);
      doc.text(`${emptyLabel} — Belum diundi / dikunci`, margin + 5, y + 10);

      y += 20;
      return;
    }

    const mission = resolveChallengeMission(slot.challenge);

    const howLines = doc.splitTextToSize(
      mission.solution.contextualHowToBuild,
      contentWidth - 10
    );
    const cardHeight = 28 + howLines.length * 4.4;

    if (y + cardHeight > pageHeight - 10) {
      drawSpectrumBar(doc, pageHeight - 2, pageWidth);
      doc.addPage();
      drawSpectrumBar(doc, 0, pageWidth);
      y = 18;
    }

    doc.setFillColor(...SURFACE_SOFT);
    doc.setDrawColor(...BORDER_LIGHT);
    doc.roundedRect(margin, y, contentWidth, cardHeight, 3, 3, 'FD');

    const filledLabel = slot.name.trim()
      ? `Peserta #${slot.number} — ${slot.name.trim()}`
      : `Peserta #${slot.number}`;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(...GOOGLE_BLUE);
    doc.text(filledLabel, margin + 5, y + 7.5);

    doc.setFontSize(9.5);
    doc.setTextColor(...INK_DARK);
    doc.text(
      `Perangkat: ${mission.device.title} (${mission.device.badgeLabel})`,
      margin + contentWidth - 5,
      y + 7.5,
      { align: 'right' }
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Aplikasi: ${mission.solution.title}`, margin + 5, y + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.2);
    doc.setTextColor(...INK_MUTED);
    doc.text(
      `Masalah: ${mission.problem.title} · Pengguna: ${mission.targetUser.title}`,
      margin + 5,
      y + 19.5
    );

    doc.setTextColor(...INK_DARK);
    doc.text(howLines, margin + 5, y + 25);

    y += cardHeight + 5;
  });

  drawSpectrumBar(doc, pageHeight - 2, pageWidth);
  doc.save('Idea_Machine_Rekap_5_Peserta.pdf');
}
