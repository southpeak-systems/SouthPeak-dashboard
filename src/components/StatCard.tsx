interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  accent?: string
}

export default function StatCard({ title, value, icon, accent = 'border-blue-500' }: StatCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 border-t-4 ${accent}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className="flex-shrink-0 ml-4">{icon}</div>
      </div>
    </div>
  )
}
