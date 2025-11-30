import React, { useEffect, useState } from "react"
import FileInput from "@/components/file-input"
import { Link } from "react-router-dom"
import api from "@/services/api"
import ProjectProgress from "./projectProgress"

export default function Home() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [totals, setTotals] = useState({})

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

  // listen for projects created elsewhere (TopBar) and insert them live
  useEffect(() => {
    const handler = (ev) => {
      const proj = ev?.detail
      if (!proj) return
      setProjects((cur) => {
        // avoid duplicate if already present
        const id = proj._id || proj.id
        if (cur.some((p) => (p._id || p.id) === id)) return cur
        return [proj, ...cur]
      })
    }

    window.addEventListener("project:created", handler)
    return () => window.removeEventListener("project:created", handler)
  }, [])

  // when projects change, fetch totals for each project
  useEffect(() => {
    if (!projects || projects.length === 0) {
      setTotals({})
      return
    }

    let mounted = true
    const fetchTotals = async () => {
      try {
        const promises = projects.map(async (p) => {
          const id = p._id || p.id
          try {
            const res = await api.get(`/expense/project/${id}/total`)
            return { id, total: res && res.ok ? res.data?.total || 0 : 0 }
          } catch (err) {
            return { id, total: 0 }
          }
        })

        const results = await Promise.all(promises)
        if (!mounted) return
        const map = {}
        results.forEach((r) => {
          map[r.id] = r.total
        })
        setTotals(map)
      } catch (e) {
        console.error('Error fetching project totals', e)
      }
    }

    fetchTotals()
    return () => (mounted = false)
  }, [projects])

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
    <div className="p-8 w-full">
      <h2 className="text-2xl font-semibold mb-4">Mes projets</h2>
      {loading ? (
        <div>Chargement...</div>
      ) : projects.length === 0 ? (
        <div>Aucun projet trouvé.</div>
      ) : (
        <ul className="space-y-3">
          {projects.map((p) => {
            const id = p._id || p.id
            const totalExpenses = totals[id] || 0
            return (
              <li key={id} className="w-full p-3 bg-white rounded-md border">
                <div className="flex items-start justify-between gap-4">
                  <Link to={`/project/${id}`} className="flex-1">
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-sm text-gray-500">{p.description}</div>
                      <div className="mt-3">
                        <ProjectProgress budget={p.budget} expenses={totalExpenses} />
                      </div>
                    </div>
                  </Link>

                  <div className="flex-shrink-0 flex flex-col items-end gap-2">
                    <button onClick={() => handleDelete(id)} className="px-3 py-1 text-sm text-red-600 border rounded-md">
                      Supprimer
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
