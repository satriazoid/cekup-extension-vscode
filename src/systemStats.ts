import fs from 'fs';
import os from 'os';

export type UsageLevel = 'ok' | 'warn' | 'critical';

export interface CpuSample {
  usage: number;
  cores: number;
  model: string;
}

export interface RamSample {
  usage: number;
  usedBytes: number;
  totalBytes: number;
}

export interface DiskSample {
  path: string;
  freeBytes: number;
  totalBytes: number;
  usedRatio: number;
}

export function levelFor(usagePercent: number): UsageLevel {
  if (usagePercent > 80) {
    return 'critical';
  }
  return usagePercent >= 50 ? 'warn' : 'ok';
}

function primaryDiskPath(): string {
  if (process.platform === 'win32') {
    const systemDrive = process.env.SystemDrive;
    return systemDrive ? `${systemDrive}\\` : 'C:\\';
  }
  return '/';
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
}

export class SystemStats {
  private previousTicks: { idle: number; total: number } | null = null;

  readCpu(): CpuSample {
    const cpus = os.cpus();

    let idle = 0;
    let total = 0;
    for (const cpu of cpus) {
      for (const value of Object.values(cpu.times)) {
        total += value;
      }
      idle += cpu.times.idle;
    }

    const previous = this.previousTicks;
    this.previousTicks = { idle, total };

    // The first sample only establishes a baseline, so report 0 until the next read.
    let usage = 0;
    if (previous) {
      const totalDelta = total - previous.total;
      const idleDelta = idle - previous.idle;
      usage = totalDelta > 0 ? clampPercent(((totalDelta - idleDelta) / totalDelta) * 100) : 0;
    }

    return {
      usage,
      cores: cpus.length,
      model: cpus[0]?.model.trim() ?? 'Unknown CPU',
    };
  }

  readRam(): RamSample {
    const totalBytes = os.totalmem();
    const usedBytes = totalBytes - os.freemem();
    return {
      usage: totalBytes > 0 ? clampPercent((usedBytes / totalBytes) * 100) : 0,
      usedBytes,
      totalBytes,
    };
  }

  async readDisk(path?: string): Promise<DiskSample> {
    const target = path && path.length > 0 ? path : primaryDiskPath();
    const stats = await fs.promises.statfs(target);
    const blockSize = Number(stats.bsize);
    const totalBytes = Number(stats.blocks) * blockSize;
    const freeBytes = Number(stats.bfree) * blockSize;
    const usedBytes = totalBytes - freeBytes;
    return {
      path: target,
      freeBytes,
      totalBytes,
      usedRatio: totalBytes > 0 ? clampPercent((usedBytes / totalBytes) * 100) : 0,
    };
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ['KB', 'MB', 'GB', 'TB', 'PB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit]}`;
}