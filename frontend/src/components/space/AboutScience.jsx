import React from 'react';
import { X, HelpCircle, Waves, Radio, Mic, Info, ExternalLink } from 'lucide-react';

export default function AboutScience({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(11, 14, 20, 0.88)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 'var(--space-md)'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '780px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: 'var(--space-xl) var(--space-lg)',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
        position: 'relative',
        animation: 'fadeIn 0.25s ease-out'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.borderColor = 'var(--border-strong)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent-secondary-glow)',
            border: '1px solid var(--accent-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-secondary)'
          }}>
            <HelpCircle size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
              The Science of Extraterrestrial Acoustics
            </h2>
            <span style={{ fontSize: '0.82rem', color: 'var(--accent-secondary)', fontWeight: 600 }}>
              Physical Wave Propagation vs. Astronomical Sonification
            </span>
          </div>
        </div>

        {/* 1. Vacuum & Physical Sound */}
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-xs)', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-heading)' }}>
            <Waves size={16} color="var(--accent-secondary)" />
            Can Sound Travel Through Space?
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
            In classical mechanics, acoustic sound is a mechanical pressure wave requiring a physical medium (gas, liquid, or solid lattice)
            to compress and rarefy. Because interplanetary space is a hard vacuum with near-zero particle density (~5 particles/cm³),
            audible acoustic sound cannot propagate across empty space to a human ear.
          </p>
        </div>

        {/* 2. Recorded Audio vs Sonified Data */}
        <div style={{
          background: 'var(--bg-secondary)',
          padding: 'var(--space-md)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          marginBottom: 'var(--space-lg)'
        }}>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-md)', fontFamily: 'var(--font-heading)' }}>
            The Two Fundamental Acoustic Paradigms in our Catalog:
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
            <div style={{ background: 'rgba(61, 220, 151, 0.06)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(61, 220, 151, 0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span className="badge-recorded">
                  🎙️ Recorded Audio
                </span>
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Direct physical sensor measurements:</strong> Real pressure or seismic oscillations captured in a medium.
                Examples include Apollo 12 seismometer body waves ringing through the solid lunar crust and InSight/Perseverance microphones
                recording physical wind vortices in Mars' thin CO₂ atmosphere.
              </p>
            </div>

            <div style={{ background: 'rgba(124, 92, 252, 0.06)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(124, 92, 252, 0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span className="badge-sonified">
                  📡 Sonified Data
                </span>
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Data-to-audio translations:</strong> Astronomical sensors translate electromagnetic fields, plasma wave dipole voltages,
                or photon counts into human-audible audio frequencies. Examples include Juno Waves whistler emissions and Cassini radio plasma wave science.
              </p>
            </div>
          </div>
        </div>

        {/* 3. The Chandra Perseus Black Hole Nuance - Special fact callout */}
        <div style={{
          background: 'var(--accent-secondary-glow)',
          padding: 'var(--space-lg) var(--space-md)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--accent-secondary)',
          marginBottom: 'var(--space-lg)'
        }}>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-heading)' }}>
            <Radio size={16} color="var(--accent-secondary)" />
            The Perseus Cluster Black Hole: Real Physical Sound in Space
          </h4>
          <p style={{ color: 'var(--text-primary)', fontSize: '0.88rem', lineHeight: '1.6' }}>
            Unlike most sonifications which arbitrarily map image brightness to pitch, NASA's Chandra sonification of the
            <strong> Perseus Galaxy Cluster</strong> revisits <strong>real, physically detected acoustic sound waves</strong>.
            The supermassive black hole at the center of Perseus emits relativistic jets into the vast intracluster gas medium,
            generating concentric ripples in the hot X-ray emitting plasma.
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.6', marginTop: '8px' }}>
            These ripples represent a real musical note (a B-flat roughly <strong>57 octaves below middle C</strong>,
            having an acoustic period of 9.6 million years). NASA scientists extracted these radial pressure waves and scaled
            the frequency upward by 57 and 58 octaves (144 quadrillion and 288 quadrillion times higher than original) so they can be heard by human ears.
          </p>
        </div>

        {/* 4. Archival Disclaimer */}
        <div style={{
          padding: 'var(--space-md)',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          display: 'flex',
          gap: '12px',
          alignItems: 'center'
        }}>
          <Info size={18} color="var(--accent-secondary)" style={{ flexShrink: 0 }} />
          <span>
            <strong style={{ color: 'var(--text-primary)' }}>Educational Archive Notice:</strong> All audio clips in this application are curated, pre-recorded archival releases
            from NASA, JPL-Caltech, ESA, and the Chandra X-ray Center. They are used here strictly for non-commercial scientific, educational,
            and machine learning demonstration purposes without implying NASA or Chandra endorsement.
          </span>
        </div>
      </div>
    </div>
  );
}
