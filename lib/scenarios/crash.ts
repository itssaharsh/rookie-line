import type { Scenario } from "@/lib/engine/types";

// Fictional caller, fictional address. She speaks Spanish; the trainee may ask in
// English or Spanish (the speech model follows both).
export const crash: Scenario = {
  id: "crash",
  line: 3,
  title: "Car crash · Spanish caller",
  brief: "Her son crashed into a pole and his head is bleeding. She speaks Spanish. Get the address and stop the bleeding.",
  language: "spanish",
  voiceId: "aai-constanza",
  caller: { name: "Lucía", age: 41, relation: "mother", subj: "She", obj: "her", poss: "her" },
  stageLabel: "CALLER · LUCÍA, 41 · HER SON CRASHED · SPEAKS SPANISH",
  teaser: "She speaks Spanish and she is frightened. Ask in English or in Spanish: the transcription follows both. Get the address, then tell her to press on the wound.",
  patient: { name: "Diego", age: 17, relation: "son" },
  facts: {
    address: { digits: "1803", street: "Oak", suffix: "Street", written: "1803 Oak Street" },
    callback: { digits: "5550163", written: "5-5-5, 0-1-6-3" },
  },
  startPanic: 9,
  opening: {
    high: [
      "¿Hola?! ¡Ayuda, por favor, mi hijo, mi- mi hijo chocó, está SANGRANDO!",
      "¡Por favor, por favor, necesito una ambulancia, mi hijo chocó contra un- un POSTE!",
    ],
    mid: ["¿Hola? Necesito una ambulancia. Mi hijo chocó."],
    low: ["Hola. Mi hijo tuvo un choque. Necesito una ambulancia."],
  },
  bank: {
    ask_address: {
      high: ["¡Es- es {ADDRESS}! ¡Por favor, apúrense!"],
      mid: ["Es {ADDRESS}. Frente a la, eh, la tienda."],
      low: ["Es {ADDRESS}, frente a la tienda."],
    },
    readback_address: { high: ["¡Sí! ¡SÍ, ahí es!"], mid: ["Sí, eso es."], low: ["Sí, correcto."] },
    mismatch_address: { high: ["¡No-- no! ¡Es {ADDRESS}!"], mid: ["No, es {ADDRESS}."], low: ["No, es {ADDRESS}."] },
    ask_callback: {
      high: ["¿Mi número? Es, eh, es {CALLBACK}, ¡por favor!"],
      mid: ["Es {CALLBACK}. Es mi celular."],
      low: ["{CALLBACK}, mi celular."],
    },
    readback_callback: { high: ["¡Sí, sí!"], mid: ["Sí, ese es."], low: ["Sí, correcto."] },
    mismatch_callback: { high: ["¡No-- es {CALLBACK}!"], mid: ["No, es {CALLBACK}."], low: ["No, es {CALLBACK}."] },
    ask_what_happened: {
      high: ["¡Chocó contra- contra un poste! ¡El carro está todo- todo DESTROZADO!"],
      mid: ["Chocó contra un poste, eh, aquí en la esquina. El carro está muy mal."],
      low: ["Chocó contra un poste en la esquina."],
    },
    ask_conscious: {
      high: ["¡Sí, sí, me habla pero está- está muy CONFUNDIDO!"],
      mid: ["Sí, está despierto. Me habla, pero está confundido."],
      low: ["Está despierto y me habla."],
    },
    ask_breathing: {
      high: ["¡Sí, respira, respira, pero hay mucha SANGRE!"],
      mid: ["Sí, respira bien."],
      low: ["Sí, respira normal."],
    },
    instruct_pressure: {
      high: ["¿Presionar? Okay, okay, con mi- con mi suéter, ¡ya, ya estoy presionando!"],
      mid: ["Okay. Le pongo mi suéter en la cabeza y presiono."],
      low: ["Okay, estoy presionando con un trapo limpio."],
    },
    ask_hurt: {
      high: ["¡No, yo no, yo estoy bien, es mi HIJO!"],
      mid: ["Yo estoy bien. Es mi hijo."],
      low: ["Yo estoy bien."],
    },
    ask_caller_name: { high: ["¡Lucía! ¡Lucía Torres!"], mid: ["Lucía Torres."], low: ["Me llamo Lucía Torres."] },
    ask_patient_name: { high: ["¡Diego! ¡Se llama DIEGO!"], mid: ["Diego. Se llama Diego."], low: ["Se llama Diego."] },
    ask_age: { high: ["¡Diecisiete! ¡Tiene diecisiete!"], mid: ["Tiene, eh, diecisiete años."], low: ["Diecisiete años."] },
    ask_with_him: {
      high: ["¡Sí, estoy aquí con él, en la calle!"],
      mid: ["Sí, estoy con él, junto al carro."],
      low: ["Sí, estoy a su lado."],
    },
    help_coming: {
      high: ["Okay- okay, ¡dígales que se APUREN!"],
      mid: ["Okay. Okay, gracias."],
      low: ["Okay. Gracias."],
    },
    task_running: {
      high: ["¡Estoy presionando! ¡Sigue sangrando! ¿Cuándo- cuándo LLEGAN?!"],
      mid: ["Sigo presionando. ¿Ya vienen?"],
      low: ["Sigo presionando. Está sangrando menos."],
    },
    filler: {
      high: ["¿Hola? ¿Sigue- sigue AHÍ?!", "¿Qué hago? ¡¿Qué HAGO?!"],
      mid: ["¿Hola? ¿Qué hago?"],
      low: ["Okay. ¿Qué hago ahora?"],
    },
    fallback: {
      high: ["¡No sé, no SÉ! ¡Manden a alguien, por favor!"],
      mid: ["No sé. Por favor, manden a alguien."],
      low: ["No estoy segura. Manden ayuda, por favor."],
    },
    repeat: { high: ["¡Ya le- ya le DIJE!"], mid: ["Ya le dije,"], low: ["Como le dije,"] },
    talked_over: { high: ["¿Qué-- qué?!"], mid: ["¿Perdón, qué?"], low: [""] },
  },
  situation:
    "Your son Diego, 17, crashed his car into a light pole at the corner by your house a few minutes ago. He is awake and talking but confused, and his head is bleeding a lot. You are next to him in the street.",
  taskIntent: "instruct_pressure",
  checklist: [
    { id: "address", label: "The address, read back" },
    { id: "callback", label: "A callback number" },
    { id: "what_happened", label: "What happened", event: "what_happened", slot: { label: "What happened", done: "Car hit a pole" }, score: { done: "Asked what happened", missed: "Never asked what happened" } },
    { id: "conscious", label: "Is he awake?", event: "asked_conscious", slot: { label: "Is he awake?", done: "Awake, confused" }, score: { done: "Asked if he is awake", missed: "Never asked if he is awake" } },
    { id: "pressure", label: "Stop the bleeding", event: "pressure_instructed", slot: { label: "Stop the bleeding", done: "Pressure on the wound" }, score: { done: "Told her to press on the wound", missed: "Never told her to press on the wound" } },
  ],
};
