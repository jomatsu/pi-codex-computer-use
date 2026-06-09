#!/usr/bin/env tsx

import { checkComputerUseStatus, formatComputerUseStatus } from "../src/status.ts";

const cwd = process.argv[2] ?? process.cwd();
const status = await checkComputerUseStatus(cwd);
console.log(formatComputerUseStatus(status));
process.exitCode = status.reason === "ready" ? 0 : 1;
