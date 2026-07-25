const RAIL_ICONS = [
  { src: "/landing/app/rail-1.svg", active: true },
  { src: "/landing/app/rail-2.svg", active: false },
  { src: "/landing/app/rail-3.svg", active: false },
  { src: "/landing/app/rail-4.svg", active: false },
  { src: "/landing/app/rail-5.svg", active: false },
];

export function IconRail() {
  return (
    <div className="flex w-[68px] shrink-0 flex-col items-center gap-[24px] border-r border-white/5 bg-[#1a1d21] py-[16px]">
      <div className="flex size-[36px] items-center justify-center overflow-clip rounded-[8px] bg-black">
        <span className="relative block size-[32px] max-w-[36px] overflow-hidden">
          <img
            src="/landing/app/rail-logo.png"
            alt=""
            className="absolute top-0 left-0 size-full max-w-none"
          />
        </span>
      </div>

      <div className="flex w-[67px] flex-col items-center gap-[24px]">
        {RAIL_ICONS.map((icon) => (
          <div
            key={icon.src}
            className="flex h-[36px] w-[40px] items-center justify-center"
          >
            <div
              className={`flex flex-col items-start rounded-[8px] p-[8px] ${
                icon.active ? "bg-white/10" : ""
              }`}
            >
              <span className="relative block size-[24px]">
                <img
                  src={icon.src}
                  alt=""
                  className="absolute inset-0 size-full max-w-none"
                />
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex min-h-[52px] flex-1 flex-col items-start justify-end pt-[260px]">
        <div className="flex flex-col items-start pb-[16px]">
          <div className="flex size-[36px] items-center justify-center rounded-[8px] bg-[#008236]">
            <span className="relative block size-[20px]">
              <img
                src="/landing/app/rail-compose.svg"
                alt=""
                className="absolute inset-0 size-full max-w-none"
              />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
