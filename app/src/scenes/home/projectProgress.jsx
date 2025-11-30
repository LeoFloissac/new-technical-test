import React from "react"

export default function ProjectProgress({ budget = 0, expenses = 0, className = "" }) {
  const b = parseFloat(budget) || 0
  const e = parseFloat(expenses) || 0
  const rawPercent = b > 0 ? Math.round((e / b) * 100) : 0
  const percent = Math.max(0, Math.min(100, rawPercent))
  let colorClass = "bg-green-500"
  if (percent >= 90) colorClass = "bg-red-500"
  else if (percent >= 70) colorClass = "bg-yellow-500"

  return (
    <div className={"w-full " + className}>
      <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
        <div>Budget: {b} €</div>
  <div className="font-medium">{e} € / {b} € {b > 0 ? `(${rawPercent}%)` : ""}</div>
      </div>

      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-2 ${colorClass}`}
          style={{ width: `${percent}%`, transition: "width 300ms ease" }}
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  )
}
