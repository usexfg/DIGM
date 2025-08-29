import React, { useState, useRef } from 'react';
import { useWallet } from '../hooks/useWallet';
import { 
  validateFile, 
  mockUploadFile, 
  formatFileSize, 
  formatDuration,
  UploadedFile
} from '../utils/fileUpload';

const UploadDownloadTest: React.FC = () => {
  const { evmAddress } = useWallet();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [testResults, setTestResults] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const runValidationTests = () => {
    addTestResult('Starting validation tests...');
    
    // Test audio validation
    const audioBlob = new Blob(['test'], { type: 'audio/mpeg' });
    const audioFile = new File([audioBlob], 'test.mp3', { type: 'audio/mpeg' });
    const audioValidation = validateFile(audioFile, 'audio');
    addTestResult(`Audio validation: ${audioValidation.isValid ? 'PASSED' : 'FAILED'}`);
    
    // Test image validation
    const imageBlob = new Blob(['test'], { type: 'image/jpeg' });
    const imageFile = new File([imageBlob], 'test.jpg', { type: 'image/jpeg' });
    const imageValidation = validateFile(imageFile, 'image');
    addTestResult(`Image validation: ${imageValidation.isValid ? 'PASSED' : 'FAILED'}`);
    
    // Test invalid file
    const invalidBlob = new Blob(['test'], { type: 'invalid/type' });
    const invalidFile = new File([invalidBlob], 'test.txt', { type: 'invalid/type' });
    const invalidValidation = validateFile(invalidFile, 'audio');
    addTestResult(`Invalid file validation: ${!invalidValidation.isValid ? 'PASSED' : 'FAILED'}`);
  };

  const runUploadTests = async () => {
    addTestResult('Starting upload tests...');
    
    // Test audio upload
    const audioBlob = new Blob(['audio test data'], { type: 'audio/mpeg' });
    const audioFile = new File([audioBlob], 'upload-test.mp3', { type: 'audio/mpeg' });
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const uploadedAudio = await mockUploadFile(audioFile, 'audio', (progress) => {
        setUploadProgress(progress.percentage);
      });
      
      setUploadedFiles(prev => [...prev, uploadedAudio]);
      addTestResult(`Audio upload: PASSED - ${uploadedAudio.name}`);
    } catch (error) {
      addTestResult(`Audio upload: FAILED - ${error}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const runDownloadTests = () => {
    addTestResult('Starting download tests...');
    
    uploadedFiles.forEach(file => {
      try {
        const link = document.createElement('a');
        link.href = file.url;
        link.download = `test-download-${file.name}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addTestResult(`Download test: PASSED - ${file.name}`);
      } catch (error) {
        addTestResult(`Download test: FAILED - ${file.name}`);
      }
    });
  };

  const runStreamingTests = () => {
    addTestResult('Starting streaming tests...');
    
    const audioFiles = uploadedFiles.filter(file => file.type.startsWith('audio/'));
    
    if (audioFiles.length > 0) {
      const testFile = audioFiles[0];
      if (audioRef.current) {
        audioRef.current.src = testFile.url;
        audioRef.current.play().then(() => {
          addTestResult(`Streaming test: PASSED - ${testFile.name}`);
        }).catch(error => {
          addTestResult(`Streaming test: FAILED - ${error}`);
        });
      }
    } else {
      addTestResult('Streaming test: SKIPPED - No audio files available');
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    addTestResult(`Manual file upload: ${file.name}`);
    
    const fileType = file.type.startsWith('audio/') ? 'audio' : 'image';
    const validation = validateFile(file, fileType);
    
    if (!validation.isValid) {
      addTestResult(`File validation: FAILED - ${validation.errors.join(', ')}`);
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const uploadedFile = await mockUploadFile(file, fileType, (progress) => {
        setUploadProgress(progress.percentage);
      });
      
      setUploadedFiles(prev => [...prev, uploadedFile]);
      addTestResult(`Manual upload: PASSED - ${uploadedFile.name}`);
    } catch (error) {
      addTestResult(`Manual upload: FAILED - ${error}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const runAllTests = () => {
    setTestResults([]);
    addTestResult('Starting comprehensive upload/download/streaming test suite...');
    
    setTimeout(() => runValidationTests(), 100);
    setTimeout(() => runUploadTests(), 500);
    setTimeout(() => runDownloadTests(), 2000);
    setTimeout(() => runStreamingTests(), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Upload/Download & Streaming Test Suite</h1>
        <p className="text-gray-300">
          Comprehensive testing of file upload, download, and streaming functionality
        </p>
      </div>

      {/* Test Controls */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Test Controls</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={runAllTests}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Run All Tests
          </button>
          
          <button
            onClick={runValidationTests}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Validation Tests
          </button>
          
          <button
            onClick={runUploadTests}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Upload Tests
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Manual Upload
          </button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Upload Progress</h2>
          <div className="w-full bg-gray-700 rounded-full h-4">
            <div 
              className="bg-blue-500 h-4 rounded-full transition-all duration-300" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <div className="text-center text-white mt-2">{uploadProgress.toFixed(1)}%</div>
        </div>
      )}

      {/* Test Results */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Test Results</h2>
        <div className="max-h-64 overflow-y-auto space-y-2">
          {testResults.map((result, index) => (
            <div key={index} className="text-sm text-gray-300 bg-gray-700 p-2 rounded">
              {result}
            </div>
          ))}
        </div>
      </div>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Uploaded Files</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-white font-medium mb-2">{file.name}</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Size:</span>
                    <span className="text-white">{formatFileSize(file.size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Type:</span>
                    <span className="text-white">{file.type}</span>
                  </div>
                  {file.duration && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Duration:</span>
                      <span className="text-white">{formatDuration(file.duration)}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = file.url;
                      link.download = file.name;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Download
                  </button>
                  {file.type.startsWith('audio/') && (
                    <button
                      onClick={() => {
                        if (audioRef.current) {
                          audioRef.current.src = file.url;
                          audioRef.current.play();
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      Play
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audio Player */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Audio Player</h2>
        <audio ref={audioRef} controls className="w-full" />
      </div>

      {/* Test Summary */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Test Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{testResults.length}</div>
            <div className="text-gray-400 text-sm">Total Tests</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {testResults.filter(r => r.includes('PASSED')).length}
            </div>
            <div className="text-gray-400 text-sm">Passed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">
              {testResults.filter(r => r.includes('FAILED')).length}
            </div>
            <div className="text-gray-400 text-sm">Failed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{uploadedFiles.length}</div>
            <div className="text-gray-400 text-sm">Files Uploaded</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadDownloadTest;
