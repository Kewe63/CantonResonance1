#!/bin/bash
set -e

echo "=== Starting Canton Sandbox ==="

# Start sandbox in background
daml sandbox --dar .daml/dist/canton-ticket-0.1.0.dar --port 6865 &
SANDBOX_PID=$!

# Wait for sandbox to be ready
echo "Waiting for sandbox on port 6865..."
for i in $(seq 1 60); do
  if daml ledger list-parties --host localhost --port 6865 > /dev/null 2>&1; then
    echo "Sandbox is ready!"
    break
  fi
  sleep 2
done

# Upload DAR and run init script
echo "Uploading DAR..."
daml ledger upload-dar .daml/dist/canton-ticket-0.1.0.dar --host localhost --port 6865 || true

echo "Running init script..."
daml script --dar .daml/dist/canton-ticket-0.1.0.dar --script-name Setup:setup --ledger-host localhost --ledger-port 6865 || true

# Start JSON API in foreground
echo "=== Starting JSON API on port 7575 ==="
daml json-api --ledger-host localhost --ledger-port 6865 --http-port 7575 --address 0.0.0.0 --allow-insecure-tokens &
JSON_PID=$!

echo "=== All services started ==="
echo "Sandbox PID: $SANDBOX_PID"
echo "JSON API PID: $JSON_PID"

# Wait for either process to exit
wait -n $SANDBOX_PID $JSON_PID
