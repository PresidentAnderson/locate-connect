"use client";

import { useState, useEffect } from "react";

export const dynamic = "force-dynamic";

type PartnerType = "shelter" | "hospital" | "transit" | "school" | "business" | "nonprofit" | "government" | "other";
type PartnerStatus = "active" | "pending" | "inactive" | "suspended";
type AccessLevel = "view_only" | "submit_tips" | "case_updates" | "full_access";

interface PartnerOrganization {
  id: string;
  name: string;
  type: PartnerType;
  status: PartnerStatus;
  accessLevel: AccessLevel;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  website?: string;
  joinedAt: string;
  lastActivity?: string;
  casesAssisted: number;
  tipsSubmitted: number;
  description?: string;
  logoUrl?: string;
}

interface PartnerActivity {
  id: string;
  partnerId: string;
  partnerName: string;
  type: "tip_submitted" | "case_viewed" | "resource_shared" | "alert_acknowledged";
  description: string;
  timestamp: string;
  caseId?: string;
  caseName?: string;
}

const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  shelter: "Shelter",
  hospital: "Hospital/Healthcare",
  transit: "Transit Authority",
  school: "School/University",
  business: "Business",
  nonprofit: "Non-Profit",
  government: "Government Agency",
  other: "Other",
};

const getStatusColor = (status: PartnerStatus) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-700";
    case "pending":
      return "bg-yellow-100 text-yellow-700";
    case "inactive":
      return "bg-gray-100 text-gray-700";
    case "suspended":
      return "bg-red-100 text-red-700";
  }
};

const getAccessLevelColor = (level: AccessLevel) => {
  switch (level) {
    case "view_only":
      return "bg-gray-100 text-gray-700";
    case "submit_tips":
      return "bg-blue-100 text-blue-700";
    case "case_updates":
      return "bg-purple-100 text-purple-700";
    case "full_access":
      return "bg-green-100 text-green-700";
  }
};

