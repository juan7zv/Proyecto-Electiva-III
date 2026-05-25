# Dockerfile, docker-compose.yml y README.md del Auth Service
# (Se unifican en los requests de despliegue según tarea, pero escribiré aquí el Dockerfile)

# Archivo: Dockerfile
# Utiliza imagen minimalista Alpine de Node 20
FROM node:20-alpine

# Definición del directorio de trabajo adentro del contenedor
WORKDIR /usr/src/app

# Copia e instala primero las dependencias de node para aprovechar cache del layer docker
COPY package*.json ./
RUN npm ci --omit=dev --strict-ssl=false

# Copiar el grueso de archivos fuente a la imagen
COPY . .

# Exponer su puerto operativo
EXPOSE 3001

# Definir comando directo de ejecución node (Menor overhead de PID vs npm start)
CMD [ "node", "server.js" ]
