import type { Request, Response } from 'express'
import { parseId } from '../lib/params.js'
import * as categoryService from '../services/categoryService.js'

export async function list(_req: Request, res: Response) {
  res.json(await categoryService.listCategories())
}

export async function create(req: Request, res: Response) {
  res.status(201).json(await categoryService.createCategory(req.body))
}

export async function update(req: Request, res: Response) {
  res.json(await categoryService.updateCategory(parseId(req.params.id), req.body))
}

export async function remove(req: Request, res: Response) {
  await categoryService.deleteCategory(parseId(req.params.id))
  res.status(204).end()
}
