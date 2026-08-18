// A purpose-built animated coffee cup for the Coffee Chat button's hover
// state. The cup/lid shapes are the exact raphael:coffee icon paths from
// Figma (the same icon this button originally used, before it needed to
// animate) — split into the two layers Figma's file selects as reference
// (node 5:13/5:15 the cup, 5:14 the lid), positioned at their native
// offsets.
//
// The viewBox is 20x40, not 20x20 — taller than the drawn cup itself —
// with the cup/lid sitting in the bottom half (same visual position as a
// centered 20x20 icon would occupy). The extra height above is what lets
// the stream start at y=0, which the button renders at its own inner top
// edge (this SVG is stretched to h-full in HoloCard.jsx), so the pour
// visibly originates from the button's top rather than from mid-air
// above the cup.
//
// Plain CSS group-hover transitions, not Motion's whileHover/variants —
// under this card's 3D flip wrapper (transform-style: preserve-3d on an
// ancestor), Motion's hover gesture silently stops triggering descendant
// animations even though the underlying pointerenter DOM event still
// fires normally and hit-tests the right element. Matches the LinkedIn
// button's own group-hover pattern, which is unaffected since it's pure
// CSS with no JS gesture layer involved.
export function CoffeeCup({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 40" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax meet">
      {/* The stream — anchored at the very top of the button's own inner
          edge, grows downward into the cup's opening once the lid clears
          out of the way. Tapered (wide at the pour, necking in under
          "gravity", flaring slightly again where it meets the cup) rather
          than a uniform bar, so it reads as liquid rather than a rod.
          Colored like actual coffee — the only part of the icon that
          isn't the flat #2E2E2E used everywhere else. */}
      <path
        d="M9.05 0H10.95C10.95 3 10.5 5.5 10.5 8C10.5 10.5 10.65 13 10.65 15.5C10.65 16.4 10.3 17 10 17C9.7 17 9.35 16.4 9.35 15.5C9.35 13 9.5 10.5 9.5 8C9.5 5.5 9.05 3 9.05 0Z"
        fill="#6F4E37"
        style={{ transformBox: "fill-box" }}
        className="origin-top scale-y-0 opacity-0 transition-all duration-[350ms] delay-0 ease-out group-hover:scale-y-100 group-hover:opacity-100 group-hover:delay-150 motion-reduce:transition-none"
      />

      {/* The cup — stays put. */}
      <g transform="translate(4.9025, 16.1569)">
        <path
          d="M0 0.0831199L1.27187 10.9287C1.27187 11.5393 2.98438 12.035 5.09688 12.035C7.20937 12.035 8.92187 11.5393 8.92187 10.9287L10.4094 0C8.875 0.64 6.15187 0.70875 5.09812 0.70875C4.09187 0.70875 1.56376 0.64625 0.00125003 0.0837502L0 0.0831199Z"
          fill="#2E2E2E"
        />
      </g>

      {/* The lid — pivots open from its back-left corner. Nested groups on
          purpose: an animated `transform` CSS property takes over the
          `transform` attribute on whatever element it's applied to, so it
          can't share a static translate="..." with its own animation —
          the outer <g> handles static position, the inner <g> only the
          open/close motion, relative to the path's own local coords. */}
      <g transform="translate(4.218, 11.81)">
        <g
          style={{ transformBox: "fill-box", transformOrigin: "0% 100%" }}
          className="transition-transform duration-[250ms] ease-out group-hover:-translate-x-[1.5px] group-hover:-translate-y-[1.2px] group-hover:-rotate-[32deg] motion-reduce:transition-none"
        >
          <path
            d="M10.8625 1.78625L10.6275 0.73625C10.6275 0.33 8.4575 0 5.78125 0C3.105 0 0.935 0.33125 0.935 0.7375L0.7 1.78562C0.25375 1.96312 0 2.16562 0 2.38125V3.18437C0 3.87187 2.58875 4.43063 5.78125 4.43063C8.97375 4.43063 11.5625 3.87187 11.5625 3.18375V2.38063C11.5625 2.165 11.3087 1.96187 10.8625 1.785V1.78625Z"
            fill="#2E2E2E"
          />
        </g>
      </g>
    </svg>
  );
}
