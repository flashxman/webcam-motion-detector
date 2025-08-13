import { useEffect, useRef, useState } from 'react';

const FaceRecognition = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [savedFaces, setSavedFaces] = useState([]);
  const [faceName, setFaceName] = useState('');
  const [faceDescriptors, setFaceDescriptors] = useState([]);
  const [matchedFace, setMatchedFace] = useState(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoadingStatus('Loading face detection models...');
        
        // In a real implementation, you would load the face-api.js library 
        // and models here using script tags or imports
        
        // Simulate model loading with a timeout
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Models loaded successfully
        setModelLoaded(true);
        setLoadingStatus('Face detection models loaded successfully!');
        
        // Auto-start webcam after models load
        setTimeout(() => {
          startWebcam();
        }, 1000);
      } catch (err) {
        console.error("Error loading models:", err);
        setLoadingStatus('Error loading face detection models.');
        setError("Could not load face detection models. Please try again.");
      }
    };

    loadModels();
    
    return () => {
      // Clean up
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  // Initialize webcam stream
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsActive(true);
        setError(null);
        setTimeout(detectFaces, 1000); // Start face detection after camera initializes
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
      setError("Could not access webcam. Please ensure you've granted permission.");
      setIsActive(false);
    }
  };

  // Stop webcam
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
    setFaceDetected(false);
    setMatchedFace(null);
  };

  // Detect faces function (simulated)
  const detectFaces = async () => {
    if (!videoRef.current || !canvasRef.current || !isActive) {
      requestRef.current = requestAnimationFrame(detectFaces);
      return;
    }
    
    try {
      // In a real implementation, this is where you'd use face-api.js to:
      // 1. Detect faces in the current video frame
      // 2. Extract face descriptors (face signatures)
      // 3. Compare with saved descriptors to find matches
      
      // Simulate face detection with random detection
      const isFaceDetected = Math.random() > 0.3; // 70% chance of "detecting" a face
      setFaceDetected(isFaceDetected);
      
      // If we have saved faces, simulate matching
      if (isFaceDetected && savedFaces.length > 0) {
        // Randomly match with a saved face occasionally
        if (Math.random() > 0.7) {
          const randomIndex = Math.floor(Math.random() * savedFaces.length);
          setMatchedFace(savedFaces[randomIndex]);
        } else {
          setMatchedFace(null);
        }
      } else {
        setMatchedFace(null);
      }
      
      // Draw face rectangle on canvas (just for visual demonstration)
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      if (isFaceDetected) {
        // Draw a simulated face detection rectangle
        const faceWidth = canvas.width * 0.4;
        const faceHeight = canvas.height * 0.6;
        const faceX = (canvas.width - faceWidth) / 2;
        const faceY = (canvas.height - faceHeight) / 2;
        
        ctx.strokeStyle = matchedFace ? 'green' : 'blue';
        ctx.lineWidth = 3;
        ctx.strokeRect(faceX, faceY, faceWidth, faceHeight);
        
        if (matchedFace) {
          ctx.fillStyle = 'green';
          ctx.font = '24px Arial';
          ctx.fillText(matchedFace.name, faceX, faceY - 10);
        }
      }
    } catch (err) {
      console.error("Error in face detection:", err);
    }
    
    // Continue the detection loop
    requestRef.current = requestAnimationFrame(detectFaces);
  };

  // Save current face (in a real app, would save the face descriptor/signature)
  const saveFace = () => {
    if (!faceDetected || !faceName.trim()) return;
    
    // Generate random face descriptor (simulating a real face signature)
    // In a real app, this would come from face-api.js's facial recognition
    const newFaceDescriptor = Array.from({ length: 128 }, () => Math.random() * 2 - 1);
    
    const newFace = {
      id: Date.now().toString(),
      name: faceName.trim(),
      savedAt: new Date().toLocaleString(),
      descriptor: newFaceDescriptor
    };
    
    setSavedFaces(prev => [...prev, newFace]);
    setFaceDescriptors(prev => [...prev, newFaceDescriptor]);
    setFaceName('');
  };

  // Remove a saved face
  const removeFace = (id) => {
    setSavedFaces(prev => prev.filter(face => face.id !== id));
  };

  return (
    <div className="flex flex-col items-center p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Webcam Face Recognition</h1>
      <p className="text-gray-600 mb-6">Detect and save facial signatures</p>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 w-full">
          {error}
        </div>
      )}
      
      {!modelLoaded && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4 w-full">
          {loadingStatus || "Loading models..."}
        </div>
      )}
      
      <div className="flex flex-col md:flex-row gap-6 w-full">
        <div className="flex-1">
          <div className="relative mb-4">
            <canvas 
              ref={canvasRef} 
              className="absolute top-0 left-0 w-full h-full z-10"
            />
            <video 
              ref={videoRef}
              className={`w-full rounded-lg shadow-lg ${faceDetected ? 'border-2 border-blue-500' : ''}`}
              autoPlay 
              playsInline
            />
            
            {faceDetected && !matchedFace && (
              <div className="absolute top-2 right-2 bg-blue-500 text-white px-3 py-1 rounded-full z-20">
                Face Detected
              </div>
            )}
            
            {matchedFace && (
              <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full z-20">
                Match: {matchedFace.name}
              </div>
            )}
          </div>
          
          <div className="flex gap-2 mb-4">
            <button
              className={`px-4 py-2 rounded-lg font-medium ${isActive 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'}`}
              onClick={isActive ? stopWebcam : startWebcam}
              disabled={!modelLoaded}
            >
              {isActive ? 'Stop Camera' : 'Start Camera'}
            </button>
            
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                placeholder="Enter name for this face"
                value={faceName}
                onChange={(e) => setFaceName(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg"
                disabled={!faceDetected || !isActive}
              />
              <button
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={saveFace}
                disabled={!faceDetected || !faceName.trim() || !isActive}
              >
                Save Face
              </button>
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            <h2 className="font-medium mb-1">How it works:</h2>
            <p className="mb-2">This demonstration simulates face detection and recognition. In a real implementation, you would:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use TensorFlow.js and Face-API.js for accurate face detection</li>
              <li>Generate face descriptors (128-dimensional vectors that serve as face signatures)</li>
              <li>Store these descriptors in a database for later comparison</li>
              <li>Compare new faces against stored signatures for identification</li>
            </ul>
          </div>
        </div>
        
        <div className="md:w-80">
          <div className="bg-gray-100 rounded-lg p-4 h-full">
            <h2 className="font-bold text-lg mb-3">Saved Faces ({savedFaces.length})</h2>
            
            {savedFaces.length === 0 ? (
              <p className="text-gray-500 text-sm">No faces saved yet. Detect a face and save it with a name.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {savedFaces.map(face => (
                  <div key={face.id} className="bg-white p-3 rounded shadow-sm flex justify-between items-center">
                    <div>
                      <div className="font-medium">{face.name}</div>
                      <div className="text-xs text-gray-500">{face.savedAt}</div>
                    </div>
                    <button 
                      className="text-red-500 hover:text-red-700"
                      onClick={() => removeFace(face.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceRecognition;