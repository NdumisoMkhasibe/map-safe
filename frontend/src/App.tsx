import { lazy, Suspense, useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Compass,
  ExternalLink,
  HeartHandshake,
  Info,
  Layers3,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Navigation,
  Search,
  Shield,
  ShieldCheck,
  X,
} from 'lucide-react';
import { api, errorMessage } from './api';
import { useAuth, SignIn } from './auth';
import { incidentCategories } from './domain';
import { Admin } from './components/Admin';
import { Modal } from './components/Modal';
import { DrawingPanel, RatingForm } from './components/Review';
import { Score } from './components/Score';
import type { Area, Position, PublicRating, Safety, SearchResult } from './types';

const MapView = lazy(() => import('./components/MapView'));
const initialBbox = '27.95,-26.28,28.15,-26.12';

export default function App() {
  const auth = useAuth();
  const [areas, setAreas] = useState<Area[]>([]);
  const [totalAreas, setTotalAreas] = useState(0);
  const [bbox, setBbox] = useState(initialBbox);
  const [areaLoading, setAreaLoading] = useState(true);
  const [areaError, setAreaError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<Area | null>(null);
  const [ratings, setRatings] = useState<PublicRating[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [safety, setSafety] = useState<Safety | null>(null);
  const [point, setPoint] = useState<Position | null>(null);
  const [safetyLoading, setSafetyLoading] = useState(false);
  const [safetyError, setSafetyError] = useState('');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchAttribution, setSearchAttribution] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searched, setSearched] = useState(false);
  const [focus, setFocus] = useState<SearchResult | Area | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [corners, setCorners] = useState<Position[]>([]);
  const [rating, setRating] = useState(false);
  const [ratingArea, setRatingArea] = useState<Area | null>(null);
  const [signIn, setSignIn] = useState(false);
  const [afterSignIn, setAfterSignIn] = useState<'draw' | 'rate' | null>(null);
  const [page, setPage] = useState<'privacy' | 'safety' | 'about' | 'admin' | null>(null);
  const [menu, setMenu] = useState(false);
  const [notice, setNotice] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const [sheetExpanded, setSheetExpanded] = useState(false);

  useEffect(() => {
    const handleOnline = () => setOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOnline);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setAreaLoading(true);
    setAreaError('');
    // moveend events are debounced. Aborting prevents stale viewport responses replacing newer data.
    const timeout = setTimeout(() => {
      void api<{ areas: Area[]; total: number }>(`/areas?bbox=${bbox}&limit=100`, {
        signal: controller.signal,
      })
        .then((result) => {
          setAreas(result.areas);
          setTotalAreas(result.total);
        })
        .catch((failure: unknown) => {
          if (!controller.signal.aborted) setAreaError(errorMessage(failure));
        })
        .finally(() => {
          if (!controller.signal.aborted) setAreaLoading(false);
        });
    }, 200);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [bbox, refresh]);

  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    setDetailsLoading(true);
    setDetailsError('');
    void api<{ area: Area; ratings: PublicRating[] }>(`/areas/${selected.id}`, {
      signal: controller.signal,
    })
      .then((result) => {
        setRatings(result.ratings);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) setDetailsError(errorMessage(failure));
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailsLoading(false);
      });
    return () => controller.abort();
  }, [selected, refresh]);

  useEffect(() => {
    if (!point) return;
    const controller = new AbortController();
    setSafetyLoading(true);
    setSafetyError('');
    setSafety(null);
    setSelected(null);
    void api<Safety>(`/safety?longitude=${point[0]}&latitude=${point[1]}`, {
      signal: controller.signal,
    })
      .then(setSafety)
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) setSafetyError(errorMessage(failure));
      })
      .finally(() => {
        if (!controller.signal.aborted) setSafetyLoading(false);
      });
    return () => controller.abort();
  }, [point, refresh]);

  const selectArea = (area: Area) => {
    setSelected(area);
    setSafety(null);
    setPoint(null);
    setSafetyError('');
    setFocus(area);
    setSheetExpanded(true);
  };
  const search = async (event: FormEvent) => {
    event.preventDefault();
    if (query.trim().length < 2 || searching) return;
    setSearching(true);
    setSearchError('');
    setSearched(true);
    setSearchResults([]);
    try {
      const result = await api<{ results: SearchResult[]; attribution: string }>(
        `/search?q=${encodeURIComponent(query.trim())}`,
      );
      setSearchResults(result.results);
      setSearchAttribution(result.attribution);
    } catch (failure) {
      setSearchError(errorMessage(failure));
    } finally {
      setSearching(false);
    }
  };
  const startDrawing = () => {
    setRatingArea(null);
    if (!auth.user) {
      setAfterSignIn('draw');
      setSignIn(true);
      return;
    }
    setDrawing(true);
    setCorners([]);
    setSelected(null);
    setSheetExpanded(true);
  };
  const rateSelected = () => {
    setRatingArea(selected);
    if (!auth.user) {
      setAfterSignIn('rate');
      setSignIn(true);
      return;
    }
    setRating(true);
  };
  const signedIn = () => {
    setSignIn(false);
    if (afterSignIn === 'draw') {
      setDrawing(true);
      setCorners([]);
      setSelected(null);
      setSheetExpanded(true);
    }
    if (afterSignIn === 'rate') setRating(true);
    setAfterSignIn(null);
  };
  const success = (area: Area) => {
    setRating(false);
    setDrawing(false);
    setCorners([]);
    setSelected(area);
    setFocus(area);
    setSheetExpanded(true);
    setNotice('Thank you. Your experience is now part of the community picture.');
    setRefresh((value) => value + 1);
  };
  const refreshData = useCallback(() => setRefresh((value) => value + 1), []);
  const center = bbox.split(',').map(Number);
  const centerPosition: Position = [(center[0]! + center[2]!) / 2, (center[1]! + center[3]!) / 2];

  return (
    <div className="app-shell">
      <a className="skip-link" href="#community-panel">
        Skip to community information
      </a>
      <header className="app-header">
        <a className="brand" href="/" aria-label="MapSafe home">
          <span className="brand-symbol">
            <Shield size={23} strokeWidth={2.2} />
            <span />
          </span>
          <span>
            Map<span className="brand-safe">Safe</span>
            <small>A LITTLE LOCAL PERSPECTIVE</small>
          </span>
        </a>
        <nav className="desktop-nav" aria-label="Main navigation">
          <button
            className="nav-active"
            onClick={() => {
              setPage(null);
              setSelected(null);
            }}
          >
            Explore map
          </button>
          <button onClick={() => setPage('about')}>
            How it works <ExternalLink size={12} />
          </button>
        </nav>
        <div className="header-actions">
          <span className="community-pill">
            <span /> Community powered
          </span>
          {auth.user ? (
            <>
              <button
                className="avatar-button"
                onClick={() => setMenu(!menu)}
                aria-label="Account menu"
                aria-expanded={menu}
              >
                {auth.user.name.charAt(0).toUpperCase()}
              </button>
            </>
          ) : (
            <button
              className="button header-signin"
              disabled={auth.loading}
              onClick={() => {
                setAfterSignIn(null);
                setSignIn(true);
              }}
            >
              Sign in <ArrowRight size={15} />
            </button>
          )}
          <button
            className="icon-button mobile-menu"
            aria-label="Open menu"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            <Menu size={22} />
          </button>
        </div>
        {menu && (
          <div className="account-menu">
            {auth.user && <strong>Hello, {auth.user.name}</strong>}
            <button
              onClick={() => {
                setPage('about');
                setMenu(false);
              }}
            >
              How MapSafe works
            </button>
            <button
              onClick={() => {
                setPage('privacy');
                setMenu(false);
              }}
            >
              Privacy
            </button>
            <button
              onClick={() => {
                setPage('safety');
                setMenu(false);
              }}
            >
              Safety & limitations
            </button>
            {auth.user?.role === 'ADMIN' && (
              <button
                onClick={() => {
                  setPage('admin');
                  setMenu(false);
                }}
              >
                <ShieldCheck size={16} /> Admin dashboard
              </button>
            )}
            {auth.user && (
              <button
                onClick={() => {
                  void auth.logout();
                  setMenu(false);
                }}
              >
                <LogOut size={16} /> Sign out
              </button>
            )}
          </div>
        )}
      </header>
      <main className="map-main">
        <Suspense
          fallback={
            <div className="map-message" role="status">
              Loading the map…
            </div>
          }
        >
          <MapView
            areas={areas}
            drawing={drawing}
            corners={corners}
            onCorners={setCorners}
            onViewport={setBbox}
            onPoint={setPoint}
            focus={focus}
          />
        </Suspense>
        <div className="search-wrap">
          <form className="place-search" role="search" onSubmit={(event) => void search(event)}>
            <Search size={20} />
            <input
              aria-label="Search for a place"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Where are you headed?"
              minLength={2}
              maxLength={200}
              required
            />
            <button type="submit" disabled={searching || query.trim().length < 2}>
              {searching ? 'Searching…' : 'Search'}
            </button>
          </form>
          {searched && (
            <div className="search-results">
              <div className="search-result-top">
                <strong>{searching ? 'Finding places…' : 'Search results'}</strong>
                <button
                  className="icon-button"
                  aria-label="Close search results"
                  onClick={() => setSearched(false)}
                >
                  <X size={16} />
                </button>
              </div>
              {searchError && (
                <p className="error" role="alert">
                  {searchError}
                </p>
              )}
              {!searching && !searchError && searchResults.length === 0 && (
                <p>No places found. Try a city, street, or landmark.</p>
              )}
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  className="search-result"
                  onClick={() => {
                    setFocus(result);
                    setSearched(false);
                    setQuery(result.displayName.split(',')[0] || result.displayName);
                  }}
                >
                  <MapPin size={17} />
                  <span>{result.displayName}</span>
                  <ChevronRight size={16} />
                </button>
              ))}
              {searchAttribution && <p className="search-attribution">{searchAttribution}</p>}
            </div>
          )}
        </div>
        <aside
          id="community-panel"
          className={`community-panel ${sheetExpanded ? 'expanded' : ''} ${drawing ? 'drawing' : ''}`}
          aria-label="Community safety information"
          tabIndex={-1}
        >
          <button
            className="sheet-handle"
            aria-label={sheetExpanded ? 'Collapse community panel' : 'Expand community panel'}
            aria-expanded={sheetExpanded}
            onClick={() => setSheetExpanded(!sheetExpanded)}
          >
            <span />
          </button>
          <div className="panel-scroll">
            {drawing ? (
              <DrawingPanel
                corners={corners}
                onCorners={setCorners}
                center={centerPosition}
                onCancel={() => setDrawing(false)}
                onConfirm={() => {
                  setRatingArea(null);
                  setRating(true);
                }}
              />
            ) : selected ? (
              <>
                <button
                  className="text-button back-button"
                  onClick={() => {
                    setSelected(null);
                    setSheetExpanded(false);
                  }}
                >
                  <ArrowLeft size={16} /> Nearby areas
                </button>
                <span className="eyebrow">COMMUNITY PERSPECTIVE</span>
                <h1>{selected.name || 'Community area'}</h1>
                <Score score={selected.score} count={selected.ratingCount} />
                <p className="small muted">
                  Community safety score · recent experiences carry more weight. 1 is extremely
                  safe; 10 is extremely unsafe.
                </p>
                <button className="button primary full" onClick={rateSelected}>
                  Share an experience here <ArrowRight size={17} />
                </button>
                <div className="section-heading">
                  <h2>Community experiences</h2>
                  <MessageCircle size={17} />
                </div>
                {detailsLoading && (
                  <p role="status" className="loading-state">
                    Loading experiences…
                  </p>
                )}
                {detailsError && (
                  <p role="alert" className="error">
                    {detailsError}
                    <button className="text-button" onClick={refreshData}>
                      Try again
                    </button>
                  </p>
                )}
                {!detailsLoading && !detailsError && !ratings.length && (
                  <p className="empty-state">
                    No published experiences yet. Your perspective can help.
                  </p>
                )}
                {!detailsLoading &&
                  !detailsError &&
                  ratings.map((item) => (
                    <article className="rating-card" key={item.id}>
                      <div className="rating-card-top">
                        <span className="mini-avatar">{item.user.name.charAt(0)}</span>
                        <div>
                          <strong>{item.user.name}</strong>
                          <time>
                            Visited{' '}
                            {new Date(item.visitedAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </time>
                        </div>
                        <span className="rating-number">
                          {item.score}
                          <small>/10</small>
                        </span>
                      </div>
                      <span
                        className={`verification-badge ${item.verificationMethod === 'GPS_VERIFIED' ? 'verified' : ''}`}
                      >
                        {item.verificationMethod === 'GPS_VERIFIED' ? (
                          <>
                            <ShieldCheck size={13} /> GPS verified
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={13} /> Self-attested visit
                          </>
                        )}
                      </span>
                      {item.comment && <p>{item.comment}</p>}
                      {item.incidents.length > 0 && (
                        <div className="report-incidents">
                          {item.incidents.map((incident, index) => (
                            <div key={incident.id || index}>
                              <span className="incident-tag">
                                {incidentCategories.find(
                                  ([category]) => category === incident.category,
                                )?.[1] || incident.category}
                                {incident.otherType ? ` · ${incident.otherType}` : ''}
                              </span>
                              {incident.description && <p>{incident.description}</p>}
                            </div>
                          ))}
                          <small>Community-reported, not independently verified.</small>
                        </div>
                      )}
                    </article>
                  ))}
              </>
            ) : (
              <>
                <span className="eyebrow">
                  <Navigation size={12} /> EXPLORE WITH LOCAL PERSPECTIVE
                </span>
                <h1>
                  Get to know
                  <br />
                  the neighbourhood.
                </h1>
                <p className="panel-intro">
                  Real experiences. A clearer picture.
                  <br />
                  Explore how people feel about the places around you.
                </p>
                <div className="community-note">
                  <HeartHandshake size={20} />
                  <span>
                    Shared by people.
                    <br />
                    <strong>For people on the move.</strong>
                  </span>
                </div>
                {(point || safetyLoading) && (
                  <section className="safety-here">
                    <div className="section-heading">
                      <h2>Safety here</h2>
                      <button
                        className="icon-button"
                        aria-label="Clear safety here"
                        onClick={() => {
                          setPoint(null);
                          setSafety(null);
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                    {safetyLoading ? (
                      <p role="status">Checking community reports…</p>
                    ) : safetyError ? (
                      <p className="error" role="alert">
                        {safetyError}
                      </p>
                    ) : (
                      safety && (
                        <>
                          <Score score={safety.score} count={safety.ratingCount} compact />
                          <p className="small muted">
                            Combined from {safety.areas.length} overlapping{' '}
                            {safety.areas.length === 1 ? 'area' : 'areas'}, with each report counted
                            once.
                          </p>
                          {safety.areas.map((area) => (
                            <button
                              className="text-button"
                              key={area.id}
                              onClick={() => selectArea(area)}
                            >
                              {area.name || 'Community area'}
                              <ChevronRight size={15} />
                            </button>
                          ))}
                        </>
                      )
                    )}
                  </section>
                )}
                <div className="section-heading">
                  <h2>Areas in this view</h2>
                  <span className="count-chip">{totalAreas}</span>
                </div>
                <p className="section-subtitle">Tap an area for the community’s perspective</p>
                {areaLoading && (
                  <div className="loading-state" role="status">
                    <span className="spinner" /> Finding community areas…
                  </div>
                )}
                {areaError && (
                  <div className="error" role="alert">
                    {areaError}
                    <button className="text-button" onClick={refreshData}>
                      Try again
                    </button>
                  </div>
                )}
                {!areaLoading && !areaError && areas.length === 0 && (
                  <div className="empty-state">
                    <span className="empty-icon">
                      <Layers3 size={27} />
                    </span>
                    <strong>A fresh perspective starts here</strong>
                    <p>
                      No shared areas in this view yet. Move the map, search for a place, or share
                      somewhere you know.
                    </p>
                  </div>
                )}
                {!areaLoading && !areaError && (
                  <div className="area-list">
                    {areas.map((area) => (
                      <button className="area-card" key={area.id} onClick={() => selectArea(area)}>
                        <div className="area-card-heading">
                          <MapPin size={15} />
                          <strong>{area.name || 'Community area'}</strong>
                          <ChevronRight size={17} />
                        </div>
                        <Score score={area.score} count={area.ratingCount} compact />
                      </button>
                    ))}
                  </div>
                )}
                {totalAreas > 100 && (
                  <p className="notice small">
                    Showing 100 of {totalAreas} areas. Zoom in to explore a smaller neighbourhood.
                  </p>
                )}
                <div className="share-card">
                  <span className="feature-icon">
                    <MapPin size={22} />
                  </span>
                  <h3>Know this corner of the world?</h3>
                  <p>
                    A recent visit. An honest perspective.
                    <br />
                    Your experience makes a difference.
                  </p>
                  <button className="button primary full" onClick={startDrawing}>
                    Rate an area <ArrowRight size={17} />
                  </button>
                  <span className="small muted">A visit in the last 7 days is all you need.</span>
                </div>
              </>
            )}
            <div className="panel-disclaimer">
              <Info size={15} />
              <p>
                Community reports, not official crime statistics. Conditions change. Always use your
                own judgment.
              </p>
            </div>
            <footer className="panel-footer">
              <button onClick={() => setPage('privacy')}>Privacy</button>
              <span>·</span>
              <button onClick={() => setPage('safety')}>Safety & limitations</button>
              <span>·</span>
              <span>MapSafe</span>
            </footer>
          </div>
        </aside>
        <div className="map-top-note">
          <span />
          <strong>Your next place, with perspective.</strong>
          <span className="small">Explore the map to get started</span>
        </div>
        {!drawing && (
          <button className="button primary floating-rate" onClick={startDrawing}>
            <MapPin size={18} /> Rate an area <PlusIcon />
          </button>
        )}
        <div className="map-legend">
          <div>
            <Shield size={14} />
            <strong>Community safety score</strong>
            <button
              className="icon-button"
              aria-label="About safety scores"
              onClick={() => setPage('about')}
            >
              <Info size={14} />
            </button>
          </div>
          <div className="legend-gradient" />
          <div className="legend-labels">
            <span>1 · Extremely safe</span>
            <span>10 · Extremely unsafe</span>
          </div>
        </div>
      </main>
      {!online && (
        <div className="connection-banner" role="alert">
          You are offline. Reconnect to refresh reports or share an experience.
        </div>
      )}
      {auth.error && (
        <div className="connection-banner" role="alert">
          {auth.error}
        </div>
      )}
      {auth.user?.status === 'SUSPENDED' && (
        <div className="connection-banner" role="alert">
          Your account is suspended. Browsing is still available; new experiences cannot be
          submitted.
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          <CheckCircle2 size={20} />
          <span>{notice}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setNotice('')}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {signIn && (
        <SignIn
          onClose={() => {
            setSignIn(false);
            setAfterSignIn(null);
          }}
          onSuccess={signedIn}
          login={auth.login}
          devLogin={auth.devLogin}
        />
      )}
      {rating && (
        <RatingForm
          area={ratingArea}
          corners={corners}
          onClose={() => setRating(false)}
          onSuccess={success}
        />
      )}
      {page === 'admin' && auth.user?.role === 'ADMIN' && (
        <Admin user={auth.user} onClose={() => setPage(null)} onChange={refreshData} />
      )}
      {page && page !== 'admin' && <Information page={page} onClose={() => setPage(null)} />}
    </div>
  );
}

function PlusIcon() {
  return (
    <span className="plus-icon" aria-hidden="true">
      +
    </span>
  );
}

function Information({
  page,
  onClose,
}: {
  page: 'privacy' | 'safety' | 'about';
  onClose: () => void;
}) {
  return (
    <Modal
      title={
        page === 'privacy'
          ? 'Your privacy, by design'
          : page === 'safety'
            ? 'A perspective, not a promise'
            : 'A little local perspective'
      }
      onClose={onClose}
    >
      <div className="information-content">
        {page === 'privacy' ? (
          <>
            <p>
              MapSafe stores your Google account identifier, verified email, display name, role and
              account status to manage your account. Google provides the sign-in; MapSafe does not
              receive your password.
            </p>
            <h3>What the community can see</h3>
            <p>
              Your public display name, areas you share, ratings, comments, incident reports, visit
              dates and verification badges. Your email, Google identifier and authentication tokens
              are never public.
            </p>
            <h3>Location stays in your control</h3>
            <p>
              Browsing does not request your location. “Find my location” moves the map after your
              permission. Optional GPS verification sends one current position to check whether it
              falls within your area. Raw verification coordinates are not retained; only the
              result, verification time and accuracy metadata may be stored. MapSafe does not track
              movement or collect background location history.
            </p>
            <h3>Service providers and retention</h3>
            <p>
              Your browser requests map tiles from the configured map provider. Place searches are
              sent through MapSafe to the configured geocoding provider, which receives the search
              text. Google handles sign-in. Those providers may receive technical data such as your
              IP address. Search queries should not include sensitive personal information.
            </p>
            <p>
              Reports and moderation actions are retained to keep the community accountable. Account
              or privacy requests should be directed to the operator of this deployment. Avoid
              posting identifying details about yourself or others.
            </p>
            <h3>Session cookies</h3>
            <p>
              An essential, HTTP-only session cookie keeps you signed in. MapSafe does not include
              advertising or analytics trackers.
            </p>
          </>
        ) : page === 'safety' ? (
          <>
            <span className="feature-icon">
              <Shield size={28} />
            </span>
            <p>
              MapSafe brings together personal experiences. It is not an emergency-response service,
              police replacement, crime-prediction system or surveillance platform.
            </p>
            <h3>Community reports have limits</h3>
            <p>
              Conditions change. Reports may be incomplete, inaccurate or unrepresentative, and a
              low score does not guarantee safety. A blank area means there is no community
              information available, not that the area is safe.
            </p>
            <h3>Use context and your judgment</h3>
            <p>
              Do not use MapSafe as your only basis for travel or emergency decisions. Numerical
              scores describe how contributors felt. Incident reports are allegations or
              observations, not verified crimes or official police statistics.
            </p>
            <div className="notice">
              <strong>In an emergency</strong>
              <p>
                Contact the appropriate local emergency services. MapSafe does not monitor reports
                for emergency assistance.
              </p>
            </div>
            <h3>Share responsibly</h3>
            <p>
              Describe your own experience calmly and factually. Do not identify individuals,
              publish private details, threaten others or make discriminatory claims. Moderators may
              hide inappropriate content and suspend accounts.
            </p>
          </>
        ) : (
          <>
            <span className="feature-icon">
              <Compass size={28} />
            </span>
            <p>
              Get to know a place through the people who have spent time there. Explore the map,
              select a community area, or share a recent experience of your own.
            </p>
            <ol className="how-list">
              <li>
                <strong>Find your place.</strong>
                <p>Search explicitly for a place, pan the map, or choose a community area.</p>
              </li>
              <li>
                <strong>See the community picture.</strong>
                <p>
                  Scores run from 1 (extremely safe) to 10 (extremely unsafe). Newer ratings carry
                  more weight, with a default 180-day half-life. The rating count helps you judge
                  how much information is available.
                </p>
              </li>
              <li>
                <strong>Share a place you know.</strong>
                <p>
                  Sign in with Google, draw four corners around an area, and describe a personal
                  visit in the last seven days. Comments and incidents are optional.
                </p>
              </li>
            </ol>
            <h3>What do verification badges mean?</h3>
            <p>
              <strong>Self-attested</strong> means the contributor says they personally visited.{' '}
              <strong>GPS verified</strong> means a location check placed the contributor inside the
              area when submitting. Neither badge verifies the truth of a report.
            </p>
            <h3>Overlapping areas</h3>
            <p>
              Tap the map to see “Safety here”, a combined score for reports in overlapping active
              areas. Each report is counted only once. Individual areas keep their own scores.
            </p>
            <h3>A fairer community picture</h3>
            <p>
              Contributors can review substantially overlapping areas only once every seven days.
              Moderators can hide inappropriate reports, with an audit trail for their actions.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
