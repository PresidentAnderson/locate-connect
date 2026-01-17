"use client";

import { useState, useEffect } from "react";

export const dynamic = "force-dynamic";

type DocumentType = "photo" | "video" | "report" | "form" | "evidence" | "correspondence" | "other";
type DocumentStatus = "draft" | "pending_review" | "approved" | "archived";

interface Document {
  id: string;
  name: string;
  type: DocumentType;
  status: DocumentStatus;
  size: number;
  mimeType: string;
  caseId?: string;
  caseName?: string;
  uploadedBy: string;
  uploadedAt: string;
  updatedAt: string;
  tags: string[];
  description?: string;
  thumbnailUrl?: string;
  isConfidential: boolean;
  version: number;
}

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  documentCount: number;
  color: string;
}

const DOCUMENT_TYPES: { id: DocumentType; name: string; icon: string }[] = [
  { id: "photo", name: "Photos", icon: "🖼️" },
  { id: "video", name: "Videos", icon: "🎥" },
  { id: "report", name: "Reports", icon: "📄" },
  { id: "form", name: "Forms", icon: "📋" },
  { id: "evidence", name: "Evidence", icon: "🔍" },
  { id: "correspondence", name: "Correspondence", icon: "✉️" },
  { id: "other", name: "Other", icon: "📁" },
];

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState<"all" | "recent" | "shared" | "trash">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<DocumentType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<DocumentStatus | "all">("all");
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState<Document | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    // Load mock data
    setFolders([
      { id: "folder-1", name: "Case Files", parentId: null, documentCount: 24, color: "blue" },
      { id: "folder-2", name: "Evidence Photos", parentId: null, documentCount: 156, color: "green" },
      { id: "folder-3", name: "Reports", parentId: null, documentCount: 18, color: "purple" },
      { id: "folder-4", name: "Forms & Templates", parentId: null, documentCount: 12, color: "orange" },
      { id: "folder-5", name: "Correspondence", parentId: null, documentCount: 45, color: "red" },
    ]);

    setDocuments([
      {
        id: "doc-1",
        name: "Jane_Doe_Initial_Report.pdf",
        type: "report",
        status: "approved",
        size: 2456789,
        mimeType: "application/pdf",
        caseId: "case-1",
        caseName: "Jane Doe",
        uploadedBy: "Officer Smith",
        uploadedAt: "2026-01-15T10:30:00Z",
        updatedAt: "2026-01-15T10:30:00Z",
        tags: ["initial-report", "jane-doe"],
        description: "Initial missing person report filed by family",
        isConfidential: false,
        version: 1,
      },
      {
        id: "doc-2",
        name: "Surveillance_Downtown_01.mp4",
        type: "video",
        status: "pending_review",
        size: 156789012,
        mimeType: "video/mp4",
        caseId: "case-1",
        caseName: "Jane Doe",
        uploadedBy: "Det. Johnson",
        uploadedAt: "2026-01-16T14:20:00Z",
        updatedAt: "2026-01-16T14:20:00Z",
        tags: ["surveillance", "downtown", "cctv"],
        description: "CCTV footage from downtown intersection",
        isConfidential: true,
        version: 1,
      },
      {
        id: "doc-3",
        name: "Last_Known_Photo.jpg",
        type: "photo",
        status: "approved",
        size: 3456789,
        mimeType: "image/jpeg",
        caseId: "case-1",
        caseName: "Jane Doe",
        uploadedBy: "Family Member",
        uploadedAt: "2026-01-15T09:00:00Z",
        updatedAt: "2026-01-15T09:00:00Z",
        tags: ["photo", "identification"],
        description: "Most recent photo provided by family",
        thumbnailUrl: "/placeholder-photo.jpg",
        isConfidential: false,
        version: 2,
      },
      {
        id: "doc-4",
        name: "Witness_Statement_001.pdf",
        type: "evidence",
        status: "approved",
        size: 456789,
        mimeType: "application/pdf",
        caseId: "case-1",
        caseName: "Jane Doe",
        uploadedBy: "Officer Williams",
        uploadedAt: "2026-01-16T11:00:00Z",
        updatedAt: "2026-01-16T11:00:00Z",
        tags: ["witness", "statement"],
        description: "Written statement from convenience store clerk",
        isConfidential: true,
        version: 1,
      },
      {
        id: "doc-5",
        name: "Search_Area_Map.pdf",
        type: "report",
        status: "draft",
        size: 1234567,
        mimeType: "application/pdf",
        caseId: "case-1",
        caseName: "Jane Doe",
        uploadedBy: "Search Coordinator",
        uploadedAt: "2026-01-17T08:00:00Z",
        updatedAt: "2026-01-17T08:00:00Z",
        tags: ["search", "map", "planning"],
        description: "Proposed search area grid for volunteer teams",
        isConfidential: false,
        version: 3,
      },
      {
        id: "doc-6",
        name: "Media_Release_Form.docx",
        type: "form",
        status: "approved",
        size: 89012,
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        uploadedBy: "Admin",
        uploadedAt: "2026-01-10T12:00:00Z",
        updatedAt: "2026-01-10T12:00:00Z",
        tags: ["template", "media", "form"],
        description: "Standard media release authorization form",
        isConfidential: false,
        version: 1,
      },
    ]);
  }, []);

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === "all" || doc.type === filterType;
    const matchesStatus = filterStatus === "all" || doc.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleSelectDocument = (docId: string) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocuments(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedDocuments.size === filteredDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(filteredDocuments.map((d) => d.id)));
    }
  };

  const handleUpload = async () => {
    setUploading(true);
    setUploadProgress(0);
    // Simulate upload
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      setUploadProgress(i);
    }
    setUploading(false);
    setShowUploadModal(false);
  };

  const getStatusColor = (status: DocumentStatus) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-700";
      case "pending_review":
        return "bg-yellow-100 text-yellow-700";
      case "approved":
        return "bg-green-100 text-green-700";
      case "archived":
        return "bg-blue-100 text-blue-700";
    }
  };

  const getTypeIcon = (type: DocumentType) => {
    return DOCUMENT_TYPES.find((t) => t.id === type)?.icon || "📁";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Document Management</h1>
          <p className="text-gray-600 mt-2">Store, organize, and share case-related documents</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Upload Documents
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {[
            { id: "all", label: "All Documents" },
            { id: "recent", label: "Recent" },
            { id: "shared", label: "Shared with Me" },
            { id: "trash", label: "Trash" },
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

      <div className="flex gap-6">
        {/* Sidebar - Folders */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Folders</h3>
            <div className="space-y-2">
              <button
                onClick={() => setCurrentFolder(null)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                  currentFolder === null ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
                <span>All Files</span>
              </button>
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => setCurrentFolder(folder.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left ${
                    currentFolder === folder.id ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded bg-${folder.color}-500`} />
                    <span className="text-sm">{folder.name}</span>
                  </div>
                  <span className="text-xs text-gray-500">{folder.documentCount}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Storage</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Used</span>
                  <span className="text-gray-900">2.4 GB / 10 GB</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: "24%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Toolbar */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Filters */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as DocumentType | "all")}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as DocumentStatus | "all")}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="pending_review">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="archived">Archived</option>
              </select>

              {/* View Toggle */}
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 ${viewMode === "grid" ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-50"}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 ${viewMode === "list" ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-50"}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedDocuments.size > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-4">
                <span className="text-sm text-gray-600">{selectedDocuments.size} selected</span>
                <button className="text-sm text-blue-600 hover:text-blue-800">Download</button>
                <button className="text-sm text-blue-600 hover:text-blue-800">Move</button>
                <button className="text-sm text-blue-600 hover:text-blue-800">Share</button>
                <button className="text-sm text-red-600 hover:text-red-800">Delete</button>
              </div>
            )}
          </div>

          {/* Documents Grid/List */}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className={`bg-white rounded-lg border p-4 cursor-pointer transition-all ${
                    selectedDocuments.has(doc.id) ? "border-blue-600 ring-2 ring-blue-100" : "border-gray-200 hover:shadow-md"
                  }`}
                  onClick={() => setShowPreviewModal(doc)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <input
                      type="checkbox"
                      checked={selectedDocuments.has(doc.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelectDocument(doc.id);
                      }}
                      className="mt-1"
                    />
                    {doc.isConfidential && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">Confidential</span>
                    )}
                  </div>

                  <div className="flex flex-col items-center py-4">
                    <div className="text-4xl mb-2">{getTypeIcon(doc.type)}</div>
                    <p className="font-medium text-gray-900 text-center text-sm truncate w-full">{doc.name}</p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{formatFileSize(doc.size)}</span>
                      <span className={`px-2 py-1 rounded ${getStatusColor(doc.status)}`}>
                        {doc.status.replace("_", " ")}
                      </span>
                    </div>
                    {doc.caseName && <p className="text-xs text-blue-600 mt-2">Case: {doc.caseName}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedDocuments.size === filteredDocuments.length && filteredDocuments.length > 0}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Case</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Size</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Modified</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setShowPreviewModal(doc)}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedDocuments.has(doc.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectDocument(doc.id);
                          }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{getTypeIcon(doc.type)}</span>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{doc.name}</p>
                            {doc.isConfidential && <span className="text-xs text-red-600">Confidential</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">{doc.type}</td>
                      <td className="px-4 py-3 text-sm text-blue-600">{doc.caseName || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatFileSize(doc.size)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(doc.status)}`}>
                          {doc.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(doc.updatedAt)}</td>
                      <td className="px-4 py-3">
                        <button className="text-gray-400 hover:text-gray-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                            />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-lg w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Upload Documents</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-gray-600 mb-2">Drag and drop files here, or click to browse</p>
              <p className="text-sm text-gray-500">Supports PDF, images, videos, and documents up to 100MB</p>
              <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Select Files
              </button>
            </div>

            {uploading && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">{showPreviewModal.name}</h2>
              <button onClick={() => setShowPreviewModal(null)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Preview area */}
              <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center mb-6">
                <span className="text-6xl">{getTypeIcon(showPreviewModal.type)}</span>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Type</p>
                  <p className="font-medium text-gray-900 capitalize">{showPreviewModal.type}</p>
                </div>
                <div>
                  <p className="text-gray-500">Size</p>
                  <p className="font-medium text-gray-900">{formatFileSize(showPreviewModal.size)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <span className={`px-2 py-1 rounded ${getStatusColor(showPreviewModal.status)}`}>
                    {showPreviewModal.status.replace("_", " ")}
                  </span>
                </div>
                <div>
                  <p className="text-gray-500">Version</p>
                  <p className="font-medium text-gray-900">v{showPreviewModal.version}</p>
                </div>
                <div>
                  <p className="text-gray-500">Uploaded By</p>
                  <p className="font-medium text-gray-900">{showPreviewModal.uploadedBy}</p>
                </div>
                <div>
                  <p className="text-gray-500">Uploaded At</p>
                  <p className="font-medium text-gray-900">{formatDate(showPreviewModal.uploadedAt)}</p>
                </div>
                {showPreviewModal.caseName && (
                  <div className="col-span-2">
                    <p className="text-gray-500">Associated Case</p>
                    <p className="font-medium text-blue-600">{showPreviewModal.caseName}</p>
                  </div>
                )}
                {showPreviewModal.description && (
                  <div className="col-span-2">
                    <p className="text-gray-500">Description</p>
                    <p className="font-medium text-gray-900">{showPreviewModal.description}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <p className="text-gray-500">Tags</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {showPreviewModal.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Download</button>
              <button className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Share</button>
              <button className="py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
