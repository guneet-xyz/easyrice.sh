"use client"

import dynamic from "next/dynamic"

const ThemeToggle = dynamic(() => import("./theme-toggle"), { ssr: false })

export default function Header() {
  return (
    <div className="flex p-4 justify-between">
      <div>
        <div>easyrice</div>
      </div>
      <div>
        <ThemeToggle />
      </div>
    </div>
  )
}
