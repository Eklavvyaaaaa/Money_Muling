import React, { useRef, useEffect } from 'react';
import { ForceGraph2D } from 'react-force-graph';

function GraphView({ data }) {
  const fgRef = useRef();

  // Color nodes: Blue (normal), Red (suspicious), Yellow (part of a ring)
  const getNodeColor = (node) => {
    if (node.ring_id) return '#fadb14'; // Yellow for ring members
    if (node.score > 20) return '#f85149'; // Red for suspicious
    return '#58a6ff'; // Blue for normal
  };

  return (
    <ForceGraph2D
      ref={fgRef}
      graphData={data}
      nodeLabel={n => `Account: ${n.id}\nScore: ${n.score || 0}\nRing: ${n.ring_id || 'None'}`}
      nodeColor={getNodeColor}
      nodeRelSize={6}
      linkDirectionalArrowLength={3.5}
      linkDirectionalArrowRelPos={1}
      linkCurvature={0.25}
      backgroundColor="#161b22"
      linkColor={() => '#30363d'}
      onNodeClick={node => {
        fgRef.current.centerAt(node.x, node.y, 1000);
        fgRef.current.zoom(8, 2000);
      }}
    />
  );
}

export default GraphView;
