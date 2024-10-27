const enviarButton = document.getElementById('enviar');
const perguntaInput = document.getElementById('pergunta');
const apiTokenInput = document.getElementById('apiToken');
const respostaDiv = document.getElementById('resposta');
const microfoneButton = document.getElementById('microfone');
const modoEscuroButtonModal = document.getElementById('modoEscuroButtonModal');
const limparButton = document.getElementById('limpar');
const complementoSelect = document.getElementById('complemento');
const adicionarComplementoButton = document.getElementById('adicionarComplemento');
const removerComplementoButton = document.getElementById('removerComplemento');
const salvarConfiguracoesButton = document.getElementById('salvarConfiguracoes');
const imagemPreviewContainer = document.getElementById('imagemPreviewContainer');
const modelSelect = document.getElementById('modeloAIStudio');
const fileInfo = document.getElementById('fileInfo');
const removeFile = document.getElementById('removeFile');
const fileSelector = document.getElementById('fileSelector');
const baseUrl = 'https://generativelanguage.googleapis.com';
const version = 'v1beta';
let model = "models/gemini-1.5-flash-latest";

let recognition = null;
let isListening = false;
let listeningTimer = null;

adicionarComplementoButton.addEventListener('click', () => {
  let novoComplemento = prompt("Digite o novo complemento:", "");
  if (novoComplemento !== null) {
    novoComplemento = novoComplemento.trim();
    if (novoComplemento && !complementoSelect.querySelector(`option[value="${novoComplemento}"]`)) {
      adicionarOpcaoAoSelect(novoComplemento);
      salvarComplementos();
    }
  }
});

function carregarComplementos() {
  let complementos = localStorage.getItem('complementos');
  if (complementos) {
    complementos = JSON.parse(complementos);
    complementos.forEach(complemento => {
      adicionarOpcaoAoSelect(complemento);
    });
  }
}

removerComplementoButton.addEventListener('click', () => {
  const index = complementoSelect.selectedIndex;
  if (index > -1) {
    complementoSelect.remove(index);
    salvarComplementos();
  }
});

complementoSelect.addEventListener('input', () => {
  const novoComplemento = complementoSelect.value.trim();
  if (novoComplemento && !complementoSelect.querySelector(`option[value="${novoComplemento}"]`)) {
    adicionarOpcaoAoSelect(novoComplemento);
    salvarComplementos();
  }
});

function adicionarOpcaoAoSelect(complemento) {
  const option = document.createElement('option');
  option.value = complemento;
  option.text = complemento;
  complementoSelect.add(option);
}

function salvarComplementos() {
  const complementos = [];
  for (let i = 0; i < complementoSelect.options.length; i++) {
    complementos.push(complementoSelect.options[i].value);
  }
  localStorage.setItem('complementos', JSON.stringify(complementos));
}

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
  let savedToken = localStorage.getItem('aiStudio_apiToken');
  const urlParams = new URLSearchParams(window.location.search);
  const aistudioToken = urlParams.get('aistudiotoken');

  // Verifica se o token existe no localStorage ou na URL
  if (!savedToken && !aistudioToken) {
    savedToken = prompt("Por favor, insira seu token da API:", "");
    if (savedToken) {
      localStorage.setItem('aiStudio_apiToken', savedToken);
    } else {
      alert("Token da API não fornecido. O aplicativo pode não funcionar corretamente.");
    }
  }

  if (savedToken) {
    apiTokenInput.value = savedToken;
  }

  const modoEscuroLocalStorage = localStorage.getItem('modoEscuro');
  if (modoEscuroLocalStorage === 'true') {
    ativarModoEscuro();
  }

  const modelLocalStorage = localStorage.getItem('aiStudio_model');
  if (modelLocalStorage) {
    model = modelLocalStorage;
  }

  perguntaInput.focus();
  setupSpeechRecognition(); 

  modoEscuroButtonModal.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    modoEscuroButtonModal.innerHTML = document.body.classList.contains('dark-mode') ?
      `<i class="bi bi-moon"></i>` : `<i class="bi bi-brightness-high"></i>`;

    $('#modalConfiguracoes .modal-content').toggleClass('dark-mode');
    
    const modoEscuroAtivo = document.body.classList.contains('dark-mode');
    localStorage.setItem('modoEscuro', modoEscuroAtivo);
  });

  carregarComplementos();
  modelList();
});

function ativarModoEscuro() {
  document.body.classList.add('dark-mode');
  modoEscuroButtonModal.innerHTML = `<i class="bi bi-moon"></i>`;

  $('#modalConfiguracoes .modal-content').addClass('dark-mode');
}

async function enviarPergunta(perguntaElem) {
  let pergunta = perguntaElem.value;
  const apiToken = apiTokenInput.value;

  if (!apiToken) {
    mostrarErro('Por favor, insira seu token da API.');
    return;
  }

  if (pergunta.trim() === '' && 
      imagemPreviewContainer.querySelectorAll('img').length === 0 && 
      fileSelector.files.length === 0) {
    perguntaElem.focus();
    return;
  }

  pergunta = complementoSelect.value + ' ' + pergunta;
  respostaDiv.innerHTML = '';
  enviarButton.disabled = true;
  enviarButton.textContent = "Carregando...";

  try {
    const resposta = await processarPergunta(pergunta, apiToken);
    exibirResposta(pergunta, resposta);
  } catch (error) {
    console.error('Erro ao processar a requisição:', error);
    alert('Erro ao processar a requisição: ' + error);
  } finally {
    enviarButton.disabled = false;
    enviarButton.textContent = "Enviar";
    perguntaElem.focus();
  }
}

