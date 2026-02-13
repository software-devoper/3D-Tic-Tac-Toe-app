export function getAllowedOrigins(frontendUrlEnv) {
  const fromEnv = (frontendUrlEnv || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const defaults = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175"
  ];

  return Array.from(new Set([...fromEnv, ...defaults]));
}

export function corsOriginValidator(allowedOrigins) {
  return (origin, callback) => {
    // Allow non-browser tools and same-origin requests.
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  };
}
