import React, { useState } from 'react';
import { Compass, Activity, Search, PlusCircle, Sliders, HelpCircle } from 'lucide-react';
import ClipLibrary from './ClipLibrary';
import Analyze from './Analyze';
import SimilaritySearch from './SimilaritySearch';
import AddClip from './AddClip';
import AdminPanel from './AdminPanel';
import RecentIngestions from '../../components/space/RecentIngestions';
import AboutScience from '../../components/space/AboutScience';
import { useAuth } from '../../context/AuthContext';

export default function SpaceContainer({ onRequireAuth }) {
  const { isAuthenticated } = useAuth();
  const [currentSpaceTab, setCurrentSpaceTab] = useState('library'); // 'library' | 'classify' | 'similarity' | 'add' | 'admin'
  const [selectedClipForAnalyze, setSelectedClipForAnalyze] = useState(null);
  const [selectedClipForSimilarity, setSelectedClipForSimilarity] = useState(null);
  const [showAboutScience, setShowAboutScience] = useState(false);
  const [ingestionCount, setIngestionCount] = useState(0);

  const handleSelectClipForAnalyze = (clip) => {
    setSelectedClipForAnalyze(clip);
    setCurrentSpaceTab('classify');
  };

  const handleSelectClipForSimilarity = (clip) => {
    setSelectedClipForSimilarity(clip);
    setCurrentSpaceTab('similarity');
  };

  return (
    <div>
      {/* Space Mode Sub-Header & Navigation Tabs */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 'var(--space-md)',
        marginBottom: 'var(--space-xl)'
      }}>
        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-secondary)',
          padding: 'var(--space-xs)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          flexWrap: 'wrap',
          gap: '4px'
        }}>
          <button
            onClick={() => setCurrentSpaceTab('library')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: currentSpaceTab === 'library' ? 'var(--accent-secondary)' : 'transparent',
              color: currentSpaceTab === 'library' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: currentSpaceTab === 'library' ? '0 0 14px var(--accent-secondary-glow)' : 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <Compass size={15} />
            <span>Catalog Library</span>
          </button>

          <button
            onClick={() => {
              setSelectedClipForAnalyze(null);
              setCurrentSpaceTab('classify');
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: currentSpaceTab === 'classify' ? 'var(--accent-secondary)' : 'transparent',
              color: currentSpaceTab === 'classify' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: currentSpaceTab === 'classify' ? '0 0 14px var(--accent-secondary-glow)' : 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <Activity size={15} />
            <span>Classify Telemetry</span>
          </button>

          <button
            onClick={() => {
              setSelectedClipForSimilarity(null);
              setCurrentSpaceTab('similarity');
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: currentSpaceTab === 'similarity' ? 'var(--accent-secondary)' : 'transparent',
              color: currentSpaceTab === 'similarity' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: currentSpaceTab === 'similarity' ? '0 0 14px var(--accent-secondary-glow)' : 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <Search size={15} />
            <span>Similarity Search</span>
          </button>

          <button
            onClick={() => {
              if (!isAuthenticated && onRequireAuth) {
                onRequireAuth();
              } else {
                setCurrentSpaceTab('add');
              }
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: currentSpaceTab === 'add' ? 'var(--accent-secondary)' : 'transparent',
              color: currentSpaceTab === 'add' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: currentSpaceTab === 'add' ? '0 0 14px var(--accent-secondary-glow)' : 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <PlusCircle size={15} />
            <span>Ingest Telemetry</span>
          </button>

          <button
            onClick={() => {
              if (!isAuthenticated && onRequireAuth) {
                onRequireAuth();
              } else {
                setCurrentSpaceTab('admin');
              }
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: currentSpaceTab === 'admin' ? 'var(--accent-secondary)' : 'transparent',
              color: currentSpaceTab === 'admin' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: currentSpaceTab === 'admin' ? '0 0 14px var(--accent-secondary-glow)' : 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <Sliders size={15} />
            <span>Model Retrain</span>
          </button>
        </div>

        {/* About Science Modal Trigger */}
        <button
          onClick={() => setShowAboutScience(true)}
          style={{
            background: 'rgba(124, 92, 252, 0.12)',
            border: '1px solid var(--accent-secondary)',
            color: 'var(--accent-secondary)',
            padding: '8px 18px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 0 12px var(--accent-secondary-glow)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <HelpCircle size={16} />
          <span>About the Science</span>
        </button>
      </div>

      {/* Main Tab Views */}
      {currentSpaceTab === 'library' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: '24px', alignItems: 'start' }}>
          <div>
            <ClipLibrary
              onSelectClipForAnalyze={handleSelectClipForAnalyze}
              onSelectClipForSimilarity={handleSelectClipForSimilarity}
            />
          </div>
          <div>
            <RecentIngestions refreshTrigger={ingestionCount} />
          </div>
        </div>
      )}

      {currentSpaceTab === 'classify' && (
        <Analyze initialClip={selectedClipForAnalyze} />
      )}

      {currentSpaceTab === 'similarity' && (
        <SimilaritySearch initialClip={selectedClipForSimilarity} />
      )}

      {currentSpaceTab === 'add' && (
        <AddClip onClipIngested={() => {
          setIngestionCount(prev => prev + 1);
          setCurrentSpaceTab('library');
        }} />
      )}

      {currentSpaceTab === 'admin' && (
        <AdminPanel />
      )}

      {/* About Science Modal */}
      <AboutScience
        isOpen={showAboutScience}
        onClose={() => setShowAboutScience(false)}
      />
    </div>
  );
}
