import {
  VectorIcon,
  draftsLayers,
  hashLayersActive,
  hashLayersMuted,
  huddlesLayers,
  plusLayers,
  threadsLayers,
  type VectorLayer,
} from "./VectorIcon";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full items-center px-[8px] pt-[24px]">
      <div className="flex items-center gap-[4px]">
        <span className="relative block size-[12px]">
          <img
            src="/landing/app/sb-chevron.svg"
            alt=""
            className="absolute inset-0 size-full max-w-none"
          />
        </span>
        <span className="font-geist text-[12px] leading-[16px] whitespace-nowrap text-[#6a7282]">
          {children}
        </span>
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  width,
  active = false,
  muted = false,
  extraTop = false,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  width: number;
  active?: boolean;
  muted?: boolean;
  extraTop?: boolean;
  suffix?: string;
}) {
  return (
    <div
      className={`flex w-[227px] items-center rounded-[6px] px-[12px] ${
        extraTop ? "pt-[13px] pb-[5px]" : "py-[5px]"
      } ${active ? "bg-[#1164a3]" : ""}`}
    >
      <div className="flex h-[16px] w-[28px] flex-col items-start pr-[12px]">
        {icon}
      </div>
      <div className="flex h-[22.5px] items-start overflow-clip">
        <span
          className={`font-geist block overflow-clip text-[15px] leading-[22.5px] ${
            active ? "text-white" : muted ? "text-[#6a7282]" : "text-[#99a1af]"
          }`}
          style={{ width }}
        >
          {label}
        </span>
        {suffix ? (
          <span className="font-geist ml-[7.75px] self-center text-[12px] leading-[16px] text-[#99a1af] opacity-70">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Avatar({ src }: { src: string }) {
  return (
    <span className="relative block size-[16px] overflow-clip rounded-[4px]">
      <img
        src={src}
        alt=""
        className="absolute top-0 left-0 size-full max-w-none object-cover"
      />
    </span>
  );
}

function Glyph({ layers }: { layers: VectorLayer[] }) {
  return <VectorIcon size={16} layers={layers} />;
}

export function Sidebar() {
  return (
    <div className="flex w-[260px] shrink-0 flex-col items-start border-r border-white/5 bg-[#1a1d21]">
      <div className="flex h-[48px] w-[259px] items-center justify-between border-b border-white/5 px-[16px]">
        <span className="font-geist text-[16px] leading-[24px] tracking-[0.75px] whitespace-nowrap text-white">
          Worldscore
        </span>
        <div className="flex items-start gap-[8px]">
          <span className="relative block size-[16px]">
            <img
              src="/landing/app/sb-icon-a.svg"
              alt=""
              className="absolute inset-0 size-full max-w-none"
            />
          </span>
          <span className="flex size-[32px] items-center justify-center rounded-[4px] bg-white/10">
            <span className="relative block size-[16px]">
              <img
                src="/landing/app/sb-icon-b.svg"
                alt=""
                className="absolute inset-0 size-full max-w-none"
              />
            </span>
          </span>
        </div>
      </div>

      <div className="flex w-[259px] min-h-px flex-1 flex-col items-center overflow-hidden px-[8px] py-[16px]">
        <Row icon={<Glyph layers={threadsLayers} />} label="Threads" width={54.63} />
        <Row icon={<Glyph layers={huddlesLayers} />} label="Huddles" width={56.47} />
        <Row
          icon={<Glyph layers={draftsLayers} />}
          label="Drafts & sent"
          width={88.94}
        />

        <SectionLabel>Channels</SectionLabel>
        <Row icon={<Glyph layers={hashLayersMuted} />} label="all-hands" width={64.2} />
        <Row
          icon={<Glyph layers={hashLayersActive} />}
          label="bug-reports"
          width={88.2}
          active
        />
        <Row icon={<Glyph layers={hashLayersMuted} />} label="social" width={39.83} />
        <Row
          icon={<Glyph layers={plusLayers} />}
          label="Add channels"
          width={93.08}
          muted
        />

        <SectionLabel>Direct messages</SectionLabel>
        <Row
          icon={<Avatar src="/landing/app/avatar-grace.png" />}
          label="Grace"
          width={40.22}
          extraTop
        />
        <Row
          icon={<Avatar src="/landing/app/avatar-john.png" />}
          label="John"
          width={34.53}
        />
        <Row
          icon={<Avatar src="/landing/app/avatar-alice.png" />}
          label="Alice"
          width={33.58}
          suffix="you"
        />
        <Row
          icon={<Avatar src="/landing/app/avatar-steve.jpg" />}
          label="Steve"
          width={39}
        />
        <Row
          icon={<Glyph layers={plusLayers} />}
          label="Invite people"
          width={87.83}
          muted
        />

        <SectionLabel>Apps</SectionLabel>
        <Row
          icon={<Avatar src="/landing/app/slack-mini.png" />}
          label="Slackbot"
          width={60.73}
          extraTop
        />
        <Row
          icon={<Avatar src="/landing/app/logo-dark.png" />}
          label="Worldscore"
          width={70}
        />
      </div>
    </div>
  );
}
