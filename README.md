# Coolify Cloud-Init Generator (Podman Edition)

Questo è un generatore interattivo **client-side** per creare file `cloud-init` personalizzati. Ti permette di deployare facilmente **Coolify** e **Traefik v2** su un VPS Hetzner, utilizzando **Podman Compose** per un'orchestratazione leggera e moderna.

➡️ **Provalo online**: `https://<tuo-username>.github.io/coolify-cloudinit-generator/`

## ✨ Caratteristiche Principali

*   **Completamente client-side**: Nessun backend, nessun invio di dati. Tutto gira nel tuo browser, garantendo massima privacy e sicurezza.
*   **Output sicuro**: Genera un file `cloud-init.yaml` scaricabile, pronto per essere usato come "User Data" in Hetzner Cloud. Il file non contiene segreti.
*   **Stack leggero**: Utilizza **Podman + Podman Compose** (compatibile con systemd, rootless-ready, e più leggero di Docker).
*   **Coolify e Traefik**: Configura un'installazione pronta all'uso di Coolify e Traefik v2.
*   **HTTPS automatico**: Traefik è preconfigurato con Let's Encrypt per HTTPS automatico.
*   **Middleware di sicurezza**: Include middleware Traefik per rafforzare la sicurezza HTTP.
*   **Compatibilità estesa**: Adatto per sistemi Linux con `cloud-init` (es. Debian 12/13, Ubuntu 22.04+).

## 🚀 Come Usare

1.  **Accedi al generatore**: Apri la pagina GitHub Pages del progetto nel tuo browser.
2.  **Configura i dettagli**:
    *   Inserisci il tuo **dominio** (es. `coolify.tuodominio.duckdns.org`). Questo sarà usato per l'accesso a Coolify e la configurazione di Traefik.
    *   Fornisci un'**email** per Let's Encrypt, necessaria per ottenere certificati SSL/TLS.
    *   *(Opzionale)* Inserisci la tua **chiave SSH pubblica** per un accesso sicuro al server dopo il provisioning.
3.  **Genera il file**: Clicca sul pulsante "Genera cloud-init.yaml".
4.  **Scarica e deploya**: Scarica il file `cloud-init.yaml` generato. Poi, durante la creazione di un nuovo VPS su Hetzner Cloud, incolla il contenuto di questo file nella sezione "User Data".

## 🛠️ Cosa fa il file `cloud-init.yaml` generato

Il file `cloud-init.yaml` automatizza i seguenti passaggi sul tuo server appena avviato:

*   **Aggiornamento e installazione pacchetti**: Aggiorna il sistema e installa `podman`, `podman-compose`, `curl`, `gnupg`, `ufw` e `python3`.
*   **Chiavi SSH (opzionale)**: Se fornita, aggiunge la tua chiave SSH pubblica per un accesso sicuro.
*   **Configurazione Firewall (UFW)**: Abilita il firewall UFW e apre le porte 22 (SSH), 80 (HTTP) e 443 (HTTPS).
*   **Setup Podman Compose**: Crea la struttura di directory necessaria (`/opt/coolify-traefik/compose`).
*   **File `.env`**: Crea un file `.env` con il dominio e l'email forniti.
*   **`docker-compose.yml`**: Genera un file `docker-compose.yml` (utilizzato da `podman-compose`) per orchestrare i servizi Coolify e Traefik.
    *   **Traefik**: Espone le porte 80 e 443, si interfaccia con il socket di Podman, gestisce certificati Let's Encrypt e applica middleware di sicurezza.
    *   **Coolify**: Utilizza l'immagine ufficiale, si connette a Traefik tramite etichette, e persiste i dati.
*   **Configurazione Traefik (`traefik.yml`, `middlewares.yml`)**:
    *   `traefik.yml`: Definisce gli entrypoints HTTP/HTTPS, la redirezione da HTTP a HTTPS e la configurazione di Let's Encrypt.
    *   `middlewares.yml`: Include middleware di sicurezza per aggiungere header HTTP come `Strict-Transport-Security`, `X-Content-Type-Options`, `X-XSS-Protection`, `X-Frame-Options`, `Referrer-Policy` e `Permissions-Policy`.
*   **Permessi `acme.json`**: Crea e imposta i permessi corretti per il file `acme.json` di Traefik, dove vengono memorizzati i certificati Let's Encrypt.
*   **Avvio automatico**: Avvia i servizi Coolify e Traefik utilizzando `podman-compose` in modalità detached (`-d`).

## ⚙️ Dettagli Tecnici

*   **Podman Socket**: Coolify richiede un'interfaccia compatibile con l'API Docker. Su sistemi Linux recenti, Podman espone `/var/run/podman/podman.sock`, che viene montato nei container per consentire a Coolify di interagire con Podman.
*   **`podman-compose`**: Non sempre incluso di default nelle distribuzioni. Il cloud-init tenterà di installarlo tramite il gestore di pacchetti del sistema.
*   **Self-hosted / GitHub Pages**: Il progetto è concepito per essere facilmente pubblicato su GitHub Pages, fungendo da strumento pubblico o self-hosted.

## 📁 Struttura del Repository

```
coolify-cloudinit-generator/
├── README.md
├── docs/
│   ├── index.html       # Interfaccia utente
│   ├── style.css        # Stili della pagina
│   └── generate.js      # Logica di generazione cloud-init
└── templates/
    └── cloud-init-podman.yaml   # (Opzionale, template di riferimento)
```

## 🔐 Sicurezza

*   Il generatore opera interamente nel tuo browser. **Nessun dato inserito viene inviato a server esterni**.
*   Il file `cloud-init.yaml` generato non contiene informazioni sensibili o segreti, ad eccezione del dominio e dell'indirizzo email che sono considerati pubblici per la configurazione dei certificati.

## 🌐 Come Pubblicare (per il self-hosting)

Se desideri ospitare questo generatore tu stesso tramite GitHub Pages:

1.  **Crea un nuovo repository GitHub**: Nominato, ad esempio, `coolify-cloudinit-generator`.
2.  **Abilita GitHub Pages**: Vai nelle impostazioni del tuo repository, nella sezione "Pages". Configura GitHub Pages per pubblicare dal branch `main` (o `master`) e dalla cartella `/docs`.
3.  **Carica i file**: Esegui il push di tutti i file di questo repository nel tuo nuovo repository GitHub.
4.  **Accedi al generatore**: Una volta che GitHub Pages è stato pubblicato (potrebbero volerci alcuni minuti), potrai accedere al tuo generatore all'indirizzo `https://<tuo-username>.github.io/coolify-cloudinit-generator/`.