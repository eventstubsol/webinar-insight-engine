
// Format duration in seconds to a human-readable string (e.g., "1h 30m")
export function formatDuration(durationInSeconds: number): string {
  if (!durationInSeconds || durationInSeconds < 0) return 'N/A';
  
  const hours = Math.floor(durationInSeconds / 3600);
  const minutes = Math.floor((durationInSeconds % 3600) / 60);
  const seconds = Math.floor(durationInSeconds % 60);
  
  let result = '';
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0 || hours > 0) result += `${minutes}m `;
  if (seconds > 0 && hours === 0) result += `${seconds}s`;
  
  return result.trim();
}
