import React, { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import api from "@/services/api"

// Default category options
const DEFAULT_CATEGORIES = [
  'Transport',
  'Repas',
  'Hébergement',
  'Matériel',
  'Honoraires',
]

export default function ProjectView() {
  const { id } = useParams()
  const [project, setProject] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [userEmail, setUserEmail] = useState("")
  const [addingUser, setAddingUser] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [amount, setAmount] = useState("")
  // categories list (static defaults). The user may optionally type a custom category per-expense.
  const [categories] = useState(DEFAULT_CATEGORIES)
  const [category, setCategory] = useState(categories[0] || "")
  const [customCategory, setCustomCategory] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let mounted = true
    const fetch = async () => {
      try {
        const [projRes, expRes, totRes, usersRes] = await Promise.all([
          api.get(`/project/${id}`),
          api.get(`/expense/project/${id}`),
          api.get(`/expense/project/${id}/total`),
          api.get(`/project/${id}/users`),
        ])

        if (!mounted) return

        if (projRes && projRes.ok) setProject(projRes.data)
        if (expRes && expRes.ok) setExpenses(expRes.data || [])
        if (totRes && totRes.ok) setTotal(totRes.data?.total || 0)
        if (usersRes && usersRes.ok) setUsers(usersRes.data || [])
      } catch (e) {
        console.error(e)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetch()
    return () => (mounted = false)
  }, [id])

  // no persistence: user-entered categories are not stored

  if (loading) return <div className="p-8">Chargement...</div>

  if (!project) return <div className="p-8">Projet introuvable ou accès refusé.</div>

  return (
    <div className="min-h-screen flex justify-center p-8">
      <div className="w-full max-w-full">
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

      

      <div className="flex gap-6">
        <div className="flex-1">
          <div className="mb-4">
            <button onClick={() => { setShowAddModal(true); setAmount(""); setCategory(categories[0] || ""); setDescription(""); setDate(new Date().toISOString().slice(0,10)); setCustomCategory(""); }} className="px-3 py-1 rounded-md bg-primary text-white">
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
                    <div className="font-medium">{e.description}</div>
                    <div className="text-sm text-gray-600">{e.category}</div>
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
        </div>

        <aside className="w-80">
          <div className="sticky top-20 bg-white p-4 rounded-md border">
            <h3 className="text-md font-medium mb-2">Participants ({users.length})</h3>
            <div className="mb-2 flex gap-2 items-center">
              <input value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="Ajouter par email" className="rounded-md border px-3 py-2 w-full" />
              <button onClick={async () => {
                  const email = (userEmail || "").trim()
                  if (!email) return alert('Email requis')
                  setAddingUser(true)
                  try {
                    const res = await api.post(`/project/${id}/users`, { email })
                    setAddingUser(false)
                    setUserEmail("")
                    if (!res || !res.ok) {
                      alert(res && res.code ? `Impossible d'ajouter l'utilisateur: ${res.code}` : 'Impossible d\'ajouter l\'utilisateur')
                      return
                    }

                    // recharger la liste des utilisateurs
                    const usersRes = await api.get(`/project/${id}/users`)
                    if (usersRes && usersRes.ok) setUsers(usersRes.data || [])
                  } catch (err) {
                    setAddingUser(false)
                    console.error(err)
                    alert('Erreur lors de l\'ajout de l\'utilisateur')
                  }
                }} className="px-3 py-1 rounded-md bg-primary text-white">{addingUser ? 'Ajout...' : 'Ajouter'}</button>
            </div>
            <ul className="space-y-1 max-h-96 overflow-auto">
              {users.map((u) => (
                <li key={u._id || u.id} className="p-2 rounded-md border">
                  <div className="font-medium">{u.name || u.fullName || ''}</div>
                  <div className="text-sm text-gray-600">{u.email}</div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <form onSubmit={async (e) => {
            e.preventDefault()
            // optimistic add: insert locally and call API in background
            const amt = parseFloat(amount)
            if (Number.isNaN(amt)) return alert('Montant invalide')

            const tempId = `tmp-${Date.now()}-${Math.floor(Math.random()*10000)}`
            const chosenCategory = (customCategory || "").trim() || category

            const newExpense = {
              _id: tempId,
              amount: amt,
              category: chosenCategory,
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
              const res = await api.post(`/expense/project/${id}`, { amount: amt, category: chosenCategory, description, date })
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
              <span className="text-sm text-gray-700">Titre</span>
              <input autoFocus value={description} onChange={(ev) => setDescription(ev.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2" />
            </label>
            <label className="block mb-2">
              <span className="text-sm text-gray-700">Montant</span>
              <input value={amount} onChange={(ev) => setAmount(ev.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2" />
            </label>
            <label className="block mb-2">
              <span className="text-sm text-gray-700">Catégorie</span>
              <select value={category} onChange={(ev) => { setCategory(ev.target.value); if (ev.target.value !== '') setCustomCategory(''); }} className="mt-1 block w-full rounded-md border px-3 py-2">
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="">Autre (saisir ci-dessous)</option>
              </select>
              {category === '' && (
                <input value={customCategory} onChange={(ev) => setCustomCategory(ev.target.value)} placeholder="Saisir une catégorie" className="mt-2 block w-full rounded-md border px-3 py-2" />
              )}
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
    </div>
  )
}
