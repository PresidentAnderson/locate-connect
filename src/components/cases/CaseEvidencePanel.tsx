"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib";
import type { CaseEvidenceItem } from "@/types";

interface CaseEvidencePanelProps {
  caseId: string;
}

interface EvidenceResponse {
  items: CaseEvidenceItem[];
}

export default function CaseEvidencePanel({ caseId }: CaseEvidencePanelProps) {
  const [items, setItems] = useState<CaseEvidenceItem[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [activeUrl, setActiveUrl] = useState<Record<string, string>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [transcriptEdits, setTranscriptEdits] = useState<Record<string, string>>({});

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const loadEvidence = useCallback(async () => {
    const response = await fetch(`/api/cases/${caseId}/evidence`);
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as EvidenceResponse;
    setItems(data.items ?? []);
    setTranscriptEdits((prev) => {
      const next = { ...prev };
      data.items?.forEach((item) => {
        if (next[item.id] === undefined) {
          next[item.id] = item.transcriptText ?? "";
        }
      });
      return next;
    });
  }, [caseId]);

  useEffect(() => {
    void loadEvidence();
  }, [loadEvidence]);

  const startRecording = async () => {
    setMessage(null);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const recorder = new MediaRecorder(stream);

    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      const file = new File([blob], `recording-${Date.now()}.webm`, {
        type: recorder.mimeType,
      });
      setPendingFile(file);
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadEvidence = async () => {
    if (!pendingFile) return;

    setIsBusy(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", pendingFile);

    const response = await fetch(`/api/cases/${caseId}/evidence`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorBody = (await response.json()) as { error?: string };
      setMessage(errorBody.error ?? "Unable to upload evidence");
    } else {
      setMessage("Evidence uploaded");
      setPendingFile(null);
      await loadEvidence();
    }

    setIsBusy(false);
  };

  const requestAccess = async (evidenceId: string) => {
    setMessage(null);
    const response = await fetch(
      `/api/cases/${caseId}/evidence/${evidenceId}/access`
    );
    if (!response.ok) {
      const errorBody = (await response.json()) as { error?: string };
      setMessage(errorBody.error ?? "Unable to access evidence");
      return;
    }
    const data = (await response.json()) as { url: string };
    setActiveUrl((prev) => ({ ...prev, [evidenceId]: data.url }));
  };

  const saveTranscript = async (evidenceId: string) => {
    setIsBusy(true);
    setMessage(null);
    const response = await fetch(
      `/api/cases/${caseId}/evidence/${evidenceId}/transcript`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcriptText: transcriptEdits[evidenceId] }),
      }
    );

    if (!response.ok) {
      const errorBody = (await response.json()) as { error?: string };
      setMessage(errorBody.error ?? "Unable to save transcript");
    } else {
      setMessage("Transcript saved");
      await loadEvidence();
    }

    setIsBusy(false);
  };

  return (
    <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Audio Evidence</h2>
          <p className="text-sm text-gray-500">
            Record or upload voice evidence. Access is logged for chain-of-custody.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={cn(
              "rounded-lg px-3 py-2 text-xs font-medium text-white",
              isRecording ? "bg-rose-600 hover:bg-rose-700" : "bg-gray-900 hover:bg-gray-800"
            )}
          >
            {isRecording ? "Stop recording" : "Start recording"}
          </button>
        </div>
      </div>

      {message ? (
        <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
          {message}
        </p>
      ) : null}

      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700">Upload audio</label>
        <input
          type="file"
          accept="audio/*"
          onChange={(event) => setPendingFile(event.target.files?.[0] ?? null)}
          className="w-full text-sm text-gray-600"
        />
        <button
          type="button"
          onClick={uploadEvidence}
          disabled={!pendingFile || isBusy}
          className={cn(
            "rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white",
            !pendingFile || isBusy ? "opacity-60" : "hover:bg-blue-700"
          )}
        >
          Upload audio evidence
        </button>
        {pendingFile ? (
          <p className="text-xs text-gray-500">Ready: {pendingFile.name}</p>
        ) : null}
      </div>

      <div className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">No audio evidence recorded yet.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-lg border border-gray-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.fileName}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(item.createdAt).toLocaleString()} • {item.transcriptStatus}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => requestAccess(item.id)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Load playback
                </button>
              </div>
              {activeUrl[item.id] ? (
                <audio
                  controls
                  src={activeUrl[item.id]}
                  className="mt-3 w-full"
                />
              ) : null}
              <div className="mt-3">
                <label className="text-xs font-semibold text-gray-600">Transcript</label>
                <textarea
                  value={transcriptEdits[item.id] ?? ""}
                  onChange={(event) =>
                    setTranscriptEdits((prev) => ({
                      ...prev,
                      [item.id]: event.target.value,
                    }))
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  placeholder="Paste transcript or leave blank"
                />
                <button
                  type="button"
                  onClick={() => saveTranscript(item.id)}
                  disabled={isBusy}
                  className={cn(
                    "mt-2 rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white",
                    isBusy ? "opacity-60" : "hover:bg-gray-800"
                  )}
                >
                  Save transcript
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
