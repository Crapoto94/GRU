import versionData from "../../../version.json";

export interface ChangelogEntry {
  version: string;
  date: string;
  features: string[];
}

export const getVersion = () => versionData.version;
export const getChangelog = (): ChangelogEntry[] => versionData.changelog;
export const getCurrentVersion = () => versionData.changelog[0];

export const formatVersion = (v: string) => `v${v}`;