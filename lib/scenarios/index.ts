import type { Scenario } from "@/lib/engine/types";
import { cardiac } from "./cardiac";

export const scenarios: Scenario[] = [cardiac];

export function scenarioById(id: string): Scenario {
  const s = scenarios.find((x) => x.id === id);
  if (!s) throw new Error(`unknown scenario ${id}`);
  return s;
}
