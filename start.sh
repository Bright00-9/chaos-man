#!/bin/bash
echo "Starting chaos-man locally..."
nohup node lib/commands/webhook.js >> chaos-results/webhook.log 2>&1 &
echo "Webhook listener started on port 9000"
nohup node lib/dashboard/server.js >> chaos-results/dashboard.log 2>&1 &
echo "Dashboard started on port 8080"
echo ""
echo "Dashboard → http://localhost:8080"
echo "Webhook   → http://localhost:9000"
