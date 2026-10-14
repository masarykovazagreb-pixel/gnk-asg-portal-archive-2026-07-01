const PROTECTED_ROUTE_TOKEN = /(?:^|[\/-])(?:spt|bank(?:s|ing|a|e|i|u|om|ama|ov[a-z]*|ar[a-z]*)?|banc(?:i[a-z]*|a|e|u|om|ama)|adria-?bank)(?=$|[\/-])/i;

export function isProtectedEditorialRoute(route) {
  return PROTECTED_ROUTE_TOKEN.test(String(route ?? ''));
}
