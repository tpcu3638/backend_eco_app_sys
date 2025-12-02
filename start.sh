#!/bin/bash

while true; do
  echo "Starting application..."
  bun run app/index.ts
  EXIT_CODE=$?
  echo "Application exited with code $EXIT_CODE"
  if [ $EXIT_CODE -eq 0 ]; then
    echo "Application exited normally, not restarting."
    break
  else
    echo "Application crashed, restarting in 5 seconds..."
    sleep 5
  fi
done
