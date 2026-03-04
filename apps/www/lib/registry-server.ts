'use server'

import fs from "node:fs/promises"
import { tmpdir } from "os"
import path from "path"
import { Project, ScriptKind } from "ts-morph"
import { RegistryItem, registryItemSchema } from "shadcn/schema"

import { Index } from "@/registry/__index__"
import { fixImport } from "@/lib/registry"

interface RegistryFile {
  path: string
  type: RegistryItem["type"]
  target: string
}

async function getFileContent(file: RegistryFile) {
  const raw = await fs.readFile(file.path, "utf-8")

  const project = new Project({
    compilerOptions: {},
  })

  const tempFile = await createTempSourceFile(file.path)
  const sourceFile = project.createSourceFile(tempFile, raw, {
    scriptKind: ScriptKind.TSX,
  })

  let code = sourceFile.getFullText()

  if (file.type !== "registry:page") {
    code = code.replaceAll("export default", "export")
  }

  code = fixImport(code)

  return code
}

async function createTempSourceFile(filename: string) {
  const dir = await fs.mkdtemp(path.join(tmpdir(), "shadcn-"))
  return path.join(dir, filename)
}

export async function getRegistryItem(
  name: string,
  type?: RegistryItem["type"]
) {
  const item = Index[name]

  if (!item) {
    return null
  }

  const files: RegistryFile[] = item.files.map((file) => ({
    path: file.path,
    type: file.type as RegistryItem["type"],
    target: file.target,
  }))

  const registryFiles: any[] = []

  for (const file of files) {
    const content = await getFileContent(file)
    registryFiles.push({
      path: file.path,
      content,
      type: file.type,
      target: file.target,
    })
  }

  const result = registryItemSchema.safeParse({
    ...item,
    files: registryFiles,
  })

  if (!result.success) {
    console.error(result.error.message)
    return null
  }

  return result.data
}
