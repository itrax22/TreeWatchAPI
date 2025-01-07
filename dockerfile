# Use Node.js LTS version
FROM node:20

# Set the working directory
WORKDIR /src

# Copy package.json and package-lock.json
COPY src/package*.json ./

# Install dependencies
RUN npm install 

# Copy the rest of the application code
COPY ./src ./src

# Set the path to the service account JSON
ENV GOOGLE_APPLICATION_CREDENTIALS=/src/service-account.json

# Copy the service account file
COPY ./service-account.json /src/service-account.json

# Expose the port your app runs on
EXPOSE 8080

# Set the default command to run your application
CMD ["node", "src/index.js"]
