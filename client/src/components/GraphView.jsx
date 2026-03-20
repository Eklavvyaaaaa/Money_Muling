import React, { useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

function GraphView({ data }) {
  const fgRef = useRef();

  const getNodeColor = useCallback((node) => {
    if (node.ring_id)    return '#f59e0b';  // Yellow-amber for ring members
    if (node.score > 30) return '#ef4444';  // Red for high suspicion
    if (node.score > 0)  return '#f97316';  // Orange for some suspicion
    return '#6366f1';                        // Indigo for normal
  }, []);

  const getNodeSize = useCallback((node) => {
    if (node.score >= 60) return 8;
    if (node.score >= 30) return 6;
    return 4;
  }, []);

  const paintNode = useCallback((node, ctx) => {
    const size = getNodeSize(node);
    const color = getNodeColor(node);

    // Glow effect for ring members
    if (node.ring_id) {
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 15;
    } else if (node.score > 30) {
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
    } else {
      ctx.shadowBlur = 0;
    }

    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Label for high-score nodes
    if (node.score >= 40) {
      ctx.font = '3px Inter, sans-serif';
      ctx.fillStyle = '#f1f5f9';
      ctx.textAlign = 'center';
      ctx.fillText(node.id, node.x, node.y + size + 4);
    }
  }, [getNodeColor, getNodeSize]);

  const nodeLabel = useCallback((node) => {
    const patterns = node.patterns?.length > 0 ? node.patterns.join(', ') : 'None';
    return `<div style="background:#1e293b;padding:8px 12px;border-radius:8px;border:1px solid #334155;font-size:12px;font-family:Inter,sans-serif;line-height:1.6">
      <b style="color:#f1f5f9">${node.id}</b><br/>
      <span style="color:#94a3b8">Score:</span> <span style="color:${node.score > 50 ? '#ef4444' : '#10b981'}">${node.score}</span><br/>
      <span style="color:#94a3b8">Ring:</span> ${node.ring_id || 'None'}<br/>
      <span style="color:#94a3b8">Patterns:</span> ${patterns}
    </div>`;
  }, []);

  return (
    <ForceGraph2D
      ref={fgRef}
      graphData={data}
      nodeCanvasObject={paintNode}
      nodeLabel={nodeLabel}
      linkDirectionalArrowLength={3}
      linkDirectionalArrowRelPos={1}
      linkCurvature={0.2}
      linkColor={() => 'rgba(100, 116, 139, 0.25)'}
      linkWidth={0.5}
      backgroundColor="#0a0e1a"
      onNodeClick={(node) => {
        fgRef.current.centerAt(node.x, node.y, 800);
        fgRef.current.zoom(6, 800);
      }}
      cooldownTicks={100}
      warmupTicks={50}
    />
  );
}

export default GraphView;
