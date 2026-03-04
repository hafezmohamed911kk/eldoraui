import * as React from "react"
import { Index } from "@/registry/__index__"

interface RegistryIndexItem {
  name: string
  description: string
  type: string
  registryDependencies?: string[]
  files: Array<{
    path: string
    type: string
    target: string
  }>
  component: React.LazyExoticComponent<React.ComponentType<unknown>> | null
  meta?: unknown
}

// Client-safe function for getting registry components (no fs operations)
export function getRegistryComponent(name: string) {
  const item = Index[name] as RegistryIndexItem
  return item?.component
}
