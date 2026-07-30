import prisma from './prisma'
import type { AccessType } from './generated/prisma/enums'

export type { AccessType }

export interface CreateProjectData {
  title: string
  eventDate?: Date | null
  accessType?: AccessType
  password?: string | null
  expiresAt?: Date | null
  zipEnabled?: boolean
  dlEnabled?: boolean
}

export interface UpdateProjectData {
  title?: string
  eventDate?: Date | null
  accessType?: AccessType
  password?: string | null
  expiresAt?: Date | null
  zipEnabled?: boolean
  dlEnabled?: boolean
}

export async function listProjects() {
  return prisma.project.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function getProject(id: string) {
  return prisma.project.findUnique({ where: { id } })
}

export async function createProject(data: CreateProjectData) {
  return prisma.project.create({
    data: {
      title: data.title,
      eventDate: data.eventDate ?? null,
      accessType: data.accessType ?? 'PASSWORD',
      password: data.password ?? null,
      expiresAt: data.expiresAt ?? null,
      zipEnabled: data.zipEnabled ?? true,
      dlEnabled: data.dlEnabled ?? true,
    },
  })
}

export async function updateProject(id: string, data: UpdateProjectData) {
  return prisma.project.update({ where: { id }, data })
}

export async function deleteProject(id: string) {
  return prisma.project.delete({ where: { id } })
}

export async function incrementVisit(id: string) {
  return prisma.project.update({
    where: { id },
    data: { visitCount: { increment: 1 }, lastAccess: new Date() },
  })
}

export async function incrementDownload(id: string) {
  return prisma.project.update({
    where: { id },
    data: { dlCount: { increment: 1 } },
  })
}

export async function listPhotos(projectId: string) {
  return prisma.photo.findMany({
    where: { projectId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
}

export async function getPhoto(id: string) {
  return prisma.photo.findUnique({ where: { id } })
}

export async function insertPhoto(data: {
  projectId: string
  filename: string
  width: number
  height: number
  size: number
  sortOrder: number
}) {
  return prisma.photo.create({ data })
}

export async function deletePhoto(id: string) {
  return prisma.photo.delete({ where: { id } })
}

export async function countPhotos(projectId: string) {
  return prisma.photo.count({ where: { projectId } })
}

export async function getProjectAssignments(projectId: string) {
  return prisma.projectAssignment.findMany({
    where: { projectId },
    include: { user: true },
  })
}

export async function assignUserToProject(projectId: string, userId: string) {
  return prisma.projectAssignment.upsert({
    where: { projectId_userId: { projectId, userId } },
    update: {},
    create: { projectId, userId },
  })
}

export async function removeUserFromProject(projectId: string, userId: string) {
  return prisma.projectAssignment.delete({
    where: { projectId_userId: { projectId, userId } },
  })
}

export async function getUserProjects(userId: string) {
  const assignments = await prisma.projectAssignment.findMany({
    where: { userId },
    include: { project: true },
  })
  return assignments.map((a) => a.project)
}
