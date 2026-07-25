// Several icons in the Figma mockup are exported as a stack of separate
// vector layers rather than one flat SVG. Each layer carries its own
// fractional inset inside the icon box plus a small overdraw padding so
// strokes aren't clipped. This mirrors that structure exactly.
export type VectorLayer = {
  /** Position of the layer within the icon box. */
  inset: string;
  /** Stroke overdraw around the layer. */
  bleed: string;
  src: string;
};

export function VectorIcon({
  size,
  layers,
}: {
  size: number;
  layers: VectorLayer[];
}) {
  return (
    <span
      className="relative block shrink-0 overflow-clip"
      style={{ width: size, height: size }}
    >
      {layers.map((layer, i) => (
        <span key={i} className="absolute" style={{ inset: layer.inset }}>
          <span className="absolute" style={{ inset: layer.bleed }}>
            <img
              src={layer.src}
              alt=""
              className="block size-full max-w-none"
            />
          </span>
        </span>
      ))}
    </span>
  );
}

const A = "/landing/app";

export const searchLayers: VectorLayer[] = [
  {
    inset: "69.42% 12.5% 12.5% 69.42%",
    bleed: "-23.04%",
    src: `${A}/search-vector-1.svg`,
  },
  {
    inset: "12.5% 20.83% 20.83% 12.5%",
    bleed: "-6.25%",
    src: `${A}/search-vector-2.svg`,
  },
];

export const threadsLayers: VectorLayer[] = [
  {
    inset: "12.5% 8.33% 8.35% 8.33%",
    bleed: "-5.26% -5%",
    src: `${A}/v-threads.svg`,
  },
];

export const huddlesLayers: VectorLayer[] = [
  { inset: "12.5%", bleed: "-5.56%", src: `${A}/v-huddles.svg` },
];

export const draftsLayers: VectorLayer[] = [
  { inset: "8.33% 16.67%", bleed: "-5% -6.25%", src: `${A}/v-drafts-1.svg` },
  {
    inset: "8.33% 16.67% 66.67% 58.33%",
    bleed: "-16.67%",
    src: `${A}/v-drafts-2.svg`,
  },
  {
    inset: "37.5% 58.33% 62.5% 33.33%",
    bleed: "-0.67px -50%",
    src: `${A}/v-drafts-3.svg`,
  },
  {
    inset: "54.17% 33.33% 45.83% 33.33%",
    bleed: "-0.67px -12.5%",
    src: `${A}/v-drafts-4.svg`,
  },
  {
    inset: "70.83% 33.33% 29.17% 33.33%",
    bleed: "-0.67px -12.5%",
    src: `${A}/v-drafts-4.svg`,
  },
];

function hashLayers(horizontal: string, vertical: string): VectorLayer[] {
  return [
    { inset: "37.5% 16.67% 62.5% 16.67%", bleed: "-0.67px -6.25%", src: horizontal },
    { inset: "62.5% 16.67% 37.5% 16.67%", bleed: "-0.67px -6.25%", src: horizontal },
    { inset: "12.5% 58.33% 12.5% 33.33%", bleed: "-5.56% -50%", src: vertical },
    { inset: "12.5% 33.33% 12.5% 58.33%", bleed: "-5.56% -50%", src: vertical },
  ];
}

export const hashLayersMuted = hashLayers(
  `${A}/v-hash-h.svg`,
  `${A}/v-hash-v.svg`,
);

export const hashLayersActive = hashLayers(
  `${A}/v-hash-h-active.svg`,
  `${A}/v-hash-v-active.svg`,
);

export const plusLayers: VectorLayer[] = [
  { inset: "50% 20.83% 50% 20.83%", bleed: "-0.67px -7.14%", src: `${A}/v-plus-h.svg` },
  { inset: "20.83% 50% 20.83% 50%", bleed: "-7.14% -0.67px", src: `${A}/v-plus-v.svg` },
];
