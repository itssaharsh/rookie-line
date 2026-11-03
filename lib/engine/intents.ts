// What did the trainee just say? Plain keyword rules, so the caller answers in
// about the time it takes the voice to start, and the result is testable.
import type { Agitator, CalmCue, Intent, Scenario } from "./types";
import { digitRuns } from "./numbers";

const norm = (s: string) =>
  ` ${s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")} `;

const has = (t: string, ...phrases: string[]) => phrases.some((p) => t.includes(` ${p} `) || t.includes(` ${p}`));

export interface Heard {
  intents: Intent[];
  calm: CalmCue[];
  agitators: Agitator[];
  /** true when nothing she can answer was said and it reads like a real question */
  unplanned: boolean;
}

export function hear(text: string, scenario: Scenario): Heard {
  const t = norm(text);
  const intents: Intent[] = [];
  const calm: CalmCue[] = [];
  const agitators: Agitator[] = [];
  const { address, callback } = scenario.facts;

  // read-backs first: digits the trainee said, checked against the facts
  const runs = digitRuns(text);
  const streetSaid = has(t, address.street.toLowerCase());
  const addressRuns = runs.filter((r) => r.length >= 2 && r.length <= 5);
  const phoneRuns = runs.filter((r) => r.length >= 7);
  if (addressRuns.includes(address.digits)) intents.push("readback_address");
  else if (addressRuns.length && (streetSaid || has(t, "address", "direccion", "court", "street", "calle"))) intents.push("mismatch_address");
  if (phoneRuns.some((r) => r.endsWith(callback.digits.slice(-7)))) intents.push("readback_callback");
  else if (phoneRuns.length) intents.push("mismatch_callback");
  if (streetSaid && !runs.length && has(t, "is it", "is that", "you said", "on ")) intents.push("ask_address");

  // questions and instructions
  if (has(t, "address", "where are you", "where is he", "where's he", "location", "where exactly", "what street", "cross street", "direccion", "donde esta", "donde estan")) intents.push("ask_address");
  if (has(t, "callback", "call back", "call you back", "phone number", "number you're calling", "number are you calling", "your number", "lose you", "lose the call", "telefono", "numero")) intents.push("ask_callback");
  if (has(t, "what's your emergency", "what is your emergency", "what happened", "what's going on", "what is going on", "tell me what", "what's wrong", "what is wrong", "que paso", "que esta pasando")) intents.push("ask_what_happened");
  if (has(t, "is he breathing", "is he breathing normally", "breathing normally", "he breathing", "his breathing", "chest moving", "chest rising", "respira", "respirando")) intents.push("ask_breathing");
  if (has(t, "awake", "conscious", "responsive", "respond to you", "answer you", "talk to you", "open his eyes", "consciente", "despierto", "responde")) intents.push("ask_conscious");
  if (has(t, "how old", "his age", "age is he", "cuantos anos", "que edad")) intents.push("ask_age");
  if (has(t, "your name", "who am i speaking", "who am i talking", "como te llamas", "su nombre", "tu nombre")) intents.push("ask_caller_name");
  if (has(t, "his name", "patient's name", "father's name", "dad's name", "el se llama", "nombre de su")) intents.push("ask_patient_name");
  if (has(t, "are you with him", "next to him", "beside him", "right now with", "esta con el", "estas con el")) intents.push("ask_with_him");
  if (has(t, "door", "unlock", "let them in", "puerta")) intents.push("ask_door");
  if (has(t, "on his back", "flat on", "lay him", "roll him", "get him on the floor", "boca arriba")) intents.push("instruct_position");
  if (has(t, "push", "compress", "compression", "cpr", "center of his chest", "middle of his chest", "heel of your hand", "hands on his chest", "pump", "empuja", "presiona", "rcp")) intents.push("instruct_cpr");
  if (has(t, "help is on the way", "help is coming", "they're coming", "they are coming", "on their way", "on the way", "en route", "ambulance is", "paramedics are", "sending help", "i'm sending", "units are", "la ambulancia", "ayuda va en camino", "van en camino")) intents.push("help_coming");

  // calming cues the panic rules reward
  if (has(t, scenario.caller.name.toLowerCase())) calm.push("name");
  if (has(t, "i'm with you", "i am with you", "i'm here", "i am here", "stay with me", "i've got you", "i got you", "estoy contigo", "estoy aqui")) calm.push("with_you");
  if (has(t, "breathe", "deep breath", "take a breath", "breath with me", "respira hondo", "respire")) calm.push("breathe");
  if (has(t, "listen to me", "i need you to listen", "listen carefully", "escuchame", "escucheme")) calm.push("listen");
  if (has(t, "doing great", "doing good", "doing well", "good job", "you're doing", "lo estas haciendo bien", "muy bien")) calm.push("praise");
  if (has(t, "slow down", "slowly", "one at a time", "mas despacio", "despacio")) calm.push("slow_down");

  // the phrase every trainer warns about
  if (has(t, "calm down", "you need to calm", "calmate", "calmese") && !has(t, "help you calm")) agitators.push("calm_down");

  const questionWords = /\b(who|what|where|when|why|how|is|are|do|does|did|can|could|has|have|was|were|any|que|quien|donde|cuando|como|por que)\b/;
  const wordCount = t.trim().split(" ").filter(Boolean).length;
  const unplanned = intents.length === 0 && (text.includes("?") || questionWords.test(t)) && wordCount >= 3;

  return { intents: dedupe(intents), calm: dedupe(calm), agitators, unplanned };
}

function dedupe<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}
