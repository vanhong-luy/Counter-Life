# Equinox Bank

A full-stack banking application with a modern Next.js frontend and a robust Spring Boot backend.

## Architecture

* **Frontend**: Next.js (running on port `3000`)
* **Backend**: Spring Boot (running on port `8080`)
* **Databases**: 
  * PostgreSQL (running on port `5433`, mapped to `5432` internally)
  * MongoDB (running on port `27018`, mapped to `27017` internally)
  * Redis (running on port `6380`, mapped to `6379` internally)

## How to Run the Application

The entire application is containerized using Docker Compose. This means you do not need to manually install Node.js, Java, or any databases to run the project.

### Prerequisites
* Ensure you have [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### Starting the Stack
To start the entire application (Frontend, Backend, and all databases), open a terminal in the root directory and run:

```bash
docker compose up --build -d
```

This will download the necessary images, build the frontend and backend, and start all containers in the background (`-d`). 
*(Note: It may take a minute or two for the frontend to finish building and optimizing pages).*

### Stopping the Stack
To stop the application, run:

```bash
docker compose down
```

## Accessing the Application

Once the Docker containers are up and running, you can access the different components at the following URLs:

* **Frontend UI**: [http://localhost:3000](http://localhost:3000)
  * This is where you should go to use the banking application!
* **Backend API**: [http://localhost:8080](http://localhost:8080)
  * *Note: The root path (`/`) is secured by Spring Security and will return a `403 Forbidden` error. To verify the backend is running, visit the public welcome endpoint:* [http://localhost:8080/auth/welcome](http://localhost:8080/auth/welcome)

## Development Notes

* The frontend code is located in the `/frontend` directory. 
* The backend code is located in the `/src` directory (standard Maven project structure).
* Both the frontend and backend Dockerfiles are configured to automatically build the production-ready versions of the app when you run `docker compose up --build`.
