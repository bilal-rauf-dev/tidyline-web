/**
 * Home-only feature illustrations. They deliberately carry no metrics; each
 * variant gives a real TidyLine capability a small editorial line drawing.
 */
export function HomeDaybreak({ variant = 0 }) {
  return (
    <svg
      className={`home-daybreak-art home-daybreak-art-${variant}`}
      viewBox="0 0 260 190"
      role="img"
      aria-hidden="true"
    >
      {variant === 0 && (
        <>
          <path className="daybreak-sun" d="M88 125a49 49 0 0 1 98 0" />
          <path className="daybreak-horizon" d="M26 142h208" />
          <path className="daybreak-path" d="M92 164c22-20 23-43 47-54 18-8 27-22 31-44" />
          <path className="daybreak-ray" d="M192 43h23M203.5 31.5v23M195.5 35l16 16M211.5 35l-16 16" />
          <circle className="daybreak-dot dot-one" cx="46" cy="58" r="5" />
          <circle className="daybreak-dot dot-two" cx="217" cy="104" r="3" />
          <path className="daybreak-scribble" d="M35 94c18-18 33 15 51-3s32 10 47-8" />
        </>
      )}
      {variant === 1 && (
        <>
          <path className="daybreak-grid" d="M38 48v92M70 48v92M102 48v92M134 48v92M166 48v92M198 48v92M230 48v92M38 48h192M38 80h192M38 112h192M38 140h192" />
          <path className="daybreak-chart" d="M38 119c20-2 20-32 39-25 18 7 20 22 36 17 18-6 23-48 42-39 16 8 17 22 32 13 16-10 22-37 43-42" />
          <circle className="daybreak-chart-point" cx="230" cy="43" r="5" />
          <path className="daybreak-ray" d="M220 43h20M230 33v20M223 36l14 14M237 36l-14 14" />
        </>
      )}
      {variant === 2 && (
        <>
          <rect className="daybreak-calendar" x="58" y="54" width="142" height="104" rx="3" />
          <path className="daybreak-calendar-line" d="M58 81h142M91 43v22M167 43v22" />
          <path className="daybreak-calendar-mark" d="m88 108 13 13 23-26M141 108h39M141 128h28" />
          <circle className="daybreak-dot dot-one" cx="40" cy="57" r="4" />
          <circle className="daybreak-dot dot-two" cx="218" cy="135" r="4" />
          <path className="daybreak-ray" d="M210 47h22M221 36v22M213 39l16 16M229 39l-16 16" />
        </>
      )}
    </svg>
  )
}
