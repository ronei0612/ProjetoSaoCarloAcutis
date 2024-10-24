const enviarButton = document.getElementById('enviar');
const perguntaInput = document.getElementById('pergunta');
const apiTokenInput = document.getElementById('apiToken');
const respostaDiv = document.getElementById('resposta');
const microfoneButton = document.getElementById('microfone');
const modoEscuroButtonModal = document.getElementById('modoEscuroButtonModal');
const limparButton = document.getElementById('limpar');
const complementoInput = document.getElementById('complemento');
const salvarConfiguracoesButton = document.getElementById('salvarConfiguracoes');

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
  }

  const modoEscuroLocalStorage = localStorage.getItem('modoEscuro');
  if (modoEscuroLocalStorage === 'true') {
    ativarModoEscuro();
  }

  perguntaInput.focus();
  setupSpeechRecognition(); 

  modoEscuroButtonModal.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    modoEscuroButtonModal.innerHTML = document.body.classList.contains('dark-mode') ?
      `<i class="bi bi-moon"></i>` : `<i class="bi bi-brightness-high"></i>`;

    $('#modalConfiguracoes .modal-content').toggleClass('dark-mode');
  });
});

function ativarModoEscuro() {
  document.body.classList.add('dark-mode');
  modoEscuroButtonModal.innerHTML = `<i class="bi bi-moon"></i>`;

  $('#modalConfiguracoes .modal-content').addClass('dark-mode');
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
  enviarButton.disabled = true;
  enviarButton.textContent = "Carregando...";

  const imagemPreviewContainer = document.getElementById('imagemPreviewContainer');
  const imageElements = imagemPreviewContainer.querySelectorAll('img');

  if (imageElements.length == 0) {
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
  
    } catch (error) {
      console.error(error);
      mostrarErro('Ocorreu um erro ao processar a sua requisição.');
    } finally {
      enviarButton.disabled = false;
      enviarButton.textContent = "Enviar";
      perguntaInput.focus();
    }
  }

  else {
    const img = imageElements[0];
    const file = img.src.startsWith("data:image/") ? getDataURLtoFile(img.src) : null;

    if (!file) {
      mostrarErro('Erro ao processar a imagem.');
      return;
    }

    const fileName = 'uploaded_image.png';
    const urlUpload = `https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=multipart&key=${apiToken}`;
    const metadata = { file: { displayName: fileName } };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', file);

    try {
      const uploadResponse = await fetch(urlUpload, {
        method: 'POST',
        body: formData
      });

      const uploadData = await uploadResponse.json();
      const fileUri = uploadData.file.uri;
      const fileId = uploadData.file.name;

      const mimeType = "image/jpeg";
      //const model = "models/gemini-1.5-pro-gf-fc";
      const model = "models/gemini-1.5-flash-latest";
      const baseUrl = `https://generativelanguage.googleapis.com/v1beta/${model}`;
      const payload = {
        contents: [{ parts: [{ text: pergunta }, { fileData: { fileUri, mimeType } }] }]
      };

      const response = await fetch(`${baseUrl}:generateContent?key=${apiToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      exibirResposta(pergunta, data.candidates[0].content.parts[0].text);

      const urlDelete = `https://generativelanguage.googleapis.com/v1beta/${fileId}?key=${apiToken}`;

      await fetch(urlDelete, {
        method: 'DELETE'
      });

    } catch (error) {
      console.error('Erro ao processar a requisição:', error);
      alert('Erro ao processar a requisição: ' + error);
    } finally {
      enviarButton.disabled = false;
      enviarButton.textContent = "Enviar";
      perguntaInput.focus();
    }
  }
}

// function getDataURLtoFile(dataurl) {
//   const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
//         bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
//   while (n--) {
//       u8arr[n] = bstr.charCodeAt(n);
//   }
//   return new Blob([u8arr], { type: mime });
// }

function getDataURLtoFile(dataURL) {
  // Remove o 'data:image/jpeg;base64,' do início da string
  const base64Image = dataURL.replace(/^data:image\/[a-zA-Z0-9\-\+]+;base64,/, "");

  const byteString = atob(base64Image);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);

  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }

  const blob = new Blob([uint8Array], { type: 'image/jpeg' }); // Ajusta para o tipo apropriado
  return blob;
}

function exibirResposta(pergunta, resposta) {
  const html = marked.parse(resposta);
  respostaDiv.innerHTML = html;
}

function mostrarErro(mensagem) {
  respostaDiv.innerHTML = `<p>${mensagem}</p>`;
  perguntaInput.focus();
}

function salvarConfiguracoes() {
  const apiToken = apiTokenInput.value;
  const complemento = complementoInput.value;

  localStorage.setItem('apiToken', apiToken);
  localStorage.setItem('complemento', complemento);

  $('#modalConfiguracoes').modal('hide');
}

limparButton.addEventListener('click', () => {
  perguntaInput.value = '';
  perguntaInput.focus();
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
salvarConfiguracoesButton.addEventListener('click', salvarConfiguracoes);