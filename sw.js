// 1. Define um nome e uma versão para o nosso cache.
//    Mudar a versão fará o Service Worker se atualizar e buscar os arquivos de novo.
const CACHE_NAME = 'buscador-cifras-cache-v1';

// 2. Lista de arquivos essenciais que o nosso site precisa para funcionar offline.
const urlsToCache = [
    './', // A raiz, que geralmente carrega o index.html
    './index.html',
    './app.js',
    './cifras.json' // O arquivo mais importante que queremos no cache!
];

// 3. Evento de Instalação: é disparado quando o Service Worker é registrado pela primeira vez.
self.addEventListener('install', event => {
    // A mágica acontece aqui:
    event.waitUntil(
        caches.open(CACHE_NAME) // Abre o nosso cache pelo nome definido
            .then(cache => {
                console.log('Cache aberto com sucesso!');
                // Adiciona todos os nossos arquivos essenciais ao cache.
                // O addAll faz o download de cada um e armazena.
                return cache.addAll(urlsToCache);
            })
    );
});

// 4. Evento de Fetch: é disparado TODA VEZ que a página tenta buscar algo
//    (um script, uma imagem, um arquivo json, etc.).
self.addEventListener('fetch', event => {
    event.respondWith(
        // Tenta encontrar uma resposta para esta requisição no nosso cache.
        caches.match(event.request)
            .then(response => {
                // Se uma resposta for encontrada no cache...
                if (response) {
                    console.log('Servindo do cache:', event.request.url);
                    return response; // ...retorna ela imediatamente, sem ir para a internet.
                }

                // Se não encontrou no cache, vai para a internet buscar o recurso.
                console.log('Buscando da rede:', event.request.url);
                return fetch(event.request);
            }
        )
    );
});