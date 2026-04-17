import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0f1729] flex flex-col items-center justify-center px-4">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white tracking-tight">SouthPeak Systems</h1>
        <p className="text-blue-400 mt-2 text-sm font-medium tracking-widest uppercase">
          Missed Call Recovery
        </p>
      </div>

      {/* Login cards */}
      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-lg">
        {/* Admin Login */}
        <Link
          href="/login?role=admin"
          className="flex-1 bg-white rounded-2xl shadow-2xl p-8 text-center group hover:bg-blue-50 transition-colors"
        >
          <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
            <svg
              className="w-7 h-7 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Admin Login</h2>
          <p className="text-sm text-gray-500">SouthPeak Systems owner access</p>
        </Link>

        {/* Client Login */}
        <Link
          href="/login?role=client"
          className="flex-1 bg-white rounded-2xl shadow-2xl p-8 text-center group hover:bg-blue-50 transition-colors"
        >
          <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition-colors">
            <svg
              className="w-7 h-7 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Client Login</h2>
          <p className="text-sm text-gray-500">Business owner dashboard</p>
        </Link>
      </div>

      <p className="text-gray-600 text-xs mt-10">
        &copy; {new Date().getFullYear()} SouthPeak Systems. All rights reserved.
      </p>
    </div>
  )
}
