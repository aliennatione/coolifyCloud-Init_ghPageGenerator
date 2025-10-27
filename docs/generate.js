document.getElementById('configForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const domain = document.getElementById('domain').value.trim();
  const email = document.getElementById('email').value.trim();
  const sshKey = document.getElementById('sshKey').value.trim();

  // Escape per contenuti YAML: sostituisce caratteri problematici (raro, ma sicuro)
  const escapeYamlString = (str) => str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  // Contenuti dei file
  const envContent = `DOMAIN=${domain}\nLETSENCRYPT_EMAIL=${email}`;
  const middlewaresContent = `http:
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
          X-Powered-By: ""`;

  const traefikConfig = `global:
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
      email: ${email}
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
    filename: /middlewares.yml`;

  const composeContent = `version: '3.8'
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
      - LETSENCRYPT_EMAIL=${email}
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.traefik.rule=Host(\`traefik.${domain}\`)"
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
      - "traefik.http.routers.coolify.rule=Host(\`${domain}\`)"
      - "traefik.http.routers.coolify.entrypoints=websecure"
      - "traefik.http.routers.coolify.tls.certresolver=letsencrypt"
      - "traefik.http.routers.coolify.middlewares=secure-headers"
      - "traefik.http.services.coolify.loadbalancer.server.port=3000"
    depends_on:
      - traefik

volumes:
  coolify_`;

  // Costruisci cloud-init con write_files
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
    cloudInit += `\nssh_authorized_keys:\n  - ${sshKey}\n`;
  }

  cloudInit += `\nwrite_files:
  - path: /opt/coolify-traefik/.env
    content: |
${envContent.split('\n').map(line => '      ' + line).join('\n')}
    permissions: '0644'

  - path: /opt/coolify-traefik/compose/docker-compose.yml
    content: |
${composeContent.split('\n').map(line => '      ' + line).join('\n')}
    permissions: '0644'

  - path: /opt/coolify-traefik/compose/traefik/traefik.yml
    content: |
${traefikConfig.split('\n').map(line => '      ' + line).join('\n')}
    permissions: '0644'

  - path: /opt/coolify-traefik/compose/traefik/middlewares.yml
    content: |
${middlewaresContent.split('\n').map(line => '      ' + line).join('\n')}
    permissions: '0644'

runcmd:
  - mkdir -p /opt/coolify-traefik/compose/traefik
  - touch /opt/coolify-traefik/compose/acme.json
  - chmod 600 /opt/coolify-traefik/compose/acme.json
  - ufw allow 22/tcp
  - ufw allow 80/tcp
  - ufw allow 443/tcp
  - ufw --force enable
  - cd /opt/coolify-traefik/compose && podman-compose up -d
`;

  // Mostra anteprima
  document.getElementById('preview').textContent = cloudInit;
  document.getElementById('output').style.display = 'block';

  // Crea blob e link di download
  const blob = new Blob([cloudInit], { type: 'text/yaml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.getElementById('downloadLink');
  link.href = url;
  link.download = 'cloud-init.yaml';
});
