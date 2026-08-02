/**
 * Build a plain map-search URL from free text. No geolocation API, no
 * coordinates, no permission prompt — it is just a link the user can click.
 */
export function mapsSearchUrl(location) {
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(location)}`
}
