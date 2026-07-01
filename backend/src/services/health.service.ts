// src/services/health.service.ts

export function getHealthStatus() {
  return {
    status: "ok",
    service: "mapsafe-backend",
    timestamp: new Date().toISOString(),
  };
}