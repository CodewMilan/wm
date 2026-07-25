function FeatureCard({
  icon,
  title,
  titleClass,
  body,
  gapClass,
}: {
  icon: string;
  title: string;
  titleClass: string;
  body: React.ReactNode;
  gapClass: string;
}) {
  return (
    <div
      className={`flex min-w-px flex-1 flex-col items-start self-stretch rounded-[16px] border border-white/10 bg-white/5 p-[33px] backdrop-blur-[4px] ${gapClass}`}
    >
      <div className="flex w-[370px] items-center gap-[12px]">
        <span className="flex flex-col items-start rounded-[12px] bg-white/10 p-[12px]">
          <span className="relative block size-[24px]">
            <img
              src={icon}
              alt=""
              className="absolute inset-0 size-full max-w-none"
            />
          </span>
        </span>
        <h3 className={`leading-[28px] whitespace-nowrap text-white ${titleClass}`}>
          {title}
        </h3>
      </div>
      <div className="w-[370px]">
        <p className="text-[16.6px] leading-[29.25px] tracking-[0.6484px] whitespace-nowrap text-[#99a1af]">
          {body}
        </p>
      </div>
    </div>
  );
}

export function FeaturesCta() {
  return (
    <section className="relative flex flex-col items-start px-[208px] py-[96px]">
      <div className="absolute top-1/2 left-1/2 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-[60px]" />

      <div className="relative flex w-full max-w-[1024px] flex-col items-center gap-[64px]">
        <div className="flex w-[896px] max-w-[896px] items-start justify-center gap-[24px]">
          <FeatureCard
            icon="/landing/icon-zap.svg"
            title="Minutes, Not Days"
            titleClass="text-[18.9px] tracking-[1.0336px]"
            gapClass="gap-[15.25px]"
            body={
              <>
                One rough track becomes five distinct world directions
                <br />
                in minutes, instead of days of moodboards and
                <br />
                treatment drafts.
              </>
            }
          />
          <FeatureCard
            icon="/landing/icon-shield.svg"
            title="Risk Free"
            titleClass="text-[20px] tracking-[0.625px]"
            gapClass="gap-[15.125px]"
            body={
              <>
                {"If you don't get the specified results, we will"}
                <br />
                refund you - no questions asked.
              </>
            }
          />
        </div>

        <div className="flex flex-col items-center gap-[32px]">
          <div className="flex flex-col items-center gap-[16px]">
            <h2 className="text-center text-[47.1px] leading-[48px] tracking-[-1.2px] whitespace-nowrap text-white">
              Ready to see your track as a world?
            </h2>
            <p className="text-center text-[18.6px] leading-[28px] tracking-[0.6357px] whitespace-nowrap text-[#99a1af]">
              Schedule a call with our founders to see how Worldscore can work for
              <br />
              your project, or try it out yourself.
            </p>
          </div>

          <div className="flex items-start gap-[16px]">
            <a
              href="#"
              className="flex items-center justify-center gap-[8px] self-stretch overflow-clip rounded-[12px] bg-white px-[32px] py-[16px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
            >
              <span className="relative block size-[20px]">
                <img
                  src="/landing/icon-calendar-cta.svg"
                  alt=""
                  className="absolute inset-0 size-full max-w-none"
                />
              </span>
              <span className="text-[18px] leading-[28px] tracking-[0.7031px] whitespace-nowrap text-black">
                Book a call
              </span>
            </a>
            <a
              href="/studio"
              className="flex items-center justify-center gap-[8px] self-stretch rounded-[12px] border border-white/10 bg-white/10 px-[33px] py-[17px]"
            >
              <span className="text-[17.4px] leading-[28px] tracking-[1.0195px] whitespace-nowrap text-white">
                Try it yourself
              </span>
              <span className="relative block size-[20px]">
                <img
                  src="/landing/icon-arrow-right-cta.svg"
                  alt=""
                  className="absolute inset-0 size-full max-w-none"
                />
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
