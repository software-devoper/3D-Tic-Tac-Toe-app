import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";

function Piece({ symbol, position }) {
  const group = useRef();

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.scale.lerp(new THREE.Vector3(1, 1, 1), Math.min(1, delta * 6));
    group.current.rotation.y += delta * 0.6;
  });

  return (
    <group ref={group} position={position} scale={[0.1, 0.1, 0.1]}>
      {symbol === "X" ? (
        <>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.9, 0.2, 0.2]} />
            <meshStandardMaterial color="#06b6d4" metalness={0.4} roughness={0.25} />
          </mesh>
          <mesh rotation={[0, 0, -Math.PI / 4]}>
            <boxGeometry args={[0.9, 0.2, 0.2]} />
            <meshStandardMaterial color="#06b6d4" metalness={0.4} roughness={0.25} />
          </mesh>
        </>
      ) : (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.45, 0.12, 16, 32]} />
          <meshStandardMaterial color="#f97316" metalness={0.3} roughness={0.35} />
        </mesh>
      )}
    </group>
  );
}

function Cell({ index, position, value, onSelect, disabled, highlighted }) {
  return (
    <group position={position}>
      <RoundedBox
        args={[1, 0.18, 1]}
        radius={0.08}
        smoothness={4}
        onClick={() => !disabled && onSelect(index)}
      >
        <meshStandardMaterial
          color={highlighted ? "#22d3ee" : "#1e293b"}
          metalness={0.2}
          roughness={0.55}
          emissive={highlighted ? "#0e7490" : "#000000"}
          emissiveIntensity={highlighted ? 0.6 : 0}
        />
      </RoundedBox>
      {value ? <Piece symbol={value} position={[0, 0.2, 0]} /> : null}
      <Text position={[0, 0.12, 0]} fontSize={0.14} color="#64748b">
        {index + 1}
      </Text>
    </group>
  );
}

function BoardScene({ board, onSelect, disabled, winLine, idle }) {
  const coords = useMemo(
    () => [
      [-1.2, 0, -1.2],
      [0, 0, -1.2],
      [1.2, 0, -1.2],
      [-1.2, 0, 0],
      [0, 0, 0],
      [1.2, 0, 0],
      [-1.2, 0, 1.2],
      [0, 0, 1.2],
      [1.2, 0, 1.2]
    ],
    []
  );

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 6, 5]} intensity={1.6} />
      <pointLight position={[-4, 4, -3]} intensity={0.8} color="#22d3ee" />
      <mesh position={[0, -0.22, 0]}>
        <cylinderGeometry args={[2.6, 2.8, 0.2, 48]} />
        <meshStandardMaterial color="#0b1120" />
      </mesh>
      {coords.map((pos, index) => (
        <Cell
          key={index}
          index={index}
          position={pos}
          value={board[index]}
          onSelect={onSelect}
          disabled={disabled || Boolean(board[index])}
          highlighted={Array.isArray(winLine) && winLine.includes(index)}
        />
      ))}
      <OrbitControls
        enablePan={false}
        minDistance={6}
        maxDistance={10}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2}
        autoRotate={idle}
        autoRotateSpeed={0.8}
      />
    </>
  );
}

export default function Board({ board, onSelect, disabled = false, winLine = null, idle = false }) {
  return (
    <div className="h-[360px] sm:h-[460px] w-full glass overflow-hidden">
      <Canvas camera={{ position: [0, 5.4, 6.6], fov: 45 }}>
        <BoardScene board={board} onSelect={onSelect} disabled={disabled} winLine={winLine} idle={idle} />
      </Canvas>
    </div>
  );
}
