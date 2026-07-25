import { WorldscoreApp } from "./WorldscoreApp";
import { SetupRequired } from "./SetupRequired";

// Server component: the only thing it decides is whether the app is
// configured. Token minting stays behind /api/reactor/token so the API key
// never reaches the browser.
export const dynamic = "force-dynamic";

export default function Page() {
  return process.env.REACTOR_API_KEY ? <WorldscoreApp /> : <SetupRequired />;
}
