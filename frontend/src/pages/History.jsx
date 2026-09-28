import React, { useState, useEffect } from 'react';
import { History as HistoryIcon, Clock, CheckCircle2, HelpCircle, Layers, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function History({ onNavigateRecord }) {
  const { authFetch } = useAuth();
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState(null);

  const fetchHistory = async (pageNum = 1, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await authFetch(`/room/history?page=${pageNum}&limit=10`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to load history.');
      }

      if (append) {
        setHistoryItems(prev => [...prev, ...(data.history || [])]);
      } else {
        setHistoryItems(data.history || []);
      }

      setPage(data.pagination?.page || pageNum);
      setTotalPages(data.pagination?.pages || 1);
    } catch (err) {
      console.error('Error fetching history:', err);
      setError(`Unable to load recognition history: ${err.message}`);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchHistory(1, false);
  }, [authFetch]);

  const handleLoadMore = () => {
    if (page < totalPages) {
      fetchHistory(page + 1, true);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>
      
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
          Acoustic Recognition History
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
          Chronological record of room matching queries and environmental sound classifications.
        </p>
      </div>

      {error && (
        <div style={{
          background: 'var(--bg-elevated)',
          borderLeft: '3px solid var(--error)',
          borderTop: '1px solid var(--border-subtle)',
          borderRight: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '14px 18px',
          borderRadius: 'var(--radius-md)',
          color: 'var(--error)',
          fontSize: '0.88rem',
          marginBottom: 'var(--space-lg)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button onClick={() => fetchHistory(1, false)} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Loader2 size={36} color="var(--accent-primary)" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px auto' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Loading recognition history...</p>
        </div>
      ) : historyItems.length === 0 ? (
        /* Empty State */
        <div 
          className="glass-panel" 
          style={{ 
            padding: '50px 30px', 
            textAlign: 'center',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--border-strong)'
          }}
        >
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent-primary-glow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            color: 'var(--accent-primary)'
          }}>
            <HistoryIcon size={30} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>No Recognition History Yet</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '460px', margin: '8px auto 20px auto' }}>
            You haven't run any room classification or matching jobs yet. Record ambient audio to see results logged here.
          </p>
          <button
            onClick={onNavigateRecord}
            className="btn-primary"
          >
            Start Your First Recording
          </button>
        </div>
      ) : (
        /* History Timeline List */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {historyItems.map((item) => {
            const isMatchMode = item.mode === 'match';
            const dateStr = new Date(item.timestamp).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            // Extract result summary
            let title = '';
            let subtitle = '';
            let isPositiveMatch = false;

            if (isMatchMode) {
              isPositiveMatch = item.result?.matched === true;
              if (isPositiveMatch) {
                title = `Matched Room: ${item.result.room_name}`;
                subtitle = `Similarity Score: ${Math.round((item.result.similarity || 0) * 100)}%`;
              } else {
                title = 'No Room Match';
                subtitle = item.result?.message || 'Similarity below 85% threshold';
              }
            } else {
              const topLabel = item.result?.top_label || 'Acoustic Environment';
              title = `Classification: ${topLabel.replace('_', ' ').toUpperCase()}`;
              subtitle = 'Processed 5.0s window via PANNs Cnn14';
            }

            return (
              <div 
                key={item._id}
                className="interactive-card"
                style={{
                  padding: '18px 22px',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  borderLeft: isMatchMode 
                    ? (isPositiveMatch ? '4px solid var(--success)' : '4px solid var(--accent-primary)')
                    : '4px solid var(--accent-primary)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: 'var(--radius-sm)',
                    background: isMatchMode 
                      ? (isPositiveMatch ? 'rgba(61, 220, 151, 0.15)' : 'var(--accent-primary-glow)')
                      : 'var(--accent-primary-glow)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isMatchMode 
                      ? (isPositiveMatch ? 'var(--success)' : 'var(--accent-primary)')
                      : 'var(--accent-primary)'
                  }}>
                    {isMatchMode ? (
                      isPositiveMatch ? <CheckCircle2 size={22} /> : <HelpCircle size={22} />
                    ) : (
                      <Layers size={22} />
                    )}
                  </div>

                  <div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                      {title}
                    </h4>
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      <span className="font-mono">{subtitle}</span>
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span className={isPositiveMatch ? 'badge-recorded' : 'badge-sonified'} style={{ textTransform: 'uppercase', fontSize: '0.72rem' }}>
                    {item.mode}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    <Clock size={13} />
                    <span>{dateStr}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Load More Button */}
          {page < totalPages && (
            <div style={{ textAlign: 'center', marginTop: 'var(--space-md)' }}>
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="btn-secondary"
                style={{ padding: '10px 24px' }}
              >
                {loadingMore ? 'Loading...' : 'Load More Records'}
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
