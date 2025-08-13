import { useEffect, useRef, useState } from 'react';
import * as tf from 'tensorflow';

const FaceRecognition = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [error, setError] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceName, setFaceName] = useState('');
  const [savedFaces, setSavedFaces] = useState([]);
  const [matchedFace, setMatchedFace] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const modelRef = useRef(null);
  
  // Load TensorFlow model
  useEffect(() => {
    const loadModel = async () => {
      setLoadingStatus('Loading face detection model...');
      try {
        // In a real implementation, we would load a pre-trained model
        // Since we can't load external models in this environment, we'll simulate it
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Simulate model loading
        modelRef.current = {
          name: 'FaceDetectionModel',
          loaded: true
        };
        
        setModelsLoaded(true);
        setLoadingStatus('Face detection model loaded successfully!');
      } catch (err) {
        console.error('Error loading model:', err);
        setError('Failed to load face detection model. Please check your internet connection.');
        setLoadingStatus('Model loading failed');
      }
    };
    
    loadModel();
    
    // Cleanup function
    return () => {
      if (isActive) {
        stopWebcam();
      }
    };
  }, []);
  
  // Initialize webcam
  const startWebcam = async () => {
    if (!modelsLoaded) {
      setError('Please wait for the face detection model to load');
      return;
    }
    
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
      }
    } catch (err) {
      console.error('Error accessing webcam:', err);
      setError('Could not access webcam. Please ensure you have granted camera permissions.');
    }
  };
  
  // Stop webcam
  const stopWebcam = () => {
    setDetecting(false);
    
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    setIsActive(false);
    setFaceDetected(false);
    setMatchedFace(null);
  };
  
  // Start face detection loop when video is playing
  useEffect(() => {
    if (isActive && videoRef.current && modelsLoaded) {
      videoRef.current.addEventListener('play', startFaceDetection);
      
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('play', startFaceDetection);
        }
      };
    }
  }, [isActive, modelsLoaded]);
  
  // Face detection function
  const startFaceDetection = () => {
    if (!isActive || !videoRef.current || !canvasRef.current || !modelsLoaded) return;
    
    setDetecting(true);
    const detectFaces = async () => {
      if (!detecting || !videoRef.current || !canvasRef.current) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Match dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // In a real implementation, we would:
      // 1. Capture frame from video
      // 2. Process it through TensorFlow model
      // 3. Get face detection results
      
      // For this demo, we'll simulate detection with simple analysis
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      try {
        // Get image data for simple analysis
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Simulate face detection by color analysis in center of frame
        const centerX = Math.floor(canvas.width / 2);
        const centerY = Math.floor(canvas.height / 2);
        const rectSize = Math.min(canvas.width, canvas.height) / 3;
        const faceRect = {
          x: centerX - rectSize/2,
          y: centerY - rectSize/2,
          width: rectSize,
          height: rectSize
        };
        
        // Calculate average color in center area (simplified heuristic)
        let rTotal = 0, gTotal = 0, bTotal = 0;
        let pixelCount = 0;
        
        for (let y = faceRect.y; y < faceRect.y + faceRect.height; y += 10) {
          for (let x = faceRect.x; x < faceRect.x + faceRect.width; x += 10) {
            const i = (y * canvas.width + x) * 4;
            if (i >= 0 && i < data.length) {
              rTotal += data[i];
              gTotal += data[i+1];
              bTotal += data[i+2];
              pixelCount++;
            }
          }
        }
        
        // Simple skin tone heuristic (very simplified)
        const rAvg = rTotal / pixelCount;
        const gAvg = gTotal / pixelCount;
        const bAvg = bTotal / pixelCount;
        
        // Very basic face detection heuristic
        // Real face detection would use ML models, not this simplified approach
        const colorVariance = Math.abs(rAvg - gAvg) + Math.abs(rAvg - bAvg) + Math.abs(gAvg - bAvg);
        const brightnessAvg = (rAvg + gAvg + bAvg) / 3;
        
        // Simple heuristic: skin tones often have moderate brightness and low RGB variance
        const isFaceDetected = colorVariance < 80 && brightnessAvg > 80 && brightnessAvg < 200;
        setFaceDetected(isFaceDetected);
        
        // Draw detection rectangle
        if (isFaceDetected) {
          ctx.strokeStyle = matchedFace ? 'green' : 'blue';
          ctx.lineWidth = 3;
          ctx.strokeRect(faceRect.x, faceRect.y, faceRect.width, faceRect.height);
          
          // Generate simplified face signature
          // In real app, this would be a tensor from the ML model
          // For our demo, we'll use a simplified representation
          const faceSignature = generateFaceSignature(imageData, faceRect);
          
          // Check for matches with saved faces
          if (savedFaces.length > 0) {
            const match = findFaceMatch(faceSignature);
            setMatchedFace(match);
            
            if (match) {
              // Draw match label
              ctx.fillStyle = 'green';
              ctx.font = '16px Arial';
              ctx.fillText(match.name, faceRect.x, faceRect.y - 10);
            }
          }
        } else {
          setMatchedFace(null);
        }
      } catch (err) {
        console.error('Error during face detection:', err);
      }
      
      // Continue detection loop if still active
      if (detecting) {
        requestAnimationFrame(detectFaces);
      }
    };
    
    detectFaces();
  };
  
  // Generate simplified face signature (in real app would be from TensorFlow)
  const generateFaceSignature = (imageData, faceRect) => {
    const data = imageData.data;
    const signature = [];
    const width = imageData.width;
    
    // Sample points within face rectangle
    for (let i = 0; i < 128; i++) {
      // Select evenly distributed sample points
      const row = Math.floor(i / 8) / 16;
      const col = (i % 8) / 8;
      
      const x = Math.floor(faceRect.x + faceRect.width * col);
      const y = Math.floor(faceRect.y + faceRect.height * row);
      
      // Get pixel value at sample point
      const pixelIndex = (y * width + x) * 4;
      
      if (pixelIndex >= 0 && pixelIndex < data.length) {
        // Add weighted RGB values to signature
        signature.push(
          (data[pixelIndex] * 0.3 + 
           data[pixelIndex+1] * 0.6 + 
           data[pixelIndex+2] * 0.1) / 255
        );
      } else {
        signature.push(0);
      }
    }
    
    return signature;
  };
  
  // Find face match from saved faces
  const findFaceMatch = (currentSignature) => {
    if (!savedFaces.length) return null;
    
    let bestMatch = null;
    let bestDistance = 0.5; // Threshold for match
    
    for (const face of savedFaces) {
      const distance = calculateSignatureDistance(currentSignature, face.descriptor);
      
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = face;
      }
    }
    
    return bestMatch;
  };
  
  // Calculate euclidean distance between signatures
  const calculateSignatureDistance = (sig1, sig2) => {
    if (!sig1 || !sig2 || sig1.length !== sig2.length) return 1.0;
    
    let sum = 0;
    for (let i = 0; i < sig1.length; i++) {
      const diff = sig1[i] - sig2[i];
      sum += diff * diff;
    }
    
    return Math.sqrt(sum);
  };
  
  // Save current face
  const saveFace = () => {
    if (!faceDetected || !faceName.trim() || !videoRef.current || !canvasRef.current) return;
    
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      // Get current face region
      const centerX = Math.floor(video.videoWidth / 2);
      const centerY = Math.floor(video.videoHeight / 2);
      const rectSize = Math.min(video.videoWidth, video.videoHeight) / 3;
      const faceRect = {
        x: centerX - rectSize/2,
        y: centerY - rectSize/2,
        width: rectSize,
        height: rectSize
      };
      
      // Draw video frame to canvas
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Generate face signature
      const faceSignature = generateFaceSignature(imageData, faceRect);
      
      // Create new face object
      const newFace = {
        id: Date.now().toString(),
        name: faceName.trim(),
        savedAt: new Date().toLocaleString(),
        descriptor: faceSignature
      };
      
      // Add to saved faces
      setSavedFaces(prev => [...prev, newFace]);
      setFaceName('');
      
    } catch (err) {
      console.error('Error saving face:', err);
      setError('Failed to save face. Please try again.');
    }
  };
  
  // Remove a saved face
  const removeFace = (id) => {
    setSavedFaces(prev => prev.filter(face => face.id !== id));
    if (matchedFace && matchedFace.id === id) {
      setMatchedFace(null);
    }
  };
  
  // Export saved faces as JSON
  const exportFaces = () => {
    if (savedFaces.length === 0) return;
    
    const dataStr = JSON.stringify(savedFaces, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const downloadLink = document.createElement('a');
    downloadLink.setAttribute('href', dataUri);
    downloadLink.setAttribute('download', 'face-signatures.json');
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };
  
  // Import saved faces from JSON file
  const importFaces = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedFaces = JSON.parse(e.target.result);
        if (Array.isArray(importedFaces) && importedFaces.length > 0) {
          setSavedFaces(prev => [...prev, ...importedFaces]);
        }
      } catch (err) {
        console.error('Error importing faces:', err);
        setError('Invalid face signatures file. Please try again.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col items-center p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Face Recognition System</h1>
      <p className="text-gray-600 mb-6">Using TensorFlow.js (Demo Version)</p>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 w-full">
          {error}
        </div>
      )}
      
      {!modelsLoaded && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4 w-full">
          {loadingStatus || "Loading face detection model..."}
        </div>
      )}
      
      <div className="flex flex-col md:flex-row gap-6 w-full">
        <div className="flex-1">
          <div className="relative mb-4">
            <video 
              ref={videoRef}
              className="w-full rounded-lg shadow-lg"
              autoPlay 
              playsInline 
              muted
            />
            <canvas 
              ref={canvasRef} 
              className="absolute top-0 left-0 w-full h-full z-10"
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
              disabled={!modelsLoaded}
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
            <ul className="list-disc pl-5 space-y-1">
              <li>This demonstrates the concept of face signature/recognition</li>
              <li>In a real app, TensorFlow.js would analyze faces using deep learning models</li>
              <li>Face signatures are mathematical representations that uniquely identify a face</li>
              <li>For production use, you would load pre-trained TensorFlow.js face detection models</li>
            </ul>
            <div className="mt-2 text-xs text-gray-500">
              <strong>Note:</strong> This demo uses simplified face detection for demonstration purposes.
              For production applications, you would load pre-trained models for better accuracy.
            </div>
          </div>
        </div>
        
        <div className="md:w-80">
          <div className="bg-gray-100 rounded-lg p-4 h-full">
            <h2 className="font-bold text-lg mb-3">Saved Faces ({savedFaces.length})</h2>
            
            <div className="flex gap-2 mb-4">
              <button
                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm disabled:opacity-50"
                onClick={exportFaces}
                disabled={savedFaces.length === 0}
              >
                Export Faces
              </button>
              
              <label className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm cursor-pointer">
                Import Faces
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={importFaces}
                />
              </label>
            </div>
            
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