#!/bin/bash
echo "Stopping chaos-man..."
pkill -f "webhook.js"   2>/dev/null && echo "Webhook stopped"
pkill -f "dashboard/server.js" 2>/dev/null && echo "Dashboard stopped"
echo "Done."
