"use client";

import { useState, useEffect } from "react";

export const dynamic = "force-dynamic";

type VehicleType = "car" | "truck" | "suv" | "van" | "motorcycle" | "other";
type AlertStatus = "active" | "resolved" | "expired";
type SightingConfidence = "confirmed" | "probable" | "possible" | "unverified";

interface VehicleRecord {
  id: string;
  caseId: string;
  caseName: string;
  licensePlate: string;
  state: string;
  make: string;
  model: string;
  year: number;
  color: string;
  type: VehicleType;
  vin?: string;
  description?: string;
  ownerName?: string;
  isAlertActive: boolean;
  alertStatus: AlertStatus;
  createdAt: string;
  sightingCount: number;
  lastSighting?: {
    location: string;
    timestamp: string;
    source: string;
  };
}

interface VehicleSighting {
  id: string;
  vehicleId: string;
  licensePlate: string;
  location: { lat: number; lng: number; address: string };
  timestamp: string;
  source: string;
  confidence: SightingConfidence;
  imageUrl?: string;
  direction?: string;
  speed?: number;
  notes?: string;
}

const getConfidenceColor = (confidence: SightingConfidence) => {
  switch (confidence) {
    case "confirmed":
      return "bg-green-100 text-green-700";
    case "probable":
      return "bg-blue-100 text-blue-700";
    case "possible":
      return "bg-yellow-100 text-yellow-700";
    case "unverified":
      return "bg-gray-100 text-gray-700";
  }
};

