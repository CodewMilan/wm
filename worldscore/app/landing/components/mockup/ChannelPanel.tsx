function Icon({ src, size = 16 }: { src: string; size?: number }) {
  return (
    <span className="relative block shrink-0" style={{ width: size, height: size }}>
      <img src={src} alt="" className="absolute inset-0 size-full max-w-none" />
    </span>
  );
}

function ComposerButton({ src, rounded }: { src: string; rounded?: "full" }) {
  return (
    <div
      className={`flex flex-col items-start self-stretch p-[6px] ${
        rounded === "full" ? "rounded-full bg-white/10" : "rounded-[4px]"
      }`}
    >
      <Icon src={src} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col items-start">
      <p className="font-geist text-[16px] leading-[24px] text-[#e8e8e8]">{label}</p>
      <p className="font-geist w-full text-[16px] leading-[24px] text-[#d1d2d3]">
        {value}
      </p>
    </div>
  );
}

export function ChannelPanel() {
  return (
    <div className="relative flex w-[520px] shrink-0 flex-col items-start bg-[#1a1d21]">
      <div className="flex h-[48px] w-full items-center justify-between border-b border-white/5 px-[16px]">
        <div className="flex items-center gap-[4px]">
          <Icon src="/landing/app/ch-hash.svg" />
          <span className="font-geist text-[16px] leading-[24px] tracking-[0.625px] whitespace-nowrap text-white">
            bug-reports
          </span>
        </div>

        <div className="flex items-center gap-[16px]">
          <div className="flex items-start">
            <div className="flex h-[24px] w-[16px] flex-col items-start">
              <span className="flex size-[24px] items-center justify-center overflow-clip rounded-[4px] bg-[#4a5565] shadow-[0px_0px_0px_2px_#1a1d21]">
                <img
                  src="/landing/app/avatar-grace.png"
                  alt=""
                  className="size-full max-w-none object-cover"
                />
              </span>
            </div>
            <div className="flex h-[24px] w-[16px] flex-col items-start">
              <span className="flex size-[24px] items-center justify-center overflow-clip rounded-[4px] bg-[#4a5565] shadow-[0px_0px_0px_2px_#1a1d21]">
                <img
                  src="/landing/app/avatar-john.png"
                  alt=""
                  className="size-full max-w-none object-cover"
                />
              </span>
            </div>
            <span className="flex size-[24px] items-center justify-center overflow-clip rounded-[4px] bg-[#4a5565] shadow-[0px_0px_0px_2px_#1a1d21]">
              <span className="font-geist text-[10px] leading-[15px] tracking-[0.625px] text-white">
                +2
              </span>
            </span>
          </div>
          <Icon src="/landing/app/ch-hdr-1.svg" />
          <Icon src="/landing/app/ch-hdr-2.svg" />
          <Icon src="/landing/app/ch-hdr-3.svg" />
        </div>
      </div>

      <div className="flex min-h-px w-full flex-1 flex-col items-start overflow-hidden px-[16px] pt-[16px] pb-[200px]">
        <div className="relative h-[306.5px] w-full">
          <div className="absolute top-0 left-0 flex size-[36px] items-center justify-center rounded-[4px] bg-[#2ab67d]">
            <Icon src="/landing/app/ch-app-avatar.svg" size={20} />
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
                    Is there a way to import my documents from Notion to your
                    <br />
                    product?
                  </>
                }
              />
              <Field
                label="How often are you facing this issue?"
                value="Every time I use the app."
              />
              <Field
                label="Would you recommend our product to a friend?"
                value="Yes"
              />
            </div>

            <div className="flex w-full items-center gap-[8px] pt-[4px]">
              <span className="flex size-[20px] flex-col items-start overflow-clip rounded-[4px] shadow-[0px_0px_0px_2px_#1a1d21]">
                <span className="relative flex size-[20px] items-center justify-center overflow-clip rounded-[4px] bg-black">
                  <img
                    src="/landing/app/ch-hivinq-mark.png"
                    alt=""
                    className="absolute top-[30%] left-[30%] size-[40%] max-w-none"
                  />
                </span>
              </span>
              <span className="font-geist text-[14px] leading-[20px] whitespace-nowrap text-[#51a2ff]">
                1 reply
              </span>
              <span className="font-geist text-[12px] leading-[16px] whitespace-nowrap text-[#6a7282] opacity-0">
                Last reply today at 11:00 AM
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute right-[16px] bottom-[24px] left-[16px] flex h-[120px] flex-col items-start justify-center">
        <div className="relative min-h-px w-full flex-1 overflow-clip rounded-[12px] border border-white/10 bg-[#222529] shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)]">
          <div className="absolute inset-x-0 top-0 flex items-center gap-[4px] border-b border-white/5 bg-[#222529] px-[8px] pt-[8px] pb-[9px]">
            <ComposerButton src="/landing/app/cm-1.svg" />
            <ComposerButton src="/landing/app/cm-2.svg" />
            <ComposerButton src="/landing/app/cm-3.svg" />
            <span className="flex h-[16px] w-[9px] flex-col items-start px-[4px]">
              <span className="h-[16px] w-px bg-white/10" />
            </span>
            <ComposerButton src="/landing/app/cm-4.svg" />
            <ComposerButton src="/landing/app/cm-5.svg" />
            <ComposerButton src="/landing/app/cm-6.svg" />
          </div>

          <div className="absolute inset-x-0 top-[45px] bottom-[29px] flex flex-col items-start p-[12px]">
            <span className="font-geist text-[14px] leading-[20px] whitespace-nowrap text-[#99a1af]">
              Message #bug-reports
            </span>
          </div>

          <div className="absolute inset-x-0 top-[89px] flex items-center justify-between p-[8px]">
            <div className="flex items-start gap-[8px]">
              <ComposerButton src="/landing/app/cm-7.svg" rounded="full" />
              <ComposerButton src="/landing/app/cm-8.svg" />
              <ComposerButton src="/landing/app/cm-9.svg" />
              <ComposerButton src="/landing/app/cm-10.svg" />
            </div>
            <div className="flex flex-col items-start rounded-[4px] bg-[rgba(0,122,90,0.8)] py-[6px] pr-[6px] pl-[8px] opacity-50">
              <Icon src="/landing/app/cm-send.svg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
