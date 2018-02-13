FROM node:6.11.1
COPY . /app
WORKDIR /app
EXPOSE 3000
CMD ["node", "index.js"]
