# B@B Exec Cards

## Concept

A recruiting microsite for the club. Prospective applicants browse a gallery
of predesigned "B@B exec member cards." Each card has two CTAs: **view
LinkedIn** and **book a coffee chat**. The entire point of this site is
motion — a holographic tilt effect on hover, and a stacked-cards reveal on
page load. If the animation feels flat, the site has failed at its job.

## Stack

- React + Vite
- Tailwind CSS v4 (via `@tailwindcss/vite`, imported in `src/index.css`)
- [Motion](https://motion.dev) (formerly Framer Motion) for all animation

## Reference material

`/reference` is a clone of
[simeydotme/pokemon-cards-css](https://github.com/simeydotme/pokemon-cards-css).
It contains the holographic tilt/foil technique this project adapts for the
hover effect. **Do not freestyle the holo effect.** Study and adapt the
technique in `/reference` rather than inventing a new approach from scratch.

## Hard rules

1. **One data array, always.** Every exec card rendered on the page comes
   from a single array of card data (e.g. `src/data/cards.js`). Never
   hardcode an individual card's markup. Adding a new exec means adding a
   new object to the array — nothing else.
2. **Motion is the top priority.** When trading off polish vs. animation
   quality, animation wins. The hover tilt and the load-in stacked reveal
   are the product, not decoration on top of it.
3. **One feature at a time.** Build a single feature, stop, and let the
   user test and commit before starting the next one. Do not chain
   multiple features together in one pass.
