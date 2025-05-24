import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { SpeechDetection } from "@/utils/speechDetection";
import TargetSelector from "@/components/TargetSelector";
import CompletionAlert from "@/components/CompletionAlert";
import { Mic, MicOff, Volume, Volume2, VolumeX } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { getLifetimeCount, getTodayCount, updateMantraCounts } from "@/utils/indexedDBUtils";

const MantraCounter: React.FC = () => {
  const [targetCount, setTargetCount] = useState<number | null>(null);
  const [currentCount, setCurrentCount] = useState<number>(0);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [micPermission, setMicPermission] = useState<boolean | null>(null);
  const [showCompletionAlert, setShowCompletionAlert] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [sensitivityLevel, setSensitivityLevel] = useState<number>(2); // Start with ultra sensitivity
  const [lifetimeCount, setLifetimeCount] = useState<number>(0);
  const [todayCount, setTodayCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const speechDetection = useRef<SpeechDetection | null>(null);
  const lastCountTime = useRef<number>(0);

  useEffect(() => {
    const loadCounts = async () => {
      try {
        setIsLoading(true);
        const lifetime = await getLifetimeCount();
        const today = await getTodayCount();
        
        setLifetimeCount(lifetime);
        setTodayCount(today);
      } catch (error) {
        console.error("Error loading counts:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCounts();
  }, []);

  useEffect(() => {
    if (targetCount !== null && currentCount >= targetCount && targetCount > 0) {
      handleCompletion();
    }
  }, [currentCount, targetCount]);

  const handleCompletion = () => {
    if (isListening) {
      stopListening();
    }
    setShowCompletionAlert(true);
  };

  const handleSelectTarget = (target: number) => {
    setTargetCount(target);
    setCurrentCount(0);
    setShowCompletionAlert(false);
  };

  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicPermission(true);
      toast.success("🎤 Microphone access granted - Ready for ultra-sensitive voice detection");
      return true;
    } catch (error) {
      console.error("Error requesting microphone permission:", error);
      setMicPermission(false);
      toast.error("❌ Microphone access denied. Please enable microphone access in your browser settings.");
      return false;
    }
  };

  const startListening = async () => {
    if (!micPermission) {
      const granted = await requestMicPermission();
      if (!granted) return;
    }
    
    // Ultra-sensitive settings for all sensitivity levels
    const minDecibelsSettings = [-60, -75, -90]; // All very sensitive
    
    if (!speechDetection.current) {
      speechDetection.current = new SpeechDetection({
        onSpeechDetected: () => {
          setAudioLevel(100); // Full visual feedback
          console.log("🎤 Voice detected - preparing to count!");
        },
        onSpeechEnded: () => {
          const now = Date.now();
          // Prevent double counting with 500ms cooldown
          if (now - lastCountTime.current > 500) {
            setCurrentCount(count => {
              const newCount = count + 1;
              
              // Update counts in IndexedDB
              updateMantraCounts(1).then(({ lifetimeCount: newLifetime, todayCount: newToday }) => {
                setLifetimeCount(newLifetime);
                setTodayCount(newToday);
              }).catch(console.error);
              
              toast.success(`🕉️ Mantra counted: ${newCount}`, {
                duration: 2000,
                style: { background: '#262626', color: '#fcd34d' },
              });
              
              return newCount;
            });
            
            lastCountTime.current = now;
            console.log("📿 Mantra successfully counted!");
          }
          setAudioLevel(0); // Reset visual feedback
        },
        minDecibels: minDecibelsSettings[sensitivityLevel]
      });
    }
    
    const started = await speechDetection.current.start();
    if (started) {
      setIsListening(true);
      lastCountTime.current = Date.now();
      toast.success(`🎧 Ultra-sensitive listening started - even whispers will be detected!`, {
        style: { background: '#262626', color: '#fcd34d' }
      });
    } else {
      toast.error("❌ Failed to start listening. Please check microphone permissions.", {
        style: { background: '#262626', color: '#fcd34d' }
      });
    }
  };

  const getSensitivityLabel = () => {
    const labels = ["Normal", "High", "Ultra"];
    return labels[sensitivityLevel];
  };

  const toggleSensitivity = () => {
    const wasListening = isListening;
    if (wasListening) {
      stopListening();
    }
    
    setSensitivityLevel((prev) => (prev + 1) % 3);
    
    if (wasListening) {
      setTimeout(() => {
        startListening();
      }, 500);
    }
    
    const newLevel = (sensitivityLevel + 1) % 3;
    const labels = ["Normal", "High", "Ultra"];
    toast.info(`🔊 Sensitivity: ${labels[newLevel]} - Detecting ${newLevel === 2 ? 'whispers' : newLevel === 1 ? 'quiet voices' : 'normal voices'}`, {
      style: { background: '#262626', color: '#fcd34d' }
    });
  };

  const stopListening = () => {
    if (speechDetection.current) {
      speechDetection.current.stop();
      speechDetection.current = null;
    }
    setIsListening(false);
    setAudioLevel(0);
    toast.info("🔇 Stopped listening", {
      style: { background: '#262626', color: '#fcd34d' }
    });
  };

  const toggleListening = async () => {
    if (isListening) {
      stopListening();
    } else if (targetCount !== null) {
      startListening();
    }
  };

  const resetCounter = () => {
    if (isListening) {
      stopListening();
    }
    setCurrentCount(0);
    setShowCompletionAlert(false);
    toast.info("Counter reset", {
      style: { background: '#262626', color: '#fcd34d' }
    });
  };

  const handleReset = () => {
    resetCounter();
    setTargetCount(null);
  };

  const progressPercentage = targetCount ? (currentCount / targetCount) * 100 : 0;

  const getSensitivityIcon = () => {
    if (sensitivityLevel === 0) return <Volume className="w-5 h-5" />;
    if (sensitivityLevel === 1) return <Volume2 className="w-5 h-5" />;
    return <VolumeX className="w-5 h-5" />; // Ultra sensitive
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto px-4 py-12">
        <div className="text-amber-400 text-lg mb-4">Loading your spiritual journey...</div>
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (targetCount === null) {
    return <TargetSelector onSelectTarget={handleSelectTarget} />;
  }

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto px-4">
      <div className="mb-4 text-center w-full">
        <div className="text-amber-400 text-lg">{currentCount} / {targetCount}</div>
        <div className="text-sm text-gray-400">{Math.round(progressPercentage)}% complete</div>
      </div>
      
      <div className="stats w-full flex gap-4 mb-6">
        <div className="stat flex-1 bg-zinc-800/80 rounded-lg p-3 text-center">
          <h3 className="text-xs text-gray-400">Lifetime</h3>
          <p className="text-lg font-bold text-amber-400">{lifetimeCount}</p>
        </div>
        
        <div className="stat flex-1 bg-zinc-800/80 rounded-lg p-3 text-center">
          <h3 className="text-xs text-gray-400">Today</h3>
          <p className="text-lg font-bold text-amber-400">{todayCount}</p>
        </div>
      </div>
      
      {/* Advertisement placeholder */}
      <div className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 mb-6">
        <p className="text-center text-gray-400 text-sm">Advertisement</p>
        <p className="text-center text-gray-500 text-xs">Place your ad here</p>
      </div>
      
      <div className="counter-display relative mb-10">
        {/* Gold circle */}
        <div className="relative">
          <div className="w-48 h-48 rounded-full bg-amber-500 flex items-center justify-center">
            <div className="text-white text-5xl font-bold">
              {/* Om symbol and counter */}
              <div className="text-3xl mb-2">ॐ</div>
              <div>{currentCount}</div>
            </div>
          </div>
          
          {/* Enhanced listening indicator */}
          {isListening && (
            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-1">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-1.5 rounded-full transition-all duration-150 ${
                    audioLevel > i * 20 ? 'bg-white animate-pulse' : 'bg-amber-700'
                  }`} 
                  style={{ height: `${Math.min(8 + (i * 3), 20) + (audioLevel > i * 20 ? 6 : 0)}px` }}
                />
              ))}
            </div>
          )}
        </div>
        
        <button 
          onClick={toggleListening}
          className={`absolute -bottom-5 left-1/2 transform -translate-x-1/2 flex items-center justify-center w-16 h-16 rounded-full shadow-lg ${
            isListening ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-amber-500 hover:bg-amber-600'
          } text-black transition-all duration-300`}
        >
          {isListening ? (
            <MicOff className="w-7 h-7" />
          ) : (
            <Mic className="w-7 h-7" />
          )}
        </button>
      </div>
      
      <div className="text-center mb-5">
        <p className="text-gray-300">
          {isListening 
            ? "🎤 Listening actively - Speak your mantra at ANY volume!"
            : "Press the microphone button to start ultra-sensitive voice detection"}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {isListening
            ? "अल्ट्रा संवेदनशील सुनना - किसी भी आवाज़ में मंत्र बोलें!"
            : "अति संवेदनशील आवाज़ पहचान शुरू करने के लिए माइक्रोफोन दबाएं"}
        </p>
      </div>
      
      <button
        onClick={toggleSensitivity}
        className="flex items-center justify-center gap-2 mb-5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-full text-sm font-medium text-amber-400 transition-colors"
      >
        {getSensitivityIcon()}
        <span>Sensitivity: {getSensitivityLabel()}</span>
      </button>
      
      <div className="flex gap-4">
        <Button 
          variant="outline" 
          className="bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700"
          onClick={resetCounter}
        >
          Reset Count
        </Button>
        <Button 
          variant="outline" 
          className="bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700"
          onClick={handleReset}
        >
          Change Target
        </Button>
      </div>

      <CompletionAlert 
        isOpen={showCompletionAlert} 
        targetCount={targetCount} 
        onClose={() => setShowCompletionAlert(false)} 
      />
    </div>
  );
};

export default MantraCounter;
