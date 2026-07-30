import ProjectForm from '@/components/ui/ProjectForm'

export const metadata = { title: 'New project' }

export default function NewProjectPage() {
  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">New project</h1>
      <ProjectForm mode="create" />
    </div>
  )
}
