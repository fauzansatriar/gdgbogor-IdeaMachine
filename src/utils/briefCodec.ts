import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
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

type CompactMissionV3Tuple = [
  3, // version
  number, // participantNumber
  string, // participantName
  string, // deviceId
  PoolIconName, // problem icon
  string, // problem title
  string, // problem description
  PoolIconName, // user icon
  string, // user title
  string, // user description
  PoolIconName, // solution icon
  string, // solution title
  string, // solution howToBuild
  string[], // solution features (3)
];

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(token: string): Uint8Array {
  const padded =
    token.replace(/-/g, '+').replace(/_/g, '/') +
    '==='.slice((token.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toBase64Url(text: string): string {
  return bytesToBase64Url(strToU8(text));
}

function fromBase64Url(token: string): string {
  return strFromU8(base64UrlToBytes(token));
}

export function encodeBriefToken(payload: MissionBriefPayload): string {
  if (payload.mission) {
    const tuple: CompactMissionV3Tuple = [
      3,
      payload.participantNumber,
      payload.participantName?.trim() || '',
      payload.mission.device.id,
      payload.mission.problem.icon,
      payload.mission.problem.title,
      payload.mission.problem.description,
      payload.mission.targetUser.icon,
      payload.mission.targetUser.title,
      payload.mission.targetUser.contextualDescription,
      payload.mission.solution.icon,
      payload.mission.solution.title,
      payload.mission.solution.contextualHowToBuild,
      payload.mission.solution.contextualFeatures.slice(0, 3),
    ];

    try {
      const compressed = deflateSync(strToU8(JSON.stringify(tuple)), { level: 9 });
      return `z${bytesToBase64Url(compressed)}`;
    } catch {
      // Fall through to uncompressed v2 if compression fails
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
    if (token.startsWith('z')) {
      const compressed = base64UrlToBytes(token.slice(1));
      const inflated = strFromU8(inflateSync(compressed));
      const arr = JSON.parse(inflated) as unknown;

      if (!Array.isArray(arr) || arr[0] !== 3 || arr.length < 14) {
        return null;
      }

      const [
        ,
        rawNumber,
        rawName,
        rawDeviceId,
        pIcon,
        pTitle,
        pDesc,
        uIcon,
        uTitle,
        uDesc,
        sIcon,
        sTitle,
        sDesc,
        sFeatures,
      ] = arr as CompactMissionV3Tuple;

      const participantNumber = Number(rawNumber);
      if (
        !Number.isInteger(participantNumber) ||
        participantNumber < 1 ||
        participantNumber > 5 ||
        !pTitle ||
        !uTitle ||
        !sTitle
      ) {
        return null;
      }

      const device = getDeviceById(rawDeviceId || 'mobile');
      const features = Array.isArray(sFeatures)
        ? sFeatures.map((f) => String(f)).filter(Boolean).slice(0, 3)
        : [];

      const mission: ContextualMission = {
        problem: {
          id: 'qr-problem',
          icon: pIcon || 'home',
          title: String(pTitle),
          domain: 'Kebutuhan Sehari-hari',
          shortNoun: String(pTitle).toLowerCase(),
          description: String(pDesc || ''),
        },
        targetUser: {
          id: 'qr-user',
          icon: uIcon || 'users',
          title: String(uTitle),
          shortPersona: String(uTitle).toLowerCase(),
          context: 'Kebutuhan Harian · Praktis',
          description: String(uDesc || ''),
          contextualDescription: String(uDesc || ''),
        },
        solution: {
          id: 'qr-solution',
          icon: sIcon || 'smartphone',
          title: String(sTitle),
          techStack: 'Praktis · Bantuan AI',
          howToBuild: String(sDesc || ''),
          coreFeatures: features,
          contextualHowToBuild: String(sDesc || ''),
          contextualFeatures: features,
        },
        device,
      };

      return {
        participantNumber,
        participantName: String(rawName || '').trim() || undefined,
        problemId: mission.problem.id,
        userId: mission.targetUser.id,
        solutionId: mission.solution.id,
        deviceId: device.id,
        mission,
      };
    }

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
    return `?b=${token}`;
  }
  const url = new URL(window.location.href);
  url.search = `?b=${token}`;
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

export function createQrMatrixPath(url: string): {
  size: number;
  pathData: string;
} | null {
  try {
    const qr = QRCode.create(url, { errorCorrectionLevel: 'L' });
    const size = qr.modules.size;
    let pathData = '';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (qr.modules.get(r, c)) {
          pathData += `M${c},${r}h1v1h-1z`;
        }
      }
    }
    return { size, pathData };
  } catch {
    return null;
  }
}

export async function generateQrDataUrl(url: string, size = 440): Promise<string> {
  return QRCode.toDataURL(url, {
    width: size,
    margin: 4,
    errorCorrectionLevel: 'L',
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
}
