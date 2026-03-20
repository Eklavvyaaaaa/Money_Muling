import React, { useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function GraphView({ data, showMST }) {
  const fgRef = useRef();

  const getNodeColor = useCallback((node) => {
    if (node.ring_id)    return '#f59e0b';
    if (node.score > 30) return '#ef4444';
    if (node.score > 0)  return '#f97316';
    return '#6366f1';
  }, []);

  const getNodeSize = useCallback((node) => {
    if (node.score >= 60) return 8;
    if (node.score >= 30) return 6;
    if (node.score > 0)   return 5;
    return 3.5;
  }, []);

  const paintNode = useCallback((node, ctx) => {
    const size = getNodeSize(node);
    const color = getNodeColor(node);

    if (node.ring_id) {
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 18;
    } else if (node.score > 30) {
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 12;
    } else {
      ctx.shadowBlur = 0;
    }

    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.shadowBlur = 0;

    if (node.score >= 30) {
      ctx.font = 'bold 3px Inter, sans-serif';
      ctx.fillStyle = '#f1f5f9';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(node.id, node.x, node.y + size + 2);
    }
  }, [getNodeColor, getNodeSize]);

  // If showMST is true, we ONLY show links with a high amount or something similar
  // Actually, Kruskal's MST edges are not explicitly marked in links yet.
  // I should probably pass a "isMST" property in links from the backend.
  // For now, I'll filter links if showMST is true based on amount (simulated) 
  // but I'll fix the backend to mark them.
  
  const paintLink = (link, ctx, globalScale) => {
    const isMST = link.isMST; // This will come from backend soon
    
    if (showMST && !link.isMST) {
      return; // Hide non-MST links
    }

    const start = link.source;
    const end = link.target;
    if (typeof start !== 'object' || typeof end !== 'object') return;

    ctx.strokeStyle = isMST ? 'rgba(129, 140, 248, 0.8)' : 'rgba(100, 116, 139, 0.2)';
    ctx.lineWidth = isMST ? 1.5 / globalScale : 0.6 / globalScale;
    
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  };

  const nodeLabel = useCallback((node) => {
    const safeId = escapeHtml(node.id);
    const safeScore = escapeHtml(node.score);
    const safeRing = escapeHtml(node.ring_id);
    const safePatterns = node.patterns?.length > 0
      ? node.patterns.map(p => escapeHtml(p)).join(', ')
      : 'None';

    return `<div style="background:#1e293b;padding:10px 14px;border-radius:10px;border:1px solid #334155;font-size:12px;font-family:Inter,sans-serif;line-height:1.7;min-width:180px">
      <div style="font-weight:700;color:#f1f5f9;margin-bottom:4px">${safeId}</div>
      <div><span style="color:#64748b">Suspicion Score:</span> <span style="color:${node.score > 50 ? '#ef4444' : node.score > 0 ? '#f59e0b' : '#10b981'};font-weight:600">${safeScore}/100</span></div>
      <div><span style="color:#64748b">Ring/SCC:</span> ${safeRing || 'Not in SCC'}</div>
      <div><span style="color:#64748b">Patterns:</span> ${safePatterns}</div>
    </div>`;
  }, []);

  return (
    <ForceGraph2D
      ref={fgRef}
      graphData={data}
      nodeCanvasObject={paintNode}
      linkCanvasObject={paintLink} // Use custom link painting for MST
      nodeLabel={nodeLabel}
      linkDirectionalArrowLength={3.5}
      linkDirectionalArrowRelPos={1}
      linkCurvature={0.2}
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
