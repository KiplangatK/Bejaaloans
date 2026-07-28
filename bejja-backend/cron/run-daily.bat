@echo off
cd /d C:\Users\USER\bejja-backend
echo ============================================ >> cron\log.txt
echo Running Early Payment Auto-Apply: %date% %time% >> cron\log.txt
node cron\apply-early-payments.js >> cron\log.txt 2>&1
echo Completed: %date% %time% >> cron\log.txt
echo ============================================ >> cron\log.txt