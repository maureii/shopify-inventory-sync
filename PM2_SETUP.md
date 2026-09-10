npm install -g pm2
npm install -g pm2-windows-startup

pm2 start ecosystem.config.cjs
pm2 save
pm2-startup install
