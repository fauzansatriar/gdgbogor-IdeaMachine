import QRCode from 'qrcode';
import {
  ChallengeCombination,
  ContextualMission,
  PoolIconName,
  buildContextualMission,
  getDeviceById,
  getProblemById,
  getSolutionById,
  getTargetUserById,
} from '../data/pools';

export interface MissionBriefPayload {
  participantNumber: number;
  participantName?: string;
  problemId: string;
  userId: string;
  solutionId: string;
  deviceId: string;
  mission?: ContextualMission;
}

interface CompactMissionV2 {
  v: 2;
  n: number;
  nm?: string;
  di: string;
  pi: PoolIconName;
  pt: string;
  pd: string;
  pdom?: string;
  ui: PoolIconName;
  ut: string;
  ud: string;
  uc?: string;
  si: PoolIconName;
  st: string;
  sd: string;
  sf: string[];
  stag?: string;
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(token: string): string {
  const padded =
    token.replace(/-/g, '+').replace(/_/g, '/') +
    '==='.slice((token.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function encodeBriefToken(payload: MissionBriefPayload): string {
  if (payload.mission) {
    const compactV2: CompactMissionV2 = {
      v: 2,
      n: payload.participantNumber,
      nm: payload.participantName?.trim() || undefined,
      di: payload.mission.device.id,
      pi: payload.mission.problem.icon,
      pt: payload.mission.problem.title,
      pd: payload.mission.problem.description,
      pdom: payload.mission.problem.domain,
      ui: payload.mission.targetUser.icon,
      ut: payload.mission.targetUser.title,
      ud: payload.mission.targetUser.contextualDescription,
      uc: payload.mission.targetUser.context,
      si: payload.mission.solution.icon,
      st: payload.mission.solution.title,
      sd: payload.mission.solution.contextualHowToBuild,
      sf: payload.mission.solution.contextualFeatures.slice(0, 3),
      stag: payload.mission.solution.techStack,
    };
    return toBase64Url(JSON.stringify(compactV2));
  }

  const safeName = (payload.participantName ?? '').replace(/\|/g, ' ').trim();
  const compact = [
    payload.participantNumber,
    payload.problemId,
    payload.userId,
    payload.solutionId,
    payload.deviceId,
    safeName,
  ].join('|');

  return toBase64Url(compact);
}

export function decodeBriefToken(token: string): MissionBriefPayload | null {
  try {
    const decoded = fromBase64Url(token);

    if (decoded.startsWith('{')) {
      const parsed = JSON.parse(decoded) as Partial<CompactMissionV2>;
      const participantNumber = Number(parsed.n);
      if (
        parsed.v !== 2 ||
        !Number.isInteger(participantNumber) ||
        participantNumber < 1 ||
        participantNumber > 5 ||
        !parsed.pt ||
        !parsed.ut ||
        !parsed.st
      ) {
        return null;
      }

      const device = getDeviceById(parsed.di || 'mobile');
      const mission: ContextualMission = {
        problem: {
          id: 'qr-problem',
          icon: parsed.pi || 'home',
          title: parsed.pt,
          domain: parsed.pdom || 'Kebutuhan Sehari-hari',
          shortNoun: parsed.pt.toLowerCase(),
          description: parsed.pd || '',
        },
        targetUser: {
          id: 'qr-user',
          icon: parsed.ui || 'users',
          title: parsed.ut,
          shortPersona: parsed.ut.toLowerCase(),
          context: parsed.uc || 'Kebutuhan Harian · Praktis',
          description: parsed.ud || '',
          contextualDescription: parsed.ud || '',
        },
        solution: {
          id: 'qr-solution',
          icon: parsed.si || 'smartphone',
          title: parsed.st,
          techStack: parsed.stag || 'Praktis · Bantuan AI',
          howToBuild: parsed.sd || '',
          coreFeatures: Array.isArray(parsed.sf) ? parsed.sf : [],
          contextualHowToBuild: parsed.sd || '',
          contextualFeatures: Array.isArray(parsed.sf) ? parsed.sf : [],
        },
        device,
      };

      return {
        participantNumber,
        participantName: parsed.nm?.trim() || undefined,
        problemId: mission.problem.id,
        userId: mission.targetUser.id,
        solutionId: mission.solution.id,
        deviceId: device.id,
        mission,
      };
    }

    const parts = decoded.split('|');
    if (parts.length < 5) return null;

    const participantNumber = Number(parts[0]);
    if (
      !Number.isInteger(participantNumber) ||
      participantNumber < 1 ||
      participantNumber > 5
    ) {
      return null;
    }

    return {
      participantNumber,
      problemId: parts[1],
      userId: parts[2],
      solutionId: parts[3],
      deviceId: parts[4],
      participantName: parts[5]?.trim() || undefined,
    };
  } catch {
    return null;
  }
}

export function buildMissionBriefUrl(
  participantNumber: number,
  challenge: ChallengeCombination,
  participantName?: string
): string {
  const token = encodeBriefToken({
    participantNumber,
    participantName,
    problemId: challenge.problemId,
    userId: challenge.userId,
    solutionId: challenge.solutionId,
    deviceId: challenge.deviceId,
    mission: challenge.mission,
  });

  if (typeof window === 'undefined') {
    return `?brief=${token}`;
  }
  const url = new URL(window.location.href);
  url.search = `?brief=${token}`;
  url.hash = '';
  return url.toString();
}

export function resolveMissionDetails(payload: MissionBriefPayload) {
  if (payload.mission) {
    return {
      participantNumber: payload.participantNumber,
      participantName: payload.participantName,
      ...payload.mission,
    };
  }

  const problem = getProblemById(payload.problemId);
  const user = getTargetUserById(payload.userId);
  const solution = getSolutionById(payload.solutionId);
  const device = getDeviceById(payload.deviceId);

  return {
    participantNumber: payload.participantNumber,
    participantName: payload.participantName,
    ...buildContextualMission(problem, user, solution, device),
  };
}

export async function generateQrDataUrl(url: string, size = 320): Promise<string> {
  return QRCode.toDataURL(url, {
    width: size,
    margin: 3,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
}
