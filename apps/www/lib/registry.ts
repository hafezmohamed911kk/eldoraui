import * as React from "react"
import { RegistryItem } from "shadcn/schema"

import { Index } from "@/registry/__index__"

// Fumadocs zod v4 compat type fix. Temporary.
export interface RegistryItemFile {
  path: string
  content: string
  type: RegistryItem["type"]
  target: string
}

interface RegistryIndexItem {
  name: string
  description: string
  type: RegistryItem["type"]
  registryDependencies?: string[]
  files: Array<{
    path: string
    type: RegistryItem["type"]
    target: string
  }>
  component: React.LazyExoticComponent<React.ComponentType<unknown>> | null
  meta?: unknown
}

export function getRegistryComponent(name: string) {
  const item = Index[name] as RegistryIndexItem
  return item?.component
}

export async function getDemoItem(name: string) {
  // EldoraUI uses a single flat registry index (no styles).
  // Most "demo" content is already present as `registry:example` items, so
  // `getRegistryItem` usually covers it. This helper exists as a fallback for
  // non-registry examples.
  const { getRegistryItem } = await import("@/lib/registry-server")
  const item = await getRegistryItem(name)
  if (item) {
    return item
  }

  // Fallback to the registry index item
  const indexItem = Index[name]
  if (indexItem) {
    return {
      name: indexItem.name,
      description: indexItem.description,
      type: indexItem.type,
      registryDependencies: indexItem.registryDependencies,
      files: [],
      component: indexItem.component,
      meta: indexItem.meta,
    }
  }

  return null
}

export function fixImport(content: string) {
  const regex = /@\/(.+?)\/((?:.*?\/)?(?:components|ui|hooks|lib))\/([\w-]+)/g

  const replacement = (
    match: string,
    path: string,
    type: string,
    component: string
  ) => {
    if (type.endsWith("components")) {
      return `@/components/${component}`
    } else if (type.endsWith("ui")) {
      return `@/components/ui/${component}`
    } else if (type.endsWith("hooks")) {
      return `@/hooks/${component}`
    } else if (type.endsWith("lib")) {
      return `@/lib/${component}`
    }

    return match
  }

  return content.replace(regex, replacement)
}

export type FileTree = {
  name: string
  path?: string
  children?: FileTree[]
}

export function createFileTreeForRegistryItemFiles(
  files: Array<{ path: string; target?: string }>
) {
  const root: FileTree[] = []

  for (const file of files) {
    const filePath = file.target ?? file.path
    const parts = filePath.split("/")
    let currentLevel = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isFile = i === parts.length - 1
      const existingNode = currentLevel.find((node) => node.name === part)

      if (existingNode) {
        if (isFile) {
          // Update existing file node with full path
          existingNode.path = filePath
        } else {
          // Move to next level in the tree
          currentLevel = existingNode.children!
        }
      } else {
        const newNode: FileTree = isFile
          ? { name: part, path: filePath }
          : { name: part, children: [] }

        currentLevel.push(newNode)

        if (!isFile) {
          currentLevel = newNode.children!
        }
      }
    }
  }

  return root
}
