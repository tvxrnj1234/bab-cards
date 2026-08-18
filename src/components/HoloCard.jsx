// The holographic exec card — pointer/orientation wiring ported from
// arlan.me/vault/holo's HoloCard.tsx (see /reference/holo-vault). The wiring
// pattern (two followers, a kick, idle drift, grab/release blends) is
// reused as-is; the markup and content are this project's own.
//
// TILT IS BACK ON, foil shimmer and the avatar duotone-flip stay off — per
// user decision: the shimmer/pattern/glare layers and the avatar's
// color-flip felt gimmicky against the clean Figma design, but the 3D tilt
// itself (the card rotating toward the pointer) is the point of the whole
// site. The engine (holoEngine.js) still computes everything for all three
// effects every frame (see applyFrame) — ENABLE_FOIL_SHIMMER and
// ENABLE_AVATAR_FLIP just gate whether the corresponding DOM layers render,
// so re-enabling either later is a one-line flip, not a rebuild.
import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue } from "motion/react";
import { FOILS, Follow, Kick, Orientation, applyFoil, applyFrame, fromPointer } from "../motion/holoEngine";
import { ArtIcon, LinkedInIcon, ReloadIcon } from "./icons";
import { CoffeeCup } from "./CoffeeCup";
import { Doodle } from "./Doodle";
import babLogo from "../assets/bab-logo.svg";
import babLogoMask from "../assets/bab-logo-mask.svg";
import "../motion/holoEngine.css";

const ENABLE_TILT = true;
const ENABLE_FOIL_SHIMMER = false;
const ENABLE_AVATAR_FLIP = false;
// Off for now — rejected two attempts (.holo-sheen's edge-catch box-shadow
// read as a blurred edge; .holo-glare's warm wash wasn't liked either).
// Starting the halo/sheen effect over from scratch. Both attempts are
// still in holoEngine.css if either is worth revisiting.
const ENABLE_SHEEN = false;
// Cube/block pattern (.holo-pattern/--lit), revealed in a soft band on the
// side the card's turned toward — --reveal/--reveal-angle/--reveal-x/-y,
// which applyFrame always computes. Gradient gold (see holoEngine.css)
// since Arlan's white + blend-mode hearts version can't show against this
// white card, and swapped from hearts to a simple isometric cube outline
// to match Blockchain at Berkeley. The iridescent sheen on top of these
// is a separate follow-up.
const ENABLE_PATTERN = true;

// Flat white print, matching the Figma card exactly (no gradient).
const BODY_GRADIENT = "#ffffff";
const TILE_DARK = "#5c4813";
const TILE_LIGHT = "#f6ecd2";

const ROLE_ICONS = { art: ArtIcon };

// Every text field is Geist now — the name at Medium weight, everything
// else (role/class-year, issued-on date, button labels) at Regular.
const geistStyle = { fontFamily: "'Geist', sans-serif" };
const monoStyle = { fontFamily: "'JetBrains Mono', monospace" };

