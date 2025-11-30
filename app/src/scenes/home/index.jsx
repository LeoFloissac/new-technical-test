import React, { useEffect, useState } from "react"
import FileInput from "@/components/file-input"
import api from "@/services/api"

export default function Home() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const fetchProjects = async () => {
      try {
        const res = await api.get("/project")
        if (!mounted) return
        if (res && res.ok) {
          setProjects(res.data || [])
        } else {
          setProjects([])
        }
      } catch (e) {
        console.error("Error fetching projects:", e)
        setProjects([])
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchProjects()
    return () => {
      mounted = false
    }
  }, [])

  const handleDelete = async (id) => {
    if (!confirm("Voulez-vous vraiment supprimer ce projet ?")) return
    try {
      const res = await api.delete(`/project/${id}`)
      if (res && res.ok) {
        setProjects((p) => p.filter((x) => x._id !== id && x.id !== id))
      } else {
        alert("Impossible de supprimer le projet")
      }
    } catch (e) {
      console.error(e)
      alert("Erreur lors de la suppression")
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <h2 className="text-2xl font-semibold mb-4">Mes projets</h2>
      {loading ? (
        <div>Chargement...</div>
      ) : projects.length === 0 ? (
        <div>Aucun projet trouvé.</div>
      ) : (
        <ul className="space-y-3">
          {projects.map((p) => (
            <li key={p._id || p.id} className="flex items-center justify-between p-3 bg-white rounded-md border">
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-gray-500">Budget: {p.budget} €</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleDelete(p._id || p.id)} className="px-3 py-1 text-sm text-red-600 border rounded-md">
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
