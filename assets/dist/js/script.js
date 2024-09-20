const enviarButton = document.getElementById('enviar');
const perguntaInput = document.getElementById('pergunta');
const apiTokenInput = document.getElementById('apiToken');
const respostaDiv = document.getElementById('resposta');
const microfoneButton = document.getElementById('microfone');
const modoEscuroButton = document.getElementById('modoEscuro');
const limparButton = document.getElementById('limpar');
const complementoInput = document.getElementById('complemento');

let recognition = null;
let isListening = false;
//let finalTranscript = '';//Usando para limpar a caixa de texto
let listeningTimer = null;

function setupSpeechRecognition() {
  if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      perguntaInput.value += finalTranscript;

      // Reiniciando a escuta após um período de inatividade
      clearTimeout(listeningTimer);
      listeningTimer = setTimeout(() => {
        recognition.stop();
        setTimeout(() => {
          if (microfoneButton.innerHTML.includes('bi-mic-mute')) {
            recognition.start();
          }
        }, 500);
      }, 5000); // Aguarda 5 segundos de inatividade
    };

    microfoneButton.addEventListener('click', () => {
      toggleSpeechRecognition();
    });
  } else {
    alert('Seu navegador não suporta reconhecimento de fala.');
  }
}

function toggleSpeechRecognition() {
  if (!isListening) {
    recognition.start();
    microfoneButton.innerHTML = '<i class="bi bi-mic-mute"></i>';
    isListening = true;
  } else {
    recognition.stop();
    microfoneButton.innerHTML = '<i class="bi bi-mic"></i>';
    isListening = false;
  }
}

window.addEventListener('load', () => {
  let savedToken = localStorage.getItem('apiToken');
  if (savedToken) {
    apiTokenInput.value = savedToken;
  }

  let complemento = localStorage.getItem('complemento');
  if (complemento) {
    complementoInput.value = complemento;
  }

  let modoEscuroLocalStorage = localStorage.getItem('modoEscuro');
  if (modoEscuroLocalStorage === 'true') {
    ativarModoEscuro();
  }

  perguntaInput.focus();
  setupSpeechRecognition(); // Inicializa o reconhecimento de voz
});

function ativarModoEscuro() {
  document.body.classList.add('dark-mode');
  modoEscuroButton.innerHTML = `<i class="bi bi-moon"></i>`;
}

async function enviarPergunta() {
  respostaDiv.innerHTML = '';

  let pergunta = perguntaInput.value.trim();
  const apiToken = apiTokenInput.value;

  if (!apiToken) {
    mostrarErro('Por favor, insira seu token da API.');
    return;
  }

  if (pergunta.trim() === '') {
    perguntaInput.focus();
    return;
  }

  pergunta = complementoInput.value + ' ' + pergunta;
  localStorage.setItem('apiToken', apiToken);
  localStorage.setItem('complemento', complementoInput.value);
  enviarButton.disabled = true;
  enviarButton.textContent = "Carregando...";

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          "contents": [
            {
              "parts": [
                {
                  "text": pergunta
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();
    exibirResposta(pergunta, data.candidates[0].content.parts[0].text);

    // console.log("Limites de uso:");
    // console.log("Total de tokens:", data.usageMetadata.totalTokenCount);
    // console.log("Tokens do prompt:", data.usageMetadata.promptTokenCount);
    // console.log("Tokens das respostas:", data.usageMetadata.candidatesTokenCount);

  } catch (error) {
    console.error(error);
    mostrarErro('Ocorreu um erro ao processar a sua requisição.');
  } finally {
    enviarButton.disabled = false;
    enviarButton.textContent = "Enviar";
    perguntaInput.focus();
  }
}

function exibirResposta(pergunta, resposta) {
  respostaDiv.innerHTML = `
<p><strong>Sua pergunta:</strong> ${pergunta}</p>
<p><strong>Resposta:</strong> ${resposta}</p>
`;
}

function mostrarErro(mensagem) {
  respostaDiv.innerHTML = `<p>${mensagem}</p>`;
  perguntaInput.focus();
}

modoEscuroButton.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  const modoEscuroAtivo = document.body.classList.contains('dark-mode');
  localStorage.setItem('modoEscuro', modoEscuroAtivo.toString());

  modoEscuroButton.innerHTML = modoEscuroAtivo ? `<i class="bi bi-moon"></i>` : `<i class="bi bi-brightness-high"></i>`;
});

limparButton.addEventListener('click', () => {
  perguntaInput.value = '';
  perguntaInput.focus();
});

perguntaInput.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.key === 'Enter') {
    event.preventDefault();
    enviarPergunta();
  }
});

enviarButton.addEventListener('click', enviarPergunta);