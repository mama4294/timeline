// Deterministic color generator for batches based on their batch number or id
export function getBatchKey(batch: any): string {
  return String(batch?.cr2b6_batchnumber ?? batch?.cr2b6_batchesid ?? "");
}

// Simple hash to H (0-360) then return an hsl color with fixed s/l
export function getBatchColor(batch: any): string {
  const key = getBatchKey(batch) || "";
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 70% 45%)`;
}
