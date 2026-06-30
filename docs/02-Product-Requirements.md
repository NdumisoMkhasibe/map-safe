# Product Requirements Document (PRD)

## 1. Overview

MapSafe is a web application that allows users to rate the safety of physical locations and view aggregated safety data on an interactive map.

---

## 2. Core Features (MVP)

### 2.1 User Accounts
- Users can sign in using Google OAuth
- Each user has a unique identity

---

### 2.2 Location Rating
- Users can rate a location from 1 (safe) to 10 (unsafe)
- Users must confirm physical presence via GPS
- Optional comment allowed

---

### 2.3 Map Interface
- Google Maps integration
- Colour-coded safety overlay
- Clickable regions to view details

---

### 2.4 Area Definition
- Users select a radius around a point (e.g. 100m, 250m, 500m)
- Ratings apply to that selected area

---

### 2.5 Safety Scoring
- Weighted average of ratings
- Recent ratings have higher weight than older ones

---

## 3. Data Inputs

- User ratings (1–10)
- Optional incident category
- Timestamp
- GPS coordinates
- Radius selection

---

## 4. Data Outputs

- Safety score per area
- Heatmap visualization
- Area detail view (ratings + comments)

---

## 5. Constraints

- Users must be physically present to submit rating
- One rating per user per visit per area

---

## 6. Future Features (Out of Scope for MVP)

- Mobile app
- Crime data integration
- User reputation system
- AI safety insights
- Real-time alerts