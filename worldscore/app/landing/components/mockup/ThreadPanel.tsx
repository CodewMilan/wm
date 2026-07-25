function Icon({ src, size = 16 }: { src: string; size?: number }) {
  return (
    <span className="relative block shrink-0" style={{ width: size, height: size }}>
      <img src={src} alt="" className="absolute inset-0 size-full max-w-none" />
    </span>
  );
}

function Field({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col items-start">
      <p className="font-geist w-full text-[16px] leading-[24px] text-[#e8e8e8]">
        {label}
      </p>
      <p className="font-geist w-full text-[16px] leading-[24px] text-[#d1d2d3]">
        {value}
      </p>
    </div>
  );
}

export function ThreadPanel() {
  return (
    <div className="flex w-[350px] shrink-0 flex-col items-start border-l border-white/5 bg-[#1a1d21]">
      <div className="flex h-[44px] w-full items-center justify-between border-b border-white/5 px-[16px]">
        <div className="flex items-center gap-[8px]">
          <span className="font-geist text-[14px] leading-[20px] tracking-[0.4375px] whitespace-nowrap text-white">
            Thread
          </span>
          <span className="font-geist text-[12px] leading-[16px] whitespace-nowrap text-[#6a7282]">
            #bug-reports
          </span>
        </div>
        <div className="flex items-start gap-[12px]">
          <Icon src="/landing/app/th-hdr-1.svg" />
          <Icon src="/landing/app/th-hdr-2.svg" />
        </div>
      </div>

      <div className="relative min-h-px w-full flex-1 overflow-hidden">
        <div className="absolute top-[16px] right-[16px] left-[16px] flex flex-col items-start border-b border-white/5 pb-[25px]">
          <div className="relative h-[350.5px] w-full">
            <div className="absolute top-0 left-0 flex size-[36px] items-center justify-center rounded-[4px] bg-[#2ab67d]">
              <Icon src="/landing/app/th-app-avatar.svg" size={20} />
            </div>

            <div className="absolute top-[-1px] right-0 left-[48px] flex flex-col items-start gap-[4px]">
              <div className="flex w-full items-center gap-[8px]">
                <span className="font-geist text-[15px] leading-[22.5px] tracking-[0.4688px] whitespace-nowrap text-white">
                  Bug Report
                </span>
                <span className="flex flex-col items-start rounded-[4px] border border-white/10 bg-[#2d3035] px-[5px] py-px">
                  <span className="font-geist text-[10px] leading-[15px] tracking-[0.25px] uppercase text-[#d1d2d3]">
                    APP
                  </span>
                </span>
                <span className="font-geist text-[12px] leading-[16px] whitespace-nowrap text-[#6a7282]">
                  Just now
                </span>
              </div>

              <div className="flex w-full flex-col items-start gap-[12px]">
                <Field label="Which platform are you on?" value="android" />
                <Field
                  label="Describe the issue you are facing"
                  value={
                    <>
                      Is there a way to import my
                      <br />
                      documents from Notion to your
                      <br />
                      product?
                    </>
                  }
                />
                <Field
                  label={
                    <>
                      How often are you facing this
                      <br />
                      issue?
                    </>
                  }
                  value="Every time I use the app."
                />
                <Field
                  label={
                    <>
                      Would you recommend our product
                      <br />
                      to a friend?
                    </>
                  }
                  value="Yes"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="absolute top-[415.5px] right-[16px] left-[16px] flex items-start gap-[12px]">
          <span className="relative flex size-[36px] shrink-0 items-center justify-center overflow-clip rounded-[4px] bg-black">
            <img
              src="/landing/app/th-mark.png"
              alt=""
              className="absolute top-[16.67%] left-[16.67%] size-[66.67%] max-w-none"
            />
          </span>

          <div className="flex min-w-px flex-1 flex-col items-start gap-[3.4px] self-stretch">
            <div className="relative h-[20px] w-full">
              <span className="font-geist absolute top-0 left-0 text-[14px] leading-[20px] text-white">
                Worldscore
              </span>
              <span className="absolute top-[3px] left-[87px] flex flex-col items-start rounded-[4px] border border-white/10 bg-[#2d3035] px-[5px] py-px">
                <span className="font-geist text-[10px] leading-[15px] tracking-[0.25px] uppercase text-[#d1d2d3]">
                  APP
                </span>
              </span>
              <span className="font-geist absolute top-[3px] left-[125px] text-[12px] leading-[16px] text-[#6a7282]">
                Just now
              </span>
            </div>

            <p className="font-geist w-full text-[14px] leading-[22.75px] whitespace-pre-wrap text-[#d1d2d3]">
              {`In order to import documents from Notion \nto the app:\n1. Open integrations from app settings\n2. Click "Link" near Notion\n3. All documents will be imported \nautomatically`}
            </p>

            <div className="flex w-full items-start gap-[8px] pt-[8.6px]">
              <button className="flex items-center justify-center rounded-[4px] border border-white/10 px-[13px] py-[5px]">
                <span className="font-geist text-[12px] leading-[16px] whitespace-nowrap text-[#d1d2d3]">
                  Useful
                </span>
              </button>
              <button className="flex items-center justify-center rounded-[4px] border border-white/10 px-[13px] py-[5px]">
                <span className="font-geist text-[12px] leading-[16px] tracking-[0.0938px] whitespace-nowrap text-[#d1d2d3]">
                  Not useful
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full border-t border-white/5 px-[16px] pt-[17px] pb-[16px]">
        <div className="w-full rounded-[8px] border border-white/10 bg-[#222529] px-[9px] py-[11px]">
          <span className="font-geist text-[14px] leading-[20px] whitespace-nowrap text-[#6a7282]">
            Reply...
          </span>
        </div>
      </div>
    </div>
  );
}
