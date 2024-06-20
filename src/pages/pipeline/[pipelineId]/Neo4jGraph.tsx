import dynamic from 'next/dynamic';
import React, { useState, useEffect, useRef } from 'react';
import neo4j from "neo4j-driver";
import { HomeIcon, MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon } from '@heroicons/react/24/outline';
import { NoSSRForceGraphRef } from '@/lib/NoSSRForceGraph';

const driver = neo4j.driver(
  "neo4j://localhost:7687",
  neo4j.auth.basic("neo4j", "Testtest")
);

const NoSSRForceGraph = dynamic(() => import('@/lib/NoSSRForceGraph'), {
  ssr: false,
});

interface Neo4jGraphProps {
  width: number;
  height: number;
}

const Neo4jGraph: React.FC<Neo4jGraphProps> = ({ width, height }) => {
  const [data, setData] = useState({ nodes: [], links: [] });
  const [nodeColors, setNodeColors] = useState<Record<string, string>>({});
  const graphRef = useRef<NoSSRForceGraphRef>(null);

  useEffect(() => {
    const fetchData = async () => {
      const session = driver.session();
      try {
        const result = await session.run(`
          MATCH (n)-[r]->(m)
          RETURN n, r, m
        `);

        const nodes = new Map();
        const links = [];
        const nodeTypes = new Set<string>();

        result.records.forEach((record) => {
          const source = record.get('n');
          const target = record.get('m');
          const relationshipType = record.get('r').type;

          const sourceType = source.labels[0];
          const targetType = target.labels[0];

          if (!nodes.has(source.properties.id)) {
            nodes.set(source.properties.id, {
              id: source.properties.id,
              type: sourceType,
            });
          }

          if (!nodes.has(target.properties.id)) {
            nodes.set(target.properties.id, {
              id: target.properties.id,
              type: targetType,
            });
          }

          nodeTypes.add(sourceType);
          nodeTypes.add(targetType);

          links.push({
            source: source.properties.id,
            target: target.properties.id,
            label: relationshipType,
          });
        });

        const colors: Record<string, string> = {};
        Array.from(nodeTypes).forEach((type, index) => {
          colors[type] = `hsl(${(index * 120) % 360}, 70%, 50%)`;
        });

        setNodeColors(colors);

        setData({
          nodes: Array.from(nodes.values()).map(({ id, type }) => ({
            id,
            type,
          })),
          links,
        });
      } catch (error) {
        console.error('Error querying Neo4j:', error);
      } finally {
        await session.close();
      }
    };

    fetchData();
  }, []);

  const handleHome = () => {
    graphRef.current?.zoomToFit(400);
  };

  const handleZoomIn = () => {
    graphRef.current?.zoomTo(1.2, 400);
  };

  const handleZoomOut = () => {
    graphRef.current?.zoomTo(0.8, 400);
  };

  return (
    <div className="mx-auto max-w-6xl mt-4 top-10 relative flex items-center">
      <div className="w-full bg-zinc-800 border-2 border-zinc-600 rounded-2xl p-6">
        <div className="relative">
          <NoSSRForceGraph
            ref={graphRef}
            nodeLabel="id"
            nodeAutoColorBy={(node) => nodeColors[node.type]}
            linkLabel="label"
            linkAutoColorBy="label"
            data={data}
            width={width}
            height={height}
          />
          <div className="absolute top-4 right-4 flex flex-col space-y-2">
            <button
              className="bg-white rounded-full p-2 hover:bg-blue-100 focus:outline-none"
              onClick={handleHome}
            >
              <HomeIcon className="h-6 w-6 text-blue-500" />
            </button>
            <button
              className="bg-white rounded-full p-2 hover:bg-blue-100 focus:outline-none"
              onClick={handleZoomIn}
            >
              <MagnifyingGlassPlusIcon className="h-6 w-6 text-blue-500" />
            </button>
            <button
              className="bg-white rounded-full p-2 hover:bg-blue-100 focus:outline-none"
              onClick={handleZoomOut}
            >
              <MagnifyingGlassMinusIcon className="h-6 w-6 text-blue-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Neo4jGraph;
