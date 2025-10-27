document.getElementById('configForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const domain = document.getElementById('domain').value.trim();
  const email = document.getElementById('email').value.trim();
  const sshKey = document.getElementById('sshKey').value.trim();

  // Template del cloud-init con Podman Compose
  let cloudInit = `#cloud-config

package_update: true
package_upgrade: true

packages:
  - podman
  - podman-compose
  - curl
  - gnupg
  - ufw
  - python3

`;

  if (sshKey) {
    cloudInit += `ssh_authorized_keys:
  - ${sshKey}

`;
  }

  cloudInit += `runcmd:
  # === Firewall ===
  - ufw allow 22/tcp
  - ufw allow 80/tcp
  - ufw allow 443/tcp
  - ufw --force enable

  # === Setup Podman Compose ===
  - mkdir -p /opt/coolify-traefik/compose/traefik

  # === .env ===
  - |
    cat > /opt/coolify-traefik/.env << 'EOF'
DOMAIN=${domain}
LETSENCRYPT_EMAIL=${email}
EOF

  # === docker-compose.yml (usato da podman-compose) ===
  - |
    cat > /opt/coolify-traefik/compose/docker-compose.yml << 'EOF'
version: '3.8'
services:
  traefik:
    image: docker.io/library/traefik:v2.10
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/podman/podman.sock:/var/run/docker.sock:ro
      - ./traefik/traefik.yml:/traefik.yml:ro
      - ./traefik/middlewares.yml:/middlewares.yml:ro
      - ./acme.json:/acme.json
    environment:
      - LETSENCRYPT_EMAIL=\${LETSENCRYPT_EMAIL}
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.traefik.rule=Host(\`traefik.\${DOMAIN}\`)"
      - "traefik.http.routers.traefik.entrypoints=websecure"
      - "traefik.http.routers.traefik.tls.certresolver=letsencrypt"
      - "traefik.http.routers.traefik.service=api@internal"
      - "traefik.http.routers.traefik.middlewares=secure-headers"

  coolify:
    image: ghcr.io/coollabsio/coolify:latest
    restart: unless-stopped
    volumes:
      - /var/run/podman/podman.sock:/var/run/docker.sock
      - coolify_/app/data
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.coolify.rule=Host(\`\${DOMAIN}\`)"
      - "traefik.http.routers.coolify.entrypoints=websecure"
      - "traefik.http.routers.coolify.tls.certresolver=letsencrypt"
      - "traefik.http.routers.coolify.middlewares=secure-headers"
      - "traefik.http.services.coolify.loadbalancer.server.port=3000"
    depends_on:
      - traefik

volumes:
  coolify_
EOF

  # === traefik.yml ===
  - |
    cat > /opt/coolify-traefik/compose/traefik/traefik.yml << 'EOF'
global:
  checkNewVersion: false
  sendAnonymousUsage: false
entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"
certificatesResolvers:
  letsencrypt:
    acme:
      email: \${LETSENCRYPT_EMAIL}
      storage: /acme.json
      httpChallenge:
        entryPoint: web
api:
  dashboard: true
  insecure: false
providers:
  docker:
    exposedByDefault: false
  file:
    filename: /middlewares.yml
EOF

  # === middlewares.yml ===
  - |
    cat > /opt/coolify-traefik/compose/traefik/middlewares.yml << 'EOF'
http:
  middlewares:
    secure-headers:
      headers:
        sslRedirect: true
        stsSeconds: 31536000
        stsIncludeSubdomains: true
        stsPreload: true
        contentTypeNosniff: true
        browserXssFilter: true
        frameDeny: true
        customFrameOptionsValue: "SAMEORIGIN"
        referrerPolicy: "strict-origin-when-cross-origin"
        permissionsPolicy: "geolocation=(), microphone=(), camera=()"
        customResponseHeaders:
          Server: ""
          X-Powered-By: ""
EOF

  # === acme.json ===
  - touch /opt/coolify-traefik/compose/acme.json
  - chmod 600 /opt/coolify-traefik/compose/acme.json

  # === Avvia con podman-compose ===
  - cd /opt/coolify-traefik/compose && podman-compose up -d
`;

  // Mostra anteprima
  document.getElementById('preview').textContent = cloudInit;
  document.getElementById('output').style.display = 'block';

  // Crea blob e link di download
  const blob = new Blob([cloudInit], { type: 'text/yaml' });
  const url = URL.createObjectURL(blob);
  const link = document.getElementById('downloadLink');
  link.href = url;
  link.download = 'cloud-init.yaml';
});