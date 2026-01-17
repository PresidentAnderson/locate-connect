import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cross-Border Coordination Hub | Locate & Connect",
  description: "Specialized tools for managing cases that cross provincial or international borders",
};

export default function CrossBorderPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Cross-Border Coordination Hub
        </h1>
        <p className="text-gray-600">
          Specialized tools for managing cases that cross provincial or international borders
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Multi-Jurisdiction Cases */}
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-2">Multi-Jurisdiction Cases</h2>
          <p className="text-gray-600 text-sm mb-4">
            Link and coordinate cases across multiple jurisdictions
          </p>
          <a
            href="/cross-border/cases"
            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
          >
            View Cases →
          </a>
        </div>

        {/* Cross-Border Alerts */}
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-2">Alert Distribution</h2>
          <p className="text-gray-600 text-sm mb-4">
            Distribute alerts across borders and jurisdictions
          </p>
          <a
            href="/cross-border/alerts"
            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
          >
            Manage Alerts →
          </a>
        </div>

        {/* Jurisdiction Handoffs */}
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-2">Jurisdiction Handoffs</h2>
          <p className="text-gray-600 text-sm mb-4">
            Transfer or collaborate on cases between jurisdictions
          </p>
          <a
            href="/cross-border/handoffs"
            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
          >
            View Handoffs →
          </a>
        </div>

        {/* International Agencies */}
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-2">Agency Contacts</h2>
          <p className="text-gray-600 text-sm mb-4">
            Directory of international law enforcement agencies
          </p>
          <a
            href="/cross-border/agencies"
            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
          >
            View Directory →
          </a>
        </div>

        {/* Compliance Tracking */}
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-2">Compliance Tracking</h2>
          <p className="text-gray-600 text-sm mb-4">
            Monitor treaty and data sharing agreement compliance
          </p>
          <a
            href="/cross-border/compliance"
            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
          >
            View Compliance →
          </a>
        </div>

        {/* Time Zone Management */}
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-2">Time Zone Coordination</h2>
          <p className="text-gray-600 text-sm mb-4">
            Manage communications across different time zones
          </p>
          <a
            href="/cross-border/timezones"
            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
          >
            View Tools →
          </a>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-900">0</div>
          <div className="text-sm text-blue-700">Active Cross-Border Cases</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-900">0</div>
          <div className="text-sm text-red-700">Active Alerts</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-900">0</div>
          <div className="text-sm text-green-700">Pending Handoffs</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-900">12</div>
          <div className="text-sm text-purple-700">Partner Agencies</div>
        </div>
      </div>
    </div>
  );
}
