FROM debian:bullseye as builder

ARG NODE_VERSION=18.16.0

RUN apt-get update; apt install -y curl dnsutils
RUN curl https://get.volta.sh | bash
ENV VOLTA_HOME /root/.volta
ENV PATH /root/.volta/bin:$PATH
RUN volta install node@${NODE_VERSION}

RUN mkdir /app
WORKDIR /app

ENV NODE_ENV production

COPY . .

RUN echo "VITE_UDP_HOST=$(dig +short realaf.fly.dev):3000" > .env && \
  npm install -g pnpm && \
  pnpm i && \
  pnpm run build
FROM debian:bullseye

LABEL fly_launch_runtime="nodejs"

COPY --from=builder /root/.volta /root/.volta
COPY --from=builder /app /app

WORKDIR /app
ENV NODE_ENV production
ENV PATH /root/.volta/bin:$PATH
ENV TCP_HOST 0.0.0.0
ENV UDP_HOST fly-global-services

CMD [ "npm", "run", "start" ]
