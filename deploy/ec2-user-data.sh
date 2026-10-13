#!/bin/bash
# First boot of the Regularhood API server (Amazon Linux 2023, arm64): Docker, Compose, and swap for the 1 GB instance.
set -euxo pipefail

dnf update -y
dnf install -y docker git
systemctl enable --now docker
usermod -aG docker ec2-user

# Compose and Buildx plugins (not packaged for AL2023)
mkdir -p /usr/local/lib/docker/cli-plugins
curl -fsSL -o /usr/local/lib/docker/cli-plugins/docker-compose \
  https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-linux-aarch64
curl -fsSL -o /usr/local/lib/docker/cli-plugins/docker-buildx \
  https://github.com/docker/buildx/releases/download/v0.17.1/buildx-v0.17.1.linux-arm64
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose /usr/local/lib/docker/cli-plugins/docker-buildx

# 1 GB swap so building the image (npm ci + vite) fits in 1 GB of RAM
if [ ! -f /swapfile ]; then
  dd if=/dev/zero of=/swapfile bs=1M count=1024
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

mkdir -p /home/ec2-user/habiturn && chown ec2-user:ec2-user /home/ec2-user/habiturn
touch /var/lib/habiturn-ready
