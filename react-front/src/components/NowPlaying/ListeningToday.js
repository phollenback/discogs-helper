import React, { useMemo } from 'react';
import { useMeter } from '../../context/MeterContext';

export default function ListeningToday() {
  const { listeningToday, sessions } = useMeter();

  const bars = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const counts = hours.map((h) => {
      return sessions.filter((s) => {
        if (!s.last_played) return false;
        const d = new Date(s.last_played);
        return d.getHours() === h && d.toDateString() === new Date().toDateString();
      }).length;
    });
    const max = Math.max(1, ...counts);
    return counts.map((c, i) => ({ h: i, pct: (c / max) * 100, active: c > 0 }));
  }, [sessions]);

  return (
    <section className="card">
      <div className="card__head">
        <div>
          <div className="card__title">Listening today</div>
          <div className="card__sub">Sessions on this turntable</div>
        </div>
      </div>
      <div className="card__body">
        <div className="stat-grid">
          <div className="stat-tile">
            <div className="stat-tile__v">{listeningToday.sessions}</div>
            <div className="stat-tile__l">Sessions</div>
          </div>
          <div className="stat-tile">
            <div className="stat-tile__v">{listeningToday.totalMin}m</div>
            <div className="stat-tile__l">Total time</div>
          </div>
          <div className="stat-tile">
            <div className="stat-tile__v">{listeningToday.records}</div>
            <div className="stat-tile__l">Records</div>
          </div>
          <div className="stat-tile">
            <div className="stat-tile__v">{listeningToday.avgMin}m</div>
            <div className="stat-tile__l">Avg session</div>
          </div>
        </div>
        <div className="activity-bars">
          {bars.map((b) => (
            <span
              key={b.h}
              className={b.active ? 'is-active' : ''}
              style={{ height: `${Math.max(8, b.pct)}%` }}
              title={`${b.h}:00`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
