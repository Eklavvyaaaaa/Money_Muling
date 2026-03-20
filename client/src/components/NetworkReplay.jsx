import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';

const API_URL = (() => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (import.meta.env.MODE === 'development') return 'http://localhost:5001';
    return '';
})();

function NetworkReplay({ onGraphUpdate }) {
    const [timeline, setTimeline] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [loading, setLoading] = useState(false);
    const playIntervalRef = useRef(null);

    useEffect(() => {
        axios.get(`${API_URL}/timeline`).then(res => {
            setTimeline(res.data.timestamps);
            if (res.data.timestamps.length > 0) {
                setCurrentIndex(res.data.timestamps.length - 1);
            }
        }).catch(console.error);
    }, []);

    const fetchGraphState = async (index) => {
        if (timeline.length === 0) return;
        setLoading(true);
        try {
            const ts = timeline[index];
            const res = await axios.get(`${API_URL}/replay?time=${ts}`);
            onGraphUpdate(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (timeline.length > 0) {
            fetchGraphState(currentIndex);
        }
    }, [currentIndex, timeline]); // Adding dependency array correctly

    useEffect(() => {
        if (isPlaying) {
            playIntervalRef.current = setInterval(() => {
                setCurrentIndex(prev => {
                    if (prev >= timeline.length - 1) {
                        setIsPlaying(false);
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1000);
        } else {
            clearInterval(playIntervalRef.current);
        }
        return () => clearInterval(playIntervalRef.current);
    }, [isPlaying, timeline.length]);

    if (timeline.length === 0) return null;

    const currentTs = new Date(timeline[currentIndex]).toLocaleString();

    return (
        <div className="network-replay" style={{
            background: '#1e293b', padding: '1rem 1.5rem', borderRadius: '12px',
            border: '1px solid #334155', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
            <div style={{ display: 'flex', gap: '0.8rem', minWidth: '160px' }}>
                <button
                    className="btn btn-primary"
                    onClick={() => setIsPlaying(!isPlaying)}
                    style={{ width: '90px' }}
                >
                    {isPlaying ? '⏸ Pause' : '▶ Play'}
                </button>
                <button
                    className="btn btn-ghost"
                    onClick={() => setCurrentIndex(prev => Math.min(timeline.length - 1, prev + 1))}
                    disabled={isPlaying || currentIndex >= timeline.length - 1}
                >
                    ⏭ Step
                </button>
            </div>

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
                <input
                    type="range"
                    min="0"
                    max={timeline.length - 1}
                    value={currentIndex}
                    onChange={(e) => {
                        setIsPlaying(false);
                        setCurrentIndex(Number(e.target.value));
                    }}
                    style={{ width: '100%', cursor: 'pointer', accentColor: '#3b82f6' }}
                />
                <div style={{ minWidth: '180px', fontSize: '0.85rem', color: '#94a3b8', textAlign: 'right', fontWeight: 600 }}>
                    {currentTs} {loading && <span style={{ color: '#3b82f6' }}> ⏳</span>}
                </div>
            </div>
        </div>
    );
}

export default NetworkReplay;
