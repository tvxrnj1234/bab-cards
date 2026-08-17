/** Decorative signature doodle — static, not an interactive canvas. See
 * the "Doodle field" decision: each card supplies its own filled artwork
 * (`path` + matching `viewBox`), pulled directly from Figma. */
export function Doodle({ path, viewBox = "0 0 36 33", fill = "#1E1E1E", className }) {
  return (
    <svg className={className} viewBox={viewBox} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d={path} fill={fill} />
    </svg>
  );
}
