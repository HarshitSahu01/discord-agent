'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { LogOut, Save, Trash2, Plus, Terminal, Brain, MessageSquare, Shield, Activity, UploadCloud, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Configuration {
    key: string
    value: string
}

interface AllowedChannel {
    id: number
    channel_id: string
    name?: string
}

export default function Dashboard() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState('instructions')
    const [instructions, setInstructions] = useState('')
    const [loading, setLoading] = useState(false)
    const [channels, setChannels] = useState<AllowedChannel[]>([])
    const [newChannelId, setNewChannelId] = useState('')
    const [memories, setMemories] = useState<any[]>([])
    const [documents, setDocuments] = useState<string[]>([])
    const [uploads, setUploads] = useState<any[]>([])
    const [status, setStatus] = useState('')

    useEffect(() => {
        checkUser()
        fetchData()
    }, [])

    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) router.push('/login')
    }

    const fetchData = async () => {
        setLoading(true)
        // Fetch instructions
        const { data: config } = await supabase
            .from('configurations')
            .select('value')
            .eq('key', 'system_instructions')
            .single()
        if (config) setInstructions(config.value)

        // Fetch channels
        const { data: chans } = await supabase.from('allowed_channels').select('*')
        if (chans) setChannels(chans)

        // Fetch memories
        const { data: mems } = await supabase
            .from('memories')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(50)
        if (mems) setMemories(mems)

        if (mems) setMemories(mems)

        // Fetch distinct documents (mock distinct via client side for now as supabase distinct support varies or needs rpc)
        // Actually best to fetch all metadata source fields
        const { data: docs } = await supabase
            .from('documents')
            .select('metadata')

        if (docs) {
            const sources = new Set(docs.map((d: any) => d.metadata?.source).filter(Boolean))
            setDocuments(Array.from(sources) as string[])
        }

        // Fetch uploads status
        const { data: uplds } = await supabase
            .from('uploads')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10)

        if (uplds) setUploads(uplds)

        setLoading(false)
    }

    const saveInstructions = async () => {
        setStatus('Saving...')
        // Upsert instructions
        const { error } = await supabase
            .from('configurations')
            .upsert({ key: 'system_instructions', value: instructions })

        if (error) {
            setStatus('Error saving')
        } else {
            setStatus('Saved!')
            // Trigger webhook to update bot
            await fetch('/api/update-bot-config', { method: 'POST' })
        }
        setTimeout(() => setStatus(''), 2000)
    }

    const addChannel = async () => {
        if (!newChannelId) return
        const { error } = await supabase.from('allowed_channels').insert({ channel_id: newChannelId })
        if (!error) {
            setNewChannelId('')
            fetchData()
            // Trigger webhook
            await fetch('/api/update-bot-config', { method: 'POST' })
        }
    }

    const removeChannel = async (id: number) => {
        await supabase.from('allowed_channels').delete().eq('id', id)
        fetchData()
        // Trigger webhook
        await fetch('/api/update-bot-config', { method: 'POST' })
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white flex">
            {/* Sidebar */}
            <div className="w-64 bg-gray-900 border-r border-gray-800 p-6 flex flex-col">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-8">
                    Admin Console
                </h1>

                <nav className="flex-1 space-y-2">
                    <button
                        onClick={() => setActiveTab('instructions')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'instructions' ? 'bg-blue-600/10 text-blue-400' : 'text-gray-400 hover:bg-gray-800'
                            }`}
                    >
                        <Terminal size={20} />
                        System Brain
                    </button>
                    <button
                        onClick={() => setActiveTab('channels')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'channels' ? 'bg-purple-600/10 text-purple-400' : 'text-gray-400 hover:bg-gray-800'
                            }`}
                    >
                        <Shield size={20} />
                        Access Check
                    </button>
                    <button
                        onClick={() => setActiveTab('memory')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'memory' ? 'bg-green-600/10 text-green-400' : 'text-gray-400 hover:bg-gray-800'
                            }`}
                    >
                        <Brain size={20} />
                        Memory Bank
                    </button>
                    <button
                        onClick={() => setActiveTab('knowledge')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'knowledge' ? 'bg-orange-600/10 text-orange-400' : 'text-gray-400 hover:bg-gray-800'
                            }`}
                    >
                        <UploadCloud size={20} />
                        Knowledge Base
                    </button>
                </nav>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors mt-auto"
                >
                    <LogOut size={20} />
                    Sign Out
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8 overflow-y-auto">
                {activeTab === 'instructions' && (
                    <div className="max-w-4xl mx-auto">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-3xl font-bold">System Instructions</h2>
                                <p className="text-gray-400 mt-1">Define the agent's personality and core rules.</p>
                            </div>
                            <div className="flex items-center gap-4">
                                {status && <span className="text-sm text-green-400 animate-pulse">{status}</span>}
                                <button
                                    onClick={saveInstructions}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-6 py-2.5 rounded-lg font-medium transition-colors"
                                >
                                    <Save size={18} />
                                    Update Agent
                                </button>
                            </div>
                        </div>

                        <div className="bg-gray-900 rounded-xl border border-gray-800 p-1">
                            <textarea
                                value={instructions}
                                onChange={(e) => setInstructions(e.target.value)}
                                className="w-full h-[600px] bg-gray-950 text-gray-300 p-6 rounded-lg outline-none resize-none font-mono text-sm leading-relaxed"
                                placeholder="You are a helpful assistant..."
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'channels' && (
                    <div className="max-w-4xl mx-auto">
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold">Access Control</h2>
                            <p className="text-gray-400 mt-1">Manage Discord channels where the bot is active.</p>
                        </div>

                        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-8">
                            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                                <Plus size={20} className="text-blue-400" />
                                Add Allowed Channel
                            </h3>
                            <div className="flex gap-4">
                                <input
                                    type="text"
                                    value={newChannelId}
                                    onChange={(e) => setNewChannelId(e.target.value)}
                                    placeholder="Channel ID (e.g. 123456789)"
                                    className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition-colors"
                                />
                                <button
                                    onClick={addChannel}
                                    className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-lg font-medium transition-colors"
                                >
                                    Add Channel
                                </button>
                            </div>
                        </div>

                        <div className="grid gap-4">
                            {channels.map((channel) => (
                                <div key={channel.id} className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex justify-between items-center group hover:border-gray-700 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-gray-800 rounded-lg">
                                            <MessageSquare size={20} className="text-gray-400" />
                                        </div>
                                        <span className="font-mono text-gray-300">{channel.channel_id}</span>
                                    </div>
                                    <button
                                        onClick={() => removeChannel(channel.id)}
                                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                            {channels.length === 0 && (
                                <div className="text-center py-12 text-gray-500">
                                    No allowed channels configured.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'memory' && (
                    <div className="max-w-4xl mx-auto">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-3xl font-bold">Memory Bank</h2>
                                <p className="text-gray-400 mt-1">View and reset the agent's short-term conversation history.</p>
                            </div>
                            <button
                                onClick={async () => {
                                    setStatus('Clearing...')
                                    await supabase.from('memories').delete().neq('id', 0) // Delete all
                                    fetchData()
                                    setStatus('Cleared!')
                                    setTimeout(() => setStatus(''), 2000)
                                }}
                                className="flex items-center gap-2 bg-red-600 hover:bg-red-500 px-6 py-2.5 rounded-lg font-medium transition-colors"
                            >
                                <Trash2 size={18} />
                                Reset Memory
                            </button>
                        </div>

                        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4 max-h-[600px] overflow-y-auto">
                            {memories.map((mem) => (
                                <div key={mem.id} className={`flex ${mem.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                                    <div className={`max-w-[80%] p-4 rounded-xl ${mem.role === 'assistant'
                                        ? 'bg-gray-800 text-gray-200 rounded-tl-none'
                                        : 'bg-blue-600/20 text-blue-200 rounded-tr-none'
                                        }`}>
                                        <p className="text-xs opacity-50 mb-1 uppercase tracking-wider">{mem.role}</p>
                                        <p className="whitespace-pre-wrap">{mem.content}</p>
                                    </div>
                                </div>
                            ))}
                            {memories.length === 0 && (
                                <div className="text-center py-12 text-gray-500">
                                    <Activity size={48} className="mx-auto mb-4 opacity-20" />
                                    <p>No memories recorded yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'knowledge' && (
                    <div className="max-w-4xl mx-auto">
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold">Knowledge Base</h2>
                            <p className="text-gray-400 mt-1">Upload PDF or Text documents to train your agent.</p>
                        </div>

                        {/* Upload Status */}
                        {uploads.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Processing Queue</h3>
                                <div className="space-y-3">
                                    {uploads.map((upload) => (
                                        <div key={upload.id} className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {upload.status === 'processing' && <Activity size={18} className="text-blue-400 animate-spin" />}
                                                {upload.status === 'completed' && <div className="w-2 h-2 rounded-full bg-green-500" />}
                                                {upload.status === 'failed' && <div className="w-2 h-2 rounded-full bg-red-500" />}
                                                <span className="text-gray-300 font-mono text-sm">{upload.filename}</span>
                                            </div>
                                            <span className={`text-xs font-semibold px-2 py-1 rounded ${upload.status === 'processing' ? 'bg-blue-500/10 text-blue-400' :
                                                    upload.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                                                        'bg-red-500/10 text-red-400'
                                                }`}>
                                                {upload.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Document List */}
                        <div className="grid gap-4 mb-8">
                            {documents.map((doc) => (
                                <div key={doc} className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex justify-between items-center group hover:border-gray-700 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-gray-800 rounded-lg">
                                            <FileText size={20} className="text-orange-400" />
                                        </div>
                                        <span className="font-mono text-gray-300 truncate max-w-md">{doc}</span>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            if (!confirm(`Delete all chunks for ${doc}?`)) return
                                            // Delete chunks where metadata->>source equals doc
                                            await supabase
                                                .from('documents')
                                                .delete()
                                                .contains('metadata', { source: doc })
                                            fetchData()
                                        }}
                                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 flex flex-col items-center justify-center text-center dashed-border border-dashed">
                            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                <UploadCloud size={32} className="text-blue-400" />
                            </div>
                            <h3 className="text-xl font-medium mb-2">Upload Knowledge Source</h3>
                            <p className="text-gray-400 mb-6 max-w-sm">
                                Supported formats: PDF, TXT. Documents are automatically chunked and embedded for retrieval.
                            </p>

                            <label className="relative">
                                <input
                                    type="file"
                                    accept=".pdf,.txt"
                                    className="hidden"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0]
                                        if (!file) return

                                        setStatus('Uploading...')
                                        const formData = new FormData()
                                        formData.append('file', file)

                                        try {
                                            const res = await fetch('/api/upload-doc', {
                                                method: 'POST',
                                                body: formData
                                            })
                                            const json = await res.json()

                                            if (res.ok) {
                                                setStatus('Queued for processing...')
                                                fetchData()
                                                // Start polling
                                                const interval = setInterval(fetchData, 2000)
                                                setTimeout(() => clearInterval(interval), 15000)
                                            } else {
                                                setStatus(`Error: ${json.error}`)
                                            }
                                        } catch (err) {
                                            setStatus('Upload failed')
                                        }
                                        setTimeout(() => setStatus(''), 3000)
                                    }}
                                />
                                <span className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-medium transition-colors inline-block">
                                    Select Document
                                </span>
                            </label>

                            {status && (
                                <div className="mt-6 p-3 bg-gray-800 rounded-lg text-sm text-blue-200 animate-pulse">
                                    {status}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
