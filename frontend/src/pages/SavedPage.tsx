import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Archive,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  PlayCircle,
  CheckCircle2,
  GripVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/Loading';
import { useToast } from '@/context/ToastContext';
import {
  listScripts,
  deleteScript,
  getScript,
  updateScriptStatus,
  reorderScripts,
  type SavedScript,
} from '@/lib/api';
import { formatScriptForCopy, copyToClipboard } from '@/lib/clipboard';
import { BlueprintCard } from '@/components/BlueprintCard';
import { useState, useRef, useCallback } from 'react';

type ScriptStatus = 'none' | 'working' | 'done';

interface ScriptListItem {
  id: string;
  idea_title: string;
  status: string;
  sort_order: number;
  created_at: string;
}

export function SavedPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Drag state
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDraggable, setIsDraggable] = useState<string | null>(null);

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['scripts'],
    queryFn: listScripts,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteScript,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scripts'] });
      toast('تم الحذف', 'success');
    },
    onError: (err: Error) => {
      toast(err.message, 'error');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ScriptStatus }) =>
      updateScriptStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scripts'] });
    },
    onError: (err: Error) => {
      toast(err.message, 'error');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (items: { id: string; sort_order: number }[]) =>
      reorderScripts(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scripts'] });
    },
  });

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف السكريبت ده؟')) {
      if (expandedId === id) setExpandedId(null);
      deleteMutation.mutate(id);
    }
  };

  const cycleStatus = (id: string, currentStatus: string) => {
    const next: Record<string, ScriptStatus> = {
      none: 'working',
      working: 'done',
      done: 'none',
    };
    statusMutation.mutate({ id, status: next[currentStatus] || 'working' });
  };

  const handleCopy = async (id: string) => {
    try {
      const res = await getScript(id);
      const text = formatScriptForCopy(res.script.idea_title, res.script);
      await copyToClipboard(text);
      setCopiedId(id);
      toast('تم النسخ ✅', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast('فشل النسخ', 'error');
    }
  };

  const scripts = data?.scripts || [];

  const handleDragStart = useCallback(
    (e: React.DragEvent, id: string) => {
      if (isDraggable !== id) {
        e.preventDefault();
        return;
      }
      setDragId(id);
      e.dataTransfer.effectAllowed = 'move';
    },
    [isDraggable]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, id: string) => {
      e.preventDefault();
      if (!dragId || dragId === id) return;
      const dragItem = scripts.find((s) => s.id === dragId);
      const overItem = scripts.find((s) => s.id === id);
      if (dragItem?.status !== overItem?.status) return;
      setDragOverId(id);
    },
    [dragId, scripts]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, dropId: string) => {
      e.preventDefault();
      if (!dragId || dragId === dropId) {
        setDragId(null);
        setDragOverId(null);
        return;
      }

      const dragItem = scripts.find((s) => s.id === dragId);
      const dropItem = scripts.find((s) => s.id === dropId);
      if (!dragItem || !dropItem || dragItem.status !== dropItem.status) {
        setDragId(null);
        setDragOverId(null);
        return;
      }

      const group = scripts.filter((s) => s.status === dragItem.status);
      const fromIndex = group.findIndex((s) => s.id === dragId);
      const toIndex = group.findIndex((s) => s.id === dropId);

      const reordered = [...group];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);

      const items = reordered.map((s, i) => ({ id: s.id, sort_order: i }));
      reorderMutation.mutate(items);

      setDragId(null);
      setDragOverId(null);
      setIsDraggable(null);
    },
    [dragId, scripts, reorderMutation]
  );

  const handleDragEnd = () => {
    setDragId(null);
    setDragOverId(null);
    setIsDraggable(null);
  };

  const startLongPress = (id: string) => {
    longPressTimer.current = setTimeout(() => {
      setIsDraggable(id);
    }, 400);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="بنحمّل المحفوظات..." />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-error text-sm">فشل تحميل المحفوظات</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Archive className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-bold">السكريبتات المحفوظة</h1>
        <span className="text-xs bg-primary-light text-primary px-2 py-0.5 rounded-full font-medium">
          {scripts.length}
        </span>
      </div>

      {scripts.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <Archive className="w-10 h-10 text-gray-300 mx-auto" />
          <p className="text-text-secondary text-sm">مفيش سكريبتات محفوظة لسه</p>
          <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
            ابدأ بإنشاء محتوى
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {scripts.map((s) => (
          <div
            key={s.id}
            draggable={isDraggable === s.id}
            onDragStart={(e) => handleDragStart(e, s.id)}
            onDragOver={(e) => handleDragOver(e, s.id)}
            onDrop={(e) => handleDrop(e, s.id)}
            onDragEnd={handleDragEnd}
            className={`transition-all ${dragOverId === s.id ? 'opacity-50' : ''} ${
              dragId === s.id ? 'opacity-30' : ''
            }`}
          >
            <SavedScriptCard
              item={s}
              isExpanded={expandedId === s.id}
              isCopied={copiedId === s.id}
              isDragReady={isDraggable === s.id}
              onToggle={() =>
                setExpandedId(expandedId === s.id ? null : s.id)
              }
              onDelete={() => handleDelete(s.id)}
              onCopy={() => handleCopy(s.id)}
              onStatusChange={() => cycleStatus(s.id, s.status)}
              onLongPressStart={() => startLongPress(s.id)}
              onLongPressEnd={cancelLongPress}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Saved Script Card (collapsible inline) ---

function SavedScriptCard({
  item,
  isExpanded,
  isCopied,
  isDragReady,
  onToggle,
  onDelete,
  onCopy,
  onStatusChange,
  onLongPressStart,
  onLongPressEnd,
}: {
  item: ScriptListItem;
  isExpanded: boolean;
  isCopied: boolean;
  isDragReady: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onStatusChange: () => void;
  onLongPressStart: () => void;
  onLongPressEnd: () => void;
}) {
  const date = new Date(item.created_at).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const statusBg: Record<string, string> = {
    none: 'bg-surface border-border',
    working: 'bg-amber-400/[0.06] border-amber-500/20',
    done: 'bg-emerald-400/[0.06] border-emerald-500/20',
  };

  const statusIcon = () => {
    switch (item.status) {
      case 'working':
        return <PlayCircle className="w-4 h-4 text-amber-400" />;
      case 'done':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      default:
        return <Circle className="w-4 h-4 text-text-secondary" />;
    }
  };

  return (
    <div
      className={`rounded-xl border transition-all overflow-hidden ${
        statusBg[item.status] || statusBg.none
      } ${isExpanded ? 'shadow-sm' : 'hover:border-primary/20'} ${
        isDragReady ? 'ring-2 ring-primary/30 cursor-grab' : ''
      }`}
    >
      {/* Collapsed header */}
      <div className="flex items-center gap-2 p-4">
        {/* Drag handle */}
        <div
          className="cursor-grab touch-none select-none"
          onMouseDown={onLongPressStart}
          onMouseUp={onLongPressEnd}
          onMouseLeave={onLongPressEnd}
          onTouchStart={onLongPressStart}
          onTouchEnd={onLongPressEnd}
        >
          <GripVertical className="w-4 h-4 text-text-secondary/50" />
        </div>

        {/* Status button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStatusChange();
          }}
          className="p-1 rounded-lg hover:bg-surface-elevated transition-colors cursor-pointer bg-transparent border-0"
          title={
            item.status === 'none'
              ? 'Mark as working'
              : item.status === 'working'
              ? 'Mark as done'
              : 'Reset status'
          }
        >
          {statusIcon()}
        </button>

        {/* Title / toggle */}
        <button
          onClick={onToggle}
          className="flex-1 text-right cursor-pointer bg-transparent border-0 p-0 text-text min-w-0"
        >
          <h3 className="text-sm font-bold truncate">{item.idea_title}</h3>
          <p className="text-xs text-text-secondary mt-0.5">{date}</p>
        </button>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={onCopy}
            className="p-2 rounded-lg hover:bg-surface-elevated transition-colors cursor-pointer bg-transparent border-0"
            title="نسخ"
          >
            {isCopied ? (
              <Check className="w-4 h-4 text-success" />
            ) : (
              <Copy className="w-4 h-4 text-text-secondary" />
            )}
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer bg-transparent border-0"
            title="حذف"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-surface-elevated transition-colors cursor-pointer bg-transparent border-0"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-text-secondary" />
            ) : (
              <ChevronDown className="w-4 h-4 text-text-secondary" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded content (inline) */}
      {isExpanded && <ExpandedContent id={item.id} />}
    </div>
  );
}

// --- Expanded content loaded inline ---

function ExpandedContent({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['script', id],
    queryFn: () => getScript(id),
  });

  if (isLoading) {
    return (
      <div className="px-4 pb-4">
        <LoadingSpinner text="بنحمّل السكريبت..." />
      </div>
    );
  }

  if (!data?.script) {
    return (
      <div className="px-4 pb-4">
        <p className="text-sm text-error text-center">فشل التحميل</p>
      </div>
    );
  }

  const s = data.script as SavedScript;

  return (
    <div className="border-t border-border">
      <BlueprintCard
        title={s.idea_title}
        script={{
          hook: s.hook,
          core_content: s.core_content,
          cta: s.cta,
          visual_elements: s.visual_elements,
          shot_style: s.shot_style,
          editing_notes: s.editing_notes,
          estimated_duration: s.estimated_duration,
        }}
        showSave={false}
        savedId={id}
        onUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ['script', id] });
          queryClient.invalidateQueries({ queryKey: ['scripts'] });
        }}
      />
    </div>
  );
}
