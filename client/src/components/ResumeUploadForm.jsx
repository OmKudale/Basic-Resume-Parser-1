import { useState, useRef, useCallback } from 'react';

const ResumeUploadForm = ({ onSubmit }) => {
  const [resume, setResume] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (isPdf) {
        setResume(file);
        setError(null);
      } else {
        setError('Please upload a valid PDF file.');
      }
    }
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (isPdf) {
        setResume(file);
        setError(null);
      } else {
        setError('Please upload a valid PDF file.');
      }
    }
  };

  const removeFile = () => {
    setResume(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!resume) {
      setError('Please select a resume file');
      setLoading(false);
      return;
    }

    if (!jobDescription.trim()) {
      setError('Please enter a job description');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('resume', resume);
    formData.append('jobDescription', jobDescription);

    try {
      const response = await fetch('/api/upload-resume', {
        method: 'POST',
        body: formData,
      });

      let data;
      const responseText = await response.text();
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          response.ok
            ? 'Invalid server response'
            : `Server error (${response.status}): Could not connect to backend server. Make sure the server is running on port 5000.`
        );
      }

      if (!response.ok) {
        throw new Error(data.message || data.error || `Upload failed (${response.status})`);
      }

      if (!data.data || !data.data.match) {
        throw new Error('Received unexpected response format from server');
      }

      onSubmit(data.data);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-12 p-6 border border-gray-100 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-purple-600 mb-3">
            AI Resume Analyzer
          </h2>
          <p className="text-gray-500 text-lg">
            Match your skills against your dream job description
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 gap-4 flex flex-col">
          {/* File Upload Area */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-gray-700 ml-1">
              Resume Document <span className="text-red-500">*</span>
            </label>
            <div
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`relative flex flex-col items-center justify-center w-full min-h-50 border-2 border-dashed rounded-2xl transition-all duration-300 group cursor-pointer ${
                isDragging
                  ? 'border-blue-500 bg-blue-50 scale-[1.01]'
                  : resume
                    ? 'border-green-400 bg-green-50/30'
                    : 'border-gray-300 bg-gray-50/50 hover:bg-gray-50 hover:border-blue-400'
              }`}
            >
              <input
                ref={fileInputRef}
                id="dropzone-file"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                disabled={loading}
              />

              {!resume ? (
                <div className="flex flex-col items-center justify-center p-6 text-center pointer-events-none">
                  <div className={`p-4 rounded-full mb-4 transition-colors ${isDragging ? 'bg-blue-100 text-blue-600' : 'bg-white text-gray-400 group-hover:text-blue-500 shadow-sm'}`}>
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="mb-2 text-lg text-gray-600">
                    <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-sm text-gray-500">Only PDF files are supported (Max 5MB)</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 w-full h-full relative z-10">
                  <div className="bg-white p-4 rounded-full shadow-sm text-green-500 mb-3">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-base font-medium text-gray-800 text-center px-4 truncate max-w-full">
                    {resume.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 mb-4">
                    {(resume.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); removeFile(); }}
                    className="px-4 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-full transition-colors relative z-20"
                    disabled={loading}
                  >
                    Remove file
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Job Description Area */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-gray-700 ml-1">
              Job Description <span className="text-red-500">*</span>
            </label>
            <div className="relative group">
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows="6"
                placeholder="Paste the target job description or requirements here..."
                className="w-full px-5 py-4 bg-gray-50/50 border border-gray-300 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 resize-y min-h-37.5 text-gray-700 placeholder-gray-400 shadow-sm"
                disabled={loading}
              />
              <div className="absolute top-4 right-4 text-gray-300 pointer-events-none group-focus-within:text-blue-400 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-red-800 break-words">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !resume || !jobDescription.trim()}
            className={`
              relative w-full overflow-hidden py-4 px-6 rounded-2xl font-bold text-white text-lg
              transition-all duration-300 transform shadow-[0_5px_15px_rgba(37,99,235,0.2)]
              ${loading
                ? 'bg-blue-400 cursor-not-allowed scale-100'
                : (!resume || !jobDescription.trim())
                  ? 'bg-gray-300 text-gray-500 shadow-none cursor-not-allowed'
                  : 'bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:scale-[1.01] hover:shadow-[0_8px_25px_rgba(37,99,235,0.4)] active:scale-[0.98]'
              }
            `}
          >
            <div className="relative z-10 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  <span>Analyzing Resume with AI...</span>
                </>
              ) : (
                <>
                  <span>Analyze Compatibility</span>
                  <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </div>

            {/* Loading background pulse effect */}
            {loading && (
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-linear-to-r from-transparent via-white/20 to-transparent"></div>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResumeUploadForm;
