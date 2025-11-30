import React, { Fragment, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Menu, Transition } from "@headlessui/react"
import { TbLogout } from "react-icons/tb"

import useStore from "@/services/store"
import api from "@/services/api"

const TopBar = () => {
  return (
    <div className="w-full h-full flex items-center justify-end px-4">
      <ProfileMenu />
    </div>
  )
}

const ProfileMenu = () => {
  const { user, setUser } = useStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await api.post("/user/logout")
    } catch (error) {
      console.error("Logout error:", error)
    }
    setUser(null)
    api.removeToken()
    navigate("/auth")
  }
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [projectName, setProjectName] = useState("")
  const [projectBudget, setProjectBudget] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleCreateProject = () => {
    if (!user) return alert("Vous devez être connecté pour créer un projet")
    setProjectName("")
    setProjectBudget("")
    setShowCreateModal(true)
  }

  const submitCreateProject = async (e) => {
    e && e.preventDefault()
    try {
      const name = (projectName || "").trim()
      if (!name) return alert("Le nom du projet est requis")

      const budget = parseFloat(projectBudget)
      if (Number.isNaN(budget)) return alert("Budget invalide")

      setSubmitting(true)
      const res = await api.post(`/project/`, { name, budget })
      setSubmitting(false)
      if (!res.ok) throw res

      setShowCreateModal(false)
      // broadcast created project so pages (Home) can update optimistically
      try {
        if (res && res.data) {
          window.dispatchEvent(new CustomEvent('project:created', { detail: res.data }))
        }
      } catch (err) {
        // ignore dispatch errors
        console.error('Dispatch project:created error', err)
      }
    } catch (error) {
      setSubmitting(false)
      console.error("Create project error:", error)
      alert(error && error.code ? `Erreur: ${error.code}` : "Impossible de créer le projet")
    }
  }

  return (
    <>
      <Menu as="div" className="relative flex items-center">
      <button onClick={handleCreateProject} className="mr-3 px-3 py-1 text-sm font-medium text-white bg-primary rounded-md hover:opacity-90">
        Créer un projet
      </button>

      <Menu.Button>
        {user.avatar ? (
          <img className="h-10 w-10 rounded-full border border-secondary object-contain" src={user.avatar} alt="" />
        ) : (
          <span className="h-10 w-10 rounded-full border border-secondary bg-white flex items-center justify-center uppercase font-bold text-gray-800 text-sm">
            {user.first_name[0]}
            {user.last_name[0]}
          </span>
        )}
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute top-10 right-0 mt-2 rounded-b-md bg-white border p-2 z-10">
          <Menu.Item>
            {({ active }) => (
              <button className={`text-white w-44 flex items-center justify-between rounded-md px-4 py-2 text-sm ${active ? "bg-gray-600" : "bg-primary"}`} onClick={handleLogout}>
                Se déconnecter
                <TbLogout className="ml-2 h-5 w-5 text-white" aria-hidden="true" />
              </button>
            )}
          </Menu.Item>
        </Menu.Items>
      </Transition>
    </Menu>

  {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <form onSubmit={submitCreateProject} className="w-full max-w-md bg-white rounded-md p-6">
            <h3 className="text-lg font-semibold mb-4">Créer un projet</h3>
            <label className="block mb-2">
              <span className="text-sm text-gray-700">Nom</span>
              <input autoFocus value={projectName} onChange={(e) => setProjectName(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2" />
            </label>
            <label className="block mb-4">
              <span className="text-sm text-gray-700">Budget</span>
              <input value={projectBudget} onChange={(e) => setProjectBudget(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2" />
            </label>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setShowCreateModal(false)} className="px-3 py-1 rounded-md border">
                Annuler
              </button>
              <button disabled={submitting} type="submit" className="px-3 py-1 rounded-md bg-primary text-white">
                {submitting ? "Création..." : "Créer"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}

export default TopBar
