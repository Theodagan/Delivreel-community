{ pkgs, ... }: {
  channel = "stable-24.05";

  packages = [
    pkgs.nodejs_22 
    pkgs.yarn
    pkgs.ffmpeg
    pkgs.python3
    pkgs.git
  ];

  env = {
    # Matches Firebase Studio's default Postgres credentials
    DATABASE_URL = "postgresql://user:mypassword@localhost:5432/delivreel?sslmode=disable";
    JWT_SECRET = "dev-secret";
    JWT_REFRESH_SECRET = "dev-refresh";
    UPLOAD_PATH = "./uploads";
    HLS_PATH = "./hls";
    NODE_ENV = "development";
    BACKEND_PORT = "3000";
  };

  services.postgres = {
    enable = true;
  };

  idx = {
    extensions = [
      "mtxr.sqltools"
      "mtxr.sqltools-driver-pg"
    ];

    workspace = {
      onCreate = {
        frontend-install = "npm ci";
        backend-install = "cd backend && npm ci";
        create-database = "psql postgresql://user:mypassword@localhost:5432/postgres?sslmode=disable -c 'CREATE DATABASE delivreel;' || true";      
      };

      onStart = {
        backend = "cd backend && npm run start:dev";
        frontend = "npm run start";
      };
    };
  };
}
