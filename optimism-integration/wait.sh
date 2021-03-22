#!/bin/bash

while ! nc -z localhost 9645; do   
  sleep 1
done

echo "L2 node RPC up. Waiting another 30 sec."
sleep 30