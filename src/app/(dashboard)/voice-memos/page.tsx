"use client";

import { useState, useEffect, useRef } from "react";

export const dynamic = "force-dynamic";

type RecordingStatus = "idle" | "recording" | "paused" | "processing";
type AudioQuality = "low" | "medium" | "high";
type TranscriptionStatus = "pending" | "processing" | "completed" | "failed";

interface VoiceMemo {
  id: string;
  caseId: string;
  caseName: string;
  title: string;
  duration: number;
  fileSize: number;
  fileUrl?: string;
  recordedAt: string;
  recordedBy: string;
  transcription?: string;
  transcriptionStatus: TranscriptionStatus;
  tags: string[];
  isEvidence: boolean;
  location?: { lat: number; lng: number; address: string };
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

export default function VoiceMemosPage() {
  const [activeTab, setActiveTab] = useState<"recordings" | "record" | "transcriptions">("recordings");
  const [memos, setMemos] = useState<VoiceMemo[]>([]);
  const [selectedMemo, setSelectedMemo] = useState<VoiceMemo | null>(null);
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>("idle");
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioQuality, setAudioQuality] = useState<AudioQuality>("high");
  const [selectedCase, setSelectedCase] = useState("");
  const [memoTitle, setMemoTitle] = useState("");
  const [isEvidence, setIsEvidence] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [playingMemoId, setPlayingMemoId] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load mock data
    setMemos([
      {
        id: "memo-1",
        caseId: "case-1",
        caseName: "Jane Doe",
        title: "Witness interview - convenience store clerk",
        duration: 342,
        fileSize: 2456789,
        recordedAt: "2026-01-17T10:30:00Z",
        recordedBy: "Officer Smith",
        transcription: "The witness stated they saw the missing person around 3 PM on January 15th. She was wearing a blue jacket and appeared to be heading towards the bus station. The witness noted she seemed distressed but was alone.",
        transcriptionStatus: "completed",
        tags: ["witness", "interview", "evidence"],
        isEvidence: true,
        location: { lat: 53.5461, lng: -113.4938, address: "123 Main St, Edmonton" },
      },
      {
        id: "memo-2",
        caseId: "case-1",
        caseName: "Jane Doe",
        title: "Field notes - search area observation",
        duration: 128,
        fileSize: 987654,
        recordedAt: "2026-01-16T14:20:00Z",
        recordedBy: "Det. Johnson",
        transcriptionStatus: "processing",
        tags: ["field-notes", "search"],
        isEvidence: false,
      },
      {
        id: "memo-3",
        caseId: "case-2",
        caseName: "John Smith",
        title: "Family member statement",
        duration: 567,
        fileSize: 4123456,
        recordedAt: "2026-01-15T09:00:00Z",
        recordedBy: "Officer Williams",
        transcription: "The family member provided detailed information about Mr. Smith's daily routine and mentioned he often visits the park near his home in the mornings.",
        transcriptionStatus: "completed",
        tags: ["family", "statement", "routine"],
        isEvidence: true,
      },
      {
        id: "memo-4",
        caseId: "case-1",
        caseName: "Jane Doe",
        title: "Anonymous tip recording",
        duration: 45,
        fileSize: 345678,
        recordedAt: "2026-01-17T16:45:00Z",
        recordedBy: "Tip Line",
        transcriptionStatus: "pending",
        tags: ["tip", "anonymous"],
        isEvidence: true,
      },
    ]);
  }, []);

  useEffect(() => {
    if (recordingStatus === "recording") {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [recordingStatus]);

  const startRecording = () => {
    setRecordingStatus("recording");
    setRecordingTime(0);
  };

  const pauseRecording = () => {
    setRecordingStatus("paused");
  };

  const resumeRecording = () => {
    setRecordingStatus("recording");
  };

  const stopRecording = async () => {
    setRecordingStatus("processing");
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setRecordingStatus("idle");
    setRecordingTime(0);
    setMemoTitle("");
    setActiveTab("recordings");
  };

  const filteredMemos = memos.filter(
    (memo) =>
      memo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      memo.caseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      memo.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getTranscriptionStatusColor = (status: TranscriptionStatus) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700";
      case "processing":
        return "bg-yellow-100 text-yellow-700";
      case "pending":
        return "bg-gray-100 text-gray-700";
      case "failed":
        return "bg-red-100 text-red-700";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Voice Memos & Audio Evidence</h1>
          <p className="text-gray-600 mt-2">Record, manage, and transcribe audio recordings for cases</p>
        </div>
        <button
          onClick={() => setActiveTab("record")}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="6" />
          </svg>
          New Recording
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {[
            { id: "recordings", label: "All Recordings" },
            { id: "record", label: "Record" },
            { id: "transcriptions", label: "Transcriptions" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Recordings Tab */}
      {activeTab === "recordings" && (
        <div>
          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search recordings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Recordings List */}
          <div className="space-y-4">
            {filteredMemos.map((memo) => (
              <div
                key={memo.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{memo.title}</h3>
                      {memo.isEvidence && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">Evidence</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="text-blue-600">{memo.caseName}</span>
                      <span>{formatDuration(memo.duration)}</span>
                      <span>{formatFileSize(memo.fileSize)}</span>
                      <span>{new Date(memo.recordedAt).toLocaleDateString()}</span>
                      <span>by {memo.recordedBy}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {memo.tags.map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                      <span className={`px-2 py-1 text-xs rounded ${getTranscriptionStatusColor(memo.transcriptionStatus)}`}>
                        Transcription: {memo.transcriptionStatus}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPlayingMemoId(playingMemoId === memo.id ? null : memo.id)}
                      className={`p-3 rounded-full ${
                        playingMemoId === memo.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {playingMemoId === memo.id ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <rect x="6" y="4" width="4" height="16" />
                          <rect x="14" y="4" width="4" height="16" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => setSelectedMemo(memo)}
                      className="p-2 text-gray-500 hover:text-gray-700"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Audio Player */}
                {playingMemoId === memo.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full w-1/3" />
                      </div>
                      <span className="text-sm text-gray-500">1:54 / {formatDuration(memo.duration)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Record Tab */}
      {activeTab === "record" && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            {/* Recording Interface */}
            <div className="text-center mb-8">
              <div
                className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center mb-4 transition-all ${
                  recordingStatus === "recording"
                    ? "bg-red-100 animate-pulse"
                    : recordingStatus === "paused"
                    ? "bg-yellow-100"
                    : "bg-gray-100"
                }`}
              >
                {recordingStatus === "processing" ? (
                  <svg className="w-12 h-12 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg
                    className={`w-12 h-12 ${recordingStatus === "recording" ? "text-red-600" : "text-gray-400"}`}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                  </svg>
                )}
              </div>
              <p className="text-4xl font-mono font-bold text-gray-900">{formatDuration(recordingTime)}</p>
              <p className="text-gray-500 mt-2">
                {recordingStatus === "idle" && "Ready to record"}
                {recordingStatus === "recording" && "Recording..."}
                {recordingStatus === "paused" && "Paused"}
                {recordingStatus === "processing" && "Saving..."}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 mb-8">
              {recordingStatus === "idle" && (
                <button
                  onClick={startRecording}
                  className="px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="6" />
                  </svg>
                  Start Recording
                </button>
              )}
              {recordingStatus === "recording" && (
                <>
                  <button
                    onClick={pauseRecording}
                    className="px-6 py-3 bg-yellow-500 text-white rounded-full hover:bg-yellow-600 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                    Pause
                  </button>
                  <button
                    onClick={stopRecording}
                    className="px-6 py-3 bg-gray-600 text-white rounded-full hover:bg-gray-700 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" />
                    </svg>
                    Stop & Save
                  </button>
                </>
              )}
              {recordingStatus === "paused" && (
                <>
                  <button
                    onClick={resumeRecording}
                    className="px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="6" />
                    </svg>
                    Resume
                  </button>
                  <button
                    onClick={stopRecording}
                    className="px-6 py-3 bg-gray-600 text-white rounded-full hover:bg-gray-700 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" />
                    </svg>
                    Stop & Save
                  </button>
                </>
              )}
            </div>

            {/* Recording Settings */}
            <div className="space-y-4 border-t border-gray-200 pt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Associated Case</label>
                <select
                  value={selectedCase}
                  onChange={(e) => setSelectedCase(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a case...</option>
                  <option value="case-1">Jane Doe - Missing Person</option>
                  <option value="case-2">John Smith - Missing Person</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recording Title</label>
                <input
                  type="text"
                  value={memoTitle}
                  onChange={(e) => setMemoTitle(e.target.value)}
                  placeholder="e.g., Witness interview, Field notes..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Audio Quality</label>
                <div className="flex gap-3">
                  {(["low", "medium", "high"] as AudioQuality[]).map((quality) => (
                    <label
                      key={quality}
                      className={`flex-1 p-3 border rounded-lg cursor-pointer text-center ${
                        audioQuality === quality ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="quality"
                        value={quality}
                        checked={audioQuality === quality}
                        onChange={() => setAudioQuality(quality)}
                        className="sr-only"
                      />
                      <p className="font-medium capitalize">{quality}</p>
                      <p className="text-xs text-gray-500">
                        {quality === "low" && "~64 kbps"}
                        {quality === "medium" && "~128 kbps"}
                        {quality === "high" && "~256 kbps"}
                      </p>
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isEvidence}
                  onChange={(e) => setIsEvidence(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Mark as evidence (cannot be deleted)</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Transcriptions Tab */}
      {activeTab === "transcriptions" && (
        <div className="space-y-6">
          {memos
            .filter((m) => m.transcription)
            .map((memo) => (
              <div key={memo.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{memo.title}</h3>
                    <p className="text-sm text-gray-500">
                      {memo.caseName} &bull; {new Date(memo.recordedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 text-sm">Edit Transcription</button>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{memo.transcription}</p>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedMemo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">{selectedMemo.title}</h2>
              <button onClick={() => setSelectedMemo(null)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Case</p>
                  <p className="font-medium text-blue-600">{selectedMemo.caseName}</p>
                </div>
                <div>
                  <p className="text-gray-500">Duration</p>
                  <p className="font-medium">{formatDuration(selectedMemo.duration)}</p>
                </div>
                <div>
                  <p className="text-gray-500">File Size</p>
                  <p className="font-medium">{formatFileSize(selectedMemo.fileSize)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Recorded By</p>
                  <p className="font-medium">{selectedMemo.recordedBy}</p>
                </div>
              </div>

              {selectedMemo.transcription && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Transcription</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedMemo.transcription}</p>
                  </div>
                </div>
              )}

              {selectedMemo.location && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Recording Location</h3>
                  <p className="text-gray-600">{selectedMemo.location.address}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Download</button>
              <button className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                Request Transcription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
