function vLog(message: string) {
  console.log(`[Velites] =====> ${message}`);
}

function vInfo(message: string) {
  console.info(`[Velites] =====> ${message}`);
}

function vError(message: string) {
  console.error(`[Velites] =====> ${message}`);
}

export { vLog, vInfo, vError };