"use client";

import Link from "next/link";

export default function ResearchPortalPage() {
  const features = [
    {
      title: "Request Research Access",
      description:
        "Apply for access to our anonymized case database for academic research, policy development, or law enforcement training purposes.",
      href: "/research-portal/access-request",
      icon: KeyIcon,
      color: "cyan",
    },
    {
      title: "Academic Partnerships",
      description:
        "Explore partnership opportunities for universities, research institutions, and law enforcement academies.",
      href: "/research-portal/partnerships",
      icon: AcademicCapIcon,
      color: "purple",
    },
    {
      title: "Browse Archive",
      description:
        "Search and explore our database of anonymized historical cases with advanced filtering and statistical tools.",
      href: "/archive",
      icon: ArchiveIcon,
      color: "teal",
    },
    {
      title: "Case Studies",
      description:
        "Access educational case studies and training materials developed from our historical case data.",
      href: "/archive/case-studies",
      icon: BookOpenIcon,
      color: "orange",
    },
    {
      title: "Statistics & Analytics",
      description:
        "View aggregate statistics, trends, and analytical reports derived from our case database.",
      href: "/archive/statistics",
      icon: ChartBarIcon,
      color: "blue",
    },
    {
      title: "Data Export",
      description:
        "Export anonymized research data in multiple formats for approved research projects.",
      href: "/research-portal/exports",
      icon: DownloadIcon,
      color: "green",
    },
  ];

  const guidelines = [
    {
      title: "Ethics Approval Required",
      description:
        "Research involving human subjects data requires ethics board approval from your institution.",
    },
    {
      title: "Data Use Agreement",
      description:
        "All researchers must sign a data use agreement outlining permitted uses and security requirements.",
    },
    {
      title: "Attribution Requirements",
      description:
        "Publications using our data must properly cite LocateConnect as the data source.",
    },
    {
      title: "Privacy Protection",
      description:
        "Attempting to re-identify individuals from anonymized data is strictly prohibited.",
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; iconBg: string }> = {
      cyan: { bg: "bg-cyan-50", text: "text-cyan-700", iconBg: "bg-cyan-100" },
      purple: { bg: "bg-purple-50", text: "text-purple-700", iconBg: "bg-purple-100" },
      teal: { bg: "bg-teal-50", text: "text-teal-700", iconBg: "bg-teal-100" },
      orange: { bg: "bg-orange-50", text: "text-orange-700", iconBg: "bg-orange-100" },
      blue: { bg: "bg-blue-50", text: "text-blue-700", iconBg: "bg-blue-100" },
      green: { bg: "bg-green-50", text: "text-green-700", iconBg: "bg-green-100" },
    };
    return colors[color] || colors.cyan;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Research Portal</h1>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-gray-600">
          Access anonymized historical case data for academic research, law enforcement training,
          and policy development. Our data supports evidence-based approaches to missing persons cases.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => {
          const colors = getColorClasses(feature.color);
          return (
            <Link
              key={feature.title}
              href={feature.href}
              className={`group relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-gray-300 hover:shadow-md`}
            >
              <div className={`inline-flex rounded-lg p-3 ${colors.iconBg}`}>
                <feature.icon className={`h-6 w-6 ${colors.text}`} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900 group-hover:text-cyan-700">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-gray-600">{feature.description}</p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-cyan-600 group-hover:text-cyan-700">
                Learn more
                <svg
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Research Guidelines */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Research Guidelines</h2>
        <p className="mt-2 text-sm text-gray-600">
          Before requesting access to our research data, please review the following requirements:
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {guidelines.map((guideline, index) => (
            <div key={index} className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100 text-sm font-semibold text-cyan-700">
                  {index + 1}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{guideline.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{guideline.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Statistics Summary */}
      <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-cyan-50 to-teal-50 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Database Overview</h2>
        <p className="mt-2 text-sm text-gray-600">
          Our research archive contains comprehensive data from resolved missing persons cases across Canada.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-cyan-700">10,000+</p>
            <p className="mt-1 text-sm text-gray-600">Archived Cases</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-cyan-700">25+</p>
            <p className="mt-1 text-sm text-gray-600">Years of Data</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-cyan-700">13</p>
            <p className="mt-1 text-sm text-gray-600">Provinces/Territories</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-cyan-700">50+</p>
            <p className="mt-1 text-sm text-gray-600">Research Publications</p>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="rounded-xl bg-gray-900 p-8 text-center">
        <h2 className="text-2xl font-bold text-white">Ready to Start Your Research?</h2>
        <p className="mx-auto mt-3 max-w-xl text-gray-300">
          Submit a research access request to begin working with our anonymized case database.
          Our team reviews requests within 5-7 business days.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/research-portal/access-request"
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-6 py-3 font-medium text-white shadow-sm transition-colors hover:bg-cyan-700"
          >
            Request Access
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <Link
            href="/research-portal/partnerships"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-600 px-6 py-3 font-medium text-white transition-colors hover:bg-gray-800"
          >
            Partnership Inquiry
          </Link>
        </div>
      </div>

      {/* Contact Information */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Questions?</h3>
            <p className="mt-1 text-sm text-gray-600">
              Contact our research team for assistance with access requests or partnership inquiries.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <a
              href="mailto:research@locateconnect.ca"
              className="flex items-center gap-2 text-gray-600 hover:text-cyan-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
              research@locateconnect.ca
            </a>
            <a
              href="tel:+18001234567"
              className="flex items-center gap-2 text-gray-600 hover:text-cyan-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
              </svg>
              1-800-123-4567
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Icon Components
function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
    </svg>
  );
}

function AcademicCapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
    </svg>
  );
}

function ArchiveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
    </svg>
  );
}

function BookOpenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

function ChartBarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
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
