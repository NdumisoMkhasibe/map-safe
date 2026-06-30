# System Architecture — MapSafe

## Overview

MapSafe is a full-stack web application consisting of:

- Frontend (React)
- Backend API (Node.js)
- Database (PostgreSQL)
- External API (Google Maps)

---

## High-Level Architecture

User → Frontend (React) → Backend API → Database

                             ↘ Google Maps API

---

## Frontend

- React + TypeScript
- Google Maps JavaScript SDK
- Handles:
  - Map rendering
  - User interactions
  - Authentication UI
  - Rating submission

---

## Backend

- Node.js + Express
- REST API
- Handles:
  - Authentication verification
  - Rating storage
  - Safety score calculation
  - Location queries

---

## Database

PostgreSQL (later PostGIS)

Tables:
- users
- ratings
- locations
- visits

---

## Key Design Decision

We use a **radius-based location model**:
- Each rating applies to a circular geographic area
- Backend aggregates overlapping ratings into a safety score

---

## Future Scaling

- Add caching layer (Redis)
- Move to microservices if needed
- Add mobile app (React Native)