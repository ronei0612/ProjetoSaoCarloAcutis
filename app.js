const barraPesquisa = document.getElementById('barra-pesquisa');
const botaoBuscar = document.getElementById('botao-buscar');
const listaResultados = document.getElementById('resultados');
let todasAsCifras = [];

fetch('cifras.json')
    .then(response => response.json())
    .then(data => {
        todasAsCifras = data;
        barraPesquisa.disabled = false;
        botaoBuscar.disabled = false;
        barraPesquisa.placeholder = "Digite o nome da música, artista ou trecho...";
    })
    .catch(error => {
        console.error('Erro ao carregar o arquivo de cifras:', error);
        barraPesquisa.placeholder = "Erro ao carregar dados.";
    });

botaoBuscar.addEventListener('click', realizarBusca);
barraPesquisa.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        realizarBusca();
    }
});

function realizarBusca() { /* ...função sem alteração... */
    const termoBusca = barraPesquisa.value.toLowerCase().trim();
    if (termoBusca.length === 0) return;
    const cifrasFiltradas = todasAsCifras.filter(cifra => 
        cifra.titulo.toLowerCase().includes(termoBusca) ||
        cifra.artista.toLowerCase().includes(termoBusca) ||
        cifra.cifra.toLowerCase().includes(termoBusca)
    );
    exibirResultados(cifrasFiltradas);
}

function exibirResultados(cifras) { /* ...função sem alteração... */
    listaResultados.innerHTML = '';
    if (cifras.length === 0) {
        listaResultados.innerHTML = '<li>Nenhuma cifra encontrada.</li>';
        return;
    }
    cifras.forEach(cifra => {
        const itemLista = document.createElement('li');
        itemLista.innerHTML = `<strong>${cifra.titulo}</strong><br><small>${cifra.artista}</small>`;
        itemLista.addEventListener('click', () => {
            alert(`Cifra: ${cifra.titulo} - ${cifra.artista}\n\n${cifra.cifra}`);
        });
        listaResultados.appendChild(itemLista);
    });
}


// --- INÍCIO DA PARTE NOVA ---

// 5. Registra o Service Worker
//    Verifica se o navegador do usuário suporta Service Workers.
if ('serviceWorker' in navigator) {
    // Espera a página carregar completamente para não atrapalhar o carregamento inicial.
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js') // Informa o caminho do nosso arquivo sw.js
            .then(registration => {
                console.log('Service Worker registrado com sucesso:', registration);
            })
            .catch(registrationError => {
                console.log('Falha ao registrar o Service Worker:', registrationError);
            });
    });
}