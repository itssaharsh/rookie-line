import { Console } from "@/components/console/Console";
import { scenarios } from "@/lib/scenarios";

export default function Home() {
  return <Console scenarios={scenarios} />;
}
