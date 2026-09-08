import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Line } from '@react-three/drei';
import * as THREE from 'three';

interface Node {
    id: string;
    risk_status: string;
    is_flagged: boolean;
}

interface Link {
    source: string;
    target: string;
    amount: number;
    is_flagged: boolean;
}

interface EngineGridCanvasProps {
    data: { nodes: Node[], links: Link[] } | null;
}

const ThreatNetwork = ({ data }: { data: { nodes: Node[], links: Link[] } }) => {
    const groupRef = useRef<THREE.Group>(null);
    
    // Compute positions for nodes (simple random spherical distribution for visualization)
    const nodePositions = useMemo(() => {
        const positions: Record<string, THREE.Vector3> = {};
        if (!data || !data.nodes) return positions;
        
        data.nodes.forEach(node => {
            // Assign random position in a sphere
            const radius = 10 + Math.random() * 5;
            const theta = Math.random() * 2 * Math.PI;
            const phi = Math.acos((Math.random() * 2) - 1);
            
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            
            positions[node.id] = new THREE.Vector3(x, y, z);
        });
        
        return positions;
    }, [data]);

    // Animate subtle rotation
    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = state.clock.elapsedTime * 0.05;
        }
    });

    if (!data || !data.nodes || data.nodes.length === 0) {
        return null;
    }

    return (
        <group ref={groupRef}>
            {/* Draw Links */}
            {data.links.map((link, i) => {
                const start = nodePositions[link.source];
                const end = nodePositions[link.target];
                if (!start || !end) return null;

                const points = [start, end];
                const color = link.is_flagged ? '#FF4F00' : '#475569';
                const opacity = link.is_flagged ? 0.8 : 0.2;

                return (
                    <Line 
                        key={`link-${i}`}
                        points={points}
                        color={color}
                        lineWidth={link.is_flagged ? 2 : 1}
                        transparent
                        opacity={opacity}
                    />
                );
            })}

            {/* Draw Nodes */}
            {data.nodes.map((node) => {
                const pos = nodePositions[node.id];
                if (!pos) return null;
                
                const isFlagged = node.is_flagged;
                const color = isFlagged ? '#FF4F00' : '#006C67';
                const size = isFlagged ? 0.4 : 0.15;

                return (
                    <mesh key={node.id} position={pos}>
                        <sphereGeometry args={[size, 16, 16]} />
                        <meshStandardMaterial 
                            color={color} 
                            emissive={color} 
                            emissiveIntensity={isFlagged ? 2 : 0.5} 
                            toneMapped={false} 
                        />
                    </mesh>
                );
            })}
        </group>
    );
};

const EngineGridCanvas = ({ data }: EngineGridCanvasProps) => {
    return (
        <div className="w-full h-full bg-[#121212] rounded-xl overflow-hidden relative border border-white/10 shadow-inner">
            <div className="absolute top-4 left-4 z-10">
                <div className="flex items-center space-x-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-[#006C67] animate-pulse"></div>
                    <span className="text-white text-xs font-mono tracking-widest uppercase">Live Network Topology</span>
                </div>
            </div>
            
            <Canvas camera={{ position: [0, 0, 25], fov: 60 }}>
                <color attach="background" args={['#0a0a0a']} />
                <ambientLight intensity={0.2} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                {data && <ThreatNetwork data={data} />}
                <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} autoRotate autoRotateSpeed={0.5} />
            </Canvas>
            
            <div className="absolute bottom-4 right-4 z-10 flex space-x-4">
                <div className="flex items-center space-x-2 bg-black/50 backdrop-blur-md px-3 py-1 rounded border border-white/10">
                    <div className="w-3 h-3 rounded-full bg-[#006C67]"></div>
                    <span className="text-white font-mono text-xs">Clean Node</span>
                </div>
                <div className="flex items-center space-x-2 bg-black/50 backdrop-blur-md px-3 py-1 rounded border border-white/10">
                    <div className="w-3 h-3 rounded-full bg-[#FF4F00] animate-pulse shadow-[0_0_10px_#FF4F00]"></div>
                    <span className="text-white font-mono text-xs">Anomalous Cluster</span>
                </div>
            </div>
        </div>
    );
};

export default EngineGridCanvas;
