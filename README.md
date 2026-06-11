# Delivreel

Plateforme de revue vidéo collaborative en cours de développement.

## État du projet

Le projet n'est pas finalisé. L'application évolue encore et certaines parties ont bougé depuis la création du README initial.

Aujourd'hui, le seul mode testé et public est la version self-hosted avec :

- frontend Angular
- API NestJS
- transcodage vidéo local géré par le serveur NestJS via FFmpeg
- base PostgreSQL via Docker Compose, ou SQLite en mode simple

Cette version peut être auto-hébergée dès maintenant.

Point important : Delivreel peut fonctionner en 100% local, sans dépendance cloud, pour l'instant c'est meme le seul mode public.

### Les Modes

  #### Mode local 100%

  Dans ce mode, Delivreel ne dépend d'aucun service cloud pour l'upload, l'encodage ou la lecture.

  - les fichiers sont uploadés vers le backend NestJS
  - le backend stocke les médias localement
  - le transcodage HLS est effectué localement via FFmpeg
  - la lecture passe par les endpoints locaux du projet
  - l'authentification et l'autorisation de lecture restent gérées par Delivreel

  Ce mode est le plus autonome et le plus mature aujourd'hui.

  En self-host officiel, ce mode est le seul mode supporté aujourd'hui.


## Version hébergée

Une version hébergée publique n'est pas encore lancée.

Le point bloquant n'est pas seulement technique : le projet cherche encore un modèle économique viable avant un lancement public. En ce moment, l'une des pistes explorées est une intégration Mux pour la gestion du pipeline vidéo sur une version hébergée.

En pratique :

- le code fonctionne
- le pricing reste a déterminer et implementer
- le mode self-host reste séparé et basé sur le pipeline local

## Stack actuelle

- Frontend : Angular 20
- UI : Angular Material
- Lecture vidéo : `hls.js`
- Temps réel : `socket.io` / WebSocket Gateway NestJS
- Backend : NestJS 11
- ORM : TypeORM
- Base de données : PostgreSQL ou SQLite (`better-sqlite3`)
- Authentification : JWT + refresh tokens + Passport
- Uploads : Multer
- Transcodage local : FFmpeg via `fluent-ffmpeg`
- Documentation API : Swagger sur `/api`
- Reverse proxy dev/self-host : Nginx
- Admin base de données en dev : Adminer
- Exploration cloud video : Mux

## Ce qui est opérationnel aujourd'hui

- upload de vidéos
- transcodage local en HLS
- lecture vidéo
- commentaires temps réel par vidéo
- gestion de projets
- authentification JWT
- exécution via Docker Compose

## Démarrage développement Docker

Le compose par défaut est dédié au développement avec hot reload.

1. Créer le fichier d'environnement :

```bash
cp .env.example .env
```

2. Lancer la stack de développement :

```bash
docker compose up --build
```

3. Accéder aux services :

- application via Nginx : `http://localhost:${NGINX_PORT}`
- frontend direct : `http://localhost:${FRONTEND_PORT}`
- API : `http://localhost:${NGINX_PORT}/api`
- healthcheck : `http://localhost:${BACKEND_PORT}/health`
- Adminer : `http://localhost:${ADMINER_PORT}`

Par défaut, `docker-compose.yml` correspond au mode développement et démarre aussi PostgreSQL.

## Base de données

Le backend choisit la base selon la configuration :

- si `DATABASE_URL` est défini : PostgreSQL
- sinon (obsolete) : SQLite via `DATABASE_PATH` (par défaut `/app/database.sqlite`) 

Important : le compose de développement fourni est orienté PostgreSQL.

## Variables importantes

| Variable | Role |
| --- | --- |
| `DATABASE_URL` | Active PostgreSQL si définie |
| `DATABASE_PATH` | Chemin SQLite si `DATABASE_URL` est absente |
| `JWT_SECRET` | Secret JWT |
| `JWT_REFRESH_SECRET` | Secret refresh token |
| `BACKEND_BIND_PORT` | Port d'écoute interne de l'API |
| `BACKEND_PORT` | Port exposé pour l'API |
| `FRONTEND_PORT` | Port du serveur Angular |
| `NGINX_PORT` | Port d'entrée principal |
| `POSTGRES_PORT` | Port exposé PostgreSQL |
| `ADMINER_PORT` | Port Adminer |
| `DELIVREEL_API_IMAGE` | Image backend utilisée par `devops/public/docker-compose.selfhost.yml` |
| `DELIVREEL_FRONTEND_IMAGE` | Image frontend utilisée par `devops/public/docker-compose.selfhost.yml` |
| `UPLOAD_PATH` | Dossier des uploads |
| `HLS_PATH` | Dossier des sorties HLS |

## Développement local sans Docker

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

## Notes d'architecture

- le frontend vit dans `apps/frontend/`
- le backend NestJS vit dans `apps/backend/`
- les fichiers uploadés sont servis depuis `/uploads`
- le dossier HLS n'est pas exposé statiquement de façon publique par le backend
- Swagger est disponible sur `/api`

## Auto-hébergement

Si votre objectif est d'auto-héberger Delivreel aujourd'hui, la voie la plus concrète est :

1. garder le pipeline local NestJS + FFmpeg
2. utiliser PostgreSQL via `make selfhost-docker-up`
3. ne pas activer Mux tant que vous ne cherchez pas à expérimenter la piste hébergée

C'est le mode le plus mature du dépôt à ce jour.

## Licence

Le dépôt ne contient pas encore de fichier `LICENSE`.

En l'état, ce dépôt n'est pas publié sous une licence open source.

Une autorisation limitée est accordée pour un usage personnel et non commercial : consultation du code, test, exécution locale, expérimentation et auto-hébergement à titre personnel.

En revanche, toute utilisation commerciale, toute revente, toute intégration dans une offre payante, toute prestation facturée reposant sur ce projet, ou toute exploitation professionnelle au bénéfice d'une structure tierce nécessite une autorisation écrite préalable.

Pour une utilisation commerciale, merci de vous rapprocher de l'auteur du projet.

Sauf pour l'autorisation limitée d'usage personnel non commercial décrite ci-dessus, l'ensemble du code source, des contenus et des fichiers de ce projet reste protégé par le droit d'auteur. Tous droits réservés.

La publication de ce dépôt en public ne vaut pas autorisation générale de réutilisation, modification, redistribution ou exploitation commerciale en dehors des droits minimaux éventuellement accordés par la plateforme d'hébergement.