export default function VehicleTrackingPage() {
  const [activeTab, setActiveTab] = useState<"vehicles" | "sightings" | "add">("vehicles");
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [sightings, setSightings] = useState<VehicleSighting[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAlertStatus, setFilterAlertStatus] = useState<AlertStatus | "all">("all");

  // Add vehicle form state
  const [newVehicle, setNewVehicle] = useState({
    caseId: "",
    licensePlate: "",
    state: "AB",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    color: "",
    type: "car" as VehicleType,
    vin: "",
    description: "",
    createAlert: true,
  });

  useEffect(() => {
    // Load mock vehicles
    setVehicles([
      {
        id: "veh-1",
        caseId: "case-1",
        caseName: "Jane Doe",
        licensePlate: "ABC-1234",
        state: "AB",
        make: "Honda",
        model: "Civic",
        year: 2022,
        color: "Blue",
        type: "car",
        description: "Small dent on rear bumper",
        isAlertActive: true,
        alertStatus: "active",
        createdAt: "2026-01-15T10:00:00Z",
        sightingCount: 4,
        lastSighting: {
          location: "Yellowhead Trail & 97 St",
          timestamp: "2026-01-17T14:30:00Z",
          source: "ALPR Camera",
        },
      },
      {
        id: "veh-2",
        caseId: "case-2",
        caseName: "John Smith",
        licensePlate: "XYZ-5678",
        state: "AB",
        make: "Ford",
        model: "F-150",
        year: 2020,
        color: "White",
        type: "truck",
        vin: "1FTEW1EP4LFA12345",
        ownerName: "John Smith",
        isAlertActive: true,
        alertStatus: "active",
        createdAt: "2026-01-14T08:00:00Z",
        sightingCount: 2,
        lastSighting: {
          location: "Sherwood Park Freeway",
          timestamp: "2026-01-16T09:15:00Z",
          source: "Traffic Camera",
        },
      },
      {
        id: "veh-3",
        caseId: "case-3",
        caseName: "Emily Chen",
        licensePlate: "DEF-9012",
        state: "AB",
        make: "Toyota",
        model: "Camry",
        year: 2021,
        color: "Silver",
        type: "car",
        isAlertActive: false,
        alertStatus: "resolved",
        createdAt: "2026-01-10T12:00:00Z",
        sightingCount: 8,
      },
    ]);

    // Load mock sightings
    setSightings([
      {
        id: "sight-1",
        vehicleId: "veh-1",
        licensePlate: "ABC-1234",
        location: { lat: 53.5761, lng: -113.4938, address: "Yellowhead Trail & 97 St, Edmonton" },
        timestamp: "2026-01-17T14:30:00Z",
        source: "ALPR Camera",
        confidence: "confirmed",
        direction: "Westbound",
        speed: 62,
      },
      {
        id: "sight-2",
        vehicleId: "veh-1",
        licensePlate: "ABC-1234",
        location: { lat: 53.5461, lng: -113.5038, address: "107 Ave & 124 St, Edmonton" },
        timestamp: "2026-01-17T11:20:00Z",
        source: "Traffic Camera",
        confidence: "probable",
        direction: "Northbound",
      },
      {
        id: "sight-3",
        vehicleId: "veh-2",
        licensePlate: "XYZ-5678",
        location: { lat: 53.5234, lng: -113.3167, address: "Sherwood Park Freeway, Sherwood Park" },
        timestamp: "2026-01-16T09:15:00Z",
        source: "Traffic Camera",
        confidence: "confirmed",
        direction: "Eastbound",
        speed: 85,
      },
      {
        id: "sight-4",
        vehicleId: "veh-1",
        licensePlate: "ABC-1234",
        location: { lat: 53.5361, lng: -113.4838, address: "Jasper Ave & 109 St, Edmonton" },
        timestamp: "2026-01-16T16:45:00Z",
        source: "Citizen Report",
        confidence: "possible",
        notes: "Reported parked outside coffee shop",
      },
    ]);
  }, []);

  const filteredVehicles = vehicles.filter((vehicle) => {
    const matchesSearch =
      vehicle.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.caseName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterAlertStatus === "all" || vehicle.alertStatus === filterAlertStatus;
    return matchesSearch && matchesStatus;
  });

  const handleAddVehicle = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setActiveTab("vehicles");
    setNewVehicle({
      caseId: "",
      licensePlate: "",
      state: "AB",
      make: "",
      model: "",
      year: new Date().getFullYear(),
      color: "",
      type: "car",
      vin: "",
      description: "",
      createAlert: true,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vehicle & License Plate Tracking</h1>
          <p className="text-gray-600 mt-2">Track vehicles associated with missing person cases</p>
        </div>
        <button
          onClick={() => setActiveTab("add")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Vehicle
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Active Alerts</p>
          <p className="text-2xl font-bold text-red-600">{vehicles.filter((v) => v.isAlertActive).length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Tracked Vehicles</p>
          <p className="text-2xl font-bold text-gray-900">{vehicles.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Sightings</p>
          <p className="text-2xl font-bold text-blue-600">{sightings.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Today's Sightings</p>
          <p className="text-2xl font-bold text-green-600">
            {sightings.filter((s) => new Date(s.timestamp).toDateString() === new Date().toDateString()).length}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {[
            { id: "vehicles", label: "Vehicles" },
            { id: "sightings", label: "Sightings" },
            { id: "add", label: "Add Vehicle" },
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

      {/* Vehicles Tab */}
      {activeTab === "vehicles" && (
        <div>
          {/* Search & Filter */}
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
                placeholder="Search by plate, make, model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterAlertStatus}
              onChange={(e) => setFilterAlertStatus(e.target.value as AlertStatus | "all")}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active Alerts</option>
              <option value="resolved">Resolved</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {/* Vehicles List */}
          <div className="space-y-4">
            {filteredVehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedVehicle(vehicle)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-24 h-16 bg-gray-800 rounded flex items-center justify-center">
                      <span className="text-white font-mono font-bold">{vehicle.licensePlate}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </h3>
                        {vehicle.isAlertActive && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded animate-pulse">
                            ALERT ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-blue-600">Case: {vehicle.caseName}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>Color: {vehicle.color}</span>
                        <span>Type: {vehicle.type}</span>
                        <span>{vehicle.sightingCount} sightings</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {vehicle.lastSighting ? (
                      <div>
                        <p className="text-sm text-gray-500">Last seen</p>
                        <p className="text-sm font-medium">{vehicle.lastSighting.location}</p>
                        <p className="text-xs text-gray-500">{new Date(vehicle.lastSighting.timestamp).toLocaleString()}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No sightings</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sightings Tab */}
      {activeTab === "sightings" && (
        <div className="space-y-4">
          {sightings.map((sighting) => (
            <div key={sighting.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-20 h-14 bg-gray-800 rounded flex items-center justify-center">
                    <span className="text-white font-mono text-sm">{sighting.licensePlate}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-1 text-xs rounded ${getConfidenceColor(sighting.confidence)}`}>
                        {sighting.confidence}
                      </span>
                      <span className="text-sm text-gray-500">{sighting.source}</span>
                    </div>
                    <p className="font-medium text-gray-900">{sighting.location.address}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      {sighting.direction && <span>Direction: {sighting.direction}</span>}
                      {sighting.speed && <span>Speed: {sighting.speed} km/h</span>}
                    </div>
                    {sighting.notes && <p className="text-sm text-gray-600 mt-1">{sighting.notes}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{new Date(sighting.timestamp).toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Vehicle Tab */}
      {activeTab === "add" && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Associated Case</label>
              <select
                value={newVehicle.caseId}
                onChange={(e) => setNewVehicle({ ...newVehicle, caseId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a case...</option>
                <option value="case-1">Jane Doe - Missing Person</option>
                <option value="case-2">John Smith - Missing Person</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
                <input
                  type="text"
                  value={newVehicle.licensePlate}
                  onChange={(e) => setNewVehicle({ ...newVehicle, licensePlate: e.target.value.toUpperCase() })}
                  placeholder="ABC-1234"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State/Province</label>
                <select
                  value={newVehicle.state}
                  onChange={(e) => setNewVehicle({ ...newVehicle, state: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="AB">Alberta</option>
                  <option value="BC">British Columbia</option>
                  <option value="SK">Saskatchewan</option>
                  <option value="MB">Manitoba</option>
                  <option value="ON">Ontario</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                <input
                  type="text"
                  value={newVehicle.make}
                  onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
                  placeholder="Honda"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                <input
                  type="text"
                  value={newVehicle.model}
                  onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                  placeholder="Civic"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <input
                  type="number"
                  value={newVehicle.year}
                  onChange={(e) => setNewVehicle({ ...newVehicle, year: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <input
                  type="text"
                  value={newVehicle.color}
                  onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })}
                  placeholder="Blue"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                <select
                  value={newVehicle.type}
                  onChange={(e) => setNewVehicle({ ...newVehicle, type: e.target.value as VehicleType })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="car">Car</option>
                  <option value="truck">Truck</option>
                  <option value="suv">SUV</option>
                  <option value="van">Van</option>
                  <option value="motorcycle">Motorcycle</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VIN (Optional)</label>
              <input
                type="text"
                value={newVehicle.vin}
                onChange={(e) => setNewVehicle({ ...newVehicle, vin: e.target.value.toUpperCase() })}
                placeholder="1HGBH41JXMN109186"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
              <textarea
                value={newVehicle.description}
                onChange={(e) => setNewVehicle({ ...newVehicle, description: e.target.value })}
                rows={3}
                placeholder="Any distinguishing features, damage, modifications..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newVehicle.createAlert}
                onChange={(e) => setNewVehicle({ ...newVehicle, createAlert: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Create active alert for this vehicle</span>
            </label>

            <div className="flex gap-3">
              <button
                onClick={handleAddVehicle}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Vehicle
              </button>
              <button
                onClick={() => setActiveTab("vehicles")}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-28 h-20 bg-gray-800 rounded flex items-center justify-center">
                  <span className="text-white font-mono font-bold text-lg">{selectedVehicle.licensePlate}</span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                  </h2>
                  <p className="text-blue-600">{selectedVehicle.caseName}</p>
                </div>
              </div>
              <button onClick={() => setSelectedVehicle(null)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                <div>
                  <p className="text-gray-500">Color</p>
                  <p className="font-medium">{selectedVehicle.color}</p>
                </div>
                <div>
                  <p className="text-gray-500">Type</p>
                  <p className="font-medium capitalize">{selectedVehicle.type}</p>
                </div>
                <div>
                  <p className="text-gray-500">State/Province</p>
                  <p className="font-medium">{selectedVehicle.state}</p>
                </div>
                <div>
                  <p className="text-gray-500">Total Sightings</p>
                  <p className="font-medium">{selectedVehicle.sightingCount}</p>
                </div>
                {selectedVehicle.vin && (
                  <div className="col-span-2">
                    <p className="text-gray-500">VIN</p>
                    <p className="font-medium font-mono">{selectedVehicle.vin}</p>
                  </div>
                )}
              </div>

              {/* Recent Sightings */}
              <h3 className="font-semibold text-gray-900 mb-3">Recent Sightings</h3>
              <div className="space-y-3">
                {sightings
                  .filter((s) => s.vehicleId === selectedVehicle.id)
                  .slice(0, 3)
                  .map((sighting) => (
                    <div key={sighting.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{sighting.location.address}</p>
                        <span className={`px-2 py-1 text-xs rounded ${getConfidenceColor(sighting.confidence)}`}>
                          {sighting.confidence}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{new Date(sighting.timestamp).toLocaleString()}</p>
                    </div>
                  ))}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">View on Map</button>
              <button
                className={`flex-1 py-2 rounded-lg ${
                  selectedVehicle.isAlertActive
                    ? "border border-red-300 text-red-700 hover:bg-red-50"
                    : "bg-red-600 text-white hover:bg-red-700"
                }`}
              >
                {selectedVehicle.isAlertActive ? "Deactivate Alert" : "Activate Alert"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
