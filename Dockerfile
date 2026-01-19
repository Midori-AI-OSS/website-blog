# Dockerfile for JS App (Production)
# Use PixelArch Quartz as base image

FROM lunamidori5/pixelarch:quartz

# Update OS release info
RUN sudo sed -i 's/Quartz/Bun-Server/g' /etc/os-release

RUN yay -Syu --noconfirm curl && yay -Yccc --noconfirm
RUN yay -Syu --noconfirm wget && yay -Yccc --noconfirm
RUN yay -Syu --noconfirm git && yay -Yccc --noconfirm
RUN yay -Syu --noconfirm base-devel && yay -Yccc --noconfirm
RUN yay -Syu --noconfirm nodejs && yay -Yccc --noconfirm
RUN yay -Syu --noconfirm unzip && yay -Yccc --noconfirm
RUN yay -Syu --noconfirm npm && yay -Yccc --noconfirm
RUN yay -Syu --noconfirm bun && yay -Yccc --noconfirm

WORKDIR /app
EXPOSE 59382

# Source will be bind-mounted at runtime; install deps in entrypoint
CMD ["bash", "-lc", "bash /app/docker-entrypoint.sh"]
