function ChromeIcon({ src }: { src: string }) {
  return (
    <span className="relative block size-[24px] shrink-0">
      <img src={src} alt="" className="absolute inset-0 size-full max-w-none" />
    </span>
  );
}

export function VideoSection() {
  return (
    <section className="flex items-start justify-center bg-[#121212] px-[16px] py-[96px]">
      <div className="flex w-[1024px] max-w-[1024px] flex-col items-start">
        <div className="w-full overflow-clip rounded-[16px] border border-white/10 bg-white/5 p-px shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]">
          <div className="relative h-[662.88px] w-full bg-[#1f1f21]">
            <div className="absolute inset-0 bg-black">
              <img
                src="/landing/video-thumbnail.jpg"
                alt="Worldscore product walkthrough"
                className="absolute top-0 left-0 h-full w-full max-w-none object-cover"
              />
              <div className="absolute inset-0 bg-[rgba(51,51,51,0.1)]" />

              <div className="pointer-events-none absolute inset-x-0 top-0 h-[200px] bg-gradient-to-b from-black/70 to-transparent" />

              <div className="absolute inset-x-0 top-0 flex items-start justify-between p-[12px]">
                <div className="flex w-[207.6px] flex-col items-center gap-[4px]">
                  <p className="font-inter w-full text-[23.3px] leading-[27.84px] font-bold tracking-[-0.2px] text-[#cecfd2]">
                    Introducing Worldscore
                  </p>
                  <div className="flex w-full items-center gap-[4px]">
                    <span className="relative block size-[20px] shrink-0">
                      <img
                        src="/landing/video-icon-eye.svg"
                        alt=""
                        className="absolute inset-0 size-full max-w-none"
                      />
                    </span>
                    <span className="font-inter text-[12px] leading-[18px] font-bold tracking-[-0.0938px] whitespace-nowrap text-[#cecfd2]">
                      78 views
                    </span>
                  </div>
                </div>

                <div className="flex w-[152.08px] items-center gap-[4px] rounded-[16px] border border-[rgba(227,228,242,0.12)] bg-[#1f1f21] px-[9px] py-[5px]">
                  <span className="flex size-[32px] items-center justify-center rounded-[12px]">
                    <ChromeIcon src="/landing/video-icon-link.svg" />
                  </span>
                  <span className="flex w-[32px] items-center justify-center rounded-[12px] py-[4px]">
                    <ChromeIcon src="/landing/video-icon-external.svg" />
                  </span>
                  <span className="h-[24px] w-px bg-[rgba(227,228,242,0.12)]" />
                  <span className="flex h-[32px] items-center rounded-[12px] px-[8px]">
                    <span className="pr-[8px]">
                      <ChromeIcon src="/landing/video-icon-comment.svg" />
                    </span>
                    <span className="font-inter text-center text-[14px] leading-[21.98px] tracking-[7px] text-[#cecfd2]">
                      0
                    </span>
                  </span>
                </div>
              </div>

              <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
                <button
                  aria-label="Play the video"
                  className="relative size-[120px] rounded-full shadow-[0px_4px_10px_0px_rgba(0,0,0,0.05)]"
                >
                  <img
                    src="/landing/video-play.svg"
                    alt=""
                    className="absolute inset-0 size-full max-w-none"
                  />
                </button>

                <div className="absolute top-[136px] left-[-1px] flex flex-col items-center justify-center">
                  <div className="flex min-w-[122px] flex-col items-start rounded-[24px] border-4 border-[#1f1f21] bg-[#1f1f21] p-[4px]">
                    <div className="flex flex-col items-center gap-[4px]">
                      <div className="flex min-w-[75px] flex-col items-start px-[13.7px] py-[4px]">
                        <div className="flex h-[24px] items-center justify-center gap-[4px] overflow-clip">
                          <ChromeIcon src="/landing/video-icon-speed.svg" />
                          <span className="font-inter text-center text-[17.4px] leading-[18px] font-bold tracking-[-1.0875px] whitespace-nowrap text-white">
                            1×
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-start rounded-t-[4px] rounded-b-[20px] bg-[#18191a] px-[38.05px] py-[6px]">
                        <span className="font-inter text-center text-[14px] leading-[21.98px] font-bold whitespace-nowrap text-white">
                          4 min
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
