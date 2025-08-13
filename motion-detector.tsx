import { useEffect, useRef, useState } from 'react';

const MotionDetector = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const previousFrameRef = useRef(null);
  
  const [motionDetected, setMotionDetected] = useState(false);
  const [sensitivity, setSensitivity] = useState(20);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState(null);

  // Initialize webcam stream
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsActive(true);
        setError(null);
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
      setError("Could not access webcam. Please ensure you've granted permission.");
      setIsActive(false);
    }
  };

  // Stop webcam and motion detection
  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    
    setIsActive(false);
    setMotionDetected(false);
  };

  // Compare frames to detect motion
  const detectMotion = () => {
    if (!canvasRef.current || !videoRef.current || !isActive) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    // Only proceed if video dimensions are valid
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      requestRef.current = requestAnimationFrame(detectMotion);
      return;
    }
    
    const context = canvas.getContext('2d', { willReadFrequently: true });
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    try {
      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get current frame data
      const currentFrame = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // If we have a previous frame, compare them
      if (previousFrameRef.current && 
          previousFrameRef.current.data && 
          previousFrameRef.current.width === currentFrame.width && 
          previousFrameRef.current.height === currentFrame.height) {
        
        const currentData = currentFrame.data;
        const previousData = previousFrameRef.current.data;
        
        // Make sure the arrays are the same length
        if (currentData.length === previousData.length) {
          let motionPixels = 0;
          const dataLength = Math.min(currentData.length, previousData.length);
          
          // Compare pixels (only checking every 4th pixel for performance)
          // Each pixel has 4 values (R,G,B,A), so we step by 16 to check every 4th pixel
          for (let i = 0; i < dataLength - 3; i += 16) {
            // Calculate difference in RGB values
            const rdiff = Math.abs(currentData[i] - previousData[i]);
            const gdiff = Math.abs(currentData[i+1] - previousData[i+1]);
            const bdiff = Math.abs(currentData[i+2] - previousData[i+2]);
            
            // If the difference exceeds the sensitivity threshold, count as motion
            if (rdiff > sensitivity || gdiff > sensitivity || bdiff > sensitivity) {
              motionPixels++;
            }
          }
          
          // Determine if enough pixels changed to consider it motion
          // The threshold is based on a percentage of total pixels
          const totalSampledPixels = dataLength / 16;
          const motionThreshold = totalSampledPixels * 0.01; // 1% of sampled pixels
          
          setMotionDetected(motionPixels > motionThreshold);
        }
      }
      
      // Store current frame for next comparison
      previousFrameRef.current = currentFrame;
    } catch (err) {
      console.error("Error in motion detection:", err);
    }
    
    // Continue the detection loop
    requestRef.current = requestAnimationFrame(detectMotion);
  };

  // Start motion detection when webcam is active
  useEffect(() => {
    if (isActive) {
      requestRef.current = requestAnimationFrame(detectMotion);
    }
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isActive, sensitivity]);

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  return (
    <div className="flex flex-col items-center p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Webcam Motion Detector</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 w-full">
          {error}
        </div>
      )}
      
      <div className="relative mb-6 w-full">
        <video 
          ref={videoRef}
          className={`w-full rounded-lg shadow-lg ${motionDetected ? 'border-4 border-red-500' : ''}`}
          autoPlay 
          playsInline
        />
        
        {motionDetected && (
          <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full animate-pulse">
            Motion Detected!
          </div>
        )}
        
        <canvas ref={canvasRef} className="hidden" />
      </div>
      
      <div className="flex flex-col md:flex-row items-center gap-4 w-full">
        <button
          className={`px-6 py-2 rounded-lg font-medium ${isActive 
            ? 'bg-red-500 hover:bg-red-600 text-white' 
            : 'bg-green-500 hover:bg-green-600 text-white'}`}
          onClick={isActive ? stopWebcam : startWebcam}
        >
          {isActive ? 'Stop Camera' : 'Start Camera'}
        </button>
        
        <div className="flex items-center gap-2 flex-1">
          <span className="whitespace-nowrap">Sensitivity:</span>
          <input
            type="range"
            min="5"
            max="50"
            value={sensitivity}
            onChange={(e) => setSensitivity(Number(e.target.value))}
            className="w-full"
          />
          <span className="w-6 text-center">{sensitivity}</span>
        </div>
      </div>
      
      <div className="mt-6 text-sm text-gray-600 w-full">
        <h2 className="font-medium mb-2">How it works:</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Click "Start Camera" to activate your webcam</li>
          <li>The app compares consecutive video frames to detect movement</li>
          <li>Adjust sensitivity slider to make motion detection more or less sensitive</li>
          <li>When motion is detected, the video frame will highlight with a red border</li>
        </ul>
      </div>
    </div>
  );
};

export default MotionDetector;
