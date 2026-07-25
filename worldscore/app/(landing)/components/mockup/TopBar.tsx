import { VectorIcon, searchLayers } from "./VectorIcon";

export function TopBar() {
  return (
    <div className="flex h-[44px] items-center justify-between border-b border-[rgba(48,48,48,0.5)] bg-[#121016] px-[16px]">
      <div className="flex w-[200px] items-center">
        <div className="flex items-start gap-[8px]">
          <span className="block size-[12px] rounded-full bg-[#ff5f57]" />
          <span className="block size-[12px] rounded-full bg-[#febc2e]" />
          <span className="block size-[12px] rounded-full bg-[#28c840]" />
        </div>
      </div>

      <div className="min-w-px max-w-[500px] flex-1">
        <div className="flex h-[28px] w-full items-center justify-center overflow-clip rounded-[6px] border border-white/10 bg-[#2d3035] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
          <span className="pr-[8px]">
            <VectorIcon size={14} layers={searchLayers} />
          </span>
          <span className="font-geist text-[12px] leading-[16px] whitespace-nowrap text-[#99a1af]">
            Search Worldscore
          </span>
        </div>
      </div>

      <div className="flex w-[200px] items-center justify-end">
        <span className="relative block size-[16px]">
          <img
            src="/landing/app/topbar-right.svg"
            alt=""
            className="absolute inset-0 size-full max-w-none"
          />
        </span>
      </div>
    </div>
  );
}
