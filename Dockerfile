FROM registry.hf.space/enzostvs-deepsite:cpu-bbc7882
# FROM node:22

# USER 1000
# WORKDIR /usr/src/app

# # Copy the rest of the application files to the container
# COPY --chown=1000 . .

# RUN npm ci && npm run build

# # Expose the application port (assuming your app runs on port 3000)
# EXPOSE 3000

# # Start the application
# CMD ["npm", "start"]