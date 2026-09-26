-- Forward migration from the released point-based MVP foundation. Historical
-- locations and ratings are retained under explicit legacy names: inventing
-- polygons from a latitude/longitude point would silently change their meaning.
ALTER TABLE "Location" RENAME TO "LegacyLocation";
ALTER TABLE "Rating" RENAME TO "LegacyRating";
-- PostgreSQL keeps index/constraint names after a table rename. The old primary
-- key index must be renamed before a new "Rating" table can claim Rating_pkey.
ALTER TABLE "LegacyLocation" RENAME CONSTRAINT "Location_pkey" TO "LegacyLocation_pkey";
ALTER TABLE "LegacyRating" RENAME CONSTRAINT "Rating_pkey" TO "LegacyRating_pkey";
ALTER TABLE "LegacyRating" RENAME CONSTRAINT "Rating_userId_fkey" TO "LegacyRating_userId_fkey";
ALTER TABLE "LegacyRating" RENAME CONSTRAINT "Rating_locationId_fkey" TO "LegacyRating_locationId_fkey";

CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "ContentStatus" AS ENUM ('ACTIVE', 'HIDDEN');
CREATE TYPE "VerificationMethod" AS ENUM ('SELF_ATTESTED', 'GPS_VERIFIED');
CREATE TYPE "IncidentCategory" AS ENUM (
  'THEFT', 'PICKPOCKETING', 'ROBBERY', 'ASSAULT', 'CAR_BREAK_IN',
  'HIJACKING', 'HARASSMENT', 'VANDALISM', 'SUSPICIOUS_ACTIVITY',
  'POOR_LIGHTING', 'LACK_OF_SECURITY', 'OTHER'
);

ALTER TABLE "User"
  ADD COLUMN "googleSubject" TEXT,
  ADD COLUMN "avatarUrl" TEXT,
  ADD COLUMN "role" "Role" NOT NULL DEFAULT 'USER',
  ADD COLUMN "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "User_googleSubject_key" ON "User"("googleSubject");
CREATE INDEX "User_status_createdAt_idx" ON "User"("status", "createdAt");

CREATE TABLE "Area" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "geometry" JSONB NOT NULL,
  "centroidLatitude" DOUBLE PRECISION NOT NULL,
  "centroidLongitude" DOUBLE PRECISION NOT NULL,
  "minLatitude" DOUBLE PRECISION NOT NULL,
  "minLongitude" DOUBLE PRECISION NOT NULL,
  "maxLatitude" DOUBLE PRECISION NOT NULL,
  "maxLongitude" DOUBLE PRECISION NOT NULL,
  "creatorId" TEXT NOT NULL,
  "status" "ContentStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Area_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Area_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Area_status_minLongitude_maxLongitude_idx" ON "Area"("status", "minLongitude", "maxLongitude");
CREATE INDEX "Area_status_minLatitude_maxLatitude_idx" ON "Area"("status", "minLatitude", "maxLatitude");
CREATE INDEX "Area_creatorId_idx" ON "Area"("creatorId");

CREATE TABLE "Rating" (
  "id" TEXT NOT NULL,
  "areaId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "comment" TEXT,
  "visitedAt" TIMESTAMP(3) NOT NULL,
  "attestedAt" TIMESTAMP(3) NOT NULL,
  "verificationMethod" "VerificationMethod" NOT NULL DEFAULT 'SELF_ATTESTED',
  "verifiedAt" TIMESTAMP(3),
  "gpsAccuracy" DOUBLE PRECISION,
  "status" "ContentStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Rating_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Rating_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Rating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Rating_score_range" CHECK ("score" BETWEEN 1 AND 10),
  CONSTRAINT "Rating_verification_consistency" CHECK (
    ("verificationMethod" = 'SELF_ATTESTED' AND "verifiedAt" IS NULL AND "gpsAccuracy" IS NULL)
    OR ("verificationMethod" = 'GPS_VERIFIED' AND "verifiedAt" IS NOT NULL AND "gpsAccuracy" IS NOT NULL)
  )
);
CREATE INDEX "Rating_areaId_status_createdAt_idx" ON "Rating"("areaId", "status", "createdAt");
CREATE INDEX "Rating_userId_createdAt_idx" ON "Rating"("userId", "createdAt");

CREATE TABLE "IncidentReport" (
  "id" TEXT NOT NULL,
  "ratingId" TEXT NOT NULL,
  "category" "IncidentCategory" NOT NULL,
  "otherType" TEXT,
  "description" TEXT,
  "status" "ContentStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IncidentReport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IncidentReport_ratingId_fkey" FOREIGN KEY ("ratingId") REFERENCES "Rating"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "IncidentReport_other_type" CHECK (("category" = 'OTHER' AND "otherType" IS NOT NULL) OR ("category" <> 'OTHER' AND "otherType" IS NULL))
);
CREATE INDEX "IncidentReport_ratingId_status_idx" ON "IncidentReport"("ratingId", "status");
CREATE INDEX "IncidentReport_status_createdAt_idx" ON "IncidentReport"("status", "createdAt");

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

CREATE TABLE "AdminAuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "previousStatus" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdminAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- Only public API inputs can create new Rating rows. These database checks
-- keep the core score/verification invariants intact for maintenance scripts too.