async function enviarArquivo(apiToken, file) {
  const fileName = file.name;
  const urlUpload = `${baseUrl}/upload/${version}/files?uploadType=multipart&key=${apiToken}`;
  const metadata = { file: { displayName: fileName } };

  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  formData.append('file', file);

  const uploadResponse = await fetch(urlUpload, {
    method: 'POST',
    body: formData
  });

  const uploadData = await uploadResponse.json();
  const fileUri = uploadData.file.uri;

  const mimeType = "text/plain";
  return { fileData: { fileUri, mimeType } };
}

async function enviarPayload(payload, apiToken) {
  const response = await fetch(
    `${baseUrl}/${version}/${model}:generateContent?key=${apiToken}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );

  const data = await response.json();
  if (data.error)
    return data.error.message;

  return data.candidates[0].content.parts[0].text;
}

async function enviarImagem(apiToken, img) {
  const file = img.src.startsWith("data:image/") ? getDataURLtoFile(img.src) : null;

  if (!file) {
    mostrarErro('Erro ao processar a imagem.');
    return;
  }

  const fileName = 'uploaded_image.png';
  const urlUpload = `${baseUrl}/upload/${version}/files?uploadType=multipart&key=${apiToken}`;
  const metadata = { file: { displayName: fileName } };

  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  formData.append('file', file);

  const uploadResponse = await fetch(urlUpload, {
    method: 'POST',
    body: formData
  });

  const uploadData = await uploadResponse.json();
  const fileUri = uploadData.file.uri;

  const mimeType = "image/jpeg";
  return { fileData: { fileUri, mimeType } };
}

async function processarPergunta(pergunta, apiToken) {
  const file = fileSelector.files[0];
  const img = imagemPreviewContainer.querySelector('img');

  let payload = {
    "contents": [
      {
        "parts": [
          {
            "text": pergunta
          }
        ]
      }
    ]
  };

  if (file) {
    payload.contents[0].parts.push(await enviarArquivo(apiToken, file));
  }

  if (img) {
    payload.contents[0].parts.push(await enviarImagem(apiToken, img));
  }

  return await enviarPayload(payload, apiToken);
}

async function enviarTexto(pergunta, apiToken) {
  const response = await fetch(
    `${baseUrl}/${version}/${model}:generateContent?key=${apiToken}`,
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
  if (data.error)
    return data.error.message;

  return data.candidates[0].content.parts[0].text;
}

function getDataURLtoFile(dataURL) {
  const base64Image = dataURL.replace(/^data:image\/[a-zA-Z0-9\-\+]+;base64,/, "");

  const byteString = atob(base64Image);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);

  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }

  const blob = new Blob([uint8Array], { type: 'image/jpeg' });
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
  //const complemento = complementoInput.value;

  localStorage.setItem('aiStudio_apiToken', apiToken);
  localStorage.setItem('aiStudio_model', model);

  $('#modalConfiguracoes').modal('hide');
}

limparButton.addEventListener('click', () => {
  perguntaInput.value = '';
  perguntaInput.focus();
});

perguntaInput.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.key === 'Enter') {
    event.preventDefault();
    enviarPergunta(perguntaInput);
  } else if (event.ctrlKey && event.key === 'm') {
    event.preventDefault();
    microfoneButton.click();
  } else if (event.ctrlKey && event.key === 'd') {
    event.preventDefault();
    limparButton.click();
  }
});

perguntaInput.addEventListener('paste', (e) => {
  const items = (e.originalEvent || e).clipboardData.items;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      const reader = new FileReader();

      reader.onload = function(event) {
        const img = document.createElement('img');
        img.src = event.target.result;
        img.alt = `Imagem ${i + 1}`;
        img.classList.add('image-preview');

        const closeButton = document.createElement('span');
        closeButton.classList.add('close-image', 'btn', 'btn-dark', 'btn-sm');
        closeButton.innerHTML = '×';
        closeButton.addEventListener('click', () => {
          img.remove();
          perguntaInput.focus();
        });

        imagemPreviewContainer.innerHTML = "";
        imagemPreviewContainer.appendChild(img);

        img.parentNode.appendChild(closeButton);
        imagemPreviewContainer.appendChild(img);
      };

      reader.readAsDataURL(file);
    }
  }
});

async function modelList() {
  const apiKey = document.getElementById('apiToken').value.trim();

  if (!apiKey) {
    console.error('API token não fornecido.');
    return;
  }

  try {
    const response = await fetch(`${baseUrl}/${version}/models?key=${apiKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.models && data.models.length > 0) {
      modelSelect.innerHTML = '';
      data.models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.name;
        option.textContent = model.displayName;
        option.dataset.description = model.description;
        modelSelect.appendChild(option);
      });
      modelSelect.value = model;
    } else {
      console.log('Nenhum modelo encontrado.');
    }

  } catch (error) {
    console.error('Erro ao buscar a lista de modelos:', error);
  }
}

modelSelect.addEventListener('change', async function() {
  const selectedOption = modelSelect.options[modelSelect.selectedIndex];
  if (selectedOption.dataset.description) {
    const resposta = await enviarTexto('Traduza para pt-br: ' + selectedOption.dataset.description, apiTokenInput.value);
    alert(resposta);
  }
  model = modelSelect.value;
});

enviarButton.addEventListener('click', function() {
  enviarPergunta(perguntaInput);
});

fileSelector.addEventListener('change', function() {
  fileInfo.innerText = this.files[0].name;
  removeFile.style.display = '';
  perguntaInput.focus();
});

removeFile.addEventListener('click', function() {
  this.style.display = 'none';
  fileInfo.innerText = '';
  fileSelector.value = '';
  perguntaInput.focus();
})

salvarConfiguracoesButton.addEventListener('click', salvarConfiguracoes);
