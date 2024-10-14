const enviarButton = document.getElementById('enviar');
const perguntaInput = document.getElementById('pergunta');
const apiTokenInput = document.getElementById('apiToken');
const respostaHtmlDiv = document.getElementById('respostaHtml');
const microfoneButton = document.getElementById('microfone');
const limparButton = document.getElementById('limpar');
const complementoInput = document.getElementById('complemento');
const btnConfiguracao = document.getElementById('btnConfiguracao');
const salvarConfiguracaoButton = document.getElementById('salvarConfiguracao');
const desfazerButton = document.getElementById('desfazer');
const refazerButton = document.getElementById('refazer');
const colarButton = document.getElementById('colar');

let recognition = null;
let isListening = false;

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
    };

    recognition.onstart = () => {
      microfoneButton.innerHTML = '<i class="bi bi-mic-mute"></i>';
      isListening = true;
    };

    recognition.onend = () => {
      microfoneButton.innerHTML = '<i class="bi bi-mic"></i>';
      isListening = false;
    };

    microfoneButton.addEventListener('click', toggleSpeechRecognition);
  } else {
    alert('Seu navegador não suporta reconhecimento de fala.');
  }
}

function toggleSpeechRecognition() {
  if (!isListening) {
    recognition.start();
  } else {
    recognition.stop();
  }
}

window.addEventListener('load', () => {
  loadSavedData();
  setupSpeechRecognition();
  perguntaInput.focus();

  const altura = window.innerHeight;
  respostaHtmlDiv.style.height = altura + 'px';
});

function loadSavedData() {
  let savedToken = localStorage.getItem('apiToken');
  if (savedToken) {
    apiTokenInput.value = savedToken;
  }

  let complemento = localStorage.getItem('complemento');
  if (complemento) {
    complementoInput.value = complemento;
  } else {
    complemento = "Não explique, quero somente o código em uma página única";
    complementoInput.value = complemento;
    localStorage.setItem('complemento', complemento);
  }

  let respostaHtml = localStorage.getItem('respostaHtml');
  if (respostaHtml) {
    respostaHtmlDiv.srcdoc = respostaHtml;
  }

  let respostaHtmlDesfazer = localStorage.getItem('respostaHtmlDesfazer');
  if (respostaHtmlDesfazer) {
    desfazerButton.disabled = false;
  }
}

async function enviarPergunta() {
  const pergunta = perguntaInput.value.trim();
  const apiToken = apiTokenInput.value;

  if (!apiToken) {
    mostrarErro('Por favor, insira seu token da API.');
    return;
  }

  if (pergunta.trim() === '') {
    perguntaInput.focus();
    return;
  }

  const htmlCodeIframe = respostaHtmlDiv.srcdoc;
  const perguntaCompleta = complementoInput.value + ' ' + pergunta + ' ' + htmlCodeIframe;
  
  //localStorage.setItem('apiToken', apiToken);
  //localStorage.setItem('complemento', complementoInput.value);
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
                  "text": perguntaCompleta
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();
    let resposta = data.candidates[0].content.parts[0].text;
    const htmlAnterior = localStorage.getItem('respostaHtml');

    if (resposta.indexOf("```html") !== -1) {
      const inicioHtml = resposta.indexOf("```html") + 7; 
      const fimHtml = resposta.indexOf("```", inicioHtml);
      resposta = resposta.substring(inicioHtml, fimHtml);
    }

    respostaHtmlDiv.srcdoc = resposta;
    localStorage.setItem('respostaHtml', resposta);
    localStorage.setItem('respostaHtmlDesfazer', htmlAnterior);
    desfazerButton.disabled = false;
    refazerButton.disabled = false;

  } catch (error) {
    console.error(error);
    mostrarErro('Ocorreu um erro ao processar a sua requisição.');
  } finally {
    enviarButton.disabled = false;
    enviarButton.textContent = "Enviar";
    perguntaInput.focus();
  }
}

function mostrarErro(mensagem) {
  respostaHtmlDiv.srcdoc = `<p>${mensagem}</p>`;
  perguntaInput.focus();
}

limparButton.addEventListener('click', () => {
  perguntaInput.value = '';
  perguntaInput.focus();
});

salvarConfiguracaoButton.addEventListener('click', () => {
  const apiToken = apiTokenInput.value;
  const complemento = complementoInput.value;

  localStorage.setItem('apiToken', apiToken);
  localStorage.setItem('complemento', complemento);

  $('#modalConfiguracao').modal('hide');
});

desfazerButton.addEventListener('click', () => {
  const htmlAnterior = localStorage.getItem('respostaHtmlDesfazer');
  if (htmlAnterior) {
    respostaHtmlDiv.srcdoc = htmlAnterior;
    const htmlAtual = localStorage.getItem('respostaHtml');
    localStorage.setItem('respostaHtmlRefazer', htmlAtual);
    localStorage.setItem('respostaHtml', htmlAnterior);
    desfazerButton.disabled = true;
    refazerButton.disabled = false;
  }
});

refazerButton.addEventListener('click', () => {
  const htmlRefazer = localStorage.getItem('respostaHtmlRefazer');
  if (htmlRefazer) {
    respostaHtmlDiv.srcdoc = htmlRefazer;
    const htmlAtual = localStorage.getItem('respostaHtml');
    localStorage.setItem('respostaHtmlDesfazer', htmlAtual);
    localStorage.setItem('respostaHtml', htmlRefazer);
    refazerButton.disabled = true;
    desfazerButton.disabled = false;
  }
});

document.getElementById('restaurar').addEventListener('click', () => {
  if (confirm('Tem certeza de que deseja restaurar as configurações padrão?')) {
    localStorage.clear();
    respostaHtmlDiv.srcdoc = '';
    perguntaInput.value = '';
    complementoInput.value = "Não explique, quero somente o código em uma página única";
    const apiToken = apiTokenInput.value;
    localStorage.setItem('apiToken', apiToken);
    loadSavedData();
    window.location.reload();
  }
});

perguntaInput.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.key === 'Enter') {
    event.preventDefault();
    enviarPergunta();
  } else if (event.ctrlKey && event.key === 'm') {
    event.preventDefault();
    microfoneButton.click();
  } else if (event.ctrlKey && event.key === 'd') {
    event.preventDefault();
    limparButton.click();
  }
});

enviarButton.addEventListener('click', enviarPergunta);

colarButton.addEventListener('click', () => {
  navigator.clipboard.readText()
  .then(text => {
    perguntaInput.value += text;
    perguntaInput.focus();
  })
  .catch(err => {
    console.error('Falha ao colar:', err);
  });
});