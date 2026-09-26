import { useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LocateFixed,
  MapPinned,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { api, errorMessage } from '../api';
import {
  closePolygon,
  currentLocation,
  geometryError,
  incidentCategories,
  localDateTime,
  safetyLabel,
} from '../domain';
import { Modal } from './Modal';
import type { Area, GpsEvidence, Incident, Position, PublicRating, RatingInput } from '../types';

export function DrawingPanel({
  corners,
  onCorners,
  onConfirm,
  onCancel,
  center,
}: {
  corners: Position[];
  onCorners: (value: Position[]) => void;
  onConfirm: () => void;
  onCancel: () => void;
  center: Position;
}) {
  const [showCoordinates, setShowCoordinates] = useState(false);
  const validation = geometryError(corners);
  const starter = () => {
    const [lng, lat] = center;
    onCorners([
      [lng - 0.003, lat + 0.002],
      [lng + 0.003, lat + 0.002],
      [lng + 0.003, lat - 0.002],
      [lng - 0.003, lat - 0.002],
    ]);
    setShowCoordinates(true);
  };
  return (
    <section className="drawing-panel" aria-label="Draw your area">
      <button className="text-button" onClick={onCancel}>
        <ArrowLeft size={16} /> Back to exploring
      </button>
      <span className="eyebrow">SHARE YOUR EXPERIENCE · STEP 1 OF 2</span>
      <h1>A place you know.</h1>
      <p>Tap four corners around the area you visited, then drag each corner to make it fit.</p>
      <div className="corner-progress" aria-label={`${corners.length} of 4 corners selected`}>
        {[1, 2, 3, 4].map((number) => (
          <span key={number} className={corners.length >= number ? 'complete' : ''}>
            {corners.length >= number ? <Check size={18} /> : number}
          </span>
        ))}
      </div>
      <div className="drawing-tools">
        <button className="text-button" onClick={() => onCorners([])} disabled={!corners.length}>
          <RotateCcw size={15} /> Start over
        </button>
        <button
          className="text-button"
          onClick={() => setShowCoordinates(!showCoordinates)}
          aria-expanded={showCoordinates}
        >
          Enter coordinates
        </button>
      </div>
      {showCoordinates && (
        <div className="coordinate-editor">
          <p className="small muted">
            An accessible alternative to drawing. Enter corners in order around the boundary.
          </p>
          {corners.map(([lng, lat], index) => (
            <fieldset key={index}>
              <legend>Corner {index + 1}</legend>
              <label>
                Longitude
                <input
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  value={lng}
                  onChange={(event) =>
                    onCorners(
                      corners.map((point, i) =>
                        i === index ? [Number(event.target.value), point[1]] : point,
                      ),
                    )
                  }
                />
              </label>
              <label>
                Latitude
                <input
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  value={lat}
                  onChange={(event) =>
                    onCorners(
                      corners.map((point, i) =>
                        i === index ? [point[0], Number(event.target.value)] : point,
                      ),
                    )
                  }
                />
              </label>
            </fieldset>
          ))}
          {corners.length < 4 && (
            <button className="button secondary" onClick={() => onCorners([...corners, center])}>
              <Plus size={16} /> Add corner {corners.length + 1}
            </button>
          )}
        </div>
      )}
      {corners.length === 0 && (
        <button className="button secondary full" onClick={starter}>
          <MapPinned size={17} /> Start with an adjustable shape
        </button>
      )}
      {corners.length === 4 && validation && (
        <p role="alert" className="error">
          {validation}
        </p>
      )}
      <button className="button primary full" disabled={Boolean(validation)} onClick={onConfirm}>
        Confirm area <ArrowRight size={17} />
      </button>
      <p className="small muted">
        Keep it specific: a few streets, a park, or a block. Your area will be visible to the
        community.
      </p>
    </section>
  );
}

export function RatingForm({
  area,
  corners,
  onClose,
  onSuccess,
}: {
  area: Area | null;
  corners: Position[];
  onClose: () => void;
  onSuccess: (area: Area) => void;
}) {
  const [name, setName] = useState(area?.name || '');
  const [score, setScore] = useState(5);
  const [visitedAt, setVisitedAt] = useState(localDateTime(new Date()));
  const [comment, setComment] = useState('');
  const [attested, setAttested] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [gps, setGps] = useState<GpsEvidence>();
  const [gpsMessage, setGpsMessage] = useState('');
  const [locating, setLocating] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const now = new Date();
  const minDate = localDateTime(new Date(now.getTime() - 7 * 86_400_000));
  const verify = async () => {
    setLocating(true);
    setGpsMessage('');
    try {
      const point = await currentLocation();
      setGps({
        longitude: point.coords.longitude,
        latitude: point.coords.latitude,
        accuracy: point.coords.accuracy,
        timestamp: new Date(point.timestamp).toISOString(),
      });
      setGpsMessage(
        'Location captured. MapSafe checks whether it is inside the area when you submit. Raw coordinates are not stored.',
      );
    } catch (reason) {
      setGpsMessage(errorMessage(reason));
    } finally {
      setLocating(false);
    }
  };
  const toggleIncident = (category: string) =>
    setIncidents((value) =>
      value.some((item) => item.category === category)
        ? value.filter((item) => item.category !== category)
        : [...value, { category }],
    );
  const editIncident = (category: string, field: 'otherType' | 'description', value: string) =>
    setIncidents((items) =>
      items.map((item) => (item.category === category ? { ...item, [field]: value } : item)),
    );
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!attested) {
      setError('Please confirm that you personally visited this area.');
      return;
    }
    const visit = new Date(visitedAt);
    if (
      !Number.isFinite(visit.getTime()) ||
      visit.getTime() > Date.now() ||
      visit.getTime() < Date.now() - 7 * 86_400_000
    ) {
      setError('Choose a visit in the previous seven days, not in the future.');
      return;
    }
    if (!area && geometryError(corners)) {
      setError(geometryError(corners)!);
      return;
    }
    if (incidents.some((item) => item.category === 'OTHER' && !item.otherType?.trim())) {
      setError('Describe the incident type for Other.');
      return;
    }
    setPending(true);
    const input: RatingInput = {
      ...(area
        ? { areaId: area.id }
        : { area: { name: name.trim(), geometry: closePolygon(corners) } }),
      score,
      visitedAt: visit.toISOString(),
      attested: true,
      ...(comment.trim() ? { comment: comment.trim() } : {}),
      ...(gps ? { gps } : {}),
      incidents,
    };
    try {
      const result = await api<{ rating: PublicRating; area: Area }>('/ratings', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      onSuccess(result.area);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPending(false);
    }
  };
  return (
    <Modal title="Share your experience" onClose={onClose}>
      <form className="rating-form" onSubmit={(event) => void submit(event)}>
        <span className="eyebrow">YOUR PERSPECTIVE HELPS THE NEXT PERSON</span>
        {!area ? (
          <label>
            Area name <span className="optional">(optional)</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              placeholder="e.g. The streets around the station"
            />
          </label>
        ) : (
          <p className="selected-area">
            <MapPinned size={18} />
            {area.name || 'Community area'}
          </p>
        )}
        <fieldset className="score-fieldset">
          <legend>How did the area feel?</legend>
          <div className="score-options" role="radiogroup" aria-label="Community safety score">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => (
              <label key={value} className={`score-option ${score === value ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="score"
                  value={value}
                  checked={score === value}
                  onChange={() => setScore(value)}
                  aria-label={`${value}${value === 1 ? ' — extremely safe' : value === 10 ? ' — extremely unsafe' : ''}`}
                />
                <span>{value}</span>
              </label>
            ))}
          </div>
          <div className="scale-labels">
            <span>1 · Extremely safe</span>
            <span>10 · Extremely unsafe</span>
          </div>
          <p className="score-description" aria-live="polite">
            {score} / 10 · {safetyLabel(score)}
          </p>
        </fieldset>
        <label>
          When did you visit?
          <input
            type="datetime-local"
            value={visitedAt}
            min={minDate}
            max={localDateTime(now)}
            onChange={(event) => setVisitedAt(event.target.value)}
            required
          />
          <span className="field-help">A personal visit within the last 7 days.</span>
        </label>
        <label>
          Tell us a little more <span className="optional">(optional)</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="What shaped your experience? Keep it factual and leave out personal details."
          />
        </label>
        <details className="incident-details">
          <summary>
            Add incidents or concerns <span className="optional">(optional)</span>
            {incidents.length > 0 && <span className="count-chip">{incidents.length}</span>}
          </summary>
          <p className="small muted">
            Personal reports, not verified crime statistics. Do not include names or identifying
            details.
          </p>
          <div className="incident-grid">
            {incidentCategories.map(([category, label]) => (
              <label className="checkbox-label" key={category}>
                <input
                  type="checkbox"
                  checked={incidents.some((item) => item.category === category)}
                  onChange={() => toggleIncident(category)}
                />
                {label}
              </label>
            ))}
          </div>
          {incidents.map((incident) => (
            <div className="incident-entry" key={incident.category}>
              <strong>{incidentCategories.find(([key]) => key === incident.category)?.[1]}</strong>
              {incident.category === 'OTHER' && (
                <label>
                  Other incident type
                  <input
                    required
                    maxLength={100}
                    value={incident.otherType || ''}
                    onChange={(event) =>
                      editIncident(incident.category, 'otherType', event.target.value)
                    }
                  />
                </label>
              )}
              <label>
                {incidentCategories.find(([key]) => key === incident.category)?.[1]} details{' '}
                <span className="optional">(optional)</span>
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={incident.description || ''}
                  onChange={(event) =>
                    editIncident(incident.category, 'description', event.target.value)
                  }
                />
              </label>
            </div>
          ))}
        </details>
        <div className="verification-box">
          <div>
            <LocateFixed size={20} />
            <strong>Here right now?</strong>
          </div>
          <p className="small muted">
            Current location verification is optional. Your experience can be shared as
            self-attested.
          </p>
          <button
            type="button"
            className="button secondary"
            disabled={locating}
            onClick={() => void verify()}
          >
            {locating ? 'Finding your location…' : 'Verify using my current location'}
          </button>
          {gpsMessage && (
            <p className="small" role="status">
              {gpsMessage}
            </p>
          )}
          {gps && (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setGps(undefined);
                setGpsMessage('Location removed. Your visit will be self-attested.');
              }}
            >
              Remove location verification
            </button>
          )}
        </div>
        <label className="checkbox-label attestation">
          <input
            type="checkbox"
            required
            checked={attested}
            onChange={(event) => setAttested(event.target.checked)}
          />
          I personally visited this area at the date and time above, and this reflects my own
          experience.
        </label>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <p className="small muted">
          Your display name, experience, visit date and verification status will be public. You can
          review substantially overlapping areas once every 7 days.
        </p>
        <button type="submit" className="button primary full" disabled={pending}>
          {pending ? 'Sharing your experience…' : 'Share experience'} <ArrowRight size={18} />
        </button>
      </form>
    </Modal>
  );
}
