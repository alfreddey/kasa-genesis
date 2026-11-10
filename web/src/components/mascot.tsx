type Mood = "happy" | "oops";

/**
 * Ananse, the little spider who tells the stories (the spider is the storyteller in Akan and
 * Ewe folktales). Decorative only: it is hidden from screen readers, so always pair it with text.
 * `hanging` draws the thread it dangles from; the CSS classes mascot-swing and mascot-bob move it.
 */
export function Mascot({
  mood = "happy",
  hanging = false,
  className = "",
}: {
  mood?: Mood;
  hanging?: boolean;
  className?: string;
}) {
  return (
    <svg
      className={`mascot ${className}`.trim()}
      viewBox="0 0 120 140"
      aria-hidden="true"
      focusable="false"
    >
      {hanging && <path className="mascot-thread" d="M60 0v50" />}
      <g className="mascot-legs">
        <path d="M34 66Q14 52 9 68" />
        <path d="M30 78Q8 74 6 92" />
        <path d="M31 90Q12 96 12 112" />
        <path d="M38 102Q26 114 28 126" />
        <path d="M86 66Q106 52 111 68" />
        <path d="M90 78Q112 74 114 92" />
        <path d="M89 90Q108 96 108 112" />
        <path d="M82 102Q94 114 92 126" />
      </g>
      <g className="mascot-feet">
        <circle cx="9" cy="68" r="5" />
        <circle cx="6" cy="92" r="5" />
        <circle cx="12" cy="112" r="5" />
        <circle cx="28" cy="126" r="5" />
        <circle cx="111" cy="68" r="5" />
        <circle cx="114" cy="92" r="5" />
        <circle cx="108" cy="112" r="5" />
        <circle cx="92" cy="126" r="5" />
      </g>
      <ellipse className="mascot-body" cx="60" cy="82" rx="34" ry="31" />
      <ellipse className="mascot-shine" cx="46" cy="60" rx="12" ry="5" />
      <g className="mascot-eyes">
        <circle className="mascot-eye" cx="48" cy="77" r="11.5" />
        <circle className="mascot-eye" cx="72" cy="77" r="11.5" />
        <circle className="mascot-pupil" cx="50" cy="79" r="5.5" />
        <circle className="mascot-pupil" cx="70" cy="79" r="5.5" />
        <circle className="mascot-glint" cx="52" cy="76.5" r="2" />
        <circle className="mascot-glint" cx="72" cy="76.5" r="2" />
      </g>
      <ellipse className="mascot-cheek" cx="36" cy="92" rx="5.5" ry="3.5" />
      <ellipse className="mascot-cheek" cx="84" cy="92" rx="5.5" ry="3.5" />
      {mood === "happy" ? (
        <path className="mascot-mouth" d="M51 95Q60 104 69 95" />
      ) : (
        <path className="mascot-mouth" d="M53 100Q60 94 67 100" />
      )}
    </svg>
  );
}
