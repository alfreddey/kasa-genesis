import type { ReactNode } from "react";
import { type CoverScene, coverPalette, coverScene } from "@/lib/home";

/**
 * Generated cover: one of six places (hills, a baobab at sunset, a moonlit night, a river, a
 * village, palms by the sea) in one of four palettes, both picked from the story id. Drawn on a
 * 200x150 canvas that is cropped to fit, so keep the important shapes near the middle. Colors come
 * from the --cover-* variables set by the palette class in globals.css. Real cover art will
 * replace this once stories carry an image.
 */
export function CoverArt({ id, children }: { id: string; children?: ReactNode }) {
  const scene = coverScene(id);
  return (
    <div className={`cover cover-${coverPalette(id)} cover-scene-${scene}`} aria-hidden="true">
      <svg viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice" focusable="false">
        {SCENES[scene]}
      </svg>
      {children}
    </div>
  );
}

const sky = <rect className="cover-sky" width="200" height="150" />;
const sun = (cx: number, cy: number, r: number) => (
  <>
    <circle className="cover-glow" cx={cx} cy={cy} r={r * 1.5} />
    <circle className="cover-sun" cx={cx} cy={cy} r={r} />
  </>
);
const birds = (
  <g className="cover-line">
    <path d="M60 38q5-6 9 0q5-6 9 0" />
    <path d="M84 52q4-5 7 0q4-5 7 0" />
  </g>
);

const SCENES: Record<CoverScene, ReactNode> = {
  hills: (
    <>
      {sky}
      {sun(140, 42, 20)}
      {birds}
      <ellipse className="cover-far" cx="50" cy="150" rx="110" ry="58" />
      <ellipse className="cover-mid" cx="160" cy="158" rx="100" ry="52" />
      <ellipse className="cover-near" cx="80" cy="172" rx="120" ry="44" />
    </>
  ),
  baobab: (
    <>
      {sky}
      {sun(78, 96, 30)}
      <rect className="cover-far" y="104" width="200" height="46" />
      <ellipse className="cover-mid" cx="150" cy="150" rx="130" ry="34" />
      <g className="cover-near">
        <path d="M118 124c1-16-1-30-5-40l-12-10 4-4 11 8-2-16 6-1 3 17 9-12 5 3-10 15c2 12 3 26 3 40z" />
        <ellipse cx="102" cy="64" rx="15" ry="8" />
        <ellipse cx="121" cy="50" rx="17" ry="9" />
        <ellipse cx="141" cy="62" rx="15" ry="8" />
        <ellipse cx="122" cy="66" rx="12" ry="6" />
      </g>
      <ellipse className="cover-near" cx="60" cy="166" rx="120" ry="30" />
    </>
  ),
  night: (
    <>
      <rect className="cover-night-sky" width="200" height="150" />
      <circle className="cover-moon" cx="138" cy="44" r="19" />
      <circle className="cover-night-sky" cx="147" cy="38" r="16" />
      <g className="cover-star">
        <circle cx="44" cy="28" r="2.2" />
        <circle cx="76" cy="50" r="1.6" />
        <circle cx="98" cy="22" r="2" />
        <circle cx="170" cy="74" r="1.8" />
        <circle cx="30" cy="66" r="1.6" />
        <circle cx="114" cy="72" r="1.4" />
        <path d="M60 78l1.8 4.2 4.2 1.8-4.2 1.8-1.8 4.2-1.8-4.2-4.2-1.8 4.2-1.800z" />
      </g>
      <ellipse className="cover-night-far" cx="150" cy="152" rx="110" ry="50" />
      <ellipse className="cover-night-near" cx="50" cy="164" rx="120" ry="48" />
      <g>
        <path className="cover-night-far" d="M60 104l22-20 22 20z" />
        <rect className="cover-night-hut" x="66" y="104" width="32" height="20" rx="2" />
        <rect className="cover-moon" x="77" y="109" width="10" height="15" rx="5" />
      </g>
    </>
  ),
  river: (
    <>
      {sky}
      {sun(56, 40, 18)}
      <ellipse className="cover-far" cx="150" cy="96" rx="90" ry="30" />
      <ellipse className="cover-far" cx="30" cy="100" rx="70" ry="24" />
      <rect className="cover-mid" y="92" width="200" height="58" />
      <path
        className="cover-water"
        d="M112 92c-26 10 30 18 4 30c-24 11-50 14-66 28h104c-6-14 22-18 26-30c5-14-40-16-34-28z"
      />
      <g className="cover-line cover-line-light">
        <path d="M96 128q8-4 16 0" />
        <path d="M118 112q7-3 14 0" />
      </g>
      <g className="cover-near">
        <path d="M24 150c0-14 2-26 6-34 1 10 2 22 2 34zM36 150c0-10 3-20 8-26-1 9-1 18-1 26zM176 150c0-12-2-22-6-30-1 10-2 20-2 30z" />
      </g>
    </>
  ),
  village: (
    <>
      {sky}
      {sun(150, 38, 17)}
      <ellipse className="cover-far" cx="40" cy="112" rx="90" ry="30" />
      <rect className="cover-mid" y="104" width="200" height="46" />
      <path className="cover-path" d="M92 150c2-16 10-26 22-34h10c-8 10-10 20-8 34z" />
      <g>
        <rect className="cover-wall" x="44" y="86" width="44" height="32" rx="4" />
        <path className="cover-roof" d="M34 90l32-34 32 34z" />
        <rect className="cover-door" x="59" y="98" width="14" height="20" rx="7" />
      </g>
      <g>
        <rect className="cover-wall" x="124" y="94" width="34" height="24" rx="4" />
        <path className="cover-roof" d="M116 97l25-27 25 27z" />
        <rect className="cover-door" x="136" y="103" width="10" height="15" rx="5" />
      </g>
    </>
  ),
  palms: (
    <>
      {sky}
      {sun(100, 82, 24)}
      <rect className="cover-water" y="86" width="200" height="34" />
      <g className="cover-line cover-line-light">
        <path d="M84 96h32M90 104h20M70 100h8M124 100h10" />
      </g>
      <path className="cover-sand" d="M0 116q50-12 100-4t100-6v44H0z" />
      <g className="cover-near">
        <path d="M44 134c2-22 0-42-8-58l5-2c10 16 13 38 11 60z" />
        <path d="M38 76c-12-10-24-10-32-4 12-2 20 2 30 8zM38 76c-4-14-14-22-26-22 10 4 16 12 22 24zM40 75c4-14 14-20 26-18-10 2-18 8-24 20zM40 77c12-6 24-4 30 4-10-4-18-4-30 0zM38 78c-10 2-18 10-20 20 6-8 12-14 22-17z" />
        <path d="M162 138c-2-18 0-34 6-46l5 2c-6 12-7 28-5 44z" />
        <path d="M170 92c10-8 20-8 26-3-9-2-16 1-25 6zM170 92c4-11 12-17 22-17-8 3-13 9-19 19zM169 91c-4-11-12-16-22-15 8 2 14 7 20 16zM169 93c-10-5-20-3-25 3 8-3 15-3 25 0z" />
      </g>
    </>
  ),
};
