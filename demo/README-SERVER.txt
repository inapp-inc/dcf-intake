Child Welfare Intake Demo — PM2 server install
==============================================

Prerequisites: Ubuntu, unzip, Node 20+, python3-venv, nginx (shared host), sudo.

1. Run ./deploy/create-archive.sh (or ./scripts/package-pm2.sh) on your machine.
2. Zip dist/intake-demo-staging/ contents and copy to the server, then:

   sudo mkdir -p /var/www/intake-demo
   sudo unzip -o your-archive.zip -d /var/www/intake-demo
   cd /var/www/intake-demo
   sudo bash start.sh

3. Persist PM2 across reboots (run as the deploy user, not root):

   pm2 save
   pm2 startup
   # run the sudo command printed by pm2 startup

4. Verify:

   pm2 status
   curl -sf http://127.0.0.1:11110/api/v1/health

5. Public URL:

   https://client-demo.inapp.com/intake/

Nginx: deploy adds ONLY /etc/nginx/routes/intake.conf (other routes and
nginx.conf are never modified). Set NGINX_MANAGED=0 to skip auto-install.

Updates (keep database and nginx):

   pm2 delete intake-api intake-worker
   sudo unzip -o your-archive.zip -d /var/www/intake-demo
   cd /var/www/intake-demo
   sudo bash start.sh --no-nginx --no-seed

AI config: edit config/ai.env (HF_API_TOKEN or LLM_PROVIDER=ollama), then:

   pm2 restart all

CRLF / "start.sh: not found" on Linux:
  sed -i 's/\r$//' fix-crlf.sh && bash fix-crlf.sh && bash start.sh
  (deploy-pm2.sh also strips CRLF automatically after unzip)

Windows before packaging:  powershell -File scripts/fix-crlf.ps1

Full runbook: demo/docs/DEPLOY-RUNBOOK.md
