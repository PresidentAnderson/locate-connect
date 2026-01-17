"use client";

import { cn } from "@/lib";
import type { TrainingCertification } from "@/types/training.types";

interface CertificateCardProps {
  certification: TrainingCertification;
  onDownload?: () => void;
  onShare?: () => void;
  onVerify?: () => void;
  className?: string;
}

export function CertificateCard({
  certification,
  onDownload,
  onShare,
  onVerify,
  className,
}: CertificateCardProps) {
  const isExpired = certification.expiresAt && new Date(certification.expiresAt) < new Date();
  const daysUntilExpiry = certification.expiresAt
    ? Math.ceil((new Date(certification.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const getStatusColor = () => {
    if (certification.status === "revoked") return "border-red-300 bg-red-50";
    if (isExpired) return "border-yellow-300 bg-yellow-50";
    return "border-green-300 bg-green-50";
  };

  const getStatusBadge = () => {
    if (certification.status === "revoked") {
      return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Revoked</span>;
    }
    if (isExpired) {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Expired</span>;
    }
    if (daysUntilExpiry && daysUntilExpiry <= 30) {
      return (
        <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
          Expires in {daysUntilExpiry} days
        </span>
      );
    }
    return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Active</span>;
  };

  return (
    <div
      className={cn(
        "rounded-lg border-2 p-6 transition-shadow hover:shadow-md",
        getStatusColor(),
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
            <CertificateIcon className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{certification.track?.title}</h3>
            <p className="text-sm text-gray-500">Certificate #{certification.certificateNumber}</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Details */}
      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Issued</p>
          <p className="font-medium text-gray-900">
            {new Date(certification.issuedAt).toLocaleDateString()}
          </p>
        </div>
        {certification.expiresAt && (
          <div>
            <p className="text-gray-500">Expires</p>
            <p className={cn("font-medium", isExpired ? "text-red-600" : "text-gray-900")}>
              {new Date(certification.expiresAt).toLocaleDateString()}
            </p>
          </div>
        )}
        {certification.finalScorePercentage && (
          <div>
            <p className="text-gray-500">Final Score</p>
            <p className="font-medium text-gray-900">{certification.finalScorePercentage}%</p>
          </div>
        )}
        {certification.verificationHash && (
          <div>
            <p className="text-gray-500">Verification</p>
            <p className="font-mono text-xs text-gray-600">{certification.verificationHash.slice(0, 12)}...</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-6 flex items-center gap-2">
        {onDownload && (
          <button
            onClick={onDownload}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
          >
            <DownloadIcon className="h-4 w-4" />
            Download
          </button>
        )}
        {onShare && (
          <button
            onClick={onShare}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
          >
            <ShareIcon className="h-4 w-4" />
            Share
          </button>
        )}
        {onVerify && (
          <button
            onClick={onVerify}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700"
          >
            <CheckBadgeIcon className="h-4 w-4" />
            Verify
          </button>
        )}
      </div>
    </div>
  );
}

function CertificateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
    </svg>
  );
}

function CheckBadgeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
    </svg>
  );
}
