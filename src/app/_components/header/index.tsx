"use client"

import { Button } from "@/components/ui/button"
import { useSession } from "@/lib/client/auth"
import { Settings } from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"

const ThemeToggle = dynamic(() => import("./theme-toggle"), { ssr: false })

export default function Header() {
  const { data: session, isPending } = useSession()

  return (
    <div className="flex p-4 justify-between h-16">
      <div>
        <Link href="/">easyrice</Link>
      </div>
      <div className="flex items-center gap-2">
        {isPending ? null : session ? (
          <>
            <Button variant="ghost" asChild>
              <Link href={`/users/${session.user.username}`}>
                {session.user.username}
              </Link>
            </Button>
            <Button variant="ghost" size="icon-sm" asChild>
              <Link href="/settings">
                <Settings className="size-4" />
                <span className="sr-only">Settings</span>
              </Link>
            </Button>
          </>
        ) : (
          <Button variant="ghost" asChild>
            <Link href="/signin">Sign In</Link>
          </Button>
        )}
        <ThemeToggle />
      </div>
    </div>
  )
}
