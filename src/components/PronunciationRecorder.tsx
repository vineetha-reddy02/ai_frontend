import React, { useState, useRef, useEffect } from 'react';
import { Mic, StopCircle, RotateCcw, Send, Volume2 } from 'lucide-react';
import { pronunciationService } from '../services/pronunciation';
import { formatTime } from '../utils/helpers';
import Button from './Button';
import { SpeakerPlayButton } from './common/SpeakerPlayButton';

interface PronunciationRecorderProps {
  paragraphId: string;
  paragraphText: string;
  onSubmit?: (result: any) => void;
  onCancel?: () => void;
  onNext?: () => void;
  showNextButton?: boolean;
}

export const PronunciationRecorder: React.FC<PronunciationRecorderProps> = ({
  paragraphId,
  paragraphText,
  onSubmit,
  onCancel,
  onNext,
  showNextButton = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);

  // AI Voice-Over State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [referenceAudioUrl, setReferenceAudioUrl] = useState<string | null>(null);
  const referenceAudioRef = useRef<HTMLAudioElement | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioPlayRef = useRef<HTMLAudioElement>(null);

  // Initialize microphone
  useEffect(() => {
    const initMicrophone = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event: BlobEvent) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setRecordedAudio(audioBlob);
          audioChunksRef.current = [];
        };
      } catch (err: any) {
        setError('Microphone access denied. Please allow microphone access.');
        console.error('Microphone error:', err);
      }
    };

    initMicrophone();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Reset state when paragraph changes
  useEffect(() => {
    handleReset();
    setIsSpeaking(false);
    setReferenceAudioUrl(null); // Clear cached audio when paragraph changes
  }, [paragraphId, paragraphText]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Start recording
  const handleStartRecording = () => {
    // Stop speaking if recording starts
    if (isSpeaking) {
      setIsSpeaking(false);
      if (referenceAudioRef.current) {
        referenceAudioRef.current.pause();
        referenceAudioRef.current.currentTime = 0;
      }
    }

    try {
      setError(null);
      audioChunksRef.current = [];
      setRecordingTime(0);

      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.start();
        setIsRecording(true);
      }
    } catch (err: any) {
      setError('Failed to start recording');
    }
  };

  // Stop recording
  const handleStopRecording = () => {
    try {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    } catch (err: any) {
      setError('Failed to stop recording');
    }
  };

  // Reset recording
  const handleReset = () => {
    setRecordedAudio(null);
    setRecordingTime(0);
    setIsRecording(false);
    setError(null);
    setAssessmentResult(null);
    setShowResult(false);
    audioChunksRef.current = [];
  };

  // Play recording
  const handlePlayRecording = () => {
    if (recordedAudio && audioPlayRef.current) {
      const audioUrl = URL.createObjectURL(recordedAudio);
      audioPlayRef.current.src = audioUrl;
      audioPlayRef.current.play();
    }
  };

  // AI Voice-Over: Convert paragraph to speech and play
  const handleSpeakerToggle = async () => {
    // If already playing, stop it
    if (isSpeaking) {
      setIsSpeaking(false);
      if (referenceAudioRef.current) {
        referenceAudioRef.current.pause();
        referenceAudioRef.current.currentTime = 0;
      }
      return;
    }

    // If we have cached audio, just play it
    if (referenceAudioUrl) {
      playReferenceAudio(referenceAudioUrl);
      return;
    }

    // Otherwise, generate new audio
    try {
      setIsLoadingAudio(true);
      setError(null);

      console.log('🎤 Converting paragraph to speech...', paragraphId);
      const response = await pronunciationService.convertToSpeech(paragraphId);
      const data = (response as any).data || response;

      console.log('✅ Speech synthesis response:', data);

      if (data.synthesisCompleted && data.audioUrl) {
        setReferenceAudioUrl(data.audioUrl);
        playReferenceAudio(data.audioUrl);
      } else {
        setError('Failed to generate audio. Please try again.');
      }
    } catch (err: any) {
      console.error('❌ Speech synthesis error:', err);
      setError('Failed to generate reference audio. Please try again.');
    } finally {
      setIsLoadingAudio(false);
    }
  };

  // Play reference audio
  const playReferenceAudio = (audioUrl: string) => {
    console.log('🔊 Playing reference audio:', audioUrl);

    if (!referenceAudioRef.current) {
      console.log('📱 Creating new Audio element');
      referenceAudioRef.current = new Audio(audioUrl);

      referenceAudioRef.current.onended = () => {
        console.log('✅ Audio playback ended');
        setIsSpeaking(false);
      };

      referenceAudioRef.current.onerror = (e) => {
        console.error('❌ Audio error:', e);
        console.error('Audio URL:', audioUrl);
        setError('Failed to play reference audio. The audio file may be inaccessible.');
        setIsSpeaking(false);
      };

      referenceAudioRef.current.onloadeddata = () => {
        console.log('✅ Audio loaded successfully');
      };
    } else {
      console.log('♻️ Reusing existing Audio element');
      referenceAudioRef.current.src = audioUrl;
    }

    console.log('▶️ Attempting to play audio...');
    referenceAudioRef.current.play()
      .then(() => {
        console.log('✅ Audio playback started');
        setIsSpeaking(true);
      })
      .catch((err) => {
        console.error('❌ Audio playback error:', err);
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        setError(`Failed to play audio: ${err.message}`);
        setIsSpeaking(false);
      });
  };

  // Submit for assessment
  const handleSubmitForAssessment = async () => {
    if (!recordedAudio) {
      setError('No recording found');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Submit audio for assessment
      let result: any = await pronunciationService.assessAudio(paragraphId, recordedAudio);
      console.log('Initial assessment response:', result);

      // Handle raw string ID response
      let attemptId = null;
      if (typeof result === 'string') {
        attemptId = result;
        // If we just got an ID, we MUST fetch details immediately
        const details = await pronunciationService.getAttemptDetails(attemptId);
        result = details || { id: attemptId };
      } else if (result && result.id) {
        attemptId = result.id;
      }

      // Check strictly for processing status
      let isPending = result?.processing?.status === 'Pending' || result?.processing?.status === 'Processing' || result?.processing?.isPending || result?.processing?.isProcessing;

      // Also treat as pending if we have an ID but absolutely no score data yet (and no error)
      if (!isPending && attemptId && !result.scores && result.pronunciationAccuracy === undefined) {
        isPending = true;
      }

      // Polling Loop
      let attempts = 0;
      const maxAttempts = 10;

      while (isPending && attempts < maxAttempts) {
        attempts++;
        console.log(`Assessment pending (Attempt ${attempts}/${maxAttempts})... waiting...`);

        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s

        try {
          const details = await pronunciationService.getAttemptDetails(attemptId);
          console.log('Polled details:', details);

          if (details) {
            result = details; // Update result with latest details

            // Update pending status
            isPending = result?.processing?.status === 'Pending' || result?.processing?.status === 'Processing' || result?.processing?.isPending || result?.processing?.isProcessing;

            // If completed, break
            if (result?.processing?.status === 'Completed' || result?.processing?.isCompleted) {
              isPending = false;
            }
          }
        } catch (pollErr) {
          console.error('Polling error:', pollErr);
        }
      }

      setAssessmentResult(result);
      setShowResult(true);

      if (onSubmit) {
        onSubmit(result);
      }
    } catch (err: any) {
      console.error('Assessment error:', err);

      if (err.validationErrors && (
        err.validationErrors.includes('SUBSCRIPTION_REQUIRED') ||
        err.validationErrors === 'SUBSCRIPTION_REQUIRED'
      )) {
        setError('SUBSCRIPTION_REQUIRED');
      } else {
        setError('Failed to assess pronunciation. Please try again.');
        // Debug: still show result if partial data exists
        if (err.data || err.response?.data) {
          console.warn('Attempting to show partial results from error response');
          // optional: setAssessmentResult(err.data || err.response?.data);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Show assessment result
  if (showResult && assessmentResult) {
    return (
      <div className="max-w-2xl mx-auto bg-slate-800 rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
          <h2 className="text-2xl font-bold text-white">Assessment Results</h2>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Paragraph */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-400 uppercase mb-2">Text to Read</h3>
            <p className="text-lg text-white">{paragraphText}</p>
          </div>

          {/* Score */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-700 rounded-lg p-4">
              <p className="text-sm text-slate-400 mb-1">Accuracy</p>
              <p className="text-3xl font-bold text-blue-400">
                {(assessmentResult.scores?.accuracy ?? assessmentResult.pronunciationAccuracy ?? assessmentResult.accuracy)?.toFixed(1) || 'N/A'}%
              </p>
            </div>
            <div className="bg-slate-700 rounded-lg p-4">
              <p className="text-sm text-slate-400 mb-1">Fluency</p>
              <p className="text-3xl font-bold text-green-400">
                {(assessmentResult.scores?.fluency ?? assessmentResult.fluencyScore ?? assessmentResult.fluency)?.toFixed(1) || 'N/A'}%
              </p>
            </div>
            <div className="bg-slate-700 rounded-lg p-4">
              <p className="text-sm text-slate-400 mb-1">Overall Score</p>
              <p className="text-3xl font-bold text-yellow-400">
                {(assessmentResult.scores?.overall ?? assessmentResult.overallScore ?? assessmentResult.OverallScore)?.toFixed(1) || 'N/A'}%
              </p>
            </div>
          </div>

          {/* Feedback */}
          {assessmentResult.feedback && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-400 uppercase mb-2">Feedback</h3>
              <p className="text-slate-300 leading-relaxed">{assessmentResult.feedback}</p>
            </div>
          )}

          {/* Mistakes with Word Level Feedback fallback */}
          {((assessmentResult.mistakes && assessmentResult.mistakes.length > 0) ||
            (assessmentResult.wordLevelFeedback && assessmentResult.wordLevelFeedback.length > 0) ||
            (assessmentResult.detailedFeedback?.words && assessmentResult.detailedFeedback.words.length > 0)) && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-400 uppercase mb-2">Areas for Improvement</h3>
                <ul className="space-y-2">
                  {assessmentResult.mistakes ? (
                    assessmentResult.mistakes.map((mistake: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">•</span>
                        <span className="text-slate-300">{mistake}</span>
                      </li>
                    ))
                  ) : (
                    (assessmentResult.wordLevelFeedback || assessmentResult.detailedFeedback?.words || [])
                      .filter((w: any) => w.accuracyScore < 80)
                      .slice(0, 5) // Limit to top 5 errors
                      .map((w: any, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-red-400 mt-1">•</span>
                          <span className="text-slate-300">
                            <span className="font-bold text-red-300">"{w.word}"</span>
                            <span className="text-slate-400 text-sm ml-2">(Accuracy: {w.accuracyScore.toFixed(0)}%)</span>
                            {w.errorType && w.errorType !== 'None' && <span className="text-slate-500 text-xs ml-1">[{w.errorType}]</span>}
                          </span>
                        </li>
                      ))
                  )}
                </ul>
              </div>
            )}



          {/* Recommendations */}
          {assessmentResult.recommendations && assessmentResult.recommendations.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-400 uppercase mb-2">Recommendations</h3>
              <ul className="space-y-2">
                {assessmentResult.recommendations.map((rec: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span className="text-slate-300">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleReset}
              className="flex-1"
            >
              Try Again
            </Button>
            {showNextButton && onNext && (
              <Button
                onClick={() => {
                  handleReset(); // Clear result before navigating
                  onNext();
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                Next Paragraph
              </Button>
            )}
            {onCancel && (
              <Button
                onClick={onCancel}
                variant="secondary"
                className="flex-1"
              >
                Done
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Recording interface
  return (
    <div className="max-w-2xl mx-auto bg-slate-800 rounded-lg shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Pronunciation Practice</h2>
        <p className="text-blue-100">Read the text below carefully and clearly</p>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Text to Read */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase">Text to Read</h3>
            <SpeakerPlayButton
              isPlaying={isSpeaking}
              onToggle={handleSpeakerToggle}
              disabled={isRecording || isLoadingAudio}
              isLoading={isLoadingAudio}
            />
          </div>
          <div className={`bg-slate-700 rounded-lg p-6 transition-colors duration-300 ${isSpeaking ? 'ring-2 ring-blue-500/50 bg-slate-700/80' : ''}`}>
            <p className="text-xl leading-relaxed text-white font-medium">{paragraphText}</p>
          </div>
        </div>

        {/* Error Message */}
        {error === 'SUBSCRIPTION_REQUIRED' ? (
          <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500 rounded-lg text-yellow-200">
            <p className="font-bold mb-2">Premium Feature</p>
            <p className="mb-3">Unlimited AI pronunciation assessment is available for premium members only.</p>
            <button
              onClick={() => window.location.href = '/subscriptions'}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-lg transition-colors"
            >
              Upgrade Now
            </button>
          </div>
        ) : error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Recording State */}
        {!recordedAudio ? (
          <div className="mb-8">
            {/* Recording Timer */}
            {isRecording && (
              <div className="mb-4 text-center">
                <div className="inline-block bg-red-600/20 border border-red-500 rounded-lg px-6 py-2">
                  <span className="text-lg font-mono text-red-400">{formatTime(recordingTime)}</span>
                </div>
              </div>
            )}

            {/* Recording Button */}
            <div className="flex justify-center mb-4">
              {!isRecording ? (
                <button
                  onClick={handleStartRecording}
                  className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg font-semibold text-white transition-all transform hover:scale-105"
                >
                  <Mic className="w-6 h-6" />
                  Start Recording
                </button>
              ) : (
                <button
                  onClick={handleStopRecording}
                  className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 rounded-lg font-semibold text-white transition-all transform hover:scale-105"
                >
                  <StopCircle className="w-6 h-6" />
                  Stop Recording
                </button>
              )}
            </div>

            {/* Instructions */}
            {!isRecording && !recordedAudio && (
              <div className="text-center text-slate-400 text-sm">
                <p>Click the button above to start recording. Read the text clearly and naturally.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="mb-8">
            {/* Playback Controls */}
            <div className="flex justify-center gap-4 mb-6">
              <button
                onClick={handlePlayRecording}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-white transition-all"
              >
                <Volume2 className="w-5 h-5" />
                Play Recording
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-6 py-3 bg-slate-600 hover:bg-slate-700 rounded-lg font-semibold text-white transition-all"
              >
                <RotateCcw className="w-5 h-5" />
                Re-record
              </button>
            </div>

            {/* Audio Player */}
            <audio
              ref={audioPlayRef}
              className="w-full mb-6 rounded-lg"
              controls
            />

            {/* Submission Button */}
            <div className="flex gap-3">
              <Button
                onClick={handleSubmitForAssessment}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="inline-block animate-spin">⟳</span>
                    Assessing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit for Assessment
                  </>
                )}
              </Button>
              {onCancel && (
                <Button
                  onClick={onCancel}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="bg-slate-700/50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Recording Tips:</h3>
          <ul className="space-y-1 text-sm text-slate-400">
            <li>• Speak clearly and at a natural pace</li>
            <li>• Avoid background noise for better accuracy</li>
            <li>• Make sure your microphone is working properly</li>
            <li>• Pause briefly between sentences if needed</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PronunciationRecorder;
