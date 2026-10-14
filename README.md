# Cekup

Lightweight CPU, RAM, and disk monitor for the VS Code Activity Bar.

## Features

- CPU usage percentage, core count, and CPU model
- RAM usage percentage and used/total bytes
- Free space on the primary drive
- Color-coded status: green below 50%, yellow at 50–80%, red above 80%
- Polling stops when the view is hidden

## Settings

| Setting | Default | Description |
| :--- | :--- | :--- |
| `cekup.refreshInterval` | `2000` | Milliseconds between refreshes (min 500). |
| `cekup.diskPath` | `""` | Path to monitor. Empty means the primary drive. |

## Development

```sh
pnpm install
pnpm run build      # bundle to dist/extension.js
pnpm run watch      # rebuild on change
pnpm run typecheck
pnpm run benchmark  # measure per-cycle cost
pnpm run package    # build and produce a .vsix
```

Press <kbd>F5</kbd> to launch an Extension Host with the extension loaded.

## Implementation notes

- CPU and RAM come from the Node `os` module. The first CPU read only sets a baseline and reports 0%.
- Disk space uses `fs.promises.statfs()` instead of the `diskusage` package named in the PRD. `diskusage` requires a native `node-gyp` build, which would make installation fail without a C++ toolchain. `statfs` is built into Node 18.15+ and supported on Windows, macOS, and Linux.
- No animations: numbers change instantly and the tree refreshes in place.

## Measured overhead

From `pnpm run benchmark` on an 8-core Windows machine:

```
cpu+ram per cycle:  0.33 ms
disk per cycle:     0.45 ms
heap used:          4.8 MB
```

At the default 2-second interval this is roughly 0.4 ms of work per second, well under the 1% idle target.