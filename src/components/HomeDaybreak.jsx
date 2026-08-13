/**
 * Decorative Home-only line illustration. It deliberately carries no data:
 * the uneven path, rising arc and small star add warmth between dense cards.
 */
export function HomeDaybreak() {
  return (
    <svg
      className="home-daybreak-art"
      viewBox="0 0 260 190"
      role="img"
      aria-label="An abstract path rising toward a star"
    >
      <path className="daybreak-sun" d="M88 125a49 49 0 0 1 98 0" />
      <path className="daybreak-horizon" d="M26 142h208" />
      <path className="daybreak-path" d="M92 164c22-20 23-43 47-54 18-8 27-22 31-44" />
      <path className="daybreak-ray" d="M192 43h23M203.5 31.5v23M195.5 35l16 16M211.5 35l-16 16" />
      <circle className="daybreak-dot dot-one" cx="46" cy="58" r="5" />
      <circle className="daybreak-dot dot-two" cx="217" cy="104" r="3" />
      <path className="daybreak-scribble" d="M35 94c18-18 33 15 51-3s32 10 47-8" />
    </svg>
  )
}
