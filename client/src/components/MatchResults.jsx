const MatchResults = ({ match = {}, onReset }) => {
  const {
    score = 0,
    matchedSkills = [],
    missingSkills = [],
    strengths = [],
    weaknesses = [],
    explanation = '',
    eligible = false,
  } = match || {};

  // Ensure score is a number between 0 and 100
  const parsedScore = typeof score === 'number' ? score : (parseInt(score, 10) || 0);
  const numericScore = Math.max(0, Math.min(100, Math.round(parsedScore)));

  const getScoreColor = (s) => {
    if (s >= 80) return 'text-green-600';
    if (s >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStrokeColor = (s) => {
    if (s >= 80) return 'stroke-green-500';
    if (s >= 70) return 'stroke-yellow-500';
    return 'stroke-red-500';
  };

  const circumference = 440;
  const strokeDashoffset = circumference - (circumference * numericScore) / 100;

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 to-white">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-indigo-100">
          <div className="p-8">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
              <h2 className="text-3xl font-extrabold text-gray-900">
                Resume Analysis Results
              </h2>
              {onReset && (
                <button
                  type="button"
                  onClick={onReset}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Upload Another Resume
                </button>
              )}
            </div>

            {/* Score Card */}
            <div className="mb-10 flex flex-col items-center">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    className="text-gray-200"
                    strokeWidth="10"
                    stroke="currentColor"
                    fill="transparent"
                    r="70"
                    cx="80"
                    cy="80"
                  />
                  <circle
                    className={`${getStrokeColor(numericScore)} transition-all duration-1000 ease-out`}
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="70"
                    cx="80"
                    cy="80"
                  />
                </svg>
                <div className={`absolute text-3xl font-bold ${getScoreColor(numericScore)}`}>
                  {numericScore}%
                </div>
              </div>
              <div className="mt-4 text-center">
                <h3 className="text-xl font-semibold text-gray-800">Match Score</h3>
                <p className={`mt-1 font-medium text-lg ${eligible ? 'text-green-600' : 'text-red-600'}`}>
                  {eligible ? '✓ Eligible for position' : '✕ Not eligible for position'}
                </p>
              </div>
            </div>

            {/* Grid Layout for Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Matched Skills */}
              <div className="bg-green-50 rounded-xl p-6 border border-green-100">
                <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center">
                  <span className="mr-2 text-2xl">✓</span> Matched Skills
                </h3>
                {matchedSkills && matchedSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {matchedSkills.map((skill, index) => (
                      <span key={index} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-green-700 italic">None identified</p>
                )}
              </div>

              {/* Missing Skills */}
              <div className="bg-red-50 rounded-xl p-6 border border-red-100">
                <h3 className="text-lg font-bold text-red-800 mb-4 flex items-center">
                  <span className="mr-2 text-2xl">⚠️</span> Skills to Develop
                </h3>
                {missingSkills && missingSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {missingSkills.map((skill, index) => (
                      <span key={index} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-red-700 italic">None identified</p>
                )}
              </div>
            </div>

            {/* Strengths & Improvements */}
            <div className="grid grid-cols-1 gap-8 mt-8 md:grid-cols-2">
              {/* Strengths */}
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                <h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center">
                  <span className="mr-2 text-2xl">💪</span> Strengths
                </h3>
                {strengths && strengths.length > 0 ? (
                  <ul className="space-y-2 list-disc list-inside text-blue-900">
                    {strengths.map((strength, index) => <li key={index}>{strength}</li>)}
                  </ul>
                ) : <p className="text-blue-700 italic">None identified</p>}
              </div>

              {/* Improvements */}
              <div className="bg-amber-50 rounded-xl p-6 border border-amber-100">
                <h3 className="text-lg font-bold text-amber-900 mb-4 flex items-center">
                  <span className="mr-2 text-2xl">📈</span> Areas for Growth
                </h3>
                {weaknesses && weaknesses.length > 0 ? (
                  <ul className="space-y-2 list-disc list-inside text-amber-950">
                    {weaknesses.map((weakness, index) => <li key={index}>{weakness}</li>)}
                  </ul>
                ) : <p className="text-amber-800 italic">None identified</p>}
              </div>
            </div>

            {/* Explanation */}
            <div className="mt-8 p-6 bg-gray-50 rounded-xl border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                <span className="mr-2 text-2xl">📝</span> Analysis Summary
              </h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{explanation || 'No detailed explanation provided.'}</p>
            </div>

            {/* Bottom Actions */}
            {onReset && (
              <div className="mt-8 pt-6 border-t border-gray-100 flex justify-center">
                <button
                  type="button"
                  onClick={onReset}
                  className="px-6 py-3 font-semibold text-white bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer"
                >
                  Analyze Another Resume
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchResults;