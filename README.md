# Delivreel

Delivreel is a collaborative video review platform designed to streamline feedback, discussion, and iteration around video content.

Built for teams who need a simple and structured way to review media together, Delivreel combines video playback, project organization, and collaborative commenting in a single product.

## Why Delivreel

Reviewing video with a team is often fragmented across chat, email, cloud drives, and disconnected feedback tools. Delivreel aims to provide a more focused workflow by bringing video review and discussion into one place.

With Delivreel, teams can:

- centralize video review workflows
- organize content by project
- collaborate through in-context discussion
- run the platform in a self-hosted environment
- keep control over their infrastructure and media pipeline

## Core capabilities

- video upload
- video playback
- collaborative comments
- project management
- user authentication
- API documentation

## Product positioning

Delivreel is being developed as a flexible platform for collaborative media workflows, with a strong emphasis on self-hosting and deployment autonomy.

The project is particularly suited to teams looking for:

- a private video review environment
- more control over infrastructure and hosting
- a customizable full-stack codebase
- a foundation for internal media collaboration tools

## Technology stack

- **Frontend:** Angular
- **UI:** Angular Material
- **Backend:** NestJS
- **Database:** PostgreSQL or SQLite
- **Realtime:** WebSocket
- **Uploads:** Multer
- **Video processing:** FFmpeg
- **API docs:** Swagger

## Repository structure

```text
apps/
  frontend/
  backend/
```

## Getting started

### Prerequisites

Make sure you have the following installed:

- Docker
- Docker Compose

### Quick start

Create your environment file:

```bash
cp .env.example .env
```

Start the application stack:

```bash
docker compose up --build
```

## Local development

You can also run the applications independently during development.

### Backend

```bash
cd apps/backend
npm install
npm run start:dev
```

### Frontend

```bash
cd apps/frontend
npm install
npm run dev
```

## Self-hosting

Delivreel is designed to support self-hosted deployments.

The project can be run in a private environment, making it a strong fit for teams that want to keep ownership of their platform, configuration, and media workflows.

## Project status

Delivreel is under active development.  
Features, workflows, and product direction may continue to evolve as the platform matures.

## Contributing

The project is still evolving.  
If you are interested in contributing, collaborating, or discussing a specific use case, please get in touch before starting broader integration work.

## License

No `LICENSE` file is currently provided in this repository.

Unless explicit written permission is granted, no right to reuse, modify, redistribute, or commercially exploit this project should be assumed.
