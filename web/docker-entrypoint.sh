#!/bin/sh
set -e
# bind mount로 들어온 /data가 root 소유면 node 사용자가 쓸 수 없으므로 소유권을 맞춘다.
if [ "$(id -u)" = "0" ]; then
  mkdir -p /data
  chown -R node:node /data
  exec setpriv --reuid=node --regid=node --init-groups "$@"
fi
exec "$@"
