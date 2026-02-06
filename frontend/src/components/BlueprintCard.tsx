import { useState } from 'react';
import { Copy, Check, Save, Clock, Camera, Film, Eye, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { saveScript, updateScript, type Script } from '@/lib/api';
import { formatScriptForCopy, copyToClipboard } from '@/lib/clipboard';

interface BlueprintCardProps {
  title: string;
  script: Script;
  showSave?: boolean;
  /** If provided, enables edit mode with DB persistence */
  savedId?: string;
  onUpdated?: () => void;
}

export function BlueprintCard({ title, script, showSave = true, savedId, onUpdated }: BlueprintCardProps) {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editHook, setEditHook] = useState(script.hook);
  const [editContent, setEditContent] = useState(script.core_content);
  const [editCta, setEditCta] = useState(script.cta);
  const [editShotStyle, setEditShotStyle] = useState(script.shot_style);
  const [editVisualElements, setEditVisualElements] = useState(script.visual_elements.join('\n'));
  const [editEditingNotes, setEditEditingNotes] = useState(script.editing_notes.join('\n'));
  const [editDuration, setEditDuration] = useState(script.estimated_duration);
  const [updating, setUpdating] = useState(false);

  const handleCopy = async () => {
    const text = formatScriptForCopy(editing ? editTitle : title, editing ? buildEditedScript() : script);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      toast('تم النسخ ✅', 'success');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast('فشل النسخ', 'error');
    }
  };

  const handleSave = async () => {
    if (!isAuthenticated) {
      toast('سجّل دخول الأول عشان تحفظ', 'error');
      return;
    }
    setSaving(true);
    try {
      await saveScript({ ...script, idea_title: title });
      setSaved(true);
      toast('تم الحفظ ✅', 'success');
    } catch (err: any) {
      toast(err.message || 'فشل الحفظ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const buildEditedScript = (): Script => ({
    hook: editHook,
    core_content: editContent,
    cta: editCta,
    visual_elements: editVisualElements.split('\n').filter(Boolean),
    shot_style: editShotStyle,
    editing_notes: editEditingNotes.split('\n').filter(Boolean),
    estimated_duration: editDuration,
  });

  const handleStartEdit = () => {
    setEditTitle(title);
    setEditHook(script.hook);
    setEditContent(script.core_content);
    setEditCta(script.cta);
    setEditShotStyle(script.shot_style);
    setEditVisualElements(script.visual_elements.join('\n'));
    setEditEditingNotes(script.editing_notes.join('\n'));
    setEditDuration(script.estimated_duration);
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!savedId) return;
    setUpdating(true);
    try {
      const edited = buildEditedScript();
      await updateScript(savedId, { ...edited, idea_title: editTitle });
      toast('تم التحديث ✅', 'success');
      setEditing(false);
      onUpdated?.();
    } catch (err: any) {
      toast(err.message || 'فشل التحديث', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 rounded-lg border border-border bg-surface text-text text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all';

  // Display values (use edit state when editing)
  const displayTitle = editing ? editTitle : title;
  const displayScript: Script = editing ? buildEditedScript() : script;

  return (
    <div className="bg-surface rounded-2xl shadow-sm border border-border overflow-hidden">
      {/* Actions bar */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-surface-elevated">
        {editing ? (
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className={`${inputClass} flex-1 font-bold`}
            dir="auto"
          />
        ) : (
          <h3 className="text-sm font-bold flex-1 truncate">{displayTitle}</h3>
        )}
        <Button variant="ghost" size="sm" onClick={handleCopy}>
          {copied ? (
            <Check className="w-4 h-4 text-success" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          {copied ? 'تم النسخ' : 'نسخ'}
        </Button>
        {showSave && !savedId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            loading={saving}
            disabled={saved}
          >
            {saved ? (
              <Check className="w-4 h-4 text-success" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? 'تم الحفظ' : 'حفظ'}
          </Button>
        )}
        {savedId && !editing && (
          <Button variant="ghost" size="sm" onClick={handleStartEdit}>
            <Pencil className="w-4 h-4" />
            تعديل
          </Button>
        )}
        {editing && (
          <>
            <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
              <X className="w-4 h-4" />
              إلغاء
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveEdit} loading={updating}>
              <Save className="w-4 h-4" />
              حفظ التعديل
            </Button>
          </>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Hook */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <div className="text-xs font-bold text-amber-400 mb-1.5 uppercase tracking-wider">
            🎣 HOOK
          </div>
          {editing ? (
            <textarea
              value={editHook}
              onChange={(e) => setEditHook(e.target.value)}
              className={inputClass}
              rows={2}
              dir="auto"
            />
          ) : (
            <p className="text-sm leading-relaxed font-medium text-text">{displayScript.hook}</p>
          )}
        </div>

        {/* Content */}
        <div>
          <div className="text-xs font-bold text-text-secondary mb-2 uppercase tracking-wider">
            📹 المحتوى
          </div>
          {editing ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className={inputClass}
              rows={8}
              dir="auto"
            />
          ) : (
            <div className="text-sm leading-loose whitespace-pre-line text-text">
              {displayScript.core_content}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <div className="text-xs font-bold text-amber-400 mb-1.5 uppercase tracking-wider">
            📢 CTA
          </div>
          {editing ? (
            <textarea
              value={editCta}
              onChange={(e) => setEditCta(e.target.value)}
              className={inputClass}
              rows={2}
              dir="auto"
            />
          ) : (
            <p className="text-sm leading-relaxed font-medium text-text">{displayScript.cta}</p>
          )}
        </div>

        {/* Filming & Editing — always LTR / English */}
        <div className="bg-surface-elevated rounded-xl p-4 space-y-4" dir="ltr">
          <div className="text-xs font-bold text-text-secondary uppercase tracking-wider">
            🎬 Filming &amp; Editing Instructions
          </div>

          {/* Shot style */}
          <div className="flex items-start gap-2">
            <Camera className="w-4 h-4 text-text-secondary mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="text-xs font-semibold text-text-secondary mb-1">
                Filming Style
              </div>
              {editing ? (
                <input
                  value={editShotStyle}
                  onChange={(e) => setEditShotStyle(e.target.value)}
                  className={inputClass}
                  dir="ltr"
                />
              ) : (
                <p className="text-sm text-text">{displayScript.shot_style}</p>
              )}
            </div>
          </div>

          {/* Visual elements */}
          <div className="flex items-start gap-2">
            <Eye className="w-4 h-4 text-text-secondary mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="text-xs font-semibold text-text-secondary mb-1">
                Visual Elements
              </div>
              {editing ? (
                <textarea
                  value={editVisualElements}
                  onChange={(e) => setEditVisualElements(e.target.value)}
                  className={inputClass}
                  rows={3}
                  dir="ltr"
                  placeholder="One per line"
                />
              ) : displayScript.visual_elements.length > 0 ? (
                <ul className="text-sm space-y-1 list-none p-0 m-0">
                  {displayScript.visual_elements.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-primary mt-0.5">•</span>
                      <span className="text-text">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>

          {/* Editing notes */}
          <div className="flex items-start gap-2">
            <Film className="w-4 h-4 text-text-secondary mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="text-xs font-semibold text-text-secondary mb-1">
                Editing Notes
              </div>
              {editing ? (
                <textarea
                  value={editEditingNotes}
                  onChange={(e) => setEditEditingNotes(e.target.value)}
                  className={inputClass}
                  rows={3}
                  dir="ltr"
                  placeholder="One per line"
                />
              ) : displayScript.editing_notes.length > 0 ? (
                <ul className="text-sm space-y-1 list-none p-0 m-0">
                  {displayScript.editing_notes.map((note, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-primary mt-0.5">•</span>
                      <span className="text-text">{note}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Clock className="w-4 h-4 shrink-0" />
            {editing ? (
              <input
                value={editDuration}
                onChange={(e) => setEditDuration(e.target.value)}
                className={`${inputClass} w-40`}
                dir="ltr"
              />
            ) : (
              <span>Approx. duration: {displayScript.estimated_duration}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
