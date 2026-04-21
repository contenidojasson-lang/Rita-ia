const chat = document.getElementById("chat");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const micBtn = document.getElementById("micBtn");
const statusText = document.getElementById("status");

const apiKeyInput = document.getElementById("apiKey");
const saveKeyBtn = document.getElementById("saveKeyBtn");
const clearKeyBtn = document.getElementById("clearKeyBtn");

const exportBtn = document.getElementById("exportBtn");
const clearChatBtn = document.getElementById("clearChatBtn");

let apiKey = localStorage.getItem("RITA_GEMINI_KEY") || "";
apiKeyInput.value = apiKey;

let history = JSON.parse(localStorage.getItem("RITA_HISTORY") || "[]");

function addMessage(text, type){
  const div = document.createElement("div");
  div.className = `msg ${type}`;
  div.innerText = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function saveHistory(){
  localStorage.setItem("RITA_HISTORY", JSON.stringify(history));
}

function loadHistory(){
  chat.innerHTML = "";
  history.forEach(m => addMessage(m.text, m.type));
}

loadHistory();

saveKeyBtn.onclick = () => {
  apiKey = apiKeyInput.value.trim();
  localStorage.setItem("RITA_GEMINI_KEY", apiKey);
  statusText.innerText = "API Key guardada correctamente.";
};

clearKeyBtn.onclick = () => {
  apiKey = "";
  apiKeyInput.value = "";
  localStorage.removeItem("RITA_GEMINI_KEY");
  statusText.innerText = "API Key eliminada.";
};

async function askGemini(prompt){
  if(!apiKey){
    return "No hay API Key configurada. Pégala arriba y presiona Guardar.";
  }

  statusText.innerText = "Procesando...";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ]
  };

  try{
    const res = await fetch(url, {
      method:"POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    statusText.innerText = "Listo.";

    if(data.error){
      return "Error Gemini: " + data.error.message;
    }

    const output = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return output || "No recibí respuesta del modelo.";

  }catch(err){
    statusText.innerText = "Error.";
    return "Error de conexión: " + err.message;
  }
}

async function sendMessage(text){
  if(!text.trim()) return;

  addMessage(text, "user");
  history.push({text, type:"user"});
  saveHistory();

  const systemStyle = `
Eres RITA IA, asistente personal estilo Jarvis.
Responde en español.
Tono: serio, técnico, elegante y directo.
El usuario se llama: Yei.
Cuando respondas, no uses emojis.
Si es marketing, responde comercial y estratégico.
Si es cotización, responde estructurado.
`;

  const finalPrompt = systemStyle + "\n\nUsuario: " + text;

  const reply = await askGemini(finalPrompt);

  addMessage(reply, "bot");
  history.push({text: reply, type:"bot"});
  saveHistory();

  speak(reply);
}

sendBtn.onclick = () => {
  sendMessage(userInput.value);
  userInput.value = "";
};

userInput.addEventListener("keydown", (e) => {
  if(e.key === "Enter"){
    sendBtn.click();
  }
});

document.querySelectorAll(".qbtn").forEach(btn => {
  btn.onclick = () => {
    sendMessage(btn.dataset.prompt);
  };
});

function speak(text){
  if(!window.speechSynthesis) return;

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "es-ES";
  utter.rate = 1;
  utter.pitch = 1.1;

  // intenta voz femenina si existe
  const voices = speechSynthesis.getVoices();
  const female = voices.find(v => v.lang.includes("es") && v.name.toLowerCase().includes("female"));
  if(female) utter.voice = female;

  speechSynthesis.speak(utter);
}

micBtn.onclick = () => {
  if(!("webkitSpeechRecognition" in window)){
    statusText.innerText = "Tu navegador no soporta reconocimiento de voz.";
    return;
  }

  const recognition = new webkitSpeechRecognition();
  recognition.lang = "es-ES";
  recognition.interimResults = false;

  statusText.innerText = "Escuchando...";

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    userInput.value = transcript;
    statusText.innerText = "Listo.";
    sendBtn.click();
  };

  recognition.onerror = () => {
    statusText.innerText = "Error en reconocimiento de voz.";
  };

  recognition.start();
};

clearChatBtn.onclick = () => {
  if(confirm("¿Borrar todo el historial?")){
    history = [];
    saveHistory();
    loadHistory();
    statusText.innerText = "Historial borrado.";
  }
};

exportBtn.onclick = () => {
  const text = history.map(m => (m.type === "user" ? "YEI: " : "RITA IA: ") + m.text).join("\n\n");
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "RITA_IA_Conversacion.txt";
  a.click();

  URL.revokeObjectURL(url);
};