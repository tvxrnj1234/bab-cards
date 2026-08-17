import { motion } from "motion/react";

/** Decorative signature doodle — static artwork (`path` + matching
 * `viewBox`, pulled directly from Figma), but it draws itself in once on
 * first load: a stroke traces the outline, then the fill settles in
 * behind it. Not interactive/drawable — see the "Doodle field" decision.
 *
 * A manual replay trigger (e.g. a play button) is expected later — that
 * would remount this via a changing `key` prop to retrigger the
 * initial->animate transition; nothing to build for that yet. */
export function Doodle({ path, viewBox = "0 0 36 33", fill = "#1E1E1E", className }) {
  return (
    <svg className={className} viewBox={viewBox} fill="none" xmlns="http://www.w3.org/2000/svg">
      <motion.path
        d={path}
        fill="none"
        stroke={fill}
        strokeWidth={0.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: "easeInOut" }}
      />
      <motion.path
        d={path}
        fill={fill}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.75 }}
      />
    </svg>
  );
}
