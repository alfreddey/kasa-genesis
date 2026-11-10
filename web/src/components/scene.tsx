/**
 * The world behind every page: sky, sun and drifting clouds by day; moon, stars and fireflies in
 * dark mode; soft hills and an acacia along the bottom. Purely decorative and fixed in place.
 * Text never relies on it for contrast: content sits on paper surfaces, and the hills stay pale by
 * day so headings that scroll over them remain readable.
 */
export function Scene() {
  return (
    <div className="scene" aria-hidden="true">
      <span className="scene-stars" />
      <span className="scene-sun" />
      <span className="scene-cloud scene-cloud-1" />
      <span className="scene-cloud scene-cloud-2" />
      <span className="scene-cloud scene-cloud-3" />
      <span className="scene-firefly scene-firefly-1" />
      <span className="scene-firefly scene-firefly-2" />
      <span className="scene-firefly scene-firefly-3" />
      <svg className="scene-tree" viewBox="0 0 160 150" focusable="false">
        <path d="M76 150c2-30 0-52-6-70l-22-14 5-6 19 11-6-22 8-2 8 24 16-16 6 6-18 22c5 20 7 42 6 67z" />
        <ellipse cx="40" cy="52" rx="34" ry="12" />
        <ellipse cx="84" cy="34" rx="44" ry="14" />
        <ellipse cx="124" cy="54" rx="32" ry="11" />
      </svg>
      <svg
        className="scene-hills"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        focusable="false"
      >
        <path className="scene-hill-1" d="M0 150C240 50 480 60 720 150s480 90 720-30v200H0z" />
        <path className="scene-hill-2" d="M0 220c200-80 420-60 640 0s460 80 800-30v130H0z" />
        <path className="scene-hill-3" d="M0 276c300-60 600 30 900-10s400-40 540 4v50H0z" />
      </svg>
    </div>
  );
}
