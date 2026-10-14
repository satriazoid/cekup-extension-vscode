import {
  Event,
  EventEmitter,
  MarkdownString,
  ThemeColor,
  ThemeIcon,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
} from 'vscode';
import { DiskSample, formatBytes, levelFor, SystemStats, UsageLevel } from './systemStats';

type MetricKind = 'cpu' | 'ram' | 'disk';

export interface Snapshot {
  cpuUsage: number;
  cpuCores: number;
  cpuModel: string;
  ramUsage: number;
  ramUsedBytes: number;
  ramTotalBytes: number;
  disk: DiskSample | null;
  diskError: string | null;
}

const LEVEL_COLORS: Record<UsageLevel, ThemeColor> = {
  ok: new ThemeColor('charts.green'),
  warn: new ThemeColor('charts.yellow'),
  critical: new ThemeColor('charts.red'),
};

const LEVEL_LABELS: Record<UsageLevel, string> = {
  ok: 'Normal',
  warn: 'Elevated',
  critical: 'High',
};

export class StatsTreeProvider implements TreeDataProvider<MetricKind> {
  private readonly emitter = new EventEmitter<MetricKind | undefined>();
  readonly onDidChangeTreeData: Event<MetricKind | undefined> = this.emitter.event;

  private snapshot: Snapshot | null = null;
  private reading = false;

  constructor(private readonly stats: SystemStats) {}

  getTreeItem(kind: MetricKind): TreeItem {
    const item = new TreeItem(this.labelFor(kind), TreeItemCollapsibleState.None);
    item.contextValue = kind;
    item.iconPath = this.iconFor(kind);
    item.tooltip = this.tooltipFor(kind);
    return item;
  }

  getChildren(kind?: MetricKind): MetricKind[] {
    return kind ? [] : ['cpu', 'ram', 'disk'];
  }

  refresh(snapshot: Snapshot): void {
    this.snapshot = snapshot;
    this.emitter.fire(undefined);
  }

  getSnapshot(): Snapshot | null {
    return this.snapshot;
  }

  async readNow(diskPath?: string): Promise<Snapshot> {
    if (this.reading) {
      throw new Error('A read is already in progress');
    }
    this.reading = true;
    try {
      const cpu = this.stats.readCpu();
      const ram = this.stats.readRam();

      let disk: DiskSample | null = null;
      let diskError: string | null = null;
      try {
        disk = await this.stats.readDisk(diskPath);
      } catch (error) {
        diskError = error instanceof Error ? error.message : String(error);
      }

      return {
        cpuUsage: cpu.usage,
        cpuCores: cpu.cores,
        cpuModel: cpu.model,
        ramUsage: ram.usage,
        ramUsedBytes: ram.usedBytes,
        ramTotalBytes: ram.totalBytes,
        disk,
        diskError,
      };
    } finally {
      this.reading = false;
    }
  }

  private percent(usage: number): string {
    return `${usage.toFixed(0)}%`;
  }

  private iconFor(kind: MetricKind): ThemeIcon {
    const snapshot = this.snapshot;
    let level: UsageLevel = 'ok';

    if (snapshot) {
      if (kind === 'cpu') {
        level = levelFor(snapshot.cpuUsage);
      } else if (kind === 'ram') {
        level = levelFor(snapshot.ramUsage);
      } else {
        level = snapshot.disk ? levelFor(snapshot.disk.usedRatio) : 'ok';
      }
    }

    const icon = {
      cpu: new ThemeIcon('pulse'),
      ram: new ThemeIcon('memory'),
      disk: new ThemeIcon('drive'),
    }[kind];

    return new ThemeIcon(icon.id, LEVEL_COLORS[level]);
  }

  private labelFor(kind: MetricKind): string {
    const snapshot = this.snapshot;
    if (!snapshot) {
      return `${titleFor(kind)}  —`;
    }

    if (kind === 'cpu') {
      return `CPU  ${this.percent(snapshot.cpuUsage)}  ·  ${snapshot.cpuCores} cores`;
    }

    if (kind === 'ram') {
      const ram = `${formatBytes(snapshot.ramUsedBytes)} / ${formatBytes(snapshot.ramTotalBytes)}`;
      return `RAM  ${this.percent(snapshot.ramUsage)}  ·  ${ram}`;
    }

    if (snapshot.diskError || !snapshot.disk) {
      return 'Disk  unavailable';
    }

    return `Disk  ${formatBytes(snapshot.disk.freeBytes)} free  ·  ${this.percent(snapshot.disk.usedRatio)} used`;
  }

  private tooltipFor(kind: MetricKind): MarkdownString {
    const tooltip = new MarkdownString(undefined, true);
    const snapshot = this.snapshot;
    if (!snapshot) {
      return tooltip.appendMarkdown(`**${titleFor(kind)}**\n\nReading…`);
    }

    if (kind === 'cpu') {
      return tooltip.appendMarkdown(
        [
          `**CPU** ${this.percent(snapshot.cpuUsage)} · ${LEVEL_LABELS[levelFor(snapshot.cpuUsage)]}`,
          `${snapshot.cpuCores} cores`,
          snapshot.cpuModel,
        ].join('\n\n'),
      );
    }

    if (kind === 'ram') {
      return tooltip.appendMarkdown(
        [
          `**RAM** ${this.percent(snapshot.ramUsage)} · ${LEVEL_LABELS[levelFor(snapshot.ramUsage)]}`,
          `${formatBytes(snapshot.ramUsedBytes)} of ${formatBytes(snapshot.ramTotalBytes)} used`,
        ].join('\n\n'),
      );
    }

    if (snapshot.diskError || !snapshot.disk) {
      return tooltip.appendMarkdown(`**Disk**\n\nUnavailable\n\n${snapshot.diskError ?? 'No data'}`);
    }

    const disk = snapshot.disk;
    return tooltip.appendMarkdown(
      [
        `**Disk** ${formatBytes(disk.freeBytes)} free · ${LEVEL_LABELS[levelFor(disk.usedRatio)]}`,
        `${formatBytes(disk.totalBytes - disk.freeBytes)} of ${formatBytes(disk.totalBytes)} used`,
        `\`${disk.path}\``,
      ].join('\n\n'),
    );
  }
}

function titleFor(kind: MetricKind): string {
  return { cpu: 'CPU', ram: 'RAM', disk: 'Disk' }[kind];
}