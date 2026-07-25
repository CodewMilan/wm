export function Hero() {
  return (
    <section className="relative flex h-[900px] flex-col items-center justify-center px-[16px] py-[209px]">
      <div className="absolute top-1/2 left-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-[50px]" />

      <div className="relative flex max-w-[896px] flex-col items-center justify-center gap-[32px]">
        <div className="flex items-center justify-center gap-[8px] rounded-full border border-white/10 bg-white/5 px-[17px] py-[9px] backdrop-blur-[4px]">
          <span className="relative block size-[20px] overflow-clip">
            <img
              src="/landing/hero-badge-icon.svg"
              alt=""
              className="absolute inset-0 size-full max-w-none"
            />
          </span>
          <p className="text-[16.9px] leading-[28px] tracking-[0.4951px] whitespace-nowrap text-[#99a1af]">
            Five cinematic directions in minutes
          </p>
        </div>

        <h1 className="px-[113.02px] text-center text-[69.8px] leading-[90px] tracking-[-1.8px] whitespace-nowrap text-white">
          Music into living
          <br />
          cinematic worlds
        </h1>

        <div className="flex items-center justify-center gap-[16px]">
          <span className="text-[34.3px] leading-[40px] tracking-[2.1437px] text-[#99a1af]">
            in
          </span>
          <div className="flex items-center justify-center gap-[12px] rounded-[16px] border border-white/10 bg-white/10 px-[25px] py-[13px] backdrop-blur-[6px]">
            <span className="relative block size-[40px] overflow-hidden">
              <img
                src="/landing/slack-logo.png"
                alt=""
                className="absolute top-0 left-0 size-full max-w-none"
              />
            </span>
            <span className="text-[35.2px] leading-[40px] tracking-[2.2px] whitespace-nowrap text-white">
              Slack
            </span>
          </div>
        </div>

        <div className="flex items-start gap-[16.01px] pt-[32px]">
          <a
            href="#"
            className="flex items-center justify-center gap-[8px] self-stretch overflow-clip rounded-[12px] bg-white px-[32px] py-[16px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
          >
            <span className="relative block size-[20px]">
              <img
                src="/landing/icon-calendar.svg"
                alt=""
                className="absolute inset-0 size-full max-w-none"
              />
            </span>
            <span className="text-[18px] leading-[28px] tracking-[0.7031px] whitespace-nowrap text-black">
              Book a demo
            </span>
          </a>
          <a
            href="/studio"
            className="flex items-center justify-center gap-[8px] self-stretch rounded-[12px] border border-white/10 bg-white/10 px-[33px] py-[17px]"
          >
            <span className="text-[17.3px] leading-[28px] tracking-[1.0812px] whitespace-nowrap text-white">
              Try for free
            </span>
            <span className="relative block size-[20px]">
              <img
                src="/landing/icon-arrow-right.svg"
                alt=""
                className="absolute inset-0 size-full max-w-none"
              />
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
