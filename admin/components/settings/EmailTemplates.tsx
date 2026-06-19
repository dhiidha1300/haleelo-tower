'use client';

import { useEffect, useState } from 'react';
import { emailTemplatesAPI } from '@/lib/api';
import { RichTextEditor } from './RichTextEditor';

interface Tpl {
  id?: number; key: string; name: string; subject: string; body_html: string;
  variables: string[]; is_system: boolean; is_active: boolean;
}

const BLANK: Tpl = { key: '', name: '', subject: '', body_html: '<p>Hi {{name}},</p>', variables: ['name'], is_system: false, is_active: true };

export function EmailTemplates() {
  const [list, setList] = useState<Tpl[]>([]);
  const [edit, setEdit] = useState<Tpl | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [preview, setPreview] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = () => emailTemplatesAPI.list().then(r => setList(r.data.templates ?? []));
  useEffect(() => { load(); }, []);

  const flash = (m: string) => { setMessage(m); setTimeout(() => setMessage(''), 4000); };

  const open = (t: Tpl) => { setIsNew(false); setShowPreview(false); setEdit({ ...t, variables: t.variables ?? [] }); };
  const create = () => { setIsNew(true); setShowPreview(false); setEdit({ ...BLANK }); };

  const save = async () => {
    if (!edit) return;
    setBusy(true);
    try {
      if (isNew) {
        await emailTemplatesAPI.create(edit);
        flash('✓ Template created');
      } else {
        await emailTemplatesAPI.update(edit.id!, {
          name: edit.name, subject: edit.subject, body_html: edit.body_html,
          variables: edit.variables, is_active: edit.is_active,
        });
        flash('✓ Template saved');
      }
      await load();
      setEdit(null); setIsNew(false);
    } catch (e: any) { flash('✗ ' + (e.response?.data?.message || 'Failed to save')); }
    finally { setBusy(false); }
  };

  const remove = async (t: Tpl) => {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    try { await emailTemplatesAPI.destroy(t.id!); flash('✓ Deleted'); await load(); setEdit(null); }
    catch (e: any) { flash('✗ ' + (e.response?.data?.message || 'Failed')); }
  };

  const doPreview = async () => {
    if (!edit?.id) { flash('✗ Save the template first to preview'); return; }
    try {
      const r = await emailTemplatesAPI.preview(edit.id, edit.subject, edit.body_html);
      setPreview(r.data.html); setShowPreview(true);
    } catch (e: any) { flash('✗ ' + (e.response?.data?.message || 'Preview failed')); }
  };

  const sendTest = async () => {
    if (!edit?.id) { flash('✗ Save the template first'); return; }
    if (!testEmail) { flash('✗ Enter a test email address'); return; }
    setBusy(true);
    try { const r = await emailTemplatesAPI.test(edit.id, testEmail); flash('✓ ' + r.data.message); }
    catch (e: any) { flash('✗ ' + (e.response?.data?.message || 'Failed to send')); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-[#1B2D4F]">Email Templates</h3>
          <p className="text-sm text-gray-500">Edit the content of automated emails. The navy/gold header & footer are applied automatically.</p>
        </div>
        <button onClick={create} className="bg-[#C9A052] hover:bg-[#b89140] text-white text-sm font-semibold px-4 py-2 rounded-lg">+ New Template</button>
      </div>

      {message && <div className={`p-3 mb-4 rounded-lg text-sm ${message.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* List */}
        <div className="space-y-2">
          {list.map(t => (
            <button key={t.id} onClick={() => open(t)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${edit?.id === t.id ? 'border-[#C9A052] bg-amber-50' : 'border-gray-200 hover:bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#1B2D4F]">{t.name}</span>
                {t.is_system
                  ? <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">SYSTEM</span>
                  : <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">CUSTOM</span>}
              </div>
              <div className="text-xs text-gray-400 truncate mt-0.5">{t.subject}</div>
              {!t.is_active && <span className="text-[10px] text-red-500">Inactive</span>}
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="lg:col-span-2">
          {!edit ? (
            <div className="text-center text-gray-400 text-sm py-16 border border-dashed rounded-lg">Select a template to edit, or create a new one.</div>
          ) : (
            <div className="space-y-3">
              {isNew && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Key (slug) *</label>
                    <input value={edit.key} onChange={e => setEdit({ ...edit, key: e.target.value.replace(/[^a-z0-9_]/g, '') })}
                      placeholder="custom_welcome" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Variables (comma-separated)</label>
                    <input value={edit.variables.join(', ')} onChange={e => setEdit({ ...edit, variables: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                      placeholder="name, code" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-500 mb-1">Template Name *</label>
                <input value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Subject *</label>
                <input value={edit.subject} onChange={e => setEdit({ ...edit, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Body</label>
                <RichTextEditor value={edit.body_html} onChange={html => setEdit({ ...edit, body_html: html })} variables={edit.variables} />
              </div>

              {!edit.is_system && !isNew && (
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" checked={edit.is_active} onChange={e => setEdit({ ...edit, is_active: e.target.checked })} />
                  Active (uncheck to stop sending this email)
                </label>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button onClick={save} disabled={busy} className="bg-[#C9A052] text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button>
                <button onClick={doPreview} className="border border-[#1B2D4F] text-[#1B2D4F] text-sm font-medium px-4 py-2 rounded-lg">Preview</button>
                <input value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="test@email.com" className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-44 focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
                <button onClick={sendTest} disabled={busy} className="bg-[#1B2D4F] text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">Send Test</button>
                <div className="flex-1" />
                <button onClick={() => { setEdit(null); setIsNew(false); }} className="text-sm text-gray-500 px-3 py-2">Close</button>
                {!edit.is_system && !isNew && <button onClick={() => remove(edit)} className="text-sm text-red-600 px-3 py-2">Delete</button>}
              </div>

              {edit.is_system && <p className="text-xs text-gray-400">This is a system template — it can be edited but not deleted or deactivated.</p>}

              {showPreview && (
                <div className="border border-gray-200 rounded-lg overflow-hidden mt-2">
                  <div className="bg-gray-50 border-b px-3 py-1.5 text-xs text-gray-500 flex justify-between">
                    <span>Preview (sample data)</span>
                    <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                  </div>
                  <iframe title="preview" srcDoc={preview} className="w-full h-[480px] bg-white" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
