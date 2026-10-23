import { useMemo } from 'react';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { buildSankeyData } from '../../lib/libraryChartModels';
import type { JamGame } from '../../types';

interface VotePlaySankeyProps {
  games: JamGame[];
}

type NodeExtra = { name: string; x0?: number; x1?: number; y0?: number; y1?: number };
type LinkExtra = { source: NodeExtra; target: NodeExtra; width?: number; value: number };

export function VotePlaySankey({ games }: VotePlaySankeyProps) {
  const layout = useMemo(() => {
    const data = buildSankeyData(games);
    if (data.nodes.length === 0) return null;
    const graph = sankey<NodeExtra, LinkExtra>()
      .nodeWidth(18)
      .nodePadding(14)
      .extent([[24, 16], [576, 300]])({
      nodes: data.nodes.map((n) => ({ ...n })),
      links: data.links.map((l) => ({ ...l })) as unknown as LinkExtra[],
    });
    return graph;
  }, [games]);

  if (!layout) {
    return <p className="library-charts-empty">No games in this view.</p>;
  }

  const linkPath = sankeyLinkHorizontal<NodeExtra, LinkExtra>();

  return (
    <div className="library-charts-panel">
      <p className="library-charts-caption">
        How many filtered games flow from vote tier (left) to play tier (right).
      </p>
      <svg className="library-charts-sankey" viewBox="0 0 600 320" role="img" aria-label="Vote to play Sankey">
        {layout.links.map((link, i) => (
          <path
            key={i}
            d={linkPath(link) ?? undefined}
            fill="none"
            stroke="url(#sankeyGrad)"
            strokeWidth={Math.max(1, link.width ?? 1)}
            strokeOpacity={0.55}
          />
        ))}
        <defs>
          <linearGradient id="sankeyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
        </defs>
        {layout.nodes.map((node, i) => (
          <g key={i}>
            <rect
              x={node.x0}
              y={node.y0}
              width={(node.x1 ?? 0) - (node.x0 ?? 0)}
              height={(node.y1 ?? 0) - (node.y0 ?? 0)}
              fill="#a78bfa"
              rx={4}
            />
            <text
              x={(node.x0 ?? 0) < 200 ? (node.x0 ?? 0) - 8 : (node.x1 ?? 0) + 8}
              y={((node.y0 ?? 0) + (node.y1 ?? 0)) / 2}
              textAnchor={(node.x0 ?? 0) < 200 ? 'end' : 'start'}
              dominantBaseline="middle"
              className="library-charts-sankey-label"
            >
              {node.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
