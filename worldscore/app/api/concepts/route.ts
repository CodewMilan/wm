import { NextResponse } from "next/server";
import { generateDirections } from "../../lib/concepts/generate";
import type { AudioAnalysis } from "../../lib/audio/types";

// Takes the features derived in the browser and returns five world directions.
// The audio itself never reaches this route — only the analysis does.
export async function POST(request: Request) {
  let analysis: AudioAnalysis;
  try {
    analysis = (await request.json()) as AudioAnalysis;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!analysis?.sections || !Number.isFinite(analysis.bpm)) {
    return NextResponse.json({ error: "missing analysis fields" }, { status: 400 });
  }

  const result = await generateDirections(analysis);
  return NextResponse.json(result);
}
