const QUESTIONS = [
  { text: "What is Worldscore?", className: "text-[19.1px] tracking-[0.4477px]" },
  {
    text: "How is this different from a typical text-to-video generator?",
    className: "text-[18.4px] tracking-[0.7098px]",
  },
  { text: "Who is Worldscore for?", className: "text-[18.9px] tracking-[0.5906px]" },
  {
    text: "Does the world keep evolving on its own while the track plays?",
    className: "text-[18.9px] tracking-[0.5537px]",
  },
  {
    text: "What happens if none of the five directions feel right?",
    className: "text-[18.4px] tracking-[0.7727px]",
  },
  {
    text: "Where do the visual directions come from?",
    className: "text-[18.6px] tracking-[0.6539px]",
  },
];

export function Faq() {
  return (
    <section className="flex flex-col items-center justify-center border-t border-white/5 bg-[#121212] px-[80px] pt-[124px] pb-[123px]">
      <div className="flex w-[768px] max-w-[768px] flex-col items-start gap-[48px]">
        <h2 className="w-full text-center text-[35px] leading-[40px] tracking-[-0.9px] whitespace-nowrap text-white">
          Frequently Asked Questions
        </h2>

        <div className="flex w-full flex-col items-start gap-[16px]">
          {QUESTIONS.map((question, i) => (
            <div
              key={question.text}
              className={`flex w-full flex-col items-start ${
                i < QUESTIONS.length - 1 ? "border-b border-white/10 pb-px" : ""
              }`}
            >
              <button className="flex w-full items-center justify-between py-[24px] text-left">
                <span
                  className={`leading-[28px] whitespace-nowrap text-[#99a1af] ${question.className}`}
                >
                  {question.text}
                </span>
                <span className="flex size-[32px] items-center justify-center rounded-full border border-white/10 p-px">
                  <span className="relative block size-[20px]">
                    <img
                      src="/landing/icon-plus.svg"
                      alt=""
                      className="absolute inset-0 size-full max-w-none"
                    />
                  </span>
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
