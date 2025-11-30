import React, { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import api from "@/services/api"

export default function ProjectView() {
  const { id } = useParams()
  const [project, setProject] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let mounted = true
    const fetch = async () => {
      try {
        const [projRes, expRes, totRes] = await Promise.all([
          api.get(`/project/${id}`),
          api.get(`/expense/project/${id}`),
          api.get(`/expense/project/${id}/total`),
        ])

        if (!mounted) return

        if (projRes && projRes.ok) setProject(projRes.data)
        if (expRes && expRes.ok) setExpenses(expRes.data || [])
        if (totRes && totRes.ok) setTotal(totRes.data?.total || 0)
      } catch (e) {
        console.error(e)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetch()
    return () => (mounted = false)
  }, [id])

  if (loading) return <div className="p-8">Chargement...</div>

  if (!project) return <div className="p-8">Projet introuvable ou accès refusé.</div>

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <div className="text-sm text-gray-500">Budget: {project.budget} €</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Total dépenses</div>
          <div className="text-lg font-semibold">{total} €</div>
        </div>
      </div>

      <div className="mb-4">
        <button onClick={() => { setShowAddModal(true); setAmount(""); setCategory(""); setDescription(""); setDate(new Date().toISOString().slice(0,10)); }} className="px-3 py-1 rounded-md bg-primary text-white">
          Ajouter une dépense
        </button>
      </div>

      <h2 className="text-lg font-medium mb-3">Dépenses</h2>
      {expenses.length === 0 ? (
        <div className="text-gray-500">Aucune dépense pour ce projet.</div>
      ) : (
        <ul className="space-y-2">
          {expenses.map((e) => (
            <li key={e._id || e.id} className="p-3 bg-white rounded-md border flex justify-between">
              <div>
                <div className="font-medium">{e.category}</div>
                <div className="text-sm text-gray-600">{e.description}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{e.amount} €</div>
                <div className="text-sm text-gray-500">{new Date(e.date).toLocaleDateString()}</div>
                <div className="mt-2">
                  <button onClick={async () => {
                      if (!confirm('Supprimer cette dépense ?')) return

                      // optimistic UI: remove locally first
                      const expenseId = e._id || e.id
                      const amt = parseFloat(e.amount) || 0
                      const previousExpenses = expenses
                      const previousTotal = total

                      setExpenses((cur) => cur.filter((x) => (x._id || x.id) !== expenseId))
                      setTotal((t) => Math.max(0, t - amt))

                      try {
                        const res = await api.delete(`/expense/${expenseId}`)
                        if (res && res.ok) {
                          // success: optionally re-sync with backend totals
                          const totRes = await api.get(`/expense/project/${id}/total`)
                          if (totRes && totRes.ok) setTotal(totRes.data?.total || 0)
                        } else {
                          // revert optimistic update
                          setExpenses(previousExpenses)
                          setTotal(previousTotal)
                          console.error('Delete expense response:', res)
                          alert(res && res.code ? `Impossible de supprimer la dépense: ${res.code}` : 'Impossible de supprimer la dépense')
                        }
                      } catch (err) {
                        // revert on error
                        setExpenses(previousExpenses)
                        setTotal(previousTotal)
                        console.error(err)
                        alert('Erreur lors de la suppression')
                      }
                    }} className="text-sm text-red-600 mt-1">Supprimer</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <form onSubmit={async (e) => {
            e.preventDefault()
            // optimistic add: insert locally and call API in background
            const amt = parseFloat(amount)
            if (Number.isNaN(amt)) return alert('Montant invalide')

            const tempId = `tmp-${Date.now()}-${Math.floor(Math.random()*10000)}`
            const newExpense = {
              _id: tempId,
              amount: amt,
              category,
              description,
              date,
              // mark optimistic for debugging if needed
              optimistic: true,
            }

            const previousExpenses = expenses
            const previousTotal = total

            // update UI immediately
            setExpenses((cur) => [newExpense, ...cur])
            setTotal((t) => t + amt)
            setSubmitting(true)

            try {
              const res = await api.post(`/expense/project/${id}`, { amount: amt, category, description, date })
              setSubmitting(false)
              if (!res || !res.ok) {
                // revert optimistic update
                setExpenses(previousExpenses)
                setTotal(previousTotal)
                console.error('Add expense response:', res)
                alert(res && res.code ? `Impossible d\'ajouter la dépense: ${res.code}` : 'Impossible d\'ajouter la dépense')
                return
              }

              // replace temp item with server-provided expense if available
              const serverExpense = res.data
              if (serverExpense && serverExpense._id) {
                setExpenses((cur) => cur.map((x) => (x._id === tempId ? serverExpense : x)))
              } else {
                // fallback: re-sync list & total
                const expRes = await api.get(`/expense/project/${id}`)
                const totRes = await api.get(`/expense/project/${id}/total`)
                if (expRes && expRes.ok) setExpenses(expRes.data || [])
                if (totRes && totRes.ok) setTotal(totRes.data?.total || 0)
              }

              setShowAddModal(false)
            } catch (err) {
              // revert on error
              setSubmitting(false)
              setExpenses(previousExpenses)
              setTotal(previousTotal)
              console.error(err)
              alert(err && err.code ? `Erreur: ${err.code}` : 'Impossible d\'ajouter la dépense')
            }
          }} className="w-full max-w-md bg-white rounded-md p-6">
            <h3 className="text-lg font-semibold mb-4">Ajouter une dépense</h3>
            <label className="block mb-2">
              <span className="text-sm text-gray-700">Montant</span>
              <input autoFocus value={amount} onChange={(ev) => setAmount(ev.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2" />
            </label>
            <label className="block mb-2">
              <span className="text-sm text-gray-700">Catégorie</span>
              <input value={category} onChange={(ev) => setCategory(ev.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2" />
            </label>
            <label className="block mb-2">
              <span className="text-sm text-gray-700">Description</span>
              <input value={description} onChange={(ev) => setDescription(ev.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2" />
            </label>
            <label className="block mb-4">
              <span className="text-sm text-gray-700">Date</span>
              <input type="date" value={date} onChange={(ev) => setDate(ev.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2" />
            </label>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-3 py-1 rounded-md border">Annuler</button>
              <button disabled={submitting} type="submit" className="px-3 py-1 rounded-md bg-primary text-white">{submitting ? 'Ajout...' : 'Ajouter'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="mt-6">
        <Link to="/" className="text-sm text-primary">← Retour aux projets</Link>
      </div>
    </div>
  )
}
