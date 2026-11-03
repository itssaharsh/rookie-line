import type { Scenario } from "@/lib/engine/types";
import { cardiac } from "./cardiac";
import { fire } from "./fire";
import { crash } from "./crash";

export const scenarios: Scenario[] = [cardiac, fire, crash];

export function scenarioById(id: string): Scenario {
  const s = scenarios.find((x) => x.id === id);
  if (!s) throw new Error(`unknown scenario ${id}`);
  return s;
}
