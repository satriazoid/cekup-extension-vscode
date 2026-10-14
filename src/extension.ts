import * as vscode from 'vscode';
import { StatsTreeProvider } from './statsTreeProvider';
import { SystemStats } from './systemStats';

const VIEW_ID = 'cekup.stats';
const DEFAULT_INTERVAL = 2000;

export function activate(context: vscode.ExtensionContext): void {
  const provider = new StatsTreeProvider(new SystemStats());
  const view = vscode.window.createTreeView(VIEW_ID, {
    treeDataProvider: provider,
    showCollapseAll: false,
  });

  let timer: NodeJS.Timeout | undefined;
  let refreshing = false;

  const refresh = async (): Promise<void> => {
    if (refreshing) {
      return;
    }
    refreshing = true;
    try {
      const snapshot = await provider.readNow(
        vscode.workspace.getConfiguration('cekup').get<string>('diskPath'),
      );
      provider.refresh(snapshot);
    } catch (error) {
      console.error('[cekup] refresh failed', error);
    } finally {
      refreshing = false;
    }
  };

  const interval = (): number =>
    vscode.workspace.getConfiguration('cekup').get<number>('refreshInterval') ?? DEFAULT_INTERVAL;

  const stop = (): void => {
    if (timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };

  const start = (): void => {
    stop();
    void refresh();
    timer = setInterval(() => void refresh(), Math.max(500, interval()));
  };

  // Only poll while the view is on screen, so a collapsed view costs nothing.
  view.onDidChangeVisibility((event) => {
    if (event.visible) {
      start();
    } else {
      stop();
    }
  });

  context.subscriptions.push(
    view,
    new vscode.Disposable(stop),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('cekup.refreshInterval')) {
        start();
      }
    }),
  );

  start();
}

export function deactivate(): void {}