import os from 'os';
import { SystemStats } from '../out/systemStats.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const stats = new SystemStats();

// 1. Cost of one collection cycle, measured without sleeping in between.
const tightIterations = 600;
stats.readCpu(); // baseline
const tightStarted = process.hrtime.bigint();
for (let i = 0; i < tightIterations; i++) {
  stats.readCpu();
  stats.readRam();
}
const tightMs = Number(process.hrtime.bigint() - tightStarted) / 1e6 / tightIterations;

// 2. Accuracy, measured across intervals long enough to clear OS timer granularity.
const spacedSamples = [];
for (let i = 0; i < 6; i++) {
  const cpu = stats.readCpu();
  const ram = stats.readRam();
  spacedSamples.push([cpu.usage, ram.usage]);
  const busyUntil = Date.now() + 120;
  while (Date.now() < busyUntil) {
    // burn one core so CPU usage is not idle
  }
  await sleep(200);
}

// 3. Disk read cost.
const diskIterations = 20;
const diskStarted = process.hrtime.bigint();
for (let i = 0; i < diskIterations; i++) {
  await stats.readDisk();
}
const diskMs = Number(process.hrtime.bigint() - diskStarted) / 1e6 / diskIterations;

const [cpu, ram] = spacedSamples[spacedSamples.length - 1];

console.log(`cpu+ram per cycle:  ${tightMs.toFixed(3)} ms`);
console.log(`disk per cycle:     ${diskMs.toFixed(3)} ms`);
console.log(`cpu while busy:     ${cpu.toFixed(1)}%`);
console.log(`ram:                ${ram.toFixed(1)}%`);
console.log(`heap used:          ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB`);
console.log(`cores:              ${os.cpus().length}`);