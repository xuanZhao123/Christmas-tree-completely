
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import * as handpose from '@tensorflow-models/handpose';

interface GestureControllerProps {
  onGesture: (data: { isOpen: boolean; position: { x: number; y: number }, isDetected: boolean }) => void;
  isGuiVisible: boolean;
}

const GestureController: React.FC<GestureControllerProps> = ({ onGesture, isGuiVisible }) => {
  const webcamRef = useRef<Webcam>(null);
  const [model, setModel] = useState<handpose.HandPose | null>(null);
  const [loading, setLoading] = useState(true);
  const [cameraError, setCameraError] = useState(false);
  const [debugState, setDebugState] = useState<string>("Initializing...");
  
  const onGestureRef = useRef(onGesture);
  useEffect(() => { onGestureRef.current = onGesture; }, [onGesture]);

  const lastDetectionTime = useRef(0);
  const ratioHistory = useRef<number[]>([]);
  const posHistory = useRef<{x:number, y:number}[]>([]);
  const isCurrentlyOpen = useRef<boolean>(false);
  const missedFrames = useRef(0);

  useEffect(() => {
    let isMounted = true;
    const loadModel = async () => {
      try {
        await tf.ready();
        // 如果无法连接 GPU，回退到 CPU
        if (tf.getBackend() === 'webgl') {
            console.log("AI Engine: WebGL accelerated");
        }
        
        const net = await handpose.load();
        if (isMounted) {
          setModel(net);
          setLoading(false);
          setDebugState("Ready");
        }
      } catch (err) {
        console.warn("AI Engine failed to load, falling back to manual controls.");
        if (isMounted) {
          setLoading(false);
          setCameraError(true);
        }
      }
    };
    loadModel();
    return () => { isMounted = false; };
  }, []);

  const runDetection = useCallback(async () => {
    if (model && webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
      const now = Date.now();
      if (now - lastDetectionTime.current < 80) { // ~12 FPS 足够了，省点性能
        requestAnimationFrame(runDetection);
        return;
      }
      lastDetectionTime.current = now;

      try {
        const predictions = await model.estimateHands(webcamRef.current.video);
        if (predictions.length > 0) {
          missedFrames.current = 0;
          const hand = predictions[0];
          const landmarks = hand.landmarks;
          const wrist = landmarks[0];

          // 位置计算
          const video = webcamRef.current.video;
          const x = -1 * ((wrist[0] / video.videoWidth) * 2 - 1); 
          const y = -1 * ((wrist[1] / video.videoHeight) * 2 - 1);
          
          // 姿态判定: 指尖距离 vs 掌心距离
          const getDist = (p1: number[], p2: number[]) => Math.sqrt(Math.pow(p1[0]-p2[0],2) + Math.pow(p1[1]-p2[1],2));
          let tipDist = 0;
          [8, 12, 16, 20].forEach(i => tipDist += getDist(wrist, landmarks[i]));
          let baseDist = 0;
          [5, 9, 13, 17].forEach(i => baseDist += getDist(wrist, landmarks[i]));
          
          const ratio = tipDist / (baseDist || 1);
          ratioHistory.current.push(ratio);
          if (ratioHistory.current.length > 5) ratioHistory.current.shift();
          const smoothRatio = ratioHistory.current.reduce((a,b)=>a+b,0) / ratioHistory.current.length;

          if (!isCurrentlyOpen.current && smoothRatio > 1.6) isCurrentlyOpen.current = true;
          else if (isCurrentlyOpen.current && smoothRatio < 1.2) isCurrentlyOpen.current = false;

          setDebugState(isCurrentlyOpen.current ? "HAND OPEN" : "HAND CLOSED");
          onGestureRef.current({ isOpen: isCurrentlyOpen.current, position: { x, y }, isDetected: true });
        } else {
          missedFrames.current++;
          if (missedFrames.current > 10) {
              setDebugState("SEARCHING...");
              onGestureRef.current({ isOpen: false, position: {x:0, y:0}, isDetected: false });
          }
        }
      } catch (e) { /* ignore */ }
    }
    requestAnimationFrame(runDetection);
  }, [model]);

  useEffect(() => {
    if (model && !loading && !cameraError) {
      const timer = requestAnimationFrame(runDetection);
      return () => cancelAnimationFrame(timer);
    }
  }, [model, loading, cameraError, runDetection]);

  const panelClass = `fixed bottom-6 right-6 z-50 transition-all duration-700 ease-out ${isGuiVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`;

  return (
    <div className={panelClass}>
      <div className="w-32 h-44 md:w-48 md:h-44 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 overflow-hidden shadow-2xl flex flex-col">
          <div className="flex-1 relative bg-gradient-to-br from-white/5 to-transparent">
              {cameraError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                      <div className="text-white/20 text-xs mb-2">未检测到摄像头</div>
                      <div className="text-[#d4af37] text-[10px] font-luxury uppercase tracking-widest leading-relaxed">
                          已开启鼠标模式<br/>请拖拽旋转树体
                      </div>
                  </div>
              ) : (
                  <Webcam
                      ref={webcamRef}
                      mirrored
                      videoConstraints={{ facingMode: "user" }}
                      className={`w-full h-full object-cover transition-opacity duration-1000 ${loading ? 'opacity-0' : 'opacity-60'}`}
                      onUserMediaError={() => setCameraError(true)}
                  />
              )}
              {loading && !cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin"></div>
                  </div>
              )}
          </div>
          
          <div className="h-10 px-4 flex items-center justify-between border-t border-white/5">
              <span className="text-[8px] font-luxury text-white/30 uppercase tracking-widest">Vision</span>
              <span className={`text-[10px] font-mono font-bold ${debugState.includes("OPEN") ? "text-white" : "text-[#d4af37]"}`}>
                  {cameraError ? "MOUSE" : debugState}
              </span>
          </div>
      </div>
    </div>
  );
};

export default GestureController;
