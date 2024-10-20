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
const githubTokenInput = document.getElementById('githubToken');
const githubFileInput = document.getElementById('githubFileUrl');
const githubBranchInput = document.getElementById('githubBranch');

let recognition = null;
let isListening = false;

function showSpinner(element) {
  element.classList.add('disabled');
  element.textContent = '';

  const spinner = document.createElement('span');
  spinner.classList.add('spinner-border', 'spinner-border-sm', 'mr-2');
  spinner.setAttribute('role', 'status');
  
  const spinnerText = document.createElement('span');
  spinnerText.classList.add('sr-only');
  spinnerText.textContent = 'Carregando...';

  spinner.appendChild(spinnerText); 

  element.appendChild(spinner);
}

function hideSpinner(element, text) {
  element.classList.remove('disabled');
  element.innerHTML = text;

  const spinner = element.querySelector('.spinner-border');
  if (spinner) {
    element.removeChild(spinner);
  }
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
  fetch('https://apinode-h4wt.onrender.com/');
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

  let githubToken = localStorage.getItem('githubToken');
  if (githubToken) {
    githubTokenInput.value = githubToken;
  }

  let githubFile = localStorage.getItem('githubFile');
  if (githubFile) {
    githubFileInput.value = githubFile;
  }

  let githubBranch = localStorage.getItem('githubBranch');
  if (githubBranch) {
    githubBranchInput.value = githubBranch;
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
    showSpinner(enviarButton);
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

    const htmlAnterior = localStorage.getItem('respostaHtml');

    const data = await response.json();
    let resposta = data.candidates[0].content.parts[0].text;

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
    hideSpinner(enviarButton, 'Gerar');
  }
}

function mostrarErro(mensagem) {
  //respostaHtmlDiv.srcdoc = `<p>${mensagem}</p>`;
  alert(mensagem);
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

  const githubToken = githubTokenInput.value;
  const githubFile = githubFileInput.value;
  const githubBranch = githubBranchInput.value;

  localStorage.setItem('githubToken', githubToken);
  localStorage.setItem('githubFile', githubFile);
  localStorage.setItem('githubBranch', githubBranch);

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
  gerarLinkImagem();
  // navigator.clipboard.readText()
  // .then(text => {
  //   perguntaInput.value += text;
  //   perguntaInput.focus();
  // })
  // .catch(err => {
  //   console.error('Falha ao colar:', err);
  // });
});
                
// function gerarImagem() {
//     var imgs = document.getElementById('respostaHtml').getElementsByTagName('img');

//     for (var i = 0; i < imgs.length; i++) {
//         if (imgs[i].src.startsWith("https://photos.") || imgs[i].src.startsWith("https://www.bing.com/images/create")) {
//             (function(img) {
//                 fetch('https://apinode-h4wt.onrender.com/fetch-url', {
//                     method: 'POST',
//                     headers: {
//                         'Content-Type': 'application/json'
//                     },
//                     body: JSON.stringify({ url: img.src })
//                 })
//                 .then(response => response.text())
//                 .then(data => {
//                     img.src = data;
//                 })
//                 .catch(error => alert('Erro ao buscar a nova URL:' + error));
//             })(imgs[i]);
//         }
//     }
// }

async function readClipboardFromDevTools() { 
    try { 
        const value = await navigator.clipboard.readText(); 
        return value; 
    } catch (error) { 
        console.error("Error reading clipboard:", error); 
        throw error; 
    } 
} 

// async function colarDoClipboard() { 
//     try { 
//         const texto = await readClipboardFromDevTools(); 
//         document.getElementById('texto').value = texto;
//         gerarImagem();
//     } catch (error) { 
//         console.error("Erro ao colar:", error); 
//         alert("Não foi possível colar o conteúdo do clipboard."); 
//     } 
// }

async function gerarLinkImagem() {
    try {
      showSpinner(colarButton);
        let texto = await readClipboardFromDevTools();

        if (texto.startsWith("https://photos.") || texto.startsWith("https://www.bing.com/images/create")) {
            const response = await fetch('https://apinode-h4wt.onrender.com/fetch-url', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: texto })
            });
            texto = await response.text();
            //await navigator.clipboard.writeText(data);
        }
        
        perguntaInput.value = perguntaInput.value + ' ' + texto + ' ';

    } catch (error) {
        console.error("Erro ao gerar o link da imagem:", error);
        alert("Erro ao gerar o link da imagem: " + error);
    } finally {
      hideSpinner(colarButton, '<i class="bi bi-clipboard"></i>');
    }
}

document.getElementById('commit').addEventListener('click', async () => {
  const githubToken = githubTokenInput.value;
  const githubFile = githubFileInput.value;
  const githubBranch = githubBranchInput.value;
  const githubMessage = 'Update arquivo via url Gerar HTML';

  if (!githubToken || !githubFile || !githubBranch) {
    mostrarErro('Por favor, preencha todos os campos de configuração do GitHub.');
    return;
  }

  const htmlContent = respostaHtmlDiv.srcdoc;
  try {
    showSpinner(document.getElementById('commit'));

    const currentShaResponse = await fetch(githubFile, {// + `?ref=${githubBranch}`, {
       headers: { 'Authorization': `token ${githubToken}` }
    });

    const currentSha = currentShaResponse.ok ? (await currentShaResponse.json()).sha : '';

    const response = await fetch(githubFile, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "message": githubMessage,
        "branch": githubBranch,
        "content": btoa(htmlContent),
        "sha": currentSha
      })
    });

    if (response.ok) {
      console.log('Commit realizado com sucesso!');
      mostrarErro('Commit realizado com sucesso!');
    } else {
      console.error('Erro ao realizar o commit:', response.status);
      mostrarErro('Erro ao realizar o commit. Verifique as configurações do GitHub.');
    }
  } catch (error) {
    console.error('Erro ao realizar o commit:', error);
    mostrarErro('Erro ao realizar o commit. Verifique as configurações do GitHub.');
  } finally {
    hideSpinner(document.getElementById('commit'), 'Commit');
  }
});
