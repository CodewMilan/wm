export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-[80px] items-center justify-between px-[48px] backdrop-blur-[6px]">
      <a
        href="#"
        className="flex size-[72px] items-center justify-center rounded-[8px]"
      >
        <span className="relative block size-[40px] max-w-[72px] overflow-hidden">
          <img
            src="/landing/logo-mark.png"
            alt="Worldscore"
            className="absolute top-0 left-[-40%] h-full w-[180%] max-w-none"
          />
        </span>
      </a>
      <nav className="flex items-start gap-[20px]">
        <a
          href="#"
          className="flex flex-col items-start self-stretch px-[16px] py-[8px] text-[16px] leading-[24px] tracking-[1.25px] text-white"
        >
          Login
        </a>
        <a
          href="/studio"
          className="flex flex-col items-start self-stretch rounded-[6px] bg-white px-[16px] py-[8px] text-[15.4px] leading-[24px] tracking-[1.0828px] text-black"
        >
          Try Now
        </a>
      </nav>
    </header>
  );
}
