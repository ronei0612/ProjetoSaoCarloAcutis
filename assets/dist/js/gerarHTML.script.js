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

let recognition = null;
let isListening = false;
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

      clearTimeout(listeningTimer);
      listeningTimer = setTimeout(() => {
        recognition.stop();
        setTimeout(() => {
          if (microfoneButton.innerHTML.includes('bi-mic-mute')) {
            recognition.start();
          }
        }, 500);
      }, 5000);
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
  } else {
    complemento = "Não explique, quero somente o código em uma página única";
    complementoInput.value = complemento;
    localStorage.setItem('complemento', complemento);
  }

  let respostaHtml = localStorage.getItem('respostaHtml');
  if (respostaHtml) {
    respostaHtmlDiv.srcdoc = respostaHtml;
  }

  const altura = window.innerHeight;
  respostaHtmlDiv.style.height = altura + 'px';

  perguntaInput.focus();
  setupSpeechRecognition(); 
});

async function enviarPergunta() {
  respostaHtmlDiv.srcdoc = ''; 
  
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

  //pergunta = complementoInput.value + ' ' + pergunta;
  const htmlCodeIframe = respostaHtmlDiv.contentWindow.document.body.innerHTML;
  // if (htmlCodeIframe.indexOf("```html") !== -1) {
  //   const inicioHtml = htmlCodeIframe.indexOf("```html") + 7; 
  //   const fimHtml = htmlCodeIframe.indexOf("```", inicioHtml);
  //   htmlCodeIframe = htmlCodeIframe.substring(inicioHtml, fimHtml);
  // }

  pergunta = complementoInput.value + ' ' + pergunta + ' ' + htmlCodeIframe;
  
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
    const resposta = data.candidates[0].content.parts[0].text;

    if (resposta.indexOf("```html") !== -1) {
      // Extraia o código HTML da resposta
      const inicioHtml = resposta.indexOf("```html") + 7; 
      const fimHtml = resposta.indexOf("```", inicioHtml);
      const htmlCode = resposta.substring(inicioHtml, fimHtml);
      const htmlAnterior = localStorage.getItem('respostaHtml');

      respostaHtmlDiv.srcdoc = htmlCode;
      localStorage.setItem('respostaHtml', htmlCode);
      localStorage.setItem('respostaHtmlAnterior', htmlAnterior);
    } else {
      respostaHtmlDiv.srcdoc = resposta;
    }

    desfazerButton.disabled = false;

  } catch (error) {
    console.error(error);
    mostrarErro('Ocorreu um erro ao processar a sua requisição.');
  } finally {
    enviarButton.disabled = false;
    enviarButton.textContent = "Enviar";
    perguntaInput.focus();

    respostaHtmlDiv.scrollIntoView({ behavior: 'smooth' });
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

desfazerButton.addEventListener('click', () => {
  let antigoHtml = localStorage.getItem('respostaHtmlAnterior');
  if (antigoHtml) {
    respostaHtmlDiv.srcdoc = antigoHtml;
    localStorage.setItem('respostaHtml', antigoHtml);
    desfazerButton.disabled = true;
  }
});

document.getElementById('restaurar').addEventListener('click', () => {
  if (confirm('Tem certeza de que deseja restaurar as configurações padrão?')) {
    localStorage.clear();
    respostaHtmlDiv.srcdoc = '';
    perguntaInput.value = '';
    complementoInput.value = "Não explique, quero somente o código em uma página única";
    
    const apiToken = apiTokenInput.value;
    const complemento = complementoInput.value;
    localStorage.setItem('apiToken', apiToken);
    localStorage.setItem('complemento', complemento);

    window.location.reload();
  }
});