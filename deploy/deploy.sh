#!/bin/bash
LOGFILE="./chaos-results/deploy.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
CONFIG="./chaos.config.json"

mkdir -p ./chaos-results
echo "[$TIMESTAMP] Starting deployment..." | tee -a "$LOGFILE"

if [ ! -f "$CONFIG" ]; then
  echo "[DEPLOY] chaos.config.json not found!" | tee -a "$LOGFILE"
  exit 1
fi

STOP_CMD=$(node    -e "const c=require('./chaos.config.json'); console.log(c.app.stop_command)")
START_CMD=$(node   -e "const c=require('./chaos.config.json'); console.log(c.app.start_command)")
READY_WAIT=$(node  -e "const c=require('./chaos.config.json'); console.log(c.app.ready_wait || 3)")
HEALTH=$(node      -e "const c=require('./chaos.config.json'); console.log(c.health || '/health')")
PORT=$(node        -e "const c=require('./chaos.config.json'); console.log(c.port || 3000)")
DEPLOY_CMD=$(node  -e "const c=require('./chaos.config.json'); console.log(c.app.deploy_command || '')")

echo "[DEPLOY] Stopping: $STOP_CMD" | tee -a "$LOGFILE"
eval "$STOP_CMD" 2>/dev/null
sleep 2

if [ -n "$DEPLOY_CMD" ]; then
  echo "[DEPLOY] Running: $DEPLOY_CMD" | tee -a "$LOGFILE"
  eval "$DEPLOY_CMD" 2>&1 | tee -a "$LOGFILE"
else
  echo "[DEPLOY] Pulling latest code..." | tee -a "$LOGFILE"
  git pull 2>&1 | tee -a "$LOGFILE"
fi

echo "[DEPLOY] Starting: $START_CMD" | tee -a "$LOGFILE"
nohup bash -c "$START_CMD" >> ./chaos-results/app.log 2>&1 &
sleep "$READY_WAIT"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT}${HEALTH})
if [ "$STATUS" -eq 200 ]; then
  echo "[$TIMESTAMP] Deployment SUCCESSFUL!" | tee -a "$LOGFILE"
  exit 0
else
  echo "[$TIMESTAMP] Deployment FAILED — HTTP $STATUS" | tee -a "$LOGFILE"
  exit 1
fi
