import React, { useState, useCallback, useRef, useEffect } from 'react';
import Experience from './components/Experience';
import GestureController from './components/GestureController';
import { TreeColors, HandGesture } from './types';

const DEFAULT_PHOTOS = [
  'https://images.unsplash.com/photo-1543589077-47d81606c1bf?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1512438248247-f0f2a5a8b7f0?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1544273677-c433136021d4?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1511268011861-691ed210aae8?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1543589923-78e35f728335?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1545641203-7d072a14e3b2?auto=format&fit=crop&w=800&q=80'
];

const App: React.FC = () => {
  const [targetMix, setTargetMix] = useState(0); 
  const [colors, setColors] = useState<TreeColors>({ bottom: '#022b1c', top: '#217a46' });
  const [title, setTitle] = useState("Merry Christmas");
  const inputRef = useRef({ x: 0, y: 0, isDetected: false });
  
  const [userImages, setUserImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [signatureText, setSignatureText] = useState("Best Wishes For You");
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      setIsProcessing(true);
      
      let probeLimit = 20;
      try {
        const configRes = await fetch('./config.json');
        if (configRes.ok) {
          const config = await configRes.json();
          if (config.signatureText) setSignatureText(config.signatureText);
          if (config.treeTitle) setTitle(config.treeTitle);
          if (config.autoProbeCount) probeLimit = config.autoProbeCount;
          if (config.themeColor) setColors(config.themeColor);
        }
      } catch (e) {
        console.log("Using default config.");
      }

      const foundUrls: string[] = [];
      const extensions = ['jpg', 'png', 'jpeg', 'webp'];

      const checkImage = (index: number, ext: string): Promise<string | null> => {
        return new Promise((resolve) => {
          const url = `./photo/${index}.${ext}`;
          const img = new Image();
          img.onload = () => resolve(url);
          img.onerror = () => resolve(null);
          img.src = url;
        });
      };

      for (let i = 1; i <= probeLimit; i++) {
        let foundForIndex = false;
        for (const ext of extensions) {
          const validUrl = await checkImage(i, ext);
          if (validUrl) {
            foundUrls.push(validUrl);
            foundForIndex = true;
            break;
          }
        }
      }

      if (foundUrls.length > 0) {
        setUserImages(foundUrls);
      } else {
        setUserImages(DEFAULT_PHOTOS);
      }

      setTimeout(() => {
        setIsProcessing(false);
        setTimeout(() => setTargetMix(1), 1000);
      }, 1200);
    };

    initApp();
  }, []);

  const handleGesture = useCallback((data: HandGesture) => {
    if (data.isDetected) {
        const newTarget = data.isOpen ? 0 : 1;
        setTargetMix(prev => (prev !== newTarget ? newTarget : prev));
        inputRef.current = { x: data.position.x * 1.2, y: data.position.y, isDetected: true };
    } else {
        inputRef.current.isDetected = false;
    }
  }, []);

  const toggleState = () => setTargetMix(prev => (prev === 1 ? 0 : 1));

  const handleSignatureClick = () => {
      if (userImages.length > 0) {
          setActivePhotoUrl(userImages[Math.floor(Math.random() * userImages.length)]);
      }
      setIsSignatureOpen(true);
  };

  const iconButtonClass = `group relative w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-slate-300 transition-all duration-500 ease-out hover:border-white/60 hover:text-white hover:bg-white/10 hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] active:scale-90 flex justify-center items-center cursor-pointer`;

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none">
      {isProcessing && (
          <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-[#010a05] transition-all duration-1000">
              <div className="relative w-20 h-20 mb-8">
                  <div className="absolute inset-0 border-t-2 border-[#d4af37] rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-[#d4af37] text-2xl font-luxury">✦</div>
              </div>
              <div className="text-center">
                <div className="text-[#d4af37] font-luxury tracking-[0.4em] text-[10px] md:text-xs uppercase animate-pulse">
                    Mounting Static Assets...
                </div>
              </div>
          </div>
      )}

      {/* 顶部唯美标题部分 */}
      <div className={`absolute top-[6%] left-0 w-full flex justify-center pointer-events-none z-30 transition-all duration-1000 ${isSignatureOpen ? 'opacity-0 -translate-y-10' : 'opacity-100 translate-y-0'}`}>
        <h1 className="font-script text-6xl md:text-[9rem] text-center px-4 leading-tight"
            style={{
                background: 'linear-gradient(to bottom, #ffffff 20%, #fef3c7 60%, #d4af37 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                // 柔焦多层扩散效果
                filter: 'drop-shadow(0px 0px 15px rgba(255,255,255,0.3)) drop-shadow(0px 10px 20px rgba(0,0,0,0.5))',
                letterSpacing: '-0.02em'
            }}>
            {title}
        </h1>
      </div>

      <div className={`absolute inset-0 z-10 transition-all duration-1000 ${isSignatureOpen ? 'blur-md scale-95 opacity-40' : 'blur-0 scale-100 opacity-100'}`}>
        <Experience mixFactor={targetMix} colors={colors} inputRef={inputRef} userImages={userImages} signatureText={signatureText} />
      </div>

      {isSignatureOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
              <div className="relative bg-[#fdfdfd] p-6 pb-16 shadow-[0_40px_100px_rgba(0,0,0,0.8)] transform rotate-[-1.5deg]"
                   style={{ width: 'min(90vw, 360px)', boxShadow: '0 0 0 10px rgba(255,255,255,0.1)' }}>
                  <button onClick={() => setIsSignatureOpen(false)}
                          className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-black text-white flex items-center justify-center border-2 border-white hover:bg-white hover:text-black transition-all z-50">×</button>
                  <div className="w-full aspect-[4/5] bg-[#111] overflow-hidden relative shadow-inner mb-6">
                      {activePhotoUrl && <img src={activePhotoUrl} className="w-full h-full object-cover" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>
                  <input autoFocus type="text" placeholder="Sign here..." value={signatureText} onChange={(e) => setSignatureText(e.target.value)}
                         className="w-full text-center bg-transparent border-b border-gray-200 outline-none font-script text-4xl text-[#1a1a1a] placeholder:text-gray-200"
                         maxLength={25} />
                  <div className="absolute bottom-6 left-0 w-full text-center text-[10px] text-gray-400 font-luxury tracking-widest uppercase">Memory Frame Configuration</div>
              </div>
          </div>
      )}

      <div className={`absolute top-6 right-6 md:top-10 md:right-10 z-40 flex flex-row md:flex-col items-center gap-3 md:gap-4 transition-all duration-700 ${isSignatureOpen || isProcessing ? 'translate-x-20 opacity-0' : 'translate-x-0 opacity-100'}`}>
          <button onClick={() => setShowCamera(!showCamera)} className={`${iconButtonClass} ${showCamera ? 'border-white/60 bg-white/10' : ''}`} title="AI Vision Toggle">
              {showCamera ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
              )}
          </button>
          <button onClick={handleSignatureClick} className={iconButtonClass} title="Change Greeting">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </button>
          <button onClick={toggleState} className={iconButtonClass} title="Morph Tree">
            {targetMix === 1 ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
            ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            )}
          </button>
      </div>

      <div className={`absolute bottom-8 left-8 z-20 pointer-events-none transition-opacity duration-1000 ${isSignatureOpen ? 'opacity-0' : 'opacity-100'}`}>
            <div className="flex items-center gap-4">
                <div className="w-12 h-[1px] bg-white/20"></div>
                <div className="text-white/40 text-[9px] uppercase tracking-[0.3em] font-luxury">
                    <span className="text-[#d4af37]">Static Build:</span> Fully Local Experience
                </div>
            </div>
      </div>

      <GestureController onGesture={handleGesture} isGuiVisible={showCamera} />
    </div>
  );
};

export default App;