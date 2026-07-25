const SOCIALS = [
  "/landing/social-1.svg",
  "/landing/social-2.svg",
  "/landing/social-3.svg",
];

export function SiteFooter() {
  return (
    <footer className="flex flex-col items-start border-t border-white/5 bg-[#0a0a0a] px-[80px] pt-[49px] pb-[48px]">
      <div className="flex w-full max-w-[1280px] items-center justify-between">
        <div className="flex flex-col items-start gap-[15.25px]">
          <div className="flex w-full items-center gap-[8px]">
            <span className="relative block size-[32px] max-w-[112.27px] overflow-hidden opacity-80">
              <img
                src="/landing/footer-logo.png"
                alt=""
                className="absolute top-0 left-0 size-full max-w-none"
              />
            </span>
            <span className="text-[19.2px] leading-[28px] tracking-[-0.5px] whitespace-nowrap text-white">
              Worldscore
            </span>
          </div>
          <p className="text-[13.3px] leading-[22.75px] tracking-[0.3637px] whitespace-nowrap text-[#99a1af]">
            Chettikulangara
            <br />
            Trivandrum
            <br />
            Kerala, IN 695001
          </p>
        </div>

        <div className="flex flex-col items-end gap-[24px]">
          <div className="flex items-start gap-[24px]">
            {SOCIALS.map((src) => (
              <a key={src} href="#" className="flex flex-col items-start self-stretch">
                <span className="relative block size-[20px]">
                  <img
                    src={src}
                    alt=""
                    className="absolute inset-0 size-full max-w-none"
                  />
                </span>
              </a>
            ))}
          </div>
          <p className="text-[13px] leading-[20px] tracking-[0.457px] whitespace-nowrap text-[#99a1af]">
            © 2026 Worldscore Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
