type Field = string | number | boolean | null;

/** One line per event, fixed shape. Never pass a request, headers, a cookie or a body. */
export function logEvent(event: string, fields: Record<string, Field> = {}): void {
  console.log(JSON.stringify({ event, ...fields }));
}
