import { defineRailway, github, group, postgres, preserve, project, service, volume } from "railway/iac";

export default defineRailway(() => {
  const Postgres = postgres("Postgres", { region: "us-east4-eqdc4a" });
  const postgresVolume = volume("postgres-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "us-east4-eqdc4a", sizeMB: 5000 });
  const nosBbqOMatic = service("nos-bbq-o-matic", {
    source: github("seyone22/nos-bbq-o-matic", { branch: "master", checkSuites: false }),
    replicas: { "asia-southeast1-eqsg3a": 1 },
    deploy: { sleepApplication: true },
    domains: ["bbq.seyone.dev"],
    env: { BETTER_AUTH_SECRET: preserve(), BETTER_AUTH_URL: preserve(), DATABASE_URL: preserve(), GEMINI_API_KEY: preserve(), GOOGLE_CLIENT_ID: preserve(), GOOGLE_CLIENT_SECRET: preserve(), NEXT_PUBLIC_BETTER_AUTH_URL: preserve(), NEXT_PUBLIC_R2_PUBLIC_BASE: preserve(), NEXT_PUBLIC_SITE_URL: preserve(), R2_ACCESS_KEY_ID: preserve(), R2_BUCKET_NAME: preserve(), R2_ENDPOINT: preserve(), R2_SECRET_ACCESS_KEY: preserve(), R2_TOKEN_VALUE: preserve() },
  });
  const FoodRepo = service("Food Repo", {
    source: github("seyone22/ingredient-database-api", { branch: "master", checkSuites: false }),
    replicas: { "us-east4-eqdc4a": 1 },
    deploy: { sleepApplication: true },
    domains: ["food.seyone.dev"],
    networking: { privateNetworkEndpoint: "food-repo" },
    env: { DATABASE_URL: preserve(), FOODREPO_API_URL: preserve(), GEMINI_API_KEY: preserve(), GITHUB_TOKEN: preserve(), NODE_ENV: preserve(), OPENAI_API_KEY: preserve(), PEXELS_API_KEY: preserve() },
  });
  const foodrepoApi = service("foodrepo-api", {
    source: github("seyone22/foodrepo-api", { checkSuites: false }),
    replicas: { "asia-southeast1-eqsg3a": 1 },
    env: { DATABASE_URL: preserve(), GEMINI_API_KEY: preserve(), NODE_ENV: preserve() },
  });
  const NOSBBQOMatic = group("NOS BBQ O' Matic", [nosBbqOMatic]);
  const FoodRepo2 = group("Food Repo", [FoodRepo]);
  const Common = group("Common", [Postgres]);

  return project("Cook", {
    resources: [foodrepoApi, postgresVolume, NOSBBQOMatic, FoodRepo2, Common],
  });
});
