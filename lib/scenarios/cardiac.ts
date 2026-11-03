import type { Scenario } from "@/lib/engine/types";

// A fictional caller and a fictional address. {ADDRESS} and {CALLBACK} are filled by
// code at the caller's current panic level; the model never writes them.
export const cardiac: Scenario = {
  id: "cardiac",
  line: 1,
  title: "Cardiac arrest",
  brief: "Her dad collapsed. Get the address and a callback number.",
  language: "english",
  voiceId: "aai-hailey",
  caller: { name: "Maria", age: 34, relation: "daughter" },
  patient: { name: "Luis", age: 67, relation: "father" },
  facts: {
    address: { digits: "417", street: "Maple", suffix: "Court", written: "417 Maple Court" },
    callback: { digits: "5550142", written: "5-5-5, 0-1-4-2" },
  },
  startPanic: 9,
  opening: {
    high: [
      "Hello?! Hello, please, it's my DAD, he- he just fell, he's not-- please help me!",
      "Please, please, I need- I need an ambulance, my dad, he's on the FLOOR!",
    ],
    mid: ["Hello? I need an ambulance, my dad collapsed."],
    low: ["Hi. I need an ambulance. My father collapsed."],
  },
  bank: {
    ask_address: {
      high: ["It's- it's {ADDRESS}! Please, PLEASE hurry!", "We're at- we're at {ADDRESS}, please, he's on the FLOOR!"],
      mid: ["It's {ADDRESS}. Please, uh, please hurry.", "We're at {ADDRESS}. The house with the, uh, the blue door."],
      low: ["Okay. It's {ADDRESS}.", "{ADDRESS}. The house with the blue door."],
    },
    readback_address: {
      high: ["Yes! YES, that's it, please hurry!"],
      mid: ["Yes, that's- that's right. Please hurry."],
      low: ["Yes. That's right."],
    },
    mismatch_address: {
      high: ["No-- no! It's {ADDRESS}!"],
      mid: ["No, no, it's {ADDRESS}."],
      low: ["No, it's {ADDRESS}."],
    },
    ask_callback: {
      high: ["My- my number? It's, uh, it's {CALLBACK}, please just SEND someone!"],
      mid: ["It's {CALLBACK}. It's my cell."],
      low: ["{CALLBACK}. It's my cell."],
    },
    readback_callback: {
      high: ["Yes, yes! Please!"],
      mid: ["Yes, that's my number."],
      low: ["Yes, that's right."],
    },
    mismatch_callback: {
      high: ["No-- it's {CALLBACK}!"],
      mid: ["No, it's {CALLBACK}."],
      low: ["No, it's {CALLBACK}."],
    },
    ask_what_happened: {
      high: ["He just- he just FELL, he grabbed his chest in the kitchen and he went down, he's not-- please!"],
      mid: ["He grabbed his chest and, uh, he fell. In the kitchen. He's not moving."],
      low: ["He grabbed his chest and collapsed in the kitchen. He's not moving."],
    },
    ask_breathing: {
      high: ["I don't- I don't KNOW! He's making this- this weird sound, like a gasp, it's not- it's not normal!"],
      mid: ["He's, uh, he's gasping. Like every few seconds. It doesn't sound right."],
      low: ["He's gasping, every few seconds. It's not normal breathing."],
    },
    ask_conscious: {
      high: ["No! He won't- he won't answer me! Dad?! DAD!"],
      mid: ["No, he's not answering. His eyes are, uh, half open."],
      low: ["No. He doesn't respond to me."],
    },
    ask_age: {
      high: ["He's- he's sixty-seven!"],
      mid: ["He's, uh, sixty-seven."],
      low: ["He's sixty-seven."],
    },
    ask_caller_name: {
      high: ["Maria! I'm Maria, his- his daughter!"],
      mid: ["Maria. I'm his daughter."],
      low: ["I'm Maria, his daughter."],
    },
    ask_patient_name: {
      high: ["Luis! His name is LUIS!"],
      mid: ["His name is Luis."],
      low: ["Luis. His name is Luis."],
    },
    ask_with_him: {
      high: ["Yes! Yes, I'm right here, I'm on the floor with him!"],
      mid: ["Yes, I'm, uh, I'm kneeling next to him."],
      low: ["Yes, I'm right next to him."],
    },
    ask_door: {
      high: ["The door? I- I think it's open, I don't KNOW!"],
      mid: ["The front door is, uh, it's unlocked."],
      low: ["The front door is unlocked."],
    },
    instruct_position: {
      high: ["Okay- okay, I'm- he's on his back, he's on his BACK!"],
      mid: ["Okay. He's, uh, he's flat on his back now."],
      low: ["Okay. He's flat on his back."],
    },
    instruct_cpr: {
      high: ["I- I don't know how! Okay, okay, I'm pushing, I'm PUSHING!"],
      mid: ["Okay. Hands on his chest. I'm pushing, uh, like this?"],
      low: ["Okay. I'm pushing hard and fast. One, two, three, four."],
    },
    help_coming: {
      high: ["Okay- okay. Please, PLEASE tell them to hurry!"],
      mid: ["Okay. Okay. Thank you."],
      low: ["Okay. Thank you."],
    },
    cpr_running: {
      high: ["I'm pushing! Is- is this right?! When are they COMING?!"],
      mid: ["I'm still pushing. Are they, uh, are they close?"],
      low: ["Still pushing. Twenty-one, twenty-two, twenty-three."],
    },
    filler: {
      high: ["Please! Are you- are you still THERE?!", "What do I- what do I DO?!"],
      mid: ["Hello? What do I do?"],
      low: ["Okay. What do I do next?"],
    },
    fallback: {
      high: ["I- I don't know! Please, just send someone!"],
      mid: ["I, uh, I don't know. Please just send someone."],
      low: ["I'm not sure. Please just send help."],
    },
    repeat: {
      high: ["I- I already TOLD you!"],
      mid: ["I said, uh,"],
      low: ["Like I said,"],
    },
    talked_over: {
      high: ["What-- what?!"],
      mid: ["Sorry, what?"],
      low: [""],
    },
  },
  checklist: [
    { id: "address", label: "The address, read back" },
    { id: "callback", label: "A callback number" },
    { id: "what_happened", label: "What happened" },
    { id: "breathing", label: "Is he breathing?" },
    { id: "cpr", label: "Start CPR instructions" },
  ],
};
