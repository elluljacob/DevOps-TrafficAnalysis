# Dockerfile for DEV 
# Rewrite for production build
FROM node:22-alpine

WORKDIR /app
COPY package*.json ./

# Install dep, copy source code
RUN npm install
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]