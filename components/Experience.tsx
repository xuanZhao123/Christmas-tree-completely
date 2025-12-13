// Fix: Bypassing JSX intrinsic element type errors for Three.js tags in R3F environment
// @ts-nocheck
import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import Foliage from './Foliage';
import Ornaments from './Ornaments';
import SpiralLights from './SpiralLights';
import Snow from './Snow';
import TopStar from './TopStar';
import { TreeColors } from '../types';

interface ExperienceProps {
  mixFactor: number;
  colors: TreeColors;
  inputRef: React.MutableRefObject<{ x: number; y: number; isDetected?: boolean }>;
  userImages?: string[];
  signatureText?: string;
}

const BALL_COLORS = ['#8B0000', '#D32F2F', '#1B5E20', '#D4AF37', '#C0C0C0', '#191970']; 
const BOX_COLORS = ['#800000', '#1B5E20', '#D4AF37', '#FFFFFF', '#4B0082', '#2F4F4F', '#008080', '#8B4513', '#DC143C'];
const STAR_COLORS = ['#FFD700', '#FDB931']; 
const CRYSTAL_COLORS = ['#F0F8FF', '#E0FFFF', '#B0E0E6']; 
const CANDY_COLORS = ['#FFFFFF']; 

const SceneController: React.FC<{ 
    inputRef: React.MutableRefObject<{ x: number; y: number; isDetected?: boolean }>; 
    groupRef: React.RefObject<THREE.Group>; 
}> = ({ inputRef, groupRef }) => {
    const { camera, gl } = useThree();
    const vec = useMemo(() => new THREE.Vector3(), []);
    const zoomTarget = useRef(32); 
    const isDragging = useRef(false);
    const lastPointerX = useRef(0);
    const rotationVelocity = useRef(0.002);
    const wasDetected = useRef(false);
    const grabOffset = useRef(0);
    const currentInput = useRef({ x: 0, y: 0 }); 

    useEffect(() => {
        const canvas = gl.domElement;
        canvas.style.touchAction = 'none';
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            zoomTarget.current += e.deltaY * 0.02;
            zoomTarget.current = THREE.MathUtils.clamp(zoomTarget.current, 12, 55);
        };
        const onPointerDown = (e: PointerEvent) => {
            if (e.isPrimary && e.button === 0) { 
                isDragging.current = true;
                lastPointerX.current = e.clientX;
                canvas.setPointerCapture(e.pointerId);
                rotationVelocity.current = 0;
            }
        };
        const onPointerUp = (e: PointerEvent) => {
            if (e.isPrimary) {
                isDragging.current = false;
                canvas.releasePointerCapture(e.pointerId);
            }
        };
        const onPointerMove = (e: PointerEvent) => {
            if (e.isPrimary && isDragging.current && groupRef.current) {
                const deltaX = e.clientX - lastPointerX.current;
                lastPointerX.current = e.clientX;
                const rotationAmount = deltaX * 0.005;
                groupRef.current.rotation.y += rotationAmount;
                rotationVelocity.current = rotationAmount;
            }
        };
        canvas.addEventListener('wheel', onWheel, { passive: false });
        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointermove', onPointerMove);
        return () => {
            canvas.removeEventListener('wheel', onWheel);
            canvas.removeEventListener('pointerdown', onPointerDown);
            canvas.removeEventListener('pointerup', onPointerUp);
            canvas.removeEventListener('pointermove', onPointerMove);
        };
    }, [gl, groupRef]);

    useFrame((state, delta) => {
        const safeDelta = Math.min(delta, 0.1);
        const targetX = inputRef.current.x;
        const targetY = inputRef.current.y;
        const isHandDetected = !!inputRef.current.isDetected;
        const inputSmoothing = 4.0 * safeDelta;
        currentInput.current.x = THREE.MathUtils.lerp(currentInput.current.x, targetX, inputSmoothing);
        currentInput.current.y = THREE.MathUtils.lerp(currentInput.current.y, targetY, inputSmoothing);

        const camX = currentInput.current.x * 4; 
        const camY = currentInput.current.y * 2; 
        const camZ = zoomTarget.current + Math.abs(currentInput.current.x) * 2; 
        camera.position.lerp(vec.set(camX, camY, camZ), 4.0 * safeDelta);
        camera.lookAt(0, 0, 0);

        if (groupRef.current) {
            if (isHandDetected) {
                const targetHandRotation = currentInput.current.x * Math.PI * 1.2;
                if (!wasDetected.current) {
                    grabOffset.current = groupRef.current.rotation.y - targetHandRotation;
                    rotationVelocity.current = 0;
                }
                groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetHandRotation + grabOffset.current, 6.0 * safeDelta);
                wasDetected.current = true;
            } else {
                wasDetected.current = false;
                if (!isDragging.current) {
                    groupRef.current.rotation.y += rotationVelocity.current;
                    rotationVelocity.current = THREE.MathUtils.lerp(rotationVelocity.current, 0.002, safeDelta * 0.5);
                }
            }
        }
    });
    return null;
};

const SceneContent: React.FC<ExperienceProps> = ({ mixFactor, colors, inputRef, userImages, signatureText }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  return (
    <>
      <SceneController inputRef={inputRef} groupRef={groupRef} />
      
      {/* 提升 AmbientLight 亮度：即使 HDR 资源全加载失败（EdgeOne 警告），树也不会黑屏 */}
      <ambientLight intensity={1.2} />
      <pointLight position={[10, 10, 10]} intensity={4.0} color="#fff5e0" />
      <directionalLight position={[-10, 10, 5]} intensity={2.0} color="#ffffff" />
      
      {/* 适配 EdgeOne Pages：去掉路径前的 "./" 以适应根目录部署 */}
      <Environment files="hdri/potsdamer_platz_1k.hdr" background={false} />
      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
      <Snow mixFactor={mixFactor} />
      
      <group ref={groupRef}>
        <TopStar mixFactor={mixFactor} />
        <Foliage mixFactor={mixFactor} colors={colors} />
        <SpiralLights mixFactor={mixFactor} />
        <Ornaments mixFactor={mixFactor} type="BALL" count={60} scale={0.5} colors={BALL_COLORS} />
        <Ornaments mixFactor={mixFactor} type="BOX" count={30} scale={0.6} colors={BOX_COLORS} />
        <Ornaments mixFactor={mixFactor} type="STAR" count={25} scale={0.5} colors={STAR_COLORS} />
        <Ornaments mixFactor={mixFactor} type="CRYSTAL" count={40} scale={0.4} colors={CRYSTAL_COLORS} />
        <Ornaments mixFactor={mixFactor} type="CANDY" count={40} scale={0.8} colors={CANDY_COLORS} />
        <Ornaments mixFactor={mixFactor} type="PHOTO" count={userImages?.length || 10} userImages={userImages} signatureText={signatureText} />
      </group>

      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={0.9} mipmapBlur intensity={1.0} radius={0.5} />
        <Vignette offset={0.1} darkness={1.1} />
      </EffectComposer>
    </>
  );
};

const Experience: React.FC<ExperienceProps> = (props) => {
  return (
    <Canvas
      dpr={[1, 1.5]} 
      camera={{ position: [0, 0, 32], fov: 45, near: 1, far: 200 }}
      gl={{ 
        antialias: true, 
        toneMapping: THREE.ACESFilmicToneMapping, 
        outputColorSpace: THREE.SRGBColorSpace 
      }}
      style={{ touchAction: 'none' }}
    >
      <SceneContent {...props} />
    </Canvas>
  );
};

export default Experience;