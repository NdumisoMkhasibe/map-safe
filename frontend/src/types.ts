/** Public API shapes deliberately exclude email, Google identity and raw GPS evidence. */
export type Position = [number, number];
export type Geometry = { type: 'Polygon'; coordinates: Position[][] };
export type User = {
  id: string;
  name: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
};
export type Area = {
  id: string;
  name: string | null;
  geometry: Geometry;
  centroidLatitude: number;
  centroidLongitude: number;
  status: string;
  score: number | null;
  ratingCount: number;
  label: string;
};
export type Incident = {
  id?: string;
  category: string;
  otherType?: string;
  description?: string;
  status?: string;
};
export type PublicRating = {
  id: string;
  areaId: string;
  score: number;
  comment: string | null;
  visitedAt: string;
  verificationMethod: 'SELF_ATTESTED' | 'GPS_VERIFIED';
  createdAt: string;
  user: { id: string; name: string };
  incidents: Incident[];
};
export type Safety = { score: number | null; ratingCount: number; label: string; areas: Area[] };
export type SearchResult = {
  id: string;
  displayName: string;
  latitude: number;
  longitude: number;
  bbox?: number[];
};
export type GpsEvidence = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
};
export type RatingInput = {
  areaId?: string;
  area?: { name: string; geometry: Geometry };
  score: number;
  comment?: string;
  visitedAt: string;
  attested: true;
  gps?: GpsEvidence;
  incidents: Incident[];
};
export type AdminItem = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  score?: number;
  comment?: string | null;
  category?: string;
  otherType?: string | null;
  description?: string | null;
  createdAt?: string;
  geometry?: Geometry;
  user?: { name: string };
  area?: { name: string | null };
  action?: string;
  entityType?: string;
  entityId?: string;
  reason?: string;
  actor?: { name: string };
};
export type AdminPage = { items: AdminItem[]; total: number; page: number; limit: number };
export type AdminDashboard = {
  users: number;
  areas: number;
  ratings: number;
  incidents: number;
  recentActivity: AdminItem[];
  statistics: Record<string, number | string | null>;
};
