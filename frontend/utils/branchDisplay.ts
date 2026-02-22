import { Branch } from '../types';

const normalizeBranchId = (value: unknown) => String(value ?? '').trim();

const branchIdVariants = (value: unknown) => {
  const raw = normalizeBranchId(value).toUpperCase();
  if (!raw) return [];
  const variants = new Set<string>([raw]);
  const prefixed = raw.match(/^BR0*(\d+)$/);
  if (prefixed) variants.add(String(Number(prefixed[1])));
  if (/^\d+$/.test(raw)) variants.add(`BR${raw.padStart(3, '0')}`);
  return Array.from(variants);
};

export const branchIdsMatch = (a: unknown, b: unknown) => {
  const aVariants = branchIdVariants(a);
  const bVariants = new Set(branchIdVariants(b));
  return aVariants.some((id) => bVariants.has(id));
};

export const findBranchById = (branches: Branch[], branchId: unknown) =>
  branches.find((branch) => branchIdsMatch(branch.id, branchId));

export const getHeadOfficeBranch = (branches: Branch[]) =>
  branches.find((branch) => branch.isHeadOffice);

export const withHeadOfficeCrown = (name: string, isHeadOffice?: boolean) =>
  isHeadOffice ? `${name} 👑` : name;

export const getBranchDisplayName = (
  branches: Branch[],
  branchId?: string,
  fallback = 'Unknown'
) => {
  if (!branchId) return fallback;

  const branch = findBranchById(branches, branchId);
  if (branch) return withHeadOfficeCrown(branch.name, branch.isHeadOffice);

  if (String(branchId).toUpperCase() === 'HEAD_OFFICE') {
    const headOffice = getHeadOfficeBranch(branches);
    if (headOffice) return withHeadOfficeCrown(headOffice.name, true);
    return 'Head Office 👑';
  }

  return String(branchId);
};
