import { WorldscoreApp } from "../WorldscoreApp";
import { SetupRequired } from "../SetupRequired";

// The studio itself. The landing page's CTAs point here, so this is the
// canonical route for the product; `/` stays free for the marketing page.
export const dynamic = "force-dynamic";

export default function StudioPage() {
  return process.env.REACTOR_API_KEY ? <WorldscoreApp /> : <SetupRequired />;
}
