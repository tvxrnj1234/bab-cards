// The holographic exec card — pointer/orientation wiring ported from
// arlan.me/vault/holo's HoloCard.tsx (see /reference/holo-vault). The wiring
// pattern (two followers, a kick, idle drift, grab/release blends) is
// reused as-is; the markup and content are this project's own.
//
// TILT/FOIL/GLARE PAUSED — felt gimmicky against the clean Figma design, per
// user feedback. The engine (holoEngine.js) and this wiring are untouched
// and ready to go; flip ENABLE_HOLO_MOTION back to true to resume that work.
// Until then the card renders as a plain static match of the Figma file —
// no card-level foil/glare/pattern, and the avatar shows its real photo
// with no duotone/gloss overlays, exact original color.

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { FOILS, Follow, Kick, Orientation, applyFoil, applyFrame, fromPointer } from "../motion/holoEngine";
import { ArtIcon, LinkedInIcon, ReloadIcon } from "./icons";
import { CoffeeCup } from "./CoffeeCup";
import { Doodle } from "./Doodle";
import "../motion/holoEngine.css";

const ENABLE_HOLO_MOTION = false;

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

  // ONE MATERIAL, NOT A CAROUSEL — see engine source notes.
  const foil = FOILS[0];

  useEffect(() => {
    if (ENABLE_HOLO_MOTION && cardRef.current) {
      applyFoil(cardRef.current, foil, {
        photoUrl: card.photo,
        bodyGradient: BODY_GRADIENT,
        tileDark: TILE_DARK,
        tileLight: TILE_LIGHT,
      });
    }
  }, [foil, card.photo]);

  useEffect(() => {
    if (!ENABLE_HOLO_MOTION) return;
    const host = hostRef.current;
    const cardEl = cardRef.current;
    if (!host || !cardEl) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const tilt = new Follow(0.16);
    const sheet = new Follow(0.09);
    const kick = new Kick();
    const t0 = performance.now();

    let raf = 0;
    let running = false;
    let onScreen = false;
    let hidden = false;
    let idle = 0;
    let touched = false;
    let release = 1;
    let handoff = { x: 0, y: 0 };
    let grab = 1;
    let grabFrom = { x: 0, y: 0 };
    let aim = { x: 0, y: 0 };

    const frame = () => {
      raf = 0;

      if (!touched) {
        idle += 0.0042;
        const drift = {
          x: Math.sin(idle) * 0.28,
          y: Math.cos(idle * 0.73) * 0.2,
        };
        release = Math.min(1, release + 0.016);
        const k = release * release;
        tilt.target = {
          x: handoff.x + (drift.x - handoff.x) * k,
          y: handoff.y + (drift.y - handoff.y) * k,
        };
      }

      if (touched) {
        grab = Math.min(1, grab + 0.018);
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
        <div ref={cardRef} className="holo-card relative w-full bg-white">
          {ENABLE_HOLO_MOTION && (
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
              <div className="holo-sheen" />
            </div>
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
                  {ENABLE_HOLO_MOTION && (
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
              <motion.a
                href={card.coffeeChat}
                target="_blank"
                rel="noreferrer"
                className="pointer-events-auto flex h-[42px] flex-1 items-center justify-center gap-[9px] rounded-[8px] border border-[#dbdbdb] bg-white"
                initial="rest"
                whileHover="hover"
              >
                <CoffeeCup className="h-full w-5 shrink-0" />
                <span className="text-[14px] text-[#2e2e2e]" style={geistStyle}>
                  Coffee Chat
                </span>
              </motion.a>
            </div>
          </div>
        </div>
      </div>

      <p className="m-0 text-center text-[12px] text-[#2e2e2e]" style={{ ...monoStyle, letterSpacing: "1.68px" }}>
        B@B EXEC MEMBER CARD · NO. {card.cardNumber}
      </p>
    </div>
  );
}