export default function PartnerPortalPage() {
  const [activeTab, setActiveTab] = useState<"partners" | "activity" | "requests" | "add">("partners");
  const [partners, setPartners] = useState<PartnerOrganization[]>([]);
  const [activities, setActivities] = useState<PartnerActivity[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<PartnerOrganization | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<PartnerType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<PartnerStatus | "all">("all");

  // Add partner form state
  const [newPartner, setNewPartner] = useState({
    name: "",
    type: "nonprofit" as PartnerType,
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    website: "",
    accessLevel: "submit_tips" as AccessLevel,
    description: "",
  });

  useEffect(() => {
    // Load mock partners
    setPartners([
      {
        id: "partner-1",
        name: "Hope Shelter Edmonton",
        type: "shelter",
        status: "active",
        accessLevel: "case_updates",
        contactName: "Maria Santos",
        contactEmail: "maria@hopeshelter.org",
        contactPhone: "780-555-0101",
        address: "123 Main St, Edmonton, AB",
        website: "hopeshelter.org",
        joinedAt: "2025-06-15T00:00:00Z",
        lastActivity: "2026-01-17T10:30:00Z",
        casesAssisted: 34,
        tipsSubmitted: 127,
        description: "Emergency shelter serving the Edmonton area with 50 beds capacity.",
      },
      {
        id: "partner-2",
        name: "Royal Alexandra Hospital",
        type: "hospital",
        status: "active",
        accessLevel: "full_access",
        contactName: "Dr. James Wilson",
        contactEmail: "jwilson@rah.ca",
        contactPhone: "780-555-0102",
        address: "10240 Kingsway NW, Edmonton, AB",
        joinedAt: "2025-03-01T00:00:00Z",
        lastActivity: "2026-01-17T14:00:00Z",
        casesAssisted: 89,
        tipsSubmitted: 45,
        description: "Major trauma center and emergency department in Edmonton.",
      },
      {
        id: "partner-3",
        name: "Edmonton Transit Service",
        type: "transit",
        status: "active",
        accessLevel: "submit_tips",
        contactName: "Robert Kim",
        contactEmail: "rkim@ets.edmonton.ca",
        contactPhone: "780-555-0103",
        address: "10220 103 St NW, Edmonton, AB",
        joinedAt: "2025-08-20T00:00:00Z",
        lastActivity: "2026-01-16T08:00:00Z",
        casesAssisted: 12,
        tipsSubmitted: 56,
        description: "Public transit authority operating buses and LRT in Edmonton.",
      },
      {
        id: "partner-4",
        name: "University of Alberta",
        type: "school",
        status: "active",
        accessLevel: "view_only",
        contactName: "Sarah Thompson",
        contactEmail: "sthompson@ualberta.ca",
        contactPhone: "780-555-0104",
        address: "116 St & 85 Ave, Edmonton, AB",
        website: "ualberta.ca",
        joinedAt: "2025-09-01T00:00:00Z",
        lastActivity: "2026-01-15T16:30:00Z",
        casesAssisted: 5,
        tipsSubmitted: 18,
        description: "Major research university with campus security collaboration.",
      },
      {
        id: "partner-5",
        name: "Community Safety Association",
        type: "nonprofit",
        status: "pending",
        accessLevel: "submit_tips",
        contactName: "Linda Chen",
        contactEmail: "lchen@communitysafety.org",
        contactPhone: "780-555-0105",
        address: "456 Jasper Ave, Edmonton, AB",
        joinedAt: "2026-01-10T00:00:00Z",
        casesAssisted: 0,
        tipsSubmitted: 0,
        description: "Volunteer organization focused on community safety initiatives.",
      },
    ]);

    // Load mock activities
    setActivities([
      {
        id: "act-1",
        partnerId: "partner-1",
        partnerName: "Hope Shelter Edmonton",
        type: "tip_submitted",
        description: "Submitted tip about possible sighting at shelter intake",
        timestamp: "2026-01-17T10:30:00Z",
        caseId: "case-1",
        caseName: "Jane Doe",
      },
      {
        id: "act-2",
        partnerId: "partner-2",
        partnerName: "Royal Alexandra Hospital",
        type: "case_viewed",
        description: "Accessed case details for patient matching",
        timestamp: "2026-01-17T14:00:00Z",
        caseId: "case-2",
        caseName: "John Smith",
      },
      {
        id: "act-3",
        partnerId: "partner-3",
        partnerName: "Edmonton Transit Service",
        type: "alert_acknowledged",
        description: "Acknowledged AMBER Alert distribution to transit displays",
        timestamp: "2026-01-16T08:00:00Z",
        caseId: "case-3",
        caseName: "Emily Chen",
      },
      {
        id: "act-4",
        partnerId: "partner-1",
        partnerName: "Hope Shelter Edmonton",
        type: "resource_shared",
        description: "Distributed missing person flyers at shelter locations",
        timestamp: "2026-01-15T12:00:00Z",
        caseId: "case-1",
        caseName: "Jane Doe",
      },
    ]);
  }, []);

  const filteredPartners = partners.filter((partner) => {
    const matchesSearch =
      partner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      partner.contactName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || partner.type === filterType;
    const matchesStatus = filterStatus === "all" || partner.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const pendingRequests = partners.filter((p) => p.status === "pending");

  const handleAddPartner = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setActiveTab("partners");
    setNewPartner({
      name: "",
      type: "nonprofit",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      address: "",
      website: "",
      accessLevel: "submit_tips",
      description: "",
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Partner Organization Portal</h1>
          <p className="text-gray-600 mt-2">Manage partnerships with community organizations</p>
        </div>
        <button
          onClick={() => setActiveTab("add")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Partner
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Active Partners</p>
          <p className="text-2xl font-bold text-green-600">{partners.filter((p) => p.status === "active").length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Pending Requests</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingRequests.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Tips Submitted</p>
          <p className="text-2xl font-bold text-blue-600">{partners.reduce((sum, p) => sum + p.tipsSubmitted, 0)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Cases Assisted</p>
          <p className="text-2xl font-bold text-gray-900">{partners.reduce((sum, p) => sum + p.casesAssisted, 0)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {[
            { id: "partners", label: "Partners" },
            { id: "activity", label: "Activity Feed" },
            { id: "requests", label: `Requests (${pendingRequests.length})` },
            { id: "add", label: "Add Partner" },
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

      {/* Partners Tab */}
      {activeTab === "partners" && (
        <div>
          {/* Search & Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 relative max-w-md">
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
                placeholder="Search partners..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as PartnerType | "all")}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              {Object.entries(PARTNER_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as PartnerStatus | "all")}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {/* Partners Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPartners.map((partner) => (
              <div
                key={partner.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedPartner(partner)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center text-xl">
                      {partner.type === "shelter" && "🏠"}
                      {partner.type === "hospital" && "🏥"}
                      {partner.type === "transit" && "🚌"}
                      {partner.type === "school" && "🎓"}
                      {partner.type === "business" && "🏢"}
                      {partner.type === "nonprofit" && "💚"}
                      {partner.type === "government" && "🏛️"}
                      {partner.type === "other" && "📋"}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{partner.name}</h3>
                      <p className="text-sm text-gray-500">{PARTNER_TYPE_LABELS[partner.type]}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(partner.status)}`}>
                      {partner.status}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded ${getAccessLevelColor(partner.accessLevel)}`}>
                      {partner.accessLevel.replace("_", " ")}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                  <div>
                    <p className="text-gray-500">Tips Submitted</p>
                    <p className="font-medium">{partner.tipsSubmitted}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Cases Assisted</p>
                    <p className="font-medium">{partner.casesAssisted}</p>
                  </div>
                </div>

                <div className="text-sm text-gray-500">
                  <p>Contact: {partner.contactName}</p>
                  <p>{partner.contactEmail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === "activity" && (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        activity.type === "tip_submitted"
                          ? "bg-blue-100 text-blue-700"
                          : activity.type === "case_viewed"
                          ? "bg-purple-100 text-purple-700"
                          : activity.type === "resource_shared"
                          ? "bg-green-100 text-green-700"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {activity.type.replace("_", " ")}
                    </span>
                    <span className="font-medium text-gray-900">{activity.partnerName}</span>
                  </div>
                  <p className="text-gray-700">{activity.description}</p>
                  {activity.caseName && (
                    <p className="text-sm text-blue-600 mt-1">Case: {activity.caseName}</p>
                  )}
                </div>
                <p className="text-sm text-gray-500">{new Date(activity.timestamp).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Requests Tab */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          {pendingRequests.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <p className="text-gray-500">No pending partnership requests</p>
            </div>
          ) : (
            pendingRequests.map((partner) => (
              <div key={partner.id} className="bg-white rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{partner.name}</h3>
                    <p className="text-sm text-gray-500">{PARTNER_TYPE_LABELS[partner.type]}</p>
                    <p className="text-sm text-gray-600 mt-2">{partner.description}</p>
                    <div className="mt-3 text-sm">
                      <p>Contact: {partner.contactName}</p>
                      <p>{partner.contactEmail} &bull; {partner.contactPhone}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
                      Approve
                    </button>
                    <button className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">
                      Review
                    </button>
                    <button className="px-4 py-2 border border-red-300 text-red-700 text-sm rounded-lg hover:bg-red-50">
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Partner Tab */}
      {activeTab === "add" && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
              <input
                type="text"
                value={newPartner.name}
                onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })}
                placeholder="e.g., Community Health Center"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization Type</label>
                <select
                  value={newPartner.type}
                  onChange={(e) => setNewPartner({ ...newPartner, type: e.target.value as PartnerType })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(PARTNER_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Access Level</label>
                <select
                  value={newPartner.accessLevel}
                  onChange={(e) => setNewPartner({ ...newPartner, accessLevel: e.target.value as AccessLevel })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="view_only">View Only</option>
                  <option value="submit_tips">Submit Tips</option>
                  <option value="case_updates">Case Updates</option>
                  <option value="full_access">Full Access</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Contact Name</label>
              <input
                type="text"
                value={newPartner.contactName}
                onChange={(e) => setNewPartner({ ...newPartner, contactName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={newPartner.contactEmail}
                  onChange={(e) => setNewPartner({ ...newPartner, contactEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={newPartner.contactPhone}
                  onChange={(e) => setNewPartner({ ...newPartner, contactPhone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={newPartner.address}
                onChange={(e) => setNewPartner({ ...newPartner, address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website (Optional)</label>
              <input
                type="url"
                value={newPartner.website}
                onChange={(e) => setNewPartner({ ...newPartner, website: e.target.value })}
                placeholder="https://"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={newPartner.description}
                onChange={(e) => setNewPartner({ ...newPartner, description: e.target.value })}
                rows={3}
                placeholder="Brief description of the organization and how they can assist..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAddPartner}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Partner
              </button>
              <button
                onClick={() => setActiveTab("partners")}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedPartner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-2xl">
                  {selectedPartner.type === "shelter" && "🏠"}
                  {selectedPartner.type === "hospital" && "🏥"}
                  {selectedPartner.type === "transit" && "🚌"}
                  {selectedPartner.type === "school" && "🎓"}
                  {selectedPartner.type === "business" && "🏢"}
                  {selectedPartner.type === "nonprofit" && "💚"}
                  {selectedPartner.type === "government" && "🏛️"}
                  {selectedPartner.type === "other" && "📋"}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{selectedPartner.name}</h2>
                  <p className="text-gray-500">{PARTNER_TYPE_LABELS[selectedPartner.type]}</p>
                </div>
              </div>
              <button onClick={() => setSelectedPartner(null)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                <div>
                  <p className="text-gray-500">Status</p>
                  <span className={`px-2 py-1 text-xs rounded ${getStatusColor(selectedPartner.status)}`}>
                    {selectedPartner.status}
                  </span>
                </div>
                <div>
                  <p className="text-gray-500">Access Level</p>
                  <span className={`px-2 py-1 text-xs rounded ${getAccessLevelColor(selectedPartner.accessLevel)}`}>
                    {selectedPartner.accessLevel.replace("_", " ")}
                  </span>
                </div>
                <div>
                  <p className="text-gray-500">Tips Submitted</p>
                  <p className="font-medium">{selectedPartner.tipsSubmitted}</p>
                </div>
                <div>
                  <p className="text-gray-500">Cases Assisted</p>
                  <p className="font-medium">{selectedPartner.casesAssisted}</p>
                </div>
                <div>
                  <p className="text-gray-500">Joined</p>
                  <p className="font-medium">{new Date(selectedPartner.joinedAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Last Activity</p>
                  <p className="font-medium">
                    {selectedPartner.lastActivity
                      ? new Date(selectedPartner.lastActivity).toLocaleString()
                      : "Never"}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-gray-500 text-sm">Contact</p>
                  <p className="font-medium">{selectedPartner.contactName}</p>
                  <p className="text-gray-600">{selectedPartner.contactEmail}</p>
                  <p className="text-gray-600">{selectedPartner.contactPhone}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Address</p>
                  <p className="text-gray-700">{selectedPartner.address}</p>
                </div>
                {selectedPartner.description && (
                  <div>
                    <p className="text-gray-500 text-sm">Description</p>
                    <p className="text-gray-700">{selectedPartner.description}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Edit Partner</button>
              <button className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                View Activity
              </button>
              <button className="py-2 px-4 border border-red-300 text-red-700 rounded-lg hover:bg-red-50">
                Suspend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
