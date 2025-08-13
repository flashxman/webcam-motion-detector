import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

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
  
  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      setLoadingStatus('Loading face-api models...');
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        
        setModelsLoaded(true);
        setLoadingStatus('Face models loaded successfully!');
      } catch (err) {
        console.error('Error loading models:', err);
        setError('Failed to load face detection models. Please check your internet connection.');
        setLoadingStatus('Model loading failed');
      }
    };
    
    loadModels();
    
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
      setError('Please wait for the face detection models to load');
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
      
      // Detect faces
      try {
        const detections = await faceapi.detectAllFaces(
          video, 
          new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
        ).withFaceLandmarks().withFaceDescriptors();
        
        // Clear canvas and draw results
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Check if any faces detected
        const faceFound = detections.length > 0;
        setFaceDetected(faceFound);
        
        if (faceFound) {
          // Draw detections
          faceapi.draw.drawDetections(canvas, detections);
          faceapi.draw.drawFaceLandmarks(canvas, detections);
          
          // Try to match with saved faces
          if (savedFaces.length > 0) {
            const currentFaceDescriptor = detections[0].descriptor;
            
            // Create face matcher with saved faces
            const labeledDescriptors = savedFaces.map(face => 
              new faceapi.LabeledFaceDescriptors(face.name, [face.descriptor])
            );
            
            if (labeledDescriptors.length > 0) {
              const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
              
              // Find best match
              const match = faceMatcher.findBestMatch(currentFaceDescriptor);
              
              // If we have a match that's not unknown
              if (match && match.label !== 'unknown') {
                const matchedPerson = savedFaces.find(face => face.name === match.label);
                setMatchedFace(matchedPerson);
                
                // Draw match label
                const box = detections[0].detection.box;
                const text = `${match.label} (${Math.round(match.distance * 100) / 100})`;
                const drawBox = new faceapi.draw.DrawBox(box, { label: text });
                drawBox.draw(canvas);
              } else {
                setMatchedFace(null);
              }
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
  
  // Save current face
  const saveFace = async () => {
    if (!faceDetected || !faceName.trim() || !videoRef.current) return;
    
    try {
      // Get current face descriptor
      const detections = await faceapi.detectAllFaces(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks().withFaceDescriptors();
      
      if (detections.length === 0) {
        setError('No face detected. Please position your face in the frame.');
        return;
      }
      
      // Get the descriptor from the first face (main face)
      const faceDescriptor = detections[0].descriptor;
      
      // Create a new face object
      const newFace = {
        id: Date.now().toString(),
        name: faceName.trim(),
        savedAt: new Date().toLocaleString(),
        descriptor: Array.from(faceDescriptor) // Convert to regular array for storage
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
      <p className="text-gray-600 mb-6">Using TensorFlow.js and Face-API.js</p>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 w-full">
          {error}
        </div>
      )}
      
      {!modelsLoaded && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4 w-full">
          {loadingStatus || "Loading face detection models..."}
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
              <li>This uses TensorFlow.js and Face-API.js to detect faces in real-time</li>
              <li>Face signatures are 128-dimensional vectors that uniquely identify a face</li>
              <li>These signatures can be saved and used for future recognition</li>
              <li>Signatures can be exported/imported for backup or transfer</li>
            </ul>
            <div className="mt-2 text-xs text-gray-500">
              <strong>Note:</strong> For this to work, you need to download the face-api.js models folder 
              and place it in your public directory. Get models from the 
              <a href="https://github.com/justadudewhohacks/face-api.js/tree/master/weights" target="_blank" rel="noopener noreferrer" className="text-blue-600 ml-1">face-api.js repository</a>.
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