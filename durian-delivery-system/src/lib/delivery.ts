const MY_TIMEZONE = "Asia/Kuala_Lumpur";

export function getTomorrowDateMY(now = new Date()): string {
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: MY_TIMEZONE,
  }).format(now);
  const [year, month, day] = todayStr.split("-").map(Number);
  const tomorrow = new Date(year, month - 1, day + 1);

  return [
    tomorrow.getFullYear(),
    String(tomorrow.getMonth() + 1).padStart(2, "0"),
    String(tomorrow.getDate()).padStart(2, "0"),
  ].join("-");
}

export function formatDeliveryDateMY(dateValue: string): string {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("ms-MY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
