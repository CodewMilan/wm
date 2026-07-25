import { ChannelPanel } from "./ChannelPanel";
import { IconRail } from "./IconRail";
import { Sidebar } from "./Sidebar";
import { ThreadPanel } from "./ThreadPanel";
import { TopBar } from "./TopBar";

export function AppMockup() {
  return (
    <section className="relative flex h-[910px] items-start justify-center px-[120px] py-[80px]">
      <div className="relative h-[750px] w-[1200px] overflow-clip rounded-[12px] border border-white/10 bg-[#1a1d21] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.5)]">
        <TopBar />
        <div className="flex h-[704px] items-stretch">
          <IconRail />
          <Sidebar />
          <ChannelPanel />
          <ThreadPanel />
        </div>

        <span className="pointer-events-none absolute top-[335.8px] left-[992.41px] block size-[24px]">
          <img
            src="/landing/app/cursor.svg"
            alt=""
            className="absolute inset-0 size-full max-w-none"
          />
        </span>
      </div>

      <div className="absolute bottom-[42px] left-1/2 -translate-x-1/2 opacity-0">
        <div className="flex items-start overflow-clip rounded-full bg-white p-[12px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]">
          <span className="relative block size-[24px]">
            <img
              src="/landing/app/scroll-down.svg"
              alt=""
              className="absolute inset-0 size-full max-w-none"
            />
          </span>
        </div>
      </div>
    </section>
  );
}
