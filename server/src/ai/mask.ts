const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g
// bangladeshi mobile numbers like 01712345678, +880 1712-345678, 01712 345 678
const BD_PHONE = /(?:\+?88[\s-]?)?01[3-9](?:[\s-]?\d){8}\b/g
const OTHER_PHONE = /\+\d(?:[\s-]?\d){7,13}\b/g

export function maskPii(text: string) {
  return text.replace(EMAIL, '[email]').replace(BD_PHONE, '[phone]').replace(OTHER_PHONE, '[phone]')
}