export function HoloCard({ card }) {
  const hostRef = useRef(null);
  const cardRef = useRef(null);
  // The flip wrapper — applyFrame writes --rx/--ry here instead of on
  // cardRef so both faces inherit the same tilt (custom properties cascade
  // to all descendants, front and back alike), while cardRef stays the
  // applyFoil target since the foil layers only exist inside the front face.
  const flipRef = useRef(null);
  // Bumping this remounts <Doodle>, retriggering its draw-in animation —
  // what the PLAY label does.
  const [doodleReplay, setDoodleReplay] = useState(0);
  // Cumulative, not a rotateY:0/360 whileHover toggle — a toggle reverts
  // on hover-out by interpolating 360deg back to 0deg numerically (same
  // angle, different value), which plays as an uncontrolled reverse spin.
  // Driving it explicitly instead: +1 turn on mouse-enter, -1 on
  // mouse-leave, so the flip-in and flip-out are the same motion in
  // reverse, on purpose, rather than a snap.
  const [badgeSpins, setBadgeSpins] = useState(0);

  // Drag-to-flip — dragging the card sideways spins it around its Y axis
  // to reveal the B@B logo on the back, like flipping a physical card.
  // flipY is a live motion value: it tracks the drag offset in real time
  // (dragElastic is 0 and dragConstraints pin the element in place, so the
  // drag itself never moves the card — only this value, driving rotateY,
  // does) and springs to the nearest resting face on release.
  //
  // homeTurnsRef counts half-turns (not clamped to a front/back boolean),
  // so a drag to the right always advances it by +1 and a drag to the left
  // always retreats it by -1 — the card keeps spinning the way you dragged
  // it instead of snapping back through the front to reach a fixed +180.
  // A ref because the drag handlers read/write it every frame and don't
  // need a re-render.
  const flipY = useMotionValue(0);
  const homeTurnsRef = useRef(0);
  const dragStartRef = useRef(0);

  const handleDragStart = () => {
    dragStartRef.current = flipY.get();
  };

  const handleDrag = (_e, info) => {
    flipY.set(dragStartRef.current + info.offset.x * 0.6);
  };

  const handleDragEnd = (_e, info) => {
    const dragged = Math.abs(info.offset.x) > 60 || Math.abs(info.velocity.x) > 500;
    if (dragged) homeTurnsRef.current += info.offset.x > 0 ? 1 : -1;
    animate(flipY, homeTurnsRef.current * 180, { type: "spring", stiffness: 260, damping: 24 });
  };

  // ONE MATERIAL, NOT A CAROUSEL — see engine source notes.
  const foil = FOILS[0];

  useEffect(() => {
    if (ENABLE_FOIL_SHIMMER && cardRef.current) {
      applyFoil(cardRef.current, foil, {
        photoUrl: card.photo,
        bodyGradient: BODY_GRADIENT,
        tileDark: TILE_DARK,
        tileLight: TILE_LIGHT,
      });
    }
  }, [foil, card.photo]);

  useEffect(() => {
    if (!ENABLE_TILT) return;
    const host = hostRef.current;
    const cardEl = flipRef.current;
    if (!host || !cardEl) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Lower stiffness than the source's 0.16 — with foil/glare off, this
    // follower is the only thing giving the tilt its weight, so it needed
    // to carry more of the smoothing on its own to still feel damped
    // rather than snapping straight to the pointer.
    const tilt = new Follow(0.1);
    const sheet = new Follow(0.09);
    const kick = new Kick();
    const t0 = performance.now();

    let raf = 0;
    let running = false;
    let onScreen = false;
    let hidden = false;
    let touched = false;
    let release = 1;
    let handoff = { x: 0, y: 0 };
    let grab = 1;
    let grabFrom = { x: 0, y: 0 };
    let aim = { x: 0, y: 0 };

    const frame = () => {
      raf = 0;

      if (!touched) {
        // Source drifts toward a slow idle wander here instead of flat —
        // per user decision, this card resets to its original position
        // when the cursor leaves rather than staying "alive" with motion.
        release = Math.min(1, release + 0.016);
        const k = release * release;
        tilt.target = {
          x: handoff.x + (0 - handoff.x) * k,
          y: handoff.y + (0 - handoff.y) * k,
        };
      }

      if (touched) {
        grab = Math.min(1, grab + 0.014);
        const k = grab * grab;
        tilt.target = {
          x: grabFrom.x + (aim.x - grabFrom.x) * k,
          y: grabFrom.y + (aim.y - grabFrom.y) * k,
        };
      }

      const k = kick.step();
      if (k.x || k.y) {
        tilt.target = { x: tilt.target.x + k.x, y: tilt.target.y + k.y };
      }

      tilt.step();
      sheet.target = tilt.value;
      sheet.step();

      applyFrame(cardEl, tilt.value, sheet.value, foil, foil, {
        speed: sheet.speed,
        velocity: sheet.velocity,
        time: (performance.now() - t0) / 1000,
      });

      if (
        running &&
        (!touched || release < 1 || grab < 1 || kick.active || !tilt.settled || !sheet.settled)
      ) {
        raf = requestAnimationFrame(frame);
      }
    };

    const wake = () => {
      if (!running || raf) return;
      raf = requestAnimationFrame(frame);
    };

    const onPointer = (e) => {
      if (reduced) return;
      aim = fromPointer(host.getBoundingClientRect(), e.clientX, e.clientY);
      if (!touched) {
        touched = true;
        grabFrom = { x: tilt.value.x, y: tilt.value.y };
        grab = 0;
      }
      release = 0;
      wake();
    };

    const onLeave = () => {
      touched = false;
      handoff = { x: tilt.value.x, y: tilt.value.y };
      release = 0;
      grab = 1;
      kick.fire(tilt.velocity);
      wake();
    };

    const sync = () => {
      const should = onScreen && !hidden && !reduced;
      if (should === running) return;
      running = should;
      if (should) wake();
      else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const io = new IntersectionObserver(
      (es) => {
        onScreen = es.some((e) => e.isIntersecting);
        sync();
      },
      { rootMargin: "200px" },
    );
    io.observe(host);

    const onVis = () => {
      hidden = document.hidden;
      sync();
    };
    document.addEventListener("visibilitychange", onVis);

    const orient = new Orientation();
    const onOrient = (e) => {
      if (reduced) return;
      const v = orient.read(e);
      if (!v) return;
      touched = true;
      tilt.target = v;
      wake();
    };

    host.addEventListener("pointermove", onPointer);
    host.addEventListener("pointerleave", onLeave);
    window.addEventListener("deviceorientation", onOrient);

    return () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      host.removeEventListener("pointermove", onPointer);
      host.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("deviceorientation", onOrient);
    };
    // `foil` is fixed for the life of this card — deliberately not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const RoleIcon = ROLE_ICONS[card.roleIcon];

  return (
    <div className="flex w-full flex-col items-center gap-8">
      <div
        ref={hostRef}
        role="img"
        aria-label={`${card.name}, ${card.role}, B@B exec member card`}
        data-holo-lite=""
        className="relative flex w-full max-w-[424px] select-none"
        style={{ perspective: "1100px" }}
      >
        <motion.div
          ref={flipRef}
          className="relative w-full [transform-style:preserve-3d]"
          // Under preserve-3d, hit-testing follows real 3D depth, not paint
          // order — this wrapper's own untransformed plane can end up in
          // front of the tilted front/back faces' receded corners at some
          // angles, stealing pointer events meant for the buttons beneath.
          // pointer-events: none takes the wrapper itself out of hit-testing
          // entirely; the drag gesture still works because the pointerdown
          // that starts it bubbles up from a child (which stays interactive)
          // regardless of the ancestor's own pointer-events value.
          style={{ rotateY: flipY, pointerEvents: "none" }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0}
          dragMomentum={false}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
        >
          <div
            ref={cardRef}
            className="holo-card w-full bg-white"
            style={{ backfaceVisibility: "hidden", pointerEvents: "auto" }}
          >
            {ENABLE_FOIL_SHIMMER && (
              <div className="holo-fx">
                <div className="holo-body" />
                <div className="holo-pattern" />
                <div className="holo-pattern--lit" />
                <div className="holo-foil" />
                <div className="holo-foil--b" />
                <div className="holo-foil--c" />
                <div className="holo-smear" />
                <div className="holo-spot" />
                <div className="holo-noise" />
                <div className="holo-glare" />
              </div>
            )}
            {ENABLE_SHEEN && <div className="holo-glare" />}
            {ENABLE_PATTERN && (
              <>
                <div className="holo-pattern" />
                <div className="holo-pattern--lit" />
              </>
            )}

            <div className="holo-content relative flex w-full flex-col items-start gap-2 px-[22px] py-8">
              {/* Identity Row */}
              <div className="flex w-full items-center gap-5">
                <div
                  className="relative shrink-0"
                  style={{ width: 62, height: 62 }}
                  onMouseEnter={() => setBadgeSpins((n) => n + 1)}
                  onMouseLeave={() => setBadgeSpins((n) => n - 1)}
                >
                  <div className="absolute inset-0 overflow-hidden rounded-full">
                    <img src={card.photo} alt="" className="h-full w-full object-cover" />
                    {ENABLE_AVATAR_FLIP && (
                      <div className="holo-tile absolute inset-0">
                        <div className="holo-tile__photo--neg" />
                        <div className="holo-tile__duo" />
                        <div className="holo-tile__tone" />
                        <div className="holo-tile__foil" />
                        <div className="holo-tile__grain" />
                        <div className="holo-tile__wear" />
                        <div className="holo-tile__vignette" />
                        <div className="holo-tile__gloss" />
                      </div>
                    )}
                  </div>
                  {RoleIcon && (
                    // The white ring is a static gap, not part of the coin —
                    // it lives on this outer, non-animated wrapper so only
                    // the gold circle underneath flips. Solid white fill
                    // here too, so the avatar photo never peeks through the
                    // thinned ellipse mid-spin — without it, this wrapper
                    // has no backing of its own and the photo shows through.
                    <div
                      className="absolute rounded-full"
                      style={{
                        width: 20,
                        height: 20,
                        left: 45,
                        top: 42,
                        backgroundColor: "#ffffff",
                        boxShadow: "0 0 0 2px #ffffff",
                        perspective: 200,
                      }}
                    >
                      <motion.div
                        className="flex h-full w-full items-center justify-center rounded-full"
                        style={{ backgroundColor: card.badgeColor }}
                        animate={{ rotateY: badgeSpins * 360 }}
                        transition={{ duration: 0.6, ease: "easeInOut" }}
                      >
                        <RoleIcon className="h-[10px] w-[10px]" />
                      </motion.div>
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
                  <p
                    className="m-0 truncate text-[22px] font-medium leading-[1.1] text-[#2e2e2e]"
                    style={{ ...geistStyle, letterSpacing: "-0.11px" }}
                  >
                    {card.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="whitespace-nowrap text-[13.5px] font-light text-[#838383]" style={geistStyle}>
                      {card.role}
                    </span>
                    <span className="h-[3px] w-[3px] shrink-0 rounded-full bg-[#838383]" />
                    <span className="whitespace-nowrap text-[13.5px] font-light text-[#838383]" style={geistStyle}>
                      Class of {card.classYear}
                    </span>
                  </div>
                </div>
              </div>

              {/* Issue Metadata Grid */}
              <div className="flex w-full items-end gap-[22px] pt-[18px]">
                <div className="flex min-w-0 flex-1 flex-col gap-[9px]">
                  <p className="m-0 whitespace-nowrap text-[10.5px] text-[#838383]" style={{ ...monoStyle, letterSpacing: "1.365px" }}>
                    ISSUED ON:
                  </p>
                  <div className="relative h-[34px] w-full border-b border-[#eeeeee]">
                    <p className="m-0 whitespace-nowrap text-[15px] text-[#2e2e2e]" style={geistStyle}>
                      {card.issuedOn}
                    </p>
                  </div>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-[9px]">
                  <p className="m-0 whitespace-nowrap text-[10.5px] text-[#838383]" style={{ ...monoStyle, letterSpacing: "1.365px" }}>
                    DOODLE:
                  </p>
                  <div className="relative h-[34px] w-full">
                    <Doodle
                      key={doodleReplay}
                      path={card.doodlePath}
                      viewBox={card.doodleViewBox}
                      className="absolute left-[2px] top-[1px] h-[32px] w-[35px]"
                    />
                    <button
                      type="button"
                      onClick={() => setDoodleReplay((n) => n + 1)}
                      className="pointer-events-auto absolute bottom-0 right-0 flex cursor-pointer items-center gap-1 bg-transparent p-0 text-[10px] text-[#bcbcbc]"
                      style={{ ...monoStyle, letterSpacing: "1px" }}
                      aria-label="Replay doodle animation"
                    >
                      <ReloadIcon className="h-[9px] w-[9px]" />
                      PLAY
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex w-full gap-[11px] pt-4">
                <a
                  href={card.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="group pointer-events-auto flex h-[42px] flex-1 items-center justify-center gap-[9px] rounded-[8px] border border-[#dbdbdb] bg-white"
                >
                  <LinkedInIcon className="h-4 w-4 text-[#2e2e2e] transition-colors duration-200 group-hover:text-[#0A66C2]" />
                  <span className="text-[14px] text-[#2e2e2e]" style={geistStyle}>
                    View Profile
                  </span>
                </a>
                <a
                  href={card.coffeeChat}
                  target="_blank"
                  rel="noreferrer"
                  className="group pointer-events-auto flex h-[42px] flex-1 items-center justify-center gap-[9px] rounded-[8px] border border-[#dbdbdb] bg-white"
                >
                  <CoffeeCup className="h-full w-5 shrink-0" />
                  <span className="text-[14px] text-[#2e2e2e]" style={geistStyle}>
                    Coffee Chat
                  </span>
                </a>
              </div>
            </div>
          </div>

          <div
            className="absolute inset-0 flex items-center justify-center rounded-[14px] bg-white"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))",
              boxShadow: "0 24px 60px 0 rgba(0, 0, 0, 0.2)",
              pointerEvents: "auto",
            }}
          >
            <div className="relative w-[45%] aspect-[218.605/211.496]">
              <img src={babLogo} alt="Blockchain at Berkeley" className="block h-full w-full" draggable={false} />
              {/* Iridescent sheen recoloring the whole logo — every path,
                  both the six stroked flap outlines and the three "Subtract"
                  fill shapes (the hollow-looking triangle/arrow bodies,
                  built via a boolean-subtract fill rather than an actual
                  stroke) — a repeating gradient masked to all nine paths,
                  same repeat structure/angle as Arlan's foil (see
                  .holo-tile__foil in holoEngine.css) but recolored to a
                  cream-to-mustard gold palette lifted from a reference mesh
                  gradient the user shared, instead of a rainbow. Repositioned
                  by --gx/--gy, the same tilt-driven glare-position vars
                  applyFrame already writes onto the flip wrapper every
                  frame. Plain opaque paint, no blend mode — the logo is
                  pure black, and blend modes against pure black/white are
                  no-ops (see the .holo-glare/.holo-sheen/.holo-pattern
                  history above), so the gradient just fully replaces the
                  black within the mask.
                  The mask's url() must be double-quoted: Vite inlines this
                  small SVG as a data: URI whose SVG attributes use single
                  quotes, and an unquoted CSS url() token forbids raw quote
                  characters — unquoted, the browser silently drops the
                  whole mask-image declaration. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(98deg, #f5edc9 0%, #e6d072 4%, #ddb945 8%, #c99416 12%, #e6d072 16%, #f5edc9 20%)",
                  backgroundSize: "300% 300%",
                  backgroundPosition: "var(--gx, 50%) var(--gy, 50%)",
                  maskImage: `url("${babLogoMask}")`,
                  maskSize: "100% 100%",
                  maskRepeat: "no-repeat",
                  maskPosition: "center",
                  WebkitMaskImage: `url("${babLogoMask}")`,
                  WebkitMaskSize: "100% 100%",
                  WebkitMaskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                }}
              />
            </div>
          </div>
        </motion.div>
      </div>

      <p className="m-0 text-center text-[12px] text-[#2e2e2e]" style={{ ...monoStyle, letterSpacing: "1.68px" }}>
        B@B EXEC MEMBER CARD · NO. {card.cardNumber}
      </p>
    </div>
  );
}
