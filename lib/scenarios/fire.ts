import type { Scenario } from "@/lib/engine/types";

// Fictional caller, fictional address. A grease fire he made worse with water.
export const fire: Scenario = {
  id: "fire",
  line: 2,
  title: "Kitchen fire",
  brief: "His kitchen is on fire and he wants to save his dog. Get the address and get him out.",
  language: "english",
  voiceId: "aai-dorsey",
  caller: { name: "Walter", age: 78, relation: "homeowner", subj: "He", obj: "him", poss: "his" },
  stageLabel: "CALLER · WALTER, 78 · KITCHEN FIRE, HOME ALONE",
  teaser: "He threw water on a grease fire and it went up. He is scared and he wants to go back for his dog. Get the address, then get him out of the house.",
  patient: { name: "Walter", age: 78, relation: "self" },
  facts: {
    address: { digits: "2210", street: "Birch", suffix: "Lane", written: "2210 Birch Lane" },
    callback: { digits: "5550187", written: "5-5-5, 0-1-8-7" },
  },
  startPanic: 8,
  opening: {
    high: [
      "Hello?! There's a FIRE, my kitchen's on- on fire, I threw water on it and it just-- it went UP!",
      "Hello? Hello, I need the fire- the fire department, my kitchen is BURNING!",
    ],
    mid: ["Hello? My kitchen is on fire. I need the fire department."],
    low: ["Hello. My kitchen is on fire."],
  },
  bank: {
    ask_address: {
      high: ["It's- it's {ADDRESS}! Please, hurry, the smoke is EVERYWHERE!"],
      mid: ["{ADDRESS}. The, uh, the white house on the corner."],
      low: ["It's {ADDRESS}. The white house on the corner."],
    },
    readback_address: { high: ["Yes! Yes, that's it!"], mid: ["Yes, that's right."], low: ["That's right."] },
    mismatch_address: { high: ["No-- no! {ADDRESS}!"], mid: ["No, it's {ADDRESS}."], low: ["No, it's {ADDRESS}."] },
    ask_callback: {
      high: ["My number? It's, uh, it's {CALLBACK}, I'm on the- the house phone!"],
      mid: ["It's {CALLBACK}. The house phone."],
      low: ["{CALLBACK}. It's the house phone."],
    },
    readback_callback: { high: ["Yes, yes!"], mid: ["Yes, that's it."], low: ["That's right."] },
    mismatch_callback: { high: ["No-- it's {CALLBACK}!"], mid: ["No, it's {CALLBACK}."], low: ["No, it's {CALLBACK}."] },
    ask_what_happened: {
      high: ["The pan! The oil caught and I- I threw water on it and the whole- the whole stove went UP!"],
      mid: ["A pan of oil caught fire. I, uh, I threw water on it and it got worse."],
      low: ["A pan of oil caught fire on the stove. Water made it worse."],
    },
    ask_others: {
      high: ["No, no, it's just me! Just me and- and Biscuit, my DOG, he's in the back!"],
      mid: ["Just me. And my dog, Biscuit, he's, uh, he's in the back room."],
      low: ["Just me and my dog."],
    },
    instruct_leave: {
      high: ["Leave? But Biscuit-- okay, OKAY, I'm going, I'm going to the door!"],
      mid: ["Okay. Okay, I'm, uh, I'm going out the front door."],
      low: ["Okay. I'm going out the front door now."],
    },
    ask_hurt: {
      high: ["My- my hand, I burned my HAND, it's fine, it's fine!"],
      mid: ["I burned my hand a little. I'm okay."],
      low: ["Just my hand. I'm okay."],
    },
    ask_breathing: {
      high: ["It's- it's hard, the smoke is THICK in here!"],
      mid: ["The smoke is, uh, it's getting thick."],
      low: ["The smoke is thick, but I'm okay."],
    },
    ask_caller_name: { high: ["Walter! Walter Price!"], mid: ["Walter. Walter Price."], low: ["Walter Price."] },
    ask_age: { high: ["Seventy-eight! Please, just hurry!"], mid: ["I'm seventy-eight."], low: ["I'm seventy-eight."] },
    ask_door: { high: ["The door? It's- it's open, I left it OPEN!"], mid: ["The front door's open."], low: ["The front door is open."] },
    help_coming: {
      high: ["Okay- okay, please tell them to HURRY!"],
      mid: ["Okay. Okay, thank you."],
      low: ["Okay. Thank you."],
    },
    task_running: {
      high: ["I'm out! I'm on the- the lawn, but Biscuit is still IN there!"],
      mid: ["I'm outside now. On the front lawn. Biscuit's, uh, still inside."],
      low: ["I'm outside on the lawn. I'm okay."],
    },
    filler: {
      high: ["Hello?! Are you- are you still THERE?!", "What do I- what do I DO?!"],
      mid: ["Hello? What do I do?"],
      low: ["Okay. What should I do?"],
    },
    fallback: {
      high: ["I- I don't know! Please, just send the TRUCK!"],
      mid: ["I, uh, I don't know. Please just send someone."],
      low: ["I'm not sure. Please just send help."],
    },
    repeat: { high: ["I- I already TOLD you!"], mid: ["I said, uh,"], low: ["Like I said,"] },
    talked_over: { high: ["What-- what?!"], mid: ["Sorry, what?"], low: [""] },
  },
  situation:
    "A pan of oil caught fire on your stove. You threw water on it and the fire spread up the cupboards. Smoke is filling the house. You live alone with your dog Biscuit, who is in the back room. You burned your hand.",
  taskIntent: "instruct_leave",
  checklist: [
    { id: "address", label: "The address, read back" },
    { id: "callback", label: "A callback number" },
    { id: "what_happened", label: "What is burning", event: "what_happened", slot: { label: "What's burning", done: "Grease fire, stove" }, score: { done: "Asked what is burning", missed: "Never asked what is burning" } },
    { id: "others", label: "Anyone else inside?", event: "asked_others", slot: { label: "Anyone else inside?", done: "Alone, dog in back" }, score: { done: "Asked if anyone else is inside", missed: "Never asked if anyone else is inside" } },
    { id: "leave", label: "Get him out of the house", event: "evacuate_instructed", slot: { label: "Get him out", done: "Told to leave" }, score: { done: "Told him to get out", missed: "Never told him to get out" } },
  ],
};
