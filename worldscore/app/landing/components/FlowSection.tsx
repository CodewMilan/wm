type FlowNode = {
  label: string;
  icon: string;
  /** Logo marks render slightly larger than the stroke icons. */
  markSize?: number;
  borderClass: string;
  style: React.CSSProperties;
};

const NODES: FlowNode[] = [
  {
    label: "Track Upload",
    icon: "/landing/flow-icon-query.svg",
    borderClass: "border-white/10",
    style: { left: "calc(50% - 0.01px)", top: 23.88, transform: "translateX(-50%)" },
  },
  {
    label: "Worldscore Analysis",
    icon: "/landing/flow-mark.png",
    markSize: 30.66,
    borderClass: "border-white/10",
    style: { left: "calc(50% - 0.01px)", top: 166, transform: "translateX(-50%)" },
  },
  {
    label: "Drafts Worlds",
    icon: "/landing/flow-icon-draft.svg",
    borderClass: "border-[rgba(0,201,80,0.2)]",
    style: { left: 81.94, top: 324.83 },
  },
  {
    label: "Asks Intent",
    icon: "/landing/flow-icon-silent.svg",
    borderClass: "border-[rgba(254,154,0,0.2)]",
    style: { left: 297.86, top: 324.83 },
  },
  {
    label: "You Direct",
    icon: "/landing/flow-icon-team.svg",
    borderClass: "border-[rgba(254,154,0,0.2)]",
    style: { left: 297.86, top: 450.23 },
  },
  {
    label: "Worldscore Learns",
    icon: "/landing/flow-icon-learn.svg",
    borderClass: "border-[rgba(173,70,255,0.2)]",
    style: { left: 297.86, top: 575.63 },
  },
  {
    label: "Live Session",
    icon: "/landing/flow-icon-send.svg",
    borderClass: "border-white/10",
    style: { left: "calc(50% - 0.01px)", top: 709.39, transform: "translateX(-50%)" },
  },
];

function Node({ node }: { node: FlowNode }) {
  const size = node.markSize ?? 23;
  return (
    <div
      className="absolute flex h-[86px] w-[160px] flex-col items-center gap-[8px]"
      style={node.style}
    >
      <div
        className={`flex size-[48px] items-center justify-center overflow-clip rounded-[16px] border bg-[#2d3035] p-px shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] ${node.borderClass}`}
      >
        <span className="relative block" style={{ width: size, height: size }}>
          <img
            src={node.icon}
            alt=""
            className="absolute inset-0 size-full max-w-none"
          />
        </span>
      </div>
      <div className="flex flex-col items-center rounded-[8px] border border-white/5 bg-black/40 px-[13px] py-[5px] backdrop-blur-[4px]">
        <span className="text-center text-[13.2px] leading-[20px] tracking-[0.4125px] whitespace-nowrap text-[#99a1af]">
          {node.label}
        </span>
      </div>
    </div>
  );
}

export function FlowSection() {
  return (
    <section className="flex h-[900px] items-start justify-center bg-[#121212] px-[115.2px]">
      <div className="flex w-[604.8px] items-center justify-center self-stretch border-r border-white/5 pr-px">
        <div className="relative h-[836px] max-h-[850px] w-[539.81px] overflow-clip bg-[#121212]">
          <img
            src="/landing/flow-connectors.svg"
            alt=""
            className="absolute top-0 left-0 h-[835.997px] w-[539.81px] max-w-none"
          />

          <div className="absolute top-[284.23px] left-0 flex h-[24px] w-[539.81px] items-start justify-between px-[80.97px]">
            <span className="h-full rounded-[4px] bg-[rgba(0,201,80,0.1)] px-[8px] py-[4px] text-[11.4px] leading-[16px] tracking-[1.0687px] whitespace-nowrap text-[#00c950]">
              Confident
            </span>
            <span className="h-full rounded-[4px] bg-[rgba(254,154,0,0.1)] px-[8px] py-[4px] text-[11.4px] leading-[16px] tracking-[0.8906px] whitespace-nowrap text-[#fe9a00]">
              Not Confident
            </span>
          </div>

          {NODES.map((node) => (
            <Node key={node.label} node={node} />
          ))}
        </div>
      </div>

      <div className="flex w-[604.8px] items-center justify-center self-stretch px-[80px] py-[40px]">
        <div
          className="relative flex h-[756px] max-h-[800px] w-[380.81px] flex-col items-center justify-center overflow-clip rounded-[24px] border border-white/5 bg-[#121212] p-px shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(128,128,128,0.07) 4.1667%, rgba(128,128,128,0) 4.1667%), linear-gradient(180deg, rgba(128,128,128,0.07) 4.1667%, rgba(128,128,128,0) 4.1667%)",
            backgroundSize: "24px 24px",
          }}
        >
          <span className="text-[14.9px] leading-[24px] tracking-[0.5384px] whitespace-nowrap text-[#6a7282]">
            Click anywhere on the flowchart for an example
          </span>
        </div>
      </div>
    </section>
  );
}
