export const DEFAULT_DURATION_MIN = 120;

export function addMinutesToTime(time: string, minutes: number) {
  const [hours, mins] = time.split(":").map(Number);
  const total = (hours * 60 + mins + minutes + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function resolveEndTime(startTime: string, endTime?: string | null) {
  return endTime && /^\d{1,2}:\d{2}$/.test(endTime) ? endTime : addMinutesToTime(startTime, DEFAULT_DURATION_MIN);
}

export function formatInterval(startTime: string, endTime?: string | null) {
  return `${startTime}–${resolveEndTime(startTime, endTime)}`;
}
